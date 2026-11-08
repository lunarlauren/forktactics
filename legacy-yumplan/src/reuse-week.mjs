// Rebuild an archived restaurant-style menu against TODAY'S price spreadsheet.
// Archives intentionally have no inventory, anchor lineups, or old substitutions.
// Keep the exact historical recipe choices; some can require restocking when the
// current budget cannot afford to make every alternative immediately cookable.
import {
  addQuantities,autoSwapRecipes,basketCost,basketForNeeds,basketQuantities,
  canCoverNights,incrementalBasket,missingQuantities,PLANNING_STRATEGIES,
  recipeMap,requirements,safeFirstChoices
} from './engine.mjs';

const SWAP_SCENARIOS=[{}, {chicken:'chicken-thighs'}, {beef:'turkey'},
  {turkey:'beef'}, {chicken:'chicken-thighs',beef:'turkey'},
  {chicken:'chicken-thighs',turkey:'beef'}];

const availableCount=(basket,ids,needs,products)=>{
  const available=basketQuantities(basket,products);
  return ids.filter(id=>Object.keys(missingQuantities(available,needs[id])).length===0).length;
};

// Exhaustive search over up to 16 choose 7 anchor lineups, using integer
// package prices, with a bounded shortlist for flexibility evaluation.
function anchorCandidates(ids,needs,nights,products,budgetCents){
  const best=[];
  function search(start,left,combined,anchors){
    const basket=basketForNeeds(combined,products);
    const cost=basketCost(basket,products);
    if(cost>budgetCents)return; // Grocery needs and package costs are monotone.
    if(!left){
      const candidate={basket,anchors:[...anchors],cost};
      best.push(candidate);
      best.sort((a,b)=>a.cost-b.cost||a.anchors.join('|').localeCompare(b.anchors.join('|')));
      if(best.length>5)best.pop();
      return;
    }
    for(let i=start;i<=ids.length-left;i++){
      anchors.push(ids[i]);
      search(i+1,left-1,addQuantities(combined,needs[ids[i]]),anchors);
      anchors.pop();
    }
  }
  search(0,nights,{},[]);
  return best;
}

function addFlexibleOptions(base,ids,needs,products,budgetCents,preferences,strategy){
  const originalCost=base.cost;
  const premium=Math.min(budgetCents-originalCost,
    Math.floor(originalCost*PLANNING_STRATEGIES[strategy].premiumFraction));
  let basket={...base.basket};
  // Each optional purchase must unlock at least one entire recipe. This is
  // bounded to at most one new available recipe per iteration, never pantry stock.
  for(let step=0;step<ids.length;step++){
    const currentCount=availableCount(basket,ids,needs,products);
    let best=null;
    for(const id of ids){
      const upgraded=incrementalBasket(basket,needs[id],products);
      const delta=basketCost(upgraded,products)-basketCost(basket,products);
      if(delta<=0||basketCost(upgraded,products)>originalCost+premium)continue;
      const unlocked=availableCount(upgraded,ids,needs,products)-currentCount;
      if(unlocked<=0)continue;
      const score=(unlocked+(preferences[id]==='yum'?0.4:0))/delta;
      if(!best||score>best.score||(score===best.score&&delta<best.delta))best={basket:upgraded,score,delta};
    }
    if(!best)break;
    basket=best.basket;
  }
  return basket;
}

export function rebuildArchivedMenu(archive,settings,{recipes,products,preferences={}}){
  if(!archive||!Array.isArray(archive.menuIds))throw new Error('Choose a saved week to reuse.');
  const {nights,servings,strategy='balanced',autoSubstitutions=true}=settings;
  const budgetCents=Math.round(Number(settings.budget)*100);
  if(!Number.isInteger(nights)||nights<1||nights>7||!Number.isInteger(servings)||servings<1||servings>12||
     !Number.isSafeInteger(budgetCents)||budgetCents<=0||!PLANNING_STRATEGIES[strategy])
    throw new Error('Choose valid budget, servings, cooking nights, and shopping priority.');
  const byId=recipeMap(recipes),ids=[...archive.menuIds];
  if(new Set(ids).size!==ids.length||ids.some(id=>!byId[id]))throw new Error('The saved menu contains unknown recipes.');
  if(ids.length<=nights)throw new Error(`This saved menu has only ${ids.length} choices. Reduce cooking nights to keep more choices than dinners.`);
  const yucks=ids.filter(id=>preferences[id]==='yuck');
  if(yucks.length)throw new Error(`This saved menu includes ${yucks.length} Yuck recipe(s): ${yucks.map(id=>byId[id].name).join(', ')}. Change those ratings in Discover before reusing it.`);
  let best=null;
  for(const scenario of (autoSubstitutions?SWAP_SCENARIOS:[{}])){
    const variant=autoSwapRecipes(recipes,products,scenario);
    const variantById=recipeMap(variant.recipes);
    const needs=Object.fromEntries(ids.map(id=>[id,requirements(variantById[id],servings)]));
    for(const anchor of anchorCandidates(ids,needs,nights,products,budgetCents)){
      const basket=addFlexibleOptions(anchor,ids,needs,products,budgetCents,preferences,strategy);
      const costCents=basketCost(basket,products);
      const available=availableCount(basket,ids,needs,products);
      const safe=safeFirstChoices(basket,ids,nights,variant.recipes,products,servings).length;
      const candidate={basket,costCents,available,safe,anchors:anchor.anchors,
        substitutions:Object.fromEntries(ids.filter(id=>variant.substitutions[id]).map(id=>[id,variant.substitutions[id]])),
        premiumCents:costCents-anchor.cost,initialSafeCount:safeFirstChoices(anchor.basket,ids,nights,variant.recipes,products,servings).length};
      const rank=strategy==='saver'
        ? [-candidate.costCents,candidate.available,candidate.safe]
        : strategy==='freedom'
          ? [candidate.safe,candidate.available,-candidate.costCents]
          : [candidate.available,candidate.safe,-candidate.costCents];
      if(!best||rank.some((n,i)=>n!==best.rank[i]&&rank.slice(0,i).every((x,j)=>x===best.rank[j])&&n>best.rank[i]))best={...candidate,rank};
    }
  }
  if(!best)throw new Error(`The saved menu cannot cover ${nights} dinners for ${servings} people within ${'$'+(budgetCents/100).toFixed(2)}. Increase your budget or reduce cooking nights/servings.`);
  if(!canCoverNights(basketQuantities(best.basket,products),ids,nights,recipes,servings,
      {servings,recipeSubstitutions:best.substitutions}))
    throw new Error('The rebuilt grocery basket failed its dinner-coverage check.');
  const unavailable=ids.length-best.available;
  return {
    budgetCents,nights,servings,targetOptions:Math.max(ids.length,Number(settings.options)||ids.length),strategy,
    menuIds:ids,anchors:best.anchors,basket:best.basket,priceBook:products.map(p=>({...p})),
    costCents:best.costCents,flexibility:{initialSafeCount:best.initialSafeCount,safeCount:best.safe,premiumCents:best.premiumCents},
    purchased:false,checked:{},shoppingCounts:{},acquiredBasket:{},shoppingHistory:[],cooked:[],restock:{},
    recipeSubstitutions:best.substitutions,createdAt:new Date().toISOString(),
    warning:unavailable?`${unavailable} saved menu choice(s) need additional groceries at current prices. They remain visible with restock options.`:null
  };
}
