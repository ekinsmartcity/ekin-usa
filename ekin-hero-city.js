(function(){
// ============ Ekin numeric smart-city homepage hero ============
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches || location.search.indexOf('reduced')>=0;

// ---- glyph atlas: digits 0-9 + restrained data fragments ----
const GLYPHS = ['0','1','2','3','4','5','6','7','8','9','01','11','42','84','0.98','35','72.6','128','1101','0'];
const COLS=5, ROWS=4, CELL=256;
function buildAtlas(){
  const cv=document.createElement('canvas'); cv.width=COLS*CELL; cv.height=ROWS*CELL;
  const g=cv.getContext('2d'); g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle';
  GLYPHS.forEach((ch,i)=>{
    const cx=(i%COLS)*CELL+CELL/2, cy=Math.floor(i/COLS)*CELL+CELL/2;
    const fs = ch.length>=4?84 : ch.length>=3?104 : ch.length>=2?148 : 208;
    g.font='600 '+fs+'px "Roboto Mono", monospace'; g.fillText(ch,cx,cy);
  });
  const tex=new THREE.CanvasTexture(cv); tex.flipY=false; tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter;
  return tex;
}
const atlas=buildAtlas();

// ---- renderer / iso camera (approved angle) ----
const CANVAS=document.getElementById('glcanvas');
const renderer=new THREE.WebGLRenderer({canvas:CANVAS,antialias:true,alpha:true,preserveDrawingBuffer:true});
const PR=Math.min(window.devicePixelRatio,2); renderer.setPixelRatio(PR);
const scene=new THREE.Scene(); scene.fog=new THREE.Fog(0x070b12,180,520);
let camera; const FRUST=43; const TARGET=new THREE.Vector3(-4,8,-8);
function makeCam(){ const a=window.innerWidth/window.innerHeight;
  camera=new THREE.OrthographicCamera(-FRUST*a,FRUST*a,FRUST,-FRUST,-400,700);
  camera.position.set(TARGET.x+72,TARGET.y+60,TARGET.z+72); camera.lookAt(TARGET);
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
}
makeCam();

// ---- city grid constants (match approved composition) ----
const BLOCK=11, ROAD=4.4, N=6, step=BLOCK+ROAD;
const gridMin=-((N*step-ROAD)/2), cityHalf=(N*step-ROAD)/2;
const cellOrigin=i=>gridMin+i*step;
function distC(x,z){return Math.hypot(x,z)/cityHalf;}

// ---- point buffers ----
const P=[],CLD=[],WIN=[],CL=[],GL=[],SZ=[],SD=[],VS=[],FL=[];
const COL={ ground:[0.30,0.40,0.54], road:[0.55,0.69,0.95], lane:[0.82,0.90,1.0],
  face:[0.32,0.42,0.58], edge:[0.72,0.82,1.0], veh:[0.9,0.6,0.55], node:[0.45,0.58,0.78],
  accent:[1.0,0.30,0.26], cloud:[0.60,0.72,0.92] };
function gi(kind){
  if(kind==='accent') return 10+Math.floor(Math.random()*9);   // fragments
  if(kind==='lane') return Math.random()<.5?0:1;
  return Math.floor(Math.random()*10);
}
// Opening state: the reference photo rebuilt entirely out of digits — a curving
// multi-lane expressway rushing toward a downtown skyline on the horizon, red light
// trails on the near carriageway, warm trails on the far one, tower windows and a
// lit sky of sparse numerals. Laid out in screen space with perspective scaling so it
// reads as 3D, then it fades out as the real Ekin city assembles on scroll.
const TITLE_DIM=0.62;
function rnd(a,b){return a+Math.random()*(b-a);}
const C_INK=[0.72,0.80,0.92];
const C_RED=C_INK, C_WARM=C_INK, C_TOWER=C_INK, C_SKY=C_INK, C_WALL=C_INK;
const VP=[0.30,0.10];                                   // vanishing point (ndc)
const OPEN=[];
function addPt(nx,ny,size,col,dim,fx,fy){
  const inTitle = nx<-0.02 && ny>-0.42 && ny<0.76;
  OPEN.push({nx:nx,ny:ny,size:size,col:col,vis:inTitle?TITLE_DIM:(dim||1),fx:fx||0,fy:fy||0});
}
(function buildScene(){
  // ---- expressway: two carriageways of digit light-trails ----
  const rows=92;
  function lanePt(side,lane,r){
    const t=Math.pow(r/(rows-1),0.72);                   // 0 near camera -> 1 at horizon
    const persp=Math.pow(1-t,1.55);
    const bend=(side<0? -0.34: 0.16)*Math.pow(1-t,2.2);  // the road's sweep
    return [VP[0]+lane*(persp*3.1)+bend, VP[1]-Math.pow(1-t,1.9)*1.34, persp];
  }
  [[-1,52],[1,20]].forEach(function(cfg){               // wide multi-lane expressway
    const side=cfg[0], LANES=cfg[1];
    for(let l=0;l<LANES;l++){
      const lane=(l+0.5)*0.055*side;
      for(let r=0;r<rows;r++){
        const p=lanePt(side,lane,r), q=lanePt(side,lane,Math.max(0,r-1));
        const nx=p[0]+rnd(-.012,.012), ny=p[1]+rnd(-.008,.008);
        if(ny<-1.14||nx<-1.5||nx>1.2) continue;
        addPt(nx,ny,(5+15*p[2])*PR, side<0?C_RED:C_WARM, 0.72+0.28*p[2], q[0]-p[0], q[1]-p[1]);
      }
    }
  });
  // ---- centre divider: a bright hairline of digits ----
  for(let r=0;r<30;r++){
    const t=Math.pow(r/29,0.72), persp=Math.pow(1-t,1.55);
    addPt(VP[0]-0.055*persp*2.4-0.09*Math.pow(1-t,2.2), VP[1]-Math.pow(1-t,1.9)*1.34,
      (4+9*persp)*PR, C_WARM, 0.7);
  }
  // ---- retaining walls with lamp glow, left and right ----
  for(let side=-1;side<=1;side+=2){
    for(let r=0;r<26;r++){
      const t=Math.pow(r/25,0.7), persp=Math.pow(1-t,1.5);
      const nx=VP[0]+side*(0.42+1.05*persp)+(side<0?-0.16:0.10)*Math.pow(1-t,2);
      const ny=VP[1]-Math.pow(1-t,1.85)*1.05+0.06*persp;
      if(nx<-1.16||nx>1.16) continue;
      addPt(nx,ny,(4+8*persp)*PR,C_WALL,0.5+0.5*persp);
      addPt(nx+side*0.03,ny+0.05+0.06*persp,(3.5+6*persp)*PR,C_WALL,0.3+0.4*persp);
    }
  }
  // ---- downtown skyline of digit towers on the horizon ----
  const TOW=[];
  for(let i=0;i<86;i++){
    const cx=rnd(-1.05,1.10);
    const core=1-Math.min(1,Math.abs(cx-0.42)/1.25);
    TOW.push({cx:cx,w:rnd(0.026,0.078),h:0.09+Math.pow(core,1.35)*rnd(0.18,0.62)});
  }
  TOW.forEach(function(tw){
    const cols=Math.max(2,Math.round(tw.w/0.0105));
    const rows=Math.max(3,Math.round(tw.h/0.0185));
    for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){
      const nx=tw.cx-tw.w/2+(c+0.5)*(tw.w/cols);
      const ny=VP[1]+(r+0.4)*(tw.h/rows);
      if(Math.random()<0.10) continue;                  // dark windows
      addPt(nx+rnd(-.003,.003),ny,(5+rnd(0,2.2))*PR,C_TOWER,0.5+0.5*(1-r/rows));
    }
  });
  // ---- lit sky: sparse numerals thinning upward ----
  // ---- drones: quad silhouettes of digits above the road ----
  for(let d=0;d<9;d++){
    const cx=rnd(-0.95,1.02), cy=rnd(VP[1]+0.10,0.86), sc=rnd(0.030,0.062);
    for(let a=0;a<4;a++){
      const ax=(a===0||a===3?-1:1), az=(a<2?-1:1);
      for(let k=0;k<5;k++){                        // arms
        const u=(k+1)/5;
        addPt(cx+ax*sc*u, cy+az*sc*0.42*u, (4.6+2.2*(1-u))*PR, C_INK, 0.85);
      }
      for(let k=0;k<7;k++){                        // rotor rings
        const th=(k/7)*6.283;
        addPt(cx+ax*sc+Math.cos(th)*sc*0.36, cy+az*sc*0.42+Math.sin(th)*sc*0.16, 4.2*PR, C_INK, 0.6);
      }
    }
    for(let k=0;k<4;k++) addPt(cx+rnd(-sc*0.22,sc*0.22), cy+rnd(-sc*0.12,sc*0.12), 6.4*PR, C_INK, 1);
  }
  for(let i=0;i<1800;i++){
    const nx=rnd(-1.1,1.1), ny=rnd(VP[1]+0.12,1.08);
    if(Math.random()>1.05-((ny-VP[1])*0.72)) continue;
    addPt(nx,ny,(3.4+rnd(0,2.4))*PR,C_SKY,0.18+0.30*Math.random());
  }
  for(let i=OPEN.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=OPEN[i];OPEN[i]=OPEN[j];OPEN[j]=t;}
})();
const _uv=new THREE.Vector3();
let latI=0;
const _uv2=new THREE.Vector3();
function nextCloud(){
  if(latI>=OPEN.length) return null;
  const o=OPEN[latI++];
  _uv.set(o.nx,o.ny,0).unproject(camera);
  _uv2.set(o.nx+o.fx,o.ny+o.fy,0).unproject(camera);
  return [_uv.x,_uv.y,_uv.z,o.vis,o.size,o.col,
    _uv2.x-_uv.x,_uv2.y-_uv.y,_uv2.z-_uv.z];
}
function push(tx,ty,tz, ws,we, col, size, kind){
  P.push(tx,ty,tz); CLD.push(tx,ty,tz); VS.push(0); FL.push(0,0,0); WIN.push(ws,we);
  CL.push(col[0],col[1],col[2]); GL.push(gi(kind)); SZ.push(size*PR); SD.push(Math.random()*6.28);
}
// ambient cloud glyph that never fully assembles (persistent numeric atmosphere)
function pushCloud(){ const c=nextCloud(); if(!c) return;
  P.push(c[0],c[1],c[2]); CLD.push(c[0],c[1],c[2]); WIN.push(9,10); VS.push(c[3]); FL.push(c[6],c[7],c[8]);
  CL.push(c[5][0],c[5][1],c[5][2]); GL.push(gi()); SZ.push(c[4]); SD.push(Math.random()*6.28);
}

// ===== STAGE 2: ground numeric field =====
const GStep=2.15, GH=cityHalf+3;
for(let x=-GH;x<=GH;x+=GStep) for(let z=-GH;z<=GH;z+=GStep){
  if(Math.random()<.15) continue;
  if(Math.abs(x)<0 && Math.abs(z)<0) continue;
  push(x+rnd(-.2,.2),0.02,z+rnd(-.2,.2), 0.10,0.28, COL.ground, 12, '');
}
// ===== central highway: wide multi-lane corridor through the middle =====
const HWY_Z=0, HWY_HALF=5.2;
for(let t=-cityHalf-6;t<=cityHalf+6;t+=1.15){
  for(let o=-HWY_HALF;o<=HWY_HALF;o+=1.05){
    push(t+rnd(-.12,.12),0.05,HWY_Z+o+rnd(-.12,.12), 0.14,0.32, COL.road, 15, '');
  }
  // lane dashes (3 lanes each direction) + bright centre divider
  if(Math.floor(t)%2===0){
    [-3.6,-1.8,1.8,3.6].forEach(o=>push(t,0.09,HWY_Z+o,0.22,0.38,COL.lane,15.5,'lane'));
  }
  push(t,0.10,HWY_Z-0.16,0.20,0.36,COL.lane,16,'lane');
  push(t,0.10,HWY_Z+0.16,0.20,0.36,COL.lane,16,'lane');
  // guard-rail edges
  push(t,0.55,HWY_Z-HWY_HALF-0.5,0.26,0.44,COL.edge,13,'');
  push(t,0.55,HWY_Z+HWY_HALF+0.5,0.26,0.44,COL.edge,13,'');
}
// ===== roads on the grid lines =====
for(let i=0;i<=N;i++){
  const p=gridMin-ROAD/2+i*step;
  for(let t=-cityHalf;t<=cityHalf;t+=1.6){
    for(let o=-1.6;o<=1.6;o+=1.6){
      push(t+rnd(-.15,.15),0.04,p+o+rnd(-.15,.15), 0.16,0.34, COL.road, 13.5, '');
      push(p+o+rnd(-.15,.15),0.04,t+rnd(-.15,.15), 0.16,0.34, COL.road, 13.5, '');
    }
    if(Math.floor(t)%3===0){ push(t,0.08,p,COL.lane,0.26,0.40,COL.lane,14,'lane'); push(p,0.08,t,COL.lane,0.26,0.40,COL.lane,14,'lane'); }
  }
}

// ===== STAGE 3: buildings from glyphs (edges + top ring + faces) =====
const solidGroup=new THREE.Group(); scene.add(solidGroup);
const solids=[];
function glyphBuilding(cx,cz,w,d,h,ws){
  const hw=w/2,hd=d/2, we=Math.min(ws+0.16,0.62);
  const corners=[[cx-hw,cz-hd],[cx+hw,cz-hd],[cx+hw,cz+hd],[cx-hw,cz+hd]];
  corners.forEach(c=>{ for(let y=0.3;y<=h;y+=0.95) push(c[0],y,c[1],ws,we,COL.edge,13.5,''); });
  for(let s=0;s<1;s+=0.16){ push(cx-hw+w*s,h+0.1,cz-hd,ws,we,COL.edge,12.5,''); push(cx+hw,h+0.1,cz-hd+d*s,ws,we,COL.edge,12.5,'');
    push(cx+hw-w*s,h+0.1,cz+hd,ws,we,COL.edge,12.5,''); push(cx-hw,h+0.1,cz+hd-d*s,ws,we,COL.edge,12.5,''); }
  const nf=Math.floor(w*d*h*0.16);
  for(let i=0;i<nf;i++){ const f=Math.floor(Math.random()*4); let x,z;
    if(f===0){x=rnd(cx-hw,cx+hw);z=cz-hd;} else if(f===1){x=cx+hw;z=rnd(cz-hd,cz+hd);}
    else if(f===2){x=rnd(cx-hw,cx+hw);z=cz+hd;} else {x=cx-hw;z=rnd(cz-hd,cz+hd);}
    push(x,rnd(0.3,h),z,ws,we,COL.face,11.5,''); }
  // subtle solid depth layer (secondary, dark)
  const geo=new THREE.BoxGeometry(w,h,d);
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x0a1120,transparent:true,opacity:0,depthWrite:true}));
  mesh.position.set(cx,h/2+0.05,cz); mesh.scale.y=0.001; solidGroup.add(mesh);
  solids.push({mesh,ws,we,h});
}
const parkBlocks=new Set(['1,4','4,1']); const waterBlock='5,5';
for(let ix=0;ix<N;ix++) for(let iz=0;iz<N;iz++){
  const key=ix+','+iz; if(parkBlocks.has(key)||key===waterBlock) continue;
  const ox=cellOrigin(ix)+BLOCK/2, oz=cellOrigin(iz)+BLOCK/2, dc=distC(ox,oz), tall=1-dc;
  const ws=0.34+Math.random()*0.16;
  const sub=Math.random()<.4?2:1, cw=(BLOCK-1.6)/sub;
  for(let sx=0;sx<sub;sx++) for(let sz=0;sz<sub;sz++){
    if(sub>1&&Math.random()<.2) continue;
    const bx=cellOrigin(ix)+0.8+cw*(sx+0.5), bz=cellOrigin(iz)+0.8+cw*(sz+0.5);
    let h=rnd(3,6)+tall*rnd(5,15); if(Math.random()<.06) h+=rnd(6,11);
    glyphBuilding(bx,bz,cw*rnd(.7,.9),cw*rnd(.7,.9),h,ws);
  }
}
// parks (tree glyph clusters) + water (flat glyph patch)
parkBlocks.forEach(k=>{ const [ix,iz]=k.split(',').map(Number); const ox=cellOrigin(ix)+BLOCK/2, oz=cellOrigin(iz)+BLOCK/2;
  for(let t=0;t<26;t++) push(ox+rnd(-4.5,4.5),rnd(0.3,2.2),oz+rnd(-4.5,4.5),0.40,0.58,[0.30,0.5,0.42],12,''); });
