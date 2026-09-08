/**
 * MailFlow · Qualification en lot
 *
 * Permet de qualifier plusieurs échanges d'un coup avec la même catégorie
 * et le même responsable. Réduit le goulot d'étranglement de la phase 6.
 */

import { DateTime } from "luxon";

import { appliquerEtPersister, calculerPremiereEcheance } from "./executer";
import { prisma } from "../lib/prisma";

/**
 * Qualifie plusieurs échanges avec la même catégorie et le même responsable.
 *
 * Chaque échange reçoit sa propre échéance calculée selon sa date de réception,
 * mais tous partagent la même catégorie et le même responsable.
 *
 * Retourne le nombre d'échanges qualifiés et la liste des IDs en échec.
 */
export async function qualifierEnLot(
  echangeIds: string[],
  categorieId: string,
  responsableId: string,
  auteurId?: string
): Promise<{ qualifies: number; echecs: string[] }> {
  const echecs: string[] = [];
  let qualifies = 0;

  // Récupérer les échanges avec leurs dates de réception
  const echanges = await prisma.echange.findMany({
    where: { id: { in: echangeIds }, statut: "A_QUALIFIER" },
    select: { id: true, recuLe: true },
  });

  // Récupérer la catégorie pour le libellé
  const categorie = await prisma.categorie.findUnique({
    where: { id: categorieId },
    select: { libelle: true },
  });

  // Récupérer le responsable pour le libellé
  const responsable = await prisma.utilisateur.findUnique({
    where: { id: responsableId },
    select: { nomComplet: true },
  });

  if (!categorie || !responsable) {
    throw new Error("Catégorie ou responsable introuvable");
  }

  // Traiter chaque échange individuellement pour calculer l'échéance propre
  for (const echange of echanges) {
    try {
      const { echeance, premiereRelance } = await calculerPremiereEcheance(
        echange.recuLe,
        categorieId
      );

      await appliquerEtPersister(
        echange.id,
        {
          type: "QUALIFIER",
          categorie: categorieId,
          responsable: responsableId,
          echeance,
          premiereRelance,
          libelleCategorie: `Catégorie ${categorie.libelle}`,
          libelleResponsable: `Attribué à ${responsable.nomComplet}`,
        },
        auteurId
      );
      qualifies++;
    } catch (erreur) {
      console.error(`Échec qualification ${echange.id}:`, erreur);
      echecs.push(echange.id);
    }
  }

  return { qualifies, echecs };
}

/**
 * Classe plusieurs échanges hors périmètre avec le même motif.
 *
 * Alimente la liste d'exclusion avec le motif fourni.
 */
export async function classerHorsPerimetreEnLot(
  echangeIds: string[],
  motif: string,
  auteurId?: string
): Promise<{ classes: number; echecs: string[] }> {
  const echecs: string[] = [];
  let classes = 0;

  const echanges = await prisma.echange.findMany({
    where: { id: { in: echangeIds }, statut: "A_QUALIFIER" },
    select: { id: true, correspondantId: true },
  });

  for (const echange of echanges) {
    try {
      await appliquerEtPersister(
        echange.id,
        { type: "CLASSER_HORS_PERIMETRE", motif },
        auteurId
      );
      classes++;
    } catch (erreur) {
      console.error(`Échec classement ${echange.id}:`, erreur);
      echecs.push(echange.id);
    }
  }

  return { classes, echecs };
}
