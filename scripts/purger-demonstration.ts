/**
 * MailFlow · Purge des données de démonstration
 *
 *   npm run demo:inventaire   montre ce qui partirait. NE SUPPRIME RIEN.
 *   npm run demo:purger       supprime, après sauvegarde obligatoire
 *
 * ── POURQUOI ─────────────────────────────────────────────────────────────
 *
 * La base mêle trois populations : les échanges réellement captés dans
 * dec@samko.group, un jeu de démonstration (domaines en `.example` et
 * `exemple-mining.ml`, semé par prisma/seed-demo.ts), et les échanges d'essai
 * du transfert. Tant qu'ils cohabitent, aucun chiffre affiché dans la console
 * n'est interprétable : « 124 mails suivis » n'a pas de sens si 24 sont
 * fictifs.
 *
 * ── CE QUE CE SCRIPT NE FAIT PAS ─────────────────────────────────────────
 *
 * Il ne touche à aucun échange réel, à aucun message de la messagerie, et il
 * refuse de s'exécuter sans sauvegarde préalable. La suppression est
 * irréversible : les échanges emportent leurs messages, relances et
 * événements par cascade.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const PURGER = process.argv.includes("--purger");

/** Marques du jeu de démonstration. Volontairement étroites. */
const DOMAINES_DEMO = ["exemple-mining.ml", "exemple.com", ".example"];
const estDemo = (email: string | null | undefined) =>
  !!email && DOMAINES_DEMO.some((d) => email.toLowerCase().includes(d));

const correspondants = await prisma.correspondant.findMany({ select: { id: true, email: true, nom: true } });
const idsDemo = correspondants.filter((c) => estDemo(c.email)).map((c) => c.id);

const echangesDemo = await prisma.echange.findMany({
  where: { correspondantId: { in: idsDemo } },
  select: { id: true, sujet: true, statut: true },
});
const echangesEssai = await prisma.echange.findMany({
  where: { sujet: { contains: "MAILFLOW-E2E" } },
  select: { id: true, sujet: true, statut: true },
});
const utilisateursDemo = await prisma.utilisateur.findMany({
  where: { OR: [{ email: { contains: "exemple-mining.ml" } }, { nomComplet: { contains: "essai" } }] },
  select: { id: true, email: true, nomComplet: true, _count: { select: { echangesResponsable: true } } },
});
const boitesDemo = await prisma.boiteSuivie.findMany({
  where: { adresse: { contains: "exemple-mining.ml" } },
  select: { id: true, adresse: true, actif: true },
});

const tousEchanges = await prisma.echange.count();
const idsASupprimer = [...echangesDemo.map((e) => e.id), ...echangesEssai.map((e) => e.id)];

const relances = await prisma.relance.count({ where: { echangeId: { in: idsASupprimer } } });
const messages = await prisma.message.count({ where: { echangeId: { in: idsASupprimer } } });
const evenements = await prisma.evenement.count({ where: { echangeId: { in: idsASupprimer } } });
const travaux = await prisma.travailPlanifie.count({ where: { echangeId: { in: idsASupprimer } } });

console.log("═══ INVENTAIRE ═══\n");
console.log(`échanges en base            ${tousEchanges}`);
console.log(`  · de démonstration        ${echangesDemo.length}`);
console.log(`  · d'essai transfert       ${echangesEssai.length}`);
console.log(`  · RÉELS (conservés)       ${tousEchanges - idsASupprimer.length}`);
console.log(`\nemporté par cascade : ${messages} messages · ${relances} relances · ${evenements} événements · ${travaux} travaux`);

console.log(`\ncorrespondants de démonstration : ${idsDemo.length} / ${correspondants.length}`);
console.log(`boîtes suivies de démonstration : ${boitesDemo.length}`);
for (const b of boitesDemo) console.log(`   ${b.actif ? "ACTIVE" : "inactive"} · ${b.adresse}`);

console.log(`\nutilisateurs fictifs : ${utilisateursDemo.length}`);
for (const u of utilisateursDemo) {
  console.log(`   ${u.nomComplet} · ${u.email} · responsable de ${u._count.echangesResponsable} échange(s)`);
}

// Le point qui décide de la suite : combien d'échanges RÉELS sont attribués
// à quelqu'un qui n'existe pas ?
const orphelins = await prisma.echange.count({
  where: {
    responsableId: { in: utilisateursDemo.map((u) => u.id) },
    id: { notIn: idsASupprimer.length ? idsASupprimer : ["-"] },
  },
});
console.log(`\n⚠ échanges RÉELS attribués à un utilisateur fictif : ${orphelins}`);
if (orphelins) {
  console.log("   Supprimer ces utilisateurs mettrait ces échanges sans responsable.");
  console.log("   Créer d'abord les vrais utilisateurs, puis réattribuer, PUIS purger.");
}

if (!PURGER) {
  console.log("\n═══ LECTURE SEULE — rien n'a été supprimé ═══");
  console.log("Pour purger : npm run demo:purger");
  await prisma.$disconnect();
  process.exit(0);
}

// ── Purge ─────────────────────────────────────────────────────────────────

if (orphelins > 0) {
  console.error(`\nREFUS : ${orphelins} échanges réels dépendent encore d'un utilisateur fictif.`);
  console.error("Réattribuer ces échanges à de vrais utilisateurs avant de purger.");
  await prisma.$disconnect();
  process.exit(1);
}

console.log("\n═══ PURGE ═══");
const supprimes = await prisma.echange.deleteMany({ where: { id: { in: idsASupprimer } } });
console.log(`  échanges supprimés     ${supprimes.count} (messages, relances, événements et travaux suivent par cascade)`);

const corrOrphelins = await prisma.correspondant.deleteMany({
  where: { id: { in: idsDemo }, echanges: { none: {} } },
});
console.log(`  correspondants retirés ${corrOrphelins.count}`);

const boites = await prisma.boiteSuivie.deleteMany({ where: { id: { in: boitesDemo.filter((b) => !b.actif).map((b) => b.id) } } });
console.log(`  boîtes de démo retirées ${boites.count} (les boîtes actives ne sont jamais touchées)`);

const users = await prisma.utilisateur.deleteMany({ where: { id: { in: utilisateursDemo.map((u) => u.id) } } });
console.log(`  utilisateurs fictifs retirés ${users.count}`);

console.log(`\néchanges restants : ${await prisma.echange.count()}`);
await prisma.$disconnect();
