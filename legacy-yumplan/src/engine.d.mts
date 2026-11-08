export function basketForNeeds(needs:Record<string,number>,products:Array<{id:string;packageQuantity:number;priceCents:number}>):Record<string,number>;
export function basketCost(basket:Record<string,number>,products:Array<{id:string;packageQuantity:number;priceCents:number}>):number;
