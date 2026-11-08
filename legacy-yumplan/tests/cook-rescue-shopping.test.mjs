import test from 'node:test';
import assert from 'node:assert/strict';
import {previewRescueShopping,commitRescueShopping} from '../src/cook-rescue-shopping.mjs';
import {previewCookImpact} from '../src/cook-preview.mjs';
import {canCoverNights,remainingQuantities,basketCost} from '../src/engine.mjs';
const products=[
  {id:'a',name:'A',category:'Test',unit:'count',packageQuantity:2,priceCents:300},
  {id:'b',name:'B',category:'Test',unit:'count',packageQuantity:1,priceCents:400},
  {id:'c',name:'C',category:'Test',unit:'count',packageQuantity:1,priceCents:600}
];
const recipes=[
  {id:'a1',name:'A1',ingredients:{a:2}},
  {id:'a2',name:'A2',ingredients:{a:2}},
  {id:'b1',name:'B1',ingredients:{b:1}},
  {id:'c1',name:'C1',ingredients:{b:1,c:1}}
];
const opts={recipes};
function fixture({basket={a:2,b:1,c:1},restock={},budgetCents=1700}={}){
  const plan={nights:3,servings:4,menuIds:recipes.map(r=>r.id),anchors:['a1','b1','c1'],
    basket,acquiredBasket:{a:1,b:1,c:1},priceBook:structuredClone(products),
    costCents:basketCost(basket,products),budgetCents,purchased:true,cooked:[],restock,
    recipeSubstitutions:{}};
  return {plan,products:structuredClone(products),preferences:{},tab:'menu'};
}
test('uses unbought original-list packages without queueing duplicates or changing saved data',()=>{
  const state=fixture(),before=structuredClone(state);
  const preview=previewRescueShopping(state,'b1',opts);
  assert.deepEqual(preview.plannedToBuy,{a:1});
  assert.deepEqual(preview.alreadyQueued,{});
  assert.deepEqual(preview.newExtras,{});
  assert.equal(preview.newCostCents,0);
  assert.deepEqual(state,before);
  const next=commitRescueShopping(state,preview,opts);
  assert.deepEqual(next.plan.restock,{});
  assert.deepEqual(next.plan.acquiredBasket,state.plan.acquiredBasket);
  assert.deepEqual(next.plan.cooked,[]);
  assert.equal(next.tab,'shop');
});
test('existing queued restock counts toward rescue without a second queue entry',()=>{
  const state=fixture({basket:{a:1,b:1,c:1},restock:{a:1}});
  const preview=previewRescueShopping(state,'b1',opts);
  assert.deepEqual(preview.plannedToBuy,{});
  assert.deepEqual(preview.alreadyQueued,{a:1});
  assert.deepEqual(preview.newExtras,{});
  assert.deepEqual(commitRescueShopping(state,preview,opts).plan.restock,{a:1});
});
test('extra whole package is queued but neither dinner nor purchases are recorded',()=>{
  const state=fixture({basket:{a:1,b:1,c:1}}),before=structuredClone(state);
  const preview=previewRescueShopping(state,'b1',opts);
  assert.deepEqual(preview.newExtras,{a:1});
  assert.equal(preview.newCostCents,300);
  assert.equal(preview.projectedCostCents,1600);
  const next=commitRescueShopping(state,preview,opts);
  assert.deepEqual(next.plan.restock,{a:1});
  assert.deepEqual(next.plan.cooked,[]);
  assert.deepEqual(next.plan.acquiredBasket,{a:1,b:1,c:1});
  assert.deepEqual(state,before);
  const bought={...next.plan,cooked:['b1'],acquiredBasket:{a:2,b:1,c:1}};
  assert.equal(canCoverNights(remainingQuantities(bought,recipes,products),
    ['a1','a2','c1'],2,recipes,4,bought),true);
});
test('explicit over-budget acknowledgement required only when new extras are queued',()=>{
  const state=fixture({basket:{a:1,b:1,c:1},budgetCents:1400});
  const preview=previewRescueShopping(state,'b1',opts);
  assert.equal(preview.overBudgetCents,200);
  assert.throws(()=>commitRescueShopping(state,preview,opts),/Acknowledge/);
  assert.deepEqual(commitRescueShopping(state,preview,{...opts,acknowledgeOverBudget:true}).plan.restock,{a:1});
  const queued=fixture({basket:{a:1,b:1,c:1},restock:{a:1},budgetCents:1400});
  const queuedPreview=previewRescueShopping(queued,'b1',opts);
  assert.deepEqual(queuedPreview.newExtras,{});
  assert.doesNotThrow(()=>commitRescueShopping(queued,queuedPreview,opts));
});
test('stale shopping previews cannot be committed after cooking, purchases, prices, or restock edits',()=>{
  for(const edit of [
    s=>{s.plan.cooked.push('a1');},
    s=>{s.plan.acquiredBasket.a=2;},
    s=>{s.plan.restock.a=1;},
    s=>{s.plan.priceBook[0].priceCents=800;},
    s=>{s.preferences.a1='yuck';},
    s=>{s.products[0].priceCents=1000;}
  ]){
    const state=fixture({basket:{a:1,b:1,c:1}});
    const preview=previewRescueShopping(state,'b1',opts);
    edit(state);
    assert.throws(()=>commitRescueShopping(state,preview,opts),/changed/);
  }
});
test('a safe or unavailable dinner cannot create recovery shopping',()=>{
  const state=fixture({basket:{a:2,b:2,c:1}});
  state.plan.acquiredBasket={a:2,b:2,c:1};
  assert.equal(previewCookImpact(state.plan,'a1',recipes,products).covered,true);
  assert.throws(()=>previewRescueShopping(state,'a1',opts),/does not need/);
  assert.throws(()=>previewRescueShopping(state,'unknown',opts),/Choose an uncooked/);
});
test('projected estimate includes all existing queued restocks, not only packages for rescue',()=>{
  const state=fixture({basket:{a:1,b:1,c:1},restock:{c:2}});
  const preview=previewRescueShopping(state,'b1',opts);
  assert.equal(preview.queuedCostCents,1200);
  assert.equal(preview.newCostCents,300);
  assert.equal(preview.projectedCostCents,2800);
  assert.equal(preview.overBudgetCents,1100);
});

