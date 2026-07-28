pub const POINTS_DENOMINATOR: u64 = 100;
pub const BONUS_STEP_BPS: u64 = 250;
pub const MAX_BONUS_BPS: u64 = 1_500;
pub const BPS_DENOMINATOR: u64 = 10_000;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PointsAward {
    pub base_points: u64,
    pub bonus_bps: u64,
    pub bonus_points: u64,
    pub total_points: u64,
}

pub fn calculate_points(
    spend_minor: u64,
    points_per_usdc: u64,
    unique_merchants: u32,
) -> Option<PointsAward> {
    let base_points = spend_minor
        .checked_mul(points_per_usdc)?
        .checked_div(POINTS_DENOMINATOR)?;

    let additional_merchants = if unique_merchants > 1 {
        unique_merchants.checked_sub(1)?
    } else {
        0
    };
    let uncapped_bonus_bps = u64::from(additional_merchants).checked_mul(BONUS_STEP_BPS)?;
    let bonus_bps = uncapped_bonus_bps.min(MAX_BONUS_BPS);
    let bonus_points = base_points
        .checked_mul(bonus_bps)?
        .checked_div(BPS_DENOMINATOR)?;
    let total_points = base_points.checked_add(bonus_points)?;

    Some(PointsAward {
        base_points,
        bonus_bps,
        bonus_points,
        total_points,
    })
}

pub fn tier_for_points(lifetime_points: u64, silver_threshold: u64, gold_threshold: u64) -> u8 {
    if lifetime_points >= gold_threshold {
        2
    } else if lifetime_points >= silver_threshold {
        1
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_merchant_has_no_network_bonus() {
        let award = calculate_points(10_000, 10, 1).unwrap();
        assert_eq!(award.base_points, 1_000);
        assert_eq!(award.bonus_bps, 0);
        assert_eq!(award.total_points, 1_000);
    }

    #[test]
    fn second_merchant_earns_two_and_a_half_percent() {
        let award = calculate_points(10_000, 10, 2).unwrap();
        assert_eq!(award.base_points, 1_000);
        assert_eq!(award.bonus_bps, 250);
        assert_eq!(award.bonus_points, 25);
        assert_eq!(award.total_points, 1_025);
    }

    #[test]
    fn network_bonus_caps_at_fifteen_percent() {
        let seventh = calculate_points(10_000, 10, 7).unwrap();
        let twentieth = calculate_points(10_000, 10, 20).unwrap();
        assert_eq!(seventh.bonus_bps, 1_500);
        assert_eq!(seventh.total_points, 1_150);
        assert_eq!(twentieth, seventh);
    }

    #[test]
    fn point_math_rounds_fractional_points_down() {
        let award = calculate_points(101, 1, 2).unwrap();
        assert_eq!(award.base_points, 1);
        assert_eq!(award.bonus_points, 0);
        assert_eq!(award.total_points, 1);
    }

    #[test]
    fn point_math_detects_overflow() {
        assert!(calculate_points(u64::MAX, 2, 1).is_none());
        assert!(calculate_points(u64::MAX, 1, u32::MAX).is_none());
    }

    #[test]
    fn tiers_change_at_exact_thresholds() {
        assert_eq!(tier_for_points(999, 1_000, 5_000), 0);
        assert_eq!(tier_for_points(1_000, 1_000, 5_000), 1);
        assert_eq!(tier_for_points(4_999, 1_000, 5_000), 1);
        assert_eq!(tier_for_points(5_000, 1_000, 5_000), 2);
    }
}
