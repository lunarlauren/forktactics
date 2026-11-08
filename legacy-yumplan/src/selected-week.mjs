// Explicit weekly dinner selection. Pure draft calculations: no pantry tracking.
import {requirements,basketForNeeds,basketCost,productMap,basketQuantities,missingQuantities,incrementalBasket,canCoverNights,improveFlexibility,PLANNING_STRATEGIES} from './engine.mjs';

export function priceSelectedDinners({selectedIds,recipes,products,servings=4,budgetCents,preferences={}}){
  if(!Array.isArray(selectedIds)||!Number.isInteger(servings)||servings<1||servings>12||!Number.isSafeInteger(budgetCents)||budgetCents<0)
    throw new Error('Invalid weekly selection settings.');
  if(new Set(selectedIds).size!==selectedIds.length)throw new Error('A dinner cannot be selected twice.');
  const byRecipe=new Map(recipes.map(r=>[r.id,r]));
  const byProduct=productMap(products), needs={};
  for(const id of selectedIds){
    const recipe=byRecipe.get(id);
    if(!recipe)throw new Error('Unknown recipe: '+id);
    if(preferences[id]==='yuck')throw new Error('A Yuck recipe cannot be added automatically: '+id);
    for(const [ingredient,quantity] of Object.entries(requirements(recipe,servings))){
      if(!byProduct[ingredient])throw new Error('No price for ingredient: '+ingredient);
      needs[ingredient]=(needs[ingredient]||0)+quantity;
    }
  }
  const basket=basketForNeeds(needs,products);
  const costCents=basketCost(basket,products);
  return {selectedIds:[...selectedIds],needs,basket,costCents,budgetCents,remainingCents:budgetCents-costCents,withinBudget:costCents<=budgetCents};
}

// A candidate is grayed out when it would make the selected basket exceed budget.
// A swap removes the old recipe before evaluating the replacement, releasing its ingredients.
export function evaluateDinnerChoices({selectedIds,recipes,products,servings=4,budgetCents,preferences={},replacingId=null}){
  if(replacingId!==null&&!selectedIds.includes(replacingId))throw new Error('Cannot replace an unselected dinner.');
  const base=selectedIds.filter(id=>id!==replacingId);
  return recipes.map(recipe=>{
    if(preferences[recipe.id]==='yuck')return {id:recipe.id,available:false,reason:'Yuck'};
    if(base.includes(recipe.id))return {id:recipe.id,available:false,reason:'Already selected'};
    try{
      const estimate=priceSelectedDinners({selectedIds:[...base,recipe.id],recipes,products,servings,budgetCents,preferences});
      return {id:recipe.id,available:estimate.withinBudget,reason:estimate.withinBudget?'Available':'Over budget',costCents:estimate.costCents};
    }catch(error){return {id:recipe.id,available:false,reason:error.message};}
  });
}

// Broad dinner styles, independent of protein. Prevent five different pasta
// proteins from masquerading as five distinct dinners.
export function dinnerStyle(recipe){
  const name=(recipe.name||'').toLowerCase();
  const tags=(recipe.tags||[]).join(' ').toLowerCase();
  const text=name+' '+tags;
  if(/pasta|spaghetti|alfredo|lasagna|mac(aroni)?( and | & | n )?cheese|penne|fettuccine|linguine|ravioli|tortellini|noodle/.test(text))return 'pasta';
  if(/taco|burrito|quesadilla|enchilada|fajita|nacho|tostada/.test(text))return 'tex-mex';
  if(/pizza|flatbread|calzone/.test(text))return 'pizza';
  if(/soup|stew|chili|chowder|bisque/.test(text))return 'soup';
  if(/salad|bowl|grain bowl/.test(text))return 'bowl';
  if(/sandwich|burger|wrap|panini|slider/.test(text))return 'sandwich';
  if(/curry|tikka|masala|dal|daal/.test(text))return 'curry';
  if(/stir.fry|fried rice|teriyaki/.test(text))return 'stir-fry';
  if(/casserole|bake|pot pie|shepherd.s pie/.test(text))return 'bake';
  if(/roast|grill|steak|chop|fillet|filet|sheet.pan/.test(text))return 'main';
  return 'other';
}

