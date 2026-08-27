import { destinationFor, NETWORKS, publicNetworkConfig, verifyPayment } from "./payment-verifier.js";
import { authorizeAdmin, cleanText, hashToken, json, requireSameOrigin, validEmail, validHttpUrl, verifyTurnstile, withSecurityHeaders } from "./security.js";

const STARTING_PRICES = [400, 400, 400, 125, 125, 125, 125, 200, 200, 200];
const SPOT_NAMES = [
  ["Upper left", "左上位"], ["Marquee", "主视觉位"], ["Upper right", "右上位"],
  ["Middle left", "中部左侧"], ["Inner left", "内侧左位"], ["Inner right", "内侧右位"], ["Middle right", "中部右侧"],
  ["Bottom left", "底部左侧位"], ["Bottom center", "底部中间位"], ["Bottom right", "底部右侧位"],
];

function nowIso() {
  return new Date().toISOString();
}

function notificationFields(fields) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `${label}: ${cleanText(value, 500)}`)
    .join("\n");
}

async function notifyOwner(env, event, fields = {}) {
  if (!env.EMAIL || !validEmail(env.NOTIFICATION_TO) || !validEmail(env.NOTIFICATION_FROM)) {
    return { sent: false, reason: "notification_not_configured" };
  }
  try {
    const result = await env.EMAIL.send({
      to: env.NOTIFICATION_TO,
      from: { name: "Brand My Fold", email: env.NOTIFICATION_FROM },
      subject: `Brand My Fold: ${event}`,
      text: `${event}\n\n${notificationFields(fields)}\n\nOpen the admin API to review the authoritative record.`,
    });
    console.log(JSON.stringify({ event: "notification_sent", notification: event, messageId: result.messageId }));
    return { sent: true, messageId: result.messageId };
  } catch (error) {
    console.error(JSON.stringify({ event: "notification_failed", notification: event, code: error?.code || "unknown" }));
    return { sent: false, reason: error?.code || "notification_failed" };
  }
}

function scheduleNotification(ctx, promise) {
  if (ctx?.waitUntil) {
    ctx.waitUntil(promise);
    return;
  }
  void promise;
}

async function ensureSeedSpots(db) {
  const count = await db.prepare("SELECT COUNT(*) AS count FROM spots").first();
  if (Number(count?.count || 0) > 0) return;
  await db.batch(STARTING_PRICES.map((price, index) => db.prepare(
    "INSERT OR IGNORE INTO spots (id, name_en, name_zh, starting_price_usdt, current_price_usdt, bid_count) VALUES (?, ?, ?, ?, ?, 0)",
  ).bind(index + 1, SPOT_NAMES[index][0], SPOT_NAMES[index][1], price, price)));
}

async function auctionPayload(env) {
  await ensureSeedSpots(env.DB);
  const { results } = await env.DB.prepare(`
    SELECT s.id, s.name_en, s.name_zh, s.starting_price_usdt, s.current_price_usdt, s.bid_count,
           b.brand, b.website, CASE WHEN b.artwork_approved = 1 THEN b.artwork_key ELSE NULL END AS artwork_key,
           b.artwork_approved, b.id AS leading_bid_id
      FROM spots s
      LEFT JOIN bids b ON b.id = s.leading_bid_id
     ORDER BY s.id
  `).all();
  const state = await env.DB.prepare("SELECT ends_at, status, updated_at FROM auctions WHERE id = 'main'").first();
  return {
    status: state?.status || "preview",
    endsAt: state?.ends_at || null,
    updatedAt: state?.updated_at || nowIso(),
    spots: results.map((spot) => ({
      id: spot.id,
      amount: Number(spot.current_price_usdt),
      startingPrice: Number(spot.starting_price_usdt),
      bids: Number(spot.bid_count),
      brand: spot.brand || "",
      url: spot.website || "",
      customLogo: spot.artwork_key ? `/api/assets/${encodeURIComponent(spot.artwork_key)}` : "",
      leadingBidId: spot.leading_bid_id || null,
    })),
  };
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Error("json_required");
  return request.json();
}

