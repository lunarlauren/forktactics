import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCTS,RECIPES} from '../src/data.mjs';
import {optimizePlan,basketCost,menuStatuses,planProducts,exportPriceCsv,recordShopping} from '../src/engine.mjs';
import {createBackup,parseBackup,BACKUP_KIND,BACKUP_SCHEMA_VERSION,MAX_BACKUP_BYTES} from '../src/backup.mjs';

const basePlan=optimizePlan({budgetCents:15000,nights:7,servings:4,targetOptions:12,recipes:RECIPES,products:PRODUCTS,preferences:{},attempts:50});
const original={budget:150,nights:7,servings:4,options:12,strategy:'balanced',preferences:{'beef-tacos':'yum','beef-chili':'yuck'},products:PRODUCTS.map(p=>({...p})),plan:basePlan,discoverIndex:3};
const backup=createBackup(original,{now:'2026-10-14T12:00:00.000Z'});
const parse=text=>parseBackup(text,{recipes:RECIPES,products:PRODUCTS});
const modify=fn=>{const file=JSON.parse(backup);fn(file);return JSON.stringify(file);};
const fails=(fn,pattern=/Backup invalid/) => assert.throws(fn,pattern);

test('backup includes version, export date, and only persistent fields',()=>{
  const file=JSON.parse(backup);
  assert.equal(file.kind,BACKUP_KIND);
  assert.equal(file.schemaVersion,BACKUP_SCHEMA_VERSION);
  assert.equal(file.exportedAt,'2026-10-14T12:00:00.000Z');
  assert.equal(file.data.tab,undefined);
  assert.equal(file.data.filter,undefined);
});
test('round-trip preserves menu, prices, strategy, preferences and cooking progress',()=>{
  const restored=parse(backup);
  assert.equal(restored.budget,150);
  assert.equal(restored.strategy,'balanced');
  assert.equal(restored.preferences['beef-tacos'],'yum');
  assert.equal(restored.plan.menuIds.length,12);
  assert.equal(restored.plan.costCents,original.plan.costCents);
  assert.deepEqual(restored.plan.priceBook,original.plan.priceBook);
  assert.equal(restored.discoverIndex,3);
  assert.deepEqual(restored.plan.cooked,[]);
});
test('restore maintains historical package prices even when current prices change',()=>{
  const file=JSON.parse(backup);
  file.data.products[0].priceCents=99999;
  const restored=parse(JSON.stringify(file));
  assert.equal(restored.products[0].priceCents,99999);
  assert.equal(restored.plan.priceBook[0].priceCents,PRODUCTS[0].priceCents);
  assert.equal(basketCost(restored.plan.basket,planProducts(restored.plan,restored.products)),restored.plan.costCents);
});
test('restore retains a legitimately cooked dinner and shopping checks',()=>{
  const file=JSON.parse(backup),p=file.data.plan;
  recordShopping(p,p.basket);
  const ready=menuStatuses(p,RECIPES,PRODUCTS).find(x=>x.status==='ready');
  assert.ok(ready);
  p.cooked=[ready.id];
  const restored=parse(JSON.stringify(file));
  assert.deepEqual(restored.plan.cooked,[ready.id]);
  assert.equal(restored.plan.purchased,true);
  assert.equal(menuStatuses(restored.plan,RECIPES,PRODUCTS).find(x=>x.id===ready.id).status,'cooked');
});
test('restore preserves an empty plan without generating another one',()=>{
  const restored=parse(modify(f=>{f.data.plan=null;}));
  assert.equal(restored.plan,null);
});
test('rejects malformed JSON, non-backups and unknown schema versions',()=>{
  fails(()=>parse('{broken'));
  fails(()=>parse(modify(f=>{f.kind='random-file';})),/not a YumPlan backup/);
  fails(()=>parse(modify(f=>{f.schemaVersion=2;})),/unsupported backup version/);
});
test('rejects excessive file size and extra keys',()=>{
  fails(()=>parse(' '.repeat(MAX_BACKUP_BYTES+1)),/too large/);
  fails(()=>parse(modify(f=>{f.data.unexpected='bad';})),/unexpected field/);
});
test('rejects invalid budget, servings, preferences and shopping priority',()=>{
  fails(()=>parse(modify(f=>{f.data.budget=-1;})),/budget/);
  fails(()=>parse(modify(f=>{f.data.servings=0;})),/servings/);
  fails(()=>parse(modify(f=>{f.data.preferences['beef-tacos']='evil';})),/Yum\/Yuck/);
  fails(()=>parse(modify(f=>{f.data.strategy='random';})),/shopping priority/);
});
test('rejects unknown, duplicate or missing grocery products',()=>{
  fails(()=>parse(modify(f=>{f.data.products[0].id='unknown';})),/unknown or repeated/);
  fails(()=>parse(modify(f=>{f.data.products.pop();})),/all known grocery products/);
  fails(()=>parse(modify(f=>{f.data.products[1].id=f.data.products[0].id;})),/unknown or repeated/);
});
test('rejects unit manipulation, invalid package quantities and prices',()=>{
  fails(()=>parse(modify(f=>{f.data.products[0].unit='count';})),/changed unit/);
  fails(()=>parse(modify(f=>{f.data.products[0].packageQuantity=-1;})),/package quantity/);
  fails(()=>parse(modify(f=>{f.data.products[0].priceCents=0;})),/package price/);
});
test('rejects altered snapshot costs and invalid purchased state',()=>{
  fails(()=>parse(modify(f=>{f.data.plan.costCents+=1;})),/plan cost/);
  fails(()=>parse(modify(f=>{f.data.plan.priceBook[0].priceCents+=1;})),/plan cost/);
  fails(()=>parse(modify(f=>{f.data.plan.purchased=true;})),/(unchecked groceries|no purchased packages)/);
});
test('rejects duplicate menu IDs, unknown cooked meals, too many cooked meals',()=>{
  fails(()=>parse(modify(f=>{f.data.plan.menuIds[1]=f.data.plan.menuIds[0];})),/repeated recipe/);
  fails(()=>parse(modify(f=>{f.data.plan.cooked=['not-a-recipe'];})),/unknown or repeated recipe/);
  fails(()=>parse(modify(f=>{f.data.plan.cooked=f.data.plan.menuIds.slice(0,8);})),/too many cooked/);
});
test('rejects impossible cooking history that would overconsume basket',()=>{
  const text=modify(f=>{
    const p=f.data.plan;
    recordShopping(p,p.basket);
    p.cooked=['beef-tacos','beef-quesadillas','beef-chili'];
  });
  // Three beef dishes require more beef than the sample basket allocated.
  fails(()=>parse(text),/cooking history uses more ingredients/);
});
test('rejects prototype pollution attempts without affecting Object.prototype',()=>{
  const file=JSON.parse(backup);
  file.data.preferences=JSON.parse('{"__proto__":"yum"}');
  fails(()=>parse(JSON.stringify(file)),/unknown ID/);
  assert.equal({}.polluted,undefined);
});
test('rejects unknown IDs in checked groceries and restock quantities',()=>{
  fails(()=>parse(modify(f=>{f.data.plan.checked.fake=true;})),/unknown ID/);
  fails(()=>parse(modify(f=>{f.data.plan.restock.fake=1;})),/unknown ID/);
  fails(()=>parse(modify(f=>{f.data.plan.restock.beef=-1;})),/restock packages/);
});

test('price CSV exports escape formula-like names restored from a backup',()=>{
  const file=JSON.parse(backup);
  file.data.products[0].name='=SUM(A1:A9)';
  const restored=parse(JSON.stringify(file));
  const csv=exportPriceCsv(restored.products);
  assert.match(csv,/"'=SUM\(A1:A9\)"/);
});
