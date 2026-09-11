import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function verify() {
  console.log("=== VÉRIFICATION DES TRAVAUX DEMO ===\n");

  const maintenant = new Date();

  // Vérifier les travaux avec clé demo-travail
  const travauxDemo = await prisma.travailPlanifie.findMany({
    where: {
      cleIdempotence: { startsWith: 'demo-travail' },
      statut: "EN_ATTENTE",
    },
    include: {
      echange: {
        include: {
          categorie: true,
          responsable: true,
        }
      }
    },
    orderBy: { creeLe: 'asc' }
  });

  console.log(`Travaux avec clé "demo-travail" en EN_ATTENTE: ${travauxDemo.length}\n`);

  for (const t of travauxDemo) {
    console.log(`ID: ${t.id}`);
    console.log(`  Type: ${t.type}`);
    console.log(`  Échange: ${t.echangeId}`);
    console.log(`  Sujet: ${t.echange?.sujet}`);
    console.log(`  Catégorie: ${t.echange?.categorie?.libelle}`);
    console.log(`  Responsable: ${t.echange?.responsable?.nomComplet}`);
    console.log(`  Créé le: ${t.creeLe.toISOString()}`);
    console.log(`  Exécution prévue: ${t.executerA.toISOString()}`);
    console.log(`  En retard: ${t.executerA < maintenant}`);
    console.log(`  Clé idempotence: ${t.cleIdempotence}`);
    console.log();
  }

  // Vérifier s'il y a d'autres travaux demo (annulés, terminés, etc.)
  const tousTravauxDemo = await prisma.travailPlanifie.findMany({
    where: {
      cleIdempotence: { startsWith: 'demo-travail' },
    },
    orderBy: { creeLe: 'desc' }
  });

  console.log(`Total travaux avec clé "demo-travail" (tous statuts): ${tousTravauxDemo.length}\n`);

  const parStatut = new Map<string, number>();
  for (const t of tousTravauxDemo) {
    parStatut.set(t.statut, (parStatut.get(t.statut) || 0) + 1);
  }

  console.log("Répartition par statut:");
  for (const [statut, count] of parStatut) {
    console.log(`  ${statut}: ${count}`);
  }
  console.log();

  // Vérifier les travaux créés le 2026-09-08 11:57:xx
  const travaux20260908 = await prisma.travailPlanifie.findMany({
    where: {
      creeLe: {
        gte: new Date('2026-09-08T11:57:00.000Z'),
        lt: new Date('2026-09-08T11:58:00.000Z'),
      },
      statut: "EN_ATTENTE",
    },
    include: {
      echange: {
        include: {
          categorie: true,
          responsable: true,
        }
      }
    },
    orderBy: { creeLe: 'asc' }
  });

  console.log(`Travaux créés le 2026-09-08 11:57:xx (EN_ATTENTE): ${travaux20260908.length}\n`);

  for (const t of travaux20260908) {
    console.log(`ID: ${t.id}`);
    console.log(`  Type: ${t.type}`);
    console.log(`  Échange: ${t.echangeId}`);
    console.log(`  Sujet: ${t.echange?.sujet}`);
    console.log(`  Créé le: ${t.creeLe.toISOString()}`);
    console.log(`  Exécution prévue: ${t.executerA.toISOString()}`);
    console.log(`  En retard: ${t.executerA < maintenant}`);
    console.log();
  }

  await prisma.$disconnect();
}

verify().catch(e => {
  console.error("Erreur:", e);
  process.exit(1);
});
