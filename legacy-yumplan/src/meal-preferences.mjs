// One-tap recipe preferences while building a week. A Yuck cannot remain
// selected in a draft, but an existing purchased week is never rewritten.
export function updateDraftMealPreference({preferences={},selectedIds=[],recipeId,value,recipes}) {
  if (!Array.isArray(recipes) || !recipes.some(recipe=>recipe.id===recipeId))
    throw new Error('Choose a known dinner.');
  if (!['yum','yuck'].includes(value)) throw new Error('Choose Yum or Yuck.');
  const nextValue=preferences[recipeId]===value?'save':value;
  const nextPreferences={...preferences,[recipeId]:nextValue};
  const removedSelected=nextValue==='yuck' && selectedIds.includes(recipeId);
  return {
    preferences:nextPreferences,
    selectedIds:removedSelected?selectedIds.filter(id=>id!==recipeId):[...selectedIds],
    removedSelected,
    value:nextValue
  };
}
