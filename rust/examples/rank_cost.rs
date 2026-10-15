use rolemaster_core::rank_cost;
use std::io::{self, BufRead};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    for line in io::stdin().lock().lines() {
        let line = line?;
        let (ranks, values) = line.split_once('\t').ok_or("expected ranks and costs")?;
        let costs: Vec<f64> = if values.is_empty() {
            vec![]
        } else {
            values
                .split(',')
                .map(str::parse)
                .collect::<Result<_, _>>()?
        };
        println!("{}", rank_cost(&costs, ranks.parse()?));
    }
    Ok(())
}
