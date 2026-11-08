import {EXTRA_RECIPES} from './extra-recipes.mjs';
// All recipe quantities are for four servings, in g, ml, or count.
export const PRODUCTS = [
  ['beef','Ground beef','Meat',454,'g',649],
  ['chicken','Chicken breast','Meat',454,'g',499],
  ['chicken-thighs','Boneless skinless chicken thighs','Meat',454,'g',429],
  ['turkey','Ground turkey','Meat',454,'g',499],
  ['sausage','Smoked sausage','Meat',454,'g',449],
  ['tortillas','Flour tortillas','Bakery',10,'count',299],
  ['rice','White rice','Grains',907,'g',329],
  ['pasta','Pasta','Grains',454,'g',159],
  ['cheese','Shredded cheese','Dairy',227,'g',249],
  ['lettuce','Lettuce','Produce',1,'count',189],
  ['salsa','Salsa','Sauces',454,'ml',249],
  ['beans','Canned black beans','Canned',425,'g',109],
  ['tomatoes','Canned tomatoes','Canned',425,'g',139],
  ['onion','Onion','Produce',1,'count',79],
  ['peppers','Bell pepper','Produce',1,'count',109],
  ['broccoli','Broccoli','Frozen',454,'g',219],
  ['soy','Soy sauce','Sauces',444,'ml',249],
  ['teriyaki','Teriyaki sauce','Sauces',354,'ml',299],
  ['cream','Cooking cream','Dairy',473,'ml',319],
  ['spinach','Spinach','Produce',283,'g',229],
  ['marinara','Marinara sauce','Sauces',680,'ml',249],
  ['potatoes','Potatoes','Produce',2268,'g',399],
  ['peas','Frozen peas','Frozen',454,'g',159],
  ['eggs','Eggs','Dairy',12,'count',329],
  ['carrots','Carrots','Produce',8,'count',169],
  ['buns','Burger buns','Bakery',8,'count',249],
  ['pesto','Pesto','Sauces',190,'ml',349],
  ['bread','Sandwich bread','Bakery',20,'count',299],
  ['soup','Tomato soup','Canned',1000,'ml',329],
  ['seasoning','Taco seasoning','Sauces',1,'count',99],
  ['curry','Curry spice blend','Sauces',100,'g',299],
  ['coconut','Coconut milk','Canned',400,'ml',229],
  ['garlic','Garlic','Produce',100,'g',149],
  ['ginger','Ginger','Produce',100,'g',179],
  ['chickpeas','Canned chickpeas','Canned',425,'g',119],
  ['lentils','Dry lentils','Grains',454,'g',189]
].map(([id,name,category,packageQuantity,unit,priceCents])=>({id,name,category,packageQuantity,unit,priceCents}));

