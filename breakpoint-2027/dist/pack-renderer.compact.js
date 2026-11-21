(()=>{
const rail=document.querySelector('.pack-rail');
if(!rail)return;
const canvas=document.createElement('canvas');
canvas.className='pack-mesh-canvas';
canvas.setAttribute('aria-hidden','true');
const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false});
if(!gl)return;
rail.prepend(canvas);
let rotation=0;
let ready=false;
let disposed=false;
let width=1;
let height=1;
const textures=[];
const opening=new Map();
const hoverStates=new Map();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let lastDraw=0;
let cylinder;
let buttons;
let orbitMatrices;
let needsDraw=true;
let settling=false;
let lastRotation;
let lastRadius;
let materialVersion;
const readProperty=(element,name,fallback=0)=>{
const value=parseFloat(element.style.getPropertyValue(name));
return Number.isFinite(value)?value:fallback;
};
const radians=degrees=>degrees*Math.PI/ 180;
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const multiply=(a,b)=>{
const out=new Float32Array(16);
for(let column=0;column<4;column++)for(let row=0;row<4;row++){
for(let k=0;k<4;k++)out[column*4+row]+=a[k*4+row]*b[column*4+k];
}
return out;
};
const translate=(x,y,z)=>{const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;};
const scale=(x,y,z)=>{const m=identity();m[0]=x;m[5]=y;m[10]=z;return m;};
const rotateX=angle=>{const m=identity(),c=Math.cos(angle),s=Math.sin(angle);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;};
const rotateY=angle=>{const m=identity(),c=Math.cos(angle),s=Math.sin(angle);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
const rotateZ=angle=>{const m=identity(),c=Math.cos(angle),s=Math.sin(angle);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;};
const vertex=`#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPosition;
    layout(location=1) in vec3 aNormal;
    layout(location=2) in vec2 aUv;
    layout(location=3) in vec3 aTangent;
    layout(location=4) in float aFace;
    uniform mat4 uModel;
    uniform vec2 uViewport;
    out vec3 vPosition;
    out vec3 vNormal;
    out vec3 vTangent;
    out vec2 vUv;
    flat out int vFace;
    void main() {
      vec4 p = uModel * vec4(aPosition, 1.0);
      vPosition = p.xyz;
      vNormal = normalize(mat3(uModel) * aNormal);
      vTangent = normalize(mat3(uModel) * aTangent);
      vUv = aUv;
      vFace = int(aFace);
      gl_Position = vec4(p.x * 2.0 / uViewport.x, -p.y * 2.0 / uViewport.y, -p.z / 1500.0, 1.0 - p.z / 1000.0);
    }`;
const fragment=`#version 300 es
    precision highp float;
    in vec3 vPosition;
    in vec3 vNormal;
    in vec3 vTangent;
    in vec2 vUv;
    flat in int vFace;
    uniform sampler2D uFront;
    uniform sampler2D uBack;
    uniform sampler2D uNormalMap;
    uniform sampler2D uFrontInk;
    uniform sampler2D uBackInk;
    uniform float uOpacity;
    uniform float uFocus;
    uniform float uHover;
    uniform vec2 uLight;
    out vec4 outColor;
    void main() {
      vec4 material = texture(uNormalMap, vUv);
      vec3 tangent = normalize(vTangent - dot(vTangent, vNormal) * vNormal);
      vec3 bitangent = normalize(cross(vNormal, tangent));
      vec3 mapped = material.xyz * 2.0 - 1.0;
      mapped.xy *= 0.12;
      vec3 inkNormal = (vFace == 1 ? texture(uBackInk, vUv) : texture(uFrontInk, vUv)).xyz * 2.0 - 1.0;
      mapped = vec3(mapped.xy + inkNormal.xy, mapped.z * inkNormal.z);
      mapped = normalize(mapped);
      vec3 normal = normalize(mat3(tangent, bitangent, normalize(vNormal)) * mapped);
      vec3 base = vFace == 1 ? texture(uBack, vUv).rgb : texture(uFront, vUv).rgb;
      if (vFace == 2) {
        base = vec3(0.48,0.22,0.68);
        normal = normalize(vNormal);
      }
      vec3 light = normalize(vec3(-0.5 + uLight.x, -0.65 + uLight.y, 1.0));
      vec3 view = normalize(vec3(0.0,0.0,1000.0)-vPosition);
      vec3 halfVector = normalize(light+view);
      float diffuse = max(0.0, dot(normal,light));
      float whiteInk = smoothstep(0.68,0.96,min(base.r,min(base.g,base.b)));
      float specular = pow(max(0.0,dot(normal,halfVector)),mix(32.0,14.0,material.a));
      float fresnel = pow(1.0-max(0.0,dot(normal,view)),3.0);
      float brushed = 0.97+0.03*material.a;
      vec3 reflection = mix(vec3(0.55,0.3,1.0),vec3(1.0,0.9,1.0),specular);
      vec3 color = base*(0.42+0.7*diffuse);
      color += reflection*(specular*0.42+fresnel*0.24)*brushed*(1.0-whiteInk*0.82);
      float sweep = vUv.x - (0.5 + uLight.x * 0.7) + (vUv.y - 0.5 - uLight.y * 0.4) * 0.35;
      float sheen = exp(-pow(sweep / 0.2, 2.0));
      color += vec3(0.8,0.66,1.0) * sheen * uHover * 0.22 * (1.0 - whiteInk * 0.85);
      color += uFocus*vec3(0.09,0.06,0.12);
      outColor = vec4(color,uOpacity);
    }`;
const dataUrl=new URL('pack-material-data.js?v=61e1fa6107',document.currentScript.src);
const yieldTask=async()=>{
if(globalThis.scheduler?.yield)await globalThis.scheduler.yield();
else await new Promise(resolve=>setTimeout(resolve,0));
if(disposed||gl.isContextLost())throw new Error('Pack initialization canceled');
};
let worker;
let fallbackModule;
let jobId=0;
const jobs=new Map();
const fallbackJob=job=>{
(fallbackModule||=import(dataUrl.href))
.then(module=>module.buildMaterialData(job.kind,job.input,yieldTask))
.then(job.resolve,job.reject);
};
const stopWorker=()=>{worker?.terminate();worker=undefined;};
const workerFailed=()=>{
stopWorker();
const pending=Array.from(jobs.values());jobs.clear();
for(const job of pending)fallbackJob(job);
};
try{
worker=new Worker(dataUrl,{type:'module'});
worker.addEventListener('message',({data})=>{
const job=jobs.get(data.id);
if(!job)return;
if(data.error){workerFailed();return;}
jobs.delete(data.id);job.resolve(data.result);
});
worker.addEventListener('error',event=>{event.preventDefault();workerFailed();});
worker.addEventListener('messageerror',workerFailed);
}catch{stopWorker();}
const materialJob=(kind,input)=>new Promise((resolve,reject)=>{
if(disposed){reject(new Error('Pack initialization canceled'));return;}
const job={kind,input,resolve,reject};
if(!worker){fallbackJob(job);return;}
const id=++jobId;jobs.set(id,job);
try{worker.postMessage({id,kind,input});}
catch{workerFailed();}
});
const geometryData=materialJob('geometry');
const foilData=materialJob('foil');
// Keep worker failures observed even if font or logo loading fails first.
geometryData.catch(()=>{});foilData.catch(()=>{});
const compile=(type,source)=>{
const shader=gl.createShader(type);
if(!shader)throw new Error('Pack shader unavailable');
gl.shaderSource(shader,source);gl.compileShader(shader);
return shader;
};
let program;
let vao;
let vbo;
let ibo;
let indexCount=0;
let uniforms;
const parallel=gl.getExtension('KHR_parallel_shader_compile');
try{
program=gl.createProgram();
if(!program)throw new Error('Pack material unavailable');
for(const type of[gl.VERTEX_SHADER,gl.FRAGMENT_SHADER]){
const shader=compile(type,type===gl.VERTEX_SHADER?vertex:fragment);
gl.attachShader(program,shader);gl.deleteShader(shader);
}
gl.linkProgram(program);
}catch{
stopWorker();
if(program)gl.deleteProgram(program);
canvas.remove();return;
}
const programLinked=async()=>{
if(parallel){
while(!gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)){
await new Promise(resolve=>setTimeout(resolve,4));
if(disposed||gl.isContextLost())throw new Error('Pack initialization canceled');
}
}else await yieldTask();
if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Pack material link failed');
};
const uploadGeometry=({vertices,indices})=>{
vao=gl.createVertexArray();gl.bindVertexArray(vao);
vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
indexCount=indices.length;
let offset=0;
[3,3,2,3,1].forEach((size,location)=>{gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,48,offset*4);offset+=size;});
};

