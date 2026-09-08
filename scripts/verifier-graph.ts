/**
 * MailFlow · Vérification des accès Microsoft Graph
 *
 *   npm run graph:test
 *
 * À lancer dès que les cinq valeurs sont dans le fichier .env. Le script ne
 * modifie rien : il lit, il vérifie, il dit ce qui va et ce qui ne va pas.
 *
 * Il répond à quatre questions, dans l'ordre :
 *   1. Les cinq valeurs sont-elles renseignées ?
 *   2. Le couple identifiant plus secret est-il accepté par Microsoft ?
 *   3. Les permissions accordées sont-elles les bonnes ?
 *   4. La boîte suivie est-elle réellement accessible ?
 */

import "dotenv/config";

const VERT = "\x1b[32m";
const ROUGE = "\x1b[31m";
const JAUNE = "\x1b[33m";
const GRIS = "\x1b[90m";
const FIN = "\x1b[0m";

const ok = (m: string) => console.log(`${VERT}  OK${FIN}   ${m}`);
const ko = (m: string) => console.log(`${ROUGE}  ÉCHEC${FIN} ${m}`);
const att = (m: string) => console.log(`${JAUNE}  ⚠${FIN}    ${m}`);
const info = (m: string) => console.log(`${GRIS}       ${m}${FIN}`);
const titre = (m: string) => console.log(`\n${m}`);

const PERMISSIONS_ATTENDUES = ["Mail.Read", "Mail.Send"];

/** Lit la charge utile d'un jeton sans vérifier sa signature : on ne fait
 *  qu'afficher ce que Microsoft a mis dedans, on ne s'en sert pas pour
 *  décider quoi que ce soit. */
function lireJeton(jeton: string): Record<string, unknown> {
  const partie = jeton.split(".")[1];
  if (!partie) return {};
  return JSON.parse(Buffer.from(partie, "base64url").toString("utf8"));
}

