import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
const dir=mkdtempSync(join(tmpdir(),"forktactics-purchases-"));
let priceGroceryBasket,confirmCheckedGroceryPurchases;
try{
 const source=readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8");
 const path=join(dir,"planning-adapter.mts");
 writeFileSync(path,source);
 ({priceGroceryBasket,confirmCheckedGroceryPurchases}=await import(pathToFileURL(path).href));
}finally{rmSync(dir,{recursive:true,force:true});}
const line=priceGroceryBasket([{ingredients:[{name:"Rice",unit:"g",qty:550,pack:500,price:3}]}]).lines[0];

test("partial purchases add only remaining whole packages",()=>{
 assert.deepEqual(confirmCheckedGroceryPurchases([line],["Rice|g"],{"Rice|g":200}),{"Rice|g":700});
});

test("unchecked groceries never become purchases",()=>{
 assert.deepEqual(confirmCheckedGroceryPurchases([line],[],{"Rice|g":200}),{"Rice|g":200});
});

test("fully purchased items are not purchased again",()=>{
 assert.deepEqual(confirmCheckedGroceryPurchases([line],["Rice|g"],{"Rice|g":600}),{"Rice|g":600});
});

test("legacy name-only checklist keys remain compatible",()=>{
 assert.deepEqual(confirmCheckedGroceryPurchases([line],["Rice"],{}),{"Rice|g":1000});
});


test("fractional package boundaries never confirm an unnecessary extra pack",()=>{
 const fractional=priceGroceryBasket([{ingredients:[
  {name:"Spice",unit:"g",qty:0.1,pack:0.3,price:4},
  {name:"Spice",unit:"g",qty:0.2,pack:0.3,price:4}
 ]}]).lines[0];
 assert.equal(fractional.packs,1);
 assert.deepEqual(confirmCheckedGroceryPurchases([fractional],["Spice|g"],{}),{"Spice|g":0.3});
});
