/**
 * MailFlow · Test de la qualification en lot sur la base réelle
 *
 * Ce script teste les fonctionnalités de Phase 6 sur les vraies données
 * pour valider que le critère de sortie peut être atteint.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { qualifierEnLot, classerHorsPerimetreEnLot } from "../src/donnees/qualification-lot";

async function main() {
  console.log("=== Test de qualification en lot sur base réelle ===\n");

  // 1. Récupérer les catégories et utilisateurs disponibles
  const categories = await prisma.categorie.findMany({
    where: { actif: true },
    select: { id: true, libelle: true },
  });
  const utilisateurs = await prisma.utilisateur.findMany({
    where: { actif: true },
    select: { id: true, nomComplet: true },
  });

  console.log("Catégories disponibles :");
  for (const c of categories) {
    console.log(`  - ${c.id}: ${c.libelle}`);
  }

  console.log("\nUtilisateurs disponibles :");
  for (const u of utilisateurs) {
    console.log(`  - ${u.id}: ${u.nomComplet}`);
  }

  // 2. Récupérer les échanges A_QUALIFIER
  const aQualifier = await prisma.echange.findMany({
    where: { statut: "A_QUALIFIER" },
    select: { id: true, sujet: true, correspondantId: true },
    take: 10,
  });

  console.log(`\n${aQualifier.length} échanges A_QUALIFIER trouvés (test sur 10 premiers) :`);
  for (const e of aQualifier) {
    console.log(`  - ${e.id}: ${e.sujet}`);
  }

  if (aQualifier.length === 0) {
    console.log("\n✓ Aucun échange A_QUALIFIER à traiter.");
    await prisma.$disconnect();
    return;
  }

  // 3. Tester la suggestion basée sur l'historique
  console.log("\n=== Test des suggestions basées sur l'historique ===");
  const { suggérerPourCorrespondant } = await import("../src/donnees/suggestion.ts");

  for (const e of aQualifier.slice(0, 3)) {
    const suggestion = await suggérerPourCorrespondant(e.correspondantId);
    console.log(`\nÉchange ${e.id} (${e.sujet}) :`);
    console.log(`  Catégorie suggérée : ${suggestion.categorieId ?? "aucune"}`);
    console.log(`  Responsable suggéré : ${suggestion.responsableId ?? "aucun"}`);
  }

  // 4. Tester sur 3 échanges seulement
  console.log("\n=== Test de qualification sur 3 échanges ===");
  const categorieId = categories[2].id; // Commercial
  const responsableId = utilisateurs[0].id; // Mamadou Berthé
  const ids = aQualifier.slice(0, 3).map(e => e.id);

  console.log(`\nQualification de ${ids.length} échanges avec :`);
  console.log(`  Catégorie : ${categories[2].libelle}`);
  console.log(`  Responsable : ${utilisateurs[0].nomComplet}`);

  const result = await qualifierEnLot(ids, categorieId, responsableId);
  console.log(`\nRésultat :`);
  console.log(`  Qualifiés : ${result.qualifies}`);
  console.log(`  Échecs : ${result.echecs.length}`);

  if (result.echecs.length > 0) {
    console.log(`  IDs en échec : ${result.echecs.join(", ")}`);
  }

  // 5. Vérifier que les échanges ont été correctement qualifiés
  console.log("\n=== Vérification des échanges qualifiés ===");
  const qualifies = await prisma.echange.findMany({
    where: { id: { in: ids } },
    select: { id: true, statut: true, categorieId: true, responsableId: true, echeance: true },
  });

  for (const e of qualifies) {
    console.log(`  ${e.id}:`);
    console.log(`    Statut : ${e.statut}`);
    console.log(`    Catégorie : ${e.categorieId}`);
    console.log(`    Responsable : ${e.responsableId}`);
    console.log(`    Échéance : ${e.echeance?.toISOString()}`);
  }

  // 6. Vérifier les événements d'audit
  console.log("\n=== Vérification des événements d'audit ===");
  const evenements = await prisma.evenement.findMany({
    where: { echangeId: { in: ids } },
    select: { id: true, type: true, libelle: true, creeLe: true },
    orderBy: { creeLe: "desc" },
  });

  console.log(`${evenements.length} événements trouvés :`);
  for (const ev of evenements) {
    console.log(`  ${ev.type}: ${ev.libelle} (${ev.creeLe.toISOString()})`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
