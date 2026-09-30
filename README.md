# PayoutLens

Read-only Solana payout reconciliation. A narrative landing page at `/` explains the problem and trust model; the working application is at `/app/`. No synthetic transactions, fixture shortcuts or invented customer data are included in the application.

## Live website

- [Project website](https://payoutlens-ahmet-2026.aahmetggungor.chatgpt.site/)
- [Open the working application](https://payoutlens-ahmet-2026.aahmetggungor.chatgpt.site/app/)

The published site is publicly accessible. No wallet connection is required. Live payment checks need internet. To install the web app on your phone, open the application link in your phone browser and follow the installation help.

## Run locally and build

Node 24+, no dependency installation required for running or building. `npm start` serves the application and its restricted RPC proxy at http://127.0.0.1:4317 on your own computer only; this is not the published website address. `npm test` runs 44 deterministic tests. `npm run build` embeds 16 public routes in `dist/server/index.js`, a Cloudflare-compatible ESM Worker with a callable default `fetch`. The published website uses Sites hosting; account-specific hosting configuration is not included in this GitHub repository.

## Installable web app

The workspace includes a scoped web app manifest, standalone launch, 192/512px PNG icons and a 180px Apple touch icon, installation help and a browser-native install button when `beforeinstallprompt` is available. Open the published application link above in a normal phone browser, not an embedded preview. Android Chrome: use Install app or the browser menu. iPhone/iPad Safari: Share → Add to Home Screen; enable Open as Web App if offered. Real handset installation is not verified from this desktop environment.

The service worker caches only an identified, non-sensitive offline notice. It never caches RPC data, inspection results, CSV inputs, the application HTML or authentication redirects. Payment checks remain network-only and reject known-offline requests. Browser cache storage is used only for that local notice, not as a payment database. A standalone launch uses the same backend and verification rules as the website; this is not an App Store/Play Store release.

Icons are committed build inputs rasterized from the existing SVG favicon. To regenerate after a brand change, run `node scripts/make-icons.mjs <path-to-installed-sharp>`; no icon-generation dependency is needed in production.

## Working flows

- Single-payment lookup: recipient wallet, exact legacy SPL mint, amount and transaction signature (or official explorer URL).
- Finalized live transaction read and network genesis-hash check. Supports legacy, v0 and v1 transaction responses; unsupported instructions still fail closed.
- BigInt comparison of explicit token-transfer credits against net owned-account balances. Exact, partial, overpaid, mismatch, failed, not-found and manual-review states.
- Optional reference-account presence and earliest-payment cutoff.
- Local CSV reconciliation: 1–50 rows, 100 KB, unique payout IDs. Required columns `payout_id,recipient,mint,amount,signature`; optional `not_before,reference`. Timestamps must include an ISO timezone.
- Duplicate detection marks every row reusing signature + recipient + mint within the current list. One signature paying different recipients is allowed. Duplicate flags never automatically close a payout.
- Cancellable batch progress, evidence JSON and spreadsheet-safe CSV reports. Failed reads produce no payment conclusion.

## Data path and privacy

Browser → same-origin `/api/rpc` → official Solana mainnet/devnet RPC. The server accepts only `getGenesisHash` and `getTransaction`; it reconstructs the finalized configuration, rejects other methods, blocks cross-origin browser calls and caps request bodies at 2 KB. It cannot send a transaction or accept an arbitrary RPC endpoint.

Expectations, uploaded CSVs and report construction stay in the browser. Only signatures and network-read requests reach the application server/RPC. Finalized RPC results may be kept in an ephemeral, bounded 60-second in-memory cache (200 entries); there is no application database, analytics, wallet signing or durable payment storage. Hosting and RPC providers can observe connection metadata. The landing page uses Google Fonts; the workspace uses system fonts. The published site is public; the product creates no separate account.

## Trust boundaries

This is a working narrow-scope reconciliation tool, not a payment processor, audited financial system, signed receipt issuer or completed competition entry. A single-provider RPC response plus genesis identity is not independent cryptographic proof. A transfer match does not prove payer identity, token value, obligation, invoice authenticity, award legitimacy or allocation across old reports. Reference presence alone is not issuer authentication.

Simple legacy SPL transfers are supported. Token-2022, swaps, custom programs, unsupported token instructions, balance-only credits and ownership changes require manual review. Public RPC has rate limits and no production SLA; an unavailable provider yields an error, never a successful payment status. An authenticated dedicated RPC, distributed request limits, independent-provider comparison and external security review are still needed for a high-volume public service. No automatic invoice closure is implemented.

## Verification

44 deterministic tests cover amount precision, transfer/balance agreement, unsupported instructions, references, dates, CSV parsing/limits, duplicate grouping, export escaping, network/signature provenance, proxy restrictions, manifest/icon dimensions and offline-cache isolation. Tests using constructed transaction data are isolated in `tests/`, not offered as real payments.

A public mainnet USDC transfer was read and matched through the local browser → server → RPC path on 30 September 2026:

- Signature: `45Juoq54owC3dgh8yzioqD2xtAP2uzbB6TAMupTLzNWp8CGsz7tjtot5eT8DGLxr17E1dz4XanssUehtoLCNrXn6`
- Recipient: `EBk7pSomiBbHe21WFEWGN6UvkXPrAyymNm95gjiEAKwq`
- Mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Received: `0.047839`; slot `451824783`.

This is a public integration-test transaction, not the user's payment, a customer testimonial or a bounty award. No money was moved for testing.

## Primary documentation

- [Solana getTransaction](https://solana.com/docs/rpc/http/gettransaction)
- [RPC JSON structures, including transaction v1](https://solana.com/docs/rpc/json-structures)
- [Public cluster availability and limits](https://solana.com/docs/references/clusters)

Demand, monetization and competition eligibility remain separate validation tasks; see PROJECT_PLAN.md.

