// Additional four-serving dinner ideas. Quantities use the catalog's g/ml/count units.
const families=[
 ['curry','Curry','🍛',40,'rice:320,onion:1,curry:70,tomatoes:425','Simmer the aromatics and protein with curry seasoning and tomatoes. Serve with rice.'],
 ['coconut-curry','Coconut Curry','🍛',35,'rice:320,coconut:400,curry:70,peppers:2','Simmer the protein and peppers in coconut curry sauce. Serve over rice.'],
 ['tikka','Tikka Masala','🍛',45,'rice:320,tomatoes:425,cream:240,curry:80,garlic:20,ginger:20','Marinate the protein with spices, cook through, then simmer in creamy spiced tomato sauce. Serve with rice.'],
 ['stir-fry','Stir-Fry','🥢',30,'rice:320,broccoli:350,carrots:3,soy:90,garlic:15','Cook the protein, stir-fry the vegetables until tender-crisp, and toss with soy and garlic. Serve over rice.'],
 ['teriyaki-bowl','Teriyaki Rice Bowl','🍱',30,'rice:320,broccoli:350,teriyaki:180','Cook the protein and broccoli, glaze with teriyaki, and serve over rice.'],
 ['tomato-pasta','Tomato Pasta','🍝',35,'pasta:454,marinara:650,onion:1','Cook the pasta and protein, simmer in marinara, and toss together.'],
 ['creamy-pasta','Creamy Garlic Pasta','🍝',35,'pasta:454,cream:240,spinach:150,garlic:20','Cook the pasta, sauté the protein and garlic, wilt spinach, and combine with cream.'],
 ['pesto-pasta','Pesto Pasta','🍝',30,'pasta:454,pesto:190,spinach:150','Cook the pasta and protein, wilt spinach, and toss with pesto.'],
 ['taco-bowl','Taco Rice Bowl','🥙',30,'rice:320,beans:425,salsa:180,lettuce:1','Season and cook the protein, then serve over rice with beans, lettuce and salsa.'],
 ['burrito','Burrito','🌯',30,'tortillas:8,rice:250,beans:425,salsa:180','Cook the filling, prepare rice and beans, then roll into warm tortillas with salsa.'],
 ['potato-tray','Roasted Potato Tray','🥔',45,'potatoes:1000,peppers:2,onion:1,garlic:15','Chop the protein and vegetables, season, and roast until vegetables are tender and the protein is safely cooked.'],
 ['rice-skillet','Rice Skillet','🍚',35,'rice:350,peas:250,carrots:3,soy:60','Cook the protein and vegetables, stir in cooked rice and seasonings, and heat through.']
];
const proteins=[
 ['Chicken','Chicken', 'chicken:600'],
 ['Turkey','Turkey','turkey:600'],
 ['Beef','Beef','beef:600'],
 ['Sausage','Sausage','sausage:600'],
 ['Chickpea','Vegetarian','chickpeas:800'],
 ['Lentil','Vegetarian','lentils:400'],
 ['Black Bean','Vegetarian','beans:850'],
 ['Vegetable & Egg','Vegetarian','eggs:6,peas:200']
];
const parse=s=>Object.fromEntries(s.split(',').map(part=>{const [id,n]=part.split(':');return [id,Number(n)];}));
export const EXTRA_RECIPES=families.flatMap(([key,title,emoji,minutes,base,steps])=>proteins.map(([name,protein,addition])=>{
 const id=key+'-'+name.toLowerCase().replace(/[^a-z]+/g,'-').replace(/-$/,'');
 const ingredients=parse(base);
 for(const [item,amount] of Object.entries(parse(addition))) ingredients[item]=(ingredients[item]||0)+amount;
 return {id,name:name+' '+title,emoji,minutes,protein,tags:['Dinner','Variety'],ingredients,
 description:name+' '+title.toLowerCase()+' for four, made with pantry-friendly ingredients.',
 steps:steps.split('. ').map((part,i,all)=>i<all.length-1?part+'.':part).filter(Boolean)};
}));
