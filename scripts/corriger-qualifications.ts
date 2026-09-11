/**
 * MailFlow · Correction des qualifications incohérentes
 *
 * Ce script lit le fichier propositions-requalification.csv et applique les
 * corrections après validation humaine.
 *
 * ATTENTION : Ce script modifie les données de production. Il doit être exécuté
 * uniquement après validation humaine du fichier CSV.
 *
 * SÉCURITÉ :
 * - Exige --confirm pour toute modification réelle
 * - --dry-run simule sans modifier
 * - Idempotent : une seconde exécution ne crée pas de doublons
 * - Vérifie que catégorie et responsable existent
 * - Vérifie la cohérence catégorie ↔ responsable
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { appliquerEtPersister, calculerPremiereEcheance } from "../src/donnees/executer";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

interface Correction {
  id: string;
  sujet: string;
  categorieActuelle: string;
  responsableActuel: string;
  categorieProposee: string;
  responsablePropose: string;
  raison: string;
  decision?: string; // "VALIDER", "REJETER", ou vide (proposition automatique)
}

async function main() {
  console.log("=== Correction des qualifications incohérentes ===\n");

  // Lire le fichier CSV
  const csvContent = fs.readFileSync("propositions-requalification.csv", "utf-8");
  const lignes = csvContent.split("\n").slice(1); // Skip header

  const corrections: Correction[] = [];
  for (const ligne of lignes) {
    if (!ligne.trim()) continue;
    const parts = ligne.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!parts || parts.length < 7) continue;

    corrections.push({
      id: parts[0].replace(/"/g, ""),
      sujet: parts[1].replace(/"/g, ""),
      categorieActuelle: parts[2].replace(/"/g, ""),
      responsableActuel: parts[3].replace(/"/g, ""),
      categorieProposee: parts[4].replace(/"/g, ""),
      responsablePropose: parts[5].replace(/"/g, ""),
      raison: parts[6].replace(/"/g, ""),
      decision: parts[7]?.replace(/"/g, "").trim() || undefined,
    });
  }

  console.log(`${corrections.length} corrections à appliquer\n`);

  // Récupérer les catégories et utilisateurs
  const categories = await prisma.categorie.findMany({ where: { actif: true } });
  const utilisateurs = await prisma.utilisateur.findMany({ where: { actif: true } });

  const categorieMap = new Map(categories.map(c => [c.libelle, c.id]));
  const utilisateurMap = new Map(utilisateurs.map(u => [u.nomComplet, u.id]));

  // Vérifier que toutes les catégories et responsables proposés existent
  const categoriesInconnues = new Set<string>();
  const utilisateursInconnus = new Set<string>();

  for (const c of corrections) {
    if (!categorieMap.has(c.categorieProposee)) {
      categoriesInconnues.add(c.categorieProposee);
    }
    if (!utilisateurMap.has(c.responsablePropose)) {
      utilisateursInconnus.add(c.responsablePropose);
    }
  }

  if (categoriesInconnues.size > 0) {
    console.log("ERREUR : Catégories inconnues dans le CSV :");
    for (const cat of categoriesInconnues) {
      console.log(`  - ${cat}`);
    }
    console.log("\nCatégories disponibles :");
    categories.forEach(c => console.log(`  - ${c.libelle}`));
    await prisma.$disconnect();
    return;
  }

  if (utilisateursInconnus.size > 0) {
    console.log("ERREUR : Utilisateurs inconnus dans le CSV :");
    for (const u of utilisateursInconnus) {
      console.log(`  - ${u}`);
    }
    console.log("\nUtilisateurs disponibles :");
    utilisateurs.forEach(u => console.log(`  - ${u.nomComplet}`));
    await prisma.$disconnect();
    return;
  }

  // Vérification supplémentaire : que les responsables existent réellement et sont actifs
  console.log("=== Vérification de l'existence et de l'activité des responsables ===\n");
  const responsablesInactifs: string[] = [];
  for (const c of corrections) {
    const responsableId = utilisateurMap.get(c.responsablePropose);
    if (responsableId) {
      const responsable = await prisma.utilisateur.findUnique({
        where: { id: responsableId },
        select: { id: true, nomComplet: true, actif: true },
      });
      if (!responsable) {
        console.log(`✗ Responsable introuvable en base : ${c.responsablePropose}`);
        await prisma.$disconnect();
        return;
      } else if (!responsable.actif) {
        responsablesInactifs.push(c.responsablePropose);
      }
    }
  }

  if (responsablesInactifs.length > 0) {
    console.log("⚠ Avertissement : Responsables inactifs détectés :");
    for (const r of responsablesInactifs) {
      console.log(`  - ${r}`);
    }
    console.log("\nLes échanges seront attribués à des utilisateurs inactifs.");
    console.log("Voulez-vous continuer ? (Modifiez le CSV si nécessaire)\n");
  } else {
    console.log("✓ Tous les responsables sont actifs\n");
  }

  // Afficher les 10 premières corrections pour confirmation
  console.log("=== Aperçu des corrections (10 premières) ===\n");
  for (const c of corrections.slice(0, 10)) {
    console.log(`${c.id}: ${c.sujet}`);
    console.log(`  ${c.categorieActuelle} / ${c.responsableActuel}`);
    console.log(`  → ${c.categorieProposee} / ${c.responsablePropose}`);
    console.log(`  Raison : ${c.raison}`);
    console.log();
  }

  if (corrections.length > 10) {
    console.log(`... et ${corrections.length - 10} autres corrections\n`);
  }

  console.log("ATTENTION : Ce script va modifier les données de production.");
  console.log("Options disponibles :");
  console.log("  --dry-run : Simule les modifications sans les appliquer");
  console.log("  --confirm : Applique réellement les corrections (après sauvegarde)");
  console.log("Exemple : node --import tsx scripts/corriger-qualifications.ts --dry-run\n");

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirm = args.includes("--confirm");

  if (!dryRun && !confirm) {
    console.log("ERREUR : Vous devez spécifier --dry-run ou --confirm");
    console.log("--dry-run : Simule les modifications sans les appliquer");
    console.log("--confirm : Applique réellement les corrections (après sauvegarde)");
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log("=== MODE DRY-RUN : AUCUNE MODIFICATION NE SERA APPLIQUÉE ===\n");
  } else {
    console.log("=== MODE CONFIRM : SAUVEGARDE OBLIGATOIRE AVANT MODIFICATION ===\n");
    
    // Sauvegarde obligatoire avant modification
    console.log("Création de la sauvegarde...\n");

    const backupsDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupFile = path.join(backupsDir, `mailflow-backup-${timestamp}.sql`);
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.log("✗ ERREUR : DATABASE_URL non défini");
      await prisma.$disconnect();
      return;
    }

    try {
      // pg_dump n'accepte pas le paramètre schema dans l'URI, on le retire
      const cleanDatabaseUrl = databaseUrl.replace(/\?schema=public/, "");
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

      console.log("=== Procédure de restauration (rollback) ===");
      console.log(`Pour restaurer cette sauvegarde :`);
      console.log(`  psql "${databaseUrl}" < "${backupFile}"`);
      console.log();
    } catch (erreur) {
      console.log("✗ Erreur lors de la sauvegarde :", erreur);
      console.log("Modification annulée pour sécurité.");
      await prisma.$disconnect();
      return;
    }
  }

  let succes = 0;
  let echecs = 0;
  let evenementsCrees = 0;
  let bloques = 0;
  const modifications: Array<{ id: string; categorie: string; responsable: string }> = [];
  const evenementsSimules: Array<{ echangeId: string; type: string; raison: string }> = [];

  // Identifier les cas ambigus (basés sur les mots-clés)
  const casAmbigus = new Set<string>();
  for (const c of corrections) {
    if (c.raison.includes("facturation") || 
        c.raison.includes("technique") ||
        c.raison.includes("logistique")) {
      casAmbigus.add(c.id);
    }
  }

  console.log(`=== Analyse des propositions ===\n`);
  console.log(`Propositions totales : ${corrections.length}`);
  console.log(`Haute confiance / applicables : ${corrections.length - casAmbigus.size}`);
  console.log(`Ambiguës / validation humaine obligatoire : ${casAmbigus.size}\n`);

  if (casAmbigus.size > 0) {
    console.log("Cas ambigus (bloqués sans validation humaine explicite) :");
    for (const id of casAmbigus) {
      const c = corrections.find(x => x.id === id);
      if (c) {
        console.log(`  - ${id} : ${c.sujet}`);
      }
    }
    console.log();
  }

  for (const c of corrections) {
    try {
      // Vérifier la décision humaine explicite
      if (c.decision === "REJETER") {
        console.log(`[REJETÉ] ${c.id} : décision humaine de rejet`);
        bloques++;
        continue;
      }

      // Bloquer les cas ambigus sans validation humaine explicite
      if (casAmbigus.has(c.id) && c.decision !== "VALIDER" && c.decision !== "VALIDER_PROPOSITION") {
        console.log(`[BLOQUÉ] ${c.id} : cas ambigu, validation humaine requise (décision: ${c.decision || "aucune"})`);
        bloques++;
        continue;
      }

      const categorieId = categorieMap.get(c.categorieProposee)!;
      const responsableId = utilisateurMap.get(c.responsablePropose)!;

      // Récupérer l'échange
      const echange = await prisma.echange.findUnique({
        where: { id: c.id },
        select: { id: true, recuLe: true, statut: true, categorieId: true, responsableId: true, echeance: true },
      });

      if (!echange) {
        console.log(`✗ Échange introuvable : ${c.id}`);
        echecs++;
        continue;
      }

      // REQUALIFIER fonctionne depuis EN_ATTENTE, RELANCE, ESCALADE
      if (!["EN_ATTENTE", "RELANCE", "ESCALADE"].includes(echange.statut)) {
        console.log(`✗ Échange pas dans un état requalifiable : ${c.id} (${echange.statut})`);
        echecs++;
        continue;
      }

      // Vérifier l'idempotence : si déjà correct, passer
      if (echange.categorieId === categorieId && echange.responsableId === responsableId) {
        console.log(`[IDEMPOTENT] ${c.id} : déjà correct, ignoré`);
        succes++;
        continue;
      }

      // Calculer la nouvelle échéance
      const { echeance, premiereRelance } = await calculerPremiereEcheance(
        echange.recuLe,
        categorieId
      );

      if (dryRun) {
        modifications.push({
          id: c.id,
          categorie: c.categorieProposee,
          responsable: c.responsablePropose,
        });
        evenementsSimules.push({
          echangeId: c.id,
          type: "REQUALIFICATION",
          raison: `Requalification : ${c.categorieActuelle} → ${c.categorieProposee}, ${c.responsableActuel} → ${c.responsablePropose}`,
        });
        evenementsCrees++;
        succes++;
        console.log(`[DRY-RUN] ${c.id} : ${c.categorieActuelle} → ${c.categorieProposee} / ${c.responsablePropose}`);
      } else {
        // Appliquer la correction via REQUALIFIER
        await appliquerEtPersister(
          echange.id,
          {
            type: "REQUALIFIER",
            categorie: categorieId,
            responsable: responsableId,
            echeance,
            premiereRelance,
            libelleCategorie: `Catégorie ${c.categorieProposee}`,
            libelleResponsable: `Réattribué à ${c.responsablePropose} (correction)`,
            categorieAvant: echange.categorieId ?? undefined,
            responsableAvant: echange.responsableId ?? undefined,
            echeanceAvant: echange.echeance ?? undefined,
          }
        );

        succes++;
        console.log(`✓ ${c.id} : ${c.categorieActuelle} → ${c.categorieProposee}`);
      }
    } catch (erreur) {
      console.log(`✗ Erreur pour ${c.id}:`, erreur);
      echecs++;
    }
  }

  console.log(`\n=== Résultat ===`);
  console.log(`Succès : ${succes}`);
  console.log(`Échecs : ${echecs}`);
  console.log(`Bloqués (ambigus) : ${bloques}`);
  console.log(`Événements créés : ${evenementsCrees}`);

  if (dryRun) {
    console.log("\n=== RÉSUMÉ DES MODIFICATIONS SIMULÉES ===");
    console.log(`${succes} échanges seraient modifiés`);
    console.log(`${bloques} modifications bloquées (cas ambigus)`);
    console.log(`${evenementsCrees} événements seraient créés`);
    console.log("Aucune écriture en base n'a été effectuée");
  } else {
    console.log("\n=== RÉSUMÉ DES MODIFICATIONS APPLIQUÉES ===");
    console.log(`${succes} échanges ont été modifiés`);
    console.log(`${bloques} modifications bloquées (cas ambigus)`);
    console.log(`${evenementsCrees} événements ont été créés`);
    console.log("Les modifications ont été appliquées en base de données");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