test('credits an unbought original package before suggesting a cheaper but unnecessary new purchase',()=>{
  const options={recipes:[
    {id:'dinner',name:'Dinner',ingredients:{b:1}},
    {id:'cheap',name:'Cheap new package',ingredients:{a:2}},
    {id:'already-planned',name:'Already planned package',ingredients:{c:1}}
  ]};
  const plan={nights:2,servings:4,menuIds:options.recipes.map(r=>r.id),anchors:['dinner','already-planned'],
    basket:{b:1,c:1},acquiredBasket:{b:1},priceBook:structuredClone(products),
    costCents:1000,budgetCents:1100,purchased:true,cooked:[],restock:{},recipeSubstitutions:{}};
  const state={plan,products:structuredClone(products),preferences:{},tab:'menu'};
  const before=structuredClone(state);
  assert.deepEqual(previewCookImpact(plan,'dinner',options.recipes,products).rescue.packages,{a:1});
  const preview=previewRescueShopping(state,'dinner',options);
  assert.deepEqual(preview.lineupIds,['already-planned']);
  assert.deepEqual(preview.plannedToBuy,{c:1});
  assert.deepEqual(preview.newExtras,{});
  assert.equal(preview.newCostCents,0);
  assert.equal(preview.projectedCostCents,1000);
  assert.deepEqual(state,before);
  const committed=commitRescueShopping(state,preview,options);
  assert.deepEqual(committed.plan.restock,{});
  assert.deepEqual(committed.plan.acquiredBasket,{b:1});
  assert.deepEqual(committed.plan.cooked,[]);
});

test('credits existing queued restock when selecting a different remaining lineup',()=>{
  const options={recipes:[
    {id:'dinner',name:'Dinner',ingredients:{b:1}},
    {id:'cheap',name:'Cheap new package',ingredients:{a:2}},
    {id:'already-queued',name:'Already queued package',ingredients:{c:1}}
  ]};
  const plan={nights:2,servings:4,menuIds:options.recipes.map(r=>r.id),anchors:['dinner','already-queued'],
    basket:{b:1},acquiredBasket:{b:1},priceBook:structuredClone(products),
    costCents:400,budgetCents:1100,purchased:true,cooked:[],restock:{c:1},recipeSubstitutions:{}};
  const state={plan,products:structuredClone(products),preferences:{},tab:'menu'};
  const preview=previewRescueShopping(state,'dinner',options);
  assert.deepEqual(preview.alreadyQueued,{c:1});
  assert.deepEqual(preview.newExtras,{});
  assert.equal(preview.newCostCents,0);
  assert.equal(preview.queuedCostCents,600);
  assert.deepEqual(commitRescueShopping(state,preview,options).plan.restock,{c:1});
});

test('combines original unbought and queued packages across different future dinners',()=>{
  const options={recipes:[
    {id:'dinner',name:'Dinner',ingredients:{b:1}},
    {id:'a1',name:'A1',ingredients:{a:2}},
    {id:'a2',name:'A2',ingredients:{a:2}},
    {id:'c1',name:'C1',ingredients:{c:1}}
  ]};
  const plan={nights:3,servings:4,menuIds:options.recipes.map(r=>r.id),anchors:['dinner','a1','c1'],
    basket:{b:1,c:1},acquiredBasket:{b:1},priceBook:structuredClone(products),
    costCents:1000,budgetCents:1500,purchased:true,cooked:[],restock:{a:1},recipeSubstitutions:{}};
  const state={plan,products:structuredClone(products),preferences:{},tab:'menu'};
  const preview=previewRescueShopping(state,'dinner',options);
  assert.deepEqual(preview.lineupIds,['a1','c1']);
  assert.deepEqual(preview.plannedToBuy,{c:1});
  assert.deepEqual(preview.alreadyQueued,{a:1});
  assert.deepEqual(preview.newExtras,{});
  assert.equal(preview.projectedCostCents,1300);
  const bought={...plan,cooked:['dinner'],acquiredBasket:{b:1,a:1,c:1}};
  assert.equal(canCoverNights(remainingQuantities(bought,options.recipes,products),
    options.recipes.slice(1).map(r=>r.id),2,options.recipes,4,bought),true);
});

