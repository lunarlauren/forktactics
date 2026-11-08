// Pure, preview-first weekly rollover. No pantry ledger or historical inventory.
// The caller must persist the returned state before exposing it in the UI.
import {optimizePlan} from './engine.mjs';
import {addArchivedWeek} from './week-history.mjs';

const count = values => Object.values(values || {}).filter(n => Number(n) > 0).length;
export function weekProgress(plan){
  if(!plan)return {hasProgress:false,purchasedPackages:0,cookedDinners:0,draftPackages:0,restockItems:0,historyEvents:0};
  const acquired=plan.acquiredBasket||{};
  const purchasedPackages=Object.values(acquired).reduce((sum,n)=>sum+Number(n||0),0);
  const cookedDinners=(plan.cooked||[]).length;
  const draftPackages=count(plan.shoppingCounts);
  const restockItems=count(plan.restock);
  const historyEvents=(plan.shoppingHistory||[]).length;
  // 'purchased' can be true even if corrections reduced all purchases to zero.
  const hasProgress=Boolean(plan.purchased||purchasedPackages||cookedDinners||draftPackages||restockItems||historyEvents||Object.values(plan.checked||{}).some(Boolean));
  return {hasProgress,purchasedPackages,cookedDinners,draftPackages,restockItems,historyEvents};
}

function signature(state){
  return JSON.stringify([state.plan,state.products,state.preferences,state.weekArchive||[]]);
}

export function previewWeekTransition(state,settings,{recipes,optimizer=optimizePlan}){
  const progress=weekProgress(state.plan);
  const plan=optimizer({
    budgetCents:Math.round(settings.budget*100),nights:settings.nights,
    servings:settings.servings,targetOptions:settings.options,
    strategy:settings.strategy,autoSubstitutions:settings.autoSubstitutions,
    recipes,products:state.products,preferences:state.preferences
  });
  // The preview is the exact object that will be committed, not a second
  // optimization run with potentially different output.
  return {plan,settings:{...settings},progress,baseSignature:signature(state)};
}

export function commitWeekTransition(state,preview,{acknowledged=false,archivedAt}={}){
  if(!preview||signature(state)!==preview.baseSignature)
    throw new Error('Your current week or grocery prices changed. Preview the new week again.');
  if(weekProgress(state.plan).hasProgress&&!acknowledged)
    throw new Error('Confirm that you want to clear this week’s shopping and cooking progress.');
  return {...state,...preview.settings,weekArchive:addArchivedWeek(state.weekArchive||[],state.plan,{archivedAt}),plan:structuredClone(preview.plan),tab:'menu',filter:'all'};
}