(function(){ const [ix,iz]=waterBlock.split(',').map(Number); const ox=cellOrigin(ix)+BLOCK/2, oz=cellOrigin(iz)+BLOCK/2;
  for(let t=0;t<40;t++) push(ox+rnd(-5,5),0.1,oz+rnd(-5,5),0.40,0.58,[0.3,0.5,0.7],11,''); })();

// ===== vehicles (glyph clusters on avenues) =====
for(let i=0;i<=N;i++){ const p=gridMin-ROAD/2+i*step;
  for(let k=0;k<3;k++){
    const acc=Math.random()<.16;
    const bx=p-0.9, bz=rnd(-cityHalf,cityHalf);
    for(let n=0;n<14;n++) push(bx+rnd(-.9,.9),rnd(0.2,0.9),bz+rnd(-.5,.5),0.46,0.62, acc?COL.accent:COL.veh,12.5,'');
    const cz=p+0.9, cx=rnd(-cityHalf,cityHalf); const acc2=Math.random()<.16;
    for(let n=0;n<14;n++) push(cx+rnd(-.5,.5),rnd(0.2,0.9),cz+rnd(-.9,.9),0.46,0.62, acc2?COL.accent:COL.veh,12.5,'');
  }
}

// ===== STAGE 4: device nodes (80+ subtle) =====
const nodePts=[];
function deviceNode(x,z,accent){
  const col=accent?COL.accent:COL.node;
  for(let y=0.3;y<=(accent?4.4:1.4);y+=0.6) push(x,y,z,0.58,0.74,col,accent?14:12.5,accent?'accent':'');
  if(accent){ for(let a=0;a<6.28;a+=0.7) push(x+Math.cos(a)*0.8,4.5,z+Math.sin(a)*0.8,0.6,0.76,COL.accent,12,''); }
  nodePts.push([x,z]);
}
for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){ const px=gridMin-ROAD/2+i*step, pz=gridMin-ROAD/2+j*step; if(Math.random()<.8) deviceNode(px,pz,false); }
for(let k=0;k<44;k++) deviceNode(rnd(-cityHalf,cityHalf),rnd(-cityHalf,cityHalf),false);

