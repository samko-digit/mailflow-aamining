/**
 * MailFlow · Ordonnanceur
 *
 * Lit `travail_planifie`, prend les travaux échus et déclenche les mêmes
 * transitions que la console. Aucune logique métier ici non plus : le
 * domaine décide, la couche d'exécution écrit, l'ordonnanceur cadence.
 *
 * ── POURQUOI « FOR UPDATE SKIP LOCKED » ───────────────────────────────────
 *
 * Une requête unique prend les travaux échus et les verrouille, en IGNORANT
 * ceux qu'un autre exécutant tient déjà. Deux instances peuvent donc tourner
 * en parallèle sans se bloquer ni envoyer deux fois la même relance. C'est le
 * modèle de file d'attente le plus simple qui soit fiable, et il évite
 * d'exploiter un serveur de messages pour quelques centaines de travaux.
 *
 * ── L'ORDRE DES OPÉRATIONS D'UNE RELANCE ──────────────────────────────────
 *
 * On COMPOSE, puis on ENVOIE, puis seulement on ENREGISTRE. Jamais l'inverse.
 *
 * Enregistrer d'abord aurait l'air plus prudent, mais une coupure entre les
 * deux laisserait une relance comptée qui n'est jamais partie : le dossier
 * paraîtrait suivi alors que personne n'a rien reçu. Un système de relance
 * qui ment sur ce qu'il a envoyé est pire qu'un tableau papier.
 *
 * Dans l'autre sens, une coupure laisse un message parti mais non compté :
 * le cycle suivant reprend le travail et envoie un second rappel. C'est
 * désagréable, et c'est VISIBLE dans la boîte du destinataire. Entre une
 * erreur visible et une erreur invisible, on choisit la visible.
 *
 * Reste le cas où l'envoi réussit et l'enregistrement échoue : le travail
 * part alors directement en échec définitif, sans nouvelle tentative, avec
 * l'identifiant du message dans le motif. Réessayer enverrait un doublon ;
 * se taire laisserait la base fausse. Un humain doit regarder.
 *
 * ── CE QUI N'EST PAS UNE ERREUR ───────────────────────────────────────────
 *
 * Un travail dont le domaine refuse la transition n'est pas en échec : c'est
 * un travail PÉRIMÉ. Le dossier a bougé entre la planification et
 * l'exécution, typiquement parce que le client a répondu. On l'annule.
 *
 * Un travail qu'un garde-fou refuse d'envoyer n'est pas en échec non plus :
 * il est REFUSÉ. L'installation obéit à sa configuration. Il repart dans une
 * heure, sans consommer de tentative. Voir `atelier.ts`.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHmac } from "node:crypto";

import {
  type Statut,
  TransitionInterdite,
  TransitionIncomplete,
} from "../domaine/cycle-echange";
import { chargerCalendrier } from "../domaine/calendrier";
import {
  TENTATIVES_MAX,
  VERROU_PERIME_MINUTES,
  deciderTravail,
  prochainEssaiApresRefus,
  prochaineTentative,
  type TypeTravail,
} from "./decision";
import { Atelier, PREFIXE_REFUS } from "./atelier";
import { diffuser } from "./alerte";
import { type Sante, verifierSante } from "./sante";
import { urlConsole } from "../domaine/relance";
import { appliquerEtPersister, suiteApresRelance } from "../donnees/executer";
import { composerEscalade, composerRelance } from "../donnees/composer-relance";
import { capter } from "../donnees/captation";
import { prisma } from "../lib/prisma";

export type RapportCycle = {
  identifiant: string;
  debut: Date;
  fin: Date;
  verrousLiberes: number;
  pris: number;
  executes: number;
  reportes: number;
  refuses: number;
  perimes: number;
  echecs: number;
  lignes: string[];
  /** État de santé relevé en fin de cycle. Absent si la surveillance a été
   *  désactivée pour ce passage. */
  sante?: Sante;
  /** Ce que le canal d'alerte a fait, en une phrase. */
  alerte?: string;
};

