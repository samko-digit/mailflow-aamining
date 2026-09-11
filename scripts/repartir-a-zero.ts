/**
 * MailFlow · Remise à zéro pour AA Mining
 *
 *   npm run base:inventaire   montre ce qui partirait. NE TOUCHE À RIEN.
 *   npm run base:remise-a-zero   exécute, après contrôles
 *
 * ── CE QUE FAIT CE SCRIPT ─────────────────────────────────────────────────
 *
 * Il vide les DONNÉES (échanges, messages, relances, événements, travaux,
 * correspondants, boîtes suivies, utilisateurs fictifs) et conserve la
 * CONFIGURATION (catégories, règles de relance, modèles, exclusions, jours
 * fériés, paramètres) ainsi que les utilisateurs réels d'AA Mining.
 *
 * Voir PASSATION-TRANSFERT.md §13 pour le contexte et la voie alternative
 * (`prisma migrate reset`).
 *
 * ── LES QUATRE PIÈGES, ET COMMENT ILS SONT TRAITÉS ────────────────────────
 *
 * 1. `Evenement.echangeId` est en `SetNull`, pas en cascade : supprimer les
 *    échanges laisserait des centaines d'événements orphelins visibles dans
 *    /journal-activite. On les supprime EN PREMIER.
 *
 * 2. `Categorie.escaladeVers` est en `SetNull` : supprimer les utilisateurs
 *    fictifs vide la cible d'escalade des catégories, SANS ERREUR VISIBLE.
 *    Les escalades ne partiraient plus nulle part. Le script le signale et
 *    refuse de finir en silence.
 *
 * 3. Les `TravailPlanifie` de type SYNCHRO_BOITE n'ont pas d'échange : aucune
 *    cascade ne les emporte. On les supprime à part.
 *
 * 4. `npm run db:demo` détruirait ce travail : seed-demo.ts commence par
 *    effacer utilisateurs, correspondants et échanges. Ne jamais le lancer.
 *    `npm run db:seed` est sûr : configuration seule, par upsert.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

const EXECUTER = process.argv.includes("--executer");

/** Adresses des utilisateurs à CONSERVER. Tout le reste est fictif. */
const UTILISATEURS_REELS = [
  "info@aamining.net",
  "baremabocoum@aamining.net",
  "mariamtraore@aamining.net",
  "mamounberthe7@gmail.com",
];

// ── Garde-fou : pas de sauvegarde fraîche, pas de purge ───────────────────

function sauvegardeRecente(): { fichier: string; heures: number } | null {
  const dossier = path.join(process.cwd(), "backups");
  if (!fs.existsSync(dossier)) return null;
  const valides = fs
    .readdirSync(dossier)
    .filter((f) => f.startsWith("mailflow-backup-") && f.endsWith(".sql"))
    .map((f) => ({ f, p: path.join(dossier, f) }))
    .filter(({ p }) => {
      const s = fs.statSync(p);
      if (s.size === 0) return false;
      // Une sauvegarde tronquée ne vaut pas mieux qu'aucune sauvegarde.
      return fs.readFileSync(p, "utf8").includes("PostgreSQL database dump complete");
    })
    .map(({ f, p }) => ({ fichier: f, heures: (Date.now() - fs.statSync(p).mtime.getTime()) / 3_600_000 }))
    .sort((a, b) => a.heures - b.heures);
  return valides[0] ?? null;
}

// ── Inventaire ────────────────────────────────────────────────────────────

const compte = {
  evenements: await prisma.evenement.count(),
  travaux: await prisma.travailPlanifie.count(),
  echanges: await prisma.echange.count(),
  messages: await prisma.message.count(),
  piecesJointes: await prisma.pieceJointe.count(),
  relances: await prisma.relance.count(),
  correspondants: await prisma.correspondant.count(),
  boites: await prisma.boiteSuivie.count(),
};

const tousUtilisateurs = await prisma.utilisateur.findMany({ select: { id: true, email: true, nomComplet: true } });
const aGarder = tousUtilisateurs.filter((u) => UTILISATEURS_REELS.includes(u.email.toLowerCase()));
const aSupprimer = tousUtilisateurs.filter((u) => !UTILISATEURS_REELS.includes(u.email.toLowerCase()));

const config = {
  categories: await prisma.categorie.count(),
  regles: await prisma.regleRelance.count(),
  modeles: await prisma.modeleMessage.count(),
  exclusions: await prisma.expediteurExclu.count(),
  joursFeries: await prisma.jourFerie.count(),
  parametres: await prisma.parametre.count(),
};

console.log("═══ CE QUI SERA SUPPRIMÉ ═══\n");
console.log(`  événements       ${String(compte.evenements).padStart(5)}   (supprimés en premier : SetNull, pas cascade)`);
console.log(`  travaux planifiés${String(compte.travaux).padStart(5)}`);
console.log(`  échanges         ${String(compte.echanges).padStart(5)}   → emporte messages, pièces jointes, relances`);
console.log(`    · messages     ${String(compte.messages).padStart(5)}`);
console.log(`    · pièces jointes${String(compte.piecesJointes).padStart(4)}`);
console.log(`    · relances     ${String(compte.relances).padStart(5)}`);
console.log(`  correspondants   ${String(compte.correspondants).padStart(5)}`);
console.log(`  boîtes suivies   ${String(compte.boites).padStart(5)}`);
console.log(`  utilisateurs     ${String(aSupprimer.length).padStart(5)}`);
for (const u of aSupprimer) console.log(`      ✗ ${u.nomComplet} · ${u.email}`);

