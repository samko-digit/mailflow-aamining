/**
 * MailFlow · Exécution des transitions
 *
 * Le chaînon manquant entre le domaine et la base. Le domaine décide et rend
 * des effets ; ce module les écrit, TOUS DANS UNE SEULE TRANSACTION.
 *
 * Pourquoi une seule transaction : si la relance est enregistrée mais que
 * l'annulation du travail planifié échoue, le système relancera une seconde
 * fois un dossier déjà traité. Les deux écritures doivent réussir ou échouer
 * ensemble, sans état intermédiaire possible.
 */

import { DateTime } from "luxon";

import {
  appliquer,
  type EtatEchange,
  type Statut,
  type Transition,
} from "../domaine/cycle-echange";
import { chargerCalendrier } from "../domaine/calendrier";
import { ajouterJoursOuvres, momentEnvoi } from "../domaine/echeance";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";

/** Champs de l'échange dont le domaine a besoin, et rien de plus. */
const CHAMPS_ETAT = {
  id: true,
  statut: true,
  categorieId: true,
  responsableId: true,
  echeance: true,
  nbRelances: true,
  reponduLe: true,
  canalReponse: true,
  motifCloture: true,
  archiveUrl: true,
} as const;

/**
 * Détails d'envoi rattachés à une relance qui vient de partir.
 *
 * Ils ne concernent pas le domaine, qui se contente de compter les relances :
 * ce sont des faits de persistance, connus seulement de qui a réellement fait
 * sortir le message. D'où ce paramètre séparé plutôt qu'un champ de plus dans
 * la transition.
 */
export type EnvoiRealise = {
  /** Utilisateur qui a reçu la relance. Peut être un suppléant. */
  destinataireId: string;
  copieA?: string[];
  modeleId?: string | null;
  /** Message-ID du courriel parti. La preuve qu'il est parti. */
  messageIdEnvoye?: string | null;
};

/**
 * Applique une transition et persiste son résultat.
 *
 * Toute violation de règle métier remonte telle quelle depuis le domaine
 * (TransitionInterdite, TransitionIncomplete) : rien n'est écrit.
 */
