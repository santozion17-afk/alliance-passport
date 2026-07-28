use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Allocate, Assign, CreateAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_2022::{self, spl_token_2022, InitializeMint2, MintTo, Token2022};
use anchor_spl::token_2022_extensions::{
    non_transferable_mint_initialize, NonTransferableMintInitialize,
};
use anchor_spl::token_interface::{Mint, TokenAccount};
use spl_token_2022::extension::{
    non_transferable::NonTransferable, BaseStateWithExtensions, ExtensionType, StateWithExtensions,
};
use spl_token_2022::state::Mint as SplMint;

pub mod error;
pub mod events;
pub mod math;
pub mod state;

use error::AllianceError;
use events::*;
use math::{calculate_points, tier_for_points};
use state::*;

declare_id!("2z8tVq9DT8DUnKf8UY2ZDSWBatePKXtXhY4HQXbwfGkE");

#[program]
pub mod alliance_passport {
    use super::*;

    pub fn initialize_coalition(
        ctx: Context<InitializeCoalition>,
        silver_threshold: u64,
        gold_threshold: u64,
    ) -> Result<()> {
        require!(
            silver_threshold > 0 && gold_threshold > silver_threshold,
            AllianceError::InvalidTierThresholds
        );

        let now = Clock::get()?.unix_timestamp;
        let coalition = &mut ctx.accounts.coalition;
        coalition.authority = ctx.accounts.authority.key();
        coalition.merchant_count = 0;
        coalition.passport_count = 0;
        coalition.silver_threshold = silver_threshold;
        coalition.gold_threshold = gold_threshold;
        coalition.bump = ctx.bumps.coalition;

        emit!(CoalitionInitialized {
            coalition: coalition.key(),
            authority: coalition.authority,
            silver_threshold,
            gold_threshold,
            timestamp: now,
        });
        Ok(())
    }

    pub fn register_merchant(
        ctx: Context<RegisterMerchant>,
        name: String,
        points_per_usdc: u64,
    ) -> Result<()> {
        validate_bounded_string(
            &name,
            MAX_MERCHANT_NAME_BYTES,
            error!(AllianceError::EmptyMerchantName),
            error!(AllianceError::MerchantNameTooLong),
        )?;
        require!(points_per_usdc > 0, AllianceError::InvalidPointsRate);
        require!(
            ctx.accounts.merchant_authority.key() != Pubkey::default(),
            AllianceError::InvalidMerchantAuthority
        );

        let next_count = ctx
            .accounts
            .coalition
            .merchant_count
            .checked_add(1)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let now = Clock::get()?.unix_timestamp;
        let coalition_key = ctx.accounts.coalition.key();
        let merchant_authority = ctx.accounts.merchant_authority.key();

        ctx.accounts.coalition.merchant_count = next_count;
        let merchant = &mut ctx.accounts.merchant;
        merchant.coalition = coalition_key;
        merchant.authority = merchant_authority;
        merchant.name = name;
        merchant.points_per_usdc = points_per_usdc;
        merchant.issued_points = 0;
        merchant.active = true;
        merchant.bump = ctx.bumps.merchant;

        emit!(MerchantRegistered {
            coalition: coalition_key,
            merchant: merchant.key(),
            authority: merchant_authority,
            name: merchant.name.clone(),
            points_per_usdc,
            timestamp: now,
        });
        Ok(())
    }