const texture=(source,w,h)=>{
const item=gl.createTexture();textures.push(item);gl.bindTexture(gl.TEXTURE_2D,item);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
if(w)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
return item;
};
const makePrint=(logo,back=false)=>{
const map=document.createElement('canvas');map.width=1024;map.height=1536;
const c=map.getContext('2d');
const gradient=c.createLinearGradient(0,0,1024,120);
for(const[stop,color]of[[0,'#6226a1'],[.12,'#8c37e6'],[.38,'#b75cf0'],[.62,'#9b36e8'],[.85,'#b15ff0'],[1,'#6329a3']])gradient.addColorStop(stop,color);
c.fillStyle=gradient;c.fillRect(0,0,1024,1536);
c.globalAlpha=.085;
c.strokeStyle='#e5aaff';c.lineWidth=120;
c.shadowColor='#e5aaff';c.shadowBlur=55;
for(let i=0;i<3;i++){
const x=(i+.5)*1024/3;
c.beginPath();c.moveTo(x,86);c.bezierCurveTo(x+100,530,x-80,1040,x+30,1450);c.stroke();
}
c.shadowBlur=0;c.globalAlpha=1;
for(const y of[0,1436]){
c.fillStyle='#a369cf';c.fillRect(0,y,1024,100);
for(let x=0;x<1024;x+=64){
const rib=c.createLinearGradient(x,y,x+64,y);
rib.addColorStop(0,'#9156bc');rib.addColorStop(.28,'#c493e0');
rib.addColorStop(.55,'#b17bd4');rib.addColorStop(.8,'#9156bc');rib.addColorStop(1,'#a369cf');
c.fillStyle=rib;c.beginPath();c.roundRect(x+9,y+13,46,74,12);c.fill();
}
c.fillStyle='#d3a7ee';c.fillRect(0,y+5,1024,2);c.fillRect(0,y+93,1024,2);
c.fillStyle='#7337a14d';c.fillRect(0,y===0?99:1433,1024,3);
}
if(back){
const fin=c.createLinearGradient(530,0,570,0);
fin.addColorStop(0,'#59229100');fin.addColorStop(.35,'#6a2f9a88');
fin.addColorStop(.6,'#cb8df099');fin.addColorStop(1,'#59229100');
c.fillStyle=fin;c.fillRect(530,100,40,1336);
}
drawInk(c,logo,back);
return map;
};
const drawInk=(c,logo,back,embossOnly=false)=>{
c.drawImage(logo,200,170,624,120);
c.fillStyle='#ffffff';c.textAlign='center';
if(!back){
c.strokeStyle='#efdbff';c.lineWidth=16;c.lineCap='round';
for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(512+25*Math.cos(a),765+25*Math.sin(a));c.lineTo(512+215*Math.cos(a),765+215*Math.sin(a));c.stroke();}
if(!embossOnly){
c.font='72px "ABC Favorit", sans-serif';c.fillText('Breakpoint',512,1240);
c.font='38px monospace';c.fillText('SOLANA · 2027',512,1310);
}
}else{
c.font='40px "ABC Favorit", sans-serif';c.fillText('San Francisco',512,600);
c.font='26px monospace';c.fillText('8–10 SEPTEMBER 2027',512,670);
c.globalAlpha=.7;
for(let x=280;x<744;x+=8){c.fillStyle='#f3ddff';c.fillRect(x,1090,2+((x*7)%5),130);}
c.globalAlpha=1;
if(!embossOnly){
c.font='26px monospace';c.fillText('BREAKPOINT 2027',512,1310);
}
}
};
const makeInkNormal=(logo,back=false)=>{
const w=1024,h=1536;
const mask=document.createElement('canvas');mask.width=w;mask.height=h;
const c=mask.getContext('2d');
// Share the print paths so the beveled height always follows the visible ink.
c.filter='blur(2px)';
drawInk(c,logo,back,true);
const heights=c.getImageData(0,0,w,h).data;
return materialJob('ink',{heights,w,h});
};

