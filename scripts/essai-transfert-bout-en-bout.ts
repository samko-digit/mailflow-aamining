/**
 * MailFlow · Essai de bout en bout du transfert, en local
 *
 *   npm run transfert:essai            phases 1 à 5
 *   npm run transfert:essai -- --reponse   phase 6, après que B a répondu
 *
 * ── POURQUOI CE SCRIPT EXISTE ─────────────────────────────────────────────
 *
 * Le Code node de l'instance n8n n'a pas le droit de charger `nodemailer` :
 * il peut donc récupérer le MIME et le transformer, mais pas l'expédier.
 * Ce script exécute LA MÊME chaîne dans l'environnement Node de MailFlow,
 * qui, lui, dispose de nodemailer. Il utilise scripts/lib/chirurgie-mime.js,
 * c'est-à-dire exactement le code inliné dans le node n8n — pas une copie.
 *
 * Ce qu'il valide donc réellement : la fidélité MIME, le threading, la
 * non-clôture de l'échange par le transfert, et le rattachement de la
 * réponse de B au même Echange. Ce qu'il ne valide pas : le fait que n8n
 * lui-même sache expédier, ce qui reste bloqué côté VPS.
 *
 * ── LE MESSAGE D'ESSAI ────────────────────────────────────────────────────
 *
 * Il est fabriqué puis déposé en INBOX par IMAP APPEND, avec un expéditeur
 * externe. Aucun courriel de client réel n'est utilisé, et rien n'est
 * expédié à un tiers : la seule sortie est le transfert vers la destination
 * de la liste blanche, qui est ta propre adresse.
 */

import "dotenv/config";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { createHmac } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { creerTravailTransfert } from "../src/moteur/ordonnanceur";
import { transformerMime } from "./lib/chirurgie-mime.js";
import { connecteurDepuisEnv } from "../src/connecteur/imap";
import { capter } from "../src/donnees/captation";

const SOURCE = process.env.MAILFLOW_BOITE ?? "dec@samko.group";
const DESTINATION = (process.env.MAILFLOW_DESTINATIONS_TRANSFERT ?? "").split(",")[0].trim();
const SECRET = process.env.N8N_WEBHOOK_SECRET ?? "";
const PORT = process.env.MAILFLOW_PORT ?? "3005";
const EXPEDITEUR_ESSAI = "essai-mailflow@client-externe.example";
const MARQUEUR = "MAILFLOW-E2E";

if (!DESTINATION) {
  console.error("MAILFLOW_DESTINATIONS_TRANSFERT est vide.");
  process.exit(1);
}

const client = () =>
  new ImapFlow({
    host: process.env.MAILFLOW_IMAP_HOTE!,
    port: Number(process.env.MAILFLOW_IMAP_PORT ?? 993),
    secure: true,
    auth: { user: process.env.MAILFLOW_IMAP_UTILISATEUR!, pass: process.env.MAILFLOW_IMAP_MOT_DE_PASSE! },
    logger: false,
  });

let ok = 0;
let ko = 0;
function verdict(titre: string, attendu: string, obtenu: string, bon: boolean) {
  console.log(`\n· ${titre}`);
  console.log(`   attendu : ${attendu}`);
  console.log(`   obtenu  : ${obtenu}`);
  console.log(`   ${bon ? "✅" : "❌"}`);
  bon ? ok++ : ko++;
}

// ── Le message d'essai : tout ce que le cahier des charges exige ──────────

