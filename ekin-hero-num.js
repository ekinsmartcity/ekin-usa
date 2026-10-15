(function(){
'use strict';
// ============ Ekin homepage hero: a city built from structured digits ============
var sec=document.getElementById('top');
if(!sec||!sec.classList.contains('nhero'))return;
var copy=sec.querySelector('.nh-copy'),scenes=[].slice.call(sec.querySelectorAll('.nh-scene')),steps=[].slice.call(sec.querySelectorAll('.nh-steps button')),lines=[].slice.call(sec.querySelectorAll('.nh-h .l'));
var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||location.search.indexOf('reduced')>=0;
var B=[0,.34,.67,1.0001],GO=[0,.5,1],cur=0,P=0;

// ---- text: one scene at a time, outgoing fully gone before incoming ----
scenes.forEach(function(s,j){if(j){s.setAttribute('aria-hidden','true');s.setAttribute('inert','')}});
function setScene(i){
  if(i===cur)return;cur=i;sec.setAttribute('data-scene',i);
  scenes.forEach(function(s,j){var on=j===i;s.classList.toggle('is-on',on);if(on){s.removeAttribute('aria-hidden');s.removeAttribute('inert')}else{s.setAttribute('aria-hidden','true');s.setAttribute('inert','')}});
  steps.forEach(function(b,j){b.setAttribute('aria-current',j===i?'step':'false')});
}
function fit(){
  var cs=getComputedStyle(copy),w=copy.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  if(!(w>40))return;
  scenes.forEach(function(s){var h=s.querySelector('.nh-h');if(!h)return;h.style.removeProperty('--nh-fs');
    var fs=parseFloat(getComputedStyle(h).fontSize),mx=0;
    [].forEach.call(h.querySelectorAll('.l'),function(l){var r=document.createRange();r.selectNodeContents(l);mx=Math.max(mx,r.getBoundingClientRect().width)});
    if(mx>0&&mx>w*.98)h.style.setProperty('--nh-fs',Math.max(24,Math.floor(fs*w*.97/mx))+'px');});
}
fit();addEventListener('resize',fit);addEventListener('load',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(copy);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
function progress(){var r=sec.getBoundingClientRect(),range=r.height-innerHeight;if(range<=0)return 0;return Math.min(1,Math.max(0,-r.top/range))}
var kick=function(){};
function onScroll(){
  P=progress();setScene(P<B[1]?0:P<B[2]?1:2);
  steps.forEach(function(b,j){var f=Math.min(1,Math.max(0,(P-B[j])/(B[j+1]-B[j])));b.style.setProperty('--f',f.toFixed(3))});
  kick();
}
steps.forEach(function(b,j){b.addEventListener('click',function(){var r=sec.getBoundingClientRect(),range=r.height-innerHeight;window.scrollTo({top:scrollY+r.top+GO[j]*range+(j?2:0),behavior:reduced?'auto':'smooth'})})});
if(reduced)sec.classList.add('nh-static');else{addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);onScroll()}

var THREE=window.THREE;
if(!THREE){sec.classList.add('nh-nogl');return}
try{build()}catch(e){console.warn('nhero',e);sec.classList.add('nh-nogl')}

function build(){
var stage=sec.querySelector('.nhero-stage'),canvas=document.getElementById('nhCanvas');
var gl=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
gl.setClearColor(0x000000,1);
var DPR=1;
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var R=rng(5);
function ss(a,b,x){x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)}
function lerp(a,b,t){return a+(b-a)*t}
function v3(x,y,z){return new THREE.Vector3(x,y,z)}

// ---- digit atlas (Roboto Mono, 0-9) ----
var CELL=128,acv=document.createElement('canvas');acv.width=acv.height=CELL*4;
var atlas=new THREE.CanvasTexture(acv);atlas.flipY=false;atlas.minFilter=THREE.LinearMipmapLinearFilter;atlas.magFilter=THREE.LinearFilter;
function drawAtlas(){var g=acv.getContext('2d');g.clearRect(0,0,acv.width,acv.height);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='500 '+Math.round(CELL*.74)+'px "Roboto Mono", ui-monospace, monospace';for(var i=0;i<10;i++)g.fillText(String(i),(i%4)*CELL+CELL/2,Math.floor(i/4)*CELL+CELL/2+CELL*.03);atlas.needsUpdate=true;kick()}
drawAtlas();if(document.fonts&&document.fonts.load)document.fonts.load('500 64px "Roboto Mono"').then(drawAtlas,function(){});

// ---- city plan ----
var N=8,BL=12,RD=7.2,ST=BL+RD,EXT=N*ST-RD,H=EXT/2;
var ROADS=[];for(var i=0;i<=N;i++)ROADS.push(-H+i*ST-RD/2);
var S=v3(0,0,44); // street-level origin of the reveal
var pos=[],siz=[],bri=[],gly=[],groups=[];
function add(x,y,z,s,b){pos.push(x,y,z);siz.push(s);bri.push(b);gly.push(Math.floor(R()*10))}

var CW=.62,RH=.85,SZF=.5,boxes=[],parks={'2,5':1,'6,1':1};
function facade(cx,cz,w,d,h,rows){
  var bb=.56+R()*.2,bay=R()<.5?5:0;
  var F=[[cx-w/2,cz+d/2+.06,1,0,w],[cx+w/2+.06,cz+d/2,0,-1,d],[cx+w/2,cz-d/2-.06,-1,0,w],[cx-w/2-.06,cz-d/2,0,1,d]];
  var LIT=[1,.74,.42,.54];
  F.forEach(function(f,fi){
    var L=f[4],lit=LIT[fi],cols=Math.max(1,Math.floor(L/CW)),off=(L-(cols-1)*CW)/2;
    for(var pc=0;pc<cols;pc+=6)for(var pr=0;pr<rows;pr+=4){
      var st=pos.length/3;
      for(var c=pc;c<Math.min(cols,pc+6);c++){
        if(bay&&c%bay===bay-1)continue;
        for(var r=pr;r<Math.min(rows,pr+4);r++){var u=off+c*CW;add(f[0]+f[2]*u,1.6+r*RH+RH*.5,f[1]+f[3]*u,SZF,bb*lit*(r===rows-1?1.2:1))}
      }
      var n=pos.length/3-st;if(n)groups.push([st,n]);
    }
  });
  // roof edge
  var y=h+.1,step=.55,e=.08;
  for(var x=cx-w/2;x<=cx+w/2+.01;x+=step){add(x,y,cz-d/2-e,.46,.9);add(x,y,cz+d/2+e,.46,.9)}
  for(var z=cz-d/2+step;z<cz+d/2-.01;z+=step){add(cx-w/2-e,y,z,.46,.9);add(cx+w/2+e,y,z,.46,.9)}
  [[cx-w/2-e,cz-d/2-e],[cx+w/2+e,cz-d/2-e],[cx+w/2+e,cz+d/2+e],[cx-w/2-e,cz+d/2+e]].forEach(function(k){for(var yy=.5;yy<h;yy+=RH*.75)add(k[0],yy,k[1],.46,.92)});
}
for(var bx=0;bx<N;bx++)for(var bz=0;bz<N;bz++){
  var x0=-H+bx*ST,z0=-H+bz*ST;
  if(parks[bx+','+bz]){for(var px=x0+1;px<x0+BL;px+=1.2)for(var pz=z0+1;pz<z0+BL;pz+=1.2)add(px,.06,pz,.36,.14);continue}
  for(var sw=x0+.35;sw<=x0+BL-.34;sw+=.6){add(sw,.1,z0+.35,.36,.2);add(sw,.1,z0+BL-.35,.36,.2)}
  for(var sw2=z0+.95;sw2<=z0+BL-.94;sw2+=.6){add(x0+.35,.1,sw2,.36,.2);add(x0+BL-.35,.1,sw2,.36,.2)}
  var r=R(),parts;
  if(r<.3)parts=[[0,0,1,1]];else if(r<.7)parts=R()<.5?[[0,0,.5,1],[.5,0,.5,1]]:[[0,0,1,.5],[0,.5,1,.5]];else parts=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]];
  parts.forEach(function(p){
    if(parts.length>1&&R()<.08)return;
    var m=1.0,w=p[2]*(BL-1.4)-m,d=p[3]*(BL-1.4)-m,cx=x0+.7+(p[0]+p[2]/2)*(BL-1.4),cz=z0+.7+(p[1]+p[3]/2)*(BL-1.4);
    var dc=Math.hypot(cx,cz+8)/H,h=5+R()*6+Math.pow(Math.max(0,1-dc),1.7)*R()*34;if(Math.abs(cx)<16)h+=R()*8;
    var rows=Math.max(3,Math.floor((h-2)/RH));h=1.6+rows*RH+.4;
    boxes.push([cx,cz,w,d,h]);facade(cx,cz,w,d,h,rows);
  });
}
// streets: centre dashes, curbs, crosswalks; intersections left open
function inter(t){for(var j=0;j<=N;j++)if(Math.abs(t-ROADS[j])<RD/2+.3)return true;return false}
function road(ax,c,t,o,s,b){if(ax)add(t,.06,c+o,s,b);else add(c+o,.06,t,s,b)}
for(var ri=0;ri<=N;ri++){var c=ROADS[ri];
  for(var ax=0;ax<2;ax++)for(var t=-H-RD+.3,k=0;t<=H+RD;t+=.6,k++){
    if(inter(t))continue;
    if(ri>0&&ri<N){if(k%6<4)road(ax,c,t,0,.44,.5);if(k%6<2){road(ax,c,t,RD/4,.38,.26);road(ax,c,t,-RD/4,.38,.26)}}
    road(ax,c,t,RD/2-.35,.4,.3);road(ax,c,t,-RD/2+.35,.4,.3);
  }
}
for(var ii=1;ii<N;ii++)for(var jj=1;jj<N;jj++){
  [-1,1].forEach(function(sd){
    for(var kk=-4;kk<=4;kk++)for(var q=-.75;q<=.76;q+=.5){
      add(ROADS[ii]+sd*(RD/2+1.0)+q,.06,ROADS[jj]+kk*.62,.38,.36);
      add(ROADS[ii]+kk*.62,.06,ROADS[jj]+sd*(RD/2+1.0)+q,.38,.36);
    }
  });
}
var COUNT=pos.length/3;