    pub fn set_merchant_active(ctx: Context<SetMerchantActive>, active: bool) -> Result<()> {
        ctx.accounts.merchant.active = active;
        emit!(MerchantStatusChanged {
            merchant: ctx.accounts.merchant.key(),
            active,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn enroll_passport(ctx: Context<EnrollPassport>) -> Result<()> {
        let next_count = ctx
            .accounts
            .coalition
            .passport_count
            .checked_add(1)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let now = Clock::get()?.unix_timestamp;
        let coalition_key = ctx.accounts.coalition.key();

        ctx.accounts.coalition.passport_count = next_count;
        let passport = &mut ctx.accounts.passport;
        passport.coalition = coalition_key;
        passport.owner = ctx.accounts.owner.key();
        passport.balance = 0;
        passport.lifetime_points = 0;
        passport.unique_merchants = 0;
        passport.purchase_count = 0;
        passport.tier = 0;
        passport.last_activity = now;
        passport.bump = ctx.bumps.passport;

        emit!(PassportEnrolled {
            coalition: coalition_key,
            passport: passport.key(),
            owner: passport.owner,
            timestamp: now,
        });
        Ok(())
    }

    pub fn record_purchase(
        ctx: Context<RecordPurchase>,
        receipt_hash: [u8; 32],
        spend_minor: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.merchant.active,
            AllianceError::MerchantInactive
        );
        require!(spend_minor > 0, AllianceError::ZeroPurchase);
        require!(receipt_hash != [0; 32], AllianceError::InvalidReceiptHash);
        require!(
            ctx.accounts.receipt.merchant == Pubkey::default(),
            AllianceError::ReceiptAlreadyConsumed
        );

        let merchant_key = ctx.accounts.merchant.key();
        let passport_key = ctx.accounts.passport.key();
        let coalition_key = ctx.accounts.coalition.key();
        let first_visit = ctx.accounts.merchant_visit.passport == Pubkey::default();

        if first_visit {
            require!(
                ctx.accounts.merchant_visit.merchant == Pubkey::default(),
                AllianceError::InvalidAccountLink
            );
        } else {
            require_keys_eq!(
                ctx.accounts.merchant_visit.passport,
                passport_key,
                AllianceError::InvalidAccountLink
            );
            require_keys_eq!(
                ctx.accounts.merchant_visit.merchant,
                merchant_key,
                AllianceError::InvalidAccountLink
            );
        }

        let unique_merchants = if first_visit {
            ctx.accounts
                .passport
                .unique_merchants
                .checked_add(1)
                .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?
        } else {
            ctx.accounts.passport.unique_merchants
        };
        let award = calculate_points(
            spend_minor,
            ctx.accounts.merchant.points_per_usdc,
            unique_merchants,
        )
        .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        require!(award.total_points > 0, AllianceError::ZeroPointsAward);

        let next_issued_points = ctx
            .accounts
            .merchant
            .issued_points
            .checked_add(award.total_points)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let next_balance = ctx
            .accounts
            .passport
            .balance
            .checked_add(award.total_points)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let next_lifetime_points = ctx
            .accounts
            .passport
            .lifetime_points
            .checked_add(award.total_points)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let next_purchase_count = ctx
            .accounts
            .passport
            .purchase_count
            .checked_add(1)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let next_visit_count = ctx
            .accounts
            .merchant_visit
            .visits
            .checked_add(1)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let next_visit_spend = ctx
            .accounts
            .merchant_visit
            .spend_minor
            .checked_add(spend_minor)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let resulting_tier = tier_for_points(
            next_lifetime_points,
            ctx.accounts.coalition.silver_threshold,
            ctx.accounts.coalition.gold_threshold,
        );
        let now = Clock::get()?.unix_timestamp;

        ctx.accounts.merchant.issued_points = next_issued_points;
        let passport = &mut ctx.accounts.passport;
        passport.balance = next_balance;
        passport.lifetime_points = next_lifetime_points;
        passport.unique_merchants = unique_merchants;
        passport.purchase_count = next_purchase_count;
        passport.tier = resulting_tier;
        passport.last_activity = now;

        let visit = &mut ctx.accounts.merchant_visit;
        visit.passport = passport_key;
        visit.merchant = merchant_key;
        visit.visits = next_visit_count;
        visit.spend_minor = next_visit_spend;
        visit.bump = ctx.bumps.merchant_visit;

        let receipt = &mut ctx.accounts.receipt;
        receipt.merchant = merchant_key;
        receipt.passport = passport_key;
        receipt.receipt_hash = receipt_hash;
        receipt.spend_minor = spend_minor;
        receipt.points = award.total_points;
        receipt.timestamp = now;
        receipt.bump = ctx.bumps.receipt;

        emit!(PurchaseRecorded {
            coalition: coalition_key,
            merchant: merchant_key,
            passport: passport_key,
            receipt: receipt.key(),
            receipt_hash,
            spend_minor,
            base_points: award.base_points,
            bonus_bps: award.bonus_bps,
            points_awarded: award.total_points,
            resulting_tier,
            timestamp: now,
        });
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_offer(
        ctx: Context<CreateOffer>,
        offer_id: u64,
        title: String,
        metadata_uri: String,
        points_cost: u64,
        min_tier: u8,
        cap: u64,
    ) -> Result<()> {
        validate_bounded_string(
            &title,
            MAX_OFFER_TITLE_BYTES,
            error!(AllianceError::EmptyOfferTitle),
            error!(AllianceError::OfferTitleTooLong),
        )?;
        validate_bounded_string(
            &metadata_uri,
            MAX_METADATA_URI_BYTES,
            error!(AllianceError::EmptyMetadataUri),
            error!(AllianceError::MetadataUriTooLong),
        )?;
        require!(points_cost > 0, AllianceError::InvalidPointsCost);
        require!(min_tier <= MAX_TIER, AllianceError::InvalidOfferTier);
        require!(cap > 0, AllianceError::InvalidRedemptionCap);
        require!(
            ctx.accounts.merchant.active,
            AllianceError::MerchantInactive
        );

        let now = Clock::get()?.unix_timestamp;
        let offer = &mut ctx.accounts.offer;
        offer.merchant = ctx.accounts.merchant.key();
        offer.offer_id = offer_id;
        offer.title = title;
        offer.metadata_uri = metadata_uri;
        offer.points_cost = points_cost;
        offer.min_tier = min_tier;
        offer.redemption_cap = cap;
        offer.redemption_count = 0;
        offer.active = true;
        offer.bump = ctx.bumps.offer;

        emit!(OfferCreated {
            merchant: offer.merchant,
            offer: offer.key(),
            offer_id,
            title: offer.title.clone(),
            points_cost,
            min_tier,
            cap,
            timestamp: now,
        });
        Ok(())
    }

    pub fn set_offer_active(ctx: Context<SetOfferActive>, active: bool) -> Result<()> {
        ctx.accounts.offer.active = active;
        emit!(OfferStatusChanged {
            offer: ctx.accounts.offer.key(),
            active,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn redeem_offer(ctx: Context<RedeemOffer>, nonce: u64) -> Result<()> {
        require!(
            ctx.accounts.merchant.active,
            AllianceError::MerchantInactive
        );
        require!(ctx.accounts.offer.active, AllianceError::OfferInactive);
        require!(
            ctx.accounts.passport.tier >= ctx.accounts.offer.min_tier,
            AllianceError::TierTooLow
        );
        require!(
            ctx.accounts.passport.balance >= ctx.accounts.offer.points_cost,
            AllianceError::InsufficientPoints
        );
        require!(
            ctx.accounts.offer.redemption_count < ctx.accounts.offer.redemption_cap,
            AllianceError::OfferSoldOut
        );

        let next_balance = ctx
            .accounts
            .passport
            .balance
            .checked_sub(ctx.accounts.offer.points_cost)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let next_redemption_count = ctx
            .accounts
            .offer
            .redemption_count
            .checked_add(1)
            .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
        let now = Clock::get()?.unix_timestamp;
        let points_spent = ctx.accounts.offer.points_cost;

        ctx.accounts.passport.balance = next_balance;
        ctx.accounts.passport.last_activity = now;
        ctx.accounts.offer.redemption_count = next_redemption_count;

        let redemption = &mut ctx.accounts.redemption;
        redemption.offer = ctx.accounts.offer.key();
        redemption.passport = ctx.accounts.passport.key();
        redemption.nonce = nonce;
        redemption.timestamp = now;
        redemption.points_spent = points_spent;
        redemption.bump = ctx.bumps.redemption;

        emit!(OfferRedeemed {
            offer: redemption.offer,
            redemption: redemption.key(),
            passport: redemption.passport,
            owner: ctx.accounts.owner.key(),
            nonce,
            points_spent,
            timestamp: now,
        });
        Ok(())
    }

    pub fn initialize_badge_mint(ctx: Context<InitializeBadgeMint>, tier: u8) -> Result<()> {
        require!(
            (SILVER_TIER..=GOLD_TIER).contains(&tier),
            AllianceError::InvalidBadgeTier
        );

        let mint_space =
            ExtensionType::try_calculate_account_len::<SplMint>(&[ExtensionType::NonTransferable])
                .map_err(|_| error!(AllianceError::InvalidBadgeMint))?;
        let rent_lamports = Rent::get()?.minimum_balance(mint_space).max(1);
        let tier_seed = [tier];
        let mint_bump_seed = [ctx.bumps.badge_mint];
        let coalition_key = ctx.accounts.coalition.key();
        let mint_signer_seeds: &[&[u8]] = &[
            BADGE_MINT_SEED,
            coalition_key.as_ref(),
            &tier_seed,
            &mint_bump_seed,
        ];
        let signer = &[mint_signer_seeds];
        let mint_info = ctx.accounts.badge_mint.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();

        if mint_info.lamports() == 0 {
            system_program::create_account(
                CpiContext::new_with_signer(
                    system_program_info.clone(),
                    CreateAccount {
                        from: ctx.accounts.authority.to_account_info(),
                        to: mint_info.clone(),
                    },
                    signer,
                ),
                rent_lamports,
                mint_space as u64,
                &ctx.accounts.token_program.key(),
            )?;
        } else {
            require!(
                mint_info.owner == &system_program::ID && mint_info.data_is_empty(),
                AllianceError::InvalidBadgeMintAccountState
            );
            if mint_info.lamports() < rent_lamports {
                let top_up = rent_lamports
                    .checked_sub(mint_info.lamports())
                    .ok_or_else(|| error!(AllianceError::ArithmeticOverflow))?;
                system_program::transfer(
                    CpiContext::new(
                        system_program_info.clone(),
                        Transfer {
                            from: ctx.accounts.authority.to_account_info(),
                            to: mint_info.clone(),
                        },
                    ),
                    top_up,
                )?;
            }
            system_program::allocate(
                CpiContext::new_with_signer(
                    system_program_info.clone(),
                    Allocate {
                        account_to_allocate: mint_info.clone(),
                    },
                    signer,
                ),
                mint_space as u64,
            )?;
            system_program::assign(
                CpiContext::new_with_signer(
                    system_program_info,
                    Assign {
                        account_to_assign: mint_info.clone(),
                    },
                    signer,
                ),
                &ctx.accounts.token_program.key(),
            )?;
        }

        non_transferable_mint_initialize(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            NonTransferableMintInitialize {
                token_program_id: ctx.accounts.token_program.to_account_info(),
                mint: mint_info.clone(),
            },
        ))?;

        let badge_config_key = ctx.accounts.badge_config.key();
        token_2022::initialize_mint2(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                InitializeMint2 { mint: mint_info },
            ),
            0,
            &badge_config_key,
            Some(&badge_config_key),
        )?;

        let badge_config = &mut ctx.accounts.badge_config;
        badge_config.coalition = ctx.accounts.coalition.key();
        badge_config.mint = ctx.accounts.badge_mint.key();
        badge_config.tier = tier;
        badge_config.bump = ctx.bumps.badge_config;

        emit!(BadgeMintInitialized {
            coalition: badge_config.coalition,
            badge_config: badge_config.key(),
            mint: badge_config.mint,
            tier,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn claim_badge(ctx: Context<ClaimBadge>) -> Result<()> {
        require!(
            ctx.accounts.passport.tier >= ctx.accounts.badge_config.tier,
            AllianceError::BadgeTierNotReached
        );
        require!(
            ctx.accounts.badge_token_account.amount == 0,
            AllianceError::BadgeAlreadyOwned
        );
        require_keys_eq!(
            *ctx.accounts.badge_mint.to_account_info().owner,
            ctx.accounts.token_program.key(),
            AllianceError::InvalidBadgeMint
        );

        let mint_info = ctx.accounts.badge_mint.to_account_info();
        {
            let mint_data = mint_info.try_borrow_data()?;
            let mint = StateWithExtensions::<SplMint>::unpack(&mint_data)
                .map_err(|_| error!(AllianceError::InvalidBadgeMint))?;
            require!(
                mint.get_extension::<NonTransferable>().is_ok(),
                AllianceError::BadgeMintMissingNonTransferable
            );
        }

        let tier_seed = [ctx.accounts.badge_config.tier];
        let badge_config_bump = [ctx.accounts.badge_config.bump];
        let config_signer_seeds: &[&[u8]] = &[
            BADGE_CONFIG_SEED,
            ctx.accounts.badge_config.coalition.as_ref(),
            &tier_seed,
            &badge_config_bump,
        ];
        token_2022::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: mint_info,
                    to: ctx.accounts.badge_token_account.to_account_info(),
                    authority: ctx.accounts.badge_config.to_account_info(),
                },
                &[config_signer_seeds],
            ),
            1,
        )?;

        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.passport.last_activity = now;
        let claim = &mut ctx.accounts.badge_claim;
        claim.badge_config = ctx.accounts.badge_config.key();
        claim.passport = ctx.accounts.passport.key();
        claim.token_account = ctx.accounts.badge_token_account.key();
        claim.bump = ctx.bumps.badge_claim;

        emit!(BadgeClaimed {
            coalition: ctx.accounts.badge_config.coalition,
            badge_config: claim.badge_config,
            passport: claim.passport,
            owner: ctx.accounts.owner.key(),
            mint: ctx.accounts.badge_mint.key(),
            token_account: claim.token_account,
            tier: ctx.accounts.badge_config.tier,
            timestamp: now,
        });
        Ok(())
    }
}

fn validate_bounded_string(
    value: &str,
    max_bytes: usize,
    empty_error: Error,
    long_error: Error,
) -> Result<()> {
    if value.trim().is_empty() {
        return Err(empty_error);
    }
    if value.len() > max_bytes {
        return Err(long_error);
    }
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeCoalition<'info> {
    #[account(
        init,
        payer = authority,
        space = Coalition::SPACE,
        seeds = [COALITION_SEED, authority.key().as_ref()],
        bump
    )]
    pub coalition: Account<'info, Coalition>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterMerchant<'info> {
    #[account(
        mut,
        seeds = [COALITION_SEED, coalition.authority.as_ref()],
        bump = coalition.bump,
        has_one = authority @ AllianceError::Unauthorized
    )]
    pub coalition: Account<'info, Coalition>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: The coalition authority selects this identity, which must sign all future merchant actions.
    pub merchant_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = Merchant::SPACE,
        seeds = [MERCHANT_SEED, coalition.key().as_ref(), merchant_authority.key().as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetMerchantActive<'info> {
    #[account(
        mut,
        seeds = [MERCHANT_SEED, merchant.coalition.as_ref(), authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ AllianceError::Unauthorized
    )]
    pub merchant: Account<'info, Merchant>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EnrollPassport<'info> {
    #[account(
        mut,
        seeds = [COALITION_SEED, coalition.authority.as_ref()],
        bump = coalition.bump
    )]
    pub coalition: Account<'info, Coalition>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = Passport::SPACE,
        seeds = [PASSPORT_SEED, coalition.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub passport: Account<'info, Passport>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(receipt_hash: [u8; 32])]
pub struct RecordPurchase<'info> {
    #[account(
        seeds = [COALITION_SEED, coalition.authority.as_ref()],
        bump = coalition.bump
    )]
    pub coalition: Account<'info, Coalition>,
    #[account(
        mut,
        seeds = [MERCHANT_SEED, coalition.key().as_ref(), authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ AllianceError::Unauthorized,
        constraint = merchant.coalition == coalition.key() @ AllianceError::InvalidAccountLink
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PASSPORT_SEED, coalition.key().as_ref(), passport.owner.as_ref()],
        bump = passport.bump,
        constraint = passport.coalition == coalition.key() @ AllianceError::InvalidAccountLink
    )]
    pub passport: Account<'info, Passport>,
    #[account(
        init_if_needed,
        payer = authority,
        space = MerchantVisit::SPACE,
        seeds = [VISIT_SEED, passport.key().as_ref(), merchant.key().as_ref()],
        bump
    )]
    pub merchant_visit: Account<'info, MerchantVisit>,
    #[account(
        init_if_needed,
        payer = authority,
        space = Receipt::SPACE,
        seeds = [RECEIPT_SEED, merchant.key().as_ref(), receipt_hash.as_ref()],
        bump
    )]
    pub receipt: Account<'info, Receipt>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(offer_id: u64)]
