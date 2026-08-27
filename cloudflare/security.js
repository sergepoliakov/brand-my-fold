const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  for (const [key, value] of Object.entries(JSON_HEADERS)) if (!headers.has(key)) headers.set(key, value);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function withSecurityHeaders(response) {
  const next = new Response(response.body, response);
  next.headers.set("x-content-type-options", "nosniff");
  next.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  next.headers.set("strict-transport-security", "max-age=31536000");
  next.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(self), payment=()");
  next.headers.set("x-frame-options", "DENY");
  next.headers.set(
    "content-security-policy",
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.openfreemap.org; connect-src 'self' https://earthquake.usgs.gov https://*.openfreemap.org https://challenges.cloudflare.com wss:; worker-src 'self' blob:; font-src 'self' data:",
  );
  return next;
}

export function requireSameOrigin(request, env) {
  if (env.ENVIRONMENT !== "production") return true;
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function verifyTurnstile(request, env, token) {
  if (env.ENVIRONMENT !== "production") return { success: true, bypassed: true };
  if (!env.TURNSTILE_SECRET_KEY) return { success: false, reason: "turnstile_not_configured" };
  if (!token) return { success: false, reason: "turnstile_required" };
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return { success: false, reason: "turnstile_unavailable" };
  const result = await response.json();
  return result.success ? { success: true } : { success: false, reason: "turnstile_rejected" };
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim()) && String(value).length <= 254;
}

export function cleanText(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

export function validHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function hashToken(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function authorizeAdmin(request, env) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!env.ADMIN_TOKEN || !supplied) return false;
  const encoder = new TextEncoder();
  const [suppliedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(env.ADMIN_TOKEN)),
  ]);
  if (typeof crypto.subtle.timingSafeEqual === "function") return crypto.subtle.timingSafeEqual(suppliedHash, expectedHash);
  const suppliedBytes = new Uint8Array(suppliedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < suppliedBytes.length; index += 1) difference |= suppliedBytes[index] ^ expectedBytes[index];
  return difference === 0;
}
