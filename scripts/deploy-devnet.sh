#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.avm/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOYER="${ALLIANCE_DEVNET_WALLET:-$HOME/.config/solana/alliance-passport-devnet.json}"
RPC_URL="${ALLIANCE_DEVNET_RPC:-https://api.devnet.solana.com}"
PROGRAM_KEYPAIR="$ROOT_DIR/target/deploy/alliance_passport-keypair.json"
PROGRAM_SO="$ROOT_DIR/target/deploy/alliance_passport.so"
EXPECTED_PROGRAM_ID="2z8tVq9DT8DUnKf8UY2ZDSWBatePKXtXhY4HQXbwfGkE"

if [[ ! -f "$DEPLOYER" ]]; then
  echo "Missing devnet deployer keypair: $DEPLOYER" >&2
  exit 1
fi

chmod 600 "$DEPLOYER"
cd "$ROOT_DIR"

anchor build

ACTUAL_PROGRAM_ID="$(solana-keygen pubkey "$PROGRAM_KEYPAIR")"
if [[ "$ACTUAL_PROGRAM_ID" != "$EXPECTED_PROGRAM_ID" ]]; then
  echo "Program keypair does not match declare_id" >&2
  exit 1
fi

echo "Devnet deployer balance: $(solana balance --url "$RPC_URL" --keypair "$DEPLOYER")"
solana program deploy "$PROGRAM_SO" \
  --program-id "$PROGRAM_KEYPAIR" \
  --upgrade-authority "$DEPLOYER" \
  --keypair "$DEPLOYER" \
  --url "$RPC_URL"

echo "Program: https://explorer.solana.com/address/$EXPECTED_PROGRAM_ID?cluster=devnet"
