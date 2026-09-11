/**
 * MailFlow · Banc d'essai de la route de callback
 *
 *   npm run n8n:tester-callback            (serveur sur le port 3005)
 *   MAILFLOW_PORT=3000 npm run n8n:tester-callback
 *
 * Simule ce que n8n envoie à /api/transfer-callback : mêmes en-têtes, même
 * calcul de signature, mêmes noms de champs. Vérifie que MailFlow accepte ce
 * qu'il doit accepter et refuse le reste — signature, fenêtre d'horodatage,
 * corrélation, et surtout idempotence du callback.
 *
 * Nettoie derrière lui : le travail d'essai est supprimé en fin de course.
 */

import "dotenv/config";
import { createHmac } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { creerTravailTransfert } from "../src/moteur/ordonnanceur";

const PORT = process.env.MAILFLOW_PORT ?? "3005";
const URL = `http://127.0.0.1:${PORT}/api/transfer-callback`;
const SECRET = process.env.N8N_WEBHOOK_SECRET ?? "";
if (!SECRET) {
  console.error("N8N_WEBHOOK_SECRET absente : la route refuserait tout.");
  process.exit(1);
}

let reussis = 0;
let echoues = 0;
function verdict(titre: string, attendu: string, obtenu: string, ok: boolean) {
  console.log(`\n· ${titre}`);
  console.log(`   attendu : ${attendu}`);
  console.log(`   obtenu  : ${obtenu}`);
  console.log(`   ${ok ? "✅ CONFORME" : "❌ ÉCART"}`);
  ok ? reussis++ : echoues++;
}

async function poster(charge: unknown, opts: { secret?: string; timestamp?: number; abimer?: boolean } = {}) {
  const body = JSON.stringify(charge);
  const ts = opts.timestamp ?? Date.now();
  let sig = createHmac("sha256", opts.secret ?? SECRET).update(ts + "." + body).digest("hex");
  if (opts.abimer) sig = sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a");
  const r = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-MailFlow-Signature": sig, "X-MailFlow-Timestamp": String(ts) },
    body,
  });
  return { statut: r.status, corps: (await r.text()).slice(0, 200) };
}

// ── Mise en place : un vrai travail TRANSFERT sur un vrai échange ─────────

const echange = await prisma.echange.findFirst({ select: { id: true, sujet: true } });
if (!echange) {
  console.error("Aucun échange en base : impossible de monter le cas d'essai.");
  process.exit(1);
}

const messageId = `<essai-callback-${Date.now()}@samko.group>`;
const cree = await creerTravailTransfert({
  echangeId: echange.id,
  messageId,
  sourceMailbox: "dec@samko.group",
  destinationMailbox: (process.env.MAILFLOW_DESTINATIONS_TRANSFERT ?? "b@exemple.com").split(",")[0].trim(),
  uid: 4549,
});
if (!cree.travailId) {
  console.error("Création du travail refusée :", JSON.stringify(cree));
  process.exit(1);
}
const travailId = cree.travailId;
console.log(`travail TRANSFERT ${travailId} · échange ${echange.id} · « ${(echange.sujet ?? "").slice(0, 40) } »`);

// C'est exactement la forme que la route recalcule et compare.
const requestId = `${travailId}-transfer-${messageId}`;
const succes = {
  travailId,
  requestId,
  exchangeId: echange.id,
  status: "success",
  messageSent: true,
  messageId: "<mailflow-transfer-essai@samko.group>",
  completedAt: new Date().toISOString(),
};

// ── Les refus ─────────────────────────────────────────────────────────────

let r = await poster(succes, { abimer: true });
verdict("TEST 10 · signature de callback invalide", "401", `${r.statut} ${r.corps}`, r.statut === 401);

r = await poster(succes, { secret: "mauvais-secret" });
verdict("TEST 10b · callback signé avec un autre secret", "401", `${r.statut} ${r.corps}`, r.statut === 401);

r = await poster(succes, { timestamp: Date.now() - 6 * 60_000 });
verdict("TEST 11 · horodatage de callback expiré", "401", `${r.statut} ${r.corps}`, r.statut === 401);