// ---- materials ----
var MATS=[];
function digitMat(ink,hi){
  var m=new THREE.ShaderMaterial({
    uniforms:{uAtlas:{value:atlas},uPx:{value:500},uReveal:{value:80},uBand:{value:16},uTime:{value:0},uFogN:{value:40},uFogF:{value:140},uDpr:{value:1},uMaxPx:{value:40},uScale:{value:1},uMask:{value:0},uMaskK:{value:1},uS:{value:S},uCam:{value:v3(0,0,0)},uInk:{value:new THREE.Color(ink)},uHi:{value:new THREE.Color(hi)}},
    transparent:true,depthWrite:false,depthTest:true,
    vertexShader:'attribute float aSize;attribute float aBright;attribute float aGlyph;attribute float aBoost;uniform float uPx,uReveal,uBand,uTime,uFogN,uFogF,uDpr,uMaxPx,uScale;uniform vec3 uS,uCam;varying float vA;varying float vG;varying float vB;'+
      'void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;float d=max(-mv.z,.1);float sz=aSize*uScale*uPx/d;'+
      'float thr=distance(position.xz,uS.xz)+position.y*.5;float t=clamp((uReveal-thr)/uBand,0.,1.);float g=aGlyph;if(t<.999)g=mod(aGlyph+floor(uTime*8.+thr*1.7),10.);'+
      'vG=g;vB=aBoost;float fog=1.-.84*smoothstep(uFogN,uFogF,distance(position,uCam));'+
      'vA=min(1.,aBright*t*fog*smoothstep(1.2*uDpr,3.2*uDpr,sz)*(1.-smoothstep(9.*uDpr,15.*uDpr,sz))+aBoost*.4);gl_PointSize=min(sz*(.82+.18*t),uMaxPx);}',
    fragmentShader:'uniform sampler2D uAtlas;uniform vec3 uInk,uHi;uniform float uMask,uMaskK;varying float vA;varying float vG;varying float vB;'+
      'void main(){float c=mod(vG,4.);float r=floor((vG+.5)/4.);vec2 uv=(vec2(c,r)+gl_PointCoord)*.25;float a=texture2D(uAtlas,uv).a*vA;if(uMask>0.)a*=mix(1.,smoothstep(uMask*.72,uMask*1.04,gl_FragCoord.x),uMaskK);if(a<.015)discard;gl_FragColor=vec4(mix(uInk,uHi,vB),a);}'
  });
  MATS.push(m);return m;
}
var cityMat=digitMat(0xc9d2de,0xffffff);
var g=new THREE.BufferGeometry();
g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
g.setAttribute('aSize',new THREE.Float32BufferAttribute(siz,1));
g.setAttribute('aBright',new THREE.Float32BufferAttribute(bri,1));
var glyA=new THREE.Float32BufferAttribute(gly,1);glyA.setUsage(THREE.DynamicDrawUsage);g.setAttribute('aGlyph',glyA);
var booA=new THREE.Float32BufferAttribute(new Float32Array(COUNT),1);booA.setUsage(THREE.DynamicDrawUsage);g.setAttribute('aBoost',booA);
var city=new THREE.Points(g,cityMat);city.renderOrder=2;city.frustumCulled=false;
var scene=new THREE.Scene();scene.add(city);

