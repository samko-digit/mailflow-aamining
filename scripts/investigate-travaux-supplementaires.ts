import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import fs from "fs";

async function investigate() {
  console.log("=== INVESTIGATION READ-ONLY DES TRAVAUX SUPPLÉMENTAIRES ===\n");

  const maintenant = new Date();

  // 1. Identifier les 101 travaux actuellement en retard
  const travauxEnRetard = await prisma.travailPlanifie.findMany({
    where: {
      executerA: { lt: maintenant },
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

  console.log(`1. TRAVAUX EN RETARD DÉTECTÉS : ${travauxEnRetard.length}\n`);

  for (const t of travauxEnRetard) {
    console.log(`ID: ${t.id}`);
    console.log(`  Type: ${t.type}`);
    console.log(`  Statut: ${t.statut}`);
    console.log(`  Echange ID: ${t.echangeId || 'NULL'}`);
    console.log(`  Exécution prévue: ${t.executerA.toISOString()}`);
    console.log(`  Créé le: ${t.creeLe.toISOString()}`);
    console.log(`  Clé idempotence: ${t.cleIdempotence}`);
    if (t.echange) {
      console.log(`  Sujet: ${t.echange.sujet}`);
      console.log(`  Catégorie: ${t.echange.categorie?.libelle}`);
      console.log(`  Responsable: ${t.echange.responsable?.nomComplet}`);
      console.log(`  Recu le: ${t.echange.recuLe.toISOString()}`);
      console.log(`  Échéance échange: ${t.echange.echeance?.toISOString()}`);
    }
    console.log();
  }

  // 2. Identifier les travaux sans échange (exclus)
  const travauxSansEchange = travauxEnRetard.filter(t => !t.echange);
  console.log(`2. TRAVAUX SANS ÉCHANGE (EXCLUS) : ${travauxSansEchange.length}\n`);
  for (const t of travauxSansEchange) {
    console.log(`- ${t.id} (${t.type})`);
  }
  console.log();

  // 3. Identifier les travaux éligibles (avec échange)
  const travauxEligibles = travauxEnRetard.filter(t => t.echange);
  console.log(`3. TRAVAUX ÉLIGIBLES (AVEC ÉCHANGE) : ${travauxEligibles.length}\n`);

  // 4. Vérifier les travaux liés aux 77 échanges requalifiés
  const csvContent = fs.readFileSync("propositions-requalification.csv", "utf-8");
  const lignes = csvContent.split("\n").slice(1);
  const idsRequalifies: string[] = [];
  for (const ligne of lignes) {
    if (!ligne.trim()) continue;
    const parts = ligne.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!parts || parts.length < 7) continue;
    idsRequalifies.push(parts[0].replace(/"/g, ""));
  }

  console.log(`4. VÉRIFICATION LIEN AVEC REQUALIFICATIONS (77 échanges)\n`);

  const travauxLiesRequalification = travauxEligibles.filter(t => 
    t.echangeId && idsRequalifies.includes(t.echangeId)
  );

  console.log(`Travaux liés aux 77 échanges requalifiés : ${travauxLiesRequalification.length}\n`);

  for (const t of travauxLiesRequalification) {
    console.log(`- ${t.id} (échange: ${t.echangeId}, type: ${t.type})`);
  }
  console.log();

  // 5. Vérifier les événements MAIL_REQUALIFIE pour ces échanges
  console.log(`5. ÉVÉNEMENTS MAIL_REQUALIFIE POUR LES ÉCHANGES REQUALIFIÉS\n`);

  const evenementsRequalifies = await prisma.evenement.findMany({
    where: {
      type: 'MAIL_REQUALIFIE',
      echangeId: { in: idsRequalifies }
    },
    orderBy: { creeLe: 'desc' }
  });

  console.log(`Événements MAIL_REQUALIFIE trouvés : ${evenementsRequalifies.length}\n`);

  // 6. Vérifier les travaux créés après la requalification
  console.log(`6. TRAVAUX CRÉÉS APRÈS LA REQUALIFICATION\n`);

  const dateRequalification = evenementsRequalifies.length > 0 
    ? evenementsRequalifies[0].creeLe 
    : new Date('2026-09-09T11:00:00Z');

  const travauxApresRequalification = travauxEligibles.filter(t => 
    t.creeLe > dateRequalification
  );

  console.log(`Travaux créés après la requalification : ${travauxApresRequalification.length}\n`);

  for (const t of travauxApresRequalification) {
    console.log(`- ${t.id}`);
    console.log(`  Créé le: ${t.creeLe.toISOString()}`);
    console.log(`  Échange: ${t.echangeId}`);
    console.log(`  Type: ${t.type}`);
    console.log(`  Lié à requalification: ${t.echangeId && idsRequalifies.includes(t.echangeId) ? 'OUI' : 'NON'}`);
    console.log();
  }

  // 7. Vérifier les doublons de clés d'idempotence
  console.log(`7. VÉRIFICATION DES DOUBLONS DE CLÉS D'IDEMPOTENCE\n`);

  const clesIdempotence = travauxEligibles.map(t => t.cleIdempotence);
  const clesUniques = new Set(clesIdempotence);
  const doublons = clesIdempotence.filter((cle, index) => 
    clesIdempotence.indexOf(cle) !== index
  );

  console.log(`Clés uniques: ${clesUniques.size}`);
  console.log(`Doublons détectés: ${[...new Set(doublons)].length}\n`);

  if (doublons.length > 0) {
    console.log(`Clés en doublon:`);
    for (const cle of [...new Set(doublons)]) {
      const travauxAvecCetteCle = travauxEligibles.filter(t => t.cleIdempotence === cle);
      console.log(`  ${cle}: ${travauxAvecCetteCle.length} travaux`);
      for (const t of travauxAvecCetteCle) {
        console.log(`    - ${t.id} (${t.type})`);
      }
    }
    console.log();
  }

  // 8. Vérifier les travaux par échange
  console.log(`8. TRAVAUX PAR ÉCHANGE\n`);

  const parEchange = new Map<string, typeof travauxEligibles>();
  for (const t of travauxEligibles) {
    if (!t.echangeId) continue;
    if (!parEchange.has(t.echangeId)) {
      parEchange.set(t.echangeId, []);
    }
    parEchange.get(t.echangeId)!.push(t);
  }

  const echangesAvecPlusieursTravaux = [...parEchange.entries()]
    .filter(([_, travaux]) => travaux.length > 1);

  console.log(`Échanges avec plusieurs travaux: ${echangesAvecPlusieursTravaux.length}\n`);

  for (const [echangeId, travaux] of echangesAvecPlusieursTravaux) {
    console.log(`- ${echangeId}: ${travaux.length} travaux`);
    for (const t of travaux) {
      console.log(`  - ${t.id} (${t.type}, ${t.creeLe.toISOString()})`);
    }
  }
  console.log();

  // 9. Vérifier le travail exclu
  console.log(`9. VÉRIFICATION DU TRAVAIL EXCLU\n`);

  const travailExclu = await prisma.travailPlanifie.findUnique({
    where: { id: 'cmtsi00400000b8g5qnb66woh' }
  });

  if (travailExclu) {
    console.log(`Travail cmtsi00400000b8g5qnb66woh trouvé:`);
    console.log(`  ID: ${travailExclu.id}`);
    console.log(`  Type: ${travailExclu.type}`);
    console.log(`  Statut: ${travailExclu.statut}`);
    console.log(`  Echange ID: ${travailExclu.echangeId || 'NULL'}`);
    console.log(`  Exécution prévue: ${travailExclu.executerA.toISOString()}`);
    console.log(`  En retard: ${travailExclu.executerA < maintenant}`);
  } else {
    console.log(`Travail cmtsi00400000b8g5qnb66woh non trouvé`);
  }
  console.log();

  // 10. Résumé
  console.log(`=== RÉSUMÉ ===\n`);
  console.log(`Total travaux en retard: ${travauxEnRetard.length}`);
  console.log(`Travaux exclus (sans échange): ${travauxSansEchange.length}`);
  console.log(`Travaux éligibles: ${travauxEligibles.length}`);
  console.log(`Travaux liés à requalification: ${travauxLiesRequalification.length}`);
  console.log(`Travaux créés après requalification: ${travauxApresRequalification.length}`);
  console.log(`Doublons de clés: ${[...new Set(doublons)].length}`);
  console.log(`Échanges avec plusieurs travaux: ${echangesAvecPlusieursTravaux.length}`);

  await prisma.$disconnect();
}

investigate().catch(e => {
  console.error("Erreur:", e);
  process.exit(1);
});
