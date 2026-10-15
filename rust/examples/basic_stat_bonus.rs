use rolemaster_core::basic_stat_bonus;
use std::io::{self, BufRead};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    for line in io::stdin().lock().lines() {
        println!("{}", basic_stat_bonus(line?.parse()?));
    }
    Ok(())
}
