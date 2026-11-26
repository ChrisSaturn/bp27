(()=>{
const count=10;
const step=360/ count;
const rail=document.querySelector('.pack-rail');
const stage=rail.closest('.stage');
const section=document.querySelector('.packs');
const cylinder=document.createElement('div');
cylinder.className='pack-cylinder';
rail.append(cylinder);
const openButton=document.querySelector('.open-pack');
const status=document.querySelector('.selection-status');
const dialog=document.querySelector('.reveal-dialog');
const flight=dialog.querySelector('.ticket-flight');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');
const mobile=matchMedia('(max-width: 600px)');
const modulo=(value,span)=>((value%span)+span)%span;
const easeOutQuint=t=>1-(1-t)**5;
const unit=value=>Math.max(0,Math.min(1,value));
const smooth=t=>t*t*(3-2*t);
const ripAt=760;
const burstAt=ripAt+32;
const flashDuration=75;
const colorFade=160;
const breakaway=460;
const tailEnd=flashDuration+breakaway;
stage.style.setProperty('--opening-charge',`${ripAt}ms`);
let rotation=0;
let selected=0;
let previousSlot;
let busy=false;
let animation;
let frame;
let opening;
let burst;
let afterglow;
let flash;
let fallbackPieces;
let prepareTask;
let revealedButton;
let visible=true;
let drag;
let dragged=false;
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
button.style.setProperty('--pack-opacity',opacity);
button.style.pointerEvents=facing>0.15&&!busy?'auto':'none';
button.setAttribute('aria-hidden',String(facing<=0.15));
button.setAttribute('aria-pressed',String(index===selected));
button.tabIndex=index===selected?0:-1;
});
}
// Let material easing settle without rewriting unchanged DOM transforms.
document.dispatchEvent(new CustomEvent('packs:render',{detail:{rotation,materialVersion,opening}}));
};
const lock=value=>{
busy=value;
openButton.disabled=value;
buttons.forEach(button=>{button.disabled=value;if(value)resetTilt(button);});
};
const finishTurn=()=>{
const{to,done}=animation;
rotation=to;
animation=undefined;
render();
done?.();
};
const animateTo=(to,duration,done)=>{
const start=performance.now();
animation={from:rotation,to,duration,start,done};
lock(true);
if(reduced.matches||!visible){
finishTurn();
render();
}else wake();
};
const select=(index,done)=>{
const delta=modulo(-index*step-rotation+180,360)-180;
animateTo(Math.round((rotation+delta) / step)*step,750,()=>{
lock(false);
status.textContent=`Pack ${index+1} selected`;
done?.();
});
};
const tick=now=>{
frame=0;
if(document.hidden||!visible){return;}
if(animation){
const progress=unit((now-animation.start) / animation.duration);
rotation=animation.from+(animation.to-animation.from)*easeOutQuint(progress);
if(progress===1)finishTurn();
}
if(opening)animateOpening(now);
render();
if(animation||(!reduced.matches&&(!dialog.open||opening)))frame=requestAnimationFrame(tick);
};
function wake(){
if(!frame&&!disposed&&visible&&!document.hidden&&(!dialog.open||opening)){frame=requestAnimationFrame(tick);}
}

