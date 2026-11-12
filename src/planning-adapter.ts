export type GroceryInput={name:string;qty:number;unit:string;pack:number;price:number|null};
export type GroceryLine=GroceryInput&{packs:number;cost:number|null;requiredQty:number;pantryQty:number};
export function priceGroceryBasket(meals:{ingredients:GroceryInput[]}[],overrides:Record<string,number|null>={},pantryQuantities:Record<string,number>={}):{lines:GroceryLine[];knownTotal:number;unknownCount:number}{
  const merged=new Map<string,GroceryInput>();
  for(const meal of meals)for(const item of meal.ingredients){
    if(!Number.isFinite(item.qty)||item.qty<0)throw new Error("Invalid grocery quantity for "+item.name);
    // Optional zero-quantity ingredients are not shopping requirements. Their
    // package sizes may be blank/unknown and must not block an otherwise valid
    // grocery basket or introduce false price conflicts.
    if(item.qty===0)continue;
    if(!Number.isFinite(item.pack)||item.pack<=0)throw new Error("Invalid grocery package size for "+item.name);
    const key=item.name+"|"+item.unit;
    const previous=merged.get(key);
    // Different recipes can specify different package sizes for the same item.
    // Keep the quantity, but mark package pricing as uncertain instead of
    // crashing the entire shopping list or inventing a comparable price.
    const conflictingPack=Boolean(previous&&(previous.pack!==item.pack||previous.pack===0));
    // Conflicting shelf prices cannot safely be resolved by whichever recipe
    // happens to appear last. A selected price-sheet override can still resolve it.
    const conflictingPrice=Boolean(previous&&previous.price!==item.price);
    // Once a conflict is found, retain uncertainty across all subsequent meals.
    // Do not let a later priced recipe overwrite a previously unknown price.
    merged.set(key,{...item,price:conflictingPrice?null:previous?previous.price:item.price,pack:conflictingPack?0:previous?.pack??item.pack,qty:item.qty+(previous?.qty||0)});
  }
  const lines=Array.from(merged,([key,item])=>{
    // Unit-specific prices take precedence; legacy name-only price sheets remain valid.
    // This prevents a per-package price for one unit from overriding another unit.
    // An explicit unit-specific package-size override resolves conflicting recipe packs.
    // Price-sheet keys ending in |pack are reserved for package quantities.
    const packOverride=overrides[key+"|pack"];
    // An explicitly invalid package-size override must not silently fall back to
    // the recipe package size and display a falsely confident grocery estimate.
    const hasPackOverride=Object.prototype.hasOwnProperty.call(overrides,key+"|pack");
    const pack=hasPackOverride?(typeof packOverride==="number"&&Number.isFinite(packOverride)&&packOverride>0?packOverride:0):item.pack;
    // A recipe price is tied to its recipe package size. When recipe package
    // sizes disagree, even an explicit pack-size override cannot establish a
    // trustworthy price without an explicit price-sheet price.
    const hasUnitPrice=Object.prototype.hasOwnProperty.call(overrides,key);
    const hasLegacyPrice=Object.prototype.hasOwnProperty.call(overrides,item.name);
    // A package-size override changes what one shelf-price purchase represents.
    // Never reuse a recipe price for a differently sized package: require a
    // price-sheet price, even when only one recipe uses this ingredient.
    const changedPack=pack!==item.pack;
    const price=hasUnitPrice?overrides[key]:hasLegacyPrice?overrides[item.name]:item.pack===0||changedPack?null:item.price;
    const recorded=pantryQuantities[item.name+"|"+item.unit];
    const pantryQty=typeof recorded==="number"&&Number.isFinite(recorded)&&recorded>0?Math.min(recorded,item.qty):0;
    const requiredQty=item.qty;
    const qty=Math.max(0,requiredQty-pantryQty);
    const packs=pack>0?Math.ceil(qty/pack):0;
    const validPrice=price!==null&&typeof price==="number"&&Number.isFinite(price)&&price>=0;
    // Invalid imported or edited shelf prices are unknown, never negative/NaN
    // values shown as if they were usable prices in the shopping list.
    const safePrice=validPrice?price:null;
    // No purchase is needed when verified pantry stock covers the requirement.
    // An unknown shelf price must not make a zero-package grocery line unpriced.
    return {...item,pack,qty,requiredQty,pantryQty,price:safePrice,packs,cost:qty===0?0:pack===0?null:validPrice?packs*Math.round(price*100)/100:null};
  });
  const knownTotal=Math.round(lines.reduce((sum,line)=>sum+Math.round((line.cost??0)*100),0))/100;
  return {lines,knownTotal,unknownCount:lines.filter(x=>x.cost===null).length};
}

/** Outstanding shopping cost after verified purchases, excluding manual checkmarks.
 * Purchase quantities and pantry quantities are stored independently.
 */
export function outstandingGroceryEstimate(lines:GroceryLine[],purchasedQuantities:Record<string,number>={}){
  let knownTotalCents=0;
  let unknownCount=0;
  for(const line of lines){
    const recorded=purchasedQuantities[line.name+"|"+line.unit];
    const purchased=typeof recorded==="number"&&Number.isFinite(recorded)&&recorded>0?recorded:0;
    const remaining=Math.max(0,line.qty-purchased);
    if(remaining===0)continue;
    if(!Number.isFinite(line.pack)||line.pack<=0||line.price===null||!Number.isFinite(line.price)||line.price<0){
      unknownCount++;
      continue;
    }
    knownTotalCents+=Math.ceil(remaining/line.pack)*Math.round(line.price*100);
  }
  return {knownTotal:Math.round(knownTotalCents)/100,unknownCount};
}


/** Read-only cookability check against confirmed stock, never shopping checkmarks.
 * Duplicate ingredient entries are consolidated before comparing with inventory.
 * Missing quantities are expressed in the recipe's own units.
 */
