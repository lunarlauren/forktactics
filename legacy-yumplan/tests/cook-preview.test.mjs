import test from 'node:test';
import assert from 'node:assert/strict';
import {previewCookImpact} from '../src/cook-preview.mjs';
import {menuStatuses} from '../src/engine.mjs';

const products=['a','b','c'].map(id=>({id,name:id,category:'Test',unit:'count',packageQuantity:1,priceCents:100}));
const recipes=[
  {id:'only-a',name:'Only A',ingredients:{a:1}},
  {id:'only-b',name:'Only B',ingredients:{b:1}},
  {id:'both',name:'Both',ingredients:{a:1,b:1}},
  {id:'only-c',name:'Only C',ingredients:{c:1}}
];
const fixture=(nights=3)=>({
  nights,servings:4,menuIds:recipes.map(r=>r.id),anchors:['only-a','only-b','only-c'],
  basket:{a:1,b:1,c:1},priceBook:structuredClone(products),
  acquiredBasket:{a:1,b:1,c:1},purchased:true,cooked:[],recipeSubstitutions:{}
});

test('safe cooking previews one valid lineup and newly unavailable choices without writing',()=>{
  const plan=fixture(),before=structuredClone(plan);
  const impact=previewCookImpact(plan,'only-a',recipes,products);
  assert.equal(impact.covered,true);
  assert.equal(impact.nightsLeft,2);
  assert.deepEqual(impact.exampleLineup,['only-b','only-c']);
  assert.deepEqual(impact.newlyMissing,['both']);
  assert.deepEqual(impact.safeChoices,['only-b','only-c']);
  assert.deepEqual(plan,before);
});

test('risky dinner explicitly reports that remaining nights cannot be covered',()=>{
  const plan=fixture();
  assert.equal(menuStatuses(plan,recipes,products).find(s=>s.id==='both').status,'risky');
  const impact=previewCookImpact(plan,'both',recipes,products);
  assert.equal(impact.covered,false);
  assert.deepEqual(impact.exampleLineup,[]);
  assert.equal(impact.nightsLeft,2);
  assert.deepEqual(impact.newlyMissing,['only-a','only-b']);
});

test('uses recorded purchases, not packages still on the shopping list',()=>{
  const plan=fixture(2);
  plan.acquiredBasket={a:1,b:1};
  const impact=previewCookImpact(plan,'only-a',recipes,products);
  assert.equal(impact.covered,true);
  assert.deepEqual(impact.exampleLineup,['only-b']);
  assert.ok(impact.missingChoices.includes('only-c'));
});

test('finishing the week returns an empty lineup, not a missing-coverage warning',()=>{
  const plan=fixture(1);
  const impact=previewCookImpact(plan,'both',recipes,products);
  assert.equal(impact.covered,true);
  assert.equal(impact.nightsLeft,0);
  assert.deepEqual(impact.exampleLineup,[]);
  assert.deepEqual(impact.newlyMissing,[]);
});

test('refuses to preview unpurchased, missing, cooked or unknown dinners',()=>{
  const plan=fixture(2);
  plan.purchased=false;
  assert.throws(()=>previewCookImpact(plan,'only-a',recipes,products),/Record your groceries/);
  plan.purchased=true;plan.acquiredBasket={a:1};
  assert.throws(()=>previewCookImpact(plan,'only-b',recipes,products),/needs groceries/);
  plan.cooked=['only-a'];
  assert.throws(()=>previewCookImpact(plan,'only-a',recipes,products),/uncooked/);
  assert.throws(()=>previewCookImpact(plan,'not-here',recipes,products),/uncooked/);
});
