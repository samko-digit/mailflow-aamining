/**
 * MailFlow · Tests de la décision d'exécution
 *
 * La règle testée ici est celle qui évite de réveiller les gens le dimanche
 * tout en laissant l'archivage tourner la nuit.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";

import { type Calendrier } from "../src/domaine/echeance.ts";
import {
  TENTATIVES_MAX,
  deciderTravail,
  envoieUnMessage,
  prochaineTentative,
  travailEncorePertinent,
} from "../src/moteur/decision.ts";
import { STATUTS_ACTIFS, type Statut } from "../src/domaine/cycle-echange.ts";

const BAMAKO: Calendrier = {
  zone: "Africa/Bamako",
  joursOuvres: [1, 2, 3, 4, 5],
  ouverture: "08:00",
  fermeture: "18:00",
  joursFeries: [],
};

const local = (iso: string) =>
  DateTime.fromISO(iso, { zone: BAMAKO.zone }).toJSDate();
const lu = (d: Date) =>
  DateTime.fromJSDate(d, { zone: BAMAKO.zone }).toFormat("yyyy-MM-dd HH:mm");

describe("Ce qui envoie un message et ce qui n'en envoie pas", () => {
  it("relance et escalade écrivent à quelqu'un", () => {
    assert.equal(envoieUnMessage("RELANCE"), true);
    assert.equal(envoieUnMessage("ESCALADE"), true);
  });

  it("archivage et synchronisation ne dérangent personne", () => {
    assert.equal(envoieUnMessage("ARCHIVAGE"), false);
    assert.equal(envoieUnMessage("SYNCHRO_BOITE"), false);
    assert.equal(envoieUnMessage("RENOUVELLEMENT_ABONNEMENT"), false);
  });
});

describe("Travaux qui envoient un message", () => {
  it("partent dans la fenêtre d'ouverture", () => {
    const d = deciderTravail("RELANCE", local("2026-09-07T10:00"), BAMAKO);
    assert.equal(d.action, "executer");
  });

  it("attendent le lundi quand ils échoient un samedi", () => {
    const d = deciderTravail("RELANCE", local("2026-09-05T10:00"), BAMAKO);
    assert.equal(d.action, "reporter");
    if (d.action !== "reporter") return;
    assert.equal(lu(d.a), "2026-09-07 08:00");
  });

  it("CAS DU TRAITEMENT EN RETARD : échu à 17 h 55, exécuté à 18 h 05, il attend", () => {
    const d = deciderTravail("RELANCE", local("2026-09-04T18:05"), BAMAKO);
    assert.equal(d.action, "reporter");
    if (d.action !== "reporter") return;
    assert.equal(
      lu(d.a),
      "2026-09-07 08:00",
      "un vendredi soir, l'envoi doit attendre le lundi matin"
    );
  });

  it("attendent l'ouverture quand ils échoient avant 8 h", () => {
    const d = deciderTravail("ESCALADE", local("2026-09-07T06:30"), BAMAKO);
    assert.equal(d.action, "reporter");
    if (d.action !== "reporter") return;
    assert.equal(lu(d.a), "2026-09-07 08:00");
  });

  it("attendent le lendemain quand un jour férié suit", () => {
    const cal: Calendrier = { ...BAMAKO, joursFeries: ["2026-09-08"] };
    const d = deciderTravail("RELANCE", local("2026-09-07T19:00"), cal);
    assert.equal(d.action, "reporter");
    if (d.action !== "reporter") return;
    assert.equal(lu(d.a), "2026-09-09 08:00");
  });

  it("portent une raison lisible", () => {
    const d = deciderTravail("RELANCE", local("2026-09-06T12:00"), BAMAKO);
    if (d.action !== "reporter") throw new Error("report attendu");
    assert.match(d.raison, /fenêtre/);
  });
});

describe("Travaux qui n'envoient rien", () => {
  it("s'exécutent le dimanche à 3 h du matin sans état d'âme", () => {
    const d = deciderTravail("ARCHIVAGE", local("2026-09-06T03:00"), BAMAKO);
    assert.equal(d.action, "executer");
  });

  it("s'exécutent aussi un jour férié", () => {
    const cal: Calendrier = { ...BAMAKO, joursFeries: ["2026-09-22"] };
    const d = deciderTravail("ARCHIVAGE", local("2026-09-22T14:00"), cal);
    assert.equal(d.action, "executer");
  });

  it("s'exécutent quelle que soit l'heure, sur toute une semaine", () => {
    for (let jour = 1; jour <= 7; jour++) {
      for (const h of ["00:15", "07:00", "12:00", "23:45"]) {
        const d = deciderTravail(
          "ARCHIVAGE",
          local(`2026-09-0${jour}T${h}`),
          BAMAKO
        );
        assert.equal(
          d.action,
          "executer",
          `archivage bloqué le 0${jour} à ${h}`
        );
      }
    }
  });
});

describe("Temporisation après échec", () => {
  it("croît à chaque tentative", () => {
    const t0 = local("2026-09-07T10:00");
    const a1 = prochaineTentative(1, t0);
    const a2 = prochaineTentative(2, t0);
    const a3 = prochaineTentative(3, t0);

    assert.equal(lu(a1), "2026-09-07 10:05");
    assert.equal(lu(a2), "2026-09-07 10:15");
    assert.equal(lu(a3), "2026-09-07 10:45");
  });

  it("est strictement croissante", () => {
    const t0 = local("2026-09-07T10:00");
    let precedent = t0.getTime();
    for (let n = 1; n <= 5; n++) {
      const t = prochaineTentative(n, t0).getTime();
      assert.ok(t > precedent, `tentative ${n} pas après la précédente`);
      precedent = t;
    }
  });

  it("prévoit un nombre maximal de tentatives raisonnable", () => {
    assert.ok(TENTATIVES_MAX >= 2 && TENTATIVES_MAX <= 5);
  });
});

describe("Pertinence : un travail devenu sans objet", () => {
  it("une relance n'a plus d'objet sur un dossier répondu", () => {
    assert.equal(travailEncorePertinent("RELANCE", "REPONDU"), false);
  });

  it("une relance garde son objet en attente et après une première relance", () => {
    assert.equal(travailEncorePertinent("RELANCE", "EN_ATTENTE"), true);
    assert.equal(travailEncorePertinent("RELANCE", "RELANCE"), true);
  });

  it("une relance n'a plus d'objet sur un dossier escaladé", () => {
    assert.equal(travailEncorePertinent("RELANCE", "ESCALADE"), false);
  });

  it("un archivage n'a d'objet que sur un dossier clos", () => {
    assert.equal(travailEncorePertinent("ARCHIVAGE", "REPONDU"), true);
    assert.equal(travailEncorePertinent("ARCHIVAGE", "SANS_SUITE"), true);
    for (const s of STATUTS_ACTIFS) {
      assert.equal(
        travailEncorePertinent("ARCHIVAGE", s),
        false,
        `un dossier ${s} ne doit pas être archivé`
      );
    }
  });

  it("aucun travail n'a d'objet sur un dossier archivé", () => {
    for (const t of ["RELANCE", "ESCALADE", "ARCHIVAGE"] as const) {
      assert.equal(travailEncorePertinent(t, "ARCHIVE"), false);
    }
  });

  it("LA PERTINENCE PASSE AVANT LA FENÊTRE : sinon le travail rebondit à l'infini", () => {
    // Samedi, donc hors fenêtre, sur un dossier déjà répondu.
    const d = deciderTravail(
      "RELANCE",
      local("2026-09-05T10:00"),
      BAMAKO,
      "REPONDU" as Statut
    );
    assert.equal(
      d.action,
      "perimer",
      "hors fenêtre, un travail sans objet doit être annulé et non reporté"
    );
  });

  it("sans statut fourni, la pertinence n'est pas évaluée", () => {
    const d = deciderTravail("RELANCE", local("2026-09-07T10:00"), BAMAKO);
    assert.equal(d.action, "executer");
  });
});
