// Portable, versioned YumPlan backups. No browser APIs: testable in Node.
// A backup is untrusted input. Validate and normalize before touching localStorage.
import {basketCost,remainingQuantities,PLANNING_STRATEGIES,SUBSTITUTION_RULES,MAX_SHOPPING_HISTORY} from './engine.mjs';
import {MAX_WEEK_ARCHIVE} from './week-history.mjs';

export const BACKUP_KIND = 'yumplan-backup';
export const BACKUP_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024; // 1 MiB; generous for the current recipe catalog.
const stateKeys=['budget','nights','servings','options','strategy','autoSubstitutions','preferences','products','plan','discoverIndex','weekArchive','recipePhotos'];
const isObject = x => x!==null && typeof x==='object' && !Array.isArray(x);
const fail = message => {throw new Error('Backup invalid: '+message);};
const keys = (obj,allowed,label) => {
  if(!isObject(obj))fail(label+' must be an object.');
  for(const key of Object.keys(obj))if(!allowed.includes(key))fail(label+' has an unexpected field: '+key);
};
const number = (value,min,max,label,integer=false) => {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))fail(label+' is out of range.');
  return value;
};
const string = (value,max,label) => {
  if(typeof value!=='string'||value.length>max||!value.trim())fail(label+' must be nonempty text.');
  return value;
};
const stringOrNull = (value,max,label) => value==null?null:string(value,max,label);
const clone = obj => JSON.parse(JSON.stringify(obj));
// v0.7 backups predate this optional catalog addition. Existing prices and
// purchased baskets remain frozen; only the new ingredient gets a default.
const LEGACY_ADDED_PRODUCT_IDS=new Set(['chicken-thighs']);