// ===== highlighted products (accent markers) =====
const HL=[
  { id:'xspotter', pos:[gridMin-ROAD/2+1*step, 6.5, cellOrigin(4)+BLOCK/2], img:'images/hero/x-spotter.png', title:'X SPOTTER', sub:'MULTI-LANE', slotX:0.49 },
  { id:'patrolg2', pos:[gridMin-ROAD/2+3*step-0.9, 1.0, cellOrigin(4)+BLOCK/2], img:'images/hero/patrol-g2.png', title:'PATROL G2', sub:'MOBILE', slotX:0.60 },
  { id:'spotter', pos:[gridMin-ROAD/2+3*step, 1.0, gridMin-ROAD/2+3*step], img:'images/hero/spotter.png', title:'SPOTTER', sub:'INFRASTRUCTURE', slotX:0.70 },
  { id:'bike', pos:[cellOrigin(4)+BLOCK/2, 1.0, cellOrigin(1)+BLOCK/2], img:'images/hero/bike-patrol.png', title:'BIKE PATROL', sub:'MICRO-MOBILITY', slotX:0.80 },
  { id:'box', pos:[cityHalf-3, 1.0, cellOrigin(3)+BLOCK/2], img:'images/hero/box-spotter.png', title:'BOX SPOTTER', sub:'RAPID DEPLOYMENT', slotX:0.90 },
];
HL.forEach(h=>{ const [x,y,z]=h.pos;
  for(let yy=0.3;yy<=y+3.4;yy+=0.5) push(x,yy,z,0.66,0.82,COL.accent,14.5,'accent');
  for(let a=0;a<6.28;a+=0.5) push(x+Math.cos(a)*1.0,y+3.5,z+Math.sin(a)*1.0,0.68,0.84,COL.accent,12.5,'');
});

