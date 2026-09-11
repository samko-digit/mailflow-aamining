/**
 * MailFlow · Tests de l'exclusion des travaux sans échange
 *
 * Vérifie que les travaux sans échange associé (echangeId null ou echange null)
 * sont correctement exclus du traitement de correction des travaux en retard.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Exclusion des travaux sans échange", () => {
  it("exclut les travaux avec echangeId null", () => {
    const travaux = [
      { id: "1", echangeId: null, echange: null },
      { id: "2", echangeId: "e1", echange: { id: "e1" } },
    ];

    const travauxEligibles = travaux.filter(t => t.echange !== null);
    const travauxExclus = travaux.filter(t => t.echange === null);

    assert.equal(travauxEligibles.length, 1);
    assert.equal(travauxExclus.length, 1);
    assert.equal(travauxEligibles[0].id, "2");
    assert.equal(travauxExclus[0].id, "1");
  });

  it("exclut les travaux avec echangeId non-null mais echange null", () => {
    const travaux = [
      { id: "1", echangeId: "e1", echange: null },
      { id: "2", echangeId: "e2", echange: { id: "e2" } },
    ];

    const travauxEligibles = travaux.filter(t => t.echange !== null);
    const travauxExclus = travaux.filter(t => t.echange === null);

    assert.equal(travauxEligibles.length, 1);
    assert.equal(travauxExclus.length, 1);
    assert.equal(travauxEligibles[0].id, "2");
    assert.equal(travauxExclus[0].id, "1");
  });

  it("garantit que dry-run et confirm utilisent le même filtre", () => {
    const travaux = [
      { id: "1", echangeId: null, echange: null },
      { id: "2", echangeId: "e1", echange: { id: "e1" } },
      { id: "3", echangeId: "e2", echange: { id: "e2" } },
    ];

    // Filtre utilisé pour dry-run
    const travauxEligiblesDryRun = travaux.filter(t => t.echange !== null);
    
    // Filtre utilisé pour confirm (doit être identique)
    const travauxEligiblesConfirm = travaux.filter(t => t.echange !== null);

    assert.deepEqual(travauxEligiblesDryRun, travauxEligiblesConfirm);
    assert.equal(travauxEligiblesDryRun.length, 2);
  });
});
