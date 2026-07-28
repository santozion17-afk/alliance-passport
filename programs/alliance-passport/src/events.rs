use anchor_lang::prelude::*;

#[event]
pub struct CoalitionInitialized {
    pub coalition: Pubkey,
    pub authority: Pubkey,
    pub silver_threshold: u64,
    pub gold_threshold: u64,
    pub timestamp: i64,
}

#[event]
pub struct MerchantRegistered {
    pub coalition: Pubkey,
    pub merchant: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub points_per_usdc: u64,
    pub timestamp: i64,
}

#[event]
pub struct MerchantStatusChanged {
    pub merchant: Pubkey,
    pub active: bool,
    pub timestamp: i64,
}

#[event]
pub struct PassportEnrolled {
    pub coalition: Pubkey,
    pub passport: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PurchaseRecorded {
    pub coalition: Pubkey,
    pub merchant: Pubkey,
    pub passport: Pubkey,
    pub receipt: Pubkey,
    pub receipt_hash: [u8; 32],
    pub spend_minor: u64,
    pub base_points: u64,
    pub bonus_bps: u64,
    pub points_awarded: u64,
    pub resulting_tier: u8,
    pub timestamp: i64,
}

#[event]
pub struct OfferCreated {
    pub merchant: Pubkey,
    pub offer: Pubkey,
    pub offer_id: u64,
    pub title: String,
    pub points_cost: u64,
    pub min_tier: u8,
    pub cap: u64,
    pub timestamp: i64,
}

#[event]
pub struct OfferStatusChanged {
    pub offer: Pubkey,
    pub active: bool,
    pub timestamp: i64,
}

#[event]
pub struct OfferRedeemed {
    pub offer: Pubkey,
    pub redemption: Pubkey,
    pub passport: Pubkey,
    pub owner: Pubkey,
    pub nonce: u64,
    pub points_spent: u64,
    pub timestamp: i64,
}

#[event]
pub struct BadgeMintInitialized {
    pub coalition: Pubkey,
    pub badge_config: Pubkey,
    pub mint: Pubkey,
    pub tier: u8,
    pub timestamp: i64,
}

#[event]
pub struct BadgeClaimed {
    pub coalition: Pubkey,
    pub badge_config: Pubkey,
    pub passport: Pubkey,
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub token_account: Pubkey,
    pub tier: u8,
    pub timestamp: i64,
}
