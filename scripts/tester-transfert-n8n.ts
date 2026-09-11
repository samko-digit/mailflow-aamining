/**
 * MailFlow · Banc d'essai du workflow n8n de transfert
 *
 *   npm run n8n:tester            tous les cas
 *   npm run n8n:tester -- 10 11   seulement ces cas
 *
 * Le banc reproduit À L'IDENTIQUE ce que fait executerTransfert()
 * (src/moteur/ordonnanceur.ts) : mêmes noms de champs, même en-têtes, même
 * calcul de signature. Si le banc passe et que MailFlow échoue, c'est que le
 * contrat a divergé — pas que le test est complaisant.
 */

import "dotenv/config";
import { createHmac } from "node:crypto";
import { ImapFlow } from "imapflow";

const BASE = (process.env.N8N_BASE_URL ?? "").replace(/\/+$/, "");
const SECRET = process.env.N8N_WEBHOOK_SECRET ?? "";
const CLE_API = process.env.N8N_API_KEY ?? "";
const URL_WEBHOOK = `${BASE}/webhook/mailflow/transfert`;
const DESTINATION = (process.env.MAILFLOW_DESTINATIONS_TRANSFERT ?? "").split(",")[0].trim();
const SOURCE = process.env.MAILFLOW_BOITE ?? "dec@samko.group";

if (!SECRET || !BASE || !DESTINATION) {
  console.error("N8N_BASE_URL, N8N_WEBHOOK_SECRET et MAILFLOW_DESTINATIONS_TRANSFERT sont requis.");
  process.exit(1);
}

const voulus = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const retenu = (n: number) => voulus.length === 0 || voulus.includes(n);

/** Un vrai message de la boîte source : UID et Message-ID réels. */
async function messageReel(): Promise<{ uid: number; messageId: string; sujet: string }> {
  const c = new ImapFlow({
    host: process.env.MAILFLOW_IMAP_HOTE!, port: Number(process.env.MAILFLOW_IMAP_PORT ?? 993), secure: true,
    auth: { user: process.env.MAILFLOW_IMAP_UTILISATEUR!, pass: process.env.MAILFLOW_IMAP_MOT_DE_PASSE! }, logger: false,
  });
  await c.connect();
  const lock = await c.getMailboxLock("INBOX");
  try {
    const box: any = c.mailbox;
    let dernier: any = null;
    for await (const m of c.fetch(`${Math.max(1, box.exists - 4)}:*`, { uid: true, envelope: true })) dernier = m;
    return { uid: dernier.uid, messageId: dernier.envelope?.messageId ?? "", sujet: (dernier.envelope?.subject ?? "").slice(0, 40) };
  } finally {
    lock.release();
    await c.logout();
  }
}

/** Exactement la mise en forme de executerTransfert(). */
function demande(o: Partial<Record<string, unknown>> = {}) {
  const travailId = "essai-" + Math.random().toString(36).slice(2, 10);
  const messageId = (o.messageId as string) ?? "<origine-essai@samko.group>";
  return {
    travailId,
    requestId: `${travailId}-transfer-${messageId}`,
    exchangeId: "echange-essai",
    messageId,
    sourceMailbox: SOURCE,
    destinationMailbox: DESTINATION,
    uid: 1,
    requestedAt: new Date().toISOString(),
    ...o,
  };
}

async function appeler(charge: any, opts: { secret?: string; timestamp?: number; cle?: string; abimerSignature?: boolean } = {}) {
  const body = JSON.stringify(charge);
  const ts = opts.timestamp ?? Date.now();
  let signature = createHmac("sha256", opts.secret ?? SECRET).update(ts + "." + body).digest("hex");
  if (opts.abimerSignature) signature = signature.slice(0, -1) + (signature.endsWith("a") ? "b" : "a");
  const destination = String(charge.destinationMailbox ?? "").trim().toLowerCase();
  const r = await fetch(URL_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MailFlow-Signature": signature,
      "X-MailFlow-Timestamp": String(ts),
      "X-MailFlow-Idempotency-Key": opts.cle ?? `${charge.exchangeId}-transfer-${charge.messageId}-${destination}`,
    },
    body,
  });
  return { statut: r.status, corps: (await r.text()).slice(0, 300) };
}

let reussis = 0;
let echoues = 0;
function verdict(n: number, titre: string, attendu: string, obtenu: string, ok: boolean) {
  console.log(`\nTEST ${String(n).padStart(2)} · ${titre}`);
  console.log(`   attendu : ${attendu}`);
  console.log(`   obtenu  : ${obtenu}`);
  console.log(`   ${ok ? "✅ CONFORME" : "❌ ÉCART"}`);
  ok ? reussis++ : echoues++;
}

console.log(`cible : ${URL_WEBHOOK}`);
console.log(`source ${SOURCE} → destination ${DESTINATION}`);

// ── Sécurité ───────────────────────────────────────────────────────────────

