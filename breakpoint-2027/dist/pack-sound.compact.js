(()=>{
let context;
let master;
let noise;
let liveGraph;
let lastClick=-1;
let loadingSamples=false;
const samples=new Map();
const cueGains={rip:0.62,burst:0.90,reveal:0.42,stub:0.42,win:0.62};
const prepareSamples=()=>{
if(loadingSamples)return;
const bank=document.getElementById('pack-audio');
if(!bank)return;
const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
try{
const decoder=context||(Offline&&new Offline(1,1,32000));
if(!decoder)return;
loadingSamples=true;
for(const[name,clip]of Object.entries(JSON.parse(bank.textContent))){
const bytes=Uint8Array.from(atob(clip),char=>char.charCodeAt(0));
decoder.decodeAudioData(bytes.buffer)
.then(buffer=>samples.set(name,buffer))
.catch(()=>{});
}
}catch{
// Audio preparation must not interrupt the gesture or the visual opening.
}
};
const createNoise=audio=>{
const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*0.18),audio.sampleRate);
const samples=buffer.getChannelData(0);
for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
return buffer;
};
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
noise=createNoise(context);
liveGraph=makeGraph(context,master,noise);
}catch{context?.close().catch(()=>{});context=undefined;return;}
}
if(context.state==='suspended')context.resume().catch(()=>{});
prepareSamples();
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
source.start(time,0,0.03);
oscillator.start(time);
oscillator.stop(time+0.032);
oscillator.onended=()=>{
source.disconnect();filter.disconnect();oscillator.disconnect();body.disconnect();envelope.disconnect();
};
};
const makeGraph=(audio,output,samples)=>{
const transient=(time,duration,peak)=>{
const envelope=audio.createGain();
envelope.gain.setValueAtTime(0.0001,time);
envelope.gain.exponentialRampToValueAtTime(peak,time+0.004);
envelope.gain.exponentialRampToValueAtTime(0.0001,time+duration);
envelope.connect(output);
return envelope;
};
return{
rustle(time,duration,from,to,peak){
const source=audio.createBufferSource();
source.buffer=samples;
const filter=audio.createBiquadFilter();
filter.type='bandpass';
filter.Q.value=0.8;
filter.frequency.setValueAtTime(from,time);
filter.frequency.exponentialRampToValueAtTime(to,time+duration);
const envelope=transient(time,duration,peak);
source.connect(filter).connect(envelope);
source.start(time,0,duration);
source.onended=()=>{source.disconnect();filter.disconnect();envelope.disconnect();};
},
tone(time,duration,from,to,peak){
const voice=audio.createOscillator();
voice.type='sine';
voice.frequency.setValueAtTime(from,time);
voice.frequency.exponentialRampToValueAtTime(to,time+duration);
const envelope=transient(time,duration,peak);
voice.connect(envelope);
voice.start(time);
voice.stop(time+duration);
voice.onended=()=>{voice.disconnect();envelope.disconnect();};
}
};
};
const fallbackCues={
rip({rustle},time){
rustle(time,0.072,2100,3900,0.37);
rustle(time+0.042,0.078,3800,1900,0.23);
},
burst({rustle,tone},time){
rustle(time,0.125,1510,390,0.36);
tone(time,0.133,170,56,0.49);
tone(time+0.03,0.23,622,622,0.15);
tone(time+0.062,0.24,932,932,0.10);
tone(time+0.092,0.25,1245,1245,0.08);
},
stub({rustle},time){
rustle(time,0.10,3500,1700,0.29);
rustle(time+0.044,0.083,2200,940,0.22);
},
win({tone},time){
tone(time,0.105,660,660,0.23);
tone(time+0.04,0.175,990,990,0.19);
}
};
const canPlay=()=>context?.state==='running'&&!document.hidden;
const playCue=name=>{
if(!canPlay())return;
const time=context.currentTime+0.002;
const buffer=samples.get(name);
if(!buffer){
fallbackCues[name]?.(liveGraph,time);
return;
}
const source=context.createBufferSource();
const volume=context.createGain();
volume.gain.value=cueGains[name];
source.buffer=buffer;
source.connect(volume).connect(master);
source.onended=()=>{source.disconnect();volume.disconnect();};
source.start(time);
};
document.addEventListener('pack:prepare',prepareSamples,{once:true});
for(const name of['rip','burst','stub','win']){
document.addEventListener(`pack:${name}`,()=>playCue(name));
}
document.querySelector('.ticket-flight')?.addEventListener('ticket:launch',()=>playCue('reveal'));
document.addEventListener('pointerdown',unlock,{passive:true});
document.addEventListener('pointerup',unlock,{passive:true});
document.addEventListener('keydown',unlock);
document.addEventListener('pack:tick',event=>{
if(!canPlay())return;
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
