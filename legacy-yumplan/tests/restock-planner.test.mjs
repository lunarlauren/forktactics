import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCTS,RECIPES} from '../src/data.mjs';
import {basketCost,menuStatuses,optimizePlan,recordShopping,recordRestock} from '../src/engine.mjs';
import {createBackup,parseBackup} from '../src/backup.mjs';
import {previewRecipeAdditions,commitRecipeAdditions} from '../src/restock-planner.mjs';

const products=[
  {id:'a',name:'Apples',category:'Produce',unit:'count',packageQuantity:1,priceCents:250},
  {id:'b',name:'Beans',category:'Pantry',unit:'count',packageQuantity:1,priceCents:300},
  {id:'c',name:'Corn',category:'Pantry',unit:'count',packageQuantity:1,priceCents:400}
];
const recipes=[
  {id:'r1',name:'Apple',ingredients:{a:1}},
  {id:'r2',name:'Apple and beans',ingredients:{a:1,b:3}},
  {id:'r3',name:'Corn',ingredients:{c:1}},
  {id:'r4',name:'Beans',ingredients:{b:1}}
];
const opts={recipes};
function fixture({purchased=true,acquired={a:1},basket={a:1,b:1},restock={},cooked=[],budgetCents=2000}={}){
  const costCents=basketCost(basket,products);
  const plan={budgetCents,nights:2,servings:4,targetOptions:3,strategy:'balanced',
    menuIds:['r1','r2','r3'],anchors:['r1','r2'],basket,priceBook:structuredClone(products),costCents,
    flexibility:null,purchased,checked:{},shoppingCounts:{...acquired},acquiredBasket:purchased?{...acquired}:{},
    shoppingHistory:[],cooked,restock,recipeSubstitutions:{},createdAt:'2026-10-15T00:00:00.000Z',warning:null};
  return {plan,products:structuredClone(products),preferences:{},tab:'menu',filter:'missing'};
}

test('uses unbought original-list packages and queued restocks before suggesting new packages',()=>{
  const state=fixture({restock:{b:1}}),before=structuredClone(state);
  const preview=previewRecipeAdditions(state,'r2',opts);
  assert.deepEqual(preview.plannedToBuy,{b:1});
  assert.deepEqual(preview.queuedForRecipe,{b:1});
  assert.deepEqual(preview.newExtras,{b:1});
  assert.equal(preview.plannedCostCents,300);
  assert.equal(preview.queuedForRecipeCostCents,300);
  assert.equal(preview.newCostCents,300);
  assert.equal(preview.projectedCostCents,1150);
  assert.equal(preview.projectedStatus,'risky');
  assert.equal(preview.coveredAfter,false);
  assert.deepEqual(state,before,'preview must not mutate shopping or cooking');
  const next=commitRecipeAdditions(state,preview,opts);
  assert.deepEqual(next.plan.restock,{b:2});
  assert.deepEqual(next.plan.basket,state.plan.basket);
  assert.deepEqual(next.plan.acquiredBasket,state.plan.acquiredBasket);
  assert.deepEqual(next.plan.cooked,[]);
  assert.deepEqual(next.plan.shoppingHistory,[]);
  assert.equal(next.plan.costCents,550,'planned cost changes only on confirmed restock purchase');
  assert.equal(next.tab,'shop');
  assert.deepEqual(state,before);
});

test('no duplicate extras when planned and queued packages already cover recipe',()=>{
  const state=fixture({restock:{b:2}});
  const preview=previewRecipeAdditions(state,'r2',opts);
  assert.deepEqual(preview.plannedToBuy,{b:1});
  assert.deepEqual(preview.queuedForRecipe,{b:2});
  assert.deepEqual(preview.newExtras,{});
  assert.deepEqual(commitRecipeAdditions(state,preview,opts).plan.restock,{b:2});
});

test('missing ingredients already on original checklist are not charged twice',()=>{
  const state=fixture({acquired:{a:1},basket:{a:2,b:3}});
  const preview=previewRecipeAdditions(state,'r2',opts);
  assert.deepEqual(preview.plannedToBuy,{b:3});
  assert.deepEqual(preview.newExtras,{});
  assert.equal(preview.newCostCents,0);
  assert.equal(preview.projectedCostCents,state.plan.costCents);
});

