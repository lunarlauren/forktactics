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
    merged.set(key,{...item,price:previous?.price===null||conflictingPrice?null:previous?previous.price:item.price,pack:conflictingPack?0:previous?.pack??item.pack,qty:item.qty+(previous?.qty||0)});
  }
  // Aggregating individually valid recipe amounts can still overflow to Infinity.
  // Refuse an unusable shopping basket rather than silently recommending zero packs.
  for(const item of merged.values()){
    if(!Number.isFinite(item.qty))throw new Error("Grocery quantity exceeds supported range for "+item.name);
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
    // Floating-point dust must not turn one full package into two.
    // An extremely small imported pack size can overflow the package count,
    // which must never become a purchasable cart selection.
    const rawPacks=pack>0?Math.ceil(Math.max(0,qty/pack-1e-9)):0;
    const packs=Number.isSafeInteger(rawPacks)?rawPacks:0;
    const validPackageCount=pack>0&&Number.isSafeInteger(rawPacks);
    const validPrice=price!==null&&typeof price==="number"&&Number.isFinite(price)&&price>=0;
    // Invalid imported or edited shelf prices are unknown, never negative/NaN
    // values shown as if they were usable prices in the shopping list.
    const safePrice=validPrice?price:null;
    // No purchase is needed when verified pantry stock covers the requirement.
    // An unknown shelf price must not make a zero-package grocery line unpriced.
    const cents=typeof price==="number"&&Number.isFinite(price)&&price>=0?Math.round(price*100):null;
    const lineCents=cents!==null?packs*cents:null;
    // A finite dollar value can still exceed safe cent precision. Do not
    // present a misleading checkout estimate for an unrepresentable line.
    const validLineCents=validPackageCount&&cents!==null&&Number.isSafeInteger(cents)&&
      lineCents!==null&&Number.isSafeInteger(lineCents);
    return {...item,pack,qty,requiredQty,pantryQty,price:safePrice,packs,
      cost:qty===0?0:validLineCents?(lineCents as number)/100:null};
  });
  let knownTotalCents=0;
  for(const line of lines){
    if(line.cost===null)continue;
    const cents=Math.round(line.cost*100);
    // Summing safe individual lines can overflow the basket total. Mark the
    // overflowing line unknown instead of silently reporting a $0 basket.
    if(!Number.isSafeInteger(cents)||!Number.isSafeInteger(knownTotalCents+cents)){
      line.cost=null;
      continue;
    }
    knownTotalCents+=cents;
  }
  return {lines,knownTotal:knownTotalCents/100,unknownCount:lines.filter(x=>x.cost===null).length};
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
    // Fractional recipe amounts and package counts can differ by tiny floating
    // point residues. A fully purchased ingredient must not remain on the
    // outstanding shopping bill because of arithmetic dust.
    const remaining=Math.max(0,line.qty-purchased);
    if(remaining<=1e-6)continue;
    if(!Number.isFinite(line.pack)||line.pack<=0||line.price===null||!Number.isFinite(line.price)||line.price<0){
      unknownCount++;
      continue;
    }
    const packs=Math.ceil(Math.max(0,remaining/line.pack-1e-9));
    const cents=Math.round(line.price*100);
    const lineCents=packs*cents;
    // An imported package size or price can overflow an otherwise valid
    // shopping estimate. Mark it unknown instead of displaying $0/Infinity.
    if(!Number.isSafeInteger(packs)||!Number.isSafeInteger(cents)||
       !Number.isSafeInteger(lineCents)||!Number.isSafeInteger(knownTotalCents+lineCents)){
      unknownCount++;
      continue;
    }
    knownTotalCents+=lineCents;
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
    const total=(previous?.qty??0)+item.qty;
    if(!Number.isFinite(total))throw new Error("Recipe quantity exceeds supported range for "+item.name);
    required.set(key,{name:item.name,unit:item.unit,qty:total});
  }
  const missing:Array<{name:string;unit:string;qty:number}>=[];
  for(const [key,item] of required){
    const recorded=inventory[key];
    const available=typeof recorded==="number"&&Number.isFinite(recorded)&&recorded>0?recorded:0;
    // Recipe quantities may be fractional (e.g. 0.1 + 0.2). Do not
    // block cooking because of sub-micro-unit floating-point noise.
    const shortfall=Math.max(0,item.qty-available);
    // A tiny but genuinely missing ingredient still matters when stock is zero.
    // Tolerate floating-point dust only when some stock is actually recorded.
    if(shortfall>0&&(available<=0||shortfall>1e-6))missing.push({name:item.name,unit:item.unit,qty:shortfall});
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
  events:{recipe:string;at:string;ingredients?:Pick<GroceryInput,"name"|"unit"|"qty">[]}[],
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
    // Imported histories may contain null entries. Ignore them rather than
    // crashing the pantry ledger and making the Tonight menu unusable.
    if(!event||typeof event.at!=="string"||typeof event.recipe!=="string")continue;
    // Compare instants, not timestamp strings: equivalent times can use
    // different timezone offsets or fractional-second precision.
    const eventMs=Date.parse(event.at);
    if(!Number.isFinite(eventMs)||eventMs<tripStartMs)continue;
    // Snapshots keep consumption stable when a custom recipe is later edited.
    const ingredients=Array.isArray(event.ingredients)?event.ingredients:requirements(event.recipe);
    if(!ingredients)continue;
    for(const item of ingredients){
      if(!item||typeof item.name!=="string"||!item.name.trim()||typeof item.unit!=="string"||!item.unit.trim()||typeof item.qty!=="number"||!Number.isFinite(item.qty)||item.qty<=0)continue;
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
  // A shopping menu represents distinct recipe choices, not repeated slots.
  // Deduplicate before applying the target so a repeated suggestion cannot
  // crowd out another recipe or produce a menu of identical meals.
  const seen=new Set<string>();
  return plan.filter(id=>{
    if(typeof id!=="string"||!id.trim()||seen.has(id))return false;
    seen.add(id);
    return true;
  }).slice(0,count);
}


/** Confirm checked grocery lines as purchases of the remaining whole packs.
 * Already recorded purchases must not be replaced by the original basket total.
 */
export function confirmCheckedGroceryPurchases(
  lines:GroceryLine[],
  checked:string[],
  existing:Record<string,number>={}
):Record<string,number>{
  // Reuse the shared checkout rules for legacy checked-only purchases.
  return confirmShoppingCart(lines,checked,{},existing);
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
    const ingredientCost=item.qty/pack*price/servings;
    // Imported quantities and shelf prices can overflow even when each input
    // is finite. An unpriceable ingredient must not poison plan rankings with
    // Infinity or make a candidate appear to have a trustworthy price.
    if(!Number.isFinite(ingredientCost)||!Number.isFinite(cost+ingredientCost)){
      unknown++;
      continue;
    }
    cost+=ingredientCost;
  }
  return {cost:Math.round(cost*100)/100,unknown};
}


