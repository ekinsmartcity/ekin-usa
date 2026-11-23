(function(){
'use strict';
var sec=document.getElementById('top');
if(!sec||!sec.classList.contains('ekh'))return;
var viz=sec.querySelector('.ekh-viz'),canvas=document.getElementById('ekhCanvas'),osEl=sec.querySelector('.ekh-os'),legend=sec.querySelector('.ekh-legend');
var scenes=[].slice.call(sec.querySelectorAll('.ekh-scene')),steps=[].slice.call(sec.querySelectorAll('.ekh-steps button'));
var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
var B=[0,.3,.64,1.0001],GO=[0,.47,1],cur=0,P=0;

scenes.forEach(function(s,j){if(j){s.setAttribute('aria-hidden','true');s.setAttribute('inert','')}});
var copy=sec.querySelector('.ekh-copy'),lines=[].slice.call(sec.querySelectorAll('.ekh-h .l'));
function fit(){copy.style.removeProperty('--ekh-fs');var cs=getComputedStyle(copy),w=copy.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),fs=parseFloat(getComputedStyle(lines[0]).fontSize),mx=0;lines.forEach(function(l){var r=document.createRange();r.selectNodeContents(l);mx=Math.max(mx,r.getBoundingClientRect().width)});if(mx>w*.98)copy.style.setProperty('--ekh-fs',Math.floor(fs*w*.96/mx)+'px')}
fit();addEventListener('resize',fit);if(document.fonts)document.fonts.ready.then(fit);
function setScene(i){
  if(i===cur)return;cur=i;
  scenes.forEach(function(s,j){var on=j===i;s.classList.toggle('is-on',on);if(on){s.removeAttribute('aria-hidden');s.removeAttribute('inert')}else{s.setAttribute('aria-hidden','true');s.setAttribute('inert','')}});
  steps.forEach(function(b,j){b.setAttribute('aria-current',j===i?'step':'false')});
}
function progress(){var r=sec.getBoundingClientRect(),range=r.height-innerHeight;if(range<=0)return 0;return Math.min(1,Math.max(0,-r.top/range))}
function onScroll(){
  P=progress();setScene(P<B[1]?0:P<B[2]?1:2);
  steps.forEach(function(b,j){var f=Math.min(1,Math.max(0,(P-B[j])/(B[j+1]-B[j])));b.style.setProperty('--f',f.toFixed(3))});
  kick();
}
steps.forEach(function(b,j){b.addEventListener('click',function(){var r=sec.getBoundingClientRect(),range=r.height-innerHeight;window.scrollTo({top:scrollY+r.top+GO[j]*range+(j?2:0),behavior:reduced?'auto':'smooth'})})});

function makeStatic(){sec.classList.add('ekh-static');if(legend)legend.classList.add('on');if(osEl)osEl.classList.add('on')}
function fail(){sec.classList.add('ekh-nogl');makeStatic()}
var kick=function(){};
if(reduced)makeStatic();else{addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll)}

var THREE=window.THREE;
if(!THREE){fail();return}
try{build()}catch(e){console.warn('ekh',e);fail()}

function build(){
var gl=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
gl.setClearColor(0x000000,1);
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var R=rng(11);
function ss(a,b,x){x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)}
function lerp(a,b,t){return a+(b-a)*t}

var scene=new THREE.Scene();scene.fog=new THREE.Fog(0x000000,300,470);
scene.add(new THREE.HemisphereLight(0xa3abb5,0x050506,.62));
var sun=new THREE.DirectionalLight(0xffffff,.62);sun.position.set(70,120,25);scene.add(sun);

var N=8,BL=12,RD=5,ST=BL+RD,EXT=N*ST-RD,H=EXT/2;
var ROADS=[];for(var i=1;i<N;i++)ROADS.push(-H+i*ST-RD/2);