function validateBid(body, networks) {
  const spotId = Number(body.spotId);
  const amount = Number(body.amount);
  const network = networks.find((item) => item.id === body.network && item.enabled);
  if (!Number.isInteger(spotId) || spotId < 1 || spotId > 10) return "invalid_spot";
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) return "invalid_amount";
  if (!network) return "payment_network_unavailable";
  if (!cleanText(body.brand, 80)) return "brand_required";
  if (!validEmail(body.email)) return "invalid_email";
  if (!validHttpUrl(body.website)) return "invalid_website";
  return null;
}

async function postWaitlist(request, env, ctx) {
  if (!requireSameOrigin(request, env)) return json({ error: "invalid_origin" }, { status: 403 });
  const body = await readBody(request);
  const challenge = await verifyTurnstile(request, env, body.turnstileToken);
  if (!challenge.success) return json({ error: challenge.reason }, { status: 403 });
  if (!validEmail(body.email)) return json({ error: "invalid_email" }, { status: 400 });
  const email = cleanText(body.email, 254).toLowerCase();
  const handle = cleanText(body.handle, 80);
  await env.DB.prepare("INSERT OR IGNORE INTO waitlist (email, x_handle, created_at) VALUES (?, ?, ?)").bind(email, handle, nowIso()).run();
  scheduleNotification(ctx, notifyOwner(env, "new waitlist signup", { Email: email, "X handle": handle }));
  return json({ ok: true }, { status: 201 });
}

async function postExperiment(request, env) {
  if (!requireSameOrigin(request, env)) return json({ error: "invalid_origin" }, { status: 403 });
  const body = await readBody(request);
  const variant = ["a", "b"].includes(body.variant) ? body.variant : null;
  const event = ["view", "cta", "bid_open", "quote_created"].includes(body.event) ? body.event : null;
  if (!variant || !event) return json({ error: "invalid_experiment_event" }, { status: 400 });
  await env.DB.prepare("INSERT INTO experiment_events (variant, event_name, anonymous_id, created_at) VALUES (?, ?, ?, ?)")
    .bind(variant, event, cleanText(body.anonymousId, 80), nowIso()).run();
  return json({ ok: true }, { status: 201 });
}

async function uploadArtwork(request, env, bidId) {
  if (!requireSameOrigin(request, env)) return json({ error: "invalid_origin" }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  const token = cleanText(form.get("uploadToken"), 200);
  if (!(file instanceof File)) return json({ error: "file_required" }, { status: 400 });
  if (!token) return json({ error: "upload_token_required" }, { status: 403 });
  if (file.size > 1_000_000) return json({ error: "file_too_large" }, { status: 413 });
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return json({ error: "unsupported_file_type" }, { status: 415 });
  const bid = await env.DB.prepare("SELECT id, upload_token_hash FROM bids WHERE id = ?").bind(bidId).first();
  if (!bid || await hashToken(token) !== bid.upload_token_hash) return json({ error: "invalid_upload_token" }, { status: 403 });
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[file.type];
  const key = `artwork/${bidId}.${extension}`;
  await env.ARTWORK.put(key, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { bidId } });
  await env.DB.prepare("UPDATE bids SET artwork_key = ? WHERE id = ?").bind(key, bidId).run();
  return json({ ok: true, artworkKey: key }, { status: 201 });
}

async function getArtwork(env, key) {
  if (!key.startsWith("artwork/")) return new Response("Not found", { status: 404 });
  const object = await env.ARTWORK.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=3600");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}

async function postVerifyPayment(request, env) {
  if (!requireSameOrigin(request, env)) return json({ error: "invalid_origin" }, { status: 403 });
  const body = await readBody(request);
  const bidId = cleanText(body.bidId, 80);
  const txHash = cleanText(body.txHash, 120);
  const bid = await env.DB.prepare("SELECT id, network, deposit_usdt, status FROM bids WHERE id = ?").bind(bidId).first();
  if (!bid) return json({ error: "bid_not_found" }, { status: 404 });
  if (bid.status !== "awaiting_payment") return json({ error: "bid_not_payable" }, { status: 409 });
  const duplicate = await env.DB.prepare("SELECT bid_id FROM payments WHERE tx_hash = ?").bind(txHash).first();
  if (duplicate) return json({ error: "transaction_already_used" }, { status: 409 });
  const destination = destinationFor(env, bid.network);
  let proof;
  try {
    proof = await verifyPayment({ env, network: bid.network, txHash, destination, amount: bid.deposit_usdt });
  } catch (error) {
    return json({ error: "payment_not_verified", reason: error.message }, { status: 422 });
  }
  const room = roomFor(env);
  const response = await room.fetch("https://auction.internal/commit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bidId, txHash, proof }),
  });
  return new Response(response.body, response);
}

