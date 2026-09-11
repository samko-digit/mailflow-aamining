/**
 * MailFlow · Tests du cycle de vie d'un échange
 *
 *   npm test
 *
 * Les cinq invariants de `cycle-echange.ts` sont chacun couverts par un
 * groupe de tests portant leur numéro.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  StatutEchange as StatutPrisma,
  TypeEvenement as TypeEvenementPrisma,
  CanalReponse as CanalPrisma,
} from "../src/generated/prisma/enums.ts";

import {
  type EtatEchange,
  type Effet,
  type Statut,
  type Transition,
  STATUTS_ACTIFS,
  STATUTS_TERMINAUX,
  TransitionIncomplete,
  TransitionInterdite,
  appliquer,
  estActif,
  estTerminal,
  etatInitial,
  transitionsPossibles,
} from "../src/domaine/cycle-echange.ts";

// ── Outils ─────────────────────────────────────────────────────────────────

const J = (iso: string) => new Date(iso);

/** Construit un état de départ dans le statut voulu. */
function etat(statut: Statut, sur: Partial<EtatEchange> = {}): EtatEchange {
  return { ...etatInitial(), statut, ...sur };
}

/** Un échange qualifié, prêt à être relancé. */
const enAttente = (sur: Partial<EtatEchange> = {}) =>
  etat("EN_ATTENTE", {
    categorie: "COMMERCIAL",
    responsable: "u-mamadou",
    echeance: J("2026-09-08T17:10:00Z"),
    ...sur,
  });

function aEffet(effets: Effet[], type: Effet["type"]): boolean {
  return effets.some((e) => e.type === type);
}

function planifications(effets: Effet[]) {
  return effets.filter((e) => e.type === "PLANIFIER");
}

const TOUTES_TRANSITIONS: Transition[] = [
  {
    type: "QUALIFIER",
    categorie: "COMMERCIAL",
    responsable: "u-1",
    echeance: J("2026-09-08T17:10:00Z"),
    premiereRelance: J("2026-09-08T17:10:00Z"),
  },
  { type: "CLASSER_HORS_PERIMETRE", motif: "publicité" },
  { type: "REATTRIBUER", responsable: "u-2" },
  { type: "RELANCER", ordre: 1, suite: null },
  {
    type: "SIGNALER_NON_REMISE",
    ordre: 1,
    motif: "boîte inexistante",
    nouvelleTentative: J("2026-09-09T08:00:00Z"),
  },
  { type: "ESCALADER" },
  {
    type: "DETECTER_REPONSE",
    reponduLe: J("2026-09-09T09:00:00Z"),
    messageId: "<abc@exemple.org>",
    archiverLe: J("2026-09-16T08:00:00Z"),
  },
  {
    type: "DECLARER_REPONSE",
    reponduLe: J("2026-09-09T09:00:00Z"),
    canal: "TELEPHONE",
    archiverLe: J("2026-09-16T08:00:00Z"),
  },
  {
    type: "ROUVRIR",
    motif: "réponse détectée à tort",
    nouvelleEcheance: J("2026-09-10T08:00:00Z"),
  },
  {
    type: "CLASSER_SANS_SUITE",
    motif: "dossier abandonné par le client",
    archiverLe: J("2026-09-16T08:00:00Z"),
  },
  { type: "ARCHIVER", url: "https://stockage/echange/42" },
  {
    type: "REQUALIFIER",
    categorie: "ADMIN",
    responsable: "u-3",
    echeance: J("2026-09-10T08:00:00Z"),
    premiereRelance: J("2026-09-10T08:00:00Z"),
  },
];

// ═══════════════════════════════════════════════════════════════════════════