/** Count valid completed cooks since the current trip began.
 * Timestamp offsets must be compared as instants, never lexicographically.
 */
export function cooksInCurrentTrip(events:{recipe:string;at:string}[],tripStartedAt:string|null):number{
  if(!tripStartedAt)return 0;
  const start=Date.parse(tripStartedAt);
  if(!Number.isFinite(start))return 0;
  return events.filter(event=>{
    // A timestamp alone does not establish that a meal was cooked.
    if(!event||typeof event.recipe!=="string"||!event.recipe.trim()||typeof event.at!=="string")return false;
    const at=Date.parse(event.at);
    return Number.isFinite(at)&&at>=start;
  }).length;
}

/** Commit explicitly selected package counts; fall back to legacy checked lines.
 * Package counts are shopping-cart selections, never inventory before checkout.
 */
export function confirmShoppingCart(
 lines:GroceryLine[],
 checked:string[],
 selectedPackages:Record<string,number>,
 existing:Record<string,number>={}
):Record<string,number>{
 const purchased={...existing};
 // Count names once so legacy name-only checkmarks remain unambiguous without
 // rescanning the entire basket for every ingredient.
 const nameCounts=new Map<string,number>();
 const seenKeys=new Set<string>();
 // A basket is normally merged by ingredient/unit, but legacy or imported
 // duplicate lines must not purchase the same selected packages twice.
 for(const line of lines){
  // Imported grocery lists can contain null or malformed rows. Ignore them
  // without blocking valid purchases or changing persisted shopping data.
  if(!line||typeof line.name!=="string"||!line.name.trim()||line.name.includes("|")||
     typeof line.unit!=="string"||!line.unit.trim()||line.unit.includes("|"))continue;
  const key=line.name+"|"+line.unit;
  if(seenKeys.has(key))continue;
  seenKeys.add(key);
  nameCounts.set(line.name,(nameCounts.get(line.name)||0)+1);
 }
 seenKeys.clear();
 for(const line of lines){
  // Imported grocery lists can contain null or malformed rows. Ignore them
  // without blocking valid purchases or changing persisted shopping data.
  if(!line||typeof line.name!=="string"||!line.name.trim()||line.name.includes("|")||
     typeof line.unit!=="string"||!line.unit.trim()||line.unit.includes("|"))continue;
  const key=line.name+"|"+line.unit;
  if(seenKeys.has(key))continue;
  seenKeys.add(key);
  const uniqueName=nameCounts.get(line.name)===1;
  const selected=selectedPackages[key];
  const checkedLine=checked.includes(key)||(uniqueName&&checked.includes(line.name));
  const previous=Number.isFinite(purchased[key])&&purchased[key]>0?purchased[key]:0;
  const defaultPacks=line.pack>0?Math.ceil(Math.max(0,line.qty-previous)/line.pack-1e-9):0;
  // An explicit cart quantity is authoritative. Invalid imported values must
  // not fall back to a checked line and accidentally purchase extra packages.
  const hasSelection=Object.prototype.hasOwnProperty.call(selectedPackages,key);
  const validSelection=typeof selected==="number"&&Number.isSafeInteger(selected)&&selected>=0;
  const count=hasSelection?(validSelection?selected:0):checkedLine&&Number.isSafeInteger(defaultPacks)?defaultPacks:0;
  // Imported cart counts can be enormous. Never persist Infinity as stock.
  const added=count*line.pack;
  if(count>0&&Number.isFinite(line.pack)&&line.pack>0&&Number.isFinite(added)&&Number.isFinite(previous+added))purchased[key]=previous+added;
 }
 return purchased;
}

