// Guild campaign prices in gold; resale is half price, rounded down.
import {guildItems} from './guild-rules.js';
export const shopPrices={sword:8,mace:6,staff:2,bow:10,shield:5,helmet:4,leather:12,chain:30,plate:60};
export const shopStock=guildItems.map(item=>({...item,price:shopPrices[item.key]}));
export function salePrice(item){return Math.floor(((shopPrices[item.key]||0)+Math.max(0,item.bonus||0)*10)/2);}
export function buyGuildItem(state,key){
 const item=shopStock.find(i=>i.key===key);if(!item)throw new Error('This item is not for sale.');
 if(state.gold<item.price)throw new Error('Not enough gold.');
 const next=structuredClone(state);next.gold-=item.price;
 const {price,...equipment}=item;next.inventory.push({...equipment,id:`item-${next.nextId++}`,bonus:0});return next;
}
export function sellGuildItem(state,id){
 const item=state.inventory.find(i=>i.id===id);if(!item)throw new Error('This item is no longer in the guild store.');
 if(state.members.some(m=>Object.values(m.equipped).includes(id)))throw new Error('Unequip this item before selling it.');
 if(!salePrice(item))throw new Error('The shop will not buy this item.');
 const next=structuredClone(state);next.inventory=next.inventory.filter(i=>i.id!==id);next.gold+=salePrice(item);return next;
}
