import test from "node:test";
import assert from "node:assert/strict";
import worker, { classifyTrafficSource } from "../cloudflare/index.js";

const evm = `0x${"4".repeat(40)}`;

test("traffic sources distinguish X, GitHub, search, direct, and referrals", () => {
  assert.equal(classifyTrafficSource("t.co", ""), "X");
  assert.equal(classifyTrafficSource("", "twitter"), "X");
  assert.equal(classifyTrafficSource("github.com", ""), "GitHub");
  assert.equal(classifyTrafficSource("www.google.com", ""), "Search");
  assert.equal(classifyTrafficSource("", ""), "Direct");
  assert.equal(classifyTrafficSource("", "launch-newsletter"), "Campaign");
  assert.equal(classifyTrafficSource("example.com", ""), "Referral");
});

test("public config exposes destinations only when live and valid", async () => {
  const response = await worker.fetch(new Request("https://auction.example/api/config"), {
    ENVIRONMENT: "production",
    SITE_EDITION: "production",
    PAYMENTS_LIVE: "true",
    USDT_EVM_ADDRESS: evm,
    USDT_SOLANA_ADDRESS: "",
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.networks.find((item) => item.id === "ethereum").destination, evm);
  assert.equal(payload.networks.find((item) => item.id === "bsc").destination, evm);
  assert.equal(payload.networks.find((item) => item.id === "solana").enabled, false);
});

test("cross-origin bid creation is rejected before database access", async () => {
  const request = new Request("https://auction.example/api/bids/quote", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
  const response = await worker.fetch(request, { ENVIRONMENT: "production" });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "invalid_origin");
});

test("admin refund data is unavailable without authorization", async () => {
  const response = await worker.fetch(new Request("https://auction.example/api/admin/refunds"), { ENVIRONMENT: "production", ADMIN_TOKEN: "secret" });
  assert.equal(response.status, 401);
});

test("notification test requires admin authorization", async () => {
  const response = await worker.fetch(new Request("https://auction.example/api/admin/notifications/test", { method: "POST" }), { ENVIRONMENT: "production", ADMIN_TOKEN: "secret" });
  assert.equal(response.status, 401);
});

test("notification test uses the email binding without exposing the destination", async () => {
  let delivered;
  const response = await worker.fetch(new Request("https://auction.example/api/admin/notifications/test", {
    method: "POST",
    headers: { authorization: "Bearer secret" },
  }), {
    ENVIRONMENT: "production",
    ADMIN_TOKEN: "secret",
    NOTIFICATION_TO: "owner@example.com",
    NOTIFICATION_FROM: "notifications@example.com",
    EMAIL: { async send(message) { delivered = message; return { messageId: "message-1" }; } },
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).ok, true);
  assert.equal(delivered.to, "owner@example.com");
  assert.equal(delivered.subject, "Brand My Fold: production notification test");
});