// ===== data links (glyph arcs) node -> central Spotter hub, stage 4 =====
const HUB=new THREE.Vector3(HL[2].pos[0],HL[2].pos[1]+3.5,HL[2].pos[2]);
const LINKS=[];
function bez(L,t){ const it=1-t;
  return new THREE.Vector3(
    it*it*L.a.x+2*it*t*L.mid.x+t*t*L.b.x,
    it*it*L.a.y+2*it*t*L.mid.y+t*t*L.b.y,
    it*it*L.a.z+2*it*t*L.mid.z+t*t*L.b.z);
}
[HL[0],HL[1],HL[3],HL[4]].forEach(h=>{
  const a=new THREE.Vector3(h.pos[0],h.pos[1]+3.5,h.pos[2]), b=HUB.clone();
  const mid=a.clone().add(b).multiplyScalar(0.5); mid.y+=rnd(6,10);
  const L={a,mid,b}; LINKS.push(L);
  for(let t=0;t<=1.0001;t+=0.05){ const p=bez(L,t); push(p.x,p.y,p.z,0.72,0.9,COL.accent,12,'accent'); }
});

// ambient cloud (kept light/sparse)
for(let i=0;i<OPEN.length;i++) pushCloud();

// lights for the 3D car bodies
scene.add(new THREE.HemisphereLight(0x9fb4d6,0x05070b,0.9));
const carKey=new THREE.DirectionalLight(0xdfe8f7,0.8); carKey.position.set(30,50,20); scene.add(carKey);

