import test from "node:test";
import assert from "node:assert/strict";
import {priceGroceryBasket} from "../src/planning-adapter.ts";

const ingredient=(name,qty,pack,price,unit="g")=>({name,qty,pack,price,unit});
const meal=(...ingredients)=>({ingredients});

test("package-size overrides require an explicit matching shelf price",()=>{
  const meals=[meal(ingredient("Rice",600,500,2.5))];
  const unpriced=priceGroceryBasket(meals,{"Rice|g|pack":1000});
  assert.equal(unpriced.lines[0].pack,1000);
  assert.equal(unpriced.lines[0].packs,1);
  assert.equal(unpriced.lines[0].cost,null);
  assert.equal(unpriced.unknownCount,1);
  const priced=priceGroceryBasket(meals,{"Rice|g|pack":1000,"Rice|g":4.25});
  assert.equal(priced.lines[0].cost,4.25);
  assert.equal(priced.knownTotal,4.25);
  assert.equal(priced.unknownCount,0);
});

test("conflicting recipe package sizes remain unknown until both package and price are specified",()=>{
  const meals=[meal(ingredient("Rice",300,500,2)),meal(ingredient("Rice",400,1000,3.5))];
  const priceOnly=priceGroceryBasket(meals,{"Rice|g":4});
  assert.equal(priceOnly.lines[0].pack,0);
  assert.equal(priceOnly.lines[0].cost,null);
  const resolved=priceGroceryBasket(meals,{"Rice|g":4,"Rice|g|pack":500});
  assert.equal(resolved.lines[0].requiredQty,700);
  assert.equal(resolved.lines[0].packs,2);
  assert.equal(resolved.knownTotal,8);
});

test("price conflicts stay unknown regardless of subsequent matching recipes",()=>{
  const meals=[meal(ingredient("Rice",100,500,2)),meal(ingredient("Rice",100,500,3)),meal(ingredient("Rice",100,500,2))];
  assert.equal(priceGroceryBasket(meals).lines[0].cost,null);
  assert.equal(priceGroceryBasket(meals,{"Rice|g":2.75}).knownTotal,2.75);
});

test("unit-specific prices do not leak between units and override legacy prices",()=>{
  const meals=[meal(ingredient("Beans",100,500,2,"g"),ingredient("Beans",1,2,5,"can"))];
  const basket=priceGroceryBasket(meals,{"Beans":8,"Beans|g":3});
  assert.equal(basket.lines.find(x=>x.unit==="g").cost,3);
  assert.equal(basket.lines.find(x=>x.unit==="can").cost,8);
  assert.equal(basket.knownTotal,11);
});

test("pantry deductions apply before package rounding, including conflicting-price groceries",()=>{
  const meals=[meal(ingredient("Rice",750,500,2)),meal(ingredient("Rice",250,500,3))];
  const partial=priceGroceryBasket(meals,{"Rice|g":4},{"Rice|g":600});
  assert.equal(partial.lines[0].requiredQty,1000);
  assert.equal(partial.lines[0].pantryQty,600);
  assert.equal(partial.lines[0].packs,1);
  assert.equal(partial.knownTotal,4);
  const covered=priceGroceryBasket(meals,{},{"Rice|g":1000});
  assert.equal(covered.lines[0].cost,0);
  assert.equal(covered.unknownCount,0);
});

test("zero-quantity ingredients cannot introduce false price conflicts",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",250,500,2)),meal(ingredient("Rice",0,1000,10))]);
  assert.equal(result.lines[0].pack,500);
  assert.equal(result.knownTotal,2);
});

test("invalid quantities and package overrides never create negative or nonfinite costs",()=>{
  assert.throws(()=>priceGroceryBasket([meal(ingredient("Rice",-1,500,2))]),/Invalid grocery/);
  const result=priceGroceryBasket([meal(ingredient("Rice",600,500,2))],{"Rice|g|pack":-1});
  // A malformed explicit override must not silently reuse the recipe price.
  // The shopper needs to correct the package size before the cost is trusted.
  assert.equal(result.lines[0].pack,0);
  assert.equal(result.lines[0].cost,null);
  assert.equal(result.knownTotal,0);
  assert.equal(result.unknownCount,1);
});
