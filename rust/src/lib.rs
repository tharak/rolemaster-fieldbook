//! Numerical core shared by native tests and the browser Wasm adapter.

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn rank_bonus_wasm(ranks: f64, progression: &str) -> f64 {
    rank_bonus(ranks, progression)
}

/// Equivalent to rules.js rankBonus after JavaScript Number(input) conversion.
/// Unknown progression names retain the original standard-progression fallback.
/// Negative values and NaN become zero; fractions and positive infinity are kept.
pub fn rank_bonus(ranks: f64, progression: &str) -> f64 {
    let n = if ranks.is_nan() { 0.0 } else { ranks.max(0.0) };
    let first = n.min(10.0);
    let second = (n - 10.0).clamp(0.0, 10.0);
    let third = (n - 20.0).clamp(0.0, 10.0);
    let rest = (n - 30.0).max(0.0);
    let rounded = |value: f64| (value + 0.5).floor();
    match progression {
        "category" => {
            if n == 0.0 {
                -15.0
            } else {
                rounded(2.0 * first + second + 0.5 * third)
            }
        }
        "limited" => rounded(n.min(20.0) + 0.5 * third),
        "special" => 6.0 * first + 5.0 * second + 4.0 * third + 3.0 * rest,
        "combined" => {
            if n == 0.0 {
                -30.0
            } else {
                rounded(5.0 * first + 3.0 * second + 1.5 * third + 0.5 * rest)
            }
        }
        _ => {
            if n == 0.0 {
                -15.0
            } else {
                rounded(3.0 * first + 2.0 * second + third + 0.5 * rest)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::rank_bonus;

    #[test]
    fn table_boundaries() {
        for (n, progression, expected) in [
            (0.0, "standard", -15.0),
            (10.0, "standard", 30.0),
            (20.0, "standard", 50.0),
            (31.0, "standard", 61.0),
            (0.0, "category", -15.0),
            (11.0, "category", 21.0),
            (21.0, "category", 31.0),
            (0.0, "combined", -30.0),
            (21.0, "combined", 82.0),
            (1.0, "limited", 1.0),
            (30.0, "limited", 25.0),
            (31.0, "special", 153.0),
        ] {
            assert_eq!(rank_bonus(n, progression), expected);
        }
    }

    #[test]
    fn numeric_normalization_and_fallback() {
        assert_eq!(rank_bonus(f64::NAN, "standard"), -15.0);
        assert_eq!(rank_bonus(-1.0, "combined"), -30.0);
        assert_eq!(rank_bonus(f64::NEG_INFINITY, "limited"), 0.0);
        assert_eq!(rank_bonus(31.0, "unknown"), 61.0);
        assert_eq!(rank_bonus(0.25, "special"), 1.5);
        assert_eq!(rank_bonus(0.5, "standard"), 2.0);
        assert_eq!(rank_bonus(f64::INFINITY, "category"), 35.0);
        assert_eq!(rank_bonus(f64::INFINITY, "limited"), 25.0);
        assert_eq!(rank_bonus(f64::INFINITY, "standard"), f64::INFINITY);
    }
}
