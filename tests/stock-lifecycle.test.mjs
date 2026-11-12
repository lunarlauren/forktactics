import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {pathToFileURL} from "node:url";

// Node's strip-types support varies by version; import the TS module through
// a temporary .mts file to keep this test independent of a bundler.
const dir=mkdtempSync(join(tmpdir(),"forktactics-stock-"));
const source=readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8");
writeFileSync(join(dir,"planning-adapter.mts"),source);
const {recipeIngredientAvailability,remainingConfirmedStock,cooksInCurrentTrip}=await import(pathToFileURL(join(dir,"planning-adapter.mts")).href);
rmSync(dir,{recursive:true,force:true});

test("shared stock cannot cover two consecutive meals without replenishment",()=>{
  const ingredients=[{name:"Rice",unit:"g",qty:200}];
  const stock={"Rice|g":300};
  assert.equal(recipeIngredientAvailability(ingredients,stock).canCook,true);
  // One completed meal consumes 200g; remaining 100g cannot cook another.
  assert.deepEqual(recipeIngredientAvailability(ingredients,{"Rice|g":100}),{
    canCook:false,missing:[{name:"Rice",unit:"g",qty:100}]
  });
});

test("two duplicate requirements must be added before checking stock",()=>{
  assert.deepEqual(recipeIngredientAvailability([
    {name:"Soy sauce",unit:"ml",qty:40},
    {name:"Soy sauce",unit:"ml",qty:30}
  ],{"Soy sauce|ml":50}),{
    canCook:false,missing:[{name:"Soy sauce",unit:"ml",qty:20}]
  });
});

test("shopping checklist alone never counts as confirmed stock",()=>{
  const recipe=[{name:"Eggs",unit:"each",qty:4}];
  const checked=["Eggs|each"];
  assert.equal(checked.length,1);
  assert.equal(recipeIngredientAvailability(recipe,{}).canCook,false);
});

test("unrelated inventory remains usable after another meal is consumed",()=>{
  const remaining={"Rice|g":0,"Eggs|each":6};
  assert.equal(recipeIngredientAvailability([{name:"Eggs",unit:"each",qty:4}],remaining).canCook,true);
});

test("invalid and negative inventory cannot enable cooking",()=>{
  for(const qty of [-1,NaN,Infinity]){
    assert.equal(recipeIngredientAvailability([{name:"Milk",unit:"ml",qty:100}],{"Milk|ml":qty}).canCook,false);
  }
});

const recipes={
  rice:[{name:"Rice",unit:"g",qty:200}],
  eggs:[{name:"Eggs",unit:"each",qty:2}],
  doubleRice:[{name:"Rice",unit:"g",qty:100},{name:"Rice",unit:"g",qty:75}]
};
const requirements=id=>recipes[id];

test("confirmed cook events consume shared stock and block a second meal",()=>{
  const events=[{recipe:"rice",at:"2026-11-11T18:00:00.000Z"}];
  const remaining=remainingConfirmedStock({"Rice|g":300},{},events,"2026-11-11T17:00:00.000Z",requirements);
  assert.equal(remaining["Rice|g"],100);
  assert.deepEqual(recipeIngredientAvailability(recipes.rice,remaining),{
    canCook:false,missing:[{name:"Rice",unit:"g",qty:100}]
  });
});

test("repeated cooks and duplicate recipe lines both debit confirmed inventory",()=>{
  const events=[
    {recipe:"doubleRice",at:"2026-11-11T18:00:00.000Z"},
    {recipe:"doubleRice",at:"2026-11-11T19:00:00.000Z"}
  ];
  const remaining=remainingConfirmedStock({"Rice|g":400},{},events,"2026-11-11T17:00:00.000Z",requirements);
  assert.equal(remaining["Rice|g"],50);
});