export function recipeIngredientAvailability(
  ingredients:Pick<GroceryInput,"name"|"unit"|"qty">[],
  inventory:Record<string,number>={}
):{canCook:boolean;missing:{name:string;unit:string;qty:number}[]}{
  const required=new Map<string,{name:string;unit:string;qty:number}>();
  for(const item of ingredients){
    if(!Number.isFinite(item.qty)||item.qty<0)throw new Error("Invalid recipe quantity for "+item.name);
    if(item.qty===0)continue;
    const key=item.name+"|"+item.unit;
    const previous=required.get(key);
    required.set(key,{name:item.name,unit:item.unit,qty:(previous?.qty??0)+item.qty});
  }
  const missing:Array<{name:string;unit:string;qty:number}>=[];
  for(const [key,item] of required){
    const recorded=inventory[key];
    const available=typeof recorded==="number"&&Number.isFinite(recorded)&&recorded>0?recorded:0;
    const shortfall=Math.max(0,item.qty-available);
    if(shortfall>0)missing.push({name:item.name,unit:item.unit,qty:shortfall});
  }
  return {canCook:missing.length===0,missing};
}

/** Subtract confirmed cooking events from recorded stock without mutating inputs.
 * Only events in the current shopping trip consume this trip's inventory.
 * Duplicate ingredient entries and repeated cooks are charged independently.
 */
export function remainingConfirmedStock(
  purchased:Record<string,number>,
  pantry:Record<string,number>,
  events:{recipe:string;at:string}[],
  tripStartedAt:string|null,
  requirements:(recipeId:string)=>Pick<GroceryInput,"name"|"unit"|"qty">[]|undefined
):Record<string,number>{
  const remaining:Record<string,number>={};
  for(const source of [purchased,pantry])for(const [key,qty] of Object.entries(source)){
    if(typeof qty==="number"&&Number.isFinite(qty)&&qty>0)remaining[key]=(remaining[key]||0)+qty;
  }
  if(!tripStartedAt)return remaining;
  const tripStartMs=Date.parse(tripStartedAt);
  // An invalid trip boundary cannot safely classify historical cooks.
  if(!Number.isFinite(tripStartMs))return remaining;
  for(const event of events){
    // Compare instants, not timestamp strings: equivalent times can use
    // different timezone offsets or fractional-second precision.
    const eventMs=typeof event.at==="string"?Date.parse(event.at):NaN;
    if(!Number.isFinite(eventMs)||eventMs<tripStartMs)continue;
    const ingredients=requirements(event.recipe);
    if(!ingredients)continue;
    for(const item of ingredients){
      if(!Number.isFinite(item.qty)||item.qty<=0)continue;
      const key=item.name+"|"+item.unit;
      remaining[key]=(remaining[key]||0)-item.qty;
    }
  }
  return remaining;
}


/** Select the requested number of actual menu choices, ignoring empty slots.
 * Grocery shopping is based on meals, not the position of a meal in the UI.
 */
export function shoppingMenuIds(plan:string[],target:number):string[]{
  const count=Number.isFinite(target)?Math.max(0,Math.floor(target)):0;
  return plan.filter(id=>typeof id==="string"&&id.trim().length>0).slice(0,count);
}


/** Confirm checked grocery lines as purchases of the remaining whole packs.
 * Already recorded purchases must not be replaced by the original basket total.
 */
export function confirmCheckedGroceryPurchases(
  lines:GroceryLine[],
  checked:string[],
  existing:Record<string,number>={}
):Record<string,number>{
  const purchased={...existing};
  for(const line of lines){
    const key=line.name+"|"+line.unit;
    const uniqueName=lines.filter(item=>item.name===line.name).length===1;
    if(!checked.includes(key)&&!(uniqueName&&checked.includes(line.name)))continue;
    const previous=typeof purchased[key]==="number"&&Number.isFinite(purchased[key])&&purchased[key]>0?purchased[key]:0;
    const remaining=Math.max(0,line.qty-previous);
    if(remaining===0||!Number.isFinite(line.pack)||line.pack<=0)continue;
    purchased[key]=previous+Math.ceil(remaining/line.pack)*line.pack;
  }
  return purchased;
}


/** Approximate recipe ingredient-use cost for comparing menu candidates.
 * This is not checkout cost: the grocery basket rounds up to whole packs.
 * Unknown or invalid shelf prices must never make a recipe look cheaper.
 */
export function recipeIngredientCostEstimate(
  recipe:{ingredients:GroceryInput[];servings:number},
  overrides:Record<string,number|null>={}
):{cost:number;unknown:number}{
  let cost=0,unknown=0;
  const servings=Number.isFinite(recipe.servings)&&recipe.servings>0?recipe.servings:1;
  for(const item of recipe.ingredients){
    if(!Number.isFinite(item.qty)||item.qty<0){unknown++;continue;}
    if(item.qty===0)continue;
    const key=item.name+"|"+item.unit;
    const hasPack=Object.prototype.hasOwnProperty.call(overrides,key+"|pack");
    const pack=hasPack?overrides[key+"|pack"]:item.pack;
    const hasUnit=Object.prototype.hasOwnProperty.call(overrides,key);
    const hasLegacy=Object.prototype.hasOwnProperty.call(overrides,item.name);
    const price=hasUnit?overrides[key]:hasLegacy?overrides[item.name]:pack!==item.pack?null:item.price;
    if(typeof pack!=="number"||!Number.isFinite(pack)||pack<=0||
       typeof price!=="number"||!Number.isFinite(price)||price<0){unknown++;continue;}
    cost+=item.qty/pack*price/servings;
  }
  return {cost:Math.round(cost*100)/100,unknown};
}
