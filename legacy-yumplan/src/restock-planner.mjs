// v1.9: Build a purchase preview for ONE selected dinner from this week's
// recorded stock, unbought planned packages, and already queued restocks.
// No pantry inventory, automatic purchases, or changes to cooked meals.
import {
  basketCost,canCoverNights,menuStatuses,missingQuantities,
  planProducts,productMap,recipeMap,recipeRequirements,remainingQuantities
} from './engine.mjs';

const EPS=1e-7;
const signature=state=>JSON.stringify([state.plan,state.products,state.preferences]);
const countFor=(quantity,packageQuantity)=>Math.max(0,Math.ceil(quantity/packageQuantity-EPS));
const positiveEntries=object=>Object.entries(object).filter(([,n])=>n>0);

export function previewRecipeAdditions(state,recipeId,{recipes,products=state.products}={}){
  const plan=state.plan;
  if(!plan)throw new Error('Create a weekly menu first.');
  if(!Array.isArray(recipes))throw new Error('The recipe catalog is required.');
  if(!plan.menuIds.includes(recipeId))throw new Error('Choose a recipe on this week’s menu.');
  if(plan.cooked.includes(recipeId))throw new Error('This dinner has already been cooked.');
  if(plan.cooked.length>=plan.nights)throw new Error('This week is complete.');
  const recipe=recipeMap(recipes)[recipeId];
  if(!recipe)throw new Error('The selected recipe is no longer available.');
  const priceBook=planProducts(plan,products),byProduct=productMap(priceBook);
  // Before initial checkout, no packages are *recorded* as bought. This is
  // deliberately different from menuStatuses' optimistic pre-shop preview.
  const acquired=plan.purchased?(plan.acquiredBasket||plan.basket):{};
  const available=plan.purchased?remainingQuantities(plan,recipes,products):{};
  const need=recipeRequirements(plan,recipe);
  const missing=missingQuantities(available,need);
  const plannedToBuy={},queuedForRecipe={},newExtras={};
  for(const [id,quantity] of positiveEntries(missing)){
    const product=byProduct[id];
    if(!product||!(product.packageQuantity>0)||!Number.isInteger(product.priceCents)||product.priceCents<=0)
      throw new Error('Missing a valid frozen package price for '+id);
    const plannedUnbought=Math.max(0,(plan.basket[id]||0)-(acquired[id]||0));
    const usePlanned=Math.min(plannedUnbought,countFor(quantity,product.packageQuantity));
    const afterPlanned=Math.max(0,quantity-usePlanned*product.packageQuantity);
    const useQueued=Math.min(plan.restock?.[id]||0,countFor(afterPlanned,product.packageQuantity));
    const afterQueued=Math.max(0,afterPlanned-useQueued*product.packageQuantity);
    const extra=countFor(afterQueued,product.packageQuantity);
    if(usePlanned)plannedToBuy[id]=usePlanned;
    if(useQueued)queuedForRecipe[id]=useQueued;
    if(extra)newExtras[id]=extra;
  }
  const restockAfter={...(plan.restock||{})};
  for(const [id,count] of Object.entries(newExtras)){
    restockAfter[id]=(restockAfter[id]||0)+count;
    if(restockAfter[id]>10000)throw new Error('Too many restock packages for '+id);
  }
  const plannedCostCents=basketCost(plannedToBuy,priceBook);
  const queuedForRecipeCostCents=basketCost(queuedForRecipe,priceBook);
  const queuedCostCents=basketCost(plan.restock||{},priceBook);
  const newCostCents=basketCost(newExtras,priceBook);
  const projectedCostCents=plan.costCents+queuedCostCents+newCostCents;
  const overBudgetCents=Math.max(0,projectedCostCents-plan.budgetCents);
  const remainingBudgetCents=Math.max(0,plan.budgetCents-plan.costCents-queuedCostCents);
  // Evaluate the *hypothetical* post-checkout week. Nothing is recorded yet:
  // all queued restocks and the required original-list purchases must be bought
  // before these readiness/coverage estimates become true.
  const projectedAcquired={...acquired};
  for(const basket of [plannedToBuy,restockAfter])
    for(const [id,count] of Object.entries(basket))projectedAcquired[id]=(projectedAcquired[id]||0)+count;
  const projectedPlan={...plan,purchased:true,acquiredBasket:projectedAcquired};
  const projectedStatus=menuStatuses(projectedPlan,recipes,products).find(s=>s.id===recipeId);
  const nightsLeft=plan.nights-plan.cooked.length;
  const coveredAfter=canCoverNights(remainingQuantities(projectedPlan,recipes,products),
    plan.menuIds.filter(id=>!plan.cooked.includes(id)),nightsLeft,recipes,plan.servings,projectedPlan);
  return {
    baseSignature:signature(state),recipeId,missing,plannedToBuy,queuedForRecipe,
    newExtras,restockAfter,plannedCostCents,queuedForRecipeCostCents,
    queuedCostCents,newCostCents,projectedCostCents,overBudgetCents,
    remainingBudgetCents,projectedStatus:projectedStatus.status,
    coveredAfter,wasPurchased:plan.purchased
  };
}

export function commitRecipeAdditions(state,preview,{recipes,products=state.products,acknowledgeOverBudget=false}={}){
  if(!preview||preview.baseSignature!==signature(state))
    throw new Error('Shopping, cooking, prices, or menu changed. Preview the groceries again.');
  // Never trust cached package counts in a preview. Recalculate from the
  // unchanged plan and use only those fresh quantities.
  const fresh=previewRecipeAdditions(state,preview.recipeId,{recipes,products});
  if(fresh.newCostCents&&fresh.overBudgetCents&&!acknowledgeOverBudget)
    throw new Error('These extras exceed your weekly budget. Acknowledge the over-budget amount before adding them.');
  const next={...state,plan:structuredClone(state.plan),tab:'shop'};
  next.plan.restock=fresh.restockAfter;
  return next;
}