describe("Cohérence avec le schéma de base", () => {
  it("les statuts du domaine sont exactement ceux de la base", () => {
    const domaine = [...STATUTS_ACTIFS, ...STATUTS_TERMINAUX, "REPONDU", "SANS_SUITE"].sort();
    const base = Object.values(StatutPrisma).sort();
    assert.deepEqual(
      domaine,
      base,
      "le domaine et le schéma Prisma ont divergé : mettre les deux à jour ensemble"
    );
  });

  it("les canaux hors messagerie existent bien en base", () => {
    for (const canal of ["TELEPHONE", "REUNION", "WHATSAPP", "PHYSIQUE"]) {
      assert.ok(
        Object.values(CanalPrisma).includes(canal as never),
        `canal absent du schéma : ${canal}`
      );
    }
  });

  it("chaque événement produit par la machine existe en base", () => {
    const produits = new Set<string>();
    for (const statut of [...STATUTS_ACTIFS, "REPONDU", "SANS_SUITE"] as Statut[]) {
      for (const t of TOUTES_TRANSITIONS) {
        try {
          const base = statut === "RELANCE" ? etat(statut, { nbRelances: 1 }) : etat(statut);
          for (const e of appliquer(base, t).effets) {
            if (e.type === "JOURNALISER") produits.add(e.evenement);
          }
        } catch {
          // transition non applicable depuis cet état : sans objet ici
        }
      }
    }
    assert.ok(produits.size > 0, "aucun événement produit, le balayage est cassé");
    for (const e of produits) {
      assert.ok(
        Object.values(TypeEvenementPrisma).includes(e as never),
        `événement absent du schéma Prisma : ${e}`
      );
    }
  });
});

describe("Invariant 1 · une réponse arrête les relances", () => {
  for (const statut of STATUTS_ACTIFS) {
    it(`depuis ${statut}, une réponse détectée clôt et annule les travaux`, () => {
      const r = appliquer(etat(statut, { nbRelances: statut === "RELANCE" ? 2 : 0 }), {
        type: "DETECTER_REPONSE",
        reponduLe: J("2026-09-09T09:00:00Z"),
        messageId: "<r1@exemple.org>",
        archiverLe: J("2026-09-16T08:00:00Z"),
      });

      assert.equal(r.etat.statut, "REPONDU");
      assert.equal(r.etat.canalReponse, "MAIL");
      assert.ok(aEffet(r.effets, "ANNULER_TRAVAUX"), "les travaux ne sont pas annulés");
      assert.ok(
        !planifications(r.effets).some((p) => p.travail === "RELANCE"),
        "une relance reste planifiée après une réponse"
      );
    });
  }

  it("une réponse déclarée par téléphone clôt aussi (RG-15)", () => {
    const r = appliquer(enAttente(), {
      type: "DECLARER_REPONSE",
      reponduLe: J("2026-09-09T09:00:00Z"),
      canal: "TELEPHONE",
      archiverLe: J("2026-09-16T08:00:00Z"),
    });
    assert.equal(r.etat.statut, "REPONDU");
    assert.equal(r.etat.canalReponse, "TELEPHONE");
    assert.ok(aEffet(r.effets, "ANNULER_TRAVAUX"));
  });

  it("la réponse conserve le compteur de relances déjà envoyées", () => {
    const r = appliquer(etat("RELANCE", { nbRelances: 2 }), {
      type: "DETECTER_REPONSE",
      reponduLe: J("2026-09-09T09:00:00Z"),
      messageId: "<r2@exemple.org>",
      archiverLe: J("2026-09-16T08:00:00Z"),
    });
    assert.equal(r.etat.nbRelances, 2);
  });
});

describe("Invariant 2 · une relance ne s'enregistre que dans l'ordre", () => {
  it("accepte le rang attendu et incrémente le compteur", () => {
    const r = appliquer(enAttente(), { type: "RELANCER", ordre: 1, suite: null });
    assert.equal(r.etat.statut, "RELANCE");
    assert.equal(r.etat.nbRelances, 1);
  });

  it("REJEU : rejoue le même rang deux fois et refuse la seconde", () => {
    const apres = appliquer(enAttente(), { type: "RELANCER", ordre: 1, suite: null }).etat;
    assert.throws(
      () => appliquer(apres, { type: "RELANCER", ordre: 1, suite: null }),
      TransitionIncomplete,
      "un traitement rejoué produirait un double envoi"
    );
  });

  it("refuse un rang qui saute une relance", () => {
    assert.throws(
      () => appliquer(enAttente(), { type: "RELANCER", ordre: 3, suite: null }),
      TransitionIncomplete
    );
  });

  it("planifie la relance suivante quand elle est fournie", () => {
    const r = appliquer(enAttente(), {
      type: "RELANCER",
      ordre: 1,
      suite: { type: "RELANCE", ordre: 2, quand: J("2026-09-10T17:10:00Z") },
    });
    const p = planifications(r.effets);
    assert.equal(p.length, 1);
    assert.equal(p[0].travail, "RELANCE");
    assert.equal(p[0].ordre, 2);
  });

  it("planifie l'escalade quand la série est épuisée", () => {
    const r = appliquer(etat("RELANCE", { nbRelances: 2 }), {
      type: "RELANCER",
      ordre: 3,
      suite: { type: "ESCALADE", quand: J("2026-09-15T08:00:00Z") },
    });
    const p = planifications(r.effets);
    assert.equal(p.length, 1);
    assert.equal(p[0].travail, "ESCALADE");
  });

  it("ne planifie rien quand aucune suite n'est fournie", () => {
    const r = appliquer(enAttente(), { type: "RELANCER", ordre: 1, suite: null });
    assert.equal(planifications(r.effets).length, 0);
  });

  it("refuse de relancer un échange déjà répondu", () => {
    assert.throws(
      () => appliquer(etat("REPONDU"), { type: "RELANCER", ordre: 1, suite: null }),
      TransitionInterdite
    );
  });

  it("refuse de relancer un échange escaladé", () => {
    assert.throws(
      () => appliquer(etat("ESCALADE", { nbRelances: 3 }), { type: "RELANCER", ordre: 4, suite: null }),
      TransitionInterdite
    );
  });
});

