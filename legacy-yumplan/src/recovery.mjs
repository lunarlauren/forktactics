// A single on-device undo checkpoint for destructive changes. This is NOT a
// backup against cleared site data, device loss, or browser storage eviction.
// It intentionally shares the current portable backup validator and schema.
import {createBackup,parseBackup,MAX_BACKUP_BYTES} from './backup.mjs';

export const RECOVERY_KEY = 'yumplan-recovery-v1';
export const RECOVERY_VERSION = 1;
export const RECOVERY_MAX_BYTES = MAX_BACKUP_BYTES + 4096;
const REASONS = Object.freeze({
  'new-week':'Started a new week',
  'file-restore':'Restored a backup file',
  'checkpoint-restore':'Restored a recovery checkpoint'
});
const textBytes = text => new TextEncoder().encode(text).length;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function createRecoverySnapshot(state,refs,{now=new Date().toISOString(),reason='new-week'}={}) {
  if(!Object.hasOwn(REASONS,reason))throw new Error('Unknown recovery reason.');
  if(typeof now!=='string'||!Number.isFinite(Date.parse(now)))throw new Error('Invalid recovery date.');
  const backup=createBackup(state,{now});
  // A snapshot must be independently restorable before it can replace the
  // previous checkpoint. Never save a corrupt snapshot as a user's lifeline.
  parseBackup(backup,refs);
  const result=JSON.stringify({kind:'yumplan-recovery',version:RECOVERY_VERSION,createdAt:now,reason,backup});
  if(textBytes(result)>RECOVERY_MAX_BYTES)throw new Error('Recovery checkpoint is too large. Download a full backup first.');
  return result;
}

export function parseRecoverySnapshot(text,refs){
  if(typeof text!=='string'||textBytes(text)>RECOVERY_MAX_BYTES)throw new Error('Recovery checkpoint is too large or unreadable.');
  let raw;
  try{raw=JSON.parse(text);}catch{throw new Error('Recovery checkpoint is not valid JSON.');}
  if(!isObject(raw)||Object.keys(raw).some(k=>!['kind','version','createdAt','reason','backup'].includes(k))||
    raw.kind!=='yumplan-recovery'||raw.version!==RECOVERY_VERSION||
    typeof raw.createdAt!=='string'||!Number.isFinite(Date.parse(raw.createdAt))||
    !Object.hasOwn(REASONS,raw.reason)||typeof raw.backup!=='string')
    throw new Error('Recovery checkpoint format is invalid.');
  const state=parseBackup(raw.backup,refs);
  const backupDate=JSON.parse(raw.backup).exportedAt;
  if(backupDate!==raw.createdAt)throw new Error('Recovery checkpoint dates do not match.');
  return {createdAt:raw.createdAt,reason:raw.reason,reasonLabel:REASONS[raw.reason],state};
}

export function readRecoverySnapshot(storage,refs){
  let text;
  try{text=storage.getItem(RECOVERY_KEY);}catch(error){return {status:'unavailable',error:error.message};}
  if(text===null)return {status:'empty'};
  try{return {status:'ready',raw:text,...parseRecoverySnapshot(text,refs)};}
  catch(error){return {status:'invalid',error:error.message};}
}

// Save a restorable copy of the CURRENT state, then atomically replace the
// main localStorage value. If replacement fails, best-effort roll back the
// previous checkpoint. The caller must only swap its in-memory state on success.
export function replaceWithRecovery(storage,mainKey,current,next,refs,{reason='new-week',now=new Date().toISOString(),expectedRaw=undefined}={}){
  const snapshot=createRecoverySnapshot(current,refs,{now,reason});
  // Validate the destination before touching storage as well.
  parseBackup(createBackup(next,{now}),refs);
  const nextText=JSON.stringify({...next,tab:'menu',filter:'all'});
  // Check the caller's exact starting bytes, not merely its parsed values.
  // This prevents a stale tab from replacing a newer week or checkpoint.
  if(expectedRaw!==undefined&&storage.getItem(mainKey)!==expectedRaw)
    throw new Error('Saved data changed in another tab. Reload before replacing this week.');
  const oldCheckpoint=storage.getItem(RECOVERY_KEY);
  storage.setItem(RECOVERY_KEY,snapshot);
  try{
    if(expectedRaw!==undefined&&storage.getItem(mainKey)!==expectedRaw)
      throw new Error('Saved data changed in another tab. Reload before replacing this week.');
    storage.setItem(mainKey,nextText);
  }
  catch(error){
    try{
      if(oldCheckpoint===null)storage.removeItem(RECOVERY_KEY);
      else storage.setItem(RECOVERY_KEY,oldCheckpoint);
    }catch{ /* Main data was not replaced; do not mask the original error. */ }
    throw error;
  }
  return parseRecoverySnapshot(snapshot,refs);
}
