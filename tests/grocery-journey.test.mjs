import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";

const dir=mkdtempSync(join(tmpdir(),"forktactics-journey-"));
let shoppingMenuIds,priceGroceryBasket,confirmCheckedGroceryPurchases,confirmShoppingCart,remainingConfirmedStock,recipeIngredientAvailability;
try{
  const source=readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8");
  const path=join(dir,"planning-adapter.mts");
  writeFileSync(path,source);
  ({shoppingMenuIds,priceGroceryBasket,confirmCheckedGroceryPurchases,confirmShoppingCart,remainingConfirmedStock,recipeIngredientAvailability}=await import(pathToFileURL(path).href));
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

test("partial checkout only unlocks meals with enough confirmed ingredients",()=>{
  const recipes={
    stirFry:[{name:"Rice",unit:"g",qty:200,pack:500,price:3},{name:"Chicken",unit:"g",qty:300,pack:500,price:6}],
    riceBowl:[{name:"Rice",unit:"g",qty:250,pack:500,price:3}]
  };
  const basket=priceGroceryBasket(Object.values(recipes).map(ingredients=>({ingredients})));
  const purchased=confirmCheckedGroceryPurchases(basket.lines,["Rice|g"],{});
  assert.equal(purchased["Rice|g"],500);
  assert.equal(purchased["Chicken|g"],undefined);
  assert.equal(recipeIngredientAvailability(recipes.stirFry,purchased).canCook,false);
  assert.equal(recipeIngredientAvailability(recipes.riceBowl,purchased).canCook,true);
  const afterCook=remainingConfirmedStock(purchased,{},[
    {recipe:"riceBowl",at:"2026-11-12T13:00:00Z",ingredients:recipes.riceBowl}
  ],"2026-11-12T12:00:00Z",()=>undefined);
  assert.equal(afterCook["Rice|g"],250);
  assert.equal(recipeIngredientAvailability(recipes.riceBowl,afterCook).canCook,true);
  const afterSecond=remainingConfirmedStock(purchased,{},[
    {recipe:"riceBowl",at:"2026-11-12T13:00:00Z",ingredients:recipes.riceBowl},
    {recipe:"riceBowl",at:"2026-11-12T14:00:00Z",ingredients:recipes.riceBowl}
  ],"2026-11-12T12:00:00Z",()=>undefined);
  assert.equal(afterSecond["Rice|g"],0);
  assert.equal(recipeIngredientAvailability(recipes.riceBowl,afterSecond).canCook,false);
});

test("cooking snapshots survive recipe edits and deleted recipes",()=>{
  const oldRecipe=[{name:"Rice",unit:"g",qty:200}];
  const editedRecipe=[{name:"Rice",unit:"g",qty:450}];
  const event={recipe:"custom-1",at:"2026-11-12T13:00:00Z",ingredients:oldRecipe};
  const afterEdit=remainingConfirmedStock({"Rice|g":500},{},[event],"2026-11-12T12:00:00Z",()=>editedRecipe);
  const afterDelete=remainingConfirmedStock({"Rice|g":500},{},[event],"2026-11-12T12:00:00Z",()=>undefined);
  assert.equal(afterEdit["Rice|g"],300);
  assert.equal(afterDelete["Rice|g"],300);
  const legacy=remainingConfirmedStock({"Rice|g":500},{},[{recipe:"custom-1",at:event.at}],"2026-11-12T12:00:00Z",()=>editedRecipe);
  assert.equal(legacy["Rice|g"],50);
});

test("new trip carries remaining quantities without double-counting old cooks",()=>{
  const events=[{recipe:"rice",at:"2026-11-12T13:00:00Z",ingredients:[{name:"Rice",unit:"g",qty:200}]}];
  const remaining=remainingConfirmedStock({"Rice|g":500},{"Eggs|each":4},events,"2026-11-12T12:00:00Z",()=>undefined);
  const carried=Object.fromEntries(Object.entries(remaining).filter(([,qty])=>qty>0));
  const next=remainingConfirmedStock({},carried,events,null,()=>undefined);
  assert.deepEqual(next,{"Rice|g":300,"Eggs|each":4});
});

test("cart package quantities are committed only at confirmation",()=>{
 const recipes=[
  {ingredients:[{name:"Black beans",unit:"g",qty:400,pack:400,price:1.29}]},
  {ingredients:[{name:"Bell pepper",unit:"each",qty:3,pack:1,price:1.29}]}
 ];
 const basket=priceGroceryBasket(recipes).lines;
 const selected={"Black beans|g":2,"Bell pepper|each":0};
 const purchased=confirmShoppingCart(basket,[],selected,{});
 assert.deepEqual(purchased,{"Black beans|g":800});
 assert.deepEqual(selected,{"Black beans|g":2,"Bell pepper|each":0});
 const events=[{recipe:"burgers",at:"2026-11-12T13:00:00Z",ingredients:[{name:"Black beans",unit:"g",qty:400}]}];
 const remaining=remainingConfirmedStock(purchased,{},events,"2026-11-12T12:00:00Z",()=>undefined);
 assert.equal(remaining["Black beans|g"],400);
 assert.equal(recipeIngredientAvailability([{name:"Black beans",unit:"g",qty:400}],remaining).canCook,true);
});
test("legacy checked groceries still work with empty cart quantities",()=>{
 const basket=priceGroceryBasket([{ingredients:[{name:"Rice",unit:"g",qty:250,pack:500,price:3}]}]).lines;
 assert.deepEqual(confirmShoppingCart(basket,["Rice|g"],{},{}),{"Rice|g":500});
 assert.deepEqual(confirmShoppingCart(basket,["Rice|g"],{"Rice|g":0},{}),{});
});