describe("Invariant 3 · une non-remise est un incident, pas une réponse", () => {
  it("rend son rang à la relance et repasse en attente", () => {
    const relance = appliquer(enAttente(), { type: "RELANCER", ordre: 1, suite: null }).etat;
    assert.equal(relance.nbRelances, 1);

    const r = appliquer(relance, {
      type: "SIGNALER_NON_REMISE",
      ordre: 1,
      motif: "boîte inexistante",
      nouvelleTentative: J("2026-09-09T08:00:00Z"),
    });

    assert.equal(r.etat.statut, "EN_ATTENTE");
    assert.equal(r.etat.nbRelances, 0, "le rang doit être rendu");
    assert.ok(aEffet(r.effets, "ALERTER"), "une non-remise doit alerter");
  });

  it("replanifie le même rang, pas le suivant", () => {
    const relance = appliquer(enAttente(), { type: "RELANCER", ordre: 1, suite: null }).etat;
    const r = appliquer(relance, {
      type: "SIGNALER_NON_REMISE",
      ordre: 1,
      motif: "boîte pleine",
      nouvelleTentative: J("2026-09-09T08:00:00Z"),
    });
    assert.equal(planifications(r.effets)[0].ordre, 1);
  });

  it("le cycle relance, non-remise, relance reste cohérent", () => {
    let e = enAttente();
    e = appliquer(e, { type: "RELANCER", ordre: 1, suite: null }).etat;
    e = appliquer(e, {
      type: "SIGNALER_NON_REMISE",
      ordre: 1,
      motif: "boîte pleine",
      nouvelleTentative: J("2026-09-09T08:00:00Z"),
    }).etat;
    e = appliquer(e, { type: "RELANCER", ordre: 1, suite: null }).etat;

    assert.equal(e.statut, "RELANCE");
    assert.equal(e.nbRelances, 1, "la relance ne doit être comptée qu'une fois");
  });

  it("refuse une non-remise dont le rang ne correspond pas au compteur", () => {
    const relance = appliquer(enAttente(), { type: "RELANCER", ordre: 1, suite: null }).etat;
    assert.throws(
      () =>
        appliquer(relance, {
          type: "SIGNALER_NON_REMISE",
          ordre: 2,
          motif: "incohérent",
          nouvelleTentative: J("2026-09-09T08:00:00Z"),
        }),
      TransitionIncomplete
    );
  });
});

describe("Invariant 4 · un échange escaladé ne se ferme jamais tout seul", () => {
  it("l'escalade annule les travaux et alerte", () => {
    const r = appliquer(etat("RELANCE", { nbRelances: 3 }), { type: "ESCALADER" });
    assert.equal(r.etat.statut, "ESCALADE");
    assert.ok(aEffet(r.effets, "ANNULER_TRAVAUX"));
    assert.ok(aEffet(r.effets, "ALERTER"));
  });

  it("aucune transition automatique ne sort de ESCALADE vers un état clos", () => {
    const possibles = transitionsPossibles("ESCALADE");
    assert.ok(!possibles.includes("RELANCER"));
    assert.ok(!possibles.includes("ARCHIVER"));
    assert.ok(possibles.includes("CLASSER_SANS_SUITE"));
  });

  it("le classement sans suite exige un motif", () => {
    assert.throws(
      () =>
        appliquer(etat("ESCALADE"), {
          type: "CLASSER_SANS_SUITE",
          motif: "   ",
          archiverLe: J("2026-09-16T08:00:00Z"),
        }),
      TransitionIncomplete
    );
  });

  it("le classement sans suite motivé conduit à SANS_SUITE et planifie l'archivage", () => {
    const r = appliquer(etat("ESCALADE"), {
      type: "CLASSER_SANS_SUITE",
      motif: "le client a retiré sa demande",
      archiverLe: J("2026-09-16T08:00:00Z"),
    });
    assert.equal(r.etat.statut, "SANS_SUITE");
    assert.equal(r.etat.motifCloture, "le client a retiré sa demande");
    assert.ok(planifications(r.effets).some((p) => p.travail === "ARCHIVAGE"));
  });
});

