import test from "node:test";
import assert from "node:assert/strict";
import {recipeIngredientAvailability} from "../src/planning-adapter.ts";

const item=(name,qty,unit="g")=>({name,qty,unit});

test("empty recipe is cookable without inventory",()=>{
  assert.deepEqual(recipeIngredientAvailability([],{}),{canCook:true,missing:[]});
});
test("only confirmed quantities satisfy recipe requirements",()=>{
  const ingredients=[item("Rice",200),item("Beans",2,"can")];
  assert.deepEqual(recipeIngredientAvailability(ingredients,{"Rice|g":200}),{
    canCook:false,missing:[{name:"Beans",unit:"can",qty:2}]
  });
  assert.deepEqual(recipeIngredientAvailability(ingredients,{"Rice|g":200,"Beans|can":2}),{
    canCook:true,missing:[]
  });
});
test("duplicate ingredients accumulate without mutating inventory",()=>{
  const inventory={"Rice|g":250};
  const result=recipeIngredientAvailability([item("Rice",200),item("Rice",100)],inventory);
  assert.deepEqual(result,{canCook:false,missing:[{name:"Rice",unit:"g",qty:50}]});
  assert.deepEqual(inventory,{"Rice|g":250});
});
test("units cannot substitute for one another",()=>{
  const result=recipeIngredientAvailability([item("Beans",2,"can")],{"Beans|g":1000});
  assert.deepEqual(result.missing,[{name:"Beans",unit:"can",qty:2}]);
});
test("invalid inventory does not unlock cooking",()=>{
  for(const stock of [NaN,Infinity,-3]){
    assert.equal(recipeIngredientAvailability([item("Rice",100)],{"Rice|g":stock}).canCook,false);
  }
});
test("invalid recipe quantities are rejected and optional zero quantities ignored",()=>{
  assert.throws(()=>recipeIngredientAvailability([item("Rice",-1)]),/Invalid recipe quantity/);
  assert.deepEqual(recipeIngredientAvailability([item("Rice",0)]),{canCook:true,missing:[]});
});
