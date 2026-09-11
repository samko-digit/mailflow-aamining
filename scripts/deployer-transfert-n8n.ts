/**
 * MailFlow · Déploiement du workflow n8n « Transfert d'e-mail »
 *
 *   npm run n8n:deployer
 *
 * Idempotent : rejouable sans créer de doublon. Le workflow est retrouvé par
 * son nom ; s'il existe, il est mis à jour, sinon il est créé. Aucun autre
 * workflow de l'instance n'est lu, modifié ni désactivé.
 *
 * ── CE QUE CE WORKFLOW N'EST PAS ──────────────────────────────────────────
 *
 * Il ne décide rien. MailFlow décide, crée le TravailPlanifie TRANSFERT et
 * appelle le webhook ; n8n exécute et rend compte. Le workflow ne crée aucun
 * Echange, ne touche pas la base MailFlow, n'invente aucune règle métier.
 *
 * ── CONTRAINTES RÉELLES DE L'INSTANCE (constatées, non supposées) ─────────
 *
 * n8n 2.35.3 self-hosted, édition community.
 *   · `crypto` est INTERDIT dans un Code node → le HMAC passe par le node
 *     Crypto natif, dont la sortie a été recoupée avec Node.js.
 *   · `process`, `$env` sont inaccessibles depuis un Code node → les accès
 *     IMAP vivent dans la Data Table `imap_config`, comme le fait déjà la
 *     maison. Le secret HMAC, lui, est porté par les nodes Crypto : passer
 *     par une Data Table le ferait apparaître dans le journal d'exécution
 *     de CHAQUE passage (constaté, puis corrigé).
 *   · Le node emailSend JETTE les en-têtes personnalisés (vérifié en envoyant
 *     puis en relisant le message) → l'envoi passe par nodemailer en Code.
 *   · Les Data Tables n'ont AUCUNE contrainte d'unicité (vérifié : deux
 *     insertions de la même clé créent deux lignes) → voir « idempotence ».
 */

import "dotenv/config";
import { readFileSync } from "node:fs";

const BASE = (process.env.N8N_BASE_URL ?? "").replace(/\/+$/, "");
const CLE = process.env.N8N_API_KEY ?? "";
const SECRET = process.env.N8N_WEBHOOK_SECRET ?? "";
const WHITELIST = process.env.MAILFLOW_DESTINATIONS_TRANSFERT ?? "";
const CALLBACK =
  process.env.MAILFLOW_CALLBACK_URL ??
  `${(process.env.MAILFLOW_URL_CONSOLE ?? "http://127.0.0.1:3000").replace(/\/+$/, "")}/api/transfer-callback`;

const NOM = "MailFlow - Transfer Email";
const CHEMIN = "mailflow/transfert";
const BOITE_SOURCE = (process.env.MAILFLOW_BOITE ?? "dec@samko.group").split("@")[0];

for (const [k, v] of [["N8N_BASE_URL", BASE], ["N8N_API_KEY", CLE], ["N8N_WEBHOOK_SECRET", SECRET], ["MAILFLOW_DESTINATIONS_TRANSFERT", WHITELIST]]) {
  if (!v) {
    console.error(`${k} manquante dans .env — déploiement interrompu.`);
    process.exit(1);
  }
}

const H = { "X-N8N-API-KEY": CLE, "Content-Type": "application/json", Accept: "application/json" };
const api = async (chemin: string, init?: RequestInit) => {
  const r = await fetch(BASE + chemin, { ...init, headers: H });
  const t = await r.text();
  let j: any = null;
  try {
    j = JSON.parse(t);
  } catch {
    /* réponse non JSON */
  }
  return { statut: r.status, ok: r.ok, j, t };
};

// ── 1. Les deux tables de travail ──────────────────────────────────────────

