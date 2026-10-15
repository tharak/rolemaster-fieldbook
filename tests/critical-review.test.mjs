import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criticalReferences,reviewCell,reviewTable,reviewReasons} from '../critical-review-rules.js';
const cell=(effect,description='A clear strike.')=>reviewCell({description,effect});
test('review conventions do not mistake established durations for missing ones',()=>{
  for(const effect of ['+0H','+12H – ∑∏ – 4∫','π','∏','∑','2∫','(+10)','6(-20)'])assert.equal(cell(effect).status,'green',effect);
  for(const description of ['Permanent penalty.','Penalty lasts until healed.','Penalty applies for 2 weeks.'])assert.equal(cell('(-20)',description).status,'green',description);
  assert.ok(cell('(-20)').reasons.includes('duration'));
  assert.ok(cell('', 'Foe is stunned.').reasons.includes('duration'));
  assert.equal(cell('', 'Foe is stunned for 2 rounds.').status,'green');
});
test('unknown notation, conditions, missing values and suspicious OCR never green',()=>{
  for(const effect of ['+10','12H','Ω','??','@','(n)','2∑π','10 ∫','π(-10)','with helmet: +10H w/o helmet: 3∑'])assert.equal(cell(effect).status,'yellow',effect);
  assert.equal(cell('+3H','If helmet is absent, ask the GM to review.').status,'yellow');
  assert.equal(cell('+1H','Unknown Ω effect.').status,'yellow');
  assert.equal(reviewCell(null).status,'yellow');
  assert.equal(reviewCell({description:'',effect:'+2H'}).status,'yellow');
  assert.equal(reviewCell({description:'Strike.',effect:42}).status,'yellow');
});
test('full manifest inventory is covered and count sums match cells without mutating tables',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../tables/index.json',import.meta.url)));
  const refs=criticalReferences(manifest);assert.equal(refs.length,9);
  let total=0,green=0,yellow=0;
  for(const ref of refs){
    const table=JSON.parse(readFileSync(new URL('../tables/'+ref.file,import.meta.url)));
    const before=JSON.stringify(table),review=reviewTable(ref,table);
    assert.equal(review.error,null);assert.equal(review.total,table.rows.length*table.columns.length);
    assert.equal(review.total,review.green+review.yellow);
    for(const c of review.rows.flatMap(r=>r.cells)){
      assert.equal(c.status==='green',c.reasons.length===0);
      c.reasons.forEach(r=>assert.ok(reviewReasons[r]));
    }
    assert.equal(JSON.stringify(table),before);total+=review.total;green+=review.green;yellow+=review.yellow;
  }
  assert.equal(total,836);assert.equal(total,green+yellow);assert.ok(green>0&&yellow>0);
  console.log('Critical review inventory:',JSON.stringify({tables:refs.length,total,green,yellow}));
  assert.equal(criticalReferences([...manifest,{code:'A-10.10.99',file:'future.json'}]).length,10);
});
test('empty manifests, malformed tables and absent cells cannot silently succeed',()=>{
  assert.deepEqual(criticalReferences([]),[]);assert.throws(()=>criticalReferences({}));
  for(const table of [null,{}, {kind:'critical',columns:[{label:'A'}],rows:[]}])assert.ok(reviewTable({code:'x'},table).error);
  const review=reviewTable({code:'x'},{kind:'critical',columns:[{label:'A'},{label:'B'}],rows:[{roll:'01-05',cells:[{description:'Strike.',effect:'+1H'}]}]});
  assert.equal(review.total,2);assert.equal(review.yellow,1);
  assert.ok(reviewTable({code:'x'},null,new Error('HTTP 404')).error.includes('404'));
});