type TravailPris = {
  id: string;
  type: TypeTravail;
  echange_id: string | null;
  charge: { ordre?: number; boite?: string; messageId?: string; sourceMailbox?: string; destinationMailbox?: string; uid?: number } | null;
  tentatives: number;
  verrou_a?: Date | null;
};

type Resultat = {
  issue: "execute" | "perime" | "refuse" | "incoherent";
  detail: string;
};

/** Signale une panne technique : réessayer a un sens. */
class PanneEnvoi extends Error {}

/** Dossier d'archivage local, en attendant le stockage objet du client. */
const DOSSIER_ARCHIVES = path.resolve(process.cwd(), "archives");

/** Cadence de la captation, en minutes. */
function cadenceCaptation(): number {
  const v = Number(process.env.MAILFLOW_CADENCE_CAPTATION_MINUTES ?? 5);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

// ── Verrous ────────────────────────────────────────────────────────────────

/**
 * Rend à la file les travaux qu'un exécutant a pris puis abandonnés, par
 * exemple parce que le processus a été tué en cours de route. Sans cela, un
 * travail resterait bloqué en EN_COURS pour toujours.
 */
export async function libererVerrousPerimes(): Promise<number> {
  const limite = new Date(Date.now() - VERROU_PERIME_MINUTES * 60_000);
  const r = await prisma.travailPlanifie.updateMany({
    where: { statut: "EN_COURS", verrouA: { lt: limite } },
    data: { statut: "EN_ATTENTE", verrouPar: null, verrouA: null },
  });
  return r.count;
}

/**
 * Prend jusqu'à `limite` travaux échus, en sautant ceux déjà verrouillés.
 * Prisma ne modélise pas SKIP LOCKED : requête brute assumée.
 */
export async function prendreTravaux(
  limite: number,
  identifiant: string
): Promise<TravailPris[]> {
  return prisma.$queryRaw<TravailPris[]>`
    UPDATE travail_planifie
       SET statut = 'EN_COURS', verrou_par = ${identifiant}, verrou_a = now()
     WHERE id IN (
       SELECT id
         FROM travail_planifie
        WHERE statut = 'EN_ATTENTE'
          AND executer_a <= now()
        ORDER BY executer_a
        LIMIT ${limite}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING id, type, echange_id, charge, tentatives`;
}

// ── Captation périodique ───────────────────────────────────────────────────

/**
 * Programme la prochaine lecture d'une boîte.
 *
 * La chaîne s'auto-entretient : chaque captation programme la suivante. Si
 * elle se rompt (échec définitif, base restaurée, travail annulé à la main),
 * `assurerCaptationPlanifiee` la relance au cycle d'après. Une chaîne qui ne
 * sait pas se réparer finit toujours par se rompre en silence.
 */
async function planifierCaptation(adresse: string, quand: Date): Promise<void> {
  await prisma.travailPlanifie.create({
    data: {
      type: "SYNCHRO_BOITE",
      executerA: quand,
      charge: { boite: adresse },
      cleIdempotence: `synchro-${adresse}-${quand.toISOString()}`,
    },
  });
}

/**
 * Garantit qu'une captation est en vue pour la boîte configurée.
 *
 * Appelée à chaque cycle. C'est le seul endroit qui amorce la chaîne, ce qui
 * évite d'avoir à lancer une commande à la main après une restauration.
 *
 * Une seule boîte est planifiée : celle que le fichier de configuration sait
 * ouvrir. Planifier les autres boîtes actives reviendrait à créer un travail
 * par cycle pour l'annuler aussitôt, faute de connecteur. Elles ne sont pas
 * oubliées pour autant : la surveillance signale toute boîte active qui n'est
 * plus lue, ce qui est le bon endroit pour le dire.
 */
export async function assurerCaptationPlanifiee(): Promise<{
  amorcee: string | null;
  ignorees: string[];
}> {
  const configuree = (process.env.MAILFLOW_BOITE ?? "").trim();

  const boites = await prisma.boiteSuivie.findMany({
    where: { actif: true },
    select: { adresse: true },
  });

  const ignorees = boites.map((b) => b.adresse).filter((a) => a !== configuree);

  if (!configuree || !boites.some((b) => b.adresse === configuree)) {
    return { amorcee: null, ignorees };
  }

  const enVue = await prisma.travailPlanifie.count({
    where: {
      type: "SYNCHRO_BOITE",
      statut: { in: ["EN_ATTENTE", "EN_COURS"] },
      charge: { path: ["boite"], equals: configuree },
    },
  });
  if (enVue > 0) return { amorcee: null, ignorees };

  await planifierCaptation(configuree, new Date());
  return { amorcee: configuree, ignorees };
}

async function executerCaptation(
  t: TravailPris,
  atelier: Atelier
): Promise<Resultat> {
  const adresse = t.charge?.boite;
  if (!adresse) {
    return { issue: "perime", detail: "captation sans boîte désignée" };
  }

  const connecteur = await atelier.connecteur();
  if (!connecteur) {
    throw new PanneEnvoi(
      `boîte injoignable : ${atelier.raisonImap ?? "cause inconnue"}`
    );
  }

  // Une seule boîte pour l'instant : celle du fichier de configuration. Le
  // jour où il y en aura plusieurs, c'est ici qu'on choisira le connecteur,
  // pas dans un coin du code appelant.
  if (connecteur.adresse !== adresse) {
    return {
      issue: "perime",
      detail: `captation demandée pour ${adresse}, or la configuration pointe sur ${connecteur.adresse}`,
    };
  }

  const r = await capter(connecteur, { limite: 200 });

  // Programmer la suivante fait partie du travail : on le fait avant de
  // rendre la main, pour qu'un rapport « exécuté » signifie bien que la
  // chaîne continue.
  const suivante = new Date(Date.now() + cadenceCaptation() * 60_000);
  await planifierCaptation(adresse, suivante);

  const bouts = [
    `${r.retenus} retenu(s) sur ${r.entrantsLus} lu(s)`,
    r.echangesCrees > 0 ? `${r.echangesCrees} échange(s) créé(s)` : null,
    r.reponsesDetectees > 0 ? `${r.reponsesDetectees} réponse(s) détectée(s)` : null,
    r.reinitialise ? "renumérotation serveur, relecture depuis le début" : null,
    r.incidents.length > 0 ? `incidents : ${r.incidents.join(" ; ")}` : null,
  ].filter(Boolean);

  return { issue: "execute", detail: `captation ${adresse} · ${bouts.join(" · ")}` };
}

// ── Archivage ──────────────────────────────────────────────────────────────

async function archiverEchange(echangeId: string): Promise<string> {
  const e = await prisma.echange.findUniqueOrThrow({
    where: { id: echangeId },
    select: {
      numero: true,
      sujet: true,
      statut: true,
      recuLe: true,
      echeance: true,
      reponduLe: true,
      canalReponse: true,
      motifCloture: true,
      nbRelances: true,
      correspondant: { select: { email: true, nom: true, organisation: true } },
      responsable: { select: { nomComplet: true } },
      categorie: { select: { libelle: true } },
      messages: {
        orderBy: { dateMessage: "asc" },
        select: {
          internetMessageId: true,
          sens: true,
          expediteur: true,
          destinataires: true,
          copie: true,
          sujet: true,
          extrait: true,
          dateMessage: true,
          aPieceJointe: true,
        },
      },
      relances: {
        orderBy: { ordre: "asc" },
        select: { ordre: true, envoyeeLe: true, statut: true, messageIdEnvoye: true },
      },
    },
  });

  await mkdir(DOSSIER_ARCHIVES, { recursive: true });
  const nom = `echange-${String(e.numero).padStart(5, "0")}.json`;
  const chemin = path.join(DOSSIER_ARCHIVES, nom);
  await writeFile(chemin, JSON.stringify(e, null, 2), "utf8");

  // Dépôt local assumé : le stockage objet du client remplacera ce chemin
  // sans toucher au reste du dispositif, seule cette fonction change.
  return `file://${chemin.replace(/\\/g, "/")}`;
}

// ── Transfert ──────────────────────────────────────────────────────────────

/**
 * Crée un travail de transfert avec idempotence déterministe.
 *
 * La clé d'idempotence est : ${echangeId}-transfer-${messageId}-${destinationMailbox}
 * (destination normalisée)
 */
export async function creerTravailTransfert(params: {
  echangeId: string;
  messageId: string;
  sourceMailbox: string;
  destinationMailbox: string;
  uid: number;
  executerA?: Date;
}): Promise<{ success: boolean; travailId?: string; existeDeja?: boolean }> {
  const normaliser = (email: string) => email.trim().toLowerCase();
  const destination = normaliser(params.destinationMailbox);
  
  const cleIdempotence = `${params.echangeId}-transfer-${params.messageId}-${destination}`;
  
  try {
    const travail = await prisma.travailPlanifie.create({
      data: {
        type: "TRANSFERT",
        echangeId: params.echangeId,
        executerA: params.executerA ?? new Date(),
        charge: {
          messageId: params.messageId,
          sourceMailbox: params.sourceMailbox,
          destinationMailbox: params.destinationMailbox,
          uid: params.uid,
        },
        cleIdempotence,
      },
    });
    
    return { success: true, travailId: travail.id };
  } catch (e: any) {
    // Violation de contrainte unique = déjà existant
    if (e.code === "P2002") {
      return { success: false, existeDeja: true };
    }
    throw e;
  }
}

async function executerTransfert(
  travailId: string,
  echangeId: string,
  ref: string,
  charge: { messageId?: string; sourceMailbox?: string; destinationMailbox?: string; uid?: number } | null,
  atelier: Atelier
): Promise<Resultat> {
  if (!charge?.messageId || !charge.sourceMailbox || !charge.destinationMailbox || !charge.uid) {
    return { issue: "perime", detail: `transfert · ${ref} · charge incomplète` };
  }

  // Normalisation des adresses
  const normaliser = (email: string) => email.trim().toLowerCase();
  const source = normaliser(charge.sourceMailbox);
  const destination = normaliser(charge.destinationMailbox);

  // Validation anti-loop
  if (source === destination) {
    return { issue: "perime", detail: `transfert · ${ref} · source et destination identiques` };
  }

  // Validation whitelist
  const whitelist = (process.env.MAILFLOW_DESTINATIONS_TRANSFERT ?? "")
    .split(",")
    .map(normaliser)
    .filter(Boolean);

  if (!whitelist.includes(destination)) {
    return { issue: "perime", detail: `transfert · ${ref} · destination non autorisée` };
  }

  // Vérifier si transfert déjà en cours pour cet échange
  const dejaTransfere = await prisma.travailPlanifie.findFirst({
    where: {
      echangeId,
      type: "TRANSFERT",
      statut: { in: ["EN_ATTENTE", "EN_COURS"] }
    }
  });

  if (dejaTransfere) {
    return { issue: "perime", detail: `transfert · ${ref} · déjà en cours pour cet échange` };
  }

  // Appel webhook n8n
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return { issue: "perime", detail: `transfert · ${ref} · N8N_WEBHOOK_URL non configuré` };
  }

  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    return { issue: "perime", detail: `transfert · ${ref} · N8N_WEBHOOK_SECRET non configuré` };
  }

  try {
    const payload = {
      travailId: travailId, // ID réel du TravailPlanifie
      requestId: `${travailId}-transfer-${charge.messageId}`,
      exchangeId: echangeId,
      messageId: charge.messageId,
      sourceMailbox: charge.sourceMailbox,
      destinationMailbox: charge.destinationMailbox,
      uid: charge.uid,
      requestedAt: new Date().toISOString()
    };

    const timestamp = Date.now();
    const body = JSON.stringify(payload);
    
    // HMAC-SHA256(timestamp + "." + body)
    const signature = createHmac("sha256", secret)
      .update(timestamp + "." + body)
      .digest("hex");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MailFlow-Signature": signature,
        "X-MailFlow-Timestamp": timestamp.toString(),
        "X-MailFlow-Idempotency-Key": `${echangeId}-transfer-${charge.messageId}-${destination}`
      },
      body
    });

    if (!response.ok) {
      return { issue: "refuse", detail: `transfert · ${ref} · n8n a refusé : ${response.status}` };
    }

    // HTTP 200 signifie "accepté", PAS "terminé"
    // Le travail reste EN_COURS, le callback finalisera
    return { issue: "execute", detail: `transfert · ${ref} · webhook accepté, en attente callback` };

  } catch (e) {
    return { issue: "refuse", detail: `transfert · ${ref} · erreur webhook : ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── Exécution d'un travail ─────────────────────────────────────────────────

async function executerRelance(
  echangeId: string,
  ref: string,
  maintenant: Date,
  atelier: Atelier
): Promise<Resultat> {
  const echange = await prisma.echange.findUniqueOrThrow({
    where: { id: echangeId },
    select: { nbRelances: true, categorieId: true },
  });

  // Le rang se déduit de l'état du dossier, pas de la charge du travail : une
  // relance consignée à la main entre-temps doit décaler le rang, sinon le
  // domaine refuserait la transition et on perdrait le travail.
  const ordre = echange.nbRelances + 1;

  const compose = await composerRelance(echangeId, ordre, maintenant);
  if (!compose.pret) {
    return { issue: "refuse", detail: `relance ${ordre} · ${ref} · ${compose.raison}` };
  }

  const envoi = await atelier.envoyer(compose.message);
  if (!envoi.sorti) {
    if (envoi.nature === "panne") throw new PanneEnvoi(envoi.raison);
    return { issue: "refuse", detail: `relance ${ordre} · ${ref} · ${envoi.raison}` };
  }

  // ── Le message est parti. Plus de droit à l'échec silencieux. ───────────
  const suite = await suiteApresRelance(echange.categorieId, ordre, maintenant);

  try {
    await appliquerEtPersister(
      echangeId,
      { type: "RELANCER", ordre, suite },
      undefined,
      {
        destinataireId: compose.destinataireId,
        copieA: compose.copieA,
        modeleId: compose.modeleId,
        messageIdEnvoye: envoi.identifiant,
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      issue: "incoherent",
      detail:
        `relance ${ordre} · ${ref} · MESSAGE ENVOYÉ ${envoi.identifiant} ` +
        `MAIS NON ENREGISTRÉ : ${message}`,
    };
  }

  const copie = envoi.depose ? "" : " · copie non déposée dans les envoyés";
  return {
    issue: "execute",
    detail: `relance ${ordre} · ${ref} · ${compose.motifDestinataire}${copie}`,
  };
}

async function executerEscalade(
  echangeId: string,
  ref: string,
  maintenant: Date,
  atelier: Atelier
): Promise<Resultat> {
  const compose = await composerEscalade(echangeId, maintenant);
  if (!compose.pret) {
    return { issue: "refuse", detail: `escalade · ${ref} · ${compose.raison}` };
  }

  const envoi = await atelier.envoyer(compose.message);
  if (!envoi.sorti) {
    if (envoi.nature === "panne") throw new PanneEnvoi(envoi.raison);
    return { issue: "refuse", detail: `escalade · ${ref} · ${envoi.raison}` };
  }

  try {
    await appliquerEtPersister(echangeId, { type: "ESCALADER" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      issue: "incoherent",
      detail:
        `escalade · ${ref} · NOTE ENVOYÉE ${envoi.identifiant} ` +
        `MAIS STATUT NON CHANGÉ : ${message}`,
    };
  }

  return {
    issue: "execute",
    detail: `escalade · ${ref} · ${compose.motifDestinataire}`,
  };
}

async function executerUn(
  t: TravailPris,
  maintenant: Date,
  atelier: Atelier
): Promise<Resultat> {
  if (t.type === "SYNCHRO_BOITE") return executerCaptation(t, atelier);

  if (!t.echange_id) {
    return { issue: "perime", detail: `travail ${t.type} sans échange` };
  }

  const echange = await prisma.echange.findUniqueOrThrow({
    where: { id: t.echange_id },
    select: { numero: true },
  });
  const ref = `n° ${echange.numero}`;

  try {
    switch (t.type) {
      case "RELANCE":
        return await executerRelance(t.echange_id, ref, maintenant, atelier);

      case "ESCALADE":
        return await executerEscalade(t.echange_id, ref, maintenant, atelier);

      case "ARCHIVAGE": {
        const url = await archiverEchange(t.echange_id);
        await appliquerEtPersister(t.echange_id, { type: "ARCHIVER", url });
        return { issue: "execute", detail: `archivage · ${ref}` };
      }

      case "TRANSFERT": {
        // Pour les transferts, on appelle n8n mais on ne termine PAS le travail
        // Le callback finalisera en TERMINE ou ECHEC
        const resultat = await executerTransfert(t.id, t.echange_id, ref, t.charge as any, atelier);
        
        // Si succès webhook, on laisse le travail EN_COURS (le callback finalisera)
        // Si erreur immédiate, on peut échouer
        if (resultat.issue === "execute") {
          // Succès = webhook accepté, on ne marque pas TERMINE
          return resultat;
        } else {
          // Erreur = on marque ECHEC
          return resultat;
        }
      }

      default:
        return {
          issue: "perime",
          detail: `type ${t.type} non pris en charge par cet ordonnanceur`,
        };
    }
  } catch (e) {
    // Le domaine refuse : le dossier a bougé depuis la planification.
    // Ce n'est pas une panne, c'est un travail devenu sans objet.
    if (e instanceof TransitionInterdite || e instanceof TransitionIncomplete) {
      return { issue: "perime", detail: `${ref} · ${e.message}` };
    }
    throw e;
  }
}

// ── Cycle ──────────────────────────────────────────────────────────────────

export async function executerCycle(options?: {
  limite?: number;
  identifiant?: string;
  /** Faux pour un passage muet : ni relevé de santé, ni courriel d'alerte. */
  alerter?: boolean;
}): Promise<RapportCycle> {
  const debut = new Date();
  const identifiant =
    options?.identifiant ?? `${process.pid}@${new Date().toISOString()}`;
  const limite = options?.limite ?? 20;

  const rapport: RapportCycle = {
    identifiant,
    debut,
    fin: debut,
    verrousLiberes: 0,
    pris: 0,
    executes: 0,
    reportes: 0,
    refuses: 0,
    perimes: 0,
    echecs: 0,
    lignes: [],
  };

  rapport.verrousLiberes = await libererVerrousPerimes();

  const chaine = await assurerCaptationPlanifiee();
  if (chaine.amorcee) {
    rapport.lignes.push(`captation amorcée pour ${chaine.amorcee}`);
  }
  if (chaine.ignorees.length > 0) {
    rapport.lignes.push(
      `boîte(s) active(s) sans connecteur, non lue(s) : ${chaine.ignorees.join(", ")}`
    );
  }

  const cal = await chargerCalendrier();
  const travaux = await prendreTravaux(limite, identifiant);
  rapport.pris = travaux.length;

  const atelier = new Atelier();

  try {
    for (const t of travaux) {
      const maintenant = new Date();

      // Le statut courant du dossier gouverne la pertinence du travail.
      const etat = t.echange_id
        ? await prisma.echange.findUnique({
            where: { id: t.echange_id },
            select: { statut: true },
          })
        : null;

      // Calculer le temps en cours pour les travaux TRANSFERT (timeout)
      const tempsEnCours = t.type === "TRANSFERT" && t.verrou_a
        ? maintenant.getTime() - t.verrou_a.getTime()
        : undefined;

      const decision = deciderTravail(
        t.type,
        maintenant,
        cal,
        etat?.statut as Statut | undefined,
        tempsEnCours
      );

      if (decision.action === "perimer") {
        await prisma.travailPlanifie.update({
          where: { id: t.id },
          data: {
            statut: "ANNULE",
            termineLe: new Date(),
            derniereErreur: decision.raison,
            verrouPar: null,
            verrouA: null,
          },
        });
        rapport.perimes++;
        rapport.lignes.push(`périmé · ${t.type} · ${decision.raison}`);
        continue;
      }

      // Règle « le compteur tourne, l'envoi attend » : hors fenêtre, on rend
      // le travail à la file avec une nouvelle heure, sans rien envoyer.
      if (decision.action === "reporter") {
        await prisma.travailPlanifie.update({
          where: { id: t.id },
          data: {
            statut: "EN_ATTENTE",
            executerA: decision.a,
            verrouPar: null,
            verrouA: null,
          },
        });
        rapport.reportes++;
        rapport.lignes.push(
          `reporté · ${t.type} · ${decision.raison} · nouvelle heure ${decision.a.toISOString()}`
        );
        continue;
      }

      try {
        const r = await executerUn(t, maintenant, atelier);

        if (r.issue === "execute") {
          // Pour les transferts, on ne marque pas TERMINE ici
          // Le callback finalisera en TERMINE ou ECHEC
          if (t.type === "TRANSFERT") {
            // Le travail reste EN_COURS (déjà défini par prendreTravaux)
            // On enregistre un événement pour tracer l'acceptation webhook
            rapport.executes++;
            rapport.lignes.push(`exécuté · ${r.detail} · en attente callback`);
            continue;
          }
          
          // Pour les autres types, on marque TERMINE normalement
          await prisma.travailPlanifie.update({
            where: { id: t.id },
            data: {
              statut: "TERMINE",
              termineLe: new Date(),
              verrouPar: null,
              verrouA: null,
            },
          });
          rapport.executes++;
          rapport.lignes.push(`exécuté · ${r.detail}`);
          continue;
        }

        if (r.issue === "refuse") {
          // Ni exécuté ni en échec : l'installation obéit à sa configuration.
          // Le travail repart plus tard, sans consommer de tentative.
          const retour = prochainEssaiApresRefus(new Date());
          await prisma.travailPlanifie.update({
            where: { id: t.id },
            data: {
              statut: "EN_ATTENTE",
              executerA: retour,
              derniereErreur: `${PREFIXE_REFUS}${r.detail}`,
              verrouPar: null,
              verrouA: null,
            },
          });
          rapport.refuses++;
          rapport.lignes.push(`refusé · ${r.detail}`);
          continue;
        }

        if (r.issue === "incoherent") {
          // Le message est parti, la base ne le sait pas. Réessayer enverrait
          // un doublon : on s'arrête et on appelle un humain.
          await prisma.travailPlanifie.update({
            where: { id: t.id },
            data: {
              statut: "ECHEC",
              tentatives: t.tentatives + 1,
              derniereErreur: r.detail,
              termineLe: new Date(),
              verrouPar: null,
              verrouA: null,
            },
          });
          rapport.echecs++;
          rapport.lignes.push(`INCOHÉRENCE · ${r.detail}`);
          console.error(`[MailFlow] ALERTE · ${r.detail}`);
          continue;
        }

        await prisma.travailPlanifie.update({
          where: { id: t.id },
          data: {
            statut: "ANNULE",
            termineLe: new Date(),
            derniereErreur: r.detail,
            verrouPar: null,
            verrouA: null,
          },
        });
        rapport.perimes++;
        rapport.lignes.push(`périmé · ${r.detail}`);
      } catch (e) {
        const tentatives = t.tentatives + 1;
        const message = e instanceof Error ? e.message : String(e);
        const nature = e instanceof PanneEnvoi ? "panne" : "erreur";

        if (tentatives >= TENTATIVES_MAX) {
          await prisma.travailPlanifie.update({
            where: { id: t.id },
            data: {
              statut: "ECHEC",
              tentatives,
              derniereErreur: message,
              termineLe: new Date(),
              verrouPar: null,
              verrouA: null,
            },
          });
          rapport.echecs++;
          rapport.lignes.push(`ÉCHEC DÉFINITIF · ${t.type} · ${message}`);
          console.error(
            `[MailFlow] ALERTE · travail ${t.id} en échec après ${tentatives} tentatives : ${message}`
          );
        } else {
          const retour = prochaineTentative(tentatives, new Date());
          await prisma.travailPlanifie.update({
            where: { id: t.id },
            data: {
              statut: "EN_ATTENTE",
              tentatives,
              derniereErreur: message,
              executerA: retour,
              verrouPar: null,
              verrouA: null,
            },
          });
          rapport.lignes.push(
            `${nature} ${tentatives}/${TENTATIVES_MAX} · ${t.type} · nouvelle tentative ${retour.toISOString()} · ${message}`
          );
        }
      }
    }
    // LE BATTEMENT DE CŒUR S'ÉCRIT AVANT QUE LE CYCLE SE JUGE.
    //
    // La surveillance compare l'heure du dernier passage à la cadence
    // attendue. Se relever la santé sans avoir d'abord dit « je suis passé »
    // fait crier MOTEUR_SILENCIEUX à chaque passage : le moteur s'accuse
    // lui-même d'être arrêté, au moment précis où il tourne.
    rapport.fin = new Date();
    await enregistrerBattement(rapport);

    // Le relevé de santé et l'alerte se font ensuite, mais AVANT de fermer
    // l'atelier : c'est la même connexion qui vient de servir aux relances,
    // et un cycle qui découvre une panne doit pouvoir le dire tout de suite.
    if (options?.alerter !== false) {
      rapport.sante = await verifierSante();
      const d = await diffuser(
        atelier,
        rapport.sante,
        new Date(),
        process.env.MAILFLOW_BOITE ?? "boîte non configurée",
        urlConsole()
      );
      rapport.alerte = d.diffuse
        ? `alerte diffusée : ${d.nombre} anomalie(s) vers ${d.vers.join(", ")}`
        : d.raison;
    }
  } finally {
    await atelier.fermer();
  }

  return rapport;
}

/**
 * Battement de cœur : chaque passage laisse une trace, même un passage
 * vide. C'est ce qui permet de distinguer « rien à faire » de « le moteur
 * ne tourne plus », distinction que l'absence de trace rend impossible.
 */
async function enregistrerBattement(r: RapportCycle): Promise<void> {
  await prisma.parametre.upsert({
    where: { cle: "moteur_dernier_passage" },
    update: {
      valeur: {
        a: r.fin.toISOString(),
        dureeMs: r.fin.getTime() - r.debut.getTime(),
        pris: r.pris,
        executes: r.executes,
        reportes: r.reportes,
        refuses: r.refuses,
        perimes: r.perimes,
        echecs: r.echecs,
      },
    },
    create: {
      cle: "moteur_dernier_passage",
      libelle: "Dernier passage de l'ordonnanceur",
      valeur: { a: r.fin.toISOString() },
    },
  });
}
