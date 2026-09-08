/**
 * MailFlow · Captation et détection
 *
 * Fait le pont entre le connecteur et le registre. Deux temps :
 *
 *  1. CAPTATION : les nouveaux messages reçus entrent au registre, filtrés.
 *  2. DÉTECTION : les messages envoyés qui citent un message connu closent
 *     l'échange correspondant et arrêtent les relances.
 *
 * Aucune décision métier ici : le filtre vient de `normalisation.ts`, la
 * clôture passe par le domaine via `appliquerEtPersister`.
 *
 * ── LECTURE SEULE SUR LA MESSAGERIE ───────────────────────────────────────
 *
 * Ce module ne modifie rien dans la boîte : ni marquage comme lu, ni
 * déplacement, ni suppression. Il copie et il classe.
 */

import {
  type EtatSynchro,
  ETAT_NEUF,
  type ConnecteurImap,
} from "../connecteur/imap";
import {
  type Exclusion,
  type MessageCanonique,
  filtrerEntrant,
  rattacher,
} from "../connecteur/normalisation";
import { appliquerEtPersister, dateArchivage } from "./executer";
import { prisma } from "../lib/prisma";
import { STATUTS_ACTIFS } from "../domaine/cycle-echange";

export type RapportCaptation = {
  boite: string;
  reinitialise: boolean;
  entrantsLus: number;
  retenus: number;
  ecartes: number;
  raisonsEcart: [string, number][];
  echangesCrees: number;
  messagesAjoutes: number;
  sortantsLus: number;
  reponsesDetectees: number;
  incidents: string[];
  lignes: string[];
};

const ACTIFS = [...STATUTS_ACTIFS];

// ── État de synchronisation ────────────────────────────────────────────────

function lireEtat(jeton: string | null): EtatSynchro {
  if (!jeton) return { ...ETAT_NEUF };
  try {
    const o = JSON.parse(jeton) as Partial<EtatSynchro> & { uidValidity?: number };
    // Les états écrits avant la séparation par dossier ne portaient qu'un
    // seul nombre. On le reprend pour les deux : le dossier auquel il ne
    // correspond pas se relira une fois, puis les deux compteurs vivront
    // leur vie.
    const ancien = Number(o.uidValidity ?? 0);
    return {
      uidValiditeEntrant: Number(o.uidValiditeEntrant ?? ancien),
      dernierUidEntrant: Number(o.dernierUidEntrant ?? 0),
      uidValiditeSortant: Number(o.uidValiditeSortant ?? ancien),
      dernierUidSortant: Number(o.dernierUidSortant ?? 0),
    };
  } catch {
    return { ...ETAT_NEUF };
  }
}

/**
 * Un message sans Message-ID ne peut pas être rattaché ni dédoublonné.
 * Plutôt que de le perdre, on lui en fabrique un, stable pour cette boîte.
 */
function identifiantSur(m: MessageCanonique, boite: string): string {
  if (m.identifiant) return m.identifiant;
  return `<sans-id-${m.uid}@${boite}>`;
}

// ── Captation ──────────────────────────────────────────────────────────────

