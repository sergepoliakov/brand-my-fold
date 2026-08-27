# Brand My Fold

An open-source, Apple-inspired auction experience for ten measured advertising placements on a foldable-device shell. Built by [@sergepoliakov](https://github.com/sergepoliakov).

This repository is the public, wallet-free source distribution. It includes the complete interface, bilingual copy, placement mapping, interactive globe, local bidding flow, Cloudflare Worker architecture and on-chain payment verification code. Launch operators inject receiving addresses and service secrets through their own Cloudflare runtime.

## What is included

- One responsive Apple-style interface in English and Chinese.
- Ten spot IDs mapped to the same physical location in open and folded views.
- One physical-form control for open and folded views, with placement IDs, prices and brand marks kept visible in both states.
- A live MapLibre globe backed by the public USGS M2.5+ GeoJSON feed.
- A/B CTA assignment and event endpoint.
- Cloudflare Worker, D1, Durable Object, R2 and Turnstile integration.
- Owner notifications through a Cloudflare Send Email binding.
- Exact ERC-20, BEP-20 and SPL transfer verification with replay protection.
- Artwork moderation and auditable refund queues; the app stores no signing key.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The public edition uses generated neutral concept art and keeps local bids in the current browser until a Worker runtime is configured.

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

Ethereum and BNB Smart Chain use EVM addresses, so one `0x` receiving address can be used on both networks. Solana uses a separate Base58 address. A payment quote always publishes the selected network, token contract or mint, exact deposit, destination and expiry.

The BNB Smart Chain option verifies the Binance-Peg BSC-USD contract shown in the runtime configuration. Review the asset label and contract again before enabling production payments.

## Public and production separation

The public repository contains no wallet, personal notification address, RPC secret, Turnstile secret or admin token. Production values belong in Cloudflare secrets and environment variables. See [docs/PRODUCTION.md](docs/PRODUCTION.md) and [.dev.vars.example](.dev.vars.example).

## Inspiration and independence

The campaign mechanic and visual ambition were inspired by Vincent's [BrandMyMac](https://brandmymac.com/) launch. This implementation is independently written and uses its own component, auction and payment architecture. It is not affiliated with, endorsed by or sponsored by Apple, BrandMyMac, Tether, Binance, Cloudflare or any showcased brand.

## License

Code and original neutral project assets are available under the [MIT License](LICENSE). Third-party names, trademarks, data and services remain subject to their owners' terms.
