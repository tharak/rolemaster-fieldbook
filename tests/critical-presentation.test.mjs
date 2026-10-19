import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {criticalTokens,formatCriticalEffect,criticalEffectMarkup,criticalLegend} from '../src/critical-presentation.js';
import {parseCriticalSymbols} from '../src/rules.js';
test('all real critical/fumble effects retain exact source and remove shorthand from display',()=>{
  let count=0;
  for(const name of readdirSync(new URL('../tables/',import.meta.url)).filter(n=>n.startsWith('A-10.10')||n.startsWith('A-10.11'))) {
    const table=JSON.parse(readFileSync(new URL('../tables/'+name,import.meta.url)));
    for(const row of table.rows||[])for(const cell of row.cells||[])if(cell.effect || cell.description){
      for (const description of [cell.effect,cell.description]) if(description) {
        assert.equal(criticalTokens(description).map(t=>t.raw??t.text).join(''),description);
        assert.doesNotMatch(formatCriticalEffect(description),/[∑∏π∫]/);
      }
      const before=parseCriticalSymbols(cell.effect);
      const tokens=criticalTokens(cell.effect);
      assert.equal(tokens.map(t=>t.raw??t.text).join(''),cell.effect||'');
      for(const mode of [false,true]) assert.doesNotMatch(formatCriticalEffect(cell.effect,mode),/[∑∏π∫]/);
      assert.deepEqual(parseCriticalSymbols(cell.effect),before); count++;
    }
  }
  assert.ok(count>500);
});
test('compounds, durations, coercion-free prose, and distinct parry meanings',()=>{
  const t=criticalTokens('+12H – 2∑∏ – 3∫ – (2π-15) – 6(-10) – (+20)').filter(t=>t.raw);
  assert.deepEqual(t.map(t=>t.label),['Extra hits: 12','Stunned and unable to parry: 2 rounds','Bleeding: 3 hits per round','Must parry: 2 rounds at −15','Penalty: −10 for 6 rounds','Attacker bonus: +20 for 1 round']);
  assert.match(formatCriticalEffect('∏'),/Unable to parry/);
  assert.match(formatCriticalEffect('π'),/Must parry/);
  assert.match(formatCriticalEffect('2∑π'),/Stunned: 2 rounds/);
  assert.match(formatCriticalEffect('π(-10)'),/Must parry: 1 round at −10/);
  assert.match(formatCriticalEffect('10 ∫'),/10 hits per round/);
  assert.equal(formatCriticalEffect('dies in 9 rounds. +10 – 20'),'dies in 9 rounds. +10 – 20');
  assert.equal(criticalLegend.length,10);
});
test('all untrusted prose and source attributes are escaped',()=>{
  const raw='<img src=x onerror="alert(1)"> +4H';
  for(const html of [formatCriticalEffect(raw),formatCriticalEffect(raw,true),criticalEffectMarkup(raw)]) {
    assert.doesNotMatch(html,/<img/); assert.match(html,/&lt;img/);
  }
});

test('requested effect emojis are exact and leave bold labels and numeric penalties intact',()=>{
  const raw=['+7H','2∑','3∏','4∑∏','5π','6(π-15)','7∫','8(-20)','9(+25)'];
  const expected=['💥','🌀','🚫','🌀🚫','🛡️','🛡️','🩸','➖','➕'];
  assert.deepEqual(criticalLegend.map(row=>row[2]),[...expected,'☠️']);
  assert.deepEqual(raw.map(text=>criticalTokens(text).find(token=>token.raw).emoji),expected);
  for(const text of raw){
    const token=criticalTokens(text).find(token=>token.raw);
    const bold=formatCriticalEffect(text,false),emoji=formatCriticalEffect(text,true);
    assert.match(bold,/<strong class="critical-token">/);
    assert.ok(bold.includes(token.label));
    assert.ok(emoji.includes('aria-label="'+token.label+'"'));
    assert.ok(emoji.includes('title="'+token.label+'"'));
  }
  assert.match(formatCriticalEffect('6(π-15)',true),/6 rounds at −15/);
  assert.doesNotMatch(formatCriticalEffect(raw.join(' – '),true),/😵|⬇|⬆|🚫🛡/);
});
