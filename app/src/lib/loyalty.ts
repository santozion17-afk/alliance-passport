import { TIER_THRESHOLDS } from "../constants";
import type { Offer, Passport, Tier } from "../types";

const TIER_ORDER: Tier[] = ["Bronze", "Silver", "Gold"];

export function calculateNetworkMultiplier(uniqueMerchants: number): number {
  const merchantCount = Math.max(0, Math.floor(uniqueMerchants));
  const bonusMerchants = Math.max(0, merchantCount - 1);
  return Math.min(15, bonusMerchants * 2.5);
}

export function calculatePurchasePoints(
  spendMinor: number,
  pointsPerUsdc: number,
  uniqueMerchants: number,
): { base: number; bonus: number; total: number; multiplier: number } {
  const safeSpend = Math.max(0, Math.floor(spendMinor));
  const safeRate = Math.max(0, Math.floor(pointsPerUsdc));
  const base = Math.floor((safeSpend * safeRate) / 100);
  const multiplier = calculateNetworkMultiplier(uniqueMerchants);
  const bonus = Math.floor((base * multiplier) / 100);

  return {
    base,
    bonus,
    total: base + bonus,
    multiplier,
  };
}

export function tierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

export function getTierForLifetimePoints(lifetimePoints: number): Tier {
  if (lifetimePoints >= TIER_THRESHOLDS.Gold) {
    return "Gold";
  }

  if (lifetimePoints >= TIER_THRESHOLDS.Silver) {
    return "Silver";
  }

  return "Bronze";
}

export function getTierProgress(
  lifetimePoints: number,
  currentTier: Tier,
): {
  percent: number;
  nextTier: Tier | null;
  pointsRemaining: number;
} {
  if (currentTier === "Gold") {
    return { percent: 100, nextTier: null, pointsRemaining: 0 };
  }

  const currentFloor = TIER_THRESHOLDS[currentTier];
  const nextTier = currentTier === "Bronze" ? "Silver" : "Gold";
  const nextThreshold = TIER_THRESHOLDS[nextTier];
  const earnedInTier = Math.max(0, lifetimePoints - currentFloor);
  const tierRange = nextThreshold - currentFloor;

  return {
    percent: Math.min(100, (earnedInTier / tierRange) * 100),
    nextTier,
    pointsRemaining: Math.max(0, nextThreshold - lifetimePoints),
  };
}

export function getOfferAvailability(
  passport: Passport,
  offer: Offer,
): { available: boolean; reason?: string } {
  if (!offer.active) {
    return { available: false, reason: "Offer paused" };
  }

  if (offer.redeemed >= offer.cap) {
    return { available: false, reason: "Fully redeemed" };
  }

  if (tierRank(passport.tier) < tierRank(offer.minTier)) {
    return { available: false, reason: `${offer.minTier} tier required` };
  }

  if (passport.balance < offer.pointsCost) {
    return {
      available: false,
      reason: `${offer.pointsCost - passport.balance} more points needed`,
    };
  }

  return { available: true };
}
