import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import fs from "fs";

async function main() {
  const evenementsAttribue = await prisma.evenement.findMany({
    where: { type: "MAIL_ATTRIBUE" },
    select: {
      id: true,
      type: true,
      echangeId: true,
      creeLe: true,
      acteur: true,
    },
    orderBy: { creeLe: "asc" }
  });

  console.log(`Événements MAIL_ATTRIBUE : ${evenementsAttribue.length}\n`);

  // Load CSV to get requalified exchange IDs
  const csvContent = fs.readFileSync("propositions-requalification.csv", "utf-8");
  const lignes = csvContent.split("\n").slice(1);
  const idsRequalifies: string[] = [];
  for (const ligne of lignes) {
    if (!ligne.trim()) continue;
    // Extract ID from first quoted field
    const match = ligne.match(/^"([^"]+)"/);
    if (match) {
      idsRequalifies.push(match[1]);
    }
  }

  // Classify events
  const requalificationsRecentes = evenementsAttribue.filter(e =>
    e.echangeId && idsRequalifies.includes(e.echangeId)
  );

  const historiques = evenementsAttribue.filter(e =>
    !e.echangeId || !idsRequalifies.includes(e.echangeId)
  );

  console.log(`Événements liés aux 77 requalifications : ${requalificationsRecentes.length}`);
  console.log(`Événements historiques préexistants : ${historiques.length}\n`);

  // Show first few historical events
  console.log("Premiers événements historiques :");
  for (const e of historiques.slice(0, 5)) {
    console.log(`  ${e.creeLe.toISOString()} - ${e.echangeId} - ${e.acteur}`);
  }

  console.log("\nDerniers événements historiques :");
  for (const e of historiques.slice(-5)) {
    console.log(`  ${e.creeLe.toISOString()} - ${e.echangeId} - ${e.acteur}`);
  }

  await prisma.$disconnect();
}

main();
