import test from 'node:test';
import assert from 'node:assert/strict';
import {priceGroceryBasket,checkoutShoppingTrip,remainingConfirmedStock,recipeIngredientAvailability,resetCookingLedger,outstandingGroceryEstimate} from '../src/planning-adapter.ts';

const rice={name:'Rice',unit:'g',qty:300,pack:500,price:2.5};
const beans={name:'Beans',unit:'can',qty:1,pack:1,price:1.25};
const meals=[{ingredients:[rice,beans]}];
const start='2026-11-13T10:00:00.000Z';
const cookedAt='2026-11-13T10:10:00.000Z';
const requirements=id=>id==='dinner'?[rice,beans]:undefined;

test('shopping selections are not inventory until checkout, and cooking consumes only confirmed stock',()=>{
 const basket=priceGroceryBasket(meals).lines;
 assert.equal(recipeIngredientAvailability([rice,beans],{}).canCook,false);
 const checkout=checkoutShoppingTrip(basket,[],{'Rice|g':1,'Beans|can':1},{},[]);
 assert.deepEqual(checkout.purchased,{'Rice|g':500,'Beans|can':1});
 assert.equal(recipeIngredientAvailability([rice,beans],checkout.purchased).canCook,true);
 const events=[{recipe:'dinner',at:cookedAt,ingredients:[rice,beans]}];
 const remaining=remainingConfirmedStock(checkout.purchased,{},events,start,requirements);
 assert.equal(remaining['Rice|g'],200);
 assert.equal(remaining['Beans|can'],0);
 assert.deepEqual(recipeIngredientAvailability([rice,beans],remaining).missing,[{name:'Rice',unit:'g',qty:100},{name:'Beans',unit:'can',qty:1}]);
 assert.deepEqual(outstandingGroceryEstimate(basket,checkout.purchased),{knownTotal:0,unknownCount:0});
});

test('checkout combines main and checked recovery packages without consuming unchecked recovery',()=>{
 const basket=priceGroceryBasket(meals).lines;
 const recovery=[{name:'Rice',unit:'g',packs:1,pack:500,checked:true},{name:'Beans',unit:'can',packs:2,pack:1,checked:false}];
 const result=checkoutShoppingTrip(basket,[],{'Rice|g':1,'Beans|can':0},{'Rice|g':200},recovery);
 assert.equal(result.purchased['Rice|g'],1200);
 assert.equal(result.purchased['Beans|can'],undefined);
 assert.deepEqual(result.remainingRecovery,[recovery[1]]);
 assert.deepEqual(recovery[0],{name:'Rice',unit:'g',packs:1,pack:500,checked:true});
});

test('new consumption epoch carries leftover stock once and preserves historical events',()=>{
 const events=[{recipe:'dinner',at:cookedAt,ingredients:[rice,beans]}];
 const reset=resetCookingLedger({'Rice|g':500,'Beans|can':1},{'Rice|g':100},events,start,requirements,'2026-11-13T11:00:00.000Z');
 assert.deepEqual(reset.purchasedQuantities,{});
 assert.equal(reset.pantryQuantities['Rice|g'],300);
 assert.equal(reset.pantryQuantities['Beans|can'],undefined);
 const available=remainingConfirmedStock(reset.purchasedQuantities,reset.pantryQuantities,events,reset.tripStartedAt,requirements);
 assert.equal(available['Rice|g'],300);
 assert.equal(recipeIngredientAvailability([rice],available).canCook,true);
 assert.equal(recipeIngredientAvailability([beans],available).canCook,false);
});