describe("Invariant 5 · les états terminaux le sont vraiment", () => {
  for (const statut of STATUTS_TERMINAUX) {
    it(`aucune transition ne sort de ${statut}`, () => {
      for (const t of TOUTES_TRANSITIONS) {
        assert.throws(
          () => appliquer(etat(statut), t),
          TransitionInterdite,
          `la transition ${t.type} a été acceptée depuis ${statut}`
        );
      }
      assert.deepEqual(transitionsPossibles(statut), []);
    });
  }
});

describe("Qualification", () => {
  it("passe de A_QUALIFIER à EN_ATTENTE et planifie la première relance", () => {
    const r = appliquer(etatInitial(), {
      type: "QUALIFIER",
      categorie: "COMMERCIAL",
      responsable: "u-mamadou",
      echeance: J("2026-09-08T17:10:00Z"),
      premiereRelance: J("2026-09-08T17:10:00Z"),
    });

    assert.equal(r.etat.statut, "EN_ATTENTE");
    assert.equal(r.etat.categorie, "COMMERCIAL");
    assert.equal(r.etat.responsable, "u-mamadou");
    const p = planifications(r.effets);
    assert.equal(p.length, 1);
    assert.equal(p[0].ordre, 1);
  });

  it("exige un responsable non vide", () => {
    assert.throws(
      () =>
        appliquer(etatInitial(), {
          type: "QUALIFIER",
          categorie: "COMMERCIAL",
          responsable: "  ",
          echeance: J("2026-09-08T17:10:00Z"),
          premiereRelance: J("2026-09-08T17:10:00Z"),
        }),
      TransitionIncomplete
    );
  });

  it("le classement hors périmètre exige un motif et est terminal", () => {
    const r = appliquer(etatInitial(), {
      type: "CLASSER_HORS_PERIMETRE",
      motif: "newsletter fournisseur",
    });
    assert.equal(r.etat.statut, "HORS_PERIMETRE");
    assert.ok(estTerminal(r.etat.statut));
  });

  it("un échange déjà qualifié ne se requalifie pas", () => {
    assert.throws(
      () =>
        appliquer(enAttente(), {
          type: "QUALIFIER",
          categorie: "ADMIN",
          responsable: "u-2",
          echeance: J("2026-09-10T08:00:00Z"),
          premiereRelance: J("2026-09-10T08:00:00Z"),
        }),
      TransitionInterdite
    );
  });
});

describe("Réouverture et archivage", () => {
  it("rouvre un échange répondu à tort et replanifie une relance", () => {
    const repondu = etat("REPONDU", {
      nbRelances: 1,
      reponduLe: J("2026-09-09T09:00:00Z"),
      canalReponse: "MAIL",
    });
    const r = appliquer(repondu, {
      type: "ROUVRIR",
      motif: "accusé de réception pris pour une réponse",
      nouvelleEcheance: J("2026-09-11T08:00:00Z"),
    });

    assert.equal(r.etat.statut, "EN_ATTENTE");
    assert.equal(r.etat.reponduLe, null);
    assert.equal(r.etat.canalReponse, null);
    assert.equal(planifications(r.effets)[0].ordre, 2);
    assert.ok(aEffet(r.effets, "ALERTER"));
  });

  it("archive depuis REPONDU et depuis SANS_SUITE", () => {
    for (const depart of ["REPONDU", "SANS_SUITE"] as Statut[]) {
      const r = appliquer(etat(depart), {
        type: "ARCHIVER",
        url: "https://stockage/echange/42",
      });
      assert.equal(r.etat.statut, "ARCHIVE");
      assert.equal(r.etat.archiveUrl, "https://stockage/echange/42");
    }
  });

  it("n'archive pas un échange encore actif", () => {
    for (const statut of STATUTS_ACTIFS) {
      assert.throws(
        () => appliquer(etat(statut), { type: "ARCHIVER", url: "https://x" }),
        TransitionInterdite
      );
    }
  });
});