async function tablePar(
  nom: string,
  colonnes: { name: string; type: string; index?: boolean }[],
  jetable = false
) {
  const l = await api("/api/v1/data-tables");
  const existe = (l.j?.data ?? []).find((t: any) => t.name === nom);
  if (existe) {
    const presentes = (existe.columns ?? []).map((c: any) => c.name).sort().join(",");
    const voulues = colonnes.map((c) => c.name).sort().join(",");
    if (presentes === voulues) {
      console.log(`  table « ${nom} » : déjà là (${existe.id})`);
      return existe.id as string;
    }
    // L'API publique ne sait ni modifier une colonne ni corriger une ligne
    // (PATCH et PUT sur /rows répondent 405). Une table de pure configuration,
    // régénérée à chaque déploiement, peut donc être refaite. Jamais une table
    // qui porte de l'état, comme les claims d'idempotence.
    if (!jetable) {
      console.log(`  ⚠ table « ${nom} » : schéma différent (${presentes}) mais elle porte de l'état — laissée telle quelle.`);
      return existe.id as string;
    }
    console.log(`  table « ${nom} » : schéma obsolète, reconstruction`);
    await api(`/api/v1/data-tables/${existe.id}`, { method: "DELETE" });
  }
  const c = await api("/api/v1/data-tables", { method: "POST", body: JSON.stringify({ name: nom, columns: colonnes }) });
  if (!c.j?.id) throw new Error(`création de « ${nom} » refusée : ${c.statut} ${c.t.slice(0, 200)}`);
  console.log(`  table « ${nom} » : créée (${c.j.id})`);
  return c.j.id as string;
}

console.log("── Tables ──");
const T_CONFIG = await tablePar("mailflow_config", [
  // Pas de colonne pour le secret HMAC : tout ce que lit le node Config
  // atterrit dans le journal d'exécution de chaque passage.
  { name: "cle", type: "string", index: true },
  { name: "destinations_autorisees", type: "string" },
  { name: "callback_url", type: "string" },
  { name: "smtp_host", type: "string" },
  { name: "smtp_port", type: "number" },
  { name: "fenetre_secondes", type: "number" },
], true);
const T_IDEM = await tablePar("mailflow_idempotence", [
  { name: "cle", type: "string", index: true },
  { name: "travail_id", type: "string", index: true },
  { name: "etat", type: "string" },
  { name: "detail", type: "string" },
]);

const l = await api("/api/v1/data-tables");
const T_IMAP = (l.j?.data ?? []).find((t: any) => t.name === "imap_config")?.id;
if (!T_IMAP) throw new Error("table imap_config introuvable : elle porte les accès de la boîte source.");
console.log(`  table « imap_config » : réutilisée (${T_IMAP})`);

// La ligne de configuration. Elle ne contient aucun secret.
const rows = await api(`/api/v1/data-tables/${T_CONFIG}/rows`);
const ligne = (rows.j?.data ?? []).find((r: any) => r.cle === "defaut");
const valeurs = {
  cle: "defaut",
  destinations_autorisees: WHITELIST,
  callback_url: CALLBACK,
  smtp_host: process.env.MAILFLOW_SMTP_HOTE ?? "smtp.hostinger.com",
  smtp_port: Number(process.env.MAILFLOW_SMTP_PORT ?? 465),
  fenetre_secondes: 300,
};
if (ligne) {
  await api(`/api/v1/data-tables/${T_CONFIG}/rows/${ligne.id}`, { method: "PATCH", body: JSON.stringify({ data: valeurs }) });
  console.log("  configuration : mise à jour");
} else {
  await api(`/api/v1/data-tables/${T_CONFIG}/rows`, { method: "POST", body: JSON.stringify({ data: [valeurs] }) });
  console.log("  configuration : insérée");
}

// ── 2. Le code des nodes ───────────────────────────────────────────────────

// Le corps brut EXACT, tel que reçu sur le fil. Signer JSON.stringify(body)
// donnerait une autre suite d'octets dès que l'ordre des clés ou l'échappement
// diffère : la signature ne vaut que sur les octets d'origine.
const CODE_CORPS_BRUT = [
  "const it = $input.first();",
  "const h = it.json.headers || {};",
  "if (!it.binary || !it.binary.data) {",
  "  return [{ json: { rawBody: '', aSigner: '', signatureRecue: '', timestamp: '', cleIdempotence: '', charge: {}, defaut: 'corps brut absent : activer options.rawBody sur le Webhook' } }];",
  "}",
  "const rawBody = Buffer.from(it.binary.data.data, 'base64').toString('utf8');",
  "const timestamp = String(h['x-mailflow-timestamp'] || '');",
  "let charge = {};",
  "try { charge = JSON.parse(rawBody); } catch (e) { charge = {}; }",
  "return [{ json: {",
  "  rawBody: rawBody,",
  "  aSigner: timestamp + '.' + rawBody,",
  "  signatureRecue: String(h['x-mailflow-signature'] || ''),",
  "  timestamp: timestamp,",
  "  cleIdempotence: String(h['x-mailflow-idempotency-key'] || ''),",
  "  charge: charge,",
  "  octets: rawBody.length,",
  "  recuLe: new Date().toISOString(),",
  "} }];",
].join("\n");

