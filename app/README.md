# Alliance Passport app

Responsive React product demo for the Alliance Passport coalition loyalty
protocol. The default screen is an operational customer dashboard with merchant
discovery, cross-merchant offers, redemption preview, receipt provenance, and a
deterministic PDA inspector.

## Run locally

```bash
pnpm install
pnpm dev
```

The Vite server prints the local URL. Build and test with:

```bash
pnpm build
pnpm test
pnpm preview
```

## Configure links and network state

Update `src/constants.ts` to change the program ID, cluster state, repository,
program tests, Devnet explorer, and Token-2022 documentation links. Keeping the
public links in this single module prevents stale URLs from leaking into
individual components.

The current UI is deliberately labeled as a Devnet interface demo. Redemption
updates local preview state and never claims to sign or submit a transaction.

## Resilience previews

Use these query parameters while reviewing fallback states:

- `?state=error` renders the RPC error and retry path.
- `?state=empty` renders empty merchant, offer, and activity states.

The default route renders the populated coalition dashboard.
