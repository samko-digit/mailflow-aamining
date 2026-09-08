/**
 * MailFlow · Tests du calcul d'échéance
 *
 *   npm test
 *
 * Semaine de référence utilisée dans tous les cas :
 *   ven. 04/09/2026 · sam. 05 · dim. 06 · lun. 07 · mar. 08 · mer. 09
 *   jeu. 10 · ven. 11 · lun. 14 · mar. 15
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";

import {
  type Calendrier,
  CalendrierInvalide,
  DelaiInvalide,
  ajouterJoursOuvres,
  calculerEcheance,
  calculerEcheanceARebours,
  debutDuCompte,
  estDansFenetre,
  estJourOuvre,
  joursOuvresEcoules,
  momentEnvoi,
  planifierRelances,
  planifierRelancesARebours,
  prochaineOuverture,
  retirerJoursOuvres,
} from "../src/domaine/echeance.ts";

// ── Calendriers d'essai ────────────────────────────────────────────────────

const BAMAKO: Calendrier = {
  zone: "Africa/Bamako",
  joursOuvres: [1, 2, 3, 4, 5],
  ouverture: "08:00",
  fermeture: "18:00",
  joursFeries: [],
};

const avecFeries = (...jours: string[]): Calendrier => ({
  ...BAMAKO,
  joursFeries: jours,
});

// ── Outils de lecture ──────────────────────────────────────────────────────

/** Construit un instant à partir d'une heure locale du calendrier. */
function local(iso: string, zone = BAMAKO.zone): Date {
  const dt = DateTime.fromISO(iso, { zone });
  assert.ok(dt.isValid, `date d'essai mal formée : ${iso}`);
  return dt.toJSDate();
}

/** Rend un instant lisible en heure locale, pour des échecs explicites. */
function lu(d: Date, zone = BAMAKO.zone): string {
  return DateTime.fromJSDate(d, { zone }).toFormat("yyyy-MM-dd HH:mm");
}

// ═══════════════════════════════════════════════════════════════════════════

describe("Lecture du calendrier", () => {
  it("reconnaît un jour de semaine comme ouvré", () => {
    assert.equal(estJourOuvre(local("2026-09-07T10:00"), BAMAKO), true);
  });

  it("exclut le samedi et le dimanche", () => {
    assert.equal(estJourOuvre(local("2026-09-05T10:00"), BAMAKO), false);
    assert.equal(estJourOuvre(local("2026-09-06T10:00"), BAMAKO), false);
  });

  it("exclut un jour férié tombant en semaine", () => {
    const cal = avecFeries("2026-09-09");
    assert.equal(estJourOuvre(local("2026-09-09T10:00"), cal), false);
    assert.equal(estJourOuvre(local("2026-09-10T10:00"), cal), true);
  });
});

describe("Fenêtre d'envoi", () => {
  it("inclut l'ouverture et exclut la fermeture", () => {
    assert.equal(estDansFenetre(local("2026-09-07T07:59"), BAMAKO), false);
    assert.equal(estDansFenetre(local("2026-09-07T08:00"), BAMAKO), true);
    assert.equal(estDansFenetre(local("2026-09-07T17:59"), BAMAKO), true);
    assert.equal(estDansFenetre(local("2026-09-07T18:00"), BAMAKO), false);
  });

  it("est fermée tout le week-end, même aux heures de bureau", () => {
    assert.equal(estDansFenetre(local("2026-09-05T10:00"), BAMAKO), false);
  });
});

describe("Normalisation du point de départ (règle 1)", () => {
  it("laisse inchangé un instant déjà ouvré", () => {
    const d = local("2026-09-07T10:00");
    assert.equal(lu(prochaineOuverture(d, BAMAKO)), "2026-09-07 10:00");
  });

  it("reporte un samedi au lundi à l'ouverture", () => {
    assert.equal(
      lu(prochaineOuverture(local("2026-09-05T10:00"), BAMAKO)),
      "2026-09-07 08:00"
    );
  });

  it("reporte le vendredi soir au lundi à l'ouverture", () => {
    assert.equal(
      lu(prochaineOuverture(local("2026-09-04T19:00"), BAMAKO)),
      "2026-09-07 08:00"
    );
  });

  it("reporte le petit matin à l'ouverture du même jour", () => {
    assert.equal(
      lu(prochaineOuverture(local("2026-09-07T06:00"), BAMAKO)),
      "2026-09-07 08:00"
    );
  });

  it("saute un pont : jeudi soir avec vendredi férié donne lundi", () => {
    const cal = avecFeries("2026-09-11");
    assert.equal(
      lu(prochaineOuverture(local("2026-09-10T19:00"), cal), cal.zone),
      "2026-09-14 08:00"
    );
  });
});

