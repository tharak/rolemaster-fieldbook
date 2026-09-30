import {readFileSync, writeFileSync} from 'node:fs';

// Run pdftotext -layout on the bundled rules PDF, then pass its text file here.
const source = readFileSync(process.argv[2], 'utf8');
const appendix = source.slice(source.indexOf('ACCESSORY CHART'), source.indexOf('HERB CHART'));
const multipliers = {tp:1, cp:10, bp:100, sp:1000, gp:10000};
const categoryFor = id => id < 100 ? 'Accessories' : id < 200 ? 'Armor' : id < 400 ? 'Provisions' : id < 500 ? 'Transport' : 'Weapons';
const included = id => id >= 1 && id <= 73 || id >= 101 && id <= 135 || id >= 309 && id <= 312 || id >= 401 && id <= 429 || id >= 500 && id <= 558;
const goods = [];
for (const line of appendix.split('\n')) {
  const match = /(?:^|\s)(\d{3})\s+(?:\[[^\]]+\]\s+)?(.+?)\s{2,}(\d+)(gp|sp|bp|cp|tp)\b/.exec(line);
  if (!match) continue;
  const id = Number(match[1]);
  if (!included(id)) continue;
  const name = match[2].trim().replace(/\s+(?:\d{1,2}|—)$/, '').replace(/\*$/, '');
  goods.push({id:match[1], category:categoryFor(id), name, price:`${match[3]} ${match[4]}`, priceTin:Number(match[3]) * multipliers[match[4]]});
}
// The OCR splits these three rows across lines.
goods.push({id:'072', category:'Accessories', name:'Wire (10 gauge)', price:'9 bp', priceTin:9 * multipliers.bp});
goods.push({id:'073', category:'Accessories', name:'Whistle', price:'2 sp', priceTin:2 * multipliers.sp});
if (goods.length !== 200 || new Set(goods.map(item => item.id)).size !== goods.length) throw new Error(`Unexpected catalog: ${goods.length} rows`);
goods.sort((a, b) => Number(a.id) - Number(b.id));
writeFileSync('tables/A-7-equipment.json', JSON.stringify({source:'Rolemaster Core Rules, Appendix A-7, pp. 145–148', currency:'tin pieces', items:goods}, null, 2) + '\n');
