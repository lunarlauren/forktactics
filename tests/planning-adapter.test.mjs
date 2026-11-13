import test from "node:test";
import assert from "node:assert/strict";
import {priceGroceryBasket,outstandingGroceryEstimate,confirmShoppingCart,checkoutShoppingTrip,retainUnchangedCart,recipeIngredientAvailability} from "../src/planning-adapter.ts";

const ingredient=(name,qty,pack,price,unit="g")=>({name,qty,pack,price,unit});
const meal=(...ingredients)=>({ingredients});

test("empty kitchen produces an empty, zero-cost basket",()=>{
  assert.deepEqual(priceGroceryBasket([]),{lines:[],knownTotal:0,unknownCount:0});
});
test("merges ingredients and rounds up packages",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,2.5)),meal(ingredient("Rice",400,500,2.5))]);
  assert.equal(result.lines[0].requiredQty,600);
  assert.equal(result.lines[0].packs,2);
  assert.equal(result.knownTotal,5);
});
test("pantry inventory reduces shopping requirements without changing required amount",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))],{},{"Rice|g":450});
  assert.equal(result.lines[0].requiredQty,600);
  assert.equal(result.lines[0].pantryQty,450);
  assert.equal(result.lines[0].qty,150);
  assert.equal(result.knownTotal,2.5);
});
test("fully stocked pantry needs no price or packages",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,null))],{},{"Rice|g":1000});
  assert.equal(result.knownTotal,0);
  assert.equal(result.unknownCount,0);
});
test("unknown prices are not silently counted as free",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,null))]);
  assert.equal(result.lines[0].cost,null);
  assert.equal(result.unknownCount,1);
});
test("different package sizes flag uncertain cost rather than crash",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,2.5)),meal(ingredient("Rice",300,1000,4))]);
  assert.equal(result.lines[0].requiredQty,500);
  assert.equal(result.lines[0].pack,0);
  assert.equal(result.lines[0].cost,null);
  assert.equal(result.unknownCount,1);
});
test("price sheet overrides default package price",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",200,500,2.5))],{Rice:3.75});
  assert.equal(result.knownTotal,3.75);
});
test("invalid package sizes are rejected",()=>{
  assert.throws(()=>priceGroceryBasket([meal(ingredient("Rice",200,0,2.5))]),/Invalid grocery/);
});

test("outstanding estimate excludes verified purchases but not manual checkmarks",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",1200,500,2.5))],{},{"Rice|g":200});
  assert.deepEqual(outstandingGroceryEstimate(lines),{knownTotal:5,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Rice|g":600}),{knownTotal:2.5,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Rice|g":1000}),{knownTotal:0,unknownCount:0});
});
test("outstanding estimate does not double subtract pantry stock",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))],{},{"Rice|g":450});
  assert.equal(lines[0].qty,150);
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Rice|g":100}),{knownTotal:2.5,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Rice|g":150}),{knownTotal:0,unknownCount:0});
});
test("outstanding unknown prices count only ingredients still needed",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Beans",2,1,null,"can"),ingredient("Rice",200,500,2.5))]);
  assert.deepEqual(outstandingGroceryEstimate(lines),{knownTotal:2.5,unknownCount:1});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Beans|can":2}),{knownTotal:2.5,unknownCount:0});
});
test("outstanding purchases are unit-specific and invalid quantities are ignored",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Beans",2,1,1,"can"),ingredient("Beans",200,500,3,"g"))]);
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Beans|can":2,"Beans|g":Number.NaN}),{knownTotal:3,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(lines,{"Beans|can":-4,"Beans|g":Infinity}),{knownTotal:5,unknownCount:0});
});
test("changed meal requirements recompute outstanding costs from current lines",()=>{
  const before=priceGroceryBasket([meal(ingredient("Rice",900,500,2.5))]);
  const after=priceGroceryBasket([meal(ingredient("Rice",1500,500,2.5))]);
  const purchased={"Rice|g":700};
  assert.deepEqual(outstandingGroceryEstimate(before.lines,purchased),{knownTotal:2.5,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(after.lines,purchased),{knownTotal:5,unknownCount:0});
});

test("a price-sheet package-size change requires an explicit matching shelf price",()=>{
  const meals=[meal(ingredient("Rice",600,500,2.5))];
  const unresolved=priceGroceryBasket(meals,{"Rice|g|pack":1000});
  assert.equal(unresolved.lines[0].pack,1000);
  assert.equal(unresolved.lines[0].cost,null);
  assert.equal(unresolved.unknownCount,1);
  const resolved=priceGroceryBasket(meals,{"Rice|g|pack":1000,"Rice|g":4.25});
  assert.equal(resolved.lines[0].packs,1);
  assert.equal(resolved.knownTotal,4.25);
  assert.equal(resolved.unknownCount,0);
});
test("an explicit unknown price overrides a recipe estimate rather than counting it as free",()=>{
  const result=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))],{"Rice|g":null});
  assert.equal(result.lines[0].packs,2);
  assert.equal(result.lines[0].cost,null);
  assert.equal(result.knownTotal,0);
  assert.equal(result.unknownCount,1);
  assert.deepEqual(outstandingGroceryEstimate(result.lines,{"Rice|g":600}),{knownTotal:0,unknownCount:0});
});