describe("Échéance en jours ouvrés (règle 2)", () => {
  it("CAS DE RÉFÉRENCE : vendredi 17 h 10 plus 2 jours ouvrés donne mardi 17 h 10", () => {
    const echeance = calculerEcheance(local("2026-09-04T17:10"), 2, BAMAKO);
    assert.equal(lu(echeance), "2026-09-08 17:10");
  });

  it("ne compte pas le week-end : jeudi plus 2 donne lundi", () => {
    assert.equal(
      lu(calculerEcheance(local("2026-09-03T09:00"), 2, BAMAKO)),
      "2026-09-07 09:00"
    );
  });

  it("ne compte pas un jour férié : jeudi plus 2 avec lundi férié donne mardi", () => {
    const cal = avecFeries("2026-09-07");
    assert.equal(
      lu(calculerEcheance(local("2026-09-03T09:00"), 2, cal), cal.zone),
      "2026-09-08 09:00"
    );
  });

  it("normalise d'abord : reçu samedi plus 2 donne mercredi à l'ouverture", () => {
    assert.equal(
      lu(calculerEcheance(local("2026-09-05T10:00"), 2, BAMAKO)),
      "2026-09-09 08:00"
    );
  });

  it("reçu vendredi 19 h et reçu samedi donnent la même échéance", () => {
    const a = calculerEcheance(local("2026-09-04T19:00"), 2, BAMAKO);
    const b = calculerEcheance(local("2026-09-05T10:00"), 2, BAMAKO);
    assert.equal(a.getTime(), b.getTime());
  });

  it("un délai nul rend le début du compte", () => {
    const recu = local("2026-09-05T10:00");
    assert.equal(
      calculerEcheance(recu, 0, BAMAKO).getTime(),
      debutDuCompte(recu, BAMAKO).getTime()
    );
  });

  it("INVARIANT : l'échéance tombe toujours dans la fenêtre d'envoi", () => {
    const cal = avecFeries("2026-09-07", "2026-09-22");
    for (let jour = 1; jour <= 30; jour++) {
      for (const heure of ["00:30", "07:00", "09:15", "17:55", "23:45"]) {
        const recu = local(
          `2026-09-${String(jour).padStart(2, "0")}T${heure}`,
          cal.zone
        );
        for (const delai of [0, 1, 2, 3, 5]) {
          const e = calculerEcheance(recu, delai, cal);
          assert.equal(
            estDansFenetre(e, cal),
            true,
            `hors fenêtre : reçu ${lu(recu, cal.zone)} + ${delai} donne ${lu(e, cal.zone)}`
          );
        }
      }
    }
  });

  it("franchit plusieurs semaines si le calendrier est étroit", () => {
    const lundiSeul: Calendrier = { ...BAMAKO, joursOuvres: [1] };
    assert.equal(
      lu(ajouterJoursOuvres(local("2026-09-07T09:00"), 2, lundiSeul)),
      "2026-09-21 09:00"
    );
  });

  it("retire des jours ouvrés symétriquement", () => {
    assert.equal(
      lu(retirerJoursOuvres(local("2026-09-08T17:10"), 2, BAMAKO)),
      "2026-09-04 17:10"
    );
  });
});