// solid dark volumes so back façades are hidden and silhouettes stay clean
var box=new THREE.BoxGeometry(1,1,1),M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),VV=v3(0,0,0),SS=v3(1,1,1);
var vol=new THREE.InstancedMesh(box,new THREE.MeshBasicMaterial({color:0x030405}),boxes.length);
boxes.forEach(function(b,i){vol.setMatrixAt(i,M4.compose(VV.set(b[0],b[4]/2,b[1]),Q,SS.set(b[2],b[4],b[3])))});
vol.renderOrder=0;scene.add(vol);
var plates=new THREE.InstancedMesh(box,new THREE.MeshBasicMaterial({color:0x07080a}),N*N),pi=0;
for(var ax2=0;ax2<N;ax2++)for(var az2=0;az2<N;az2++)plates.setMatrixAt(pi++,M4.compose(VV.set(-H+ax2*ST+BL/2,.04,-H+az2*ST+BL/2),Q,SS.set(BL,.08,BL)));
scene.add(plates);

// ---- traffic: digit-built cars on lanes, signalised intersections, follow-the-leader ----
var LITE=(window.innerWidth||1200)<760;
function carTpl(){var P=[],s=.32,u,v,k;
  for(u=-1.95;u<=1.96;u+=.3)[-.9,.9].forEach(function(w){P.push([u,w,.4,s,.78]);P.push([u,w,.7,s,.92])});
  for(v=-.6;v<=.61;v+=.3)[-2.08,2.08].forEach(function(w){P.push([w,v,.4,s,.7]);P.push([w,v,.7,s,.85])});
  for(v=-.6;v<=.61;v+=.3){for(u=1.25;u<=1.96;u+=.3)P.push([u,v,.92,s,.66]);for(u=-1.95;u<=-1.5;u+=.3)P.push([u,v,.92,s,.6]);
    for(k=0;k<3;k++)P.push([1.05-k*.24,v,1.04+k*.15,s*.9,.36]);
    for(u=-.85;u<=.46;u+=.3)P.push([u,v,1.42,s,1]);
    for(k=0;k<2;k++)P.push([-1.25+k*.22,v,1.07+k*.17,s*.9,.36])}
  for(u=-1;u<=.76;u+=.3)[-.86,.86].forEach(function(w){P.push([u,w,1.16,s*.9,.4])});
  return P}
