import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import fs from "fs";

async function check() {
  console.log("=== VÉRIFICATION POST-EXÉCUTION ===\n");
  
  // Lire le CSV pour récupérer les IDs
  const csvContent = fs.readFileSync("propositions-requalification.csv", "utf-8");
  const lignes = csvContent.split("\n").slice(1);
  const ids: string[] = [];
  for (const ligne of lignes) {
    if (!ligne.trim()) continue;
    const parts = ligne.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!parts || parts.length < 7) continue;
    ids.push(parts[0].replace(/"/g, ""));
  }
  
  console.log(`Échanges ciblés : ${ids.length}\n`);
  
  // Vérifier les échanges modifiés
  const echanges = await prisma.echange.findMany({
    where: { id: { in: ids } },
    include: { categorie: true, responsable: true }
  });
  
  console.log(`Échanges trouvés en base : ${echanges.length}\n`);
  
  // Analyser les changements
  let categorieChanges = 0;
  let responsableChanges = 0;
  let echeanceChanges = 0;
  let statutChanges = 0;
  
  const categorieAvant = new Map<string, string>();
  const categorieApres = new Map<string, string>();
  const responsableAvant = new Map<string, string>();
  const responsableApres = new Map<string, string>();
  
  for (const e of echanges) {
    // Comparer avec les valeurs attendues du CSV
    const csvLine = lignes.find(l => l.includes(e.id));
    if (csvLine) {
      const parts = csvLine.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      if (parts && parts.length >= 7) {
        const categorieActuelle = parts[2].replace(/"/g, "");
        const categorieProposee = parts[4].replace(/"/g, "");
        const responsableActuel = parts[3].replace(/"/g, "");
        const responsablePropose = parts[5].replace(/"/g, "");
        
        if (e.categorie?.libelle !== categorieActuelle) {
          categorieChanges++;
          categorieAvant.set(e.id, categorieActuelle);
          categorieApres.set(e.id, e.categorie?.libelle || 'N/A');
        }
        
        if (e.responsable?.nomComplet !== responsableActuel) {
          responsableChanges++;
          responsableAvant.set(e.id, responsableActuel);
          responsableApres.set(e.id, e.responsable?.nomComplet || 'N/A');
        }
      }
    }
  }
  
  console.log("=== RÉSUMÉ DES CHANGEMENTS ===");
  console.log(`Catégories modifiées : ${categorieChanges}`);
  console.log(`Responsables modifiés : ${responsableChanges}`);
  
  // Vérifier les événements MAIL_REQUALIFIE
  const evenementsRequalifies = await prisma.evenement.count({
    where: { 
      type: 'MAIL_REQUALIFIE',
      echangeId: { in: ids }
    }
  });
  
  const evenementsAttribues = await prisma.evenement.count({
    where: { 
      type: 'MAIL_ATTRIBUE',
      echangeId: { in: ids }
    }
  });
  
  console.log(`Événements MAIL_REQUALIFIE créés : ${evenementsRequalifies}`);
  console.log(`Événements MAIL_ATTRIBUE créés : ${evenementsAttribues}`);
  
  // Vérifier les travaux annulés
  const travauxAnnules = await prisma.travailPlanifie.count({
    where: {
      echangeId: { in: ids },
      statut: 'ANNULE'
    }
  });
  
  // Vérifier les travaux planifiés
  const travauxPlanifies = await prisma.travailPlanifie.count({
    where: {
      echangeId: { in: ids },
      statut: 'EN_ATTENTE'
    }
  });
  
  console.log(`Travaux annulés : ${travauxAnnules}`);
  console.log(`Travaux planifiés (EN_ATTENTE) : ${travauxPlanifies}`);
  
  // Vérifier qu'aucun échange hors CSV n'a été modifié
  const echangesHorsCSV = await prisma.echange.count({
    where: {
      id: { notIn: ids },
      categorie: { libelle: 'Date butoir imposée (tutelle, douane, fiscalité)' },
      responsable: { nomComplet: 'Fatoumata Diallo' }
    }
  });
  
  console.log(`Échanges hors CSV modifiés : ${echangesHorsCSV}`);
  
  // Vérifier les doublons d'événements
  const evenementsParEchange = await prisma.evenement.groupBy({
    by: ['echangeId', 'type'],
    where: { echangeId: { in: ids } },
    _count: { id: true }
  });
  
  const multiples = evenementsParEchange.filter(e => e._count.id > 1);
  console.log(`Groupes d'événements multiples : ${multiples.length}`);
  
  if (multiples.length > 0) {
    console.log("\nExemples d'événements multiples par échange:");
    for (let i = 0; i < Math.min(5, multiples.length); i++) {
      const d = multiples[i];
      console.log(`  ${d.echangeId} - ${d.type} : ${d._count.id} événements`);
    }
    
    // Vérifier les détails d'un échantillon
    console.log("\nDétail des événements pour un échantillon:");
    const sampleId = multiples[0]?.echangeId;
    if (sampleId) {
      const events = await prisma.evenement.findMany({
        where: { echangeId: sampleId },
        orderBy: { creeLe: 'desc' }
      });
      console.log(`  ${sampleId}:`);
      for (const ev of events) {
        console.log(`    - ${ev.type} (${ev.creeLe?.toISOString()})`);
      }
    }
  }
  
  // Échantillon de vérification
  console.log("\n=== ÉCHANTILLON DE VÉRIFICATION (5 premiers) ===");
  for (let i = 0; i < Math.min(5, echanges.length); i++) {
    const e = echanges[i];
    console.log(`${e.id}:`);
    console.log(`  Catégorie: ${e.categorie?.libelle}`);
    console.log(`  Responsable: ${e.responsable?.nomComplet}`);
    console.log(`  Statut: ${e.statut}`);
    console.log(`  Échéance: ${e.echeance}`);
  }
  
  await prisma.$disconnect();
}

check();
