/**
 * MailFlow · Composition d'une relance
 *
 * Transforme un dossier en un message prêt à partir. C'est le chaînon entre
 * la base, qui sait QUI relancer et POURQUOI, et `garde-envoi.ts`, qui sait
 * si le message a le droit de sortir.
 *
 * Ce module LIT. Les règles qu'il applique, à qui la relance s'adresse et
 * comment le gabarit se remplit, vivent dans `domaine/relance.ts`, sans base
 * ni réseau, et s'y testent seules.
 *
 * ── LE CHAÎNAGE N'EST PAS UN DÉTAIL DE PRÉSENTATION ───────────────────────
 *
 * La relance cite le fil d'origine (`In-Reply-To`, `References`) pour deux
 * raisons. Elle arrive dans le bon fil chez le destinataire, c'est le confort.
 * Et surtout la réponse qu'il écrira citera ce fil à son tour, ce qui permet
 * à la détection de la reconnaître et d'arrêter les relances : c'est la
 * boucle de rétroaction du dispositif entier.
 */

import type { MessageASortir } from "../connecteur/envoi";
import {
  type ReglagesEnvoi,
  preparerRelance,
  reglagesDepuisEnv,
} from "../connecteur/garde-envoi";
import {
  type Equipe,
  type RegleDestinataire,
  resoudreDestinataire,
  variablesRelance,
} from "../domaine/relance";
import { chargerCalendrier } from "../domaine/calendrier";
import { prisma } from "../lib/prisma";

// ── Composition complète ───────────────────────────────────────────────────

export type Sortant =
  | {
      pret: true;
      message: MessageASortir;
      /** Utilisateur destinataire, à inscrire dans la ligne de relance. */
      destinataireId: string;
      copieA: string[];
      modeleId: string;
      /** Pourquoi cette personne plutôt qu'une autre. Trace dans le journal. */
      motifDestinataire: string;
    }
  | { pret: false; raison: string };

type Choix = {
  regle: RegleDestinataire;
  copieA: string[];
  /** Modèle imposé par la règle de relance, prioritaire. */
  modeleId: string | null;
  /** Repli par code quand la règle n'en désigne aucun. */
  modeleCode: string | null;
  type: "relance" | "escalade";
};