console.log("\n═══ CE QUI SERA CONSERVÉ ═══\n");
console.log(`  catégories ${config.categories} · règles ${config.regles} · modèles ${config.modeles} · exclusions ${config.exclusions}`);
console.log(`  jours fériés ${config.joursFeries} · paramètres ${config.parametres}`);
console.log(`  utilisateurs réels ${aGarder.length}`);
for (const u of aGarder) console.log(`      ✓ ${u.nomComplet} · ${u.email}`);

if (aGarder.length !== UTILISATEURS_REELS.length) {
  console.log(`\n⚠ ${UTILISATEURS_REELS.length - aGarder.length} utilisateur(s) réel(s) manquant(s) en base.`);
  console.log("  Lancer d'abord : npm run utilisateurs:creer");
}

// Piège n°2, annoncé avant d'agir.
const categories = await prisma.categorie.findMany({
  select: { id: true, libelle: true, escaladeVersId: true },
});
const escaladesPerdues = categories.filter(
  (c) => c.escaladeVersId && aSupprimer.some((u) => u.id === c.escaladeVersId)
);
const sansEscalade = categories.filter((c) => !c.escaladeVersId);
if (sansEscalade.length) {
  console.log(`
⚠ ${sansEscalade.length} catégorie(s) sur ${categories.length} n'ont AUCUNE cible d'escalade.`);
  console.log("  Le bouton « escalader » est donc inactif sur ces échanges (page /echange).");
  console.log("  Lacune préexistante, indépendante de la remise à zéro : à combler dans /regles-relance.");
}
if (escaladesPerdues.length) {
  console.log(`\n⚠ ${escaladesPerdues.length} catégorie(s) escaladent vers un utilisateur qui va disparaître :`);
  for (const c of escaladesPerdues) console.log(`      ${c.libelle}`);
  console.log("  Leur cible passera à null SANS ERREUR : les escalades ne partiraient plus nulle part.");
  console.log("  À re-pointer depuis /regles-relance juste après la remise à zéro.");
}

const sauvegarde = sauvegardeRecente();
console.log(`\n═══ SAUVEGARDE ═══\n`);
if (sauvegarde) {
  console.log(`  ${sauvegarde.fichier} · il y a ${sauvegarde.heures.toFixed(1)} h`);
} else {
  console.log("  AUCUNE sauvegarde valide trouvée dans backups/");
}

if (!EXECUTER) {
  console.log("\n═══ LECTURE SEULE — rien n'a été supprimé ═══");
  console.log("Pour exécuter : npm run base:remise-a-zero");
  await prisma.$disconnect();
  process.exit(0);
}

// ── Exécution ─────────────────────────────────────────────────────────────

if (!sauvegarde || sauvegarde.heures > 24) {
  console.error("\nREFUS : aucune sauvegarde valide de moins de 24 h.");
  console.error("Lancer d'abord : npm run db:sauvegarder");
  await prisma.$disconnect();
  process.exit(1);
}

if (aGarder.length === 0) {
  console.error("\nREFUS : aucun utilisateur réel en base — la console serait inutilisable.");
  console.error("Lancer d'abord : npm run utilisateurs:creer");
  await prisma.$disconnect();
  process.exit(1);
}

console.log("\n═══ REMISE À ZÉRO ═══\n");

// L'ordre compte : les événements ne sont pas emportés par cascade.
const ev = await prisma.evenement.deleteMany();
console.log(`  événements supprimés        ${ev.count}`);

const tp = await prisma.travailPlanifie.deleteMany();
console.log(`  travaux planifiés supprimés ${tp.count}`);

const ec = await prisma.echange.deleteMany();
console.log(`  échanges supprimés          ${ec.count}  (messages, pièces jointes, relances suivent)`);

const co = await prisma.correspondant.deleteMany();
console.log(`  correspondants supprimés    ${co.count}`);

const bo = await prisma.boiteSuivie.deleteMany();
console.log(`  boîtes suivies supprimées   ${bo.count}`);

const us = await prisma.utilisateur.deleteMany({ where: { id: { in: aSupprimer.map((u) => u.id) } } });
console.log(`  utilisateurs fictifs retirés ${us.count}`);

// Les compteurs de suivi décrivent une exploitation qui n'existe plus.
// `valeur` est un Json NON nullable : on y écrit un null JSON, pas un null SQL.
// Et surtout, on ne masque pas l'échec : des clés mal orthographiées
// passeraient inaperçues et laisseraient des compteurs menteurs à l'écran.
for (const cle of ["moteur_dernier_passage", "alertes_etat"]) {
  const r = await prisma.parametre.updateMany({ where: { cle }, data: { valeur: Prisma.JsonNull } });
  if (r.count === 0) console.log(`  ⚠ paramètre « ${cle} » introuvable — vérifier son orthographe`);
  else console.log(`  paramètre « ${cle} » réinitialisé`);
}

console.log("\n═══ ÉTAT FINAL ═══\n");
console.log(`  échanges ${await prisma.echange.count()} · messages ${await prisma.message.count()} · événements ${await prisma.evenement.count()}`);
console.log(`  utilisateurs ${await prisma.utilisateur.count()} · catégories ${await prisma.categorie.count()}`);
if (escaladesPerdues.length) {
  console.log(`\n⚠ RESTE À FAIRE : re-pointer la cible d'escalade de ${escaladesPerdues.length} catégorie(s) dans /regles-relance.`);
}
console.log("\nEnsuite : configurer la boîte de Madame (.env, §12), puis npm run capter.");
await prisma.$disconnect();
