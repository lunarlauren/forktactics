// Dependency-free, deterministic grocery planning engine.
export const cents = amount => Math.round(Number(amount) * 100);
export const money = amount => (amount < 0 ? '-$' : '$') + (Math.abs(amount) / 100).toFixed(2);
const EPS = 1e-7;
const sum = values => values.reduce((a,b)=>a+b,0);
export const productMap = products => Object.fromEntries(products.map(p=>[p.id,p]));
export const recipeMap = recipes => Object.fromEntries(recipes.map(r=>[r.id,r]));
// A weekly plan owns a snapshot of package sizes and prices. Editing/importing
// future prices must not retroactively change already-purchased groceries.
export const planProducts = (plan, currentProducts) => plan?.priceBook || currentProducts;
// Add newly introduced catalog products without changing saved package prices
// or quantities for existing products. Unknown user product IDs are preserved
// here, but untrusted backup data is separately validated by backup.mjs.
export function addNewCatalogProducts(savedProducts, catalogProducts){
  const known=new Set(savedProducts.map(p=>p.id));
  return [...savedProducts, ...catalogProducts.filter(p=>!known.has(p.id)).map(p=>({...p}))];
}
// The approved basket is a shopping *plan*. Once shopping is recorded, dinner
// availability must use only packages actually bought, never hoped-for items.
export const usableBasket = plan => plan.purchased ? (plan.acquiredBasket || plan.basket) : plan.basket;

// A small, bounded audit trail for *this week's* shopping changes. Entries
// describe confirmed package-count changes, not pantry stock or receipts.
// Old saved plans start with an empty trail; we never invent past purchases.
export const MAX_SHOPPING_HISTORY = 80;
function logShoppingChange(plan,type,changes,at=new Date().toISOString()){
  if(!changes.length)return;
  const history=plan.shoppingHistory||[];
  plan.shoppingHistory=[...history,{type,at,changes:changes.map(({id,before,after})=>({id,before,after}))}]
    .slice(-MAX_SHOPPING_HISTORY);
}
export function shoppingHistoryRows(plan){
  const byId=productMap(plan.priceBook);
  return (plan.shoppingHistory||[]).map(event=>({
    ...event,
    deltaCents:event.changes.reduce((total,{id,before,after})=>total+(after-before)*byId[id].priceCents,0)
  }));
}

// Record package counts, not a blanket 'all purchased' flag. Can be called
// again after another store visit, but already recorded purchases cannot vanish.
export function recordShopping(plan, counts){
  if(!plan || !counts || typeof counts!=='object' || Array.isArray(counts))throw new Error('Invalid shopping quantities.');
  const acquired={...(plan.acquiredBasket || (plan.purchased ? plan.basket : {}))};
  for(const id of Object.keys(counts))if(!Object.hasOwn(plan.basket,id))throw new Error('Unknown shopping item: '+id);
  const nextCounts={};
  for(const [id,planned] of Object.entries(plan.basket)){
    const count=counts[id] ?? acquired[id] ?? 0;
    if(!Number.isInteger(count)||count<0||count>planned)throw new Error('Purchased package count is outside the planned quantity for '+id);
    if(count<(acquired[id]||0))throw new Error('Cannot remove packages already recorded as purchased: '+id);
    if(count)nextCounts[id]=count;
  }
  if(!Object.keys(nextCounts).length)throw new Error('Record at least one purchased package to activate the menu.');
  const changes=Object.entries(nextCounts).filter(([id,n])=>n!==(acquired[id]||0))
    .map(([id,after])=>({id,before:acquired[id]||0,after}));
  plan.acquiredBasket=nextCounts;
  plan.shoppingCounts={...nextCounts};
  plan.checked=Object.fromEntries(Object.entries(plan.basket).map(([id,n])=>[id,(nextCounts[id]||0)===n]));
  plan.purchased=true;
  logShoppingChange(plan,'purchase',changes);
  return plan;
}

// The number of packages already consumed by completed dinners is the hard
// floor for a purchase correction. This is *not* pantry tracking: only the
// current week's recorded cooking is considered, at its frozen package sizes.
export function minimumPurchasedPackages(plan,recipes,products){
  if(!plan || !Array.isArray(plan.cooked))throw new Error('A weekly plan is required.');
  const byRecipe=recipeMap(recipes),byProduct=productMap(planProducts(plan,products));
  const consumed={};
  for(const id of plan.cooked){
    const recipe=byRecipe[id];
    if(!recipe || !plan.menuIds.includes(id))throw new Error('Unknown cooked dinner: '+id);
    for(const [ingredient,quantity] of Object.entries(recipeRequirements(plan,recipe)))
      consumed[ingredient]=(consumed[ingredient]||0)+quantity;
  }
  const floor={};
  for(const [id,quantity] of Object.entries(consumed)){
    const product=byProduct[id];
    if(!product || !(product.packageQuantity>0))throw new Error('Unknown consumed ingredient: '+id);
    floor[id]=Math.ceil(quantity/product.packageQuantity-EPS);
  }
  return floor;
}

