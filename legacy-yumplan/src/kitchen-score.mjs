// A transparent ingredient-utilization metric, not fictional money or an achievement system.
// The score describes planned package allocation; it is NOT verified food consumption.
const PERISHABLE = new Set(['Meat','Dairy','Produce','Bakery']);
export function kitchenScore({needs,basket,products}) {
  if(!needs || !basket || !Array.isArray(products)) throw new Error('A priced basket and ingredient needs are required.');
  const byId = new Map(products.map(p=>[p.id,p]));
  let weightedPurchased=0, weightedAllocated=0, perishableLeftover=0;
  const ingredients=[];
  for(const [id,count] of Object.entries(basket)) {
    if(!Number.isSafeInteger(count)||count<0) throw new Error('Invalid package count: '+id);
    const p=byId.get(id);
    if(!p || !(p.packageQuantity>0) || !Number.isFinite(p.priceCents) || p.priceCents<0) throw new Error('Missing valid product: '+id);
    const purchased=count*p.packageQuantity;
    const required=needs[id]||0;
    if(!Number.isFinite(required)||required<0||required>purchased+1e-7) throw new Error('Basket cannot cover '+id);
    if(!count) continue;
    const allocated=Math.min(purchased,required);
    const leftover=Math.max(0,purchased-allocated);
    // Price-weighting avoids adding grams to counts, while prioritizing perishable leftovers.
    const weight=p.priceCents*count*(PERISHABLE.has(p.category)?2:1);
    weightedPurchased+=weight;
    weightedAllocated+=weight*(allocated/purchased);
    if(PERISHABLE.has(p.category)) perishableLeftover+=p.priceCents*count*(leftover/purchased);
    ingredients.push({id,purchased,allocated,leftover,unit:p.unit,perishable:PERISHABLE.has(p.category)});
  }
  for(const [id,quantity] of Object.entries(needs)) {
    if(quantity>0 && !Object.hasOwn(basket,id)) throw new Error('Basket missing '+id);
  }
  if(weightedPurchased===0) return {score:null,reason:'No groceries selected',ingredients,estimatedPerishableLeftoverCents:0};
  return {score:Math.round(100*weightedAllocated/weightedPurchased),
    reason:'Estimated planned ingredient allocation, weighted by package price and perishability',
    ingredients,estimatedPerishableLeftoverCents:Math.round(perishableLeftover)};
}