function recipe(id,name,emoji,minutes,protein,tags,ingredients,description,steps){
  return {id,name,emoji,minutes,protein,tags,ingredients,description,steps};
}
export const RECIPES = [
  recipe('beef-tacos','Beef Tacos','🌮',25,'Beef',['Family favorite','Quick'],{beef:454,tortillas:8,cheese:120,lettuce:1,salsa:160,seasoning:1},'Classic weeknight tacos with crunchy lettuce and cheese.',['Brown and season the beef.','Warm tortillas.','Assemble with lettuce, cheese and salsa.']),
  recipe('beef-quesadillas','Beef Quesadillas','🫓',20,'Beef',['Quick','Comfort'],{beef:454,tortillas:8,cheese:180,salsa:150},'Crisp tortillas filled with savory beef and melted cheese.',['Brown the beef.','Fill tortillas with beef and cheese.','Toast in a skillet until golden; serve with salsa.']),
  recipe('burrito-bowls','Burrito Bowls','🥙',30,'Beef',['Bowl','Family favorite'],{beef:454,rice:320,beans:400,salsa:150,cheese:100},'All the taco flavors in a satisfying rice bowl.',['Cook rice.','Brown beef and warm beans.','Build bowls with salsa and cheese.']),
  recipe('beef-chili','Beef & Bean Chili','🍲',40,'Beef',['One pot','Comfort'],{beef:454,beans:425,tomatoes:425,onion:1,seasoning:1},'Hearty, budget-friendly chili with beans and tomatoes.',['Brown beef and chopped onion.','Add tomatoes, beans and seasoning.','Simmer for 25 minutes.']),
  recipe('chicken-fajitas','Chicken Fajitas','🌯',30,'Chicken',['Quick','Family favorite'],{chicken:600,tortillas:8,peppers:2,onion:1,salsa:100},'Sizzling chicken and peppers wrapped in warm tortillas.',['Slice chicken, peppers and onion.','Sauté until chicken is cooked through.','Serve in warm tortillas with salsa.']),
  recipe('chicken-rice','Chicken Rice Bowls','🍚',30,'Chicken',['Bowl','Balanced'],{chicken:600,rice:320,broccoli:400,soy:70},'Tender chicken, rice and broccoli with a savory glaze.',['Cook rice.','Sauté chicken and steam broccoli.','Season with soy sauce and serve.']),
  recipe('teriyaki-chicken','Teriyaki Chicken','🍱',30,'Chicken',['Bowl','Quick'],{chicken:600,rice:320,broccoli:350,teriyaki:180},'Sticky teriyaki chicken with broccoli over rice.',['Cook rice.','Cook chicken and broccoli.','Toss with teriyaki sauce and serve.']),
  recipe('creamy-chicken-pasta','Creamy Chicken Pasta','🍝',35,'Chicken',['Comfort','Pasta'],{chicken:500,pasta:454,cream:240,spinach:200,cheese:100},'Creamy, cheesy pasta with chicken and spinach.',['Cook pasta.','Cook chicken and wilt spinach.','Stir in cream and cheese, then toss with pasta.']),
  recipe('chicken-quesadillas','Chicken Quesadillas','🫓',20,'Chicken',['Quick','Comfort'],{chicken:500,tortillas:8,cheese:180,salsa:150},'Golden chicken-and-cheese quesadillas.',['Cook and shred chicken.','Fill tortillas with chicken and cheese.','Toast and serve with salsa.']),
  recipe('baked-ziti','Easy Baked Ziti','🍝',40,'Vegetarian',['Pasta','Comfort'],{pasta:454,marinara:650,cheese:227,spinach:150},'Cheesy baked pasta with marinara and spinach.',['Cook pasta.','Combine with sauce and spinach.','Top with cheese and bake until bubbly.']),
  recipe('sausage-sheetpan','Sausage & Veggie Tray','🥘',40,'Sausage',['One pan','Balanced'],{sausage:600,potatoes:900,peppers:2,onion:1},'An easy roasted dinner with minimal cleanup.',['Chop sausage, potatoes and vegetables.','Toss on a sheet pan with oil and seasoning.','Roast until potatoes are tender and sausage is hot.']),
  recipe('sausage-pasta','Sausage Marinara Pasta','🍝',30,'Sausage',['Pasta','Quick'],{sausage:500,pasta:454,marinara:650,peppers:1},'Smoky sausage and peppers in tomato pasta.',['Cook pasta.','Brown sausage and pepper.','Add marinara and combine.']),
  recipe('veggie-fried-rice','Veggie Fried Rice','🍳',25,'Vegetarian',['Quick','Budget'],{rice:400,eggs:4,peas:400,soy:80,carrots:3},'Fast fried rice with eggs and colorful vegetables.',['Cook rice and let it cool slightly.','Scramble eggs and sauté vegetables.','Stir-fry everything with soy sauce.']),
  recipe('black-bean-tacos','Black Bean Tacos','🌮',20,'Vegetarian',['Quick','Budget'],{beans:425,tortillas:8,salsa:180,lettuce:1,cheese:100},'Meatless tacos that still feel like a treat.',['Warm beans with seasoning.','Heat tortillas.','Add beans, lettuce, cheese and salsa.']),
  recipe('veggie-quesadillas','Bean & Pepper Quesadillas','🫓',20,'Vegetarian',['Quick','Budget'],{tortillas:8,beans:400,cheese:180,peppers:1},'Crispy quesadillas packed with beans and peppers.',['Sauté sliced pepper.','Fill tortillas with beans, pepper and cheese.','Toast until golden.']),
  recipe('turkey-burgers','Turkey Burgers & Fries','🍔',40,'Turkey',['Family favorite','Comfort'],{turkey:600,buns:4,potatoes:800,lettuce:1},'Juicy turkey burgers with homemade potato wedges.',['Shape turkey into patties.','Bake potato wedges until crisp.','Cook burgers through and assemble with lettuce.']),
  recipe('turkey-chili','Turkey Chili','🍲',40,'Turkey',['One pot','Balanced'],{turkey:500,beans:425,tomatoes:425,onion:1,seasoning:1},'A lighter spin on comforting chili.',['Brown turkey and onion.','Add beans, tomatoes and seasoning.','Simmer 25 minutes.']),
  recipe('pesto-chicken','Pesto Chicken Pasta','🍝',30,'Chicken',['Pasta','Quick'],{chicken:500,pasta:454,pesto:190,spinach:150},'Bright pesto pasta with chicken and spinach.',['Cook pasta and chicken.','Wilt spinach.','Toss with pesto and serve.']),
  recipe('egg-fried-rice','Egg Fried Rice','🍳',20,'Vegetarian',['Quick','Budget'],{rice:400,eggs:6,peas:300,carrots:2,soy:70},'A pantry-friendly dinner with eggs, rice and vegetables.',['Cook rice.','Scramble eggs with vegetables.','Stir-fry with soy sauce.']),
  recipe('soup-grilled-cheese','Soup & Grilled Cheese','🥪',20,'Vegetarian',['Comfort','Quick'],{bread:8,cheese:227,soup:1000},'Classic tomato soup and crispy grilled cheese.',['Heat tomato soup.','Make cheese sandwiches.','Toast in a pan and serve.'])
  ,...EXTRA_RECIPES
];
