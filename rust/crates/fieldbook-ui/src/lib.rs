//! Presentational HTML components. This crate never evaluates game rules.

pub struct BattleContender<'a> {
    pub name: &'a str,
    pub profile: &'a str,
    pub side: u8,
    pub hits: u32,
    pub maximum: u32,
    pub attack: &'a str,
    pub offensive_bonus: i32,
}

/// A view model supplied by the combat application, with no rule evaluation.
pub fn battle_contender(view: BattleContender<'_>) -> String {
    let side = if view.side == 0 { 0 } else { 1 };
    let corner = if side == 0 { "Red" } else { "Blue" };
    let profile = match view.profile {
        "wolf" | "tiger" | "bear" | "dragon" | "serpent" | "bird" | "insect" | "humanoid"
        | "warrior" | "ranger" | "rogue" | "mage" | "cleric" | "bard" | "horse" | "aquatic"
        | "elemental" | "turtle" => view.profile,
        _ => "humanoid",
    };
    let name = escape(view.name);
    let attack = escape(view.attack);
    let hits = view.hits.min(view.maximum);
    let percent = if view.maximum == 0 {
        0.0
    } else {
        (f64::from(hits) / f64::from(view.maximum) * 1000.0).floor() / 10.0
    };
    format!(
        r##"<div class="battle-unit" data-battle-side="{side}" data-profile="{profile}"><div class="battle-nameplate"><span>{corner} corner</span><strong>{name}</strong></div><div class="battle-sprite-wrap"><span class="battle-shadow"></span><svg class="battle-sprite" viewBox="0 0 96 80" role="img" aria-label="{name}"><use href="assets/coliseum/creatures.svg#{profile}"></use></svg><span class="battle-impact" aria-hidden="true">✦</span><span class="battle-damage" aria-hidden="true"></span></div><div class="battle-hud"><div class="battle-weapon"><strong data-battle-attack>{attack}</strong><span data-battle-ob>OB {ob:+}</span></div><div class="battle-metrics"><span>ROLL <b data-battle-roll>—</b></span><span>HITS <b data-battle-hits>—</b></span><span>CRIT <b data-battle-critical>—</b></span></div><div class="battle-health"><strong data-battle-health>{hits}</strong><div class="battle-health-track" role="meter" aria-label="{name} hits remaining" aria-valuemin="0" aria-valuemax="{maximum}" aria-valuenow="{hits}"><span style="width:{percent:.1}%"></span></div><small>/ {maximum}</small></div><ul class="battle-status-list" data-battle-statuses aria-label="{name} statuses" tabindex="0"><li class="battle-status-empty">No active effects</li></ul></div></div>"##,
        ob = view.offensive_bonus,
        maximum = view.maximum
    )
}

pub fn escape(value: &str) -> String {
    let mut result = String::with_capacity(value.len());
    for character in value.chars() {
        match character {
            '&' => result.push_str("&amp;"),
            '<' => result.push_str("&lt;"),
            '>' => result.push_str("&gt;"),
            '"' => result.push_str("&quot;"),
            '\'' => result.push_str("&#39;"),
            other => result.push(other),
        }
    }
    result
}

/// mode: 0 = readable text, 1 = emoji with accessible full text, 2 = initiative.
pub fn critical_token(label: &str, emoji: &str, mode: u8) -> String {
    let safe_label = escape(label);
    match mode {
        2 => format!("<strong class=\"critical-initiative\">{safe_label}</strong>"),
        1 => {
            let short = label.split_once(':').map_or(label, |(_, tail)| tail).trim();
            format!("<span class=\"critical-token\" role=\"img\" aria-label=\"{safe_label}\" title=\"{safe_label}\">{} <strong>{}</strong></span> ", escape(emoji), escape(short))
        }
        _ => format!("<strong class=\"critical-token\">{safe_label}</strong> "),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn battle_contender_escapes_names_and_restricts_asset_paths() {
        let result = battle_contender(BattleContender {
            name: "<script> & \"foe\"",
            profile: "../../unknown",
            side: 7,
            hits: 999,
            maximum: 100,
            attack: "<attack>",
            offensive_bonus: -20,
        });
        assert!(!result.contains("<script>"));
        assert!(!result.contains("../../unknown"));
        assert!(result.contains("creatures.svg#humanoid"));
        assert!(result.contains("data-battle-side=\"1\""));
        assert!(result.contains("aria-valuenow=\"100\""));
        assert!(result.contains("&lt;attack&gt;"));
        assert!(result.contains("OB -20"));
    }

    #[test]
    fn battle_contender_handles_zero_hits_without_invalid_meter_width() {
        let result = battle_contender(BattleContender {
            name: "Wolf",
            profile: "wolf",
            side: 0,
            hits: 0,
            maximum: 0,
            attack: "Bite",
            offensive_bonus: 65,
        });
        assert!(result.contains("aria-valuenow=\"0\""));
        assert!(!result.contains("NaN"));
        assert!(!result.contains("inf"));
    }

    #[test]
    fn text_and_attributes_are_escaped_and_emoji_is_accessible() {
        let result = critical_token("Penalty: <script> & \"quote\" '", "➖", 1);
        assert!(!result.contains("<script>"));
        assert!(
            result.contains("aria-label=\"Penalty: &lt;script&gt; &amp; &quot;quote&quot; &#39;\"")
        );
        assert!(result.contains("➖ <strong>&lt;script&gt;"));
    }

    #[test]
    fn initiative_and_readable_modes_keep_existing_markup() {
        assert_eq!(
            critical_token("Stunned: 2 rounds", "🌀", 0),
            "<strong class=\"critical-token\">Stunned: 2 rounds</strong> "
        );
        assert_eq!(
            critical_token("Next round", "", 2),
            "<strong class=\"critical-initiative\">Next round</strong>"
        );
    }
}