// Deterministic suggestion of a complete week, favoring Yum and variety while
// validating the *combined* whole-package basket after each candidate addition.
export function suggestSelectedWeek({nights,recipes,products,servings=4,budgetCents,preferences={}}){
  if(!Number.isInteger(nights)||nights<1||nights>7)throw new Error('Choose 1–7 dinners.');
  // Variety templates remain available by manual selection or an explicit Yum.
  const eligible=recipes.filter(r=>preferences[r.id]!=='yuck' && (!r.tags?.includes('Variety') || preferences[r.id]==='yum'));
  // Keep multiple partial plans: a cheap early choice is not always part of
  // the cheapest *complete* week because shared package quantities matter.
  const beamWidth=120;
  let states=[{ids:[],proteins:new Set(),styles:new Set(),pastaCount:0,costCents:0,yum:0}];
  for(let depth=0;depth<nights;depth++){
    const next=[];
    for(const state of states){
      for(const recipe of eligible){
        if(state.ids.includes(recipe.id))continue;
        let priced;
        try {priced=priceSelectedDinners({selectedIds:[...state.ids,recipe.id],recipes,products,servings,budgetCents,preferences});}
        catch {continue;}
        if(!priced.withinBudget)continue;
        const proteins=new Set(state.proteins);proteins.add(recipe.protein);
        const yum=state.yum+(preferences[recipe.id]==='yum'?1:0);
        const style=dinnerStyle(recipe);
        const styles=new Set(state.styles);styles.add(style);
        const pastaCount=state.pastaCount+(style==='pasta'?1:0);
        next.push({ids:[...state.ids,recipe.id],proteins,styles,pastaCount,costCents:priced.costCents,yum});
      }
    }
    if(!next.length)throw new Error('No complete week fits the budget and preferences.');
    // Retain both high-preference plans and low-cost plans to avoid a greedy dead end.
    const ranked=[...next].sort((a,b)=>b.styles.size-a.styles.size||a.pastaCount-b.pastaCount||b.yum-a.yum||b.proteins.size-a.proteins.size||a.costCents-b.costCents);
    const cheapest=[...next].sort((a,b)=>a.costCents-b.costCents||b.yum-a.yum);
    const unique=new Map();
    for(const state of [...ranked.slice(0,beamWidth/2),...cheapest.slice(0,beamWidth/2)]){
      const key=[...state.ids].sort().join('|');
      if(!unique.has(key))unique.set(key,state);
    }
    states=[...unique.values()];
  }
  const best=[...states].sort((a,b)=>b.styles.size-a.styles.size||a.pastaCount-b.pastaCount||b.yum-a.yum||b.proteins.size-a.proteins.size||a.costCents-b.costCents)[0];
  if(!best)throw new Error('No complete week fits the budget and preferences.');
  return priceSelectedDinners({selectedIds:best.ids,recipes,products,servings,budgetCents,preferences});
}