var CK=.78,CT_=carTpl().map(function(q){return [q[0]*CK,q[1]*CK,q[2]*CK,q[3]*.86,q[4]]}),CPN=CT_.length,TAIL=[[-2.12*CK,-.6*CK,.56*CK],[-2.12*CK,.6*CK,.56*CK]];
var LN=[.9,2.5],CARS=[],LANES=[];
function mkLane(ri,ax,o){var dir=ax?(o>0?1:-1):(o<0?1:-1);var L={ri:ri,ax:ax,c:ROADS[ri]+o,dir:dir,cars:[]};LANES.push(L);return L}
var MAIN=4,others=LITE?[2,6]:[1,2,3,5,6,7];
[-1,1].forEach(function(sd){mkLane(MAIN,0,sd*1.75)});
others.forEach(function(ri,k){[-1,1].forEach(function(sd){mkLane(ri,0,sd*LN[k%2])})});
for(var ci=1;ci<N;ci+=LITE?3:2)[-1,1].forEach(function(sd){mkLane(ci,1,sd*LN[ci%2])});
var END=H+RD+6;
LANES.forEach(function(L,li){var main=L.ri===MAIN&&!L.ax,n=main?(LITE?3:5):(LITE?1:2);
  var span=2*END,base=R()*span;
  for(var k=0;k<n;k++){var s=-END+((base+k*span/n+(R()-.5)*span/n*.5)%span+span)%span;
    var c={L:L,s:s,v:0,vmax:(main?4.6:4.2)+R()*1.8,brake:0,on:true,fade:1,mob:false};c.v=c.vmax*.8;L.cars.push(c);CARS.push(c)}
  L.cars.sort(function(x,y){return x.s-y.s})});
