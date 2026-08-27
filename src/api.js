const API_TIMEOUT_MS = 12_000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: options.body instanceof FormData ? options.headers : { "content-type": "application/json", ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `http_${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadRuntimeConfig() {
  try {
    return await request("/api/config");
  } catch {
    return { edition: import.meta.env.VITE_EDITION || "open-source", paymentsLive: false, networks: [], auctionCurrency: "USDT", offline: true };
  }
}

export async function loadAuction() {
  return request("/api/auction");
}

export async function createBidQuote(payload) {
  return request("/api/bids/quote", { method: "POST", body: JSON.stringify(payload) });
}

export async function uploadArtwork(bidId, uploadToken, file) {
  if (!file) return null;
  const form = new FormData();
  form.append("uploadToken", uploadToken);
  form.append("file", file);
  return request(`/api/bids/${encodeURIComponent(bidId)}/artwork`, { method: "POST", body: form });
}

export async function verifyBidPayment(bidId, txHash) {
  return request("/api/payments/verify", { method: "POST", body: JSON.stringify({ bidId, txHash }) });
}

export async function joinWaitlist(payload) {
  return request("/api/waitlist", { method: "POST", body: JSON.stringify(payload) });
}

export async function recordExperiment(variant, event, anonymousId) {
  try {
    await request("/api/experiments", { method: "POST", body: JSON.stringify({ variant, event, anonymousId }), keepalive: true });
  } catch {
    // Analytics never blocks the auction experience.
  }
}

export function subscribeToAuction(onAuction) {
  if (!window.location.host) return () => {};
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  let socket;
  let stopped = false;
  let retry;
  const connect = () => {
    if (stopped) return;
    socket = new WebSocket(`${protocol}//${window.location.host}/api/auction/live`);
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "auction") onAuction(message.payload);
      } catch {
        // Ignore malformed realtime frames and keep the last verified state.
      }
    };
    socket.onclose = () => { if (!stopped) retry = window.setTimeout(connect, 2500); };
    socket.onerror = () => socket.close();
  };
  connect();
  return () => {
    stopped = true;
    window.clearTimeout(retry);
    socket?.close();
  };
}
