/**
 * MailFlow · Suggestions de qualification
 *
 * Pré-suggère la catégorie et le responsable d'après l'historique du
 * correspondant. Un correspondant déjà rencontré a presque toujours la même
 * catégorie et le même interlocuteur.
 */

import { prisma } from "../lib/prisma";

/**
 * Suggestion de qualification pour un correspondant.
 *
 * Retourne la catégorie et le responsable les plus fréquemment utilisés
 * dans les échanges passés de ce correspondant, en excluant les statuts
 * de clôture (HORS_PERIMETRE, SANS_SUITE, ARCHIVE).
 */
export async function suggérerPourCorrespondant(
  correspondantId: string
): Promise<{ categorieId: string | null; responsableId: string | null }> {
  const historique = await prisma.echange.groupBy({
    by: ["categorieId", "responsableId"],
    where: {
      correspondantId,
      statut: {
        in: ["A_QUALIFIER", "EN_ATTENTE", "RELANCE", "ESCALADE", "REPONDU"],
      },
      categorieId: { not: null },
      responsableId: { not: null },
    },
    _count: { _all: true },
  });

  if (historique.length === 0) {
    return { categorieId: null, responsableId: null };
  }

  // Trier manuellement par nombre d'occurrences
  const trie = historique.sort((a, b) => b._count._all - a._count._all);

  return {
    categorieId: trie[0].categorieId,
    responsableId: trie[0].responsableId,
  };
}

/**
 * Suggestions pour plusieurs correspondants en une seule requête.
 *
 * Optimisation pour la qualification en lot : évite N+1 requêtes.
 */
export async function suggérerPourPlusieurs(
  correspondantIds: string[]
): Promise<Map<string, { categorieId: string | null; responsableId: string | null }>> {
  const historique = await prisma.echange.groupBy({
    by: ["correspondantId", "categorieId", "responsableId"],
    where: {
      correspondantId: { in: correspondantIds },
      statut: {
        in: ["A_QUALIFIER", "EN_ATTENTE", "RELANCE", "ESCALADE", "REPONDU"],
      },
      categorieId: { not: null },
      responsableId: { not: null },
    },
    _count: { _all: true },
  });

  const resultats = new Map<
    string,
    { categorieId: string | null; responsableId: string | null }
  >();

  // Initialiser avec null pour tous les correspondants
  for (const id of correspondantIds) {
    resultats.set(id, { categorieId: null, responsableId: null });
  }

  // Trier par nombre d'occurrences
  const trie = historique.sort((a, b) => b._count._all - a._count._all);

  // Garder seulement la meilleure suggestion par correspondant
  const vus = new Set<string>();
  for (const ligne of trie) {
    if (!vus.has(ligne.correspondantId)) {
      resultats.set(ligne.correspondantId, {
        categorieId: ligne.categorieId,
        responsableId: ligne.responsableId,
      });
      vus.add(ligne.correspondantId);
    }
  }

  return resultats;
}