describe("Date butoir imposée (règle 4)", () => {
  it("butoir mardi, préavis 1 jour ouvré : relance lundi à l'ouverture", () => {
    assert.equal(
      lu(calculerEcheanceARebours(local("2026-09-15T12:00"), 1, BAMAKO)),
      "2026-09-14 08:00"
    );
  });

  it("butoir mardi, préavis 3 jours ouvrés : relance le mercredi précédent", () => {
    assert.equal(
      lu(calculerEcheanceARebours(local("2026-09-15T12:00"), 3, BAMAKO)),
      "2026-09-10 08:00"
    );
  });

  it("saute le week-end à rebours : butoir lundi, préavis 1, donne vendredi", () => {
    assert.equal(
      lu(calculerEcheanceARebours(local("2026-09-14T12:00"), 1, BAMAKO)),
      "2026-09-11 08:00"
    );
  });

  it("recule si le butoir tombe un jour non ouvré", () => {
    assert.equal(
      lu(calculerEcheanceARebours(local("2026-09-06T12:00"), 0, BAMAKO)),
      "2026-09-04 08:00"
    );
  });

  it("part toujours à l'ouverture, quelle que soit l'heure du butoir", () => {
    for (const h of ["00:01", "08:00", "16:30", "23:59"]) {
      assert.equal(
        lu(calculerEcheanceARebours(local(`2026-09-15T${h}`), 1, BAMAKO)),
        "2026-09-14 08:00"
      );
    }
  });
});

describe("Le compteur tourne, l'envoi attend (règle 3)", () => {
  it("laisse partir un envoi déjà dans la fenêtre", () => {
    const e = local("2026-09-08T17:10");
    assert.equal(momentEnvoi(e, BAMAKO).getTime(), e.getTime());
  });

  it("reporte au lundi un envoi dû le samedi", () => {
    assert.equal(
      lu(momentEnvoi(local("2026-09-05T10:00"), BAMAKO)),
      "2026-09-07 08:00"
    );
  });

  it("CAS DU VENDREDI 17 H 55 : un traitement en retard n'envoie pas à 18 h 05", () => {
    assert.equal(
      lu(momentEnvoi(local("2026-09-04T18:05"), BAMAKO)),
      "2026-09-07 08:00"
    );
  });
});

describe("Jours ouvrés écoulés", () => {
  it("ne compte pas le week-end", () => {
    assert.equal(
      joursOuvresEcoules(
        local("2026-09-04T09:00"),
        local("2026-09-08T09:00"),
        BAMAKO
      ),
      2
    );
  });

  it("rend zéro quand l'ordre est inversé ou identique", () => {
    const d = local("2026-09-08T09:00");
    assert.equal(joursOuvresEcoules(d, d, BAMAKO), 0);
    assert.equal(
      joursOuvresEcoules(d, local("2026-09-04T09:00"), BAMAKO),
      0
    );
  });

  it("ignore les jours fériés", () => {
    const cal = avecFeries("2026-09-07");
    assert.equal(
      joursOuvresEcoules(
        local("2026-09-04T09:00"),
        local("2026-09-08T09:00"),
        cal
      ),
      1
    );
  });
});

describe("Planification d'une série de relances", () => {
  it("enchaîne les délais de la catégorie COMMERCIAL (2, 2, 3)", () => {
    const plan = planifierRelances(
      local("2026-09-04T17:10"),
      [
        { ordre: 1, delaiJoursOuvres: 2 },
        { ordre: 2, delaiJoursOuvres: 2 },
        { ordre: 3, delaiJoursOuvres: 3 },
      ],
      BAMAKO
    );

    assert.equal(plan.length, 3);
    assert.equal(lu(plan[0].echeance), "2026-09-08 17:10"); // mardi
    assert.equal(lu(plan[1].echeance), "2026-09-10 17:10"); // jeudi
    assert.equal(lu(plan[2].echeance), "2026-09-15 17:10"); // mardi suivant
  });

  it("rend des échéances strictement croissantes", () => {
    const plan = planifierRelances(
      local("2026-09-04T17:10"),
      [
        { ordre: 3, delaiJoursOuvres: 3 },
        { ordre: 1, delaiJoursOuvres: 2 },
        { ordre: 2, delaiJoursOuvres: 2 },
      ],
      BAMAKO
    );
    for (let i = 1; i < plan.length; i++) {
      assert.ok(
        plan[i].echeance.getTime() > plan[i - 1].echeance.getTime(),
        `relance ${plan[i].ordre} pas après la ${plan[i - 1].ordre}`
      );
    }
  });

  it("place les deux repères d'une date butoir dans le bon ordre", () => {
    const plan = planifierRelancesARebours(
      local("2026-09-15T12:00"),
      [
        { ordre: 1, delaiJoursOuvres: 3 },
        { ordre: 2, delaiJoursOuvres: 1 },
      ],
      BAMAKO
    );

    assert.equal(plan[0].ordre, 1);
    assert.equal(lu(plan[0].echeance), "2026-09-10 08:00");
    assert.equal(plan[1].ordre, 2);
    assert.equal(lu(plan[1].echeance), "2026-09-14 08:00");
    assert.ok(plan[1].echeance.getTime() > plan[0].echeance.getTime());
  });

  it("l'envoi prévu ne précède jamais l'échéance", () => {
    const plan = planifierRelances(
      local("2026-09-04T17:10"),
      [
        { ordre: 1, delaiJoursOuvres: 2 },
        { ordre: 2, delaiJoursOuvres: 2 },
      ],
      BAMAKO
    );
    for (const r of plan) {
      assert.ok(r.envoiPrevu.getTime() >= r.echeance.getTime());
    }
  });
});

