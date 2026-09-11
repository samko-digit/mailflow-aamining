import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import fs from "fs";

async function audit() {
  console.log("=== AUDIT READ-ONLY COMPLET DE MAILFLOW ===\n");

  try {
    // 1. ÉTAT GLOBAL DE LA BASE
    console.log("1. ÉTAT GLOBAL DE LA BASE\n");

    const echangesCount = await prisma.echange.count();
    const travauxCount = await prisma.travailPlanifie.count();
    const relancesCount = await prisma.relance.count();
    const messagesCount = await prisma.message.count();
    const correspondantsCount = await prisma.correspondant.count();
    const utilisateursCount = await prisma.utilisateur.count();
    const categoriesCount = await prisma.categorie.count();
    const modelesCount = await prisma.modeleMessage.count();
    const evenementsCount = await prisma.evenement.count();
    const joursFeriesCount = await prisma.jourFerie.count();
    const exclusionsCount = await prisma.expediteurExclu.count();

    console.log(`Échanges : ${echangesCount}`);
    console.log(`Travaux planifiés : ${travauxCount}`);
    console.log(`Relances : ${relancesCount}`);
    console.log(`Messages : ${messagesCount}`);
    console.log(`Correspondants : ${correspondantsCount}`);
    console.log(`Utilisateurs : ${utilisateursCount}`);
    console.log(`Catégories : ${categoriesCount}`);
    console.log(`Modèles : ${modelesCount}`);
    console.log(`Événements : ${evenementsCount}`);
    console.log(`Jours fériés : ${joursFeriesCount}`);
    console.log(`Exclusions : ${exclusionsCount}`);

    // Répartitions
    const echangesParStatut = await prisma.echange.groupBy({
      by: ['statut'],
      _count: { id: true }
    });

    console.log("\nRépartition des échanges par statut :");
    for (const s of echangesParStatut) {
      console.log(`  ${s.statut} : ${s._count.id}`);
    }

    const travauxParStatut = await prisma.travailPlanifie.groupBy({
      by: ['statut'],
      _count: { id: true }
    });

    console.log("\nRépartition des travaux par statut :");
    for (const s of travauxParStatut) {
      console.log(`  ${s.statut} : ${s._count.id}`);
    }

    const travauxParType = await prisma.travailPlanifie.groupBy({
      by: ['type'],
      _count: { id: true }
    });

    console.log("\nRépartition des travaux par type :");
    for (const t of travauxParType) {
      console.log(`  ${t.type} : ${t._count.id}`);
    }

    const relancesParStatut = await prisma.relance.groupBy({
      by: ['statut'],
      _count: { id: true }
    });

    console.log("\nRépartition des relances par statut :");
    for (const s of relancesParStatut) {
      console.log(`  ${s.statut} : ${s._count.id}`);
    }

    // 2. ÉCHANGES
    console.log("\n2. ÉCHANGES\n");

    const echangesSansResponsable = await prisma.echange.count({
      where: { responsableId: null }
    });

    const echangesSansCategorie = await prisma.echange.count({
      where: { categorieId: null }
    });

    const echangesAvecPlusieursTravaux = await prisma.echange.findMany({
      include: {
        travaux: {
          where: { statut: "EN_ATTENTE" }
        }
      }
    });

    const echangesMultiplesTravaux = echangesAvecPlusieursTravaux.filter(e => e.travaux.length > 1);

    console.log(`Échanges sans responsable : ${echangesSansResponsable}`);
    console.log(`Échanges sans catégorie : ${echangesSansCategorie}`);
    console.log(`Échanges avec plusieurs travaux actifs : ${echangesMultiplesTravaux.length}`);

    if (echangesMultiplesTravaux.length > 0) {
      console.log("\nÉchanges avec plusieurs travaux actifs :");
      for (const e of echangesMultiplesTravaux) {
        console.log(`  ${e.id} : ${e.travaux.length} travaux`);
      }
    }

    // 3. TRAVAUX PLANIFIÉS
    console.log("\n3. TRAVAUX PLANIFIÉS\n");

    const travauxSansEchange = await prisma.travailPlanifie.count({
      where: { echangeId: null }
    });

    const travauxActifs = await prisma.travailPlanifie.findMany({
      where: { statut: "EN_ATTENTE" },
      select: { id: true, cleIdempotence: true, echangeId: true }
    });

    const cles = travauxActifs.map(t => t.cleIdempotence);
    const clesUniques = new Set(cles);
    const doublons = cles.filter((cle, index) => cles.indexOf(cle) !== index);

    console.log(`Travaux sans échange : ${travauxSansEchange}`);
    console.log(`Travaux actifs : ${travauxActifs.length}`);
    console.log(`Clés uniques : ${clesUniques.size}`);
    console.log(`Doublons de clé d'idempotence : ${[...new Set(doublons)].length}`);

    // Vérifier le travail spécifique
    const travailExclu = await prisma.travailPlanifie.findUnique({
      where: { id: 'cmtsi00400000b8g5qnb66woh' }
    });

    if (travailExclu) {
      console.log(`\nTravail cmtsi00400000b8g5qnb66woh :`);
      console.log(`  Statut : ${travailExclu.statut}`);
      console.log(`  Echange ID : ${travailExclu.echangeId || 'NULL'}`);
    }

    // 4. RELANCES
    console.log("\n4. RELANCES\n");

    const relancesCles = await prisma.relance.findMany({
      select: { id: true, cleIdempotence: true }
    });

    const relancesClesList = relancesCles.map(r => r.cleIdempotence);
    const relancesClesUniques = new Set(relancesClesList);
    const relancesDoublons = relancesClesList.filter((cle, index) => relancesClesList.indexOf(cle) !== index);

    console.log(`Relances totales : ${relancesCles.length}`);
    console.log(`Clés uniques : ${relancesClesUniques.size}`);
    console.log(`Doublons de clé d'idempotence : ${[...new Set(relancesDoublons)].length}`);

    // 5. ÉVÉNEMENTS
    console.log("\n5. ÉVÉNEMENTS\n");

    const evenementsRequalifies = await prisma.evenement.count({
      where: { type: 'MAIL_REQUALIFIE' }
    });

    const evenementsAttribues = await prisma.evenement.count({
      where: { type: 'MAIL_ATTRIBUE' }
    });

    console.log(`Événements MAIL_REQUALIFIE : ${evenementsRequalifies}`);
    console.log(`Événements MAIL_ATTRIBUE : ${evenementsAttribues}`);

    // 6. QUALIFICATION
    console.log("\n6. QUALIFICATION (77 REQUALIFICATIONS)\n");

    const csvContent = fs.readFileSync("propositions-requalification.csv", "utf-8");
    const lignes = csvContent.split("\n").slice(1);
    const idsRequalifies: string[] = [];
    for (const ligne of lignes) {
      if (!ligne.trim()) continue;
      const parts = ligne.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      if (!parts || parts.length < 7) continue;
      idsRequalifies.push(parts[0].replace(/"/g, ""));
    }

    const echangesRequalifies = await prisma.echange.findMany({
      where: { id: { in: idsRequalifies } },
      include: { categorie: true, responsable: true }
    });

    console.log(`Échanges requalifiés trouvés : ${echangesRequalifies.length}`);

    let categorieCoherentes = 0;
    let responsableCoherents = 0;

    for (const e of echangesRequalifies) {
      if (e.categorie?.libelle) categorieCoherentes++;
      if (e.responsable?.nomComplet) responsableCoherents++;
    }

    console.log(`Échanges avec catégorie cohérente : ${categorieCoherentes}/${echangesRequalifies.length}`);
    console.log(`Échanges avec responsable cohérent : ${responsableCoherents}/${echangesRequalifies.length}`);

    // 7. IDEMPOTENCE
    console.log("\n7. IDEMPOTENCE\n");

    console.log(`Travaux - Doublons : ${[...new Set(doublons)].length}`);
    console.log(`Relances - Doublons : ${[...new Set(relancesDoublons)].length}`);

    // 8. TESTS
    console.log("\n8. TESTS\n");
    console.log("À exécuter : npm test");
    
    await prisma.$disconnect();
    console.log("\nAudit terminé avec succès");
  } catch (error) {
    console.error("Erreur:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

audit();
