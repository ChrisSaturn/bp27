(()=>{
const count=10;
const step=360/ count;
const rail=document.querySelector('.pack-rail');
const section=document.querySelector('.packs');
const cylinder=document.createElement('div');
cylinder.className='pack-cylinder';
rail.append(cylinder);
const openButton=document.querySelector('.open-pack');
const dice=document.querySelector('.shuffle-pack');
const diceIcon=dice.querySelector('svg');
const status=document.querySelector('.selection-status');
const dialog=document.querySelector('.reveal-dialog');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');
const modulo=(value,span)=>((value%span)+span)%span;
const easeOutQuint=t=>1-(1-t)**5;
let rotation=0;
let selected=0;
let previousSlot;
let busy=false;
let animation;
let frame;
let timer;
let visible=true;
let hovered=false;
let drag;
let dragged=false;
let pauseUntil=performance.now()+3000;
let materialVersion=0;
let renderedRotation;
let renderedBusy;
let disposed=false;

const resetTilt=button=>{
cancelAnimationFrame(button.tiltFrame);
button.classList.remove('is-hovering');
for(const property of['--tilt-x','--tilt-y','--parallax-x','--parallax-y','--light-x','--light-y','--hover-lift','--hover-scale'])button.style.removeProperty(property);
materialVersion++;
wake();
};
const buttons=Array.from({length:count},(_,index)=>{
const button=document.createElement('button');
button.type='button';
button.className='pack-choice';
button.setAttribute('aria-label',`Select Breakpoint pack ${index+1}`);
button.style.setProperty('--orbit-angle',`${index*step}deg`);
button.innerHTML='<span class="pack-object" aria-hidden="true"><span class="pack-back"></span><span class="pack-side"></span><span class="pack-art"><span class="pack-seal"></span><img class="pack-wordmark" src="assets/bp27-header@2x.png?v=52da4d3c6e" srcset="assets/bp27-header@2x.png?v=52da4d3c6e 209w, assets/bp27-header@3x.png?v=597133c63f 314w" sizes="112px" width="105" height="20" alt="" /><span class="pack-motif">✳</span><span class="pack-edition">Breakpoint</span><span class="pack-bottom">BREAKPOINT 2027</span><span class="pack-seal pack-seal-bottom"></span></span></span>';
button.addEventListener('pointermove',event=>{
if(busy||drag?.moved||reduced.matches||!fine.matches||event.pointerType==='touch')return;
cancelAnimationFrame(button.tiltFrame);
button.tiltFrame=requestAnimationFrame(()=>{
const bounds=button.getBoundingClientRect();
const x=Math.max(-0.5,Math.min(0.5,(event.clientX-bounds.left) / bounds.width-0.5));
const y=Math.max(-0.5,Math.min(0.5,(event.clientY-bounds.top) / bounds.height-0.5));
button.classList.add('is-hovering');
button.style.setProperty('--hover-lift','-12px');
button.style.setProperty('--hover-scale','1.045');
button.style.setProperty('--tilt-x',`${-y*6}deg`);
button.style.setProperty('--tilt-y',`${x*8}deg`);
button.style.setProperty('--parallax-x',`${x*3}px`);
button.style.setProperty('--parallax-y',`${y*3}px`);
button.style.setProperty('--light-x',`${(x+0.5)*100}%`);
button.style.setProperty('--light-y',`${(y+0.5)*100}%`);
materialVersion++;
wake();
});
});
button.addEventListener('pointerleave',()=>resetTilt(button));
button.addEventListener('pointercancel',()=>resetTilt(button));
button.addEventListener('click',()=>{
if(busy)return;
if(index===selected)document.dispatchEvent(new CustomEvent('pack:tick',{detail:{crossings:1}}));
select(index);
});
button.addEventListener('keydown',event=>{
const target={ArrowLeft:modulo(selected-1,count),ArrowRight:(selected+1)%count,Home:0,End:count-1}[event.key];
if(target===undefined||busy)return;
event.preventDefault();
select(target,()=>buttons[target].focus({preventScroll:true}));
});
cylinder.append(button);
return button;
});

const render=()=>{
if(rotation!==renderedRotation||busy!==renderedBusy){
renderedRotation=rotation;
renderedBusy=busy;
cylinder.style.setProperty('--rotation',`${rotation}deg`);
const slot=Math.round(-rotation/ step);
if(previousSlot!==undefined&&slot!==previousSlot){
const crossings=reduced.matches?1:Math.min(3,Math.abs(slot-previousSlot));
document.dispatchEvent(new CustomEvent('pack:tick',{detail:{crossings}}));
}
previousSlot=slot;
selected=modulo(slot,count);
buttons.forEach((button,index)=>{
const angle=modulo(index*step+rotation+180,360)-180;
const facing=Math.cos(angle*Math.PI/ 180);
const centerWeight=Math.exp(-((angle/ 20)**2));
button.style.setProperty('--center-weight',String(centerWeight));
button.style.setProperty('--center-scale',String(1+centerWeight*0.15));
const opacity=Math.max(0,Math.min(1,(facing-0.1) / 0.55));
button.style.opacity=String(opacity);
button.style.pointerEvents=facing>0.15&&!busy?'auto':'none';
button.setAttribute('aria-hidden',String(facing<=0.15));
button.setAttribute('aria-pressed',String(index===selected));
button.tabIndex=index===selected?0:-1;
});
}
// Let material easing settle without rewriting unchanged DOM transforms.
document.dispatchEvent(new CustomEvent('packs:render',{detail:{rotation,materialVersion}}));
};
const lock=value=>{
busy=value;
openButton.disabled=value;
dice.disabled=value;
buttons.forEach(button=>{button.disabled=value;if(value)resetTilt(button);});
};
const animateTo=(to,duration,done)=>{
animation=undefined;
lock(true);
if(reduced.matches){
rotation=to;
render();
lock(false);
done?.();
render();
return;
}
animation={from:rotation,to,duration,start:performance.now(),done,spin:duration>1000};
wake();
};
const select=(index,done)=>{
const delta=modulo(-index*step-rotation+180,360)-180;
animateTo(Math.round((rotation+delta) / step)*step,750,()=>{
status.textContent=`Pack ${index+1} selected`;
done?.();
});
};
const tick=now=>{
frame=0;
if(document.hidden||!visible){return;}
if(animation){
const progress=Math.min((now-animation.start) / animation.duration,1);
rotation=animation.from+(animation.to-animation.from)*easeOutQuint(progress);
if(animation.spin)diceIcon.style.transform=`rotate(${easeOutQuint(progress)*1080}deg)`;
if(progress===1){
rotation=animation.to;
const{done,idle}=animation;
animation=undefined;
if(!idle)lock(false);
pauseUntil=now+(idle?2200:3000);
render();
done?.();
}
}else if(!busy&&!drag&&!hovered&&!section.contains(document.activeElement)&&!dialog.open&&now>pauseUntil&&!reduced.matches){
animation={
from:rotation,
to:Math.round(rotation/ step)*step-step,
duration:1200,
start:now,
idle:true
};
}
render();
if(animation||!reduced.matches)frame=requestAnimationFrame(tick);
};
function wake(){
if(!frame&&!disposed&&visible&&!document.hidden){frame=requestAnimationFrame(tick);}
}

dice.addEventListener('click',()=>{
if(busy||drag)return;
const target=Math.floor(Math.random()*count);
status.textContent='';
const to=Math.round((rotation-720-modulo(rotation+target*step,360)) / step)*step;
diceIcon.style.transform='rotate(0deg)';
dice.classList.add('is-shuffling');
animateTo(to,5200,()=>{
dice.classList.remove('is-shuffling');
status.textContent=`Pack ${target+1} selected`;
});
});
openButton.addEventListener('click',()=>{
if(busy||drag)return;
if(animation?.idle)animation=undefined;
const target=selected;
const open=()=>{
lock(true);
openButton.textContent='Opening…';
document.dispatchEvent(new Event('pack:open'));
buttons[target].classList.add('is-opening');
materialVersion++;
wake();
timer=setTimeout(()=>{
buttons[target].classList.remove('is-opening');
materialVersion++;
lock(false);
render();
openButton.textContent='Open pack';
dialog.style.setProperty('--ticket-accent','#c49af4');
dialog.showModal();
},reduced.matches?0:700);
};
if(Math.abs(modulo(rotation+target*step+180,360)-180)>0.2)select(target,open);
else open();
});
section.addEventListener('pointerenter',()=>{hovered=true;});
section.addEventListener('pointerleave',()=>{hovered=false;});
rail.addEventListener('selectstart',event=>event.preventDefault());
rail.addEventListener('dragstart',event=>event.preventDefault());
rail.addEventListener('pointerdown',event=>{
if(busy||event.button!==0)return;
if(animation?.idle)animation=undefined;
drag={id:event.pointerId,x:event.clientX,rotation,moved:false,pack:!!event.target.closest('.pack-choice')};
dragged=false;
});
rail.addEventListener('pointermove',event=>{
if(!drag||event.pointerId!==drag.id)return;
const dx=event.clientX-drag.x;
if(Math.abs(dx)>5&&!drag.moved){
drag.moved=true;
buttons.forEach(resetTilt);
rail.setPointerCapture(event.pointerId);
}
if(drag.moved){rotation=drag.rotation+dx*0.2;render();}
});
const endDrag=event=>{
if(!drag||event.pointerId!==drag.id)return;
dragged=drag.moved;
const startedOnPack=drag.pack;
drag=undefined;
if(rail.hasPointerCapture(event.pointerId))rail.releasePointerCapture(event.pointerId);
if(dragged||(!startedOnPack&&Math.abs(rotation/ step-Math.round(rotation/ step))>0.001))select(selected);
};
window.addEventListener('pointerup',endDrag);
window.addEventListener('pointercancel',endDrag);
rail.addEventListener('click',event=>{
if(dragged){event.preventDefault();event.stopImmediatePropagation();dragged=false;}
},true);

dialog.querySelector('.close-reveal').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{
if(event.target!==dialog)return;
const bounds=dialog.getBoundingClientRect();
if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
});
dialog.addEventListener('close',()=>openButton.focus());
new ResizeObserver(()=>{
const radius=rail.clientWidth<600?250:Math.min(440,rail.clientWidth*0.44);
cylinder.style.setProperty('--radius',`${radius}px`);
render();
}).observe(rail);
new IntersectionObserver(entries=>{
visible=entries.some(entry=>entry.isIntersecting);
if(visible)wake();
else{cancelAnimationFrame(frame);frame=0;}
}).observe(rail);
reduced.addEventListener('change',()=>{
buttons.forEach(resetTilt);
if(reduced.matches&&animation){
rotation=animation.to;
const done=animation.done;
animation=undefined;
lock(false);
render();
done?.();
}
wake();
});
fine.addEventListener('change',()=>buttons.forEach(resetTilt));
document.addEventListener('visibilitychange',()=>{
cancelAnimationFrame(frame);frame=0;wake();
});
window.addEventListener('pagehide',()=>{disposed=true;clearTimeout(timer);cancelAnimationFrame(frame);buttons.forEach(resetTilt);},{once:true});
render();
wake();
})();
