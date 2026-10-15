// Decode structured character fields at the boundary between storage and rules.
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function parseJSON(value) {
  try { return JSON.parse(value || ''); } catch { return undefined; }
}

export function parseList(value) {
  const parsed = parseJSON(value);
  return Array.isArray(parsed) ? parsed : [];
}

export function parseRecord(value) {
  const parsed = parseJSON(value);
  return isRecord(parsed) ? parsed : {};
}

export function equipmentLedger(value) {
  const record = parseRecord(value);
  return {
    adjustment:Number.isSafeInteger(record.adjustment) ? record.adjustment : 0,
    items:(Array.isArray(record.items) ? record.items : [])
      .filter(item => isRecord(item) && typeof item.id === 'string' && Number.isSafeInteger(item.quantity) && item.quantity > 0 && Number.isSafeInteger(item.priceTin) && item.priceTin >= 0)
      .map(item => ({id:item.id, name:String(item.name || ''), priceTin:item.priceTin, quantity:item.quantity}))
  };
}