const CODE_CONTROLES = [
  "const brut = $('Corps brut').first().json;",
  "const cfg  = $('Config').first().json;",
  "const attendue = String($input.first().json.signature_attendue || '');",
  "const recue = String(brut.signatureRecue || '');",
  "const c = brut.charge || {};",
  "",
  "// Comparaison qui parcourt toujours toute la longueur : pas de sortie",
  "// anticipée au premier caractère qui diffère.",
  "function egales(a, b) {",
  "  if (a.length !== b.length) return false;",
  "  let d = 0;",
  "  for (let i = 0; i < a.length; i++) { d |= a.charCodeAt(i) ^ b.charCodeAt(i); }",
  "  return d === 0;",
  "}",
  "const norm = (e) => String(e || '').trim().toLowerCase();",
  "",
  "// Journal : de quoi diagnostiquer, jamais de secret ni de contenu de mail.",
  "const j = {",
  "  requestId: c.requestId || null,",
  "  travailId: c.travailId || null,",
  "  exchangeId: c.exchangeId || null,",
  "  messageId: c.messageId || null,",
  "  cleIdempotence: brut.cleIdempotence || null,",
  "  octetsRecus: brut.octets || 0,",
  "};",
  "const refus = (code, raison) => [{ json: Object.assign({ recevable: 'non', code: code, raison: raison }, j) }];",
  "",
  "if (!recue || !attendue) return refus(401, 'signature absente');",
  "if (!egales(recue, attendue)) return refus(401, 'signature invalide');",
  "",
  "const ts = parseInt(brut.timestamp, 10);",
  "if (!Number.isFinite(ts)) return refus(401, 'horodatage illisible');",
  "const fenetre = Number(cfg.fenetre_secondes || 300) * 1000;",
  "const ecart = Math.abs(Date.now() - ts);",
  "if (ecart > fenetre) return refus(401, 'horodatage hors fenetre (' + Math.round(ecart / 1000) + ' s)');",
  "",
  "for (const champ of ['travailId', 'requestId', 'exchangeId', 'messageId', 'sourceMailbox', 'destinationMailbox']) {",
  "  if (!c[champ]) return refus(400, 'champ obligatoire manquant : ' + champ);",
  "}",
  "if (c.uid === undefined || c.uid === null || !Number.isFinite(Number(c.uid))) return refus(400, 'uid IMAP absent ou illisible');",
  "if (!brut.cleIdempotence) return refus(400, 'en-tete X-MailFlow-Idempotency-Key absent');",
  "",
  "const source = norm(c.sourceMailbox);",
  "const destination = norm(c.destinationMailbox);",
  "if (!source.includes('@') || !destination.includes('@')) return refus(400, 'adresse mal formee');",
  "if (source === destination) return refus(400, 'source et destination identiques');",
  "",
  "// Comparaison exacte apres normalisation. Surtout pas chaine.includes(),",
  "// qui ferait passer b@ex.com pour autorise si bb@ex.com figure dans la liste.",
  "const blanche = String(cfg.destinations_autorisees || '').split(',').map(norm).filter(Boolean);",
  "if (blanche.indexOf(destination) === -1) return refus(403, 'destination hors liste blanche');",
  "",
  "return [{ json: Object.assign({",
  "  recevable: 'oui',",
  "  source: source,",
  "  destination: destination,",
  "  boiteSource: source.split('@')[0],",
  "  uid: Number(c.uid),",
  "  requestedAt: c.requestedAt || null,",
  "}, j) }];",
].join("\n");

// Un seul node fait la récupération, la transformation et l'envoi. C'est
// délibéré : le MIME complet ne franchit alors aucune frontière de node, donc
// n8n ne l'écrit jamais dans le journal d'exécution. Seules des métadonnées
// sortent d'ici.
// La chirurgie MIME vit dans un fichier à part pour être testable. On inline
// sa source ici : le Code node n8n ne sait pas importer, et une seconde copie
// finirait par diverger de celle que les tests exercent.
const SOURCE_CHIRURGIE = readFileSync(new URL("./lib/chirurgie-mime.js", import.meta.url), "utf8")
  .replace(/^export \{[^}]*\};?\s*$/m, "")
  .trimEnd();

