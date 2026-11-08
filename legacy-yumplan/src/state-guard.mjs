// Optimistic protection against two tabs overwriting the same browser's data.
// localStorage has atomic individual setItem calls, but NO atomic compare-and-swap.
// This catches stale sequential edits; it cannot guarantee safety against writes
// racing in the tiny interval between getItem and setItem. No cross-device sync.
export class StaleStateError extends Error {
  constructor(){
    super('YumPlan was changed in another tab. This tab will not overwrite the newer saved data.');
    this.name='StaleStateError';
  }
}

export function createStateGuard(storage,key,expectedRaw=storage.getItem(key)){
  let expected=expectedRaw;
  let conflicted=false;
  const stale=()=>{conflicted=true;throw new StaleStateError();};
  function assertCurrent(){
    if(conflicted||storage.getItem(key)!==expected)stale();
    return expected;
  }
  function commit(nextState){
    assertCurrent();
    const text=JSON.stringify({...nextState,tab:'menu',filter:'all'});
    storage.setItem(key,text);
    // Catch a competing write if it was observable before returning.
    if(storage.getItem(key)!==text)stale();
    expected=text;
    return text;
  }
  function acknowledge(text){
    if(typeof text!=='string'||storage.getItem(key)!==text)stale();
    expected=text;
  }
  function onStorageEvent(event){
    if(event.key!==key&&event.key!==null)return false;
    if(event.storageArea&&event.storageArea!==storage)return false;
    // A clear() or another tab's write is a meaningful change. Do not try
    // to auto-merge two sets of purchases or recipe selections.
    if(event.key===null||event.newValue!==expected){conflicted=true;return true;}
    return false;
  }
  return {assertCurrent,commit,acknowledge,onStorageEvent,
    get expectedRaw(){return expected;},get isConflicted(){return conflicted;}};
}
