export type GroceryInput={name:string;qty:number;unit:string;pack:number;price:number|null};
export type GroceryLine=GroceryInput&{packs:number;cost:number|null;requiredQty:number;pantryQty:number};
export function priceGroceryBasket(meals:{ingredients:GroceryInput[]}[],overrides:Record<string,number|null>={},pantryQuantities:Record<string,number>={}):{lines:GroceryLine[];knownTotal:number;unknownCount:number}{
  const merged=new Map<string,GroceryInput>();
  for(const meal of meals)for(const item of meal.ingredients){
    if(!Number.isFinite(item.qty)||item.qty<0||!Number.isFinite(item.pack)||item.pack<=0)throw new Error("Invalid grocery quantity or package size for "+item.name);
    const key=item.name+"|"+item.unit;
    const previous=merged.get(key);
    if(previous&&(previous.pack!==item.pack))throw new Error("Conflicting package sizes for "+item.name);
    merged.set(key,{...item,qty:item.qty+(previous?.qty||0)});
  }
  const lines=Array.from(merged,([key,item])=>{
    const price=Object.prototype.hasOwnProperty.call(overrides,item.name)?overrides[item.name]:item.price;
    const recorded=pantryQuantities[item.name+"|"+item.unit];
    const pantryQty=typeof recorded==="number"&&Number.isFinite(recorded)&&recorded>0?Math.min(recorded,item.qty):0;
    const requiredQty=item.qty;
    const qty=Math.max(0,requiredQty-pantryQty);
    const packs=Math.ceil(qty/item.pack);
    const validPrice=price!==null&&typeof price==="number"&&Number.isFinite(price)&&price>=0;
    // No purchase is needed when verified pantry stock covers the requirement.
    // An unknown shelf price must not make a zero-package grocery line unpriced.
    return {...item,qty,requiredQty,pantryQty,price,packs,cost:packs===0?0:validPrice?packs*Math.round(price*100)/100:null};
  });
  const knownTotal=Math.round(lines.reduce((sum,line)=>sum+Math.round((line.cost??0)*100),0))/100;
  return {lines,knownTotal,unknownCount:lines.filter(x=>x.cost===null).length};
}
