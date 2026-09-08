/**
 * MailFlow · Tests de la composition d'une relance
 *
 * Deux questions, et pas une de plus :
 *
 *   À QUI part la relance, quand le responsable est en congé ou inactif ?
 *   Le gabarit peut-il être rempli avec un dossier aussi pauvre que ceux que
 *   la captation IMAP produit réellement ?
 *
 * La seconde compte autant que la première. `remplirModele` refuse un gabarit
 * dont une variable est vide, et la captation ne renseigne ni l'organisation
 * du correspondant ni le lien Outlook. Sans repli, chaque relance serait
 * refusée par le troisième verrou, sans que rien ne paraisse cassé.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  type Equipe,
  type Personne,
  resoudreDestinataire,
  urlConsole,
  variablesRelance,
} from "../src/domaine/relance.ts";
import { remplirModele } from "../src/connecteur/garde-envoi.ts";
import type { Calendrier } from "../src/domaine/echeance.ts";

const BAMAKO: Calendrier = {
  zone: "Africa/Bamako",
  joursOuvres: [1, 2, 3, 4, 5],
  ouverture: "08:00",
  fermeture: "18:00",
  joursFeries: [],
};

const personne = (id: string, actif = true): Personne => ({
  id,
  email: `${id}@aamining.net`,
  nomComplet: id.toUpperCase(),
  actif,
});

const EQUIPE: Equipe = {
  responsable: personne("barema"),
  suppleant: personne("mariam"),
  escalade: personne("direction"),
};

// ═══════════════════════════════════════════════════════════════════════════

describe("À qui part la relance", () => {
  it("au responsable, dans le cas ordinaire", () => {
    const d = resoudreDestinataire("PROPRIETAIRE", EQUIPE, false);
    assert.equal(d.trouve, true);
    if (d.trouve) assert.equal(d.personne.id, "barema");
  });

  it("AU SUPPLÉANT QUAND LE RESPONSABLE EST ABSENT", () => {
    const d = resoudreDestinataire("PROPRIETAIRE", EQUIPE, true);
    assert.equal(d.trouve, true);
    if (d.trouve) {
      assert.equal(d.personne.id, "mariam");
      assert.match(d.motif, /absent/);
    }
  });

  it("reste au responsable si l'absent n'a pas de suppléant", () => {
    const d = resoudreDestinataire(
      "PROPRIETAIRE",
      { ...EQUIPE, suppleant: null },
      true
    );
    assert.equal(d.trouve, true);
    if (d.trouve) assert.equal(d.personne.id, "barema");
  });

  it("bascule sur le suppléant quand le responsable est désactivé", () => {
    const d = resoudreDestinataire(
      "PROPRIETAIRE",
      { ...EQUIPE, responsable: personne("barema", false) },
      false
    );
    assert.equal(d.trouve, true);
    if (d.trouve) assert.match(d.motif, /inactif/);
  });

  it("ne bascule pas sur un suppléant désactivé", () => {
    const d = resoudreDestinataire(
      "PROPRIETAIRE",
      { ...EQUIPE, suppleant: personne("mariam", false) },
      true
    );
    assert.equal(d.trouve, true);
    if (d.trouve) assert.equal(d.personne.id, "barema");
  });

  it("REFUSE plutôt que de deviner quand personne n'est désigné", () => {
    const d = resoudreDestinataire(
      "PROPRIETAIRE",
      { responsable: null, suppleant: null, escalade: personne("direction") },
      false
    );
    assert.equal(d.trouve, false);
    if (!d.trouve) assert.match(d.raison, /attribuer/);
  });

  it("l'escalade va à la personne désignée sur la catégorie", () => {
    const d = resoudreDestinataire("ESCALADE", EQUIPE, false);
    assert.equal(d.trouve, true);
    if (d.trouve) assert.equal(d.personne.id, "direction");
  });

  it("l'escalade ne se rabat JAMAIS sur le responsable", () => {
    const d = resoudreDestinataire(
      "ESCALADE",
      { ...EQUIPE, escalade: null },
      false
    );
    assert.equal(
      d.trouve,
      false,
      "escalader vers celui qu'on relance depuis trois semaines n'est pas une escalade"
    );
    if (!d.trouve) assert.match(d.raison, /escalade vers/);
  });

  it("la règle SUPPLEANT se rabat sur le responsable, faute de mieux", () => {
    const d = resoudreDestinataire(
      "SUPPLEANT",
      { ...EQUIPE, suppleant: null },
      false
    );
    assert.equal(d.trouve, true);
    if (d.trouve) assert.equal(d.personne.id, "barema");
  });
});

// ═══════════════════════════════════════════════════════════════════════════

/** Gabarit citant les neuf variables documentées dans le jeu initial. */
const GABARIT_COMPLET = [
  "{{numero}} · {{sujet}}",
  "{{correspondant}} ({{organisation}})",
  "reçu le {{recuLe}}, échéance {{echeance}}",
  "sans réponse depuis {{joursEcoules}}",
  "{{lienMail}} / {{lienFiche}}",
].join("\n");

