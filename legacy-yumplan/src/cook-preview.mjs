// Preview the *consequences* of cooking one dinner, without mutating the week.
// Unlike a recipe's isolated "cookable" status, this shows whether a complete
// lineup of the remaining dinners can still be made from recorded packages.
import {
  menuStatuses,recipeMap,recipeRequirements,remainingQuantities,subtractQuantities,
  productMap,planProducts,basketCost,basketQuantities
} from './engine.mjs';

function feasibleLineup(plan,recipes,products,nightsLeft){
  if(nightsLeft===0)return [];
  const byId=recipeMap(recipes);
  const ids=plan.menuIds.filter(id=>!plan.cooked.includes(id));
  const available=remainingQuantities(plan,recipes,products);
  function search(start,needed,stock,chosen){
    if(needed===0)return chosen;
    for(let i=start;i<=ids.length-needed;i++){
      const after=subtractQuantities(stock,recipeRequirements(plan,byId[ids[i]]));
      if(!after)continue;
      const found=search(i+1,needed-1,after,[...chosen,ids[i]]);
      if(found)return found;
    }
    return null;
  }
  return search(0,nightsLeft,available,[]);
}

// Find the least expensive additional *whole packages* needed to cover the
// remaining nights after a risky dinner. Search only this week's menu and
// frozen price book, not unapproved recipe ideas or unpurchased restocks.
// This is an exact minimum for the fixed menu/recipe combinations, not a
// globally optimized grocery plan or a live store price quote.
export function cheapestRecoveryAfterCook(plan,recipes,products,nightsLeft,{creditBasket={}}={}){
  // Optional creditBasket represents *future* purchases already on the shopping
  // list, not recorded inventory. Only the new packages are charged by the
  // optimizer. Without credits, this retains the recorded-stock-only preview.

  if(nightsLeft<=0){
    const projectedRecordedCostCents=basketCost(plan.acquiredBasket||{},planProducts(plan,products));
    return {lineupIds:[],packages:{},costCents:0,plannedUnbought:{},extras:{},
      projectedRecordedCostCents,overBudgetCents:Math.max(0,projectedRecordedCostCents-plan.budgetCents)};
  }
  const ids=plan.menuIds.filter(id=>!plan.cooked.includes(id));
  if(ids.length<nightsLeft)return null;
  const byId=recipeMap(recipes);
  const priceBook=planProducts(plan,products),byProduct=productMap(priceBook);
  const stock=remainingQuantities(plan,recipes,products);
  for(const [id,quantity] of Object.entries(basketQuantities(creditBasket,priceBook)))
    stock[id]=(stock[id]||0)+quantity;
  const needs=ids.map(id=>recipeRequirements(plan,byId[id]));
  const totals={};let best=null;
  function evaluate(lineup){
    const packages={};let costCents=0,packageCount=0;
    for(const [id,quantity] of Object.entries(totals)){
      const missing=quantity-(stock[id]||0);
      if(missing<=1e-7)continue;
      const product=byProduct[id];
      if(!product||!(product.packageQuantity>0)||!(product.priceCents>0))throw new Error('Missing valid weekly price for '+id);
      const count=Math.ceil(missing/product.packageQuantity-1e-7);
      packages[id]=count;packageCount+=count;costCents+=count*product.priceCents;
    }
    if(!best||costCents<best.costCents||(costCents===best.costCents&&packageCount<best.packageCount))
      best={lineupIds:[...lineup],packages,costCents,packageCount};
  }
  function search(start,left,lineup){
    if(left===0){evaluate(lineup);return;}
    for(let i=start;i<=ids.length-left;i++){
      for(const [id,quantity] of Object.entries(needs[i]))totals[id]=(totals[id]||0)+quantity;
      search(i+1,left-1,[...lineup,ids[i]]);
      for(const [id,quantity] of Object.entries(needs[i])){
        totals[id]-=quantity;
        if(totals[id]<=1e-7)delete totals[id];
      }
    }
  }
  search(0,nightsLeft,[]);
  if(!best)return null;
  const plannedUnbought={},extras={};
  for(const [id,count] of Object.entries(best.packages)){
    const unbought=Math.max(0,(plan.basket[id]||0)-(plan.acquiredBasket?.[id]||0));
    if(unbought)plannedUnbought[id]=Math.min(count,unbought);
    if(count>unbought)extras[id]=count-unbought;
  }
  const projectedRecordedCostCents=basketCost(plan.acquiredBasket||{},priceBook)+
    basketCost(creditBasket,priceBook)+best.costCents;
  return {lineupIds:best.lineupIds,packages:best.packages,costCents:best.costCents,
    plannedUnbought,extras,projectedRecordedCostCents,
    overBudgetCents:Math.max(0,projectedRecordedCostCents-plan.budgetCents)};
}

export function previewCookImpact(plan,recipeId,recipes,products){
  if(!plan?.purchased)throw new Error('Record your groceries before previewing a dinner.');
  if(plan.cooked.length>=plan.nights)throw new Error('All planned dinners are complete.');
  if(!plan.menuIds.includes(recipeId)||plan.cooked.includes(recipeId))
    throw new Error('Choose an uncooked recipe from this week.');
  const before=menuStatuses(plan,recipes,products);
  const selected=before.find(item=>item.id===recipeId);
  if(!['ready','risky'].includes(selected.status))
    throw new Error('This dinner needs groceries before it can be cooked.');
  const hypothetical={...plan,cooked:[...plan.cooked,recipeId]};
  const after=menuStatuses(hypothetical,recipes,products);
  const nightsLeft=plan.nights-hypothetical.cooked.length;
  const lineup=feasibleLineup(hypothetical,recipes,products,nightsLeft);
  const covered=lineup!==null;
  const previous=new Map(before.map(item=>[item.id,item.status]));
  // A completed week has no future dinner commitments to protect.
  if(nightsLeft===0)return {recipeId,nightsLeft,covered:true,exampleLineup:[],
    safeChoices:[],conditionalChoices:[],missingChoices:[],newlyMissing:[],newlyRisky:[],rescue:null,statuses:after};
  const newlyMissing=after.filter(item=>item.status==='missing' &&
    ['ready','risky'].includes(previous.get(item.id))).map(item=>item.id);
  const newlyRisky=after.filter(item=>item.status==='risky' &&
    previous.get(item.id)==='ready').map(item=>item.id);
  return {
    recipeId,nightsLeft,covered,exampleLineup:lineup||[],
    safeChoices:after.filter(item=>item.status==='ready').map(item=>item.id),
    conditionalChoices:after.filter(item=>item.status==='risky').map(item=>item.id),
    missingChoices:after.filter(item=>item.status==='missing').map(item=>item.id),
    newlyMissing,newlyRisky,
    rescue:covered?null:cheapestRecoveryAfterCook(hypothetical,recipes,products,nightsLeft),
    statuses:after
  };
}
