import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRODUCTS,RECIPES} from '../src/data.mjs';
import {priceSelectedDinners,buildFlexibleSelectedPlan} from '../src/selected-week.mjs';
import {basketQuantities,canCoverNights,menuStatuses,requirements,basketCost,recordShopping} from '../src/engine.mjs';
import {createBackup,parseBackup} from '../src/backup.mjs';

const settings={recipes:RECIPES,products:PRODUCTS,servings:4,budgetCents:15000,targetOptions:12};
const selectedIds=['beef-chili','veggie-fried-rice','chicken-rice','sausage-pasta','turkey-chili','egg-fried-rice','veggie-quesadillas'];

test('manual selection preserves seven requested dinners and adds genuine alternatives',()=>{
  const plan=buildFlexibleSelectedPlan({...settings,selectedIds});
  assert.deepEqual(plan.anchors,selectedIds);
  assert.deepEqual(plan.menuIds.slice(0,selectedIds.length),selectedIds);
  assert.ok(plan.menuIds.length>selectedIds.length);
  assert.ok(plan.menuIds.length<=settings.targetOptions);
  assert.equal(new Set(plan.menuIds).size,plan.menuIds.length);
  assert.equal(plan.costCents,basketCost(plan.basket,plan.priceBook));
  assert.ok(plan.costCents<=settings.budgetCents);
  assert.equal(plan.purchased,false);
  assert.ok(canCoverNights(basketQuantities(plan.basket,plan.priceBook),plan.menuIds,selectedIds.length,RECIPES,4));
  assert.ok(menuStatuses(plan,RECIPES,PRODUCTS).every(s=>['ready','risky'].includes(s.status)),
    'each menu choice must be individually cookable before shopping');
});

test('shopping strategy changes conditional vs safe choices without losing the must-have dinners',()=>{
  const saver=buildFlexibleSelectedPlan({...settings,selectedIds,strategy:'saver'});
  const balanced=buildFlexibleSelectedPlan({...settings,selectedIds,strategy:'balanced'});
  const saverSafe=menuStatuses(saver,RECIPES,PRODUCTS).filter(s=>s.status==='ready').length;
  const balancedSafe=menuStatuses(balanced,RECIPES,PRODUCTS).filter(s=>s.status==='ready').length;
  assert.deepEqual(saver.anchors,selectedIds);
  assert.deepEqual(balanced.anchors,selectedIds);
  assert.ok(saver.costCents<=balanced.costCents);
  assert.ok(balancedSafe>=saverSafe);
  assert.ok(balanced.costCents<=settings.budgetCents);
});

test('an already shared ingredient can add a menu choice at no extra cost',()=>{
  const products=[{id:'beans',name:'Beans',category:'Pantry',packageQuantity:4,unit:'count',priceCents:100}];
  const recipes=[{id:'a',protein:'veg',minutes:15,ingredients:{beans:1}},
    {id:'b',protein:'veg',minutes:15,ingredients:{beans:1}},
    {id:'c',protein:'veg',minutes:15,ingredients:{beans:1}}];
  const plan=buildFlexibleSelectedPlan({selectedIds:['a','b'],recipes,products,servings:4,budgetCents:100,targetOptions:3});
  assert.deepEqual(plan.menuIds,['a','b','c']);
  assert.deepEqual(plan.basket,{beans:1});
  assert.equal(plan.costCents,100);
});

test('tight budget preserves anchors and shows an unavailable restock-only option',()=>{
  const products=[{id:'a',name:'A',category:'Pantry',packageQuantity:1,unit:'count',priceCents:100},
    {id:'b',name:'B',category:'Pantry',packageQuantity:1,unit:'count',priceCents:100},
    {id:'c',name:'C',category:'Pantry',packageQuantity:1,unit:'count',priceCents:100}];
  const recipes=['a','b','c'].map(id=>({id,protein:'other',minutes:10,ingredients:{[id]:1}}));
  const result=buildFlexibleSelectedPlan({selectedIds:['a','b'],recipes,products,budgetCents:200,targetOptions:3});
  assert.deepEqual(result.anchors,['a','b']);
  assert.deepEqual(result.menuIds,['a','b','c']);
  assert.deepEqual(result.basket,{a:1,b:1});
  assert.equal(result.costCents,200);
  assert.equal(menuStatuses(result,recipes,products).find(s=>s.id==='c').status,'missing');
  assert.match(result.warning,/unavailable until restocked/);
  assert.ok(canCoverNights(basketQuantities(result.basket,products),result.menuIds,2,recipes,4));
  const funded=buildFlexibleSelectedPlan({selectedIds:['a','b'],recipes,products,budgetCents:300,targetOptions:3});
  assert.equal(funded.costCents,300);
  assert.equal(menuStatuses(funded,recipes,products).find(s=>s.id==='c').status,'ready');
  assert.equal(funded.warning,null);
});

