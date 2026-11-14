import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";

const dir=mkdtempSync(join(tmpdir(),"forktactics-stock-lifecycle-"));
let priceGroceryBasket,confirmShoppingCart,remainingConfirmedStock,recipeIngredientAvailability,correctAvailableInventory,resetCookingLedger;
try {
  const source=readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8");
  const path=join(dir,"planning-adapter.mts");
  writeFileSync(path,source);
  ({priceGroceryBasket,confirmShoppingCart,remainingConfirmedStock,recipeIngredientAvailability,correctAvailableInventory,resetCookingLedger}=await import(pathToFileURL(path).href));
} finally {rmSync(dir,{recursive:true,force:true});}

test("tiny package shortfall survives checkout, cooking, correction and ledger reset",()=>{
  const ingredients=[{name:"Saffron",unit:"g",qty:0.0000002,pack:0.0000003,price:4}];
  const basket=priceGroceryBasket([{ingredients}]);
  assert.equal(basket.lines.length,1);
  assert.equal(basket.lines[0].packs,1);
  const purchased=confirmShoppingCart(basket.lines,["Saffron|g"],{},{});
  assert.equal(purchased["Saffron|g"],0.0000003);
  const start="2026-11-14T10:00:00.000Z";
  const events=[{recipe:"saffron",at:"2026-11-14T11:00:00.000Z",ingredients}];
  const lookup=()=>ingredients;
  const afterCook=remainingConfirmedStock(purchased,{},events,start,lookup);
  assert.ok(Math.abs(afterCook["Saffron|g"]-0.0000001)<1e-18);
  assert.equal(recipeIngredientAvailability(ingredients,afterCook).canCook,false);
  const corrected=correctAvailableInventory(purchased,{},afterCook,"Saffron|g",0.0000004);
  const afterCorrection=remainingConfirmedStock(corrected.purchasedQuantities,corrected.pantryQuantities,events,start,lookup);
  assert.ok(Math.abs(afterCorrection["Saffron|g"]-0.0000004)<1e-18);
  assert.equal(recipeIngredientAvailability(ingredients,afterCorrection).canCook,true);
  const reset=resetCookingLedger(corrected.purchasedQuantities,corrected.pantryQuantities,events,start,lookup,"2026-11-14T12:00:00.000Z");
  assert.deepEqual(reset.purchasedQuantities,{});
  const nextTrip=remainingConfirmedStock(reset.purchasedQuantities,reset.pantryQuantities,events,reset.tripStartedAt,lookup);
  assert.ok(Math.abs(nextTrip["Saffron|g"]-0.0000004)<1e-18);
  assert.equal(recipeIngredientAvailability(ingredients,nextTrip).canCook,true);
});
