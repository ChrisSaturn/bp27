(()=>{
let context;
let master;
let noise;
let lastClick=-1;
const unlock=event=>{
if(!event.isTrusted)return;
const Audio=window.AudioContext||window.webkitAudioContext;
if(!Audio)return;
if(!context){
try{
context=new Audio();
master=context.createGain();
master.gain.value=0.25;
master.connect(context.destination);
noise=context.createBuffer(1,Math.ceil(context.sampleRate*0.03),context.sampleRate);
const samples=noise.getChannelData(0);
for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
}catch{context?.close().catch(()=>{});context=undefined;return;}
}
if(context.state==='suspended')context.resume().catch(()=>{});
};
const click=time=>{
const envelope=context.createGain();
envelope.gain.setValueAtTime(0.0001,time);
envelope.gain.exponentialRampToValueAtTime(0.25,time+0.001);
envelope.gain.exponentialRampToValueAtTime(0.0001,time+0.03);
envelope.connect(master);
const source=context.createBufferSource();
source.buffer=noise;
const filter=context.createBiquadFilter();
filter.type='bandpass';
filter.frequency.value=2600;
filter.Q.value=1.8;
source.connect(filter);
filter.connect(envelope);
const oscillator=context.createOscillator();
oscillator.type='triangle';
oscillator.frequency.setValueAtTime(1800,time);
oscillator.frequency.exponentialRampToValueAtTime(500,time+0.02);
const body=context.createGain();
body.gain.value=0.14;
oscillator.connect(body);
body.connect(envelope);
source.start(time);
oscillator.start(time);
oscillator.stop(time+0.032);
oscillator.onended=()=>{
source.disconnect();filter.disconnect();oscillator.disconnect();body.disconnect();envelope.disconnect();
};
};
document.addEventListener('pointerdown',unlock,{passive:true});
document.addEventListener('keydown',unlock);
document.addEventListener('pack:tick',event=>{
if(!context||context.state!=='running'||document.hidden)return;
const count=Math.max(1,Math.min(3,event.detail?.crossings||1));
for(let i=0;i<count;i++){
const time=Math.max(context.currentTime+0.002,lastClick+0.012);
// Drop stale bursts instead of queueing clicks behind a fast spin.
if(time>context.currentTime+0.04)break;
click(time);
lastClick=time;
}
});
document.addEventListener('visibilitychange',()=>{
if(!context)return;
if(document.hidden&&context.state==='running')context.suspend().catch(()=>{});
else if(!document.hidden&&context.state==='suspended')context.resume().catch(()=>{});
});
window.addEventListener('pagehide',()=>context?.close().catch(()=>{}),{once:true});
})();