if (retenu(10)) {
  const r = await appeler(demande(), { abimerSignature: true });
  verdict(10, "signature HMAC invalide", "401, transfert refusé", `${r.statut} ${r.corps}`, r.statut === 401);
}

if (retenu(101)) {
  const r = await appeler(demande(), { secret: "mauvais-secret-de-test" });
  verdict(101, "signature calculée avec un autre secret", "401", `${r.statut} ${r.corps}`, r.statut === 401);
}

if (retenu(11)) {
  const r = await appeler(demande(), { timestamp: Date.now() - 6 * 60_000 });
  verdict(11, "horodatage expiré (6 min)", "401, hors fenêtre", `${r.statut} ${r.corps}`, r.statut === 401);
}

if (retenu(111)) {
  const r = await appeler(demande(), { timestamp: Date.now() + 6 * 60_000 });
  verdict(111, "horodatage dans le futur (+6 min)", "401, hors fenêtre", `${r.statut} ${r.corps}`, r.statut === 401);
}

// ── Validation métier ──────────────────────────────────────────────────────

if (retenu(12)) {
  const r = await appeler(demande({ destinationMailbox: SOURCE.toUpperCase() }));
  verdict(12, "source == destination (casse différente)", "400, refusé après normalisation", `${r.statut} ${r.corps}`, r.statut === 400);
}

if (retenu(13)) {
  const r = await appeler(demande({ destinationMailbox: "intrus@exemple.com" }));
  verdict(13, "destination hors liste blanche", "403", `${r.statut} ${r.corps}`, r.statut === 403);
}

if (retenu(131)) {
  // Piège classique : une liste blanche testée avec .includes() laisserait
  // passer une adresse dont l'autorisée est une sous-chaîne.
  const piege = DESTINATION.replace("@", "x@");
  const r = await appeler(demande({ destinationMailbox: piege }));
  verdict(131, `liste blanche non naïve (${piege})`, "403, pas de faux positif", `${r.statut} ${r.corps}`, r.statut === 403);
}

if (retenu(132)) {
  const c: any = demande();
  delete c.messageId;
  const r = await appeler(c);
  verdict(132, "champ obligatoire manquant (messageId)", "400", `${r.statut} ${r.corps}`, r.statut === 400);
}

if (retenu(133)) {
  const c: any = demande();
  delete c.uid;
  const r = await appeler(c);
  verdict(133, "uid IMAP absent", "400", `${r.statut} ${r.corps}`, r.statut === 400);
}

// ── Idempotence ────────────────────────────────────────────────────────────

if (retenu(14)) {
  const reel = await messageReel();
  const c = demande({ messageId: reel.messageId, uid: reel.uid, exchangeId: "idem-" + Date.now() });
  const un = await appeler(c);
  await new Promise((r) => setTimeout(r, 3000));
  const deux = await appeler(c);
  const ok = un.statut === 200 && deux.statut === 200 && /dejaTraite/.test(deux.corps);
  verdict(14, "même webhook envoyé deux fois", "1er : accepté · 2e : dejaTraite=true, aucun second envoi",
    `1er ${un.statut} ${un.corps} | 2e ${deux.statut} ${deux.corps}`, ok);
}

// ── Chemin nominal ─────────────────────────────────────────────────────────

if (retenu(1)) {
  const reel = await messageReel();
  console.log(`\n(message réel choisi : uid=${reel.uid} · ${reel.sujet})`);
  const c = demande({ messageId: reel.messageId, uid: reel.uid, exchangeId: "nominal-" + Date.now() });
  const r = await appeler(c);
  verdict(1, "demande valide A → B", "200, accepté (le transfert se poursuit en tâche de fond)", `${r.statut} ${r.corps}`, r.statut === 200);

  // On laisse le workflow aller au bout, puis on lit le journal réel de n8n.
  await new Promise((x) => setTimeout(x, 12_000));
  const ex: any = await fetch(`${BASE}/api/v1/executions?workflowId=w5ZFQEA4ha2M8orv&limit=1&includeData=true`, {
    headers: { "X-N8N-API-KEY": CLE_API, Accept: "application/json" },
  }).then((x) => x.json());
  const rd = ex.data?.[0]?.data?.resultData;
  console.log(`\n   ── journal n8n de l'exécution ${ex.data?.[0]?.id} (${ex.data?.[0]?.status}) ──`);
  for (const [nom, runs] of Object.entries<any>(rd?.runData ?? {})) {
    const r0 = runs[runs.length - 1];
    if (r0?.error) console.log(`     ✗ ${nom} : ${String(r0.error.message).slice(0, 190)}`);
    else console.log(`     ✓ ${nom} : ${JSON.stringify(r0?.data?.main?.[0]?.[0]?.json ?? {}).slice(0, 190)}`);
  }
}

console.log(`\n${"─".repeat(70)}\nBILAN : ${reussis} conformes · ${echoues} écarts\n`);