// Preview a correction without modifying the plan. Ordinary shopping remains
// additive through recordShopping; this explicit action can remove an
// accidentally recorded package only when no cooked dinner relied on it.
// Counts are a patch: omitted items retain their recorded quantities.
export function previewPurchaseCorrection(plan,counts,recipes,products){
  if(!plan?.purchased)throw new Error('Record a purchase before correcting it.');
  if(!counts || typeof counts!=='object' || Array.isArray(counts))throw new Error('Invalid correction quantities.');
  const current=plan.acquiredBasket||{};
  const floors=minimumPurchasedPackages(plan,recipes,products);
  const nextCounts={...current},changes=[];
  for(const [id,count] of Object.entries(counts)){
    if(!Object.hasOwn(plan.basket,id))throw new Error('Unknown shopping item: '+id);
    if(!Number.isInteger(count)||count<0||count>plan.basket[id])
      throw new Error('Corrected package count is outside the planned quantity for '+id);
    if(count<(floors[id]||0))
      throw new Error('Cannot reduce '+id+' below '+(floors[id]||0)+' package(s) already used by cooked dinners. Undo the affected dinners first.');
    if(count!==(current[id]||0)){
      changes.push({id,before:current[id]||0,after:count});
      if(count)nextCounts[id]=count;
      else delete nextCounts[id];
    }
  }
  if(!changes.length)throw new Error('No purchase counts changed.');
  const purchased=Object.keys(nextCounts).length>0;
  if(!purchased && plan.cooked.length)throw new Error('Cooked dinners require purchased groceries.');
  const shoppingCounts={...nextCounts};
  for(const [id,count] of Object.entries(plan.shoppingCounts||{}))
    if(!Object.hasOwn(counts,id) && count>(nextCounts[id]||0))shoppingCounts[id]=count;
  const candidate={...plan,purchased,acquiredBasket:nextCounts,shoppingCounts,
    checked:Object.fromEntries(Object.entries(plan.basket).map(([id,n])=>[id,(nextCounts[id]||0)===n]))};
  // Defensive check across the *entire* cooking history, including recipe swaps.
  // Always evaluate against *actual* packages, including after a reset to zero.
  remainingQuantities({...candidate,purchased:true},recipes,products);
  const priceBook=planProducts(plan,products);
  const recordedCostCents=basketCost(nextCounts,priceBook);
  const nightsLeft=Math.max(0,plan.nights-plan.cooked.length);
  const remainingIds=plan.menuIds.filter(id=>!plan.cooked.includes(id));
  const coversRemainingNights=canCoverNights(remainingQuantities({...candidate,purchased:true},recipes,products),
    remainingIds,nightsLeft,recipes,plan.servings,candidate);
  logShoppingChange(candidate,'correction',changes);
  return {plan:candidate,changes,recordedCostCents,
    previousRecordedCostCents:basketCost(current,priceBook),coversRemainingNights};
}

// Optional extra purchases are recorded only when the user confirms them.
// They are not a pantry ledger and do not change future weeks' price books.
export function recordRestock(plan){
  if(!plan?.purchased)throw new Error('Record your initial shopping first.');
  const restock=plan.restock || {};
  const acquired={...(plan.acquiredBasket || plan.basket)};
  const basket={...plan.basket};
  const validProducts=new Set(plan.priceBook.map(p=>p.id));
  const changes=[];
  if(!Object.keys(restock).length)throw new Error('Add groceries to the restock list first.');
  for(const [id,count] of Object.entries(restock)){
    if(!validProducts.has(id)||!Number.isInteger(count)||count<=0)throw new Error('Invalid restock package count or ingredient: '+id);
    basket[id]=(basket[id]||0)+count;
    const before=acquired[id]||0;
    acquired[id]=before+count;
    changes.push({id,before,after:acquired[id]});
  }
  // Commit after all rows validate, so a bad row cannot partially alter the plan.
  plan.basket=basket;
  plan.acquiredBasket=acquired;
  plan.shoppingCounts={...acquired};
  plan.checked=Object.fromEntries(Object.entries(plan.basket).map(([id,n])=>[id,(acquired[id]||0)===n]));
  plan.restock={};
  plan.costCents=basketCost(plan.basket,plan.priceBook);
  logShoppingChange(plan,'restock',changes);
  return plan;
}



