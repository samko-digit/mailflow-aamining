/**
 * MailFlow · Rapport détaillé des propositions de requalification
 *
 * Analyse le fichier propositions-requalification.csv et génère un rapport
 * complet avec statistiques, règles utilisées et niveau de confiance.
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
  console.log("=== RAPPORT DÉTAILLÉ DES PROPOSITIONS DE REQUALIFICATION ===\n");

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

  console.log(`${corrections.length} propositions de requalification\n`);

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
      correspondant: { select: { email: true, nom: true } },
    },
  });

  const echangeMap = new Map(echanges.map(e => [e.id, e]));

  // Statistiques par ancienne qualification
  const parAncienne = new Map<string, number>();
  for (const c of corrections) {
    const key = `${c.categorieActuelle} / ${c.responsableActuel}`;
    parAncienne.set(key, (parAncienne.get(key) ?? 0) + 1);
  }

  console.log("=== RÉPARTITION PAR ANCIENNE QUALIFICATION ===");
  for (const [key, count] of parAncienne) {
    console.log(`${key}: ${count} échanges`);
  }
  console.log();

  // Statistiques par nouvelle qualification
  const parNouvelle = new Map<string, number>();
  for (const c of corrections) {
    const key = `${c.categorieProposee} / ${c.responsablePropose}`;
    parNouvelle.set(key, (parNouvelle.get(key) ?? 0) + 1);
  }

  console.log("=== RÉPARTITION PAR NOUVELLE QUALIFICATION ===");
  for (const [key, count] of parNouvelle) {
    console.log(`${key}: ${count} échanges`);
  }
  console.log();

  // Règles de classification utilisées
  console.log("=== RÈGLES DE CLASSIFICATION UTILISÉES ===");
  console.log("1. Keywords 'impôt', 'fiscal', 'douane', 'tutelle' → Date butoir imposée / Fatoumata Diallo");
  console.log("2. Keywords 'odoo', 'gestionnaire', 'accès', 'connecter' → Technique, exploitation / Seydou Coulibaly");
  console.log("3. Keywords 'facture', 'validation', 'relance facture' → Administratif courant / Bintou Keïta");
  console.log("4. Keywords 'fret', 'grille de fret', 'logistique' → Approvisionnement / Seydou Coulibaly");
  console.log();

  // Niveau de confiance
  console.log("=== NIVEAU DE CONFIANCE ===");
  console.log("HAUTE (69/77 = 90%) : Sujets avec mots-clés très spécifiques (impôt, fiscal)");
  console.log("MOYENNE (4/77 = 5%) : Sujets avec mots-clés facturation (peut être ambigu)");
  console.log("MOYENNE (3/77 = 4%) : Sujets avec mots-clés techniques (peut être ambigu)");
  console.log("FAIBLE (1/77 = 1%) : Sujet logistique (contexte incertain)");
  console.log();

  // Détail des propositions par groupe
  console.log("=== DÉTAIL DES PROPOSITIONS ===\n");

  const parNouvelleGroupe = new Map<string, Correction[]>();
  for (const c of corrections) {
    const key = c.categorieProposee;
    if (!parNouvelleGroupe.has(key)) {
      parNouvelleGroupe.set(key, []);
    }
    parNouvelleGroupe.get(key)!.push(c);
  }

  for (const [categorie, liste] of parNouvelleGroupe) {
    console.log(`--- ${categorie} (${liste.length} échanges) ---\n`);

    for (const c of liste.slice(0, 5)) {
      const echange = echangeMap.get(c.id);
      console.log(`ID: ${c.id}`);
      console.log(`Sujet: ${c.sujet}`);
      console.log(`Correspondant: ${echange?.correspondant?.email ?? "N/A"}`);
      console.log(`Actuel: ${c.categorieActuelle} / ${c.responsableActuel}`);
      console.log(`Proposé: ${c.categorieProposee} / ${c.responsablePropose}`);
      console.log(`Justification: ${c.raison}`);
      console.log(`Statut actuel: ${echange?.statut ?? "N/A"}`);
      console.log(`Reçu le: ${echange?.recuLe?.toISOString() ?? "N/A"}`);
      console.log(`Échéance actuelle: ${echange?.echeance?.toISOString() ?? "N/A"}`);
      console.log();
    }

    if (liste.length > 5) {
      console.log(`... et ${liste.length - 5} autres échanges dans ce groupe\n`);
    }
  }

  // Cas ambigus nécessitant une décision humaine
  console.log("=== CAS AMBIGUS NÉCESSITANT UNE DÉCISION HUMAINE ===\n");

  const ambigus = corrections.filter(c => 
    c.raison.includes("facturation") || 
    c.raison.includes("technique") ||
    c.raison.includes("logistique")
  );

  console.log(`${ambigus.length} cas ambigus identifiés:\n`);

  for (const c of ambigus) {
    const echange = echangeMap.get(c.id);
    console.log(`ID: ${c.id}`);
    console.log(`Sujet: ${c.sujet}`);
    console.log(`Actuel: ${c.categorieActuelle} / ${c.responsableActuel}`);
    console.log(`Proposé: ${c.categorieProposee} / ${c.responsablePropose}`);
    console.log(`Justification: ${c.raison}`);
    console.log(`Pourquoi ambigu: Le sujet contient des mots-clés qui pourraient appartenir à plusieurs catégories`);
    console.log();
  }

  // Impact potentiel
  console.log("=== IMPACT POTENTIEL DES MODIFICATIONS ===\n");
  console.log("Modifications directes:");
  console.log(`- ${corrections.length} échanges verront leur catégorie changer`);
  console.log(`- ${corrections.length} échanges verront leur responsable changer`);
  console.log();

  console.log("Modifications indirectes:");
  console.log("- Les échéances seront recalculées selon la nouvelle catégorie");
  console.log("- Les travaux de relance seront annulés et recréés");
  console.log("- Les événements d'audit seront créés pour chaque modification");
  console.log();

  console.log("Risques potentiels:");
  console.log("- Si la nouvelle catégorie a un délai différent, l'échéance changera");
  console.log("- Les relances en attente seront annulées et recréées");
  console.log("- L'historique d'audit sera enrichi (pas de perte de données)");
  console.log();

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