function messageEssai(racine: string, sujet: string): Buffer {
  const ext = "----=_MF_Mixed_1";
  const rel = "----=_MF_Rel_1";
  const alt = "----=_MF_Alt_1";
  const pdf = "JVBERi0xLjQKJcfsj6IKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c+PgplbmRvYmoKdHJhaWxlcgo8PC9Sb290IDEgMCBSPj4K";
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAHElEQVQoz2NgGAWjYBSMglEwCkbBKBgFo2AUAAAGdgABkQFsQgAAAABJRU5ErkJggg==";
  return Buffer.from(
    [
      `Return-Path: <${EXPEDITEUR_ESSAI}>`,
      `Received: from mx.client-externe.example (mx.client-externe.example [203.0.113.7])`,
      `\tby mail.samko.group with ESMTPS id essai${Date.now()}`,
      `DKIM-Signature: v=1; a=rsa-sha256; d=client-externe.example; s=s1; bh=AAA; b=BBB`,
      `From: "Client d'essai" <${EXPEDITEUR_ESSAI}>`,
      `To: ${SOURCE}`,
      `Subject: ${sujet}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${racine}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${ext}"`,
      "",
      `--${ext}`,
      `Content-Type: multipart/related; type="multipart/alternative"; boundary="${rel}"`,
      "",
      `--${rel}`,
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      "",
      `--${alt}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      "Version texte du message d'essai MailFlow — accents : é à ù ç ñ.",
      `--${alt}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      '<html><body><p>Version <b>HTML</b> — accents : é à ù ç ñ.</p>',
      '<p>Image en ligne : <img src="cid:logo-essai@mailflow.test" alt="logo"></p></body></html>',
      `--${alt}--`,
      `--${rel}`,
      "Content-Type: image/png",
      "Content-ID: <logo-essai@mailflow.test>",
      "Content-Disposition: inline; filename=logo.png",
      "Content-Transfer-Encoding: base64",
      "",
      png,
      `--${rel}--`,
      `--${ext}`,
      "Content-Type: application/pdf; name=contrat.pdf",
      "Content-Disposition: attachment; filename=contrat.pdf",
      "Content-Transfer-Encoding: base64",
      "",
      pdf,
      `--${ext}`,
      "Content-Type: application/pdf",
      "Content-Disposition: attachment; filename*=UTF-8''Rapport%20d%C3%A9finitif%20%E2%80%94%20ann%C3%A9e%202026.pdf",
      "Content-Transfer-Encoding: base64",
      "",
      pdf,
      `--${ext}--`,
      "",
    ].join("\r\n"),
    "utf8"
  );
}

// ── Phase 6 seule : vérifier la réponse de B ──────────────────────────────

// PowerShell n'achemine pas toujours les arguments places apres « -- » :
// `npm run transfert:essai -- --reponse` a rejoue tout l'essai au lieu de la
// verification. D'ou la commande dediee `npm run transfert:reponse`, et cette
// seconde voie par variable d'environnement.
const MODE_REPONSE = process.argv.includes("--reponse") || process.env.MAILFLOW_ESSAI_REPONSE === "1";

if (MODE_REPONSE) {
  console.log("Relecture de la boîte…");
  const co = connecteurDepuisEnv();
  await co.ouvrir();
  const r = await capter(co, { limite: 60 }).finally(() => co.fermer());
  console.log(`  entrants lus ${r.entrantsLus} · retenus ${r.retenus} · écartés ${r.ecartes}`);
  if (r.raisonsEcart.length) console.log(`  motifs d'écart : ${r.raisonsEcart.map(([m, n]) => `${m}×${n}`).join(", ")}`);

  // Plusieurs essais peuvent coexister : on prend le plus recent, et on
  // signale les autres pour eviter de conclure sur le mauvais.
  const essais = await prisma.echange.findMany({
    where: { sujet: { contains: MARQUEUR } },
    include: { messages: { orderBy: { dateMessage: "asc" } }, evenements: { orderBy: { creeLe: "asc" } } },
    orderBy: { creeLe: "desc" },
  });
  if (essais.length > 1) {
    console.log(`
${essais.length} échanges d'essai en base :`);
    for (const e of essais) console.log(`   ${e.id.slice(0, 8)} · ${e.messages.length} message(s) · ${(e.sujet ?? "").slice(0, 46)}`);
    console.log("   → on examine celui qui a reçu une réponse, sinon le plus récent.");
  }
  const echange =
    essais.find((e) => e.messages.some((m) => m.expediteur.toLowerCase() === DESTINATION.toLowerCase())) ?? essais[0];
  if (!echange) {
    console.log("\nAucun échange d'essai trouvé — lancer d'abord `npm run transfert:essai`.");
    process.exit(1);
  }
  console.log(`\néchange ${echange.id} · conversationId = ${echange.conversationId}`);
  for (const m of echange.messages) {
    console.log(`  ${m.sens.padEnd(8)} ${m.expediteur.padEnd(38)} refs[0]=${(m.references[0] ?? "-").slice(0, 46)}`);
  }
  const deB = echange.messages.filter((m) => m.expediteur.toLowerCase() === DESTINATION.toLowerCase());
  verdict(
    "TEST 8/9 · la réponse de B rejoint le MÊME Echange",
    `un message entrant de ${DESTINATION} dans l'échange ${echange.id.slice(0, 8)}`,
    deB.length ? `${deB.length} message(s) de B rattaché(s)` : "aucun message de B (a-t-il répondu ? la captation l'a-t-elle vu ?)",
    deB.length > 0
  );
  if (deB.length) {
    verdict("TEST 9b · la réponse cite bien la racine du fil",
      `references[0] == ${echange.conversationId}`,
      String(deB[0].references[0] ?? "(aucune référence)"),
      deB[0].references[0] === echange.conversationId);
  }
  console.log(`\nstatut de l'échange : ${echange.statut}`);
  console.log(`événements : ${echange.evenements.map((e) => e.type).join(", ")}`);
  console.log(`\n${"─".repeat(70)}\nBILAN : ${ok} conformes · ${ko} écarts\n`);
  await prisma.$disconnect();
  process.exit(ko ? 1 : 0);
}

