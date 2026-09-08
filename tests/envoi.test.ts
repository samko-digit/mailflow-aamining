/**
 * MailFlow · Tests des garde-fous de l'envoi
 *
 * Le principe vérifié ici tient en une phrase : **on refuse par défaut**.
 * Chaque test cherche à faire partir un message et vérifie qu'il ne part pas.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  type ReglagesEnvoi,
  preparerRelance,
  reglagesDepuisEnv,
  remplirModele,
  verifierAutorisation,
} from "../src/connecteur/garde-envoi.ts";

const OUVERT: ReglagesEnvoi = {
  autorise: true,
  destinatairesAutorises: ["recette@samko.group", "@aamining.net"],
  expediteur: "info@aamining.net",
};

// ═══════════════════════════════════════════════════════════════════════════

describe("Verrou 1 · l'interrupteur général", () => {
  it("refuse tant que MAILFLOW_ENVOI_AUTORISE ne vaut pas « oui »", () => {
    const r = { ...OUVERT, autorise: false };
    const v = verifierAutorisation(["recette@samko.group"], r);
    assert.equal(v.autorise, false);
  });

  it("n'accepte que le mot exact, pas ses cousins", () => {
    for (const valeur of ["true", "1", "yes", "OUI ", "Oui"]) {
      const r = reglagesDepuisEnv({
        MAILFLOW_ENVOI_AUTORISE: valeur,
        MAILFLOW_DESTINATAIRES_AUTORISES: "x@y.org",
      });
      // « OUI » et « Oui » passent après normalisation, les autres non.
      const attendu = valeur.trim().toLowerCase() === "oui";
      assert.equal(r.autorise, attendu, `valeur « ${valeur} »`);
    }
  });

  it("refuse quand la variable est absente", () => {
    const r = reglagesDepuisEnv({});
    assert.equal(r.autorise, false);
    assert.deepEqual(r.destinatairesAutorises, []);
  });
});

describe("Verrou 2 · la liste blanche", () => {
  it("refuse quand la liste est vide, même interrupteur ouvert", () => {
    const r: ReglagesEnvoi = { ...OUVERT, destinatairesAutorises: [] };
    const v = verifierAutorisation(["client@exterieur.example"], r);
    assert.equal(v.autorise, false);
    if (!v.autorise) assert.match(v.raison, /liste blanche vide/);
  });

  it("accepte une adresse exacte de la liste", () => {
    assert.deepEqual(verifierAutorisation(["recette@samko.group"], OUVERT), {
      autorise: true,
    });
  });

  it("accepte un domaine entier déclaré avec @", () => {
    assert.deepEqual(verifierAutorisation(["barema@aamining.net"], OUVERT), {
      autorise: true,
    });
  });

  it("refuse une adresse hors liste", () => {
    const v = verifierAutorisation(["client@exterieur.example"], OUVERT);
    assert.equal(v.autorise, false);
    if (!v.autorise) assert.match(v.raison, /exterieur\.example/);
  });

  it("UN SEUL DESTINATAIRE FAUTIF BLOQUE TOUT L'ENVOI", () => {
    const v = verifierAutorisation(
      ["barema@aamining.net", "client@exterieur.example"],
      OUVERT
    );
    assert.equal(
      v.autorise,
      false,
      "un message amputé de la moitié de ses destinataires est pire qu'un message non parti"
    );
  });

  it("refuse un envoi sans destinataire", () => {
    assert.equal(verifierAutorisation([], OUVERT).autorise, false);
  });

  it("ignore la casse", () => {
    assert.equal(
      verifierAutorisation(["Recette@Samko.Group"], OUVERT).autorise,
      true
    );
  });

  it("ne confond pas un domaine avec un suffixe d'adresse", () => {
    const v = verifierAutorisation(["pirate@faux-aamining.net"], OUVERT);
    assert.equal(v.autorise, false, "« faux-aamining.net » n'est pas « aamining.net »");
  });
});

describe("Verrou 3 · le modèle complet", () => {
  it("remplit les variables connues", () => {
    const r = remplirModele("Bonjour {{nom}}, dossier {{numero}}.", {
      nom: "Barema",
      numero: "42",
    });
    assert.equal(r.complet, true);
    if (r.complet) assert.equal(r.texte, "Bonjour Barema, dossier 42.");
  });

  it("tolère les espaces dans les accolades", () => {
    const r = remplirModele("{{ nom }}", { nom: "Barema" });
    assert.equal(r.complet, true);
    if (r.complet) assert.equal(r.texte, "Barema");
  });

  it("SIGNALE LES MANQUANTES au lieu de produire « Bonjour , »", () => {
    const r = remplirModele("Bonjour {{nom}}, dossier {{numero}}.", { nom: "Barema" });
    assert.equal(r.complet, false);
    if (!r.complet) assert.deepEqual(r.manquantes, ["numero"]);
  });

  it("traite une variable vide comme manquante", () => {
    const r = remplirModele("Bonjour {{nom}}.", { nom: "" });
    assert.equal(r.complet, false);
  });

  it("liste toutes les manquantes, triées, sans doublon", () => {
    const r = remplirModele("{{b}} {{a}} {{b}} {{c}}", {});
    assert.equal(r.complet, false);
    if (!r.complet) assert.deepEqual(r.manquantes, ["a", "b", "c"]);
  });
});

describe("Préparation d'une relance", () => {
  const base = {
    modeleSujet: "Relance · {{sujet}}",
    modeleCorps: "Le dossier {{numero}} attend depuis {{joursEcoules}}.",
    variables: { sujet: "Demande de devis", numero: "42", joursEcoules: "3 jours" },
    destinataires: ["barema@aamining.net"],
    identifiantOrigine: "<devis@client.example>",
    referencesOrigine: ["<racine@client.example>"],
    reglages: OUVERT,
  };

  it("compose objet et corps quand tout est en place", () => {
    const p = preparerRelance(base);
    assert.equal(p.pret, true);
    if (!p.pret) return;
    assert.equal(p.message.sujet, "Relance · Demande de devis");
    assert.match(p.message.corps, /dossier 42 attend depuis 3 jours/);
  });

  it("CHAÎNE LA RELANCE AU FIL D'ORIGINE", () => {
    const p = preparerRelance(base);
    if (!p.pret) throw new Error("aurait dû être prêt");
    assert.equal(p.message.enReponseA, "<devis@client.example>");
    assert.deepEqual(p.message.references, [
      "<racine@client.example>",
      "<devis@client.example>",
    ]);
  });

  it("n'ajoute pas deux fois le même identifiant aux références", () => {
    const p = preparerRelance({
      ...base,
      referencesOrigine: ["<racine@client.example>", "<devis@client.example>"],
    });
    if (!p.pret) throw new Error("aurait dû être prêt");
    assert.equal(p.message.references.length, 2);
  });

  it("refuse si l'interrupteur est fermé, avant toute composition", () => {
    const p = preparerRelance({ ...base, reglages: { ...OUVERT, autorise: false } });
    assert.equal(p.pret, false);
  });

  it("refuse si une copie sort de la liste blanche", () => {
    const p = preparerRelance({ ...base, copie: ["curieux@ailleurs.example"] });
    assert.equal(p.pret, false);
    if (!p.pret) assert.match(p.raison, /liste blanche/);
  });

  it("refuse un modèle incomplet et dit lequel", () => {
    const p = preparerRelance({ ...base, variables: { sujet: "Devis" } });
    assert.equal(p.pret, false);
    if (!p.pret) assert.match(p.raison, /numero|joursEcoules/);
  });

  it("INVARIANT : rien ne part par défaut", () => {
    const parDefaut = reglagesDepuisEnv({});
    const p = preparerRelance({ ...base, reglages: parDefaut });
    assert.equal(
      p.pret,
      false,
      "avec une configuration vierge, aucun message ne doit pouvoir partir"
    );
  });
});