async function adminRefunds(request, env) {
  if (!authorizeAdmin(request, env)) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(`
    SELECT b.id, b.spot_id, b.brand, b.email, b.amount_usdt, b.deposit_usdt, b.network,
           b.tx_hash, b.status, p.sender_address, b.created_at
      FROM bids b LEFT JOIN payments p ON p.bid_id = b.id
     WHERE b.status IN ('outbid_refund_pending', 'refund_pending', 'rejected_refund_pending')
     ORDER BY b.created_at ASC
  `).all();
  return json({ refunds: results });
}

async function adminSubmissions(request, env) {
  if (!authorizeAdmin(request, env)) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(`
    SELECT id, spot_id, brand, email, website, x_handle, artwork_key, artwork_approved,
           amount_usdt, network, status, created_at
      FROM bids
     WHERE status = 'leading'
     ORDER BY created_at ASC
  `).all();
  return json({ submissions: results });
}

async function adminNotificationTest(request, env) {
  if (!await authorizeAdmin(request, env)) return json({ error: "unauthorized" }, { status: 401 });
  const result = await notifyOwner(env, "production notification test", { Environment: env.ENVIRONMENT || "unknown" });
  return result.sent ? json({ ok: true, messageId: result.messageId }, { status: 201 }) : json({ error: result.reason }, { status: 503 });
}

function roomFor(env) {
  const id = env.AUCTION_ROOM.idFromName("main");
  return env.AUCTION_ROOM.get(id);
}

