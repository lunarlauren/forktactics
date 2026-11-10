import test from "node:test";
import assert from "node:assert/strict";
import {priceGroceryBasket} from "../src/planning-adapter.ts";

const ingredient=(name,qty,pack,price,unit="g")=>({name,qty,pack,price,unit});
test("pantry stock reduces required packages and fully covered unknown prices cost zero",()=>{
 const result=priceGroceryBasket([{ingredients:[ingredient("Rice",350,500,4),ingredient("Salt",10,100,null)]}],{},{"Rice|g":100,"Salt|g":10});
 assert.equal(result.knownTotal,4);
 assert.equal(result.unknownCount,0);
 assert.equal(result.lines.find(x=>x.name==="Rice").packs,1);
 assert.equal(result.lines.find(x=>x.name==="Salt").cost,0);
});
test("shared ingredients consolidate into whole packages",()=>{
 const result=priceGroceryBasket([{ingredients:[ingredient("Rice",300,500,4)]},{ingredients:[ingredient("Rice",250,500,4)]}]);
 assert.equal(result.lines.length,1);
 assert.equal(result.lines[0].packs,2);
 assert.equal(result.knownTotal,8);
});
test("conflicting package sizes remain unpriced until sheet supplies size and price",()=>{
 const meals=[{ingredients:[ingredient("Rice",200,500,4)]},{ingredients:[ingredient("Rice",200,1000,7)]}];
 const uncertain=priceGroceryBasket(meals);
 assert.equal(uncertain.unknownCount,1);
 assert.equal(uncertain.lines[0].cost,null);
 const resolved=priceGroceryBasket(meals,{"Rice|g|pack":1000,"Rice|g":7});
 assert.equal(resolved.unknownCount,0);
 assert.equal(resolved.knownTotal,7);
});
test("unit-specific sheet prices do not leak between units",()=>{
 const result=priceGroceryBasket([{ingredients:[ingredient("Milk",500,1000,3,"ml"),ingredient("Milk",1,2,5,"cartons")]}],{"Milk|ml":4});
 assert.equal(result.lines.find(x=>x.unit==="ml").cost,4);
 assert.equal(result.lines.find(x=>x.unit==="cartons").cost,5);
});
test("zero-quantity optional ingredients do not add unknown prices",()=>{
 const result=priceGroceryBasket([{ingredients:[ingredient("Salt",0,100,null),ingredient("Rice",100,500,4)]}]);
 assert.equal(result.lines.length,1);
 assert.equal(result.unknownCount,0);
});
test("invalid package sizes for required ingredients are rejected",()=>{
 assert.throws(()=>priceGroceryBasket([{ingredients:[ingredient("Rice",100,0,4)]}]),/Invalid grocery package size for Rice/);
 assert.throws(()=>priceGroceryBasket([{ingredients:[ingredient("Rice",100,-5,4)]}]),/Invalid grocery package size for Rice/);
});
test("zero-quantity ingredients with missing package size are ignored",()=>{
 const result=priceGroceryBasket([{ingredients:[ingredient("Optional garnish",0,0,null),ingredient("Rice",100,500,4)]}]);
 assert.deepEqual(result.lines.map(line=>line.name),["Rice"]);
 assert.equal(result.knownTotal,4);
 assert.equal(result.unknownCount,0);
});
test("zero-quantity conflicting package metadata does not poison a required ingredient",()=>{
 const meals=[{ingredients:[ingredient("Rice",0,0,null)]},{ingredients:[ingredient("Rice",300,500,4)]}];
 const result=priceGroceryBasket(meals);
 assert.equal(result.lines.length,1);
 assert.equal(result.lines[0].pack,500);
 assert.equal(result.lines[0].cost,4);
});
test("invalid nonzero quantities remain rejected even when package size is missing",()=>{
 assert.throws(()=>priceGroceryBasket([{ingredients:[ingredient("Rice",-1,0,null)]}]),/Invalid grocery quantity for Rice/);
});
