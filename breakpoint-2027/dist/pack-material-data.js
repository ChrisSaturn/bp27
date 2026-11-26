(() => {
async function makeGeometry(yieldTask) {
  const vertices=[];
  const indices=[];
  const smoothstep = (low,high,value) => {
    const t=Math.max(0,Math.min(1,(value-low)/(high-low)));
    return t*t*(3-2*t);
  };
  const surface = (u,v,sign) => {
    const end=Math.min(v,1-v);
    const body=smoothstep(.06,.17,end);
    const shoulder=Math.exp(-1*((end-.12)/.065)**2);
    const cross=Math.pow(Math.max(0,Math.sin(Math.PI*u)),.6);
    const halfWidth=92-2.7*body-.8*shoulder+.5*Math.sin(Math.PI*v)**2;
    const notch=.7*Math.exp(-1*((v-.035)/.009)**2);
    const x=(u-.5)*2*(halfWidth-notch);
    const tooth=1-Math.abs(2*((u*16)%1)-1);
    const cut=(1-body)*(.3*tooth+.12*Math.sin(u*Math.PI*4));
    const y=(v-.5)*292+(v<.5?1:-1)*cut;
    const wrinkles=(.7*Math.sin(u*Math.PI*6+.65*Math.sin(v*Math.PI*2.4))+.18*Math.sin(u*Math.PI*4+v*Math.PI))*cross*body;
    const cornerFold=.5*shoulder*Math.sin(u*Math.PI*8)*Math.exp(-1*((Math.abs(u-.5)-.36)/.13)**2);
    const rib=.12*(1-body)*Math.sin(u*Math.PI*16)**2;
    const fin=sign<0?1.8*body*Math.exp(-1*((u-.54)/.018)**4):0;
    const depth=.65+10.5*cross*body+wrinkles+cornerFold+rib+fin;
    return [x,y,sign*depth];
  };
  const difference = (a,b) => a.map((v,i)=>v-b[i]);
  const normalize = a => {const length=Math.hypot(...a);return a.map(v=>v/length);};
  const addVertex = (position,normal,uv,tangent,face) => {
    const index=vertices.length/12;
    vertices.push(...position,...normal,...uv,...tangent,face);
    return index;
  };
  const nx=96, ny=96;
  for (const sign of [1,-1]) {
    const start=vertices.length/12;
    for (let y=0;y<=ny;y++) {
      if(yieldTask && y%8===0) await yieldTask();
      for(let x=0;x<=nx;x++) {
      const u=x/nx,v=y/ny,e=.0005;
      const du=difference(surface(Math.min(1,u+e),v,sign),surface(Math.max(0,u-e),v,sign));
      const dv=difference(surface(u,Math.min(1,v+e),sign),surface(u,Math.max(0,v-e),sign));
      const normal=normalize([du[1]*dv[2]-du[2]*dv[1],du[2]*dv[0]-du[0]*dv[2],du[0]*dv[1]-du[1]*dv[0]].map(n=>n*sign));
      addVertex(surface(u,v,sign),normal,[u,v],normalize(du),sign===1?0:1);
      }
    }
    for(let y=0;y<ny;y++) for(let x=0;x<nx;x++) {
      const a=start+y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;
      indices.push(a,b,c,b,d,c);
    }
  }
  for (let edge=0;edge<4;edge++) {
    const segments=edge<2?ny:nx;
    const start=vertices.length/12;
    for(let i=0;i<=segments;i++) {
      const t=i/segments;
      const u=edge===0?0:edge===1?1:t;
      const v=edge===2?0:edge===3?1:t;
      const e=.0005;
      const along=edge<2?difference(surface(u,Math.min(1,v+e),1),surface(u,Math.max(0,v-e),1)):difference(surface(Math.min(1,u+e),v,1),surface(Math.max(0,u-e),v,1));
      const outward=edge===0||edge===2?-1:1;
      const normal=normalize(edge<2?[along[1]*outward,-along[0]*outward,0]:[-along[1]*outward,along[0]*outward,0]);
      for(const sign of [1,-1]) addVertex(surface(u,v,sign),normal,[u,v],[0,0,1],2);
    }
    for(let i=0;i<segments;i++) { const a=start+i*2; indices.push(a,a+1,a+2,a+1,a+3,a+2); }
  }
  return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}

async function makeFoilNormal(yieldTask) {
    const w=512,h=768,data=new Uint8Array(w*h*4);
    const film=(u,v)=>.012*Math.sin(u*Math.PI*6+.65*Math.sin(v*Math.PI*2.4))+.003*Math.sin(u*Math.PI*4+v*Math.PI);
    for(let y=0;y<h;y++) {
      if(yieldTask && y%16===0) await yieldTask();
      for(let x=0;x<w;x++) {
      const u=x/w,v=y/h,e=.001;
      let dx=(film(u+e,v)-film(u-e,v))/(2*e),dy=(film(u,v+e)-film(u,v-e))/(2*e);
      if(v<.065||v>.935) {dx+=Math.sin(u*Math.PI*32)*.06;dy*=.2;}
      const length=Math.hypot(dx,dy,1),i=(y*w+x)*4;
      data[i]=Math.round((-.4*dx/length*.5+.5)*255);
      data[i+1]=Math.round((-.4*dy/length*.5+.5)*255);
      data[i+2]=Math.round((1/length*.5+.5)*255);
      data[i+3]=Math.round((.38+.06*Math.sin(u*Math.PI*6+v*Math.PI)**2)*255);
    }
    }
    return {data,w,h};
  }

async function makeInkNormal({heights,w,h},yieldTask) {
    const data=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++) {
      if(yieldTask && y%16===0) await yieldTask();
      const row=y*w*4,previousRow=Math.max(0,y-1)*w*4,nextRow=Math.min(h-1,y+1)*w*4;
      for(let x=0;x<w;x++) {
        const alpha=row+x*4+3;
        const dx=(heights[x===w-1?alpha:alpha+4]/255-heights[x===0?alpha:alpha-4]/255)*.5*(w/184)*1.1;
        const dy=(heights[nextRow+x*4+3]/255-heights[previousRow+x*4+3]/255)*.5*(h/292)*1.1;
        const length=Math.hypot(dx,dy,1),i=(y*w+x)*4;
        data[i]=Math.round((.5-.5*dx/length)*255);
        data[i+1]=Math.round((.5-.5*dy/length)*255);
        data[i+2]=Math.round((.5+.5/length)*255);
        data[i+3]=255;
      }
    }
    return {data,w,h};
}

function buildMaterialData(kind,input,yieldTask) {
  if(kind==='geometry') return makeGeometry(yieldTask);
  if(kind==='foil') return makeFoilNormal(yieldTask);
  if(kind==='ink') return makeInkNormal(input,yieldTask);
  throw new Error('Unknown pack material job');
}

if(typeof WorkerGlobalScope!=='undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message',async({data:{id,kind,input}})=>{
    try {
      const result=await buildMaterialData(kind,input);
      const buffers=kind==='geometry'?[result.vertices.buffer,result.indices.buffer]:[result.data.buffer];
      self.postMessage({id,result},buffers);
    } catch(error) {
      self.postMessage({id,error:String(error)});
    }
  });
} else {
  window.buildPackMaterialData = buildMaterialData;
}
})();