export class AuctionRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/events" && request.headers.get("upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      server.send(JSON.stringify({ type: "auction", payload: await auctionPayload(this.env) }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === "/quote" && request.method === "POST") return this.quote(await request.json());
    if (url.pathname === "/commit" && request.method === "POST") return this.commit(await request.json());
    if (url.pathname === "/moderate" && request.method === "POST") return this.moderate(await request.json());
    return json({ error: "not_found" }, { status: 404 });
  }

  async quote(body) {
    await ensureSeedSpots(this.env.DB);
    const networks = publicNetworkConfig(this.env);
    const invalid = validateBid(body, networks);
    if (invalid) return json({ error: invalid }, { status: 400 });
    const spot = await this.env.DB.prepare("SELECT id, current_price_usdt, bid_count FROM spots WHERE id = ?").bind(Number(body.spotId)).first();
    if (!spot) return json({ error: "spot_not_found" }, { status: 404 });
    const minimum = Number(spot.current_price_usdt) + (Number(spot.bid_count) > 0 ? 10 : 0);
    const amount = Number(body.amount);
    if (amount < minimum) return json({ error: "bid_too_low", minimum }, { status: 409 });
    const id = crypto.randomUUID();
    const uploadToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const uploadTokenHash = await hashToken(uploadToken);
    const deposit = Math.max(10, Math.ceil(amount * 20) / 100);
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    await this.env.DB.prepare(`
      INSERT INTO bids (id, spot_id, amount_usdt, deposit_usdt, brand, email, website, x_handle, network, status, upload_token_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', ?, ?, ?)
    `).bind(
      id, Number(body.spotId), amount, deposit, cleanText(body.brand, 80), cleanText(body.email, 254).toLowerCase(),
      cleanText(body.website, 300), cleanText(body.handle, 80), body.network, uploadTokenHash, createdAt, expiresAt,
    ).run();
    const network = networks.find((item) => item.id === body.network);
    this.state.waitUntil(notifyOwner(this.env, "new bid quote", {
      "Bid ID": id,
      Spot: body.spotId,
      Brand: body.brand,
      Email: body.email,
      "Bid amount": `${amount} USDT`,
      Deposit: `${deposit} USDT`,
      Network: body.network,
      Expires: expiresAt,
    }));
    return json({
      id,
      status: "awaiting_payment",
      expiresAt,
      uploadToken,
      payment: { network: network.id, label: network.label, standard: network.standard, asset: network.asset, amount: deposit, destination: network.destination, tokenContract: network.tokenContract, explorer: network.explorer },
    }, { status: 201 });
  }

  async moderate({ bidId, decision }) {
    if (!["approve", "reject"].includes(decision)) return json({ error: "invalid_decision" }, { status: 400 });
    const bid = await this.env.DB.prepare("SELECT * FROM bids WHERE id = ?").bind(bidId).first();
    if (!bid || bid.status !== "leading") return json({ error: "submission_not_reviewable" }, { status: 409 });
    if (decision === "approve") {
      await this.env.DB.prepare("UPDATE bids SET artwork_approved = 1 WHERE id = ?").bind(bidId).run();
    } else {
      await this.env.DB.batch([
        this.env.DB.prepare("UPDATE bids SET status = 'rejected_refund_pending', artwork_approved = 0 WHERE id = ?").bind(bidId),
        this.env.DB.prepare("UPDATE spots SET current_price_usdt = starting_price_usdt, bid_count = 0, leading_bid_id = NULL, updated_at = ? WHERE leading_bid_id = ?").bind(nowIso(), bidId),
        this.env.DB.prepare("INSERT INTO audit_events (event_type, entity_id, payload_json, created_at) VALUES ('submission_rejected', ?, '{}', ?)").bind(bidId, nowIso()),
      ]);
    }
    const payload = await auctionPayload(this.env);
    for (const socket of this.state.getWebSockets()) {
      try { socket.send(JSON.stringify({ type: "auction", payload })); } catch { socket.close(1011, "broadcast_failed"); }
    }
    return json({ ok: true, decision, auction: payload });
  }

  async commit({ bidId, txHash, proof }) {
    const bid = await this.env.DB.prepare("SELECT * FROM bids WHERE id = ?").bind(bidId).first();
    if (!bid || bid.status !== "awaiting_payment") return json({ error: "bid_not_committable" }, { status: 409 });
    if (new Date(bid.expires_at).getTime() < Date.now()) {
      await this.env.DB.prepare("UPDATE bids SET status = 'refund_pending', tx_hash = ? WHERE id = ?").bind(txHash, bidId).run();
      return json({ error: "quote_expired", refundStatus: "refund_pending" }, { status: 409 });
    }
    const spot = await this.env.DB.prepare("SELECT * FROM spots WHERE id = ?").bind(bid.spot_id).first();
    const minimum = Number(spot.current_price_usdt) + (Number(spot.bid_count) > 0 ? 10 : 0);
    const paymentInsert = this.env.DB.prepare("INSERT INTO payments (tx_hash, bid_id, network, amount_usdt, sender_address, block_number, verified_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(txHash, bidId, bid.network, bid.deposit_usdt, proof.from || "", proof.blockNumber || null, nowIso());
    if (Number(bid.amount_usdt) < minimum) {
      await this.env.DB.batch([
        paymentInsert,
        this.env.DB.prepare("UPDATE bids SET status = 'refund_pending', tx_hash = ?, paid_at = ? WHERE id = ?").bind(txHash, nowIso(), bidId),
      ]);
      return json({ error: "bid_overtaken_while_paying", minimum, refundStatus: "refund_pending" }, { status: 409 });
    }
    const statements = [paymentInsert];
    if (spot.leading_bid_id) statements.push(this.env.DB.prepare("UPDATE bids SET status = 'outbid_refund_pending' WHERE id = ?").bind(spot.leading_bid_id));
    statements.push(
      this.env.DB.prepare("UPDATE bids SET status = 'leading', tx_hash = ?, paid_at = ? WHERE id = ?").bind(txHash, nowIso(), bidId),
      this.env.DB.prepare("UPDATE spots SET current_price_usdt = ?, bid_count = bid_count + 1, leading_bid_id = ?, updated_at = ? WHERE id = ?")
        .bind(bid.amount_usdt, bidId, nowIso(), bid.spot_id),
      this.env.DB.prepare("UPDATE auctions SET updated_at = ? WHERE id = 'main'").bind(nowIso()),
      this.env.DB.prepare("INSERT INTO audit_events (event_type, entity_id, payload_json, created_at) VALUES ('bid_committed', ?, ?, ?)")
        .bind(bidId, JSON.stringify({ spotId: bid.spot_id, amount: bid.amount_usdt, network: bid.network }), nowIso()),
    );
    await this.env.DB.batch(statements);
    this.state.waitUntil(notifyOwner(this.env, "verified leading bid", {
      "Bid ID": bidId,
      Spot: bid.spot_id,
      Brand: bid.brand,
      Email: bid.email,
      "Bid amount": `${bid.amount_usdt} USDT`,
      Deposit: `${bid.deposit_usdt} USDT`,
      Network: bid.network,
      Transaction: txHash,
    }));
    const payload = await auctionPayload(this.env);
    for (const socket of this.state.getWebSockets()) {
      try { socket.send(JSON.stringify({ type: "auction", payload })); } catch { socket.close(1011, "broadcast_failed"); }
    }
    return json({ ok: true, status: "leading", auction: payload });
  }

  webSocketMessage() {}
  webSocketClose() {}
  webSocketError(socket) { socket.close(1011, "error"); }
}

