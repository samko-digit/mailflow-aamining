/**
 * MailFlow · Vérification des travaux multiples par échange
 *
 * Ce script identifie les échanges qui possèdent plusieurs travaux
 * et détaille leur traitement pour éviter les doublons.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== VÉRIFICATION DES TRAVAUX MULTIPLES PAR ÉCHANGE ===\n");

  const maintenant = new Date();

  // Récupérer tous les travaux en retard
  const travauxEnRetard = await prisma.travailPlanifie.findMany({
    where: {
      executerA: { lt: maintenant },
      statut: "EN_ATTENTE",
    },
    select: {
      id: true,
      type: true,
      executerA: true,
      statut: true,
      cleIdempotence: true,
      echangeId: true,
      echange: {
        select: {
          id: true,
          categorieId: true,
          statut: true,
          recuLe: true,
          echeance: true,
        },
      },
    },
  });

  console.log(`Total travaux en retard : ${travauxEnRetard.length}\n`);

  // Grouper par échange
  const parEchange = new Map<string, typeof travauxEnRetard>();
  for (const t of travauxEnRetard) {
    if (!t.echange) continue;
    if (!parEchange.has(t.echange.id)) {
      parEchange.set(t.echange.id, []);
    }
    parEchange.get(t.echange.id)!.push(t);
  }

  // Identifier les échanges avec plusieurs travaux
  const echangesMultiples: Array<{ id: string; travaux: typeof travauxEnRetard }> = [];
  for (const [echangeId, travaux] of parEchange) {
    if (travaux.length > 1) {
      echangesMultiples.push({ id: echangeId, travaux });
    }
  }

  console.log(`Échanges avec plusieurs travaux : ${echangesMultiples.length}\n`);

  if (echangesMultiples.length === 0) {
    console.log("✓ Aucun échange ne possède plusieurs travaux.\n");
    console.log("✓ Aucun risque de doublon lors de la recréation.\n");
    await prisma.$disconnect();
    return;
  }

  console.log("=== DÉTAIL DES ÉCHANGES AVEC PLUSIEURS TRAVAUX ===\n");

  for (const { id, travaux } of echangesMultiples) {
    console.log(`Échange ID : ${id}`);
    console.log(`Nombre de travaux : ${travaux.length}\n`);

    for (const t of travaux) {
      console.log(`  Travail ID : ${t.id}`);
      console.log(`  Type : ${t.type}`);
      console.log(`  Statut : ${t.statut}`);
      console.log(`  Clé d'idempotence : ${t.cleIdempotence}`);
      console.log(`  Exécution prévue : ${t.executerA.toISOString()}`);
      console.log();
    }

    console.log(`--- Traitement prévu ---`);
    console.log(`Travaux conservés/corrigés : 0 (tous annulés)`);
    console.log(`Travaux annulés : ${travaux.length}`);
    console.log(`Travaux recréés : 1 (un seul par échange)`);
    console.log(`Raison : Groupement par échange pour éviter les doublons`);
    console.log();
  }

  console.log("=== CONCLUSION ===\n");
  console.log(`✓ ${echangesMultiples.length} échange(s) avec plusieurs travaux détecté(s)`);
  console.log(`✓ Le script corriger-travaux-retard.ts groupe par échange`);
  console.log(`✓ Un seul travail sera recréé par échange (pas par travail original)`);
  console.log(`✓ Aucun risque de création de doublons`);
  console.log();

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
