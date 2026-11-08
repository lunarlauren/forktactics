// Bounded, immutable weekly summaries. These are not a pantry ledger and do
// not contain itemized shopping receipts or quantities left in the kitchen.
import {basketCost} from './engine.mjs';

export const MAX_WEEK_ARCHIVE = 12;

export function summarizeWeek(plan,{archivedAt=new Date().toISOString()}={}){
  if(!plan)throw new Error('Cannot archive an empty week.');
  if(!Number.isFinite(Date.parse(archivedAt)))throw new Error('Invalid archive date.');
  const acquired=plan.acquiredBasket||{};
  return {
    startedAt:plan.createdAt,
    archivedAt,
    menuIds:[...plan.menuIds],
    cookedIds:[...(plan.cooked||[])],
    nights:plan.nights,
    servings:plan.servings,
    budgetCents:plan.budgetCents,
    basketCostCents:plan.costCents,
    recordedCostCents:basketCost(acquired,plan.priceBook),
    purchasedPackages:Object.values(acquired).reduce((total,n)=>total+n,0),
    shoppingEvents:(plan.shoppingHistory||[]).length
  };
}

export function addArchivedWeek(archive=[],plan,options={}){
  if(!plan)return [...archive];
  return [...archive,summarizeWeek(plan,options)].slice(-MAX_WEEK_ARCHIVE);
}
