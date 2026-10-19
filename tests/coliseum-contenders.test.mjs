import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEncounterRoster} from '../src/encounter-roster.js';
import {arenaWeaponStyles,characterContenders,masterCharacterCatalog,configureContender} from '../src/coliseum-contenders.js';
import {createFight,stepFight,creatureCatalog,chooseAttacks} from '../src/coliseum-rules.js';
const read=code=>JSON.parse(readFileSync(new URL('../tables/'+code+'.json',import.meta.url)));
const source=read('T-5.8'),master=masterCharacterCatalog(source);
const tables=Object.fromEntries([...Array.from({length:8},(_,i)=>`A-10.9.${i+1}`),...Array.from({length:6},(_,i)=>`A-10.10.${i+3}`)].map(code=>[code,read(code)]));

test('all 45 master enemies retain their printed profession, level, hits, AT, DB and OBs',()=>{
  const expected={
    Fighter:[[8,17,20,20,20],[30,30,30,30,30],[56,109,143,162,172],[50,95,122,135,140],[45,93,122,135,140]],
    Thief:[[6,9,9,9,9],[15,24,24,24,24],[35,68,94,114,130],[35,54,79,94,109],[20,39,54,64,79]],
    Rogue:[[7,13,13,13,13],[30,30,30,30,30],[41,86,114,136,148],[50,79,104,114,119],[45,64,89,104,119]],
    Cleric:[[6,10,10,10,10],[30,30,30,30,30],[30,51,63,81,89],[20,49,64,79,92],[20,39,49,64,70]],
    Magician:[[1,1,1,1,1],[0,12,12,12,12],[30,51,63,81,89],[20,72,102,117,122],[10,27,32,37,42]],
    Mentalist:[[5,13,13,13,13],[30,30,30,30,30],[30,51,63,81,89],[15,44,59,74,87],[5,22,27,37,42]],
    Ranger:[[6,10,10,10,10],[30,30,30,30,30],[45,84,104,124,142],[20,62,88,102,115],[20,49,64,79,92]],
    Dabbler:[[1,1,1,1,1],[0,12,12,12,12],[35,74,94,114,132],[20,57,82,100,109],[10,42,67,82,97]],
    Bard:[[5,13,13,13,13],[30,30,30,30,30],[35,74,94,114,132],[20,57,82,100,109],[20,49,64,79,92]],
  };
  assert.equal(master.length,45);assert.equal(new Set(master.map(item=>item.id)).size,45);
  for(const [profession,[armor,db,hits,first,second]] of Object.entries(expected)){
    const rows=master.filter(item=>item.profession===profession);
    assert.deepEqual(rows.map(item=>item.level),[1,5,10,15,20]);
    assert.deepEqual(rows.map(item=>item.armor_type),armor);assert.deepEqual(rows.map(item=>item.db),db);assert.deepEqual(rows.map(item=>item.hits),hits);
    assert.deepEqual(rows.map(item=>item.sourceAttacks[0].ob),first);assert.deepEqual(rows.map(item=>item.sourceAttacks[1].ob),second);
    for(const item of rows){assert.equal(item.source.printedPage,61);assert.equal(item.source.pdfPage,62);assert.ok(source.tablePages[0].text.includes(item.source.raw));}
  }
  assert.throws(()=>masterCharacterCatalog({...source,tablePages:[]}),/expected 45/);
});

test('master shield DB is not doubled and directed spell OB never becomes a weapon attack',()=>{
  const fighter=master.find(item=>item.id==='master:fighter:1'),magician=master.find(item=>item.id==='master:magician:10');
  assert.equal(fighter.db,30);assert.deepEqual(fighter.suggestedEquipment,['shield']);
  assert.equal(magician.db,12);assert.equal(magician.ppMax,73);assert.equal(magician.spellDefense,true);
  assert.deepEqual(magician.attacks.map(attack=>attack.ob),[32]);assert.equal(magician.sourceAttacks[0].ob,102);
  const missile=configureContender(fighter,{attackKey:'slot-2',category:'Weapon • Thrown'});
  assert.deepEqual(chooseAttacks(missile,1),[1]);assert.deepEqual(chooseAttacks(missile,100),[1]);
  assert.equal(missile.attacks[1].ob,45);assert.equal(missile.attacks[1].attackTable,'A-10.9.6');
  const invalidStyle=configureContender(fighter,{attackKey:'slot-2',category:'Weapon • 1-H Concussion'});
  assert.equal(invalidStyle.attacks[1].attackTable,'A-10.9.4');
});

test('saved characters share encounter calculations, have separate IDs, and leave their records unchanged',()=>{
  const record={id:'monster-0',name:'Hero',race:'Common Man',profession:'Fighter',level:'1',hits:'35',dbShield:'15',stats:{Quickness:{total:4}},categoryRanks:{'Weapon • 1-H Edged':{start:2}},skills:[{category:'Weapon • 1-H Edged',name:'Broadsword',ranks:3}],startingWeapons:JSON.stringify([JSON.stringify(['Weapon • 1-H Edged','Broadsword'])])};
  const before=JSON.stringify(record),actor=buildEncounterRoster([record])[0],character=characterContenders([actor])[0];
  assert.equal(character.id,'character:monster-0');assert.equal(character.attacks[0].ob,actor.attacks[0].bonus);assert.equal(character.attacks[0].ob,33);
  assert.equal(character.db,27);assert.equal(character.initiativeBonus,4);assert.equal(character.hits,35);assert.deepEqual(character.suggestedEquipment,['shield']);
  assert.equal(character.unavailable,'');assert.equal(JSON.stringify(record),before);
  const [incomplete]=characterContenders(buildEncounterRoster([{id:'incomplete',name:'Unfinished',stats:{},skills:[]}])) ;
  assert.match(incomplete.unavailable,/Body Development/);assert.match(incomplete.unavailable,/equip/);assert.deepEqual(incomplete.attacks,[]);
});

test('every equipped weapon category dispatches its own attack and critical tables with the character OB and DB',()=>{
  const target=creatureCatalog(read('creatures')).find(item=>item.name==='Wolf');
  for(const [category,style] of Object.entries(arenaWeaponStyles)){
    const actor={id:category,name:'Hero',race:'Common Man',profession:'Fighter',level:1,hitsMax:10000,at:1,db:17,stats:[0,0,0,0,0,0,0,0,4],attacks:[{name:style.label,category,bonus:200}],equipmentNames:[]};
    const character=configureContender(characterContenders([actor])[0]);
    const fixture={...tables,[style.table]:{columns:[{label:'AT 1'}],rows:[{roll:'01-150',values:['5A']}]}};
    const fight=createFight(character,{...target,hits:10000,armor_type:1,db:0});stepFight(fight,fixture,()=>.49);
    const attack=fight.log[0].events.find(event=>event.kind==='attack'&&event.side===0);
    assert.equal(attack.code,style.table,category);assert.equal(attack.ob,200);assert.equal(attack.critical.code,style.critical);
    assert.equal(fight.log[0].initiative[0].side,0);assert.equal(fight.log[0].initiative[0].total,14);
    const incoming=fight.log[0].events.find(event=>event.kind==='attack'&&event.side===1);if(incoming)assert.equal(incoming.db,17);
  }
});

test('all master presets can complete a deterministic duel without invalid combat state',()=>{
  for(const contender of master){
    const selected=configureContender(contender),fight=createFight(selected,selected);
    while(!fight.finished)stepFight(fight,tables,()=>.49);
    assert.ok(fight.round<=200,contender.name);assert.ok(fight.fighters.every(fighter=>Number.isFinite(fighter.hits)),contender.name);
  }
});
