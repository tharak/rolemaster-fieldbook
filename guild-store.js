import {readBeta,writeBeta,betaSaveKey} from './guild-beta-store.js';
import {validGame} from './guild-game-rules.js';
export const guildStorageKey=betaSaveKey;
export const readGuild=()=>readBeta(localStorage,validGame);
export const writeGuild=state=>writeBeta(localStorage,state,validGame);