// Carefully curated same-unit, 1:1 swaps. These change only one selected
// recipe; they never mutate the optimized shopping basket or price snapshot.
// Both products already exist in the v0.6 price book, preserving old backups.
export const SUBSTITUTION_RULES = Object.freeze({
  'beef-tacos': {beef:['turkey']},
  'beef-quesadillas': {beef:['turkey']},
  'burrito-bowls': {beef:['turkey']},
  'beef-chili': {beef:['turkey']},
  'turkey-chili': {turkey:['beef']},
  'turkey-burgers': {turkey:['beef']},
  // Boneless, skinless thighs replace breast by raw weight, 1:1.
  'chicken-fajitas': {chicken:['chicken-thighs']},
  'chicken-rice': {chicken:['chicken-thighs']},
  'teriyaki-chicken': {chicken:['chicken-thighs']},
  'creamy-chicken-pasta': {chicken:['chicken-thighs']},
  'chicken-quesadillas': {chicken:['chicken-thighs']},
  'pesto-chicken': {chicken:['chicken-thighs']}
});
export function recipeRequirements(plan,recipe){
  const needs=requirements(recipe,plan.servings);
  const changes=plan.recipeSubstitutions?.[recipe.id] || {};
  for(const [from,to] of Object.entries(changes)){
    if(!SUBSTITUTION_RULES[recipe.id]?.[from]?.includes(to) || !(from in needs))
      throw new Error('Invalid ingredient substitution for '+recipe.id);
    needs[to]=(needs[to]||0)+needs[from];
    delete needs[from];
  }
  return needs;
}
export function setRecipeSubstitution(plan,recipeId,fromId,toId,recipes,products){
  if(!plan?.menuIds?.includes(recipeId))throw new Error('Recipe is not on this week\'s menu.');
  if(plan.cooked.includes(recipeId))throw new Error('A cooked recipe cannot be changed. Undo cooking first.');
  const recipe=recipeMap(recipes)[recipeId];
  if(!recipe || !(fromId in recipe.ingredients))throw new Error('Original ingredient not in this recipe.');
  if(toId!==fromId && !SUBSTITUTION_RULES[recipeId]?.[fromId]?.includes(toId))
    throw new Error('This ingredient swap has not been approved for this recipe.');
  const byId=productMap(planProducts(plan,products));
  if(!byId[fromId]||!byId[toId]||byId[fromId].unit!==byId[toId].unit)
    throw new Error('Ingredient units do not match.');
  const next={...(plan.recipeSubstitutions||{})};
  if(toId===fromId)delete next[recipeId];
  else next[recipeId]={[fromId]:toId};
  plan.recipeSubstitutions=next;
  return plan;
}
export function requirements(recipe, servings=4){
  const scale = servings / 4;
  return Object.fromEntries(Object.entries(recipe.ingredients).map(([id,q])=>[id,q*scale]));
}
export function addQuantities(a,b){
  const next = {...a};
  for(const [id,q] of Object.entries(b)) next[id]=(next[id]||0)+q;
  return next;
}
export function missingQuantities(available,need){
  const result={};
  for(const [id,q] of Object.entries(need)){
    const short=q-(available[id]||0);
    if(short>EPS) result[id]=short;
  }
  return result;
}
export function subtractQuantities(available,need){
  if(Object.keys(missingQuantities(available,need)).length) return null;
  const result={...available};
  for(const [id,q] of Object.entries(need)) result[id]=Math.max(0,(result[id]||0)-q);
  return result;
}
export function basketForNeeds(needs,products){
  const byId=productMap(products), basket={};
  for(const [id,quantity] of Object.entries(needs)){
    const product=byId[id];
    if(!product || !Number.isFinite(product.priceCents) || product.priceCents<=0 || product.packageQuantity<=0) throw new Error('Missing valid grocery price for '+id);
    const packages=Math.ceil(quantity/product.packageQuantity-EPS);
    if(packages>0) basket[id]=packages;
  }
  return basket;
}
export function basketQuantities(basket,products){
  const byId=productMap(products);
  return Object.fromEntries(Object.entries(basket).map(([id,count])=>[id,count*byId[id].packageQuantity]));
}
export function basketCost(basket,products){
  const byId=productMap(products);
  return sum(Object.entries(basket).map(([id,count])=>count*byId[id].priceCents));
}
export function incrementalBasket(basket,needs,products){
  const available=basketQuantities(basket,products), byId=productMap(products), next={...basket};
  for(const [id,qty] of Object.entries(needs)){
    const missing=Math.max(0,qty-(available[id]||0));
    if(missing>EPS) next[id]=(next[id]||0)+Math.ceil(missing/byId[id].packageQuantity-EPS);
  }
  return next;
}
export function canCoverNights(available,menuIds,nights,recipes,servings=4,plan=null){
  if(nights<=0) return true;
  if(menuIds.length<nights) return false;
  const byId=recipeMap(recipes);
  const needs=menuIds.map(id=>plan?recipeRequirements(plan,byId[id]):requirements(byId[id],servings));
  // Select an unordered combination of distinct recipes. Each recipe is cooked at most once.
  function dfs(index,left,remaining){
    if(left===0) return true;
    if(needs.length-index<left) return false;
    for(let i=index;i<=needs.length-left;i++){
      const next=subtractQuantities(remaining,needs[i]);
      if(next && dfs(i+1,left-1,next)) return true;
    }
    return false;
  }
  return dfs(0,nights,available);
}
// A "safe" choice can be cooked now without preventing the remaining
// distinct dinners. A merely cookable choice may consume a scarce ingredient.
export function safeFirstChoices(basket,menuIds,nights,recipes,products,servings=4){
  if(nights<=0) return [];
  const available=basketQuantities(basket,products), byId=recipeMap(recipes);
  return menuIds.filter(id=>{
    const after=subtractQuantities(available,requirements(byId[id],servings));
    return after && canCoverNights(after,menuIds.filter(other=>other!==id),nights-1,recipes,servings);
  });
}

// Find the least expensive *additional packages* that make a currently risky
// choice safe. Search all distinct lineups containing forcedId; unlike simply
// doubling its ingredients, this accounts for overlap with every other meal.
export function cheapestCoverageUpgrade({basket,forcedId,menuIds,nights,recipes,products,servings=4,maxAddedCents=Infinity}){
  if(!menuIds.includes(forcedId)||nights<1||menuIds.length<nights)return null;
  const byId=recipeMap(recipes), others=menuIds.filter(id=>id!==forcedId);
  const initialCost=basketCost(basket,products);
  let best=null;
  function search(start,left,need){
    if(left===0){
      const upgraded=incrementalBasket(basket,need,products);
      const addedCents=basketCost(upgraded,products)-initialCost;
      if(addedCents<=maxAddedCents && (!best||addedCents<best.addedCents)){
        best={basket:upgraded,addedCents};
      }
      return;
    }
    for(let i=start;i<=others.length-left;i++){
      const combined=addQuantities(need,requirements(byId[others[i]],servings));
      // Package costs are monotone as requirements grow; prune costly branches.
      const partialCost=basketCost(incrementalBasket(basket,combined,products),products)-initialCost;
      if(partialCost<=Math.min(maxAddedCents,best?.addedCents??Infinity))search(i+1,left-1,combined);
    }
  }
  search(0,nights-1,requirements(byId[forcedId],servings));
  return best;
}

