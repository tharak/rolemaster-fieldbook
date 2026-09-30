(() => {
  const STORAGE_KEY = 'rolemaster-fieldbook-characters-v1';
  const statNames = ['Agility', 'Constitution', 'Memory', 'Reasoning', 'Self Discipline', 'Empathy', 'Intuition', 'Presence', 'Quickness', 'Strength'];
  let tables = [];
  let activeTable = null;
  const tableCache = new Map();
  let developmentRules = null;
  let trainingPackages = [];
  let equipmentCatalog = [];
  let equipmentCategory = 'All';
  let equipmentSearch = '';
  let equipmentMessage = '';
  const realmByProfession = {Fighter:'Choose at table',Thief:'Choose at table',Rogue:'Choose at table',Cleric:'Channeling',Magician:'Essence',Mentalist:'Mentalism',Ranger:'Channeling',Dabbler:'Essence',Bard:'Mentalism'};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const form = $('#character-form');
  let characters = readCharacters();
  let currentId = null;
  let playSkillFilter = 'active';
  let activePlayRoll = null;
  let playDice = null;
  let activeTableGroup = 'all';
  let skillCategoryPickerTarget = null;
  let skillChoiceTarget = null;
  let trainingItemTarget = null;
  const primeStats = {Fighter:['Strength','Constitution'], Thief:['Agility','Quickness'], Rogue:['Agility','Strength'], Cleric:['Intuition','Memory'], Magician:['Empathy','Reasoning'], Mentalist:['Presence','Self Discipline'], Ranger:['Intuition','Constitution'], Dabbler:['Empathy','Agility'], Bard:['Presence','Memory']};
  // The ends of each range in the Core Rules role trait table T-1.7.
  const personalityRanges = [
    ['Serious','Joyous'],['Kind','Cruel'],['Restrained','Indulgent'],['Cooperative','Obstinate'],
    ['Protective','Overbearing'],['Open-minded','Reactionary'],['Friendly','Antagonistic'],['Cautious','Reckless'],
    ['Confident','Nervous'],['Outgoing','Introvert'],['Peaceful','Belligerent'],['Humble','Arrogant'],
    ['Laid back','Ambitious'],['Courteous','Rude'],['Forgiving','Vengeful'],['Generous','Greedy'],
    ['Honest','Dishonest'],['Honorable','Dishonorable'],['Loyal','Disloyal'],['Lawful','Chaotic'],
    ['Principled','Immoral'],['Devout','Impious'],['Idealistic','Cynical'],['Trusting','Paranoid'],
    ['Curious','Incurious'],['Attentive','Absentminded'],['Chaste','Licentious'],['Quiet','Loud'],
    ['Brave','Cowardly'],['Calm','Excitable'],['Even-tempered','Hot-headed'],['Stoic','Complaining'],
    ['Sociable','Antisocial'],['Optimistic','Pessimistic'],['Creative','Uncreative'],['Tolerant','Intolerant'],
    ['Messy','Perfectionist'],['Understanding','Jealous'],['Dependent','Independent']
  ];
  const motivationRanges = [
    'Destroy…','Hate and work against…','Hate…','Dislike…','Seek revenge against…',
    'Preserve…','Protect…','Serve…','Promote…','Rebuild or restart…',
    'Fanatic about…','Compulsive about…','Fear of…','Acquire something for someone…','Acquire personal power, knowledge, or wealth…',
    'Acquire and maintain personal honor','Seek adventure, thrills, and excitement','Pursue self-interest','Heroism','Make the world a better place'
  ];
  const alignmentRanges = [
    ['Good','Evil'],['Law and government','Anarchy'],['Government','Opposing government'],
    ['Laws and principles','Opportunism'],['Religion','Atheism'],['Religion','Opposing religion'],
    ['Free enterprise','Cartels and monopolies'],['Free enterprise','Socialism'],['Asceticism','Hedonism'],
    ['Altruism','Egoism'],['Spiritual','Materialist'],['Metaphorical','Literal']
  ];
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
  const meleeWeaponCategories = ['Weapon • 1-H Concussion','Weapon • 1-H Edged','Weapon • 2-Handed','Weapon • Pole Arms'];
  const specialSkillClasses = {
    Dwarf: {everyman:['Caving','Leather-crafts','Metal-crafts','Mining','Stone-crafts'], restricted:['Swimming']},
    'Wood Elf': {everyman:['Music','Trickery']},
    Halfling: {everyman:['Horticulture']},
    Fighter: {everyman:['Leadership','Frenzy','Boxing','Tackling','Situational Awareness (Combat)']},
    Thief: {everyman:['Duping','Operating Equipment'], occupational:['Lock Lore']},
    Rogue: {everyman:['Duping','Lock Lore']},
    Magician: {everyman:['Time Sense','Meditation']},
    Cleric: {everyman:['Time Sense','Meditation'], occupational:['Religion','Divination']},
    Mentalist: {everyman:['Lie Perception','Time Sense','Seduction']},
    Dabbler: {everyman:['Sense Ambush','Time Sense','Detect Traps','Locate Hidden'], occupational:['Lock Lore']},
    Bard: {everyman:['Time Sense']}
  };
  function skillClass(row) {
    if (row?.dataset.skillClass && row.dataset.skillClass !== 'auto') return row.dataset.skillClass;
    const name = $('[name="skill-name"]', row)?.value || '';
    const matches = entry => entry === name || (entry === 'Divination' && name.startsWith('Divination ('));
    const classes = [specialSkillClasses[form.elements.race.value], specialSkillClasses[form.elements.profession.value]];
    if (classes.some(group => group?.occupational?.some(matches))) return 'occupational';
    if (classes.some(group => group?.restricted?.some(matches))) return 'restricted';
    if (classes.some(group => group?.everyman?.some(matches))) return 'everyman';
    if (form.elements.race.value === 'Wood Elf' && (name.startsWith('Play Instrument') || name.startsWith('Wood-crafts'))) return 'everyman';
    if (form.elements.race.value === 'Dwarf' && name.startsWith('Survival (underground')) return 'everyman';
    if (form.elements.race.value === 'Halfling' && name.startsWith('Caving (Halfling-holes')) return 'everyman';
    if (form.elements.profession.value === 'Fighter' && name.startsWith('Situational Awareness') && name.includes('Combat')) return 'everyman';
    return 'standard';
  }
  function developedSkillRanks(row, buy = Number($('[name="skill-buy"]', row)?.value) || 0) {
    const kind = skillClass(row);
    return kind === 'occupational' ? buy * 3 : kind === 'everyman' ? buy * 2 : kind === 'restricted' ? Math.floor(buy / 2) : buy;
  }
  const packageChoiceRules = {
    Adventurer:[['weapon-category','category',weaponCategories,1,1],['weapon-skill','skill','@weapon-category',1,1]],
    'Amateur Mage':[['open-lists','skill','Spells • Own Realm Open Lists',3,3],['magical-lore','skill','Lore • Magical',2,1],['technical-lore','skill','Lore • Technical',1,1]],
    'Animal Friend':[['environmental','skill','Outdoor • Environmental',2,2],['animal','skill','Outdoor • Animal',4,3]],
    Burglar:[['mechanics','skill','Subterfuge • Mechanics',2,2],['gymnastics','skill','Athletic • Gymnastics',1,1],['weapon-category','category',weaponCategories,1,1],['weapon-skill','skill','@weapon-category',1,1]],
    'City Guard':[['weapon-category','category',weaponCategories,2,1],['weapon-skill','skill','@weapon-category',2,1]],
    Herbalist:[['environmental','skill','Outdoor • Environmental',1,1]],
    Hunter:[['missile','skill','Weapon • Missile',1,1],['environmental','skill','Outdoor • Environmental',2,2]],
    Knight:[['melee-category','category',meleeWeaponCategories,2,1],['melee-skill','skill','@melee-category',2,1],['maneuver','skill','Combat Maneuvers',1,1]],
    Loremaster:[['general','skill','Lore • General',6,3],['technical','skill','Lore • Technical',1,1],['obscure','skill','Lore • Obscure',1,1],['magical','skill','Lore • Magical',3,2]],
    Merchant:[['language','skill','Communications',3,3],['vocation','skill','Technical/Trade • Vocational',1,1]],
    Performer:[['active','skill','Artistic • Active',3,1],['gymnastics','skill','Athletic • Gymnastics',1,1],['language','skill','Communications',5,5],['influence','skill','Influence',2,2]],
    Scout:[['environmental','skill','Outdoor • Environmental',3,3],['animal','skill','Outdoor • Animal',2,2],['weapon-category','category',weaponCategories,1,1],['weapon-skill','skill','@weapon-category',1,1]],
    Soldier:[['weapon-category','category',weaponCategories,2,1],['weapon-skill','skill','@weapon-category',2,1],['light-armor','skill','Armor • Light',2,1]],
    Traveller:[['environmental','skill','Outdoor • Environmental',1,1]]
  };
  function weaponCostAssignments() {
    let saved;
    try { saved = JSON.parse(form.elements.weaponCostAssignments.value || '{}'); } catch { saved = {}; }
    const slots = weaponCategories.map(category => saved?.[category]);
    if (slots.every(slot => weaponCategories.includes(slot)) && new Set(slots).size === weaponCategories.length) return saved;
    const defaults = Object.fromEntries(weaponCategories.map(category => [category, category]));
    if (form.elements.profession.value === 'Ranger') {
      defaults['Weapon • 1-H Concussion'] = 'Weapon • 1-H Edged';
      defaults['Weapon • 1-H Edged'] = 'Weapon • 1-H Concussion';
    }
    return defaults;
  }
  function categoryCosts(category, profession = form.elements.profession.value) {
    const source = category.startsWith('Weapon •') ? weaponCostAssignments()[category] : category;
    return developmentRules?.categories?.[source]?.[profession] || null;
  }
  function renderWeaponCostAssignments() {
    const assignments = weaponCostAssignments();
    const profession = form.elements.profession.value;
    $('#weapon-cost-picker-list').innerHTML = developmentRules ? weaponCategories.map(category => {
      const selected = assignments[category];
      const costs = developmentRules.categories[selected]?.[profession] || [];
      return `<div class="weapon-cost-row"><strong>${esc(category.replace('Weapon • ', ''))} <small>· ${costs.join('/')} DP</small></strong><div class="choice-strip">${weaponCategories.map(source => {
        const slot = developmentRules.categories[source]?.[profession] || [];
        return `<button type="button" data-weapon-cost-category="${esc(category)}" data-weapon-cost-source="${esc(source)}" aria-pressed="${selected === source}">${esc(source.replace('Weapon • ', ''))} · ${slot.join('/')}</button>`;
      }).join('')}</div></div>`;
    }).join('') : '<p class="language-picker-note">Development costs are loading.</p>';
  }
  function swapWeaponCostAssignment(category, source) {
    if (!weaponCategories.includes(category) || !weaponCategories.includes(source) || !developmentRules) return;
    const current = weaponCostAssignments();
    const owner = weaponCategories.find(other => current[other] === source);
    if (!owner || owner === category) return;
    const next = {...current, [category]:source, [owner]:current[category]};
    const profession = form.elements.profession.value;
    for (const weapon of weaponCategories) {
      const costs = developmentRules.categories[next[weapon]]?.[profession] || [];
      const hobbyLimit = costs.filter(cost => cost < 40).length;
      const record = $$('.category-record-row').find(row => row.dataset.category === weapon);
      const rows = [record, ...$$('.skill-row', $('#skills-list')).filter(row => row.dataset.category === weapon)].filter(Boolean);
      if (rows.some(row => {
        const purchased = Number($(`[name="${row === record ? 'record-buy' : 'skill-buy'}"]`, row)?.value) || 0;
        return purchased > costs.length || (Number(row.dataset.hobbySpent) || 0) > hobbyLimit;
      })) {
        $('#weapon-cost-picker-message').textContent = `${weapon.replace('Weapon • ', '')} has more hobby or purchased ranks than that cost slot allows.`;
        return;
      }
    }
    const oldSpent = weaponCategories.reduce((total, weapon) => {
      const costs = developmentRules.categories[current[weapon]][profession] || [];
      const record = $$('.category-record-row').find(row => row.dataset.category === weapon);
      const rows = [record, ...$$('.skill-row', $('#skills-list')).filter(row => row.dataset.category === weapon)].filter(Boolean);
      return total + rows.reduce((sum, row) => sum + costs.slice(0, Number($(`[name="${row === record ? 'record-buy' : 'skill-buy'}"]`, row)?.value) || 0).reduce((a, b) => a + b, 0), 0);
    }, 0);
    const newSpent = weaponCategories.reduce((total, weapon) => {
      const costs = developmentRules.categories[next[weapon]][profession] || [];
      const record = $$('.category-record-row').find(row => row.dataset.category === weapon);
      const rows = [record, ...$$('.skill-row', $('#skills-list')).filter(row => row.dataset.category === weapon)].filter(Boolean);
      return total + rows.reduce((sum, row) => sum + costs.slice(0, Number($(`[name="${row === record ? 'record-buy' : 'skill-buy'}"]`, row)?.value) || 0).reduce((a, b) => a + b, 0), 0);
    }, 0);
    const remaining = Number($('#dp-remaining').textContent);
    if ($('#dp-remaining').textContent !== '—' && newSpent > oldSpent && remaining < newSpent - oldSpent) {
      $('#weapon-cost-picker-message').textContent = 'That assignment would exceed the development point pool.';
      return;
    }
    form.elements.weaponCostAssignments.value = JSON.stringify(next);
    $('#weapon-cost-picker-message').textContent = '';
    updateDevelopment();
    renderWeaponCostAssignments();
    renderApprenticeshipPicker();
    saveCurrent();
  }
  function spellDevelopmentOrder() {
    let order = [];
    try { order = JSON.parse(form.elements.spellDevelopmentOrder.value || '[]'); } catch { /* Use current rows. */ }
    if (!Array.isArray(order)) order = [];
    const active = $$('.skill-row', $('#skills-list')).filter(row => row.dataset.category.startsWith('Spells •') && Number($('[name="skill-buy"]', row)?.value) > 0)
      .map(row => `${row.dataset.category}:${$('[name="skill-name"]', row).value}`);
    return [...new Set(order.filter(key => active.includes(key)).concat(active))];
  }
  function spellListMultiplier(category, name) {
    if (!category.startsWith('Spells •')) return 1;
    const order = spellDevelopmentOrder();
    const position = order.indexOf(`${category}:${name}`);
    const index = position < 0 ? order.length : position;
    return index < 5 ? 1 : index < 10 ? 2 : 4;
  }
  function spellListCosts(category, start, profession, multiplier) {
    if (!category.startsWith('Spells • Own Realm')) return categoryCosts(category, profession);
    const pure = ['Cleric','Magician','Mentalist'].includes(profession);
    const semi = ['Ranger','Dabbler','Bard'].includes(profession);
    const kind = category.includes('Open Lists') ? 'open' : category.includes('Closed Lists') ? 'closed' : 'base';
    const tier = rank => {
      if (kind === 'base') return categoryCosts(category, profession);
      if (rank <= 5) return categoryCosts(category, profession);
      const band = rank <= 10 ? 0 : rank <= 15 ? 1 : rank <= 20 ? 2 : 3;
      if (pure) return kind === 'open' ? (band === 3 ? [6,6,6] : [4,4,4]) : (band === 3 ? [8,8] : [4,4,4]);
      if (semi) return kind === 'open' ? [[8,8],[12],[18],[25]][band] : [[12],[25],[40],[60]][band];
      const costs = kind === 'open' ? {Fighter:[50,75,100,125],Thief:[36,54,72,90],Rogue:[30,45,60,75]}
        : {Fighter:[80,120,160,200],Thief:[70,105,140,175],Rogue:[50,75,100,125]};
      return costs[profession] ? [costs[profession][band]] : null;
    };
    const first = tier(start + 1);
    if (!first) return null;
    const result = [];
    for (let index = 0; index < first.length; index++) {
      const current = tier(start + index + 1);
      if (!current || index >= current.length) break;
      result.push(current[index] * multiplier);
    }
    return result;
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
  const backgroundExtraLanguages = {
    'Common Man':[['High-speech',8,8],['Small-speech',8,8],['Hill-speech',8,8]],
    'High Man':[['High-elvish',8,8],['Hill-speech',8,8],['Plains-speech',8,8],['North-speech',8,8],['Wood-speech',8,8]],
    'Wood Elf':[['High-speech',8,8],['South-speech',6,6],['Black-speech',6,6]],
    Dwarf:[['High-speech',5,5],['South-speech',4,4],['North-speech',5,5]],
    Halfling:[['Hill-speech',4,4],['Wood-speech',6,6],['Orcish',2,2],['Elvish',8,8]]
  };
  const backgroundMoney = [[2,1],[5,2],[15,5],[25,10],[35,15],[45,20],[55,30],[65,35],[70,40],[75,50],[80,60],[85,70],[90,80],[94,100],[97,125],[99,150],[100,200]];
  const backgroundItems = [
    [5,'01–05',['+1 spell adder','One special bread, poison, or herb']],
    [10,'06–10',['+1 spell adder','Two +5 non-magic items']],
    [20,'11–20',['+1 spell adder','One +10 non-magic item']],
    [30,'21–30',['+1 spell adder','Two +5 magic items']],
    [65,'31–65',['+1 spell adder','One +10 magic item']],
    [66,'66',['+3 spell adder','Loyal domesticated animal','One +20 non-magic item']],
    [75,'67–75',['Daily III spell item','+2 spell adder','Three +5 non-magic items','Three doses of a level 1–5 potion']],
    [80,'76–80',['Daily III spell item','+2 spell adder','One +15 non-magic item','Three doses of a level 1–5 potion']],
    [85,'81–85',['Daily IV spell item','+2 spell adder','Three +5 magic items','Five doses of a level 1–5 potion']],
    [90,'86–90',['Daily IV spell item','+2 spell adder','One +15 magic item','Five doses of a level 1–5 potion']],
    [95,'91–95',['+3 spell adder','Two +10 magic items','Two Daily III spell items']],
    [97,'96–97',['+3 spell adder','One +20 magic item','Daily IV spell item']],
    [98,'98',['+3 spell adder','Daily VI spell item','Three +10 magic items']],
    [99,'99',['+3 spell adder','Daily VII spell item','Two +20 magic items']],
    [100,'100',['+3 spell adder','Daily VIII spell item','Loyal unusual creature']]
  ];
  const raceBackgroundNotes = {
    'Common Man':'Extra languages: High-speech, Small-speech, Hill-speech. Money: silver and bronze pieces.',
    'High Man':'Extra languages: High-elvish, Hill-speech, Plains-speech, North-speech, Wood-speech. Money: gold pieces.',
    'Wood Elf':'Extra languages: High-speech, South-speech, Black-speech. Money: gems.',
    Dwarf:'Extra languages: High-speech, South-speech, North-speech. Spell items may contain only Channeling spells.',
    Halfling:'Extra languages: Hill-speech, Wood-speech, Orcish, Elvish. Spell adders and items that cast spells are unavailable.'
  };
  // Appendix A-1 race descriptions give averages and typical traits, not dice tables.
  const racePhysicalProfiles = {
    'Common Man':{source:'A-1.1', heights:[70,64], weights:[160,125], age:[16,60], builds:['Medium','Lean','Broad'], skin:['Fair','Tan','Olive'], hair:['Black','Dark brown','Brown','Blond','Red','Grey'], eyes:['Brown','Hazel','Blue','Green','Grey'], demeanor:['Practical','Hard-working','Quiet','Loyal','Shy']},
    'High Man':{source:'A-1.2', heights:[77,70], weights:[225,150], age:[16,200], builds:['Tall and strong'], skin:['Fair'], hair:['Black','Dark brown'], eyes:['Grey','Hazel','Blue','Green'], demeanor:['Noble','Confident','Impatient','Proud','Haughty']},
    'Wood Elf':{source:'A-1.3', heights:[72,69], weights:[150,125], age:[16,500], builds:['Slight and slender'], skin:['Ruddy'], hair:['Sandy'], eyes:['Blue','Green'], demeanor:['Fun-loving','Guarded','Mirthful'], immortal:true},
    Dwarf:{source:'A-1.4', heights:[57,53], weights:[150,135], age:[16,300], builds:['Short and stocky','Strong-limbed'], skin:['Fair','Ruddy'], hair:['Black','Red','Dark brown'], eyes:[], demeanor:['Sober','Quiet','Possessive','Suspicious','Pugnacious','Introspective']},
    Halfling:{source:'A-1.5', heights:[41,39], weights:[54,51], age:[30,100], builds:['Small and pudgy','Small and stout'], skin:['Brown'], hair:['Brown'], eyes:[], demeanor:['Cheery','Conservative','Unassuming','Peaceful']}
  };
  const armorTypes = {
    5:[0,0,0,0], 6:[0,-20,5,0], 7:[-10,-40,15,10], 8:[-15,-50,15,15],
    9:[-5,-50,0,0], 10:[-10,-70,10,5], 11:[-15,-90,20,15], 12:[-15,-110,30,15],
    13:[-10,-70,0,5], 14:[-15,-90,10,10], 15:[-25,-120,20,20], 16:[-25,-130,20,20],
    17:[-15,-90,0,10], 18:[-20,-110,10,20], 19:[-35,-150,30,30], 20:[-45,-165,40,40]
  };
  const armorSkillTypes = {'Soft Leather':[5,6,7,8], 'Rigid Leather':[9,10,11,12], Chain:[13,14,15,16], Plate:[17,18,19,20]};
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
  function writeCharacters() { localStorage.setItem(STORAGE_KEY, JSON.stringify(characters)); window.dispatchEvent(new Event('rolemaster-roster-updated')); }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function makeStats(stats = {}) {
    $('#stats-list').innerHTML = statNames.map((name, index) => {
      const value = stats[name] || {};
      return `<div class="stat-row"><span>${name}</span><input aria-label="${name} temporary stat" name="stat-temp-${index}" type="number" min="1" max="100" value="${esc(value.temp ?? '')}" placeholder="—"><input aria-label="${name} potential stat" name="stat-pot-${index}" type="number" min="20" max="101" value="${esc(value.pot ?? '')}" placeholder="—" readonly><input aria-label="${name} basic bonus" name="stat-basic-${index}" type="number" value="${esc(value.basic ?? '')}" placeholder="—" readonly><input aria-label="${name} racial bonus" name="stat-racial-${index}" type="number" value="${esc(value.racial ?? '')}" placeholder="—" readonly><input aria-label="${name} special bonus" name="stat-special-${index}" type="number" value="${esc(value.special ?? '')}" placeholder="—" readonly><input aria-label="${name} total bonus" name="stat-total-${index}" type="number" value="${esc(value.total ?? '')}" placeholder="—" readonly></div>`;
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
  function favoriteSkillKey(category, name) { return JSON.stringify([category, name]); }
  function readFavoriteSkills() {
    try {
      const keys = JSON.parse(form.elements.favoriteSkills.value || '[]');
      return new Set(Array.isArray(keys) ? keys.filter(key => typeof key === 'string') : []);
    } catch { return new Set(); }
  }
  function a4SkillRow(category, name, skill = {}, extra = false, favorites = readFavoriteSkills()) {
    if (!extra && name.endsWith('*')) {
      const label = name.slice(0, -1);
      return `<div class="a4-skill-row a4-template is-zero-rank" data-category="${esc(category)}"><strong>${esc(label)} <small>each instance separately</small></strong><span class="a4-template-note">Specific skills appear when chosen</span></div>`;
    }
    const favorite = favorites.has(favoriteSkillKey(category, name));
    return `<div class="a4-skill-row${extra ? ' a4-extra' : ''}" data-category="${esc(category)}" data-skill="${esc(name)}"><div class="a4-skill-title"><button type="button" class="favorite-skill" aria-label="${favorite ? 'Remove' : 'Add'} ${esc(name)} ${favorite ? 'from' : 'to'} favorites" aria-pressed="${favorite}" title="${favorite ? 'Remove from favorites' : 'Add to favorites'}">${favorite ? '★' : '☆'}</button><strong>${esc(name)}</strong></div><output class="a4-total">—</output><output class="a4-start-text">0</output><input name="a4-start" type="hidden" value="${esc(skill.start ?? skill.ranks ?? 0)}"><select name="a4-buy" hidden></select><output class="a4-rank">—</output><output class="a4-category">—</output><output class="a4-item-text">0</output><input name="a4-item" type="hidden" value="${esc(skill.item ?? 0)}"><output class="a4-special-text">0</output><input name="a4-special" type="hidden" value="${esc(skill.special ?? 0)}"></div>`;
  }
  function updateA4Visibility() {
    const hideSkills = $('#hide-zero-skills').checked;
    const hideGroups = $('#hide-zero-groups').checked;
    const hideNonFavorites = $('#hide-non-favorites').checked;
    $$('.a4-skill-container').forEach(container => {
      const category = container.previousElementSibling;
      const categoryRanks = Number($('[name="record-start"]', category)?.value || 0) + Number($('[name="record-buy"]', category)?.value || 0);
      const skillRows = $$('.a4-skill-row', container);
      const emptyGroup = categoryRanks === 0 && skillRows.every(row => row.classList.contains('is-zero-rank'));
      let shown = 0;
      skillRows.forEach(row => {
        row.hidden = (hideSkills && row.classList.contains('is-zero-rank')) || (hideNonFavorites && !row.querySelector('.favorite-skill[aria-pressed="true"]'));
        if (!row.hidden) shown++;
      });
      category.hidden = (hideGroups && emptyGroup) || (hideNonFavorites && !shown);
      container.hidden = category.hidden || !shown;
    });
  }
  function updateA4SkillRows() {
    const favorites = readFavoriteSkills();
    $$('.a4-skill-container').forEach(container => {
      const category = container.dataset.category;
      const fixed = new Set(catalogNames(category).filter(name => !name.endsWith('*')));
      const active = $$('.skill-row', $('#skills-list')).filter(row => row.dataset.category === category && $('[name="skill-name"]', row).value);
      const extraNames = new Set(active.map(row => $('[name="skill-name"]', row).value).filter(name => !fixed.has(name)));
      $$('.a4-extra', container).forEach(row => { if (!extraNames.has(row.dataset.skill)) row.remove(); });
      extraNames.forEach(name => {
        if (!$$('.a4-extra', container).some(row => row.dataset.skill === name)) {
          $('.a4-skill-list', container).insertAdjacentHTML('beforeend', a4SkillRow(category, name, {}, true, favorites));
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
        const developed = tree ? developedSkillRanks(tree) : 0;
        $('.a4-start-text', row).textContent = String((Number(start) || 0) + developed);
        $('.a4-item-text', row).textContent = item;
        $('.a4-special-text', row).textContent = special;
        const ranks = (Number(start) || 0) + developed;
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
    const favorites = readFavoriteSkills();
    $('#category-record-list').innerHTML = Object.entries(skillCategoryRules).map(([category, rule]) => {
      const values = saved[category] || {};
      const standard = !rule[1] || rule[1] === 'standard';
      const rankFields = standard
        ? `<td><output class="record-start-text">0</output><input name="record-start" type="hidden" value="${esc(values.start ?? 0)}"><select name="record-buy" hidden></select></td>`
        : '<td class="not-applicable">n/a</td>';
      const names = catalogNames(category);
      const listed = new Set(names.filter(name => !name.endsWith('*')));
      const categorySkills = skills.filter(skill => skill.category === category && skill.name);
      const rows = names.map(name => a4SkillRow(category, name, categorySkills.find(skill => skill.name === name), false, favorites)).join('')
        + categorySkills.filter(skill => !listed.has(skill.name)).map(skill => a4SkillRow(category, skill.name, skill, true, favorites)).join('');
      return `<tr class="category-record-row" data-category="${esc(category)}"><th scope="row">${esc(category)}</th><td><output class="record-total"></output></td><td><output class="record-stats"></output></td><td><output class="record-cost"></output></td>${rankFields}<td><output class="record-rank"></output></td><td><output class="record-stat"></output></td><td><output class="record-profession"></output></td><td><output class="record-special-text">0</output><input name="record-special" type="hidden" value="${esc(values.special ?? 0)}"></td><td><output class="record-special2-text">0</output><input name="record-special2" type="hidden" value="${esc(values.special2 ?? 0)}"></td></tr><tr class="a4-skill-container" data-category="${esc(category)}"><td colspan="10"><div class="a4-skill-head"><span></span><span></span><span>Ranks</span><span>Rank bonus</span><span>Category</span><span>Item</span><span>Special</span></div><div class="a4-skill-list">${rows}</div></td></tr>`;
    }).join('');
    $$('.category-record-row').forEach(row => {
      row.dataset.raceBase = String(Number(saved[row.dataset.category]?.raceBase) || 0);
      row.dataset.hobbySpent = String(Number(saved[row.dataset.category]?.hobbySpent) || 0);
      row.dataset.packageBase = String(Number(saved[row.dataset.category]?.packageBase) || 0);
      row.dataset.trainingItemBase = String(Number(saved[row.dataset.category]?.trainingItemBase) || 0);
      row.dataset.backgroundSpecialBase = String(Number(saved[row.dataset.category]?.backgroundSpecialBase) || 0);
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
    if (skill.packageBase) row.dataset.packageBase = skill.packageBase;
    if (skill.backgroundLanguageBase) row.dataset.backgroundLanguageBase = skill.backgroundLanguageBase;
    if (skill.backgroundSpecialBase) row.dataset.backgroundSpecialBase = skill.backgroundSpecialBase;
    if (skill.backgroundItemBase) row.dataset.backgroundItemBase = skill.backgroundItemBase;
    if (skill.skillClass) row.dataset.skillClass = skill.skillClass;
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
  function hobbySkillOptions(allowAll = false) {
    const options = new Map();
    const add = (category, name) => {
      if (!name || name.startsWith('Choose ')) return;
      if (allowAll ? !categoryCosts(category) : !hobbyRankLimit(category) && !Number(findSkillRow(category, name)?.dataset.hobbySpent)) return;
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
  function apprenticeshipChoiceMarkup(kind, category, name = '') {
    const row = kind === 'category'
      ? $$('.category-record-row').find(item => item.dataset.category === category)
      : findSkillRow(category, name);
    const buy = row && $(`[name="${kind === 'category' ? 'record-buy' : 'skill-buy'}"]`, row);
    const current = Number(buy?.value) || 0;
    const costs = (kind === 'skill' && category.startsWith('Spells •')
      ? row ? costForSkill(row) : spellListCosts(category, 0, form.elements.profession.value, spellListMultiplier(category, name))
      : categoryCosts(category)) || [];
    const base = row ? Number($(`[name="${kind === 'category' ? 'record-start' : 'skill-start'}"]`, row)?.value) || 0 : 0;
    const label = kind === 'category' ? category : name;
    const spent = costs.slice(0, current).reduce((sum, cost) => sum + cost, 0);
    const classification = kind === 'skill' && current ? `<select data-skill-class="${esc(name)}" data-category="${esc(category)}" aria-label="${esc(name)} skill classification">${['auto','standard','everyman','occupational','restricted'].map(value => `<option value="${value}"${(row?.dataset.skillClass || 'auto') === value ? ' selected' : ''}>${value === 'auto' ? `Auto: ${skillClass(row)}` : value}</option>`).join('')}</select>` : '';
    return `<label class="hobby-choice${classification ? ' apprenticeship-classified' : ''}" data-search="${esc(`${category} ${name}`.toLowerCase())}"><span><strong>${esc(label)}</strong>${kind === 'skill' ? `<small>${esc(category)}</small>` : '<small>Skill category</small>'}</span><input type="number" inputmode="numeric" min="0" max="${costs.length}" value="${current}" data-kind="${kind}" data-category="${esc(category)}" data-name="${esc(name)}" aria-label="${esc(label)} apprenticeship ranks">${classification}<em>${base} prior · ${costs.join('/')} DP · ${spent} spent</em></label>`;
  }
  function updateApprenticeshipVisibility() {
    const term = $('#apprenticeship-search').value.trim().toLowerCase();
    const hideSkills = $('#hide-zero-apprenticeship-skills').getAttribute('aria-pressed') === 'true';
    const hideCategories = $('#hide-zero-apprenticeship-categories').getAttribute('aria-pressed') === 'true';
    let shown = 0;
    $$('.hobby-choice-group', $('#apprenticeship-picker-list')).forEach(group => {
      const isSkill = group.dataset.kind === 'skill';
      let groupShown = 0;
      $$('.hobby-choice', group).forEach(choice => {
        const input = $('input[data-kind]', choice);
        const row = isSkill ? findSkillRow(input.dataset.category, input.dataset.name) : $$('.category-record-row').find(item => item.dataset.category === input.dataset.category);
        const start = row ? Number($(`[name="${isSkill ? 'skill-start' : 'record-start'}"]`, row)?.value) || 0 : 0;
        const visible = choice.dataset.search.includes(term) && (!(isSkill ? hideSkills : hideCategories) || start + Number(input.value) > 0);
        choice.hidden = !visible;
        if (visible) groupShown++;
      });
      group.hidden = !groupShown;
      shown += groupShown;
    });
    $('#apprenticeship-picker-empty').hidden = shown > 0;
  }
  function renderApprenticeshipPicker() {
    const categories = Object.entries(skillCategoryRules).filter(([category, rule]) => (!rule[1] || rule[1] === 'standard') && categoryCosts(category));
    const skills = hobbySkillOptions(true);
    $('#apprenticeship-picker-subtitle').textContent = `${form.elements.profession.value} · Section 6.0`;
    $('#apprenticeship-picker-list').innerHTML = developmentRules
      ? `<section class="hobby-choice-group" data-kind="category"><h3>Skill categories</h3>${categories.map(([category]) => apprenticeshipChoiceMarkup('category', category)).join('')}</section><section class="hobby-choice-group" data-kind="skill"><h3>Skills</h3>${skills.map(({category, name}) => apprenticeshipChoiceMarkup('skill', category, name)).join('')}</section>`
      : '<p class="language-picker-note">Development costs are loading. Try again in a moment.</p>';
    updateApprenticeshipVisibility();
    updateApprenticeshipBudget();
  }
  function updateApprenticeshipBudget() {
    const available = $('#dp-available').textContent;
    const spent = Number($('#dp-spent').textContent) || 0;
    const remaining = $('#dp-remaining').textContent;
    $('#apprenticeship-remaining').textContent = remaining === '—' ? '—' : `${remaining} DP left`;
    $('#apprenticeship-spent-label').textContent = `${spent} DP spent`;
    $('#apprenticeship-picker-remaining').textContent = remaining === '—' ? 'Set temporary stats first' : `${remaining} DP left`;
    $('#apprenticeship-picker-used').textContent = `${spent} of ${available} DP spent`;
    $$('#apprenticeship-picker-list input[data-kind]').forEach(input => {
      const category = input.dataset.category;
      const kind = input.dataset.kind;
      const row = kind === 'skill' ? findSkillRow(category, input.dataset.name) : null;
      const costs = (kind === 'skill' && category.startsWith('Spells •')
        ? row ? costForSkill(row) : spellListCosts(category, 0, form.elements.profession.value, spellListMultiplier(category, input.dataset.name))
        : categoryCosts(category)) || [];
      const current = Number(input.value) || 0;
      const currentCost = costs.slice(0, current).reduce((sum, cost) => sum + cost, 0);
      const budget = available === '—' ? 0 : Number(available) - spent + currentCost;
      let max = 0;
      let cost = 0;
      for (const next of costs) { if (cost + next > budget) break; cost += next; max++; }
      input.max = String(Math.max(current, max));
      input.disabled = available === '—';
    });
    if ($('#apprenticeship-picker').open) renderApprenticeshipStatGains();
  }
  function updateApprenticeshipAllocation(input) {
    const kind = input.dataset.kind;
    const category = input.dataset.category;
    const name = input.dataset.name;
    let row = kind === 'category' ? $$('.category-record-row').find(item => item.dataset.category === category) : findSkillRow(category, name);
    const priorSpellOrder = kind === 'skill' && category.startsWith('Spells •') ? spellDevelopmentOrder() : null;
    const requested = Number(input.value);
    const next = Math.max(0, Math.min(Number.isInteger(requested) ? requested : 0, Number(input.max)));
    if (next && !form.elements.apprenticeshipDpBase.value && $('#dp-available').textContent !== '—') form.elements.apprenticeshipDpBase.value = $('#dp-available').textContent;
    if (!row && next) row = skillRow({category, name});
    if (row) updateSkillBuyOptions(row, next);
    if (priorSpellOrder) {
      const key = `${category}:${name}`;
      form.elements.spellDevelopmentOrder.value = JSON.stringify(next ? priorSpellOrder.includes(key) ? priorSpellOrder : [...priorSpellOrder, key] : priorSpellOrder.filter(item => item !== key));
    }
    updateDevelopment();
    renderApprenticeshipPicker();
    renderTrainingPackages();
    saveCurrent();
  }
  function readStatGainHistory() {
    try {
      const history = JSON.parse(form.elements.statGainHistory.value || '[]');
      return Array.isArray(history) ? history : [];
    } catch { return []; }
  }
  function packageStatGrantRules(name) {
    if (name === 'Adventurer') return [['choice-1','Choose one stat',statNames],['choice-2','Choose another stat',statNames]];
    if (name === 'Animal Friend') return [['empathy','Empathy',['Empathy']]];
    if (name === 'Amateur Mage') {
      const realmStat = {Channeling:'Intuition', Essence:'Empathy', Mentalism:'Presence'}[form.elements.realm.value];
      return [['realm','Realm stat',realmStat ? [realmStat] : []],['memory','Memory',['Memory']]];
    }
    if (name === 'Hunter') return [['constitution','Constitution',['Constitution']]];
    if (name === 'Knight') return [['strength','Strength',['Strength']],['discipline','Self Discipline',['Self Discipline']]];
    return [];
  }
  function readTrainingSelections() {
    try {
      const names = JSON.parse(form.elements.trainingSelections.value || '[]');
      return Array.isArray(names) ? names.filter(name => typeof name === 'string') : [];
    } catch { return []; }
  }
  function readTrainingChoices() {
    try {
      const choices = JSON.parse(form.elements.trainingChoiceSelections.value || '{}');
      return choices && typeof choices === 'object' && !Array.isArray(choices) ? choices : {};
    } catch { return {}; }
  }
  function readTrainingBenefits() {
    try {
      const value = JSON.parse(form.elements.trainingBenefits.value || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  function writeTrainingBenefits(value) { form.elements.trainingBenefits.value = JSON.stringify(value); }
  function rollD10() { return Math.floor(Math.random() * 10) + 1; }
  function rollD100() { return Math.floor(Math.random() * 100) + 1; }
  function rollRoleRange(kind) {
    const limit = kind === 'personality' ? 78 : 72;
    const ranges = kind === 'personality' ? personalityRanges : alignmentRanges;
    const width = kind === 'personality' ? 2 : 6;
    const firstRolls = [];
    let modifier = 0;
    let first;
    do {
      first = rollD100();
      firstRolls.push(first);
      if (first > limit) modifier += first <= (kind === 'personality' ? 89 : 86) ? -20 : 20;
    } while (first > limit);
    const [left, right] = ranges[Math.floor((first - 1) / width)];
    const second = rollD100();
    const position = Math.max(1, Math.min(100, second + modifier));
    const trait = position <= 33 ? left : position >= 68 ? right : `Between ${left.toLowerCase()} and ${right.toLowerCase()}`;
    return {trait, summary:`T-1.7 ${kind}: ${firstRolls.join(' → ')}; position ${second}${modifier ? ` ${modifier > 0 ? '+' : '−'} ${Math.abs(modifier)}` : ''} = ${position} · ${left} ↔ ${right}`};
  }
  function rollRoleTrait(kind) {
    const field = form.elements[`role${kind[0].toUpperCase()}${kind.slice(1)}`];
    const result = kind === 'motivation'
      ? (() => { const roll = rollD100(); return {trait:motivationRanges[Math.floor((roll - 1) / 5)], summary:`T-1.7 motivation: ${roll}`}; })()
      : rollRoleRange(kind);
    field.value = [field.value.trim(), result.trait].filter(Boolean).join('; ').slice(0, field.maxLength);
    form.elements.roleRollSummaryText.value = result.summary;
    $('#role-roll-summary').textContent = result.summary;
    saveCurrent();
  }
  function appearanceDice() {
    const dice = form.elements.appearanceDice.value.split(',').map(Number);
    return dice.length === 5 && dice.every(value => Number.isInteger(value) && value >= 1 && value <= 10) ? dice : null;
  }
  function updateAppearance() {
    const dice = appearanceDice();
    const presence = form.elements.namedItem('stat-pot-7').value;
    const previous = form.elements.appearancePotential.value;
    const potential = dice && presence !== '' ? Math.max(1, Math.min(100, Number(presence) - 25 + dice.reduce((sum, value) => sum + value, 0))) : null;
    form.elements.appearancePotential.value = potential ?? '';
    if (form.elements.appearanceTemp.value === '' || form.elements.appearanceTemp.value === previous) form.elements.appearanceTemp.value = potential ?? '';
    $('#appearance-roll-summary').textContent = dice
      ? `Potential Presence ${presence || '—'} − 25 + (${dice.join(' + ')}) = ${potential ?? '—'}${potential !== null ? ' (limited to 1–100)' : ''}. Temporary Appearance usually matches while well groomed and dressed.`
      : 'Potential Presence − 25 + 5d10, limited to 1–100. Temporary Appearance usually matches while well groomed and dressed.';
    $('#role-roll-summary').textContent = form.elements.roleRollSummaryText.value;
  }
  function updatePhysicalSource() {
    const profile = racePhysicalProfiles[form.elements.race.value];
    if (!profile) return;
    $('#role-physical-source').textContent = `${profile.source} · Height and weight are varied around the race’s published averages. Age is a lifespan-based suggestion${profile.immortal ? ' (Wood Elves are immortal)' : ''}. ${profile.eyes.length ? '' : 'The race description does not specify eye color.'}`;
  }
  function randomPhysicalChoice(values) { return values[Math.floor(Math.random() * values.length)]; }
  function randomizePhysicalDetails(force = true) {
    const profile = racePhysicalProfiles[form.elements.race.value];
    if (!profile) return;
    let previous = {};
    try { previous = JSON.parse(form.elements.rolePhysicalGenerated.value || '{}') || {}; } catch { /* Ignore old invalid data. */ }
    const genderField = form.elements.roleGender;
    if (!genderField.value) genderField.value = randomPhysicalChoice(['Male','Female']);
    const gender = genderField.value.trim().toLowerCase();
    const average = values => gender === 'female' ? values[1] : gender === 'male' ? values[0] : Math.round((values[0] + values[1]) / 2);
    const height = average(profile.heights) + Math.floor(Math.random() * 9) - 4;
    const weight = Math.round(average(profile.weights) * (0.85 + Math.random() * 0.3));
    const months = readTrainingSelections().reduce((sum, name) => sum + (trainingPackages.find(pack => pack.name === name)?.months || 0), 0);
    const minimumAge = Math.max(profile.age[0], 16 + Math.ceil(months / 12));
    const maximumAge = Math.max(minimumAge, profile.age[1]);
    const choices = {
      roleAge:String(minimumAge + Math.floor(Math.random() * (maximumAge - minimumAge + 1))),
      roleBuild:randomPhysicalChoice(profile.builds),
      roleHeight:`${Math.floor(height / 12)}'${height % 12}"`,
      roleWeight:`${weight} lb`,
      roleSkin:randomPhysicalChoice(profile.skin),
      roleHair:randomPhysicalChoice(profile.hair),
      roleDemeanor:randomPhysicalChoice(profile.demeanor)
    };
    if (profile.eyes.length) choices.roleEyes = randomPhysicalChoice(profile.eyes);
    else if (form.elements.roleEyes.value === previous.roleEyes) form.elements.roleEyes.value = '';
    const generated = {};
    Object.entries(choices).forEach(([name, value]) => {
      const field = form.elements[name];
      if (force || !field.value || field.value === previous[name]) { field.value = value; generated[name] = value; }
    });
    form.elements.rolePhysicalGenerated.value = JSON.stringify(generated);
    updatePhysicalSource();
  }
  function rollOpenEndedD10() {
    const rolls = [];
    let roll;
    do { roll = rollD10(); rolls.push(roll); } while (roll === 10);
    return {rolls, total:rolls.reduce((sum, value) => sum + (value === 10 ? 9 : value), 0)};
  }
  function rollOpenEndedD100() {
    const first = rollD100();
    const rolls = [first];
    if (first <= 5) {
      let next;
      do { next = rollD100(); rolls.push(-next); } while (next >= 96);
    } else if (first >= 96) {
      let next;
      do { next = rollD100(); rolls.push(next); } while (next >= 96);
    }
    return {rolls, total:rolls.reduce((sum, value) => sum + value, 0)};
  }
  function formatRolls(rolls) {
    return (rolls || []).map((value, index) => index === 0 ? String(value) : value < 0 ? ` − ${-value}` : ` + ${value}`).join('');
  }
  function packageMoneyNeedsRoll(pack) { return /d10/i.test(pack.startingMoney); }
  function trainingSpecialAwards(pack, special = {}) {
    const last = pack.specialItems.length - 1;
    if (special.mode === 'last') return [last];
    if (special.mode !== 'rolled') return [];
    const awards = special.rows?.flatMap((row, index) => row.gained ? [index] : []) || [];
    if (!awards.length || special.grantLast) awards.push(last);
    return [...new Set(awards)];
  }
  function rollItemDice(item) {
    return [...item.matchAll(/\b(\d*)d10\b/gi)].map(match => {
      const count = Number(match[1]) || 1;
      const rolls = Array.from({length:count}, rollD10);
      return {dice:match[0], rolls, total:rolls.reduce((sum, roll) => sum + roll, 0)};
    });
  }
  function rollTrainingSpecials(pack) {
    let gained = 0;
    const rows = pack.specialItems.map(([item, chance]) => {
      const effectiveChance = chance / (2 ** gained);
      const dice = rollOpenEndedD100();
      const won = dice.total + effectiveChance > 100;
      if (won) gained++;
      return {item, chance, effectiveChance, dice, gained:won};
    });
    const special = {mode:'rolled', rows, grantLast:false, notes:{}, itemDice:{}};
    trainingSpecialAwards(pack, special).forEach(index => { special.itemDice[index] = rollItemDice(pack.specialItems[index][0]); });
    return special;
  }
  function trainingItemEffect(label) {
    const bonus = Number(/\+(\d+)/.exec(label)?.[1]) || 0;
    if (!bonus || /spell adder|spell multiplier|daily /i.test(label)) return null;
    const fixed = [];
    if (/lockpicks and disarm/i.test(label)) fixed.push('Subterfuge • Mechanics:Picking Locks', 'Subterfuge • Mechanics:Disarming Traps');
    else if (/lockpick kit/i.test(label)) fixed.push('Subterfuge • Mechanics:Picking Locks');
    else if (/disarm trap kit/i.test(label)) fixed.push('Subterfuge • Mechanics:Disarming Traps');
    else if (/medical kit/i.test(label)) fixed.push('Technical/Trade • General:First Aid');
    else if (/traps \(/i.test(label)) fixed.push('Subterfuge • Mechanics:Setting Traps');
    else if (/disguise kit|make-up kit/i.test(label)) fixed.push('Subterfuge • Mechanics:Disguise');
    else if (/warhorse/i.test(label)) fixed.push('Combat Maneuvers:Mounted Combat');
    if (/armor|shield|helm/i.test(label) && !/weapon/i.test(label)) return null;
    const kind = /lore category/i.test(label) ? 'category'
      : /warhorse|riding horse|riding beast/i.test(label) ? 'riding'
      : /lore skill/i.test(label) ? 'lore'
      : /missile weapon/i.test(label) ? 'missile'
      : /melee weapon/i.test(label) ? 'melee'
      : /weapon/i.test(label) ? 'weapon'
      : /performance props/i.test(label) ? 'performance'
      : fixed.length ? 'fixed' : 'skill';
    return {bonus, kind, fixed};
  }
  function trainingItemCandidates(kind) {
    if (kind === 'category') return Object.keys(skillCategoryRules).filter(category => category.startsWith('Lore •')).map(category => [`category:${category}`, category]);
    const candidates = backgroundSkillCandidates(true);
    if (kind === 'riding' && !candidates.some(skill => skill.category === 'Outdoor • Animal' && skill.name === 'Riding (horse)')) candidates.push({category:'Outdoor • Animal', name:'Riding (horse)'});
    return candidates.filter(skill => kind === 'weapon' ? skill.category.startsWith('Weapon •')
      : kind === 'missile' ? ['Weapon • Missile','Weapon • Thrown','Weapon • Missile Artillery'].includes(skill.category)
      : kind === 'melee' ? skill.category.startsWith('Weapon •') && !['Weapon • Missile','Weapon • Thrown','Weapon • Missile Artillery'].includes(skill.category)
      : kind === 'lore' ? skill.category.startsWith('Lore •')
      : kind === 'riding' ? skill.category === 'Outdoor • Animal' && skill.name.startsWith('Riding')
      : kind === 'performance' ? skill.category === 'Artistic • Active'
      : true).map(skill => [`${skill.category}:${skill.name}`, `${skill.name} · ${skill.category}`]).sort((a, b) => a[1].localeCompare(b[1]));
  }
  function renderTrainingItemAssignment(pack, special, index) {
    const item = pack.specialItems[index][0];
    const dice = special.itemDice?.[index]?.map(result => `${result.dice}: ${result.rolls.join('+')} = ${result.total}`).join(' · ');
    const effect = trainingItemEffect(item);
    const target = special.targets?.[index] || '';
    const chosen = effect && effect.kind !== 'fixed' ? `<button type="button" class="training-item-target" data-training-item-target="${esc(pack.name)}" data-item-index="${index}">${target ? `+${effect.bonus} to ${esc(trainingItemCandidates(effect.kind).find(([key]) => key === target)?.[1] || target)}` : `Choose skill for +${effect.bonus} item bonus`}</button>` : '';
    const automatic = effect?.fixed.length ? `<small>+${effect.bonus} to ${esc(effect.fixed.map(key => key.split(':').at(-1)).join(' and '))}</small>` : '';
    return `<div class="training-item-assignment"><label class="training-item-note">${esc(item)}${dice ? ` · ${dice}` : ''} · GM details<input type="text" data-training-benefit-note="${esc(pack.name)}" data-item-index="${index}" value="${esc(special.notes?.[index] || '')}" maxlength="150" placeholder="Name, form, or other detail"></label>${automatic}${chosen}</div>`;
  }
  function changeTrainingBenefit(name, change) {
    const pack = trainingPackages.find(item => item.name === name);
    if (!pack || !readTrainingSelections().includes(name)) return;
    const benefits = readTrainingBenefits();
    benefits[name] ||= {};
    change(benefits[name], pack);
    writeTrainingBenefits(benefits);
    saveCurrent();
    renderTrainingPackages();
  }
  function packageChoiceCategory(packName, rule, choices) {
    const source = rule[2];
    if (typeof source === 'string' && source.startsWith('@')) return choices[packName]?.[source.slice(1)] || '';
    return source;
  }
  function packageSkillOptions(category, languageOnly = false) {
    const names = new Set((a4Skills[category] || '').split('|').filter(name => name && !name.endsWith('*')));
    $$('.skill-row', $('#skills-list')).filter(row => row.dataset.category === category).forEach(row => {
      const name = $('[name="skill-name"]', row).value;
      if (name && !name.startsWith('Choose ')) names.add(name);
    });
    (raceWeaponChoices[form.elements.race.value]?.[category] || []).forEach(name => names.add(name));
    if (category === 'Spells • Own Realm Open Lists') (openSpellLists[form.elements.realm.value] || []).forEach(name => names.add(name));
    if (languageOnly) return [...names].filter(name => /\((spoken|written)\)$/.test(name)).sort();
    return [...names].sort();
  }
  function renderPackageChoices(pack, choices) {
    const rules = packageChoiceRules[pack.name] || [];
    return rules.map(([id, kind, source, ranks, maxDistinct]) => {
      const label = pack.choices[rules.findIndex(rule => rule[0] === id)] || `${ranks} rank${ranks === 1 ? '' : 's'}`;
      if (kind === 'category') {
        const selected = choices[pack.name]?.[id] || '';
        return `<div class="package-grant-choice"><strong>${esc(label)}</strong><div class="choice-strip">${source.map(category => `<button type="button" data-package-category="${esc(category)}" data-package="${esc(pack.name)}" data-rule="${esc(id)}" aria-pressed="${selected === category}">${esc(category.replace('Weapon • ', ''))}</button>`).join('')}</div></div>`;
      }
      const category = packageChoiceCategory(pack.name, [id, kind, source, ranks, maxDistinct], choices);
      if (!category) return `<div class="package-grant-choice"><strong>${esc(label)}</strong><p>Choose the related category first.</p></div>`;
      const selected = choices[pack.name]?.[id] || {};
      const options = packageSkillOptions(category, id === 'language');
      const used = Object.values(selected).reduce((sum, value) => sum + (Number(value) || 0), 0);
      return `<div class="package-grant-choice"><strong>${esc(label)}</strong><small>${used} of ${ranks} ranks assigned · up to ${maxDistinct} skills</small><div class="package-grant-skills">${options.map(name => `<label><span>${esc(name)}</span><input type="number" inputmode="numeric" min="0" max="${ranks}" value="${Number(selected[name]) || 0}" data-package-skill="${esc(name)}" data-package="${esc(pack.name)}" data-rule="${esc(id)}" aria-label="${esc(name)} package ranks"></label>`).join('') || '<p>Add a specific skill above, then choose it here.</p>'}</div></div>`;
    }).join('');
  }
  function trainingPackageCost() {
    const professionIndex = developmentRules?.professions?.indexOf(form.elements.profession.value) ?? -1;
    return readTrainingSelections().reduce((sum, name) => {
      const cost = trainingPackages.find(pack => pack.name === name)?.costs[professionIndex];
      return sum + (Number(cost) || 0);
    }, 0);
  }
  function pendingTrainingChoices() {
    const choices = readTrainingChoices();
    const history = readStatGainHistory();
    const benefits = readTrainingBenefits();
    return readTrainingSelections().reduce((pending, name) => {
      const ranks = (packageChoiceRules[name] || []).filter(([id, kind, source, total]) => {
        const selected = choices[name]?.[id];
        return kind === 'category' ? !source.includes(selected)
          : !selected || Object.values(selected).reduce((sum, value) => sum + (Number(value) || 0), 0) < total;
      }).length;
      const rolls = packageStatGrantRules(name).filter(([id]) => !history.some(entry => entry.source === name && entry.grantId === id)).length;
      const pack = trainingPackages.find(item => item.name === name);
      const money = pack && packageMoneyNeedsRoll(pack) && !benefits[name]?.money ? 1 : 0;
      const specials = pack && !benefits[name]?.special?.mode ? 1 : 0;
      return pending + ranks + rolls + money + specials;
    }, 0);
  }
  function applyTrainingGrants() {
    const categories = new Map();
    const skills = new Map();
    const choices = readTrainingChoices();
    readTrainingSelections().forEach(name => {
      const pack = trainingPackages.find(item => item.name === name);
      if (!pack) return;
      Object.entries(pack.categories).forEach(([category, ranks]) => categories.set(category, (categories.get(category) || 0) + ranks));
      pack.skills.forEach(([category, skill, ranks]) => {
        const key = `${category}:${skill}`;
        skills.set(key, {category, name:skill, ranks:(skills.get(key)?.ranks || 0) + ranks});
      });
      (packageChoiceRules[name] || []).forEach(rule => {
        const [id, kind, source, ranks, maxDistinct] = rule;
        const selected = choices[name]?.[id];
        if (kind === 'category') {
          if (source.includes(selected)) categories.set(selected, (categories.get(selected) || 0) + ranks);
          return;
        }
        const category = packageChoiceCategory(name, rule, choices);
        if (!category || !selected || typeof selected !== 'object') return;
        let used = 0;
        Object.entries(selected).slice(0, maxDistinct).forEach(([skill, count]) => {
          const amount = Math.max(0, Math.min(Number(count) || 0, ranks - used));
          if (!amount) return;
          used += amount;
          const key = `${category}:${skill}`;
          skills.set(key, {category, name:skill, ranks:(skills.get(key)?.ranks || 0) + amount});
        });
      });
    });
    $$('.category-record-row').forEach(row => {
      const field = $('[name="record-start"]', row);
      if (!field) return;
      const previous = Number(row.dataset.packageBase) || 0;
      const next = categories.get(row.dataset.category) || 0;
      const base = Math.max(0, (Number(field.value) || 0) - previous);
      const applied = Math.max(0, Math.min(next, 10 - base));
      field.value = String(base + applied);
      row.dataset.packageBase = String(applied);
      if (applied) categoryRow(row.dataset.category);
    });
    $$('.skill-row', $('#skills-list')).forEach(row => {
      const previous = Number(row.dataset.packageBase) || 0;
      const key = `${row.dataset.category}:${$('[name="skill-name"]', row).value}`;
      const next = skills.get(key)?.ranks || 0;
      const field = $('[name="skill-start"]', row);
      const base = Math.max(0, (Number(field.value) || 0) - previous);
      const applied = Math.max(0, Math.min(next, 10 - base));
      field.value = String(base + applied);
      row.dataset.packageBase = String(applied);
      skills.delete(key);
    });
    skills.forEach(({category, name, ranks}) => skillRow({category, name, start:Math.min(10, ranks), packageBase:Math.min(10, ranks)}));
    updateDevelopment();
  }
  function renderPackageBenefits(pack, wasOpen) {
    const benefits = readTrainingBenefits()[pack.name] || {};
    const money = benefits.money;
    const special = benefits.special || {};
    const awards = trainingSpecialAwards(pack, special);
    const moneyMarkup = packageMoneyNeedsRoll(pack)
      ? `<p>${esc(pack.startingMoney)}${money ? ` · <strong>+${money.total}</strong> (${money.mode === 'fixed' ? 'fixed 6' : formatRolls(money.rolls)})` : ''}. Add this amount in the same unit as your race’s normal starting money.</p><div class="choice-strip"><button type="button" data-training-money-roll="${esc(pack.name)}">${money?.mode === 'rolled' ? 'Reroll d10' : 'Roll d10'}</button><button type="button" data-training-money-fixed="${esc(pack.name)}" aria-pressed="${money?.mode === 'fixed'}">Take +6</button></div>`
      : '<p>Normal starting money · no extra roll.</p>';
    const specialMarkup = special.mode === 'rolled'
      ? `<div class="training-special-results">${pack.specialItems.map(([item], index) => {
        const row = special.rows?.[index];
        const awarded = awards.includes(index);
        return `<div class="training-special-result${awarded ? ' is-awarded' : ''}"><span>${esc(item)}</span><small>${row ? `${formatRolls(row.dice.rolls)} = ${row.dice.total} · +${row.effectiveChance} = ${row.dice.total + row.effectiveChance}` : '—'}${awarded && !row?.gained ? ' · granted final item' : ''}</small><strong>${awarded ? 'Gained' : 'Missed'}</strong></div>`;
      }).join('')}</div><label class="training-grant-last"><input type="checkbox" data-training-grant-last="${esc(pack.name)}"${special.grantLast ? ' checked' : ''}> GM grants the final item as well</label>`
      : special.mode === 'last' ? `<p>Taking the final item: <strong>${esc(pack.specialItems.at(-1)[0])}</strong></p>`
      : `<p>Roll d100 open-ended for each item in order. After each gain, later chances are halved. If none succeed, the final item is granted.</p><ul>${pack.specialItems.map(([item, chance]) => `<li>${esc(item)} · +${chance}</li>`).join('')}</ul>`;
    return `<details class="training-benefits" data-training-benefits="${esc(pack.name)}"${wasOpen ? ' open' : ''}><summary>Starting money and special items · A-5</summary><div class="training-benefit-block"><strong>Starting money</strong>${moneyMarkup}</div><div class="training-benefit-block"><strong>Special items</strong>${specialMarkup}<div class="choice-strip"><button type="button" data-training-special-roll="${esc(pack.name)}">${special.mode === 'rolled' ? 'Reroll specials' : 'Roll specials'}</button><button type="button" data-training-special-last="${esc(pack.name)}" aria-pressed="${special.mode === 'last'}">Take final item</button></div>${awards.map(index => renderTrainingItemAssignment(pack, special, index)).join('')}</div></details>`;
  }
  function renderTrainingPackages() {
    const selected = readTrainingSelections();
    const openBenefits = new Set($$('details.training-benefits[open]').map(item => item.dataset.trainingBenefits));
    const previousActive = new Set($$('#apprenticeship-package-list > .apprenticeship-package > button[aria-pressed="true"]').map(item => item.dataset.package));
    const professionIndex = developmentRules?.professions?.indexOf(form.elements.profession.value) ?? -1;
    $('#apprenticeship-package-list').innerHTML = trainingPackages.map(pack => {
      const active = selected.includes(pack.name);
      const fixed = Object.entries(pack.categories).filter(([, ranks]) => ranks).map(([category, ranks]) => `${category} +${ranks}`)
        .concat(pack.skills.map(([category, name, ranks]) => `${name} (${category}) +${ranks}`));
      return `<div class="apprenticeship-package"><button type="button" data-package="${esc(pack.name)}" aria-pressed="${active}"><strong>${esc(pack.name)} <small>${pack.type === 'L' ? 'Lifestyle' : 'Vocational'}</small></strong><span>${pack.costs[professionIndex] ?? '—'} DP · ${pack.months} months</span></button>${active ? `<p>Fixed grants: ${esc(fixed.join(' · ') || 'none')}</p>${renderPackageChoices(pack, readTrainingChoices())}<p>Stat gains: ${esc(pack.statGains)}</p>${renderPackageBenefits(pack, openBenefits.has(pack.name) || !previousActive.has(pack.name))}` : ''}</div>`;
    }).join('');
  }
  function renderTrainingBenefitsSummary() {
    const benefits = readTrainingBenefits();
    const rewards = [];
    readTrainingSelections().forEach(name => {
      const pack = trainingPackages.find(item => item.name === name);
      if (!pack) return;
      const entry = benefits[name] || {};
      if (packageMoneyNeedsRoll(pack) && entry.money) rewards.push(`${name}: +${entry.money.total} normal starting-money units`);
      trainingSpecialAwards(pack, entry.special).forEach(index => {
        const item = pack.specialItems[index][0];
        const note = entry.special?.notes?.[index];
        const dice = entry.special?.itemDice?.[index]?.map(result => `${result.dice}=${result.total}`).join(', ');
        rewards.push(`${name}: ${item}${dice ? ` [${dice}]` : ''}${note ? ` (${note})` : ''}`);
      });
    });
    $('#training-rewards-summary').textContent = rewards.length ? `Training rewards: ${rewards.join(' · ')}` : '';
  }
  function toggleTrainingPackage(name) {
    const pack = trainingPackages.find(item => item.name === name);
    if (!pack) return;
    let selected = readTrainingSelections();
    if (selected.includes(name)) {
      if (readStatGainHistory().some(entry => entry.source === name)) {
        $('#apprenticeship-package-message').textContent = 'Undo this package’s stat gain rolls before removing it.';
        return;
      }
      selected = selected.filter(item => item !== name);
    }
    else {
      const displaced = pack.type === 'L' ? selected.filter(item => trainingPackages.find(other => other.name === item)?.type === 'L') : [];
      if (displaced.some(item => readStatGainHistory().some(entry => entry.source === item))) {
        $('#apprenticeship-package-message').textContent = 'Undo the current lifestyle package’s stat gain rolls before replacing it.';
        return;
      }
      const refund = displaced.reduce((sum, item) => sum + (trainingPackages.find(other => other.name === item)?.costs[developmentRules.professions.indexOf(form.elements.profession.value)] || 0), 0);
      if ($('#dp-remaining').textContent === '—' || Number($('#dp-remaining').textContent) + refund < pack.costs[developmentRules.professions.indexOf(form.elements.profession.value)]) {
        $('#apprenticeship-package-message').textContent = 'Not enough development points for this package.';
        return;
      }
      selected = selected.filter(item => !displaced.includes(item));
      selected.push(name);
    }
    if (selected.length && !form.elements.apprenticeshipDpBase.value && $('#dp-available').textContent !== '—') form.elements.apprenticeshipDpBase.value = $('#dp-available').textContent;
    form.elements.trainingSelections.value = JSON.stringify(selected);
    form.elements.training.value = selected.join(', ');
    $('#apprenticeship-package-message').textContent = '';
    applyTrainingGrants();
    renderTrainingPackages();
    renderApprenticeshipPicker();
    saveCurrent();
  }
  function initialStatValue(index) {
    const name = statNames[index];
    const first = readStatGainHistory().find(entry => entry.stat === name);
    return first ? Number(first.before) : Number(form.elements.namedItem(`stat-temp-${index}`).value) || 0;
  }
  function renderApprenticeshipStatGains() {
    const available = Number($('#dp-remaining').textContent);
    const canBuy = $('#dp-remaining').textContent !== '—' && available >= 8;
    const history = readStatGainHistory();
    const freeRolls = (currentDevelopmentLevel() === 1 ? readTrainingSelections() : []).flatMap(packageName => packageStatGrantRules(packageName).map(([id, label, options]) => {
      const used = history.find(entry => entry.source === packageName && entry.grantId === id);
      const taken = packageName === 'Adventurer' ? history.filter(entry => entry.source === packageName).map(entry => entry.stat) : [];
      return `<div class="package-free-roll"><strong>${esc(packageName)} · ${esc(label)}</strong>${used ? `<span>Used for ${esc(used.stat)}</span>` : `<div class="choice-strip">${options.filter(name => !taken.includes(name)).map(name => `<button type="button" data-free-package="${esc(packageName)}" data-free-grant="${esc(id)}" data-stat-index="${statNames.indexOf(name)}"${Number(form.elements.namedItem(`stat-pot-${statNames.indexOf(name)}`).value) >= Number(form.elements.namedItem(`stat-temp-${statNames.indexOf(name)}`).value) && Number(form.elements.namedItem(`stat-temp-${statNames.indexOf(name)}`).value) >= 1 ? '' : ' disabled'}>${esc(name)}</button>`).join('') || '<span>Choose a realm of power first.</span>'}</div>`}</div>`;
    })).join('');
    $('#apprenticeship-stat-list').innerHTML = freeRolls + statNames.map((name, index) => {
      const current = Number(form.elements.namedItem(`stat-temp-${index}`).value) || 0;
      const potential = Number(form.elements.namedItem(`stat-pot-${index}`).value) || 0;
      return `<div class="apprenticeship-stat-row"><span>${esc(name)} <small>${current} / ${potential || '—'}</small></span><button type="button" data-stat-index="${index}"${canBuy && potential >= current && current >= 1 ? '' : ' disabled'}>Buy & roll · 8 DP</button></div>`;
    }).join('');
    $('#apprenticeship-stat-history').innerHTML = history.length
      ? `Recent rolls: ${history.slice(-4).map(entry => `${esc(entry.stat)} ${entry.before} → ${entry.after} (${entry.dice.join('+')}${entry.source ? `, ${esc(entry.source)}` : ', 8 DP'})`).join(' · ')}${history.at(-1)?.source?.startsWith('level:') ? '' : ' <button type="button" id="undo-stat-gain">Undo last roll</button>'}`
      : 'No extra stat gain rolls purchased.';
  }
  function buyStatGain(index, source = '', grantId = '') {
    if (!source && ($('#dp-remaining').textContent === '—' || Number($('#dp-remaining').textContent) < 8)) return;
    if (source) {
      const history = readStatGainHistory();
      if (source.startsWith('background:')) {
        const option = Number(source.slice('background:'.length));
        if (!Number.isInteger(option) || option < 0 || option >= (Number(readBackgroundSelections().extraStatRolls) || 0)) return;
        if (history.some(entry => entry.source === source && entry.stat === statNames[index])) return;
      } else {
        if (!readTrainingSelections().includes(source)) return;
        const rule = packageStatGrantRules(source).find(([id]) => id === grantId);
        if (!rule?.[2].includes(statNames[index])) return;
        if (history.some(entry => entry.source === source && (entry.grantId === grantId || source === 'Adventurer' && entry.stat === statNames[index]))) return;
      }
    }
    const temp = form.elements.namedItem(`stat-temp-${index}`);
    const pot = form.elements.namedItem(`stat-pot-${index}`);
    const before = Number(temp.value);
    const potential = Number(pot.value);
    if (!Number.isInteger(before) || !Number.isInteger(potential) || potential < before) return;
    if (!source.startsWith('background:') && !form.elements.apprenticeshipDpBase.value) form.elements.apprenticeshipDpBase.value = $('#dp-available').textContent;
    const {dice, after} = rollStatGain(before, potential);
    temp.value = String(after);
    const history = readStatGainHistory();
    history.push({stat:statNames[index], before, after, dice, cost:source ? 0 : 8, source, grantId, level:currentDevelopmentLevel()});
    form.elements.statGainHistory.value = JSON.stringify(history);
    updateDevelopment();
    saveCurrent();
    if ($('#background-picker').open) renderBackgroundOptionDetails();
  }
  function readBackgroundDetails() {
    try {
      const value = JSON.parse(form.elements.backgroundDetails.value || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  function writeBackgroundDetails(details) { form.elements.backgroundDetails.value = JSON.stringify(details); }
  function backgroundEntry(details, key, index) { return details[key]?.[index] || {}; }
  function backgroundItemTier(roll) { return backgroundItems.find(([maximum]) => Number(roll) <= maximum); }
  function backgroundItemChoices(tier) {
    const choices = tier?.[2] || [];
    return form.elements.race.value === 'Halfling' ? choices.filter(choice => !/spell adder|Daily |potion/i.test(choice)) : choices;
  }
  function backgroundMoneyAmount(roll) { return backgroundMoney.find(([maximum]) => Number(roll) <= maximum)?.[1] || 0; }
  function backgroundSkillCandidates(allowAll = false) {
    const results = new Map();
    Object.entries(a4Skills).forEach(([category, names]) => {
      if (!allowAll && !['standard','combined'].includes(skillCategoryRules[category]?.[1] || 'standard')) return;
      names.split('|').filter(name => name && !name.endsWith('*')).forEach(name => results.set(`${category}:${name}`, {category, name}));
    });
    $$('.skill-row', $('#skills-list')).forEach(row => {
      const category = row.dataset.category;
      const name = $('[name="skill-name"]', row).value;
      if (name && !name.startsWith('Choose ') && (allowAll || ['standard','combined'].includes(skillCategoryRules[category]?.[1] || 'standard'))) results.set(`${category}:${name}`, {category, name});
    });
    return [...results.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  function applyBackgroundEffects() {
    const details = readBackgroundDetails();
    const selected = readBackgroundSelections();
    const languageRanks = new Map(), skillSpecial = new Map(), skillItem = new Map(), categorySpecial = new Map(), categoryItem = new Map();
    const add = (map, key, amount) => map.set(key, (map.get(key) || 0) + amount);
    for (let index = 0; index < (Number(selected.extraLanguages) || 0); index++) {
      Object.entries(backgroundEntry(details, 'extraLanguages', index).allocations || {}).forEach(([name, ranks]) => {
        if (name.endsWith(' (spoken)') || name.endsWith(' (written)')) add(languageRanks, `Communications:${name}`, Math.max(0, Number(ranks) || 0));
      });
    }
    for (let index = 0; index < (Number(selected.skillBonus) || 0); index++) {
      const target = backgroundEntry(details, 'skillBonus', index).target;
      if (target) add(skillSpecial, target, 10);
    }
    for (let index = 0; index < (Number(selected.categoryBonus) || 0); index++) {
      const target = backgroundEntry(details, 'categoryBonus', index).target;
      if (skillCategoryRules[target]) add(categorySpecial, target, 5);
    }
    for (const key of ['rolledItem','chosenItem']) for (let index = 0; index < (Number(selected[key]) || 0); index++) {
      const entry = backgroundEntry(details, key, index);
      if (!backgroundItemChoices(backgroundItems[Number(entry.tier)]).includes(entry.choice)) continue;
      (entry.effects || []).forEach(effect => {
        if (effect.target && Number.isFinite(Number(effect.bonus))) add(skillItem, effect.target, Number(effect.bonus));
      });
    }
    const benefits = readTrainingBenefits();
    readTrainingSelections().forEach(name => {
      const pack = trainingPackages.find(item => item.name === name);
      if (!pack) return;
      const special = benefits[name]?.special || {};
      trainingSpecialAwards(pack, special).forEach(index => {
        const effect = trainingItemEffect(pack.specialItems[index][0]);
        if (!effect) return;
        effect.fixed.forEach(key => add(skillItem, key, effect.bonus));
        const target = special.targets?.[index];
        if (!target || !trainingItemCandidates(effect.kind).some(([key]) => key === target)) return;
        if (target.startsWith('category:')) add(categoryItem, target.slice(9), effect.bonus);
        else add(skillItem, target, effect.bonus);
      });
    });
    skillItem.forEach((amount, key) => skillItem.set(key, Math.min(30, amount)));
    $$('.category-record-row').forEach(row => {
      const field = $('[name="record-special"]', row);
      const previous = Number(row.dataset.backgroundSpecialBase) || 0;
      const next = categorySpecial.get(row.dataset.category) || 0;
      field.value = String((Number(field.value) || 0) - previous + next);
      row.dataset.backgroundSpecialBase = String(next);
      const itemField = $('[name="record-special2"]', row);
      const previousItem = Number(row.dataset.trainingItemBase) || 0;
      const nextItem = categoryItem.get(row.dataset.category) || 0;
      itemField.value = String((Number(itemField.value) || 0) - previousItem + nextItem);
      row.dataset.trainingItemBase = String(nextItem);
    });
    const pending = new Set([...languageRanks.keys(), ...skillSpecial.keys(), ...skillItem.keys()]);
    $$('.skill-row', $('#skills-list')).forEach(row => {
      const key = `${row.dataset.category}:${$('[name="skill-name"]', row).value}`;
      for (const [fieldName, datasetName, source] of [['skill-start','backgroundLanguageBase',languageRanks],['skill-special','backgroundSpecialBase',skillSpecial],['skill-item','backgroundItemBase',skillItem]]) {
        const field = $(`[name="${fieldName}"]`, row);
        const previous = Number(row.dataset[datasetName]) || 0;
        const next = source.get(key) || 0;
        field.value = String((Number(field.value) || 0) - previous + next);
        row.dataset[datasetName] = String(next);
      }
      pending.delete(key);
    });
    pending.forEach(key => {
      const separator = key.indexOf(':');
      const category = key.slice(0, separator), name = key.slice(separator + 1);
      if (!skillCategoryRules[category] || !name) return;
      const row = skillRow({category, name});
      const ranks = languageRanks.get(key) || 0, special = skillSpecial.get(key) || 0, item = skillItem.get(key) || 0;
      $('[name="skill-start"]', row).value = String(ranks);
      $('[name="skill-special"]', row).value = String(special);
      $('[name="skill-item"]', row).value = String(item);
      row.dataset.backgroundLanguageBase = String(ranks);
      row.dataset.backgroundSpecialBase = String(special);
      row.dataset.backgroundItemBase = String(item);
    });
  }
  function renderBackgroundRewardsSummary() {
    const details = readBackgroundDetails();
    const selections = readBackgroundSelections();
    const rewards = [];
    let spellAdder = 0;
    for (const key of ['rolledMoney','chosenMoney']) for (let index = 0; index < (Number(selections[key]) || 0); index++) {
      const amount = Number(backgroundEntry(details, key, index).amount) || 0;
      if (amount) rewards.push(`${amount} gp extra money`);
    }
    for (const key of ['rolledItem','chosenItem']) for (let index = 0; index < (Number(selections[key]) || 0); index++) {
      const entry = backgroundEntry(details, key, index);
      if (entry.choice && backgroundItemChoices(backgroundItems[Number(entry.tier)]).includes(entry.choice)) {
        rewards.push(entry.description ? `${entry.choice}: ${entry.description}` : entry.choice);
        spellAdder += Number(/\+(\d+) spell adder/.exec(entry.choice)?.[1]) || 0;
      }
    }
    if (spellAdder) rewards.push(`Spell adder +${Math.min(3, spellAdder)} total`);
    $('#background-rewards-summary').textContent = rewards.length ? `Background rewards: ${rewards.join(' · ')}` : '';
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
  function pendingBackgroundChoices() {
    const selected = readBackgroundSelections(), details = readBackgroundDetails(), history = readStatGainHistory();
    let pending = 0;
    for (const [key] of backgroundChoices) for (let index = 0; index < (Number(selected[key]) || 0); index++) {
      const entry = backgroundEntry(details, key, index);
      if (key === 'extraLanguages') {
        const allocations = entry.allocations || {};
        if (Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0) !== 20) pending++;
      } else if (key === 'extraStatRolls') {
        pending += statNames.filter(name => !history.some(item => item.source === `background:${index}` && item.stat === name)).length;
      } else if (key === 'skillBonus' || key === 'categoryBonus') {
        if (!entry.target) pending++;
      } else if (key === 'rolledMoney' || key === 'chosenMoney') {
        if (!entry.amount) pending++;
      } else if (!entry.choice || !entry.description || !backgroundItemChoices(backgroundItems[Number(entry.tier)]).includes(entry.choice)) pending++;
    }
    return pending;
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
  function backgroundTargetPicker(key, index, selected, effectIndex = -1) {
    const categories = Object.keys(skillCategoryRules).filter(category => ['standard','combined'].includes(skillCategoryRules[category][1] || 'standard'));
    const options = key === 'categoryBonus' ? categories.map(category => [category, category])
      : backgroundSkillCandidates(key === 'rolledItem' || key === 'chosenItem').map(({category, name}) => [`${category}:${name}`, `${name} · ${category}`]);
    const effect = effectIndex < 0 ? '' : ` data-background-effect="${effectIndex}"`;
    return `<div class="background-target-picker"><strong>${selected ? esc(options.find(([value]) => value === selected)?.[1] || selected) : 'Choose a target'}</strong><input type="search" data-background-target-search placeholder="Find a ${key === 'categoryBonus' ? 'category' : 'skill'}" aria-label="Find bonus target"><div class="choice-strip">${options.map(([value, label]) => `<button type="button" data-background-target="${esc(value)}" data-background-key="${key}" data-background-index="${index}"${effect} data-search="${esc(label.toLowerCase())}" aria-pressed="${value === selected}">${esc(label)}</button>`).join('')}</div></div>`;
  }
  function renderBackgroundOptionDetails() {
    const selected = readBackgroundSelections();
    const details = readBackgroundDetails();
    const history = readStatGainHistory();
    const sections = [];
    for (const [key, label] of backgroundChoices) for (let index = 0; index < (Number(selected[key]) || 0); index++) {
      const entry = backgroundEntry(details, key, index);
      let body = '';
      if (key === 'extraLanguages') {
        const allocations = entry.allocations || {};
        const used = Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0);
        body = `<p>${used} of 20 ranks allocated. Spoken and written are separate skills.</p><div class="background-language-list">${(backgroundExtraLanguages[form.elements.race.value] || []).map(([language, spoken, written]) => `<div><strong>${esc(language)}</strong>${[['spoken',spoken],['written',written]].map(([mode, cap]) => {
          const name = `${language} (${mode})`;
          const row = findSkillRow('Communications', name);
          const current = Number(allocations[name]) || 0;
          const total = Number($('[name="skill-start"]', row)?.value) || 0;
          return `<label>${mode}<input type="number" inputmode="numeric" min="0" max="${cap}" value="${current}" data-background-language="${esc(name)}" data-background-index="${index}" aria-label="${esc(name)} background ranks"><small>${total} total · max ${cap}</small></label>`;
        }).join('')}</div>`).join('')}</div>`;
      } else if (key === 'extraStatRolls') {
        body = `<p>One free stat gain roll for each stat.</p><div class="background-stat-list">${statNames.map((name, statIndex) => {
          const used = history.find(item => item.source === `background:${index}` && item.stat === name);
          const temp = Number(form.elements.namedItem(`stat-temp-${statIndex}`).value), pot = Number(form.elements.namedItem(`stat-pot-${statIndex}`).value);
          return `<div><span>${esc(name)} · ${temp} / ${pot || '—'}</span>${used ? `<strong>${used.dice.join('+')} → ${used.after}</strong><button type="button" data-background-undo-stat="${statIndex}" data-background-index="${index}">Undo</button>` : `<button type="button" data-background-stat="${statIndex}" data-background-index="${index}"${temp >= 1 && pot >= temp ? '' : ' disabled'}>Roll 2d10</button>`}</div>`;
        }).join('')}</div>`;
      } else if (key === 'skillBonus' || key === 'categoryBonus') {
        body = `<p>${key === 'skillBonus' ? '+10 to one skill' : '+5 to one skill category'}. Each target can receive this background bonus once.</p>${backgroundTargetPicker(key, index, entry.target || '')}`;
      } else if (key === 'rolledMoney' || key === 'chosenMoney') {
        body = key === 'rolledMoney'
          ? `<div class="background-roll-result">${entry.roll ? `Rolled ${entry.roll}: ${entry.amount} gp` : `<button type="button" data-background-roll="money" data-background-index="${index}">Roll d100 for money</button>`}</div>`
          : `<p>Choose a T-1.5 amount with your GM.</p><div class="choice-strip">${backgroundMoney.map(([, amount]) => `<button type="button" data-background-money="${amount}" data-background-index="${index}" aria-pressed="${Number(entry.amount) === amount}">${amount} gp</button>`).join('')}</div>`;
      } else {
        const tier = entry.tier === undefined ? null : backgroundItems[Number(entry.tier)];
        body = key === 'rolledItem'
          ? `<div class="background-roll-result">${entry.roll ? `Rolled ${entry.roll} · ${esc(tier?.[1] || '')}` : `<button type="button" data-background-roll="item" data-background-index="${index}">Roll d100 for an item</button>`}</div>`
          : `<p>Choose a T-1.5 result with your GM.</p><div class="choice-strip">${backgroundItems.map(([maximum, range], tierIndex) => `<button type="button" data-background-item-tier="${tierIndex}" data-background-index="${index}" aria-pressed="${Number(entry.tier) === tierIndex}">${esc(range)}</button>`).join('')}</div>`;
        if (tier) body += `<p>Choose one result from ${esc(tier[1])}.</p><div class="choice-strip">${backgroundItemChoices(tier).map(choice => `<button type="button" data-background-item-choice="${esc(choice)}" data-background-key="${key}" data-background-index="${index}" aria-pressed="${entry.choice === choice}">${esc(choice)}</button>`).join('')}</div><label class="background-picker-notes">Item description<input type="text" data-background-item-description data-background-key="${key}" data-background-index="${index}" value="${esc(entry.description || '')}" placeholder="GM approved item or companion"></label><div class="background-item-effects"><strong>Item bonuses to skills</strong>${(entry.effects || []).map((effect, effectIndex) => `<div class="background-item-effect">${backgroundTargetPicker(key, index, effect.target || '', effectIndex)}<label>Bonus<input type="number" data-background-item-bonus data-background-key="${key}" data-background-index="${index}" data-background-effect="${effectIndex}" value="${Number(effect.bonus) || 0}"></label><button type="button" data-background-remove-effect data-background-key="${key}" data-background-index="${index}" data-background-effect="${effectIndex}">Remove</button></div>`).join('')}<button type="button" data-background-add-effect data-background-key="${key}" data-background-index="${index}">Add skill bonus</button></div>`;
      }
      sections.push(`<section class="background-option-card"><h3>${esc(label)}${(Number(selected[key]) || 0) > 1 ? ` ${index + 1}` : ''}</h3>${body}</section>`);
    }
    $('#background-option-details').innerHTML = sections.join('');
  }
  function renderBackgroundPicker() {
    const race = form.elements.race.value;
    const selections = readBackgroundSelections();
    $('#background-picker-subtitle').textContent = `${race} · T-1.5 choices`;
    $('#background-race-note').textContent = raceBackgroundNotes[race] || '';
    $('#background-picker-list').innerHTML = backgroundChoices.map(([key, label, cost, detail]) => `<label class="background-choice"><span><strong>${esc(label)}</strong><small>${esc(detail)}</small></span><b>${cost} ${cost === 1 ? 'option' : 'options'} each</b><input type="number" inputmode="numeric" min="0" max="99" value="${Math.max(0, Number(selections[key]) || 0)}" data-background-choice="${key}" data-cost="${cost}" aria-label="${esc(label)} count"></label>`).join('');
    $('#background-picker-notes').value = form.elements.backgroundOptions.value;
    $('#background-skill-category-options').innerHTML = Object.keys(skillCategoryRules).map((category, index) => `<label class="choice-tile"><input type="radio" name="backgroundSkillCategory" value="${esc(category)}"${index === 0 ? ' checked' : ''}><span>${esc(category)}</span></label>`).join('');
    renderBackgroundOptionDetails();
    updateBackgroundLimits(); updateBackgroundPickerBudget();
  }
  function updateBackgroundSelection(input) {
    const selections = readBackgroundSelections();
    const key = input.dataset.backgroundChoice;
    const cost = Number(input.dataset.cost);
    const previous = Math.max(0, Number(selections[key]) || 0);
    const requested = Number(input.value);
    const next = Math.max(0, Math.min(Number.isInteger(requested) ? requested : 0, Number(input.max)));
    if (key === 'extraStatRolls' && readStatGainHistory().some(entry => entry.source?.startsWith('background:') && Number(entry.source.slice(11)) >= next)) {
      $('#background-option-message').textContent = 'Undo the affected stat gain rolls before removing this option.';
      input.value = String(previous);
      return;
    }
    if (next) selections[key] = next; else delete selections[key];
    const details = readBackgroundDetails();
    if (Array.isArray(details[key])) details[key] = details[key].slice(0, next);
    writeBackgroundDetails(details);
    form.elements.backgroundSelections.value = JSON.stringify(selections);
    form.elements.backgroundUsed.value = String((Number(form.elements.backgroundUsed.value) || 0) + (next - previous) * cost);
    input.value = String(next);
    $('#background-option-message').textContent = '';
    updateBackgroundLimits(); updateBackgroundPickerBudget(); saveCurrent(); renderBackgroundOptionDetails();
  }
  function changeBackgroundEntry(key, index, change) {
    if (!backgroundChoices.some(choice => choice[0] === key) || index < 0 || index >= (Number(readBackgroundSelections()[key]) || 0)) return;
    const details = readBackgroundDetails();
    details[key] ||= [];
    details[key][index] ||= {};
    change(details[key][index], details);
    writeBackgroundDetails(details);
    $('#background-option-message').textContent = '';
    saveCurrent();
    renderBackgroundOptionDetails();
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
    profession ||= form.elements.profession.value;
    const category = row.dataset.category;
    if (!row.classList.contains('skill-row') || !category.startsWith('Spells •')) return categoryCosts(category, profession);
    const name = $('[name="skill-name"]', row).value;
    const start = Number($('[name="skill-start"]', row).value) || 0;
    return spellListCosts(category, start, profession, spellListMultiplier(category, name));
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
  function rankedCharacterSkills() {
    return $$('.skill-row', $('#skills-list')).map(row => ({
      category:row.dataset.category,
      name:$('[name="skill-name"]', row).value,
      ranks:(Number($('[name="skill-start"]', row).value) || 0) + developedSkillRanks(row, Number(row.dataset.pendingBuy ?? $('[name="skill-buy"]', row).value) || 0)
    })).filter(skill => skill.name && !skill.name.startsWith('Choose '));
  }
  function skillTotalBonus(category, name) {
    const row = $$('.a4-skill-row[data-skill]').find(item => item.dataset.category === category && item.dataset.skill === name);
    const value = row ? $('.a4-total', row).textContent : '—';
    return value !== '—' && Number.isFinite(Number(value)) ? Number(value) : null;
  }
  function readStartingWeapons() {
    try {
      const values = JSON.parse(form.elements.startingWeapons.value || '[]');
      return Array.isArray(values) ? values.filter(value => typeof value === 'string').slice(0, 2) : [];
    } catch { return []; }
  }
  function readStartingArmor() {
    try {
      const value = JSON.parse(form.elements.startingArmor.value || 'null');
      return Array.isArray(value) && value.length === 2 ? value : null;
    } catch { return null; }
  }
  function strideBonus(heightText) {
    const match = /^(\d+)'\s*(\d{1,2})(?:")?$/.exec(heightText.trim());
    if (!match) return null;
    const inches = Number(match[1]) * 12 + Number(match[2]);
    if (Number(match[2]) >= 12 || inches < 22 || inches > 99) return null;
    return [[94,20],[88,15],[82,10],[76,5],[70,0],[64,-5],[58,-10],[52,-15],[46,-20],[40,-25],[34,-30],[28,-35],[22,-40]].find(([minimum]) => inches >= minimum)[1];
  }
  function updateStartingOutfit(skills) {
    const weaponSkills = skills.filter(skill => skill.category.startsWith('Weapon •') && skill.ranks >= 1);
    const weaponKeys = new Set(weaponSkills.map(skill => favoriteSkillKey(skill.category, skill.name)));
    const weapons = readStartingWeapons().filter(key => weaponKeys.has(key));
    form.elements.startingWeapons.value = JSON.stringify(weapons);
    const weaponStrip = $('#final-weapon-options'), weaponScroll = weaponStrip.scrollLeft;
    weaponStrip.innerHTML = weaponSkills.length ? weaponSkills.map(skill => {
      const key = favoriteSkillKey(skill.category, skill.name);
      return `<button type="button" data-starting-weapon="${esc(key)}" aria-pressed="${weapons.includes(key)}"${weapons.length >= 2 && !weapons.includes(key) ? ' disabled' : ''}>${esc(skill.name)} · ${esc(skill.category.replace('Weapon • ', ''))}</button>`;
    }).join('') : '<span class="sheet-hint">Develop a weapon skill to choose starting weapons.</span>';
    weaponStrip.scrollLeft = weaponScroll;
    const armorSkills = skills.filter(skill => skill.category.startsWith('Armor •') && armorSkillTypes[skill.name] && skill.ranks >= 1);
    const highestRanks = Math.max(0, ...armorSkills.map(skill => skill.ranks));
    const options = armorSkills.filter(skill => skill.ranks === highestRanks).flatMap(skill => armorSkillTypes[skill.name].map(type => [skill.name, type]));
    const chosen = readStartingArmor();
    const armor = (currentDevelopmentLevel() > 1 && chosen || options.some(([name, type]) => chosen?.[0] === name && chosen?.[1] === type)) ? chosen : null;
    form.elements.startingArmor.value = armor ? JSON.stringify(armor) : '';
    const armorStrip = $('#final-armor-options'), armorScroll = armorStrip.scrollLeft;
    armorStrip.innerHTML = `<button type="button" data-starting-armor="" aria-pressed="${!armor}">No armor</button>` + (options.length ? options.map(([name, type]) => `<button type="button" data-starting-armor="${esc(JSON.stringify([name,type]))}" aria-pressed="${armor?.[0] === name && armor?.[1] === type}">${esc(name)} · AT ${type}</button>`).join('') : '<span class="sheet-hint">Develop an armor skill for a starting suit.</span>');
    armorStrip.scrollLeft = armorScroll;
    const months = readTrainingSelections().reduce((sum, name) => sum + (trainingPackages.find(pack => pack.name === name)?.months || 0), 0);
    const minimumAge = Math.max(16 + Math.ceil(months / 12), form.elements.race.value === 'Halfling' ? 30 : 16);
    const age = Number(form.elements.roleAge.value);
    const lifespanMaximum = {'Common Man':80, 'High Man':300, Dwarf:400, Halfling:110}[form.elements.race.value];
    const ageProblem = form.elements.roleAge.value && (age < minimumAge ? `age ${age} is below the minimum` : lifespanMaximum && age > lifespanMaximum ? `age ${age} exceeds the race’s usual lifespan` : '');
    $('#final-level-age').textContent = `Level ${form.elements.level.value} · ${Number(form.elements.xp.value || 0).toLocaleString()} XP · minimum starting age ${minimumAge}${months ? ` (${months} training months)` : ''}${ageProblem ? ` · ${ageProblem}` : ''}.`;
    $('#final-level-age').classList.toggle('over-budget', !!ageProblem);
    const details = readBackgroundDetails(), selections = readBackgroundSelections();
    let extraGold = 0;
    for (const key of ['rolledMoney','chosenMoney']) for (let index = 0; index < (Number(selections[key]) || 0); index++) extraGold += Number(backgroundEntry(details, key, index).amount) || 0;
    const benefits = readTrainingBenefits();
    const trainingMoney = readTrainingSelections().flatMap(name => benefits[name]?.money ? [`${name} +${benefits[name].money.total} in the race’s starting-money unit`] : []);
    $('#final-money').textContent = `Starting money: 2 gp or race equivalent${extraGold ? ` + ${extraGold} gp from background` : ''}${trainingMoney.length ? ` · training: ${trainingMoney.join('; ')}` : ''}.`;
    $('#starting-outfit-summary').textContent = `Starting outfit: ${weapons.length ? weapons.map(key => JSON.parse(key)[1]).join(', ') : 'no weapons chosen'} · ${armor ? `${armor[0]} (AT ${armor[1]})` : 'no armor chosen'} · clothes, cloak, boots, scabbards, weapon belt, belt pouch, personal effects.`;
    return armor;
  }
  function updateFinalMetrics(skills, armor) {
    const hits = skillTotalBonus('Body Development', 'Body Development');
    const pp = form.elements.realm.value === 'None' ? 0 : skillTotalBonus('Power Point Development', 'Power Point Development');
    form.elements.hits.value = hits === null ? '' : String(Math.max(0, hits));
    form.elements.powerPoints.value = pp === null ? '' : String(Math.max(0, pp));
    $('#final-hits').textContent = form.elements.hits.value || '—';
    $('#final-pp').textContent = form.elements.powerPoints.value || '—';
    $('#final-at').textContent = armor ? String(armor[1]) : '1';
    const qu = form.elements.namedItem('stat-total-8').value;
    const quicknessBonus = qu === '' ? null : 3 * Number(qu);
    const armorStats = armor ? armorTypes[armor[1]] : [0,0,0,0];
    const adjustedQuickness = quicknessBonus === null ? null : quicknessBonus > 0 ? Math.max(0, quicknessBonus - armorStats[3]) : quicknessBonus;
    const shield = Number(form.elements.dbShield.value) || 0, magic = Number(form.elements.dbMagic.value) || 0, special = Number(form.elements.dbSpecial.value) || 0;
    $('#final-db').textContent = adjustedQuickness === null ? '—' : String(adjustedQuickness + shield + magic + special);
    $('#final-defense-detail').textContent = `DB: 3 × Quickness ${quicknessBonus ?? '—'}${armor ? `, armor Quickness penalty ${armorStats[3]}` : ''}, shield ${shield}, magic ${magic}, special ${special}. Armor penalty only reduces a positive Quickness contribution.`;
    const armorCategory = armor?.[0] === 'Chain' ? 'Armor • Medium' : armor?.[0] === 'Plate' ? 'Armor • Heavy' : 'Armor • Light';
    const armorBonus = armor ? skillTotalBonus(armorCategory, armor[0]) : 0;
    const baseMmp = armorBonus === null ? null : Math.min(armorStats[0], armorStats[1] + armorBonus);
    $('#final-mmp').textContent = baseMmp === null ? '—' : String(baseMmp);
    $('#final-missile').textContent = armorStats[2] ? `−${armorStats[2]}` : '0';
    const stride = strideBonus(form.elements.roleHeight.value);
    const baseMovement = quicknessBonus === null || stride === null ? null : 50 + quicknessBonus + stride;
    $('#final-move').textContent = baseMovement === null ? '—' : `${baseMovement}′`;
    const bodyWeight = Number.parseFloat(form.elements.roleWeight.value);
    const carriedText = form.elements.carriedWeight.value;
    const carried = Number(carriedText);
    const strengthText = form.elements.namedItem('stat-total-9').value;
    if (carriedText !== '' && carried >= 0 && bodyWeight > 0 && strengthText !== '') {
      const allowance = bodyWeight / 10;
      const unitsOver = Math.max(0, Math.ceil(carried / allowance - 1e-9) - 1);
      const encumbrance = -8 * unitsOver;
      const penalty = Math.min(0, encumbrance - armorStats[3] + 3 * Number(strengthText));
      $('#final-weight-penalty').textContent = String(penalty);
      $('#final-load-detail').textContent = `Weight allowance ${allowance.toFixed(1)} lb · encumbrance ${encumbrance} · with load: movement ${baseMovement === null ? '—' : `${baseMovement + penalty}′`}, moving maneuver ${baseMmp === null ? '—' : baseMmp + penalty}.`;
    } else {
      $('#final-weight-penalty').textContent = '—';
      $('#final-load-detail').textContent = 'Enter carried load to calculate the optional weight penalty. Exclude clothes and worn armor.';
    }
    const co = form.elements.namedItem('stat-total-1').value;
    const realmStatIndex = {Channeling:6, Essence:5, Mentalism:7}[form.elements.realm.value];
    const realmStat = realmStatIndex === undefined ? '' : form.elements.namedItem(`stat-total-${realmStatIndex}`).value;
    $('#final-recovery').textContent = `Hits recovery: 1 per 3 hr active${co !== '' ? ` · ${Math.max(0, Math.ceil(Number(co) / 2))} per hr resting · ${Math.max(0, 2 * Number(co))} per 3 hr sleeping` : ''}. ${form.elements.realm.value === 'None' ? 'No power point recovery without a realm.' : `Power point recovery: 1 per 3 hr active${realmStat !== '' ? ` · ${Math.max(0, Math.ceil(Number(realmStat) / 2))} per hr resting` : ''}${pp !== null ? ` · ${Math.ceil(Math.max(0, pp) / 2)} per 3 hr sleeping` : ''}.`}`;
    const spellLists = skills.filter(skill => skill.category.startsWith('Spells • Own Realm') && skill.ranks >= 1);
    $('#final-known-spells').textContent = spellLists.length ? `Known spell lists: ${spellLists.map(skill => `${skill.name} (spells through level ${skill.ranks})`).join(' · ')}. Record individual spell names below.` : 'Known spells: develop ranks in a spell list to know its spells through that level.';
  }
  function updateFinalPreparation() {
    if (!developmentRules) return;
    const skills = rankedCharacterSkills();
    const armor = updateStartingOutfit(skills);
    updateFinalMetrics(skills, armor);
  }
  function updateDevelopment() {
    if (!$('#dp-available')) return;
    applyBackgroundEffects();
    updateRuleBonuses();
    const developmentIndices = [0, 1, 2, 3, 4];
    const values = developmentIndices.map(index => Number(form.elements.namedItem(`stat-temp-${index}`).value));
    const hasStats = values.every(value => Number.isFinite(value) && value >= 1 && value <= 101);
    const frozen = Number(form.elements.apprenticeshipDpBase.value);
    const available = form.elements.apprenticeshipDpBase.value && Number.isFinite(frozen) ? frozen
      : hasStats ? Math.round(values.reduce((sum, value) => sum + value, 0) / 5) : null;
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
      $('.rank-cost', row).textContent = `${cost} DP · ${start + developedSkillRanks(row, ranks)} ranks`;
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
        $('.record-start-text', record).textContent = String((Number($('[name="record-start"]', record).value) || 0) + (Number(buy.value) || 0));
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
        const skillRanks = (Number($('[name="skill-start"]', skill).value) || 0) + developedSkillRanks(skill);
        const skillRank = rankBonus(skillRanks, rule[1] || 'standard');
        const item = Number($('[name="skill-item"]', skill).value) || 0;
        const skillSpecial = Number($('[name="skill-special"]', skill).value) || 0;
        $('.skill-bonus', skill).innerHTML = `<span>Rank ${skillRank} + category ${total ?? '—'} + item ${item} + special ${skillSpecial}</span><strong>Skill ${total === null ? '—' : skillRank + total + item + skillSpecial}</strong>`;
      });
    });
    updateA4SkillRows();
    updateFinalPreparation();
    $$('.skill-group', $('#skills-list')).forEach(group => {
      const bonus = (professionSkillBonuses[profession] || {})[group.dataset.group] || 0;
      $('.group-profession-bonus', group).textContent = bonus ? `+${bonus} profession` : '';
    });
    spent += Number(form.elements.otherDp.value) || 0;
    spent += readStatGainHistory().reduce((sum, entry) => sum + ((Number(entry.level) || 1) === currentDevelopmentLevel() ? Number(entry.cost) || 0 : 0), 0);
    if (currentDevelopmentLevel() === 1) spent += trainingPackageCost();
    $('#dp-spent').textContent = String(spent);
    const remaining = hasStats ? available - spent : null;
    $('#dp-remaining').textContent = remaining === null ? '—' : String(remaining);
    $('#dp-remaining').classList.toggle('over-budget', remaining !== null && remaining < 0);
    renderBackgroundRewardsSummary();
    renderTrainingBenefitsSummary();
    updateSheetHints();
    const advancing = currentDevelopmentLevel() > 1;
    $('#creation-progress h2').textContent = advancing ? `Level ${currentDevelopmentLevel()} development` : 'Finish character creation';
    $('#creation-progress .creation-pools').classList.toggle('is-advancing', advancing);
    [...$('#creation-progress .creation-pools').children].forEach((pool, index) => { pool.hidden = advancing && index < 4; });
    $('#creation-progress .creation-pool:last-child > span').textContent = advancing ? `Level ${currentDevelopmentLevel()} DP · 9.0` : 'Apprenticeship · 6.0';
    $('#creation-progress .creation-next').hidden = advancing;
    $('#creation-progress .creation-notes').hidden = advancing;
    updateApprenticeshipBudget();
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
      basic.value = temporary !== '' && Number.isInteger(value) && value >= 1 && value <= 100 ? String(basicStatBonus(value)) : '';
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
    updateAppearance();
    updatePhysicalSource();
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
    const values = statNames.map((_, index) => initialStatValue(index));
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
    const pendingPackages = pendingTrainingChoices();
    if (pendingPackages) steps.push(`<li><button type="button" class="creation-step-button" data-open-apprenticeship-picker>Finish ${pendingPackages} training package choice${pendingPackages === 1 ? '' : 's'}.</button></li>`);
    const pendingBackground = pendingBackgroundChoices();
    if (pendingBackground) steps.push(`<li><button type="button" class="creation-step-button" data-open-background-picker>Finish ${pendingBackground} background result${pendingBackground === 1 ? '' : 's'}.</button></li>`);
    const dpRemaining = Number($('#dp-remaining').textContent);
    if ($('#dp-remaining').textContent !== '—' && dpRemaining !== 0) steps.push(`<li><button type="button" class="creation-step-button" data-open-apprenticeship-picker>${dpRemaining > 0 ? `Spend ${dpRemaining}` : `Review ${-dpRemaining}`} development points.</button></li>`);
    $('#creation-steps').innerHTML = steps.length ? steps.join('') : '<li class="is-complete">Creation choices recorded.</li>';
  }
  function showView(name) {
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `${name}-view`));
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === name || button.dataset.view === 'home' && ['play','editor'].includes(name)));
    window.dispatchEvent(new CustomEvent('rolemaster-view-changed', {detail:name}));
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
  function playValue(value) { return value === '' || value === null || value === undefined ? '—' : esc(value); }
  const xpThresholds = [0,10000,20000,30000,40000,50000,70000,90000,110000,130000,150000,180000,210000,240000,270000,300000,340000,380000,420000,460000,500000];
  function xpForLevel(level) { return level <= 20 ? xpThresholds[Math.max(1, level)] : 500000 + (level - 20) * 50000; }
  function levelForXp(xp) {
    const total = Math.max(0, Math.trunc(Number(xp) || 0));
    if (total >= 500000) return 20 + Math.floor((total - 500000) / 50000);
    for (let level = 19; level >= 2; level--) if (total >= xpThresholds[level]) return level;
    return 1;
  }
  function currentDevelopmentLevel() { return Math.max(1, Math.trunc(Number(form.elements.developmentLevel.value) || 1)); }
  function syncLevelFromXp() { form.elements.level.value = String(levelForXp(form.elements.xp.value)); }
  function readXpHistory() { try { const value = JSON.parse(form.elements.xpHistory.value || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
  function readLevelHistory() { try { const value = JSON.parse(form.elements.levelHistory.value || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
  function rollStatGain(before, potential) {
    const dice = [rollD10(), rollD10()];
    const [first, second] = dice;
    const difference = potential - before;
    const change = first === second && first <= 5 ? -first
      : first === second ? first + second
      : difference <= 0 ? 0 : difference <= 10 ? Math.min(first, second)
      : difference <= 20 ? Math.max(first, second) : first + second;
    return {dice, after:Math.max(1, Math.min(potential, before + change))};
  }
  function levelAdvanceIssue() {
    if (Number($('#dp-remaining').textContent) < 0) return 'Resolve overspent development points before advancing.';
    if (statNames.some((_, index) => {
      const temp = Number(form.elements.namedItem(`stat-temp-${index}`).value);
      const pot = Number(form.elements.namedItem(`stat-pot-${index}`).value);
      return !Number.isInteger(temp) || temp < 1 || !Number.isInteger(pot) || pot < temp;
    })) return 'Set all temporary and potential stats before advancing.';
    return '';
  }
  function advanceLevel() {
    const next = currentDevelopmentLevel() + 1;
    if (next > levelForXp(form.elements.xp.value) || levelAdvanceIssue()) return;
    const snapshot = {level:currentDevelopmentLevel(), xp:Number(form.elements.xp.value) || 0, skills:[], categories:[], remaining:Number($('#dp-remaining').textContent) || 0};
    $$('.skill-row', $('#skills-list')).forEach(row => {
      const buy = Number($('[name="skill-buy"]', row).value) || 0;
      if (buy) snapshot.skills.push({category:row.dataset.category, name:$('[name="skill-name"]', row).value, bought:buy, gained:developedSkillRanks(row, buy)});
      $('[name="skill-start"]', row).value = String((Number($('[name="skill-start"]', row).value) || 0) + developedSkillRanks(row, buy));
      updateSkillBuyOptions(row, 0);
      delete row.dataset.pendingBuy;
    });
    $$('.category-record-row', $('#category-record-list')).forEach(row => {
      const buy = $('[name="record-buy"]', row);
      if (!buy) return;
      const count = Number(buy.value) || 0;
      if (count) snapshot.categories.push({category:row.dataset.category, bought:count});
      $('[name="record-start"]', row).value = String((Number($('[name="record-start"]', row).value) || 0) + count);
      updateSkillBuyOptions(row, 0);
      delete row.dataset.pendingBuy;
    });
    form.elements.levelHistory.value = JSON.stringify([...readLevelHistory(), snapshot]);
    form.elements.spellDevelopmentOrder.value = '[]';
    form.elements.otherDp.value = '0';
    form.elements.developmentLevel.value = String(next);
    const history = readStatGainHistory();
    statNames.forEach((stat, index) => {
      const temp = form.elements.namedItem(`stat-temp-${index}`), pot = form.elements.namedItem(`stat-pot-${index}`);
      const before = Number(temp.value), potential = Number(pot.value);
      if (!Number.isInteger(before) || before < 1 || !Number.isInteger(potential) || potential < 1) return;
      const {dice, after} = rollStatGain(before, potential);
      temp.value = String(after);
      history.push({stat, before, after, dice, cost:0, source:`level:${next}`, level:next});
    });
    form.elements.statGainHistory.value = JSON.stringify(history);
    form.elements.apprenticeshipDpBase.value = '';
    updateDevelopment();
    form.elements.apprenticeshipDpBase.value = $('#dp-available').textContent === '—' ? '' : $('#dp-available').textContent;
    saveCurrent();
    renderPlay();
  }
  function playFact(label, value) { return `<div><dt>${esc(label)}</dt><dd>${playValue(value)}</dd></div>`; }
  function playNote(label, value) { return value?.trim() ? `<section class="play-card"><h2>${esc(label)}</h2><p class="play-prose">${esc(value.trim())}</p></section>` : ''; }
  function playRollTile({category, name, ranks, total, favorite = false, kind = 'skill'}) {
    return `<button type="button" class="play-skill-tile" data-play-roll="${kind}" data-category="${esc(category)}" data-name="${esc(name)}" data-bonus="${esc(total)}" aria-label="Roll ${esc(name)}, ${esc(category)}, bonus ${playValue(total)}"><span class="play-tile-name">${favorite ? '<b aria-hidden="true">★</b> ' : ''}${esc(name)}</span><span class="play-tile-detail">${ranks === undefined ? 'Resistance' : `${ranks} rank${ranks === 1 ? '' : 's'}`}</span><strong>${playValue(total)}</strong></button>`;
  }
  const coinUnits = [['gp',10000],['sp',1000],['bp',100],['cp',10],['tp',1]];
  function formatMoney(tin) {
    const amount = Math.abs(Math.trunc(tin));
    let remaining = amount;
    const parts = coinUnits.flatMap(([unit, value]) => {
      const count = Math.floor(remaining / value);
      remaining %= value;
      return count ? [`${count} ${unit}`] : [];
    });
    return `${tin < 0 ? '−' : ''}${parts.join(' · ') || '0 tp'}`;
  }
  function readEquipmentLedger() {
    try {
      const value = JSON.parse(form.elements.equipmentLedger.value || '{}');
      return {adjustment:Number.isSafeInteger(value.adjustment) ? value.adjustment : 0,
        items:Array.isArray(value.items) ? value.items.filter(item => typeof item.id === 'string' && Number.isSafeInteger(item.quantity) && item.quantity > 0 && Number.isSafeInteger(item.priceTin) && item.priceTin >= 0).map(item => ({id:item.id, name:String(item.name || ''), priceTin:item.priceTin, quantity:item.quantity})) : []};
    } catch { return {adjustment:0, items:[]}; }
  }
  function startingMoneyTin() {
    const details = readBackgroundDetails(), selections = readBackgroundSelections();
    let gold = 2;
    for (const key of ['rolledMoney','chosenMoney']) for (let index = 0; index < (Number(selections[key]) || 0); index++) gold += Number(backgroundEntry(details, key, index).amount) || 0;
    const benefits = readTrainingBenefits();
    for (const name of readTrainingSelections()) gold += Number(benefits[name]?.money?.total) || 0;
    return gold * 10000;
  }
  function equipmentBalance(ledger = readEquipmentLedger()) { return startingMoneyTin() + ledger.adjustment; }
  function writeEquipmentLedger(ledger) {
    form.elements.equipmentLedger.value = JSON.stringify(ledger);
    saveCurrent();
    renderPlayEquipment();
    renderPlayCombat();
  }
  function renderEquipmentCatalog() {
    const category = equipmentCategory;
    const needle = equipmentSearch.trim().toLowerCase();
    const shown = equipmentCatalog.filter(item => (category === 'All' || item.category === category) && (!needle || `${item.name} ${item.id}`.toLowerCase().includes(needle)));
    const balance = equipmentBalance();
    $('#equipment-catalog').innerHTML = equipmentCatalog.length ? shown.map(item => `<article class="equipment-item"><div><strong>${esc(item.name)}</strong><small>${esc(item.category)} · A-7 #${esc(item.id)}</small></div><span>${esc(item.price)}</span><div class="equipment-item-actions"><button type="button" data-equipment-buy="${esc(item.id)}"${balance < item.priceTin ? ' disabled' : ''}>Buy</button><button type="button" data-equipment-own="${esc(item.id)}">Add owned</button></div></article>`).join('') || '<p class="play-muted">No matching equipment.</p>' : '<p class="play-muted">Equipment prices are loading.</p>';
    $('#equipment-catalog-count').textContent = `${shown.length} item${shown.length === 1 ? '' : 's'}`;
    $$('[data-equipment-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.equipmentCategory === category)));
  }
  function renderPlayEquipment() {
    const ledger = readEquipmentLedger();
    const balance = equipmentBalance(ledger);
    $('#equipment-balance').textContent = formatMoney(balance);
    $('#equipment-message').textContent = equipmentMessage;
    $('#equipment-inventory').innerHTML = ledger.items.length ? ledger.items.map(item => `<div class="equipment-owned"><span><strong>${esc(item.name)}</strong><small>× ${item.quantity} · sell for ${formatMoney(Math.floor(item.priceTin / 2))} each</small></span><button type="button" data-equipment-sell="${esc(item.id)}">Sell one</button></div>`).join('') : '<p class="play-muted">No equipment recorded here yet. Add starting gear or buy from the list below.</p>';
    for (const [unit, value] of coinUnits) $(`[name="equipment-cash-${unit}"]`).value = String(Math.floor(Math.max(0, balance) / value) % 10 || 0);
    const gpField = $('[name="equipment-cash-gp"]');
    gpField.value = String(Math.floor(Math.max(0, balance) / 10000));
    renderEquipmentCatalog();
  }
  function renderPlayExperience() {
    const xp = Math.max(0, Math.trunc(Number(form.elements.xp.value) || 0));
    const level = levelForXp(xp), developed = currentDevelopmentLevel();
    const start = xpForLevel(level), next = xpForLevel(level + 1);
    const progress = Math.max(0, Math.min(100, (xp - start) / (next - start) * 100));
    const history = readXpHistory().slice(-5).reverse();
    const issue = levelAdvanceIssue();
    const statRolls = readStatGainHistory().filter(entry => entry.source === `level:${developed}`);
    return `<section class="play-card play-xp-card"><div class="play-xp-heading"><div><h2>Experience & level</h2><p class="play-muted">Level ${level} · ${xp.toLocaleString()} XP</p></div><strong>${Math.max(0, next - xp).toLocaleString()} to level ${level + 1}</strong></div><div class="play-xp-track" role="progressbar" aria-valuenow="${Math.max(start, xp)}" aria-valuemin="${start}" aria-valuemax="${next}" aria-label="Experience toward level ${level + 1}"><span style="width:${progress}%"></span></div><form id="play-xp-form" class="play-xp-form"><label>XP gained or lost<input name="amount" type="number" step="1" required placeholder="e.g. 250 or -100"></label><label>Reason<input name="reason" type="text" maxlength="100" placeholder="Session, quest, correction…"></label><button type="submit" class="button button-dark">Record XP</button></form>${level > developed ? `<div class="play-level-ready"><span>${level - developed} level${level - developed === 1 ? '' : 's'} ready to develop${issue ? `<small>${esc(issue)}</small>` : ''}</span><button type="button" class="button button-dark" id="advance-character-level"${issue ? ' disabled' : ''}>Advance to level ${developed + 1}</button></div>` : ''}${developed > 1 ? `<div class="play-level-ready"><span>Level ${developed} development · ${esc($('#dp-remaining').textContent)} DP remaining</span><button type="button" class="button button-quiet" id="spend-level-dp">Spend DP</button></div>` : ''}${statRolls.length ? `<details class="play-xp-history"><summary>Level ${developed} stat gain rolls</summary><ul>${statRolls.map(entry => `<li><span>${esc(entry.stat)} <small>${esc(entry.dice.join(' + '))}</small></span><strong>${esc(entry.before)} → ${esc(entry.after)}</strong></li>`).join('')}</ul></details>` : ''}${history.length ? `<details class="play-xp-history"><summary>Recent XP</summary><ul>${history.map(entry => `<li><span>${esc(entry.reason || 'XP adjustment')} <small>${esc(entry.date || '')}</small></span><strong>${entry.amount >= 0 ? '+' : ''}${Number(entry.amount).toLocaleString()}</strong></li>`).join('')}</ul><button type="button" id="undo-xp-award" class="button button-quiet">Undo latest XP entry</button></details>` : ''}</section>`;
  }
  function renderPlayCharacter() {
    const stats = statNames.map((name, index) => `<tr><th scope="row">${esc(name)}</th><td>${playValue(form.elements.namedItem(`stat-temp-${index}`).value)}</td><td>${playValue(form.elements.namedItem(`stat-pot-${index}`).value)}</td><td>${playValue(form.elements.namedItem(`stat-total-${index}`).value)}</td></tr>`).join('');
    const physical = [['Age','roleAge'],['Gender','roleGender'],['Appearance','appearanceTemp'],['Demeanor','roleDemeanor'],['Build','roleBuild'],['Height','roleHeight'],['Weight','roleWeight'],['Skin','roleSkin'],['Hair','roleHair'],['Eyes','roleEyes']].map(([label, name]) => playFact(label, form.elements[name].value)).join('');
    const traits = [['Personality','rolePersonality'],['Motivation','roleMotivation'],['Alignment','roleAlignment']].map(([label, name]) => playFact(label, form.elements[name].value)).join('');
    const equipment = [$('#starting-outfit-summary').textContent, $('#background-rewards-summary').textContent, $('#training-rewards-summary').textContent, form.elements.notes.value, form.elements.outfitPurchases.value].filter(Boolean).join('\n');
    $('#play-character-content').innerHTML = `<div class="play-summary"><div><span>Hits max.</span><strong>${playValue(form.elements.hits.value)}</strong></div><div><span>Power points max.</span><strong>${playValue(form.elements.powerPoints.value)}</strong></div><div><span>Experience</span><strong>${playValue(form.elements.xp.value)}</strong></div><div><span>Realm</span><strong>${playValue(form.elements.realm.value)}</strong></div></div><div class="play-card-grid"><section class="play-card"><h2>Stats & bonuses</h2><div class="play-table-scroll"><table class="play-table"><thead><tr><th>Stat</th><th>Temp</th><th>Pot</th><th>Bonus</th></tr></thead><tbody>${stats}</tbody></table></div></section><section class="play-card"><h2>Physical details</h2><dl class="play-facts">${physical}</dl></section><section class="play-card"><h2>Role</h2><dl class="play-facts">${traits}</dl></section><section class="play-card play-equipment-card"><h2>Equipment & money</h2><div class="equipment-wallet"><div><span>Cash available</span><strong id="equipment-balance"></strong></div><details><summary>Set cash balance</summary><form id="equipment-cash-form" class="equipment-cash-form">${coinUnits.map(([unit]) => `<label>${unit}<input name="equipment-cash-${unit}" type="number" min="0" step="1" required></label>`).join('')}<button type="submit" class="button button-quiet">Save cash</button></form></details></div><p id="equipment-message" class="equipment-message" role="status"></p><details class="equipment-starting"><summary>Starting outfit & notes</summary><p class="play-prose">${esc($('#final-money').textContent)}${equipment ? `\n${esc(equipment)}` : ''}</p></details><div class="equipment-sections"><section><h3>Owned equipment</h3><div id="equipment-inventory"></div></section><section><h3>Buy equipment <small>Appendix A-7</small></h3><p class="play-muted">Standard resale is half the listed price, rounded down to a tin piece. Use Add owned for starting gear or GM awards.</p><label class="equipment-search">Find equipment<input id="equipment-search" type="search" placeholder="Search items or A-7 number" value="${esc(equipmentSearch)}"></label><div class="equipment-categories" role="group" aria-label="Equipment category">${['All','Accessories','Armor','Provisions','Transport','Weapons'].map(category => `<button type="button" data-equipment-category="${category}">${category}</button>`).join('')}</div><p id="equipment-catalog-count" class="play-count"></p><div id="equipment-catalog" class="equipment-catalog"></div></section></div></section></div><div class="play-card-grid">${playNote('Background & history', form.elements.roleHistory.value)}${playNote('Other bonuses', form.elements.bonuses.value)}</div>`;
    $('#play-character-content').firstElementChild.insertAdjacentHTML('afterend', renderPlayExperience());
    renderPlayEquipment();
  }
  function renderPlaySkills() {
    const favorites = readFavoriteSkills();
    const rows = $$('.a4-skill-row[data-skill]').map(row => ({category:row.dataset.category, name:row.dataset.skill, ranks:Number($('.a4-start-text', row).textContent) || 0, total:$('.a4-total', row).textContent, favorite:favorites.has(favoriteSkillKey(row.dataset.category, row.dataset.skill))}));
    const shown = rows.filter(row => playSkillFilter === 'all' || (playSkillFilter === 'favorites' ? row.favorite : row.ranks > 0 || row.favorite));
    let content = '';
    if (playSkillFilter === 'all') {
      const groups = new Map();
      shown.forEach(row => { if (!groups.has(row.category)) groups.set(row.category, []); groups.get(row.category).push(row); });
      content = [...groups].map(([category, skills]) => `<section class="play-card play-skill-group"><div class="play-group-title"><h2>${esc(category)}</h2><span>Category ${playValue($$('.category-record-row').find(item => item.dataset.category === category)?.querySelector('.record-total')?.textContent)}</span></div><div class="play-skill-tiles">${skills.map(skill => playRollTile(skill)).join('')}</div></section>`).join('');
    } else content = `<div class="play-skill-tiles">${shown.sort((a, b) => a.name.localeCompare(b.name)).map(skill => playRollTile(skill)).join('')}</div>`;
    $('#play-skills-content').innerHTML = shown.length ? `<p class="play-count">${shown.length} skill${shown.length === 1 ? '' : 's'} shown · select a skill to roll</p>${content}` : `<div class="play-empty">${playSkillFilter === 'favorites' ? 'No favorite skills yet. Mark them on the creation sheet.' : 'No skills match this view.'}</div>`;
    $$('[data-play-skill-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.playSkillFilter === playSkillFilter)));
  }
  function renderPlayCombat() {
    const metric = (label, id) => `<div><span>${esc(label)}</span><strong>${playValue($(id).textContent)}</strong></div>`;
    const weaponSkills = $$('.a4-skill-row[data-skill]').filter(row => row.dataset.category.startsWith('Weapon •')).map(row => ({category:row.dataset.category, name:row.dataset.skill, ranks:Number($('.a4-start-text', row).textContent) || 0, total:$('.a4-total', row).textContent}));
    const normalizeWeapon = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const attackItems = readStartingWeapons().flatMap(key => { try { const [category, name] = JSON.parse(key); return [{category, name, source:'Starting weapon'}]; } catch { return []; } });
    const armorItems = [];
    const startingArmor = readStartingArmor();
    if (startingArmor) armorItems.push({name:startingArmor[0], detail:`Starting armor · AT ${startingArmor[1]}`});
    readEquipmentLedger().items.forEach(entry => {
      const item = equipmentCatalog.find(candidate => candidate.id === entry.id);
      if (item?.category === 'Weapons') attackItems.push({name:item.name, source:`Owned${entry.quantity > 1 ? ` · ×${entry.quantity}` : ''}`});
      if (item?.category === 'Armor') armorItems.push({name:item.name, detail:`Owned${entry.quantity > 1 ? ` · ×${entry.quantity}` : ''}`});
    });
    const benefits = readTrainingBenefits();
    readTrainingSelections().forEach(name => {
      const pack = trainingPackages.find(item => item.name === name);
      if (!pack) return;
      const special = benefits[name]?.special || {};
      trainingSpecialAwards(pack, special).forEach(index => {
        const label = pack.specialItems[index][0], note = special.notes?.[index]?.trim();
        if (/weapon/i.test(label) && (!/or armor/i.test(label) || special.targets?.[index]?.startsWith('Weapon •'))) attackItems.push({name:note || label, source:`${name} award`, target:special.targets?.[index]});
        else if (/armor|shield|helm/i.test(label)) armorItems.push({name:note || label, detail:`${name} award`});
      });
    });
    const attacks = attackItems.map(item => {
      const match = weaponSkills.find(skill => item.category === skill.category && item.name === skill.name)
        || weaponSkills.find(skill => item.target === `${skill.category}:${skill.name}`)
        || weaponSkills.find(skill => normalizeWeapon(skill.name) === normalizeWeapon(item.name));
      return playRollTile({category:match ? `${item.source} · ${match.category}` : item.source, name:item.name, ranks:match?.ranks ?? 0, total:match?.total ?? '—'});
    }).join('');
    const armors = armorItems.map(item => `<div class="equipment-owned"><span><strong>${esc(item.name)}</strong><small>${esc(item.detail)}</small></span></div>`).join('');
    const rolls = resistanceTypes.map(([key, label]) => playRollTile({category:'Resistance roll', name:label, total:$(`#rr-total-${key}`).textContent, kind:'resistance'})).join('');
    const combatNotes = form.elements.attacks.value.trim();
    const spells = form.elements.spells.value.trim();
    $('#play-combat-content').innerHTML = `<div class="play-summary play-combat-summary">${metric('Hits max.', '#final-hits')}${metric('Power points', '#final-pp')}${metric('Normal DB', '#final-db')}${metric('Armor type', '#final-at')}${metric('Base movement', '#final-move')}${metric('Moving maneuver', '#final-mmp')}${metric('Weight penalty', '#final-weight-penalty')}${metric('Missile penalty', '#final-missile')}</div><div class="play-card-grid"><section class="play-card"><h2>Attacks</h2>${attacks ? `<div class="play-skill-tiles">${attacks}</div>` : '<p class="play-muted">No attack items recorded.</p>'}${combatNotes ? `<p class="play-prose">${esc(combatNotes)}</p>` : ''}</section><section class="play-card"><h2>Armor</h2>${armors || '<p class="play-muted">No armor recorded.</p>'}</section><section class="play-card"><h2>Defense & movement</h2><p class="play-prose">${esc($('#final-defense-detail').textContent)}\n${esc($('#final-load-detail').textContent)}</p></section><section class="play-card"><h2>Resistance rolls</h2><div class="play-skill-tiles">${rolls}</div></section><section class="play-card"><h2>Recovery & spells</h2><p class="play-prose">${esc($('#final-recovery').textContent)}\n${esc($('#final-known-spells').textContent)}${spells ? `\n${esc(spells)}` : ''}</p></section></div>`;
  }
  function renderPlay() {
    updateDevelopment();
    $('#play-character-name').textContent = form.elements.name.value || 'Unnamed character';
    $('#play-character-subtitle').textContent = [form.elements.race.value, form.elements.profession.value, form.elements.player.value ? `Player: ${form.elements.player.value}` : '', form.elements.campaign.value].filter(Boolean).join(' · ');
    $('#play-character-level').textContent = form.elements.level.value || '1';
    renderPlayCharacter(); renderPlaySkills(); renderPlayCombat();
  }
  function selectPlayTab(name) {
    $$('[data-play-tab]').forEach(button => {
      const selected = button.dataset.playTab === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      $(`#play-panel-${button.dataset.playTab}`).hidden = !selected;
    });
  }
  function openPlayRoll(button) {
    activePlayRoll = {kind:button.dataset.playRoll, bonus:button.dataset.bonus};
    playDice = null;
    $('#play-skill-roll-title').textContent = button.dataset.name;
    $('#play-skill-roll-category').textContent = button.dataset.category;
    $('#play-roll-bonus-label').textContent = activePlayRoll.kind === 'resistance' ? 'Resistance bonus' : 'Skill total bonus';
    $('#play-skill-roll-bonus').textContent = activePlayRoll.bonus;
    $('#play-skill-roll-modifier').value = '0';
    $('#roll-play-skill').textContent = activePlayRoll.kind === 'resistance' ? 'Roll d100' : 'Roll open-ended d100';
    $('#play-skill-roll-result').textContent = 'Roll to see the result.';
    $('#play-roll-note').textContent = activePlayRoll.kind === 'resistance' ? 'Compare the modified result with the target on Resistance Roll Table T-3.4.' : 'Open-ended rolls continue on 96–100 and subtract on 01–05.';
    $('#play-skill-roll').showModal();
  }
  function updatePlayRollResult() {
    if (!activePlayRoll || !playDice) return;
    const bonus = Number(activePlayRoll.bonus);
    const validBonus = Number.isFinite(bonus);
    const modifier = Number($('#play-skill-roll-modifier').value) || 0;
    const total = playDice.total + (validBonus ? bonus : 0) + modifier;
    const bonusLabel = activePlayRoll.kind === 'resistance' ? 'Resistance' : 'Skill';
    $('#play-skill-roll-result').innerHTML = `<span>Dice: ${esc(formatRolls(playDice.rolls))} = ${playDice.total}</span><strong>${total}</strong><span>${validBonus ? `${bonusLabel} ${bonus >= 0 ? '+' : ''}${bonus}` : 'Bonus unavailable; using 0'} · modifier ${modifier >= 0 ? '+' : ''}${modifier}</span>`;
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
      packageBase: Number(row.dataset.packageBase) || 0,
      backgroundLanguageBase: Number(row.dataset.backgroundLanguageBase) || 0,
      backgroundSpecialBase: Number(row.dataset.backgroundSpecialBase) || 0,
      backgroundItemBase: Number(row.dataset.backgroundItemBase) || 0,
      skillClass: row.dataset.skillClass || 'auto',
      ranks: (Number($('[name="skill-start"]', row).value) || 0) + developedSkillRanks(row, Number(row.dataset.pendingBuy || $('[name="skill-buy"]', row).value) || 0)
    })).filter(skill => skill.name || Number(skill.start) || Number(skill.buy));
    const visibleCategories = new Set($$('.category-row', $('#skills-list')).map(row => row.dataset.category));
    data.categoryRanks = Object.fromEntries($$('.category-record-row').flatMap(row => {
      const start = $('[name="record-start"]', row)?.value || '0';
      const buy = row.dataset.pendingBuy || $('[name="record-buy"]', row)?.value || '0';
      const special = $('[name="record-special"]', row).value;
      const special2 = $('[name="record-special2"]', row).value;
      const raceBase = Number(row.dataset.raceBase) || 0;
      const hobbySpent = Number(row.dataset.hobbySpent) || 0;
      const packageBase = Number(row.dataset.packageBase) || 0;
      const backgroundSpecialBase = Number(row.dataset.backgroundSpecialBase) || 0;
      const trainingItemBase = Number(row.dataset.trainingItemBase) || 0;
      return visibleCategories.has(row.dataset.category) || Number(start) || Number(buy) || Number(special) || Number(special2) || raceBase || hobbySpent || packageBase || backgroundSpecialBase || trainingItemBase
        ? [[row.dataset.category, {start, buy, special, special2, raceBase, hobbySpent, packageBase, backgroundSpecialBase, trainingItemBase}]] : [];
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
    if (!character.developmentLevel) form.elements.developmentLevel.value = String(Math.max(1, Number(character.level) || 1));
    syncLevelFromXp();
    makeStats(character.stats || {});
    if (!character.rolePhysicalGenerated) randomizePhysicalDetails(false);
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
    equipmentMessage = ''; equipmentSearch = ''; equipmentCategory = 'All';
    currentId = id; fillForm(character);
    const generated = ensureStatRoll();
    const missingMode = !form.elements.statPoolMode.value;
    if (missingMode) form.elements.statPoolMode.value = 'roll';
    if (generated || missingMode) saveCurrent();
    renderPlay(); selectPlayTab('character'); showView('play');
  }
  function newCharacter() {
    equipmentMessage = ''; equipmentSearch = ''; equipmentCategory = 'All';
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
    syncLevelFromXp();
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
      if (detail.kind === 'critical' || detail.kind === 'fumble') {
        const isFumble = detail.kind === 'fumble';
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</option>`).join('');
        $('#roll-label').textContent = isFumble ? detail.code === 'A-10.11.1' ? 'Fumble roll' : 'Failure roll' : 'Critical roll';
        const extendedRolls = isFumble ? detail.code === 'A-10.11.2' : ['.7','.8','.9'].some(suffix => detail.code.endsWith(suffix));
        $('#table-roll').max = extendedRolls ? '999' : '100';
        if (Number($('#table-roll').value) > Number($('#table-roll').max)) $('#table-roll').value = $('#table-roll').max;
        $('#column-select-field').firstChild.textContent = isFumble ? detail.code === 'A-10.11.1' ? 'Weapon type' : 'Spell type' : 'Critical type';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        $('.table-scroll').innerHTML = `<details class="full-critical-table" open><summary>Full ${isFumble ? detail.title.toLowerCase() : 'critical'} table</summary><div class="table-scroll-inner"><table id="attack-grid" class="critical-grid"></table></div></details>`;
        renderCriticalGrid(); updateCriticalLookup();
        $('#table-note').textContent = isFumble ? 'Choose the roll and weapon or spell type to see its result.' : 'H = hits · π = must parry · ∏ = no parry · ∑ = stunned · ∫ = bleed per round. A number before a symbol gives its amount or duration.';
      } else if (detail.columns && detail.rows) {
        const select = $('#table-column');
        select.innerHTML = detail.columns.map((column, index) => `<option value="${index}">${esc(column.group)} · ${esc(column.label)}</option>`).join('');
        $('#roll-label').textContent = 'Modified roll';
        $('#table-roll').max = '300';
        if (Number($('#table-roll').value) > 300) $('#table-roll').value = '300';
        $('#column-select-field').firstChild.textContent = detail.code === 'A-10.9.11' ? 'Target' : 'Target armor';
        $('.table-scroll').hidden = false; $('.lookup-controls').hidden = false; $('#lookup-result').hidden = false; $('#table-source').hidden = true;
        $('.table-scroll').innerHTML = `<details class="full-attack-table" open><summary>Full attack table</summary><div class="table-scroll-inner"><table id="attack-grid" class="attack-grid"></table></div></details>`;
        renderGrid(); updateLookup();
        $('#table-note').textContent = 'Hits and criticals are shown together (for example, 12E).';
      } else if (detail.categories && detail.professions) {
        $('.table-scroll').hidden = false; $('#table-source').hidden = true;
        $('#attack-grid').innerHTML = `<thead><tr><th>Skill category</th>${detail.professions.map(profession => `<th>${esc(profession)}</th>`).join('')}</tr></thead><tbody>${Object.entries(detail.categories).map(([category, costs]) => `<tr><th scope="row">${esc(category)}</th>${detail.professions.map(profession => `<td>${costs[profession] ? costs[profession].join('/') : '—'}</td>`).join('')}</tr>`).join('')}</tbody>`;
        $('#table-note').textContent = 'Rank costs by profession. Weapon costs may appear in a different category on a character sheet. A dash means unavailable.';
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
    const rows = activeTable.rows.map((row, rowIndex) => `<tr class="critical-row" data-row="${rowIndex}"><th scope="row">${esc(row.roll)}</th>${row.cells.map((cell, columnIndex) => `<td data-column="${columnIndex}"><p>${esc(cell.description)}</p>${cell.effect ? `<span class="critical-effect">${esc(cell.effect)}</span>` : ''}</td>`).join('')}</tr>`).join('');
    $('#attack-grid').innerHTML = `<thead><tr><th scope="col">Roll</th>${columns}</tr></thead><tbody>${rows}</tbody>`;
  }
  function updateCriticalLookup() {
    if (activeTable?.kind !== 'critical' && activeTable?.kind !== 'fumble') return;
    const roll = Math.max(1, Number($('#table-roll').value) || 1);
    const columnIndex = Number($('#table-column').value) || 0;
    const row = activeTable.rows.find(item => {
      const [start, end] = item.roll.split('-');
      return roll >= Number.parseInt(start, 10) && roll <= (end ? Number.parseInt(end, 10) : item.roll.endsWith('+') ? Infinity : Number.parseInt(start, 10));
    }) || activeTable.rows[activeTable.rows.length - 1];
    const column = activeTable.columns[columnIndex];
    const cell = row.cells[columnIndex];
    $('#lookup-result').innerHTML = `<div class="critical-lookup"><div class="critical-lookup-heading"><span>ROLL ${esc(roll)}${row.roll === String(roll) ? '' : ` · ${esc(row.roll)}`}</span><strong>${esc(column.group === 'Critical severity' || column.group === 'Weapon' ? column.label : `${column.group} · ${column.label}`)}</strong></div><p>${esc(cell.description)}</p>${cell.effect ? `<div class="critical-lookup-effect">${esc(cell.effect)}</div>` : ''}</div>`;
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
      const [tableResponse, costResponse, packageResponse, equipmentResponse] = await Promise.all([fetch('tables/index.json'), fetch('tables/T-2.8.json'), fetch('tables/apprenticeship-packages.json'), fetch('tables/A-7-equipment.json')]);
      if (!tableResponse.ok || !costResponse.ok || !packageResponse.ok) throw new Error('Reference files could not be loaded');
      tables = await tableResponse.json();
      developmentRules = await costResponse.json();
      trainingPackages = await packageResponse.json();
      if (equipmentResponse.ok) equipmentCatalog = (await equipmentResponse.json()).items || [];
      const draft = formData();
      renderCategoryRecord(draft);
      renderSkillTree(draft);
      renderTables();
      updateDevelopment();
      if ($('#play-view').classList.contains('active')) renderPlay();
      window.dispatchEvent(new Event('rolemaster-roster-updated'));
    } catch (error) {
      $('#table-list').innerHTML = '<p class="table-load-error">Table data could not be loaded. Serve this folder over HTTP and reload.</p>';
    }
  }
  function encounterRoster() {
    const parse = (value, fallback) => { try { return JSON.parse(value || ''); } catch { return fallback; } };
    return characters.map(character => {
      const totals = statNames.map((name, index) => {
        const stat = character.stats?.[name] || {};
        if (stat.total !== '' && stat.total !== undefined) return Number(stat.total) || 0;
        const temporary = Number(stat.temp);
        return temporary >= 1 ? basicStatBonus(temporary) + (raceStats[character.race]?.[index] || 0) + (Number(stat.special) || 0) : 0;
      });
      const categoryTotals = new Map();
      Object.entries(skillCategoryRules).forEach(([category, [stats, progression]]) => {
        const record = character.categoryRanks?.[category] || {};
        const ranks = (Number(record.start) || 0) + (Number(record.buy) || 0);
        const codes = stats === 'realm' ? [{Channeling:'In',Essence:'Em',Mentalism:'Pr'}[character.realm]] : stats.split('/');
        const statBonus = codes.reduce((sum, code) => sum + (totals[statAbbreviations[code]] || 0), 0);
        const profession = professionSkillBonuses[character.profession] || {};
        const group = categoryGroup(category);
        categoryTotals.set(category, (progression && progression !== 'standard' ? 0 : rankBonus(ranks, 'category')) + statBonus + (profession[category] ?? profession[group] ?? 0) + (Number(record.special) || 0) + (Number(record.special2) || 0));
      });
      const skills = (character.skills || []).filter(skill => skill.name && !skill.name.startsWith('Choose ')).map(skill => ({
        category:skill.category, name:skill.name, ranks:Number(skill.ranks) || 0,
        bonus:rankBonus(skill.ranks, skillCategoryRules[skill.category]?.[1] || 'standard') + (categoryTotals.get(skill.category) || 0) + (Number(skill.item) || 0) + (Number(skill.special) || 0)
      }));
      const armor = parse(character.startingArmor, null);
      const at = Array.isArray(armor) ? Number(armor[1]) || 1 : 1;
      const quickness = totals[8];
      const armorPenalty = armorTypes[at]?.[3] || 0;
      const db = (quickness > 0 ? Math.max(0, quickness * 3 - armorPenalty) : quickness * 3) + (Number(character.dbShield) || 0) + (Number(character.dbMagic) || 0) + (Number(character.dbSpecial) || 0);
      const resistances = Object.fromEntries(resistanceTypes.map(([key, , statIndex, raceIndex]) => [key, (raceResistances[character.race]?.[raceIndex] || 0) + 3 * totals[statIndex] + (Number(character[`rr-other-${key}`]) || 0)]));
      const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const weapons = parse(character.startingWeapons, []).flatMap(key => { const value = parse(key, null); return Array.isArray(value) ? [{category:value[0], name:value[1], source:'Starting'}] : []; });
      const inventory = parse(character.equipmentLedger, {});
      (inventory.items || []).forEach(entry => {
        const item = equipmentCatalog.find(candidate => candidate.id === entry.id);
        if (item?.category === 'Weapons') weapons.push({name:item.name, source:'Owned'});
      });
      const benefits = parse(character.trainingBenefits, {});
      parse(character.trainingSelections, []).forEach(name => {
        const pack = trainingPackages.find(item => item.name === name);
        const special = benefits[name]?.special || {};
        if (!pack) return;
        trainingSpecialAwards(pack, special).forEach(index => {
          const label = pack.specialItems[index][0], target = special.targets?.[index];
          if (/weapon/i.test(label) && (!/or armor/i.test(label) || target?.startsWith('Weapon •'))) weapons.push({name:special.notes?.[index] || label, category:target?.split(':')[0] || '', target, source:`${name} award`});
        });
      });
      const attacks = weapons.map(weapon => {
        const skill = skills.find(item => `${item.category}:${item.name}` === weapon.target) || skills.find(item => item.category === weapon.category && item.name === weapon.name) || skills.find(item => item.category.startsWith('Weapon •') && normalize(item.name) === normalize(weapon.name));
        return {...weapon, category:skill?.category || weapon.category || '', bonus:skill?.bonus || 0};
      });
      const height = strideBonus(character.roleHeight || '') || 0;
      return {id:character.id, name:character.name || 'Unnamed', race:character.race || '', profession:character.profession || '', realm:character.realm || 'None', level:Number(character.level) || 1, stats:totals, skills, attacks, at, db, shieldBonus:Number(character.dbShield) || 0, baseMove:50 + quickness * 3 + height, hitsMax:Number(character.hits) || 0, ppMax:Number(character.powerPoints) || 0, resistances};
    });
  }
  window.RolemasterEncounter = {roster:encounterRoster, openTable(code) { const reference = tables.find(item => item.code === code); if (reference) { showView('tables'); chooseTable(reference); } }};
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
  $('.brand').addEventListener('click', event => { event.preventDefault(); showView('encounter'); });
  $('#new-character').addEventListener('click', newCharacter);
  $('#empty-new-character').addEventListener('click', newCharacter);
  $('#back-play-roster').addEventListener('click', () => showView('home'));
  $('#edit-character').addEventListener('click', () => { showView('editor'); revealSelectedChoices(); });
  $('#open-play-view').addEventListener('click', () => {
    if (!form.elements.name.value.trim()) { form.elements.name.focus(); return; }
    saveCurrent(); renderPlay(); selectPlayTab('character'); showView('play');
  });
  $$('[data-play-tab]').forEach(button => button.addEventListener('click', () => selectPlayTab(button.dataset.playTab)));
  $('.play-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = $$('[data-play-tab]');
    const current = tabs.findIndex(tab => tab === document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectPlayTab(tabs[next].dataset.playTab);
    tabs[next].focus();
  });
  $$('[data-play-skill-filter]').forEach(button => button.addEventListener('click', () => { playSkillFilter = button.dataset.playSkillFilter; renderPlaySkills(); }));
  $('#play-view').addEventListener('click', event => {
    const tile = event.target.closest('[data-play-roll]');
    if (tile) openPlayRoll(tile);
  });
  $('#play-character-content').addEventListener('click', event => {
    if (event.target.closest('#advance-character-level')) { advanceLevel(); return; }
    if (event.target.closest('#spend-level-dp')) { showView('editor'); openApprenticeshipPicker(); return; }
    if (event.target.closest('#undo-xp-award')) {
      const history = readXpHistory(), latest = history.pop();
      if (!latest) return;
      form.elements.xp.value = String(latest.before);
      form.elements.xpHistory.value = JSON.stringify(history);
      saveCurrent(); renderPlay();
      return;
    }
    const categoryButton = event.target.closest('[data-equipment-category]');
    if (categoryButton) { equipmentCategory = categoryButton.dataset.equipmentCategory; renderEquipmentCatalog(); return; }
    const buy = event.target.closest('[data-equipment-buy]');
    const own = event.target.closest('[data-equipment-own]');
    const sell = event.target.closest('[data-equipment-sell]');
    if (!buy && !own && !sell) return;
    const ledger = readEquipmentLedger();
    if (sell) {
      const item = ledger.items.find(entry => entry.id === sell.dataset.equipmentSell);
      if (!item) return;
      ledger.adjustment += Math.floor(item.priceTin / 2);
      item.quantity--;
      ledger.items = ledger.items.filter(entry => entry.quantity > 0);
      equipmentMessage = `Sold one ${item.name} for ${formatMoney(Math.floor(item.priceTin / 2))}.`;
    } else {
      const id = buy?.dataset.equipmentBuy || own.dataset.equipmentOwn;
      const item = equipmentCatalog.find(entry => entry.id === id);
      if (!item) return;
      if (buy && equipmentBalance(ledger) < item.priceTin) { equipmentMessage = 'Not enough cash for this item.'; renderPlayEquipment(); return; }
      if (buy) ledger.adjustment -= item.priceTin;
      const owned = ledger.items.find(entry => entry.id === id);
      if (owned) owned.quantity++; else ledger.items.push({id, name:item.name, priceTin:item.priceTin, quantity:1});
      equipmentMessage = buy ? `Bought one ${item.name} for ${item.price}.` : `Added one ${item.name} to owned equipment.`;
    }
    writeEquipmentLedger(ledger);
  });
  $('#play-character-content').addEventListener('input', event => {
    if (event.target.id === 'equipment-search') { equipmentSearch = event.target.value; renderEquipmentCatalog(); }
  });
  $('#play-character-content').addEventListener('submit', event => {
    if (event.target.id === 'play-xp-form') {
      event.preventDefault();
      const amount = Number(event.target.elements.amount.value);
      const before = Number(form.elements.xp.value) || 0;
      if (!Number.isSafeInteger(amount) || !amount || !Number.isSafeInteger(before + amount) || before + amount < 0) return;
      const history = readXpHistory();
      history.push({before, amount, reason:event.target.elements.reason.value.trim(), date:new Date().toLocaleDateString()});
      form.elements.xpHistory.value = JSON.stringify(history);
      form.elements.xp.value = String(before + amount);
      saveCurrent(); renderPlay();
      return;
    }
    if (event.target.id !== 'equipment-cash-form') return;
    event.preventDefault();
    const cash = coinUnits.reduce((sum, [unit, value]) => sum + Number(event.target.elements[`equipment-cash-${unit}`].value) * value, 0);
    if (!Number.isSafeInteger(cash) || cash < 0) return;
    const ledger = readEquipmentLedger();
    ledger.adjustment = cash - startingMoneyTin();
    equipmentMessage = `Cash set to ${formatMoney(cash)}.`;
    writeEquipmentLedger(ledger);
  });
  $('#close-play-skill-roll').addEventListener('click', () => $('#play-skill-roll').close());
  $('#roll-play-skill').addEventListener('click', () => {
    if (!activePlayRoll) return;
    if (activePlayRoll.kind === 'resistance') {
      const resistanceRoll = rollD100();
      playDice = {rolls:[resistanceRoll], total:resistanceRoll};
    } else playDice = rollOpenEndedD100();
    updatePlayRollResult();
  });
  $('#play-skill-roll-modifier').addEventListener('input', updatePlayRollResult);
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
  $('#hide-non-favorites').addEventListener('change', updateA4Visibility);
  $('#category-record-list').addEventListener('click', event => {
    const button = event.target.closest('.favorite-skill');
    if (!button) return;
    const row = button.closest('.a4-skill-row');
    const key = favoriteSkillKey(row.dataset.category, row.dataset.skill);
    const favorites = readFavoriteSkills();
    if (favorites.has(key)) favorites.delete(key); else favorites.add(key);
    form.elements.favoriteSkills.value = JSON.stringify([...favorites]);
    const selected = favorites.has(key);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${selected ? 'Remove' : 'Add'} ${row.dataset.skill} ${selected ? 'from' : 'to'} favorites`);
    button.title = selected ? 'Remove from favorites' : 'Add to favorites';
    button.textContent = selected ? '★' : '☆';
    updateA4Visibility();
    saveCurrent();
  });
  const openLanguagePicker = () => { renderLanguagePicker(); $('#language-picker').showModal(); };
  const openHobbyPicker = () => { renderHobbyPicker(); $('#hobby-picker').showModal(); };
  const openApprenticeshipPicker = () => {
    const advancing = currentDevelopmentLevel() > 1;
    $('#apprenticeship-picker-title').textContent = advancing ? `Level ${currentDevelopmentLevel()} development` : 'Apprenticeship development';
    $('#apprenticeship-picker-subtitle').textContent = advancing ? 'Section 9.0 · Spend this level’s development points' : 'Section 6.0 · One level of development';
    $('#apprenticeship-package-list').closest('details').hidden = advancing;
    $('#apprenticeship-search').value = '';
    $('#apprenticeship-add-message').textContent = '';
    $('#apprenticeship-category-options').innerHTML = Object.keys(skillCategoryRules).map((category, index) => `<label class="choice-tile"><input type="radio" name="apprenticeshipCategory" value="${esc(category)}"${index === 0 ? ' checked' : ''}><span>${esc(category)}</span></label>`).join('');
    renderApprenticeshipPicker();
    $('#apprenticeship-picker').showModal();
    renderApprenticeshipStatGains();
    renderTrainingPackages();
    $('#apprenticeship-package-list').closest('details').open = !advancing && readTrainingSelections().length > 0;
    renderWeaponCostAssignments();
  };
  const openBackgroundPicker = () => { renderBackgroundPicker(); $('#background-picker').showModal(); };
  $('#open-language-picker').addEventListener('click', openLanguagePicker);
  $('#open-hobby-picker').addEventListener('click', openHobbyPicker);
  $('#open-apprenticeship-picker').addEventListener('click', openApprenticeshipPicker);
  $('#open-background-picker').addEventListener('click', openBackgroundPicker);
  $('#creation-steps').addEventListener('click', event => {
    if (event.target.closest('[data-open-language-picker]')) openLanguagePicker();
    if (event.target.closest('[data-open-hobby-picker]')) openHobbyPicker();
    if (event.target.closest('[data-open-apprenticeship-picker]')) openApprenticeshipPicker();
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
  $('#close-apprenticeship-picker').addEventListener('click', () => $('#apprenticeship-picker').close());
  $('#apprenticeship-search').addEventListener('input', updateApprenticeshipVisibility);
  for (const id of ['hide-zero-apprenticeship-skills','hide-zero-apprenticeship-categories']) {
    $(`#${id}`).addEventListener('click', event => {
      const button = event.currentTarget;
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
      updateApprenticeshipVisibility();
    });
  }
  $('#apprenticeship-picker-list').addEventListener('change', event => { if (event.target.matches('input[data-kind]')) updateApprenticeshipAllocation(event.target); });
  $('#apprenticeship-picker-list').addEventListener('change', event => {
    const select = event.target.closest('select[data-skill-class]');
    if (!select) return;
    const row = findSkillRow(select.dataset.category, select.dataset.skillClass);
    if (!row) return;
    row.dataset.skillClass = select.value;
    updateDevelopment();
    renderApprenticeshipPicker();
    saveCurrent();
  });
  $('#apprenticeship-package-list').addEventListener('click', event => {
    const itemButton = event.target.closest('button[data-training-item-target]');
    if (itemButton) {
      const pack = trainingPackages.find(entry => entry.name === itemButton.dataset.trainingItemTarget);
      const index = Number(itemButton.dataset.itemIndex);
      const special = readTrainingBenefits()[pack?.name]?.special;
      const effect = pack && trainingSpecialAwards(pack, special).includes(index) && trainingItemEffect(pack.specialItems[index][0]);
      if (!effect || effect.kind === 'fixed') return;
      trainingItemTarget = {pack:pack.name, index, kind:effect.kind};
      $('#training-item-subtitle').textContent = `${pack.specialItems[index][0]} · +${effect.bonus}`;
      $('#training-item-search').value = '';
      $('#training-item-options').innerHTML = trainingItemCandidates(effect.kind).map(([key, label]) => `<button type="button" data-training-target="${esc(key)}" aria-pressed="${special.targets?.[index] === key}">${esc(label)}</button>`).join('');
      $('#training-item-picker').showModal();
      $('#training-item-search').focus();
      return;
    }
    const benefitButton = event.target.closest('button[data-training-money-roll], button[data-training-money-fixed], button[data-training-special-roll], button[data-training-special-last]');
    if (benefitButton) {
      if (benefitButton.hasAttribute('data-training-money-roll')) {
        changeTrainingBenefit(benefitButton.dataset.trainingMoneyRoll, (entry, pack) => {
          const dice = /open-ended/i.test(pack.startingMoney) ? rollOpenEndedD10() : {rolls:[rollD10()]};
          entry.money = {mode:'rolled', rolls:dice.rolls, total:dice.total ?? dice.rolls[0]};
        });
      } else if (benefitButton.hasAttribute('data-training-money-fixed')) {
        changeTrainingBenefit(benefitButton.dataset.trainingMoneyFixed, entry => { entry.money = {mode:'fixed', rolls:[], total:6}; });
      } else if (benefitButton.hasAttribute('data-training-special-roll')) {
        changeTrainingBenefit(benefitButton.dataset.trainingSpecialRoll, (entry, pack) => { entry.special = rollTrainingSpecials(pack); });
      } else if (benefitButton.hasAttribute('data-training-special-last')) {
        changeTrainingBenefit(benefitButton.dataset.trainingSpecialLast, (entry, pack) => {
          const last = pack.specialItems.length - 1;
          entry.special = {mode:'last', rows:[], notes:entry.special?.notes?.[last] ? {[last]:entry.special.notes[last]} : {}, targets:entry.special?.targets?.[last] ? {[last]:entry.special.targets[last]} : {}, itemDice:{[last]:rollItemDice(pack.specialItems[last][0])}};
        });
      }
      return;
    }
    const categoryButton = event.target.closest('button[data-package-category]');
    if (categoryButton) {
      const name = categoryButton.dataset.package;
      const id = categoryButton.dataset.rule;
      const choices = readTrainingChoices();
      choices[name] ||= {};
      const next = choices[name][id] === categoryButton.dataset.packageCategory ? '' : categoryButton.dataset.packageCategory;
      choices[name][id] = next;
      (packageChoiceRules[name] || []).filter(rule => rule[2] === `@${id}`).forEach(rule => { delete choices[name][rule[0]]; });
      form.elements.trainingChoiceSelections.value = JSON.stringify(choices);
      applyTrainingGrants(); renderTrainingPackages(); saveCurrent();
      return;
    }
    const button = event.target.closest('button[data-package]');
    if (button) toggleTrainingPackage(button.dataset.package);
  });
  $('#close-training-item-picker').addEventListener('click', () => $('#training-item-picker').close());
  $('#training-item-picker').addEventListener('close', () => { trainingItemTarget = null; });
  $('#training-item-search').addEventListener('input', event => {
    const needle = event.target.value.trim().toLowerCase();
    $$('#training-item-options button').forEach(button => { button.hidden = !button.textContent.toLowerCase().includes(needle); });
  });
  $('#training-item-options').addEventListener('click', event => {
    const button = event.target.closest('button[data-training-target]');
    if (!button || !trainingItemTarget) return;
    const {pack, index} = trainingItemTarget;
    changeTrainingBenefit(pack, entry => {
      entry.special.targets ||= {};
      entry.special.targets[index] = button.dataset.trainingTarget;
    });
    $('#training-item-picker').close();
  });
  $('#weapon-cost-picker-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-weapon-cost-source]');
    if (button) swapWeaponCostAssignment(button.dataset.weaponCostCategory, button.dataset.weaponCostSource);
  });
  $('#apprenticeship-package-list').addEventListener('change', event => {
    const grantLast = event.target.closest('input[data-training-grant-last]');
    if (grantLast) {
      changeTrainingBenefit(grantLast.dataset.trainingGrantLast, (entry, pack) => {
        if (entry.special?.mode === 'rolled') {
          entry.special.grantLast = grantLast.checked;
          if (grantLast.checked) {
            const last = pack.specialItems.length - 1;
            entry.special.itemDice ||= {};
            entry.special.itemDice[last] ||= rollItemDice(pack.specialItems[last][0]);
          }
        }
      });
      return;
    }
    const benefitNote = event.target.closest('input[data-training-benefit-note]');
    if (benefitNote) {
      changeTrainingBenefit(benefitNote.dataset.trainingBenefitNote, entry => {
        if (!entry.special) return;
        entry.special.notes ||= {};
        const note = benefitNote.value.trim();
        if (note) entry.special.notes[benefitNote.dataset.itemIndex] = note;
        else delete entry.special.notes[benefitNote.dataset.itemIndex];
      });
      return;
    }
    const input = event.target.closest('input[data-package-skill]');
    if (!input) return;
    const name = input.dataset.package;
    const id = input.dataset.rule;
    const rule = (packageChoiceRules[name] || []).find(item => item[0] === id);
    if (!rule) return;
    const choices = readTrainingChoices();
    choices[name] ||= {};
    const selected = choices[name][id] && typeof choices[name][id] === 'object' ? choices[name][id] : {};
    const previous = Number(selected[input.dataset.packageSkill]) || 0;
    const used = Object.values(selected).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const distinct = Object.values(selected).filter(value => Number(value) > 0).length;
    const requested = Number(input.value);
    const next = Math.max(0, Math.min(Number.isInteger(requested) ? requested : 0, rule[3] - used + previous));
    if (next && !previous && distinct >= rule[4]) selected[input.dataset.packageSkill] = 0;
    else if (next) selected[input.dataset.packageSkill] = next;
    else delete selected[input.dataset.packageSkill];
    choices[name][id] = selected;
    form.elements.trainingChoiceSelections.value = JSON.stringify(choices);
    applyTrainingGrants(); renderTrainingPackages(); saveCurrent();
  });
  $('#apprenticeship-stat-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-stat-index]');
    if (button) buyStatGain(Number(button.dataset.statIndex), button.dataset.freePackage || '', button.dataset.freeGrant || '');
  });
  $('#apprenticeship-stat-history').addEventListener('click', event => {
    if (event.target.id !== 'undo-stat-gain') return;
    const history = readStatGainHistory();
    const last = history.pop();
    if (!last) return;
    if (last.source?.startsWith('level:') || (Number(last.level) || 1) !== currentDevelopmentLevel()) return;
    form.elements.namedItem(`stat-temp-${statNames.indexOf(last.stat)}`).value = String(last.before);
    form.elements.statGainHistory.value = JSON.stringify(history);
    updateDevelopment();
    saveCurrent();
  });
  $('#apprenticeship-add-skill').addEventListener('click', () => {
    const category = $('#apprenticeship-category-options input:checked')?.value;
    const name = $('#apprenticeship-skill-name').value.trim();
    if (!category || !name || name.startsWith('Choose ')) {
      $('#apprenticeship-add-message').textContent = 'Choose a category and enter a skill name.';
      return;
    }
    if (!categoryCosts(category)) {
      $('#apprenticeship-add-message').textContent = `${category} is unavailable to ${form.elements.profession.value}.`;
      return;
    }
    if (!findSkillRow(category, name)) skillRow({category, name});
    $('#apprenticeship-add-message').textContent = `${name} is available in the skill list below.`;
    $('#apprenticeship-skill-name').value = '';
    updateDevelopment();
    renderApprenticeshipPicker();
    renderTrainingPackages();
    saveCurrent();
  });
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
  $('#background-add-skill').addEventListener('click', () => {
    const category = $('#background-skill-category-options input:checked')?.value;
    const name = $('#background-skill-name').value.trim();
    if (!category || !name || name.startsWith('Choose ')) {
      $('#background-option-message').textContent = 'Choose a category and enter a skill name.';
      return;
    }
    if (!findSkillRow(category, name)) skillRow({category, name});
    $('#background-skill-name').value = '';
    $('#background-option-message').textContent = `${name} is available as a bonus target.`;
    saveCurrent(); renderBackgroundOptionDetails();
  });
  $('#background-option-details').addEventListener('input', event => {
    if (!event.target.matches('input[data-background-target-search]')) return;
    const term = event.target.value.trim().toLowerCase();
    $$('button[data-background-target]', event.target.closest('.background-target-picker')).forEach(button => { button.hidden = !button.dataset.search.includes(term); });
  });
  $('#background-option-details').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const index = Number(button.dataset.backgroundIndex);
    const key = button.dataset.backgroundKey;
    if (button.hasAttribute('data-background-undo-stat')) {
      const statIndex = Number(button.dataset.backgroundUndoStat);
      const history = readStatGainHistory();
      const position = history.findIndex(item => item.source === `background:${index}` && item.stat === statNames[statIndex]);
      if (position < 0) return;
      if (history.slice(position + 1).some(item => item.stat === statNames[statIndex])) {
        $('#background-option-message').textContent = 'Undo later rolls for this stat first.';
        return;
      }
      form.elements.namedItem(`stat-temp-${statIndex}`).value = String(history[position].before);
      history.splice(position, 1);
      form.elements.statGainHistory.value = JSON.stringify(history);
      saveCurrent(); renderBackgroundOptionDetails();
    } else if (button.hasAttribute('data-background-stat')) {
      buyStatGain(Number(button.dataset.backgroundStat), `background:${index}`, `stat:${button.dataset.backgroundStat}`);
    } else if (button.hasAttribute('data-background-target')) {
      const target = button.dataset.backgroundTarget;
      if (key === 'skillBonus' || key === 'categoryBonus') {
        const details = readBackgroundDetails();
        if ((details[key] || []).some((entry, position) => position !== index && entry?.target === target)) {
          $('#background-option-message').textContent = 'That target already has this background bonus.';
          return;
        }
      }
      changeBackgroundEntry(key, index, entry => {
        if (button.hasAttribute('data-background-effect')) entry.effects[Number(button.dataset.backgroundEffect)].target = target;
        else entry.target = target;
      });
    } else if (button.dataset.backgroundRoll === 'money') {
      changeBackgroundEntry('rolledMoney', index, entry => {
        if (entry.roll) return;
        entry.roll = Math.floor(Math.random() * 100) + 1;
        entry.amount = backgroundMoneyAmount(entry.roll);
      });
    } else if (button.dataset.backgroundRoll === 'item') {
      changeBackgroundEntry('rolledItem', index, entry => {
        if (entry.roll) return;
        entry.roll = Math.floor(Math.random() * 100) + 1;
        entry.tier = backgroundItems.indexOf(backgroundItemTier(entry.roll));
      });
    } else if (button.hasAttribute('data-background-money')) {
      changeBackgroundEntry('chosenMoney', index, entry => { entry.amount = Number(button.dataset.backgroundMoney); });
    } else if (button.hasAttribute('data-background-item-tier')) {
      changeBackgroundEntry('chosenItem', index, entry => {
        entry.tier = Number(button.dataset.backgroundItemTier);
        entry.choice = ''; entry.description = ''; entry.effects = [];
      });
    } else if (button.hasAttribute('data-background-item-choice')) {
      changeBackgroundEntry(key, index, entry => {
        entry.choice = button.dataset.backgroundItemChoice;
        entry.description = ''; entry.effects = [];
        const bonus = Number(/\+(\d+)\s+(?:non-magic|magic)\s+items?/i.exec(entry.choice)?.[1]) || 0;
        if (bonus) {
          const count = /^Two\b/i.test(entry.choice) ? 2 : /^Three\b/i.test(entry.choice) ? 3 : 1;
          entry.effects = Array.from({length:count}, () => ({target:'', bonus}));
        }
      });
    } else if (button.hasAttribute('data-background-add-effect')) {
      changeBackgroundEntry(key, index, entry => {
        entry.effects ||= [];
        entry.effects.push({target:'', bonus:Number(/\+(\d+)/.exec(entry.choice || '')?.[1]) || 0});
      });
    } else if (button.hasAttribute('data-background-remove-effect')) {
      changeBackgroundEntry(key, index, entry => { entry.effects?.splice(Number(button.dataset.backgroundEffect), 1); });
    }
  });
  $('#background-option-details').addEventListener('change', event => {
    const input = event.target;
    const index = Number(input.dataset.backgroundIndex);
    if (input.hasAttribute('data-background-language')) {
      const name = input.dataset.backgroundLanguage;
      const language = (backgroundExtraLanguages[form.elements.race.value] || []).find(([label]) => name.startsWith(`${label} (`));
      if (!language) return;
      const cap = name.endsWith('(spoken)') ? language[1] : language[2];
      const details = readBackgroundDetails();
      const entry = backgroundEntry(details, 'extraLanguages', index);
      const allocations = entry.allocations || {};
      const previous = Number(allocations[name]) || 0;
      const used = Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const row = findSkillRow('Communications', name);
      const currentTotal = Number($('[name="skill-start"]', row)?.value) || 0;
      const requested = Number(input.value);
      const next = Math.max(0, Math.min(Number.isInteger(requested) ? requested : 0, 20 - used + previous, cap - currentTotal + previous));
      changeBackgroundEntry('extraLanguages', index, item => {
        item.allocations ||= {};
        if (next) item.allocations[name] = next; else delete item.allocations[name];
      });
    } else if (input.hasAttribute('data-background-item-description')) {
      changeBackgroundEntry(input.dataset.backgroundKey, index, entry => { entry.description = input.value.trim(); });
    } else if (input.hasAttribute('data-background-item-bonus')) {
      changeBackgroundEntry(input.dataset.backgroundKey, index, entry => {
        entry.effects[Number(input.dataset.backgroundEffect)].bonus = Math.max(0, Math.min(30, Math.round(Number(input.value) || 0)));
      });
    }
  });
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
  $('#character-role').addEventListener('click', event => {
    const kind = event.target.closest('button[data-roll-role]')?.dataset.rollRole;
    if (kind) rollRoleTrait(kind);
  });
  $('#roll-appearance').addEventListener('click', () => {
    form.elements.appearanceDice.value = Array.from({length:5}, rollD10).join(',');
    form.elements.appearanceTemp.value = '';
    saveCurrent();
  });
  $('#randomize-physical').addEventListener('click', () => { randomizePhysicalDetails(); saveCurrent(); });
  $('#final-weapon-options').addEventListener('click', event => {
    const button = event.target.closest('button[data-starting-weapon]');
    if (!button) return;
    const key = button.dataset.startingWeapon;
    const weapons = readStartingWeapons();
    const next = weapons.includes(key) ? weapons.filter(value => value !== key) : weapons.length < 2 ? [...weapons, key] : weapons;
    form.elements.startingWeapons.value = JSON.stringify(next);
    saveCurrent();
  });
  $('#final-armor-options').addEventListener('click', event => {
    const button = event.target.closest('button[data-starting-armor]');
    if (!button) return;
    form.elements.startingArmor.value = button.dataset.startingArmor;
    saveCurrent();
  });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    if (event.target.name === 'xp') syncLevelFromXp();
    const match = /^stat-temp-(\d+)$/.exec(event.target.name || '');
    if (match) updatePotentialStat(Number(match[1]), form.elements.potentialMethod.value === 'roll' ? rolledPotential : fixedPotential);
    showEditedCategory(event.target);
    syncA4SkillToTree(event.target);
    saveCurrent();
  });
  form.addEventListener('change', event => {
    showEditedCategory(event.target);
    syncA4SkillToTree(event.target);
    if (event.target.name === 'race') {
      applyRaceAdolescence(event.target.value);
      randomizePhysicalDetails(false);
      const details = readBackgroundDetails();
      if (details.extraLanguages) { details.extraLanguages = []; writeBackgroundDetails(details); }
    }
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
  $('#table-roll').addEventListener('input', () => activeTable?.kind === 'critical' || activeTable?.kind === 'fumble' ? updateCriticalLookup() : updateLookup());
  $('#table-column').addEventListener('change', () => activeTable?.kind === 'critical' || activeTable?.kind === 'fumble' ? updateCriticalLookup() : updateLookup());
})();