const CODE_TRANSFERER = [
  SOURCE_CHIRURGIE,
  "",
  "const Imap = require('imap');",
  "",
  "const ctl = $('Controles').first().json;",
  "const cfg = $('Config').first().json;",
  "const acces = $input.first().json;",
  "const t0 = Date.now();",
  "",
  "// n8n rehabille les exceptions d'un Code node et efface le prefixe qu'on y",
  "// met (constate : 'DEFINITIF: x' ressort en 'x'). On ne LEVE donc pas pour",
  "// signaler un echec previsible : on RETOURNE un item structure, dont le",
  "// node de callback lit les champs sans avoir a analyser du texte.",
  "const echec = (definitif, phase, message) => [{ json: {",
  "  envoye: false, definitif: definitif, phase: phase,",
  "  erreur: String(message).slice(0, 300), dureeMs: Date.now() - t0,",
  "} }];",
  "",
  "if (!acces || !acces.host || !acces.user || !acces.app_password) {",
  "  return echec(true, 'config', 'acces IMAP introuvable dans imap_config pour la boite ' + ctl.boiteSource);",
  "}",
  "",
  "// -- 1. Le MIME d'origine, par UID, en lecture seule --",
  "let brut;",
  "try {",
  "  brut = await new Promise((resolve, reject) => {",
  "    const imap = new Imap({",
  "      user: acces.user, password: acces.app_password, host: acces.host,",
  "      port: parseInt(acces.port) || 993, tls: true,",
  "      tlsOptions: { servername: acces.host }, connTimeout: 30000, authTimeout: 15000,",
  "    });",
  "    let fini = false;",
  "    const rater = (m, definitif) => { if (!fini) { fini = true; const x = new Error(m); x.definitif = !!definitif; reject(x); } };",
  "    imap.once('error', (e) => rater('imap ' + e.message, /AUTHENTICATIONFAILED|Invalid credentials/i.test(String(e.message))));",
  "    imap.once('ready', () => {",
  "      imap.openBox('INBOX', true, (err) => {",
  "        if (err) { imap.end(); return rater('openBox ' + err.message, false); }",
  "        const f = imap.fetch([ctl.uid], { bodies: '' });",
  "        const morceaux = [];",
  "        let vu = false;",
  "        f.on('message', (msg) => { vu = true; msg.on('body', (s) => { s.on('data', (d) => morceaux.push(Buffer.from(d))); }); });",
  "        f.once('error', (e) => { imap.end(); rater('fetch ' + e.message, false); });",
  "        f.once('end', () => {",
  "          imap.end();",
  "          if (fini) return;",
  "          fini = true;",
  "          // Un UID absent ne reapparaitra pas : le message a ete deplace ou",
  "          // supprime. Reessayer n'y changerait rien.",
  "          if (!vu || !morceaux.length) { const x = new Error('message introuvable a uid ' + ctl.uid); x.definitif = true; reject(x); }",
  "          else resolve(Buffer.concat(morceaux));",
  "        });",
  "      });",
  "    });",
  "    imap.connect();",
  "  });",
  "} catch (e) {",
  "  return echec(!!e.definitif, 'imap', e.message);",
  "}",
  "",
  "// -- 2. Chirurgie des en-tetes --",
  "// Le corps ne bouge pas : voir scripts/lib/chirurgie-mime.js, dont la source",
  "// est inlinee en tete de ce node et exercee telle quelle par",
  "// tests/chirurgie-mime.test.ts.",
  "let nouveauMime, meta;",
  "try {",
  "  const resultat = transformerMime(brut, ctl);",
  "  nouveauMime = resultat.mime;",
  "  meta = resultat.meta;",
  "} catch (e) {",
  "  return echec(true, 'mime', e.message);",
  "}",
  "",
  "// -- 3. Envoi du MIME tel quel --",
  "let nodemailer;",
  "try { nodemailer = require('nodemailer'); }",
  "catch (e) { return echec(true, 'smtp', 'nodemailer indisponible dans le Code node : ajouter nodemailer a NODE_FUNCTION_ALLOW_EXTERNAL sur le VPS, puis redemarrer n8n'); }",
  "",
  "const transport = nodemailer.createTransport({",
  "  host: cfg.smtp_host, port: Number(cfg.smtp_port) || 465,",
  "  secure: Number(cfg.smtp_port) === 465,",
  "  auth: { user: acces.user, pass: acces.app_password },",
  "  connectionTimeout: 30000, greetingTimeout: 15000,",
  "});",
  "",
  "// Retry : tentative immediate, puis 2 min, puis 4 min. Le waitBetweenTries",
  "// de n8n plafonne a 5 s, la temporisation vit donc ici.",
  "//",
  "// On ne reessaie QUE ce qui n'a pas pu atteindre la phase DATA : refus de",
  "// connexion, DNS, delai depasse, ou 4xx SMTP (le serveur dit lui-meme",
  "// 'plus tard'). Un 5xx ou un echec d'authentification est definitif :",
  "// insister enverrait un doublon sans jamais reussir.",
  "const attentes = [0, 120000, 240000];",
  "let envoi = null;",
  "let derniere = null;",
  "for (let n = 0; n < attentes.length; n++) {",
  "  if (attentes[n]) await new Promise((r) => setTimeout(r, attentes[n]));",
  "  try {",
  "    envoi = await transport.sendMail({ envelope: { from: ctl.source, to: [ctl.destination] }, raw: nouveauMime });",
  "    derniere = null;",
  "    break;",
  "  } catch (e) {",
  "    const code = String(e.responseCode || e.code || '');",
  "    const definitif = /^5/.test(code) || /EAUTH|EENVELOPE|ENOTFOUND/.test(code);",
  "    derniere = { code: code, message: String(e.message).slice(0, 200), definitif: definitif, tentative: n + 1 };",
  "    if (definitif) break;",
  "  }",
  "}",
  "try { transport.close(); } catch (e) {}",
  "",
  "if (!envoi) {",
  "  const d = derniere || { code: '?', message: 'echec inconnu', definitif: true, tentative: attentes.length };",
  "  return echec(d.definitif, 'smtp', 'smtp ' + d.code + ' apres ' + d.tentative + ' tentative(s) : ' + d.message);",
  "}",
  "",
  "// Metadonnees seulement : ni corps, ni piece jointe, ni identifiant de connexion.",
  "return [{ json: {",
  "  envoye: true,",
  "  messageIdTransfert: meta.nouvelId,",
  "  externalMessageId: envoi.messageId || meta.nouvelId,",
  "  reponseSmtp: String(envoi.response || '').slice(0, 120),",
  "  accepte: (envoi.accepted || []).length,",
  "  rejete: (envoi.rejected || []).length,",
  "  octetsEnvoyes: nouveauMime.length,",
  "  octetsOrigine: meta.octetsOrigine,",
  "  referencesPosees: meta.references.length,",
  "  chaineTransfert: meta.chaine,",
  "  dureeMs: Date.now() - t0,",
  "} }];",
].join("\n");

