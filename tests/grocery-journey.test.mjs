import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";

const dir=mkdtempSync(join(tmpdir(),"forktactics-journey-"));
let shoppingMenuIds,priceGroceryBasket,confirmCheckedGroceryPurchases,remainingConfirmedStock,recipeIngredientAvailability;
try{
  const source=readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8");
  const path=join(dir,"planning-adapter.mts");
  writeFileSync(path,source);
  ({shoppingMenuIds,priceGroceryBasket,confirmCheckedGroceryPurchases,remainingConfirmedStock,recipeIngredientAvailability}=await import(pathToFileURL(path).href));
}finally{rmSync(dir,{recursive:true,force:true});}

test("empty slots, checkout, cooking, and leftovers work as one grocery trip",()=>{
  const recipes={
    rice:{ingredients:[{name:"Rice",unit:"g",qty:300,pack:500,price:3}]},
    eggs:{ingredients:[{name:"Eggs",unit:"each",qty:2,pack:6,price:2}]},
    riceAgain:{ingredients:[{name:"Rice",unit:"g",qty:300,pack:500,price:3}]}
  };
  const ids=shoppingMenuIds(["rice","","eggs","riceAgain"],2);
  assert.deepEqual(ids,["rice","eggs"]);
  const basket=priceGroceryBasket(ids.map(id=>recipes[id]));
  assert.equal(basket.knownTotal,5);
  const checked=["Rice|g","Eggs|each"];
  // A checked item is not stock until shopping is explicitly confirmed.
  assert.equal(recipeIngredientAvailability(recipes.rice.ingredients,{}).canCook,false);
  const purchased=confirmCheckedGroceryPurchases(basket.lines,checked,{});
  assert.deepEqual(purchased,{"Rice|g":500,"Eggs|each":6});
  const started="2026-11-12T12:00:00.000Z";
  const events=[{recipe:"rice",at:"2026-11-12T13:00:00.000Z"}];
  const remaining=remainingConfirmedStock(purchased,{},events,started,id=>recipes[id]?.ingredients);
  assert.equal(remaining["Rice|g"],200);
  assert.equal(remaining["Eggs|each"],6);
  assert.deepEqual(recipeIngredientAvailability(recipes.riceAgain.ingredients,remaining),{
    canCook:false,missing:[{name:"Rice",unit:"g",qty:100}]
  });
  assert.equal(recipeIngredientAvailability(recipes.eggs.ingredients,remaining).canCook,true);
  // Starting another trip carries only what is actually left.
  const carried=Object.fromEntries(Object.entries(remaining).filter(([,qty])=>qty>0));
  const newTrip=remainingConfirmedStock({},carried,events,null,id=>recipes[id]?.ingredients);
  assert.deepEqual(newTrip,{"Rice|g":200,"Eggs|each":6});
});