export async function appliquerEtPersister(
  echangeId: string,
  transition: Transition,
  auteurId?: string,
  envoi?: EnvoiRealise
): Promise<void> {
  const ligne = await prisma.echange.findUniqueOrThrow({
    where: { id: echangeId },
    select: CHAMPS_ETAT,
  });

  const etat: EtatEchange = {
    statut: ligne.statut as Statut,
    categorie: ligne.categorieId,
    responsable: ligne.responsableId,
    echeance: ligne.echeance,
    nbRelances: ligne.nbRelances,
    reponduLe: ligne.reponduLe,
    canalReponse: ligne.canalReponse,
    motifCloture: ligne.motifCloture,
    archiveUrl: ligne.archiveUrl,
  };

  // Le domaine décide. S'il refuse, l'exception part avant toute écriture.
  const { etat: apres, effets } = appliquer(etat, transition);

  const maintenant = new Date();

  // Champs dérivés des effets, appliqués dans la même mise à jour que l'état.
  const complement: {
    prochaineRelanceLe?: Date | null;
    derniereRelanceLe?: Date;
    archiveLe?: Date;
  } = {};

  const travaux: { type: "RELANCE" | "ESCALADE" | "ARCHIVAGE"; quand: Date; ordre?: number }[] = [];
  const journal: { evenement: string; libelle: string }[] = [];
  const alertes: string[] = [];
  let annuler = false;

  for (const ef of effets) {
    switch (ef.type) {
      case "PLANIFIER":
        travaux.push({ type: ef.travail, quand: ef.quand, ordre: ef.ordre });
        if (ef.travail === "RELANCE") complement.prochaineRelanceLe = ef.quand;
        // Plus aucune relance en vue : la colonne « Relance » de la console
        // doit s'éteindre, pas garder une échéance devenue caduque.
        if (ef.travail === "ESCALADE") complement.prochaineRelanceLe = null;
        if (ef.travail === "ARCHIVAGE") complement.archiveLe = ef.quand;
        break;
      case "ANNULER_TRAVAUX":
        annuler = true;
        complement.prochaineRelanceLe = null;
        break;
      case "JOURNALISER":
        journal.push({ evenement: ef.evenement, libelle: ef.libelle });
        break;
      case "ALERTER":
        // Canal d'alerte réel à brancher (courriel technique ou Teams).
        // En attendant, l'événement associé est déjà journalisé ci-dessus.
        alertes.push(ef.libelle);
        break;
    }
  }

  if (transition.type === "RELANCER") complement.derniereRelanceLe = maintenant;

  // Pour REQUALIFIER, capturer les valeurs avant modification
  let valeurAvant: Record<string, unknown> | undefined;
  let valeurApres: Record<string, unknown> | undefined;
  if (transition.type === "REQUALIFIER") {
    valeurAvant = {
      categorie: ligne.categorieId,
      responsable: ligne.responsableId,
      echeance: ligne.echeance?.toISOString(),
    };
    valeurApres = {
      categorie: transition.categorie,
      responsable: transition.responsable,
      echeance: transition.echeance.toISOString(),
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.echange.update({
      where: { id: echangeId },
      data: {
        statut: apres.statut,
        categorieId: apres.categorie,
        responsableId: apres.responsable,
        echeance: apres.echeance,
        nbRelances: apres.nbRelances,
        reponduLe: apres.reponduLe,
        canalReponse: apres.canalReponse as never,
        motifCloture: apres.motifCloture,
        archiveUrl: apres.archiveUrl,
        ...complement,
      },
    });

    // L'annulation précède la planification : une réponse détectée annule les
    // relances en attente, et l'archivage qu'elle planifie ne doit pas l'être.
    if (annuler) {
      await tx.travailPlanifie.updateMany({
        where: { echangeId, statut: "EN_ATTENTE" },
        data: { statut: "ANNULE", termineLe: maintenant },
      });
    }

    for (const t of travaux) {
      await tx.travailPlanifie.create({
        data: {
          type: t.type,
          echangeId,
          executerA: t.quand,
          charge: t.ordre ? { ordre: t.ordre } : undefined,
          cleIdempotence: `${echangeId}-${t.type}-${t.quand.toISOString()}`,
        },
      });
    }

    // La ligne de relance est un détail de persistance du fait « une relance
    // est partie » : le domaine se contente de compter.
    if (transition.type === "RELANCER") {
      const destinataireId =
        envoi?.destinataireId ?? apres.responsable ?? auteurId ?? null;

      // Sans destinataire, la ligne de relance serait un enregistrement sans
      // sujet. On refuse plutôt que d'insérer une clé étrangère vide, qui
      // ferait tomber la transaction sur une erreur illisible.
      if (!destinataireId) {
        throw new Error(
          "Relance impossible à consigner : ni destinataire d'envoi, ni responsable, ni auteur."
        );
      }

      await tx.relance.create({
        data: {
          echangeId,
          ordre: transition.ordre,
          destinataireId,
          copieA: envoi?.copieA ?? [],
          modeleId: envoi?.modeleId ?? null,
          envoyeeLe: maintenant,
          messageIdEnvoye: envoi?.messageIdEnvoye ?? null,
          cleIdempotence: `${echangeId}-relance-${transition.ordre}`,
        },
      });
    }

    for (const j of journal) {
      await tx.evenement.create({
        data: {
          type: j.evenement as never,
          libelle: j.libelle,
          echangeId,
          utilisateurId: auteurId ?? null,
          acteur: auteurId ? "UTILISATEUR" : "SYSTEME",
          valeurAvant: j.evenement === "MAIL_REQUALIFIE" ? (valeurAvant as never) : Prisma.JsonNull,
          valeurApres: j.evenement === "MAIL_REQUALIFIE" ? (valeurApres as never) : Prisma.JsonNull,
        },
      });
    }
  });

  for (const a of alertes) console.warn(`[MailFlow] ALERTE · ${a}`);
}

