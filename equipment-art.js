// Decorative, original pixel icons; names and mechanics remain the source of truth.
export function equipmentProfile(name='') {
  const rules=[
    [/crossbow|ballista/i,'crossbow'],[/quiver|arrows?|bolts?/i,'quiver'],[/bow/i,'bow'],[/sling/i,'sling'],
    [/dagger|knife|dirk/i,'dagger'],[/sword|scimitar|rapier|falchion|sabre|edged/i,'sword'],
    [/axe|hatchet/i,'axe'],[/hammer|mattock/i,'hammer'],[/mace|morning.star|flail|club|concussion/i,'mace'],
    [/spear|javelin|lance|halberd|pole|pike/i,'spear'],[/staff|wand|rod\b/i,'staff'],
    [/shield/i,'shield'],[/helm|visor/i,'helmet'],[/boot|shoe|sandal/i,'boots'],[/glove|gauntlet/i,'gloves'],
    [/cloak|cape/i,'cloak'],[/robe|tunic|clothing/i,'robe'],[/leather|hide/i,'leather'],[/armor|armour|mail|plate|greave|bracer/i,'armor'],
    [/potion|flask|bottle|vial/i,'potion'],[/rope|cord/i,'rope'],[/torch|lantern/i,'torch'],[/book|scroll|paper/i,'book'],
    [/ring|jewel|amulet/i,'ring'],[/pack|bag|sack|pouch/i,'pack']];
  return rules.find(([pattern])=>pattern.test(name))?.[1]||'item';
}
export function equipmentIcon(name) {
  return `<svg class="equipment-pixel-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><use href="assets/coliseum/equipment.svg#${equipmentProfile(name)}"></use></svg>`;
}