async function main() {
  console.log("MailFlow · vérification des accès Microsoft 365\n");

  // ── 1. Les cinq valeurs ─────────────────────────────────────────────────
  titre("1. Les cinq valeurs du fichier .env");

  const cles = [
    "AZURE_TENANT_ID",
    "AZURE_CLIENT_ID",
    "AZURE_CLIENT_SECRET",
    "MAILFLOW_BOITE",
    "MAILFLOW_BOITE_RECETTE",
  ] as const;

  let manquantes = 0;
  for (const c of cles) {
    const v = process.env[c];
    if (!v) {
      ko(`${c} est absente`);
      manquantes++;
    } else if (c === "AZURE_CLIENT_SECRET") {
      ok(`${c} renseignée (${v.length} caractères, non affichée)`);
      if (v.length < 20) {
        att("Ce secret est court. Avez-vous copié « Valeur » et non « ID de secret » ?");
      }
    } else {
      ok(`${c} = ${v}`);
    }
  }

  if (manquantes > 0) {
    console.log(
      `\n${ROUGE}${manquantes} valeur(s) manquante(s). Compléter mailflow/.env puis relancer.${FIN}`
    );
    process.exitCode = 1;
    return;
  }

  const tenant = process.env.AZURE_TENANT_ID!;
  const client = process.env.AZURE_CLIENT_ID!;
  const secret = process.env.AZURE_CLIENT_SECRET!;
  const boite = process.env.MAILFLOW_BOITE!;
  const recette = process.env.MAILFLOW_BOITE_RECETTE!;

  if (boite.toLowerCase() === recette.toLowerCase()) {
    att(
      "La boîte suivie et la boîte de recette sont identiques : les essais partiront à de vrais correspondants."
    );
  }

  // ── 2. Le jeton ─────────────────────────────────────────────────────────
  titre("2. Microsoft accepte-t-il l'identifiant et le secret ?");

  const corps = new URLSearchParams({
    client_id: client,
    client_secret: secret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const reponse = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corps,
    }
  );

  const jetonJson = (await reponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!reponse.ok || !jetonJson.access_token) {
    ko(`Microsoft refuse : ${jetonJson.error ?? reponse.status}`);
    const d = jetonJson.error_description ?? "";
    info(d.split("\n")[0] ?? "");
    if (d.includes("AADSTS7000215")) {
      info("→ Le secret est faux. Recopier la colonne « Valeur », pas « ID de secret ».");
    }
    if (d.includes("AADSTS700016")) {
      info("→ L'identifiant d'application est introuvable dans ce tenant.");
    }
    if (d.includes("AADSTS90002")) {
      info("→ L'identifiant de tenant est faux.");
    }
    process.exitCode = 1;
    return;
  }

  ok("Jeton obtenu : l'identifiant et le secret sont bons.");

  // ── 3. Les permissions réellement accordées ─────────────────────────────
  titre("3. Les permissions accordées");

  const charge = lireJeton(jetonJson.access_token);
  const roles = Array.isArray(charge.roles) ? (charge.roles as string[]) : [];

  if (roles.length === 0) {
    ko("Aucune permission d'application dans le jeton.");
    info("→ Autorisations d'API : avez-vous choisi « Autorisations d'application »");
    info("  et non « Autorisations déléguées » ?");
    info("→ Avez-vous cliqué sur « Accorder le consentement d'administrateur » ?");
    process.exitCode = 1;
    return;
  }

  for (const p of PERMISSIONS_ATTENDUES) {
    if (roles.includes(p)) ok(`${p} accordée`);
    else ko(`${p} MANQUANTE`);
  }

  const enTrop = roles.filter((r) => !PERMISSIONS_ATTENDUES.includes(r));
  if (enTrop.length > 0) {
    att(`Permissions supplémentaires accordées : ${enTrop.join(", ")}`);
    info("Le moindre privilège veut qu'on retire ce qui ne sert pas.");
  }

  // ── 4. L'accès réel aux boîtes ──────────────────────────────────────────
  titre("4. Accès réel aux boîtes");

  const entete = { Authorization: `Bearer ${jetonJson.access_token}` };

  for (const [libelle, adresse] of [
    ["boîte suivie", boite],
    ["boîte de recette", recette],
  ] as const) {
    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(adresse)}` +
      `/mailFolders/inbox?$select=displayName,totalItemCount,unreadItemCount`;

    const r = await fetch(url, { headers: entete });

    if (r.ok) {
      const d = (await r.json()) as {
        totalItemCount?: number;
        unreadItemCount?: number;
      };
      ok(
        `${libelle} · ${adresse} · ${d.totalItemCount ?? "?"} messages, ${d.unreadItemCount ?? "?"} non lus`
      );
      continue;
    }

    const err = (await r.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    ko(`${libelle} · ${adresse} · HTTP ${r.status} ${err.error?.code ?? ""}`);
    info(err.error?.message?.split("\n")[0] ?? "");

    if (r.status === 403) {
      info("→ La stratégie d'accès applicatif exclut peut-être cette boîte.");
      info(`   Vérifier : Test-ApplicationAccessPolicy -Identity ${adresse} -AppId ${client}`);
      info("   Compter jusqu'à une heure de propagation après création de la stratégie.");
    }
    if (r.status === 404) {
      info("→ Adresse inconnue dans ce tenant, ou faute de frappe.");
    }
    process.exitCode = 1;
  }

  // ── Conclusion ──────────────────────────────────────────────────────────
  if (process.exitCode === 1) {
    console.log(`\n${ROUGE}Des points bloquent encore. Voir ci-dessus.${FIN}`);
  } else {
    console.log(`\n${VERT}Tout est bon. Les accès sont prêts, le connecteur peut être branché.${FIN}`);
    console.log(
      `${GRIS}Reste à vérifier à la main qu'une boîte HORS périmètre est bien refusée :${FIN}`
    );
    console.log(
      `${GRIS}  Test-ApplicationAccessPolicy -Identity <une autre boite> -AppId ${client}${FIN}`
    );
  }
}

main().catch((e) => {
  console.error("\nErreur inattendue :", e);
  process.exitCode = 1;
});