function productsFromBackup(raw,reference,label){
  if(!Array.isArray(raw))fail(label+' must contain all known grocery products.');
  const byId=new Map(reference.map(p=>[p.id,p]));
  const seen=new Set();
  const normalized=raw.map((p,index)=>{
    keys(p,['id','name','category','packageQuantity','unit','priceCents'],`${label}[${index}]`);
    const id=string(p.id,80,`${label} ingredient ID`), ref=byId.get(id);
    if(!ref||seen.has(id))fail(label+' has an unknown or repeated ingredient ID: '+id);
    seen.add(id);
    if(p.unit!==ref.unit)fail(label+' contains a changed unit for '+id);
    return {id,name:string(p.name,120,`${label} name`),category:string(p.category,80,`${label} category`),packageQuantity:number(p.packageQuantity,0.000001,1e9,`${label} package quantity`),unit:ref.unit,priceCents:number(p.priceCents,1,1e9,`${label} package price`,true)};
  });
  const missing=reference.filter(p=>!seen.has(p.id));
  if(missing.some(p=>!LEGACY_ADDED_PRODUCT_IDS.has(p.id)))fail(label+' must contain all known grocery products.');
  return [...normalized,...missing.map(p=>({...p}))];
}
function dictionary(raw,allowed,label,check){
  if(!isObject(raw))fail(label+' must be an object.');
  const result=Object.create(null),known=new Set(allowed);
  for(const [id,value] of Object.entries(raw)){
    if(!known.has(id))fail(label+' contains unknown ID: '+id);
    result[id]=check(value,id);
  }
  return result;
}
function idList(raw,allowed,label){
  if(!Array.isArray(raw))fail(label+' must be an array.');
  const known=new Set(allowed),seen=new Set();
  return raw.map(id=>{
    if(typeof id!=='string'||!known.has(id)||seen.has(id))fail(label+' contains an unknown or repeated recipe.');
    seen.add(id);return id;
  });
}
function validatePlan(raw,referenceProducts,recipes){
  if(raw===null)return null;
  keys(raw,['budgetCents','nights','servings','targetOptions','strategy','menuIds','anchors','basket','priceBook','costCents','flexibility','purchased','checked','shoppingCounts','acquiredBasket','shoppingHistory','cooked','restock','recipeSubstitutions','createdAt','warning'],'weekly plan');
  const knownRecipes=recipes.map(r=>r.id),productIds=referenceProducts.map(p=>p.id);
  const priceBook=productsFromBackup(raw.priceBook,referenceProducts,'weekly price snapshot');
  const legacySnapshotMissingThighs=!raw.priceBook.some(p=>p.id==='chicken-thighs');
  const nights=number(raw.nights,1,7,'plan nights',true);
  const servings=number(raw.servings,1,12,'plan servings',true);
  const targetOptions=number(raw.targetOptions,nights+1,knownRecipes.length,'plan menu target',true);
  const menuIds=idList(raw.menuIds,knownRecipes,'menu IDs');
  if(menuIds.length<=nights||menuIds.length>targetOptions)fail('menu must offer more choices than cooking nights.');
  const anchors=idList(raw.anchors,menuIds,'anchor dinners');
  if(anchors.length!==nights)fail('anchor dinners must cover every planned night.');
  const cooked=idList(raw.cooked,menuIds,'cooked dinners');
  if(cooked.length>nights)fail('too many cooked dinners.');
  const basket=dictionary(raw.basket,productIds,'basket',(v,id)=>number(v,1,10000,'packages of '+id,true));
  if(legacySnapshotMissingThighs&&Object.hasOwn(basket,'chicken-thighs'))fail('legacy weekly snapshot cannot contain chicken thighs purchases.');
  const checked=dictionary(raw.checked,Object.keys(basket),'checked groceries',(v)=>{
    if(typeof v!=='boolean')fail('grocery checkboxes must be true or false.');return v;
  });
  const restock=dictionary(raw.restock,productIds,'restock',(v,id)=>number(v,1,10000,'restock packages of '+id,true));
  if(typeof raw.purchased!=='boolean')fail('purchased must be true or false.');
  // Backward compatible with v0.5 backups that did not store package counts.
  // New plans must carry both maps; never silently treat missing purchased
  // packages as available for cooking.
  const legacy=raw.shoppingCounts===undefined&&raw.acquiredBasket===undefined;
  if(!legacy&&(raw.shoppingCounts===undefined||raw.acquiredBasket===undefined))fail('incomplete shopping record.');
  if(legacy&&raw.purchased&&Object.keys(basket).some(id=>checked[id]!==true))fail('purchased plan has unchecked groceries.');
  const rawShopping=legacy?Object.fromEntries(Object.keys(basket).map(id=>[id,checked[id]?basket[id]:0])):raw.shoppingCounts;
  const rawAcquired=legacy?(raw.purchased?basket:{}):raw.acquiredBasket;
  const shoppingCounts=dictionary(rawShopping,Object.keys(basket),'shopping quantities',(v,id)=>number(v,0,basket[id],'shopping packages of '+id,true));
  const acquiredBasket=dictionary(rawAcquired,Object.keys(basket),'purchased quantities',(v,id)=>number(v,1,basket[id],'purchased packages of '+id,true));
  if(!raw.purchased&&Object.keys(acquiredBasket).length)fail('unconfirmed plan contains purchased packages.');
  if(raw.purchased&&!Object.keys(acquiredBasket).length)fail('confirmed plan has no purchased packages.');
  if(!raw.purchased&&cooked.length)fail('unconfirmed plan has cooked dinners.');
  for(const [id,n] of Object.entries(acquiredBasket)){
    if((shoppingCounts[id]||0)<n)fail('shopping counts are below purchased packages for '+id);
  }
  if(!legacy&&raw.purchased){
    for(const [id,n] of Object.entries(basket)){
      if(Boolean(checked[id])!==((acquiredBasket[id]||0)===n))fail('purchased checkbox disagrees with recorded packages for '+id);
    }
  }
  // v1.2 and earlier backups have no shopping history. Start recording only
  // from the next confirmed action; do not fabricate timestamps or receipts.
  const shoppingHistory=[];
  if(raw.shoppingHistory!==undefined){
    if(!Array.isArray(raw.shoppingHistory)||raw.shoppingHistory.length>MAX_SHOPPING_HISTORY)
      fail('shopping history must be a bounded list.');
    for(const [index,event] of raw.shoppingHistory.entries()){
      keys(event,['type','at','changes'],`shopping history entry ${index}`);
      if(!['purchase','correction','restock'].includes(event.type))fail('unknown shopping history action.');
      const at=string(event.at,60,'shopping history date');
      if(!Number.isFinite(Date.parse(at)))fail('invalid shopping history date.');
      if(!Array.isArray(event.changes)||event.changes.length<1||event.changes.length>productIds.length)
        fail('shopping history changes must contain valid grocery rows.');
      const seen=new Set(),changes=[];
      for(const change of event.changes){
        keys(change,['id','before','after'],'shopping history change');
        const id=string(change.id,80,'shopping history ingredient');
        if(!Object.hasOwn(basket,id)||seen.has(id))fail('shopping history contains unknown or duplicate ingredient.');
        seen.add(id);
        const before=number(change.before,0,basket[id],'shopping history previous packages',true);
        const after=number(change.after,0,basket[id],'shopping history updated packages',true);
        if(before===after||(event.type!=='correction'&&after<before))fail('shopping history contains invalid package changes.');
        changes.push({id,before,after});
      }
      shoppingHistory.push({type:event.type,at,changes});
    }
    // Check backward from today's confirmed purchases. The oldest entry may
    // start midweek after upgrading from an older version or trimming to 80.
    const expected={...acquiredBasket};
    for(const event of [...shoppingHistory].reverse()){
      for(const {id,before,after} of event.changes){
        if((expected[id]||0)!==after)fail('shopping history does not match recorded purchases.');
        if(before)expected[id]=before;
        else delete expected[id];
      }
    }
  }

  // Optional for old backups. Each recipe may replace only its curated source
  // ingredient with an approved same-unit product. Never trust arbitrary IDs.
  const recipeSubstitutions=Object.create(null);
  if(raw.recipeSubstitutions!==undefined){
    if(!isObject(raw.recipeSubstitutions))fail('recipe substitutions must be an object.');
    for(const [recipeId,swaps] of Object.entries(raw.recipeSubstitutions)){
      // Cooked substitutions are kept to reconstruct actual consumption.
      if(!menuIds.includes(recipeId))fail('substitution recipe is not on the menu.');
      if(!isObject(swaps)||Object.keys(swaps).length!==1)fail('each recipe substitution needs one ingredient swap.');
      const [from,to]=Object.entries(swaps)[0];
      if(!SUBSTITUTION_RULES[recipeId]?.[from]?.includes(to))fail('unapproved ingredient substitution.');
      if(legacySnapshotMissingThighs&&to==='chicken-thighs')fail('legacy weekly snapshot cannot contain chicken thighs substitutions.');
      const fromProduct=priceBook.find(p=>p.id===from),toProduct=priceBook.find(p=>p.id===to);
      if(!fromProduct||!toProduct||fromProduct.unit!==toProduct.unit)fail('substitution units do not match.');
      recipeSubstitutions[recipeId]={[from]:to};
    }
  }
  const budgetCents=number(raw.budgetCents,1,1e9,'plan budget',true);
  const costCents=number(raw.costCents,0,1e10,'plan cost',true);
  if(basketCost(basket,priceBook)!==costCents)fail('plan cost does not match its saved grocery prices.');
  if(!PLANNING_STRATEGIES[raw.strategy])fail('unknown plan shopping priority.');
  const createdAt=string(raw.createdAt,60,'plan creation date');
  if(!Number.isFinite(Date.parse(createdAt)))fail('plan creation date is not valid.');
  let flexibility=null;
  if(raw.flexibility!==undefined && raw.flexibility!==null){
    keys(raw.flexibility,['initialSafeCount','safeCount','premiumCents'],'flexibility summary');
    flexibility={initialSafeCount:number(raw.flexibility.initialSafeCount,0,menuIds.length,'initial safe count',true),safeCount:number(raw.flexibility.safeCount,0,menuIds.length,'safe count',true),premiumCents:number(raw.flexibility.premiumCents,0,1e9,'flexibility premium',true)};
  }
  const plan={budgetCents,nights,servings,targetOptions,strategy:raw.strategy,menuIds,anchors,basket,priceBook,costCents,flexibility,purchased:raw.purchased,checked,shoppingCounts,acquiredBasket,shoppingHistory,cooked,restock,recipeSubstitutions,createdAt,warning:stringOrNull(raw.warning,500,'plan warning')};
  // Reject impossible cooked history, rather than restoring a broken menu.
  try{remainingQuantities(plan,recipes,priceBook);}catch{fail('cooking history uses more ingredients than purchased.');}
  return plan;
}