pub struct CreateOffer<'info> {
    #[account(
        seeds = [MERCHANT_SEED, merchant.coalition.as_ref(), authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ AllianceError::Unauthorized
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = Offer::SPACE,
        seeds = [OFFER_SEED, merchant.key().as_ref(), offer_id.to_le_bytes().as_ref()],
        bump
    )]
    pub offer: Account<'info, Offer>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetOfferActive<'info> {
    #[account(
        seeds = [MERCHANT_SEED, merchant.coalition.as_ref(), authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ AllianceError::Unauthorized
    )]
    pub merchant: Account<'info, Merchant>,
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [OFFER_SEED, merchant.key().as_ref(), offer.offer_id.to_le_bytes().as_ref()],
        bump = offer.bump,
        has_one = merchant @ AllianceError::InvalidAccountLink
    )]
    pub offer: Account<'info, Offer>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct RedeemOffer<'info> {
    #[account(
        seeds = [MERCHANT_SEED, merchant.coalition.as_ref(), merchant.authority.as_ref()],
        bump = merchant.bump
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(
        mut,
        seeds = [OFFER_SEED, merchant.key().as_ref(), offer.offer_id.to_le_bytes().as_ref()],
        bump = offer.bump,
        has_one = merchant @ AllianceError::InvalidAccountLink
    )]
    pub offer: Account<'info, Offer>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [PASSPORT_SEED, merchant.coalition.as_ref(), owner.key().as_ref()],
        bump = passport.bump,
        has_one = owner @ AllianceError::Unauthorized,
        constraint = passport.coalition == merchant.coalition @ AllianceError::InvalidAccountLink
    )]
    pub passport: Account<'info, Passport>,
    #[account(
        init,
        payer = owner,
        space = Redemption::SPACE,
        seeds = [
            REDEMPTION_SEED,
            offer.key().as_ref(),
            passport.key().as_ref(),
            nonce.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub redemption: Account<'info, Redemption>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tier: u8)]
pub struct InitializeBadgeMint<'info> {
    #[account(
        seeds = [COALITION_SEED, coalition.authority.as_ref()],
        bump = coalition.bump,
        has_one = authority @ AllianceError::Unauthorized
    )]
    pub coalition: Account<'info, Coalition>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = BadgeConfig::SPACE,
        seeds = [BADGE_CONFIG_SEED, coalition.key().as_ref(), &[tier]],
        bump
    )]
    pub badge_config: Account<'info, BadgeConfig>,
    /// CHECK: This deterministic PDA is allocated and initialized as a Token-2022 mint in the handler.
    #[account(
        mut,
        seeds = [BADGE_MINT_SEED, coalition.key().as_ref(), &[tier]],
        bump
    )]
    pub badge_mint: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimBadge<'info> {
    pub coalition: Account<'info, Coalition>,
    #[account(
        seeds = [
            BADGE_CONFIG_SEED,
            coalition.key().as_ref(),
            &[badge_config.tier]
        ],
        bump = badge_config.bump,
        constraint = badge_config.coalition == coalition.key() @ AllianceError::InvalidAccountLink
    )]
    pub badge_config: Account<'info, BadgeConfig>,
    #[account(
        mut,
        address = badge_config.mint @ AllianceError::InvalidBadgeMint
    )]
    pub badge_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [PASSPORT_SEED, coalition.key().as_ref(), owner.key().as_ref()],
        bump = passport.bump,
        has_one = owner @ AllianceError::Unauthorized,
        constraint = passport.coalition == coalition.key() @ AllianceError::InvalidAccountLink
    )]
    pub passport: Account<'info, Passport>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = badge_mint,
        associated_token::authority = owner,
        associated_token::token_program = token_program
    )]
    pub badge_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = owner,
        space = BadgeClaim::SPACE,
        seeds = [
            BADGE_CLAIM_SEED,
            badge_config.key().as_ref(),
            passport.key().as_ref()
        ],
        bump
    )]
    pub badge_claim: Account<'info, BadgeClaim>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