CARS.filter(function(c){return c.L.ri!==MAIN}).slice(0,4).forEach(function(c,i){c.mob=true;c.vmax=3.6+i*.25});
var NC=CARS.length,vpos=new Float32Array(NC*CPN*3),vbr=new Float32Array(NC*CPN),vsz=[],vgl=[],vbo=new Float32Array(NC*CPN);
for(var ci2=0;ci2<NC;ci2++)CT_.forEach(function(q){vsz.push(q[3]);vgl.push(Math.floor(R()*10))});
var vg=new THREE.BufferGeometry();
var vposA=new THREE.BufferAttribute(vpos,3);vposA.setUsage(THREE.DynamicDrawUsage);vg.setAttribute('position',vposA);
var vbrA=new THREE.BufferAttribute(vbr,1);vbrA.setUsage(THREE.DynamicDrawUsage);
vg.setAttribute('aSize',new THREE.Float32BufferAttribute(vsz,1));vg.setAttribute('aBright',vbrA);
vg.setAttribute('aGlyph',new THREE.Float32BufferAttribute(vgl,1));vg.setAttribute('aBoost',new THREE.BufferAttribute(vbo,1));
var vpts=new THREE.Points(vg,cityMat);vpts.frustumCulled=false;vpts.renderOrder=2;scene.add(vpts);
var tpos=new Float32Array(NC*2*3),tbr=new Float32Array(NC*2),tsz=[],tgl=[];for(var ti=0;ti<NC*2;ti++){tsz.push(.26);tgl.push(Math.floor(R()*10))}
var tg=new THREE.BufferGeometry();var tposA=new THREE.BufferAttribute(tpos,3);tposA.setUsage(THREE.DynamicDrawUsage);tg.setAttribute('position',tposA);
var tbrA=new THREE.BufferAttribute(tbr,1);tbrA.setUsage(THREE.DynamicDrawUsage);tg.setAttribute('aBright',tbrA);
tg.setAttribute('aSize',new THREE.Float32BufferAttribute(tsz,1));tg.setAttribute('aGlyph',new THREE.Float32BufferAttribute(tgl,1));tg.setAttribute('aBoost',new THREE.BufferAttribute(new Float32Array(NC*2),1));
var tailMat=null;
function green(ax,j,i2,t){var per=20,ph=((t+(i2*3.7+j*2.3))%per+per)%per;return ax?(ph>=14.5&&ph<18):(ph<12)}
function stepCars(t,dt){
  LANES.forEach(function(L){var cs=L.cars;cs.sort(function(x,y){return x.s-y.s});
    for(var k=cs.length-1;k>=0;k--){var c=cs[k],lead=k<cs.length-1?cs[k+1]:null;
      var gap=lead&&lead.on?lead.s-c.s-4.4:(cs.length>1?cs[0].s+2*END-c.s-4.4:1e9);
      var stopD=1e9,pos=c.s*L.dir;
      for(var jx=0;jx<=N;jx++){var ctr=ROADS[jx]*L.dir,line=ctr-(RD/2+2.3),d=line-(c.s+2.1);
        if(d<-.2||d>40)continue;
        var ok=green(L.ax,L.ax?L.ri:jx,L.ax?jx:L.ri,t);
        if(!ok&&d>c.v*c.v/12-.4)stopD=Math.min(stopD,d)}
      var room=Math.min(gap-(4+c.v*.9),stopD),vd=Math.max(0,Math.min(c.vmax,room*1.1));
      c.v=Math.max(0,c.v+Math.max(-6*dt,Math.min(2.2*dt,vd-c.v)));
      var bt=(vd<c.v-.05||c.v<.4)?1:0;c.brake+=Math.max(-dt*3,Math.min(dt*5,bt-c.brake));
      c.s+=c.v*dt;
      if(c.s>END){var first=cs[0];if(!first||first===c||first.s>-END+16){c.s=-END-(R()*6);c.v=c.vmax*.8}else c.s=END}
    }});
}
function placeCars(p){var o=0,ot=0;
  for(var i=0;i<NC;i++){var c=CARS[i],L=c.L,t0=c.s*L.dir,fx=L.ax?L.dir:0,fz=L.ax?0:L.dir,cx=L.ax?t0:L.c,cz=L.ax?L.c:t0;
    var e=Math.min(1,Math.max(0,(END-Math.abs(c.s))/10));e=e*e*(3-2*e);
    for(var q=0;q<CPN;q++){var T=CT_[q];vpos[o*3]=cx+fx*T[0]-fz*T[1];vpos[o*3+1]=T[2];vpos[o*3+2]=cz+fz*T[0]+fx*T[1];vbr[o]=T[4]*e;o++}
    for(var q2=0;q2<2;q2++){var T2=TAIL[q2];tpos[ot*3]=cx+fx*T2[0]-fz*T2[1];tpos[ot*3+1]=T2[2];tpos[ot*3+2]=cz+fz*T2[0]+fx*T2[1];tbr[ot]=c.brake*e*.95;ot++}
    if(c.dot){c.dot.position.set(cx,2.1,cz);c.dot.material.opacity=ss(.3,.48,p)*e}}
  vposA.needsUpdate=true;vbrA.needsUpdate=true;tposA.needsUpdate=true;tbrA.needsUpdate=true}