// ---- geometry + shader (GPU morph) ----
const geo=new THREE.BufferGeometry();
geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
geo.setAttribute('aCloud',new THREE.Float32BufferAttribute(CLD,3));
geo.setAttribute('aWin',new THREE.Float32BufferAttribute(WIN,2));
geo.setAttribute('aColor',new THREE.Float32BufferAttribute(CL,3));
geo.setAttribute('aGlyph',new THREE.Float32BufferAttribute(GL,1));
geo.setAttribute('aSize',new THREE.Float32BufferAttribute(SZ,1));
geo.setAttribute('aSeed',new THREE.Float32BufferAttribute(SD,1));
geo.setAttribute('aVis',new THREE.Float32BufferAttribute(VS,1));
geo.setAttribute('aFlow',new THREE.Float32BufferAttribute(FL,3));
const mat=new THREE.ShaderMaterial({
  uniforms:{ uAtlas:{value:atlas}, uCols:{value:COLS}, uRows:{value:ROWS}, uTime:{value:0}, uProg:{value:0}, uSize:{value:0.58} },
  transparent:true, depthWrite:false, depthTest:true,
  vertexShader:`
    attribute vec3 aCloud; attribute vec2 aWin; attribute vec3 aColor; attribute float aGlyph; attribute float aSize; attribute float aSeed; attribute float aVis; attribute vec3 aFlow;
    uniform float uProg; uniform float uTime; uniform float uSize;
    varying vec3 vColor; varying float vGlyph; varying float vSeed; varying float vRev; varying float vVis;
    void main(){ vColor=aColor; vGlyph=aGlyph; vSeed=aSeed; vVis=aVis;
      float t=smoothstep(aWin.x,aWin.y,min(1.0,uProg*1.62)); vRev=t;
      vec3 drift=vec3(sin(uTime*0.4+aSeed*6.2),sin(uTime*0.33+aSeed*4.1),cos(uTime*0.4+aSeed*5.3))*0.07*(1.0-t);
      float ease=smoothstep(0.02,0.46,uProg); ease=ease*ease*(3.0-2.0*ease);
      vec3 cl=aCloud + aFlow*fract(uTime*1.15+aSeed*3.7);   // digits stream toward the viewer
      cl=mix(cl, position, ease*0.80*(1.0-t));              // and settle into the city as it forms
      vec3 pos=mix(cl+drift, position, t);
      vec4 mv=modelViewMatrix*vec4(pos,1.0); gl_Position=projectionMatrix*mv; float vis=mix(step(0.02,aVis),1.0,t);
      gl_PointSize=aSize*uSize*(1.0-0.34*uProg)*mix(1.55,1.0,t)*vis;
    }`,
  fragmentShader:`
    uniform sampler2D uAtlas; uniform float uCols; uniform float uRows; uniform float uTime; uniform float uProg;
    varying vec3 vColor; varying float vGlyph; varying float vSeed; varying float vRev; varying float vVis;
    void main(){
      float gCyc=mod(floor(vGlyph)+floor(uTime*1.3+vSeed*4.0),10.0);
      float g=mix(gCyc, vGlyph, step(0.35,vRev));
      float col=mod(g,uCols); float row=floor(g/uCols); vec2 cell=vec2(1.0/uCols,1.0/uRows);
      vec2 uv=(vec2(col,row)+gl_PointCoord)*cell; vec4 tx=texture2D(uAtlas,uv);
      if(tx.a<0.35) discard;
      float flick=0.9+0.1*sin(uTime*2.0+vSeed*7.0);
      float a=mix(0.95,1.0,vRev)*flick;
      a*=mix(clamp(vVis,0.0,1.0),1.0,vRev);      // headline area stays dim
      a*=(1.0-smoothstep(0.22,0.56,uProg)*(1.0-vRev));  // readout cross-dissolves into the city
      gl_FragColor=vec4(vColor*(1.15+0.35*vRev), a*tx.a);
    }`
});
scene.add(new THREE.Points(geo,mat));