test('cooked ingredient deductions are included, but completed meals are never modified',()=>{
  const state=fixture({basket:{a:2,b:1},acquired:{a:1},cooked:['r1']});
  const preview=previewRecipeAdditions(state,'r2',opts);
  assert.deepEqual(preview.plannedToBuy,{a:1,b:1});
  assert.deepEqual(preview.newExtras,{b:2});
  assert.equal(preview.projectedStatus,'ready');
  const next=commitRecipeAdditions(state,preview,opts);
  assert.deepEqual(next.plan.cooked,['r1']);
  assert.deepEqual(next.plan.acquiredBasket,{a:1});
});

test('before first checkout, plan does not pretend the basket has been bought',()=>{
  const state=fixture({purchased:false,acquired:{},basket:{a:1,b:1}});
  const preview=previewRecipeAdditions(state,'r2',opts);
  assert.equal(preview.wasPurchased,false);
  assert.deepEqual(preview.plannedToBuy,{a:1,b:1});
  assert.deepEqual(preview.newExtras,{b:2});
  const next=commitRecipeAdditions(state,preview,opts);
  assert.equal(next.plan.purchased,false);
  assert.deepEqual(next.plan.acquiredBasket,{});
});

test('weekly budget includes queued restocks, and over-budget additions need explicit acknowledgement',()=>{
  const state=fixture({budgetCents:1000,restock:{b:1}});
  const preview=previewRecipeAdditions(state,'r2',opts);
  assert.equal(preview.remainingBudgetCents,150);
  assert.equal(preview.overBudgetCents,150);
  assert.throws(()=>commitRecipeAdditions(state,preview,opts),/Acknowledge/);
  const next=commitRecipeAdditions(state,preview,{...opts,acknowledgeOverBudget:true});
  assert.equal(next.plan.restock.b,2);
  assert.equal(state.plan.restock.b,1);
});

test('frozen weekly package prices win over changed catalog prices',()=>{
  const state=fixture({});
  state.products.find(p=>p.id==='b').priceCents=99999;
  const preview=previewRecipeAdditions(state,'r2',opts);
  assert.equal(preview.newCostCents,600);
  assert.equal(preview.projectedCostCents,1150);
});

test('stale previews fail if shopping, cooking, restocks, menu, prices or preferences change',()=>{
  for(const edit of [
    s=>{s.plan.acquiredBasket.b=1;},
    s=>{s.plan.cooked.push('r1');},
    s=>{s.plan.restock.b=3;},
    s=>{s.plan.menuIds[0]='r4';},
    s=>{s.products[0].priceCents++;},
    s=>{s.preferences.r2='yuck';}
  ]){
    const state=fixture(),preview=previewRecipeAdditions(state,'r2',opts);
    edit(state);
    assert.throws(()=>commitRecipeAdditions(state,preview,opts),/Preview/);
  }
});

test('tampered preview package counts are ignored and recomputed',()=>{
  const state=fixture(),preview=previewRecipeAdditions(state,'r2',opts);
  preview.newExtras={c:999};
  const next=commitRecipeAdditions(state,preview,opts);
  assert.deepEqual(next.plan.restock,{b:2});
});

test('rejects unknown, off-menu, cooked and completed dinner previews',()=>{
  const state=fixture();
  assert.throws(()=>previewRecipeAdditions(state,'missing',opts),/week’s menu/);
  state.plan.cooked=['r1'];
  assert.throws(()=>previewRecipeAdditions(state,'r1',opts),/already been cooked/);
  state.plan.cooked=['r1','r2'];
  assert.throws(()=>previewRecipeAdditions(state,'r3',opts),/complete/);
  assert.throws(()=>previewRecipeAdditions({...state,plan:null},'r1',opts),/weekly menu/);
});

