(() => {
  const STORAGE_KEY = 'rolemaster-fieldbook-characters-v1';
  const statNames = ['Agility', 'Constitution', 'Memory', 'Reasoning', 'Self Discipline', 'Empathy', 'Intuition', 'Presence', 'Quickness', 'Strength'];
  let tables = [];
  let activeTable = null;
  const tableCache = new Map();
  let developmentRules = null;
  const realmByProfession = {Fighter:'Choose at table',Thief:'Choose at table',Rogue:'Choose at table',Cleric:'Channeling',Magician:'Essence',Mentalist:'Mentalism',Ranger:'Channeling',Dabbler:'Essence',Bard:'Mentalism'};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const form = $('#character-form');
  let characters = readCharacters();
  let currentId = null;
  let activeTableGroup = 'all';
  let skillCategoryPickerTarget = null;
  let skillChoiceTarget = null;
  const primeStats = {Fighter:['Strength','Constitution'], Thief:['Agility','Quickness'], Rogue:['Agility','Strength'], Cleric:['Intuition','Memory'], Magician:['Empathy','Reasoning'], Mentalist:['Presence','Self Discipline'], Ranger:['Intuition','Constitution'], Dabbler:['Empathy','Agility'], Bard:['Presence','Memory']};
  // Category stats and rank progressions from Core Rules T-2.5.
  const skillCategoryRules = {
    'Armor • Heavy':['St/Ag/St'], 'Armor • Light':['Ag/St/Ag'], 'Armor • Medium':['St/Ag/St'],
    'Artistic • Active':['Pr/Em/Ag'], 'Artistic • Passive':['Em/In/Pr'],
    'Athletic • Brawn':['St/Co/Ag'], 'Athletic • Endurance':['Co/Ag/St'], 'Athletic • Gymnastics':['Ag/Qu/Ag'],
    'Awareness • Perceptions':['In/SD/In','limited'], 'Awareness • Searching':['In/Re/SD'], 'Awareness • Senses':['In/SD/In'],
    'Body Development':['Co/SD/Co','special'], 'Combat Maneuvers':['Ag/Qu/SD','combined'],
    Communications:['Re/Me/Em'], Crafts:['Ag/Me/SD','combined'], 'Directed Spells':['Ag/SD/Ag'], Influence:['Pr/Em/In'],
    'Lore • General':['Me/Re/Me'], 'Lore • Magical':['Me/Re/Me'], 'Lore • Obscure':['Me/Re/Me'], 'Lore • Technical':['Me/Re/Me'],
    'Martial Arts • Striking':['St/Ag/St'], 'Outdoor • Animal':['Em/Ag/Em'], 'Outdoor • Environmental':['SD/In/Me'],
    'Power Awareness':['Em/In/Pr'], 'Power Point Development':['realm','special'],
    'Science/Analytic • Basic':['Re/Me/Re'], 'Science/Analytic • Specialized':['Re/Me/Re','combined'],
    'Self Control':['SD/Pr/SD'],
    'Spells • Own Realm Closed Lists':['realm','limited'], 'Spells • Own Realm Open Lists':['realm','limited'], 'Spells • Own Realm Own Base Lists':['realm','limited'],
    'Subterfuge • Attack':['Ag/SD/In'], 'Subterfuge • Mechanics':['In/Ag/Re'], 'Subterfuge • Stealth':['Ag/SD/In'],
    'Technical/Trade • General':['Re/Me/SD'], 'Technical/Trade • Professional':['Re/Me/In','combined'], 'Technical/Trade • Vocational':['Me/In/Re','combined'],
    Urban:['In/Pr/Re'], 'Weapon • 1-H Concussion':['St/Ag/St'], 'Weapon • 1-H Edged':['St/Ag/St'],
    'Weapon • 2-Handed':['St/Ag/St'], 'Weapon • Missile':['Ag/St/Ag'], 'Weapon • Missile Artillery':['In/Ag/Re'],
    'Weapon • Pole Arms':['St/Ag/St'], 'Weapon • Thrown':['Ag/St/Ag']
  };
  const weaponCategories = Object.keys(skillCategoryRules).filter(category => category.startsWith('Weapon •'));
  function weaponCostAssignments() {
    let saved;
    try { saved = JSON.parse(form.elements.weaponCostAssignments.value || '{}'); } catch { saved = {}; }
    const slots = weaponCategories.map(category => saved?.[category]);
    return slots.every(slot => weaponCategories.includes(slot)) && new Set(slots).size === weaponCategories.length
      ? saved : Object.fromEntries(weaponCategories.map(category => [category, category]));
  }
  function categoryCosts(category, profession = form.elements.profession.value) {
    const source = category.startsWith('Weapon •') ? weaponCostAssignments()[category] : category;
    return developmentRules?.categories?.[source]?.[profession] || null;
  }
  function renderWeaponCostPicker() {
    const profession = form.elements.profession.value;
    const assigned = weaponCostAssignments();
    $('#weapon-cost-subtitle').textContent = `${profession} · A-2 weapon categories`;
    if (!developmentRules) {
      $('#weapon-cost-list').innerHTML = '<p class="language-picker-note">Weapon costs are loading. Try again in a moment.</p>';
      return;
    }
    $('#weapon-cost-list').innerHTML = weaponCategories.map(category => `<section class="weapon-cost-choice"><strong>${esc(category.replace('Weapon • ', ''))}</strong><div class="weapon-cost-slots" role="group" aria-label="Cost slot for ${esc(category)}">${weaponCategories.map((slot, index) => {
      const costs = developmentRules?.categories?.[slot]?.[profession];
      const selected = assigned[category] === slot;
      return `<button type="button" data-category="${esc(category)}" data-slot="${esc(slot)}" aria-pressed="${selected}">${index + 1} · ${costs ? costs.join('/') : '—'}</button>`;
    }).join('')}</div></section>`).join('');
    $('#weapon-cost-summary').textContent = `Slot 1: ${weaponCategories.find(category => assigned[category] === weaponCategories[0]).replace('Weapon • ', '')}`;
  }
  // Appendix A-4 skill names. A trailing * marks a skill developed separately for each instance.
  const a4Skills = {
    'Armor • Heavy':'Plate',
    'Armor • Light':'Soft Leather|Rigid Leather',
    'Armor • Medium':'Chain',
    'Artistic • Active':'Acting|Dancing|Mimery|Mimicry|Play Instrument*|Poetic Improvisation|Singing|Tale Telling|Ventriloquism',
    'Artistic • Passive':'Music|Painting|Poetry|Sculpting',
    'Athletic • Brawn':'Athletic Games (Brawn)*|Jumping|Weight-lifting',
    'Athletic • Endurance':'Athletic Games (Endurance)*|Distance Running|Rowing|Scaling|Sprinting|Swimming',
    'Athletic • Gymnastics':'Acrobatics|Athletic Games (Gymnastics)*|Climbing|Contortions|Diving|Flying/Gliding|Juggling|Tumbling',
    'Awareness • Perceptions':'Alertness|Sense Ambush',
    'Awareness • Searching':'Detect Traps|Lie Perception|Locate Hidden|Observation|Poison Perception|Reading Tracks|Surveillance|Tracking',
    'Awareness • Senses':'Direction Sense|Sense Awareness*|Situational Awareness*|Time Sense',
    'Body Development':'Body Development',
    'Combat Maneuvers':'Mounted Combat|Quickdraw|Swashbuckling|Two-weapon Combat',
    Communications:'Language (spoken)*|Language (written)*|Lip Reading|Signaling',
    Crafts:'Cooking|Leather-crafts|Metal-crafts|Rope Mastery|Stone-crafts|Wood-crafts|Other craft*',
    'Directed Spells':'Directed attack*',
    Influence:'Bribery|Diplomacy|Duping|Interrogation|Leadership|Public Speaking|Seduction|Trading',
    'Lore • General':'Fauna Lore|Flora Lore|Heraldry|History*|Philosophy|Race Lore*|Region Lore*|Religion',
    'Lore • Magical':'Artifact Lore|Spell Lore|Undead Lore',
    'Lore • Obscure':'Demon/Devil Lore|Dragon Lore|Faerie Lore|Xeno-Lores*',
    'Lore • Technical':'Herb Lore|Lock Lore|Metal Lore|Poison Lore|Stone Lore|Trading Lore',
    'Martial Arts • Striking':'Boxing|Tackling',
    'Outdoor • Animal':'Animal Handling*|Animal Training*|Driving*|Riding*',
    'Outdoor • Environmental':'Caving|Foraging|Hunting|Star-gazing|Survival*|Weather Watching',
    'Power Awareness':'Attunement|Read Runes',
    'Power Point Development':'Power Point Development',
    'Science/Analytic • Basic':'Basic Math|Research',
    'Science/Analytic • Specialized':'Advanced Math|Alchemy|Anthropology|Other specialized science*',
    'Self Control':'Frenzy|Meditation|Mnemonics|Stun Removal',
    'Spells • Own Realm Closed Lists':'Spell list*',
    'Spells • Own Realm Open Lists':'Spell list*',
    'Spells • Own Realm Own Base Lists':'Spell list*',
    'Subterfuge • Attack':'Ambush|Silent Attack',
    'Subterfuge • Mechanics':'Camouflage|Disarming Traps|Disguise|Picking Locks|Setting Traps|Using/Removing Poison',
    'Subterfuge • Stealth':'Hiding|Picking Pockets|Stalking|Trickery',
    'Technical/Trade • General':'Begging|First Aid|Gambling|Mapping|Operating Equipment|Orienteering|Sailing|Tactical Games|Using Prepared Herbs',
    'Technical/Trade • Professional':'Diagnostics*|Engineering|Mechanition|Mining|Second Aid',
    'Technical/Trade • Vocational':'Administration|Appraisal|Boat Pilot|Evaluate Armor|Evaluate Metal|Evaluate Stone|Evaluate Weapon|Navigation|Tactics*',
    Urban:'Contacting|Mingling|Scrounging|Streetwise',
    'Weapon • 1-H Concussion':'Weapon*', 'Weapon • 1-H Edged':'Weapon*', 'Weapon • 2-Handed':'Weapon*',
    'Weapon • Missile':'Weapon*', 'Weapon • Missile Artillery':'Weapon*', 'Weapon • Pole Arms':'Weapon*', 'Weapon • Thrown':'Weapon*'
  };
  const statAbbreviations = {Ag:0,Co:1,Me:2,Re:3,SD:4,Em:5,In:6,Pr:7,Qu:8,St:9};
  // Profession bonuses for categories and groups of categories from T-1.4.
  const professionSkillBonuses = {
    Fighter:{Armor:10,'Body Development':10,'Combat Maneuvers':10,Weapon:20},
    Thief:{'Athletic • Gymnastics':5,Awareness:10,'Body Development':5,'Self Control':5,Subterfuge:15,Weapon:10},
    Rogue:{Armor:5,'Athletic • Gymnastics':5,Awareness:5,'Body Development':5,'Combat Maneuvers':5,Subterfuge:10,Weapon:15},
    Cleric:{Awareness:5,Influence:5,'Lore • Magical':5,Outdoor:5,'Power Awareness':15,'Power Point Development':5,Spells:5,Weapon:5},
    Magician:{'Directed Spells':10,'Lore • Magical':10,'Power Awareness':20,'Power Point Development':5,Spells:5},
    Mentalist:{Awareness:5,'Body Development':5,Influence:10,'Lore • Magical':5,'Power Awareness':10,'Power Point Development':5,'Self Control':5,Spells:5},
    Ranger:{Athletic:5,Awareness:10,'Body Development':5,Outdoor:20,'Subterfuge • Stealth':5,Weapon:5},
    Dabbler:{Awareness:10,'Body Development':5,Influence:5,'Lore • Magical':5,'Power Awareness':10,Subterfuge:5,Urban:5,Weapon:5},
    Bard:{'Artistic • Active':5,Awareness:5,'Body Development':5,Communications:5,Influence:5,Lore:10,'Power Awareness':5,'Self Control':5,Weapon:5}
  };
  const raceAllowances = {'Common Man':[12,8,6], 'High Man':[10,12,4], 'Wood Elf':[10,12,4], Dwarf:[12,8,5], Halfling:[12,6,5]};
  const adolescenceRaces = ['Common Man','High Man','Wood Elf','Dwarf','Halfling'];
  // Fixed adolescence ranks from T-1.6, in the race order above.
  const adolescenceCategoryRanks = {
    'Armor • Light':[1,1,0,1,0], 'Armor • Medium':[0,2,0,3,0],
    'Athletic • Brawn':[1,1,1,1,1], 'Athletic • Endurance':[1,1,1,1,1], 'Athletic • Gymnastics':[1,1,1,1,1],
    'Awareness • Searching':[1,1,1,1,1], Communications:[1,3,2,1,1], 'Lore • General':[3,3,3,3,2],
    'Outdoor • Animal':[1,1,1,0,0], 'Outdoor • Environmental':[2,1,5,2,1], 'Power Awareness':[0,1,1,0,0],
    'Science/Analytic • Basic':[0,1,1,1,0], 'Subterfuge • Stealth':[1,0,4,0,5],
    'Technical/Trade • General':[1,1,1,1,1],
    'Weapon • 1-H Concussion':[0,0,0,4,0], 'Weapon • 1-H Edged':[1,2,1,0,0],
    'Weapon • 2-Handed':[0,1,0,0,0], 'Weapon • Missile':[1,1,3,0,2],
    'Weapon • Pole Arms':[1,1,0,0,0], 'Weapon • Thrown':[1,0,0,1,2]
  };
  const adolescenceSkillRanks = [
    ['Armor • Light','Soft Leather',[1,0,0,0,0]], ['Armor • Light','Rigid Leather',[1,1,0,1,0]],
    ['Armor • Medium','Chain',[0,2,0,3,0]], ['Athletic • Endurance','Swimming',[1,1,3,0,0]],
    ['Athletic • Gymnastics','Climbing',[0,0,2,1,2]], ['Awareness • Perceptions','Alertness',[2,2,6,4,8]],
    ['Body Development','Body Development',[2,3,1,3,2]],
    ['Lore • General','Own Region Lore',[3,3,3,3,3]], ['Lore • General','Own Race Lore',[3,3,3,3,3]],
    ['Outdoor • Animal','Riding (horse)',[1,1,1,0,0]],
    ['Subterfuge • Stealth','Stalking',[1,0,4,0,5]], ['Subterfuge • Stealth','Hiding',[1,0,4,0,5]]
  ];
  // Starting spoken/written language ranks from the matching A-1 race entries (A-1.1–A-1.5).
  const raceStartingLanguages = {
    'Common Man':[['Common-speech',8,6]],
    'High Man':[['High-speech',8,6],['Common-speech',8,6],['Grey-elvish',6,6],['High-elvish',2,2]],
    'Wood Elf':[['Elvish',10,10],['Grey-elvish',8,6],['Common-speech',8,6],['High-elvish',4,4]],
    Dwarf:[['Dwarvish',8,6],['Common-speech',5,5],['Elvish',4,4]],
    Halfling:[['Small-speech',8,6],['Common-speech',8,6]]
  };
  // A-1 allowed adolescence development, with separate spoken and written rank caps.
  const raceAdolescenceLanguages = {
    'Common Man':[['High-speech',6,6],['Common-speech',10,10],['Small-speech',6,6]],
    'High Man':[['High-speech',10,10],['Common-speech',10,10],['Grey-elvish',8,8],['High-elvish',6,6],['Hill-speech',6,6],['Sea-speech',8,8],['Small-speech',6,6],['Plains-speech',6,6]],
    'Wood Elf':[['Grey-elvish',10,10],['Common-speech',10,10],['High-elvish',10,10],['High-speech',4,4],['Plains-speech',8,8],['Wood-speech',8,8]],
    Dwarf:[['Dwarvish',10,10],['Common-speech',10,10],['Hill-speech',2,2],['Plains-speech',6,6],['Wood-speech',6,6]],
    Halfling:[['Small-speech',10,10],['Common-speech',10,10],['High-speech',8,8],['Grey-elvish',8,8]]
  };
  const backgroundChoices = [
    ['extraLanguages','Extra languages',1,'20 ranks in the extra languages listed for your race.'],
    ['extraStatRolls','Extra stat gain rolls',1,'One extra stat gain roll for each stat.'],
    ['skillBonus','Special +10 skill bonus',1,'Choose one skill.'],
    ['categoryBonus','Special +5 category bonus',1,'Choose one skill category.'],
    ['rolledItem','Roll for a special item',1,'Roll on T-1.5.'],
    ['chosenItem','Choose a special item',2,'Choose a result from T-1.5 with your GM.'],
    ['rolledMoney','Roll for extra money',1,'Roll on T-1.5.'],
    ['chosenMoney','Choose extra money',2,'Choose an amount from T-1.5 with your GM.']
  ];
  const raceBackgroundNotes = {
    'Common Man':'Extra languages: High-speech, Small-speech, Hill-speech. Money: silver and bronze pieces.',
    'High Man':'Extra languages: High-elvish, Hill-speech, Plains-speech, North-speech, Wood-speech. Money: gold pieces.',
    'Wood Elf':'Extra languages: High-speech, South-speech, Black-speech. Money: gems.',
    Dwarf:'Extra languages: High-speech, South-speech, North-speech. Spell items may contain only Channeling spells.',
    Halfling:'Extra languages: Hill-speech, Wood-speech, Orcish, Elvish. Spell adders and items that cast spells are unavailable.'
  };
  // Weapon choices from the outfitting lists in the matching A-1 race entries.
  const raceWeaponChoices = {
    'Common Man':{'Weapon • 1-H Edged':['Dagger','Handaxe','Throwing dagger'],'Weapon • Missile':['Sling'],'Weapon • Pole Arms':['Fishing spear'],'Weapon • Thrown':['Dagger','Handaxe','Throwing dagger','Fishing spear']},
    'High Man':{'Weapon • 1-H Edged':['Battle axe','Broadsword','Dagger','Short sword','Bastard sword','Falchion','Foil','Kynac','Long kynac','Main gauche','Rapier'],'Weapon • 2-Handed':['Flail','Quarterstaff','Two-handed sword','War mattock'],'Weapon • Missile':['Composite bow','Long bow'],'Weapon • Pole Arms':['Halbard','Lance','Spear','Boar spear']},
    'Wood Elf':{'Weapon • 1-H Edged':['Dagger','Handaxe','Broadsword','Short sword','Whip','Main gauche','Shang','Rapier','Gé','Kynac'],'Weapon • Missile':['Long bow','Short bow']},
    Dwarf:{'Weapon • 1-H Concussion':['Club','War hammer','Mace'],'Weapon • Thrown':['Dagger','Handaxe','Spear']},
    Halfling:{'Weapon • Missile':['Short bow','Sling'],'Weapon • Thrown':['Dagger','Handaxe','Pilum']}
  };
  const openSpellLists = {
    Essence:['Delving Ways','Detecting Ways','Elemental Shields','Essence Hand','Essence’s Perceptions','Lesser Illusions','Physical Enhancement','Rune Mastery','Spell Wall','Unbarring Ways'],
    Channeling:['Barrier Law','Concussion’s Ways','Detection Mastery','Light’s Way','Lofty Movements','Nature’s Law','Purifications','Sound’s Way','Spell Defense','Weather Ways'],
    Mentalism:['Anticipations','Attack Avoidance','Brilliance','Cloaking','Damage Resistance','Delving','Detections','Illusions','Self Healing','Spell Resistance']
  };
  const raceStats = {
    'Common Man':[0,0,0,0,2,0,0,0,0,2],
    'High Man':[-2,4,0,0,0,0,0,4,-2,4],
    'Wood Elf':[4,0,2,0,-5,2,0,2,2,0],
    Dwarf:[-2,6,0,0,2,-4,0,-4,-2,2],
    Halfling:[6,6,0,0,-4,-2,0,-6,4,-8]
  };
  const raceResistances = {
    'Common Man':[0,0,0,0,0,0],
    'High Man':[-5,-5,-5,0,0,0],
    'Wood Elf':[-5,-5,-5,10,100,0],
    Dwarf:[40,0,40,20,15,0],
    Halfling:[50,0,40,30,15,0]
  };
  const resistanceTypes = [
    ['channeling','Channeling',6,1], ['essence','Essence',5,0],
    ['mentalism','Mentalism',7,2], ['poison','Poison',1,3],
    ['disease','Disease',1,4], ['fear','Fear',4,5]
  ];

  function readCharacters() {
    try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(data) ? data : []; }
    catch { return []; }
  }
  function writeCharacters() { localStorage.setItem(STORAGE_KEY, JSON.stringify(characters)); }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function makeStats(stats = {}) {
    $('#stats-list').innerHTML = statNames.map((name, index) => {
      const value = stats[name] || {};
      return `<div class="stat-row"><span>${name}</span><input aria-label="${name} temporary stat" name="stat-temp-${index}" type="number" min="20" max="100" value="${esc(value.temp ?? '')}" placeholder="—"><input aria-label="${name} potential stat" name="stat-pot-${index}" type="number" min="20" max="101" value="${esc(value.pot ?? '')}" placeholder="—"><input aria-label="${name} basic bonus" name="stat-basic-${index}" type="number" value="${esc(value.basic ?? '')}" placeholder="—" readonly><input aria-label="${name} racial bonus" name="stat-racial-${index}" type="number" value="${esc(value.racial ?? '')}" placeholder="—" readonly><input aria-label="${name} special bonus" name="stat-special-${index}" type="number" value="${esc(value.special ?? '')}" placeholder="—"><input aria-label="${name} total bonus" name="stat-total-${index}" type="number" value="${esc(value.total ?? '')}" placeholder="—" readonly></div>`;
    }).join('');
  }
  function makeResistances() {
    $('#resistance-grid').innerHTML = `<div class="rr-head"><span>Type</span><span>Race</span><span>Stat</span><span>Other</span><span>Total</span></div>${resistanceTypes.map(([key, label]) => `<div class="rr-row"><span>${label}</span><output id="rr-race-${key}">—</output><output id="rr-stat-${key}">—</output><input aria-label="${label} other resistance bonus" name="rr-other-${key}" type="number" value="0"><output id="rr-total-${key}">—</output></div>`).join('')}`;
  }
  function categoryGroup(category) { return category.includes(' • ') ? category.split(' • ')[0] : ''; }
  function rankBonus(ranks, progression) {
    const n = Math.max(0, Number(ranks) || 0);
    const rounded = value => Math.floor(value + 0.5);
    if (progression === 'category') return n ? rounded(2 * Math.min(n, 10) + Math.min(Math.max(n - 10, 0), 10) + .5 * Math.min(Math.max(n - 20, 0), 10)) : -15;
    if (progression === 'limited') return rounded(Math.min(n, 20) + .5 * Math.min(Math.max(n - 20, 0), 10));
    if (progression === 'special') return 6 * Math.min(n, 10) + 5 * Math.min(Math.max(n - 10, 0), 10) + 4 * Math.min(Math.max(n - 20, 0), 10) + 3 * Math.max(n - 30, 0);
    if (progression === 'combined') return n ? rounded(5 * Math.min(n, 10) + 3 * Math.min(Math.max(n - 10, 0), 10) + 1.5 * Math.min(Math.max(n - 20, 0), 10) + .5 * Math.max(n - 30, 0)) : -30;
    return n ? rounded(3 * Math.min(n, 10) + 2 * Math.min(Math.max(n - 10, 0), 10) + Math.min(Math.max(n - 20, 0), 10) + .5 * Math.max(n - 30, 0)) : -15;
  }
  function categoryStatBonus(category) {
    const rule = skillCategoryRules[category];
    if (!rule) return null;
    const realmStat = {Channeling:'In',Essence:'Em',Mentalism:'Pr'}[form.elements.realm.value];
    const stats = rule[0] === 'realm' ? [realmStat] : rule[0].split('/');
    if (stats.some(stat => !stat || statAbbreviations[stat] === undefined)) return null;
    const totals = stats.map(stat => form.elements.namedItem(`stat-total-${statAbbreviations[stat]}`).value);
    return totals.some(value => value === '') ? null : totals.reduce((sum, value) => sum + Number(value), 0);
  }
  function categoryProfessionBonus(category) {
    const bonuses = professionSkillBonuses[form.elements.profession.value] || {};
    return bonuses[category] ?? bonuses[categoryGroup(category)] ?? 0;
  }
  function catalogNames(category) { return (a4Skills[category] || '').split('|').filter(Boolean); }
  function a4SkillRow(category, name, skill = {}, extra = false) {
    if (!extra && name.endsWith('*')) {
      const label = name.slice(0, -1);
      return `<div class="a4-skill-row a4-template is-zero-rank" data-category="${esc(category)}"><strong>${esc(label)} <small>each instance separately</small></strong><span class="a4-template-note">Specific skills appear when chosen</span></div>`;
    }
    return `<div class="a4-skill-row${extra ? ' a4-extra' : ''}" data-category="${esc(category)}" data-skill="${esc(name)}"><strong>${esc(name)}</strong><output class="a4-start-text">0</output><input name="a4-start" type="hidden" value="${esc(skill.start ?? skill.ranks ?? 0)}"><output class="a4-buy-text">0</output><select name="a4-buy" hidden></select><output class="a4-rank">—</output><output class="a4-category">—</output><output class="a4-item-text">0</output><input name="a4-item" type="hidden" value="${esc(skill.item ?? 0)}"><output class="a4-special-text">0</output><input name="a4-special" type="hidden" value="${esc(skill.special ?? 0)}"><output class="a4-total">—</output></div>`;
  }
  function updateA4Visibility() {
    const hideSkills = $('#hide-zero-skills').checked;
    const hideGroups = $('#hide-zero-groups').checked;
    $$('.a4-skill-container').forEach(container => {
      const category = container.previousElementSibling;
      const categoryRanks = Number($('[name="record-start"]', category)?.value || 0) + Number($('[name="record-buy"]', category)?.value || 0);
      const skillRows = $$('.a4-skill-row', container);
      const emptyGroup = categoryRanks === 0 && skillRows.every(row => row.classList.contains('is-zero-rank'));
      category.hidden = hideGroups && emptyGroup;
      let shown = 0;
      skillRows.forEach(row => {
        row.hidden = hideSkills && row.classList.contains('is-zero-rank');
        if (!row.hidden) shown++;
      });
      container.hidden = category.hidden || !shown;
    });
  }
  function updateA4SkillRows() {
    $$('.a4-skill-container').forEach(container => {
      const category = container.dataset.category;
      const fixed = new Set(catalogNames(category).filter(name => !name.endsWith('*')));
      const active = $$('.skill-row', $('#skills-list')).filter(row => row.dataset.category === category && $('[name="skill-name"]', row).value);
      const extraNames = new Set(active.map(row => $('[name="skill-name"]', row).value).filter(name => !fixed.has(name)));
      $$('.a4-extra', container).forEach(row => { if (!extraNames.has(row.dataset.skill)) row.remove(); });
      extraNames.forEach(name => {
        if (!$$('.a4-extra', container).some(row => row.dataset.skill === name)) {
          $('.a4-skill-list', container).insertAdjacentHTML('beforeend', a4SkillRow(category, name, {}, true));
        }
      });
      $$('.a4-skill-row:not(.a4-template)', container).forEach(row => {
        const tree = active.find(skill => $('[name="skill-name"]', skill).value === row.dataset.skill);
        const buy = $('[name="a4-buy"]', row);
        updateSkillBuyOptions(row, tree ? Number($('[name="skill-buy"]', tree).value) || 0 : 0);
        const start = tree ? $('[name="skill-start"]', tree).value : '0';
        const item = tree ? $('[name="skill-item"]', tree).value : '0';
        const special = tree ? $('[name="skill-special"]', tree).value : '0';
        $('[name="a4-start"]', row).value = start;
        $('[name="a4-item"]', row).value = item;
        $('[name="a4-special"]', row).value = special;
        $('.a4-start-text', row).textContent = start;
        $('.a4-buy-text', row).textContent = buy.value;
        $('.a4-item-text', row).textContent = item;
        $('.a4-special-text', row).textContent = special;
        const ranks = (Number(start) || 0) + (Number(buy.value) || 0);
        const rank = rankBonus(ranks, skillCategoryRules[category][1] || 'standard');
        const record = $$('.category-record-row').find(item => item.dataset.category === category);
        const categoryBonus = $('.record-total', record).textContent;
        $('.a4-rank', row).textContent = String(rank);
        $('.a4-category', row).textContent = categoryBonus;
        $('.a4-total', row).textContent = categoryBonus === '—' ? '—' : String(rank + Number(categoryBonus) + Number(item || 0) + Number(special || 0));
        row.classList.toggle('is-zero-rank', ranks === 0);
      });
    });
    updateA4Visibility();
  }
  function renderCategoryRecord(character = {}) {
    const saved = character.categoryRanks || {};
    const skills = character.skills || [];
    $('#category-record-list').innerHTML = Object.entries(skillCategoryRules).map(([category, rule]) => {
      const values = saved[category] || {};
      const standard = !rule[1] || rule[1] === 'standard';
      const rankFields = standard
        ? `<td><output class="record-start-text">0</output><input name="record-start" type="hidden" value="${esc(values.start ?? 0)}"></td><td><output class="record-buy-text">0</output><select name="record-buy" hidden></select></td>`
        : '<td class="not-applicable">n/a</td><td class="not-applicable">n/a</td>';
      const names = catalogNames(category);
      const listed = new Set(names.filter(name => !name.endsWith('*')));
      const categorySkills = skills.filter(skill => skill.category === category && skill.name);
      const rows = names.map(name => a4SkillRow(category, name, categorySkills.find(skill => skill.name === name))).join('')
        + categorySkills.filter(skill => !listed.has(skill.name)).map(skill => a4SkillRow(category, skill.name, skill, true)).join('');
      return `<tr class="category-record-row" data-category="${esc(category)}"><th scope="row">${esc(category)}</th><td><output class="record-stats"></output></td><td><output class="record-cost"></output></td>${rankFields}<td><output class="record-rank"></output></td><td><output class="record-stat"></output></td><td><output class="record-profession"></output></td><td><output class="record-special-text">0</output><input name="record-special" type="hidden" value="${esc(values.special ?? 0)}"></td><td><output class="record-special2-text">0</output><input name="record-special2" type="hidden" value="${esc(values.special2 ?? 0)}"></td><td><output class="record-total"></output></td></tr><tr class="a4-skill-container" data-category="${esc(category)}"><td colspan="11"><div class="a4-skill-head"><span>Skill</span><span>Ranks</span><span>New</span><span>Rank bonus</span><span>Category</span><span>Item</span><span>Special</span><span>Total</span></div><div class="a4-skill-list">${rows}</div></td></tr>`;
    }).join('');
    $$('.category-record-row').forEach(row => {
      row.dataset.raceBase = String(Number(saved[row.dataset.category]?.raceBase) || 0);
      row.dataset.hobbySpent = String(Number(saved[row.dataset.category]?.hobbySpent) || 0);
      if ($('[name="record-buy"]', row)) {
        if (!developmentRules && saved[row.dataset.category]?.buy) row.dataset.pendingBuy = saved[row.dataset.category].buy;
        updateSkillBuyOptions(row, Number(saved[row.dataset.category]?.buy) || 0);
      }
    });
    $$('.a4-skill-row:not(.a4-template)').forEach(row => {
      const savedSkill = skills.find(skill => skill.category === row.dataset.category && skill.name === row.dataset.skill);
      if (!developmentRules && savedSkill?.buy) row.dataset.pendingBuy = savedSkill.buy;
      updateSkillBuyOptions(row, Number(savedSkill?.buy) || 0);
    });
    updateA4Visibility();
  }
  function categoryRow(category) {
    const existing = $$('.category-row', $('#skills-list')).find(row => row.dataset.category === category);
    if (existing) return existing;
    const group = categoryGroup(category);
    let parent = $('#skills-list');
    if (group) {
      let branch = $$('.skill-group', parent).find(item => item.dataset.group === group);
      if (!branch) {
        branch = document.createElement('section'); branch.className = 'skill-group'; branch.dataset.group = group;
        branch.innerHTML = `<h3>${esc(group)} <small>Group</small><output class="group-profession-bonus"></output></h3>`;
        parent.append(branch);
      }
      parent = branch;
    }
    const branch = document.createElement('section'); branch.className = 'skill-category';
    branch.innerHTML = `<div class="category-row"><strong>${esc(group ? category.slice(group.length + 3) : category)} <small>Category</small></strong><output class="category-row-summary"></output><button type="button" class="add-category-skill" aria-label="Add skill to ${esc(category)}">＋ Skill</button><button type="button" class="remove-category" aria-label="Remove ${esc(category)} category">×</button></div><div class="bonus-breakdown category-bonus"></div><div class="category-skills"></div>`;
    parent.append(branch);
    const row = $('.category-row', branch); row.dataset.category = category;
    $('.add-category-skill', row).addEventListener('click', () => { const skill = skillRow({category}); $('[name="skill-name"]', skill).focus(); updateDevelopment(); saveCurrent(); });
    $('.remove-category', row).addEventListener('click', () => {
      if ($('.skill-row', branch)) return;
      const record = $$('.category-record-row').find(item => item.dataset.category === category);
      if (record) {
        for (const name of ['record-start','record-special','record-special2']) { const field = $(`[name="${name}"]`, record); if (field) field.value = '0'; }
        const buy = $('[name="record-buy"]', record); if (buy) buy.value = '0';
        record.dataset.raceBase = '0';
        form.elements.hobbyUsed.value = String(Math.max(0, (Number(form.elements.hobbyUsed.value) || 0) - (Number(record.dataset.hobbySpent) || 0)));
        record.dataset.hobbySpent = '0';
      }
      branch.remove();
      if (group && !$('.skill-category', parent)) parent.remove();
      updateDevelopment(); saveCurrent();
    });
    return row;
  }
  function skillRow(skill = {}) {
    const category = skill.category && skillCategoryRules[skill.category] ? skill.category : Object.keys(skillCategoryRules)[0];
    const parent = categoryRow(category).closest('.skill-category');
    const row = document.createElement('div'); row.className = 'skill-row rank-row'; row.dataset.category = category;
    if (skill.raceGrant) row.dataset.raceGrant = skill.raceGrant;
    if (skill.raceBase) row.dataset.raceBase = skill.raceBase;
    if (skill.languageSpent) row.dataset.languageSpent = skill.languageSpent;
    if (skill.hobbySpent) row.dataset.hobbySpent = skill.hobbySpent;
    const choice = skill.raceGrant?.startsWith('weapon:') || skill.raceGrant === 'race:open-spell-list';
    row.innerHTML = `<div class="rank-title"><label>Skill<input ${choice ? 'type="hidden"' : 'type="text"'} aria-label="Skill name" name="skill-name" maxlength="60" placeholder="Skill name" value="${esc(skill.name || '')}"></label>${choice ? `<button type="button" class="choose-skill" aria-haspopup="dialog">${esc(skill.name || 'Choose skill')} ▾</button>` : ''}<button type="button" class="change-skill-category" aria-label="Change category for ${esc(skill.name || 'skill')}">${esc(category)}</button></div><label>Before<input aria-label="Ranks before this level" name="skill-start" type="number" min="0" max="99" value="${esc(skill.start ?? skill.ranks ?? 0)}"></label><label>Buy<select aria-label="Ranks purchased this level" name="skill-buy"></select></label><label>Item<input aria-label="Item bonus" name="skill-item" type="number" value="${esc(skill.item ?? 0)}"></label><label>Special<input aria-label="Skill special bonus" name="skill-special" type="number" value="${esc(skill.special ?? 0)}"></label><output class="rank-cost"></output><button type="button" class="remove-skill" aria-label="Remove skill">×</button><div class="bonus-breakdown skill-bonus"></div>`;
    $('.category-skills', parent).append(row);
    if (!developmentRules && skill.buy) row.dataset.pendingBuy = skill.buy;
    updateSkillBuyOptions(row, Number(skill.buy) || 0);
    $('.remove-skill', row).addEventListener('click', () => {
      form.elements.hobbyUsed.value = String(Math.max(0, (Number(form.elements.hobbyUsed.value) || 0) - (Number(row.dataset.hobbySpent) || 0)));
      form.elements.languageUsed.value = String(Math.max(0, (Number(form.elements.languageUsed.value) || 0) - (Number(row.dataset.languageSpent) || 0)));
      row.remove(); updateDevelopment(); saveCurrent();
    });
    $('.change-skill-category', row).addEventListener('click', () => openSkillCategoryPicker(row));
    if (choice) attachSkillChoice(row);
    return row;
  }
  function attachSkillChoice(row) {
    let button = $('.choose-skill', row);
    if (!button) {
      const field = $('[name="skill-name"]', row);
      field.type = 'hidden';
      button = document.createElement('button');
      button.type = 'button'; button.className = 'choose-skill'; button.setAttribute('aria-haspopup', 'dialog');
      button.textContent = `${field.value} ▾`;
      $('.change-skill-category', row).before(button);
    }
    button.addEventListener('click', () => openSkillChoice(row));
  }
  function skillChoices(row) {
    return row.dataset.raceGrant === 'race:open-spell-list'
      ? openSpellLists[form.elements.realm.value] || []
      : raceWeaponChoices[form.elements.race.value]?.[row.dataset.raceGrant.slice('weapon:'.length)] || [];
  }
  function detachChoiceExtras(row) {
    const name = $('[name="skill-name"]', row).value;
    if (name.startsWith('Choose ')) return;
    const start = $('[name="skill-start"]', row);
    const raceBase = Number(row.dataset.raceBase) || 0;
    const hobbySpent = Number(row.dataset.hobbySpent) || 0;
    const extra = Math.max(0, (Number(start.value) || 0) - raceBase, hobbySpent);
    const buy = Number($('[name="skill-buy"]', row).value) || 0;
    const item = Number($('[name="skill-item"]', row).value) || 0;
    const special = Number($('[name="skill-special"]', row).value) || 0;
    if (!extra && !buy && !item && !special) return;
    skillRow({category:row.dataset.category, name, start:extra, buy, item, special, hobbySpent});
    start.value = String(raceBase);
    updateSkillBuyOptions(row, 0);
    $('[name="skill-item"]', row).value = '0';
    $('[name="skill-special"]', row).value = '0';
    row.dataset.hobbySpent = '0';
  }
  function validateSkillChoices() {
    $$('.skill-row[data-race-grant]', $('#skills-list')).forEach(row => {
      const button = $('.choose-skill', row);
      if (!button) return;
      const field = $('[name="skill-name"]', row);
      if (!skillChoices(row).includes(field.value)) {
        detachChoiceExtras(row);
        field.value = row.dataset.raceGrant === 'race:open-spell-list' ? 'Choose an open spell list' : 'Choose a weapon';
      }
      button.textContent = `${field.value} ▾`;
    });
  }
  function openSkillChoice(row) {
    skillChoiceTarget = row;
    const choices = skillChoices(row);
    const spell = row.dataset.raceGrant === 'race:open-spell-list';
    $('#skill-choice-title').textContent = spell ? 'Choose an open spell list' : 'Choose a racial weapon';
    $('#skill-choice-subtitle').textContent = spell ? `${form.elements.realm.value} open lists` : `${form.elements.race.value} · ${row.dataset.category}`;
    $('#skill-choice-list').innerHTML = choices.length
      ? choices.map(name => `<button type="button" data-choice="${esc(name)}" aria-pressed="${name === $('[name="skill-name"]', row).value}">${esc(name)}</button>`).join('')
      : '<p>Choose a realm of power in Character first.</p>';
    $('#skill-choice-dialog').showModal();
  }
  function assignSkillChoice(row, name) {
    if ($('[name="skill-name"]', row).value !== name) detachChoiceExtras(row);
    const existing = findSkillRow(row.dataset.category, name);
    if (existing && existing !== row) {
      for (const fieldName of ['skill-start','skill-item','skill-special']) {
        $(`[name="${fieldName}"]`, row).value = String((Number($(`[name="${fieldName}"]`, row).value) || 0) + (Number($(`[name="${fieldName}"]`, existing).value) || 0));
      }
      row.dataset.hobbySpent = String((Number(row.dataset.hobbySpent) || 0) + (Number(existing.dataset.hobbySpent) || 0));
      updateSkillBuyOptions(row, (Number($('[name="skill-buy"]', row).value) || 0) + (Number($('[name="skill-buy"]', existing).value) || 0));
      existing.remove();
    }
    $('[name="skill-name"]', row).value = name;
    $('.choose-skill', row).textContent = `${name} ▾`;
    updateDevelopment(); saveCurrent();
  }
  function renderRaceWeaponsPicker() {
    const race = form.elements.race.value;
    $('#race-weapons-subtitle').textContent = `${race} · A-1 weapon choices`;
    $('#race-weapons-list').innerHTML = Object.entries(raceWeaponChoices[race] || {}).map(([category, names]) => {
      const row = $$('.skill-row[data-race-grant]', $('#skills-list')).find(item => item.dataset.raceGrant === `weapon:${category}`);
      if (!row) return '';
      const selected = $('[name="skill-name"]', row).value;
      return `<section class="race-weapon-choice"><div><strong>${esc(category)}</strong><small>${esc($('[name="skill-start"]', row).value)} ranks · ${esc(selected)}</small></div><div>${names.map(name => `<button type="button" data-category="${esc(category)}" data-choice="${esc(name)}" aria-pressed="${name === selected}">${esc(name)}</button>`).join('')}</div></section>`;
    }).join('') || '<p>No racial weapon grants are on this character.</p>';
  }
  function languageSkillRow(name) {
    return findSkillRow('Communications', name);
  }
  function updateLanguagePickerBudget() {
    const limit = raceAllowances[form.elements.race.value]?.[1] || 0;
    const used = Number(form.elements.languageUsed.value) || 0;
    const allocated = $$('.skill-row[data-language-spent]', $('#skills-list')).reduce((sum, row) => sum + (Number(row.dataset.languageSpent) || 0), 0);
    $('#language-picker-remaining').textContent = `${Math.max(0, limit - used)} ranks left`;
    $('#language-picker-used').textContent = `${used} of ${limit} spent`;
    const legacy = Math.max(0, used - allocated);
    const note = $('#language-legacy-note');
    note.hidden = !legacy;
    note.innerHTML = legacy ? `${legacy} previously recorded rank${legacy === 1 ? '' : 's'} have no language assignment. <button type="button" id="reset-unassigned-languages">Reset unassigned ranks</button> to allocate them here.` : '';
  }
  function renderLanguagePicker() {
    const race = form.elements.race.value;
    $('#language-picker-subtitle').textContent = `${race} · allowed adolescence development (A-1)`;
    $('#language-picker-list').innerHTML = (raceAdolescenceLanguages[race] || []).map(([language, spoken, written]) => {
      const fields = [['spoken',spoken],['written',written]].map(([mode, cap]) => {
        const row = languageSkillRow(`${language} (${mode})`);
        const spent = Number(row?.dataset.languageSpent) || 0;
        const current = row ? Number($('[name="skill-start"]', row).value) || 0 : 0;
        const base = Math.max(0, current - spent);
        return `<label>${mode === 'spoken' ? 'Spoken' : 'Written'}<input type="number" inputmode="numeric" min="${base}" max="${Math.max(base, cap)}" value="${current}" data-language="${esc(language)}" data-mode="${mode}" aria-label="${esc(language)} ${mode} total ranks"><small>Base ${base} · max ${cap}</small></label>`;
      }).join('');
      return `<div class="language-choice"><strong>${esc(language)}</strong>${fields}</div>`;
    }).join('');
    updateLanguagePickerBudget();
  }
  function updateLanguageAllocation(input) {
    const language = input.dataset.language;
    const mode = input.dataset.mode;
    const name = `${language} (${mode})`;
    let row = languageSkillRow(name);
    const previous = Number(row?.dataset.languageSpent) || 0;
    const current = row ? Number($('[name="skill-start"]', row).value) || 0 : 0;
    const limit = raceAllowances[form.elements.race.value]?.[1] || 0;
    const used = Number(form.elements.languageUsed.value) || 0;
    const base = Math.max(0, current - previous);
    const maxExtra = Math.max(0, Number(input.max) - base);
    const requested = Number(input.value);
    const next = Math.max(0, Math.min(Number.isInteger(requested) ? requested - base : 0, maxExtra, limit - used + previous));
    if (!row && next) row = skillRow({category:'Communications', name, start:next, languageSpent:next});
    else if (row) {
      $('[name="skill-start"]', row).value = String(Math.max(0, current - previous + next));
      if (next) row.dataset.languageSpent = String(next); else delete row.dataset.languageSpent;
      if (!next && !Number($('[name="skill-start"]', row).value) && !Number($('[name="skill-buy"]', row).value) && !Number($('[name="skill-item"]', row).value) && !Number($('[name="skill-special"]', row).value) && !row.dataset.raceGrant) row.remove();
    }
    form.elements.languageUsed.value = String(used - previous + next);
    input.value = String(base + next);
    updateDevelopment();
    updateLanguagePickerBudget();
    saveCurrent();
  }
  function hobbyRankLimit(category) {
    const costs = categoryCosts(category) || [];
    return costs.filter(cost => cost < 40).length;
  }
  function hobbySkillOptions() {
    const options = new Map();
    const add = (category, name) => {
      if (!name || name.startsWith('Choose ') || (!hobbyRankLimit(category) && !Number(findSkillRow(category, name)?.dataset.hobbySpent))) return;
      options.set(`${category}:${name}`, {category, name});
    };
    Object.entries(a4Skills).forEach(([category, names]) => names.split('|').filter(name => name && !name.endsWith('*')).forEach(name => add(category, name)));
    $$('.skill-row', $('#skills-list')).forEach(row => add(row.dataset.category, $('[name="skill-name"]', row).value));
    Object.entries(raceWeaponChoices[form.elements.race.value] || {}).forEach(([category, names]) => names.forEach(name => add(category, name)));
    (raceAdolescenceLanguages[form.elements.race.value] || []).forEach(([name]) => { add('Communications', `${name} (spoken)`); add('Communications', `${name} (written)`); });
    return [...options.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }
  function updateHobbyPickerBudget() {
    const limit = raceAllowances[form.elements.race.value]?.[0] || 0;
    const used = Number(form.elements.hobbyUsed.value) || 0;
    const allocatedSkills = $$('.skill-row[data-hobby-spent]', $('#skills-list')).reduce((sum, row) => sum + (Number(row.dataset.hobbySpent) || 0), 0);
    const allocatedCategories = $$('.category-record-row[data-hobby-spent]').reduce((sum, row) => sum + (Number(row.dataset.hobbySpent) || 0), 0);
    $('#hobby-picker-remaining').textContent = used > limit ? `${used - limit} ranks over` : `${limit - used} ranks left`;
    $('#hobby-picker-used').textContent = `${used} of ${limit} spent`;
    const legacy = Math.max(0, used - allocatedSkills - allocatedCategories);
    const note = $('#hobby-legacy-note');
    note.hidden = !legacy;
    note.innerHTML = legacy ? `${legacy} previously recorded rank${legacy === 1 ? '' : 's'} have no skill assignment. <button type="button" id="reset-unassigned-hobbies">Reset unassigned ranks</button> to allocate them here.` : '';
  }
  function hobbyChoiceMarkup(kind, category, name = '') {
    const row = kind === 'category'
      ? $$('.category-record-row').find(item => item.dataset.category === category)
      : findSkillRow(category, name);
    const field = kind === 'category' ? $('[name="record-start"]', row) : row ? $('[name="skill-start"]', row) : null;
    const current = Number(field?.value) || 0;
    const spent = Number(row?.dataset.hobbySpent) || 0;
    const base = Math.max(0, current - spent);
    const max = Math.min(99, base + hobbyRankLimit(category));
    const label = kind === 'category' ? category : name;
    return `<label class="hobby-choice" data-search="${esc(`${category} ${name}`.toLowerCase())}"><span><strong>${esc(label)}</strong>${kind === 'skill' ? `<small>${esc(category)}</small>` : '<small>Skill category</small>'}</span><input type="number" inputmode="numeric" min="${base}" max="${max}" value="${current}" data-kind="${kind}" data-category="${esc(category)}" data-name="${esc(name)}" aria-label="${esc(label)} total hobby ranks"><em>Base ${base} · +${hobbyRankLimit(category)} max</em></label>`;
  }
  function findSkillRow(category, name) {
    return $$('.skill-row', $('#skills-list')).find(row => row.dataset.category === category && $('[name="skill-name"]', row).value === name);
  }
  function renderHobbyPicker() {
    $('#hobby-picker-subtitle').textContent = `${form.elements.race.value} · ${form.elements.profession.value} costs`;
    const categories = Object.entries(skillCategoryRules).filter(([category, rule]) => {
      const spent = Number($$('.category-record-row').find(row => row.dataset.category === category)?.dataset.hobbySpent) || 0;
      return (!rule[1] || rule[1] === 'standard') && (hobbyRankLimit(category) || spent);
    });
    const skills = hobbySkillOptions();
    $('#hobby-picker-list').innerHTML = developmentRules
      ? `<section class="hobby-choice-group" data-kind="category"><h3>Skill categories</h3>${categories.map(([category]) => hobbyChoiceMarkup('category', category)).join('')}</section><section class="hobby-choice-group" data-kind="skill"><h3>Skills</h3>${skills.map(({category, name}) => hobbyChoiceMarkup('skill', category, name)).join('')}</section>`
      : '<p>Skill costs are loading. Try again in a moment.</p>';
    $('#hobby-search').value = '';
    updateHobbyLimits();
    updateHobbyVisibility();
    updateHobbyPickerBudget();
  }
  function updateHobbyLimits() {
    const pool = raceAllowances[form.elements.race.value]?.[0] || 0;
    const used = Number(form.elements.hobbyUsed.value) || 0;
    $$('.hobby-choice input[data-kind]', $('#hobby-picker-list')).forEach(input => {
      const category = input.dataset.category;
      const source = input.dataset.kind === 'category'
        ? $$('.category-record-row').find(row => row.dataset.category === category)
        : findSkillRow(category, input.dataset.name);
      const spent = Number(source?.dataset.hobbySpent) || 0;
      const base = Number(input.min) || 0;
      const perLevel = hobbyRankLimit(category);
      const maxTotal = base + Math.max(0, Math.min(perLevel, pool - used + spent));
      input.max = String(maxTotal);
      const overLimit = spent > perLevel;
      input.closest('.hobby-choice').classList.toggle('is-over-limit', overLimit);
      input.nextElementSibling.textContent = overLimit ? `Above ${form.elements.profession.value} limit of ${perLevel}` : `Max total ${maxTotal}`;
    });
  }
  function hobbyOverLimitCount() {
    const skills = $$('.skill-row[data-hobby-spent]', $('#skills-list')).filter(row => Number(row.dataset.hobbySpent) > hobbyRankLimit(row.dataset.category));
    const categories = $$('.category-record-row[data-hobby-spent]').filter(row => Number(row.dataset.hobbySpent) > hobbyRankLimit(row.dataset.category));
    return skills.length + categories.length;
  }
  function updateHobbyVisibility() {
    const term = $('#hobby-search').value.trim().toLowerCase();
    const hideSkills = $('#hide-zero-hobby-skills').getAttribute('aria-pressed') === 'true';
    const hideCategories = $('#hide-zero-hobby-categories').getAttribute('aria-pressed') === 'true';
    const groups = $$('.hobby-choice-group', $('#hobby-picker-list'));
    let totalVisible = 0;
    groups.forEach(group => {
      let visible = 0;
      $$('.hobby-choice', group).forEach(row => {
        const zero = (Number($('input[data-kind]', row).value) || 0) === 0;
        row.hidden = (!!term && !row.dataset.search.includes(term)) || (zero && (group.dataset.kind === 'skill' ? hideSkills : hideCategories));
        if (!row.hidden) visible++;
      });
      group.hidden = !visible;
      totalVisible += visible;
    });
    $('#hobby-picker-empty').hidden = !groups.length || totalVisible > 0;
  }
  function updateHobbyAllocation(input) {
    const kind = input.dataset.kind;
    const category = input.dataset.category;
    const name = input.dataset.name;
    let row = kind === 'category' ? $$('.category-record-row').find(item => item.dataset.category === category) : findSkillRow(category, name);
    const field = row ? $(`[name="${kind === 'category' ? 'record-start' : 'skill-start'}"]`, row) : null;
    const previous = Number(row?.dataset.hobbySpent) || 0;
    const current = Number(field?.value) || 0;
    const base = Math.max(0, current - previous);
    const limit = raceAllowances[form.elements.race.value]?.[0] || 0;
    const used = Number(form.elements.hobbyUsed.value) || 0;
    const requested = Number(input.value);
    const next = Math.max(0, Math.min(Number.isInteger(requested) ? requested - base : 0, Number(input.max) - base, limit - used + previous));
    if (!row && next) row = skillRow({category, name, start:next, hobbySpent:next});
    else if (row) {
      field.value = String(base + next);
      row.dataset.hobbySpent = String(next);
      if (kind === 'category' && next) categoryRow(category);
      if (kind === 'skill' && !next && !Number(field.value) && !Number($('[name="skill-buy"]', row).value) && !Number($('[name="skill-item"]', row).value) && !Number($('[name="skill-special"]', row).value) && !row.dataset.raceGrant && !row.dataset.languageSpent) row.remove();
    }
    form.elements.hobbyUsed.value = String(used - previous + next);
    input.value = String(base + next);
    updateHobbyLimits();
    updateHobbyVisibility();
    updateDevelopment(); updateHobbyPickerBudget(); saveCurrent();
  }
  function readBackgroundSelections() {
    try {
      const value = JSON.parse(form.elements.backgroundSelections.value || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  function backgroundSelectionCost(selections) {
    return backgroundChoices.reduce((sum, [key, , cost]) => sum + Math.max(0, Number(selections[key]) || 0) * cost, 0);
  }
  function updateBackgroundPickerBudget() {
    const limit = raceAllowances[form.elements.race.value]?.[2] || 0;
    const used = Number(form.elements.backgroundUsed.value) || 0;
    const left = limit - used;
    $('#background-picker-remaining').textContent = left < 0 ? `${-left} over` : `${left} options left`;
    $('#background-picker-used').textContent = `${used} of ${limit} used`;
    const legacy = Math.max(0, used - backgroundSelectionCost(readBackgroundSelections()));
    const note = $('#background-legacy-note');
    note.hidden = !legacy;
    note.innerHTML = legacy ? `${legacy} previously recorded option${legacy === 1 ? '' : 's'} have no selection here. <button type="button" id="reset-unassigned-background">Reset unassigned options</button> to choose them here.` : '';
  }
  function updateBackgroundLimits() {
    const limit = raceAllowances[form.elements.race.value]?.[2] || 0;
    const used = Number(form.elements.backgroundUsed.value) || 0;
    $$('#background-picker-list input[data-background-choice]').forEach(input => {
      const current = Number(input.value) || 0;
      const cost = Number(input.dataset.cost);
      const max = Math.max(0, Math.floor((limit - used + current * cost) / cost));
      input.max = String(max);
      input.closest('.background-choice').classList.toggle('is-over-limit', current > max);
    });
  }
  function renderBackgroundPicker() {
    const race = form.elements.race.value;
    const selections = readBackgroundSelections();
    $('#background-picker-subtitle').textContent = `${race} · T-1.5 choices`;
    $('#background-race-note').textContent = raceBackgroundNotes[race] || '';
    $('#background-picker-list').innerHTML = backgroundChoices.map(([key, label, cost, detail]) => `<label class="background-choice"><span><strong>${esc(label)}</strong><small>${esc(detail)}</small></span><b>${cost} ${cost === 1 ? 'option' : 'options'} each</b><input type="number" inputmode="numeric" min="0" max="99" value="${Math.max(0, Number(selections[key]) || 0)}" data-background-choice="${key}" data-cost="${cost}" aria-label="${esc(label)} count"></label>`).join('');
    $('#background-picker-notes').value = form.elements.backgroundOptions.value;
    updateBackgroundLimits(); updateBackgroundPickerBudget();
  }
  function updateBackgroundSelection(input) {
    const selections = readBackgroundSelections();
    const key = input.dataset.backgroundChoice;
    const cost = Number(input.dataset.cost);
    const previous = Math.max(0, Number(selections[key]) || 0);
    const requested = Number(input.value);
    const next = Math.max(0, Math.min(Number.isInteger(requested) ? requested : 0, Number(input.max)));
    if (next) selections[key] = next; else delete selections[key];
    form.elements.backgroundSelections.value = JSON.stringify(selections);
    form.elements.backgroundUsed.value = String((Number(form.elements.backgroundUsed.value) || 0) + (next - previous) * cost);
    input.value = String(next);
    updateBackgroundLimits(); updateBackgroundPickerBudget(); saveCurrent();
  }
  function renderSkillTree(character = {}) {
    $('#skills-list').innerHTML = '';
    Object.keys(character.categoryRanks || {}).filter(category => skillCategoryRules[category]).forEach(categoryRow);
    (character.skills || []).forEach(skillRow);
    updateDevelopment();
  }
  function applyRaceAdolescence(race) {
    const raceIndex = adolescenceRaces.indexOf(race);
    if (raceIndex < 0) return;
    $$('.skill-row[data-language-spent]', $('#skills-list')).forEach(row => {
      const field = $('[name="skill-start"]', row);
      field.value = String(Math.max(0, (Number(field.value) || 0) - (Number(row.dataset.languageSpent) || 0)));
      delete row.dataset.languageSpent;
      if (!Number(field.value) && !Number($('[name="skill-buy"]', row).value) && !Number($('[name="skill-item"]', row).value) && !Number($('[name="skill-special"]', row).value) && !row.dataset.raceGrant) row.remove();
    });
    form.elements.languageUsed.value = '0';
    $$('.category-record-row').forEach(record => {
      const field = $('[name="record-start"]', record);
      if (!field) return;
      const previous = Number(record.dataset.raceBase) || 0;
      const next = adolescenceCategoryRanks[record.dataset.category]?.[raceIndex] || 0;
      field.value = String(Math.max(0, (Number(field.value) || 0) - previous + next));
      record.dataset.raceBase = String(next);
      if (next) categoryRow(record.dataset.category);
    });
    const grants = new Map();
    const grant = (category, name, ranks, key = `${category}:${name}`) => {
      if (ranks) grants.set(key, {category, name, ranks});
    };
    adolescenceSkillRanks.forEach(([category, name, ranks]) => grant(category, name, ranks[raceIndex]));
    Object.entries(adolescenceCategoryRanks).forEach(([category, ranks]) => {
      if (category.startsWith('Weapon •')) grant(category, 'Choose a weapon', ranks[raceIndex], `weapon:${category}`);
    });
    if (race === 'Wood Elf') grant('Spells • Own Realm Open Lists', 'Choose an open spell list', 2, 'race:open-spell-list');
    (raceStartingLanguages[race] || []).forEach(([language, spoken, written]) => {
      grant('Communications', `${language} (spoken)`, spoken);
      grant('Communications', `${language} (written)`, written);
    });
    const tracked = $$('.skill-row[data-race-grant]', $('#skills-list'));
    tracked.forEach(row => {
      const grantKey = row.dataset.raceGrant;
      const next = grants.get(grantKey);
      const previous = Number(row.dataset.raceBase) || 0;
      const field = $('[name="skill-start"]', row);
      field.value = String(Math.max(0, (Number(field.value) || 0) - previous + (next?.ranks || 0)));
      row.dataset.raceBase = String(next?.ranks || 0);
      if (!next) {
        if (!Number(field.value) && !Number($('[name="skill-buy"]', row).value) && !Number($('[name="skill-item"]', row).value) && !Number($('[name="skill-special"]', row).value)) row.remove();
        else {
          delete row.dataset.raceGrant;
          delete row.dataset.raceBase;
          const name = $('[name="skill-name"]', row);
          name.type = 'text';
          if (name.value.startsWith('Choose ')) name.value = '';
          $('.choose-skill', row)?.remove();
        }
      }
      grants.delete(grantKey);
    });
    grants.forEach(({category, name, ranks}, key) => {
      const row = $$('.skill-row', $('#skills-list')).find(skill => skill.dataset.category === category && $('[name="skill-name"]', skill).value === name && !skill.dataset.raceGrant);
      if (row) {
        $('[name="skill-start"]', row).value = String((Number($('[name="skill-start"]', row).value) || 0) + ranks);
        row.dataset.raceGrant = key;
        row.dataset.raceBase = String(ranks);
        if (key.startsWith('weapon:') || key === 'race:open-spell-list') attachSkillChoice(row);
      } else skillRow({category, name, start:ranks, raceGrant:key, raceBase:ranks});
    });
    validateSkillChoices();
  }
  function openSkillCategoryPicker(target = null) {
    skillCategoryPickerTarget = target;
    const picker = $('#skill-category-picker'); picker.hidden = false;
    const categories = Object.keys(developmentRules?.categories || skillCategoryRules);
    const groups = new Map();
    categories.forEach(category => { const group = categoryGroup(category) || 'Other'; if (!groups.has(group)) groups.set(group, []); groups.get(group).push(category); });
    $('#skill-category-options').innerHTML = [...groups].map(([group, items]) => `<div class="picker-group"><strong>${esc(group)}</strong><div>${items.map(category => `<button type="button" data-category="${esc(category)}">${esc(categoryGroup(category) ? category.slice(group.length + 3) : category)}</button>`).join('')}</div></div>`).join('');
    picker.scrollIntoView({block:'nearest'});
    $('button[data-category]', picker)?.focus();
  }
  function showEditedCategory(target) {
    const row = target.closest('.category-record-row');
    if (!row) return;
    if (['record-start','record-buy','record-special','record-special2'].some(name => Number($(`[name="${name}"]`, row)?.value) || 0)) categoryRow(row.dataset.category);
  }
  function syncA4SkillToTree(target) {
    const row = target.closest('.a4-skill-row[data-skill]');
    if (!row) return;
    const category = row.dataset.category;
    const name = row.dataset.skill;
    let tree = $$('.skill-row', $('#skills-list')).find(skill => skill.dataset.category === category && $('[name="skill-name"]', skill).value === name);
    if (!tree) tree = skillRow({category, name});
    $('[name="skill-start"]', tree).value = $('[name="a4-start"]', row).value;
    updateSkillBuyOptions(tree, Number($('[name="a4-buy"]', row).value) || 0);
    $('[name="skill-item"]', tree).value = $('[name="a4-item"]', row).value;
    $('[name="skill-special"]', tree).value = $('[name="a4-special"]', row).value;
  }
  function costForSkill(row, profession) {
    const category = row.dataset.category;
    return categoryCosts(category, profession);
  }
  function updateSkillBuyOptions(row, preferred) {
    const costs = costForSkill(row, form.elements.profession.value);
    const buy = $('[name="skill-buy"]', row) || $('[name="record-buy"]', row) || $('[name="a4-buy"]', row);
    const max = costs?.length || 0;
    const previous = Math.min(preferred ?? (Number(buy.value) || Number(row.dataset.pendingBuy) || 0), max);
    if (row.dataset.buyMax !== String(max)) {
      buy.innerHTML = Array.from({length: max + 1}, (_, rank) => `<option value="${rank}">${rank}</option>`).join('');
      row.dataset.buyMax = String(max);
    }
    buy.value = String(previous);
    buy.disabled = !max;
    if (max) delete row.dataset.pendingBuy;
    row.classList.toggle('unavailable', !max);
  }
  function updateDevelopment() {
    if (!$('#dp-available')) return;
    const assigned = weaponCostAssignments();
    $('#weapon-cost-summary').textContent = `Slot 1: ${weaponCategories.find(category => assigned[category] === weaponCategories[0]).replace('Weapon • ', '')}`;
    updateRuleBonuses();
    const developmentIndices = [0, 1, 2, 3, 4];
    const values = developmentIndices.map(index => Number(form.elements.namedItem(`stat-temp-${index}`).value));
    const hasStats = values.every(value => Number.isFinite(value) && value >= 1 && value <= 101);
    const available = hasStats ? Math.round(values.reduce((sum, value) => sum + value, 0) / 5) : null;
    if (hasStats) $('#dp-available').textContent = String(available); else $('#dp-available').textContent = '—';
    const profession = form.elements.profession.value;
    let spent = 0;
    $$('.rank-row', $('#skills-list')).forEach(row => {
      updateSkillBuyOptions(row);
      const costs = costForSkill(row, profession);
      const ranks = Number($('[name="skill-buy"]', row).value) || 0;
      const cost = costs ? costs.slice(0, ranks).reduce((sum, value) => sum + value, 0) : 0;
      const start = Number($('[name="skill-start"]', row).value) || 0;
      spent += cost;
      $('.rank-cost', row).textContent = `${cost} DP · ${start + ranks} ranks`;
    });
    $$('.category-record-row').forEach(record => {
      const category = record.dataset.category;
      const rule = skillCategoryRules[category];
      const costs = costForSkill(record, profession);
      $('.record-cost', record).textContent = costs ? costs.join('/') : '—';
      const buy = $('[name="record-buy"]', record);
      if (buy) {
        updateSkillBuyOptions(record);
        spent += costs ? costs.slice(0, Number(buy.value) || 0).reduce((sum, value) => sum + value, 0) : 0;
      }
      const categoryRanks = buy ? (Number($('[name="record-start"]', record).value) || 0) + (Number(buy.value) || 0) : 0;
      const rank = rule[1] && rule[1] !== 'standard' ? 0 : rankBonus(categoryRanks, 'category');
      const stat = categoryStatBonus(category);
      const professionBonus = categoryProfessionBonus(category);
      const special = Number($('[name="record-special"]', record).value) || 0;
      const special2 = Number($('[name="record-special2"]', record).value) || 0;
      const total = stat === null ? null : rank + stat + professionBonus + special + special2;
      const stats = rule[0] === 'realm' ? ({Channeling:'In',Essence:'Em',Mentalism:'Pr'}[form.elements.realm.value] || 'Realm') : rule[0];
      if (buy) {
        $('.record-start-text', record).textContent = $('[name="record-start"]', record).value;
        $('.record-buy-text', record).textContent = buy.value;
      }
      $('.record-special-text', record).textContent = String(special);
      $('.record-special2-text', record).textContent = String(special2);
      $('.record-stats', record).textContent = stats;
      $('.record-rank', record).textContent = String(rank);
      $('.record-stat', record).textContent = stat ?? '—';
      $('.record-profession', record).textContent = String(professionBonus);
      $('.record-total', record).textContent = total ?? '—';
      const row = $$('.category-row', $('#skills-list')).find(item => item.dataset.category === category);
      if (!row) return;
      $('.remove-category', row).disabled = !!$('.skill-row', row.parentElement);
      $('.category-row-summary', row).textContent = `${categoryRanks} ranks · ${total ?? '—'} bonus`;
      $('.category-bonus', row.parentElement).innerHTML = `<span>Rank ${rank} + stat ${stat ?? '—'} + profession ${professionBonus} + specials ${special + special2}</span><strong>Category ${total ?? '—'}</strong>`;
      $$('.skill-row', row.parentElement).forEach(skill => {
        const skillRanks = (Number($('[name="skill-start"]', skill).value) || 0) + (Number($('[name="skill-buy"]', skill).value) || 0);
        const skillRank = rankBonus(skillRanks, rule[1] || 'standard');
        const item = Number($('[name="skill-item"]', skill).value) || 0;
        const skillSpecial = Number($('[name="skill-special"]', skill).value) || 0;
        $('.skill-bonus', skill).innerHTML = `<span>Rank ${skillRank} + category ${total ?? '—'} + item ${item} + special ${skillSpecial}</span><strong>Skill ${total === null ? '—' : skillRank + total + item + skillSpecial}</strong>`;
      });
    });
    updateA4SkillRows();
    $$('.skill-group', $('#skills-list')).forEach(group => {
      const bonus = (professionSkillBonuses[profession] || {})[group.dataset.group] || 0;
      $('.group-profession-bonus', group).textContent = bonus ? `+${bonus} profession` : '';
    });
    spent += Number(form.elements.otherDp.value) || 0;
    $('#dp-spent').textContent = String(spent);
    const remaining = hasStats ? available - spent : null;
    $('#dp-remaining').textContent = remaining === null ? '—' : String(remaining);
    $('#dp-remaining').classList.toggle('over-budget', remaining !== null && remaining < 0);
    updateSheetHints();
  }
  function statCost(value) { return value <= 90 ? value : 90 + (value - 90) ** 2; }
  function applyProfessionStatDefaults() {
    const primes = primeStats[form.elements.profession.value] || [];
    statNames.forEach((name, index) => {
      form.elements.namedItem(`stat-temp-${index}`).value = primes.includes(name) ? '90' : '20';
      form.elements.namedItem(`stat-pot-${index}`).value = '';
    });
  }
  function fixedPotential(value) {
    const bands = [[24,44],[34,39],[44,33],[54,28],[64,22],[74,17],[84,11],[91,6],[92,5],[94,4],[96,3],[98,2],[100,1]];
    return Math.min(101, value + bands.find(([high]) => value <= high)[1]);
  }
  function rolledPotential(value) {
    const bands = [[24,20,8],[34,30,7],[44,40,6],[54,50,5],[64,60,4],[74,70,3],[84,80,2],[91,90,1]];
    const band = bands.find(([high]) => value <= high);
    const [base, dice, sides] = band ? [band[1], band[2], 10] : [value - 1, 1, value === 100 ? 2 : 101 - value];
    const result = base + Array.from({length: dice}, () => Math.floor(Math.random() * sides) + 1).reduce((sum, roll) => sum + roll, 0);
    return Math.max(value, result);
  }
  function updatePotentialStat(index, calculate) {
    const temporaryField = form.elements.namedItem(`stat-temp-${index}`);
    const temporary = Number(temporaryField.value);
    form.elements.namedItem(`stat-pot-${index}`).value = temporaryField.value !== '' && Number.isInteger(temporary) && temporary >= 20 && temporary <= 100
      ? String(calculate(temporary)) : '';
  }
  function setPotentialStats(calculate, method) {
    statNames.forEach((_, index) => updatePotentialStat(index, calculate));
    form.elements.potentialMethod.value = method;
  }
  function basicStatBonus(value) {
    if (value === 100) return 10;
    if (value >= 90) return 5 + Math.floor((value - 90) / 2);
    if (value >= 70) return 1 + Math.floor((value - 70) / 5);
    if (value >= 31) return 0;
    if (value >= 11) return -1 - Math.floor((30 - value) / 5);
    return -5 - Math.floor((10 - value) / 2);
  }
  function updateRuleBonuses() {
    const race = form.elements.race.value;
    const racial = raceStats[race] || raceStats['Common Man'];
    const totals = statNames.map((_, index) => {
      const temporary = form.elements.namedItem(`stat-temp-${index}`).value;
      const basic = form.elements.namedItem(`stat-basic-${index}`);
      const raceField = form.elements.namedItem(`stat-racial-${index}`);
      const special = form.elements.namedItem(`stat-special-${index}`);
      const total = form.elements.namedItem(`stat-total-${index}`);
      raceField.value = String(racial[index]);
      const value = Number(temporary);
      basic.value = temporary !== '' && Number.isInteger(value) && value >= 20 && value <= 100 ? String(basicStatBonus(value)) : '';
      total.value = basic.value ? String(Number(basic.value) + racial[index] + (Number(special.value) || 0)) : '';
      return total.value === '' ? null : Number(total.value);
    });
    const rr = raceResistances[race] || raceResistances['Common Man'];
    resistanceTypes.forEach(([key, , statIndex, raceIndex]) => {
      const stat = totals[statIndex] === null ? null : 3 * totals[statIndex];
      const other = Number(form.elements.namedItem(`rr-other-${key}`).value) || 0;
      $(`#rr-race-${key}`).textContent = String(rr[raceIndex]);
      $(`#rr-stat-${key}`).textContent = stat === null ? '—' : String(stat);
      $(`#rr-total-${key}`).textContent = stat === null ? '—' : String(rr[raceIndex] + stat + other);
    });
  }
  function rollStatPool() {
    const dice = Array.from({length: 10}, () => Math.floor(Math.random() * 10) + 1);
    form.elements.statRoll.value = String(dice.reduce((sum, value) => sum + value, 0));
    form.elements.statDice.value = dice.join(',');
  }
  function ensureStatRoll() {
    const roll = Number(form.elements.statRoll.value);
    if (Number.isInteger(roll) && roll >= 10 && roll <= 100) return false;
    rollStatPool();
    return true;
  }
  function updateSheetHints() {
    updateRuleBonuses();
    $('#roll-potentials').setAttribute('aria-pressed', String(form.elements.potentialMethod.value === 'roll'));
    $('#fixed-potentials').setAttribute('aria-pressed', String(form.elements.potentialMethod.value === 'fixed'));
    const mode = form.elements.statPoolMode.value;
    const roll = Number(form.elements.statRoll.value);
    const validRoll = Number.isInteger(roll) && roll >= 10 && roll <= 100;
    const budget = mode === '660' ? 660 : mode === 'roll' && validRoll ? 600 + roll : null;
    $('#stat-roll-preview').textContent = validRoll ? String(roll) : '—';
    $('#rolled-stat-pool').setAttribute('aria-label', validRoll ? `Use 10d10 roll of ${roll}` : 'Use 10d10 roll');
    $('#rolled-stat-pool').setAttribute('aria-pressed', String(mode === 'roll'));
    $('#fixed-stat-pool').setAttribute('aria-pressed', String(mode === '660'));
    $('#stat-pool-print-addend').textContent = mode === '660' ? '60' : mode === 'roll' && validRoll ? String(roll) : '—';
    $('#stat-pool-total').textContent = budget === null ? '—' : String(budget);
    const values = statNames.map((_, index) => Number(form.elements.namedItem(`stat-temp-${index}`).value) || 0);
    const spent = values.reduce((sum, value) => sum + statCost(value), 0);
    const remaining = budget === null ? 'Choose a stat pool.' : `${spent} of ${budget} points assigned · ${budget - spent} remaining`;
    $('#stat-budget').textContent = remaining;
    $('#stat-budget').classList.toggle('over-budget', budget !== null && spent > budget);
    const primes = primeStats[form.elements.profession.value] || [];
    $$('.stat-row', $('#stats-list')).forEach((row, index) => {
      const isPrime = primes.includes(statNames[index]);
      row.classList.toggle('is-prime', isPrime);
      row.firstElementChild.title = isPrime ? 'Prime stat (minimum 90)' : '';
    });
    const missing = primes.filter(name => values[statNames.indexOf(name)] < 90);
    $('#prime-stats').textContent = `Prime stats: ${primes.join(' and ')} · each must be at least 90${missing.length ? ` (${missing.join(', ')} below 90)` : ''}`;
    const requiredRealm = realmByProfession[form.elements.profession.value];
    $('#profession-info').textContent = `${primes.join(' and ')} are prime stats (90 minimum). ${requiredRealm === 'Choose at table' ? 'Choose Essence, Channeling or Mentalism as your realm.' : `${requiredRealm} is this profession’s realm.`}`;
    const [hobby, language, background] = raceAllowances[form.elements.race.value] || [0,0,0];
    $('#language-spent-label').textContent = `${Number(form.elements.languageUsed.value) || 0} used`;
    $('#hobby-spent-label').textContent = `${Number(form.elements.hobbyUsed.value) || 0} used`;
    $('#background-spent-label').textContent = `${Number(form.elements.backgroundUsed.value) || 0} used`;
    $('#race-language-note').textContent = `Starting languages: ${(raceStartingLanguages[form.elements.race.value] || []).map(([name, spoken, written]) => `${name} S${spoken}/W${written}`).join(', ')}.`;
    $('#stat-dice').textContent = form.elements.statDice.value ? `10d10: ${form.elements.statDice.value.split(',').join(' + ')} = ${form.elements.statRoll.value}` : '';
    for (const [name, limit] of [['hobbyUsed',hobby],['languageUsed',language],['backgroundUsed',background]]) {
      const field = form.elements[name];
      field.classList.toggle('over-budget', Number(field.value) > limit);
    }
    let check = '';
    if (budget === null) check = 'Roll 10d10 or choose Fixed 60 to set your stat pool.';
    else if (values.some(value => !Number.isInteger(value) || value < 20 || value > 100)) check = 'Enter all 10 temporary stats (20–100).';
    else if (missing.length) check = 'Each prime stat must be at least 90.';
    else if (spent !== budget) check = `${Math.abs(budget - spent)} stat assignment points ${spent > budget ? 'over budget' : 'remaining'}.`;
    else if (requiredRealm === 'Choose at table' && !['Essence','Channeling','Mentalism'].includes(form.elements.realm.value)) check = 'Choose a realm of power.';
    else check = 'Initial choices and temporary stats complete.';
    $('#creation-checks').textContent = check;
    $('#creation-checks').classList.toggle('is-complete', check.endsWith('complete.'));
    const raceIndex = adolescenceRaces.indexOf(form.elements.race.value);
    const categoryRanks = Object.values(adolescenceCategoryRanks).reduce((sum, ranks) => sum + (ranks[raceIndex] || 0), 0);
    const skillRanks = adolescenceSkillRanks.reduce((sum, [, , ranks]) => sum + (ranks[raceIndex] || 0), 0)
      + Object.entries(adolescenceCategoryRanks).filter(([category]) => category.startsWith('Weapon •')).reduce((sum, [, ranks]) => sum + (ranks[raceIndex] || 0), 0)
      + (form.elements.race.value === 'Wood Elf' ? 2 : 0);
    $('#adolescence-summary').textContent = `${categoryRanks} category ranks · ${skillRanks} skill ranks`;
    const steps = [];
    const addStep = (label, target) => steps.push(`<li><a href="#${target}">${label}</a></li>`);
    if (check !== 'Initial choices and temporary stats complete.') addStep(esc(check), 'creation-stats');
    const weaponChoices = $$('.skill-row[data-race-grant^="weapon:"]', $('#skills-list')).filter(row => $('[name="skill-name"]', row).value === 'Choose a weapon').length;
    if (weaponChoices) steps.push(`<li><button type="button" class="creation-step-button" data-open-race-weapons>Choose ${weaponChoices} racial weapon${weaponChoices === 1 ? '' : 's'}.</button></li>`);
    const spellChoice = $$('.skill-row[data-race-grant="race:open-spell-list"]', $('#skills-list')).find(row => $('[name="skill-name"]', row).value.startsWith('Choose '));
    if (spellChoice) steps.push('<li><button type="button" class="creation-step-button" data-open-spell-choice>Choose an open spell list.</button></li>');
    for (const [name, limit, output, label] of [
      ['languageUsed',language,'#language-remaining','language ranks'],
      ['hobbyUsed',hobby,'#hobby-remaining','hobby ranks'],
      ['backgroundUsed',background,'#background-remaining','background options']
    ]) {
      const used = Number(form.elements[name].value) || 0;
      const left = limit - used;
      $(output).textContent = left < 0 ? `${-left} over` : `${left} left`;
      $(output).classList.toggle('over-budget', left < 0 || used < 0);
      if (left !== 0 || used < 0) {
        const text = `${left > 0 ? `Allocate ${left}` : `Review ${-left}`} ${label}.`;
        if (name === 'languageUsed') steps.push(`<li><button type="button" class="creation-step-button" data-open-language-picker>${text}</button></li>`);
        else if (name === 'hobbyUsed') steps.push(`<li><button type="button" class="creation-step-button" data-open-hobby-picker>${text}</button></li>`);
        else if (name === 'backgroundUsed') steps.push(`<li><button type="button" class="creation-step-button" data-open-background-picker>${text}</button></li>`);
      }
    }
    const overHobbyLimit = hobbyOverLimitCount();
    if (overHobbyLimit) steps.push(`<li><button type="button" class="creation-step-button" data-open-hobby-picker>Review ${overHobbyLimit} hobby allocation${overHobbyLimit === 1 ? '' : 's'} above the ${esc(form.elements.profession.value)} limit.</button></li>`);
    if (Number(form.elements.backgroundUsed.value) > 0 && !form.elements.backgroundOptions.value.trim()) steps.push('<li><button type="button" class="creation-step-button" data-open-background-picker>Record chosen background option details.</button></li>');
    const dpRemaining = Number($('#dp-remaining').textContent);
    if ($('#dp-remaining').textContent !== '—' && dpRemaining !== 0) addStep(`${dpRemaining > 0 ? `Spend ${dpRemaining}` : `Review ${-dpRemaining}`} development points.`, 'creation-category-sheet');
    $('#creation-steps').innerHTML = steps.length ? steps.join('') : '<li class="is-complete">Creation choices recorded.</li>';
  }
  function showView(name) {
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `${name}-view`));
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  function renderRoster() {
    $('#character-count').textContent = characters.length;
    $('#roster').innerHTML = characters.map(character => `<article class="character-card" data-id="${esc(character.id)}" tabindex="0" role="button" aria-label="Open ${esc(character.name)}"><div class="card-top"><span>${esc(character.race || 'UNSET RACE').toUpperCase()}</span><span class="card-glyph">✳</span></div><h3>${esc(character.name)}</h3><div class="card-sub">${esc(character.profession || 'No profession')} · Level ${esc(character.level || 1)}</div><div class="card-bottom"><span>${esc(character.campaign || 'NO CAMPAIGN')}</span><span>${Number(character.xp || 0).toLocaleString()} XP →</span></div></article>`).join('');
    $('#empty-state').hidden = characters.length > 0;
    $$('.character-card').forEach(card => {
      card.addEventListener('click', () => openCharacter(card.dataset.id));
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCharacter(card.dataset.id); } });
    });
  }
  function formData() {
    const data = Object.fromEntries(new FormData(form).entries());
    data.skills = $$('.skill-row', $('#skills-list')).map(row => ({
      name: $('[name="skill-name"]', row).value,
      category: row.dataset.category,
      start: $('[name="skill-start"]', row).value,
      buy: row.dataset.pendingBuy || $('[name="skill-buy"]', row).value || '0',
      item: $('[name="skill-item"]', row).value,
      special: $('[name="skill-special"]', row).value,
      raceGrant: row.dataset.raceGrant || '',
      raceBase: Number(row.dataset.raceBase) || 0,
      languageSpent: Number(row.dataset.languageSpent) || 0,
      hobbySpent: Number(row.dataset.hobbySpent) || 0,
      ranks: (Number($('[name="skill-start"]', row).value) || 0) + (Number(row.dataset.pendingBuy || $('[name="skill-buy"]', row).value) || 0)
    })).filter(skill => skill.name || Number(skill.start) || Number(skill.buy));
    const visibleCategories = new Set($$('.category-row', $('#skills-list')).map(row => row.dataset.category));
    data.categoryRanks = Object.fromEntries($$('.category-record-row').flatMap(row => {
      const start = $('[name="record-start"]', row)?.value || '0';
      const buy = row.dataset.pendingBuy || $('[name="record-buy"]', row)?.value || '0';
      const special = $('[name="record-special"]', row).value;
      const special2 = $('[name="record-special2"]', row).value;
      const raceBase = Number(row.dataset.raceBase) || 0;
      const hobbySpent = Number(row.dataset.hobbySpent) || 0;
      return visibleCategories.has(row.dataset.category) || Number(start) || Number(buy) || Number(special) || Number(special2) || raceBase || hobbySpent
        ? [[row.dataset.category, {start, buy, special, special2, raceBase, hobbySpent}]] : [];
    }));
    ['skill-name','skill-start','skill-buy','skill-item','skill-special','record-start','record-buy','record-special','record-special2','a4-start','a4-buy','a4-item','a4-special'].forEach(key => delete data[key]);
    data.stats = Object.fromEntries(statNames.map((name, index) => [name, Object.fromEntries(['temp','pot','basic','racial','special','total'].map(part => [part, data[`stat-${part}-${index}`] || '']))]));
    Object.keys(data).filter(key => /^stat-(temp|pot|basic|racial|special|total)-\d+$/.test(key)).forEach(key => delete data[key]);
    return data;
  }
  function fillForm(character = {}) {
    form.reset();
    for (const [key, value] of Object.entries(character)) {
      const field = form.elements.namedItem(key);
      if (field && typeof value !== 'object') field.value = key === 'realm' && value === 'Choose at table' ? 'None' : value;
    }
    makeStats(character.stats || {});
    renderCategoryRecord(character);
    renderSkillTree(character);
    updateDevelopment();
  }
  function revealSelectedChoices() {
    $$('.choice-strip').forEach(strip => {
      const selected = $('input:checked', strip)?.closest('.choice-tile');
      strip.scrollLeft = selected ? selected.offsetLeft : 0;
    });
  }
  function openCharacter(id) {
    const character = characters.find(item => item.id === id); if (!character) return;
    currentId = id; fillForm(character);
    const generated = ensureStatRoll();
    const missingMode = !form.elements.statPoolMode.value;
    if (missingMode) form.elements.statPoolMode.value = 'roll';
    if (generated || missingMode) saveCurrent();
    showView('editor'); revealSelectedChoices();
  }
  function newCharacter() {
    currentId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    fillForm({realm:'None'});
    applyRaceAdolescence(form.elements.race.value);
    applyProfessionStatDefaults();
    setPotentialStats(fixedPotential, 'fixed');
    ensureStatRoll();
    form.elements.statPoolMode.value = 'roll';
    updateDevelopment(); showView('editor'); revealSelectedChoices();
    $('input[name="name"]').focus();
  }
  function saveCurrent() {
    if (!currentId) return;
    updateDevelopment();
    const data = formData();
    if (!data.name.trim()) return;
    const previous = characters.findIndex(item => item.id === currentId);
    const saved = {...(previous >= 0 ? characters[previous] : {}), id: currentId, ...data};
    if (previous < 0) characters.unshift(saved); else characters[previous] = saved;
    writeCharacters(); renderRoster();
  }
  async function chooseTable(reference) {
    if (!reference) return;
    activeTable = reference;
    $('#table-current').textContent = reference.title;
    $('#table-code').textContent = `${reference.code} · CORE PAGE${reference.printedPages.length > 1 ? 'S' : ''} ${reference.printedPages.join(', ')}`;
    $$('.table-choice').forEach(button => button.classList.toggle('active', button.dataset.code === reference.code));
    $('#table-source').hidden = false;
    $('#table-source').innerHTML = '<p class="table-load-error">Loading table data…</p>';
    $('.table-scroll').hidden = true; $('#lookup-result').hidden = true; $('.lookup-controls').hidden = true;
    try {
      let detail = tableCache.get(reference.code);
      if (!detail) {
        const response = await fetch(`tables/${encodeURIComponent(reference.file)}`);
        if (!response.ok) throw new Error('Table data was not found');
        detail = await response.json(); tableCache.set(reference.code, detail);
      }
      if (activeTable.code !== reference.code) return;
      activeTable = detail;
      if (detail.kind === 'critical') {
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</option>`).join('');
        $('#roll-label').textContent = 'Critical roll';
        $('#table-roll').max = detail.code.endsWith('.7') || detail.code.endsWith('.8') || detail.code.endsWith('.9') ? '999' : '100';
        if (Number($('#table-roll').value) > Number($('#table-roll').max)) $('#table-roll').value = $('#table-roll').max;
        $('#column-select-field').firstChild.textContent = 'Critical type';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        $('.table-scroll').innerHTML = '<details class="full-critical-table" open><summary>Full critical table</summary><div class="table-scroll-inner"><table id="attack-grid" class="critical-grid"></table></div></details>';
        renderCriticalGrid(); updateCriticalLookup();
        $('#table-note').textContent = 'H = hits · π = must parry · ∏ = no parry · ∑ = stunned · ∫ = bleed per round. A number before a symbol gives its amount or duration.';
      } else if (detail.columns && detail.rows) {
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group)} · ${esc(column.label)}</option>`).join('');
        $('#roll-label').textContent = 'Modified roll';
        $('#table-roll').max = '300';
        $('#column-select-field').firstChild.textContent = detail.code === 'A-10.9.11' ? 'Target' : 'Target armor';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        $('.table-scroll').innerHTML = `<details class="full-attack-table" open><summary>Full attack table</summary><div class="table-scroll-inner"><table id="attack-grid" class="attack-grid"></table></div></details>`;
        renderGrid(); updateLookup();
        $('#table-note').textContent = 'Hits and criticals are shown together (for example, 12E).';
      } else if (detail.categories && detail.professions) {
        $('.table-scroll').hidden = false; $('#table-source').hidden = true;
        $('#attack-grid').innerHTML = `<thead><tr><th>Skill category</th>${detail.professions.map(profession => `<th>${esc(profession)}</th>`).join('')}</tr></thead><tbody>${Object.entries(detail.categories).map(([category, costs]) => `<tr><th scope="row">${esc(category)}</th>${detail.professions.map(profession => `<td>${costs[profession] ? costs[profession].join('/') : '—'}</td>`).join('')}</tr>`).join('')}</tbody>`;
        $('#table-note').textContent = 'Rank costs by profession. Weapon rows are assignable cost slots for each character. A dash means unavailable.';
      } else renderSource(detail);
    } catch {
      if (activeTable.code === reference.code) $('#table-source').innerHTML = '<p class="table-load-error">Could not load this table file. Reload the page to try again.</p>';
    }
  }
  function renderSource(table) {
    $('.table-scroll').hidden = true;
    $('#table-source').hidden = false;
    $('#table-source').innerHTML = (table.tablePages || []).map(page => `<section class="source-page"><div class="source-page-head"><span>${esc(table.code)}</span><span>CORE PAGE ${page.printedPage}</span></div><pre>${esc(page.text)}</pre></section>`).join('');
    $('#table-note').textContent = '';
  }
  function renderGrid() {
    if (!activeTable?.columns || !activeTable?.rows) return;
    const groups = [];
    activeTable.columns.forEach((column, index) => {
      const previous = groups[groups.length - 1];
      if (previous?.group === column.group) previous.count++;
      else groups.push({group: column.group, count: 1, start: index});
    });
    const headerGroups = groups.map(group => `<th colspan="${group.count}">${esc(group.group)}</th>`).join('');
    const columnHeaders = activeTable.columns.map(column => `<th>${esc(column.label)}</th>`).join('');
    let previousSection = null;
    const body = activeTable.rows.map((row, rowIndex) => {
      let section = '';
      if (row.section && row.section !== previousSection) {
        section = `<tr class="table-section"><th colspan="${activeTable.columns.length + 1}">${esc(row.section)}</th></tr>`;
        previousSection = row.section;
      }
      const values = row.values.map((value, columnIndex) => `<td data-column="${columnIndex}" class="${value === '–' ? 'no-result' : value === 'F' ? 'failure-result' : value.endsWith('A') || value.endsWith('B') || value.endsWith('C') || value.endsWith('D') || value.endsWith('E') ? 'critical-result' : ''}">${esc(value)}</td>`).join('');
      const unmodified = row.unmodified ? ' unmodified-row' : '';
      return `${section}<tr class="attack-row${unmodified}" data-row="${rowIndex}"><th scope="row">${row.unmodified ? 'UM ' : ''}${esc(row.roll)}</th>${values}</tr>`;
    }).join('');
    $('#attack-grid').innerHTML = `<thead><tr><th rowspan="2" class="roll-heading">Modified<br>roll</th>${headerGroups}</tr><tr>${columnHeaders}</tr></thead><tbody>${body}</tbody>`;
  }
  function renderCriticalGrid() {
    const columns = activeTable.columns.map(column => `<th scope="col">${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</th>`).join('');
    const rows = activeTable.rows.map((row, rowIndex) => `<tr class="critical-row" data-row="${rowIndex}"><th scope="row">${esc(row.roll)}</th>${row.cells.map((cell, columnIndex) => `<td data-column="${columnIndex}"><p>${esc(cell.description)}</p><span class="critical-effect">${esc(cell.effect || '—')}</span></td>`).join('')}</tr>`).join('');
    $('#attack-grid').innerHTML = `<thead><tr><th scope="col">Roll</th>${columns}</tr></thead><tbody>${rows}</tbody>`;
  }
  function updateCriticalLookup() {
    if (activeTable?.kind !== 'critical') return;
    const roll = Math.max(1, Number($('#table-roll').value) || 1);
    const columnIndex = Number($('#table-column').value) || 0;
    const row = activeTable.rows.find(item => {
      const [start, end] = item.roll.split('-');
      return roll >= Number.parseInt(start, 10) && roll <= (end ? Number.parseInt(end, 10) : item.roll.endsWith('+') ? Infinity : Number.parseInt(start, 10));
    }) || activeTable.rows[activeTable.rows.length - 1];
    const column = activeTable.columns[columnIndex];
    const cell = row.cells[columnIndex];
    $('#lookup-result').innerHTML = `<div class="critical-lookup"><div class="critical-lookup-heading"><span>ROLL ${esc(roll)}${row.roll === String(roll) ? '' : ` · ${esc(row.roll)}`}</span><strong>${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</strong></div><p>${esc(cell.description)}</p><div class="critical-lookup-effect">${esc(cell.effect || '—')}</div></div>`;
    $$('.critical-row', $('#attack-grid')).forEach(element => {
      const selected = Number(element.dataset.row) === activeTable.rows.indexOf(row);
      element.classList.toggle('selected-row', selected);
      $$('td', element).forEach((tableCell, index) => tableCell.classList.toggle('selected-cell', selected && index === columnIndex));
    });
  }
  function rowContainsModifiedRoll(row, roll) {
    if (row.unmodified) return false;
    const parts = row.roll.split('-');
    let low = parts.length === 1 ? Number(parts[0]) : (parts[0] === 'XX' ? 1 : Number(parts[0]));
    const high = parts.length === 1 ? low : Number(parts[1]);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return false;
    return roll >= low && roll <= high;
  }
  function updateLookup() {
    if (!activeTable?.rows) return;
    const roll = Number($('#table-roll').value) || 1;
    const columnIndex = Number($('#table-column').value) || 0;
    const regularRows = activeTable.rows.filter(row => !row.unmodified);
    let row = regularRows.find(item => rowContainsModifiedRoll(item, roll));
    if (!row) row = roll > 150 ? regularRows[0] : regularRows[regularRows.length - 1];
    const value = row?.values[columnIndex] ?? '–';
    const column = activeTable.columns[columnIndex];
    const lookup = $('#lookup-result');
    lookup.innerHTML = `Roll <strong>${esc(roll)}</strong> vs. <strong>${esc(column.group)} ${esc(column.label)}</strong><span>${esc(value)}</span>`;
    $$('.attack-row', $('#attack-grid')).forEach(element => {
      const selected = Number(element.dataset.row) === activeTable.rows.indexOf(row);
      element.classList.toggle('selected-row', selected);
      $$('td', element).forEach((cell, index) => cell.classList.toggle('selected-cell', selected && index === columnIndex));
    });
  }
  function renderTables(filter = '') {
    const needle = filter.trim().toLowerCase();
    const shown = tables.filter(table => {
      const matchesSearch = `${table.title} ${table.code}`.toLowerCase().includes(needle);
      const group = table.code.startsWith('A-10.9') ? 'attacks' : table.code.startsWith('A-10.10') ? 'criticals' : /^T-[12]\./.test(table.code) || table.code === 'chart-special-progression' ? 'character' : 'play';
      return matchesSearch && (activeTableGroup === 'all' || activeTableGroup === group);
    });
    $('#table-list').innerHTML = shown.map(table => `<button class="table-choice" data-code="${table.code}"><span>${esc(table.title)}</span><span>${table.code}</span></button>`).join('');
    $('#table-count').textContent = `${shown.length} of ${tables.length} tables and charts`;
    if (!shown.length) {
      $('#table-list').innerHTML = '<p class="table-list-empty">No tables match this search.</p>';
      activeTable = null;
      $('#table-current').textContent = 'No matching table';
      $('#table-code').textContent = '';
      $('.lookup-controls').hidden = true;
      $('#lookup-result').hidden = true;
      $('.table-scroll').hidden = true;
      $('#table-source').hidden = false;
      $('#table-source').innerHTML = '<p class="table-list-empty">Try another search or category.</p>';
      $('#table-note').textContent = '';
    }
    $$('.table-choice').forEach(button => button.addEventListener('click', () => chooseTable(tables.find(table => table.code === button.dataset.code))));
    if (shown.length && !shown.some(table => table.code === activeTable?.code)) chooseTable(shown[0]);
    else $$('.table-choice').forEach(button => button.classList.toggle('active', button.dataset.code === activeTable?.code));
  }
  async function loadReferenceData() {
    try {
      const [tableResponse, costResponse] = await Promise.all([fetch('tables/index.json'), fetch('tables/T-2.8.json')]);
      if (!tableResponse.ok || !costResponse.ok) throw new Error('Reference files could not be loaded');
      tables = await tableResponse.json();
      developmentRules = await costResponse.json();
      const draft = formData();
      renderCategoryRecord(draft);
      renderSkillTree(draft);
      renderTables();
      updateDevelopment();
      if ($('#weapon-cost-picker').open) renderWeaponCostPicker();
    } catch (error) {
      $('#table-list').innerHTML = '<p class="table-load-error">Table data could not be loaded. Serve this folder over HTTP and reload.</p>';
    }
  }
  makeStats(); makeResistances(); renderRoster(); loadReferenceData();
  function openTableGroup(group) {
    activeTableGroup = group;
    $$('.filter-chip').forEach(button => {
      const active = button.dataset.group === group;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#table-search').value = '';
    renderTables();
    showView('tables');
  }
  $$('.nav-link').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  $('.brand').addEventListener('click', event => { event.preventDefault(); showView('home'); });
  $('#new-character').addEventListener('click', newCharacter);
  $('#empty-new-character').addEventListener('click', newCharacter);
  $$('.filter-chip').forEach(button => button.addEventListener('click', () => openTableGroup(button.dataset.group)));
  $('#back-roster').addEventListener('click', () => { saveCurrent(); renderRoster(); showView('home'); });
  $('#cancel-skill-category').addEventListener('click', () => { $('#skill-category-picker').hidden = true; skillCategoryPickerTarget = null; });
  $('#skill-category-options').addEventListener('click', event => {
    const button = event.target.closest('button[data-category]');
    if (!button) return;
    const category = button.dataset.category;
    if (skillCategoryPickerTarget === 'category') {
      categoryRow(category);
    } else if (skillCategoryPickerTarget) {
      skillCategoryPickerTarget.dataset.category = category;
      $('.change-skill-category', skillCategoryPickerTarget).textContent = category;
      $('.category-skills', categoryRow(category).parentElement).append(skillCategoryPickerTarget);
      updateSkillBuyOptions(skillCategoryPickerTarget);
    } else {
      const row = skillRow({category});
      $('[name="skill-name"]', row).focus();
    }
    $('#skill-category-picker').hidden = true;
    skillCategoryPickerTarget = null;
    updateDevelopment(); saveCurrent();
  });
  $('#skill-choice-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-choice]');
    if (!button || !skillChoiceTarget) return;
    assignSkillChoice(skillChoiceTarget, button.dataset.choice);
    $('#skill-choice-dialog').close(); skillChoiceTarget = null;
  });
  $('#close-skill-choice').addEventListener('click', () => $('#skill-choice-dialog').close());
  $('#skill-choice-dialog').addEventListener('close', () => { skillChoiceTarget = null; });
  $('#open-race-weapons').addEventListener('click', () => { renderRaceWeaponsPicker(); $('#race-weapons-picker').showModal(); });
  $('#close-race-weapons').addEventListener('click', () => $('#race-weapons-picker').close());
  $('#open-weapon-cost-picker').addEventListener('click', () => {
    $('#weapon-cost-message').textContent = '';
    renderWeaponCostPicker();
    $('#weapon-cost-picker').showModal();
  });
  $('#close-weapon-cost-picker').addEventListener('click', () => $('#weapon-cost-picker').close());
  $('#weapon-cost-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-category][data-slot]');
    if (!button || !developmentRules) return;
    const category = button.dataset.category;
    const slot = button.dataset.slot;
    const assigned = weaponCostAssignments();
    if (assigned[category] === slot) return;
    const other = weaponCategories.find(name => assigned[name] === slot);
    const previous = assigned[category];
    assigned[category] = slot;
    assigned[other] = previous;
    const blocked = $$('.rank-row, .category-record-row, .a4-skill-row').some(row => {
      if (row.dataset.category !== category && row.dataset.category !== other) return false;
      const buy = $('[name="skill-buy"], [name="record-buy"], [name="a4-buy"]', row);
      return buy && Number(row.dataset.pendingBuy || buy.value) > (developmentRules.categories[assigned[row.dataset.category]]?.[form.elements.profession.value]?.length || 0);
    });
    if (blocked) {
      $('#weapon-cost-message').textContent = 'Reduce new ranks purchased in these categories before swapping their cost slots.';
      return;
    }
    form.elements.weaponCostAssignments.value = JSON.stringify(assigned);
    $('#weapon-cost-message').textContent = '';
    renderWeaponCostPicker();
    updateDevelopment();
    saveCurrent();
  });
  $('#race-weapons-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-choice]');
    if (!button) return;
    const row = $$('.skill-row[data-race-grant]', $('#skills-list')).find(item => item.dataset.raceGrant === `weapon:${button.dataset.category}`);
    if (!row) return;
    assignSkillChoice(row, button.dataset.choice);
    renderRaceWeaponsPicker();
  });
  $('#hide-zero-skills').addEventListener('change', updateA4Visibility);
  $('#hide-zero-groups').addEventListener('change', updateA4Visibility);
  const openLanguagePicker = () => { renderLanguagePicker(); $('#language-picker').showModal(); };
  const openHobbyPicker = () => { renderHobbyPicker(); $('#hobby-picker').showModal(); };
  const openBackgroundPicker = () => { renderBackgroundPicker(); $('#background-picker').showModal(); };
  $('#open-language-picker').addEventListener('click', openLanguagePicker);
  $('#open-hobby-picker').addEventListener('click', openHobbyPicker);
  $('#open-background-picker').addEventListener('click', openBackgroundPicker);
  $('#creation-steps').addEventListener('click', event => {
    if (event.target.closest('[data-open-language-picker]')) openLanguagePicker();
    if (event.target.closest('[data-open-hobby-picker]')) openHobbyPicker();
    if (event.target.closest('[data-open-background-picker]')) openBackgroundPicker();
    if (event.target.closest('[data-open-race-weapons]')) $('#open-race-weapons').click();
    if (event.target.closest('[data-open-spell-choice]')) {
      const row = $$('.skill-row[data-race-grant="race:open-spell-list"]', $('#skills-list'))[0];
      if (row) openSkillChoice(row);
    }
  });
  $('#close-language-picker').addEventListener('click', () => $('#language-picker').close());
  $('#language-picker-list').addEventListener('change', event => { if (event.target.matches('input[data-language]')) updateLanguageAllocation(event.target); });
  $('#language-legacy-note').addEventListener('click', event => {
    if (event.target.id !== 'reset-unassigned-languages') return;
    form.elements.languageUsed.value = String($$('.skill-row[data-language-spent]', $('#skills-list')).reduce((sum, row) => sum + (Number(row.dataset.languageSpent) || 0), 0));
    renderLanguagePicker(); saveCurrent();
  });
  $('#close-hobby-picker').addEventListener('click', () => $('#hobby-picker').close());
  $('#hobby-search').addEventListener('input', updateHobbyVisibility);
  for (const id of ['hide-zero-hobby-skills','hide-zero-hobby-categories']) {
    $(`#${id}`).addEventListener('click', event => {
      const button = event.currentTarget;
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
      updateHobbyVisibility();
    });
  }
  $('#hobby-picker-list').addEventListener('change', event => { if (event.target.matches('input[data-kind]')) updateHobbyAllocation(event.target); });
  $('#hobby-legacy-note').addEventListener('click', event => {
    if (event.target.id !== 'reset-unassigned-hobbies') return;
    const skillRanks = $$('.skill-row[data-hobby-spent]', $('#skills-list')).reduce((sum, row) => sum + (Number(row.dataset.hobbySpent) || 0), 0);
    const categoryRanks = $$('.category-record-row[data-hobby-spent]').reduce((sum, row) => sum + (Number(row.dataset.hobbySpent) || 0), 0);
    form.elements.hobbyUsed.value = String(skillRanks + categoryRanks);
    updateHobbyLimits(); updateHobbyPickerBudget(); saveCurrent();
  });
  $('#close-background-picker').addEventListener('click', () => $('#background-picker').close());
  $('#background-picker-list').addEventListener('change', event => { if (event.target.matches('input[data-background-choice]')) updateBackgroundSelection(event.target); });
  $('#background-picker-notes').addEventListener('input', event => { form.elements.backgroundOptions.value = event.target.value; saveCurrent(); });
  $('#background-legacy-note').addEventListener('click', event => {
    if (event.target.id !== 'reset-unassigned-background') return;
    form.elements.backgroundUsed.value = String(backgroundSelectionCost(readBackgroundSelections()));
    updateBackgroundLimits(); updateBackgroundPickerBudget(); saveCurrent();
  });
  $('#rolled-stat-pool').addEventListener('click', () => {
    rollStatPool();
    form.elements.statPoolMode.value = 'roll';
    saveCurrent();
  });
  $('#fixed-stat-pool').addEventListener('click', () => {
    form.elements.statPoolMode.value = '660';
    saveCurrent();
  });
  $('#roll-potentials').addEventListener('click', () => { setPotentialStats(rolledPotential, 'roll'); saveCurrent(); });
  $('#fixed-potentials').addEventListener('click', () => { setPotentialStats(fixedPotential, 'fixed'); saveCurrent(); });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    const match = /^stat-temp-(\d+)$/.exec(event.target.name || '');
    if (match) updatePotentialStat(Number(match[1]), form.elements.potentialMethod.value === 'roll' ? rolledPotential : fixedPotential);
    showEditedCategory(event.target);
    syncA4SkillToTree(event.target);
    saveCurrent();
  });
  form.addEventListener('change', event => {
    showEditedCategory(event.target);
    syncA4SkillToTree(event.target);
    if (event.target.name === 'race') applyRaceAdolescence(event.target.value);
    if (event.target.name === 'profession') {
      const realm = realmByProfession[event.target.value];
      form.elements.realm.value = realm === 'Choose at table' ? 'None' : realm || 'None';
      applyProfessionStatDefaults();
      setPotentialStats(fixedPotential, 'fixed');
    }
    if (event.target.name === 'realm' && realmByProfession[form.elements.profession.value] !== 'Choose at table') form.elements.realm.value = realmByProfession[form.elements.profession.value];
    if (event.target.name === 'profession' || event.target.name === 'realm') validateSkillChoices();
    updateDevelopment();
    saveCurrent();
  });
  $('#print-character').addEventListener('click', () => window.print());
  $('#delete-character').addEventListener('click', () => {
    const character = characters.find(item => item.id === currentId);
    if (!character) { showView('home'); return; }
    if (window.confirm(`Delete ${character.name}?`)) { characters = characters.filter(item => item.id !== currentId); writeCharacters(); renderRoster(); currentId = null; showView('home'); }
  });
  $('#table-search').addEventListener('input', event => renderTables(event.target.value));
  $('#table-roll').addEventListener('input', () => activeTable?.kind === 'critical' ? updateCriticalLookup() : updateLookup());
  $('#table-column').addEventListener('change', () => activeTable?.kind === 'critical' ? updateCriticalLookup() : updateLookup());
})();
