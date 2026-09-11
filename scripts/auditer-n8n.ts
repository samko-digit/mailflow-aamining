/**
 * MailFlow · Audit d'une instance n8n
 *
 *   N8N_BASE_URL=https://xxx.app.n8n.cloud N8N_API_KEY=... npm run n8n:audit
 *   ou : node --import tsx scripts/auditer-n8n.ts https://xxx.app.n8n.cloud <cle>
 *
 * Ce script ne SUPPOSE rien : il interroge l'instance et rapporte ce qu'elle
 * répond réellement. Il est en lecture seule — aucune création, aucune
 * modification, aucun workflow touché.
 *
 * La clé d'API n'est jamais affichée ni journalisée.
 */

import "dotenv/config";

const BASE = (process.argv[2] ?? process.env.N8N_BASE_URL ?? "").replace(/\/+$/, "");
const CLE = process.argv[3] ?? process.env.N8N_API_KEY ?? "";

if (!BASE) {
  console.error("Usage : node --import tsx scripts/auditer-n8n.ts <url> [cle]");
  console.error("        ou renseigner N8N_BASE_URL et N8N_API_KEY.");
  process.exit(1);
}

const TIMEOUT_MS = 20_000;

type Reponse = { statut: number; texte: string; ok: boolean; erreur?: string };

async function appeler(chemin: string, authentifie = true, maxOctets = 4_000_000): Promise<Reponse> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(BASE + chemin, {
      headers: authentifie && CLE ? { "X-N8N-API-KEY": CLE, Accept: "application/json" } : { Accept: "application/json" },
      signal: ctrl.signal,
    });
    // On borne la lecture : nodes.json peut peser plusieurs mégaoctets.
    const buf = await r.arrayBuffer();
    const texte = Buffer.from(buf.slice(0, maxOctets)).toString("utf8");
    return { statut: r.status, texte, ok: r.ok };
  } catch (e) {
    return { statut: 0, texte: "", ok: false, erreur: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(minuteur);
  }
}

function json(r: Reponse): any {
  try {
    return JSON.parse(r.texte);
  } catch {
    return null;
  }
}

function titre(s: string) {
  console.log(`\n${"─".repeat(74)}\n${s}\n${"─".repeat(74)}`);
}

// ── 1. Joignabilité et version ─────────────────────────────────────────────

titre("1 · JOIGNABILITÉ ET VERSION");
console.log(`cible : ${BASE}`);
console.log(`clé d'API : ${CLE ? `fournie (${CLE.length} caractères)` : "ABSENTE — l'audit sera très partiel"}`);

const sante = await appeler("/healthz", false);
console.log(`\n/healthz → ${sante.statut || "injoignable"} ${sante.erreur ? `· ${sante.erreur}` : ""}`);

let version = "inconnue";
let hebergement = "indéterminé";
const reglages = await appeler("/rest/settings", false);
if (reglages.ok) {
  const d = json(reglages)?.data ?? json(reglages);
  version = d?.versionCli ?? "inconnue";
  const canal = d?.releaseChannel ?? "?";
  console.log(`/rest/settings → 200`);
  console.log(`  versionCli        : ${version}`);
  console.log(`  releaseChannel    : ${canal}`);
  console.log(`  endpointWebhook   : ${d?.endpointWebhook ?? "?"}  (préfixe des webhooks de production)`);
  console.log(`  endpointWebhookTest : ${d?.endpointWebhookTest ?? "?"}`);
  console.log(`  isDocker          : ${d?.isDocker ?? "?"}`);
  console.log(`  deployment.type   : ${d?.deployment?.type ?? "?"}   ← 'cloud' = n8n Cloud, sinon self-hosted`);
  hebergement = d?.deployment?.type ?? "indéterminé";
  console.log(`  concurrency       : ${JSON.stringify(d?.concurrency ?? "?")}`);
  const ent = d?.enterprise ?? {};
  const actives = Object.entries(ent).filter(([, v]) => v === true).map(([k]) => k);
  console.log(`  licences actives  : ${actives.length ? actives.join(", ") : "aucune"}`);
  if (d?.envVariables ?? d?.variables) console.log(`  variables n8n     : disponibles`);
} else {
  console.log(`/rest/settings → ${reglages.statut || "injoignable"} (souvent protégé ; on retombera sur l'API publique)`);
}