var ground=new THREE.Mesh(new THREE.PlaneGeometry(700,700),new THREE.MeshBasicMaterial({color:0x07080a}));ground.rotation.x=-Math.PI/2;scene.add(ground);
var asphalt=new THREE.Mesh(new THREE.PlaneGeometry(EXT+RD*2,EXT+RD*2),new THREE.MeshBasicMaterial({color:0x111316}));asphalt.rotation.x=-Math.PI/2;asphalt.position.y=.02;scene.add(asphalt);

var box=new THREE.BoxGeometry(1,1,1),M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),S=new THREE.Vector3();
var walks=new THREE.InstancedMesh(box,new THREE.MeshLambertMaterial({color:0x1a1c20}),N*N);
var lots=[],k=0;
for(var bx=0;bx<N;bx++)for(var bz=0;bz<N;bz++){
  var x0=-H+bx*ST,z0=-H+bz*ST;
  walks.setMatrixAt(k++,M4.compose(V.set(x0+BL/2,.18,z0+BL/2),Q,S.set(BL,.36,BL)));
  var r=R(),parts;
  if(r<.32)parts=[[0,0,1,1]];else if(r<.72)parts=R()<.5?[[0,0,.5,1],[.5,0,.5,1]]:[[0,0,1,.5],[0,.5,1,.5]];else parts=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]];
  parts.forEach(function(p){
    if(R()<.07)return;
    var m=.9,w=p[2]*(BL-1.6)-m,d=p[3]*(BL-1.6)-m,cx=x0+.8+(p[0]+p[2]/2)*(BL-1.6),cz=z0+.8+(p[1]+p[3]/2)*(BL-1.6);
    var dc=Math.hypot(cx,cz)/(H*1.05),h=2.6+R()*5+Math.pow(Math.max(0,1-dc),2.1)*R()*34;
    lots.push([cx,cz,w,d,h]);
  });
}
scene.add(walks);
var bmat=new THREE.MeshLambertMaterial({color:0x25282d});
var blds=new THREE.InstancedMesh(box,bmat,lots.length);
var ep=new Float32Array(lots.length*24*3),ei=0;
function seg(a,b){ep[ei++]=a[0];ep[ei++]=a[1];ep[ei++]=a[2];ep[ei++]=b[0];ep[ei++]=b[1];ep[ei++]=b[2]}
lots.forEach(function(l,i){
  var y0=.36,y1=.36+l[4];
  blds.setMatrixAt(i,M4.compose(V.set(l[0],(y0+y1)/2,l[1]),Q,S.set(l[2],l[4],l[3])));
  var xa=l[0]-l[2]/2,xb=l[0]+l[2]/2,za=l[1]-l[3]/2,zb=l[1]+l[3]/2;
  var c=[[xa,za],[xb,za],[xb,zb],[xa,zb]];
  for(var j=0;j<4;j++){var a=c[j],b=c[(j+1)%4];seg([a[0],y1,a[1]],[b[0],y1,b[1]]);seg([a[0],y0,a[1]],[b[0],y0,b[1]]);seg([a[0],y0,a[1]],[a[0],y1,a[1]])}
});
scene.add(blds);
var eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.BufferAttribute(ep,3));
var emat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.1});
scene.add(new THREE.LineSegments(eg,emat));

var dmat=new THREE.LineDashedMaterial({color:0x34383f,dashSize:1.6,gapSize:1.5});
ROADS.forEach(function(c){
  [[[-H-RD,0,c],[H+RD,0,c]],[[c,0,-H-RD],[c,0,H+RD]]].forEach(function(pp){
    var g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(pp[0][0],.06,pp[0][2]),new THREE.Vector3(pp[1][0],.06,pp[1][2])]);
    var l=new THREE.Line(g,dmat);l.computeLineDistances();scene.add(l);
  });
});

var RED=0xFF3932;
var outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1,-1],[1,-1],[1,1],[-1,1]].map(function(q){return new THREE.Vector3(q[0]*(H+RD),.08,q[1]*(H+RD))})),new THREE.LineBasicMaterial({color:RED,transparent:true,opacity:0}));
scene.add(outline);