test('only queues genuinely missing package count after both shopping credits are exhausted',()=>{
  const options={recipes:[
    {id:'dinner',name:'Dinner',ingredients:{b:1}},
    {id:'a1',name:'A1',ingredients:{a:2}},
    {id:'a2',name:'A2',ingredients:{a:2}},
    {id:'a3',name:'A3',ingredients:{a:2}}
  ]};
  const plan={nights:4,servings:4,menuIds:options.recipes.map(r=>r.id),anchors:options.recipes.map(r=>r.id),
    basket:{b:1,a:1},acquiredBasket:{b:1},priceBook:structuredClone(products),
    costCents:700,budgetCents:1500,purchased:true,cooked:[],restock:{a:1},recipeSubstitutions:{}};
  const state={plan,products:structuredClone(products),preferences:{},tab:'menu'};
  const preview=previewRescueShopping(state,'dinner',options);
  assert.deepEqual(preview.plannedToBuy,{a:1});
  assert.deepEqual(preview.alreadyQueued,{a:1});
  assert.deepEqual(preview.newExtras,{a:1});
  assert.equal(preview.newCostCents,300);
  assert.deepEqual(commitRescueShopping(state,preview,options).plan.restock,{a:2});
});

test('random small weeks match an independent brute-force incremental-cost oracle',()=>{
  const catalog=[
    {id:'a',name:'A',unit:'count',packageQuantity:2,priceCents:300},
    {id:'b',name:'B',unit:'count',packageQuantity:1,priceCents:400},
    {id:'c',name:'C',unit:'count',packageQuantity:3,priceCents:600},
    {id:'d',name:'D',unit:'count',packageQuantity:2,priceCents:200}
  ];
  let seed=7,checked=0;
  const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
  for(let iteration=0;iteration<150;iteration++){
    const dinners=[{id:'dinner',name:'Dinner',ingredients:{b:1}}];
    for(let i=0;i<4;i++)dinners.push({id:'m'+i,name:'M'+i,
      ingredients:Object.fromEntries(['a','c','d'].filter(()=>rand(3)!==0).map(id=>[id,1+rand(4)]))});
    const acquiredBasket={b:1},basket={b:1},restock={};
    for(const id of ['a','c','d']){
      const acquired=rand(2),planned=acquired+rand(2),queued=rand(2);
      if(acquired)acquiredBasket[id]=acquired;
      if(planned)basket[id]=planned;
      if(queued)restock[id]=queued;
    }
    const plan={nights:3,servings:4,menuIds:dinners.map(r=>r.id),anchors:['dinner','m0','m1'],
      basket,acquiredBasket,priceBook:catalog,costCents:1000,budgetCents:5000,
      purchased:true,cooked:[],restock,recipeSubstitutions:{}};
    if(previewCookImpact(plan,'dinner',dinners,catalog).covered)continue;
    const preview=previewRescueShopping({plan,products:catalog,preferences:{}},'dinner',{recipes:dinners});
    const stock={},credit={};
    for(const item of catalog){
      stock[item.id]=(acquiredBasket[item.id]||0)*item.packageQuantity;
      credit[item.id]=((basket[item.id]||0)-(acquiredBasket[item.id]||0)+(restock[item.id]||0))*item.packageQuantity;
    }
    stock.b--;
    let oracle=Infinity;
    for(let i=1;i<5;i++)for(let j=i+1;j<5;j++){
      const needed={};
      for(const k of [i,j])for(const [id,quantity] of Object.entries(dinners[k].ingredients))
        needed[id]=(needed[id]||0)+quantity;
      const cost=Object.entries(needed).reduce((total,[id,quantity])=>{
        const item=catalog.find(p=>p.id===id);
        const extra=Math.max(0,Math.ceil((quantity-(stock[id]||0)-(credit[id]||0))/item.packageQuantity-1e-7));
        return total+extra*item.priceCents;
      },0);
      oracle=Math.min(oracle,cost);
    }
    assert.equal(preview.newCostCents,oracle,`scenario ${iteration}`);
    assert.equal(preview.coveredAfter,true);
    checked++;
  }
  assert.ok(checked>100,'random generator should cover enough risky weeks');
});
