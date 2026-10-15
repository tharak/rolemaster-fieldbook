//! Browser adapter only. Rules and UI live in independent workspace crates.

pub use rolemaster_rules::{basic_stat_bonus, rank_bonus, rank_cost};

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn critical_effect_rounds_wasm(
    rounds: &[f64],
    starts: &[f64],
    priorities: &[u8],
    completed: f64,
) -> Result<Vec<f64>, wasm_bindgen::JsValue> {
    rolemaster_rules::critical_effect_rounds(rounds, starts, priorities, completed)
        .map_err(wasm_bindgen::JsValue::from_str)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn critical_token_wasm(label: &str, emoji: &str, mode: u8) -> String {
    fieldbook_ui::critical_token(label, emoji, mode)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn rank_bonus_wasm(ranks: f64, progression: &str) -> f64 {
    rank_bonus(ranks, progression)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn rank_cost_wasm(costs: &[f64], ranks: f64) -> f64 {
    rank_cost(costs, ranks)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn basic_stat_bonus_wasm(value: f64) -> f64 {
    basic_stat_bonus(value)
}
