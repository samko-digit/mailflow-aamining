import { prisma } from "../src/lib/prisma.ts";

async function main() {
  const aQualifier = await prisma.echange.count({ where: { statut: "A_QUALIFIER" } });
  const enAttente = await prisma.echange.count({ where: { statut: "EN_ATTENTE" } });
  const relance = await prisma.echange.count({ where: { statut: "RELANCE" } });
  
  console.log("État actuel de la base :");
  console.log(`  A_QUALIFIER : ${aQualifier}`);
  console.log(`  EN_ATTENTE : ${enAttente}`);
  console.log(`  RELANCE : ${relance}`);
  
  await prisma.$disconnect();
}

main();
