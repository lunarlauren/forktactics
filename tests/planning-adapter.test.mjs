import test from "node:test";
import assert from "node:assert/strict";
import {priceGroceryBasket,outstandingGroceryEstimate} from "../src/planning-adapter.ts";

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

test("outstanding estimate excludes verified purchases but not manual checkmarks",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",1200,500,2.5))],{},{"Rice|g":200});
  assert.deepEqual(outstandingGroceryEstimate(lines),{knownTotal:5,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Rice|g":600}),{knownTotal:2.5,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Rice|g":1000}),{knownTotal:0,unknownCount:0});
});
test("outstanding estimate does not double subtract pantry stock",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))],{},{"Rice|g":450});
  assert.equal(lines[0].qty,150);
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Rice|g":100}),{knownTotal:2.5,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Rice|g":150}),{knownTotal:0,unknownCount:0});
});
test("outstanding unknown prices count only ingredients still needed",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Beans",2,1,null,"can"),ingredient("Rice",200,500,2.5))]);
  assert.deepEqual(outstandingGroceryEstimate(lines),{knownTotal:2.5,unknownCount:1});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Beans|can":2}),{knownTotal:2.5,unknownCount:0});
});
test("outstanding purchases are unit-specific and invalid quantities are ignored",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Beans",2,1,1,"can"),ingredient("Beans",200,500,3,"g"))]);
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Beans|can":2,"Beans|g":Number.NaN}),{knownTotal:3,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Beans|can":-4,"Beans|g":Infinity}),{knownTotal:5,unknownCount:0});
});
test("changed meal requirements recompute outstanding costs from current lines",()=>{
  const before=priceGroceryBasket([meal(ingredient("Rice",900,500,2.5))]);
  const after=priceGroceryBasket([meal(ingredient("Rice",1500,500,2.5))]);
  const purchased={"Rice|g":700};
  assert.deepEqual(outstandingGroceryEstimate(before.lines,purchased),{knownTotal:2.5,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(after.lines,purchased),{knownTotal:5,unknownCount:0});
});

test("a price-sheet package-size change requires an explicit matching shelf price",()=>{
  const meals=[meal(ingredient("Rice",600,500,2.5))];
  const unresolved=priceGroceryBasket(meals,{"Rice|g|pack":1000});
  assert.equal(unresolved.lines[0].pack,1000);
  assert.equal(unresolved.lines[0].cost,null);
  assert.equal(unresolved.unknownCount,1);
  const resolved=priceGroceryBasket(meals,{"Rice|g|pack":1000,"Rice|g":4.25});
  assert.equal(resolved.lines[0].packs,1);
  assert.equal(resolved.knownTotal,4.25);
  assert.equal(resolved.unknownCount,0);
});
test("an explicit unknown price overrides a recipe estimate rather than counting it as free",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))],{"Rice|g":null});
  assert.equal(result.lines[0].packs,2);
  assert.equal(result.lines[0].cost,null);
  assert.equal(result.knownTotal,0);
  assert.equal(result.unknownCount,1);
  assert.deepEqual(outstandingGroceryEstimate(result.lines,{"Rice|g":600}),{knownTotal:0,unknownCount:0});
});
