import {validGuild} from './guild-rules.js';
import {splitLegacyGuild,guildMasterKey} from './guild-save-migration.js';
export const guildStorageKey=guildMasterKey;
export function readGuild(){
 // An existing independent save does not depend on the old mode being readable.
 if(!localStorage.getItem(guildStorageKey))splitLegacyGuild(localStorage);
 const raw=localStorage.getItem(guildStorageKey);if(!raw)return null;
 const state=JSON.parse(raw);if(!validGuild(state)||state.mode!=='guildmaster'||state.expedition)throw new Error('The GuildMaster save could not be read. Your save has been retained.');return state;
}
export function writeGuild(state){
 if(!validGuild(state)||state.mode!=='guildmaster'||state.expedition)throw new Error('GuildMaster could not save this state.');
 localStorage.setItem(guildStorageKey,JSON.stringify(state));
}
