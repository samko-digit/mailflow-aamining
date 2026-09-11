/**
 * MailFlow · Vérification des 8 cas ambigus de requalification
 *
 * Ce script identifie et détaille les cas ambigus qui nécessitent
 * une validation humaine avant application.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

interface Correction {
  id: string;
  sujet: string;
  categorieActuelle: string;
  responsableActuel: string;
  categorieProposee: string;
  responsablePropose: string;
  raison: string;
}

async function main() {
  console.log("=== VÉRIFICATION DES CAS AMBIGUS ===\n");

  const csvPath = path.join(process.cwd(), "propositions-requalification.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter(l => l.trim());
  const header = lines[0].split(",");
  const corrections: Correction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    if (values.length !== header.length) continue;
    const correction: any = {};
    header.forEach((h, idx) => {
      correction[h.trim()] = values[idx]?.trim().replace(/"/g, "");
    });
    corrections.push(correction as Correction);
  }

  console.log(`Total propositions : ${corrections.length}\n`);

  // Identifier les cas ambigus (basé sur la raison)
  const casAmbigus = corrections.filter(c => 
    c.raison.includes("ambigu") || 
    c.raison.includes("faible") ||
    c.raison.includes("peu de données")
  );

  console.log(`Cas ambigus détectés : ${casAmbigus.length}\n`);

  if (casAmbigus.length === 0) {
    console.log("Aucun cas ambigu détecté dans le CSV.\n");
    await prisma.$disconnect();
    return;
  }

  console.log("=== DÉTAIL DES CAS AMBIGUS ===\n");

  for (const c of casAmbigus) {
    console.log(`ID échange : ${c.id}`);
    console.log(`Sujet : ${c.sujet}`);
    console.log(`Catégorie actuelle : ${c.categorieActuelle}`);
    console.log(`Responsable actuel : ${c.responsableActuel}`);
    console.log(`Catégorie proposée : ${c.categorieProposee}`);
    console.log(`Responsable proposé : ${c.responsablePropose}`);
    console.log(`Raison : ${c.raison}`);
    console.log(`Décision attendue : Validation humaine requise`);
    console.log();
  }

  // Vérifier que ces cas ne sont pas appliqués automatiquement
  console.log("=== CONTRÔLE DE SÉCURITÉ ===\n");
  console.log("Les cas ambigus ne doivent JAMAIS être appliqués automatiquement.");
  console.log("Ils nécessitent une modification manuelle du CSV pour confirmer ou rejeter.");
  console.log("Le script corriger-qualifications.ts lira le CSV modifié avant --confirm.\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
