import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import fs from "fs";

async function identify() {
  console.log("=== IDENTIFICATION DES 4 TRAVAUX SUPPLÉMENTAIRES ===\n");

  const maintenant = new Date();

  // 1. Travaux actuels en retard
  const travauxActuels = await prisma.travailPlanifie.findMany({
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

  // 2. Travaux liés aux 77 échanges requalifiés
  const csvContent = fs.readFileSync("propositions-requalification.csv", "utf-8");
  const lignes = csvContent.split("\n").slice(1);
  const idsRequalifies: string[] = [];
  for (const ligne of lignes) {
    if (!ligne.trim()) continue;
    const parts = ligne.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!parts || parts.length < 7) continue;
    idsRequalifies.push(parts[0].replace(/"/g, ""));
  }

  const travauxLiesRequalification = travauxActuels.filter(t => 
    t.echangeId && idsRequalifies.includes(t.echangeId)
  );

  const travauxNonLiesRequalification = travauxActuels.filter(t => 
    t.echangeId && !idsRequalifies.includes(t.echangeId)
  );

  console.log(`Travaux actuels en retard: ${travauxActuels.length}`);
  console.log(`Travaux liés à requalification: ${travauxLiesRequalification.length}`);
  console.log(`Travaux non liés à requalification: ${travauxNonLiesRequalification.length}\n`);

  // 3. Analyser les travaux non liés à la requalification
  console.log("=== TRAVAUX NON LIÉS À LA REQUALIFICATION ===\n");

  for (const t of travauxNonLiesRequalification) {
    console.log(`ID: ${t.id}`);
    console.log(`  Type: ${t.type}`);
    console.log(`  Échange: ${t.echangeId}`);
    console.log(`  Sujet: ${t.echange?.sujet}`);
    console.log(`  Catégorie: ${t.echange?.categorie?.libelle}`);
    console.log(`  Responsable: ${t.echange?.responsable?.nomComplet}`);
    console.log(`  Créé le: ${t.creeLe.toISOString()}`);
    console.log(`  Exécution prévue: ${t.executerA.toISOString()}`);
    console.log(`  Clé idempotence: ${t.cleIdempotence}`);
    console.log();
  }

  // 4. Vérifier les travaux créés avant et après la requalification
  const dateRequalification = new Date('2026-09-09T11:00:00Z'); // Approximation

  const travauxAvantRequalification = travauxNonLiesRequalification.filter(t => 
    t.creeLe < dateRequalification
  );

  const travauxPendantApresRequalification = travauxNonLiesRequalification.filter(t => 
    t.creeLe >= dateRequalification
  );

  console.log(`Travaux non liés créés avant requalification: ${travauxAvantRequalification.length}`);
  console.log(`Travaux non liés créés pendant/après requalification: ${travauxPendantApresRequalification.length}\n`);

  // 5. Regrouper par date de création pour identifier les batches
  console.log("=== TRAVAUX PAR DATE DE CRÉATION ===\n");

  const parDate = new Map<string, typeof travauxNonLiesRequalification>();
  for (const t of travauxNonLiesRequalification) {
    const dateKey = t.creeLe.toISOString().split('T')[0];
    if (!parDate.has(dateKey)) {
      parDate.set(dateKey, []);
    }
    parDate.get(dateKey)!.push(t);
  }

  for (const [date, travaux] of [...parDate.entries()].sort()) {
    console.log(`${date}: ${travaux.length} travaux`);
    for (const t of travaux) {
      console.log(`  - ${t.id} (${t.type}, ${t.echangeId})`);
    }
  }
  console.log();

  // 6. Identifier les 4 travaux qui pourraient expliquer l'écart
  console.log("=== ANALYSE DE L'ÉCART (96 → 100) ===\n");
  console.log("L'écart de +4 pourrait s'expliquer par:");
  console.log("1. 4 travaux créés pendant la requalification pour des échanges non requalifiés");
  console.log("2. 4 travaux existants non détectés dans le dry-run précédent");
  console.log("3. 4 travaux devenus en retard avec le passage du temps\n");

  // 7. Vérifier les travaux avec clé idempotence "demo-travail"
  const travauxDemo = travauxNonLiesRequalification.filter(t => 
    t.cleIdempotence.startsWith('demo-travail')
  );

  console.log(`Travaux avec clé "demo-travail": ${travauxDemo.length}\n`);
  for (const t of travauxDemo) {
    console.log(`- ${t.id} (${t.echangeId}, ${t.type})`);
  }
  console.log();

  // 8. Conclusion
  console.log("=== CONCLUSION ===\n");
  console.log(`Total travaux en retard: ${travauxActuels.length}`);
  console.log(`Travaux exclus: 1`);
  console.log(`Travaux éligibles: ${travauxActuels.length - 1}`);
  console.log(`Travaux liés requalification: ${travauxLiesRequalification.length}`);
  console.log(`Travaux non liés requalification: ${travauxNonLiesRequalification.length}`);
  console.log(`Travaux demo: ${travauxDemo.length}`);
  console.log(`Autres travaux non liés: ${travauxNonLiesRequalification.length - travauxDemo.length}`);

  await prisma.$disconnect();
}

identify().catch(e => {
  console.error("Erreur:", e);
  process.exit(1);
});