// Optional bounded investment in flexibility. We never exceed the weekly
// budget, and cap the premium relative to the original inexpensive basket.
export function improveFlexibility({basket,menuIds,nights,recipes,products,servings=4,budgetCents,premiumFraction=0.20}){
  const originalCostCents=basketCost(basket,products);
  const maxPremiumCents=Math.min(
    Math.max(0,budgetCents-originalCostCents),
    Math.floor(originalCostCents*premiumFraction)
  );
  let current={...basket};
  const initialSafeCount=safeFirstChoices(current,menuIds,nights,recipes,products,servings).length;
  let safeIds=safeFirstChoices(current,menuIds,nights,recipes,products,servings);
  while(safeIds.length<menuIds.length){
    const safeSet=new Set(safeIds);
    const availableBudget=maxPremiumCents-(basketCost(current,products)-originalCostCents);
    if(availableBudget<=0)break;
    let best=null;
    for(const id of menuIds){
      if(safeSet.has(id))continue;
      const upgrade=cheapestCoverageUpgrade({basket:current,forcedId:id,menuIds,nights,recipes,products,servings,maxAddedCents:availableBudget});
      if(!upgrade||upgrade.addedCents<=0)continue;
      const nextSafe=safeFirstChoices(upgrade.basket,menuIds,nights,recipes,products,servings);
      const gained=nextSafe.length-safeIds.length;
      if(gained<=0)continue;
      const efficiency=gained/upgrade.addedCents;
      if(!best||efficiency>best.efficiency||(efficiency===best.efficiency&&upgrade.addedCents<best.addedCents)){
        best={...upgrade,nextSafe,efficiency};
      }
    }
    if(!best)break;
    current=best.basket;
    safeIds=best.nextSafe;
  }
  return {basket:current,initialSafeCount,safeCount:safeIds.length,premiumCents:basketCost(current,products)-originalCostCents};
}

// Strategies choose between valid plans. They are heuristic priorities, not
// certificates of global optimality. "saver" never buys flexibility top-ups.
export const PLANNING_STRATEGIES = Object.freeze({
  saver: {premiumFraction:0, label:'Spend less'},
  balanced: {premiumFraction:0.20, label:'Balanced'},
  freedom: {premiumFraction:0.40, label:'More freedom'}
});

export function betterCandidate(candidate, incumbent, strategy='balanced'){
  if(!PLANNING_STRATEGIES[strategy]) throw new Error('Unknown planning strategy.');
  if(!incumbent) return true;
  if(strategy==='balanced'){
    if(candidate.score!==incumbent.score) return candidate.score>incumbent.score;
  }else{
    // First meet as much of the requested menu size as possible. Among
    // equal-sized menus, cost is paramount in saver mode and safe first-night
    // options are paramount in freedom mode.
    const fields=strategy==='saver'
      ? [['menuCount',1],['costCents',-1],['safeCount',1],['variety',1],['favoriteCount',1]]
      : [['menuCount',1],['safeCount',1],['costCents',-1],['variety',1],['favoriteCount',1]];
    for(const [field,direction] of fields){
      if(candidate[field]!==incumbent[field]) return (candidate[field]-incumbent[field])*direction>0;
    }
  }
  // Stable tie-breaking ensures identical inputs produce identical plans.
  return candidate.costCents<incumbent.costCents;
}

