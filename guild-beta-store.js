// One fresh beta save. Legacy state is intentionally discarded, never migrated.
export const betaSaveKey='rolemaster-guild-beta-v2';
export const betaResetKey='rolemaster-beta-reset';
export function resetLegacyBeta(storage){
 if(storage.getItem(betaResetKey)==='guild-beta-v2')return;
 const keys=Array.from({length:storage.length},(_,index)=>storage.key(index));
 for(const key of keys)if(key?.startsWith('rolemaster-')&&key!==betaSaveKey&&key!==betaResetKey)storage.removeItem(key);
 storage.setItem(betaResetKey,'guild-beta-v2');
}
export function readBeta(storage,validate){
 const raw=storage.getItem(betaSaveKey);if(!raw)return null;
 const state=JSON.parse(raw);if(!validate(state))throw new Error('This beta save is invalid. Start a fresh guild from the recovery screen.');
 return state;
}
export function writeBeta(storage,state,validate){
 if(!validate(state))throw new Error('The guild could not be saved.');
 storage.setItem(betaSaveKey,JSON.stringify(state));
}
