/**
 * MailFlow · Test de HORS_PERIMETRE en lot
 *
 * Crée 3 échanges de test A_QUALIFIER, les classe en lot vers HORS_PERIMETRE,
 * et vérifie que tout fonctionne correctement.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { classerHorsPerimetreEnLot } from "../src/donnees/qualification-lot";

async function main() {
  console.log("=== Test de HORS_PERIMETRE en lot ===\n");

  // Récupérer une boîte existante
  const boite = await prisma.boiteSuivie.findFirst({ where: { actif: true } });
  if (!boite) {
    console.log("Erreur : pas de boîte disponible");
    await prisma.$disconnect();
    return;
  }

  // Nettoyer le correspondant de test s'il existe
  const existing = await prisma.correspondant.findUnique({
    where: { email: "test-hp@example.com" },
  });
  if (existing) {
    await prisma.echange.deleteMany({ where: { correspondantId: existing.id } });
    await prisma.correspondant.delete({ where: { id: existing.id } });
  }

  // Créer un correspondant de test
  const correspondant = await prisma.correspondant.create({
    data: {
      email: "test-hp@example.com",
      nom: "Test HORS_PERIMETRE",
    },
  });

  console.log(`Correspondant créé : ${correspondant.id}\n`);

  // Créer 3 échanges A_QUALIFIER
  const echanges = [];
  for (let i = 1; i <= 3; i++) {
    const echange = await prisma.echange.create({
      data: {
        boiteId: boite.id,
        conversationId: `test-hp-conv-${i}`,
        sujet: `Test HORS_PERIMETRE ${i}`,
        correspondantId: correspondant.id,
        statut: "A_QUALIFIER",
        recuLe: new Date(),
      },
    });
    echanges.push(echange);
    console.log(`Échange créé : ${echange.id}`);
  }

  console.log("\n=== État avant classement ===");
  const avant = await prisma.echange.findMany({
    where: { id: { in: echanges.map(e => e.id) } },
    select: { id: true, statut: true },
  });
  console.log(avant);

  // Compter les exclusions avant
  const exclusionsAvant = await prisma.expediteurExclu.count();
  console.log(`Exclusions avant : ${exclusionsAvant}`);

  // Classer en lot vers HORS_PERIMETRE
  const ids = echanges.map(e => e.id);
  const motif = "Test de classement en lot vers HORS_PERIMETRE";

  console.log(`\n=== Classement en lot (${ids.length} échanges) ===`);
  console.log(`Motif : ${motif}`);

  const result = await classerHorsPerimetreEnLot(ids, motif);
  console.log(`Résultat : ${result.classes} classés, ${result.echecs.length} échecs`);

  if (result.echecs.length > 0) {
    console.log(`IDs en échec : ${result.echecs.join(", ")}`);
  }

  // Vérifier l'état après classement
  console.log("\n=== État après classement ===");
  const apres = await prisma.echange.findMany({
    where: { id: { in: ids } },
    select: { id: true, statut: true, motifCloture: true },
  });
  console.log(apres);

  // Vérifier que tous sont HORS_PERIMETRE
  const tousHp = apres.every(e => e.statut === "HORS_PERIMETRE");
  console.log(`Tous HORS_PERIMETRE : ${tousHp ? "✓" : "✗"}`);

  // Vérifier les exclusions (note : l'exclusion n'est pas créée automatiquement par CLASSER_HORS_PERIMETRE)
  const exclusionsApres = await prisma.expediteurExclu.count();
  const nouvellesExclusions = exclusionsApres - exclusionsAvant;
  console.log(`Nouvelles exclusions : ${nouvellesExclusions}`);
  console.log(`Note : L'exclusion n'est pas créée automatiquement par CLASSER_HORS_PERIMETRE (comportement normal)`);

  // Vérifier les événements d'audit
  console.log("\n=== Événements d'audit ===");
  const evenements = await prisma.evenement.findMany({
    where: { echangeId: { in: ids } },
    select: { id: true, type: true, libelle: true, creeLe: true },
    orderBy: { creeLe: "desc" },
  });

  console.log(`${evenements.length} événements trouvés`);
  for (const ev of evenements) {
    console.log(`  ${ev.type}: ${ev.libelle}`);
  }

  // Vérifier qu'aucun travail de relance n'a été créé
  console.log("\n=== Travaux de relance ===");
  const travaux = await prisma.travailPlanifie.findMany({
    where: { echangeId: { in: ids }, type: "RELANCE" },
  });
  console.log(`Travaux RELANCE : ${travaux.length}`);
  console.log(`Attendu : 0`);
  console.log(`Résultat : ${travaux.length === 0 ? "✓" : "✗"}`);

  // Nettoyage
  await prisma.echange.deleteMany({ where: { correspondantId: correspondant.id } });
  await prisma.expediteurExclu.deleteMany({ where: { valeur: correspondant.email } });
  await prisma.correspondant.delete({ where: { id: correspondant.id } });

  console.log("\n=== Nettoyage effectué ===");

  // Conclusion
  const tests = [
    tousHp,
    travaux.length === 0,
    evenements.length === 3, // 1 par échange
  ];

  console.log("\n=== Résultat global ===");
  console.log(`Tests réussis : ${tests.filter(t => t).length}/${tests.length}`);
  console.log(tests.every(t => t) ? "✓ HORS_PERIMETRE en lot fonctionne correctement" : "✗ Certains tests ont échoué");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
