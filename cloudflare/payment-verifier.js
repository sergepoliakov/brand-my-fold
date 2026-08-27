const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export const NETWORKS = {
  ethereum: {
    id: "ethereum",
    label: "Ethereum",
    standard: "ERC-20",
    asset: "USDT",
    decimals: 6,
    tokenContract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    explorer: "https://etherscan.io/tx/",
    defaultRpc: "https://cloudflare-eth.com",
  },
  bsc: {
    id: "bsc",
    label: "BNB Smart Chain",
    standard: "BEP-20",
    asset: "BSC-USD",
    displayAsset: "USDT",
    decimals: 18,
    tokenContract: "0x55d398326f99059ff775485246999027b3197955",
    explorer: "https://bscscan.com/tx/",
    defaultRpc: "https://bsc-dataseed.bnbchain.org",
  },
  solana: {
    id: "solana",
    label: "Solana",
    standard: "SPL",
    asset: "USDT",
    decimals: 6,
    tokenContract: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    explorer: "https://explorer.solana.com/tx/",
    defaultRpc: "https://api.mainnet-beta.solana.com",
  },
};

export function isEvmAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || ""));
}

export function isEvmTransactionHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || ""));
}

function decodeBase58(value) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let number = 0n;
  for (const character of value) {
    const index = alphabet.indexOf(character);
    if (index < 0) return null;
    number = number * 58n + BigInt(index);
  }
  const bytes = [];
  while (number > 0n) {
    bytes.unshift(Number(number & 255n));
    number >>= 8n;
  }
  for (const character of value) {
    if (character !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

export function isSolanaAddress(value) {
  const text = String(value || "");
  if (text.length < 32 || text.length > 44) return false;
  return decodeBase58(text)?.length === 32;
}

export function isSolanaSignature(value) {
  const text = String(value || "");
  if (text.length < 80 || text.length > 90) return false;
  return decodeBase58(text)?.length === 64;
}

export function toAtomicUnits(amount, decimals) {
  const text = String(amount).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error("invalid_amount");
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > decimals) throw new Error("too_many_decimals");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
}

function rpcUrl(env, network) {
  if (network === "ethereum") return env.ETHEREUM_RPC_URL || NETWORKS.ethereum.defaultRpc;
  if (network === "bsc") return env.BSC_RPC_URL || NETWORKS.bsc.defaultRpc;
  return env.SOLANA_RPC_URL || NETWORKS.solana.defaultRpc;
}

export function destinationFor(env, network) {
  return network === "solana" ? env.USDT_SOLANA_ADDRESS || "" : env.USDT_EVM_ADDRESS || "";
}

export function publicNetworkConfig(env) {
  return Object.values(NETWORKS).map((network) => {
    const destination = destinationFor(env, network.id);
    const valid = network.id === "solana" ? isSolanaAddress(destination) : isEvmAddress(destination);
    return {
      id: network.id,
      label: network.label,
      standard: network.standard,
      asset: network.displayAsset || network.asset,
      tokenContract: network.tokenContract,
      explorer: network.explorer,
      enabled: env.PAYMENTS_LIVE === "true" && valid,
      destination: env.PAYMENTS_LIVE === "true" && valid ? destination : null,
    };
  });
}

async function rpc(endpoint, method, params) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`rpc_http_${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`rpc_${payload.error.code || "error"}`);
  return payload.result;
}

function addressFromTopic(topic) {
  return `0x${String(topic || "").slice(-40)}`.toLowerCase();
}

export async function verifyEvmTransfer({ env, network, txHash, destination, amount }) {
  const config = NETWORKS[network];
  if (!config || network === "solana") throw new Error("unsupported_network");
  if (!isEvmTransactionHash(txHash)) throw new Error("invalid_transaction_hash");
  if (!isEvmAddress(destination)) throw new Error("invalid_destination");

  const endpoint = rpcUrl(env, network);
  const [receipt, blockHex] = await Promise.all([
    rpc(endpoint, "eth_getTransactionReceipt", [txHash]),
    rpc(endpoint, "eth_blockNumber", []),
  ]);
  if (!receipt) throw new Error("transaction_not_found");
  if (receipt.status !== "0x1") throw new Error("transaction_failed");

  const expectedAtomic = toAtomicUnits(amount, config.decimals);
  const transfer = (receipt.logs || []).find((log) => {
    if (String(log.address).toLowerCase() !== config.tokenContract.toLowerCase()) return false;
    if (String(log.topics?.[0]).toLowerCase() !== TRANSFER_TOPIC) return false;
    if (addressFromTopic(log.topics?.[2]) !== destination.toLowerCase()) return false;
    try {
      return BigInt(log.data) === expectedAtomic;
    } catch {
      return false;
    }
  });
  if (!transfer) throw new Error("matching_transfer_not_found");

  const confirmations = Number(BigInt(blockHex) - BigInt(receipt.blockNumber) + 1n);
  const required = Number(network === "ethereum" ? env.ETHEREUM_CONFIRMATIONS || 3 : env.BSC_CONFIRMATIONS || 12);
  if (confirmations < required) throw new Error(`confirmations_${confirmations}_of_${required}`);

  return {
    network,
    txHash,
    from: addressFromTopic(transfer.topics?.[1]),
    destination: destination.toLowerCase(),
    amount: String(amount),
    confirmations,
    blockNumber: Number(BigInt(receipt.blockNumber)),
  };
}

function tokenDeltaForOwner(transaction, owner, mint) {
  const before = new Map();
  for (const balance of transaction.meta?.preTokenBalances || []) {
    if (balance.owner === owner && balance.mint === mint) before.set(balance.accountIndex, BigInt(balance.uiTokenAmount?.amount || "0"));
  }
  let delta = 0n;
  for (const balance of transaction.meta?.postTokenBalances || []) {
    if (balance.owner !== owner || balance.mint !== mint) continue;
    delta += BigInt(balance.uiTokenAmount?.amount || "0") - (before.get(balance.accountIndex) || 0n);
  }
  return delta;
}

function tokenSenderForTransfer(transaction, receiver, mint, expectedAtomic) {
  const before = new Map();
  for (const balance of transaction.meta?.preTokenBalances || []) {
    if (balance.mint !== mint) continue;
    before.set(balance.accountIndex, { owner: balance.owner || "", amount: BigInt(balance.uiTokenAmount?.amount || "0") });
  }
  for (const balance of transaction.meta?.postTokenBalances || []) {
    if (balance.mint !== mint || balance.owner === receiver) continue;
    const initial = before.get(balance.accountIndex);
    const delta = BigInt(balance.uiTokenAmount?.amount || "0") - (initial?.amount || 0n);
    if (delta === -expectedAtomic) return balance.owner || initial?.owner || "";
  }
  return "";
}

export async function verifySolanaTransfer({ env, txHash, destination, amount }) {
  const config = NETWORKS.solana;
  if (!isSolanaSignature(txHash)) throw new Error("invalid_transaction_hash");
  if (!isSolanaAddress(destination)) throw new Error("invalid_destination");
  const endpoint = rpcUrl(env, "solana");
  const [statusResult, transaction] = await Promise.all([
    rpc(endpoint, "getSignatureStatuses", [[txHash], { searchTransactionHistory: true }]),
    rpc(endpoint, "getTransaction", [txHash, { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 }]),
  ]);
  const status = statusResult?.value?.[0];
  if (!status || !transaction) throw new Error("transaction_not_found");
  if (status.err || transaction.meta?.err) throw new Error("transaction_failed");
  if (status.confirmationStatus !== "finalized") throw new Error("transaction_not_finalized");
  const expectedAtomic = toAtomicUnits(amount, config.decimals);
  const delta = tokenDeltaForOwner(transaction, destination, config.tokenContract);
  if (delta !== expectedAtomic) throw new Error("matching_transfer_not_found");
  const from = tokenSenderForTransfer(transaction, destination, config.tokenContract, expectedAtomic);
  if (!isSolanaAddress(from)) throw new Error("sender_not_identified");
  return {
    network: "solana",
    txHash,
    destination,
    amount: String(amount),
    from,
    confirmations: null,
    blockNumber: transaction.slot,
  };
}

export async function verifyPayment(input) {
  if (input.network === "solana") return verifySolanaTransfer(input);
  return verifyEvmTransfer(input);
}
