// Role traits, appearance, and physical details for the current character.
import {personalityRanges, motivationRanges, alignmentRanges, racePhysicalProfiles} from './app-data.js';
import {rollD10, rollD100} from './rules.js';
import {$} from './dom.js';

export function createCharacterRole({form, getTrainingPackages, readTrainingSelections, saveCurrent}) {
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
    const months = readTrainingSelections().reduce((sum, name) => sum + (getTrainingPackages().find(pack => pack.name === name)?.months || 0), 0);
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
  return {updateAppearance, updatePhysicalSource, randomizePhysicalDetails};
}
