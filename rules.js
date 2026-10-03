// Pure rules shared by character and encounter views.
export function rankBonus(ranks, progression) {
  const n = Math.max(0, Number(ranks) || 0);
  const rounded = value => Math.floor(value + 0.5);
  if (progression === 'category') return n ? rounded(2 * Math.min(n, 10) + Math.min(Math.max(n - 10, 0), 10) + .5 * Math.min(Math.max(n - 20, 0), 10)) : -15;
  if (progression === 'limited') return rounded(Math.min(n, 20) + .5 * Math.min(Math.max(n - 20, 0), 10));
  if (progression === 'special') return 6 * Math.min(n, 10) + 5 * Math.min(Math.max(n - 10, 0), 10) + 4 * Math.min(Math.max(n - 20, 0), 10) + 3 * Math.max(n - 30, 0);
  if (progression === 'combined') return n ? rounded(5 * Math.min(n, 10) + 3 * Math.min(Math.max(n - 10, 0), 10) + 1.5 * Math.min(Math.max(n - 20, 0), 10) + .5 * Math.max(n - 30, 0)) : -30;
  return n ? rounded(3 * Math.min(n, 10) + 2 * Math.min(Math.max(n - 10, 0), 10) + Math.min(Math.max(n - 20, 0), 10) + .5 * Math.max(n - 30, 0)) : -15;
}

export function rankCost(costs, ranks) {
  return (costs || []).slice(0, Math.max(0, Number(ranks) || 0)).reduce((sum, value) => sum + value, 0);
}

export function openEndedD100(rollD100, unmodifiedExceptions = false) {
  const first = rollD100(), dice = [first];
  if (unmodifiedExceptions && (first === 66 || first === 100)) return {first, dice, total:first, unmodified:true};
  if (first <= 5) { let next; do { next = rollD100(); dice.push(-next); } while (next >= 96); }
  else if (first >= 96) { let next; do { next = rollD100(); dice.push(next); } while (next >= 96); }
  return {first, dice, total:dice.reduce((sum, value) => sum + value, 0), unmodified:false};
}

export function parseCriticalSymbols(raw) {
  const effects = []; let rest = String(raw || '');
  const take = (pattern, handler) => { rest = rest.replace(pattern, (...match) => { handler(...match); return ' '; }); };
  take(/\+(\d+)H\b/g, (_, amount) => effects.push({kind:'hits', amount:Number(amount)}));
  take(/(\d*)∑∏/g, (_, rounds) => effects.push({kind:'stunNoParry', roundsLeft:Number(rounds) || 1}));
  take(/(\d*)\(\s*(\d*)π\s*[-−–]\s*(\d+)\s*\)/g, (_, outer, inner, penalty) => effects.push({kind:'mustParry', roundsLeft:Number(outer || inner) || 1, amount:Number(penalty)}));
  take(/(\d*)∑/g, (_, rounds) => effects.push({kind:'stun', roundsLeft:Number(rounds) || 1}));
  take(/(\d*)∏/g, (_, rounds) => effects.push({kind:'noParry', roundsLeft:Number(rounds) || 1}));
  take(/(\d*)π/g, (_, rounds) => effects.push({kind:'mustParry', roundsLeft:Number(rounds) || 1, amount:0}));
  take(/(\d*)∫/g, (_, amount) => effects.push({kind:'bleed', amount:Number(amount) || 1, roundsLeft:null}));
  take(/(\d*)\(\s*[-−–]\s*(\d+)\s*\)/g, (_, rounds, amount) => effects.push({kind:'penalty', amount:Number(amount), roundsLeft:rounds ? Number(rounds) : null}));
  take(/(\d*)\(\s*\+\s*(\d+)\s*\)/g, (_, rounds, amount) => effects.push({kind:'bonus', amount:Number(amount), roundsLeft:Number(rounds) || 1}));
  return effects;
}
