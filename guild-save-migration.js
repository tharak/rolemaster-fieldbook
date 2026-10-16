import {validGuild} from './guild-rules.js';
import {prepareGuildMaster} from './guildmaster-rules.js';
export const adventureGuildKey='rolemaster-guild-v1';
export const guildMasterKey='rolemaster-guildmaster-v1';
// Preserve the previously shared GuildMaster progress before detaching both saves.
// Write the new mode first; a failed write never discards the original progress.
export function splitLegacyGuild(storage){
 const raw=storage.getItem(adventureGuildKey);if(!raw)return;
 const old=JSON.parse(raw);if(!validGuild(old))throw new Error('The saved guild could not be read. Your save has been retained.');
 if(!storage.getItem(guildMasterKey))storage.setItem(guildMasterKey,JSON.stringify(prepareGuildMaster(old)));
 if(old.management){delete old.management;storage.setItem(adventureGuildKey,JSON.stringify(old));}
}