const CODE_CALLBACK = [
  "const ctl = $('Controles').first().json;",
  "const it = $input.first().json;",
  "// Trois provenances possibles : succes, echec structure par le node, ou",
  "// exception inattendue arrivee par la sortie d'erreur de n8n.",
  "const succes = it.envoye === true;",
  "const erreur = succes ? null : (it.erreur || (it.error && (it.error.message || it.error)) || 'echec inconnu');",
  "const definitif = succes ? null : (it.definitif !== undefined ? it.definitif : null);",
  "const phase = it.phase || (it.error ? 'inattendu' : null);",
  "",
  "// Les noms de champs suivent exactement ce que lit /api/transfer-callback.",
  "const charge = {",
  "  travailId: ctl.travailId,",
  "  requestId: ctl.requestId,",
  "  exchangeId: ctl.exchangeId,",
  "  status: succes ? 'success' : 'failure',",
  "  completedAt: new Date().toISOString(),",
  "};",
  "if (succes) { charge.messageSent = true; charge.messageId = it.externalMessageId || it.messageIdTransfert; }",
  "else { charge.error = String(erreur).slice(0, 500); }",
  "",
  "// On fige les octets ici : c'est cette chaine exacte qui sera signee PUIS",
  "// postee. Laisser le node HTTP re-serialiser l'objet casserait la signature.",
  "const rawBody = JSON.stringify(charge);",
  "const timestamp = String(Date.now());",
  "return [{ json: {",
  "  rawBody: rawBody,",
  "  aSigner: timestamp + '.' + rawBody,",
  "  timestamp: timestamp,",
  "  statut: charge.status,",
  "  erreur: charge.error || null,",
  "  definitif: definitif,",
  "  phase: phase,",
  "  journal: { requestId: ctl.requestId, travailId: ctl.travailId, exchangeId: ctl.exchangeId, messageId: ctl.messageId, destination: ctl.destination, dureeMs: it.dureeMs || null },",
  "} }];",
].join("\n");