// ── Phase 1 · déposer le message d'essai dans la boîte ────────────────────

const racine = `<mailflow-e2e-${Date.now()}@client-externe.example>`;
const sujet = `${MARQUEUR} ${new Date().toISOString().slice(0, 16)} — devis à transférer`;
const brutEssai = messageEssai(racine, sujet);

console.log(`── Phase 1 · dépôt du message d'essai (${brutEssai.length} octets) ──`);
let uid = 0;
{
  const c = client();
  await c.connect();
  const res = await c.append("INBOX", brutEssai, ["\\Seen"]);
  uid = (res as any)?.uid ?? 0;
  await c.logout();
}
console.log(`  déposé · uid=${uid} · racine=${racine}`);
verdict("dépôt IMAP", "un uid attribué", `uid=${uid}`, uid > 0);

// ── Phase 2 · captation : le message doit créer un Echange ────────────────

console.log("\n── Phase 2 · captation ──");
const co1 = connecteurDepuisEnv();
await co1.ouvrir();
const rap = await capter(co1, { limite: 60 }).finally(() => co1.fermer());
console.log(`  entrants ${rap.entrantsLus} · retenus ${rap.retenus} · échanges créés ${rap.echangesCrees}`);

const echange = await prisma.echange.findFirst({ where: { conversationId: racine } });
verdict("TEST · le message externe crée un Echange",
  "un échange dont conversationId == la racine du fil",
  echange ? `échange ${echange.id.slice(0, 8)} · statut ${echange.statut}` : "aucun échange créé",
  !!echange);
if (!echange) {
  console.log("\nSans échange, la suite n'a pas de sens. Motifs d'écart :", rap.raisonsEcart);
  await prisma.$disconnect();
  process.exit(1);
}

// ── Phase 3 · MailFlow crée le TravailPlanifie TRANSFERT ──────────────────

console.log("\n── Phase 3 · création du travail TRANSFERT ──");
const cree = await creerTravailTransfert({
  echangeId: echange.id, messageId: racine, sourceMailbox: SOURCE, destinationMailbox: DESTINATION, uid,
});
verdict("TEST · TravailPlanifie TRANSFERT créé",
  "un travail en base, avec clé d'idempotence",
  cree.travailId ? `travail ${cree.travailId.slice(0, 8)}` : `refusé (existeDeja=${cree.existeDeja})`,
  !!cree.travailId);
const travailId = cree.travailId!;

// ── Phase 4 · exécution du transfert (le code du node n8n) ────────────────

console.log("\n── Phase 4 · récupération, chirurgie MIME, envoi ──");
const t0 = Date.now();

const c = client();
await c.connect();
const lock = await c.getMailboxLock("INBOX");
let origine: Buffer;
try {
  const dl = await c.download(`${uid}`, undefined, { uid: true });
  const bouts: Buffer[] = [];
  for await (const p of dl.content) bouts.push(p as Buffer);
  origine = Buffer.concat(bouts);
} finally {
  lock.release();
}

const ctl = { source: SOURCE, destination: DESTINATION, exchangeId: echange.id };
const { mime, meta } = transformerMime(origine, ctl);

verdict("TEST 2-7 · le corps MIME traverse intact",
  "corps identique octet pour octet",
  `origine ${meta.octetsOrigine} o → transfert ${meta.octetsSortie} o · corps ${meta.octetsCorps} o`,
  origine.subarray(origine.length - meta.octetsCorps).equals(mime.subarray(mime.length - meta.octetsCorps)));

const analyse = await simpleParser(mime);
const pj = analyse.attachments.map((a) => a.filename ?? "(sans nom)");
verdict("TEST 5/7 · pièces jointes et nom Unicode",
  "contrat.pdf + Rapport définitif — année 2026.pdf + logo inline",
  pj.join(" | "),
  pj.some((n) => n === "contrat.pdf") && pj.some((n) => (n ?? "").includes("Rapport définitif")) && analyse.attachments.some((a) => a.cid === "logo-essai@mailflow.test"));