// Depuis n8n 2.x, /rest/settings ne rend plus la version avant authentification.
// Le rapport d'audit de l'API publique, lui, la contient.
if (version === "inconnue" && CLE) {
  try {
    const r = await fetch(BASE + "/api/v1/audit", {
      method: "POST",
      headers: { "X-N8N-API-KEY": CLE, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ additionalOptions: { categories: ["instance"] } }),
    });
    const t = await r.text();
    const m = t.match(/"n8n_version"\s*:\s*"([^"]+)"/) ?? t.match(/\b(\d+\.\d+\.\d+)\b/);
    if (m) {
      version = m[1];
      console.log(`/api/v1/audit → version relevée : ${version}`);
    }
  } catch {
    /* sans importance : la version reste « inconnue » */
  }
}

// ── 2. Authentification API publique ───────────────────────────────────────

titre("2 · API PUBLIQUE ET AUTHENTIFICATION");
const wf = await appeler("/api/v1/workflows?limit=1");
if (wf.statut === 401) {
  console.log("401 — la clé d'API est refusée. Vérifier Settings → n8n API → clé valide et non expirée.");
} else if (wf.statut === 404) {
  console.log("404 — l'API publique n'est pas activée sur cette instance (N8N_PUBLIC_API_DISABLED, ou plan Cloud sans API).");
} else if (!wf.ok) {
  console.log(`${wf.statut || "injoignable"} ${wf.erreur ?? ""}`);
} else {
  console.log(`200 — API publique accessible. Création de workflow par API : POSSIBLE.`);
}

// ── 3. Inventaire réel : workflows, nodes, credentials ─────────────────────

// On pagine par lots de 50. Une requête unique sur 250 workflows dépasse la
// borne de lecture, et le JSON tronqué échoue silencieusement au parsing :
// l'audit annonçait alors « 0 workflow » sur une instance qui en compte 245.
const donnees: any[] = [];
if (wf.ok) {
  let curseur: string | undefined;
  do {
    const u = new URL(BASE + "/api/v1/workflows");
    u.searchParams.set("limit", "50");
    if (curseur) u.searchParams.set("cursor", curseur);
    let j: any = null;
    try {
      j = await fetch(u, { headers: { "X-N8N-API-KEY": CLE, Accept: "application/json" } }).then((r) => r.json());
    } catch (e) {
      console.log(`  ⚠ page illisible — inventaire partiel après ${donnees.length} workflows (${e instanceof Error ? e.message : e}).`);
      break;
    }
    if (!j) break;
    donnees.push(...(j.data ?? []));
    curseur = j.nextCursor ?? undefined;
  } while (curseur);
}
const typesNodes = new Map<string, number>();
const credentials = new Map<string, { type: string; noms: Set<string> }>();
const cheminsWebhook: { workflow: string; chemin: string; actif: boolean }[] = [];