/**
 * Report d'une relance.
 *
 * Ce n'est PAS une transition : l'état de l'échange ne change pas, seule
 * l'échéance bouge. Sans cette soupape, la première semaine d'exploitation
 * produit des relances jugées injustes et le dispositif se fait désactiver.
 */
export async function reporterRelance(
  echangeId: string,
  joursOuvres: number,
  motif: string,
  auteurId?: string
): Promise<void> {
  const cal = await chargerCalendrier();
  const echange = await prisma.echange.findUniqueOrThrow({
    where: { id: echangeId },
    select: { prochaineRelanceLe: true, echeance: true },
  });

  const depart = echange.prochaineRelanceLe ?? echange.echeance ?? new Date();
  const nouvelle = momentEnvoi(ajouterJoursOuvres(depart, joursOuvres, cal), cal);

  await prisma.$transaction(async (tx) => {
    await tx.echange.update({
      where: { id: echangeId },
      data: { prochaineRelanceLe: nouvelle, echeance: nouvelle },
    });
    await tx.travailPlanifie.updateMany({
      where: { echangeId, statut: "EN_ATTENTE", type: "RELANCE" },
      data: { executerA: nouvelle },
    });
    await tx.evenement.create({
      data: {
        type: "RELANCE_REPORTEE",
        libelle: `Reportée de ${joursOuvres} jour${joursOuvres > 1 ? "s" : ""} ouvré${joursOuvres > 1 ? "s" : ""} · ${motif}`,
        echangeId,
        utilisateurId: auteurId ?? null,
        acteur: "UTILISATEUR",
      },
    });
  });
}

// ── Aides au calcul, partagées par les actions ────────────────────────────

/** Échéance et première relance d'un échange que l'on qualifie. */
export async function calculerPremiereEcheance(
  recuLe: Date,
  categorieId: string
): Promise<{ echeance: Date; premiereRelance: Date }> {
  const cal = await chargerCalendrier();
  const regle = await prisma.regleRelance.findFirst({
    where: { categorieId, ordre: 1, actif: true },
    select: { delaiJoursOuvres: true },
  });

  const delai = regle?.delaiJoursOuvres ?? 2;
  const echeance = ajouterJoursOuvres(
    momentEnvoi(recuLe, cal),
    delai,
    cal
  );
  return { echeance, premiereRelance: momentEnvoi(echeance, cal) };
}

/**
 * Ce qui suit une relance de rang donné : la relance suivante si la
 * catégorie en prévoit une, sinon l'escalade.
 */
export async function suiteApresRelance(
  categorieId: string | null,
  ordreEnvoye: number,
  depuis: Date
): Promise<
  | { type: "RELANCE"; ordre: number; quand: Date }
  | { type: "ESCALADE"; quand: Date }
> {
  const cal = await chargerCalendrier();
  const suivante = categorieId
    ? await prisma.regleRelance.findFirst({
        where: { categorieId, ordre: ordreEnvoye + 1, actif: true },
        select: { ordre: true, delaiJoursOuvres: true },
      })
    : null;

  if (suivante) {
    return {
      type: "RELANCE",
      ordre: suivante.ordre,
      quand: momentEnvoi(
        ajouterJoursOuvres(depuis, suivante.delaiJoursOuvres, cal),
        cal
      ),
    };
  }
  return {
    type: "ESCALADE",
    quand: momentEnvoi(ajouterJoursOuvres(depuis, 1, cal), cal),
  };
}

/** Date d'archivage proposée après clôture : une semaine ouvrée plus tard. */
export async function dateArchivage(): Promise<Date> {
  const cal = await chargerCalendrier();
  return momentEnvoi(ajouterJoursOuvres(new Date(), 5, cal), cal);
}

/** Horodatage lisible, utilisé dans les libellés d'événements. */
export function horodatage(d: Date, zone = "Africa/Bamako"): string {
  return DateTime.fromJSDate(d, { zone }).setLocale("fr").toFormat("dd/LL HH:mm");
}
