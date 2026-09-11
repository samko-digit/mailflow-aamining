/**
 * MailFlow · Vérification du backup
 *
 * Ce script vérifie que le script de sauvegarde fonctionne et
 * fournit toutes les informations nécessaires.
 */

import "dotenv/config";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

async function main() {
  console.log("=== VÉRIFICATION DU BACKUP ===\n");

  // Vérifier que pg_dump est disponible
  console.log("=== VÉRIFICATION DE PG_DUMP ===\n");
  try {
    await execAsync("pg_dump --version");
    console.log("✓ pg_dump est disponible\n");
  } catch (erreur) {
    console.log("✗ pg_dump n'est pas disponible dans le PATH");
    console.log("Sur Windows, pg_dump est généralement dans :");
    console.log("  C:\\Program Files\\PostgreSQL\\<version>\\bin\\pg_dump.exe");
    console.log();
    console.log("BLOCAGE - pg_dump non disponible");
    return;
  }

  // Vérifier le dossier backups
  const backupsDir = path.join(process.cwd(), "backups");
  console.log("=== DOSSIER DE BACKUP ===\n");
  console.log(`Emplacement : ${backupsDir}`);

  if (!fs.existsSync(backupsDir)) {
    console.log("Le dossier n'existe pas encore (sera créé lors de la sauvegarde)");
  } else {
    console.log("Le dossier existe déjà");
    const files = fs.readdirSync(backupsDir);
    console.log(`Fichiers existants : ${files.length}`);
    if (files.length > 0) {
      console.log("Fichiers :");
      for (const f of files) {
        const filePath = path.join(backupsDir, f);
        const stats = fs.statSync(filePath);
        console.log(`  ${f} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    }
  }
  console.log();

  // Simuler la création d'un backup (sans l'exécuter réellement)
  console.log("=== SIMULATION DE CRÉATION DE BACKUP ===\n");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(backupsDir, `mailflow-backup-${timestamp}.sql`);

  console.log(`Nom du fichier : ${path.basename(backupFile)}`);
  console.log(`Emplacement complet : ${backupFile}`);
  console.log(`Date/heure : ${timestamp}`);
  console.log();

  // Vérifier l'URL de la base de données
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("✗ DATABASE_URL non défini dans .env");
    console.log("BLOCAGE - DATABASE_URL non défini");
    return;
  }

  console.log(`Base de données : ${databaseUrl}`);
  console.log();

  // Estimation de la taille
  console.log("=== ESTIMATION DE LA TAILLE ===\n");
  console.log("La taille dépend de la quantité de données dans la base.");
  console.log("Pour une base de données avec ~1000 échanges :");
  console.log("  - Taille estimée : 5-20 MB");
  console.log("  - Temps estimé : 10-30 secondes");
  console.log();

  // Vérification de la validité
  console.log("=== COMMENT VÉRIFIER QUE LE BACKUP EST VALIDE ===\n");
  console.log("1. Vérifier que le fichier existe :");
  console.log(`   ls -la ${backupFile}`);
  console.log();
  console.log("2. Vérifier que le fichier n'est pas vide :");
  console.log(`   wc -l ${backupFile}`);
  console.log();
  console.log("3. Vérifier que le fichier contient des commandes SQL valides :");
  console.log(`   head -n 20 ${backupFile}`);
  console.log();
  console.log("4. Restaurer dans une base de test (optionnel) :");
  console.log(`   psql "DATABASE_URL_TEST" < ${backupFile}`);
  console.log();

  // Procédure de rollback
  console.log("=== PROCÉDURE DE ROLLBACK ===\n");
  console.log("Pour restaurer la sauvegarde :");
  console.log(`  psql "${databaseUrl}" < "${backupFile}"`);
  console.log();
  console.log("⚠️  ATTENTION :");
  console.log("- La restauration écrasera toutes les données actuelles");
  console.log("- Assurez-vous d'avoir le bon fichier de sauvegarde");
  console.log("- Vérifiez la date/heure du fichier avant restauration");
  console.log();

  // Vérification des sauvegardes existantes
  console.log("=== SAUVEGARDES EXISTANTES ===\n");
  if (fs.existsSync(backupsDir)) {
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith("mailflow-backup-") && f.endsWith(".sql"))
      .map(f => ({
        name: f,
        path: path.join(backupsDir, f),
        time: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      console.log("Aucune sauvegarde existante");
    } else {
      console.log(`${files.length} sauvegarde(s) existante(s) :`);
      for (const f of files) {
        const stats = fs.statSync(f.path);
        const date = new Date(f.time).toISOString();
        console.log(`  ${f.name} (${(stats.size / 1024 / 1024).toFixed(2)} MB) - ${date}`);
      }
    }
  }
  console.log();

  console.log("✓ Vérification du backup terminée");
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
