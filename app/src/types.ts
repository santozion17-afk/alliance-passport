export type Tier = "Bronze" | "Silver" | "Gold";

export type ViewName = "dashboard" | "network" | "architecture";

export type DataState = "ready" | "loading" | "error";

export type MerchantCategory =
  | "Mobility"
  | "Hospitality"
  | "Food"
  | "Workspace";

export interface Passport {
  owner: string;
  displayName: string;
  balance: number;
  lifetimePoints: number;
  uniqueMerchants: number;
  purchaseCount: number;
  tier: Tier;
  lastActivity: string;
}

export interface Merchant {
  id: string;
  name: string;
  shortName: string;
  category: MerchantCategory;
  authority: string;
  pointsPerUsdc: number;
  issuedPoints: number;
  active: boolean;
  visits: number;
  spendMinor: number;
  accent: "green" | "coral" | "teal" | "gold";
}

export interface Offer {
  id: number;
  merchantId: string;
  title: string;
  description: string;
  pointsCost: number;
  minTier: Tier;
  cap: number;
  redeemed: number;
  active: boolean;
  expiresAt: string;
  label: string;
}

export type ActivityKind =
  | "purchase"
  | "redemption"
  | "tier"
  | "merchant";

export interface Activity {
  id: string;
  kind: ActivityKind;
  merchantId?: string;
  title: string;
  detail: string;
  timestamp: string;
  points: number;
  receiptHash?: string;
  verified: boolean;
}

export interface PdaRecord {
  account: string;
  seeds: string;
  address: string;
  bump: number;
  purpose: string;
}