function seededRandom(seed){
  let x=seed>>>0;
  return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};
}
function optimizePlanCore({budgetCents,nights=7,servings=4,targetOptions=12,recipes,products,preferences={},seed=24,attempts=160,strategy='balanced'}){
  if(!PLANNING_STRATEGIES[strategy]) throw new Error('Choose a valid shopping priority.');
  if(!Number.isFinite(budgetCents)||budgetCents<=0) throw new Error('Enter a positive budget.');
  if(!Number.isInteger(nights)||nights<1||nights>7) throw new Error('Choose 1–7 dinners.');
  if(!Number.isInteger(servings)||servings<1||servings>12) throw new Error('Choose 1–12 servings.');
  if(!Number.isInteger(targetOptions)||targetOptions<=nights) throw new Error('Menu choices must exceed cooking nights.');
  // Generated variety recipes stay selectable, but enter automatic planning only when Yummed.
  // This keeps established package-cost and substitution scenarios stable.
  const candidates=recipes.filter(r=>preferences[r.id]!=='yuck' && (!r.tags?.includes('Variety') || preferences[r.id]==='yum'));
  if(candidates.length<targetOptions) throw new Error('Not enough eligible recipes. Un-Yuck a few recipes or reduce menu choices.');
  const rand=seededRandom(seed);
  let best=null;
  for(let attempt=0;attempt<attempts;attempt++){
    const anchors=[], needs={}; let currentNeeds=needs;
    const proteins=new Set();
    for(let n=0;n<nights;n++){
      const choices=[];
      const currentCost=basketCost(basketForNeeds(currentNeeds,products),products);
      for(const r of candidates){
        if(anchors.includes(r.id))continue;
        const nextNeeds=addQuantities(currentNeeds,requirements(r,servings));
        const nextBasket=basketForNeeds(nextNeeds,products);
        const cost=basketCost(nextBasket,products);
        if(cost>budgetCents)continue;
        const novelty=proteins.has(r.protein)?5:0;
        const favorite=preferences[r.id]==='yum'?-4:0;
        const score=(cost-currentCost)/100 + novelty + favorite + rand()*17;
        choices.push({r,nextNeeds,score});
      }
      if(!choices.length)break;
      choices.sort((a,b)=>a.score-b.score);
      const choice=choices[Math.floor(rand()*Math.min(4,choices.length))];
      anchors.push(choice.r.id); currentNeeds=choice.nextNeeds;proteins.add(choice.r.protein);
    }
    if(anchors.length!==nights)continue;
    let basket=basketForNeeds(currentNeeds,products);
    const ready=()=>candidates.filter(r=>Object.keys(missingQuantities(basketQuantities(basket,products),requirements(r,servings))).length===0);
    // Add only packages that unlock a *complete* additional choice.
    for(let i=0;i<candidates.length && ready().length<targetOptions;i++){
      const available=basketQuantities(basket,products), possibilities=[];
      for(const r of candidates){
        if(!Object.keys(missingQuantities(available,requirements(r,servings))).length)continue;
        const next=incrementalBasket(basket,requirements(r,servings),products);
        const cost=basketCost(next,products);
        if(cost>budgetCents)continue;
        const delta=(cost-basketCost(basket,products))/100;
        const favorite=preferences[r.id]==='yum'?3:0;
        possibilities.push({r,next,score:delta-favorite+rand()*1.4});
      }
      if(!possibilities.length)break;
      possibilities.sort((a,b)=>a.score-b.score);
      basket=possibilities[0].next;
    }
    const allReady=ready();
    const anchorSet=new Set(anchors);
    const extras=allReady.filter(r=>!anchorSet.has(r.id));
    extras.sort((a,b)=>(preferences[b.id]==='yum'?1:0)-(preferences[a.id]==='yum'?1:0) || a.minutes-b.minutes || a.id.localeCompare(b.id));
    const menuIds=[...anchors,...extras.map(r=>r.id)].slice(0,targetOptions);
    const costCents=basketCost(basket,products);
    const variety=new Set(menuIds.map(id=>recipes.find(r=>r.id===id).protein)).size;
    const favoriteCount=menuIds.filter(id=>preferences[id]==='yum').length;
    const safeCount=safeFirstChoices(basket,menuIds,nights,recipes,products,servings).length;
    const score=menuIds.length*150 + safeCount*30 + variety*8 + favoriteCount*6 - costCents/100*2.0;
    const candidate={basket,anchors,menuIds,costCents,score,menuCount:menuIds.length,safeCount,variety,favoriteCount};
    if(betterCandidate(candidate,best,strategy))best=candidate;
  }
  if(!best) throw new Error('No feasible dinner plan fits this budget. Try fewer dinners, fewer servings, or a higher budget.');
  if(best.menuIds.length<=nights) throw new Error('This budget covers dinners but cannot offer any alternative choices. Raise the budget or plan fewer dinners.');
  // User-selectable ceiling for additional whole-package purchases. Every
  // strategy still obeys the full checkout budget and the dinner guarantee.
  const flexibility=improveFlexibility({basket:best.basket,menuIds:best.menuIds,nights,recipes,products,servings,budgetCents,premiumFraction:PLANNING_STRATEGIES[strategy].premiumFraction});
  best.basket=flexibility.basket;
  best.costCents=basketCost(best.basket,products);
  // The anchor set is a constructive proof of feasibility for the full week.
  if(best.costCents>budgetCents||!canCoverNights(basketQuantities(best.basket,products),best.menuIds,nights,recipes,servings))throw new Error('Internal coverage validation failed.');
  return {budgetCents,nights,servings,targetOptions,strategy,menuIds:best.menuIds,anchors:best.anchors,basket:best.basket,priceBook:products.map(p=>({...p})),costCents:best.costCents,flexibility,purchased:false,checked:{},shoppingCounts:{},acquiredBasket:{},shoppingHistory:[],cooked:[],restock:{},recipeSubstitutions:{},createdAt:new Date().toISOString(),warning:best.menuIds.length<targetOptions?`Found ${best.menuIds.length} choices within budget instead of ${targetOptions}.`:null};
}
// Pre-shopping swaps are intentionally bounded: compare coherent catalog-wide
// variants rather than blindly replacing every ingredient with its cheapest
// price per gram. Whole-package costs, shared groceries and dinner coverage
// are recalculated for each variant. Every saved swap is an approved per-recipe
// substitution, so ordinary shopping, cooking and backup logic still applies.
const AUTO_SWAP_SCENARIOS = Object.freeze([
  {chicken:'chicken-thighs'},
  {beef:'turkey'},
  {turkey:'beef'},
  {chicken:'chicken-thighs',beef:'turkey'},
  {chicken:'chicken-thighs',turkey:'beef'}
]);
export function autoSwapRecipes(recipes,products,swaps){
  const byProduct=productMap(products), applied={};
  const converted=recipes.map(recipe=>{
    const ingredients={...recipe.ingredients};
    for(const [from,to] of Object.entries(swaps)){
      if(!(from in ingredients) || !SUBSTITUTION_RULES[recipe.id]?.[from]?.includes(to))continue;
      if(!byProduct[from] || !byProduct[to] || byProduct[from].unit!==byProduct[to].unit)continue;
      ingredients[to]=(ingredients[to]||0)+ingredients[from];
      delete ingredients[from];
      applied[recipe.id]={[from]:to};
    }
    return {...recipe,ingredients};
  });
  return {recipes:converted,substitutions:applied};
}
export function optimizePlan(args){
  const {autoSubstitutions=false,recipes,products,attempts=160,strategy='balanced',preferences={}}=args;
  if(!autoSubstitutions)return optimizePlanCore(args);
  // Keep the established planner as a baseline. Try a bounded number of
  // alternate catalog variants; an infeasible variant cannot ruin the result.
  const scenarios=[{},...AUTO_SWAP_SCENARIOS];
  let best=null,bestScore=null;
  for(let i=0;i<scenarios.length;i++){
    const variant=autoSwapRecipes(recipes,products,scenarios[i]);
    if(i>0 && !Object.keys(variant.substitutions).length)continue;
    let plan;
    try{
      plan=optimizePlanCore({...args,recipes:variant.recipes,attempts:i===0?attempts:Math.min(attempts,48),seed:(args.seed??24)+i*101});
    }catch(error){
      if(/No feasible dinner plan|cannot offer any alternative choices/.test(error.message))continue;
      throw error;
    }
    plan.recipeSubstitutions=Object.fromEntries(plan.menuIds.filter(id=>variant.substitutions[id]).map(id=>[id,variant.substitutions[id]]));
    const available=basketQuantities(plan.basket,plan.priceBook);
    if(!canCoverNights(available,plan.menuIds,plan.nights,recipes,plan.servings,plan))throw new Error('Auto-substitution coverage check failed.');
    const safeCount=menuStatuses(plan,recipes,products).filter(x=>x.status==='ready').length;
    const variety=new Set(plan.menuIds.map(id=>recipeMap(recipes)[id].protein)).size;
    const favoriteCount=plan.menuIds.filter(id=>preferences[id]==='yum').length;
    const score=plan.menuIds.length*150+safeCount*30+variety*8+favoriteCount*6-plan.costCents/100*2;
    const candidate={menuCount:plan.menuIds.length,safeCount,costCents:plan.costCents,variety,favoriteCount,score};
    if(betterCandidate(candidate,bestScore,strategy)){
      best=plan;bestScore=candidate;
    }
  }
  if(!best)throw new Error('No feasible dinner plan fits this budget. Try fewer dinners, fewer servings, or a higher budget.');
  return best;
}
// v1.0 comparison is a read-only, apples-to-apples counterfactual. It keeps
// the SAME menu IDs, original anchor dinner lineup, servings, cooking nights,
// and frozen package price book. Unlike the actual flexibility-optimized
// basket, these previews buy ONLY enough for the same anchor dinners.
export const COMPARISON_GROUPS = Object.freeze({
  chicken: Object.freeze({label:'Chicken breast vs thighs',ids:['chicken','chicken-thighs']}),
  ground: Object.freeze({label:'Ground beef vs turkey',ids:['beef','turkey']})
});

