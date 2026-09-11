import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const travauxSansEchange = await prisma.travailPlanifie.findMany({
    where: { echangeId: null },
    select: {
      id: true,
      type: true,
      statut: true,
      executerA: true,
      cleIdempotence: true,
      creeLe: true,
    },
    orderBy: { creeLe: "desc" }
  });

  console.log(`Travaux sans échange : ${travauxSansEchange.length}\n`);

  for (const t of travauxSansEchange) {
    console.log(`ID: ${t.id}`);
    console.log(`  Type: ${t.type}`);
    console.log(`  Statut: ${t.statut}`);
    console.log(`  Exécution: ${t.executerA.toISOString()}`);
    console.log(`  Clé idempotence: ${t.cleIdempotence}`);
    console.log(`  Créé le: ${t.creeLe.toISOString()}`);
    console.log();
  }

  await prisma.$disconnect();
}

main();
