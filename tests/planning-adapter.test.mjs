import test from "node:test";
import assert from "node:assert/strict";
import {priceGroceryBasket} from "../src/planning-adapter.ts";

const ingredient=(name,qty,pack,price,unit="g")=>({name,qty,pack,price,unit});
const meal=(...ingredients)=>({ingredients});

test("empty kitchen produces an empty, zero-cost basket",()=>{
  assert.deepEqual(priceGroceryBasket([]),{lines:[],knownTotal:0,unknownCount:0});
});
test("merges ingredients and rounds up packages",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,2.5)),meal(ingredient("Rice",400,500,2.5))]);
  assert.equal(result.lines[0].requiredQty,600);
  assert.equal(result.lines[0].packs,2);
  assert.equal(result.knownTotal,5);
});
test("pantry inventory reduces shopping requirements without changing required amount",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))],{},{"Rice|g":450});
  assert.equal(result.lines[0].requiredQty,600);
  assert.equal(result.lines[0].pantryQty,450);
  assert.equal(result.lines[0].qty,150);
  assert.equal(result.knownTotal,2.5);
});
test("fully stocked pantry needs no price or packages",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,null))],{},{"Rice|g":1000});
  assert.equal(result.knownTotal,0);
  assert.equal(result.unknownCount,0);
});
test("unknown prices are not silently counted as free",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,null))]);
  assert.equal(result.lines[0].cost,null);
  assert.equal(result.unknownCount,1);
});
test("different package sizes flag uncertain cost rather than crash",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,2.5)),meal(ingredient("Rice",300,1000,4))]);
  assert.equal(result.lines[0].requiredQty,500);
  assert.equal(result.lines[0].pack,0);
  assert.equal(result.lines[0].cost,null);
  assert.equal(result.unknownCount,1);
});
test("price sheet overrides default package price",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,2.5))],{Rice:3.75});
  assert.equal(result.knownTotal,3.75);
});
test("invalid package sizes are rejected",()=>{
  assert.throws(()=>priceGroceryBasket([meal(ingredient("Rice",200,0,2.5))]),/Invalid grocery/);
});