// ---- reverse rain: data lifting off the city, rising to Maestro ----
const fragIdx=[10,12,13,14,18]; // 01,42,84,0.98,1101
const RAIN=1100;
const FP=[],FC=[],FG=[],FS=[],FINFO=[];
for(let i=0;i<RAIN;i++){
  FP.push(0,0,0); FC.push(1.0,0.46,0.40);
  FG.push(fragIdx[Math.floor(Math.random()*fragIdx.length)]);
  FS.push(rnd(10,16)*PR);
  FINFO.push({ x:rnd(-cityHalf,cityHalf), z:rnd(-cityHalf,cityHalf),
    phase:Math.random(), speed:rnd(0.07,0.17), top:rnd(46,80), sway:rnd(0.6,2.2), sf:rnd(0.5,1.6) });
}
const flowGeo=new THREE.BufferGeometry();
flowGeo.setAttribute('position',new THREE.Float32BufferAttribute(FP,3));
flowGeo.setAttribute('aColor',new THREE.Float32BufferAttribute(FC,3));
flowGeo.setAttribute('aGlyph',new THREE.Float32BufferAttribute(FG,1));
flowGeo.setAttribute('aSize',new THREE.Float32BufferAttribute(FS,1));
flowGeo.setAttribute('aFade',new THREE.Float32BufferAttribute(new Float32Array(RAIN),1));
const flowMat=new THREE.ShaderMaterial({
  uniforms:{uAtlas:{value:atlas},uCols:{value:COLS},uRows:{value:ROWS},uReveal:{value:0}},
  transparent:true,depthWrite:false,depthTest:true,
  vertexShader:`attribute vec3 aColor;attribute float aGlyph;attribute float aSize;attribute float aFade;varying vec3 vColor;varying float vGlyph;varying float vFade;
    void main(){vColor=aColor;vGlyph=aGlyph;vFade=aFade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=aSize;}`,
  fragmentShader:`uniform sampler2D uAtlas;uniform float uCols;uniform float uRows;uniform float uReveal;varying vec3 vColor;varying float vGlyph;varying float vFade;
    void main(){float c=mod(vGlyph,uCols);float r=floor(vGlyph/uCols);vec2 cell=vec2(1.0/uCols,1.0/uRows);vec2 uv=(vec2(c,r)+gl_PointCoord)*cell;vec4 tx=texture2D(uAtlas,uv);if(tx.a<0.35)discard;gl_FragColor=vec4(vColor,tx.a*uReveal*vFade);}`
});
scene.add(new THREE.Points(flowGeo,flowMat));

// highway traffic added after the car factory below (see HWY_TRAFFIC)

// ---- flying drones patrolling above the city ----
const drones=[];
(function(){
  const armGeo=new THREE.BoxGeometry(1.5,0.06,0.1);
  const hubGeo=new THREE.BoxGeometry(0.42,0.16,0.42);
  const rotorGeo=new THREE.RingGeometry(0.2,0.3,14);
  for(let d=0; d<10; d++){
    const g=new THREE.Group();
    const bodyMat=new THREE.MeshStandardMaterial({color:0x1b2436,roughness:.45,metalness:.55,transparent:true,opacity:0});
    const hub=new THREE.Mesh(hubGeo,bodyMat);
    const a1=new THREE.Mesh(armGeo,bodyMat), a2=new THREE.Mesh(armGeo,bodyMat);
    a2.rotation.y=Math.PI/2;
    const rotorMat=new THREE.MeshBasicMaterial({color:0x9fb4d6,transparent:true,opacity:0,side:THREE.DoubleSide});
    const rotors=[];
    [[0.72,0.72],[-0.72,0.72],[0.72,-0.72],[-0.72,-0.72]].forEach(o=>{
      const r=new THREE.Mesh(rotorGeo,rotorMat); r.rotation.x=-Math.PI/2; r.position.set(o[0],0.09,o[1]); rotors.push(r); g.add(r);
    });
    const led=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),new THREE.MeshBasicMaterial({color:0xff3932,transparent:true,opacity:0}));
    led.position.set(0,-0.13,0);
    g.add(hub,a1,a2,led); g.scale.setScalar(rnd(3.2,4.8));
    scene.add(g);
    drones.push({g,mats:[bodyMat,rotorMat,led.material],rotors,
      cx:rnd(-cityHalf*0.7,cityHalf*0.7), cz:rnd(-cityHalf*0.7,cityHalf*0.7),
      rad:rnd(9,22), y:rnd(11,20), sp:rnd(0.10,0.26), ph:Math.random()*6.28, bob:rnd(0.5,1.6)});
  }
})();

