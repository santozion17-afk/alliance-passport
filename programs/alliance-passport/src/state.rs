use anchor_lang::prelude::*;

pub const COALITION_SEED: &[u8] = b"coalition";
pub const MERCHANT_SEED: &[u8] = b"merchant";
pub const PASSPORT_SEED: &[u8] = b"passport";
pub const VISIT_SEED: &[u8] = b"visit";
pub const RECEIPT_SEED: &[u8] = b"receipt";
pub const OFFER_SEED: &[u8] = b"offer";
pub const REDEMPTION_SEED: &[u8] = b"redemption";
pub const BADGE_CONFIG_SEED: &[u8] = b"badge-config";
pub const BADGE_MINT_SEED: &[u8] = b"badge-mint";
pub const BADGE_CLAIM_SEED: &[u8] = b"badge-claim";

pub const MAX_MERCHANT_NAME_BYTES: usize = 64;
pub const MAX_OFFER_TITLE_BYTES: usize = 96;
pub const MAX_METADATA_URI_BYTES: usize = 200;
pub const SILVER_TIER: u8 = 1;
pub const GOLD_TIER: u8 = 2;
pub const MAX_TIER: u8 = GOLD_TIER;

#[account]
pub struct Coalition {
    pub authority: Pubkey,
    pub merchant_count: u64,
    pub passport_count: u64,
    pub silver_threshold: u64,
    pub gold_threshold: u64,
    pub bump: u8,
}

impl Coalition {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Merchant {
    pub coalition: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub points_per_usdc: u64,
    pub issued_points: u64,
    pub active: bool,
    pub bump: u8,
}

impl Merchant {
    pub const SPACE: usize = 8 + 32 + 32 + 4 + MAX_MERCHANT_NAME_BYTES + 8 + 8 + 1 + 1;
}

#[account]
pub struct Passport {
    pub coalition: Pubkey,
    pub owner: Pubkey,
    pub balance: u64,
    pub lifetime_points: u64,
    pub unique_merchants: u32,
    pub purchase_count: u64,
    pub tier: u8,
    pub last_activity: i64,
    pub bump: u8,
}

impl Passport {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 4 + 8 + 1 + 8 + 1;
}

#[account]
pub struct MerchantVisit {
    pub passport: Pubkey,
    pub merchant: Pubkey,
    pub visits: u64,
    pub spend_minor: u64,
    pub bump: u8,
}

impl MerchantVisit {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct Receipt {
    pub merchant: Pubkey,
    pub passport: Pubkey,
    pub receipt_hash: [u8; 32],
    pub spend_minor: u64,
    pub points: u64,
    pub timestamp: i64,
    pub bump: u8,
}

impl Receipt {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Offer {
    pub merchant: Pubkey,
    pub offer_id: u64,
    pub title: String,
    pub metadata_uri: String,
    pub points_cost: u64,
    pub min_tier: u8,
    pub redemption_cap: u64,
    pub redemption_count: u64,
    pub active: bool,
    pub bump: u8,
}

impl Offer {
    pub const SPACE: usize =
        8 + 32 + 8 + 4 + MAX_OFFER_TITLE_BYTES + 4 + MAX_METADATA_URI_BYTES + 8 + 1 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Redemption {
    pub offer: Pubkey,
    pub passport: Pubkey,
    pub nonce: u64,
    pub timestamp: i64,
    pub points_spent: u64,
    pub bump: u8,
}

impl Redemption {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct BadgeConfig {
    pub coalition: Pubkey,
    pub mint: Pubkey,
    pub tier: u8,
    pub bump: u8,
}

impl BadgeConfig {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1;
}

#[account]
pub struct BadgeClaim {
    pub badge_config: Pubkey,
    pub passport: Pubkey,
    pub token_account: Pubkey,
    pub bump: u8,
}

impl BadgeClaim {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 1;
}