async function assembler(
  echangeId: string,
  choix: Choix,
  maintenant: Date,
  reglages: ReglagesEnvoi
): Promise<Sortant> {
  const e = await prisma.echange.findUnique({
    where: { id: echangeId },
    select: {
      numero: true,
      sujet: true,
      recuLe: true,
      echeance: true,
      webLink: true,
      correspondant: { select: { email: true, nom: true, organisation: true } },
      responsable: {
        select: {
          id: true,
          email: true,
          nomComplet: true,
          actif: true,
          suppleant: {
            select: { id: true, email: true, nomComplet: true, actif: true },
          },
          // Absence en cours à cet instant précis, pas « une absence un jour ».
          absences: {
            select: { id: true },
            take: 1,
            where: { debut: { lte: maintenant }, fin: { gte: maintenant } },
          },
        },
      },
      categorie: {
        select: {
          escaladeVers: {
            select: { id: true, email: true, nomComplet: true, actif: true },
          },
        },
      },
      messages: {
        where: { sens: "ENTRANT" },
        orderBy: { dateMessage: "desc" },
        take: 1,
        select: { internetMessageId: true, references: true },
      },
    },
  });

  if (!e) return { pret: false, raison: "échange introuvable" };

  // ── Le modèle ───────────────────────────────────────────────────────────
  const modele = choix.modeleId
    ? await prisma.modeleMessage.findUnique({ where: { id: choix.modeleId } })
    : choix.modeleCode
      ? await prisma.modeleMessage.findUnique({ where: { code: choix.modeleCode } })
      : null;

  if (!modele || !modele.actif) {
    const quoi = choix.modeleId ?? choix.modeleCode ?? "aucun";
    return { pret: false, raison: `modèle de message introuvable ou inactif : ${quoi}` };
  }

  // ── Le destinataire ─────────────────────────────────────────────────────
  const equipe: Equipe = {
    responsable: e.responsable
      ? {
          id: e.responsable.id,
          email: e.responsable.email,
          nomComplet: e.responsable.nomComplet,
          actif: e.responsable.actif,
        }
      : null,
    suppleant: e.responsable?.suppleant ?? null,
    escalade: e.categorie?.escaladeVers ?? null,
  };

  const cible = resoudreDestinataire(
    choix.regle,
    equipe,
    (e.responsable?.absences.length ?? 0) > 0
  );
  if (!cible.trouve) return { pret: false, raison: cible.raison };

  // ── Les variables ───────────────────────────────────────────────────────
  const cal = await chargerCalendrier();
  const variables = variablesRelance(
    {
      numero: e.numero,
      sujet: e.sujet,
      recuLe: e.recuLe,
      echeance: e.echeance,
      webLink: e.webLink,
      correspondantEmail: e.correspondant.email,
      correspondantNom: e.correspondant.nom,
      correspondantOrganisation: e.correspondant.organisation,
    },
    maintenant,
    cal
  );

  // ── Le chaînage ─────────────────────────────────────────────────────────
  // On se raccroche au DERNIER message entrant du fil : c'est celui qui attend
  // une réponse, et c'est ce que ferait un client de messagerie.
  const origine = e.messages[0] ?? null;

  const prepare = preparerRelance({
    modeleSujet: modele.sujet,
    modeleCorps: modele.corps,
    variables,
    destinataires: [cible.personne.email],
    copie: choix.copieA,
    identifiantOrigine: origine?.internetMessageId ?? null,
    referencesOrigine: origine?.references ?? [],
    reglages,
  });

  if (!prepare.pret) return { pret: false, raison: prepare.raison };

  return {
    pret: true,
    message: { ...prepare.message, type: choix.type },
    destinataireId: cible.personne.id,
    copieA: choix.copieA,
    modeleId: modele.id,
    motifDestinataire: `${cible.personne.nomComplet} · ${cible.motif}`,
  };
}

/** Compose la relance de rang `ordre` d'un échange. */
export async function composerRelance(
  echangeId: string,
  ordre: number,
  maintenant: Date,
  reglages: ReglagesEnvoi = reglagesDepuisEnv()
): Promise<Sortant> {
  const echange = await prisma.echange.findUnique({
    where: { id: echangeId },
    select: { categorieId: true },
  });
  if (!echange) return { pret: false, raison: "échange introuvable" };
  if (!echange.categorieId) {
    return {
      pret: false,
      raison: "échange sans catégorie : aucune règle de relance ne s'applique",
    };
  }

  const regle = await prisma.regleRelance.findFirst({
    where: { categorieId: echange.categorieId, ordre, actif: true },
    select: { destinataire: true, copieA: true, modeleId: true },
  });

  if (!regle) {
    return {
      pret: false,
      raison: `aucune règle active de rang ${ordre} pour cette catégorie`,
    };
  }

  return assembler(
    echangeId,
    {
      regle: regle.destinataire as RegleDestinataire,
      copieA: regle.copieA,
      modeleId: regle.modeleId,
      modeleCode: "RAPPEL_COURTOIS",
      type: "relance",
    },
    maintenant,
    reglages
  );
}

/**
 * Compose la note d'escalade.
 *
 * Une escalade muette ne sert à rien : changer le statut sans prévenir
 * personne revient à ranger le dossier dans un tiroir. Elle emprunte le
 * modèle « ESCALADE » et la personne désignée sur la catégorie.
 */
export async function composerEscalade(
  echangeId: string,
  maintenant: Date,
  reglages: ReglagesEnvoi = reglagesDepuisEnv()
): Promise<Sortant> {
  return assembler(
    echangeId,
    {
      regle: "ESCALADE",
      copieA: [],
      modeleId: null,
      modeleCode: "ESCALADE",
      type: "escalade",
    },
    maintenant,
    reglages
  );
}
