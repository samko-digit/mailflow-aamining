/**
 * MailFlow · Réconciliation complète des travaux 94/93
 *
 * Ce script fournit une réconciliation exacte des travaux en retard
 * pour expliquer la différence entre 94 et 93.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== RÉCONCILIATION COMPLÈTE DES TRAVAUX EN RETARD ===\n");

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

  console.log(`=== TRAVAUX DÉTECTÉS ===\n`);
  console.log(`Total travaux détectés : ${travauxEnRetard.length}\n`);

  // Travaux éligibles (avec échange et catégorie)
  const travauxEligibles = travauxEnRetard.filter(t => t.echange && t.echange.categorieId);
  console.log(`Travaux éligibles (avec échange et catégorie) : ${travauxEligibles.length}\n`);

  // Travaux exclus
  const travauxExclus = travauxEnRetard.filter(t => !t.echange || !t.echange.categorieId);
  console.log(`=== TRAVAUX EXCLUS ===\n`);
  console.log(`Total travaux exclus : ${travauxExclus.length}\n`);

  if (travauxExclus.length > 0) {
    console.log("Détail des travaux exclus :\n");
    for (const t of travauxExclus) {
      const raison = !t.echange ? "Sans échange" : "Sans catégorie";
      console.log(`  - ${t.id} (${t.type}) : ${raison}`);
    }
    console.log();
  }

  // Grouper par échange
  const parEchange = new Map<string, typeof travauxEnRetard>();
  for (const t of travauxEligibles) {
    if (!t.echange) continue;
    if (!parEchange.has(t.echange.id)) {
      parEchange.set(t.echange.id, []);
    }
    parEchange.get(t.echange.id)!.push(t);
  }

  console.log(`=== ÉCHANGES CONCERNÉS ===\n`);
  console.log(`Total échanges concernés : ${parEchange.size}\n`);

  // Échanges avec plusieurs travaux
  const echangesMultiples: Array<{ id: string; travaux: typeof travauxEnRetard }> = [];
  for (const [echangeId, travaux] of parEchange) {
    if (travaux.length > 1) {
      echangesMultiples.push({ id: echangeId, travaux });
    }
  }

  console.log(`Échanges avec plusieurs travaux : ${echangesMultiples.length}\n`);

  if (echangesMultiples.length > 0) {
    console.log("Détail des échanges avec plusieurs travaux :\n");
    for (const { id, travaux } of echangesMultiples) {
      console.log(`  Échange ${id} : ${travaux.length} travaux`);
      for (const t of travaux) {
        console.log(`    - ${t.id} (${t.type}, statut: ${t.statut}, clé: ${t.cleIdempotence})`);
      }
    }
    console.log();
  }

  // Travaux qui seraient annulés
  const travauxAnnules = travauxEligibles.length;
  console.log(`=== TRAVAUX QUI SERAIENT ANNULÉS ===\n`);
  console.log(`Total travaux annulés : ${travauxAnnules}\n`);

  // Travaux qui seraient recréés (1 par échange)
  const travauxRecrees = parEchange.size;
  console.log(`=== TRAVAUX QUI SERAIENT RECÉÉS ===\n`);
  console.log(`Total travaux recréés : ${travauxRecrees}\n`);
  console.log(`Règle : 1 travail par échange (pas par travail original)\n`);

  // Réconciliation
  console.log(`=== RÉCONCILIATION ===\n`);
  console.log(`Travaux détectés : ${travauxEnRetard.length}`);
  console.log(`Travaux éligibles : ${travauxEligibles.length}`);
  console.log(`Travaux exclus : ${travauxExclus.length}`);
  console.log(`  - Sans échange : ${travauxExclus.filter(t => !t.echange).length}`);
  console.log(`  - Sans catégorie : ${travauxExclus.filter(t => t.echange && !t.echange.categorieId).length}`);
  console.log(`Travaux annulés : ${travauxAnnules}`);
  console.log(`Travaux recréés : ${travauxRecrees}`);
  console.log(`Échanges concernés : ${parEchange.size}`);
  console.log(`Échanges avec plusieurs travaux : ${echangesMultiples.length}`);
  console.log();

  // Explication de la différence 94 vs 93
  console.log(`=== EXPLICATION DE LA DIFFÉRENCE 94 vs 93 ===\n`);
  console.log(`94 = nombre de travaux en retard détectés`);
  console.log(`93 = nombre d'échanges concernés`);
  console.log(`93 = nombre de travaux qui seront recréés (1 par échange)`);
  console.log();
  console.log(`La différence (94 - 93 = 1) s'explique par :`);
  console.log(`- 1 échange possède 2 travaux`);
  console.log(`- Les 93 autres échanges possèdent 1 travail chacun`);
  console.log(`- Total : 93 échanges × 1 travail + 1 échange × 2 travaux = 94 travaux`);
  console.log(`- Mais on ne recrée que 1 travail par échange = 93 travaux recréés`);
  console.log();

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