test('unaffordable menu options remain visible without purchasing unplanned packages',()=>{
  const products=['a','b','c','d'].map(id=>({id,name:id,category:'Pantry',packageQuantity:1,unit:'count',priceCents:100}));
  const recipes=['a','b','c','d'].map(id=>({id,protein:'other',minutes:10,ingredients:{[id]:1}}));
  const result=buildFlexibleSelectedPlan({selectedIds:['a','b'],recipes,products,budgetCents:300,targetOptions:4});
  assert.deepEqual(result.menuIds,['a','b','c','d']);
  assert.equal(result.costCents,300);
  assert.equal(menuStatuses(result,recipes,products).filter(s=>s.status==='missing').length,1);
  assert.match(result.warning,/1 menu option needs extra groceries/);
});

test('when few eligible recipes exist, warn about count without including Yucks',()=>{
  const products=['a','b','c','d'].map(id=>({id,name:id,category:'Pantry',packageQuantity:1,unit:'count',priceCents:100}));
  const recipes=['a','b','c','d'].map(id=>({id,protein:'other',minutes:10,ingredients:{[id]:1}}));
  const result=buildFlexibleSelectedPlan({selectedIds:['a','b'],recipes,products,budgetCents:200,targetOptions:4,preferences:{d:'yuck'}});
  assert.deepEqual(result.menuIds,['a','b','c']);
  assert.match(result.warning,/Only 3 eligible menu choices were available instead of 4/);
  assert.ok(!result.menuIds.includes('d'));
});

test('restock-only choices favor the cheapest extra whole packages, not alphabetical order',()=>{
  const products=[{id:'a',name:'A',category:'Pantry',packageQuantity:1,unit:'count',priceCents:100},
    {id:'z',name:'Z',category:'Pantry',packageQuantity:1,unit:'count',priceCents:100},
    {id:'b',name:'B',category:'Pantry',packageQuantity:1,unit:'count',priceCents:500},
    {id:'c',name:'C',category:'Pantry',packageQuantity:1,unit:'count',priceCents:200}];
  const recipes=['a','z','b','c'].map(id=>({id,protein:'other',minutes:10,ingredients:{[id]:1}}));
  const result=buildFlexibleSelectedPlan({selectedIds:['a','z'],recipes,products,budgetCents:200,targetOptions:3});
  assert.deepEqual(result.menuIds,['a','z','c']);
  assert.equal(result.costCents,200);
});

test('restock-only choices survive backup and remain unavailable after buying the approved basket',()=>{
  const plan=buildFlexibleSelectedPlan({...settings,selectedIds,budgetCents:7620});
  const before=menuStatuses(plan,RECIPES,PRODUCTS);
  assert.equal(before.filter(s=>s.status==='missing').length,5);
  const saved=createBackup({budget:76.2,nights:7,servings:4,options:12,strategy:'balanced',
    autoSubstitutions:true,preferences:{},products:PRODUCTS,plan,discoverIndex:0,weekArchive:[]});
  const restored=parseBackup(saved,{recipes:RECIPES,products:PRODUCTS});
  assert.deepEqual(restored.plan.menuIds,plan.menuIds);
  assert.deepEqual({...restored.plan.basket},plan.basket);
  recordShopping(restored.plan,restored.plan.basket);
  assert.equal(menuStatuses(restored.plan,RECIPES,PRODUCTS).filter(s=>s.status==='missing').length,5);
  assert.ok(canCoverNights(basketQuantities(restored.plan.acquiredBasket,PRODUCTS),restored.plan.menuIds,7,RECIPES,4));
});

test('Yuck and missing-price alternatives never enter the advertised menu',()=>{
  const unpriced={id:'missing',protein:'other',minutes:10,ingredients:{missing:1}};
  const plan=buildFlexibleSelectedPlan({...settings,selectedIds,recipes:[...RECIPES,unpriced],preferences:{'beef-tacos':'yuck'}});
  assert.ok(!plan.menuIds.includes('beef-tacos'));
  assert.ok(!plan.menuIds.includes('missing'));
  assert.throws(()=>buildFlexibleSelectedPlan({...settings,selectedIds,preferences:{'beef-chili':'yuck'}}),/Yuck recipe/);
});

test('manual-mode UI uses flexible builder and communicates anchor vs full-menu price',()=>{
  const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
  assert.match(app,/return buildFlexibleSelectedPlan\(\{\.\.\.args,selectedIds\}\)/);
  assert.match(app,/Must-have dinner basket/);
  assert.match(app,/Your full flexible menu may require more packages/);
  assert.match(app,/Must-have dinners are guaranteed; other menu choices are alternatives/);
  assert.match(app,/fresh\.warning/);
  assert.match(app,/safe first-night choices/);
  assert.match(app,/conditional choices could require restocking/);
  assert.match(app,/need groceries before cooking/);
});