describe("Propriétés générales", () => {
  it("l'état reçu n'est jamais modifié", () => {
    const depart = enAttente();
    const copie = structuredClone(depart);
    appliquer(depart, { type: "RELANCER", ordre: 1, suite: null });
    assert.deepEqual(depart, copie, "la machine a modifié l'état d'entrée");
  });

  it("toute transition acceptée journalise au moins un événement (RG-14)", () => {
    let acceptees = 0;
    for (const statut of [...STATUTS_ACTIFS, "REPONDU", "SANS_SUITE"] as Statut[]) {
      for (const t of TOUTES_TRANSITIONS) {
        try {
          const base = statut === "RELANCE" ? etat(statut, { nbRelances: 1 }) : etat(statut);
          const r = appliquer(base, t);
          acceptees++;
          assert.ok(
            r.effets.some((e) => e.type === "JOURNALISER"),
            `${t.type} depuis ${statut} ne journalise rien`
          );
        } catch {
          // transition refusée : elle n'a pas à journaliser
        }
      }
    }
    assert.ok(acceptees >= 15, `trop peu de transitions acceptées (${acceptees})`);
  });

  it("estActif et estTerminal ne se recouvrent pas et couvrent tout", () => {
    const tous = Object.values(StatutPrisma) as Statut[];
    for (const s of tous) {
      assert.ok(!(estActif(s) && estTerminal(s)), `${s} est à la fois actif et terminal`);
    }
    const nonClasses = tous.filter((s) => !estActif(s) && !estTerminal(s));
    assert.deepEqual(nonClasses.sort(), ["REPONDU", "SANS_SUITE"]);
  });

  it("PARCOURS COMPLET : capté, qualifié, relancé deux fois, escaladé, répondu, archivé", () => {
    let e = etatInitial();
    const journal: string[] = [];

    const etape = (t: Transition) => {
      const r = appliquer(e, t);
      e = r.etat;
      for (const ef of r.effets) {
        if (ef.type === "JOURNALISER") journal.push(ef.evenement);
      }
    };

    etape({
      type: "QUALIFIER",
      categorie: "COMMERCIAL",
      responsable: "u-mamadou",
      echeance: J("2026-09-08T17:10:00Z"),
      premiereRelance: J("2026-09-08T17:10:00Z"),
    });
    etape({
      type: "RELANCER",
      ordre: 1,
      suite: { type: "RELANCE", ordre: 2, quand: J("2026-09-10T17:10:00Z") },
    });
    etape({
      type: "RELANCER",
      ordre: 2,
      suite: { type: "ESCALADE", quand: J("2026-09-15T17:10:00Z") },
    });
    etape({ type: "ESCALADER" });
    etape({
      type: "DETECTER_REPONSE",
      reponduLe: J("2026-09-16T10:00:00Z"),
      messageId: "<final@client.example>",
      archiverLe: J("2026-09-23T08:00:00Z"),
    });
    etape({ type: "ARCHIVER", url: "https://stockage/echange/42" });

    assert.equal(e.statut, "ARCHIVE");
    assert.equal(e.nbRelances, 2);
    assert.equal(e.canalReponse, "MAIL");
    assert.deepEqual(journal, [
      "MAIL_QUALIFIE",
      "MAIL_ATTRIBUE",
      "RELANCE_ENVOYEE",
      "RELANCE_ENVOYEE",
      "ESCALADE_DECLENCHEE",
      "REPONSE_DETECTEE",
      "MAIL_ARCHIVE",
    ]);
  });
});

