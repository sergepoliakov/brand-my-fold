import test from "node:test";
import assert from "node:assert/strict";
import { isEvmAddress, isSolanaAddress, NETWORKS, publicNetworkConfig, toAtomicUnits, verifyEvmTransfer } from "../cloudflare/payment-verifier.js";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const destination = `0x${"1".repeat(40)}`;
const sender = `0x${"2".repeat(40)}`;
const txHash = `0x${"a".repeat(64)}`;
const topic = (address) => `0x${address.slice(2).padStart(64, "0")}`;

function mockRpc(logOverrides = {}, latestBlock = "0x10") {
  const receipt = {
    status: "0x1",
    blockNumber: "0xe",
    logs: [{
      address: NETWORKS.ethereum.tokenContract,
      topics: [TRANSFER_TOPIC, topic(sender), topic(destination)],
      data: `0x${toAtomicUnits("80", 6).toString(16)}`,
      ...logOverrides,
    }],
  };
  return async (_url, init) => {
    const body = JSON.parse(init.body);
    const result = body.method === "eth_getTransactionReceipt" ? receipt : latestBlock;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { headers: { "content-type": "application/json" } });
  };
}

test("EVM and Solana address formats remain separate", () => {
  assert.equal(isEvmAddress(destination), true);
  assert.equal(isSolanaAddress(destination), false);
  assert.equal(isSolanaAddress(NETWORKS.solana.tokenContract), true);
});

test("Ethereum and BSC can share one EVM destination while Solana stays disabled", () => {
  const networks = publicNetworkConfig({ PAYMENTS_LIVE: "true", USDT_EVM_ADDRESS: destination, USDT_SOLANA_ADDRESS: "" });
  assert.equal(networks.find((item) => item.id === "ethereum").enabled, true);
  assert.equal(networks.find((item) => item.id === "bsc").destination, destination);
  assert.equal(networks.find((item) => item.id === "solana").enabled, false);
  assert.equal(networks.find((item) => item.id === "solana").destination, null);
});

test("atomic unit conversion is exact for both supported decimal models", () => {
  assert.equal(toAtomicUnits("80.25", 6), 80250000n);
  assert.equal(toAtomicUnits("80.25", 18), 80250000000000000000n);
  assert.throws(() => toAtomicUnits("0.0000001", 6), /too_many_decimals/);
});

test("EVM verifier accepts only the exact confirmed token transfer", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = mockRpc();
  const proof = await verifyEvmTransfer({ env: { ETHEREUM_CONFIRMATIONS: "3" }, network: "ethereum", txHash, destination, amount: "80" });
  assert.equal(proof.from, sender);
  assert.equal(proof.confirmations, 3);

  globalThis.fetch = mockRpc({ address: `0x${"3".repeat(40)}` });
  await assert.rejects(() => verifyEvmTransfer({ env: {}, network: "ethereum", txHash, destination, amount: "80" }), /matching_transfer_not_found/);

  globalThis.fetch = mockRpc({}, "0xf");
  await assert.rejects(() => verifyEvmTransfer({ env: { ETHEREUM_CONFIRMATIONS: "3" }, network: "ethereum", txHash, destination, amount: "80" }), /confirmations_2_of_3/);
});
