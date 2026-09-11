/**
 * MailFlow · Tableau complet des 77 requalifications
 *
 * Ce script génère un tableau complet avec toutes les informations
 * pour chaque échange à requalifier.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import fs from "fs";

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
  console.log("=== TABLEAU COMPLET DES 77 REQUALIFICATIONS ===\n");

  // Lire le fichier CSV
  const csvContent = fs.readFileSync("propositions-requalification.csv", "utf-8");
  const lignes = csvContent.split("\n").slice(1); // Skip header

  const corrections: Correction[] = [];
  for (const ligne of lignes) {
    if (!ligne.trim()) continue;
    const parts = ligne.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!parts || parts.length < 7) continue;

    corrections.push({
      id: parts[0].replace(/"/g, ""),
      sujet: parts[1].replace(/"/g, ""),
      categorieActuelle: parts[2].replace(/"/g, ""),
      responsableActuel: parts[3].replace(/"/g, ""),
      categorieProposee: parts[4].replace(/"/g, ""),
      responsablePropose: parts[5].replace(/"/g, ""),
      raison: parts[6].replace(/"/g, ""),
    });
  }

  // Récupérer les données de base pour chaque échange
  const ids = corrections.map(c => c.id);
  const echanges = await prisma.echange.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      statut: true,
      recuLe: true,
      echeance: true,
      categorie: { select: { libelle: true } },
      responsable: { select: { nomComplet: true } },
      correspondant: { select: { email: true } },
    },
  });

  const echangeMap = new Map(echanges.map(e => [e.id, e]));

  console.log("ID | Sujet | Qualification actuelle | Responsable actuel | Nouvelle qualification | Nouveau responsable | Règle | Confiance | Raison");
  console.log("---|-------|------------------------|--------------------|-----------------------|-------------------|-------|----------|--------\n");

  for (const c of corrections) {
    const echange = echangeMap.get(c.id);
    const sujet = c.sujet.substring(0, 30);
    const email = echange?.correspondant?.email ?? "N/A";

    // Déterminer la règle et la confiance
    let regle = "N/A";
    let confiance = "N/A";

    if (c.raison.includes("fiscal")) {
      regle = "Keywords: impôt, fiscal, douane, tutelle";
      confiance = "HAUTE";
    } else if (c.raison.includes("technique")) {
      regle = "Keywords: odoo, gestionnaire, accès";
      confiance = "MOYENNE";
    } else if (c.raison.includes("facturation")) {
      regle = "Keywords: facture, validation";
      confiance = "MOYENNE";
    } else if (c.raison.includes("logistique")) {
      regle = "Keywords: fret, grille de fret";
      confiance = "FAIBLE";
    }

    console.log(`${c.id} | ${sujet} | ${c.categorieActuelle} | ${c.responsableActuel} | ${c.categorieProposee} | ${c.responsablePropose} | ${regle} | ${confiance} | ${c.raison}`);
  }

  console.log(`\nTotal : ${corrections.length} échanges\n`);

  // Cas ambigus
  console.log("=== 8 CAS AMBIGUS ===\n");
  const ambigus = corrections.filter(c => 
    c.raison.includes("facturation") || 
    c.raison.includes("technique") ||
    c.raison.includes("logistique")
  );

  for (const c of ambigus) {
    const echange = echangeMap.get(c.id);
    console.log(`ID : ${c.id}`);
    console.log(`Sujet : ${c.sujet}`);
    console.log(`Actuel : ${c.categorieActuelle} / ${c.responsableActuel}`);
    console.log(`Proposé : ${c.categorieProposee} / ${c.responsablePropose}`);
    console.log(`Raison : ${c.raison}`);
    console.log(`Pourquoi ambigu : Le sujet contient des mots-clés qui pourraient appartenir à plusieurs catégories`);
    
    // Expliquer pourquoi une autre qualification pourrait être correcte
    if (c.raison.includes("technique")) {
      console.log(`Alternative possible : Commercial, offres, contrats (si c'est une demande commerciale liée à Odoo)`);
    } else if (c.raison.includes("facturation")) {
      console.log(`Alternative possible : Commercial, offres, contrats (si c'est une demande de paiement client)`);
    } else if (c.raison.includes("logistique")) {
      console.log(`Alternative possible : Commercial, offres, contrats (si c'est une demande de devis transport)`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