export function fixedDinnerBasket(plan,recipes,products){
  if(!plan || !Array.isArray(plan.menuIds) || !Array.isArray(plan.anchors) ||
     !Number.isInteger(plan.nights) || plan.nights<1 || plan.anchors.length!==plan.nights ||
     new Set(plan.anchors).size!==plan.anchors.length ||
     plan.anchors.some(id=>!plan.menuIds.includes(id)))
    throw new Error('A valid anchor dinner lineup is required for basket comparison.');
  const priceBook=planProducts(plan,products), byId=recipeMap(recipes);
  let totals={};
  for(const id of plan.anchors){
    if(!byId[id])throw new Error('Unknown recipe in dinner lineup: '+id);
    totals=addQuantities(totals,recipeRequirements(plan,byId[id]));
  }
  const basket=basketForNeeds(totals,priceBook);
  const costCents=basketCost(basket,priceBook);
  const preview={...plan,basket,purchased:false,cooked:[],recipeSubstitutions:plan.recipeSubstitutions||{}};
  const statuses=menuStatuses(preview,recipes,priceBook);
  return {basket,costCents,mealIds:[...plan.anchors],
    safeCount:statuses.filter(s=>s.status==='ready').length,
    cookableCount:statuses.filter(s=>s.status==='ready'||s.status==='risky').length,
    withinBudget:costCents<=plan.budgetCents};
}

export function compareProteinBaskets(plan,recipes,products,group='chicken'){
  const spec=COMPARISON_GROUPS[group];
  if(!spec)throw new Error('Unknown protein comparison.');
  if(!plan?.menuIds?.length)throw new Error('Generate a menu before comparing groceries.');
  const byId=recipeMap(recipes), priceBook=planProducts(plan,products), byProduct=productMap(priceBook);
  const affected=plan.menuIds.filter(id=>spec.ids.some(from=>Object.hasOwn(byId[id]?.ingredients||{},from) && spec.ids.every(target=>target===from || (SUBSTITUTION_RULES[id]?.[from]?.includes(target) && byProduct[from]?.unit===byProduct[target]?.unit))));
  if(!affected.length)return {group,label:spec.label,affectedRecipes:[],scenarios:[],differenceCents:0,changes:[]};
  const scenarios=spec.ids.map(target=>{
    const substitutions=Object.fromEntries(Object.entries(plan.recipeSubstitutions||{}).map(([id,changes])=>[id,{...changes}]));
    for(const id of affected){
      const original=spec.ids.find(from=>Object.hasOwn(byId[id].ingredients,from));
      if(original===target){
        if(substitutions[id]){
          delete substitutions[id][original];
          if(!Object.keys(substitutions[id]).length)delete substitutions[id];
        }
      }else{
        if(!SUBSTITUTION_RULES[id]?.[original]?.includes(target) || byProduct[original]?.unit!==byProduct[target]?.unit)
          throw new Error('Unapproved comparison substitution for '+id);
        substitutions[id]={...(substitutions[id]||{}),[original]:target};
      }
    }
    const scenarioPlan={...plan,recipeSubstitutions:substitutions};
    const estimate=fixedDinnerBasket(scenarioPlan,recipes,priceBook);
    return {target,label:byProduct[target]?.name||target,substitutions,...estimate};
  });
  const [a,b]=scenarios;
  const changes=[...new Set([...Object.keys(a.basket),...Object.keys(b.basket)])]
    .filter(id=>(a.basket[id]||0)!==(b.basket[id]||0))
    .sort((x,y)=>(byProduct[x]?.name||x).localeCompare(byProduct[y]?.name||y))
    .map(id=>({id,name:byProduct[id]?.name||id,priceCents:byProduct[id]?.priceCents||0,
      first:a.basket[id]||0,second:b.basket[id]||0}));
  return {group,label:spec.label,affectedRecipes:affected.map(id=>({id,name:byId[id].name})),
    anchorAffectedRecipes:affected.filter(id=>plan.anchors.includes(id)).map(id=>({id,name:byId[id].name})),
    scenarios,differenceCents:b.costCents-a.costCents,changes};
}

