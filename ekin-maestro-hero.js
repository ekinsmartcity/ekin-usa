(function(){
// Maestro OS hero: a live isometric city drawn in 3D-ish wireframe, with vehicles on
// the grid, drones overhead, and streams of data digits rising off both into Maestro.
var cv=document.getElementById('maestroHero'); if(!cv) return;
var ctx=cv.getContext('2d');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var DPR=Math.min(window.devicePixelRatio||1,2), W=0, H=0;
function rnd(a,b){return a+Math.random()*(b-a)}

var BLOCK=15, ROAD=7, STEP=BLOCK+ROAD, N=8;
var ORG=-((N*STEP-ROAD)/2), HALF=(N*STEP-ROAD)/2;

// ---- city: extruded blocks kept as line boxes ----
var BLD=[];
for(var i=0;i<N;i++)for(var j=0;j<N;j++){
  if(Math.random()<0.2) continue;
  var bx=ORG+i*STEP+BLOCK/2, bz=ORG+j*STEP+BLOCK/2;
  var q=Math.hypot(i-(N-1)/2,j-(N-1)/2)/((N-1)/2);
  var n=Math.random()<0.55?1:2;
  for(var k=0;k<n;k++){
    var w=BLOCK*rnd(.3,.46), d=BLOCK*rnd(.3,.46);
    BLD.push({x:bx+rnd(-BLOCK*.24,BLOCK*.24), z:bz+rnd(-BLOCK*.24,BLOCK*.24),
      w:w, d:d, h:(3+Math.pow(1-Math.min(1,q),1.6)*rnd(8,34)),
      lit:Math.random()<0.55});
  }
}
BLD.sort(function(a,b){return (a.x+a.z)-(b.x+b.z)});

// ---- devices: the nodes that emit data ----
var DEVS=[];
for(var d=0;d<7;d++){
  var gi=Math.floor(rnd(0,N)), gj=Math.floor(rnd(0,N));
  DEVS.push({x:ORG+gi*STEP+BLOCK/2, z:ORG+gj*STEP-ROAD/2, h:rnd(11,20)});
}

// ---- vehicles travelling the road grid ----
var CARS=[];
for(var c=0;c<26;c++){
  var alongX=Math.random()<0.5, lane=Math.floor(rnd(0,N));
  CARS.push({ax:alongX, p:ORG+lane*STEP-ROAD*(Math.random()<.5?.35:.65),
    t:rnd(-HALF,HALF), v:rnd(7,15)*(Math.random()<.5?1:-1), accent:Math.random()<.2});
}

// ---- drones ----
var DRN=[];
for(var q2=0;q2<6;q2++){
  DRN.push({cx:rnd(-HALF*.8,HALF*.8), cz:rnd(-HALF*.8,HALF*.8), y:rnd(34,52),
    a:rnd(0,6.28), r:rnd(16,34), sp:rnd(.10,.22)*(Math.random()<.5?1:-1), ph:rnd(0,6.28)});
}

// ---- rising data glyphs ----
var HUB={x:0,y:82,z:0};
var STREAM=[];
for(var s=0;s<260;s++){
  var src=Math.random()<0.55?DEVS[Math.floor(Math.random()*DEVS.length)]:null;
  STREAM.push({src:src, x:src?src.x:rnd(-HALF,HALF), z:src?src.z:rnd(-HALF,HALF),
    t:Math.random(), sp:rnd(.06,.16), g:Math.floor(rnd(0,10)), sway:rnd(.5,2.4), y0:src?src.h:1});
}

var COS=Math.cos(Math.PI/6), SIN=Math.sin(Math.PI/6);
var cam={rot:0, s:1};
function resize(){
  var r=cv.getBoundingClientRect();
  W=r.width;H=r.height;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
function base(){ return Math.min(W*0.82,H*1.5)/(N*STEP*0.72) }
function proj(x,y,z){
  var ca=Math.cos(cam.rot), sa=Math.sin(cam.rot);
  var rx=x*ca-z*sa, rz=x*sa+z*ca;
  var S=base();
  return [W*0.5+(rx-rz)*COS*S, H*0.62+((rx+rz)*SIN-y)*S];
}
function line(a,b,col,wd){
  ctx.strokeStyle=col;ctx.lineWidth=wd||1;
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
}
var t0=performance.now();
function frame(now){
  var r=cv.getBoundingClientRect();
  if(!W||!H||Math.round(r.width*DPR)!==cv.width||Math.round(r.height*DPR)!==cv.height) resize();
  if(!W||!H){requestAnimationFrame(frame);return}
  var dt=Math.min(0.05,(now-t0)/1000); t0=now;
  if(!reduce) cam.rot+=dt*0.035;
  ctx.clearRect(0,0,W,H);
  var S=base();

  // ground grid
  ctx.lineWidth=1;
  for(var g=0;g<=N;g++){
    var a=ORG+g*STEP-ROAD/2;
    line(proj(a,0,-HALF),proj(a,0,HALF),'rgba(120,145,190,.13)');
    line(proj(-HALF,0,a),proj(HALF,0,a),'rgba(120,145,190,.13)');
  }

  // buildings as light boxes
  for(var bi=0;bi<BLD.length;bi++){
    var b=BLD[bi];
    var x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
    var c0=proj(x0,0,z0),c1=proj(x1,0,z0),c2=proj(x1,0,z1),c3=proj(x0,0,z1);
    var t0p=proj(x0,b.h,z0),t1=proj(x1,b.h,z0),t2=proj(x1,b.h,z1),t3=proj(x0,b.h,z1);
    // faces
    ctx.fillStyle='rgba(12,16,24,.72)';
    ctx.beginPath();ctx.moveTo(c1[0],c1[1]);ctx.lineTo(c2[0],c2[1]);ctx.lineTo(t2[0],t2[1]);ctx.lineTo(t1[0],t1[1]);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(18,24,34,.66)';
    ctx.beginPath();ctx.moveTo(c0[0],c0[1]);ctx.lineTo(c1[0],c1[1]);ctx.lineTo(t1[0],t1[1]);ctx.lineTo(t0p[0],t0p[1]);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(26,34,48,.8)';
    ctx.beginPath();ctx.moveTo(t0p[0],t0p[1]);ctx.lineTo(t1[0],t1[1]);ctx.lineTo(t2[0],t2[1]);ctx.lineTo(t3[0],t3[1]);ctx.closePath();ctx.fill();
    // edges
    var ec=b.lit?'rgba(150,178,224,.42)':'rgba(120,145,190,.22)';
    line(t0p,t1,ec);line(t1,t2,ec);line(t2,t3,ec);line(t3,t0p,ec);
    line(c1,t1,ec);line(c2,t2,ec);line(c0,t0p,ec);
    // window rows
    if(b.lit){
      var rows=Math.max(1,Math.floor(b.h/4));
      for(var rr=1;rr<rows;rr++){
        var yy=b.h*rr/rows;
        line(proj(x1,yy,z0),proj(x1,yy,z1),'rgba(160,190,240,.14)');
      }
    }
  }

  // vehicles
  for(var ci=0;ci<CARS.length;ci++){
    var car=CARS[ci];
    if(!reduce) car.t+=car.v*dt;
    if(car.t>HALF+6) car.t=-HALF-6; if(car.t<-HALF-6) car.t=HALF+6;
    var px=car.ax?car.t:car.p, pz=car.ax?car.p:car.t;
    var p0=proj(px,0.4,pz);
    ctx.fillStyle=car.accent?'rgba(255,57,50,.95)':'rgba(214,228,250,.85)';
    ctx.beginPath();ctx.ellipse(p0[0],p0[1],2.6*S*0.5+1.6,1.5*S*0.35+1.1,0,0,6.283);ctx.fill();
    // motion trail
    var pt=proj(px-(car.ax?Math.sign(car.v)*4:0),0.4,pz-(car.ax?0:Math.sign(car.v)*4));
    line(p0,pt,car.accent?'rgba(255,57,50,.35)':'rgba(190,212,245,.28)',1);
  }

  // drones
  for(var di=0;di<DRN.length;di++){
    var dr=DRN[di];
    if(!reduce) dr.a+=dr.sp*dt;
    var dx=dr.cx+Math.cos(dr.a)*dr.r, dz=dr.cz+Math.sin(dr.a)*dr.r;
    var dy=dr.y+Math.sin(now/900+dr.ph)*1.6;
    var pd=proj(dx,dy,dz), pg=proj(dx,0.2,dz);
    line(pd,pg,'rgba(120,145,190,.16)');
    var arm=Math.max(3,S*1.5);
    ctx.strokeStyle='rgba(200,220,250,.75)';ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(pd[0]-arm,pd[1]-arm*0.5);ctx.lineTo(pd[0]+arm,pd[1]+arm*0.5);
    ctx.moveTo(pd[0]+arm,pd[1]-arm*0.5);ctx.lineTo(pd[0]-arm,pd[1]+arm*0.5);
    ctx.stroke();
    var blink=0.5+0.5*Math.sin(now/260+dr.ph);
    ctx.fillStyle='rgba(255,57,50,'+(0.35+0.55*blink).toFixed(2)+')';
    ctx.beginPath();ctx.arc(pd[0],pd[1],2.2,0,6.283);ctx.fill();
  }

  // device masts
  for(var vi=0;vi<DEVS.length;vi++){
    var dv=DEVS[vi];
    var top=proj(dv.x,dv.h,dv.z), bot=proj(dv.x,0,dv.z);
    line(bot,top,'rgba(170,196,240,.5)',1.2);
    ctx.fillStyle='rgba(255,57,50,.9)';
    ctx.beginPath();ctx.arc(top[0],top[1],2.4,0,6.283);ctx.fill();
  }

  // rising data glyphs, drawn toward the Maestro hub
  ctx.font='500 '+Math.max(9,Math.min(15,S*1.5)).toFixed(1)+'px "Roboto Mono", ui-monospace, monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  var tick=Math.floor(now/380);
  for(var si=0;si<STREAM.length;si++){
    var st=STREAM[si];
    if(!reduce) st.t+=st.sp*dt;
    if(st.t>1){st.t=0}
    var e=st.t;
    var y=st.y0+(HUB.y-st.y0)*e;
    var x=st.x+(HUB.x-st.x)*Math.pow(e,2.0)+Math.sin(now/1200+si)*st.sway*(1-e);
    var z=st.z+(HUB.z-st.z)*Math.pow(e,2.0);
    var pp=proj(x,y,z);
    var a=(1-Math.abs(e-0.45)*1.35)*0.85;
    if(a<=0.02) continue;
    ctx.fillStyle=(si%9===0?'rgba(255,57,50,':'rgba(186,206,238,')+a.toFixed(3)+')';
    ctx.fillText(String((st.g+tick+si)%10),pp[0],pp[1]);
  }

  // hub glow where the data converges
  var hp=proj(HUB.x,HUB.y,HUB.z);
  var grd=ctx.createRadialGradient(hp[0],hp[1],0,hp[0],hp[1],Math.max(60,S*22));
  grd.addColorStop(0,'rgba(255,57,50,.30)');
  grd.addColorStop(0.45,'rgba(255,57,50,.08)');
  grd.addColorStop(1,'rgba(255,57,50,0)');
  ctx.fillStyle=grd;
  ctx.beginPath();ctx.arc(hp[0],hp[1],Math.max(60,S*22),0,6.283);ctx.fill();

  requestAnimationFrame(frame);
}
resize();
frame(performance.now());
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',function(){ if(!document.hidden){resize();frame(performance.now())} });
})();
