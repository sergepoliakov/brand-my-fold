# Brand My Fold

An open-source, Apple-inspired auction experience for ten measured advertising placements on a foldable-device shell. Built by [@sergepoliakov](https://github.com/sergepoliakov).

This repository is the public, wallet-free edition. It demonstrates the complete interface, bilingual copy, placement mapping, interactive globe, local bidding flow, Cloudflare Worker architecture and on-chain payment verification code without exposing a receiving wallet or enabling real payments.

## What is included

- One responsive Apple-style interface in English and Chinese.
- Ten spot IDs mapped to the same physical location in open and folded views.
- Two independent display controls: physical form and auction/final layer.
- A live MapLibre globe backed by the public USGS M2.5+ GeoJSON feed.
- A/B CTA assignment and event endpoint.
- Cloudflare Worker, D1, Durable Object, R2 and Turnstile integration.
- Exact ERC-20, BEP-20 and SPL transfer verification with replay protection.
- Artwork moderation and auditable refund queues; the app stores no signing key.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The public edition uses generated neutral concept art and keeps demo bids in the current browser.

Run every automated check:

```bash
npm test
```

Test the Cloudflare runtime locally:

```bash
cp wrangler.example.jsonc wrangler.jsonc
npx wrangler d1 migrations apply brand-my-fold-db --local
npm run cf:dev
```

## Payment network model

Ethereum and BNB Smart Chain use EVM addresses, so one `0x` receiving address can be used on both networks. Solana uses a separate Base58 address and remains disabled until one is configured. A payment quote always publishes the selected network, token contract or mint, exact deposit, destination and expiry.

The BNB Smart Chain option verifies the Binance-Peg BSC-USD contract shown in the runtime configuration. Review the asset label and contract again before enabling production payments.

## Public and production separation

The public repository contains no wallet, RPC secret, Turnstile secret or admin token. Production values belong in Cloudflare secrets and environment variables. See [docs/PRODUCTION.md](docs/PRODUCTION.md) and [.dev.vars.example](.dev.vars.example).

## Inspiration and independence

The campaign mechanic and visual ambition were inspired by Vincent's [BrandMyMac](https://brandmymac.com/) experiment. This implementation is independently written and uses its own component, auction and payment architecture. It is not affiliated with, endorsed by or sponsored by Apple, BrandMyMac, Tether, Binance, Cloudflare or any sample brand.

## License

Code and original neutral project assets are available under the [MIT License](LICENSE). Third-party names, trademarks, data and services remain subject to their owners' terms.