/** Keep pending cart selections only when a regenerated menu needs the same
 * ingredient quantity and package size. Confirmed inventory is unaffected.
 */
export function retainUnchangedCart(
 before:GroceryLine[],
 after:GroceryLine[],
 cart:Record<string,number>
):Record<string,number>{
 const next=new Map(after.map(line=>[line.name+"|"+line.unit,line]));
 const kept:Record<string,number>={};
 for(const line of before){
  const key=line.name+"|"+line.unit;
  const replacement=next.get(key);
  const count=cart[key];
  if(replacement&&replacement.qty===line.qty&&replacement.pack===line.pack&&
     Number.isSafeInteger(count)&&count>=0)kept[key]=count;
 }
 return kept;
}

/** Clear cooking events while preserving the inventory that actually remains.
 * Start a new consumption epoch so future cooks still subtract ingredients.
 * Existing purchases become carried pantry stock, not new purchases.
 */
export function resetCookingLedger(
 purchased:Record<string,number>,
 pantry:Record<string,number>,
 events:{recipe:string;at:string;ingredients?:Pick<GroceryInput,"name"|"unit"|"qty">[]}[],
 tripStartedAt:string|null,
 requirements:(recipeId:string)=>Pick<GroceryInput,"name"|"unit"|"qty">[]|undefined,
 resetAt:string
):{pantryQuantities:Record<string,number>;purchasedQuantities:Record<string,number>;tripStartedAt:string}{
 const remaining=remainingConfirmedStock(purchased,pantry,events,tripStartedAt,requirements);
 const pantryQuantities=Object.fromEntries(Object.entries(remaining)
  .filter(([,qty])=>Number.isFinite(qty)&&qty>0.000001)
  .map(([key,qty])=>[key,Math.round(qty*1000000)/1000000]));
 return {pantryQuantities,purchasedQuantities:{},tripStartedAt:resetAt};
}