var VEH=CARS;
// ---- device nodes (Ekin red), paths along streets, pulses ----
var RED=0xFF3932;
var dotTex=(function(){var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d');x.fillStyle='#fff';x.beginPath();x.arc(32,32,26,0,Math.PI*2);x.fill();var t=new THREE.CanvasTexture(c);return t})();
function dot(sz){var m=new THREE.PointsMaterial({color:RED,size:sz,sizeAttenuation:false,map:dotTex,transparent:true,opacity:0,depthWrite:false});var gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3));var p=new THREE.Points(gg,m);p.frustumCulled=false;p.renderOrder=3;scene.add(p);return p}
var NODES=[[2,6],[4,7],[6,6],[1,3],[3,4],[5,3],[7,4],[2,1],[4,2],[6,1]].map(function(ij,i){
  var cx=ROADS[ij[0]],cz=ROADS[ij[1]],x=cx+RD/2+.7,z=cz+RD/2+.7;
  var pole=new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(x,0,z),v3(x,4.2,z)]),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0}));scene.add(pole);
  var rp=[];for(var a=0;a<=48;a++){var th=a/48*Math.PI*2;rp.push(v3(Math.cos(th)*1.7,0,Math.sin(th)*1.7))}
  var ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(rp),new THREE.LineBasicMaterial({color:RED,transparent:true,opacity:0}));ring.position.set(cx,.16,cz);scene.add(ring);
  var d=dot(10);d.position.set(x,4.4,z);
  return {i:ij[0],j:ij[1],c:v3(cx,.16,cz),pole:pole,ring:ring,dot:d,flash:0,idx:i};
});
var MDOT=VEH.filter(function(v){return v.mob}).map(function(v){v.dot=dot(8);return v});

