# Architecture

## Request flow

1. Static React assets are served by a Cloudflare Worker.
2. D1 stores auction, bid, payment, waitlist, conversion-event and audit records.
3. One Durable Object serializes quote and commit decisions for all ten spots and broadcasts verified state over WebSocket.
4. R2 stores PNG, JPEG and WebP artwork; the public auction payload exposes an artwork key only after moderation approval.
5. Turnstile and same-origin checks protect public write endpoints.
6. Network-specific RPC verification proves the exact destination, token contract or mint, amount, success and confirmation state.

## Bid state model

`awaiting_payment` → `leading` → `outbid_refund_pending`

Additional terminal review states include `refund_pending` and `rejected_refund_pending`. Refund execution is an operator action so the application never needs custody of a signing key.

## Public/private boundary

The source tree accepts runtime configuration through Cloudflare bindings. A public clone keeps payments off and neutral assets active. A production checkout sets the edition at build time and injects wallet and secrets only at deployment.