describe("Requalification", () => {
  it("1. EN_ATTENTE → REQUALIFIER → EN_ATTENTE", () => {
    const r = appliquer(enAttente(), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.equal(r.etat.statut, "EN_ATTENTE");
  });

  it("2. RELANCE → REQUALIFIER → EN_ATTENTE", () => {
    const r = appliquer(etat("RELANCE", { nbRelances: 2, categorie: "COMMERCIAL", responsable: "u-1", echeance: J("2026-09-08T17:10:00Z") }), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.equal(r.etat.statut, "EN_ATTENTE");
    assert.equal(r.etat.nbRelances, 0, "le compteur de relances doit être remis à 0");
  });

  it("3. ESCALADE → REQUALIFIER → EN_ATTENTE", () => {
    const r = appliquer(etat("ESCALADE", { nbRelances: 3, categorie: "COMMERCIAL", responsable: "u-1", echeance: J("2026-09-08T17:10:00Z") }), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.equal(r.etat.statut, "EN_ATTENTE");
    assert.equal(r.etat.nbRelances, 0);
  });

  it("4. changement catégorie", () => {
    const r = appliquer(enAttente({ categorie: "COMMERCIAL" }), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.equal(r.etat.categorie, "ADMIN");
  });

  it("5. changement responsable", () => {
    const r = appliquer(enAttente({ responsable: "u-1" }), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.equal(r.etat.responsable, "u-3");
  });

  it("6. recalcul échéance", () => {
    const r = appliquer(enAttente({ echeance: J("2026-09-08T17:10:00Z") }), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.equal(r.etat.echeance?.toISOString(), J("2026-09-10T08:00:00Z").toISOString());
  });

  it("7. gestion du TravailPlanifie (annulation + replanification)", () => {
    const r = appliquer(enAttente(), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.ok(aEffet(r.effets, "ANNULER_TRAVAUX"), "les travaux doivent être annulés");
    const p = planifications(r.effets);
    assert.equal(p.length, 1, "une nouvelle relance doit être planifiée");
    assert.equal(p[0].travail, "RELANCE");
    assert.equal(p[0].ordre, 1);
  });

  it("8. gestion des Relance (conservation historique)", () => {
    const r = appliquer(etat("RELANCE", { nbRelances: 2 }), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.equal(r.etat.nbRelances, 0, "le compteur est remis à 0 pour redémarrer le cycle");
    assert.ok(aEffet(r.effets, "ANNULER_TRAVAUX"), "les travaux futurs sont annulés");
  });

  it("9. création événement MAIL_REQUALIFIE", () => {
    const r = appliquer(enAttente(), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    const journalisations = r.effets.filter((e) => e.type === "JOURNALISER");
    assert.ok(journalisations.some((j) => j.evenement === "MAIL_REQUALIFIE"));
  });

  it("10. conservation de l'historique (événements MAIL_ATTRIBUE)", () => {
    const r = appliquer(enAttente(), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    const journalisations = r.effets.filter((e) => e.type === "JOURNALISER");
    assert.ok(journalisations.some((j) => j.evenement === "MAIL_ATTRIBUE"));
    assert.ok(journalisations.some((j) => j.evenement === "MAIL_REQUALIFIE"));
  });

  it("11. refus depuis un état non autorisé", () => {
    assert.throws(
      () =>
        appliquer(etat("A_QUALIFIER"), {
          type: "REQUALIFIER",
          categorie: "ADMIN",
          responsable: "u-3",
          echeance: J("2026-09-10T08:00:00Z"),
          premiereRelance: J("2026-09-10T08:00:00Z"),
        }),
      TransitionInterdite
    );
    assert.throws(
      () =>
        appliquer(etat("REPONDU"), {
          type: "REQUALIFIER",
          categorie: "ADMIN",
          responsable: "u-3",
          echeance: J("2026-09-10T08:00:00Z"),
          premiereRelance: J("2026-09-10T08:00:00Z"),
        }),
      TransitionInterdite
    );
  });

  it("12. idempotence (requalification identique)", () => {
    const depart = enAttente({ categorie: "ADMIN", responsable: "u-3", echeance: J("2026-09-10T08:00:00Z") });
    const r = appliquer(depart, {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    assert.equal(r.etat.categorie, "ADMIN");
    assert.equal(r.etat.responsable, "u-3");
  });

  it("13. absence de doublons", () => {
    const r = appliquer(enAttente(), {
      type: "REQUALIFIER",
      categorie: "ADMIN",
      responsable: "u-3",
      echeance: J("2026-09-10T08:00:00Z"),
      premiereRelance: J("2026-09-10T08:00:00Z"),
    });
    const p = planifications(r.effets);
    assert.equal(p.length, 1, "une seule relance planifiée");
    assert.equal(p[0].ordre, 1);
  });

  it("14. transaction atomique en cas d'erreur (exige catégorie non vide)", () => {
    assert.throws(
      () =>
        appliquer(enAttente(), {
          type: "REQUALIFIER",
          categorie: "  ",
          responsable: "u-3",
          echeance: J("2026-09-10T08:00:00Z"),
          premiereRelance: J("2026-09-10T08:00:00Z"),
        }),
      TransitionIncomplete
    );
  });
});
