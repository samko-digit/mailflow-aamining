/**
 * MailFlow · Vérification de l'audit après qualification en lot
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== Vérification de l'audit ===\n");

  // Compter les événements créés récemment
  const depuis = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
  const evenementsRecents = await prisma.evenement.count({
    where: { creeLe: { gte: depuis } },
  });

  console.log(`Événements créés dans les 10 dernières minutes : ${evenementsRecents}`);

  // Détail par type
  const parType = await prisma.evenement.groupBy({
    by: ["type"],
    where: { creeLe: { gte: depuis } },
    _count: { _all: true },
  });

  console.log("\nPar type :");
  for (const ligne of parType) {
    console.log(`  ${ligne.type}: ${ligne._count._all}`);
  }

  // Vérifier que chaque échange qualifié a les événements attendus
  const qualifies = await prisma.echange.findMany({
    where: { statut: "EN_ATTENTE", categorieId: { not: null }, responsableId: { not: null } },
    select: { id: true },
    take: 5,
  });

  console.log("\n=== Événements par échange (5 premiers) ===");
  for (const e of qualifies) {
    const evs = await prisma.evenement.findMany({
      where: { echangeId: e.id },
      select: { type: true, libelle: true, creeLe: true },
      orderBy: { creeLe: "desc" },
      take: 3,
    });
    console.log(`\nÉchange ${e.id}:`);
    for (const ev of evs) {
      console.log(`  ${ev.type}: ${ev.libelle}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
