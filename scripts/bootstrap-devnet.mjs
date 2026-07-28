import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import process from "node:process";

import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const ROOT = resolve(import.meta.dirname, "..");
const RPC_URL = process.env.ALLIANCE_DEVNET_RPC ?? "https://api.devnet.solana.com";
const DEPLOYER_PATH = expandHome(
  process.env.ALLIANCE_DEVNET_WALLET ??
    "~/.config/solana/alliance-passport-devnet.json",
);
const MERCHANT_PATH = expandHome(
  process.env.ALLIANCE_MERCHANT_WALLET ??
    "~/.config/solana/alliance-passport-merchant-devnet.json",
);
const CUSTOMER_PATH = expandHome(
  process.env.ALLIANCE_CUSTOMER_WALLET ??
    "~/.config/solana/alliance-passport-customer-devnet.json",
);
const IDL_PATH = resolve(ROOT, "target/idl/alliance_passport.json");
const EVIDENCE_PATH = resolve(ROOT, "dist/devnet-evidence.json");

function expandHome(value) {
  return value.startsWith("~/") ? resolve(homedir(), value.slice(2)) : value;
}

function loadKeypair(path, create = false) {
  if (!existsSync(path)) {
    if (!create) throw new Error(`Missing keypair: ${path}`);
    const keypair = Keypair.generate();
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, JSON.stringify([...keypair.secretKey]), { mode: 0o600 });
    return keypair;
  }
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))),
  );
}

function pda(programId, ...seeds) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

function text(value) {
  return Buffer.from(value, "utf8");
}

function u64(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function hash(value) {
  return createHash("sha256").update(value).digest();
}

function explorer(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function publicRpcLabel(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "custom-devnet-rpc";
  }
}

async function ensureFunding(connection, deployer, recipient, minimumSol) {
  const minimum = Math.round(minimumSol * anchor.web3.LAMPORTS_PER_SOL);
  const current = await connection.getBalance(recipient.publicKey, "confirmed");
  if (current >= minimum) return null;
  const amount = minimum - current;
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: deployer.publicKey,
      toPubkey: recipient.publicKey,
      lamports: amount,
    }),
  );
  return sendAndConfirmTransaction(connection, transaction, [deployer], {
    commitment: "confirmed",
  });
}

async function missing(connection, address) {
  return (await connection.getAccountInfo(address, "confirmed")) === null;
}

