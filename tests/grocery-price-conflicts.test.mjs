import test from "node:test";
import assert from "node:assert/strict";
import {priceGroceryBasket} from "../src/planning-adapter.ts";

const ingredient=(name,qty,pack,price,unit="g")=>({name,qty,pack,price,unit});
const meal=(...ingredients)=>({ingredients});

test("conflicting recipe shelf prices remain unknown regardless of recipe order",()=>{
  const first=meal(ingredient("Rice",200,500,2.5));
  const second=meal(ingredient("Rice",300,500,3.5));
  for(const meals of [[first,second],[second,first]]){
    const basket=priceGroceryBasket(meals);
    assert.equal(basket.lines[0].requiredQty,500);
    assert.equal(basket.lines[0].cost,null);
    assert.equal(basket.unknownCount,1);
  }
});

test("unit-specific price sheet resolves conflicting shelf prices",()=>{
  const meals=[meal(ingredient("Rice",200,500,2.5)),meal(ingredient("Rice",300,500,3.5))];
  const basket=priceGroceryBasket(meals,{"Rice|g":4.25});
  assert.equal(basket.lines[0].packs,1);
  assert.equal(basket.lines[0].cost,4.25);
  assert.equal(basket.unknownCount,0);
});

test("conflicting package sizes require both explicit pack and shelf price",()=>{
  const meals=[meal(ingredient("Rice",200,500,2.5)),meal(ingredient("Rice",300,1000,4))];
  const packOnly=priceGroceryBasket(meals,{"Rice|g|pack":500});
  assert.equal(packOnly.lines[0].cost,null);
  assert.equal(packOnly.unknownCount,1);
  const resolved=priceGroceryBasket(meals,{"Rice|g|pack":500,"Rice|g":3});
  assert.equal(resolved.lines[0].packs,1);
  assert.equal(resolved.knownTotal,3);
  assert.equal(resolved.unknownCount,0);
});

test("zero-quantity optional ingredients do not introduce price conflicts",()=>{
  const basket=priceGroceryBasket([meal(ingredient("Rice",200,500,2.5)),meal(ingredient("Rice",0,0,null))]);
  assert.equal(basket.lines[0].cost,2.5);
  assert.equal(basket.unknownCount,0);
});