// ── 3. Le graphe ───────────────────────────────────────────────────────────

const P = (x: number, y: number) => [x, y] as [number, number];
const dt = (id: string) => ({ __rl: true, mode: "id", value: id });
const siEgal = (gauche: string, droite: string) => ({
  options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
  conditions: [{ id: "c1", leftValue: gauche, rightValue: droite, operator: { type: "string", operation: "equals" } }],
  combinator: "and",
});

const nodes: any[] = [
  { parameters: { httpMethod: "POST", path: CHEMIN, responseMode: "responseNode", options: { rawBody: true } },
    id: "a0000001-0000-4000-8000-000000000001", name: "Reception", type: "n8n-nodes-base.webhook", typeVersion: 2.1, position: P(-460, 0), webhookId: "a0000001-0000-4000-8000-000000000001" },

  { parameters: { jsCode: CODE_CORPS_BRUT }, id: "a0000002-0000-4000-8000-000000000002", name: "Corps brut", type: "n8n-nodes-base.code", typeVersion: 2, position: P(-260, 0) },

  { parameters: { resource: "row", operation: "get", dataTableId: dt(T_CONFIG), matchType: "allConditions",
      filters: { conditions: [{ keyName: "cle", condition: "eq", keyValue: "defaut" }] }, returnAll: false, limit: 1 },
    id: "a0000003-0000-4000-8000-000000000003", name: "Config", type: "n8n-nodes-base.dataTable", typeVersion: 1.1, position: P(-60, 0) },

  { parameters: { action: "hmac", type: "SHA256", value: "={{ $('Corps brut').first().json.aSigner }}",
      dataPropertyName: "signature_attendue", secret: SECRET, encoding: "hex" },
    id: "a0000004-0000-4000-8000-000000000004", name: "Signature attendue", type: "n8n-nodes-base.crypto", typeVersion: 1, position: P(140, 0) },

  { parameters: { jsCode: CODE_CONTROLES }, id: "a0000005-0000-4000-8000-000000000005", name: "Controles", type: "n8n-nodes-base.code", typeVersion: 2, position: P(340, 0) },

  { parameters: { conditions: siEgal("={{ $json.recevable }}", "oui"), options: {} },
    id: "a0000006-0000-4000-8000-000000000006", name: "Recevable ?", type: "n8n-nodes-base.if", typeVersion: 2.3, position: P(540, 0) },

  { parameters: { respondWith: "json", responseBody: "={{ JSON.stringify({ accepte: false, code: $json.code, raison: $json.raison }) }}",
      options: { responseCode: "={{ $json.code }}" } },
    id: "a0000007-0000-4000-8000-000000000007", name: "Refus", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: P(760, 180) },

  { parameters: { resource: "row", operation: "get", dataTableId: dt(T_IDEM), matchType: "allConditions",
      filters: { conditions: [{ keyName: "cle", condition: "eq", keyValue: "={{ $('Controles').first().json.cleIdempotence }}" }] }, returnAll: false, limit: 1 },
    id: "a0000008-0000-4000-8000-000000000008", name: "Claim existant ?", type: "n8n-nodes-base.dataTable", typeVersion: 1.1, position: P(760, -120), alwaysOutputData: true },

  { parameters: { conditions: siEgal("={{ $json.cle ? 'oui' : 'non' }}", "oui"), options: {} },
    id: "a0000009-0000-4000-8000-000000000009", name: "Deja traite ?", type: "n8n-nodes-base.if", typeVersion: 2.3, position: P(960, -120) },

  { parameters: { respondWith: "json", responseBody: "={{ JSON.stringify({ accepte: true, dejaTraite: true, etat: $json.etat }) }}", options: { responseCode: 200 } },
    id: "a000000a-0000-4000-8000-00000000000a", name: "Deja traite", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: P(1180, -240) },

  { parameters: { resource: "row", operation: "insert", dataTableId: dt(T_IDEM),
      columns: { mappingMode: "defineBelow", value: {
        cle: "={{ $('Controles').first().json.cleIdempotence }}",
        travail_id: "={{ $('Controles').first().json.travailId }}",
        etat: "EN_COURS",
        detail: "={{ 'requestId=' + $('Controles').first().json.requestId }}",
      }, matchingColumns: [], schema: [] } },
    id: "a000000b-0000-4000-8000-00000000000b", name: "Poser le claim", type: "n8n-nodes-base.dataTable", typeVersion: 1.1, position: P(1180, 0) },

  { parameters: { respondWith: "json", responseBody: "={{ JSON.stringify({ accepte: true, requestId: $('Controles').first().json.requestId }) }}", options: { responseCode: 200 } },
    id: "a000000c-0000-4000-8000-00000000000c", name: "Accuse de reception", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: P(1380, 0) },

  { parameters: { resource: "row", operation: "get", dataTableId: dt(T_IMAP), matchType: "allConditions",
      filters: { conditions: [{ keyName: "mailbox", condition: "eq", keyValue: "={{ $('Controles').first().json.boiteSource }}" }] }, returnAll: false, limit: 1 },
    id: "a000000d-0000-4000-8000-00000000000d", name: "Acces boite source", type: "n8n-nodes-base.dataTable", typeVersion: 1.1, position: P(1580, 0) },

  { parameters: { jsCode: CODE_TRANSFERER }, id: "a000000e-0000-4000-8000-00000000000e", name: "Recuperer et transferer",
    type: "n8n-nodes-base.code", typeVersion: 2, position: P(1780, 0),
    onError: "continueErrorOutput" },

  { parameters: { jsCode: CODE_CALLBACK }, id: "a000000f-0000-4000-8000-00000000000f", name: "Corps du callback", type: "n8n-nodes-base.code", typeVersion: 2, position: P(2000, 0) },

  { parameters: { action: "hmac", type: "SHA256", value: "={{ $json.aSigner }}", dataPropertyName: "signature",
      secret: SECRET, encoding: "hex" },
    id: "a0000010-0000-4000-8000-000000000010", name: "Signer le callback", type: "n8n-nodes-base.crypto", typeVersion: 1, position: P(2200, 0) },

  { parameters: { method: "POST", url: "={{ $('Config').first().json.callback_url }}", sendHeaders: true,
      headerParameters: { parameters: [
        { name: "X-MailFlow-Signature", value: "={{ $json.signature }}" },
        { name: "X-MailFlow-Timestamp", value: "={{ $json.timestamp }}" },
        { name: "Content-Type", value: "application/json" },
      ] },
      sendBody: true, contentType: "raw", rawContentType: "application/json", body: "={{ $json.rawBody }}",
      options: { timeout: 30000, response: { response: { fullResponse: true } } } },
    id: "a0000011-0000-4000-8000-000000000011", name: "Callback MailFlow", type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: P(2400, 0),
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: "continueRegularOutput" },

  { parameters: { resource: "row", operation: "update", dataTableId: dt(T_IDEM), matchType: "allConditions",
      filters: { conditions: [{ keyName: "cle", condition: "eq", keyValue: "={{ $('Controles').first().json.cleIdempotence }}" }] },
      columns: { mappingMode: "defineBelow", value: {
        etat: "={{ $('Corps du callback').first().json.statut === 'success' ? 'TERMINE' : 'ECHEC' }}",
        detail: "={{ ('callback ' + ($json.statusCode || '?') + ' · ' + ($('Corps du callback').first().json.erreur || 'ok')).slice(0, 300) }}",
      }, matchingColumns: [], schema: [] } },
    id: "a0000012-0000-4000-8000-000000000012", name: "Clore le claim", type: "n8n-nodes-base.dataTable", typeVersion: 1.1, position: P(2600, 0), onError: "continueRegularOutput" },

  { parameters: { content: "## MailFlow — Transfert d'e-mail (A → B)\n\n**n8n exécute, il ne décide pas.** MailFlow crée le TravailPlanifie TRANSFERT et appelle `POST /webhook/" + CHEMIN + "`. Ce workflow récupère, transfère, puis rend compte par callback. Il ne crée aucun Echange et ne touche pas la base MailFlow.\n\n### Contraintes de cette instance (constatées le 10/09/2026)\n- `crypto` est **interdit** en Code node → HMAC par le **node Crypto natif**.\n- `$env` et `process` sont **inaccessibles** → secrets en Data Table `mailflow_config`, comme `imap_config`.\n- `emailSend` **jette les en-têtes personnalisés** (vérifié) → envoi par `nodemailer` en Code.\n- Data Tables **sans contrainte d'unicité** → le claim d'idempotence n'est **pas** atomique. Il arrête une redélivrance séquentielle du webhook, pas deux réceptions rigoureusement simultanées. La vraie garantie reste l'index UNIQUE `cle_idempotence` de MailFlow.\n\n### Limite assumée\nSi n8n tombe entre l'acceptation SMTP et le callback, le mail est parti mais MailFlow passera ANNULE après 30 min. **Pas de exactly-once.** Ne jamais relancer un transfert après timeout sans vérifier la boîte des envoyés.", height: 620, width: 520 },
    id: "a0000013-0000-4000-8000-000000000013", name: "Mode d'emploi", type: "n8n-nodes-base.stickyNote", typeVersion: 1, position: P(-460, -560) },
];