async function main() {
  if (!existsSync(IDL_PATH)) {
    throw new Error("Missing Anchor IDL. Run anchor build first.");
  }

  const deployer = loadKeypair(DEPLOYER_PATH);
  const merchantTwoAuthority = loadKeypair(MERCHANT_PATH, true);
  const customer = loadKeypair(CUSTOMER_PATH, true);
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(deployer),
    { commitment: "confirmed", preflightCommitment: "confirmed" },
  );
  anchor.setProvider(provider);
  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  const program = new anchor.Program(idl, provider);
  const programId = program.programId;
  const evidence = {
    generatedAt: new Date().toISOString(),
    cluster: "devnet",
    rpcUrl: publicRpcLabel(RPC_URL),
    programId: programId.toBase58(),
    addresses: {},
    transactions: {},
  };

  evidence.transactions.fundMerchant = await ensureFunding(
    connection,
    deployer,
    merchantTwoAuthority,
    0.08,
  );
  evidence.transactions.fundCustomer = await ensureFunding(
    connection,
    deployer,
    customer,
    0.08,
  );

  const coalition = pda(programId, text("coalition"), deployer.publicKey.toBuffer());
  const merchantOne = pda(
    programId,
    text("merchant"),
    coalition.toBuffer(),
    deployer.publicKey.toBuffer(),
  );
  const merchantTwo = pda(
    programId,
    text("merchant"),
    coalition.toBuffer(),
    merchantTwoAuthority.publicKey.toBuffer(),
  );
  const passport = pda(
    programId,
    text("passport"),
    coalition.toBuffer(),
    customer.publicKey.toBuffer(),
  );

  Object.assign(evidence.addresses, {
    coalition: coalition.toBase58(),
    merchantOne: merchantOne.toBase58(),
    merchantTwo: merchantTwo.toBase58(),
    passport: passport.toBase58(),
  });

  if (await missing(connection, coalition)) {
    evidence.transactions.initializeCoalition = await program.methods
      .initializeCoalition(new anchor.BN(1_000), new anchor.BN(5_000))
      .accountsStrict({
        coalition,
        authority: deployer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  if (await missing(connection, merchantOne)) {
    evidence.transactions.registerMerchantOne = await program.methods
      .registerMerchant("Northstar Coffee", new anchor.BN(10))
      .accountsStrict({
        coalition,
        authority: deployer.publicKey,
        merchantAuthority: deployer.publicKey,
        merchant: merchantOne,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  if (await missing(connection, merchantTwo)) {
    evidence.transactions.registerMerchantTwo = await program.methods
      .registerMerchant("Circuit Supply", new anchor.BN(10))
      .accountsStrict({
        coalition,
        authority: deployer.publicKey,
        merchantAuthority: merchantTwoAuthority.publicKey,
        merchant: merchantTwo,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  if (await missing(connection, passport)) {
    evidence.transactions.enrollPassport = await program.methods
      .enrollPassport()
      .accountsStrict({
        coalition,
        owner: customer.publicKey,
        passport,
        systemProgram: SystemProgram.programId,
      })
      .signers([customer])
      .rpc();
  }

  const firstHash = hash("northstar-devnet-order-1042");
  const firstVisit = pda(
    programId,
    text("visit"),
    passport.toBuffer(),
    merchantOne.toBuffer(),
  );
  const firstReceipt = pda(
    programId,
    text("receipt"),
    merchantOne.toBuffer(),
    firstHash,
  );
  if (await missing(connection, firstReceipt)) {
    evidence.transactions.recordPurchaseOne = await program.methods
      .recordPurchase([...firstHash], new anchor.BN(10_000))
      .accountsStrict({
        coalition,
        merchant: merchantOne,
        authority: deployer.publicKey,
        passport,
        merchantVisit: firstVisit,
        receipt: firstReceipt,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  const secondHash = hash("circuit-devnet-order-9001");
  const secondVisit = pda(
    programId,
    text("visit"),
    passport.toBuffer(),
    merchantTwo.toBuffer(),
  );
  const secondReceipt = pda(
    programId,
    text("receipt"),
    merchantTwo.toBuffer(),
    secondHash,
  );
  if (await missing(connection, secondReceipt)) {
    evidence.transactions.recordPurchaseTwo = await program.methods
      .recordPurchase([...secondHash], new anchor.BN(40_000))
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
  }

  const offerId = 7;
  const offer = pda(
    programId,
    text("offer"),
    merchantTwo.toBuffer(),
    u64(offerId),
  );
  evidence.addresses.offer = offer.toBase58();
  if (await missing(connection, offer)) {
    evidence.transactions.createOffer = await program.methods
      .createOffer(
        new anchor.BN(offerId),
        "Priority repair clinic",
        "https://santozion17-afk.github.io/alliance-passport/",
        new anchor.BN(300),
        2,
        new anchor.BN(2),
      )
      .accountsStrict({
        merchant: merchantTwo,
        authority: merchantTwoAuthority.publicKey,
        offer,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantTwoAuthority])
      .rpc();
  }

  const nonce = 1;
  const redemption = pda(
    programId,
    text("redemption"),
    offer.toBuffer(),
    passport.toBuffer(),
    u64(nonce),
  );
  evidence.addresses.redemption = redemption.toBase58();
  if (await missing(connection, redemption)) {
    evidence.transactions.redeemOffer = await program.methods
      .redeemOffer(new anchor.BN(nonce))
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
  }

  const badgeTier = 2;
  const badgeConfig = pda(
    programId,
    text("badge-config"),
    coalition.toBuffer(),
    Buffer.from([badgeTier]),
  );
  const badgeMint = pda(
    programId,
    text("badge-mint"),
    coalition.toBuffer(),
    Buffer.from([badgeTier]),
  );
  Object.assign(evidence.addresses, {
    badgeConfig: badgeConfig.toBase58(),
    badgeMint: badgeMint.toBase58(),
  });
  if (await missing(connection, badgeConfig)) {
    evidence.transactions.initializeBadgeMint = await program.methods
      .initializeBadgeMint(badgeTier)
      .accountsStrict({
        coalition,
        authority: deployer.publicKey,
        badgeConfig,
        badgeMint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  const badgeTokenAccount = getAssociatedTokenAddressSync(
    badgeMint,
    customer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const badgeClaim = pda(
    programId,
    text("badge-claim"),
    badgeConfig.toBuffer(),
    passport.toBuffer(),
  );
  Object.assign(evidence.addresses, {
    badgeTokenAccount: badgeTokenAccount.toBase58(),
    badgeClaim: badgeClaim.toBase58(),
  });
  if (await missing(connection, badgeClaim)) {
    evidence.transactions.claimBadge = await program.methods
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
  }

  evidence.explorer = Object.fromEntries(
    Object.entries(evidence.transactions)
      .filter(([, signature]) => Boolean(signature))
      .map(([name, signature]) => [name, explorer(signature)]),
  );
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`evidence=${EVIDENCE_PATH}`);
  console.log(`program=https://explorer.solana.com/address/${programId}?cluster=devnet`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