describe("Fuseaux horaires", () => {
  it("raisonne en heure locale et non en UTC", () => {
    // 22 h 30 UTC le vendredi, c'est déjà samedi 00 h 30 à Johannesburg.
    const cal: Calendrier = { ...BAMAKO, zone: "Africa/Johannesburg" };
    const instant = new Date("2026-09-04T22:30:00Z");
    assert.equal(lu(prochaineOuverture(instant, cal), cal.zone), "2026-09-07 08:00");
  });

  it("CHANGEMENT D'HEURE : ajouter un jour ouvré n'ajoute pas 24 heures", () => {
    // L'heure d'été se termine à Paris dans la nuit du dimanche 25 octobre 2026.
    const paris: Calendrier = { ...BAMAKO, zone: "Europe/Paris" };
    const vendredi = local("2026-10-23T10:00", paris.zone);
    const lundi = ajouterJoursOuvres(vendredi, 1, paris);

    // L'heure locale est préservée...
    assert.equal(lu(lundi, paris.zone), "2026-10-26 10:00");
    // ...donc l'écart réel est de 73 heures, pas de 72.
    const heuresEcoulees =
      (lundi.getTime() - vendredi.getTime()) / (1000 * 60 * 60);
    assert.equal(
      heuresEcoulees,
      73,
      "un calcul en millisecondes se décalerait d'une heure deux fois par an"
    );
  });

  it("Bamako ne connaît pas de changement d'heure", () => {
    const janvier = calculerEcheance(local("2026-01-08T09:00"), 1, BAMAKO);
    const juillet = calculerEcheance(local("2026-07-08T09:00"), 1, BAMAKO);
    assert.equal(lu(janvier), "2026-01-09 09:00");
    assert.equal(lu(juillet), "2026-07-09 09:00");
  });
});

describe("Garde-fous", () => {
  it("refuse un fuseau inconnu", () => {
    const cal: Calendrier = { ...BAMAKO, zone: "Mars/Olympus" };
    assert.throws(
      () => estJourOuvre(new Date(), cal),
      (e: unknown) =>
        e instanceof CalendrierInvalide && /Mars\/Olympus/.test(e.message)
    );
  });

  it("refuse un calendrier sans aucun jour ouvré", () => {
    const cal: Calendrier = { ...BAMAKO, joursOuvres: [] };
    assert.throws(
      () => calculerEcheance(new Date(), 1, cal),
      CalendrierInvalide
    );
  });

  it("refuse une fenêtre d'envoi incohérente", () => {
    const cal: Calendrier = { ...BAMAKO, ouverture: "18:00", fermeture: "08:00" };
    assert.throws(() => estDansFenetre(new Date(), cal), CalendrierInvalide);
  });

  it("refuse un délai négatif ou fractionnaire", () => {
    assert.throws(
      () => ajouterJoursOuvres(new Date(), -1, BAMAKO),
      DelaiInvalide
    );
    assert.throws(
      () => ajouterJoursOuvres(new Date(), 1.5, BAMAKO),
      DelaiInvalide
    );
    assert.throws(
      () => calculerEcheanceARebours(new Date(), -2, BAMAKO),
      DelaiInvalide
    );
  });

  it("refuse une heure mal formée", () => {
    const cal: Calendrier = { ...BAMAKO, ouverture: "8h" };
    assert.throws(() => estDansFenetre(new Date(), cal), CalendrierInvalide);
  });
});
