/**
 * MailFlow · Test de la suggestion avec seuil minimal
 *
 * Vérifie combien de correspondants ont maintenant une suggestion fiable
 * après l'ajout du seuil minimal d'historique.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { suggérerPourPlusieurs } from "../src/donnees/suggestion.ts";

async function main() {
  console.log("=== Test de la suggestion avec seuil minimal ===\n");

  // Récupérer tous les correspondants avec des échanges
  const correspondants = await prisma.echange.findMany({
    where: { statut: "A_QUALIFIER" },
    select: { correspondantId: true },
    distinct: ["correspondantId"],
  });

  const correspondantIds = correspondants.map(c => c.correspondantId);
  console.log(`${correspondantIds.length} correspondants avec des échanges A_QUALIFIER\n`);

  // Obtenir les suggestions avec le nouveau seuil
  const suggestions = await suggérerPourPlusieurs(correspondantIds);

  let avecSuggestion = 0;
  let sansSuggestion = 0;

  for (const [id, suggestion] of suggestions) {
    if (suggestion.categorieId || suggestion.responsableId) {
      avecSuggestion++;
    } else {
      sansSuggestion++;
    }
  }

  console.log("=== Résultats avec seuil minimal (2 qualifications) ===");
  console.log(`Avec suggestion fiable : ${avecSuggestion} (${(avecSuggestion / correspondantIds.length * 100).toFixed(1)}%)`);
  console.log(`Sans suggestion (historique insuffisant) : ${sansSuggestion} (${(sansSuggestion / correspondantIds.length * 100).toFixed(1)}%)`);
  console.log();

  // Récupérer les catégories et responsables pour affichage
  const categories = await prisma.categorie.findMany({
    select: { id: true, libelle: true },
  });
  const responsables = await prisma.utilisateur.findMany({
    select: { id: true, nomComplet: true },
  });

  const catMap = new Map(categories.map(c => [c.id, c.libelle]));
  const respMap = new Map(responsables.map(r => [r.id, r.nomComplet]));

  // Afficher les suggestions fiables
  console.log("=== Suggestions fiables ===");
  for (const [id, suggestion] of suggestions) {
    if (suggestion.categorieId || suggestion.responsableId) {
      const categorie = suggestion.categorieId ? catMap.get(suggestion.categorieId) : "N/A";
      const responsable = suggestion.responsableId ? respMap.get(suggestion.responsableId) : "N/A";
      console.log(`Correspondant ${id}: ${categorie} / ${responsable}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
