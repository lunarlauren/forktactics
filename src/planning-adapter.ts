import {basketForNeeds,basketCost} from "../legacy-yumplan/src/engine.mjs";

export type GroceryInput={name:string;qty:number;unit:string;pack:number;price:number|null};
export type GroceryLine=GroceryInput&{packs:number;cost:number|null};
export function priceGroceryBasket(meals:{ingredients:GroceryInput[]}[],overrides:Record<string,number|null>={}):{lines:GroceryLine[];knownTotal:number;unknownCount:number}{
  const merged=new Map<string,GroceryInput>();
  for(const meal of meals)for(const item of meal.ingredients){
    const key=item.name+"|"+item.unit;
    const previous=merged.get(key);
    if(previous&&(previous.pack!==item.pack))throw new Error("Conflicting package sizes for "+item.name);
    merged.set(key,{...item,qty:item.qty+(previous?.qty||0)});
  }
  const needs:Record<string,number>={};
  const products:{id:string;packageQuantity:number;priceCents:number}[]=[];
  for(const [key,item] of merged){
    const price=Object.prototype.hasOwnProperty.call(overrides,item.name)?overrides[item.name]:item.price;
    if(price!==null&&Number.isFinite(price)&&price>0&&item.pack>0){
      needs[key]=item.qty;
      products.push({id:key,packageQuantity:item.pack,priceCents:Math.round(price*100)});
    }
  }
  const basket=basketForNeeds(needs,products);
  const knownTotal=basketCost(basket,products)/100;
  const lines=Array.from(merged,([key,item])=>{
    const price=Object.prototype.hasOwnProperty.call(overrides,item.name)?overrides[item.name]:item.price;
    const packs=item.pack>0?Math.ceil(item.qty/item.pack):0;
    return {...item,price,packs,cost:Object.prototype.hasOwnProperty.call(basket,key)?basket[key]*Math.round(Number(price)*100)/100:null};
  });
  return {lines,knownTotal,unknownCount:lines.filter(x=>x.cost===null).length};
}
