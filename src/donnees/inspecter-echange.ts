/**
 * MailFlow · Inspection des données d'échange
 *
 * Fonction temporaire pour vérifier les données réellement disponibles
 * avant modification de la fiche.
 */

import { prisma } from "../lib/prisma";

export async function inspecterEchange(id: string) {
  const echange = await prisma.echange.findUnique({
    where: { id },
    include: {
      correspondant: true,
      categorie: {
        include: {
          escaladeVers: true,
        },
      },
      responsable: true,
      relances: {
        orderBy: { envoyeeLe: "desc" },
        take: 10,
        include: {
          destinataire: true,
          modele: true,
        },
      },
      travaux: {
        where: { statut: { in: ["EN_ATTENTE", "EN_COURS"] } },
        orderBy: { executerA: "asc" },
        take: 5,
      },
      evenements: {
        orderBy: { creeLe: "desc" },
        take: 20,
        include: {
          utilisateur: true,
        },
      },
      messages: {
        orderBy: { dateMessage: "asc" },
        take: 10,
      },
    },
  });

  if (!echange) {
    return null;
  }

  // Inspecter la structure de TravailPlanifie.charge
  const travauxAvecCharge = await prisma.travailPlanifie.findMany({
    where: {
      echangeId: id,
      statut: { in: ["EN_ATTENTE", "EN_COURS"] },
    },
    take: 3,
  });

  return {
    echange,
    travauxAvecCharge,
  };
}
