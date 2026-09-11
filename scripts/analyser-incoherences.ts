/**
 * MailFlow · Analyse détaillée des 77 incohérences
 *
 * Pour chaque incohérence détectée, propose une nouvelle catégorie
 * et un nouveau responsable basés sur l'analyse du sujet.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== Analyse détaillée des incohérences ===\n");

  // Récupérer les catégories et responsables
  const categories = await prisma.categorie.findMany({
    select: { id: true, libelle: true },
  });
  const responsables = await prisma.utilisateur.findMany({
    select: { id: true, nomComplet: true },
  });

  const catMap = new Map(categories.map(c => [c.libelle, c.id]));
  const respMap = new Map(responsables.map(r => [r.nomComplet, r.id]));

  // Récupérer tous les échanges EN_ATTENTE
  const qualifies = await prisma.echange.findMany({
    where: {
      statut: "EN_ATTENTE",
      categorieId: { not: null },
      responsableId: { not: null },
    },
    select: {
      id: true,
      sujet: true,
      categorieId: true,
      responsableId: true,
      categorie: {
        select: { libelle: true },
      },
      responsable: {
        select: { nomComplet: true },
      },
    },
  });

  const incoherences: Array<{
    id: string;
    sujet: string;
    categorieActuelle: string;
    responsableActuel: string;
    categorieProposee: string;
    responsablePropose: string;
    raison: string;
  }> = [];

  // Analyser chaque échange
  for (const e of qualifies) {
    const sujet = e.sujet.toLowerCase();
    const categorieActuelle = e.categorie?.libelle ?? "N/A";
    const responsableActuel = e.responsable?.nomComplet ?? "N/A";

    let categorieProposee: string | null = null;
    let responsablePropose: string | null = null;
    let raison = "";

    // Règles de classification basées sur le sujet
    if (sujet.includes("impôt") || sujet.includes("fiscal") || sujet.includes("douane") || sujet.includes("tutelle")) {
      if (categorieActuelle !== "Date butoir imposée (tutelle, douane, fiscalité)") {
        categorieProposee = "Date butoir imposée (tutelle, douane, fiscalité)";
        responsablePropose = "Fatoumata Diallo"; // À adapter selon l'organisation
        raison = "Sujet fiscal/administratif";
      }
    } else if (sujet.includes("facture") || sujet.includes("facturation") || sujet.includes("paiement")) {
      if (categorieActuelle !== "Administratif courant, personnel") {
        categorieProposee = "Administratif courant, personnel";
        responsablePropose = "Bintou Keïta"; // À adapter
        raison = "Sujet facturation/administratif";
      }
    } else if (sujet.includes("fret") || sujet.includes("transit") || sujet.includes("logistique") || sujet.includes("approvisionnement")) {
      if (categorieActuelle !== "Approvisionnement, logistique, transit") {
        categorieProposee = "Approvisionnement, logistique, transit";
        responsablePropose = "Seydou Coulibaly"; // À adapter
        raison = "Sujet logistique/approvisionnement";
      }
    } else if (sujet.includes("odoo") || sujet.includes("accès") || sujet.includes("informatique") || sujet.includes("système")) {
      if (categorieActuelle !== "Technique, exploitation") {
        categorieProposee = "Technique, exploitation";
        responsablePropose = "Seydou Coulibaly"; // À adapter
        raison = "Sujet technique/informatique";
      }
    } else if (sujet.includes("rendez-vous") || sujet.includes("présentation") || sujet.includes("offre") || sujet.includes("contrat")) {
      if (categorieActuelle !== "Commercial, offres, contrats") {
        categorieProposee = "Commercial, offres, contrats";
        responsablePropose = "Mamadou Berthé";
        raison = "Sujet commercial";
      }
    }

    if (categorieProposee) {
      incoherences.push({
        id: e.id,
        sujet: e.sujet,
        categorieActuelle,
        responsableActuel,
        categorieProposee,
        responsablePropose: responsablePropose!,
        raison,
      });
    }
  }

  console.log(`${incoherences.length} incohérences détectées\n`);

  // Afficher les incohérences par catégorie proposée
  const parCategorieProposee = new Map<string, typeof incoherences>();
  for (const i of incoherences) {
    if (!parCategorieProposee.has(i.categorieProposee)) {
      parCategorieProposee.set(i.categorieProposee, []);
    }
    parCategorieProposee.get(i.categorieProposee)!.push(i);
  }

  console.log("=== Répartition par catégorie proposée ===\n");
  for (const [cat, liste] of parCategorieProposee) {
    console.log(`${cat}: ${liste.length} échanges`);
  }

  console.log("\n=== Détail des incohérences (20 premiers) ===\n");
  for (const i of incoherences.slice(0, 20)) {
    console.log(`${i.id}: ${i.sujet}`);
    console.log(`  Actuel: ${i.categorieActuelle} / ${i.responsableActuel}`);
    console.log(`  Proposé: ${i.categorieProposee} / ${i.responsablePropose}`);
    console.log(`  Raison: ${i.raison}`);
    console.log();
  }

  // Générer un fichier CSV pour validation humaine
  const csvHeader = "ID,Sujet,Categorie Actuelle,Responsable Actuel,Categorie Proposee,Responsable Propose,Raison\n";
  const csvRows = incoherences.map(i =>
    `"${i.id}","${i.sujet}","${i.categorieActuelle}","${i.responsableActuel}","${i.categorieProposee}","${i.responsablePropose}","${i.raison}"`
  ).join("\n");

  const csvContent = csvHeader + csvRows;

  // Écrire le fichier CSV
  const fs = await import("fs");
  fs.writeFileSync("propositions-requalification.csv", csvContent, "utf-8");

  console.log("=== Fichier CSV généré pour validation humaine ===");
  console.log("Fichier : propositions-requalification.csv");
  console.log(`${incoherences.length} lignes écrites`);
  console.log();
  console.log("Répartition par catégorie proposée :");
  for (const [cat, liste] of parCategorieProposee) {
    console.log(`  ${cat}: ${liste.length} échanges`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
