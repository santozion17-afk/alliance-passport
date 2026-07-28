# Alliance Passport architecture contract

Alliance Passport is a coalition loyalty protocol for Solana. Merchants issue
points from signed purchase receipts, customers earn a network multiplier by
shopping across independent merchants, and any coalition merchant can publish
an offer redeemable from the shared balance.

## Program invariants

- Every privileged merchant action requires the registered merchant authority.
- A receipt hash can be consumed exactly once for a merchant.
- Arithmetic uses checked operations and rejects zero-value purchases.
- A passport can only be changed or redeemed by its owner, except for points
  issuance from an authenticated merchant purchase.
- Offers enforce tier, balance, active state, and redemption-cap constraints.
- Achievement badges use Token-2022's NonTransferable extension and are minted
  only after the passport has reached the corresponding tier.

## Accounts

- `Coalition`: authority, merchant count, passport count, tier thresholds, bump.
- `Merchant`: coalition, authority, bounded name, points per USDC, issued points,
  active flag, bump.
- `Passport`: coalition, owner, balance, lifetime points, unique merchants,
  purchase count, tier, last activity, bump.
- `MerchantVisit`: passport, merchant, visits, spend in USDC minor units, bump.
- `Receipt`: merchant, passport, 32-byte receipt hash, spend, points, timestamp,
  bump. Its PDA provides replay protection.
- `Offer`: merchant, numeric offer id, bounded title and URI, points cost,
  minimum tier, redemption cap/count, active flag, bump.
- `Redemption`: offer, passport, numeric nonce, timestamp, points spent, bump.
- `BadgeConfig`: coalition, Token-2022 mint, tier, bump.
- `BadgeClaim`: badge config, passport, token account, bump.

## Instructions

1. `initialize_coalition(silver_threshold, gold_threshold)`
2. `register_merchant(name, points_per_usdc)`
3. `set_merchant_active(active)`
4. `enroll_passport()`
5. `record_purchase(receipt_hash, spend_minor)`
6. `create_offer(offer_id, title, metadata_uri, points_cost, min_tier, cap)`
7. `set_offer_active(active)`
8. `redeem_offer(nonce)`
9. `initialize_badge_mint(tier)`
10. `claim_badge()`

## Network multiplier

The first distinct merchant visited creates a `MerchantVisit` PDA. The passport
earns a 2.5% network bonus for each distinct coalition merchant beyond the first,
capped at 15%. This rewards cross-merchant discovery without allowing users to
self-report activity. Base points are `spend_minor * points_per_usdc / 100`.

## Client contract

The demo must expose the architecture visually, derive PDAs deterministically,
show a sample passport and coalition offers, and link to the public program,
repository, tests, and devnet transactions. It must never imply mainnet use.