r = await poster({ ...succes, requestId: `${travailId}-transfer-<autre@samko.group>` });
verdict("TEST 11b · requestId qui ne correspond pas", "400, corrélation refusée", `${r.statut} ${r.corps}`, r.statut === 400);

r = await poster({ ...succes, exchangeId: "echange-qui-n-existe-pas" });
verdict("TEST 11c · exchangeId qui ne correspond pas", "400", `${r.statut} ${r.corps}`, r.statut === 400);

// ── Le chemin nominal, puis la répétition ─────────────────────────────────

r = await poster(succes);
const t1 = await prisma.travailPlanifie.findUnique({ where: { id: travailId }, select: { statut: true, termineLe: true } });
verdict("TEST 13b · callback succès valide", "200 et travail TERMINE", `${r.statut} ${r.corps} · statut=${t1?.statut}`,
  r.statut === 200 && t1?.statut === "TERMINE");

const evts1 = await prisma.evenement.count({ where: { echangeId: echange.id, type: "MAIL_TRANSMIS" } });

r = await poster(succes);
const t2 = await prisma.travailPlanifie.findUnique({ where: { id: travailId }, select: { statut: true } });
const evts2 = await prisma.evenement.count({ where: { echangeId: echange.id, type: "MAIL_TRANSMIS" } });
verdict("TEST 17 · callback envoyé deux fois",
  "200 dejaTraite, statut inchangé, AUCUN second événement",
  `${r.statut} ${r.corps} · statut=${t2?.statut} · événements ${evts1}→${evts2}`,
  r.statut === 200 && /dejaTraite/.test(r.corps) && t2?.statut === "TERMINE" && evts1 === evts2);

// ── Le cas d'échec, sur un second travail ─────────────────────────────────

const mid2 = `<essai-echec-${Date.now()}@samko.group>`;
const c2 = await creerTravailTransfert({
  echangeId: echange.id, messageId: mid2, sourceMailbox: "dec@samko.group",
  destinationMailbox: (process.env.MAILFLOW_DESTINATIONS_TRANSFERT ?? "b@exemple.com").split(",")[0].trim(), uid: 4549,
});
const echec = {
  travailId: c2.travailId!,
  requestId: `${c2.travailId}-transfer-${mid2}`,
  exchangeId: echange.id,
  status: "failure",
  error: "DEFINITIF: smtp 550 boite inexistante",
  completedAt: new Date().toISOString(),
};
r = await poster(echec);
const t3 = await prisma.travailPlanifie.findUnique({ where: { id: c2.travailId! }, select: { statut: true, derniereErreur: true } });
verdict("TEST 16 · callback échec définitif", "200 et travail ECHEC avec le motif",
  `${r.statut} · statut=${t3?.statut} · motif=${(t3?.derniereErreur ?? "").slice(0, 40)}`,
  r.statut === 200 && t3?.statut === "ECHEC" && !!t3?.derniereErreur);

// ── L'idempotence de MailFlow elle-même ───────────────────────────────────

const c3 = await creerTravailTransfert({
  echangeId: echange.id, messageId, sourceMailbox: "dec@samko.group",
  destinationMailbox: (process.env.MAILFLOW_DESTINATIONS_TRANSFERT ?? "b@exemple.com").split(",")[0].trim(), uid: 4549,
});
verdict("TEST 14b · même clé d'idempotence côté MailFlow",
  "refusé par l'index UNIQUE, aucun doublon", `existeDeja=${c3.existeDeja} travailId=${c3.travailId ?? "(aucun)"}`,
  c3.existeDeja === true && !c3.travailId);

// ── Nettoyage ─────────────────────────────────────────────────────────────

await prisma.evenement.deleteMany({ where: { echangeId: echange.id, libelle: { contains: "Transfert" }, creeLe: { gte: new Date(Date.now() - 600_000) } } });
await prisma.travailPlanifie.deleteMany({ where: { id: { in: [travailId, c2.travailId!] } } });
console.log("\n(travaux et événements d'essai retirés)");

console.log(`\n${"─".repeat(70)}\nBILAN : ${reussis} conformes · ${echoues} écarts\n`);
await prisma.$disconnect();
