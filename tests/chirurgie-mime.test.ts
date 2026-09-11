/**
 * MailFlow · Tests de la chirurgie MIME du transfert
 *
 * Ces tests exercent scripts/lib/chirurgie-mime.js — LE code réellement
 * inliné dans le Code node n8n, pas une réécriture. Si ces tests passent et
 * que le transfert casse en production, c'est que le déploiement a divergé,
 * ce que vérifie le dernier test.
 *
 * Ce qui compte ici : le corps du message ne doit JAMAIS être modifié, et
 * References doit commencer par la racine du fil, sinon la réponse de B
 * ouvrirait un nouvel Echange au lieu de rejoindre le sien.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformerMime } from "../scripts/lib/chirurgie-mime.js";

const CTL = {
  source: "dec@samko.group",
  destination: "b@exemple.com",
  exchangeId: "echange-123",
};

/** Reconstitue le bloc d'en-têtes en dépliant les continuations. */
function entetesDe(mime: Buffer): Map<string, string[]> {
  const texte = mime.toString("binary");
  const bloc = texte.slice(0, texte.search(/\r?\n\r?\n/));
  const m = new Map<string, string[]>();
  let courant = "";
  for (const ligne of bloc.split(/\r?\n/)) {
    if (/^[ \t]/.test(ligne)) courant += " " + ligne.trim();
    else {
      if (courant) {
        const n = courant.slice(0, courant.indexOf(":")).trim().toLowerCase();
        m.set(n, [...(m.get(n) ?? []), courant.slice(courant.indexOf(":") + 1).trim()]);
      }
      courant = ligne;
    }
  }
  if (courant) {
    const n = courant.slice(0, courant.indexOf(":")).trim().toLowerCase();
    m.set(n, [...(m.get(n) ?? []), courant.slice(courant.indexOf(":") + 1).trim()]);
  }
  return m;
}

function corpsDe(mime: Buffer): Buffer {
  const texte = mime.toString("binary");
  const c = texte.search(/\r?\n\r?\n/);
  const fin = texte.slice(c).startsWith("\r\n\r\n") ? c + 4 : c + 2;
  return mime.subarray(Buffer.byteLength(texte.slice(0, fin), "binary"));
}

// ── Les jeux d'essai ───────────────────────────────────────────────────────

const RACINE = "<racine-du-fil@client.example>";
const PRECEDENT = "<deuxieme-message@client.example>";