test('real recipe add-on queue can be bought, deducted, and backed up',()=>{
  const plan=optimizePlan({budgetCents:15000,nights:3,servings:4,targetOptions:8,
    recipes:RECIPES,products:PRODUCTS,attempts:25});
  const initial=Object.entries(plan.basket)[0];
  recordShopping(plan,{[initial[0]]:1});
  const state={plan,products:structuredClone(PRODUCTS),preferences:{},tab:'menu',
    budget:150,nights:3,servings:4,options:8,strategy:'balanced',autoSubstitutions:true,discoverIndex:0,weekArchive:[]};
  const recipeId=plan.menuIds.find(id=>menuStatuses(plan,RECIPES,PRODUCTS).find(s=>s.id===id).status==='missing');
  assert.ok(recipeId,'partial checkout should leave an unavailable recipe');
  const preview=previewRecipeAdditions(state,recipeId,{recipes:RECIPES});
  const next=commitRecipeAdditions(state,preview,{recipes:RECIPES,acknowledgeOverBudget:true});
  assert.equal(next.plan.costCents,plan.costCents);
  const restored=parseBackup(createBackup(next),{recipes:RECIPES,products:PRODUCTS});
  assert.deepEqual({...restored.plan.restock},next.plan.restock);
  if(Object.keys(next.plan.restock).length){
    recordRestock(next.plan);
    assert.equal(next.plan.restock&&Object.keys(next.plan.restock).length,0);
  }
});

test('purchasing planned and queued add-ons makes selected recipe cookable without fake inventory',()=>{
  const state=fixture({acquired:{a:1},basket:{a:1,b:1}});
  const preview=previewRecipeAdditions(state,'r2',opts);
  const next=commitRecipeAdditions(state,preview,opts);
  assert.equal(menuStatuses(next.plan,recipes,products).find(s=>s.id==='r2').status,'missing');
  recordShopping(next.plan,{a:1,b:1});
  assert.equal(menuStatuses(next.plan,recipes,products).find(s=>s.id==='r2').status,'missing');
  recordRestock(next.plan);
  assert.notEqual(menuStatuses(next.plan,recipes,products).find(s=>s.id==='r2').status,'missing');
});

test('fractional ingredient needs round to whole packages only after crediting bought stock',()=>{
  const fractionalProducts=[{id:'flour',name:'Flour',category:'Pantry',unit:'g',packageQuantity:500,priceCents:299}];
  const fractionalRecipes=[{id:'r1',name:'Baking',ingredients:{flour:750}},
    {id:'r2',name:'Toast',ingredients:{flour:250}},
    {id:'r3',name:'Pancakes',ingredients:{flour:500}}];
  const state=fixture();
  state.plan.basket={flour:2};
  state.plan.acquiredBasket={flour:1};
  state.plan.shoppingCounts={flour:1};
  state.plan.menuIds=['r1','r2','r3'];
  state.plan.anchors=['r1','r2'];
  state.plan.priceBook=fractionalProducts;
  state.plan.costCents=598;
  state.products=fractionalProducts;
  const preview=previewRecipeAdditions(state,'r1',{recipes:fractionalRecipes});
  assert.deepEqual(preview.plannedToBuy,{flour:1});
  assert.deepEqual(preview.newExtras,{});
  assert.equal(preview.projectedStatus,'ready');
});

test('recipe-specific approved substitutions determine which grocery is missing',()=>{
  const plan=optimizePlan({budgetCents:15000,nights:3,servings:4,targetOptions:8,
    recipes:RECIPES,products:PRODUCTS,attempts:15});
  // Use a controlled menu so the test does not depend on heuristic ordering.
  plan.menuIds=['beef-tacos','chicken-fajitas','veggie-fried-rice'];
  plan.anchors=['beef-tacos','chicken-fajitas','veggie-fried-rice'];
  plan.nights=3;
  plan.recipeSubstitutions={'beef-tacos':{beef:'turkey'}};
  plan.basket={beef:1};
  plan.costCents=basketCost(plan.basket,PRODUCTS);
  const state={plan,products:PRODUCTS,preferences:{}};
  const preview=previewRecipeAdditions(state,'beef-tacos',{recipes:RECIPES});
  assert.ok(Object.hasOwn(preview.missing,'turkey'));
  assert.equal(Object.hasOwn(preview.missing,'beef'),false);
  assert.ok(Object.hasOwn(preview.newExtras,'turkey'));
});