// ---- moving vehicles: small 3D car bodies travelling the avenues ----
const cars=[];
const carGeoBody=new THREE.BoxGeometry(1.9,0.42,0.82);
const carGeoCab=new THREE.BoxGeometry(1.0,0.34,0.7);
for(let v=0; v<52; v++){
  const hwy = v>=24;                                 // last 28 run the central highway
  const axis = hwy ? 'x' : (Math.random()<.5?'x':'z');
  const li = Math.floor(rnd(0,N+1));
  const HWY_LANES=[-3.6,-1.8,1.8,3.6];
  const lane = HWY_LANES[v%4];
  const p = hwy ? (HWY_Z+lane) : (gridMin-ROAD/2+li*step);
  const dir = hwy ? (lane<0?1:-1) : (Math.random()<.5?1:-1);
  const off = hwy ? 0 : (dir>0?0.9:-0.9), accent = Math.random()<.16;
  const col = accent?0xff3932:0xaeb9cc;
  const g=new THREE.Group();
  const bodyMat=new THREE.MeshStandardMaterial({color:col,roughness:.42,metalness:.35,emissive:accent?0x3a0806:0x0b111c,emissiveIntensity:accent?.7:.25,transparent:true,opacity:0});
  const cabMat=new THREE.MeshStandardMaterial({color:accent?0xff6a63:0xd5deec,roughness:.35,metalness:.3,transparent:true,opacity:0});
  const body=new THREE.Mesh(carGeoBody,bodyMat); body.position.y=0.34;
  const cab=new THREE.Mesh(carGeoCab,cabMat); cab.position.set(-0.1,0.63,0);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.14,0.7),new THREE.MeshBasicMaterial({color:0xff3932,transparent:true,opacity:0}));
  tail.position.set(-0.95*dir,0.34,0);
  g.add(body,cab,tail);
  if(axis==='z') g.rotation.y=Math.PI/2;
  scene.add(g);
  cars.push({g,mats:[bodyMat,cabMat,tail.material],axis,p,off,dir,t:rnd(-cityHalf,cityHalf),speed:hwy?rnd(6,9):rnd(3,5)});
}

// ---- DOM overlays ----
const copyEl=document.getElementById('copy');
const STAGES=[
  {k:'Smarter is Safer', h:'SMARTER IS SAFER', p:'Ekin Smart City Technology delivers greater accuracy, which gives you greater peace of mind.', hero1:true},
  {k:'Connected City', h:'ONE CONNECTED CITY, DRAWN FROM DATA.', p:'Every street, block and intersection — a living model of the city, reconstructed in real time.'},
  {k:'Smart City Ecosystem', h:'INTELLIGENCE CONNECTED BY EKIN', p:'Mobile and fixed edge devices thinking as one.', cta:true},
];
STAGES.forEach((s,i)=>{
  const b=document.createElement('div'); b.className='cblock'+(s.hero1?' hero1':''); b.dataset.i=i;
  b.innerHTML='<h1>'+s.h+'</h1><p>'+s.p+'</p>'
    +(s.hero1?'<div class="hero1-cta"><a class="btn primary" href="Book a Demo.html">Book a Demo <span class="a">&rarr;</span></a></div>':'')
    +(s.cta?'<div class="cta-row"><a class="btn primary" href="#">Explore Ekin <span class="a">&rarr;</span></a></div><div class="maestro-tag"><img src="images/hero/maestro-logo.png" alt="Maestro OS"> Unified by Maestro&nbsp;OS</div>':'');
  copyEl.appendChild(b); s.el=b;
});

// annotation cards removed — data now ascends to Maestro instead
const annots=document.getElementById('annots');
annots.style.display='none';
const _v=new THREE.Vector3();
function syncAnnots(){}
// spark + progress rail
const spark=document.getElementById('spark'); for(let i=0;i<20;i++){const b=document.createElement('i'); b.style.height=(20+Math.random()*80)+'%'; spark.appendChild(b);}
const prail=document.getElementById('prail'); const segs=[];
for(let i=0;i<3;i++){const s=document.createElement('div'); s.className='seg'; s.innerHTML='<i></i>'; prail.appendChild(s); segs.push(s.firstChild);}

// ---- overlay update from progress ----
function fade(p,a,b,fi,fo){ if(p<a||p>b)return 0; let v=1; if(p<a+fi)v=(p-a)/fi; if(p>b-fo)v=Math.min(v,(b-p)/fo); return Math.max(0,Math.min(1,v)); }
const counter=document.getElementById('counter'), counterTxt=document.getElementById('counterTxt');
const opsEl=document.getElementById('ops'), dashEl=document.getElementById('dash');
const scrollcue=document.getElementById('scrollcue');
function setOverlays(p){
  const wins=[[-0.1,0.28],[0.32,0.62],[0.68,1.2]];
  STAGES.forEach((s,i)=>{ const w=wins[i]; const v=fade(p,w[0],w[1],0.035,0.035);
    s.el.style.opacity=v; s.el.style.transform='translateY('+(30*(1-v))+'px)'; });
  const eco=fade(p,0.60,1.2,0.06,0);            // cards, counter, ops, dash appear stage 4-5
  annots.style.opacity=0; opsEl.style.opacity=eco; dashEl.style.opacity=eco; counter.style.opacity=eco;
  // counter: show "80+ CONNECTED DEVICES" while forming, settle to precise 84 near the end
  const cp=Math.min(1,Math.max(0,(p-0.60)/0.20));
  if(p>=0.94){ counterTxt.textContent='84 CONNECTED DEVICES'; }
  else { counterTxt.textContent='80+ CONNECTED DEVICES'; }
  const active=Math.min(2,Math.floor(p*3));
  prail.style.opacity = Math.min(1, Math.max(0, (p-0.16)/0.06));
  scrollcue.style.opacity = 0.6*fade(p,-0.1,0.18,0.02,0.05);
  segs.forEach((s,i)=>{ s.style.transform='scaleX('+(i<active?1:(i===active?(p*3-active):0))+')'; s.style.background=i<=active?'#FF3932':'rgba(159,180,214,.18)'; });
}

