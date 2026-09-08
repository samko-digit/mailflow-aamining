/**
 * MailFlow · Vérification de la boîte IMAP
 *
 *   npm run imap:test
 *
 * Sept contrôles, du plus simple au plus décisif. Le script ne modifie
 * jamais la boîte : il se connecte, il lit, il compte, il repart. Aucun
 * message n'est marqué comme lu, aucun n'est déplacé ni supprimé.
 *
 * Le contrôle 6 est celui qui décide de la faisabilité du projet : sans
 * en-têtes de fil, la détection des réponses ne repose plus que sur un
 * rapprochement par correspondant, qui ne clôt jamais un dossier tout seul.
 */

import "dotenv/config";
import { ImapFlow } from "imapflow";

const V = "\x1b[32m";
const R = "\x1b[31m";
const J = "\x1b[33m";
const G = "\x1b[90m";
const F = "\x1b[0m";

const ok = (m: string) => console.log(`${V}  OK${F}    ${m}`);
const ko = (m: string) => console.log(`${R}  ÉCHEC${F} ${m}`);
const att = (m: string) => console.log(`${J}  ⚠${F}     ${m}`);
const info = (m: string) => console.log(`${G}        ${m}${F}`);
const titre = (m: string) => console.log(`\n${m}`);

function env(cle: string, defaut?: string): string {
  return process.env[cle] ?? defaut ?? "";
}

/** Selon le serveur, la date d'enveloppe arrive en Date ou en chaîne. */
function horodatage(valeur: Date | string | undefined): string {
  if (!valeur) return "?";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(d.getTime())
    ? String(valeur)
    : d.toISOString().slice(0, 16).replace("T", " ");
}

/**
 * Décode un bloc d'en-têtes en table « nom vers valeur ».
 *
 * Écrit à la main plutôt qu'avec une expression régulière construite dans un
 * littéral gabarit. Cette construction avale silencieusement les antislashs :
 * `\s` y devient `s`, et la regex cherche alors un « s » littéral. Elle m'a
 * donné un faux négatif sur ce script même, en affirmant qu'aucune réponse ne
 * portait d'en-tête de fil alors qu'elles en portaient toutes.
 *
 * Gère le repliement RFC 5322 : une valeur continue sur la ligne suivante si
 * celle-ci commence par un espace ou une tabulation, ce qui est le cas
 * habituel de References et de In-Reply-To.
 */
function entetes(brut: string): Map<string, string> {
  const table = new Map<string, string>();
  const deplie = brut.replace(/\r?\n[ \t]+/g, " ");
  for (const ligne of deplie.split(/\r?\n/)) {
    const i = ligne.indexOf(":");
    if (i <= 0) continue;
    const nom = ligne.slice(0, i).trim().toLowerCase();
    const valeur = ligne.slice(i + 1).trim();
    table.set(nom, table.has(nom) ? `${table.get(nom)} ${valeur}` : valeur);
  }
  return table;
}

