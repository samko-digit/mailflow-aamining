/**
 * MailFlow · Tests du canal d'alerte
 *
 * Une seule question, posée sous plusieurs angles : **une panne qui dure
 * produit-elle un courriel, ou trois cents par jour ?**
 *
 * La seconde réponse tue le canal d'alerte sans que personne ne l'ait décidé :
 * le destinataire crée une règle de tri, et le jour où une vraie alarme part,
 * elle atterrit dans un dossier que plus personne n'ouvre.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  type Alerte,
  type EtatAlertes,
  ETAT_NEUF,
  aDiffuser,
  composerRecapitulatif,
  destinatairesAlerte,
  lireEtat,
  marquerEnvoyees,
} from "../src/moteur/alerte-regles.ts";

const T0 = new Date("2026-09-08T10:00:00Z");
const plus = (heures: number) => new Date(T0.getTime() + heures * 3_600_000);

const a = (code: string, message = "peu importe"): Alerte => ({ code, message });

// ═══════════════════════════════════════════════════════════════════════════

describe("Le silence entre deux alarmes", () => {
  it("laisse passer une alarme jamais criée", () => {
    assert.equal(aDiffuser([a("PANNE")], ETAT_NEUF, T0).length, 1);
  });

  it("UNE PANNE QUI DURE NE PRODUIT QU'UN COURRIEL", () => {
    let etat: EtatAlertes = ETAT_NEUF;
    const candidates = [a("CAPTATION_EN_RETARD")];
    let envois = 0;

    // Le moteur passe toutes les 5 minutes pendant 4 heures : 48 passages.
    for (let i = 0; i < 48; i++) {
      const maintenant = new Date(T0.getTime() + i * 5 * 60_000);
      const retenues = aDiffuser(candidates, etat, maintenant);
      if (retenues.length > 0) {
        envois++;
        etat = marquerEnvoyees(etat, retenues, null, maintenant);
      }
    }

    assert.equal(envois, 1, "48 passages sur la même panne doivent faire 1 courriel");
  });

  it("relance l'alarme une fois le silence écoulé", () => {
    const etat = marquerEnvoyees(ETAT_NEUF, [a("PANNE")], null, T0);
    assert.equal(aDiffuser([a("PANNE")], etat, plus(3.9)).length, 0);
    assert.equal(aDiffuser([a("PANNE")], etat, plus(4.1)).length, 1);
  });

  it("ne bâillonne pas un code différent", () => {
    const etat = marquerEnvoyees(ETAT_NEUF, [a("PANNE")], null, T0);
    const r = aDiffuser([a("PANNE"), a("AUTRE_PANNE")], etat, plus(1));
    assert.deepEqual(
      r.map((x) => x.code),
      ["AUTRE_PANNE"]
    );
  });

  it("VINGT TRAVAUX ÉCHOUÉS POUR LA MÊME RAISON FONT UNE LIGNE", () => {
    const vingt = Array.from({ length: 20 }, () => a("RELANCE_ECHEC"));
    assert.equal(aDiffuser(vingt, ETAT_NEUF, T0).length, 1);
  });
});

describe("Mémorisation", () => {
  it("oublie un code plus vieux qu'une semaine", () => {
    const etat = marquerEnvoyees(ETAT_NEUF, [a("VIEUX")], null, T0);
    const apres = marquerEnvoyees(etat, [], null, plus(24 * 8));
    assert.equal(
      apres.derniersEnvois.VIEUX,
      undefined,
      "sa prochaine occurrence doit sonner comme une nouveauté"
    );
  });

  it("avance le filigrane quand on lui en donne un", () => {
    const apres = marquerEnvoyees(ETAT_NEUF, [], plus(1), T0);
    assert.equal(apres.filigrane, plus(1).toISOString());
  });

  it("conserve le filigrane précédent quand il n'y a rien de neuf", () => {
    const etat = marquerEnvoyees(ETAT_NEUF, [], plus(1), T0);
    const apres = marquerEnvoyees(etat, [], null, plus(2));
    assert.equal(apres.filigrane, plus(1).toISOString());
  });
});

describe("Lecture de l'état mémorisé", () => {
  it("part de zéro sur une valeur absente ou absurde", () => {
    for (const valeur of [null, undefined, 42, "texte", []]) {
      const e = lireEtat(valeur);
      assert.deepEqual(e.derniersEnvois, {});
      assert.equal(e.filigrane, null);
    }
  });

  it("relit ce qu'elle a écrit", () => {
    const ecrit = marquerEnvoyees(ETAT_NEUF, [a("X")], plus(1), T0);
    const relu = lireEtat(JSON.parse(JSON.stringify(ecrit)));
    assert.deepEqual(relu, ecrit);
  });
});

describe("Le récapitulatif", () => {
  const boite = "info@aamining.net";
  const url = "https://suivi.local";

  it("nomme le code quand il n'y en a qu'un", () => {
    const { sujet } = composerRecapitulatif([a("CAPTATION_EN_RETARD")], boite, T0, url);
    assert.match(sujet, /CAPTATION_EN_RETARD/);
    assert.match(sujet, /aamining\.net/);
  });

  it("compte les anomalies quand il y en a plusieurs", () => {
    const { sujet } = composerRecapitulatif([a("A"), a("B"), a("C")], boite, T0, url);
    assert.match(sujet, /3 anomalies/);
  });

  it("TRONQUE PLUTÔT QUE DE DÉBALLER CENT LIGNES", () => {
    const cent = Array.from({ length: 100 }, (_, i) => a(`C${i}`));
    const { corps } = composerRecapitulatif(cent, boite, T0, url);
    const puces = corps.split("\n").filter((l) => l.startsWith("· "));
    assert.ok(puces.length <= 16, `${puces.length} puces, c'est illisible`);
    assert.match(corps, /et 85 autre\(s\)/);
  });

  it("porte le lien de la console : une alarme sans où-aller-voir ne sert à rien", () => {
    const { corps } = composerRecapitulatif([a("X")], boite, T0, url);
    assert.match(corps, /https:\/\/suivi\.local/);
  });

  it("cite le message, pas seulement le code", () => {
    const { corps } = composerRecapitulatif(
      [a("CODE", "la boîte n'a pas été lue depuis 300 min")],
      boite,
      T0,
      url
    );
    assert.match(corps, /300 min/);
  });
});

describe("Destinataires de l'alerte", () => {
  it("découpe la liste et enlève les espaces", () => {
    assert.deepEqual(
      destinatairesAlerte({ MAILFLOW_ALERTES_A: " a@x.org , b@y.org " }),
      ["a@x.org", "b@y.org"]
    );
  });

  it("rend une liste vide quand rien n'est configuré", () => {
    assert.deepEqual(destinatairesAlerte({}), []);
  });
});
