import test from "node:test";
import assert from "node:assert/strict";
import { authorizeAdmin, cleanText, requireSameOrigin, validEmail, validHttpUrl, withSecurityHeaders } from "../cloudflare/security.js";

test("blue path allows same-origin production writes and valid public URLs", () => {
  const request = new Request("https://auction.example/api/waitlist", { headers: { origin: "https://auction.example" } });
  assert.equal(requireSameOrigin(request, { ENVIRONMENT: "production" }), true);
  assert.equal(validEmail("bidder@example.com"), true);
  assert.equal(validHttpUrl("https://example.com/brand"), true);
});

test("red path rejects cross-origin writes, local URLs and control characters", () => {
  const request = new Request("https://auction.example/api/waitlist", { headers: { origin: "https://evil.example" } });
  assert.equal(requireSameOrigin(request, { ENVIRONMENT: "production" }), false);
  assert.equal(validHttpUrl("http://127.0.0.1/admin"), false);
  assert.equal(validHttpUrl("javascript:alert(1)"), false);
  assert.equal(cleanText("safe\u0000\ntext", 30), "safetext");
});

test("admin API requires the exact bearer token", async () => {
  assert.equal(await authorizeAdmin(new Request("https://x.test", { headers: { authorization: "Bearer correct" } }), { ADMIN_TOKEN: "correct" }), true);
  assert.equal(await authorizeAdmin(new Request("https://x.test", { headers: { authorization: "Bearer wrong" } }), { ADMIN_TOKEN: "correct" }), false);
});

test("security headers allow Turnstile while denying framing and sniffing", async () => {
  const response = withSecurityHeaders(new Response("ok"));
  const csp = response.headers.get("content-security-policy");
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /https:\/\/challenges\.cloudflare\.com/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
