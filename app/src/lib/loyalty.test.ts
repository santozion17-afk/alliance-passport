import { describe, expect, it } from "vitest";
import { SAMPLE_OFFERS, SAMPLE_PASSPORT } from "../data";
import {
  calculateNetworkMultiplier,
  calculatePurchasePoints,
  getOfferAvailability,
  getTierForLifetimePoints,
  getTierProgress,
} from "./loyalty";

describe("coalition loyalty calculations", () => {
  it("adds 2.5% per distinct merchant after the first and caps at 15%", () => {
    expect(calculateNetworkMultiplier(0)).toBe(0);
    expect(calculateNetworkMultiplier(1)).toBe(0);
    expect(calculateNetworkMultiplier(4)).toBe(7.5);
    expect(calculateNetworkMultiplier(20)).toBe(15);
  });

  it("calculates integer base and bonus points from USDC minor units", () => {
    expect(calculatePurchasePoints(4_200, 4, 4)).toEqual({
      base: 168,
      bonus: 12,
      total: 180,
      multiplier: 7.5,
    });
  });

  it("returns deterministic tier progress", () => {
    expect(getTierForLifetimePoints(7_850)).toBe("Silver");
    expect(getTierProgress(7_850, "Silver")).toEqual({
      percent: (5_350 / 5_500) * 100,
      nextTier: "Gold",
      pointsRemaining: 150,
    });
    expect(getTierProgress(10_000, "Gold")).toEqual({
      percent: 100,
      nextTier: null,
      pointsRemaining: 0,
    });
  });

  it("enforces balance and tier before an offer can be redeemed", () => {
    const silverOffer = SAMPLE_OFFERS[0];
    const goldOffer = SAMPLE_OFFERS[2];

    expect(getOfferAvailability(SAMPLE_PASSPORT, silverOffer)).toEqual({
      available: true,
    });
    expect(getOfferAvailability(SAMPLE_PASSPORT, goldOffer)).toEqual({
      available: false,
      reason: "Gold tier required",
    });
  });
});
