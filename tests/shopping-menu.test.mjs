import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";

const dir=mkdtempSync(join(tmpdir(),"forktactics-menu-"));
let shoppingMenuIds;
try{
  const source=readFileSync(new URL("../src/planning-adapter.ts",import.meta.url),"utf8");
  const path=join(dir,"planning-adapter.mts");
  writeFileSync(path,source);
  ({shoppingMenuIds}=await import(pathToFileURL(path).href));
}finally{
  rmSync(dir,{recursive:true,force:true});
}

test("shopping target counts chosen meals rather than empty slots",()=>{
  assert.deepEqual(shoppingMenuIds(["rice","","eggs","","tacos","soup"],3),["rice","eggs","tacos"]);
});

test("no meals means an empty grocery selection",()=>{
  assert.deepEqual(shoppingMenuIds(["","",""],5),[]);
});

test("shopping target never exceeds the requested number of meals",()=>{
  assert.deepEqual(shoppingMenuIds(["rice","eggs","tacos"],2),["rice","eggs"]);
  assert.deepEqual(shoppingMenuIds(["rice","eggs"],0),[]);
});
