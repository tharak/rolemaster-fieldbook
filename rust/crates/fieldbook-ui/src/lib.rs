//! Presentational HTML components. This crate never evaluates game rules.

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
