import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
const dir=mkdtempSync(join(tmpdir(),"forktactics-cost-"));
let recipeIngredientCostEstimate;
try{
 const path=join(dir,"planning-adapter.mts");
 writeFileSync(path,readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8"));
 ({recipeIngredientCostEstimate}=await import(pathToFileURL(path).href));
}finally{rmSync(dir,{recursive:true,force:true});}
const recipe={servings:2,ingredients:[{name:"Rice",unit:"g",qty:250,pack:500,price:4}]};
test("valid per-serving ingredient cost",()=>{
 assert.deepEqual(recipeIngredientCostEstimate(recipe),{cost:1,unknown:0});
});
test("negative shelf prices never create artificially cheap menus",()=>{
 assert.deepEqual(recipeIngredientCostEstimate(recipe,{"Rice|g":-10}),{cost:0,unknown:1});
});
test("invalid package overrides are unknown, not silently ignored",()=>{
 assert.deepEqual(recipeIngredientCostEstimate(recipe,{"Rice|g|pack":0}),{cost:0,unknown:1});
});
test("changing package size requires an explicit matching price",()=>{
 assert.deepEqual(recipeIngredientCostEstimate(recipe,{"Rice|g|pack":1000}),{cost:0,unknown:1});
 assert.deepEqual(recipeIngredientCostEstimate(recipe,{"Rice|g|pack":1000,"Rice|g":6}),{cost:0.75,unknown:0});
});
