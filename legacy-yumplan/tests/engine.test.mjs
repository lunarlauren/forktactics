import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCTS,RECIPES} from '../src/data.mjs';
import {basketForNeeds,basketCost,basketQuantities,canCoverNights,menuStatuses,remainingQuantities,missingQuantities,requirements,optimizePlan,recordShopping,parsePriceCsv,exportPriceCsv,incrementalBasket} from '../src/engine.mjs';
const settings={budgetCents:15000,nights:7,servings:4,targetOptions:12,recipes:RECIPES,products:PRODUCTS};
test('rounds purchases to complete packages',()=>{
  const basket=basketForNeeds({beef:455,tortillas:11},PRODUCTS);
  assert.equal(basket.beef,2);assert.equal(basket.tortillas,2);
  assert.equal(basketCost(basket,PRODUCTS),2*649+2*299);
});
test('shared ingredient is not purchased twice unnecessarily',()=>{
  const one=basketForNeeds({rice:320},PRODUCTS);
  const next=incrementalBasket(one,{rice:350},PRODUCTS);
  assert.equal(next.rice,1);
});
test('plan stays under budget and covers seven distinct dinners',()=>{
  const p=optimizePlan(settings);
  assert.ok(p.menuIds.length>p.nights,`Expected >${p.nights} options, got ${p.menuIds.length}`);
  assert.ok(p.costCents<=p.budgetCents);
  assert.equal(p.anchors.length,7);
  assert.equal(new Set(p.anchors).size,7);
  assert.equal(canCoverNights(basketQuantities(p.basket,PRODUCTS),p.menuIds,7,RECIPES,4),true);
  assert.equal(p.cooked.length,0);
});
test('cooking removes planned quantities and can disable alternatives',()=>{
  const p=optimizePlan(settings);
  recordShopping(p,p.basket);
  const safe=menuStatuses(p,RECIPES,PRODUCTS).find(s=>s.status==='ready');
  assert.ok(safe,'At least one safe dinner should exist');
  const before=remainingQuantities(p,RECIPES,PRODUCTS);
  p.cooked.push(safe.id);
  const after=remainingQuantities(p,RECIPES,PRODUCTS);
  const recipe=RECIPES.find(r=>r.id===safe.id);
  for(const [id,q] of Object.entries(requirements(recipe,4)))assert.ok(Math.abs(before[id]-after[id]-q)<1e-6);
  assert.equal(menuStatuses(p,RECIPES,PRODUCTS).find(s=>s.id===safe.id).status,'cooked');
});
test('risky meal warning identifies a choice that breaks coverage',()=>{
  const toyRecipes=[{id:'a',ingredients:{beef:454}},{id:'b',ingredients:{beef:454}},{id:'c',ingredients:{chicken:454}}];
  const toyProducts=PRODUCTS.filter(p=>['beef','chicken'].includes(p.id));
  const plan={nights:2,servings:4,menuIds:['a','b','c'],basket:{beef:1,chicken:1},cooked:[]};
  assert.equal(menuStatuses(plan,toyRecipes,toyProducts).filter(s=>s.status==='ready').length,3);
  plan.cooked.push('a');
  assert.equal(menuStatuses(plan,toyRecipes,toyProducts).find(s=>s.id==='b').status,'missing');
  assert.equal(menuStatuses(plan,toyRecipes,toyProducts).find(s=>s.id==='c').status,'ready');
  const tooSmall={...plan,menuIds:['a','b'],cooked:[]};
  assert.equal(menuStatuses(tooSmall,toyRecipes,toyProducts).find(s=>s.id==='a').status,'risky');
});
test('Yuck recipes never appear in generated menu',()=>{
  const p=optimizePlan({...settings,preferences:{'beef-tacos':'yuck','beef-chili':'yuck'}});
  assert.ok(!p.menuIds.includes('beef-tacos'));
  assert.ok(!p.menuIds.includes('beef-chili'));
});
test('insufficient budget produces clear error',()=>{
  assert.throws(()=>optimizePlan({...settings,budgetCents:100}),/No feasible dinner plan/);
});
test('CSV round-trip preserves prices and quantities',()=>{
  const csv=exportPriceCsv(PRODUCTS);
  const parsed=parsePriceCsv(csv,PRODUCTS);
  assert.deepEqual(parsed,PRODUCTS);
});
test('CSV rejects unknown IDs, mismatched units, duplicate rows and invalid price',()=>{
  const h='ingredient_id,name,category,package_quantity,unit,price\n';
  assert.throws(()=>parsePriceCsv(h+'unknown,Foo,Meat,1,g,2.00',PRODUCTS),/unknown ingredient_id/);
  assert.throws(()=>parsePriceCsv(h+'beef,Beef,Meat,1,lb,2.00',PRODUCTS),/unit/);
  assert.throws(()=>parsePriceCsv(h+'beef,Beef,Meat,454,g,2.00\nbeef,Beef,Meat,454,g,3.00',PRODUCTS),/duplicate/);
  assert.throws(()=>parsePriceCsv(h+'beef,Beef,Meat,454,g,free',PRODUCTS),/positive numbers/);
});
test('CSV parser handles escaped quoted values',()=>{
  const h='ingredient_id,name,category,package_quantity,unit,price\n';
  const parsed=parsePriceCsv(h+'beef,"Ground ""premium"" beef",Meat,454,g,6.49',PRODUCTS);
  assert.equal(parsed.find(p=>p.id==='beef').name,'Ground "premium" beef');
});
test('safe dinner choices preserve enough meals for the whole week',()=>{
  const plan=optimizePlan(settings);
  recordShopping(plan,plan.basket);
  while(plan.cooked.length<plan.nights){
    const statuses=menuStatuses(plan,RECIPES,PRODUCTS);
    const safe=statuses.find(s=>s.status==='ready');
    assert.ok(safe,`No safe meal with ${plan.nights-plan.cooked.length} nights left`);
    plan.cooked.push(safe.id);
    assert.ok(remainingQuantities(plan,RECIPES,PRODUCTS));
  }
  assert.equal(plan.cooked.length,7);
  assert.equal(new Set(plan.cooked).size,7);
});
test('money displays negative budget remainder correctly',async()=>{
  const {money}=await import('../src/engine.mjs');
  assert.equal(money(-145),'-$1.45');
  assert.equal(money(0),'$0.00');
});