var PATHS=[],seenP={};
NODES.forEach(function(a,ia){
  NODES.map(function(b,ib){return[ib,Math.abs(a.i-b.i)+Math.abs(a.j-b.j)]}).filter(function(x){return x[0]!==ia}).sort(function(p,q){return p[1]-q[1]}).slice(0,2).forEach(function(x){
    var key=Math.min(ia,x[0])+'-'+Math.max(ia,x[0]);if(seenP[key])return;seenP[key]=1;
    var b=NODES[x[0]],pts=[],y=.16;
    var xa=ROADS[a.i],za=ROADS[a.j],xb=ROADS[b.i],zb=ROADS[b.j],n,s;
    n=Math.max(1,Math.round(Math.abs(xb-xa)/.5));for(s=0;s<=n;s++)pts.push(v3(lerp(xa,xb,s/n),y,za));
    n=Math.max(1,Math.round(Math.abs(zb-za)/.5));for(s=1;s<=n;s++)pts.push(v3(xb,y,lerp(za,zb,s/n)));
    var len=Math.abs(xb-xa)+Math.abs(zb-za);
    var line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0}));line.renderOrder=1;line.visible=false;scene.add(line);
    PATHS.push({pts:pts,len:len,line:line,a:a,b:b,o1:R(),o2:R(),k:PATHS.length});
  });
});
// pulses: four red digits travelling along a path
var PU=PATHS.length,PL=3,ppos=new Float32Array(PU*PL*3),psz=[],pbr=[],pgl=[];
for(var pu=0;pu<PU*PL;pu++){psz.push(.7);pbr.push(.95-(pu%PL)*.3);pgl.push(Math.floor(R()*10))}
var pg=new THREE.BufferGeometry(),pposA=new THREE.BufferAttribute(ppos,3);pposA.setUsage(THREE.DynamicDrawUsage);pg.setAttribute('position',pposA);
pg.setAttribute('aSize',new THREE.Float32BufferAttribute(psz,1));var pbrA=new THREE.Float32BufferAttribute(pbr,1);pbrA.setUsage(THREE.DynamicDrawUsage);pg.setAttribute('aBright',pbrA);
pg.setAttribute('aGlyph',new THREE.Float32BufferAttribute(pgl,1));pg.setAttribute('aBoost',new THREE.BufferAttribute(new Float32Array(PU*PL),1));
var pulseMat=digitMat(RED,RED);var ppts=new THREE.Points(pg,pulseMat);ppts.frustumCulled=false;ppts.renderOrder=4;scene.add(ppts);
var PB=pbr.slice();
tailMat=digitMat(RED,RED);var tpts=new THREE.Points(tg,tailMat);tpts.frustumCulled=false;tpts.renderOrder=3;scene.add(tpts);
function pathAt(p,dist,out){var pts=p.pts,f=Math.max(0,Math.min(1,dist/p.len))*(pts.length-1),i=Math.floor(f),u=f-i,a=pts[i],b=pts[Math.min(pts.length-1,i+1)];out[0]=a.x+(b.x-a.x)*u;out[1]=a.y+.25;out[2]=a.z+(b.z-a.z)*u}

// ---- camera: street level -> elevated -> wide, one continuous path ----
var cam=new THREE.PerspectiveCamera(50,1,.5,1200);
var CP=new THREE.CatmullRomCurve3([v3(0,9.5,76),v3(48,42,92),v3(102,120,128)]);
var CT=new THREE.CatmullRomCurve3([v3(0,6.5,0),v3(0,5,-2),v3(0,0,-6)]);
var W=1,Hp=1,asp=1,mobile=false;
function size(){var w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;Hp=h;asp=w/h;mobile=w<760;DPR=Math.min(window.devicePixelRatio||1,mobile?1.5:1.75);gl.setPixelRatio(DPR);gl.setSize(w,h,false)}
size();
var tmp=[0,0,0],cp=v3(0,0,0),ct=v3(0,0,0);

// ---- brief localised data updates on façade patches ----
var UPD=[],nextUpd=1.2;
function startUpd(t){var gi=groups[Math.floor(Math.random()*groups.length)];UPD.push({g:gi,t0:t,last:-1})}
function runUpd(t){
  if(t>nextUpd&&UPD.length<1){startUpd(t);nextUpd=t+1.4+Math.random()*1.2}
  for(var u=UPD.length-1;u>=0;u--){
    var o=UPD[u],e=t-o.t0,st=o.g[0],n=o.g[1],done=e>1.6,b=done?0:Math.sin(Math.PI*e/1.6)*.5;
    for(var i=st;i<st+n;i++)booA.array[i]=b;
    booA.updateRange={offset:st,count:n};booA.needsUpdate=true;
    if(done)UPD.splice(u,1);
  }
}

