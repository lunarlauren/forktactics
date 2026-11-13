import test from "node:test";
import assert from "node:assert/strict";
import {correctAvailableInventory,remainingConfirmedStock,resetCookingLedger} from "../src/planning-adapter.ts";

const key="Rice|g";
const recipe=()=>[{name:"Rice",unit:"g",qty:100}];
const events=[{recipe:"dinner",at:"2026-11-13T12:00:00.000Z",ingredients:recipe()}];
const trip="2026-11-13T11:00:00.000Z";
const stock=(purchased,pantry,cooks=events,boundary=trip)=>remainingConfirmedStock(purchased,pantry,cooks,boundary,recipe);

test("manual pantry correction changes available stock without rewriting unrelated items",()=>{
 const purchased={[key]:200,"Milk|mL":500};
 const pantry={[key]:50};
 const corrected=correctAvailableInventory(purchased,pantry,stock(purchased,pantry),key,75);
 assert.equal(stock(corrected.purchasedQuantities,corrected.pantryQuantities)[key],75);
 assert.equal(stock(corrected.purchasedQuantities,corrected.pantryQuantities)["Milk|mL"],500);
 assert.deepEqual(purchased,{[key]:200,"Milk|mL":500});
});

test("setting zero available stock after cooking does not resurrect ingredients",()=>{
 const corrected=correctAvailableInventory({[key]:200},{},stock({[key]:200},{}),key,0);
 assert.equal(stock(corrected.purchasedQuantities,corrected.pantryQuantities)[key],0);
});

test("undoing a cook restores consumed stock after a manual correction",()=>{
 const corrected=correctAvailableInventory({[key]:200},{},stock({[key]:200},{}),key,25);
 assert.equal(stock(corrected.purchasedQuantities,corrected.pantryQuantities)[key],25);
 assert.equal(stock(corrected.purchasedQuantities,corrected.pantryQuantities,[])[key],125);
});

test("starting a new trip carries only corrected leftovers, without double subtraction",()=>{
 const corrected=correctAvailableInventory({[key]:200},{},stock({[key]:200},{}),key,25);
 const next=resetCookingLedger(corrected.purchasedQuantities,corrected.pantryQuantities,events,trip,recipe,"2026-11-14T11:00:00.000Z");
 assert.equal(next.pantryQuantities[key],25);
 assert.deepEqual(next.purchasedQuantities,{});
 assert.equal(stock(next.purchasedQuantities,next.pantryQuantities,events,next.tripStartedAt)[key],25);
});

test("negative and nonfinite corrections are rejected",()=>{
 assert.throws(()=>correctAvailableInventory({}, {}, {},key,-1));
 assert.throws(()=>correctAvailableInventory({}, {}, {},key,NaN));
});
