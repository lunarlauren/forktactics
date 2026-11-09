export type GroceryInput={name:string;qty:number;unit:string;pack:number;price:number|null};
export type GroceryLine=GroceryInput&{packs:number;cost:number|null;requiredQty:number;pantryQty:number};
export function priceGroceryBasket(meals:{ingredients:GroceryInput[]}[],overrides:Record<string,number|null>={},pantryQuantities:Record<string,number>={}):{lines:GroceryLine[];knownTotal:number;unknownCount:number}{
  const merged=new Map<string,GroceryInput>();
  for(const meal of meals)for(const item of meal.ingredients){
    if(!Number.isFinite(item.qty)||item.qty<0||!Number.isFinite(item.pack)||item.pack<=0)throw new Error("Invalid grocery quantity or package size for "+item.name);
    // Optional zero-quantity ingredients are not shopping requirements. Including
    // them can introduce false price conflicts or block strict-budget planning.
    if(item.qty===0)continue;
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
    const pack=typeof packOverride==="number"&&Number.isFinite(packOverride)&&packOverride>0?packOverride:item.pack;
    // A recipe price is tied to its recipe package size. When recipe package\n    // sizes disagree, even an explicit pack-size override cannot establish a\n    // trustworthy price without an explicit price-sheet price.\n    const price=Object.prototype.hasOwnProperty.call(overrides,key)?overrides[key]:Object.prototype.hasOwnProperty.call(overrides,item.name)?overrides[item.name]:item.pack===0?null:item.price;
    const recorded=pantryQuantities[item.name+"|"+item.unit];
    const pantryQty=typeof recorded==="number"&&Number.isFinite(recorded)&&recorded>0?Math.min(recorded,item.qty):0;
    const requiredQty=item.qty;
    const qty=Math.max(0,requiredQty-pantryQty);
    const packs=pack>0?Math.ceil(qty/pack):0;
    const validPrice=price!==null&&typeof price==="number"&&Number.isFinite(price)&&price>=0;
    // No purchase is needed when verified pantry stock covers the requirement.
    // An unknown shelf price must not make a zero-package grocery line unpriced.
    return {...item,pack,qty,requiredQty,pantryQty,price,packs,cost:qty===0?0:pack===0?null:validPrice?packs*Math.round(price*100)/100:null};
  });
  const knownTotal=Math.round(lines.reduce((sum,line)=>sum+Math.round((line.cost??0)*100),0))/100;
  return {lines,knownTotal,unknownCount:lines.filter(x=>x.cost===null).length};
}
