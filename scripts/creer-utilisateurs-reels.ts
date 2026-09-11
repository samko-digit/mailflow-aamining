/**
 * MailFlow · Création des utilisateurs réels
 *
 *   npm run utilisateurs:inventaire   montre ce qui serait fait, ne touche à rien
 *   npm run utilisateurs:creer        crée ou met à jour
 *
 * Idempotent : rejouable sans créer de doublon (l'e-mail est unique en base).
 * Ne supprime jamais un utilisateur existant — la purge de la démonstration
 * est un autre script, et elle refuse de tourner tant que des échanges réels
 * dépendent d'un utilisateur fictif.
 *
 * ── LES NOMS SONT DÉDUITS DES ADRESSES ────────────────────────────────────
 *
 * Personne ne me les a dictés : « baremabocoum@ » donne « Baréma Bocoum ».
 * C'est une hypothèse raisonnable, pas une certitude — l'orthographe exacte
 * et les fonctions restent à confirmer, et se corrigent depuis /utilisateurs.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const CREER = process.argv.includes("--creer");

/**
 * `aaming.net` n'a AUCUN enregistrement MX : aucun courrier ne peut y être
 * livré. `aamining.net` en a deux, chez Hostinger. Les adresses fournies en
 * `@aaming.net` étaient donc des fautes de frappe, corrigées ici après
 * vérification DNS le 10/09/2026.
 */
const utilisateurs = [
  {
    email: "info@aamining.net",
    nomComplet: "Accueil AA Mining",
    initiales: "AA",
    fonction: "Boîte générique",
    role: "GESTIONNAIRE" as const,
    note: "boîte partagée, pas une personne — fonction à confirmer",
  },
  {
    email: "baremabocoum@aamining.net",
    nomComplet: "Baréma Bocoum",
    initiales: "BB",
    fonction: null,
    role: "GESTIONNAIRE" as const,
    note: "corrigé depuis @aaming.net · possède aussi barema14@gmail.com",
  },

  {
    email: "mamounberthe7@gmail.com",
    nomComplet: "Mamoun Berthé",
    initiales: "MB",
    fonction: null,
    role: "GESTIONNAIRE" as const,
    note: "test",
  },

  {
    email: "mariamtraore@aamining.net",
    nomComplet: "Mariam Traoré",
    initiales: "MT",
    fonction: null,
    role: "GESTIONNAIRE" as const,
    note: "corrigé depuis @aaming.net",
  },
];

/**
 * Les destinations de transfert autorisées. Quatre adresses pour trois
 * personnes : `barema14@gmail.com` est la seconde adresse de Baréma Bocoum.
 * MailFlow n'accepte qu'un e-mail par utilisateur, elle ne donne donc pas
 * lieu à un compte : elle vit uniquement dans la liste blanche.
 */
const DESTINATIONS = [
  "info@aamining.net",
  "baremabocoum@aamining.net",
  "mariamtraore@aamining.net",
  "barema14@gmail.com",
  "mamounberthe7@gmail.com",
];

console.log("═══ UTILISATEURS À CRÉER ═══\n");
for (const u of utilisateurs) {
  const existe = await prisma.utilisateur.findUnique({ where: { email: u.email }, select: { id: true, nomComplet: true } });
  console.log(`${existe ? "MAJ  " : "NOUVEL"} ${u.nomComplet.padEnd(20)} ${u.email.padEnd(30)} ${u.role}`);
  console.log(`       ${u.note}`);
}

console.log("\n═══ DESTINATIONS DE TRANSFERT AUTORISÉES ═══\n");
for (const d of DESTINATIONS) console.log(`   ${d}`);
console.log(`\n   → à reporter dans .env : MAILFLOW_DESTINATIONS_TRANSFERT="${DESTINATIONS.join(",")}"`);

if (!CREER) {
  console.log("\n═══ LECTURE SEULE — rien n'a été écrit ═══");
  console.log("Pour créer : npm run utilisateurs:creer");
  await prisma.$disconnect();
  process.exit(0);
}

console.log("\n═══ ÉCRITURE ═══\n");
for (const u of utilisateurs) {
  const r = await prisma.utilisateur.upsert({
    where: { email: u.email },
    update: { nomComplet: u.nomComplet, initiales: u.initiales, fonction: u.fonction, role: u.role, actif: true },
    create: { email: u.email, nomComplet: u.nomComplet, initiales: u.initiales, fonction: u.fonction, role: u.role, actif: true },
    select: { id: true, email: true },
  });
  console.log(`   ✓ ${r.email} (${r.id.slice(0, 8)})`);
}

const total = await prisma.utilisateur.count();
const fictifs = await prisma.utilisateur.count({ where: { email: { contains: "exemple-mining.ml" } } });
console.log(`\nutilisateurs en base : ${total} · dont ${fictifs} encore fictifs`);
if (fictifs) {
  console.log("Prochaine étape : réattribuer les échanges réels, puis npm run demo:purger");
}
await prisma.$disconnect();
