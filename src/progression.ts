import type {Recipe} from "./data";
export type KitchenState={version:1;counts:Record<string,number>;firstCookBonusRecipeId:string|null;firstCookBonusGranted:boolean;week:string[];checked:string[]};
export const initialState=(recipes:Recipe[]):KitchenState=>({version:1,counts:{},firstCookBonusRecipeId:null,firstCookBonusGranted:false,week:recipes.slice(0,7).map(r=>r.id),checked:[]});
export function milestone(count:number){return count>=100?100:count>=80?80:count>=60?60:count>=40?40:count>=20?20:count>=5?5:0}
export function treatment(state:KitchenState,id:string){const tier=milestone(state.counts[id]||0);return tier>=20?`frame-${tier}`:tier>=5||state.firstCookBonusRecipeId===id?"holo":"standard"}
export function cook(state:KitchenState,recipeId:string,ownedIds:string[],random:()=>number=Math.random):KitchenState{
 if(!ownedIds.includes(recipeId))throw new Error("Cannot cook a recipe outside the collection");
 const next={...state,counts:{...state.counts,[recipeId]:(state.counts[recipeId]||0)+1}};
 if(!state.firstCookBonusGranted){
 const eligible=ownedIds.filter(id=>treatment(next,id)==="standard");
 const index=Math.min(eligible.length-1,Math.max(0,Math.floor(random()*eligible.length)));
 next.firstCookBonusRecipeId=eligible.length?eligible[index]:null;
 next.firstCookBonusGranted=true;
 }
 return next;
}
export function validState(raw:unknown,recipes:Recipe[]):KitchenState{
 const defaults=initialState(recipes),ids=new Set(recipes.map(r=>r.id));
 if(!raw||typeof raw!=="object")return defaults;
 const s=raw as Partial<KitchenState>;
 const counts:Record<string,number>={};
 if(s.counts&&typeof s.counts==="object")for(const [id,n] of Object.entries(s.counts))if(ids.has(id)&&Number.isSafeInteger(n)&&n>=0)counts[id]=n;
 return {version:1,counts,firstCookBonusGranted:s.firstCookBonusGranted===true,firstCookBonusRecipeId:typeof s.firstCookBonusRecipeId==="string"&&ids.has(s.firstCookBonusRecipeId)?s.firstCookBonusRecipeId:null,week:Array.isArray(s.week)&&s.week.length===7?s.week.map((id,i)=>ids.has(id)?id:defaults.week[i]):defaults.week,checked:Array.isArray(s.checked)?s.checked.filter((x):x is string=>typeof x==="string"):[]};
}
export function shopping(state:KitchenState,recipes:Recipe[]){const byId=new Map(recipes.map(r=>[r.id,r]));const items=new Map<string,number>();for(const id of state.week){for(const ingredient of byId.get(id)?.ingredients||[])items.set(ingredient,(items.get(ingredient)||0)+1)}return [...items].sort(([a],[b])=>a.localeCompare(b)).map(([name,uses])=>({name,uses}));}
