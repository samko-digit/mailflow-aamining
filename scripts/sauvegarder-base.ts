/**
 * MailFlow · Sauvegarde de la base de données
 *
 * Ce script crée une sauvegarde de la base de données PostgreSQL avant
 * d'appliquer des corrections. Utilise pg_dump via exec.
 *
 * La sauvegarde est stockée dans le dossier backups/ avec un timestamp.
 */

import "dotenv/config";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

async function main() {
  console.log("=== Sauvegarde de la base de données ===\n");

  // Créer le dossier backups s'il n'existe pas
  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Générer un timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(backupsDir, `mailflow-backup-${timestamp}.sql`);

  // Récupérer l'URL de la base de données
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERREUR : DATABASE_URL non défini dans .env");
    process.exit(1);
  }

  // `?schema=public` est une extension de Prisma. pg_dump refuse ce paramètre
  // (« invalid URI query parameter: "schema" ») : la commande échouait, mais
  // la redirection avait déjà créé un fichier VIDE, qui passait ensuite pour
  // une sauvegarde valide. Deux fichiers de 0 octet dormaient ainsi dans
  // backups/ le 10/09/2026.
  const urlPourDump = databaseUrl.split("?")[0];
  const urlAffichable = urlPourDump.replace(/\/\/([^:]+):[^@]*@/, "//$1:***@");

  console.log(`Sauvegarde vers : ${backupFile}`);
  console.log(`Base de données : ${urlAffichable}\n`);

  try {
    const command = `pg_dump "${urlPourDump}" > "${backupFile}"`;
    console.log(`Exécution : pg_dump "${urlAffichable}" > …\n`);

    await execAsync(command);

    // Une sauvegarde qu'on ne vérifie pas n'est pas une sauvegarde. pg_dump
    // peut sortir en erreur après que le shell a créé le fichier : sans ce
    // contrôle, on restaurerait du vide le jour où ça compte.
    const stats = fs.statSync(backupFile);
    const contenu = fs.readFileSync(backupFile, "utf8");
    const complet = contenu.includes("PostgreSQL database dump complete");
    if (stats.size === 0 || !complet) {
      fs.unlinkSync(backupFile);
      console.error("✗ Sauvegarde INVALIDE : fichier vide ou tronqué. Il a été supprimé");
      console.error("  pour qu'il ne soit pas pris pour une sauvegarde utilisable.");
      process.exit(1);
    }

    const tables = (contenu.match(/^CREATE TABLE /gm) ?? []).length;
    console.log(`✓ Sauvegarde réussie et vérifiée`);
    console.log(`  Fichier : ${backupFile}`);
    console.log(`  Taille  : ${(stats.size / 1024 / 1024).toFixed(2)} Mo · ${tables} tables`);
    console.log();

    // Une sauvegarde vide qui traînait ne doit pas occuper un des cinq
    // emplacements conservés, ni faire tourner une bonne sauvegarde.
    for (const f of fs.readdirSync(backupsDir)) {
      const chemin = path.join(backupsDir, f);
      if (f.startsWith("mailflow-backup-") && f.endsWith(".sql") && fs.statSync(chemin).size === 0) {
        fs.unlinkSync(chemin);
        console.log(`  (sauvegarde vide écartée : ${f})`);
      }
    }

    // Conserver uniquement les 5 dernières sauvegardes
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith("mailflow-backup-") && f.endsWith(".sql"))
      .map(f => ({
        name: f,
        path: path.join(backupsDir, f),
        time: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 5) {
      console.log(`Nettoyage : suppression des ${files.length - 5} sauvegardes les plus anciennes`);
      for (const oldFile of files.slice(5)) {
        fs.unlinkSync(oldFile.path);
        console.log(`  Supprimé : ${oldFile.name}`);
      }
    }

    console.log();
    console.log("=== Procédure de restauration (rollback) ===");
    console.log(`Pour restaurer cette sauvegarde :`);
    console.log(`  psql "${urlPourDump}" < "${backupFile}"`);
    console.log();

  } catch (erreur) {
    // Le shell a pu créer le fichier avant que pg_dump n'échoue.
    if (fs.existsSync(backupFile) && fs.statSync(backupFile).size === 0) {
      fs.unlinkSync(backupFile);
      console.error("  (fichier vide supprimé : il aurait passé pour une sauvegarde)");
    }
    console.error("✗ Erreur lors de la sauvegarde :", erreur);
    console.error();
    console.error("Vérifiez que pg_dump est installé et accessible dans le PATH.");
    console.error("Sur Windows avec PostgreSQL installé, pg_dump est généralement dans :");
    console.error("  C:\\Program Files\\PostgreSQL\\<version>\\bin\\pg_dump.exe");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
