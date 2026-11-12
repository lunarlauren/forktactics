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
const {recipeIngredientAvailability}=await import(pathToFileURL(join(dir,"planning-adapter.mts")).href);
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
