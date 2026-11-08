// v1.8: Preview-first, inventory-neutral menu changes for the active week.
// The grocery basket, price snapshot, purchases, and cooked meals are immutable.
// Only the set of alternative recipes changes; any newly unavailable recipe
// stays visible and can be restocked using the existing shopping workflow.
import {
  basketCost,canCoverNights,menuStatuses,missingQuantities,
  planProducts,productMap,recipeMap,recipeRequirements,remainingQuantities,
  subtractQuantities
} from './engine.mjs';

const signature=state=>JSON.stringify([state.plan,state.preferences,state.products]);
const remainingIds=plan=>plan.menuIds.filter(id=>!plan.cooked.includes(id));

// Anchor dinners are a consistent *possible* lineup, not a cooking schedule.
// Prefer old anchors, but ensure cooked dinners are included and future anchors
// can be prepared from remaining weekly stock whenever such a lineup exists.
function rebuildAnchors(plan,recipes,products){
  const cooked=[...plan.cooked];
  const needed=plan.nights-cooked.length;
  if(needed===0)return cooked;
  const ids=[...new Set([...plan.anchors,...plan.menuIds])]
    .filter(id=>plan.menuIds.includes(id)&&!cooked.includes(id));
  const byId=recipeMap(recipes);
  const available=remainingQuantities(plan,recipes,products);
  function find(start,chosen,left,stock){
    if(left===0)return chosen;
    for(let i=start;i<=ids.length-left;i++){
      const after=subtractQuantities(stock,recipeRequirements(plan,byId[ids[i]]));
      if(after){
        const found=find(i+1,[...chosen,ids[i]],left-1,after);
        if(found)return found;
      }
    }
    return null;
  }
  // A partly shopped week may already lack enough stock. Keep a structurally
  // valid anchor list rather than inventing purchases or deleting history.
  const future=find(0,[],needed,available)||ids.slice(0,needed);
  return [...cooked,...future];
}

export function previewMidweekSwap(state,{removeId,addId},{recipes,products=state.products}={}){
  const plan=state.plan;
  if(!plan)throw new Error('Create a weekly menu before changing its options.');
  if(plan.cooked.length>=plan.nights)throw new Error('This week is complete. Start a new week to choose more recipes.');
  const byId=recipeMap(recipes);
  if(!plan.menuIds.includes(removeId))throw new Error('Choose a recipe currently on your menu.');
  if(plan.cooked.includes(removeId))throw new Error('A cooked dinner cannot be removed from this week.');
  if(!byId[addId]||plan.menuIds.includes(addId))throw new Error('Choose a different recipe that is not already on your menu.');
  if(state.preferences?.[addId]==='yuck')throw new Error('This recipe is marked Yuck. Change its preference before adding it.');
  const next=structuredClone(plan);
  next.menuIds[next.menuIds.indexOf(removeId)]=addId;
  delete next.recipeSubstitutions?.[removeId];
  next.anchors=rebuildAnchors(next,recipes,products);
  const stockBefore=remainingQuantities(plan,recipes,products);
  const stockAfter=remainingQuantities(next,recipes,products);
  const nightsLeft=plan.nights-plan.cooked.length;
  const coveredBefore=canCoverNights(stockBefore,remainingIds(plan),nightsLeft,recipes,plan.servings,plan);
  const coveredAfter=canCoverNights(stockAfter,remainingIds(next),nightsLeft,recipes,plan.servings,next);
  if(coveredBefore&&!coveredAfter)
    throw new Error('That change would leave too few possible dinners with this week’s groceries. Try replacing a different recipe, or restock first.');
  const statuses=menuStatuses(next,recipes,products);
  const addedStatus=statuses.find(s=>s.id===addId);
  const missing=missingQuantities(stockAfter,recipeRequirements(next,byId[addId]));
  const priceBook=planProducts(plan,products),byProduct=productMap(priceBook);
  // A planned-but-unpurchased package is already on the shopping list, not an
  // extra restock purchase. Quantities are in recipe units, not package counts.
  const plannedUnbought={},extras={};
  for(const [id,qty] of Object.entries(missing)){
    const product=byProduct[id];
    if(!product)throw new Error('The new recipe uses an ingredient missing from this week’s price book.');
    const unbought=plan.purchased?Math.max(0,(plan.basket[id]||0)-(plan.acquiredBasket?.[id]||0)):0;
    const onList=Math.min(unbought,Math.ceil(qty/product.packageQuantity-1e-7));
    if(onList)plannedUnbought[id]=onList;
    const extra=Math.ceil(Math.max(0,qty-onList*product.packageQuantity)/product.packageQuantity-1e-7);
    if(extra>0)extras[id]=extra;
  }
  const extraCostCents=basketCost(extras,priceBook);
  const unavailable=statuses.filter(s=>s.status==='missing').length;
  next.flexibility=null; // Original optimizer's safe-choice metrics are stale.
  next.warning=unavailable?`${unavailable} menu choice(s) need groceries before cooking. They remain visible with restock options.`:null;
  return {
    baseSignature:signature(state),removeId,addId,nextPlan:next,
    coveredBefore,coveredAfter,nightsLeft,addedStatus:addedStatus.status,
    missing,plannedUnbought,extras,extraCostCents,
    projectedCostCents:plan.costCents+extraCostCents,
    overBudgetCents:Math.max(0,plan.costCents+extraCostCents-plan.budgetCents),
    safeCount:statuses.filter(s=>s.status==='ready').length,
    unavailable,originalCostCents:plan.costCents
  };
}

export function commitMidweekSwap(state,preview){
  if(!preview||preview.baseSignature!==signature(state))
    throw new Error('Your menu, purchases, or preferences changed. Preview the swap again.');
  if(!state.plan||!state.plan.menuIds.includes(preview.removeId)||state.plan.menuIds.includes(preview.addId))
    throw new Error('This menu change is no longer valid.');
  return {...state,plan:structuredClone(preview.nextPlan),filter:'all',tab:'menu'};
}
