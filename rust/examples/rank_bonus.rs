//! Test-only line protocol: progression<TAB>numeric ranks -> one result per line.
use rolemaster_core::rank_bonus;
use std::io::{self, BufRead};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    for line in io::stdin().lock().lines() {
        let line = line?;
        let (progression, ranks) = line
            .split_once('\t')
            .ok_or("expected progression<TAB>ranks")?;
        println!("{}", rank_bonus(ranks.parse()?, progression));
    }
    Ok(())
}