export async function capter(
  connecteur: ConnecteurImap,
  options?: { limite?: number; chargerExtraits?: boolean }
): Promise<RapportCaptation> {
  const limite = options?.limite ?? 200;
  const chargerExtraits = options?.chargerExtraits ?? true;

  const boite = await prisma.boiteSuivie.findFirstOrThrow({
    where: { adresse: connecteur.adresse, actif: true },
  });

  const exclusions: Exclusion[] = (
    await prisma.expediteurExclu.findMany({ where: { actif: true } })
  ).map((e) => ({ type: e.type, valeur: e.valeur }));

  // Les domaines de la maison. Le domaine de la boîte suivie n'y suffit pas :
  // une entreprise en exploite souvent plusieurs, et les messages entre
  // collègues n'ont rien à faire dans un registre de correspondance externe.
  const domainesInternes = (
    process.env.MAILFLOW_DOMAINES_INTERNES ??
    connecteur.adresse.split("@")[1] ??
    ""
  )
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

  const r: RapportCaptation = {
    boite: connecteur.adresse,
    reinitialise: false,
    entrantsLus: 0,
    retenus: 0,
    ecartes: 0,
    raisonsEcart: [],
    echangesCrees: 0,
    messagesAjoutes: 0,
    sortantsLus: 0,
    reponsesDetectees: 0,
    incidents: [],
    lignes: [],
  };

  const etat = lireEtat(boite.jetonDelta);
  const raisons = new Map<string, number>();

  // ── 1. Les entrants ─────────────────────────────────────────────────────
  const lot = await connecteur.listerEntrants(etat, limite);
  r.entrantsLus = lot.messages.length;
  r.reinitialise = lot.reinitialise;

  if (lot.reinitialise) {
    r.lignes.push(
      "Le serveur a renuméroté les messages : relecture depuis le début du dossier."
    );
  }

  for (const m of lot.messages) {
    const verdict = filtrerEntrant(m, exclusions, domainesInternes);

    if (!verdict.garder) {
      r.ecartes++;
      const cle = verdict.raison.replace(/\s*\(.*\)$/, "");
      raisons.set(cle, (raisons.get(cle) ?? 0) + 1);

      // Une non-remise n'est pas du bruit : c'est un incident à signaler.
      if (m.estNonRemise) {
        r.incidents.push(`non-remise · ${m.sujet.slice(0, 60)}`);
        await prisma.evenement.create({
          data: {
            type: "ANOMALIE_TECHNIQUE",
            libelle: `Rapport de non-remise reçu : ${m.sujet.slice(0, 120)}`,
            acteur: "SYSTEME",
          },
        });
      }
      continue;
    }

    r.retenus++;
    const cree = await enregistrerEntrant(m, boite.id, connecteur, chargerExtraits);
    if (cree.echangeCree) r.echangesCrees++;
    if (cree.messageCree) r.messagesAjoutes++;
    if (cree.echangeCree) {
      r.lignes.push(`nouveau · ${m.expediteur.adresse} · ${m.sujet.slice(0, 56)}`);
    }
  }

  r.raisonsEcart = [...raisons.entries()].sort((a, b) => b[1] - a[1]);

  // ── 2. Les sortants et la détection des réponses ────────────────────────
  // Chaque dossier porte désormais son propre compteur : une renumérotation
  // de la boîte d'arrivée ne doit plus faire relire les envoyés.
  const etatApresEntrants: EtatSynchro = {
    uidValiditeEntrant: lot.uidValidity,
    dernierUidEntrant: lot.dernierUid,
    uidValiditeSortant: etat.uidValiditeSortant,
    dernierUidSortant: etat.dernierUidSortant,
  };

  const lotSortant = await connecteur.listerSortants(etatApresEntrants, limite);
  r.sortantsLus = lotSortant.messages.length;

  if (lotSortant.reinitialise) {
    r.reinitialise = true;
    r.lignes.push(
      "Le dossier des envoyés a été renuméroté : relecture depuis le début."
    );
  }

  for (const m of lotSortant.messages) {
    const detecte = await traiterSortant(m, boite.id);
    if (detecte) {
      r.reponsesDetectees++;
      r.lignes.push(`réponse détectée · ${m.sujet.slice(0, 56)}`);
    }
  }

  // ── 3. Mémorisation de l'avancement ─────────────────────────────────────
  await prisma.boiteSuivie.update({
    where: { id: boite.id },
    data: {
      jetonDelta: JSON.stringify({
        uidValiditeEntrant: lot.uidValidity,
        dernierUidEntrant: lot.dernierUid,
        uidValiditeSortant: lotSortant.uidValidity,
        dernierUidSortant: lotSortant.dernierUid,
      } satisfies EtatSynchro),
      derniereSynchroLe: new Date(),
      derniereAnomalie: r.incidents.length > 0 ? r.incidents[0] : null,
    },
  });

  return r;
}

// ── Enregistrement d'un message entrant ────────────────────────────────────