function messageSimple() {
  return Buffer.from(
    [
      "Return-Path: <client@client.example>",
      "Received: from mx.client.example (mx.client.example [1.2.3.4])",
      "\tby mail.samko.group with ESMTPS id abc123",
      "DKIM-Signature: v=1; a=rsa-sha256; d=client.example; s=sel; bh=xxx; b=yyy",
      "Authentication-Results: mail.samko.group; dkim=pass",
      "From: Client <client@client.example>",
      "To: dec@samko.group",
      "Cc: autre@client.example",
      "Subject: =?UTF-8?Q?Demande_de_devis_urgente?=",
      "Date: Mon, 08 Sep 2026 10:00:00 +0000",
      `Message-ID: ${PRECEDENT}`,
      `In-Reply-To: ${RACINE}`,
      `References: ${RACINE}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      "Bonjour, où en est le dossier ? Cordialement — é à ü ñ",
    ].join("\r\n"),
    "utf8"
  );
}

/** multipart/mixed : PDF + second fichier au nom Unicode. */
function messageAvecPiecesJointes() {
  const b = "----=_Part_42_1234567890";
  return Buffer.from(
    [
      "From: Client <client@client.example>",
      "To: dec@samko.group",
      "Subject: Facture",
      `Message-ID: ${PRECEDENT}`,
      `References: ${RACINE}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${b}"`,
      "",
      `--${b}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Ci-joint la facture.",
      `--${b}`,
      "Content-Type: application/pdf; name=facture.pdf",
      "Content-Disposition: attachment; filename=facture.pdf",
      "Content-Transfer-Encoding: base64",
      "",
      "JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PC9MZW5ndGggNiAwIFI+PgpzdHJlYW0K",
      `--${b}`,
      "Content-Type: application/pdf; name*=UTF-8''Rapport%20d%C3%A9finitif%20%E2%80%94%20ann%C3%A9e.pdf",
      "Content-Disposition: attachment; filename*=UTF-8''Rapport%20d%C3%A9finitif%20%E2%80%94%20ann%C3%A9e.pdf",
      "Content-Transfer-Encoding: base64",
      "",
      "JVBERi0xLjQKJUhlbGxvIFVuaWNvZGUK",
      `--${b}--`,
      "",
    ].join("\r\n"),
    "utf8"
  );
}

/** multipart/related : image inline référencée par Content-ID. */
function messageAvecImageInline() {
  const ext = "----=_Rel_1";
  const alt = "----=_Alt_1";
  return Buffer.from(
    [
      "From: Client <client@client.example>",
      "To: dec@samko.group",
      "Subject: Signature avec logo",
      `Message-ID: ${PRECEDENT}`,
      `References: ${RACINE} ${PRECEDENT}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/related; type="multipart/alternative"; boundary="${ext}"`,
      "",
      `--${ext}`,
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      "",
      `--${alt}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Version texte.",
      `--${alt}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      '<p>Bonjour <img src="cid:logo123@client.example"></p>',
      `--${alt}--`,
      `--${ext}`,
      "Content-Type: image/png",
      "Content-ID: <logo123@client.example>",
      "Content-Disposition: inline; filename=logo.png",
      "Content-Transfer-Encoding: base64",
      "",
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      `--${ext}--`,
      "",
    ].join("\r\n"),
    "utf8"
  );
}

// ── Ce qui ne doit jamais bouger ───────────────────────────────────────────

describe("Chirurgie MIME · le corps est intouchable", () => {
  for (const [nom, faire] of [
    ["texte simple", messageSimple],
    ["multipart/mixed avec PDF et nom Unicode", messageAvecPiecesJointes],
    ["multipart/related avec image en CID", messageAvecImageInline],
  ] as const) {
    it(`${nom} : le corps ressort octet pour octet`, () => {
      const origine = faire();
      const { mime } = transformerMime(origine, CTL);
      assert.deepEqual(corpsDe(mime), corpsDe(origine), "le corps a été modifié");
    });
  }

  it("la frontière multipart et le Content-Type survivent", () => {
    const { mime } = transformerMime(messageAvecPiecesJointes(), CTL);
    const e = entetesDe(mime);
    assert.match(e.get("content-type")![0], /multipart\/mixed; boundary="----=_Part_42_1234567890"/);
    assert.equal(e.get("mime-version")![0], "1.0");
  });

  it("le nom de fichier Unicode encodé RFC 2231 reste intact", () => {
    const { mime } = transformerMime(messageAvecPiecesJointes(), CTL);
    assert.ok(mime.toString("utf8").includes("filename*=UTF-8''Rapport%20d%C3%A9finitif%20%E2%80%94%20ann%C3%A9e.pdf"));
  });

  it("le Content-ID de l'image inline reste référençable", () => {
    const { mime } = transformerMime(messageAvecImageInline(), CTL);
    const t = mime.toString("utf8");
    assert.ok(t.includes("Content-ID: <logo123@client.example>"));
    assert.ok(t.includes('src="cid:logo123@client.example"'), "le HTML pointe toujours sur le CID");
  });
});

// ── Le fil de conversation ────────────────────────────────────────────────

describe("Chirurgie MIME · le fil est préservé", () => {
  it("References commence par la racine du fil", () => {
    const { mime, meta } = transformerMime(messageSimple(), CTL);
    assert.equal(meta.references[0], RACINE);
    assert.equal(entetesDe(mime).get("references")![0].split(/\s+/)[0], RACINE);
  });

  it("le message d'origine est ajouté en queue de References", () => {
    const { meta } = transformerMime(messageSimple(), CTL);
    assert.equal(meta.references[meta.references.length - 1], PRECEDENT);
  });

  it("In-Reply-To désigne le message transféré", () => {
    const { mime } = transformerMime(messageSimple(), CTL);
    assert.equal(entetesDe(mime).get("in-reply-to")![0], PRECEDENT);
  });

  it("un message racine sans References en produit une cohérente", () => {
    const sansRefs = Buffer.from(
      ["From: c@client.example", "To: dec@samko.group", "Subject: Premier", "Message-ID: <tout-premier@client.example>", "", "Bonjour."].join("\r\n"),
      "utf8"
    );
    const { meta } = transformerMime(sansRefs, CTL);
    assert.deepEqual(meta.references, ["<tout-premier@client.example>"]);
  });

  it("le nouveau Message-ID diffère de celui d'origine", () => {
    const { mime, meta } = transformerMime(messageSimple(), CTL);
    assert.notEqual(meta.nouvelId, PRECEDENT);
    assert.match(meta.nouvelId, /^<mailflow-transfer-[a-z0-9-]+@samko\.group>$/);
    assert.equal(entetesDe(mime).get("message-id")!.length, 1, "un seul Message-ID");
  });

  it("un References replié sur plusieurs lignes n'est pas décapité", () => {
    const longues = Buffer.from(
      [
        "From: c@client.example",
        "To: dec@samko.group",
        "Subject: Fil long",
        "Message-ID: <dernier@client.example>",
        `References: ${RACINE}`,
        " <deux@client.example>",
        "\t<trois@client.example>",
        "",
        "corps",
      ].join("\r\n"),
      "utf8"
    );
    const { meta } = transformerMime(longues, CTL);
    assert.equal(meta.references[0], RACINE);
    assert.equal(meta.references.length, 4, "les continuations ont été perdues");
    assert.ok(meta.references.includes("<trois@client.example>"));
  });
});

// ── Les en-têtes MailFlow ─────────────────────────────────────────────────

describe("Chirurgie MIME · les en-têtes de service", () => {
  it("X-MailFlow-Type vaut transfer, sinon MailFlow clôturerait l'échange à tort", () => {
    const e = entetesDe(transformerMime(messageSimple(), CTL).mime);
    assert.equal(e.get("x-mailflow-type")![0], "transfer");
  });

  it("les en-têtes de corrélation sont posés", () => {
    const e = entetesDe(transformerMime(messageSimple(), CTL).mime);
    assert.equal(e.get("x-mailflow-original-message-id")![0], PRECEDENT);
    assert.equal(e.get("x-mailflow-exchange-id")![0], "echange-123");
    assert.match(e.get("x-mailflow-transfer-timestamp")![0], /^\d{4}-\d{2}-\d{2}T/);
  });

  it("la chaîne de transfert s'accumule : A → B puis A → B → C", () => {
    const un = transformerMime(messageSimple(), CTL);
    assert.equal(un.meta.chaine, "dec@samko.group -> b@exemple.com");

    // Le message transféré est lui-même retransféré vers C.
    const deux = transformerMime(un.mime, { source: "b@exemple.com", destination: "c@exemple.com", exchangeId: "echange-123" });
    assert.equal(deux.meta.chaine, "dec@samko.group -> b@exemple.com, b@exemple.com -> c@exemple.com");
    assert.equal(entetesDe(deux.mime).get("x-mailflow-transfer-chain")!.length, 1, "une seule chaîne, pas deux");
  });

  it("le fil survit à un double transfert A → B → C", () => {
    const un = transformerMime(messageSimple(), CTL);
    const deux = transformerMime(un.mime, { source: "b@exemple.com", destination: "c@exemple.com", exchangeId: "echange-123" });
    assert.equal(deux.meta.references[0], RACINE, "la racine du fil doit survivre au second transfert");
  });

  it("From et To sont réécrits, l'ancien destinataire ne subsiste pas", () => {
    const e = entetesDe(transformerMime(messageSimple(), CTL).mime);
    assert.deepEqual(e.get("from"), ["dec@samko.group"]);
    assert.deepEqual(e.get("to"), ["b@exemple.com"]);
    assert.equal(e.get("cc"), undefined, "le Cc d'origine ne doit pas suivre le transfert");
  });

  it("aucun Reply-To ne détourne la réponse de B loin de MailFlow", () => {
    const e = entetesDe(transformerMime(messageSimple(), CTL).mime);
    assert.equal(e.get("reply-to"), undefined);
  });

  it("aucun Auto-Submitted : il envoie le transfert en indésirables", () => {
    // Gmail a classé un transfert en spam à cause de cet en-tête, alors que
    // SPF, DKIM et DMARC passaient. Un transfert que B ne voit pas ne sert à
    // rien ; les réponses automatiques restent filtrées par estAutomatique().
    const e = entetesDe(transformerMime(messageSimple(), CTL).mime);
    assert.equal(e.get("auto-submitted"), undefined);
  });

  it("le sujet d'origine est conservé, encodage compris", () => {
    const e = entetesDe(transformerMime(messageSimple(), CTL).mime);
    assert.equal(e.get("subject")![0], "=?UTF-8?Q?Demande_de_devis_urgente?=");
  });
});

// ── Ce qu'il faut jeter ───────────────────────────────────────────────────

describe("Chirurgie MIME · les en-têtes périmés sont retirés", () => {
  it("DKIM, ARC, Received et Return-Path disparaissent", () => {
    const e = entetesDe(transformerMime(messageSimple(), CTL).mime);
    for (const h of ["dkim-signature", "authentication-results", "received", "return-path"]) {
      assert.equal(e.get(h), undefined, `${h} aurait dû être retiré : une signature devenue fausse envoie le message en indésirable`);
    }
  });

  it("un message sans séparation en-têtes/corps est refusé franchement", () => {
    assert.throws(() => transformerMime(Buffer.from("From: a@b.c\r\nSubject: tronque", "utf8"), CTL), /DEFINITIF/);
  });
});

// ── La garde anti-dérive ──────────────────────────────────────────────────

describe("Chirurgie MIME · cohérence avec ce qui est déployé", () => {
  it("le déployeur inline bien ce fichier, sans en garder une copie", () => {
    const deployeur = readFileSync(new URL("../scripts/deployer-transfert-n8n.ts", import.meta.url), "utf8");
    assert.ok(deployeur.includes('readFileSync(new URL("./lib/chirurgie-mime.js"'), "le déployeur doit lire le module partagé");
    assert.ok(deployeur.includes("transformerMime(brut, ctl)"), "le Code node doit appeler la fonction partagée");
    assert.ok(!deployeur.includes('"const aJeter = ['), "une copie de la chirurgie subsiste dans le déployeur");
  });
});
