// Explain the original must-have dinner basket in purchasable package units.
// Alternatives are NOT added together: they are choices, not commitments.
// This is a planning explanation, not pantry inventory or measured food waste.
import {planProducts,productMap,recipeMap,recipeRequirements} from './engine.mjs';

export function basketInsights(plan,recipes,products){
  if(!plan?.basket || !Array.isArray(plan.anchors) || !plan.anchors.length)
    throw new Error('A weekly basket and must-have dinners are required.');
  const byRecipe=recipeMap(recipes), byProduct=productMap(planProducts(plan,products));
  const usage=new Map();
  for(const recipeId of plan.anchors){
    const recipe=byRecipe[recipeId];
    if(!recipe)throw new Error('Unknown must-have dinner: '+recipeId);
    for(const [ingredientId,quantity] of Object.entries(recipeRequirements(plan,recipe))){
      const item=usage.get(ingredientId)||{needed:0,recipeIds:[]};
      item.needed+=quantity;
      if(!item.recipeIds.includes(recipeId))item.recipeIds.push(recipeId);
      usage.set(ingredientId,item);
    }
  }
  const ingredientIds=[...new Set([...Object.keys(plan.basket),...usage.keys()])];
  const rows=ingredientIds.map(id=>{
    const packages=plan.basket[id]||0;
    const product=byProduct[id];
    if(!product || !Number.isSafeInteger(packages) || packages<0 || !(product.packageQuantity>0))
      throw new Error('Invalid planned grocery package: '+id);
    const boughtQuantity=packages*product.packageQuantity;
    const {needed=0,recipeIds=[]}=usage.get(id)||{};
    return {id,name:product.name,unit:product.unit,packages,packageQuantity:product.packageQuantity,
      boughtQuantity,plannedQuantity:needed,unallocatedQuantity:Math.max(0,boughtQuantity-needed),
      shortfallQuantity:Math.max(0,needed-boughtQuantity),
      usedBy:recipeIds.map(recipeId=>({id:recipeId,name:byRecipe[recipeId].name})),
      priceCents:packages*product.priceCents};
  }).sort((a,b)=>b.usedBy.length-a.usedBy.length||b.priceCents-a.priceCents||a.name.localeCompare(b.name));
  return {rows,sharedCount:rows.filter(r=>r.usedBy.length>=2).length,
    unallocatedCount:rows.filter(r=>r.unallocatedQuantity>1e-7).length,
    hasShortfall:rows.some(r=>r.shortfallQuantity>1e-7),
    mustHaveCount:plan.anchors.length};
}
