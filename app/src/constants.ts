import type { Tier } from "./types";

export const PROGRAM_ID = "2z8tVq9DT8DUnKf8UY2ZDSWBatePKXtXhY4HQXbwfGkE";
export const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export const APP_LINKS = {
  repository: "https://github.com/santozion17-afk/alliance-passport",
  tests:
    "https://github.com/santozion17-afk/alliance-passport/tree/main/tests",
  programExplorer: `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`,
  programActivity: `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`,
  token2022Docs:
    "https://solana.com/docs/tokens/extensions/non-transferrable-tokens",
} as const;

export const NETWORK_CONFIG = {
  cluster: "devnet",
  label: "Solana Devnet",
  rpcLabel: "Public Devnet RPC",
  deploymentState: "Program deployment pending",
  sampleData: true,
} as const;

export const TIER_THRESHOLDS: Record<Tier, number> = {
  Bronze: 0,
  Silver: 2_500,
  Gold: 8_000,
};

export const DEMO_KEYS = {
  coalitionAuthority: "11111111111111111111111111111111",
  passportOwner: "Vote111111111111111111111111111111111111111",
  merchantAuthority: "Stake11111111111111111111111111111111111111",
  receiptHash:
    "4c6f79616c74792d726563656970742d30303030303030303030303030303031",
} as const;

export const UI_TIMING = {
  syncMs: 650,
  redemptionMs: 450,
} as const;
