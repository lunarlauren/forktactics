import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";

const dir=mkdtempSync(join(tmpdir(),"forktactics-ledger-"));
const source=readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8");
writeFileSync(join(dir,"planning-adapter.mts"),source);
const {remainingConfirmedStock,recipeIngredientAvailability}=await import(pathToFileURL(join(dir,"planning-adapter.mts")).href);
rmSync(dir,{recursive:true,force:true});

const requirements=id=>id==="rice"?[{name:"Rice",unit:"g",qty:200}]:id==="double"?[
 {name:"Rice",unit:"g",qty:100},{name:"Rice",unit:"g",qty:50}]:undefined;

test("repeated cooks consume finite stock and eventually block cooking",()=>{
 const stock=remainingConfirmedStock({"Rice|g":500},{},[
  {recipe:"rice",at:"2026-11-10T12:00:00Z"},
  {recipe:"rice",at:"2026-11-10T13:00:00Z"}
 ],"2026-11-10T00:00:00Z",requirements);
 assert.equal(stock["Rice|g"],100);
 assert.equal(recipeIngredientAvailability(requirements("rice"),stock).canCook,false);
});

test("past shopping trips do not consume current purchased quantities",()=>{
 const stock=remainingConfirmedStock({"Rice|g":200},{},[
  {recipe:"rice",at:"2026-11-09T12:00:00Z"}
 ],"2026-11-10T00:00:00Z",requirements);
 assert.equal(stock["Rice|g"],200);
});

test("pantry and purchased quantities combine without mutating either",()=>{
 const purchased={"Rice|g":100},pantry={"Rice|g":150,"Eggs|each":6};
 const stock=remainingConfirmedStock(purchased,pantry,[],"2026-11-10T00:00:00Z",requirements);
 assert.deepEqual(stock,{"Rice|g":250,"Eggs|each":6});
 assert.deepEqual(purchased,{"Rice|g":100});
 assert.deepEqual(pantry,{"Rice|g":150,"Eggs|each":6});
});

test("duplicate ingredient entries consume their full sum",()=>{
 const stock=remainingConfirmedStock({"Rice|g":200},{},[
  {recipe:"double",at:"2026-11-10T12:00:00Z"}
 ],"2026-11-10T00:00:00Z",requirements);
 assert.equal(stock["Rice|g"],50);
});

test("unknown recipes and invalid inventory cannot create phantom stock",()=>{
 const stock=remainingConfirmedStock({"Rice|g":NaN,"Eggs|each":-5},{},[
  {recipe:"deleted",at:"2026-11-10T12:00:00Z"}
 ],"2026-11-10T00:00:00Z",requirements);
 assert.deepEqual(stock,{});
});

test("without a shopping trip, history remains but does not consume current stock",()=>{
 const stock=remainingConfirmedStock({"Rice|g":200},{},[
  {recipe:"rice",at:"2026-11-10T12:00:00Z"}
 ],null,requirements);
 assert.equal(stock["Rice|g"],200);
});
