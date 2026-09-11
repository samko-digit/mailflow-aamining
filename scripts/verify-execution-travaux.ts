import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function verify() {
  console.log("=== CONTRÔLE POST-EXÉCUTION READ-ONLY ===\n");

  const maintenant = new Date();

  // 1. Résultat de l'exécution
  console.log("1. RÉSULTAT DE L'EXÉCUTION\n");

  const travauxAnnules = await prisma.travailPlanifie.count({
    where: {
      statut: "ANNULE",
      termineLe: { gte: new Date('2026-09-09T11:19:00.000Z') }
    }
  });

  const travauxRecréesCount = await prisma.travailPlanifie.count({
    where: {
      statut: "EN_ATTENTE",
      creeLe: { gte: new Date('2026-09-09T11:19:00.000Z') }
    }
  });

  const travauxEnRetard = await prisma.travailPlanifie.count({
    where: {
      executerA: { lt: maintenant },
      statut: "EN_ATTENTE",
    },
  });

  console.log(`Travaux annulés (récent) : ${travauxAnnules}`);
  console.log(`Travaux recréés (récents) : ${travauxRecréesCount}`);
  console.log(`Travaux encore en retard : ${travauxEnRetard}`);

  // 2. Travail exclu
  console.log("\n2. VÉRIFICATION DU TRAVAIL EXCLU\n");

  const travailExclu = await prisma.travailPlanifie.findUnique({
    where: { id: 'cmtsi00400000b8g5qnb66woh' }
  });

  if (travailExclu) {
    console.log(`Travail cmtsi00400000b8g5qnb66woh :`);
    console.log(`  Statut : ${travailExclu.statut}`);
    console.log(`  Echange ID : ${travailExclu.echangeId || 'NULL'}`);
    console.log(`  Exécution prévue : ${travailExclu.executerA.toISOString()}`);
    console.log(`  En retard : ${travailExclu.executerA < maintenant}`);
  } else {
    console.log(`Travail cmtsi00400000b8g5qnb66woh non trouvé`);
  }

  // 3. Doublons de clés d'idempotence
  console.log("\n3. VÉRIFICATION DES DOUBLONS DE CLÉS D'IDEMPOTENCE\n");

  const tousTravauxActifs = await prisma.travailPlanifie.findMany({
    where: { statut: "EN_ATTENTE" },
    select: { id: true, cleIdempotence: true }
  });

  const cles = tousTravauxActifs.map(t => t.cleIdempotence);
  const clesUniques = new Set(cles);
  const doublons = cles.filter((cle, index) => cles.indexOf(cle) !== index);

  console.log(`Travaux actifs : ${tousTravauxActifs.length}`);
  console.log(`Clés uniques : ${clesUniques.size}`);
  console.log(`Doublons détectés : ${[...new Set(doublons)].length}`);

  // 4. Cohérence des travaux recréés
  console.log("\n4. COHÉRENCE DES TRAVAUX RECRÉÉS\n");

  const travauxRecrées = await prisma.travailPlanifie.findMany({
    where: {
      statut: "EN_ATTENTE",
      creeLe: { gte: new Date('2026-09-09T11:19:00.000Z') }
    },
    include: {
      echange: {
        include: {
          categorie: true,
          responsable: true,
        }
      }
    },
    take: 5
  });

  console.log(`Échantillon de 5 travaux recréés :`);
  for (const t of travauxRecrées) {
    console.log(`- ${t.id}`);
    console.log(`  Type : ${t.type}`);
    console.log(`  Échange : ${t.echangeId}`);
    console.log(`  Catégorie : ${t.echange?.categorie?.libelle}`);
    console.log(`  Responsable : ${t.echange?.responsable?.nomComplet}`);
    console.log(`  Exécution : ${t.executerA.toISOString()}`);
    console.log(`  Clé idempotence : ${t.cleIdempotence}`);
  }

  // 5. Historique
  console.log("\n5. VÉRIFICATION DE L'HISTORIQUE\n");

  const travauxHistoriques = await prisma.travailPlanifie.findMany({
    where: {
      statut: "ANNULE",
      termineLe: { gte: new Date('2026-09-09T11:19:00.000Z') }
    },
    take: 3
  });

  console.log(`Échantillon de 3 travaux annulés :`);
  for (const t of travauxHistoriques) {
    console.log(`- ${t.id}`);
    console.log(`  Statut : ${t.statut}`);
    console.log(`  Terminé le : ${t.termineLe?.toISOString()}`);
  }

  // 6. Périmètre
  console.log("\n6. VÉRIFICATION DU PÉRIMÈTRE\n");

  const echangesModifies = await prisma.echange.count({
    where: {
      modifieLe: { gte: new Date('2026-09-09T11:19:00.000Z') }
    }
  });

  console.log(`Échanges modifiés depuis l'exécution : ${echangesModifies}`);

  await prisma.$disconnect();
}

verify().catch(e => {
  console.error("Erreur:", e);
  process.exit(1);
});