async function main() {
  console.log("MailFlow · vérification de la boîte IMAP\n");

  // ── 1. Les réglages ─────────────────────────────────────────────────────
  titre("1. Réglages du fichier .env");

  const reglages = {
    hote: env("MAILFLOW_IMAP_HOTE"),
    port: Number(env("MAILFLOW_IMAP_PORT", "993")),
    utilisateur: env("MAILFLOW_IMAP_UTILISATEUR"),
    motDePasse: env("MAILFLOW_IMAP_MOT_DE_PASSE"),
    boite: env("MAILFLOW_BOITE"),
    dossierEnvoyes: env("MAILFLOW_DOSSIER_ENVOYES"),
  };

  let manque = 0;
  for (const [cle, valeur] of [
    ["MAILFLOW_IMAP_HOTE", reglages.hote],
    ["MAILFLOW_IMAP_UTILISATEUR", reglages.utilisateur],
    ["MAILFLOW_IMAP_MOT_DE_PASSE", reglages.motDePasse],
    ["MAILFLOW_BOITE", reglages.boite],
  ] as const) {
    if (!valeur) {
      ko(`${cle} est absente`);
      manque++;
    } else if (cle === "MAILFLOW_IMAP_MOT_DE_PASSE") {
      if (valeur.length < 8 || /^\.+$/.test(valeur)) {
        ko(`${cle} ne fait que ${valeur.length} caractère(s) : ce n'est pas un mot de passe.`);
        info("→ C'est probablement le marqueur laissé dans l'exemple.");
        info("  Remplacer par le vrai mot de passe, guillemets compris.");
        info("  Il se redéfinit au besoin : panneau Hostinger → Emails →");
        info("  Comptes de messagerie → le compte → Changer le mot de passe.");
        manque++;
      } else {
        ok(`${cle} renseigné (${valeur.length} caractères, non affiché)`);
      }
    } else {
      ok(`${cle} = ${valeur}`);
    }
  }
  ok(`MAILFLOW_IMAP_PORT = ${reglages.port}`);

  if (manque > 0) {
    console.log(`\n${R}${manque} réglage(s) manquant(s). Compléter mailflow/.env.${F}`);
    process.exitCode = 1;
    return;
  }

  const client = new ImapFlow({
    host: reglages.hote,
    port: reglages.port,
    secure: reglages.port === 993,
    auth: { user: reglages.utilisateur, pass: reglages.motDePasse },
    logger: false,
  });

  // ── 2. La connexion ─────────────────────────────────────────────────────
  titre("2. Connexion et authentification");

  try {
    await client.connect();
    ok(`Connecté à ${reglages.hote}:${reglages.port}`);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    ko(`Connexion impossible : ${m}`);
    if (/auth/i.test(m)) {
      info("→ Identifiant ou mot de passe refusé.");
      info("  L'identifiant IMAP est presque toujours l'adresse complète.");
      info("  Si le compte a une authentification à deux facteurs, il faut");
      info("  un mot de passe d'application, pas le mot de passe habituel.");
    }
    if (/ENOTFOUND|EAI_AGAIN/i.test(m)) info("→ Nom d'hôte introuvable, vérifier MAILFLOW_IMAP_HOTE.");
    if (/ETIMEDOUT|ECONNREFUSED/i.test(m)) info("→ Port fermé ou bloqué par un pare-feu.");
    process.exitCode = 1;
    return;
  }

  try {
    // ── 3. Les dossiers ───────────────────────────────────────────────────
    titre("3. Dossiers de la boîte");

    const liste = await client.list();
    for (const d of liste) {
      const usages = (d.flags ? [...d.flags] : []).filter((f) =>
        ["\\Sent", "\\Drafts", "\\Trash", "\\Junk", "\\Archive"].includes(f)
      );
      const marque = usages.length ? ` ${G}${usages.join(" ")}${F}` : "";
      console.log(`        ${d.path}${marque}`);
    }

    // Détection du dossier des envoyés : le drapeau normalisé d'abord, le
    // nom ensuite. Ce dossier ne s'appelle pas pareil chez deux hébergeurs.
    const parDrapeau = liste.find((d) => d.flags?.has("\\Sent"));
    const parNom = liste.find((d) =>
      /^(sent|sent items|sent messages|éléments envoyés|elements envoyes|INBOX\.Sent)$/i.test(d.path)
    );
    const envoyes = reglages.dossierEnvoyes || parDrapeau?.path || parNom?.path;

    if (envoyes) {
      ok(`Dossier des envoyés détecté : « ${envoyes} »`);
      if (!reglages.dossierEnvoyes) {
        info(`Ajoutez MAILFLOW_DOSSIER_ENVOYES="${envoyes}" au .env pour figer ce choix.`);
      }
    } else {
      ko("Aucun dossier d'envoyés trouvé.");
      info("→ Sans lui, impossible de détecter les réponses parties de cette boîte.");
    }

    // ── 4. La boîte de réception ──────────────────────────────────────────
    titre("4. Boîte de réception");

    const boite = await client.mailboxOpen("INBOX", { readOnly: true });
    ok(`INBOX ouverte en lecture seule · ${boite.exists} message(s)`);
    info(`UIDVALIDITY ${boite.uidValidity} · UIDNEXT ${boite.uidNext}`);
    info("Ces deux nombres servent à ne relire que les nouveaux messages.");

    if (boite.exists === 0) {
      att("Boîte vide : envoyez-vous un message d'essai puis relancez.");
    }

    // ── 5. Lecture des en-têtes ───────────────────────────────────────────
    titre("5. Lecture des derniers messages");

    const derniers: {
      uid: number;
      sujet: string;
      de: string;
      date: string;
      messageId: string;
      inReplyTo: string;
      references: number;
      pj: boolean;
    }[] = [];

    if (boite.exists > 0) {
      const debut = Math.max(1, boite.exists - 4);
      for await (const msg of client.fetch(`${debut}:*`, {
        envelope: true,
        headers: ["message-id", "in-reply-to", "references"],
        bodyStructure: true,
        uid: true,
      })) {
        const h = entetes(msg.headers?.toString("utf8") ?? "");
        const lire = (nom: string) => h.get(nom) ?? "";

        const refs = lire("references");
        derniers.push({
          uid: msg.uid,
          sujet: msg.envelope?.subject ?? "(sans objet)",
          de: msg.envelope?.from?.[0]?.address ?? "?",
          date: horodatage(msg.envelope?.date),
          messageId: lire("message-id") || msg.envelope?.messageId || "",
          inReplyTo: lire("in-reply-to"),
          references: refs ? refs.split(/\s+/).filter(Boolean).length : 0,
          pj: JSON.stringify(msg.bodyStructure ?? {}).includes("attachment"),
        });
      }

      for (const m of derniers.reverse()) {
        console.log(
          `        [${m.uid}] ${m.date} · ${m.de}${m.pj ? " 📎" : ""}\n              ${m.sujet.slice(0, 70)}`
        );
      }
      ok(`${derniers.length} message(s) lu(s), aucun marqué comme lu.`);
    }

    // ── 6. Les identifiants sont-ils présents ? ───────────────────────────
    titre("6. Identifiants de message");

    const avecId = derniers.filter((m) => m.messageId);
    if (derniers.length === 0) {
      att("Aucun message à analyser.");
    } else if (avecId.length === derniers.length) {
      ok(`Message-ID présent sur les ${derniers.length} derniers messages.`);
    } else {
      ko(`Message-ID absent sur ${derniers.length - avecId.length} message(s).`);
      info("→ Sans identifiant, aucun rattachement fiable n'est possible.");
    }

    // ── 7. Le dossier des envoyés ─────────────────────────────────────────
    titre("7. Dossier des envoyés");

    let envoyesOk = false;
    if (envoyes) {
      const s7 = await client.mailboxOpen(envoyes, { readOnly: true });
      if (s7.exists > 0) {
        ok(`« ${envoyes} » contient ${s7.exists} message(s) : les envois sont bien sur le serveur.`);
        envoyesOk = true;
      } else {
        att(`« ${envoyes} » est vide.`);
        info("→ Si des messages ont été envoyés depuis cette boîte, c'est que le");
        info("  client de messagerie les garde en local. Sans copie serveur, je ne");
        info("  verrai jamais les réponses et les relances ne s'arrêteront pas.");
      }
    } else {
      ko("Contrôle impossible, dossier des envoyés non identifié.");
    }

    // ── 8. LE CONTRÔLE DÉCISIF : le chaînage réel ─────────────────────────
    // On ne se contente pas de vérifier que les en-têtes existent : on cherche
    // dans les messages ENVOYÉS ceux qui citent un message REÇU. C'est
    // exactement l'algorithme de détection des réponses, exécuté sur vos
    // données réelles. S'il trouve des rattachements ici, il en trouvera en
    // production.
    titre("8. Chaînage réel des réponses (le contrôle décisif)");

    if (!envoyesOk) {
      ko("Contrôle impossible sans dossier des envoyés lisible.");
    } else {
      const FENETRE_RECUS = 400;
      const FENETRE_ENVOYES = 200;

      const inbox = await client.mailboxOpen("INBOX", { readOnly: true });
      const idsRecus = new Map<string, string>();
      if (inbox.exists > 0) {
        const d = Math.max(1, inbox.exists - (FENETRE_RECUS - 1));
        for await (const m of client.fetch(`${d}:*`, { envelope: true })) {
          const id = m.envelope?.messageId?.trim();
          if (id) idsRecus.set(id, m.envelope?.subject ?? "(sans objet)");
        }
      }

      const sent = await client.mailboxOpen(envoyes!, { readOnly: true });
      let sortants = 0;
      let avecChaine = 0;
      let apparies = 0;
      const exemples: string[] = [];

      if (sent.exists > 0) {
        const d = Math.max(1, sent.exists - (FENETRE_ENVOYES - 1));
        for await (const m of client.fetch(`${d}:*`, {
          envelope: true,
          headers: ["in-reply-to", "references"],
        })) {
          sortants++;
          const h = entetes(m.headers?.toString("utf8") ?? "");
          const entete = (nom: string) => h.get(nom) ?? "";

          const cites = [
            ...(entete("in-reply-to").match(/<[^>]+>/g) ?? []),
            ...(entete("references").match(/<[^>]+>/g) ?? []),
          ].map((x) => x.trim());

          if (cites.length > 0) avecChaine++;

          const origine = cites.find((c) => idsRecus.has(c));
          if (origine) {
            apparies++;
            if (exemples.length < 3) {
              exemples.push(
                `« ${(idsRecus.get(origine) ?? "").slice(0, 44)} »` +
                  ` → réponse du ${horodatage(m.envelope?.date)}`
              );
            }
          }
        }
      }

      info(`${idsRecus.size} message(s) reçu(s) et ${sortants} envoyé(s) analysés.`);

      if (apparies > 0) {
        ok(`${apparies} réponse(s) rattachée(s) à un message reçu, par In-Reply-To ou References.`);
        for (const e of exemples) info(e);
        info("La détection des réponses fonctionnera sur cette boîte.");
      } else if (avecChaine > 0) {
        att(
          `${avecChaine} envoi(s) portent un en-tête de fil, mais aucun ne cite un message de la fenêtre analysée.`
        );
        info("→ Ce n'est pas forcément un problème : les fenêtres peuvent ne pas");
        info("  se recouvrir. Faites l'aller-retour manuel pour trancher :");
        info("  un message depuis une autre adresse, une réponse depuis celle-ci,");
        info("  puis relancez ce script.");
      } else {
        ko("Aucun message envoyé ne porte In-Reply-To ni References.");
        info("→ Le client de messagerie utilisé ne chaîne pas les réponses.");
        info("  La détection devrait alors se rabattre sur le correspondant et la");
        info("  fenêtre de temps, ce qui ne clôt jamais un échange à soi seul.");
        process.exitCode = 1;
      }
    }
  } finally {
    await client.logout().catch(() => {});
  }

  if (process.exitCode === 1) {
    console.log(`\n${R}Des points bloquent. Voir ci-dessus.${F}`);
  } else {
    console.log(`\n${V}Boîte lisible. Le connecteur peut être branché dessus.${F}`);
  }
}

main().catch((e) => {
  console.error("\nErreur inattendue :", e);
  process.exitCode = 1;
});