// simpleParser réécrit les URL cid: en interne : la référence doit donc se
// vérifier sur les OCTETS, pas sur le HTML qu'il rend.
const brutTexte = mime.toString("utf8");
verdict("TEST 3/4/6 · texte, HTML et référence CID préservés",
  "text/plain + text/html, et le HTML pointe toujours sur le cid:",
  `text=${analyse.text ? "oui" : "non"} · html=${analyse.html ? "oui" : "non"} · cid dans les octets=${brutTexte.includes('src="cid:logo-essai@mailflow.test"') ? "oui" : "non"} · Content-ID=${brutTexte.includes("Content-ID: <logo-essai@mailflow.test>") ? "oui" : "non"}`,
  !!analyse.text && !!analyse.html && brutTexte.includes('src="cid:logo-essai@mailflow.test"') && brutTexte.includes("Content-ID: <logo-essai@mailflow.test>"));

const transport = nodemailer.createTransport({
  host: process.env.MAILFLOW_SMTP_HOTE!, port: Number(process.env.MAILFLOW_SMTP_PORT ?? 465), secure: true,
  auth: { user: process.env.MAILFLOW_IMAP_UTILISATEUR!, pass: process.env.MAILFLOW_IMAP_MOT_DE_PASSE! },
});
let envoi: any = null;
let erreurEnvoi: string | null = null;
try {
  envoi = await transport.sendMail({ envelope: { from: SOURCE, to: [DESTINATION] }, raw: mime });
} catch (e) {
  erreurEnvoi = e instanceof Error ? e.message : String(e);
}
transport.close();
verdict("TEST 1 · envoi SMTP réel vers B",
  `accepté par le serveur pour ${DESTINATION}`,
  envoi ? `${String(envoi.response).slice(0, 60)} · accepté=${envoi.accepted?.length}` : `échec : ${erreurEnvoi}`,
  !!envoi && (envoi.accepted?.length ?? 0) > 0);

// Le message part ET se dépose dans les envoyés, mêmes octets — c'est ainsi
// que MailFlow procède pour ses relances (voir envoi.ts).
if (envoi) {
  try {
    await c.append(process.env.MAILFLOW_DOSSIER_ENVOYES || "INBOX.Sent", mime, ["\\Seen"]);
    console.log("   (copie déposée dans les envoyés)");
  } catch (e) {
    console.log(`   (dépôt dans les envoyés impossible : ${e instanceof Error ? e.message : e})`);
  }
}
await c.logout();

// ── Phase 5 · callback vers MailFlow ──────────────────────────────────────

console.log("\n── Phase 5 · callback ──");
const charge = {
  travailId,
  requestId: `${travailId}-transfer-${racine}`,
  exchangeId: echange.id,
  status: envoi ? "success" : "failure",
  ...(envoi ? { messageSent: true, messageId: meta.nouvelId } : { error: erreurEnvoi }),
  completedAt: new Date().toISOString(),
};
const corps = JSON.stringify(charge);
const ts = Date.now();
const sig = createHmac("sha256", SECRET).update(ts + "." + corps).digest("hex");
const rep = await fetch(`http://127.0.0.1:${PORT}/api/transfer-callback`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-MailFlow-Signature": sig, "X-MailFlow-Timestamp": String(ts) },
  body: corps,
}).catch((e) => ({ status: 0, text: async () => String(e) }) as any);
const travail = await prisma.travailPlanifie.findUnique({ where: { id: travailId }, select: { statut: true } });
verdict("TEST · le callback finalise le travail",
  "HTTP 200 et travail TERMINE",
  `${rep.status} · statut=${travail?.statut}`,
  rep.status === 200 && travail?.statut === "TERMINE");

// Le transfert déposé dans les envoyés ne doit PAS clore l'échange.
const avant = await prisma.echange.findUnique({ where: { id: echange.id }, select: { statut: true } });
const co2 = connecteurDepuisEnv();
await co2.ouvrir();
const rap2 = await capter(co2, { limite: 60 }).finally(() => co2.fermer());
const apres = await prisma.echange.findUnique({ where: { id: echange.id }, select: { statut: true } });
verdict("TEST 9 · le transfert ne déclenche pas DETECTER_REPONSE",
  `échange encore actif, pas de clôture (avant : ${avant?.statut})`,
  `après captation : ${apres?.statut} · réponses détectées ${rap2.reponsesDetectees}`,
  apres?.statut === avant?.statut);

console.log(`\ndurée totale du transfert : ${Date.now() - t0} ms`);
console.log(`\n${"─".repeat(70)}\nBILAN : ${ok} conformes · ${ko} écarts`);
console.log(`
Étape suivante, manuelle :
  1. ouvre ${DESTINATION}, trouve « ${sujet} »
  2. réponds-y normalement (bouton Répondre, sans changer l'objet)
  3. puis lance :  npm run transfert:essai -- --reponse
`);
await prisma.$disconnect();
