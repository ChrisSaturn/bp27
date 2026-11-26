(()=>{
const dialog=document.querySelector('.reveal-dialog');
const flight=dialog.querySelector('.ticket-flight');
const ticket=flight.querySelector('.ticket');
const track=flight.querySelector('.ticket-reel-track');
const confetti=flight.querySelector('.ticket-confetti');
const price=dialog.querySelector('.ticket-result .ticket-price');
const indicator=dialog.querySelector('.ticket-pull');
const face=ticket.querySelector('.ticket-face');
const stub=ticket.querySelector('.ticket-stub');
const paper=stub.querySelector('.ticket-stub-paper');
const intact=ticket.querySelector('.ticket-fibres-intact');
const snapped=ticket.querySelector('.ticket-fibres-snapped');
const status=dialog.querySelector('.ticket-status');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const tearAngle=24*Math.PI/ 180;
const finishes=[
{name:'prism',label:'Prism foil'},
{name:'aurora',label:'Aurora foil'},
{name:'sapphire',label:'Sapphire foil'},
{name:'rose',label:'Rose foil'}
];
const previewPrices=[100,82,95,68,90,63,87,72,57,96,78,62,91,66,75,59,84,69,55];
const common={name:'common',label:'Common pull',price:'$500'};
const legendary={name:'legendary',label:'Legendary pull',price:'$50',originalPrice:'$500'};
const legendaryEntryScale=.9;
const stops=previewPrices.map((amount,index)=>({
...finishes[index%finishes.length],
price:`$${amount}`
}));
stops.push(common,legendary);
const prism=stops[0];
const winnerIndex=stops.length-1;
const commonIndex=winnerIndex-1;
const approachDuration=2860;
const crawlDuration=920;
const dropDuration=480;
const reelDuration=approachDuration+crawlDuration+dropDuration;
const crawlStart=commonIndex-.14;
const dropStart=commonIndex+.12;
const rampTime=.07;
const cruiseTime=.30;
const slowdownTime=.46;
const brakeTime=1-rampTime-cruiseTime-slowdownTime;
const brakeSpeed=.28;
const speed=crawlStart/
(rampTime/ 2+cruiseTime+slowdownTime*(1+brakeSpeed) / 2+brakeTime*brakeSpeed/ 5);
const reelPosition=elapsed=>{
if(elapsed>=approachDuration){
const crawl=clamp((elapsed-approachDuration) / crawlDuration,0,1);
const drop=clamp((elapsed-approachDuration-crawlDuration) / dropDuration,0,1);
// Carry the crawl's low speed into the final slide before braking at Legendary.
const landing=1-(1-drop*(.06+.94*drop))**5;
return crawlStart+(dropStart-crawlStart)*crawl**2+(winnerIndex-dropStart)*landing;
}
const progress=elapsed/ approachDuration;
const ramp=clamp(progress,0,rampTime);
const cruise=clamp(progress-rampTime,0,cruiseTime);
const slowdown=clamp(progress-rampTime-cruiseTime,0,slowdownTime);
const brake=clamp((progress-rampTime-cruiseTime-slowdownTime) / brakeTime,0,1);
const slowingDistance=slowdown-(1-brakeSpeed)*slowdown**2/ (2*slowdownTime);
return speed*(ramp**2/ (2*rampTime)+cruise+slowingDistance+
brakeTime*brakeSpeed/ 5*(1-(1-brake)**5));
};
const reelFrames=Array.from({length:181},(_,index)=>({
transform:`translateX(calc(${reelPosition(reelDuration*index/ 180)} * var(--ticket-reel-pitch)))`
}));
const previews=[];
let geometry;
let drag;
let motion;
let revealMotion;
let reelFrame;
let pulled=false;

const showVariant=({name,label})=>{
dialog.dataset.ticketVariant=name;
indicator.textContent=label;
};
const showPrice=(node,variant)=>{
node.textContent=variant.price;
if(variant.originalPrice){
const original=document.createElement('del');
original.textContent=variant.originalPrice;
node.prepend(original);
}
};
const paintReel=position=>{
const first=clamp(Math.floor(position)-2,0,stops.length-previews.length);
for(let index=first;index<first+previews.length;index++){
const slot=previews[index%previews.length];
if(slot.index!==index){
const variant=stops[index];
slot.index=index;
slot.entry.style.setProperty('--ticket-reel-index',index);
slot.entry.dataset.ticketVariant=variant.name;
slot.label.textContent=variant===legendary?'':variant.label;
showPrice(slot.price,variant);
}
const distance=Math.abs(index-position);
const focusedScale=index===winnerIndex?legendaryEntryScale:1;
const scale=distance<1.4?.74+(focusedScale-.74)*Math.exp(-((distance/ .46)**2)):.74;
if(slot.scale!==scale){
slot.scale=scale;
slot.entry.style.transform=`scale(${scale})`;
}
}
};
const prepareReveal=()=>{
if(previews.length)return;
for(let index=0;index<5;index++){
const entry=document.createElement('div');
entry.className='ticket-reel-entry';
const preview=ticket.cloneNode(true);
preview.querySelector('h2').removeAttribute('id');
preview.querySelector('.ticket-fibres').remove();
const label=document.createElement('span');
label.className='ticket-stub-finish';
preview.querySelector('.ticket-stub-paper').append(label);
const previewPrice=document.createElement('p');
previewPrice.className='ticket-price';
entry.append(preview,previewPrice);
track.append(entry);
previews.push({entry,label,price:previewPrice,index:-1});
}
paintReel(0);
const colors=['#ffd98e','#e4bcff','#91f4dd','#fcaad0','#fff1bd'];
const count=36;
for(let index=0;index<count;index++){
const piece=document.createElement('i');
const angle=2*Math.PI*(index+.35) / count;
const x=Math.cos(angle);
const y=Math.sin(angle);
const edge=Math.max(Math.abs(x),Math.abs(y));
const reach=48+(index*17)%67;
piece.style.left=`${50+46*x/ edge}%`;
piece.style.top=`${50+45*y/ edge}%`;
piece.style.backgroundColor=colors[index%colors.length];
piece.style.setProperty('--confetti-x',`${x*reach}px`);
piece.style.setProperty('--confetti-y',`${y*reach}px`);
piece.style.setProperty('--confetti-spin',`${(index%2?-1:1)*(150+index*17)}deg`);
piece.style.setProperty('--confetti-delay',`${(index*23)%85}ms`);
piece.style.setProperty('--confetti-duration',`${680+(index*53)%320}ms`);
confetti.append(piece);
}
};
const stopReveal=()=>{
cancelAnimationFrame(reelFrame);
revealMotion?.cancel();
revealMotion=undefined;
dialog.classList.remove('is-launching','is-reeling','is-near-common','is-landed');
stub.inert=false;
};
const finishPull=(landed=false)=>{
if(!dialog.open)return;
stopReveal();
showVariant(legendary);
showPrice(price,legendary);
indicator.removeAttribute('aria-hidden');
status.textContent=`${legendary.label}, ${legendary.price}. Original price ${legendary.originalPrice}.`;
if(landed){
dialog.style.setProperty('--legendary-entry-scale',legendaryEntryScale);
dialog.classList.add('is-landed');
}
document.dispatchEvent(new Event('pack:win'));
};
const startReel=()=>{
dialog.classList.add('is-reeling');
indicator.textContent=common.label;
const timing={duration:reelDuration,fill:'both'};
const reel=track.animate(reelFrames,timing);
revealMotion=reel;
let announced=-1;
let commonInFront=false;
const updateReel=()=>{
if(revealMotion!==reel||!dialog.open)return;
const position=reelPosition(reel.currentTime??0);
paintReel(position);
const nearCommon=Math.abs(position-commonIndex)<.45;
if(nearCommon!==commonInFront){
commonInFront=nearCommon;
dialog.classList.toggle('is-near-common',nearCommon);
}
const index=Math.min(Math.floor(position),commonIndex);
if(index!==announced){
announced=index;
document.dispatchEvent(new Event('pack:tick'));
}
if(reel.playState!=='finished')reelFrame=requestAnimationFrame(updateReel);
};
updateReel();
reel.onfinish=()=>{
if(revealMotion!==reel||!dialog.open)return;
paintReel(winnerIndex);
finishPull(true);
};
};
flight.addEventListener('ticket:present',()=>{
if(reduced.matches||!dialog.classList.contains('is-launching')||!flight.animate){
finishPull();
return;
}
prepareReveal();
showVariant(prism);
indicator.setAttribute('aria-hidden','true');
stub.inert=true;
const entry=flight.animate([
{
transform:'translate(var(--ticket-entry-x), var(--ticket-entry-y)) scale(.36)',
opacity:.68
},
{transform:'translate(0, 0) scale(1)',opacity:1}
],{duration:240,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'});
revealMotion=entry;
flight.dispatchEvent(new CustomEvent('ticket:enter',{detail:entry}));
entry.onfinish=()=>{
if(revealMotion!==entry||!dialog.open)return;
entry.cancel();
startReel();
};
});

const measure=()=>{
const height=face.offsetHeight;
if(!height)return;
const edge=parseFloat(getComputedStyle(face).width);
const stubWidth=parseFloat(getComputedStyle(paper).width);
if(!stubWidth)return;
if(geometry?.edge===edge&&geometry.height===height&&geometry.stubWidth===stubWidth)return;
const notch=height<260?7:9;
const holes=Math.round(height/ 19);
const spacing=(height-2*notch) / (holes+1);
const perforation=Array.from({length:holes},(_,i)=>notch+spacing*(i+1));
const outline=(width,right)=>{
const x=right?width:0;
const outside=right?0:width;
const inset=x+(right?-notch:notch);
const sweep=right?0:1;
const radius=1.9;
const arc=(r,endX,endY)=>`A${r},${r} 0 0 ${sweep} ${endX},${endY}`;
const cut=perforation.map(y=>`V${y-radius}${arc(radius,x,y+radius)}`).join('');
return`path('M${outside},0 H${inset}${arc(notch,x,notch)}${cut}V${height-notch}${arc(notch,inset,height)}H${outside}Z')`;
};
flight.style.setProperty('--ticket-face-outline',outline(edge,true));
flight.style.setProperty('--ticket-stub-outline',outline(stubWidth,false));
flight.style.setProperty('--ticket-reel-width',`${edge+stubWidth}px`);
dialog.style.setProperty('--ticket-height',`${height}px`);
geometry={edge,height,stubWidth,notch,bridges:Array.from({length:holes+1},(_,i)=>notch+spacing*(i+.5))};
};
const resize=new ResizeObserver(measure);
resize.observe(face);
resize.observe(paper);

document.addEventListener('pack:prepare',()=>{
dialog.classList.add('is-prepared');
if(!dialog.open)prepareReveal();
},{once:true});

const clearTilt=()=>{
for(const name of['--foil-x','--foil-y','--ticket-tilt-x','--ticket-tilt-y'])ticket.style.removeProperty(name);
};
const clearFibres=()=>{
intact.removeAttribute('d');
snapped.removeAttribute('d');
};
const transform=({x,y,angle})=>`translate(${x}px, ${y}px) rotate(${angle}rad)`;
const paint=pose=>{stub.style.transform=transform(pose);};
const release=()=>{
const pointer=drag?.id;
drag=undefined;
if(pointer!==undefined&&stub.hasPointerCapture(pointer))stub.releasePointerCapture(pointer);
ticket.classList.remove('is-pulling');
clearFibres();
};
const play=(frames,duration,done)=>{
motion?.cancel();
const animation=stub.animate(frames,{duration,fill:'forwards'});
motion=animation;
animation.onfinish=()=>{
done?.();
animation.cancel();
motion=undefined;
stub.style.removeProperty('transform');
};
};
const detach=()=>{
document.dispatchEvent(new Event('pack:stub'));
clearFibres();
};
const drop=pull=>{
const{direction,free,pose,vx,vy}=pull;
const drift=clamp(vx,-200,340)*.17;
const throwY=clamp(vy,-330,350)*.16;
release();
ticket.classList.add('is-torn');
status.textContent='Ticket stub torn off';
if(!free)detach();
if(reduced.matches){
stub.hidden=true;
return;
}
const falling={x:pose.x+drift+12,y:pose.y+20+throwY,angle:pose.angle+direction*.19};
const gone={x:pose.x+2*drift+24,y:pose.y+190+throwY,angle:pose.angle+direction*.72};
play([
{transform:transform(pose),opacity:1,offset:0},
{transform:transform(pose),opacity:1,offset:.25,easing:'cubic-bezier(.38,.06,.8,.67)'},
{transform:transform(falling),opacity:.91,offset:.55,easing:'ease-in'},
{transform:transform(gone),opacity:0,offset:1}
],570,()=>{stub.hidden=true;});
};

const paintFibres=pull=>{
const{x,y,angle}=pull.pose;
const sin=Math.sin(angle);
const cos=Math.cos(angle);
const live=[];
const ends=[];
geometry.bridges.forEach((point,i)=>{
const anchor=point-pull.hinge;
const dx=-anchor*sin+x;
const dy=anchor*(cos-1)+y;
const gap=Math.hypot(dx,dy);
const limit=16+i%3*2.5;
const sx=geometry.edge;
if(gap>limit)pull.broken.add(i);
if(gap<1)return;
if(!pull.broken.has(i)){
live.push(`M${sx},${point}q${dx/ 2},${dy/ 2+gap*.15} ${dx},${dy}`);
}else{
const stubEnd=clamp((limit+12-gap) / gap,0,.32);
if(stubEnd>0)ends.push(`M${sx},${point}l${dx*stubEnd},${dy*stubEnd} M${sx+dx},${point+dy}l${-dx*stubEnd},${-dy*stubEnd}`);
}
});
intact.setAttribute('d',live.join(' '));
snapped.setAttribute('d',ends.join(' '));
};

ticket.addEventListener('pointermove',event=>{
if(reduced.matches||drag||event.pointerType==='touch'||revealMotion)return;
const rect=ticket.getBoundingClientRect();
const x=clamp((event.clientX-rect.left) / rect.width,0,1);
const y=clamp((event.clientY-rect.top) / rect.height,0,1);
ticket.style.setProperty('--foil-x',`${x*100}%`);
ticket.style.setProperty('--foil-y',`${y*100}%`);
ticket.style.setProperty('--ticket-tilt-x',`${(0.5-y)*10}deg`);
ticket.style.setProperty('--ticket-tilt-y',`${(x-0.5)*12}deg`);
});
ticket.addEventListener('pointerleave',clearTilt);

stub.addEventListener('pointerdown',event=>{
if(event.button!==0||drag)return;
dialog.classList.remove('is-launching');
if(!geometry)measure();
motion?.cancel();
motion=undefined;
stub.style.removeProperty('transform');
const rect=stub.getBoundingClientRect();
const hinge=event.clientY-rect.top<rect.height/ 2?geometry.height-geometry.notch:geometry.notch;
const direction=hinge>geometry.height/ 2?1:-1;
const x=event.clientX;
const y=event.clientY;
const hingeY=rect.top+hinge*rect.height/ geometry.height;
clearTilt();
pulled=false;
drag={
id:event.pointerId,x,y,hinge,direction,hingeX:rect.left,hingeY,
startAngle:Math.atan2(y-hingeY,x-rect.left),
pose:{x:0,y:0,angle:0},
broken:new Set(),lastX:x,lastY:y,lastTime:event.timeStamp,vx:0,vy:0
};
stub.style.transformOrigin=`0 ${hinge}px`;
stub.setPointerCapture(event.pointerId);
});

stub.addEventListener('pointermove',event=>{
const pull=drag;
if(pull?.id!==event.pointerId)return;
const dx=event.clientX-pull.x;
const dy=event.clientY-pull.y;
if(!pulled&&Math.hypot(dx,dy)<7)return;
pulled=true;
if(reduced.matches){
if(Math.hypot(Math.max(0,dx),dy)>=42)drop(pull);
return;
}
ticket.classList.add('is-pulling');
const dt=Math.max(8,event.timeStamp-pull.lastTime) / 1000;
pull.vx+=((event.clientX-pull.lastX) / dt-pull.vx)*.42;
pull.vy+=((event.clientY-pull.lastY) / dt-pull.vy)*.42;
Object.assign(pull,{lastX:event.clientX,lastY:event.clientY,lastTime:event.timeStamp});
if(pull.free){
pull.pose.x=dx+pull.free.x;
pull.pose.y=dy+pull.free.y;
paint(pull.pose);
return;
}
const delta=Math.atan2(event.clientY-pull.hingeY,event.clientX-pull.hingeX)-pull.startAngle;
const turn=Math.atan2(Math.sin(delta),Math.cos(delta))*pull.direction;
const outward=Math.atan2(Math.max(0,dx),Math.min(115,geometry.height*.4))*.9;
const resistance=.64+.36*pull.broken.size/ geometry.bridges.length;
pull.pose={
x:clamp(dx*.065,0,5),
y:clamp(dy*.035,-3,3),
angle:clamp(Math.max(turn,outward)*resistance,0,tearAngle)*pull.direction
};
paint(pull.pose);
paintFibres(pull);
if(Math.abs(pull.pose.angle)>=tearAngle||pull.broken.size===geometry.bridges.length){
pull.free={x:pull.pose.x-dx,y:pull.pose.y-dy};
detach();
}
});

for(const type of['pointerup','pointercancel','lostpointercapture']){
stub.addEventListener(type,event=>{
const pull=drag;
if(pull?.id!==event.pointerId)return;
if(pull.free)drop(pull);
else{
release();
if(pulled&&!reduced.matches){
play([{transform:transform(pull.pose),easing:'cubic-bezier(.22,.8,.34,1.18)'},{transform:'none'}],310);
}
}
});
}
reduced.addEventListener('change',()=>{
if(!reduced.matches)return;
if(revealMotion)finishPull();
clearTilt();
if(drag?.free)drop(drag);
else release();
motion?.cancel();
motion=undefined;
stub.style.removeProperty('transform');
if(ticket.classList.contains('is-torn'))stub.hidden=true;
});
dialog.addEventListener('close',()=>{
stopReveal();
showVariant(prism);
price.textContent='';
indicator.setAttribute('aria-hidden','true');
release();
clearTilt();
motion?.cancel();
motion=undefined;
stub.style.removeProperty('transform');
pulled=false;
ticket.classList.remove('is-torn');
stub.hidden=false;
status.textContent='';
});
window.addEventListener('pagehide',stopReveal,{once:true});
})();
