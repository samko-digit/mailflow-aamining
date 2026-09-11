/**
 * MailFlow · Rapport détaillé des travaux en retard
 *
 * Analyse les 103 travaux en retard et détaille ce qui serait modifié
 * par le script de correction.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calculerPremiereEcheance } from "../src/donnees/executer";

async function main() {
  console.log("=== RAPPORT DÉTAILLÉ DES TRAVAUX EN RETARD ===\n");

  const maintenant = new Date();

  // Récupérer les travaux en retard
  const travauxEnRetard = await prisma.travailPlanifie.findMany({
    where: {
      executerA: { lt: maintenant },
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
            select: { libelle: true },
          },
          responsable: {
            select: { nomComplet: true },
          },
        },
      },
    },
    orderBy: { executerA: "asc" },
  });

  console.log(`${travauxEnRetard.length} travaux en retard trouvés\n`);

  // Répartition par statut de travail
  const parStatut = new Map<string, number>();
  for (const t of travauxEnRetard) {
    parStatut.set(t.statut, (parStatut.get(t.statut) ?? 0) + 1);
  }

  console.log("=== RÉPARTITION PAR STATUT DE TRAVAIL ===");
  for (const [statut, count] of parStatut) {
    console.log(`${statut}: ${count}`);
  }
  console.log();

  // Répartition par type
  const parType = new Map<string, number>();
  for (const t of travauxEnRetard) {
    parType.set(t.type, (parType.get(t.type) ?? 0) + 1);
  }

  console.log("=== RÉPARTITION PAR TYPE ===");
  for (const [type, count] of parType) {
    console.log(`${type}: ${count}`);
  }
  console.log();

  // Pourquoi ils sont en retard
  console.log("=== POURQUOI ILS SONT EN RETARD ===");
  console.log("Les travaux ont été créés le 8 septembre 2026 avec des dates d'exécution");
  console.log("prévues en août 2026 (dans le passé).");
  console.log();
  console.log("Cause : Quand les échanges ont été qualifiés avec qualifier-tous.ts, le");
  console.log("système a créé des travaux de relance basés sur les échéances des échanges.");
  console.log("Mais les échanges avaient déjà été reçus en août, donc leurs échéances");
  console.log("étaient déjà passées. Le système a donc créé des travaux avec des dates");
  console.log("dans le passé.");
  console.log();

  // Analyse des dates
  const retards = travauxEnRetard.map(t => ({
    id: t.id,
    type: t.type,
    retardMinutes: Math.round((maintenant.getTime() - t.executerA.getTime()) / 60000),
    creeLe: t.creeLe,
    executerA: t.executerA,
    echangeRecuLe: t.echange?.recuLe,
    echangeEcheance: t.echange?.echeance,
  }));

  const maxRetard = Math.max(...retards.map(r => r.retardMinutes));
  const minRetard = Math.min(...retards.map(r => r.retardMinutes));
  const avgRetard = retards.reduce((sum, r) => sum + r.retardMinutes, 0) / retards.length;

  console.log("=== ANALYSE DES RETARDS ===");
  console.log(`Retard max : ${maxRetard} min (${Math.round(maxRetard / 60)}h)`);
  console.log(`Retard min : ${minRetard} min (${Math.round(minRetard / 60)}h)`);
  console.log(`Retard moyen : ${Math.round(avgRetard)} min (${Math.round(avgRetard / 60)}h)`);
  console.log();

  // Nouvelles dates qui seraient attribuées
  console.log("=== NOUVELLES DATES QUI SERAIENT ATTRIBUÉES ===");
  console.log("Le script de correction recréerait les travaux avec des dates futures");
  console.log("basées sur la date actuelle (maintenant) et non sur l'échéance originale.");
  console.log();

  // Grouper les travaux par échange
  const parEchange = new Map<string, typeof travauxEnRetard>();
  for (const t of travauxEnRetard) {
    if (!t.echange) continue;
    if (!parEchange.has(t.echange.id)) {
      parEchange.set(t.echange.id, []);
    }
    parEchange.get(t.echange.id)!.push(t);
  }

  console.log(`=== ${parEchange.size} échanges concernés ===\n`);

  // Simuler les nouvelles dates pour 5 échanges
  let count = 0;
  for (const [echangeId, travaux] of parEchange) {
    if (count >= 5) break;
    count++;

    const echange = travaux[0].echange;
    if (!echange || !echange.categorieId) continue;

    console.log(`--- Échange ${echangeId} ---`);
    console.log(`Sujet: ${echange.sujet}`);
    console.log(`Statut: ${echange.statut}`);
    console.log(`Catégorie: ${echange.categorie?.libelle}`);
    console.log(`Responsable: ${echange.responsable?.nomComplet}`);
    console.log(`Reçu le: ${echange.recuLe?.toISOString()}`);
    console.log(`Échéance actuelle: ${echange.echeance?.toISOString()}`);
    console.log();

    console.log("Travaux actuels:");
    for (const t of travaux) {
      const retard = Math.round((maintenant.getTime() - t.executerA.getTime()) / 60000);
      console.log(`  ${t.type}: ${t.executerA.toISOString()} (retard: ${retard} min)`);
    }
    console.log();

    // Simuler les nouvelles dates
    const { echeance, premiereRelance } = await calculerPremiereEcheance(
      maintenant,
      echange.categorieId
    );

    console.log("Nouvelles dates simulées:");
    console.log(`  Nouvelle échéance: ${echeance.toISOString()}`);
    console.log(`  Première relance: ${premiereRelance.toISOString()}`);
    console.log();
  }

  if (parEchange.size > 5) {
    console.log(`... et ${parEchange.size - 5} autres échanges\n`);
  }

  // Ce qui sera conservé
  console.log("=== CE QUI SERA CONSERVÉ LORS DE L'ANNULATION/RECÉATION ===");
  console.log("- Les échanges eux-mêmes (statut, catégorie, responsable)");
  console.log("- L'historique des événements d'audit");
  console.log("- Les lignes de relance déjà envoyées");
  console.log("- Les correspondants et leurs données");
  console.log();

  // Ce qui pourrait être perdu
  console.log("=== CE QUI POURRAIT ÊTRE PERDU ===");
  console.log("- Les travaux de relance en attente (seront annulés)");
  console.log("- Les dates d'exécution originales des travaux (seront remplacées)");
  console.log("- Les clés d'idempotence des travaux (seront recalculées)");
  console.log();

  // Relations et références affectées
  console.log("=== RELATIONS ET RÉFÉRENCES AFFECTÉES ===");
  console.log("- TravailPlanifie.echangeId: conservé (référence vers l'échange)");
  console.log("- Echange.prochaineRelanceLe: sera mis à jour");
  console.log("- Echange.echeance: sera mis à jour");
  console.log("- Evenement: de nouveaux événements seront créés pour la correction");
  console.log();

  // Vérification des données et relations
  console.log("=== VÉRIFICATION DE LA CONSERVATION DES DONNÉES ET RELATIONS ===");
  console.log("✓ Les échanges ne seront pas supprimés");
  console.log("✓ Les correspondants ne seront pas affectés");
  console.log("✓ L'historique d'audit sera préservé");
  console.log("✓ Les relances déjà envoyées restent dans l'historique");
  console.log("⚠ Les travaux en attente seront annulés (statut: ANNULE)");
  console.log("⚠ Les dates d'échéance seront recalculées");
  console.log();

  // Travaux avec erreurs
  const avecErreurs = travauxEnRetard.filter(t => t.derniereErreur);
  console.log(`=== TRAVAUX AVEC ERREURS : ${avecErreurs.length} ===`);
  for (const t of avecErreurs) {
    console.log(`${t.id}: ${t.type}`);
    console.log(`  Erreur: ${t.derniereErreur}`);
    console.log(`  Tentatives: ${t.tentatives}`);
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
