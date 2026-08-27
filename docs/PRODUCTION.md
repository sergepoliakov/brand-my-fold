# Production deployment checklist

Production activation is deliberately multi-step.

1. Create a private Cloudflare D1 database and R2 bucket.
2. Copy `wrangler.example.jsonc` to the ignored `wrangler.jsonc`; insert real resource IDs.
3. Set `ENVIRONMENT=production`, `SITE_EDITION=production` and keep `PAYMENTS_LIVE=false`.
4. Add the EVM receiving address, RPC endpoints, Turnstile keys and a high-entropy admin token through Cloudflare secrets or protected environment variables.
5. Add a verified notification destination, configure the `EMAIL` binding, and set `NOTIFICATION_TO` and `NOTIFICATION_FROM` outside version control. Test delivery through `POST /api/admin/notifications/test` with the admin bearer token.
6. Add a separate Base58 Solana receiving address before enabling the Solana option.
7. Apply D1 migrations, deploy, and test health, config, quote, upload, verification, moderation, WebSocket and refund-queue paths.
8. Independently verify every displayed token contract and receiving address on each network.
9. Turn `PAYMENTS_LIVE=true` only after a small-value mainnet transfer completes the full flow on each enabled network.

Never add a signing private key, seed phrase or recovery phrase. Refunds are read from `/api/admin/refunds` and signed in an independently secured wallet workflow.