const connections: any = {
  Reception: { main: [[{ node: "Corps brut", type: "main", index: 0 }]] },
  "Corps brut": { main: [[{ node: "Config", type: "main", index: 0 }]] },
  Config: { main: [[{ node: "Signature attendue", type: "main", index: 0 }]] },
  "Signature attendue": { main: [[{ node: "Controles", type: "main", index: 0 }]] },
  Controles: { main: [[{ node: "Recevable ?", type: "main", index: 0 }]] },
  "Recevable ?": { main: [[{ node: "Claim existant ?", type: "main", index: 0 }], [{ node: "Refus", type: "main", index: 0 }]] },
  "Claim existant ?": { main: [[{ node: "Deja traite ?", type: "main", index: 0 }]] },
  "Deja traite ?": { main: [[{ node: "Deja traite", type: "main", index: 0 }], [{ node: "Poser le claim", type: "main", index: 0 }]] },
  "Poser le claim": { main: [[{ node: "Accuse de reception", type: "main", index: 0 }]] },
  "Accuse de reception": { main: [[{ node: "Acces boite source", type: "main", index: 0 }]] },
  "Acces boite source": { main: [[{ node: "Recuperer et transferer", type: "main", index: 0 }]] },
  // Les deux sorties — succès et erreur — rejoignent le même callback.
  "Recuperer et transferer": { main: [[{ node: "Corps du callback", type: "main", index: 0 }], [{ node: "Corps du callback", type: "main", index: 0 }]] },
  "Corps du callback": { main: [[{ node: "Signer le callback", type: "main", index: 0 }]] },
  "Signer le callback": { main: [[{ node: "Callback MailFlow", type: "main", index: 0 }]] },
  "Callback MailFlow": { main: [[{ node: "Clore le claim", type: "main", index: 0 }]] },
};

