"use server";

/**
 * MailFlow · Actions de la console
 *
 * Une action serveur par geste de l'utilisateur. Chacune lit le formulaire,
 * appelle le domaine à travers la couche d'exécution, puis rafraîchit la
 * page. Aucune logique métier ici : ce fichier est un traducteur entre un
 * formulaire HTML et une transition.
 *
 * Les erreurs métier (TransitionInterdite, TransitionIncomplete) remontent
 * telles quelles : mieux vaut une erreur visible qu'une écriture silencieuse
 * dans un état incohérent.
 */

import { revalidatePath } from "next/cache";

import {
  appliquerEtPersister,
  calculerPremiereEcheance,
  dateArchivage,
  reporterRelance as reporter,
  suiteApresRelance,
} from "../donnees/executer";
import { classerHorsPerimetreEnLot, qualifierEnLot } from "../donnees/qualification-lot";
import { prisma } from "../lib/prisma";

/** Auteur des actions. À remplacer par la session une fois l'authentification en place. */
async function auteurCourant(): Promise<string | undefined> {
  const u = await prisma.utilisateur.findFirst({
    where: { role: "ADMINISTRATEUR", actif: true },
    select: { id: true },
  });
  return u?.id;
}

function texte(f: FormData, cle: string): string {
  const v = f.get(cle);
  return typeof v === "string" ? v.trim() : "";
}

function requis(f: FormData, cle: string): string {
  const v = texte(f, cle);
  if (!v) throw new Error(`Champ obligatoire manquant : ${cle}.`);
  return v;
}

function rafraichir() {
  revalidatePath("/");
}

// ── Qualification ─────────────────────────────────────────────────────────

export async function qualifier(f: FormData) {
  const echangeId = requis(f, "echangeId");
  const categorieId = requis(f, "categorieId");
  const responsableId = requis(f, "responsableId");

  const [echange, categorie, responsable] = await Promise.all([
    prisma.echange.findUniqueOrThrow({
      where: { id: echangeId },
      select: { recuLe: true },
    }),
    prisma.categorie.findUniqueOrThrow({
      where: { id: categorieId },
      select: { libelle: true },
    }),
    prisma.utilisateur.findUniqueOrThrow({
      where: { id: responsableId },
      select: { nomComplet: true },
    }),
  ]);

  const { echeance, premiereRelance } = await calculerPremiereEcheance(
    echange.recuLe,
    categorieId
  );

  await appliquerEtPersister(
    echangeId,
    {
      type: "QUALIFIER",
      categorie: categorieId,
      responsable: responsableId,
      echeance,
      premiereRelance,
      libelleCategorie: `Catégorie ${categorie.libelle}`,
      libelleResponsable: `Attribué à ${responsable.nomComplet}`,
    },
    await auteurCourant()
  );
  rafraichir();
}

export async function classerHorsPerimetre(f: FormData) {
  await appliquerEtPersister(
    requis(f, "echangeId"),
    { type: "CLASSER_HORS_PERIMETRE", motif: requis(f, "motif") },
    await auteurCourant()
  );
  rafraichir();
}

// ── Suivi courant ─────────────────────────────────────────────────────────

export async function reattribuer(f: FormData) {
  const responsableId = requis(f, "responsableId");
  const u = await prisma.utilisateur.findUniqueOrThrow({
    where: { id: responsableId },
    select: { nomComplet: true },
  });
  await appliquerEtPersister(
    requis(f, "echangeId"),
    {
      type: "REATTRIBUER",
      responsable: responsableId,
      libelleResponsable: u.nomComplet,
    },
    await auteurCourant()
  );
  rafraichir();
}

