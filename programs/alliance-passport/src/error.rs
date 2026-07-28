use anchor_lang::prelude::*;

#[error_code]
pub enum AllianceError {
    #[msg("Silver and gold thresholds must be non-zero and strictly increasing")]
    InvalidTierThresholds,
    #[msg("The signer is not authorized for this action")]
    Unauthorized,
    #[msg("The merchant authority cannot be the default public key")]
    InvalidMerchantAuthority,
    #[msg("Merchant name cannot be empty")]
    EmptyMerchantName,
    #[msg("Merchant name exceeds the maximum byte length")]
    MerchantNameTooLong,
    #[msg("Points per USDC must be greater than zero")]
    InvalidPointsRate,
    #[msg("Merchant is inactive")]
    MerchantInactive,
    #[msg("Purchase spend must be greater than zero")]
    ZeroPurchase,
    #[msg("Receipt hash cannot be all zeroes")]
    InvalidReceiptHash,
    #[msg("This merchant receipt has already been consumed")]
    ReceiptAlreadyConsumed,
    #[msg("The purchase is too small to award one point")]
    ZeroPointsAward,
    #[msg("Checked arithmetic failed")]
    ArithmeticOverflow,
    #[msg("An account does not belong to the expected coalition object")]
    InvalidAccountLink,
    #[msg("Offer title cannot be empty")]
    EmptyOfferTitle,
    #[msg("Offer title exceeds the maximum byte length")]
    OfferTitleTooLong,
    #[msg("Offer metadata URI cannot be empty")]
    EmptyMetadataUri,
    #[msg("Offer metadata URI exceeds the maximum byte length")]
    MetadataUriTooLong,
    #[msg("Offer points cost must be greater than zero")]
    InvalidPointsCost,
    #[msg("Offer minimum tier is invalid")]
    InvalidOfferTier,
    #[msg("Offer redemption cap must be greater than zero")]
    InvalidRedemptionCap,
    #[msg("Offer is inactive")]
    OfferInactive,
    #[msg("Passport tier does not satisfy the offer")]
    TierTooLow,
    #[msg("Passport has insufficient points")]
    InsufficientPoints,
    #[msg("Offer redemption cap has been reached")]
    OfferSoldOut,
    #[msg("Badge tier must be silver or gold")]
    InvalidBadgeTier,
    #[msg("Passport has not reached the badge tier")]
    BadgeTierNotReached,
    #[msg("Badge mint account is not a valid Token-2022 mint")]
    InvalidBadgeMint,
    #[msg("Badge mint does not contain the Token-2022 NonTransferable extension")]
    BadgeMintMissingNonTransferable,
    #[msg("Badge token account already owns this badge")]
    BadgeAlreadyOwned,
    #[msg("Badge mint PDA is not an empty system account")]
    InvalidBadgeMintAccountState,
}