const resetOpening=()=>{
if(opening){
const{button}=opening;
fallbackPieces?.forEach(piece=>piece.remove());
if(burst)burst.hidden=true;
if(afterglow)afterglow.hidden=true;
if(flash)flash.hidden=true;
stage.classList.remove('is-opening-flash');
rail.style.removeProperty('--opening-focus');
rail.style.removeProperty('--opening-edge');
button.classList.remove('is-opening','is-split');
button.style.removeProperty('--opening-pose');
button.style.removeProperty('--opening-ink');
materialVersion++;
opening=undefined;
}
};
const showTicket=anchor=>{
if(!opening){
openButton.textContent='Open pack';
lock(false);
}
dialog.showModal();
if(anchor){
const railBounds=rail.getBoundingClientRect();
const bounds=dialog.getBoundingClientRect();
const endX=bounds.left+flight.offsetLeft+flight.offsetWidth/ 2;
const endY=bounds.top+flight.offsetTop+flight.offsetHeight/ 2;
flight.style.setProperty('--ticket-entry-x',`${railBounds.left+anchor.x-endX}px`);
flight.style.setProperty('--ticket-entry-y',`${railBounds.top+anchor.y-endY}px`);
flight.dispatchEvent(new Event('ticket:launch'));
dialog.classList.add('is-launching');
}
flight.dispatchEvent(new Event('ticket:present'));
};
const finishOpening=()=>{
const{button,launched}=opening;
revealedButton=button;
button.classList.add('is-revealed');
resetOpening();
if(launched){
openButton.textContent='Open pack';
lock(false);
}else showTicket();
};
const openingAnchor=button=>{
if(opening.seam)return opening.seam;
const pack=button.getBoundingClientRect();
const bounds=rail.getBoundingClientRect();
const{x,y,scale}=opening.pose;
return{
x:pack.left+pack.width/ 2+x-bounds.left,
y:pack.top+pack.height*(.5-.248*scale)+y-bounds.top
};
};
const prepareOpening=()=>{
prepareTask=undefined;
if(burst||disposed||reduced.matches)return;
afterglow=document.createElement('div');
afterglow.className='opening-afterglow';
afterglow.hidden=true;
afterglow.setAttribute('aria-hidden','true');
afterglow.style.setProperty('--afterglow-duration',`${breakaway}ms`);
flash=document.createElement('div');
flash.className='opening-flash';
flash.hidden=true;
flash.setAttribute('aria-hidden','true');
burst=document.createElement('div');
burst.className='opening-burst';
burst.setAttribute('aria-hidden','true');
burst.hidden=true;
const count=22;
for(let i=0;i<count;i++){
const shard=document.createElement('i');
const angle=(i+(i%3)*.19)*(2*Math.PI/ count);
const distance=90+(i*53)%208;
shard.style.setProperty('--shard-x',`${Math.cos(angle)*distance}px`);
shard.style.setProperty('--shard-y',`${Math.sin(angle)*distance*.72}px`);
shard.style.setProperty('--shard-turn',`${i*53-220}deg`);
shard.style.setProperty('--shard-life',`${300+(i*47)%200}ms`);
burst.append(shard);
}
section.prepend(afterglow);
rail.append(burst);
stage.append(flash);
const artwork=buttons[0].querySelector('.pack-object');
fallbackPieces=['top','bottom'].map(half=>{
const piece=document.createElement('span');
piece.className=`opening-piece opening-piece--${half}`;
piece.setAttribute('aria-hidden','true');
piece.append(artwork.cloneNode(true));
return piece;
});
document.dispatchEvent(new Event('pack:prepare'));
};
const queuePreparation=()=>{
if(burst||prepareTask!==undefined||reduced.matches)return;
prepareTask=window.requestIdleCallback
?window.requestIdleCallback(prepareOpening)
:setTimeout(prepareOpening,0);
};
const cancelPreparation=()=>{
if(prepareTask===undefined)return;
if(window.cancelIdleCallback)window.cancelIdleCallback(prepareTask);
else clearTimeout(prepareTask);
prepareTask=undefined;
};
const animateOpening=now=>{
const{button,start,pose}=opening;
const elapsed=now-start;
if(elapsed>=ripAt&&!pose.pieces){
pose.pieces=opening.pieces;
document.dispatchEvent(new Event('pack:rip'));
}
if(elapsed>=burstAt&&opening.impactAt===undefined){
opening.impactAt=now;
opening.anchor=openingAnchor(button);
const{x,y}=opening.anchor;
afterglow.style.left=`${rail.offsetLeft+x}px`;
afterglow.style.top=`${rail.offsetTop+y}px`;
burst.style.left=`${x}px`;
burst.style.top=`${y}px`;
flash.hidden=false;
stage.classList.add('is-opening-flash');
document.dispatchEvent(new Event('pack:burst'));
}
const age=opening.impactAt===undefined?-1:now-opening.impactAt;
if(age>=tailEnd){
finishOpening();
return;
}
const charge=unit(elapsed/ ripAt);
const separation=easeOutQuint(unit((elapsed-ripAt) / 260));
const release=unit((age-flashDuration) / breakaway);
const blackout=age<0?0:1-unit((age-flashDuration) / colorFade);
const scatter=easeOutQuint(release);
const pulse=smooth(unit(age/ 34))*(1-unit(age/ 280))**2;
const shake=Math.sin(charge*37)*charge**1.65*(1-separation);
const focus=smooth(charge);
const edge=focus*(1-smooth(unit((elapsed-ripAt) / 105)));
if(focus!==pose.focus)rail.style.setProperty('--opening-focus',focus);
if(edge!==pose.edge)rail.style.setProperty('--opening-edge',edge);
Object.assign(pose,{
focus,edge,blackout,
x:5*shake,
y:10*focus,
z:-9*focus+24*pulse,
scale:1-.18*focus+.14*pulse,
yaw:7*shake+9*separation,
roll:4*shake,
glow:.18*charge*(1-separation)
});
if(pose.pieces){
const[top,bottom]=pose.pieces;
top.x=19*separation+81*scatter;
top.y=-33*separation-71*scatter;
top.z=13*separation+47*scatter;
top.pitch=-16*separation-38*scatter;
top.yaw=11*separation+25*scatter;
top.roll=-17*separation-48*scatter;
bottom.x=-12*separation-48*scatter;
bottom.y=12*separation+48*scatter+73*release**2;
bottom.z=-6*separation-20*scatter;
bottom.pitch=9*separation+32*scatter;
bottom.yaw=-6*separation-25*scatter;
bottom.roll=5*separation+21*scatter;
top.opacity=1-smooth(release);
bottom.opacity=1-smooth(release);
}
opening.flashing=age>=0&&age<flashDuration;
if(opening.flashing){
flash.style.opacity=1-smooth(unit((age-12) / (flashDuration-12)));
}else if(age>=flashDuration&&!opening.launched){
flash.hidden=true;
stage.classList.remove('is-opening-flash');
afterglow.hidden=false;
burst.hidden=false;
opening.launched=true;
showTicket(opening.anchor);
}
if(rail.classList.contains('has-pack-mesh'))return;
button.style.setProperty('--opening-pose',`translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) rotateZ(${pose.roll}deg) rotateY(${pose.yaw-8}deg) scale(${pose.scale})`);
if(pose.pieces){
button.style.setProperty('--opening-ink',1-blackout);
if(!button.classList.contains('is-split')){
if(fallbackPieces[0].parentNode!==button)button.append(...fallbackPieces);
button.classList.add('is-split');
}
pose.pieces.forEach(({x,y,z,pitch,yaw,roll,opacity},i)=>{
const piece=fallbackPieces[i];
piece.style.setProperty('--piece-pose',`translate3d(${x}px, ${y}px, ${z}px) rotateZ(${roll}deg) rotateY(${yaw}deg) rotateX(${pitch}deg)`);
piece.style.opacity=opacity;
});
}
};