function validateWeekArchive(raw,recipes){
  // Pre-1.6 backups have no archived weeks. Do not invent historical data.
  if(raw===undefined)return [];
  if(!Array.isArray(raw)||raw.length>MAX_WEEK_ARCHIVE)fail('weekly archive must be a bounded list.');
  const known=recipes.map(r=>r.id);
  return raw.map((entry,index)=>{
    keys(entry,['startedAt','archivedAt','menuIds','cookedIds','nights','servings','budgetCents','basketCostCents','recordedCostCents','purchasedPackages','shoppingEvents'],`weekly archive entry ${index}`);
    const startedAt=string(entry.startedAt,60,'archive start date');
    const archivedAt=string(entry.archivedAt,60,'archive end date');
    if(!Number.isFinite(Date.parse(startedAt))||!Number.isFinite(Date.parse(archivedAt))||Date.parse(archivedAt)<Date.parse(startedAt))fail('archive dates are invalid.');
    const nights=number(entry.nights,1,7,'archive nights',true);
    const servings=number(entry.servings,1,12,'archive servings',true);
    const menuIds=idList(entry.menuIds,known,'archive menu');
    if(menuIds.length<=nights)fail('archived menu must offer more choices than cooking nights.');
    const cookedIds=idList(entry.cookedIds,menuIds,'archive cooked dinners');
    if(cookedIds.length>nights)fail('too many archived cooked dinners.');
    const budgetCents=number(entry.budgetCents,1,1e9,'archive budget',true);
    const basketCostCents=number(entry.basketCostCents,0,1e10,'archive basket cost',true);
    const recordedCostCents=number(entry.recordedCostCents,0,basketCostCents,'archive recorded cost',true);
    const purchasedPackages=number(entry.purchasedPackages,0,100000,'archive purchased packages',true);
    const shoppingEvents=number(entry.shoppingEvents,0,MAX_SHOPPING_HISTORY,'archive shopping events',true);
    if((purchasedPackages===0)!==(recordedCostCents===0))fail('archive recorded purchases and cost disagree.');
    if(cookedIds.length&&purchasedPackages===0)fail('archived cooking needs purchased groceries.');
    return {startedAt,archivedAt,menuIds,cookedIds,nights,servings,budgetCents,basketCostCents,recordedCostCents,purchasedPackages,shoppingEvents};
  });
}

