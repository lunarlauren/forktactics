import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";

// Match the project's existing Node strip-types test setup.
const dir=mkdtempSync(join(tmpdir(),"forktactics-basket-"));
let priceGroceryBasket,outstandingGroceryEstimate;
try {
  const source=readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8");
  const path=join(dir,"planning-adapter.mts");
  writeFileSync(path,source);
  ({priceGroceryBasket,outstandingGroceryEstimate}=await import(pathToFileURL(path).href));
} finally {
  rmSync(dir,{recursive:true,force:true});
}

const ingredient=(qty)=>({name:"Rice",unit:"g",qty,pack:500,price:3});

test("duplicate ingredients across and within recipes require the combined quantity",()=>{
  const basket=priceGroceryBasket([
    {ingredients:[ingredient(300),ingredient(250)]},
    {ingredients:[ingredient(200)]}
  ]);
  assert.equal(basket.lines.length,1);
  assert.equal(basket.lines[0].requiredQty,750);
  assert.equal(basket.lines[0].packs,2);
  assert.equal(basket.knownTotal,6);
});

test("verified pantry stock reduces the combined requirement before rounding to packages",()=>{
  const basket=priceGroceryBasket([
    {ingredients:[ingredient(300),ingredient(250)]},
    {ingredients:[ingredient(200)]}
  ],{},{"Rice|g":300});
  assert.equal(basket.lines[0].requiredQty,750);
  assert.equal(basket.lines[0].pantryQty,300);
  assert.equal(basket.lines[0].qty,450);
  assert.equal(basket.lines[0].packs,1);
  assert.equal(basket.knownTotal,3);
});

test("recorded purchases reduce outstanding cost without changing the basket requirement",()=>{
  const basket=priceGroceryBasket([{ingredients:[ingredient(300),ingredient(250)]}]);
  assert.deepEqual(outstandingGroceryEstimate(basket.lines,{"Rice|g":200}),{
    knownTotal:3,unknownCount:0
  });
  assert.equal(basket.lines[0].qty,550);
});

test("unknown price remains visible when combined quantities require purchases",()=>{
  const basket=priceGroceryBasket([{ingredients:[{...ingredient(200),price:null},ingredient(350)]}]);
  assert.equal(basket.lines[0].qty,550);
  assert.equal(basket.unknownCount,1);
  assert.equal(outstandingGroceryEstimate(basket.lines,{}).unknownCount,1);
});