async function enregistrerEntrant(
  m: MessageCanonique,
  boiteId: string,
  connecteur: ConnecteurImap,
  chargerExtraits: boolean
): Promise<{ echangeCree: boolean; messageCree: boolean }> {
  const identifiant = identifiantSur(m, connecteur.adresse);

  // Déjà connu : la captation est rejouable sans effet de bord.
  const dejaLa = await prisma.message.findUnique({
    where: { internetMessageId: identifiant },
    select: { id: true },
  });
  if (dejaLa) return { echangeCree: false, messageCree: false };

  const correspondant = await prisma.correspondant.upsert({
    where: { email: m.expediteur.adresse },
    update: m.expediteur.nom ? { nom: m.expediteur.nom } : {},
    create: {
      email: m.expediteur.adresse,
      nom: m.expediteur.nom ?? null,
      organisation: null,
      type: "AUTRE",
    },
    select: { id: true },
  });

  const cleDeFil = m.cleDeFil || identifiant;

  let echange = await prisma.echange.findUnique({
    where: { boiteId_conversationId: { boiteId, conversationId: cleDeFil } },
    select: { id: true },
  });

  let echangeCree = false;
  if (!echange) {
    const extrait = chargerExtraits
      ? await connecteur
          .chargerExtrait(process.env.MAILFLOW_DOSSIER_ENTRANT ?? "INBOX", m.uid)
          .catch(() => "")
      : "";

    echange = await prisma.echange.create({
      data: {
        boiteId,
        conversationId: cleDeFil,
        sujet: m.sujet,
        extrait,
        correspondantId: correspondant.id,
        recuLe: m.date,
        aPieceJointe: m.aPieceJointe,
        statut: "A_QUALIFIER",
      },
      select: { id: true },
    });
    echangeCree = true;

    await prisma.evenement.create({
      data: {
        type: "MAIL_ENREGISTRE",
        libelle: `${m.expediteur.adresse} · ${m.sujet.slice(0, 100)}`,
        echangeId: echange.id,
        acteur: "SYSTEME",
      },
    });
  }

  await prisma.message.create({
    data: {
      echangeId: echange.id,
      boiteId,
      internetMessageId: identifiant,
      inReplyTo: m.enReponseA,
      references: m.references,
      sens: "ENTRANT",
      expediteur: m.expediteur.adresse,
      destinataires: m.destinataires.map((a) => a.adresse),
      copie: m.copie.map((a) => a.adresse),
      sujet: m.sujet,
      dateMessage: m.date,
      aPieceJointe: m.aPieceJointe,
      estAutomatique: m.estAutomatique,
      estNonRemise: m.estNonRemise,
      piecesJointes: {
        create: m.piecesJointes.map((p) => ({
          nomOrigine: p.nom,
          typeMime: p.typeMime,
          tailleOctets: BigInt(p.taille),
        })),
      },
    },
  });

  return { echangeCree, messageCree: true };
}

// ── Traitement d'un message sortant ────────────────────────────────────────

/**
 * Un message envoyé qui cite un message connu clôt l'échange.
 *
 * C'est l'invariant 1 du domaine appliqué aux données réelles : une réponse
 * arrête les relances, depuis n'importe quel état actif. Le rattachement
 * repose sur In-Reply-To puis sur References, jamais sur l'objet.
 */
async function traiterSortant(
  m: MessageCanonique,
  boiteId: string
): Promise<boolean> {
  // Nos propres relances citent le message d'origine et se déposent dans les
  // envoyés. Sans cette porte, chaque première relance clôturerait l'échange
  // qu'elle vient de relancer.
  if (m.estGenereParMailflow) return false;

  const cites = [
    ...(m.enReponseA ? [m.enReponseA] : []),
    ...m.references,
  ];
  if (cites.length === 0) return false;

  const connus = await prisma.message.findMany({
    where: { internetMessageId: { in: cites }, boiteId },
    select: { internetMessageId: true, echangeId: true },
  });
  if (connus.length === 0) return false;

  const index = new Map(connus.map((c) => [c.internetMessageId, c.echangeId]));
  const origine = rattacher(m, new Set(index.keys()));
  if (!origine) return false;

  const echangeId = index.get(origine)!;
  const echange = await prisma.echange.findUnique({
    where: { id: echangeId },
    select: { statut: true },
  });
  if (!echange || !ACTIFS.includes(echange.statut as (typeof ACTIFS)[number])) {
    return false;
  }

  const identifiant = m.identifiant || `<sortant-${m.uid}@${boiteId}>`;

  // Le message sortant lui-même entre au registre, pour la trace.
  const existe = await prisma.message.findUnique({
    where: { internetMessageId: identifiant },
    select: { id: true },
  });
  if (!existe) {
    await prisma.message.create({
      data: {
        echangeId,
        boiteId,
        internetMessageId: identifiant,
        inReplyTo: m.enReponseA,
        references: m.references,
        sens: "SORTANT",
        expediteur: m.expediteur.adresse,
        destinataires: m.destinataires.map((a) => a.adresse),
        copie: m.copie.map((a) => a.adresse),
        sujet: m.sujet,
        dateMessage: m.date,
        aPieceJointe: m.aPieceJointe,
      },
    });
  }

  await appliquerEtPersister(echangeId, {
    type: "DETECTER_REPONSE",
    reponduLe: m.date,
    messageId: identifiant,
    archiverLe: await dateArchivage(),
  });

  return true;
}