// v1.1: A comparison is informational; applying a scenario is a separate,
// explicitly confirmed operation. The full-menu basket must cover every
// advertised option individually AND a complete set of anchor dinners. This
// uses package rounding and the saved week's prices, not a price-per-gram
// shortcut or a new random menu generation.
export function previewProteinBasketApplication(plan,recipes,products,group,target){
  if(!plan || plan.purchased || plan.cooked?.length || Object.keys(plan.acquiredBasket||{}).length)
    throw new Error('Protein basket changes are available only before recording purchases or cooking. Start a new week to change a purchased basket.');
  const comparison=compareProteinBaskets(plan,recipes,products,group);
  const scenario=comparison.scenarios.find(item=>item.target===target);
  if(!scenario)throw new Error('Choose an available protein comparison option.');
  const priceBook=planProducts(plan,products),byRecipe=recipeMap(recipes);
  const candidate={...plan,recipeSubstitutions:scenario.substitutions};
  let needs={};
  for(const id of plan.anchors){
    needs=addQuantities(needs,recipeRequirements(candidate,byRecipe[id]));
  }
  // Anchor quantities guarantee the full planned week. Each menu recipe's
  // own requirements are a lower bound for individual availability.
  for(const id of plan.menuIds){
    for(const [ingredient,qty] of Object.entries(recipeRequirements(candidate,byRecipe[id]))){
      needs[ingredient]=Math.max(needs[ingredient]||0,qty);
    }
  }
  const minimumBasket=basketForNeeds(needs,priceBook);
  const minimumCostCents=basketCost(minimumBasket,priceBook);
  if(minimumCostCents>plan.budgetCents)
    throw new Error(`This full-menu basket costs ${money(minimumCostCents)}, above the ${money(plan.budgetCents)} budget. No changes were made.`);
  // Convert substitutions to effective base (four-serving) recipes so the
  // established safe-choice optimizer can use them without special cases.
  const effectiveRecipes=recipes.map(r=>({...r,ingredients:recipeRequirements({...candidate,servings:4},r)}));
  const flexibility=improveFlexibility({basket:minimumBasket,menuIds:plan.menuIds,
    nights:plan.nights,recipes:effectiveRecipes,products:priceBook,
    servings:plan.servings,budgetCents:plan.budgetCents,
    premiumFraction:PLANNING_STRATEGIES[plan.strategy||'balanced'].premiumFraction});
  const basket=flexibility.basket,costCents=basketCost(basket,priceBook);
  if(costCents>plan.budgetCents ||
     !canCoverNights(basketQuantities(basket,priceBook),plan.menuIds,plan.nights,recipes,plan.servings,candidate))
    throw new Error('Could not validate complete dinner coverage within budget.');
  const preview={...candidate,basket,costCents,flexibility,purchased:false,
    checked:{},shoppingCounts:{},acquiredBasket:{},cooked:[],restock:{}};
  const statuses=menuStatuses(preview,recipes,priceBook);
  if(statuses.some(s=>!['ready','risky'].includes(s.status)))
    throw new Error('The selected basket does not make every menu choice cookable.');
  return {plan:preview,previousCostCents:plan.costCents,
    differenceCents:costCents-plan.costCents,
    safeCount:statuses.filter(s=>s.status==='ready').length,
    cookableCount:statuses.length,minimumCostCents};
}

