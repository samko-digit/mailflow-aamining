import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function verify() {
  console.log("=== VÉRIFICATION DU COMPTE DE TRAVAUX EN RETARD ===\n");

  const maintenant = new Date();
  console.log(`Date/heure actuelle : ${maintenant.toISOString()}\n`);

  // Travaux en retard (logique du script)
  const travauxEnRetard = await prisma.travailPlanifie.findMany({
    where: {
      executerA: { lt: maintenant },
      statut: "EN_ATTENTE",
    },
    select: { id: true, type: true, executerA: true, statut: true }
  });

  console.log(`Travaux en retard (executerA < maintenant && statut = EN_ATTENTE) : ${travauxEnRetard.length}\n`);

  for (const t of travauxEnRetard.slice(0, 5)) {
    console.log(`- ${t.id} : ${t.type}, exécution : ${t.executerA.toISOString()}, statut : ${t.statut}`);
  }

  // Travaux créés récemment
  const travauxRecents = await prisma.travailPlanifie.findMany({
    where: {
      creeLe: { gte: new Date('2026-09-09T11:19:00.000Z') },
      statut: "EN_ATTENTE"
    },
    select: { id: true, type: true, executerA: true, creeLe: true }
  });

  console.log(`\nTravaux créés récemment (creeLe >= 11:19:00) : ${travauxRecents.length}\n`);

  for (const t of travauxRecents.slice(0, 5)) {
    console.log(`- ${t.id} : ${t.type}, exécution : ${t.executerA.toISOString()}, créé : ${t.creeLe.toISOString()}`);
    console.log(`  En retard : ${t.executerA < maintenant}`);
  }

  await prisma.$disconnect();
}

verify().catch(e => {
  console.error("Erreur:", e);
  process.exit(1);
});
