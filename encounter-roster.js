import {readCampaign,skillAllowed,weaponAllowed,fixedSkillBonus,campaignHits} from './campaign-rules.js';
// Project saved characters into encounter actors.
import {statNames, raceStats, raceResistances, resistanceTypes, skillCategoryRules, statAbbreviations, professionSkillBonuses, armorTypes} from './app-data.js';
import {basicStatBonus, strideBonus, trainingSpecialAwards, categoryGroup} from './character-rules.js';
import {rankBonus} from './rules.js';
import {isRecord, parseList, parseRecord, equipmentLedger} from './character-record.js';

export function buildEncounterRoster(characters, {equipmentCatalog = [], trainingPackages = [], campaign=readCampaign()} = {}) {
  return characters.filter(isRecord).map(character => {
    const totals = statNames.map((name, index) => {
      const stat = character.stats?.[name] || {};
      if (stat.total !== '' && stat.total != null) return Number(stat.total) || 0;
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
    const skills = (Array.isArray(character.skills) ? character.skills : []).filter(skill => isRecord(skill) && typeof skill.name === 'string' && typeof skill.category === 'string' && skillAllowed(skill.category,skill.name,campaign) && skill.name && !skill.name.startsWith('Choose ')).map(skill => ({
      category:skill.category, name:skill.name, ranks:Number(skill.ranks) || 0,
      bonus:rankBonus(skill.ranks, skillCategoryRules[skill.category]?.[1] || 'standard') + (categoryTotals.get(skill.category) || 0) + (Number(skill.item) || 0) + (Number(skill.special) || 0) + fixedSkillBonus(skill.category,campaign)
    }));
    const armor = parseList(character.startingArmor);
    const at = Array.isArray(armor) ? Number(armor[1]) || 1 : 1;
    const quickness = totals[8];
    const armorPenalty = armorTypes[at]?.[3] || 0;
    const db = (quickness > 0 ? Math.max(0, quickness * 3 - armorPenalty) : quickness * 3) + (Number(character.dbShield) || 0) + (Number(character.dbMagic) || 0) + (Number(character.dbSpecial) || 0);
    const resistances = Object.fromEntries(resistanceTypes.map(([key, , statIndex, raceIndex]) => [key, (raceResistances[character.race]?.[raceIndex] || 0) + 3 * totals[statIndex] + (Number(character[`rr-other-${key}`]) || 0)]));
    const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const weapons = parseList(character.startingWeapons).flatMap(key => {
      const value = parseList(key);
      return value.length === 2 && value.every(part => typeof part === 'string') ? [{category:value[0], name:value[1], source:'Starting'}] : [];
    });
    const inventory = equipmentLedger(character.equipmentLedger);
    const equipmentNames = (inventory.items || []).map(entry => equipmentCatalog.find(candidate => candidate.id === entry.id)?.name || entry.name || '').filter(Boolean);
    (inventory.items || []).forEach(entry => {
      const item = equipmentCatalog.find(candidate => candidate.id === entry.id);
      if (item?.category === 'Weapons') weapons.push({name:item.name, source:'Owned'});
    });
    const benefits = parseRecord(character.trainingBenefits);
    parseList(character.trainingSelections).filter(name => typeof name === 'string').forEach(name => {
      const pack = trainingPackages.find(item => item.name === name);
      const special = benefits[name]?.special || {};
      if (!pack) return;
      trainingSpecialAwards(pack, special).forEach(index => {
        const label = pack.specialItems[index][0], target = special.targets?.[index];
        if (/weapon/i.test(label) && (!/or armor/i.test(label) || target?.startsWith('Weapon •'))) weapons.push({name:special.notes?.[index] || label, category:target?.split(':')[0] || '', target, source:`${name} award`});
      });
    });
    const attacks = weapons.filter(w=>weaponAllowed(w.name,campaign)&&skillAllowed(w.category||'',w.name,campaign)).map(weapon => {
      const skill = skills.find(item => `${item.category}:${item.name}` === weapon.target) || skills.find(item => item.category === weapon.category && item.name === weapon.name) || skills.find(item => item.category.startsWith('Weapon •') && normalize(item.name) === normalize(weapon.name));
      return {...weapon, category:skill?.category || weapon.category || '', bonus:skill?.bonus || 0};
    });
    const height = strideBonus(character.roleHeight || '') || 0;
    return {id:character.id, name:character.name || 'Unnamed', race:character.race || '', profession:character.profession || '', realm:character.realm || 'None', level:Number(character.level) || 1, stats:totals, constitution:Number(character.stats?.Constitution?.temp) || 0, skills, attacks, equipmentNames, at, db, shieldBonus:Number(character.dbShield) || 0, baseMove:50 + quickness * 3 + height, hitsMax:campaignHits(character,campaign), ppMax:Number(character.powerPoints) || 0, resistances};
  });
}
