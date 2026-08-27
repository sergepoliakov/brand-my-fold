import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare/index.js";

const evm = `0x${"4".repeat(40)}`;

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
