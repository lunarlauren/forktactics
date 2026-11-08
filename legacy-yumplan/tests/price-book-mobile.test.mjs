import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRODUCTS,RECIPES} from '../src/data.mjs';
import {updatePriceBook} from '../src/price-book.mjs';
import {priceSelectedDinners} from '../src/selected-week.mjs';
import {parsePriceCsv,optimizePlan} from '../src/engine.mjs';
import {createBackup,parseBackup} from '../src/backup.mjs';

const settings={recipes:RECIPES,servings:4,budgetCents:10000};
test('editable package sizes change actual whole-package pricing without mutating the original',()=>{
  const selectedIds=['beef-tacos'];
  const before=priceSelectedDinners({...settings,selectedIds,products:PRODUCTS});
  const edited=updatePriceBook(PRODUCTS,'beef','packageQuantity',227);
  const after=priceSelectedDinners({...settings,selectedIds,products:edited});
  assert.equal(before.basket.beef,1);
  assert.equal(after.basket.beef,2);
  assert.equal(after.costCents-before.costCents,649);
  assert.equal(PRODUCTS.find(p=>p.id==='beef').packageQuantity,454);
  assert.notEqual(edited,PRODUCTS);
  assert.equal(updatePriceBook(PRODUCTS,'soy','packageQuantity',444.25).find(p=>p.id==='soy').packageQuantity,444.25);
});
test('invalid package quantities and prices are rejected without mutation',()=>{
  for(const value of [0,-1,NaN,Infinity,1e10])assert.throws(()=>updatePriceBook(PRODUCTS,'beef','packageQuantity',value));
  for(const value of [0,1.5,-1])assert.throws(()=>updatePriceBook(PRODUCTS,'eggs','packageQuantity',value),/whole number|positive/);
  for(const value of [0,NaN,1.25,1e10])assert.throws(()=>updatePriceBook(PRODUCTS,'beef','priceCents',value));
  assert.throws(()=>updatePriceBook(PRODUCTS,'unknown','packageQuantity',5),/Unknown/);
  assert.throws(()=>parsePriceCsv('ingredient_id,name,category,package_quantity,unit,price\neggs,Eggs,Dairy,2.5,count,3.00',PRODUCTS),/whole number/);
});
test('updated phone prices survive backup round trip; active week keeps frozen snapshot',()=>{
  const plan=optimizePlan({budgetCents:15000,nights:3,servings:4,targetOptions:8,recipes:RECIPES,products:PRODUCTS,attempts:12});
  const frozen=structuredClone(plan.priceBook);
  let products=updatePriceBook(PRODUCTS,'chicken','packageQuantity',907);
  products=updatePriceBook(products,'chicken','priceCents',799);
  const state={budget:150,nights:3,servings:4,options:8,strategy:'balanced',autoSubstitutions:false,preferences:{},products,plan,discoverIndex:0,weekArchive:[]};
  const restored=parseBackup(createBackup(state),{recipes:RECIPES,products:PRODUCTS});
  assert.equal(restored.products.find(p=>p.id==='chicken').packageQuantity,907);
  assert.equal(restored.products.find(p=>p.id==='chicken').priceCents,799);
  assert.deepEqual(restored.plan.priceBook,frozen);
  assert.deepEqual(plan.priceBook,frozen);
});
test('offline shell includes package editor and touch layout supports 44px targets',()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
  assert.match(sw,/\.\/src\/price-book\.mjs/);
  assert.match(css,/\.package-input input\{[^}]*min-height:46px/);
  assert.match(css,/@media\(max-width:540px\)/);
  assert.match(app,/data-package=/);
  assert.match(app,/Package size \(/);
});
