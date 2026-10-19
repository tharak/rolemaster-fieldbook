import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criticalSourceCorrections,normalizedCriticalCell,normalizedCriticalTable} from '../src/critical-source.js';
import {parseCriticalSymbols} from '../src/rules.js';
import {resolveCriticalEquipment} from '../src/critical-equipment.js';
import {criticalDeath} from '../src/critical-death.js';
import {reviewCell} from '../src/critical-review-rules.js';

test('every source correction matches its original coordinate and retains the extracted source',()=>{
  assert.ok(criticalSourceCorrections.length>=53);
  const coordinates=new Set();
  for(const correction of criticalSourceCorrections){
    assert.ok(!coordinates.has(correction.coordinate));coordinates.add(correction.coordinate);
    const [code,roll,column]=correction.coordinate.split(':');
    const table=JSON.parse(readFileSync(new URL('../tables/'+code+'.json',import.meta.url)));
    const source=table.rows.find(row=>row.roll===roll).cells[Number(column)],before=JSON.stringify(table);
    assert.deepEqual(source,correction.original,correction.coordinate);
    assert.equal(correction.pdfPage,correction.printedPage+1);
    const normalized=normalizedCriticalTable(table).rows.find(row=>row.roll===roll).cells[Number(column)];
    assert.equal(normalized.description,correction.corrected.description);
    assert.equal(normalized.effect,correction.corrected.effect);
    const review=reviewCell(source);
    assert.equal(review.originalDescription,source.description);assert.equal(review.originalEffect,source.effect);
    assert.equal(review.sourceCorrection,correction.coordinate);
    assert.ok(review.notes.some(note=>note.includes('PDF page')));
    assert.equal(JSON.stringify(table),before);
  }
  const first=criticalSourceCorrections[0];
  assert.equal(normalizedCriticalCell({...first.original,effect:first.original.effect+' changed'}).sourceCorrection,undefined,'Changed source must not silently receive a stale correction');
});

test('audited shield alternatives and wet conditions apply one matching branch',()=>{
  const correction=criticalSourceCorrections.find(c=>c.coordinate==='A-10.10.1:61-65:3');
  const cell=normalizedCriticalCell(correction.original);
  for(const [gear,hits,stun] of [[['shield'],20,0],[[],0,5]]){
    const branch=resolveCriticalEquipment(cell.description,cell.effect,gear);
    const effects=parseCriticalSymbols(branch.effect,branch.description);
    assert.equal(effects.filter(e=>e.kind==='hits').reduce((n,e)=>n+e.amount,0),hits);
    assert.equal(effects.filter(e=>e.kind==='stun').reduce((n,e)=>n+e.roundsLeft,0),stun);
  }
  for(const [gear,hits,bleed] of [[[],9,2],[['wet'],6,0]]){
    const branch=resolveCriticalEquipment('Flames strike.','If not wet: +9H – 2∫ If wet: +6H – 2π',gear);
    const effects=parseCriticalSymbols(branch.effect,branch.description);
    assert.equal(effects.find(e=>e.kind==='hits').amount,hits);
    assert.equal(effects.filter(e=>e.kind==='bleed').reduce((n,e)=>n+e.amount,0),bleed);
  }
});

test('the four user rulings affect only their exact source entries and preserve other effects',()=>{
  const cases=[
    ['A-10.10.2:66:1',[{kind:'hits',amount:10},{kind:'stun',roundsLeft:2},{kind:'bleed',amount:4,roundsLeft:null}]],
    ['A-10.10.2:66:3',[{kind:'hits',amount:10},{kind:'stun',roundsLeft:1},{kind:'bleed',amount:6,roundsLeft:null},{kind:'penalty',amount:10,roundsLeft:null,durationLabel:'until healed'}]],
    ['A-10.10.2:76-80:1',[{kind:'hits',amount:20},{kind:'bleed',amount:2,roundsLeft:null}]],
    ['A-10.10.9:91-95:1',[{kind:'stunNoParry',roundsLeft:2},{kind:'penalty',amount:30,roundsLeft:null,durationLabel:'until healed'}]],
  ];
  for(const [coordinate,expected] of cases){
    const ruling=criticalSourceCorrections.find(entry=>entry.coordinate===coordinate);
    assert.equal(ruling.interpretation,true);
    const cell=normalizedCriticalCell(ruling.original);
    assert.deepEqual(parseCriticalSymbols(cell.effect,cell.description),expected,coordinate);
    const review=reviewCell(ruling.original);assert.equal(review.status,'green');
    assert.ok(review.notes.some(note=>note.includes('User ruling')));
  }
  assert.equal(criticalSourceCorrections.filter(entry=>entry.interpretation).length,4);
  assert.equal(reviewCell({description:'Unrelated source.',effect:'2∑π'}).status,'yellow','The specific no-parry ruling must not silently rewrite unrelated compounds');
});

test('parry spelling, spaced bleeding, and ally scope have explicit mechanics',()=>{
  assert.deepEqual(parseCriticalSymbols('π(-20)'),[{kind:'mustParry',roundsLeft:1,amount:20}]);
  assert.deepEqual(parseCriticalSymbols('10 ∫'),[{kind:'bleed',amount:10,roundsLeft:null}]);
  assert.deepEqual(parseCriticalSymbols('all allies get (+10)'),[{kind:'allyBonus',amount:10,roundsLeft:1}]);
  assert.equal(reviewCell({description:'A clear result.',effect:'all allies get +10 for 1 round'}).status,'green');
});

test('explicit death variants parse while figurative death and uncertainty remain ordinary prose',()=>{
  for(const [description,rounds] of [['He dies.',0],['Foe is dead.',0],['He dies next round.',1],['He dies a round later.',1],['Foe is in shock for 12 rounds, then dies.',12],['Foe flails around for 6 rounds before he dies.',6],['Foe expires in 12 rounds.',12],['Falls again and dies in 6 rounds.',6],['Foe dies in 6 painful rounds.',6]]){
    assert.equal(criticalDeath(description)?.rounds,rounds,description);
    assert.equal(parseCriticalSymbols('',description).find(e=>e.kind==='dies')?.roundsLeft,rounds,description);
  }
  const hours='Foe is down and immobile for 2 hours, then he dies.';
  assert.equal(criticalDeath(hours)?.manual,true);assert.equal(parseCriticalSymbols('',hours).some(e=>e.kind==='dies'),false);
  for(const description of ['The heat dies quick.','The flames die down; foe escapes death.','Not a mortal wound.','Foe is uncertain about your attack.','A mortal blow poorly placed.']){
    assert.equal(parseCriticalSymbols('',description).some(e=>e.kind==='dies'),false,description);
    assert.equal(reviewCell({description,effect:'+2H'}).status,'green',description);
  }
  assert.equal(reviewCell({description:'If the moon is full, foe dies in 3 rounds.',effect:'+2H'}).status,'yellow');
});