export function parseBackup(text,{recipes,products:referenceProducts}){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)fail('file is too large or not text.');
  let raw;
  try{raw=JSON.parse(text);}catch{fail('file is not valid JSON.');}
  keys(raw,['kind','schemaVersion','exportedAt','data'],'backup file');
  if(raw.kind!==BACKUP_KIND)fail('this is not a YumPlan backup.');
  if(raw.schemaVersion!==BACKUP_SCHEMA_VERSION)fail('unsupported backup version '+String(raw.schemaVersion)+'.');
  if(!Number.isFinite(Date.parse(raw.exportedAt)))fail('export date is invalid.');
  keys(raw.data,stateKeys,'saved state');
  const d=raw.data;
  const nights=number(d.nights,1,7,'cooking nights',true);
  const servings=number(d.servings,1,12,'servings',true);
  const options=number(d.options,nights+1,recipes.length,'menu choices',true);
  const budget=number(d.budget,0.01,1e7,'budget');
  if(!PLANNING_STRATEGIES[d.strategy])fail('unknown shopping priority.');
  if(d.autoSubstitutions!==undefined && typeof d.autoSubstitutions!=='boolean')fail('automatic substitutions must be true or false.');
  const autoSubstitutions=d.autoSubstitutions??true;
  const preferences=dictionary(d.preferences,recipes.map(r=>r.id),'preferences',v=>{
    if(!['yum','yuck','save'].includes(v))fail('unknown Yum/Yuck preference.');return v;
  });
  const products=productsFromBackup(d.products,referenceProducts,'price book');
  const plan=validatePlan(d.plan,referenceProducts,recipes);
  const discoverIndex=number(d.discoverIndex,0,1e9,'discovery position',true);
  const weekArchive=validateWeekArchive(d.weekArchive,recipes);
  // Small, device-local JPEG/WEBP thumbnails travel with the portable backup.
  // Strict limits protect storage and prevent imported HTML/SVG execution.
  const recipePhotos=Object.create(null);
  if(d.recipePhotos!==undefined){
    if(!isObject(d.recipePhotos))fail('recipe photos must be a dictionary.');
    if(Object.keys(d.recipePhotos).length>recipes.length)fail('too many recipe photos.');
    const known=new Set(recipes.map(r=>r.id));
    for(const [id,photo] of Object.entries(d.recipePhotos)){
      if(!known.has(id))fail('unknown recipe photo ID.');
      if(typeof photo!=='string'||photo.length>110000||!/^data:image\/(?:jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))fail('invalid recipe photo format.');
      recipePhotos[id]=photo;
    }
  }
  return {budget,nights,servings,options,strategy:d.strategy,autoSubstitutions,preferences,products,plan,discoverIndex,weekArchive,recipePhotos};
}

export function createBackup(state,{now=new Date().toISOString()}={}){
  const data=Object.fromEntries(stateKeys.map(k=>[k,state[k]]));
  // Round-trip through the same strict validator used for uploaded files.
  // Export is intentionally only persistent user data, not transient UI state.
  const clean=clone(data);
  // The optimizer temporarily attaches its basket to the flexibility result.
  // That duplicate basket is not needed in a portable backup.
  if(clean.plan?.flexibility)delete clean.plan.flexibility.basket;
  return JSON.stringify({kind:BACKUP_KIND,schemaVersion:BACKUP_SCHEMA_VERSION,exportedAt:now,data:clean},null,2);
}
