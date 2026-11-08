// Validate local browser data BEFORE loading the interactive application.
// This module deliberately never repairs or overwrites damaged data on read.
import {createBackup,parseBackup} from './backup.mjs';

export const MAIN_STATE_KEY='yumplan-prototype-v1';
export const DAMAGED_STATE_KEY='yumplan-damaged-state-v1';
export const DEFAULT_SETTINGS=Object.freeze({
  budget:150,nights:7,servings:4,options:12,strategy:'balanced',
  autoSubstitutions:true,preferences:{},plan:null,discoverIndex:0,weekArchive:[]
});
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

// Match the historical v0.5 migration without silently changing explicit
// invalid values. A missing optional field is not the same as a broken field.
export function normalizeLegacyState(raw,referenceProducts){
  if(!isObject(raw))throw new Error('Saved data must be a JSON object.');
  if(!Array.isArray(raw.products))throw new Error('Saved grocery prices are missing or damaged.');
  // addNewCatalogProducts assumes product rows have IDs, so check shape first.
  if(raw.products.some(p=>!isObject(p)||typeof p.id!=='string'))
    throw new Error('Saved grocery price rows are damaged.');
  const data={...DEFAULT_SETTINGS,...raw};
  if(!own(raw,'weekArchive'))data.weekArchive=[];
  if(!own(raw,'autoSubstitutions'))data.autoSubstitutions=true;
  // Keep the original price rows intact so a missing ingredient is detected,
  // not silently replaced with a default price. parseBackup handles the
  // specifically supported older chicken-thighs catalog migration.
  data.products=raw.products;
  if(data.plan!==null){
    if(!isObject(data.plan))throw new Error('Saved weekly plan is damaged.');
    const p={...data.plan};
    if(!own(p,'priceBook'))p.priceBook=raw.products;
    if(!own(p,'strategy'))p.strategy='balanced';
    if(!own(p,'shoppingCounts')&&!own(p,'acquiredBasket')){
      if(!isObject(p.basket)||!isObject(p.checked))throw new Error('Saved shopping information is damaged.');
      p.shoppingCounts=Object.fromEntries(Object.entries(p.basket).filter(([id])=>p.checked[id]).map(([id,n])=>[id,n]));
      p.acquiredBasket=p.purchased?{...p.basket}:{};
    }
    if(!own(p,'recipeSubstitutions'))p.recipeSubstitutions={};
    if(!own(p,'shoppingHistory'))p.shoppingHistory=[];
    if(!Array.isArray(p.priceBook)||p.priceBook.some(x=>!isObject(x)||typeof x.id!=='string'))
      throw new Error('Saved weekly grocery prices are damaged.');
    // Let the strict backup validator handle supported legacy snapshots.
    data.plan=p;
  }
  return data;
}

export function inspectSavedState(storage,refs){
  let raw;
  try{raw=storage.getItem(MAIN_STATE_KEY);}catch(error){return {status:'unavailable',reason:'Browser storage cannot be read: '+error.message};}
  if(raw===null)return {status:'empty'};
  try{
    const normalized=normalizeLegacyState(JSON.parse(raw),refs.products);
    // Use the same deep structural, shopping, and cooking validation as a
    // downloaded backup. No write occurs here, including on migration.
    const state=parseBackup(createBackup(normalized),refs);
    return {status:'ready',state};
  }catch(error){return {status:'invalid',reason:error.message,raw};}
}

export function inspectDamagedCopy(storage){
  try{
    const raw=storage.getItem(DAMAGED_STATE_KEY);
    return raw===null?{status:'empty'}:{status:'ready',raw};
  }catch(error){return {status:'unavailable',reason:error.message};}
}

// This is only called after an explicit user decision. By default, saving a
// separate copy of the original is REQUIRED before replacing it. A user may
// opt out only after deliberately exporting the original themselves.
export function replaceDamagedState(storage,expectedRaw,nextState,refs,{allowWithoutLocalCopy=false}={}){
  if(typeof expectedRaw!=='string'||storage.getItem(MAIN_STATE_KEY)!==expectedRaw)
    throw new Error('Saved data changed in another tab. Reload before recovering.');
  const validated=parseBackup(createBackup(nextState),refs);
  const existing=storage.getItem(DAMAGED_STATE_KEY);
  if(existing!==null&&existing!==expectedRaw&&!allowWithoutLocalCopy)
    throw new Error('A different damaged-data copy is already stored. Export it before replacing anything.');
  if(!allowWithoutLocalCopy){
    try{storage.setItem(DAMAGED_STATE_KEY,expectedRaw);}
    catch{throw new Error('Not enough browser storage to preserve the damaged data. Download it first, then use the manual override.');}
  }
  // setItem is atomic for the main key. Do not remove the original first.
  storage.setItem(MAIN_STATE_KEY,JSON.stringify({...validated,tab:'menu',filter:'all'}));
  return validated;
}
