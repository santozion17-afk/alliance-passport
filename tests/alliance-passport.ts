import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { createHash } from "node:crypto";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getExtensionTypes,
  getMint,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AlliancePassport } from "../target/types/alliance_passport";

const utf8 = (value: string) => Buffer.from(value, "utf8");

const u64 = (value: number) => {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(BigInt(value));
  return bytes;
};

const receiptHash = (label: string) =>
  createHash("sha256").update(label).digest();

const derive = (seeds: Buffer[], programId: PublicKey) =>
  PublicKey.findProgramAddressSync(seeds, programId)[0];

describe("alliance-passport", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .alliancePassport as Program<AlliancePassport>;
  const coalitionAuthority = provider.wallet.publicKey;
  const merchantOneAuthority = Keypair.generate();
  const merchantTwoAuthority = Keypair.generate();
  const customer = Keypair.generate();

  const coalition = derive(
    [utf8("coalition"), coalitionAuthority.toBuffer()],
    program.programId
  );
  const merchantOne = derive(
    [
      utf8("merchant"),
      coalition.toBuffer(),
      merchantOneAuthority.publicKey.toBuffer(),
    ],
    program.programId
  );
  const merchantTwo = derive(
    [
      utf8("merchant"),
      coalition.toBuffer(),
      merchantTwoAuthority.publicKey.toBuffer(),
    ],
    program.programId
  );
  const passport = derive(
    [utf8("passport"), coalition.toBuffer(), customer.publicKey.toBuffer()],
    program.programId
  );

  before(async () => {
    for (const signer of [
      merchantOneAuthority,
      merchantTwoAuthority,
      customer,
    ]) {
      const signature = await provider.connection.requestAirdrop(
        signer.publicKey,
        3 * anchor.web3.LAMPORTS_PER_SOL
      );
      const latest = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction(
        { signature, ...latest },
        "confirmed"
      );
    }
  });

  it("runs a replay-safe, cross-merchant loyalty lifecycle", async () => {
    await program.methods
      .initializeCoalition(new anchor.BN(1_000), new anchor.BN(5_000))
      .accountsStrict({
        coalition,
        authority: coalitionAuthority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .registerMerchant("Northstar Coffee", new anchor.BN(10))
      .accountsStrict({
        coalition,
        authority: coalitionAuthority,
        merchantAuthority: merchantOneAuthority.publicKey,
        merchant: merchantOne,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .registerMerchant("Circuit Supply", new anchor.BN(10))
      .accountsStrict({
        coalition,
        authority: coalitionAuthority,
        merchantAuthority: merchantTwoAuthority.publicKey,
        merchant: merchantTwo,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .enrollPassport()
      .accountsStrict({
        coalition,
        owner: customer.publicKey,
        passport,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer])
      .rpc();

    const firstReceiptHash = receiptHash("northstar-order-1042");
    const firstVisit = derive(
      [utf8("visit"), passport.toBuffer(), merchantOne.toBuffer()],
      program.programId
    );
    const firstReceipt = derive(
      [utf8("receipt"), merchantOne.toBuffer(), firstReceiptHash],
      program.programId
    );

    await program.methods
      .recordPurchase([...firstReceiptHash], new anchor.BN(10_000))
      .accountsStrict({
        coalition,
        merchant: merchantOne,
        authority: merchantOneAuthority.publicKey,
        passport,
        merchantVisit: firstVisit,
        receipt: firstReceipt,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantOneAuthority])
      .rpc();

    let replayError = "";
    try {
      await program.methods
        .recordPurchase([...firstReceiptHash], new anchor.BN(10_000))
        .accountsStrict({
          coalition,
          merchant: merchantOne,
          authority: merchantOneAuthority.publicKey,
          passport,
          merchantVisit: firstVisit,
          receipt: firstReceipt,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantOneAuthority])
        .rpc();
    } catch (error) {
      replayError = String(error);
    }
    expect(replayError).to.contain("ReceiptAlreadyConsumed");

    const secondReceiptHash = receiptHash("circuit-order-9001");
    const secondVisit = derive(
      [utf8("visit"), passport.toBuffer(), merchantTwo.toBuffer()],
      program.programId
    );
    const secondReceipt = derive(
      [utf8("receipt"), merchantTwo.toBuffer(), secondReceiptHash],
      program.programId
    );

    await program.methods
      .recordPurchase([...secondReceiptHash], new anchor.BN(40_000))
      .accountsStrict({
        coalition,
        merchant: merchantTwo,
        authority: merchantTwoAuthority.publicKey,
        passport,
        merchantVisit: secondVisit,
        receipt: secondReceipt,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantTwoAuthority])
      .rpc();

    const afterPurchases = await program.account.passport.fetch(passport);
    expect(afterPurchases.uniqueMerchants).to.equal(2);
    expect(afterPurchases.purchaseCount.toNumber()).to.equal(2);
    expect(afterPurchases.lifetimePoints.toNumber()).to.equal(5_100);
    expect(afterPurchases.balance.toNumber()).to.equal(5_100);
    expect(afterPurchases.tier).to.equal(2);

    const offerId = 7;
    const offer = derive(
      [utf8("offer"), merchantTwo.toBuffer(), u64(offerId)],
      program.programId
    );
    await program.methods
      .createOffer(
        new anchor.BN(offerId),
        "Priority repair clinic",
        "https://alliance-passport.example/offers/7",
        new anchor.BN(300),
        2,
        new anchor.BN(2)
      )
      .accountsStrict({
        merchant: merchantTwo,
        authority: merchantTwoAuthority.publicKey,
        offer,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantTwoAuthority])
      .rpc();

    const redemptionNonce = 1;
    const redemption = derive(
      [
        utf8("redemption"),
        offer.toBuffer(),
        passport.toBuffer(),
        u64(redemptionNonce),
      ],
      program.programId
    );
    await program.methods
      .redeemOffer(new anchor.BN(redemptionNonce))
      .accountsStrict({
        merchant: merchantTwo,
        offer,
        owner: customer.publicKey,
        passport,
        redemption,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer])
      .rpc();

    const afterRedemption = await program.account.passport.fetch(passport);
    const offerState = await program.account.offer.fetch(offer);
    expect(afterRedemption.balance.toNumber()).to.equal(4_800);
    expect(offerState.redemptionCount.toNumber()).to.equal(1);

    const badgeTier = 2;
    const badgeConfig = derive(
      [utf8("badge-config"), coalition.toBuffer(), Buffer.from([badgeTier])],
      program.programId
    );
    const badgeMint = derive(
      [utf8("badge-mint"), coalition.toBuffer(), Buffer.from([badgeTier])],
      program.programId
    );
    await program.methods
      .initializeBadgeMint(badgeTier)
      .accountsStrict({
        coalition,
        authority: coalitionAuthority,
        badgeConfig,
        badgeMint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const badgeTokenAccount = getAssociatedTokenAddressSync(
      badgeMint,
      customer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const badgeClaim = derive(
      [utf8("badge-claim"), badgeConfig.toBuffer(), passport.toBuffer()],
      program.programId
    );
    const claimSignature = await program.methods
      .claimBadge()
      .accountsStrict({
        coalition,
        badgeConfig,
        badgeMint,
        owner: customer.publicKey,
        passport,
        badgeTokenAccount,
        badgeClaim,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer])
      .rpc();
    await provider.connection.confirmTransaction(claimSignature, "confirmed");

    const mintState = await getMint(
      provider.connection,
      badgeMint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    const badgeAccountState = await getAccount(
      provider.connection,
      badgeTokenAccount,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    expect(getExtensionTypes(mintState.tlvData)).to.include(
      ExtensionType.NonTransferable
    );
    expect(badgeAccountState.amount).to.equal(1n);
  });
});