// ── 4. Création ou mise à jour, sans jamais toucher un autre workflow ──────

console.log("\n── Workflow ──");
const tous: any[] = [];
let curseur: string | undefined;
do {
  const u = new URL(BASE + "/api/v1/workflows");
  u.searchParams.set("limit", "50");
  if (curseur) u.searchParams.set("cursor", curseur);
  const j: any = await fetch(u, { headers: H }).then((r) => r.json());
  tous.push(...(j.data ?? []));
  curseur = j.nextCursor ?? undefined;
} while (curseur);

const collision = tous.filter((w) => (w.nodes ?? []).some((n: any) => n.parameters?.path === CHEMIN) && w.name !== NOM);
if (collision.length) {
  console.error(`Le chemin « ${CHEMIN} » est déjà pris par : ${collision.map((w) => w.name).join(", ")}. Déploiement interrompu.`);
  process.exit(1);
}

const existant = tous.find((w) => w.name === NOM);
const corps = { name: NOM, nodes, connections, settings: { executionOrder: "v1", timezone: "Africa/Bamako", saveManualExecutions: true } };

let id: string;
if (existant) {
  const r = await api(`/api/v1/workflows/${existant.id}`, { method: "PUT", body: JSON.stringify(corps) });
  if (!r.ok) throw new Error(`mise à jour refusée : ${r.statut} ${r.t.slice(0, 400)}`);
  id = existant.id;
  console.log(`  « ${NOM} » mis à jour (${id})`);
} else {
  const r = await api("/api/v1/workflows", { method: "POST", body: JSON.stringify(corps) });
  if (!r.j?.id) throw new Error(`création refusée : ${r.statut} ${r.t.slice(0, 400)}`);
  id = r.j.id;
  console.log(`  « ${NOM} » créé (${id})`);
}

const act = await api(`/api/v1/workflows/${id}/activate`, { method: "POST" });
console.log(`  activation : ${act.statut} ${act.ok ? "actif" : act.t.slice(0, 200)}`);
console.log(`\n  webhook   : ${BASE}/webhook/${CHEMIN}`);
console.log(`  callback  : ${CALLBACK}`);
console.log(`  workflows sur l'instance : ${tous.length + (existant ? 0 : 1)} (aucun autre modifié)`);
