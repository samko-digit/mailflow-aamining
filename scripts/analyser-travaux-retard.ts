/**
 * MailFlow · Analyse détaillée des travaux en retard
 *
 * Analyse pourquoi 103 travaux sur 118 sont en retard,
 * certains de plus de 30 jours.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== Analyse des travaux en retard ===\n");

  const maintenant = new Date();

  const travaux = await prisma.travailPlanifie.findMany({
    select: {
      id: true,
      type: true,
      executerA: true,
      creeLe: true,
      statut: true,
      tentatives: true,
      derniereErreur: true,
      echangeId: true,
      echange: {
        select: {
          id: true,
          statut: true,
          sujet: true,
          recuLe: true,
          echeance: true,
          categorie: {
            select: { libelle: true },
          },
          responsable: {
            select: { nomComplet: true },
          },
        },
      },
    },
    orderBy: { executerA: "asc" },
  });

  console.log(`${travaux.length} travaux trouvés\n`);

  // Analyser les travaux en retard
  const enRetard = travaux.filter(t => t.executerA < maintenant);
  console.log(`${enRetard.length} travaux en retard\n`);

  // Répartition par statut de travail
  const parStatut = new Map<string, number>();
  for (const t of enRetard) {
    parStatut.set(t.statut, (parStatut.get(t.statut) ?? 0) + 1);
  }

  console.log("=== Répartition par statut de travail ===");
  for (const [statut, count] of parStatut) {
    console.log(`${statut}: ${count}`);
  }
  console.log();

  // Répartition par type
  const parType = new Map<string, number>();
  for (const t of enRetard) {
    parType.set(t.type, (parType.get(t.type) ?? 0) + 1);
  }

  console.log("=== Répartition par type ===");
  for (const [type, count] of parType) {
    console.log(`${type}: ${count}`);
  }
  console.log();

  // Analyser les dates
  const retards = enRetard.map(t => ({
    id: t.id,
    type: t.type,
    retardMinutes: Math.round((maintenant.getTime() - t.executerA.getTime()) / 60000),
    creeLe: t.creeLe,
    executerA: t.executerA,
    echangeRecuLe: t.echange?.recuLe,
    echangeEcheance: t.echange?.echeance,
  }));

  console.log("=== Analyse des retards ===");
  const maxRetard = Math.max(...retards.map(r => r.retardMinutes));
  const minRetard = Math.min(...retards.map(r => r.retardMinutes));
  const avgRetard = retards.reduce((sum, r) => sum + r.retardMinutes, 0) / retards.length;

  console.log(`Retard max : ${maxRetard} min (${Math.round(maxRetard / 60)}h)`);
  console.log(`Retard min : ${minRetard} min (${Math.round(minRetard / 60)}h)`);
  console.log(`Retard moyen : ${Math.round(avgRetard)} min (${Math.round(avgRetard / 60)}h)`);
  console.log();

  // Vérifier la cohérence des dates
  console.log("=== Cohérence des dates (10 premiers) ===");
  for (const r of retards.slice(0, 10)) {
    console.log(`${r.id}: ${r.type}`);
    console.log(`  Échange reçu le : ${r.echangeRecuLe?.toISOString() ?? "N/A"}`);
    console.log(`  Échange échéance : ${r.echangeEcheance?.toISOString() ?? "N/A"}`);
    console.log(`  Travail créé le : ${r.creeLe.toISOString()}`);
    console.log(`  Travail prévu le : ${r.executerA.toISOString()}`);
    console.log(`  Retard : ${r.retardMinutes} min`);
    
    // Vérifier si l'échéance de l'échange est cohérente avec la date du travail
    if (r.echangeEcheance && r.executerA) {
      const delta = Math.abs(r.echangeEcheance.getTime() - r.executerA.getTime());
      const deltaMinutes = Math.round(delta / 60000);
      console.log(`  Delta échéance/travail : ${deltaMinutes} min`);
    }
    console.log();
  }

  // Vérifier les erreurs
  const avecErreurs = enRetard.filter(t => t.derniereErreur);
  console.log(`=== Travaux avec erreurs : ${avecErreurs.length} ===`);
  for (const t of avecErreurs.slice(0, 5)) {
    console.log(`${t.id}: ${t.type}`);
    console.log(`  Erreur : ${t.derniereErreur}`);
    console.log(`  Tentatives : ${t.tentatives}`);
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
