import test from 'node:test';
import assert from 'node:assert/strict';
import {priceSelectedDinners,evaluateDinnerChoices,suggestSelectedWeek} from '../src/selected-week.mjs';
import {RECIPES,PRODUCTS} from '../src/data.mjs';
const args={recipes:RECIPES,products:PRODUCTS,servings:4,budgetCents:20000};
test('selected week consolidates package quantities and respects budget',()=>{
 const a=priceSelectedDinners({...args,selectedIds:['beef-tacos']});
 const b=priceSelectedDinners({...args,selectedIds:['beef-tacos','beef-quesadillas']});
 assert.equal(b.basket.beef,2);assert.ok(b.costCents>=a.costCents);assert.ok(b.withinBudget);
});
test('swap releases old meal ingredients and unlocks an option',()=>{
 const tight=priceSelectedDinners({...args,selectedIds:['beef-tacos']}).costCents;
 const normal=evaluateDinnerChoices({...args,budgetCents:tight,selectedIds:['beef-tacos']});
 const swapped=evaluateDinnerChoices({...args,budgetCents:tight,selectedIds:['beef-tacos'],replacingId:'beef-tacos'});
 assert.equal(normal.find(x=>x.id==='beef-tacos').reason,'Already selected');
 assert.equal(swapped.find(x=>x.id==='beef-tacos').available,true);
});
test('Yuck is excluded and duplicate selections rejected',()=>{
 assert.throws(()=>priceSelectedDinners({...args,selectedIds:['beef-tacos','beef-tacos']}),/twice/);
 assert.equal(evaluateDinnerChoices({...args,selectedIds:[],preferences:{'beef-tacos':'yuck'}}).find(x=>x.id==='beef-tacos').available,false);
});
test('generator produces a full, distinct, affordable week excluding Yuck',()=>{
 const result=suggestSelectedWeek({...args,nights:7,preferences:{'beef-tacos':'yuck','chicken-rice':'yum'}});
 assert.equal(result.selectedIds.length,7);assert.equal(new Set(result.selectedIds).size,7);
 assert.ok(result.withinBudget);assert.ok(!result.selectedIds.includes('beef-tacos'));
});
test('unaffordable weeks fail rather than silently dropping dinners',()=>{
 assert.throws(()=>suggestSelectedWeek({...args,nights:7,budgetCents:100}),/No complete week/);
});

test('generator skips recipes with ingredients absent from the price catalog',()=>{
 const broken={id:'unpriced-meal',name:'Unpriced meal',protein:'other',ingredients:{unlisted_item:100}};
 const result=suggestSelectedWeek({...args,nights:2,recipes:[broken,...RECIPES]});
 assert.equal(result.selectedIds.length,2);
 assert.ok(!result.selectedIds.includes('unpriced-meal'));
});
test('generator reports no feasible plan if every recipe lacks a price',()=>{
 const broken={id:'unpriced-meal',name:'Unpriced meal',protein:'other',ingredients:{unlisted_item:100}};
 assert.throws(()=>suggestSelectedWeek({...args,nights:1,recipes:[broken]}),/No complete week/);
});
test('generator explores alternative combinations when a favored dinner blocks a full week',()=>{
 const products=[{id:'premium',packageQuantity:1,priceCents:190},{id:'staple',packageQuantity:2,priceCents:100}];
 const recipes=[
  {id:'favorite',protein:'meat',ingredients:{premium:1}},
  {id:'cheap-a',protein:'veg',ingredients:{staple:1}},
  {id:'cheap-b',protein:'veg',ingredients:{staple:1}}
 ];
 const result=suggestSelectedWeek({nights:2,recipes,products,servings:4,budgetCents:190,preferences:{favorite:'yum'}});
 assert.deepEqual(new Set(result.selectedIds),new Set(['cheap-a','cheap-b']));
 assert.equal(result.costCents,100);
});