// fixed device locations (abstract markers, not product renders)
var FIX=[],used={};
var picks=[[1,1],[3,0],[5,1],[0,3],[2,3],[4,4],[6,3],[1,5],[3,6],[5,5],[6,6],[2,1]];
picks.forEach(function(p,i){
  var sx=R()<.5?-1:1,sz=R()<.5?-1:1,x=ROADS[p[0]]+sx*(RD/2+.7),z=ROADS[p[1]]+sz*(RD/2+.7);
  var g=new THREE.Group();g.position.set(x,0,z);
  var lm=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.55});
  var pole=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,5,0)]),lm);g.add(pole);
  var hm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0});
  var head=new THREE.Mesh(new THREE.SphereGeometry(.55,14,10),hm);head.position.y=5;g.add(head);
  var rm=new THREE.MeshBasicMaterial({color:RED,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
  var ring=new THREE.Mesh(new THREE.RingGeometry(1,1.16,40),rm);ring.rotation.x=-Math.PI/2;ring.position.y=.42;g.add(ring);
  g.visible=false;scene.add(g);
  FIX.push({g:g,head:head,pole:pole,lm:lm,hm:hm,rm:rm,ring:ring,top:new THREE.Vector3(x,5,z)});
});

// traffic; some vehicles are mobile devices
var VEH=[],vgeo=new THREE.BoxGeometry(2.1,.8,1.05),tmat=new THREE.MeshLambertMaterial({color:0x4a4f57});
for(var vi=0;vi<20;vi++){
  var dev=vi<6,axis=vi%2?'x':'z',road=ROADS[Math.floor(R()*ROADS.length)],dir=R()<.5?1:-1;
  var mat=dev?new THREE.MeshLambertMaterial({color:0x4a4f57}):tmat;
  var mesh=new THREE.Mesh(vgeo,mat);if(axis==='z')mesh.rotation.y=Math.PI/2;scene.add(mesh);
  var v={dev:dev,axis:axis,lane:road+dir*1.2,dir:dir,speed:3+R()*3.5,pos:-H-RD+R()*(EXT+RD*2),mesh:mesh,mat:mat,p:new THREE.Vector3()};
  if(dev){
    v.dm=new THREE.MeshBasicMaterial({color:RED,transparent:true,opacity:0});
    v.dot=new THREE.Mesh(new THREE.SphereGeometry(.42,12,8),v.dm);scene.add(v.dot);
  }
  VEH.push(v);
}
var MOB=VEH.filter(function(v){return v.dev});

// arcs
var SEG=32;
function arc(mat){var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array((SEG+1)*3),3));var l=new THREE.Line(g,mat);l.frustumCulled=false;l.visible=false;scene.add(l);l.userData.m=[0,0,0];return l}
function setArc(l,a,b,lift){
  var p=l.geometry.attributes.position.array,m=l.userData.m;m[0]=(a.x+b.x)/2;m[1]=Math.max(a.y,b.y)+lift;m[2]=(a.z+b.z)/2;l.userData.a=a;l.userData.b=b;
  for(var i=0;i<=SEG;i++){var t=i/SEG,u=1-t;p[i*3]=u*u*a.x+2*u*t*m[0]+t*t*b.x;p[i*3+1]=u*u*a.y+2*u*t*m[1]+t*t*b.y;p[i*3+2]=u*u*a.z+2*u*t*m[2]+t*t*b.z}
  l.geometry.attributes.position.needsUpdate=true;
}
function arcAt(l,t,o){var a=l.userData.a,b=l.userData.b,m=l.userData.m,u=1-t;return o.set(u*u*a.x+2*u*t*m[0]+t*t*b.x,u*u*a.y+2*u*t*m[1]+t*t*b.y,u*u*a.z+2*u*t*m[2]+t*t*b.z)}
function draw(l,k){l.visible=k>.002;l.geometry.setDrawRange(0,Math.round((SEG+1)*Math.min(1,k)))}
var pgeo=new THREE.SphereGeometry(.34,10,8);
function pulse(mat){var m=new THREE.Mesh(pgeo,mat);m.visible=false;scene.add(m);return m}

var netMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0});
var netPM=new THREE.MeshBasicMaterial({color:RED,transparent:true,opacity:0});
var NET=[],seen={};
FIX.forEach(function(f,i){
  FIX.map(function(g,j){return[j,f.top.distanceTo(g.top)]}).filter(function(d){return d[0]!==i}).sort(function(a,b){return a[1]-b[1]}).slice(0,2).forEach(function(d){
    var key=Math.min(i,d[0])+'-'+Math.max(i,d[0]);if(seen[key])return;seen[key]=1;
    var l=arc(netMat);setArc(l,f.top,FIX[d[0]].top,d[1]*.2);NET.push({l:l,p:pulse(netPM),off:R(),sp:.22+R()*.12,idx:Math.min(i,d[0])});
  });
});
var MNET=MOB.map(function(v){return{l:arc(netMat),p:pulse(netPM),off:R(),sp:.35+R()*.15,v:v}});

var HUB=new THREE.Vector3(0,27,0);
var hubG=new THREE.Group();hubG.position.copy(HUB);
var hrm=new THREE.MeshBasicMaterial({color:RED,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
var hring=new THREE.Mesh(new THREE.RingGeometry(2.3,2.55,56),hrm);hring.rotation.x=-Math.PI/2;hubG.add(hring);
var hcm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0});
hubG.add(new THREE.Mesh(new THREE.SphereGeometry(.8,16,12),hcm));
var hstem=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0});
var stem=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-27,0),new THREE.Vector3(0,-1,0)]),hstem);hubG.add(stem);
scene.add(hubG);
var hubMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0});
var hubPM=new THREE.MeshBasicMaterial({color:RED,transparent:true,opacity:0});
var HUBL=FIX.map(function(f,i){var l=arc(hubMat);setArc(l,f.top,HUB,7);return{l:l,p:pulse(hubPM),off:R(),sp:.28+R()*.1,i:i}});
var HUBM=MOB.map(function(v,i){return{l:arc(hubMat),p:pulse(hubPM),off:R(),sp:.32+R()*.1,v:v,i:FIX.length+i}});

