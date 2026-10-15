// Recognize explicit target-fatal clauses, never a stray "instantly" or a die roll.
const patterns = [
  /\b(?:foe|he|enemy|opponent)\b[^.!?;]{0,80}?\b(?:dies?|(?:is\s+)?dead)\s+instantly\b/i,
  /\b(?:killing|kills?)\s+(?:him|foe|enemy|opponent)\s+instantly\b/i,
  /\b(?:foe|he|enemy|opponent)\b[^.!?;]{0,80}?\bdies?\s+(?:(?:of|from)\s+[^.!?;]{1,50}?\s+)?(?:in|after)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:rounds?|rnds?)\b/i,
  /\b(?:foe|he|enemy|opponent)\b[^.!?;]{0,80}?\bdies?\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:rounds?|rnds?)\s+later\b/i,
];
export function criticalDeath(text) {
  const input=String(text||'');
  const matches=patterns.map((pattern,index)=>{const m=pattern.exec(input);return m?{raw:m[0],index:m.index,rounds:index<2?0:(Number(m[1])||({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12})[m[1].toLowerCase()])}:null;}).filter(Boolean).sort((a,b)=>a.index-b.index||a.rounds-b.rounds);
  const match=matches[0]; if(!match)return null;
  const prefix=input.slice(0,match.index).split(/[.!?;]/).at(-1)+' '+match.raw;
  match.conditional=/\b(?:if|unless|otherwise|without|w\/o)\b/i.test(prefix);
  return match;
}
export function cancelCriticalDeathOnHealing(target,oldDamage) {
  if(target.deathRound!==undefined&&target.hits<oldDamage){delete target.deathRound;delete target.deathDamage;return true;}
  return false;
}
function kill(target,maxHits) {
  target.hits=Math.max(target.hits||0,maxHits);target.dead=true;
  target.statuses=[...new Set([...(target.statuses||[]),'Dead'])];
  delete target.deathRound;delete target.deathDamage;
}
export function applyCriticalDeath(target,maxHits,round,count) {
  if(target.dead)return;
  if(count===0){kill(target,maxHits);return;}
  if(!Number.isFinite(count)||count<1)return;
  target.deathRound=Math.min(target.deathRound??Infinity,round+count);
  target.deathDamage=target.hits;
}
export function advanceCriticalDeath(target,maxHits,round) {
  if(target.deathRound===undefined)return false;
  if(cancelCriticalDeathOnHealing(target,target.deathDamage))return false;
  if(round>=target.deathRound){kill(target,maxHits);return true;}
  return false;
}
