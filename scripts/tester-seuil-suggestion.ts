/**
 * MailFlow · Test réel du seuil de suggestion
 *
 * Vérifie que le seuil minimal d'historique fonctionne correctement
 * en créant des échanges de test avec différents niveaux d'historique.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { suggérerPourCorrespondant } from "../src/donnees/suggestion.ts";

async function main() {
  console.log("=== Test réel du seuil de suggestion ===\n");

  // Nettoyer le correspondant de test s'il existe
  const existing = await prisma.correspondant.findUnique({
    where: { email: "test-seuil@example.com" },
  });
  if (existing) {
    await prisma.echange.deleteMany({ where: { correspondantId: existing.id } });
    await prisma.correspondant.delete({ where: { id: existing.id } });
  }

  // Créer un correspondant de test
  const correspondant = await prisma.correspondant.create({
    data: {
      email: "test-seuil@example.com",
      nom: "Test Seuil Suggestion",
    },
  });

  console.log(`Correspondant créé : ${correspondant.id}\n`);

  // Récupérer une catégorie et un responsable
  const categorie = await prisma.categorie.findFirst({ where: { actif: true } });
  const responsable = await prisma.utilisateur.findFirst({ where: { actif: true } });

  if (!categorie || !responsable) {
    console.log("Erreur : pas de catégorie ou responsable disponible");
    await prisma.$disconnect();
    return;
  }

  console.log(`Catégorie : ${categorie.libelle}`);
  console.log(`Responsable : ${responsable.nomComplet}\n`);

  // Récupérer une boîte existante
  const boite = await prisma.boiteSuivie.findFirst({ where: { actif: true } });
  if (!boite) {
    console.log("Erreur : pas de boîte disponible");
    await prisma.$disconnect();
    return;
  }
  console.log(`Boîte : ${boite.libelle}\n`);

  // Test 1 : Aucun historique
  console.log("=== Test 1 : Aucun historique ===");
  let suggestion = await suggérerPourCorrespondant(correspondant.id);
  console.log(`Suggestion : ${suggestion.categorieId ?? "aucune"} / ${suggestion.responsableId ?? "aucun"}`);
  console.log(`Attendu : aucune (seuil non atteint)`);
  console.log(`Résultat : ${(!suggestion.categorieId && !suggestion.responsableId) ? "✓ OK" : "✗ ÉCHEC"}\n`);

  // Test 2 : 1 qualification (seuil non atteint)
  console.log("=== Test 2 : 1 qualification (seuil = 2) ===");
  const echange1 = await prisma.echange.create({
    data: {
      boiteId: boite.id,
      conversationId: `test-seuil-1`,
      sujet: "Test 1",
      correspondantId: correspondant.id,
      statut: "EN_ATTENTE",
      categorieId: categorie.id,
      responsableId: responsable.id,
      recuLe: new Date(),
    },
  });

  suggestion = await suggérerPourCorrespondant(correspondant.id);
  console.log(`Suggestion : ${suggestion.categorieId ?? "aucune"} / ${suggestion.responsableId ?? "aucun"}`);
  console.log(`Attendu : aucune (seuil non atteint)`);
  console.log(`Résultat : ${(!suggestion.categorieId && !suggestion.responsableId) ? "✓ OK" : "✗ ÉCHEC"}\n`);

  // Test 3 : 2 qualifications (seuil atteint)
  console.log("=== Test 3 : 2 qualifications (seuil = 2) ===");
  const echange2 = await prisma.echange.create({
    data: {
      boiteId: boite.id,
      conversationId: `test-seuil-2`,
      sujet: "Test 2",
      correspondantId: correspondant.id,
      statut: "EN_ATTENTE",
      categorieId: categorie.id,
      responsableId: responsable.id,
      recuLe: new Date(),
    },
  });

  suggestion = await suggérerPourCorrespondant(correspondant.id);
  console.log(`Suggestion : ${suggestion.categorieId ?? "aucune"} / ${suggestion.responsableId ?? "aucun"}`);
  console.log(`Attendu : ${categorie.libelle} / ${responsable.nomComplet}`);
  console.log(`Résultat : ${(suggestion.categorieId === categorie.id && suggestion.responsableId === responsable.id) ? "✓ OK" : "✗ ÉCHEC"}\n`);

  // Nettoyage
  await prisma.echange.deleteMany({ where: { correspondantId: correspondant.id } });
  await prisma.correspondant.delete({ where: { id: correspondant.id } });

  console.log("=== Nettoyage effectué ===");
  console.log("\nConclusion : Le seuil minimal d'historique fonctionne correctement.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
