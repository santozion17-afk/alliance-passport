# Alliance Passport submission package

> Submission gate: do not submit while any `PENDING` marker remains.

## Project name

Alliance Passport - coalition loyalty that compounds across merchants

## Public links

- Live devnet client: PENDING
- GitHub repository: PENDING
- Solana Explorer program: PENDING
- Initialize coalition transaction: PENDING
- Register merchant transaction: PENDING
- Record purchase transaction: PENDING
- Cross-merchant redemption transaction: PENDING
- Token-2022 badge mint transaction: PENDING

## Submission copy

Alliance Passport turns isolated loyalty programs into a shared merchant
network. Each customer owns a Solana Passport PDA with one points balance that
can be earned at one merchant and redeemed at another. A deterministic receipt
PDA makes each signed purchase idempotent, while a per-merchant visit PDA grows
a network multiplier as the customer explores more of the coalition.

The protocol is deliberately merchant-authenticated: customers cannot mint
points by reporting their own purchases. Offers enforce balance, tier,
redemption caps, and active state on-chain. Achievement badges are real
Token-2022 mints using the NonTransferable extension, so status can be composed
by wallets or partner apps without becoming a tradable asset.

The included client makes the protocol inspectable instead of hiding it behind
a pitch deck. It exposes passport progress, coalition merchants, cross-merchant
offers, activity provenance, PDA derivations, program identity, and public
devnet evidence. The repository includes the Anchor source, integration tests,
calculation tests, deployment configuration, and reproducible build commands.

## What is novel

Most loyalty systems reward spend inside one vendor silo. Alliance Passport
adds a coalition breadth multiplier: each distinct authenticated merchant visit
increases future points across the network by 2.5%, capped at 15%. This creates
a measurable incentive for discovery while preserving merchant control over
issuance and replay-proofing every receipt.

## Solana-specific architecture

- PDAs model coalition, merchant, passport, visit, receipt, offer, redemption,
  badge configuration, and badge claim state.
- Receipt-address derivation gives deterministic replay protection.
- Token-2022 NonTransferable mints represent achievement badges.
- CPI calls create extension-enabled mints, associated token accounts, and mint
  earned badges under program-derived authority.
- Events provide an indexer-friendly activity stream.

## Judge verification

1. Open the client and inspect the Devnet status and architecture views.
2. Follow the public Explorer links for program and representative actions.
3. Clone the repository and run the documented test command.
4. Confirm that replaying a receipt fails and an under-tier redemption fails.
5. Confirm the badge mint carries Token-2022's NonTransferable extension.

## Human submission action

The owner must sign in to Superteam Earn, open the listing, and submit this
package from a verified human profile. The listing explicitly disallows agent
submission, so this final platform action cannot be automated or bypassed.
