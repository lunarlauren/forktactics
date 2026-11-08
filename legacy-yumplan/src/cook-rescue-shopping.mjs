// Turn a risky dinner's advisory recovery calculation into a shopping checklist.
// Neither preview nor confirmation cooks a dinner or records a purchase.
import {basketCost,planProducts,remainingQuantities,canCoverNights,recipeMap,recipeRequirements,productMap} from './engine.mjs';
import {previewCookImpact,cheapestRecoveryAfterCook} from './cook-preview.mjs';

const signature=state=>JSON.stringify([state.plan,state.products,state.preferences]);
export function previewRescueShopping(state,recipeId,{recipes,products=state.products}={}){
  if(!state?.plan || !Array.isArray(recipes))throw new Error('A saved week and recipe catalog are required.');
  const plan=state.plan;
  const impact=previewCookImpact(plan,recipeId,recipes,products);
  if(impact.covered || !impact.rescue)throw new Error('This dinner does not need recovery shopping.');
  // The recorded-stock-only recovery may choose a cheap *new* package even
  // when another lineup can be finished with groceries already on the list.
  // Optimize the marginal purchase instead, crediting unbought original items
  // and queued restocks as future stock (never as groceries already acquired).
  const priceBook=planProducts(plan,products);
  const priceById=productMap(priceBook);
  const originalUnbought={};
  for(const [id,count] of Object.entries(plan.basket)){
    const unbought=Math.max(0,count-(plan.acquiredBasket?.[id]||0));
    if(unbought)originalUnbought[id]=unbought;
  }
  const credits={...originalUnbought};
  for(const [id,count] of Object.entries(plan.restock||{}))
    credits[id]=(credits[id]||0)+count;
  const hypothetical=structuredClone(plan);
  hypothetical.cooked.push(recipeId);
  const route=cheapestRecoveryAfterCook(hypothetical,recipes,products,impact.nightsLeft,{creditBasket:credits});
  if(!route)throw new Error('There are not enough remaining menu choices to finish the week.');
  const stock=remainingQuantities(hypothetical,recipes,products);
  const recipesById=recipeMap(recipes),totalNeeds={};
  for(const id of route.lineupIds)for(const [ingredient,quantity] of Object.entries(recipeRequirements(plan,recipesById[id])))
    totalNeeds[ingredient]=(totalNeeds[ingredient]||0)+quantity;
  const plannedToBuy={},alreadyQueued={},newExtras={};
  for(const [id,quantity] of Object.entries(totalNeeds)){
    const missing=Math.max(0,quantity-(stock[id]||0));
    if(missing<=1e-7)continue;
    const count=Math.ceil(missing/priceById[id].packageQuantity-1e-7);
    const planned=Math.min(count,originalUnbought[id]||0);
    const queued=Math.min(count-planned,plan.restock?.[id]||0);
    const extra=count-planned-queued;
    if(planned)plannedToBuy[id]=planned;
    if(queued)alreadyQueued[id]=queued;
    if(extra)newExtras[id]=extra;
  }
  // Ensure the itemization matches the independently optimized package count.
  if(JSON.stringify(newExtras)!==JSON.stringify(route.packages))
    throw new Error('Recovery shopping calculation was inconsistent. Please retry.');
  const newCostCents=basketCost(newExtras,priceBook);
  const queuedCostCents=basketCost(plan.restock||{},priceBook);
  const projectedCostCents=plan.costCents+queuedCostCents+newCostCents;
  const overBudgetCents=Math.max(0,projectedCostCents-plan.budgetCents);
  const restockAfter={...(plan.restock||{})};
  for(const [id,count] of Object.entries(newExtras)){
    restockAfter[id]=(restockAfter[id]||0)+count;
    if(restockAfter[id]>10000)throw new Error('Too many restock packages for '+id);
  }
  // Proof that purchasing the indicated original-list and restock packages
  // will cover the future lineup. Do not treat them as purchased in real state.
  hypothetical.acquiredBasket={...plan.acquiredBasket};
  for(const basket of [plannedToBuy,restockAfter])for(const [id,count] of Object.entries(basket))
    hypothetical.acquiredBasket[id]=(hypothetical.acquiredBasket[id]||0)+count;
  const remaining=remainingQuantities(hypothetical,recipes,products);
  const coveredAfter=canCoverNights(remaining,
    plan.menuIds.filter(id=>!hypothetical.cooked.includes(id)),impact.nightsLeft,
    recipes,plan.servings,hypothetical);
  if(!coveredAfter)throw new Error('Recovery packages no longer cover the remaining dinners. Preview again.');
  return {baseSignature:signature(state),recipeId,impact,lineupIds:route.lineupIds,plannedToBuy,alreadyQueued,
    newExtras,restockAfter,newCostCents,queuedCostCents,projectedCostCents,
    overBudgetCents,coveredAfter};
}
export function commitRescueShopping(state,preview,{recipes,products=state.products,acknowledgeOverBudget=false}={}){
  if(!preview||preview.baseSignature!==signature(state))
    throw new Error('Shopping, cooking, menu or prices changed. Preview recovery again.');
  const fresh=previewRescueShopping(state,preview.recipeId,{recipes,products});
  if(fresh.newCostCents&&fresh.overBudgetCents&&!acknowledgeOverBudget)
    throw new Error('Acknowledge the over-budget estimate before adding extra packages.');
  const next={...state,plan:structuredClone(state.plan),tab:'shop'};
  next.plan.restock=fresh.restockAfter;
  return next;
}
