/**
 * MailFlow · Tests de la normalisation des messages
 *
 * Les cas ci-dessous viennent d'en-têtes réels observés sur la boîte
 * d'essai : chaîne References repliée sur plusieurs lignes, réponse depuis
 * Gmail vers Exchange, notifications de la DGI.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  type Exclusion,
  type MessageCanonique,
  apercu,
  calculerCleDeFil,
  estAutomatique,
  estNonRemise,
  extraireIdentifiants,
  filtrerEntrant,
  premierIdentifiant,
  rattacher,
} from "../src/connecteur/normalisation.ts";

const ent = (o: Record<string, string>) =>
  new Map(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]));

const msg = (sur: Partial<MessageCanonique> = {}): MessageCanonique => ({
  uid: 1,
  identifiant: "<a@exemple.org>",
  cleDeFil: "<a@exemple.org>",
  enReponseA: null,
  references: [],
  sens: "ENTRANT",
  expediteur: { adresse: "client@exemple.org" },
  destinataires: [{ adresse: "info@aamining.net" }],
  copie: [],
  sujet: "Demande de devis",
  extrait: "",
  date: new Date("2026-09-07T10:00:00Z"),
  aPieceJointe: false,
  piecesJointes: [],
  estAutomatique: false,
  estNonRemise: false,
  estGenereParMailflow: false,
  ...sur,
});

// ═══════════════════════════════════════════════════════════════════════════

describe("Extraction des identifiants", () => {
  it("lit une chaîne References repliée sur plusieurs lignes", () => {
    const brut =
      "<AS2PR05MB9960BEBEC@outlook.com> <AM7PR01MB6674@exchangelabs.com> " +
      "<DBAPR03MB6502@outlook.com>";
    assert.deepEqual(extraireIdentifiants(brut), [
      "<AS2PR05MB9960BEBEC@outlook.com>",
      "<AM7PR01MB6674@exchangelabs.com>",
      "<DBAPR03MB6502@outlook.com>",
    ]);
  });

  it("accepte un identifiant Gmail avec des caractères inhabituels", () => {
    const brut = "<CAN+2edyV2+_76fyBeMOW1K=fkTk=CRXGEroN30cwk2V+S-QBpg@mail.gmail.com>";
    assert.deepEqual(extraireIdentifiants(brut), [brut]);
  });

  it("rend une liste vide plutôt que de casser", () => {
    assert.deepEqual(extraireIdentifiants(null), []);
    assert.deepEqual(extraireIdentifiants(""), []);
    assert.deepEqual(extraireIdentifiants("pas un identifiant"), []);
    assert.equal(premierIdentifiant(undefined), null);
  });
});

describe("Clé de fil de conversation", () => {
  it("prend la racine de References, pas le dernier élément", () => {
    const cle = calculerCleDeFil({
      references: ["<racine@a.org>", "<milieu@b.org>", "<recent@c.org>"],
      enReponseA: "<recent@c.org>",
      identifiant: "<moi@d.org>",
    });
    assert.equal(cle, "<racine@a.org>");
  });

  it("retombe sur In-Reply-To quand References manque", () => {
    const cle = calculerCleDeFil({
      references: [],
      enReponseA: "<parent@b.org>",
      identifiant: "<moi@d.org>",
    });
    assert.equal(cle, "<parent@b.org>");
  });

  it("un message qui ouvre un fil est sa propre racine", () => {
    const cle = calculerCleDeFil({
      references: [],
      enReponseA: null,
      identifiant: "<moi@d.org>",
    });
    assert.equal(cle, "<moi@d.org>");
  });

  it("INVARIANT : tout un fil partage la même clé", () => {
    const racine = "<devis@client.example>";
    const initial = calculerCleDeFil({ references: [], enReponseA: null, identifiant: racine });
    const reponse = calculerCleDeFil({
      references: [racine],
      enReponseA: racine,
      identifiant: "<r1@nous.example>",
    });
    const suite = calculerCleDeFil({
      references: [racine, "<r1@nous.example>"],
      enReponseA: "<r1@nous.example>",
      identifiant: "<r2@client.example>",
    });
    assert.equal(initial, racine);
    assert.equal(reponse, racine);
    assert.equal(suite, racine);
  });
});

describe("Messages qui ne valent pas réponse", () => {
  it("reconnaît une absence du bureau (RFC 3834)", () => {
    assert.equal(estAutomatique(ent({ "Auto-Submitted": "auto-replied" })), true);
    assert.equal(estAutomatique(ent({ "Auto-Submitted": "auto-generated" })), true);
  });

  it("laisse passer Auto-Submitted: no", () => {
    assert.equal(estAutomatique(ent({ "Auto-Submitted": "no" })), false);
  });

  it("reconnaît les diffusions et les réponses automatiques", () => {
    assert.equal(estAutomatique(ent({ Precedence: "bulk" })), true);
    assert.equal(estAutomatique(ent({ Precedence: "auto_reply" })), true);
    assert.equal(estAutomatique(ent({ "X-Autoreply": "yes" })), true);
    assert.equal(estAutomatique(ent({ "Return-Path": "<>" })), true);
  });

  it("laisse passer un vrai message", () => {
    assert.equal(
      estAutomatique(ent({ From: "client@exemple.org", Subject: "Devis" })),
      false
    );
  });

  it("reconnaît un rapport de non-remise par son type de contenu", () => {
    assert.equal(
      estNonRemise(
        ent({ "Content-Type": 'multipart/report; report-type=delivery-status; boundary="x"' }),
        "postmaster@exemple.org"
      ),
      true
    );
  });

  it("reconnaît une non-remise par son expéditeur", () => {
    assert.equal(estNonRemise(ent({}), "MAILER-DAEMON@exemple.org"), true);
    assert.equal(estNonRemise(ent({}), "postmaster@exemple.org"), true);
  });

  it("reconnaît une non-remise par son objet, en français comme en anglais", () => {
    assert.equal(estNonRemise(ent({ Subject: "Non remis : Invitation" }), "x@y.org"), true);
    assert.equal(estNonRemise(ent({ Subject: "Undeliverable: Devis" }), "x@y.org"), true);
  });

  it("ne prend pas un message normal pour une non-remise", () => {
    assert.equal(estNonRemise(ent({ Subject: "Re: Devis" }), "client@exemple.org"), false);
  });
});

describe("Filtre d'exclusion", () => {
  const exclusions: Exclusion[] = [
    { type: "MOTIF", valeur: "^(no-?reply|ne-pas-repondre)@" },
    { type: "DOMAINE", valeur: "veille-marches.example" },
    { type: "ADRESSE", valeur: "notify@mail.notion.so" },
  ];

  it("garde un courriel client ordinaire", () => {
    assert.deepEqual(filtrerEntrant(msg(), exclusions), { garder: true });
  });

  it("écarte une adresse sans réponse possible", () => {
    const v = filtrerEntrant(
      msg({ expediteur: { adresse: "no-reply@plateforme.example" } }),
      exclusions
    );
    assert.equal(v.garder, false);
  });

  it("écarte un domaine entier", () => {
    const v = filtrerEntrant(
      msg({ expediteur: { adresse: "alertes@veille-marches.example" } }),
      exclusions
    );
    assert.equal(v.garder, false);
  });

  it("écarte une adresse exacte, insensible à la casse", () => {
    const v = filtrerEntrant(
      msg({ expediteur: { adresse: "Notify@Mail.Notion.SO" } }),
      exclusions
    );
    assert.equal(v.garder, false);
  });

  it("écarte les messages automatiques et les non-remises", () => {
    assert.equal(filtrerEntrant(msg({ estAutomatique: true }), exclusions).garder, false);
    assert.equal(filtrerEntrant(msg({ estNonRemise: true }), exclusions).garder, false);
  });

  it("écarte les expéditeurs internes", () => {
    const v = filtrerEntrant(
      msg({ expediteur: { adresse: "collegue@aamining.net" } }),
      exclusions,
      ["aamining.net"]
    );
    assert.equal(v.garder, false);
  });

  it("UN MOTIF MAL ÉCRIT NE FAIT PAS PERDRE LE MESSAGE", () => {
    const casses: Exclusion[] = [{ type: "MOTIF", valeur: "([" }];
    assert.deepEqual(filtrerEntrant(msg(), casses), { garder: true });
  });

  it("donne toujours une raison lisible quand il écarte", () => {
    const v = filtrerEntrant(
      msg({ expediteur: { adresse: "no-reply@x.example" } }),
      exclusions
    );
    if (v.garder) throw new Error("aurait dû être écarté");
    assert.ok(v.raison.length > 5, "la raison doit être explicite");
  });
});

describe("Rattachement d'une réponse", () => {
  const connus = new Set(["<devis@client.example>", "<relance1@nous.example>"]);

  it("rattache par In-Reply-To en priorité", () => {
    const r = rattacher(
      { enReponseA: "<devis@client.example>", references: ["<autre@x.example>"] },
      connus
    );
    assert.equal(r, "<devis@client.example>");
  });

  it("remonte References de la fin vers le début", () => {
    const r = rattacher(
      {
        enReponseA: "<inconnu@x.example>",
        references: ["<devis@client.example>", "<relance1@nous.example>"],
      },
      connus
    );
    assert.equal(
      r,
      "<relance1@nous.example>",
      "le message cité en dernier est le plus proche dans le fil"
    );
  });

  it("rend null quand rien ne correspond", () => {
    assert.equal(
      rattacher({ enReponseA: "<x@y.org>", references: ["<z@y.org>"] }, connus),
      null
    );
  });

  it("rend null sur un message qui ne cite personne", () => {
    assert.equal(rattacher({ enReponseA: null, references: [] }, connus), null);
  });

  it("CAS RÉEL : une réponse Exchange rattachée à un message Gmail", () => {
    const gmail = "<CAN+2edyV2+_76fyBeMOW1K=fkTk=CRXGEroN30cwk2V+S-QBpg@mail.gmail.com>";
    const r = rattacher({ enReponseA: gmail, references: [gmail] }, new Set([gmail]));
    assert.equal(r, gmail, "le chaînage doit tenir d'un fournisseur à l'autre");
  });
});

describe("Aperçu du corps", () => {
  it("écrase les blancs et coupe proprement", () => {
    const a = apercu("Bonjour,\n\n   Veuillez trouver\tci-joint le devis.\n", 40);
    assert.equal(a, "Bonjour, Veuillez trouver ci-joint le d…");
  });

  it("retire les lignes de citation", () => {
    const a = apercu("Ma réponse.\n> Votre message d'origine\n> suite");
    assert.equal(a, "Ma réponse.");
  });

  it("laisse court un texte court", () => {
    assert.equal(apercu("Merci."), "Merci.");
  });
});