const draw=()=>{
if(!ready||disposed||gl.isContextLost())return;
cylinder||=rail.querySelector('.pack-cylinder');
if(!cylinder)return;
if(!buttons){
buttons=Array.from(cylinder.querySelectorAll('.pack-choice'));
orbitMatrices=buttons.map((_,index)=>rotateY(radians(index*360/buttons.length)));
}
const radius=parseFloat(cylinder.style.getPropertyValue('--radius'))||400;
if(!needsDraw&&!settling&&!opening.size&&rotation===lastRotation&&radius===lastRadius)return;
needsDraw=false;settling=false;lastRotation=rotation;lastRadius=radius;
const mobile=width<=600;
const base=multiply(multiply(translate(0,0,-radius),rotateX(radians(-4))),rotateY(radians(rotation)));
gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
gl.uniform2f(uniforms.uViewport,width,height);
const now=performance.now();
const dt=Math.min(0.05,Math.max(0,(now-lastDraw)/1000));
lastDraw=now;
const blend=reducedMotion.matches?1:1-Math.exp(-dt/0.09);
const draws=buttons.map((button,index)=>{
let alpha=parseFloat(button.style.opacity)||0;
if(alpha<.005)return null;
const center=parseFloat(button.style.getPropertyValue('--center-weight'))||0;
const emphasis=parseFloat(button.style.getPropertyValue('--center-scale'))||1;
if(!hoverStates.has(index))hoverStates.set(index,{hover:0,tiltX:0,tiltY:0,lightX:35,lightY:20});
const state=hoverStates.get(index);
const active=button.classList.contains('is-hovering')&&!reducedMotion.matches;
const targets={hover:active?1:0,tiltX:readProperty(button,'--tilt-x'),tiltY:readProperty(button,'--tilt-y'),lightX:readProperty(button,'--light-x',35),lightY:readProperty(button,'--light-y',20)};
for(const key of Object.keys(targets)){
state[key]+=(targets[key]-state[key])*blend;
if(Math.abs(targets[key]-state[key])>.001)settling=true;
else state[key]=targets[key];
}
const tiltX=state.tiltX,tiltY=state.tiltY;
let model=multiply(base,translate(0,-height*.04,0));
model=multiply(model,orbitMatrices[index]);
model=multiply(model,translate(0,-6*center-12*state.hover,radius+8*state.hover));
const dimensions=mobile?[160/184,250/292,160/184]:[1,1,1];
model=multiply(model,scale(...dimensions.map(v=>v*emphasis*(1+state.hover*0.045))));
model=multiply(model,rotateX(radians(tiltX)));
model=multiply(model,rotateY(radians(-8+tiltY)));
if(button.classList.contains('is-opening')){
if(!opening.has(index))opening.set(index,now);
const p=Math.min(1,(now-opening.get(index))/700);
model=multiply(model,rotateZ(Math.sin(p*Math.PI*4)*.07));
model=multiply(model,translate(0,-12*p,0));
alpha*=1-p*.9;
}else opening.delete(index);
return{button,model,alpha,state,z:model[14]};
}).filter(Boolean).sort((a,b)=>a.z-b.z);
for(const{button,model,alpha,state}of draws){
gl.uniformMatrix4fv(uniforms.uModel,false,model);
gl.uniform1f(uniforms.uOpacity,alpha);
gl.uniform1f(uniforms.uFocus,button===document.activeElement&&button.matches(':focus-visible')?1:0);
gl.uniform1f(uniforms.uHover,state.hover);
gl.uniform2f(uniforms.uLight,(state.lightX-50)/120,(state.lightY-50)/120);
gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
}
};
document.addEventListener('packs:render',event=>{
rotation=event.detail.rotation;
if(materialVersion!==event.detail.materialVersion){
materialVersion=event.detail.materialVersion;
needsDraw=true;
}
draw();
});
const focusChanged=()=>{needsDraw=true;draw();};
rail.addEventListener('focusin',focusChanged);rail.addEventListener('focusout',focusChanged);
const resize=new ResizeObserver(()=>{
width=rail.clientWidth;height=rail.clientHeight;
const ratio=Math.min(devicePixelRatio||1,1.5);
const pixelWidth=Math.round(width*ratio),pixelHeight=Math.round(height*ratio);
if(canvas.width===pixelWidth&&canvas.height===pixelHeight)return;
canvas.width=pixelWidth;canvas.height=pixelHeight;needsDraw=true;draw();
});resize.observe(rail);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;canvas.style.visibility='hidden';rail.classList.remove('has-pack-mesh');});
const logo=new Image();logo.src='assets/bp27.png?v=3b8ce97314';
Promise.all([logo.decode(),document.fonts.ready,programLinked()]).then(async()=>{
if(disposed||gl.isContextLost())return;
const frontPrint=makePrint(logo);
await yieldTask();
const backPrint=makePrint(logo,true);
await yieldTask();
const frontInk=makeInkNormal(logo);
frontInk.catch(()=>{});
await yieldTask();
const backInk=makeInkNormal(logo,true);
backInk.catch(()=>{});
const[geometry,normals,front,back]=await Promise.all([geometryData,foilData,frontInk,backInk]);
if(disposed||gl.isContextLost())return;
stopWorker();
uploadGeometry(geometry);
uniforms=Object.fromEntries(['uModel','uViewport','uFront','uBack','uNormalMap','uFrontInk','uBackInk','uOpacity','uFocus','uHover','uLight'].map(name=>[name,gl.getUniformLocation(program,name)]));
for(const source of[frontPrint,backPrint,normals,front,back]){
if(source.data)texture(source.data,source.w,source.h);
else texture(source);
await yieldTask();
}
gl.useProgram(program);gl.bindVertexArray(vao);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
textures.forEach((item,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,item);});
gl.uniform1i(uniforms.uFront,0);gl.uniform1i(uniforms.uBack,1);gl.uniform1i(uniforms.uNormalMap,2);
gl.uniform1i(uniforms.uFrontInk,3);gl.uniform1i(uniforms.uBackInk,4);
ready=true;needsDraw=true;draw();rail.classList.add('has-pack-mesh');
}).catch(()=>{stopWorker();rail.classList.remove('has-pack-mesh');});
window.addEventListener('pagehide',()=>{
disposed=true;stopWorker();
for(const job of jobs.values())job.reject(new Error('Pack initialization canceled'));
jobs.clear();resize.disconnect();textures.forEach(item=>gl.deleteTexture(item));
if(vbo)gl.deleteBuffer(vbo);if(ibo)gl.deleteBuffer(ibo);if(vao)gl.deleteVertexArray(vao);gl.deleteProgram(program);
},{once:true});
})();