test("prior-trip events do not debit the new shopping trip",()=>{
  const remaining=remainingConfirmedStock({"Rice|g":300},{},[
    {recipe:"rice",at:"2026-11-10T18:00:00.000Z"},
    {recipe:"eggs",at:"2026-11-11T18:00:00.000Z"}
  ],"2026-11-11T17:00:00.000Z",requirements);
  assert.equal(remaining["Rice|g"],300);
  assert.equal(remaining["Eggs|each"],-2);
});

test("unrecognized historical recipes do not crash the inventory ledger",()=>{
  const remaining=remainingConfirmedStock({},{"Eggs|each":6},[
    {recipe:"deleted-recipe",at:"2026-11-11T18:00:00.000Z"}
  ],"2026-11-11T17:00:00.000Z",requirements);
  assert.equal(remaining["Eggs|each"],6);
});

test("ledger does not mutate purchased, pantry, or cooking history",()=>{
  const purchased={"Rice|g":300};
  const pantry={"Eggs|each":4};
  const events=[{recipe:"rice",at:"2026-11-11T18:00:00.000Z"}];
  const result=remainingConfirmedStock(purchased,pantry,events,"2026-11-11T17:00:00.000Z",requirements);
  assert.deepEqual(purchased,{"Rice|g":300});
  assert.deepEqual(pantry,{"Eggs|each":4});
  assert.deepEqual(events,[{recipe:"rice",at:"2026-11-11T18:00:00.000Z"}]);
  assert.deepEqual(result,{"Rice|g":100,"Eggs|each":4});
});


test("malformed event timestamps never consume confirmed inventory",()=>{
  const events=[
    {recipe:"rice",at:"not-a-date"},
    {recipe:"rice",at:""},
    {recipe:"rice",at:"2026-11-11T18:00:00.000Z"}
  ];
  const remaining=remainingConfirmedStock({"Rice|g":500},{},events,"2026-11-11T17:00:00.000Z",requirements);
  assert.equal(remaining["Rice|g"],300);
});


test("timezone offsets compare by actual instant rather than text order",()=>{
  const remaining=remainingConfirmedStock({"Rice|g":500},{},[
    // 17:30Z is before the trip even though its text starts with 19.
    {recipe:"rice",at:"2026-11-11T19:30:00+02:00"},
    // 18:30Z is after the trip even though its text starts with 13.
    {recipe:"rice",at:"2026-11-11T13:30:00-05:00"}
  ],"2026-11-11T18:00:00.000Z",requirements);
  assert.equal(remaining["Rice|g"],300);
});

test("invalid trip boundaries do not accidentally debit historical stock",()=>{
  const remaining=remainingConfirmedStock({"Rice|g":500},{},[
    {recipe:"rice",at:"2026-11-11T18:30:00Z"}
  ],"invalid-trip-date",requirements);
  assert.equal(remaining["Rice|g"],500);
});

test("trip cook count handles offsets, malformed dates, and earlier events",()=>{
 const events=[
  {at:"2026-11-11T19:30:00+02:00"},
  {at:"2026-11-11T13:30:00-05:00"},
  {at:"bad-timestamp"},
  {at:"2026-11-11T18:30:00Z"}
 ];
 assert.equal(cooksInCurrentTrip(events,"2026-11-11T18:00:00Z"),2);
 assert.equal(cooksInCurrentTrip(events,"invalid"),0);
 assert.equal(cooksInCurrentTrip(events,null),0);
});


test("fractional ingredient arithmetic does not falsely block cooking",()=>{
  const ingredients=[
    {name:"Olive oil",unit:"ml",qty:0.1},
    {name:"Olive oil",unit:"ml",qty:0.2}
  ];
  assert.deepEqual(recipeIngredientAvailability(ingredients,{"Olive oil|ml":0.3}),{
    canCook:true,missing:[]
  });
  assert.deepEqual(recipeIngredientAvailability(ingredients,{"Olive oil|ml":0.29}),{
    canCook:false,missing:[{name:"Olive oil",unit:"ml",qty:0.010000000000000009}]
  });
});