async function apiFetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === "/api/health") return json({ ok: true, environment: env.ENVIRONMENT || "development" });
  if (url.pathname === "/api/config") return json({
    edition: env.SITE_EDITION || "open-source",
    paymentsLive: env.PAYMENTS_LIVE === "true",
    networks: publicNetworkConfig(env),
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || null,
    auctionCurrency: "USDT",
  });
  if (url.pathname === "/api/auction" && request.method === "GET") return json(await auctionPayload(env));
  if (url.pathname === "/api/auction/live" && request.headers.get("upgrade") === "websocket") return roomFor(env).fetch("https://auction.internal/events", request);
  if (url.pathname === "/api/waitlist" && request.method === "POST") return postWaitlist(request, env, ctx);
  if (url.pathname === "/api/experiments" && request.method === "POST") return postExperiment(request, env);
  if (url.pathname === "/api/bids/quote" && request.method === "POST") {
    if (!requireSameOrigin(request, env)) return json({ error: "invalid_origin" }, { status: 403 });
    const body = await readBody(request);
    const challenge = await verifyTurnstile(request, env, body.turnstileToken);
    if (!challenge.success) return json({ error: challenge.reason }, { status: 403 });
    return roomFor(env).fetch("https://auction.internal/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
  const artworkMatch = url.pathname.match(/^\/api\/bids\/([^/]+)\/artwork$/);
  if (artworkMatch && request.method === "POST") return uploadArtwork(request, env, artworkMatch[1]);
  const assetMatch = url.pathname.match(/^\/api\/assets\/(.+)$/);
  if (assetMatch && request.method === "GET") return getArtwork(env, decodeURIComponent(assetMatch[1]));
  if (url.pathname === "/api/payments/verify" && request.method === "POST") return postVerifyPayment(request, env);
  if (url.pathname === "/api/admin/refunds" && request.method === "GET") return adminRefunds(request, env);
  if (url.pathname === "/api/admin/submissions" && request.method === "GET") return adminSubmissions(request, env);
  if (url.pathname === "/api/admin/notifications/test" && request.method === "POST") return adminNotificationTest(request, env);
  const moderationMatch = url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if (moderationMatch && request.method === "POST") {
    if (!authorizeAdmin(request, env)) return json({ error: "unauthorized" }, { status: 401 });
    const body = await readBody(request);
    return roomFor(env).fetch("https://auction.internal/moderate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bidId: moderationMatch[1], decision: body.decision }) });
  }
  return json({ error: "not_found" }, { status: 404 });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) return withSecurityHeaders(await apiFetch(request, env, ctx));
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    } catch (error) {
      return withSecurityHeaders(json({ error: "internal_error", requestId: request.headers.get("cf-ray") || crypto.randomUUID() }, { status: 500 }));
    }
  },
};
