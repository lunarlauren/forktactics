/* Discover is a stationary swipe deck on mobile. Diagonal swipes count when
   horizontal travel is meaningful; vertical gestures do not move the page. */
export function initDiscoverSwipe(root=document){
  let gesture=null;
  const cardFrom=target=>target.closest?.('.discovery-card[data-swipe-card]');
  function reset(card){
    if(!card)return;
    for(const property of ['--swipe-x','--swipe-tilt'])card.style.removeProperty(property);
    card.classList.remove('swiping','swipe-left','swipe-right');
  }
  function begin(card,x,y,id){
    if(!card||!card.isConnected)return;
    gesture={card,x,y,id,axis:null};
  }
  function move(x,y){
    if(!gesture||!gesture.card.isConnected)return false;
    const dx=x-gesture.x,dy=y-gesture.y;
    if(!gesture.axis){
      if(Math.max(Math.abs(dx),Math.abs(dy))<9)return false;
      gesture.axis=Math.abs(dx)>=Math.abs(dy)*.45?'horizontal':'vertical';
    }
    if(gesture.axis!=='horizontal')return false;
    const limited=Math.max(-150,Math.min(150,dx));
    gesture.card.classList.add('swiping');
    gesture.card.classList.toggle('swipe-left',limited<0);
    gesture.card.classList.toggle('swipe-right',limited>0);
    gesture.card.style.setProperty('--swipe-x',limited+'px');
    gesture.card.style.setProperty('--swipe-tilt',(limited*.035)+'deg');
    return true;
  }
  function finish(x,y){
    if(!gesture)return;
    const {card,axis}=gesture,dx=x-gesture.x,dy=y-gesture.y;
    gesture=null;
    reset(card);
    if(axis!=='horizontal'||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*.45)return;
    card.querySelector('[data-action="vote"][data-vote="'+(dx>0?'yum':'yuck')+'"]')?.click();
  }
  // iOS Safari can cancel Pointer Events when the page begins scrolling.
  // Non-passive Touch Events let us own horizontal gestures reliably.
  root.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||e.target.closest('button,a,input,select,textarea'))return;
    const card=cardFrom(e.target);
    if(card)begin(card,e.touches[0].clientX,e.touches[0].clientY,'touch');
  },{passive:true});
  root.addEventListener('touchmove',e=>{
    if(gesture?.id!=='touch'||e.touches.length!==1)return;
    move(e.touches[0].clientX,e.touches[0].clientY);
    // Discover owns the whole card surface: even diagonal drags never scroll.
    if(e.cancelable)e.preventDefault();
  },{passive:false});
  root.addEventListener('touchend',e=>{
    if(gesture?.id!=='touch')return;
    const point=e.changedTouches[0];
    if(point)finish(point.clientX,point.clientY);
    else {reset(gesture.card);gesture=null;}
  });
  root.addEventListener('touchcancel',()=>{
    if(gesture?.id==='touch'){reset(gesture.card);gesture=null;}
  });
  // Mouse and pen support for desktop, without duplicate touch/pointer votes.
  root.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'||e.isPrimary===false||e.target.closest('button,a,input,select,textarea'))return;
    const card=cardFrom(e.target);
    if(card)begin(card,e.clientX,e.clientY,e.pointerId);
  });
  root.addEventListener('pointermove',e=>{
    if(gesture?.id===e.pointerId)move(e.clientX,e.clientY);
  });
  root.addEventListener('pointerup',e=>{
    if(gesture?.id===e.pointerId)finish(e.clientX,e.clientY);
  });
  root.addEventListener('pointercancel',e=>{
    if(gesture?.id===e.pointerId){reset(gesture.card);gesture=null;}
  });
}
