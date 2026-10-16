import {splitLegacyGuild} from './guild-save-migration.js';
import {validGuild} from './guild-rules.js';
export const guildStorageKey='rolemaster-guild-v1';
export function readGuild(){
 splitLegacyGuild(localStorage);
 const raw=localStorage.getItem(guildStorageKey);if(!raw)return null;
 const state=JSON.parse(raw);if(!validGuild(state))throw new Error('The saved guild could not be read. Your save has been retained.');return state;
}
export function writeGuild(state,source){
 if(!validGuild(state))throw new Error('The guild could not be saved because its state is invalid.');
 localStorage.setItem(guildStorageKey,JSON.stringify(state));
 window.dispatchEvent(new CustomEvent('rolemaster-guild-updated',{detail:{state,source}}));
}