test("invalid shelf-price overrides remain unknown instead of creating misleading totals",()=>{
  const meals=[meal(ingredient("Rice",600,500,2.5))];
  for(const invalidPrice of [-2,Number.NaN,Infinity,-Infinity,"not a price"]){
    const basket=priceGroceryBasket(meals,{"Rice|g":invalidPrice});
    assert.equal(basket.lines[0].price,null);
    assert.equal(basket.lines[0].cost,null);
    assert.equal(basket.knownTotal,0);
    assert.equal(basket.unknownCount,1);
    assert.deepEqual(outstandingGroceryEstimate(basket.lines),{knownTotal:0,unknownCount:1});
  }
});

test("invalid recipe shelf prices normalize to unknown without affecting stocked ingredients",()=>{
  const meals=[meal(ingredient("Rice",600,500,-4))];
  const basket=priceGroceryBasket(meals);
  assert.equal(basket.lines[0].price,null);
  assert.equal(basket.unknownCount,1);
  const stocked=priceGroceryBasket(meals,{},{"Rice|g":600});
  assert.equal(stocked.lines[0].price,null);
  assert.equal(stocked.lines[0].cost,0);
  assert.equal(stocked.unknownCount,0);
  assert.deepEqual(outstandingGroceryEstimate(stocked.lines),{knownTotal:0,unknownCount:0});
});

test("invalid explicit package overrides never fall back to recipe package pricing",()=>{
  const meals=[meal(ingredient("Rice",600,500,2.5))];
  for(const invalidPack of [0,-1,Number.NaN,Infinity,"bad"]){
    const basket=priceGroceryBasket(meals,{"Rice|g|pack":invalidPack});
    assert.equal(basket.lines[0].pack,0);
    assert.equal(basket.lines[0].cost,null);
    assert.equal(basket.unknownCount,1);
    assert.deepEqual(outstandingGroceryEstimate(basket.lines),{knownTotal:0,unknownCount:1});
  }
});

test("partial shopping confirmation leaves unpurchased ingredients outstanding",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5),ingredient("Beans",2,1,1.25,"can"))]);
  // Only confirmed purchase quantities belong in this calculation. UI checkmarks
  // must not be passed as inventory until the user records their purchases.
  const confirmed={"Rice|g":1000};
  assert.deepEqual(outstandingGroceryEstimate(lines,confirmed),{knownTotal:2.5,unknownCount:0});
  assert.equal(lines.find(line=>line.name==="Beans").packs,2);
});
test("recipe swaps retain recorded purchases without inventing new ones",()=>{
  const before=priceGroceryBasket([meal(ingredient("Rice",300,500,2.5),ingredient("Beans",2,1,1.25,"can"))]);
  const after=priceGroceryBasket([meal(ingredient("Rice",700,500,2.5),ingredient("Tomatoes",3,2,2,"each"))]);
  const confirmed={"Rice|g":500,"Beans|can":2};
  assert.deepEqual(outstandingGroceryEstimate(before.lines,confirmed),{knownTotal:0,unknownCount:0});
  assert.deepEqual(outstandingGroceryEstimate(after.lines,confirmed),{knownTotal:6.5,unknownCount:0});
  assert.deepEqual(confirmed,{"Rice|g":500,"Beans|can":2});
});
test("recovery purchases reduce outstanding groceries only after recording",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",800,500,2.5),ingredient("Beans",2,1,1.25,"can"))]);
  const purchased={"Rice|g":500};
  assert.deepEqual(outstandingGroceryEstimate(lines,purchased),{knownTotal:5,unknownCount:0});
  const confirmedRecovery={...purchased,"Beans|can":2};
  assert.deepEqual(outstandingGroceryEstimate(lines,confirmedRecovery),{knownTotal:2.5,unknownCount:0});
});

test("duplicate grocery lines never double-count checked or selected packages",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))]);
  const duplicated=[lines[0],{...lines[0]}];
  assert.deepEqual(confirmShoppingCart(duplicated,["Rice|g"],{},{}),{"Rice|g":1000});
  assert.deepEqual(confirmShoppingCart(duplicated,[],{"Rice|g":2},{}),{"Rice|g":1000});
  assert.deepEqual(confirmShoppingCart(duplicated,["Rice"],{},{"Rice|g":250}),{"Rice|g":750});
});

test("recovery-only checkout preserves existing stock and unchecked recovery entries",()=>{
  const recovery=[
    {name:"Beans",unit:"can",packs:2,pack:1,checked:true},
    {name:"Rice",unit:"g",packs:1,pack:500,checked:false}
  ];
  const existing={"Beans|can":1,"Rice|g":250};
  const result=checkoutShoppingTrip([],[],{},existing,recovery);
  assert.deepEqual(result.purchased,{"Beans|can":3,"Rice|g":250});
  assert.deepEqual(result.remainingRecovery,[recovery[1]]);
  assert.deepEqual(existing,{"Beans|can":1,"Rice|g":250});
  assert.deepEqual(recovery[0],{name:"Beans",unit:"can",packs:2,pack:1,checked:true});
});