const RICHE = {
  numero: 42,
  sujet: "Demande de cotation transit Dakar",
  recuLe: new Date("2026-09-01T09:00:00Z"),
  echeance: new Date("2026-09-03T09:00:00Z"),
  webLink: "https://outlook.office.com/mail/id/AAA",
  correspondantEmail: "achats@client.example",
  correspondantNom: "Awa Diallo",
  correspondantOrganisation: "Client SARL",
};

/** Exactement ce que la captation IMAP produit : presque rien. */
const PAUVRE = {
  numero: 7,
  sujet: "",
  recuLe: new Date("2026-09-01T09:00:00Z"),
  echeance: null,
  webLink: null,
  correspondantEmail: "achats@client.example",
  correspondantNom: null,
  correspondantOrganisation: null,
};

const MAINTENANT = new Date("2026-09-04T10:00:00Z");

describe("Variables du modèle", () => {
  it("reprend les données quand elles existent", () => {
    const v = variablesRelance(RICHE, MAINTENANT, BAMAKO, "https://suivi.local");
    assert.equal(v.numero, "#42");
    assert.equal(v.correspondant, "Awa Diallo");
    assert.equal(v.organisation, "Client SARL");
    assert.equal(v.lienMail, "https://outlook.office.com/mail/id/AAA");
    assert.equal(v.lienFiche, "https://suivi.local/?q=42");
  });

  it("AUCUNE VARIABLE N'EST VIDE, MÊME SUR UN DOSSIER NU", () => {
    const v = variablesRelance(PAUVRE, MAINTENANT, BAMAKO, "https://suivi.local");
    for (const [cle, valeur] of Object.entries(v)) {
      assert.notEqual(valeur, "", `la variable ${cle} est vide`);
    }
  });

  it("LE GABARIT COMPLET SE REMPLIT SUR UN DOSSIER NU", () => {
    const v = variablesRelance(PAUVRE, MAINTENANT, BAMAKO, "https://suivi.local");
    const r = remplirModele(GABARIT_COMPLET, v);
    assert.equal(
      r.complet,
      true,
      r.complet ? "" : `variables manquantes : ${r.manquantes.join(", ")}`
    );
  });

  it("remplace le nom absent par l'adresse, pas par du vide", () => {
    const v = variablesRelance(PAUVRE, MAINTENANT, BAMAKO);
    assert.equal(v.correspondant, "achats@client.example");
  });

  it("remplace l'organisation absente par le domaine du correspondant", () => {
    const v = variablesRelance(PAUVRE, MAINTENANT, BAMAKO);
    assert.equal(v.organisation, "client.example");
  });

  it("dit « non fixée » plutôt que de taire une échéance manquante", () => {
    const v = variablesRelance(PAUVRE, MAINTENANT, BAMAKO);
    assert.equal(v.echeance, "non fixée");
  });

  it("renvoie sur la console quand la messagerie ne donne pas de lien", () => {
    const v = variablesRelance(PAUVRE, MAINTENANT, BAMAKO, "https://suivi.local");
    assert.equal(v.lienMail, v.lienFiche);
  });

  it("compte les jours en jours OUVRÉS", () => {
    // Reçu mardi 01/09, mesuré vendredi 04/09 : mer, jeu, ven = 3.
    const v = variablesRelance(RICHE, MAINTENANT, BAMAKO);
    assert.equal(v.joursEcoules, "3 jours ouvrés");
  });

  it("accorde le singulier", () => {
    const v = variablesRelance(RICHE, new Date("2026-09-02T10:00:00Z"), BAMAKO);
    assert.equal(v.joursEcoules, "1 jour ouvré");
  });

  it("ne produit pas « 0 jour » le jour même", () => {
    const v = variablesRelance(RICHE, new Date("2026-09-01T15:00:00Z"), BAMAKO);
    assert.match(v.joursEcoules, /moins d'un jour/);
  });
});

describe("Adresse de la console", () => {
  it("retire la barre oblique finale, pour ne pas doubler celle du lien", () => {
    assert.equal(
      urlConsole({ MAILFLOW_URL_CONSOLE: "https://suivi.local/" }),
      "https://suivi.local"
    );
  });

  it("se rabat sur localhost quand rien n'est configuré", () => {
    assert.equal(urlConsole({}), "http://localhost:3000");
  });
});
