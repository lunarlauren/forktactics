import test from 'node:test';
import assert from 'node:assert/strict';
import {updateDraftMealPreference} from '../src/meal-preferences.mjs';
import {RECIPES,PRODUCTS} from '../src/data.mjs';
import {evaluateDinnerChoices,priceSelectedDinners} from '../src/selected-week.mjs';
const a=RECIPES[0].id,b=RECIPES[1].id;
const base={preferences:{},selectedIds:[a,b],recipeId:a,recipes:RECIPES};
test('Yuck removes a selected draft dinner, without mutating caller state',()=>{
  const original=structuredClone(base);
  const result=updateDraftMealPreference({...base,value:'yuck'});
  assert.deepEqual(result.selectedIds,[b]);
  assert.equal(result.preferences[a],'yuck');
  assert.equal(result.removedSelected,true);
  assert.deepEqual(base,original);
  const choices=evaluateDinnerChoices({selectedIds:result.selectedIds,recipes:RECIPES,products:PRODUCTS,servings:4,budgetCents:20000,preferences:result.preferences});
  assert.equal(choices.find(c=>c.id===a).reason,'Yuck');
});
test('Yum persists in preference data and remains eligible for selection',()=>{
  const result=updateDraftMealPreference({...base,value:'yum'});
  assert.deepEqual(result.selectedIds,[a,b]);
  assert.equal(result.preferences[a],'yum');
  assert.ok(priceSelectedDinners({selectedIds:result.selectedIds,recipes:RECIPES,products:PRODUCTS,servings:4,budgetCents:20000,preferences:result.preferences}));
});
test('Tapping an active preference again clears it',()=>{
  const first=updateDraftMealPreference({...base,value:'yuck'});
  const second=updateDraftMealPreference({...base,selectedIds:first.selectedIds,preferences:first.preferences,value:'yuck'});
  assert.equal(second.preferences[a],'save');
  assert.deepEqual(second.selectedIds,[b]);
});
test('Yuck and Yum are mutually exclusive',()=>{
  const first=updateDraftMealPreference({...base,value:'yuck'});
  const second=updateDraftMealPreference({...base,selectedIds:first.selectedIds,preferences:first.preferences,value:'yum'});
  assert.equal(second.preferences[a],'yum');
  assert.deepEqual(second.selectedIds,[b]);
});
test('Invalid recipe or value rejected',()=>{
  assert.throws(()=>updateDraftMealPreference({...base,recipeId:'nonexistent',value:'yum'}),/known dinner/);
  assert.throws(()=>updateDraftMealPreference({...base,value:'maybe'}),/Yum or Yuck/);
});
