// @vitest-environment node

import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { deriveDemoPdas } from "./pda";

describe("PDA derivation", () => {
  it("derives stable, valid, distinct account addresses", () => {
    const first = deriveDemoPdas();
    const second = deriveDemoPdas();
    const addresses = first.map((record) => record.address);

    expect(first).toEqual(second);
    expect(new Set(addresses).size).toBe(first.length);
    expect(first.map((record) => record.account)).toContain("Receipt");
    expect(first.find((record) => record.account === "Receipt")?.seeds).toBe(
      '["receipt", merchant, hash]',
    );
    expect(
      first.find((record) => record.account === "BadgeConfig")?.seeds,
    ).toBe('["badge-config", coalition, tier]');

    for (const address of addresses) {
      expect(new PublicKey(address).toBase58()).toBe(address);
    }
  });
});
