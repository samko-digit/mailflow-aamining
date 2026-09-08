/**
 * MailFlow · Analyse des travaux planifiés
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { DateTime } from "luxon";

async function main() {
  console.log("=== Analyse des travaux planifiés ===\n");

  const maintenant = new Date();
  const dansUneHeure = new Date(Date.now() + 60 * 60 * 1000);

  const travaux = await prisma.travailPlanifie.findMany({
    select: {
      id: true,
      type: true,
      executerA: true,
      creeLe: true,
      echangeId: true,
      echange: {
        select: {
          id: true,
          statut: true,
          sujet: true,
          categorie: {
            select: {
              libelle: true
            }
          },
          responsable: {
            select: {
              nomComplet: true
            }
          }
        }
      }
    },
    orderBy: { executerA: "asc" },
  });

  console.log(`${travaux.length} travaux trouvés\n`);

  // Statistiques
  const stats = {
    total: travaux.length,
    futurs: 0,
    dus: 0,
    enRetard: 0,
    parType: new Map<string, number>(),
    parStatutEchange: new Map<string, number>(),
    bloques: 0,
  };

  for (const t of travaux) {
    stats.parType.set(t.type, (stats.parType.get(t.type) ?? 0) + 1);
    if (t.echange) {
      stats.parStatutEchange.set(t.echange.statut, (stats.parStatutEchange.get(t.echange.statut) ?? 0) + 1);
    }

    if (t.executerA > dansUneHeure) {
      stats.futurs++;
    } else if (t.executerA > maintenant) {
      stats.dus++;
    } else {
      stats.enRetard++;
    }
  }

  console.log("=== Répartition par échéance");
  console.log(`Futurs (> 1h): ${stats.futurs}`);
  console.log(`Dus (< 1h): ${stats.dus}`);
  console.log(`En retard: ${stats.enRetard}`);
  console.log();

  console.log("=== Répartition par type de travail");
  for (const [type, count] of stats.parType) {
    console.log(`${type}: ${count}`);
  }
  console.log();

  console.log("=== Répartition par statut de l'échange");
  for (const [statut, count] of stats.parStatutEchange) {
    console.log(`${statut}: ${count}`);
  }
  console.log();

  // Détail des travaux dus ou en retard
  const urgents = travaux.filter(t => t.executerA <= dansUneHeure);
  console.log(`=== Travaux urgents (dus ou en retard): ${urgents.length}\n`);

  for (const t of urgents.slice(0, 10)) {
    const retard = t.executerA < maintenant ? Math.round((maintenant.getTime() - t.executerA.getTime()) / 60000) : 0;
    console.log(`${t.id}: ${t.type}`);
    if (t.echange) {
      console.log(`  Échange: ${t.echange.sujet}`);
      console.log(`  Statut: ${t.echange.statut}`);
      console.log(`  Catégorie: ${t.echange.categorie?.libelle ?? "N/A"}`);
      console.log(`  Responsable: ${t.echange.responsable?.nomComplet ?? "N/A"}`);
    } else {
      console.log(`  Échange: (supprimé)`);
    }
    console.log(`  Prévu: ${t.executerA.toISOString()}`);
    if (retard > 0) {
      console.log(`  ⚠ RETARD: ${retard} min`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