// Turn N hand-picked must-have dinners into a restaurant-style menu with more
// choices than nights. Alternatives share the same purchased packages; they
// are NOT an additional commitment to cook every advertised recipe.
export function buildFlexibleSelectedPlan({selectedIds,recipes,products,servings=4,budgetCents,
  targetOptions=12,preferences={},strategy='balanced'}){
  if(!PLANNING_STRATEGIES[strategy])throw new Error('Choose a valid shopping priority.');
  if(!Array.isArray(selectedIds)||!selectedIds.length||selectedIds.length>7)
    throw new Error('Choose 1–7 must-have dinners first.');
  if(!Number.isInteger(targetOptions)||targetOptions<=selectedIds.length)
    throw new Error('Menu choices must exceed cooking nights.');
  const anchors=priceSelectedDinners({selectedIds,recipes,products,servings,budgetCents,preferences});
  if(!anchors.withinBudget)throw new Error('Selected dinners exceed your grocery budget.');
  // Variety templates remain available by manual selection or an explicit Yum.
  const eligible=recipes.filter(r=>preferences[r.id]!=='yuck' && (!r.tags?.includes('Variety') || preferences[r.id]==='yum'));
  if(eligible.length<=selectedIds.length)
    throw new Error('No alternative dinners are eligible. Un-Yuck a recipe to make a flexible menu.');
  const byId=new Map(recipes.map(r=>[r.id,r]));
  // A bad price in an unselected recipe must not break the user's chosen meals.
  const alternatives=eligible.filter(r=>!selectedIds.includes(r.id)).filter(r=>{
    try{basketForNeeds(requirements(r,servings),products);return true;}
    catch{return false;}
  });
  const ready=basket=>{
    const available=basketQuantities(basket,products);
    return alternatives.filter(r=>!Object.keys(missingQuantities(available,requirements(r,servings))).length);
  };
  let basket={...anchors.basket};
  // Reuse already purchased packages first; add the least-cost incremental
  // whole-package candidate only when more menu options are still needed.
  for(let i=0;i<alternatives.length&&ready(basket).length+selectedIds.length<targetOptions;i++){
    const currentlyReady=new Set(ready(basket).map(r=>r.id));
    const oldCost=basketCost(basket,products);
    let best=null;
    for(const recipe of alternatives){
      if(currentlyReady.has(recipe.id))continue;
      const candidate=incrementalBasket(basket,requirements(recipe,servings),products);
      const costCents=basketCost(candidate,products);
      if(costCents>budgetCents)continue;
      const unlocked=ready(candidate).filter(r=>!currentlyReady.has(r.id));
      const addedCents=costCents-oldCost;
      // Prefer additions that unlock more options per dollar, with a modest
      // Yum tie-break. No approximate per-serving pricing is used.
      const benefit=unlocked.length+unlocked.filter(r=>preferences[r.id]==='yum').length*0.25;
      const rank=addedCents/benefit;
      if(!best||rank<best.rank||(rank===best.rank&&addedCents<best.addedCents)||
        (rank===best.rank&&addedCents===best.addedCents&&recipe.id<best.id))
        best={id:recipe.id,basket:candidate,rank,addedCents};
    }
    if(!best)break;
    basket=best.basket;
  }
  const allReady=ready(basket);
  // Preference is a tie-break, never permission to include a Yuck recipe.
  const anchorProteins=new Set(selectedIds.map(id=>byId.get(id).protein));
  allReady.sort((a,b)=>
    (preferences[b.id]==='yum'?1:0)-(preferences[a.id]==='yum'?1:0)||
    (anchorProteins.has(a.protein)?1:0)-(anchorProteins.has(b.protein)?1:0)||
    a.minutes-b.minutes||a.id.localeCompare(b.id));
  const slots=Math.max(0,targetOptions-selectedIds.length);
  const readyOptions=allReady.slice(0,slots);
  const readyIds=new Set(readyOptions.map(r=>r.id));
  // A tight grocery budget must not erase dinner choices. Fill the menu with
  // transparent, disabled restock-only alternatives instead of failing a week
  // whose must-have dinners are already affordable. Prefer alternatives that
  // reuse the most of the basket (fewest additional whole-package dollars).
  const unavailable=alternatives.filter(r=>!readyIds.has(r.id)&&!allReady.some(a=>a.id===r.id))
    .map(r=>({recipe:r,addedCents:basketCost(incrementalBasket(basket,requirements(r,servings),products),products)-basketCost(basket,products)}))
    .sort((a,b)=>a.addedCents-b.addedCents||
      (preferences[b.recipe.id]==='yum'?1:0)-(preferences[a.recipe.id]==='yum'?1:0)||
      a.recipe.minutes-b.recipe.minutes||a.recipe.id.localeCompare(b.recipe.id));
  const fallback=unavailable.slice(0,Math.max(0,slots-readyOptions.length));
  const menuIds=[...selectedIds,...readyOptions.map(r=>r.id),...fallback.map(({recipe})=>recipe.id)];
  const flexibility=improveFlexibility({basket,menuIds,nights:selectedIds.length,recipes,products,servings,
    budgetCents,premiumFraction:PLANNING_STRATEGIES[strategy].premiumFraction});
  basket=flexibility.basket;
  const costCents=basketCost(basket,products);
  if(costCents>budgetCents||!canCoverNights(basketQuantities(basket,products),menuIds,selectedIds.length,recipes,servings))
    throw new Error('Could not verify enough dinners within the grocery budget.');
  const available=basketQuantities(basket,products);
  const restockOnly=menuIds.filter(id=>Object.keys(missingQuantities(available,requirements(byId.get(id),servings))).length).length;
  const notices=[];
  if(restockOnly)notices.push(`${restockOnly} menu option${restockOnly===1?'':'s'} ${restockOnly===1?'needs':'need'} extra groceries and ${restockOnly===1?'is':'are'} unavailable until restocked; these groceries are not included in the basket estimate.`);
  if(menuIds.length<targetOptions)notices.push(`Only ${menuIds.length} eligible menu choices were available instead of ${targetOptions}.`);
  return {budgetCents,nights:selectedIds.length,servings,targetOptions,strategy,
    menuIds,anchors:[...selectedIds],basket,priceBook:products.map(p=>({...p})),costCents,flexibility,
    purchased:false,checked:{},shoppingCounts:{},acquiredBasket:{},shoppingHistory:[],cooked:[],restock:{},
    recipeSubstitutions:{},createdAt:new Date().toISOString(),warning:notices.join(' ')||null};
}

// Preview a draft dinner replacement without mutating the current selection.
export function previewSelectedDinnerSwap({selectedIds,removeId,addId,recipes,products,servings=4,budgetCents,preferences={}}){
  if(!selectedIds.includes(removeId))throw new Error('Choose a selected dinner to replace.');
  if(removeId===addId)throw new Error('Choose a different dinner.');
  if(selectedIds.includes(addId))throw new Error('That dinner is already selected.');
  const before=priceSelectedDinners({selectedIds,recipes,products,servings,budgetCents,preferences});
  const nextIds=selectedIds.map(id=>id===removeId?addId:id);
  const after=priceSelectedDinners({selectedIds:nextIds,recipes,products,servings,budgetCents,preferences});
  if(!after.withinBudget)throw new Error('This swap exceeds your grocery budget.');
  return {before,after,nextIds,changeCents:after.costCents-before.costCents};
}