window.addEventListener('load',queuePreparation,{once:true});
openButton.addEventListener('pointerenter',queuePreparation);
openButton.addEventListener('focus',queuePreparation);
openButton.addEventListener('click',()=>{
if(busy||drag||dialog.open)return;
lock(true);
openButton.textContent='Opening…';
status.textContent='';
document.dispatchEvent(new Event('pack:open'));
if(reduced.matches||!visible){
showTicket();
render();
return;
}
cancelPreparation();
prepareOpening();
const button=buttons[selected];
opening={
button,start:performance.now(),pieces:[{side:-1},{side:1}],
pose:{focus:0,x:0,y:0,z:0,scale:1,roll:0,yaw:0,glow:0}
};
if(!rail.classList.contains('has-pack-mesh'))button.append(...fallbackPieces);
button.classList.add('is-opening');
stage.classList.add('is-opening-scene');
wake();
});
rail.addEventListener('selectstart',event=>event.preventDefault());
rail.addEventListener('dragstart',event=>event.preventDefault());
rail.addEventListener('pointerdown',event=>{
if(busy||event.button!==0)return;
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
dialog.addEventListener('close',()=>{
resetOpening();
stage.classList.remove('is-opening-scene');
dialog.classList.remove('is-launching');
openButton.textContent='Open pack';
lock(false);
if(revealedButton){
revealedButton.classList.remove('is-revealed');
revealedButton=undefined;
materialVersion++;
}
render();
openButton.focus();
wake();
});
new ResizeObserver(()=>{
const width=rail.clientWidth;
const radius=mobile.matches?width*0.45:Math.min(440,width*0.44);
cylinder.style.setProperty('--radius',`${radius}px`);
rail.style.setProperty('--shard-reach',Math.min(1,width/ 580));
render();
}).observe(rail);
new IntersectionObserver(entries=>{
visible=entries.some(entry=>entry.isIntersecting);
if(visible)wake();
else{
cancelAnimationFrame(frame);
frame=0;
if(opening&&!document.hidden){
finishOpening();
render();
}else if(animation&&!document.hidden){
finishTurn();
render();
}
}
}).observe(rail);
reduced.addEventListener('change',()=>{
buttons.forEach(resetTilt);
if(reduced.matches){
cancelPreparation();
stage.classList.remove('is-opening-scene');
dialog.classList.remove('is-launching');
if(opening){
finishOpening();
render();
}
}else queuePreparation();
if(reduced.matches&&animation){
finishTurn();
render();
}
wake();
});
fine.addEventListener('change',()=>buttons.forEach(resetTilt));
document.addEventListener('visibilitychange',()=>{
cancelAnimationFrame(frame);frame=0;wake();
});
window.addEventListener('pagehide',()=>{
disposed=true;
cancelPreparation();
resetOpening();
stage.classList.remove('is-opening-scene');
cancelAnimationFrame(frame);
buttons.forEach(resetTilt);
},{once:true});
render();
wake();
})();
