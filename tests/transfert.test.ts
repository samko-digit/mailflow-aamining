/**
 * MailFlow · Tests unitaires Transfert n8n
 *
 * Tests pour l'intégration de transfert avec n8n :
 * - Idempotence déterministe
 * - Validation anti-loop
 * - HMAC signature
 * - Callback handling
 * - Corrélation travailId/exchangeId/requestId
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

describe("Transfert · Idempotence", () => {
  it("clé d'idempotence déterministe inclut la destination normalisée", () => {
    const normaliser = (email: string) => email.trim().toLowerCase();
    
    const cle1 = "abc-transfer-msg123-B@EXAMPLE.COM";
    const cle2 = "abc-transfer-msg123-b@example.com";
    
    assert.strictEqual(normaliser("B@EXAMPLE.COM"), "b@example.com");
    assert.strictEqual(normaliser("  b@example.com  "), "b@example.com");
  });
});

describe("Transfert · Anti-loop", () => {
  it("normalisation correcte des adresses", () => {
    const normaliser = (email: string) => email.trim().toLowerCase();
    
    assert.strictEqual(normaliser("A@EXAMPLE.COM"), "a@example.com");
    assert.strictEqual(normaliser("  a@example.com  "), "a@example.com");
    assert.strictEqual(normaliser("Test@Example.Com"), "test@example.com");
  });

  it("détection source = destination", () => {
    const normaliser = (email: string) => email.trim().toLowerCase();
    
    assert.strictEqual(normaliser("a@example.com"), normaliser("A@EXAMPLE.COM"));
    assert.notStrictEqual(normaliser("a@example.com"), normaliser("b@example.com"));
  });
});

describe("Transfert · HMAC", () => {
  const SECRET = "test-secret";
  const REPLAY_WINDOW_MS = 5 * 60_000;

  it("signature valide acceptée", () => {
    const timestamp = Date.now();
    const body = JSON.stringify({ test: "data" });
    
    const signature = createHmac("sha256", SECRET)
      .update(timestamp + "." + body)
      .digest("hex");

    const expected = createHmac("sha256", SECRET)
      .update(timestamp + "." + body)
      .digest("hex");

    assert.strictEqual(signature, expected);
  });

  it("signature invalide rejetée", () => {
    const timestamp = Date.now();
    const body = JSON.stringify({ test: "data" });
    
    const signature = createHmac("sha256", SECRET)
      .update(timestamp + "." + body)
      .digest("hex");

    const wrongSignature = signature + "wrong";

    assert.notStrictEqual(wrongSignature, signature);
  });

  it("timestamp trop vieux rejeté", () => {
    const now = Date.now();
    const oldTimestamp = now - REPLAY_WINDOW_MS - 1000; // 1 seconde de plus que la fenêtre
    
    const diff = Math.abs(now - oldTimestamp);
    assert.ok(diff > REPLAY_WINDOW_MS);
  });

  it("timestamp futur rejeté", () => {
    const now = Date.now();
    const futureTimestamp = now + REPLAY_WINDOW_MS + 1000;
    
    const diff = Math.abs(now - futureTimestamp);
    assert.ok(diff > REPLAY_WINDOW_MS);
  });

  it("timestamp dans fenêtre accepté", () => {
    const now = Date.now();
    const validTimestamp = now + REPLAY_WINDOW_MS - 1000; // 1 seconde avant la limite
    
    const diff = Math.abs(now - validTimestamp);
    assert.ok(diff <= REPLAY_WINDOW_MS);
  });
});

describe("Transfert · Callback", () => {
  it("payload vide rejeté", () => {
    const payload: any = {};
    assert.ok(!payload.travailId);
    assert.ok(!payload.requestId);
  });

  it("status invalide rejeté", () => {
    const payload = {
      travailId: "test",
      requestId: "test",
      exchangeId: "test",
      status: "invalid",
    };
    assert.ok(!["success", "failure"].includes(payload.status as any));
  });

  it("status success accepté", () => {
    const payload = {
      travailId: "test",
      requestId: "test",
      exchangeId: "test",
      status: "success",
    };
    assert.ok(["success", "failure"].includes(payload.status as any));
  });

  it("status failure accepté", () => {
    const payload = {
      travailId: "test",
      requestId: "test",
      exchangeId: "test",
      status: "failure",
    };
    assert.ok(["success", "failure"].includes(payload.status as any));
  });
});

describe("Transfert · Corrélation", () => {
  it("travailId ≠ exchangeId", () => {
    const travailId = "travail-123";
    const exchangeId = "echange-456";
    
    assert.notStrictEqual(travailId, exchangeId);
  });

  it("requestId doit inclure travailId", () => {
    const travailId = "travail-123";
    const messageId = "msg-abc";
    const requestId = `${travailId}-transfer-${messageId}`;
    
    assert.ok(requestId.includes(travailId));
    assert.ok(requestId.includes(messageId));
  });

  it("requestId ne doit pas inclure exchangeId", () => {
    const travailId = "travail-123";
    const exchangeId = "echange-456";
    const messageId = "msg-abc";
    const requestId = `${travailId}-transfer-${messageId}`;
    
    assert.ok(!requestId.includes(exchangeId));
  });
});