// Spreadsheet-friendly, formula-escaped report for a read-only comparison.
// Each row uses the plan's price snapshot, not a later imported price sheet.
export function exportBasketComparisonCsv(comparison,priceBook){
  if(comparison?.scenarios?.length!==2)throw new Error('A two-scenario basket comparison is required.');
  const [first,second]=comparison.scenarios, byId=productMap(priceBook);
  const quote=value=>{
    let valueText=String(value??'');
    if(/^[\s]*[=+@-]/.test(valueText) && !/^-?\d+(?:\.\d+)?$/.test(valueText.trim()))valueText="'"+valueText;
    return '"'+valueText.replace(/"/g,'""')+'"';
  };
  const header=['ingredient_id','ingredient','category','package_quantity','unit','price_per_package',
    'first_packages','first_total','second_packages','second_total','second_minus_first'];
  const ids=[...new Set([...Object.keys(first.basket),...Object.keys(second.basket)])].sort((a,b)=>{
    const x=byId[a],y=byId[b];
    return x.category.localeCompare(y.category)||x.name.localeCompare(y.name);
  });
  const rows=ids.map(id=>{
    const p=byId[id];
    if(!p)throw new Error('Unknown product in basket comparison: '+id);
    const a=first.basket[id]||0,b=second.basket[id]||0;
    return [id,p.name,p.category,p.packageQuantity,p.unit,(p.priceCents/100).toFixed(2),a,(a*p.priceCents/100).toFixed(2),b,(b*p.priceCents/100).toFixed(2),((b-a)*p.priceCents/100).toFixed(2)];
  });
  rows.push(['TOTAL','','','','','', '',(first.costCents/100).toFixed(2),'',(second.costCents/100).toFixed(2),(comparison.differenceCents/100).toFixed(2)]);
  return [header.join(','),...rows.map(row=>row.map(quote).join(','))].join('\r\n');
}

export function remainingQuantities(plan,recipes,products){
  let remaining=basketQuantities(usableBasket(plan),planProducts(plan,products));
  const byId=recipeMap(recipes);
  for(const id of plan.cooked){
    remaining=subtractQuantities(remaining,recipeRequirements(plan,byId[id]));
    if(!remaining)throw new Error('Plan contains more cooked ingredients than purchased.');
  }
  return remaining;
}
export function menuStatuses(plan,recipes,products){
  const byId=recipeMap(recipes), remaining=remainingQuantities(plan,recipes,planProducts(plan,products));
  const nightsLeft=Math.max(0,plan.nights-plan.cooked.length);
  return plan.menuIds.map(id=>{
    const r=byId[id];
    if(plan.cooked.includes(id))return {id,status:'cooked',missing:{},safe:false};
    const need=recipeRequirements(plan,r), missing=missingQuantities(remaining,need);
    if(Object.keys(missing).length)return {id,status:'missing',missing,safe:false};
    if(nightsLeft===0)return {id,status:'finished',missing:{},safe:false};
    const after=subtractQuantities(remaining,need);
    const otherIds=plan.menuIds.filter(other=>other!==id&&!plan.cooked.includes(other));
    const safe=canCoverNights(after,otherIds,nightsLeft-1,recipes,plan.servings,plan);
    return {id,status:safe?'ready':'risky',missing:{},safe};
  });
}
export function formatQuantity(q,unit){
  const rounded=Math.abs(q-Math.round(q))<EPS?String(Math.round(q)):q.toFixed(1).replace(/\.0$/,'');
  return `${rounded} ${unit==='count'?'':unit}`.trim();
}
export function parsePriceCsv(text,products){
  // RFC4180-style quotes, including escaped quotes and embedded newlines.
  const rows=[];let row=[],field='',quoted=false;
  const input=text.replace(/^\uFEFF/,'');
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(c==='"'){
      if(quoted && input[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
    }else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&input[i+1]==='\n')i++;
      row.push(field);field='';if(row.some(v=>v.trim()))rows.push(row);row=[];
    }else field+=c;
  }
  if(quoted)throw new Error('CSV contains an unclosed quoted field.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  if(!rows.length)throw new Error('CSV is empty.');
  const header=rows.shift().map(s=>s.trim().toLowerCase());
  const required=['ingredient_id','name','category','package_quantity','unit','price'];
  for(const col of required)if(!header.includes(col))throw new Error('Missing CSV column: '+col);
  const byId=productMap(products), seen=new Set(), updates=[];
  for(let i=0;i<rows.length;i++){
    const entry=Object.fromEntries(header.map((h,index)=>[h,(rows[i][index]||'').trim()]));
    const existing=byId[entry.ingredient_id];
    if(!existing)throw new Error(`Row ${i+2}: unknown ingredient_id "${entry.ingredient_id}". Use the exported template IDs.`);
    if(seen.has(entry.ingredient_id))throw new Error(`Row ${i+2}: duplicate ingredient_id "${entry.ingredient_id}".`);
    if(entry.unit!==existing.unit)throw new Error(`Row ${i+2}: unit for ${existing.name} must be ${existing.unit}.`);
    const qty=Number(entry.package_quantity), price=Number(entry.price);
    if(!Number.isFinite(qty)||qty<=0||qty>1e9||!Number.isFinite(price)||price<=0||price>1e7)throw new Error(`Row ${i+2}: package quantity and price must be positive numbers within supported limits.`);
    if(existing.unit==='count'&&!Number.isInteger(qty))throw new Error(`Row ${i+2}: package count must be a whole number.`);
    if(!/^\d+(\.\d{1,2})?$/.test(entry.price))throw new Error(`Row ${i+2}: price must be dollars with at most two decimals.`);
    updates.push({...existing,name:entry.name||existing.name,category:entry.category||existing.category,packageQuantity:qty,priceCents:cents(price)});
    seen.add(entry.ingredient_id);
  }
  if(!updates.length)throw new Error('CSV has no price rows.');
  const changes=Object.fromEntries(updates.map(p=>[p.id,p]));
  return products.map(p=>changes[p.id]||p);
}
export function exportPriceCsv(products){
  const quote=value=>{
    let text=String(value??'');
    if(/^[\s]*[=+@-]/.test(text))text="'"+text; // Spreadsheet formula injection guard.
    return '"'+text.replace(/"/g,'""')+'"';
  };
  return ['ingredient_id,name,category,package_quantity,unit,price',...products.map(p=>[p.id,p.name,p.category,p.packageQuantity,p.unit,(p.priceCents/100).toFixed(2)].map(quote).join(','))].join('\r\n');
}

// Export a ready-to-use, package-based shopping list for spreadsheets or printing.
// Formula-looking names are escaped to avoid CSV spreadsheet formula execution.
export function exportShoppingCsv(plan, currentProducts){
  const products=planProducts(plan,currentProducts);
  const byId=productMap(products);
  const quote=value=>{
    let text=String(value ?? '');
    if(/^[\s]*[=+@-]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  };
  const header=['category','ingredient','packages','package_quantity','unit','price_per_package','line_total','purchased','purchased_packages','list_type'];
  const rows=Object.entries(plan.basket).map(([id,count])=>{
    const p=byId[id];
    if(!p)throw new Error('Unknown product in planned basket: '+id);
    return [p.category,p.name,count,p.packageQuantity,p.unit,(p.priceCents/100).toFixed(2),(count*p.priceCents/100).toFixed(2),(plan.purchased===false?'no':plan.acquiredBasket?((plan.acquiredBasket[id]||0)===count?'yes':'no'):(plan.checked?.[id]?'yes':'no')),plan.purchased?(plan.acquiredBasket?.[id]??count):0,'planned'];
  }).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
  const queued=Object.entries(plan.restock||{}).filter(([,n])=>n>0).map(([id,count])=>{
    const p=byId[id];
    if(!p)throw new Error('Unknown product in restock queue: '+id);
    return [p.category,p.name,count,p.packageQuantity,p.unit,(p.priceCents/100).toFixed(2),
      (count*p.priceCents/100).toFixed(2),'no',0,'restock'];
  }).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
  return [header.join(','),...rows.concat(queued).map(row=>row.map(quote).join(','))].join('\r\n');
}
