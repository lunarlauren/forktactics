// Reminder metadata only. It never contains user recipes or a backup file.
// A browser-triggered download cannot prove the file was saved or retained.
import {createBackup} from './backup.mjs';

export const BACKUP_ACTIVITY_KEY='yumplan-backup-request-v1';
export const BACKUP_REMINDER_DAYS=7;
const MAX_AGE_MS=BACKUP_REMINDER_DAYS*24*60*60*1000;
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);

export function backupFingerprint(state){
  const text=createBackup(state,{now:'2000-01-01T00:00:00.000Z'});
  let hash=2166136261;
  for(let i=0;i<text.length;i++){
    hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;
  }
  return `${text.length}:${hash.toString(16).padStart(8,'0')}`;
}

export function recordBackupRequest(storage,state,{now=new Date().toISOString()}={}){
  if(typeof now!=='string'||!Number.isFinite(Date.parse(now)))throw new Error('Invalid backup request date.');
  const record={requestedAt:now,fingerprint:backupFingerprint(state)};
  storage.setItem(BACKUP_ACTIVITY_KEY,JSON.stringify(record));
  return record;
}

export function backupReminder(storage,state,{now=Date.now()}={}){
  let raw;
  try{raw=storage.getItem(BACKUP_ACTIVITY_KEY);}catch{return {status:'unknown'};}
  if(!raw)return {status:'never'};
  let record;
  try{record=JSON.parse(raw);}catch{return {status:'unknown'};}
  if(!isObject(record)||Object.keys(record).some(k=>!['requestedAt','fingerprint'].includes(k))||
    typeof record.requestedAt!=='string'||typeof record.fingerprint!=='string'||
    !/^\d+:[a-f0-9]{8}$/.test(record.fingerprint))return {status:'unknown'};
  const at=Date.parse(record.requestedAt),current=typeof now==='number'?now:Date.parse(now);
  if(!Number.isFinite(at)||!Number.isFinite(current)||at>current+60000)return {status:'unknown'};
  const changed=record.fingerprint!==backupFingerprint(state);
  const ageDays=Math.floor(Math.max(0,current-at)/(24*60*60*1000));
  if(changed)return {status:'changed',requestedAt:record.requestedAt,ageDays};
  if(current-at>=MAX_AGE_MS)return {status:'old',requestedAt:record.requestedAt,ageDays};
  return {status:'recent',requestedAt:record.requestedAt,ageDays};
}
