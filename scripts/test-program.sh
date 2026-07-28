#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_WALLET="$ROOT/target/test-authority.json"

mkdir -p "$ROOT/target"
if [[ ! -f "$TEST_WALLET" ]]; then
  solana-keygen new \
    --no-bip39-passphrase \
    --silent \
    --force \
    --outfile "$TEST_WALLET"
  chmod 600 "$TEST_WALLET"
fi

cd "$ROOT"
anchor test