function render(p,t,dt,stat){
  var s2=ss(.3,.6,p),s3=ss(.62,.92,p);
  // camera
  var e=p;CP.getPoint(e,cp);CT.getPoint(e,ct);
  var back=mobile?1+Math.max(0,1.05-asp)*.75:1;
  cp.sub(ct).multiplyScalar(back).add(ct);
  var dr=stat?0:(1-.6*p);cp.x+=Math.sin(t*.09)*.7*dr;cp.z+=Math.cos(t*.07)*.5*dr;
  cam.position.copy(cp);cam.lookAt(ct);
  cam.fov=lerp(mobile?62:56,mobile?44:38,ss(0,.6,p));cam.aspect=asp;
  var sh=lerp(.19,.2,ss(.3,1,p));
  if(mobile)cam.setViewOffset(W,Hp,0,-Hp*(W<641?lerp(.17,.13,p):lerp(.27,.22,p)),W,Hp);else cam.setViewOffset(W,Hp,-W*sh,0,W,Hp);
  cam.updateProjectionMatrix();
  var D=cp.distanceTo(ct),px=Hp*DPR/(2*Math.tan(cam.fov*Math.PI/360));
  var rev=stat?999:lerp(78,250,ss(.04,.7,p));
  MATS.forEach(function(m){var u=m.uniforms;u.uPx.value=px;u.uTime.value=t;u.uFogN.value=D*.45;u.uFogF.value=D*1.9;u.uDpr.value=DPR;u.uMaxPx.value=15*DPR;u.uScale.value=m===pulseMat?1.3:lerp(1,1.9,ss(.25,.9,p));u.uCam.value.copy(cp);u.uReveal.value=rev;u.uMask.value=(mobile||m===pulseMat)?0:W*DPR*.46;u.uMaskK.value=1-.55*ss(.25,.45,p)+.4*ss(.62,.85,p)});
  pulseMat.uniforms.uReveal.value=9999;
  // traffic
  if(!stat)stepCars(t,Math.min(dt,.05));placeCars(p);
  // nodes
  NODES.forEach(function(n,i){
    var k=ss(.28+i*.018,.4+i*.018,p);
    n.dot.material.opacity=k;n.pole.material.opacity=.4*k;
    n.flash=Math.max(0,n.flash-dt*1.4);
    n.ring.scale.setScalar(1+(1-n.flash)*.0+n.flash*.9);n.ring.material.opacity=k*(.32+.6*n.flash);
  });
  // paths + pulses
  var pk=ss(.4,.62,p);
  PATHS.forEach(function(pa,i){
    var k=Math.min(1,Math.max(0,pk*1.6-i*.04));
    pa.line.visible=k>.002;pa.line.geometry.setDrawRange(0,Math.round(pa.pts.length*k));pa.line.material.opacity=.5*k;
    [0].forEach(function(w){
      var base=i*PL,cyc=stat?-1:((t*(7/pa.len)+pa.o1*2.4)%(2.4-.6*s3)),on=k>=1&&cyc>=0&&cyc<=1;
      var prev=pa['c'+w]||0;if(on&&prev<1&&cyc<prev){} pa['c'+w]=cyc;
      if(on&&cyc>.985&&!pa['f'+w]){(w?pa.a:pa.b).flash=1;pa['f'+w]=1}if(cyc<.5)pa['f'+w]=0;
      for(var q=0;q<PL;q++){var o=(base+q)*3,d=(w?(1-cyc):cyc)*pa.len+(w?1:-1)*q*.8;
        if(on){pathAt(pa,d,tmp);ppos[o]=tmp[0];ppos[o+1]=tmp[1];ppos[o+2]=tmp[2];pbrA.array[base+q]=PB[base+q]}else{pbrA.array[base+q]=0}}
    });
  });
  pposA.needsUpdate=true;pbrA.needsUpdate=true;
  if(!stat)runUpd(t);
  gl.render(scene,cam);
}

var ps=0,t=0,last=0,running=false,visible=true,isReady=false;
function ready(){if(!isReady){isReady=true;setTimeout(function(){sec.classList.add('nh-live')},30)}}
if(reduced){
  var drawStatic=function(){size();render(.5,0,0,true)};
  drawStatic();ready();kick=function(){drawStatic()};
  new ResizeObserver(drawStatic).observe(stage);
  return;
}
function frame(now){
  if(!running)return;
  var dt=last?Math.min(.05,(now-last)/1000):0;last=now;t+=dt;
  ps+=(P-ps)*Math.min(1,dt*4);if(Math.abs(P-ps)<.0003)ps=P;
  render(ps,t,dt,false);ready();
  requestAnimationFrame(frame);
}
kick=function(){if(!running&&visible&&!document.hidden){running=true;last=0;requestAnimationFrame(frame)}};
new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)kick();else running=false}).observe(sec);
document.addEventListener('visibilitychange',function(){if(document.hidden)running=false;else kick()});
new ResizeObserver(function(){size();kick()}).observe(stage);
ps=P;render(ps,0,0,false);ready();kick();
window.__nhPreview=function(p){P=ps=p;setScene(p<B[1]?0:p<B[2]?1:2);render(p,6,0,false)};
}
})();