if (Array.isArray(donnees) && donnees.length) {
  titre("3 · INVENTAIRE DE L'INSTANCE");
  console.log(`workflows existants : ${donnees.length} (AUCUN ne sera modifié)`);
  for (const w of donnees) {
    const actif = w.active ? "actif " : "arrêté";
    console.log(`  · [${actif}] ${w.id}  ${String(w.name).slice(0, 52)}  (${w.nodes?.length ?? 0} nodes)`);
    for (const n of w.nodes ?? []) {
      typesNodes.set(n.type, (typesNodes.get(n.type) ?? 0) + 1);
      for (const [type, c] of Object.entries<any>(n.credentials ?? {})) {
        const cle = `${type}:${c.id}`;
        if (!credentials.has(cle)) credentials.set(cle, { type, noms: new Set() });
        credentials.get(cle)!.noms.add(c.name ?? "(sans nom)");
      }
      if (n.type?.endsWith("webhook") && n.parameters?.path) {
        cheminsWebhook.push({ workflow: w.name, chemin: String(n.parameters.path), actif: !!w.active });
      }
    }
  }

  titre("4 · TYPES DE NODES RÉELLEMENT PRÉSENTS (vus dans les workflows)");
  for (const [t, n] of [...typesNodes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}× ${t}`);
  }

  titre("5 · CREDENTIALS RÉFÉRENCÉES (id + type ; aucune valeur secrète n'est lisible par l'API)");
  if (credentials.size === 0) {
    console.log("  aucune credential référencée dans les workflows existants.");
  } else {
    for (const [cle, v] of credentials) {
      console.log(`  ${v.type.padEnd(28)} id=${cle.split(":")[1]}  « ${[...v.noms].join(" / ")} »`);
    }
  }

  if (cheminsWebhook.length) {
    titre("6 · CHEMINS DE WEBHOOK DÉJÀ UTILISÉS (à ne pas percuter)");
    for (const c of cheminsWebhook) console.log(`  ${c.actif ? "actif " : "arrêté"} · ${c.chemin}   (${c.workflow})`);
  }
}

// ── 7. Disponibilité des types de credentials nécessaires ──────────────────

titre("7 · TYPES DE CREDENTIALS INSTALLÉS (schema = le node existe sur l'instance)");
const typesVoulus = ["imap", "smtp", "postgres", "redis", "httpHeaderAuth", "httpBasicAuth"];
for (const t of typesVoulus) {
  const r = await appeler(`/api/v1/credentials/schema/${t}`);
  const verdict =
    r.statut === 200 ? "PRÉSENT" : r.statut === 404 ? "ABSENT (node non installé)" : `indéterminé (${r.statut || r.erreur})`;
  console.log(`  ${t.padEnd(18)} ${verdict}`);
}

// ── 8. Catalogue complet des nodes ─────────────────────────────────────────

titre("8 · CATALOGUE DES NODES (recherche des capacités du cahier des charges)");
const catalogue = await appeler("/types/nodes.json", false, 12_000_000);
if (catalogue.ok && catalogue.texte.length > 1000) {
  const noms = [...new Set([...catalogue.texte.matchAll(/"name"\s*:\s*"(n8n-nodes-[^"]+)"/g)].map((m) => m[1]))];
  console.log(`  ${noms.length} types de nodes exposés par l'éditeur.`);
  const recherches: Record<string, RegExp> = {
    "IMAP / lecture de mail": /imap|emailReadImap/i,
    "SMTP / envoi de mail": /emailSend|sendEmail|smtp/i,
    "Code (JS)": /\.code$/i,
    "Wait (attente)": /\.wait$/i,
    "Crypto (HMAC)": /\.crypto$/i,
    "PostgreSQL": /\.postgres$/i,
    "Redis": /\.redis$/i,
    "HTTP Request": /\.httpRequest$/i,
    "Webhook": /\.webhook$/i,
    "Respond to Webhook": /respondToWebhook/i,
    "Execute Workflow": /executeWorkflow/i,
    "Error Trigger": /errorTrigger/i,
  };
  for (const [libelle, motif] of Object.entries(recherches)) {
    const trouves = noms.filter((n) => motif.test(n));
    console.log(`  ${libelle.padEnd(24)} ${trouves.length ? "OUI · " + trouves.slice(0, 4).join(", ") : "NON TROUVÉ"}`);
  }
} else {
  console.log(`  /types/nodes.json → ${catalogue.statut || catalogue.erreur} · catalogue non lisible sans session éditeur.`);
  console.log("  Repli : les types vus en section 4 sont, eux, certains d'exister.");
}

// ── 9. Fonctions annexes ───────────────────────────────────────────────────

titre("9 · FONCTIONS ANNEXES");
for (const [libelle, chemin] of [
  ["data tables (stockage persistant)", "/api/v1/data-tables"],
  ["variables n8n (stockage clé/valeur)", "/api/v1/variables"],
  ["projets", "/api/v1/projects"],
  ["tags", "/api/v1/tags"],
  ["exécutions (journal)", "/api/v1/executions?limit=1"],
] as const) {
  const r = await appeler(chemin);
  console.log(`  ${libelle.padEnd(38)} ${r.statut === 200 ? "DISPONIBLE" : r.statut === 403 ? "LICENCE REQUISE" : `${r.statut || r.erreur}`}`);
}

titre("SYNTHÈSE");
console.log(`  version n8n     : ${version}`);
console.log(`  hébergement     : ${hebergement}`);
console.log(`  API publique    : ${wf.ok ? "utilisable (création de workflow possible)" : "indisponible"}`);
console.log(`  workflows en place : ${Array.isArray(donnees) ? donnees.length : "?"} — intacts`);
console.log("");
