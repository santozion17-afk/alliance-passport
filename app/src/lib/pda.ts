import { PublicKey } from "@solana/web3.js";
import { DEMO_KEYS, PROGRAM_ID } from "../constants";
import type { PdaRecord } from "../types";

const encoder = new TextEncoder();
const programId = new PublicKey(PROGRAM_ID);

function textSeed(value: string): Uint8Array {
  return encoder.encode(value);
}

function publicKeySeed(value: string): Uint8Array {
  return new PublicKey(value).toBytes();
}

function u64Seed(value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
  return bytes;
}

function hexSeed(value: string): Uint8Array {
  return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (byte) =>
    Number.parseInt(byte, 16),
  );
}

function derive(
  account: string,
  seedsLabel: string,
  seeds: Uint8Array[],
  purpose: string,
): PdaRecord {
  const [address, bump] = PublicKey.findProgramAddressSync(seeds, programId);

  return {
    account,
    seeds: seedsLabel,
    address: address.toBase58(),
    bump,
    purpose,
  };
}

export function deriveDemoPdas(): PdaRecord[] {
  const coalition = derive(
    "Coalition",
    '["coalition", authority]',
    [
      textSeed("coalition"),
      publicKeySeed(DEMO_KEYS.coalitionAuthority),
    ],
    "Network policy and tier thresholds",
  );
  const merchant = derive(
    "Merchant",
    '["merchant", coalition, authority]',
    [
      textSeed("merchant"),
      publicKeySeed(coalition.address),
      publicKeySeed(DEMO_KEYS.merchantAuthority),
    ],
    "Authenticated issuer configuration",
  );
  const passport = derive(
    "Passport",
    '["passport", coalition, owner]',
    [
      textSeed("passport"),
      publicKeySeed(coalition.address),
      publicKeySeed(DEMO_KEYS.passportOwner),
    ],
    "Shared customer balance and tier",
  );
  const offer = derive(
    "Offer",
    '["offer", merchant, offer_id]',
    [
      textSeed("offer"),
      publicKeySeed(merchant.address),
      u64Seed(11),
    ],
    "Merchant-owned redemption terms",
  );
  const receipt = derive(
    "Receipt",
    '["receipt", merchant, hash]',
    [
      textSeed("receipt"),
      publicKeySeed(merchant.address),
      hexSeed(DEMO_KEYS.receiptHash),
    ],
    "One-time purchase replay protection",
  );
  const redemption = derive(
    "Redemption",
    '["redemption", offer, passport, nonce]',
    [
      textSeed("redemption"),
      publicKeySeed(offer.address),
      publicKeySeed(passport.address),
      u64Seed(3),
    ],
    "Immutable proof of points spent",
  );
  const badgeConfig = derive(
    "BadgeConfig",
    '["badge-config", coalition, tier]',
    [
      textSeed("badge-config"),
      publicKeySeed(coalition.address),
      Uint8Array.of(1),
    ],
    "Silver Token-2022 mint authority",
  );

  return [
    coalition,
    merchant,
    passport,
    receipt,
    offer,
    redemption,
    badgeConfig,
  ];
}