// ---- scroll → progress ----
let prog=0;
if(REDUCED){ prog=1; }
else{
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.create({trigger:(window.__heroTrigger||'.scrollwrap'), start:'top top', end:'bottom bottom', scrub:1, onUpdate:s=>{ if(!window.__lock) prog=s.progress; }});
}

// ---- solid depth layer reveal ----
function updateSolids(p){ const q=Math.min(1,p*1.62); solids.forEach(o=>{ const t=Math.max(0,Math.min(1,(q-o.ws)/(o.we-o.ws)));
  o.mesh.scale.y=Math.max(0.001,t); o.mesh.material.opacity=0.32*t; }); }

function resize(){ renderer.setSize(window.innerWidth,window.innerHeight); makeCam(); if(REDUCED)setOverlays(1); ScrollTrigger&&ScrollTrigger.refresh&&ScrollTrigger.refresh(); }
window.addEventListener('resize',resize); renderer.setSize(window.innerWidth,window.innerHeight);

const clock=new THREE.Clock();
let shown=0, dashT=0;
const dashVals=document.querySelectorAll('#dash .drow .v');
let lastW=0,lastH=0;
function loop(){
  if(window.innerWidth!==lastW||window.innerHeight!==lastH){
    lastW=window.innerWidth;lastH=window.innerHeight;
    if(lastW&&lastH) renderer.setSize(lastW,lastH);
  }
  const st=document.querySelector('.numhero');
  const r=st&&st.getBoundingClientRect();
  if(r&&(r.bottom<=0||r.top>=window.innerHeight)){clock.getDelta();return requestAnimationFrame(loop)}
  const dt=clock.getDelta(); shown+=(prog-shown)*Math.min(1,dt*6);
  const p=REDUCED?1:shown;
  mat.uniforms.uTime.value=clock.elapsedTime; mat.uniforms.uProg.value=p;
  // reverse rain: data rising off the city into the sky (collected by Maestro)
  const fpos=flowGeo.attributes.position.array, ffade=flowGeo.attributes.aFade.array;
  for(let i=0;i<FINFO.length;i++){ const f=FINFO[i];
    const t=(clock.elapsedTime*f.speed+f.phase)%1;
    const y=1.0+t*f.top;
    fpos[i*3]=f.x+Math.sin(clock.elapsedTime*f.sf+f.phase*6.28)*f.sway*t;
    fpos[i*3+1]=y;
    fpos[i*3+2]=f.z+Math.cos(clock.elapsedTime*f.sf*0.8+f.phase*6.28)*f.sway*t;
    ffade[i]=Math.min(1,t*5.0)*(1.0-Math.pow(t,2.1));
  }
  flowGeo.attributes.position.needsUpdate=true; flowGeo.attributes.aFade.needsUpdate=true;
  flowMat.uniforms.uReveal.value=fade(p,0.50,1.2,0.10,0);
  // moving vehicles along avenues (3D car bodies)
  const carRev=fade(p,0.44,1.2,0.05,0);
  for(let ci=0;ci<cars.length;ci++){ const c=cars[ci];
    c.t+=c.dir*c.speed*dt; if(c.t>cityHalf)c.t=-cityHalf; if(c.t<-cityHalf)c.t=cityHalf;
    if(c.axis==='x') c.g.position.set(c.t, 0, c.p+c.off);
    else c.g.position.set(c.p+c.off, 0, c.t);
    c.mats[0].opacity=carRev; c.mats[1].opacity=carRev; c.mats[2].opacity=carRev*0.9;
    c.g.visible=carRev>0.02;
  }
  // flying drones above the city
  for(let di=0;di<drones.length;di++){ const d=drones[di];
    const a=clock.elapsedTime*d.sp+d.ph;
    d.g.position.set(d.cx+Math.cos(a)*d.rad, d.y+Math.sin(clock.elapsedTime*0.7+d.ph)*d.bob, d.cz+Math.sin(a)*d.rad);
    d.g.rotation.y=-a+Math.PI/2;
    for(let ri=0;ri<d.rotors.length;ri++) d.rotors[ri].rotation.z+=dt*26;
    d.mats[0].opacity=carRev; d.mats[1].opacity=carRev*0.5;
    d.mats[2].opacity=carRev*(0.45+0.55*Math.abs(Math.sin(clock.elapsedTime*3.0+d.ph)));
    d.g.visible=carRev>0.02;
  }
  // dashboard liveliness (supporting, restrained)
  dashT+=dt;
  if(dashT>0.55 && p>0.6){ dashT=0;
    if(dashVals[1]) dashVals[1].textContent=(10+Math.floor(Math.random()*5));
    if(dashVals[2]) dashVals[2].textContent=(2.8+Math.random()*1.6).toFixed(1);
    const bars=spark.children; if(bars.length){ bars[Math.floor(Math.random()*bars.length)].style.height=(20+Math.random()*80)+'%'; }
  }
  updateSolids(p); setOverlays(p); syncAnnots();
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
if(REDUCED) setOverlays(1);
window.__hero={setProg:function(v){window.__lock=true;prog=v;shown=v;}, getProg:function(){return prog;}, mat:mat};
loop();

})();
