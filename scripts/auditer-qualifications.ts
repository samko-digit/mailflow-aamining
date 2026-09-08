/**
 * MailFlow · Audit des 100 qualifications effectuées
 *
 * Analyse les échanges qualifiés pour vérifier la cohérence métier
 * des attributions de catégorie et de responsable.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { suggérerPourCorrespondant } from "../src/donnees/suggestion.ts";

async function main() {
  console.log("=== Audit des qualifications effectuées ===\n");

  // Récupérer les échanges qualifiés récemment (EN_ATTENTE avec catégorie et responsable)
  const qualifies = await prisma.echange.findMany({
    where: {
      statut: "EN_ATTENTE",
      categorieId: { not: null },
      responsableId: { not: null },
    },
    select: {
      id: true,
      sujet: true,
      recuLe: true,
      categorieId: true,
      responsableId: true,
      echeance: true,
      correspondant: {
        select: {
          id: true,
          email: true,
          nom: true,
        },
      },
    },
    orderBy: { recuLe: "desc" },
  });

  console.log(`${qualifies.length} échanges qualifiés trouvés\n`);

  // Récupérer les catégories et responsables pour affichage
  const categories = await prisma.categorie.findMany({
    select: { id: true, libelle: true },
  });
  const responsables = await prisma.utilisateur.findMany({
    select: { id: true, nomComplet: true },
  });

  const catMap = new Map(categories.map(c => [c.id, c.libelle]));
  const respMap = new Map(responsables.map(r => [r.id, r.nomComplet]));

  // Statistiques
  const stats = {
    total: qualifies.length,
    avecSuggestion: 0,
    avecDefaut: 0,
    parCategorie: new Map<string, number>(),
    parResponsable: new Map<string, number>(),
    incoherents: [] as Array<{id: string, sujet: string, categorie: string, responsable: string}>,
  };

  // Analyser chaque échange
  console.log("=== Analyse détaillée ===\n");

  for (const e of qualifies) {
    const categorie = catMap.get(e.categorieId!) ?? "INCONNU";
    const responsable = respMap.get(e.responsableId!) ?? "INCONNU";

    // Compter par catégorie
    stats.parCategorie.set(categorie, (stats.parCategorie.get(categorie) ?? 0) + 1);
    stats.parResponsable.set(responsable, (stats.parResponsable.get(responsable) ?? 0) + 1);

    // Obtenir la suggestion historique
    const suggestion = await suggérerPourCorrespondant(e.correspondant.id);
    const categorieSuggeree = suggestion.categorieId ? catMap.get(suggestion.categorieId) : null;
    const responsableSuggere = suggestion.responsableId ? respMap.get(suggestion.responsableId) : null;

    if (suggestion.categorieId || suggestion.responsableId) {
      stats.avecSuggestion++;
    } else {
      stats.avecDefaut++;
    }

    // Détecter les incohérences potentielles
    const sujet = e.sujet.toLowerCase();
    const estFiscal = sujet.includes("impôt") || sujet.includes("fiscal") || sujet.includes("douane");
    const estFacture = sujet.includes("facture") || sujet.includes("facturation");
    const estFret = sujet.includes("fret") || sujet.includes("transit") || sujet.includes("logistique");
    const estInformatique = sujet.includes("odoo") || sujet.includes("accès") || sujet.includes("informatique");
    const estRendezVous = sujet.includes("rendez-vous") || sujet.includes("présentation");

    let incoherent = false;
    let raison = "";

    if (estFiscal && categorie !== "Date butoir imposée (tutelle, douane, fiscalité)") {
      incoherent = true;
      raison = "Sujet fiscal mais catégorie non fiscale";
    } else if (estFacture && categorie !== "Administratif courant, personnel") {
      incoherent = true;
      raison = "Sujet facturation mais catégorie non administrative";
    } else if (estFret && categorie !== "Approvisionnement, logistique, transit") {
      incoherent = true;
      raison = "Sujet fret/logistique mais catégorie non approvisionnement";
    } else if (estInformatique && categorie !== "Technique, exploitation") {
      incoherent = true;
      raison = "Sujet informatique mais catégorie non technique";
    } else if (estRendezVous && categorie !== "Commercial, offres, contrats") {
      incoherent = true;
      raison = "Sujet rendez-vous mais catégorie non commerciale";
    }

    if (incoherent) {
      stats.incoherents.push({
        id: e.id,
        sujet: e.sujet,
        categorie,
        responsable,
      });
    }

    // Afficher les 20 premiers
    if (stats.total - qualifies.indexOf(e) <= 20) {
      console.log(`Échange ${e.id}:`);
      console.log(`  Sujet: ${e.sujet}`);
      console.log(`  Expéditeur: ${e.correspondant.email} (${e.correspondant.nom})`);
      console.log(`  Catégorie attribuée: ${categorie}`);
      console.log(`  Responsable attribué: ${responsable}`);
      console.log(`  Suggestion catégorie: ${categorieSuggeree ?? "aucune"}`);
      console.log(`  Suggestion responsable: ${responsableSuggere ?? "aucun"}`);
      if (incoherent) {
        console.log(`  ⚠ INCOHÉRENT: ${raison}`);
      }
      console.log();
    }
  }

  // Résumé des statistiques
  console.log("=== Résumé des statistiques ===\n");
  console.log(`Total qualifiés: ${stats.total}`);
  console.log(`Avec suggestion historique: ${stats.avecSuggestion}`);
  console.log(`Avec valeur par défaut: ${stats.avecDefaut}`);
  console.log();

  console.log("Par catégorie:");
  for (const [cat, count] of stats.parCategorie) {
    console.log(`  ${cat}: ${count} (${(count / stats.total * 100).toFixed(1)}%)`);
  }
  console.log();

  console.log("Par responsable:");
  for (const [resp, count] of stats.parResponsable) {
    console.log(`  ${resp}: ${count} (${(count / stats.total * 100).toFixed(1)}%)`);
  }
  console.log();

  console.log(`Incohérences détectées: ${stats.incoherents.length}`);
  if (stats.incoherents.length > 0) {
    console.log("\nDétail des incohérences:");
    for (const i of stats.incoherents) {
      console.log(`  ${i.id}: ${i.sujet}`);
      console.log(`    Catégorie: ${i.categorie}, Responsable: ${i.responsable}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