test("malformed recovery purchases remain pending without corrupting valid checkout",()=>{
  const recovery=[
    {name:"Beans",unit:"can",packs:2,pack:1,checked:true},
    {name:"Bad",unit:"can",packs:Infinity,pack:1,checked:true},
    null
  ];
  const result=checkoutShoppingTrip([],[],{},{"Beans|can":1},recovery);
  assert.deepEqual(result.purchased,{"Beans|can":3});
  assert.deepEqual(result.remainingRecovery,[recovery[1],null]);
});

test("repeated checkout with cleared selections does not record purchases twice",()=>{
  const recovery=[
    {name:"Beans",unit:"can",packs:2,pack:1,checked:true},
    {name:"Rice",unit:"g",packs:1,pack:500,checked:false}
  ];
  // The first trip already has partially consumed rice stock.
  const existing={"Beans|can":1,"Rice|g":175};
  const first=checkoutShoppingTrip([],[],{},existing,recovery);
  assert.deepEqual(first.purchased,{"Beans|can":3,"Rice|g":175});
  assert.deepEqual(first.remainingRecovery,[recovery[1]]);

  // After confirmation, the UI clears selections and keeps only pending recovery.
  const second=checkoutShoppingTrip([],[],{},first.purchased,first.remainingRecovery);
  assert.deepEqual(second.purchased,first.purchased);
  assert.deepEqual(second.remainingRecovery,[recovery[1]]);
  assert.deepEqual(existing,{"Beans|can":1,"Rice|g":175});
});

test("explicit zero cart selection overrides a legacy checked grocery line",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))]);
  const stock={"Rice|g":125};
  assert.deepEqual(confirmShoppingCart(lines,["Rice|g"],{"Rice|g":0},stock),stock);
  assert.deepEqual(stock,{"Rice|g":125});
});

test("unsafe imported cart selections never fall back to checked purchases",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))]);
  const stock={"Rice|g":125};
  for(const invalid of [Infinity,Number.NaN,-1,1.5,Number.MAX_SAFE_INTEGER+1,"2",null]){
    assert.deepEqual(confirmShoppingCart(lines,["Rice|g"],{"Rice|g":invalid},stock),stock);
  }
  assert.deepEqual(confirmShoppingCart(lines,["Rice|g"],{},stock),{"Rice|g":625});
  assert.deepEqual(stock,{"Rice|g":125});
});


test("unsafe recovery package counts stay pending without changing stock",()=>{
  const stock={"Beans|can":2};
  const invalid={name:"Beans",unit:"can",packs:Number.MAX_SAFE_INTEGER+1,pack:1,checked:true};
  const valid={name:"Rice",unit:"g",packs:1,pack:500,checked:true};
  const result=checkoutShoppingTrip([],[],{},stock,[invalid,valid]);
  assert.deepEqual(result.purchased,{"Beans|can":2,"Rice|g":500});
  assert.deepEqual(result.remainingRecovery,[invalid]);
  assert.deepEqual(stock,{"Beans|can":2});
});

test("retained cart selections require safe counts and unchanged grocery lines",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5),ingredient("Beans",2,1,1.25,"can"))]);
  const next=lines.map(line=>({...line}));
  const cart={"Rice|g":0,"Beans|can":2};
  assert.deepEqual(retainUnchangedCart(lines,next,cart),cart);
  assert.deepEqual(cart,{"Rice|g":0,"Beans|can":2});

  for(const invalid of [Number.MAX_SAFE_INTEGER+1,Infinity,Number.NaN,-1,1.5,"2",null]){
    assert.deepEqual(retainUnchangedCart(lines,next,{"Rice|g":invalid,"Beans|can":2}),{"Beans|can":2});
  }

  const changed=next.map(line=>line.name==="Rice"?{...line,pack:1000}:line);
  assert.deepEqual(retainUnchangedCart(lines,changed,cart),{"Beans|can":2});
});


test("combined recipe ingredient quantities cannot overflow cookability",()=>{
  const ingredients=[{name:"Rice",unit:"g",qty:1e308},{name:"Rice",unit:"g",qty:1e308}];
  assert.throws(()=>recipeIngredientAvailability(ingredients,{}),/exceeds supported range/);
  assert.deepEqual(recipeIngredientAvailability([{name:"Rice",unit:"g",qty:3},{name:"Rice",unit:"g",qty:2}],{"Rice|g":5}),{canCook:true,missing:[]});
});

test("malformed imported grocery rows do not block valid checkout",()=>{
  const {lines}=priceGroceryBasket([meal(ingredient("Rice",600,500,2.5))]);
  const malformed=[null,undefined,{name:"",unit:"g"},{name:"Beans",unit:null}];
  const existing={"Rice|g":125};
  const result=confirmShoppingCart([...malformed,...lines],["Rice|g"],{},existing);
  assert.deepEqual(result,{"Rice|g":625});
  assert.deepEqual(existing,{"Rice|g":125});
  assert.deepEqual(confirmShoppingCart(malformed,[],{},existing),existing);
});