/**
 * Consigne une relance que l'utilisateur vient d'envoyer lui-même depuis
 * Outlook. Cette action ENREGISTRE UN FAIT, elle n'envoie aucun message :
 * l'envoi automatique appartient au moteur (voir src/moteur/ordonnanceur.ts).
 *
 * Elle reste utile là où le moteur ne va pas : une relance passée au
 * téléphone puis confirmée par écrit, un rappel adressé depuis une autre
 * boîte. Le rang s'incrémente pareillement, donc la relance automatique
 * suivante repartira du bon échelon et avec le bon ton.
 */
export async function consignerRelance(f: FormData) {
  const echangeId = requis(f, "echangeId");
  const echange = await prisma.echange.findUniqueOrThrow({
    where: { id: echangeId },
    select: { nbRelances: true, categorieId: true },
  });

  const ordre = echange.nbRelances + 1;
  const suite = await suiteApresRelance(
    echange.categorieId,
    ordre,
    new Date()
  );

  await appliquerEtPersister(
    echangeId,
    { type: "RELANCER", ordre, suite },
    await auteurCourant()
  );
  rafraichir();
}

export async function reporterRelance(f: FormData) {
  const jours = Number(texte(f, "jours") || "1");
  await reporter(
    requis(f, "echangeId"),
    Number.isFinite(jours) && jours > 0 ? Math.floor(jours) : 1,
    texte(f, "motif") || "Report demandé depuis la console",
    await auteurCourant()
  );
  rafraichir();
}

export async function escalader(f: FormData) {
  await appliquerEtPersister(
    requis(f, "echangeId"),
    { type: "ESCALADER" },
    await auteurCourant()
  );
  rafraichir();
}

// ── Clôtures ──────────────────────────────────────────────────────────────

/** Réponse obtenue hors messagerie : téléphone, réunion, remise en main propre. */
export async function declarerReponse(f: FormData) {
  const canal = requis(f, "canal") as
    | "TELEPHONE"
    | "REUNION"
    | "WHATSAPP"
    | "PHYSIQUE";

  await appliquerEtPersister(
    requis(f, "echangeId"),
    {
      type: "DECLARER_REPONSE",
      reponduLe: new Date(),
      canal,
      archiverLe: await dateArchivage(),
    },
    await auteurCourant()
  );
  rafraichir();
}

export async function classerSansSuite(f: FormData) {
  await appliquerEtPersister(
    requis(f, "echangeId"),
    {
      type: "CLASSER_SANS_SUITE",
      motif: requis(f, "motif"),
      archiverLe: await dateArchivage(),
    },
    await auteurCourant()
  );
  rafraichir();
}

// ── Actions en lot ─────────────────────────────────────────────────────────────

/**
 * Qualifie plusieurs échanges en une seule action.
 *
 * Les IDs sont transmis sous forme de chaîne séparée par des virgules.
 */
export async function qualifierEnLotAction(f: FormData) {
  const ids = texte(f, "echangeIds");
  const categorieId = requis(f, "categorieId");
  const responsableId = requis(f, "responsableId");

  if (!ids) throw new Error("Aucun échange sélectionné");

  const echangeIds = ids.split(",").filter(Boolean);
  const { qualifies, echecs } = await qualifierEnLot(
    echangeIds,
    categorieId,
    responsableId,
    await auteurCourant()
  );

  if (echecs.length > 0) {
    console.warn(`${echecs.length} échecs sur ${echangeIds.length} échanges`);
  }

  rafraichir();
}

/**
 * Classe plusieurs échanges hors périmètre avec le même motif.
 */
export async function classerHorsPerimetreEnLotAction(f: FormData) {
  const ids = texte(f, "echangeIds");
  const motif = requis(f, "motif");

  if (!ids) throw new Error("Aucun échange sélectionné");

  const echangeIds = ids.split(",").filter(Boolean);
  const { classes, echecs } = await classerHorsPerimetreEnLot(
    echangeIds,
    motif,
    await auteurCourant()
  );

  if (echecs.length > 0) {
    console.warn(`${echecs.length} échecs sur ${echangeIds.length} échanges`);
  }

  rafraichir();
}