var cam=new THREE.OrthographicCamera(-1,1,1,-1,1,1200),TGT=new THREE.Vector3(),asp=1,W=0,Hh=0;
function size(){var w=viz.clientWidth,h=viz.clientHeight;if(!w||!h)return;W=w;Hh=h;gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));gl.setSize(w,h,false);asp=w/h}
size();
var tv=new THREE.Vector3();
function render(p,t,dt){
  var s1=ss(.14,.38,p),net=ss(.26,.44,p)*(1-.8*ss(.64,.82,p)),s3=ss(.6,.88,p);
  VEH.forEach(function(v){
    v.pos+=v.dir*v.speed*dt;var lim=H+RD;if(v.pos>lim)v.pos=-lim;else if(v.pos<-lim)v.pos=lim;
    if(v.axis==='x')v.p.set(v.pos,.62,v.lane);else v.p.set(v.lane,.62,v.pos);
    v.mesh.position.copy(v.p);
    if(v.dev){var c=lerp(.29,.92,s1);v.mat.color.setRGB(c,c*1.01,c*1.03);v.dot.position.set(v.p.x,2.3,v.p.z);v.dm.opacity=s1;v.dot.visible=s1>.01;v.top=v.top||new THREE.Vector3();v.top.set(v.p.x,2.3,v.p.z)}
  });
  FIX.forEach(function(f,i){
    var k=ss(.14+i*.016,.28+i*.016,p);f.g.visible=k>.002;if(!f.g.visible)return;
    f.pole.scale.y=Math.max(.001,k);f.hm.opacity=k;f.head.position.y=5*k;f.lm.opacity=.5*k;
    var ph=(t*.26+i*.137)%1;f.ring.scale.setScalar(.7+ph*2.1);f.rm.opacity=k*(1-ph)*.5*(1-.5*s3);
  });
  netMat.opacity=.2*net;netPM.opacity=net;
  NET.forEach(function(n){var k=net*1.25-n.idx*.02;draw(n.l,k);n.p.visible=k>=1&&net>.05;if(n.p.visible)arcAt(n.l,(t*n.sp+n.off)%1,n.p.position)});
  MNET.forEach(function(n){
    var best=null,bd=1e9;FIX.forEach(function(f){var d=f.top.distanceTo(n.v.top);if(d<bd){bd=d;best=f}});
    setArc(n.l,n.v.top,best.top,bd*.2);draw(n.l,net*1.2);n.p.visible=net>.6;if(n.p.visible)arcAt(n.l,(t*n.sp+n.off)%1,n.p.position);
  });
  hubG.visible=s3>.002;hrm.opacity=.9*s3;hcm.opacity=s3;hstem.opacity=.18*s3;
  hubMat.opacity=.24*s3;hubPM.opacity=s3;
  HUBL.forEach(function(h){var k=ss(.6+h.i*.011,.78+h.i*.011,p);draw(h.l,k);h.p.visible=k>.98;if(h.p.visible)arcAt(h.l,(t*h.sp+h.off)%1,h.p.position)});
  HUBM.forEach(function(h){var k=ss(.6+h.i*.011,.78+h.i*.011,p);setArc(h.l,h.v.top,HUB,7);draw(h.l,k);h.p.visible=k>.98;if(h.p.visible)arcAt(h.l,(t*h.sp+h.off)%1,h.p.position)});
  outline.material.opacity=.5*s3;emat.opacity=.1+.05*s3;
  if(legend)legend.classList.toggle('on',p>.24||reduced);
  if(osEl)osEl.classList.toggle('on',p>.74||reduced);
  var zoom=.3*s1+.7*s3,F=lerp(Math.max(44,52/asp),Math.max(62,90/asp),zoom)*(1+.012*Math.sin(t*.18));
  var theta=Math.PI/4+.035*Math.sin(t*.06)+p*.34,phi=.6+.22*s3,Rr=320;
  TGT.set(0,lerp(0,4,s3),0);
  cam.position.set(TGT.x+Math.cos(theta)*Math.cos(phi)*Rr,TGT.y+Math.sin(phi)*Rr,TGT.z+Math.sin(theta)*Math.cos(phi)*Rr);
  cam.lookAt(TGT);var ox=F*asp*(W>700?.1:0)*s3,oy=F*(.1+.06*s3);cam.left=-F*asp+ox;cam.right=F*asp+ox;cam.top=F+oy;cam.bottom=-F+oy;cam.updateProjectionMatrix();
  gl.render(scene,cam);
}

var ps=0,t=0,last=0,running=false,visible=true,readyDone=false;
function ready(){if(!readyDone){readyDone=true;setTimeout(function(){sec.classList.add('is-ready')},30)}}
if(reduced){
  render(.92,0,0);ready();
  new ResizeObserver(function(){size();render(.92,0,0)}).observe(viz);
  return;
}
function frame(now){
  if(!running)return;
  var dt=last?Math.min(.05,(now-last)/1000):0;last=now;t+=dt;
  ps+=(P-ps)*Math.min(1,dt*4.2);if(Math.abs(P-ps)<.0004)ps=P;
  render(ps,t,dt);ready();
  requestAnimationFrame(frame);
}
kick=function(){if(!running&&visible&&!document.hidden){running=true;last=0;requestAnimationFrame(frame)}};
new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)kick();else running=false}).observe(sec);
document.addEventListener('visibilitychange',function(){if(document.hidden)running=false;else kick()});
new ResizeObserver(function(){size();if(!running)kick()}).observe(viz);
onScroll();ps=P;render(ps,0,0);ready();kick();
window.__ekhPreview=function(p){P=ps=p;setScene(p<B[1]?0:p<B[2]?1:2);render(p,4,0)};
}
})();