/** Atomically record selected main-cart packages and checked shortage recovery.
 * Unchecked recovery suggestions survive checkout; no shopping selections are
 * treated as stock until this function is invoked.
 */
export function checkoutShoppingTrip(
 lines:GroceryLine[],
 checked:string[],
 selectedPackages:Record<string,number>,
 existing:Record<string,number>,
 recovery:{name:string;unit:string;packs:number;pack:number;checked:boolean}[]
):{purchased:Record<string,number>;remainingRecovery:typeof recovery}{
 const purchased=confirmShoppingCart(lines,checked,selectedPackages,existing);
 const remainingRecovery:typeof recovery=[];
 for(const item of recovery){
  // Malformed imported recovery entries must not crash checkout or invent stock.
  if(!item||typeof item!=="object"){remainingRecovery.push(item);continue;}
  if(!item.checked){remainingRecovery.push(item);continue;}
  if(typeof item.name!=="string"||!item.name.trim()||item.name.includes("|")||
     typeof item.unit!=="string"||!item.unit.trim()||item.unit.includes("|")||
     !Number.isSafeInteger(item.packs)||item.packs<=0||!Number.isFinite(item.pack)||item.pack<=0){
   // Invalid imports must not create inventory out of thin air.
   remainingRecovery.push(item);continue;
  }
  const key=item.name+"|"+item.unit;
  const current=typeof purchased[key]==="number"&&Number.isFinite(purchased[key])&&purchased[key]>0?purchased[key]:0;
  const added=item.packs*item.pack;
  if(!Number.isFinite(added)||!Number.isFinite(current+added)){
   remainingRecovery.push(item);continue;
  }
  purchased[key]=current+added;
 }
 return {purchased,remainingRecovery};
}

/** Correct the *available* quantity of one ingredient without replaying past
 * cooks or resetting unrelated inventory. Keep the consumption epoch intact so
 * undo and shopping-trip carryover still use the original ledger.
 */
export function correctAvailableInventory(
 purchased:Record<string,number>,
 pantry:Record<string,number>,
 available:Record<string,number>,
 key:string,
 desired:number
):{purchasedQuantities:Record<string,number>;pantryQuantities:Record<string,number>}{
 if(!key.includes("|")||!Number.isFinite(desired)||desired<0)throw new Error("Invalid pantry correction");
 const current=Number.isFinite(available[key])?available[key]:0;
 const difference=desired-current;
 const purchasedQuantities={...purchased};
 const pantryQuantities={...pantry};
 if(Math.abs(difference)<=0.000001)return {purchasedQuantities,pantryQuantities};
 const pantryQty=Math.max(0,Number.isFinite(pantry[key])?pantry[key]:0);
 const purchasedQty=Math.max(0,Number.isFinite(purchased[key])?purchased[key]:0);
 if(difference>0){
  // Reject corrections that would overflow the stored stock ledger. Rounding
  // through micro-units can overflow even when the input itself is finite.
  const next=pantryQty+difference;
  if(!Number.isFinite(next)||!Number.isFinite(next*1e6))throw new Error("Pantry correction exceeds supported range");
  pantryQuantities[key]=Math.round(next*1e6)/1e6;
 }else{
  const removal=Math.min(-difference,pantryQty+purchasedQty);
  const fromPantry=Math.min(pantryQty,removal);
  const fromPurchased=Math.min(purchasedQty,removal-fromPantry);
  const nextPantry=Math.round((pantryQty-fromPantry)*1e6)/1e6;
  const nextPurchased=Math.round((purchasedQty-fromPurchased)*1e6)/1e6;
  if(nextPantry>0)pantryQuantities[key]=nextPantry;else delete pantryQuantities[key];
  if(nextPurchased>0)purchasedQuantities[key]=nextPurchased;else delete purchasedQuantities[key];
 }
 return {purchasedQuantities,pantryQuantities};
}
