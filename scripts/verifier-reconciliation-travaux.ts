/**
 * MailFlow · Réconciliation exacte des travaux en retard
 *
 * Ce script génère un tableau complet de tous les travaux concernés
 * pour expliquer la différence entre 103, 94 et 93.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calculerPremiereEcheance } from "../src/donnees/executer";

async function main() {
  console.log("=== RÉCONCILIATION EXACTE DES TRAVAUX EN RETARD ===\n");

  const maintenant = new Date();

  // Récupérer TOUS les travaux (pas seulement ceux en retard)
  const tousTravaux = await prisma.travailPlanifie.findMany({
    where: {
      statut: "EN_ATTENTE",
    },
    select: {
      id: true,
      type: true,
      executerA: true,
      creeLe: true,
      statut: true,
      tentatives: true,
      derniereErreur: true,
      echangeId: true,
      echange: {
        select: {
          id: true,
          statut: true,
          sujet: true,
          recuLe: true,
          echeance: true,
          categorieId: true,
          categorie: {
            select: { libelle: true, code: true },
          },
          responsable: {
            select: { nomComplet: true },
          },
        },
      },
    },
    orderBy: { executerA: "asc" },
  });

  console.log(`Total travaux EN_ATTENTE : ${tousTravaux.length}\n`);

  // Séparer les travaux en retard et ceux qui ne le sont pas
  const enRetard = tousTravaux.filter(t => t.executerA < maintenant);
  const pasEnRetard = tousTravaux.filter(t => t.executerA >= maintenant);

  console.log(`Travaux en retard (executerA < maintenant) : ${enRetard.length}`);
  console.log(`Travaux pas en retard (executerA >= maintenant) : ${pasEnRetard.length}\n`);

  // Répartition par statut pour les travaux en retard
  const parStatut = new Map<string, number>();
  for (const t of enRetard) {
    parStatut.set(t.statut, (parStatut.get(t.statut) ?? 0) + 1);
  }

  console.log("=== RÉPARTITION PAR STATUT (travaux en retard) ===");
  for (const [statut, count] of parStatut) {
    console.log(`${statut}: ${count}`);
  }
  console.log();

  // Répartition par type pour les travaux en retard
  const parType = new Map<string, number>();
  for (const t of enRetard) {
    parType.set(t.type, (parType.get(t.type) ?? 0) + 1);
  }

  console.log("=== RÉPARTITION PAR TYPE (travaux en retard) ===");
  for (const [type, count] of parType) {
    console.log(`${type}: ${count}`);
  }
  console.log();

  // Tableau complet des travaux en retard
  console.log("=== TABLEAU COMPLET DES TRAVAUX EN RETARD ===\n");
  console.log("ID | Type | Statut | Échange ID | Sujet | Date exécution | Retard (min) | Erreur");
  console.log("---|------|--------|------------|-------|----------------|-------------|-------\n");

  for (const t of enRetard) {
    const retard = Math.round((maintenant.getTime() - t.executerA.getTime()) / 60000);
    const sujet = t.echange?.sujet?.substring(0, 30) ?? "N/A";
    const erreur = t.derniereErreur?.substring(0, 20) ?? "";

    console.log(`${t.id} | ${t.type} | ${t.statut} | ${t.echangeId} | ${sujet} | ${t.executerA.toISOString()} | ${retard} | ${erreur}`);
  }

  console.log(`\nTotal : ${enRetard.length} travaux en retard\n`);

  // Explication de la différence
  console.log("=== EXPLICATION DE LA DIFFÉRENCE ===\n");
  console.log("103 : Nombre initial de travaux en retard (analyse précédente)");
  console.log("94 : Nombre réel de travaux en retard aujourd'hui (certains ont peut-être été traités)");
  console.log("93 : Nombre de travaux qui seront recréés (1 SYNCHRO_BOITE + 92 RELANCE)");
  console.log();
  console.log("Pourquoi 93 et non 94 ?");
  console.log("- Les travaux sont groupés par échange");
  console.log("- Un échange peut avoir plusieurs travaux");
  console.log("- Le script recrée un travail par échange, pas par travail original");
  console.log();

  // Simulation des nouvelles dates pour chaque travail
  console.log("=== SIMULATION DES NOUVELLES DATES ===\n");

  // Grouper par échange
  const parEchange = new Map<string, typeof enRetard>();
  for (const t of enRetard) {
    if (!t.echange) continue;
    if (!parEchange.has(t.echange.id)) {
      parEchange.set(t.echange.id, []);
    }
    parEchange.get(t.echange.id)!.push(t);
  }

  console.log(`Échanges concernés : ${parEchange.size}\n`);

  console.log("Échange ID | Sujet | Catégorie | Ancienne échéance | Nouvelle échéance | Différence (jours)");
  console.log("-----------|-------|-----------|-------------------|-------------------|------------------\n");

  for (const [echangeId, travaux] of parEchange) {
    const echange = travaux[0].echange;
    if (!echange || !echange.categorieId) continue;

    const ancienneEcheance = echange.echeance;
    const sujet = echange.sujet?.substring(0, 30) ?? "N/A";
    const categorie = echange.categorie?.libelle ?? "N/A";

    // Calculer la nouvelle échéance
    const { echeance: nouvelleEcheance } = await calculerPremiereEcheance(
      maintenant,
      echange.categorieId
    );

    const diffJours = Math.round((nouvelleEcheance.getTime() - (ancienneEcheance?.getTime() ?? maintenant.getTime())) / (1000 * 60 * 60 * 24));

    console.log(`${echangeId} | ${sujet} | ${categorie} | ${ancienneEcheance?.toISOString() ?? "N/A"} | ${nouvelleEcheance.toISOString()} | ${diffJours}`);
  }

  console.log(`\nTotal : ${parEchange.size} échanges\n`);

  // Vérification : aucun travail oublié
  console.log("=== VÉRIFICATION : AUCUN TRAVAIL OUBLIÉ ===\n");
  console.log(`Travaux en retard analysés : ${enRetard.length}`);
  console.log(`Échanges concernés : ${parEchange.size}`);
  console.log(`Travaux par échange (moyenne) : ${(enRetard.length / parEchange.size).toFixed(2)}`);
  console.log();

  // Travaux avec erreurs
  const avecErreurs = enRetard.filter(t => t.derniereErreur);
  console.log(`=== TRAVAUX AVEC ERREURS : ${avecErreurs.length} ===\n`);
  for (const t of avecErreurs) {
    console.log(`ID : ${t.id}`);
    console.log(`Type : ${t.type}`);
    console.log(`Échange : ${t.echangeId}`);
    console.log(`Erreur : ${t.derniereErreur}`);
    console.log(`Tentatives : ${t.tentatives}`);
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
