/**
 * MailFlow · Qualification de tous les A_QUALIFIER avec suggestions
 *
 * Ce script qualifie tous les échanges A_QUALIFIER en utilisant les
 * suggestions basées sur l'historique des correspondants.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { qualifierEnLot } from "../src/donnees/qualification-lot";
import { suggérerPourPlusieurs } from "../src/donnees/suggestion";

async function main() {
  console.log("=== Qualification de tous les A_QUALIFIER ===\n");

  // 1. Récupérer les catégories et utilisateurs disponibles
  const categories = await prisma.categorie.findMany({
    where: { actif: true },
    select: { id: true, libelle: true },
  });
  const utilisateurs = await prisma.utilisateur.findMany({
    where: { actif: true },
    select: { id: true, nomComplet: true },
  });

  const categorieParDefaut = categories[2].id; // Commercial
  const responsableParDefaut = utilisateurs[0].id; // Mamadou Berthé

  console.log(`Catégorie par défaut : ${categories[2].libelle}`);
  console.log(`Responsable par défaut : ${utilisateurs[0].nomComplet}\n`);

  // 2. Récupérer tous les échanges A_QUALIFIER
  const aQualifier = await prisma.echange.findMany({
    where: { statut: "A_QUALIFIER" },
    select: { id: true, sujet: true, correspondantId: true },
  });

  console.log(`${aQualifier.length} échanges A_QUALIFIER à traiter\n`);

  if (aQualifier.length === 0) {
    console.log("✓ Aucun échange à qualifier.");
    await prisma.$disconnect();
    return;
  }

  // 3. Obtenir les suggestions pour tous les correspondants
  const correspondantIds = [...new Set(aQualifier.map(e => e.correspondantId))];
  const suggestions = await suggérerPourPlusieurs(correspondantIds);

  // 4. Grouper les échanges par (categorie, responsable) suggéré
  const groupes = new Map<string, string[]>();
  const cle = (catId: string | null, respId: string | null) => 
    `${catId ?? categorieParDefaut}:${respId ?? responsableParDefaut}`;

  for (const echange of aQualifier) {
    const suggestion = suggestions.get(echange.correspondantId);
    const categorieId = suggestion?.categorieId ?? categorieParDefaut;
    const responsableId = suggestion?.responsableId ?? responsableParDefaut;
    const k = cle(categorieId, responsableId);
    
    if (!groupes.has(k)) {
      groupes.set(k, []);
    }
    groupes.get(k)!.push(echange.id);
  }

  console.log(`Groupes de qualification : ${groupes.size}\n`);

  // 5. Qualifier chaque groupe
  let totalQualifies = 0;
  let totalEchecs = 0;

  for (const [groupeKey, ids] of groupes) {
    const [catId, respId] = groupeKey.split(":");
    const categorie = categories.find(c => c.id === catId);
    const responsable = utilisateurs.find(u => u.id === respId);

    console.log(`Groupe : ${categorie?.libelle} / ${responsable?.nomComplet} (${ids.length} échanges)`);
    
    const result = await qualifierEnLot(ids, catId, respId);
    totalQualifies += result.qualifies;
    totalEchecs += result.echecs.length;

    console.log(`  Qualifiés : ${result.qualifies}, Échecs : ${result.echecs.length}`);
    if (result.echecs.length > 0) {
      console.log(`  IDs en échec : ${result.echecs.join(", ")}`);
    }
  }

  console.log(`\n=== Résultat final ===`);
  console.log(`Total qualifiés : ${totalQualifies}`);
  console.log(`Total échecs : ${totalEchecs}`);

  // 6. Vérifier l'état final
  const aQualifierRestants = await prisma.echange.count({ where: { statut: "A_QUALIFIER" } });
  console.log(`\nA_QUALIFIER restants : ${aQualifierRestants}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
