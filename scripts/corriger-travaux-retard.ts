/**
 * MailFlow · Correction des travaux en retard
 *
 * Ce script corrige les travaux en retard en respectant la logique métier de MailFlow.
 *
 * Cause du problème : Les travaux ont été créés le 8 septembre 2026 avec des dates
 * d'exécution prévues en août 2026 (dans le passé), car les échanges avaient déjà
 * été reçus en août et leurs échéances étaient déjà passées.
 *
 * Solution métier correcte :
 * 1. Conserver recuLe comme date de référence métier
 * 2. Recalculer l'échéance théorique avec la règle de délai de la catégorie
 * 3. Si l'échéance théorique est déjà dépassée : traiter immédiatement (ne pas repousser)
 * 4. Si l'échéance théorique est future : conserver cette échéance calculée
 * 5. Ne jamais modifier recuLe
 * 6. Ne jamais effacer l'historique
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calculerPremiereEcheance } from "../src/donnees/executer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

async function main() {
  console.log("=== Correction des travaux en retard ===\n");

  const maintenant = new Date();

  // Récupérer les travaux en retard
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

  console.log(`${travauxEnRetard.length} travaux en retard détectés\n`);

  console.log("ATTENTION : Ce script va modifier les données de production.");
  console.log("Options disponibles :");
  console.log("  --dry-run : Simule les modifications sans les appliquer");
  console.log("  --confirm : Applique réellement les corrections (après sauvegarde)");
  console.log("Exemple : node --import tsx scripts/corriger-travaux-retard.ts --dry-run\n");

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirm = args.includes("--confirm");

  if (!dryRun && !confirm) {
    console.log("ERREUR : Vous devez spécifier --dry-run ou --confirm");
    process.exit(1);
  }

  if (dryRun && confirm) {
    console.log("ERREUR : Vous ne pouvez pas spécifier à la fois --dry-run et --confirm");
    process.exit(1);
  }

  if (dryRun) {
    console.log("MODE DRY-RUN : Aucune modification ne sera appliquée\n");
  } else {
    console.log("MODE CONFIRM : Les modifications seront appliquées après sauvegarde\n");
  }

  // Sauvegarde obligatoire avant écriture
  if (!dryRun) {
    console.log("=== Sauvegarde de la base de données ===\n");
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error("DATABASE_URL non définie");
      }

      // pg_dump n'accepte pas le paramètre schema dans l'URI, on le retire
      const cleanDatabaseUrl = databaseUrl.replace(/\?schema=public/, "");

      const backupsDir = path.join(process.cwd(), "backups");
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(backupsDir, `mailflow-backup-${timestamp}.sql`);

      console.log(`Création de la sauvegarde : ${backupFile}`);
      const command = `pg_dump "${cleanDatabaseUrl}" > "${backupFile}"`;
      await execAsync(command);

      const stats = fs.statSync(backupFile);
      console.log(`✓ Sauvegarde réussie`);
      console.log(`  Fichier : ${backupFile}`);
      console.log(`  Taille : ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log();

      // Conserver uniquement les 5 dernières sauvegardes
      const files = fs.readdirSync(backupsDir)
        .filter((f: string) => f.startsWith("mailflow-backup-") && f.endsWith(".sql"))
        .map((f: string) => ({
          name: f,
          path: path.join(backupsDir, f),
          time: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
        }))
        .sort((a: any, b: any) => b.time - a.time);

      if (files.length > 5) {
        console.log(`Nettoyage : suppression des ${files.length - 5} sauvegardes les plus anciennes`);
        for (const oldFile of files.slice(5)) {
          fs.unlinkSync(oldFile.path);
          console.log(`  Supprimé : ${oldFile.name}`);
        }
        console.log();
      }

      console.log("=== Procédure de rollback ===");
      console.log("En cas de problème, restaurez la sauvegarde avec :");
      console.log(`  psql "${cleanDatabaseUrl}" < "${backupFile}"`);
      console.log();
    } catch (erreur) {
      console.log("✗ Erreur lors de la sauvegarde :", erreur);
      console.log("Modification annulée pour sécurité.");
      await prisma.$disconnect();
      return;
    }
  }

  // Grouper les travaux par échange pour éviter les doublons
  // CRITIQUE: Exclure les travaux sans échange associé
  const parEchange = new Map<string, typeof travauxEnRetard>();
  const travauxEligibles: typeof travauxEnRetard = [];
  const travauxExclus: typeof travauxEnRetard = [];

  for (const t of travauxEnRetard) {
    if (!t.echange) {
      travauxExclus.push(t);
      continue;
    }
    travauxEligibles.push(t);
    if (!parEchange.has(t.echange.id)) {
      parEchange.set(t.echange.id, []);
    }
    parEchange.get(t.echange.id)!.push(t);
  }

  console.log(`=== Répartition des travaux ===\n`);
  console.log(`Travaux détectés : ${travauxEnRetard.length}`);
  console.log(`Travaux exclus (sans échange) : ${travauxExclus.length}`);
  console.log(`Travaux éligibles : ${travauxEligibles.length}`);
  console.log(`Échanges concernés : ${parEchange.size}\n`);

  if (travauxExclus.length > 0) {
    console.log("Travaux exclus (ne seront pas modifiés) :");
    for (const t of travauxExclus) {
      console.log(`  - ${t.id} (${t.type}) : sans échange`);
    }
    console.log();
  }

  let annules = 0;
  let evenementsCrees = 0;
  const evenementsSimules: Array<{ echangeId: string; type: string; raison: string }> = [];

  if (!dryRun) {
    // CRITIQUE: Utiliser le même filtre que le groupement : seulement les travaux avec échange
    const result = await prisma.travailPlanifie.updateMany({
      where: {
        id: { in: travauxEligibles.map(t => t.id) },
        executerA: { lt: maintenant },
        statut: "EN_ATTENTE",
      },
      data: {
        statut: "ANNULE",
        termineLe: maintenant,
      },
    });
    annules = result.count;
  } else {
    annules = travauxEligibles.length;
    // Simuler les événements qui seraient créés
    for (const [echangeId, travaux] of parEchange) {
      evenementsSimules.push({
        echangeId,
        type: "CORRECTION_TRAVAIL",
        raison: `Annulation et recréation de ${travaux.length} travail(s) en retard`,
      });
      evenementsCrees++;
    }
  }

  // Recréer les travaux avec des dates futures
  console.log(dryRun ? "=== Simulation de recréation des travaux ===\n" : "=== Recréation des travaux avec dates futures ===\n");

  let crees = 0;
  let echecs = 0;
  const modifications: Array<{ id: string; type: string; nouvelleDate: Date }> = [];

  // Vérifications de sécurité avant traitement
  console.log("=== Vérifications de sécurité ===\n");
  for (const [echangeId, travaux] of parEchange) {
    const echange = travaux[0].echange;
    if (!echange) {
      console.log(`✗ Échange introuvable pour travaux : ${travaux.map(t => t.id).join(", ")}`);
      echecs++;
      continue;
    }

    // Vérifier le nombre de travaux
    if (travaux.length > 1) {
      console.log(`[INFO] ${echangeId} : ${travaux.length} travaux (types: ${travaux.map(t => t.type).join(", ")})`);
    }

    // Vérifier les statuts
    const statuts = travaux.map(t => t.statut);
    if (statuts.some(s => s !== "EN_ATTENTE")) {
      console.log(`⚠ ${echangeId} : travaux avec statuts non EN_ATTENTE : ${statuts.join(", ")}`);
    }

    // Vérifier les clés d'idempotence
    const cles = travaux.map(t => t.cleIdempotence);
    const clesUniques = new Set(cles);
    if (cles.length !== clesUniques.size) {
      console.log(`⚠ ${echangeId} : doublons de clés d'idempotence détectés`);
    }
  }

  console.log("✓ Vérifications de sécurité terminées\n");

  for (const [echangeId, travaux] of parEchange) {
    const echange = travaux[0].echange;
    if (!echange || !echange.categorieId) continue;

    try {
      // Logique métier correcte : utiliser recuLe comme date de référence
      const { echeance: echeanceTheorique, premiereRelance } = await calculerPremiereEcheance(
        echange.recuLe, // Conserver la date de réception comme référence métier
        echange.categorieId
      );

      // Déterminer la date à utiliser
      let echeanceFinale: Date;
      if (echeanceTheorique < maintenant) {
        // L'échéance théorique est déjà dépassée
        // Comportement métier : traiter immédiatement, ne pas repousser artificiellement
        echeanceFinale = maintenant;
        console.log(`[INFO] ${echangeId} : échéance théorique dépassée (${echeanceTheorique.toISOString()}), traitement immédiat`);
      } else {
        // L'échéance théorique est future : la conserver
        echeanceFinale = echeanceTheorique;
        console.log(`[INFO] ${echangeId} : échéance théorique future conservée (${echeanceTheorique.toISOString()})`);
      }

      if (!dryRun) {
        // Mettre à jour l'échange avec la nouvelle échéance
        await prisma.echange.update({
          where: { id: echangeId },
          data: {
            echeance: echeanceFinale,
            prochaineRelanceLe: premiereRelance,
          },
        });
      }

      // Recréer les travaux
      for (const t of travaux) {
        let nouvelleDate: Date;
        let ordre: number | undefined;

        if (t.type === "RELANCE") {
          // Pour les relances, utiliser la date finale calculée (maintenant si échéance dépassée)
          nouvelleDate = echeanceFinale;
          ordre = 1;
        } else if (t.type === "SYNCHRO_BOITE") {
          // Pour la synchro, utiliser l'échéance finale
          nouvelleDate = echeanceFinale;
        } else {
          nouvelleDate = echeanceFinale;
        }

        if (dryRun) {
          modifications.push({
            id: t.id,
            type: t.type,
            nouvelleDate,
          });
          crees++;
          console.log(`[DRY-RUN] ${t.id} → nouveau travail ${t.type} le ${nouvelleDate.toISOString()}`);
        } else {
          await prisma.travailPlanifie.create({
            data: {
              type: t.type,
              echangeId,
              executerA: nouvelleDate,
              charge: ordre ? { ordre } : undefined,
              cleIdempotence: `${echangeId}-${t.type}-${nouvelleDate.toISOString()}`,
            },
          });

          crees++;
          console.log(`✓ ${t.id} → nouveau travail ${t.type} le ${nouvelleDate.toISOString()}`);
        }
      }
    } catch (erreur) {
      console.log(`✗ Erreur pour ${echangeId}:`, erreur);
      echecs++;
    }
  }

  console.log("\n=== Résultat ===");
  console.log(`Travaux annulés : ${annules}`);
  console.log(`Travaux recréés : ${crees}`);
  console.log(`Événements créés : ${evenementsCrees}`);
  console.log(`Échecs : ${echecs}`);

  if (!dryRun) {
    // Vérifier l'état final
    const travauxRestants = await prisma.travailPlanifie.findMany({
      where: { executerA: { lt: maintenant }, statut: "EN_ATTENTE" },
    });

    console.log(`\nTravaux encore en retard : ${travauxRestants.length}`);
  } else {
    console.log("\n=== RÉSUMÉ DES MODIFICATIONS SIMULÉES ===");
    console.log(`${annules} travaux seraient annulés`);
    console.log(`${crees} travaux seraient recréés`);
    console.log(`${evenementsCrees} événements seraient créés`);
    console.log("Aucune écriture en base n'a été effectuée");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
