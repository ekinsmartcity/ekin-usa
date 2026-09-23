(function(){
// "One ecosystem, 100% city coverage" — a live isometric wire-city in Ekin CI colors:
// connected Ekin nodes on the grid, coverage rings, and links converging on Maestro.
var cv=document.getElementById('cmEco'); if(!cv) return;
var ctx=cv.getContext('2d');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var DPR=Math.min(window.devicePixelRatio||1,2), W=0, H=0;
var RED='255,57,50';
var LOGO=new Image(); LOGO.src='images/hero/maestro-logo.png'; var LOGO_OK=false;
LOGO.onload=function(){LOGO_OK=true};
function rnd(a,b){return a+Math.random()*(b-a)}

var BLOCK=15, ROAD=7, STEP=BLOCK+ROAD, N=7;
var ORG=-((N*STEP-ROAD)/2), HALF=(N*STEP-ROAD)/2;

var BLD=[];
for(var i=0;i<N;i++)for(var j=0;j<N;j++){
  if(Math.random()<0.22) continue;
  var bx=ORG+i*STEP+BLOCK/2, bz=ORG+j*STEP+BLOCK/2;
  var q=Math.hypot(i-(N-1)/2,j-(N-1)/2)/((N-1)/2);
  BLD.push({x:bx+rnd(-3,3), z:bz+rnd(-3,3), w:BLOCK*rnd(.32,.46), d:BLOCK*rnd(.32,.46),
    h:3+Math.pow(1-Math.min(1,q),1.5)*rnd(7,26)});
}
BLD.sort(function(a,b){return (a.x+a.z)-(b.x+b.z)});

var HUB={x:0,y:44,z:0};
var NODES=[];
for(var k=0;k<8;k++){
  var a=(k/8)*6.283+0.4;
  var r=HALF*rnd(.45,.92);
  NODES.push({x:Math.cos(a)*r, z:Math.sin(a)*r*0.86, h:rnd(9,17), ph:rnd(0,6.28), ring:rnd(0,1)});
}
var PKT=[];
for(var p=0;p<190;p++) PKT.push({n:Math.floor(rnd(0,NODES.length)), t:Math.random(), sp:rnd(.18,.42), sz:rnd(1.1,2.1)});
var CARS=[];
for(var c=0;c<16;c++){
  var ax=Math.random()<0.5, lane=Math.floor(rnd(0,N));
  CARS.push({ax:ax, p:ORG+lane*STEP-ROAD*0.5, t:rnd(-HALF,HALF), v:rnd(6,13)*(Math.random()<.5?1:-1)});
}

var COS=Math.cos(Math.PI/6), SIN=Math.sin(Math.PI/6);
var rot=0;
function resize(){
  var r=cv.getBoundingClientRect();
  W=r.width;H=r.height;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
function S(){ return Math.min(W*0.86,H*1.6)/(N*STEP*0.86) }
function proj(x,y,z){
  var ca=Math.cos(rot), sa=Math.sin(rot);
  var rx=x*ca-z*sa, rz=x*sa+z*ca, s=S();
  return [W*0.5+(rx-rz)*COS*s, H*0.74+((rx+rz)*SIN-y)*s];
}
function line(a,b,col,wd){ctx.strokeStyle=col;ctx.lineWidth=wd||1;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
var t0=performance.now();
function frame(now){
  var rc=cv.getBoundingClientRect();
  if(!W||!H||Math.round(rc.width*DPR)!==cv.width||Math.round(rc.height*DPR)!==cv.height) resize();
  if(!W||!H){requestAnimationFrame(frame);return}
  var dt=Math.min(.05,(now-t0)/1000); t0=now;
  if(!reduce) rot+=dt*0.045;
  ctx.clearRect(0,0,W,H);
  var s=S();

  for(var g=0;g<=N;g++){
    var a=ORG+g*STEP-ROAD/2;
    line(proj(a,0,-HALF),proj(a,0,HALF),'rgba(140,160,200,.12)');
    line(proj(-HALF,0,a),proj(HALF,0,a),'rgba(140,160,200,.12)');
  }

  for(var bi=0;bi<BLD.length;bi++){
    var b=BLD[bi];
    var x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
    var c0=proj(x0,0,z0),c1=proj(x1,0,z0),c2=proj(x1,0,z1);
    var t0p=proj(x0,b.h,z0),t1=proj(x1,b.h,z0),t2=proj(x1,b.h,z1),t3=proj(x0,b.h,z1);
    ctx.fillStyle='rgba(10,13,20,.78)';
    ctx.beginPath();ctx.moveTo(c1[0],c1[1]);ctx.lineTo(c2[0],c2[1]);ctx.lineTo(t2[0],t2[1]);ctx.lineTo(t1[0],t1[1]);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(20,26,38,.8)';
    ctx.beginPath();ctx.moveTo(t0p[0],t0p[1]);ctx.lineTo(t1[0],t1[1]);ctx.lineTo(t2[0],t2[1]);ctx.lineTo(t3[0],t3[1]);ctx.closePath();ctx.fill();
    var ec='rgba(150,175,220,.28)';
    line(t0p,t1,ec);line(t1,t2,ec);line(t2,t3,ec);line(t3,t0p,ec);
    line(c1,t1,ec);line(c2,t2,ec);line(c0,t0p,ec);
  }

  for(var ci=0;ci<CARS.length;ci++){
    var car=CARS[ci];
    if(!reduce) car.t+=car.v*dt;
    if(car.t>HALF+5) car.t=-HALF-5; if(car.t<-HALF-5) car.t=HALF+5;
    var pp=proj(car.ax?car.t:car.p,.4,car.ax?car.p:car.t);
    ctx.fillStyle='rgba(210,225,248,.8)';
    ctx.beginPath();ctx.arc(pp[0],pp[1],1.9,0,6.283);ctx.fill();
  }

  // coverage rings + node masts + links to Maestro
  var hp=proj(HUB.x,HUB.y,HUB.z);
  for(var ni=0;ni<NODES.length;ni++){
    var nd=NODES[ni];
    var pulse=(now/2600+nd.ring)%1;
    var rr=6+pulse*20;
    ctx.strokeStyle='rgba('+RED+','+(0.30*(1-pulse)).toFixed(3)+')';
    ctx.lineWidth=1.1;
    ctx.beginPath();
    for(var st=0;st<=36;st++){
      var ang=st/36*6.283;
      var q=proj(nd.x+Math.cos(ang)*rr,0.1,nd.z+Math.sin(ang)*rr);
      st?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);
    }
    ctx.stroke();
    var top=proj(nd.x,nd.h,nd.z), bot=proj(nd.x,0,nd.z);
    line(bot,top,'rgba(180,200,238,.5)',1.2);
    line(top,hp,'rgba('+RED+',.26)',1.1);
    ctx.fillStyle='rgba('+RED+',.95)';
    ctx.beginPath();ctx.arc(top[0],top[1],2.6,0,6.283);ctx.fill();
  }

  // data packets travelling node -> Maestro
  for(var pi=0;pi<PKT.length;pi++){
    var pk=PKT[pi], nd2=NODES[pk.n];
    if(!reduce) pk.t+=pk.sp*dt;
    if(pk.t>1) pk.t=0;
    var e=pk.t;
    var q2=proj(nd2.x+(HUB.x-nd2.x)*e, nd2.h+(HUB.y-nd2.h)*e, nd2.z+(HUB.z-nd2.z)*e);
    var al=Math.max(0,0.95*(1-Math.abs(e-.45)*1.15));
    ctx.fillStyle=(pi%7===0?'rgba(235,245,255,':'rgba('+RED+',')+al.toFixed(3)+')';
    ctx.fillRect(q2[0]-pk.sz,q2[1]-pk.sz,pk.sz*2,pk.sz*2);
  }

  // Maestro hub
  var grd=ctx.createRadialGradient(hp[0],hp[1],0,hp[0],hp[1],Math.max(52,s*18));
  grd.addColorStop(0,'rgba('+RED+',.32)');grd.addColorStop(.5,'rgba('+RED+',.07)');grd.addColorStop(1,'rgba('+RED+',0)');
  ctx.fillStyle=grd;ctx.beginPath();ctx.arc(hp[0],hp[1],Math.max(52,s*18),0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.4;
  var hs=Math.max(7,s*2.6);
  ctx.beginPath();
  ctx.moveTo(hp[0],hp[1]-hs);ctx.lineTo(hp[0]+hs,hp[1]);ctx.lineTo(hp[0],hp[1]+hs);ctx.lineTo(hp[0]-hs,hp[1]);ctx.closePath();ctx.stroke();
  ctx.fillStyle='rgba('+RED+',.9)';ctx.beginPath();ctx.arc(hp[0],hp[1],2.8,0,6.283);ctx.fill();
  var inset=parseFloat(cv.dataset.topInset||0)||0;
  var lw=Math.max(120,Math.min(W*0.30,300));
  var lh=LOGO_OK?lw*(LOGO.naturalHeight/LOGO.naturalWidth):lw*0.42;
  if(lh>H*0.22){lh=H*0.22;lw=LOGO_OK?lh*(LOGO.naturalWidth/LOGO.naturalHeight):lh/0.42}
  var ly=Math.max(inset+lh/2+16, Math.min(hp[1]-hs-lh*0.7, inset+(H-inset)*0.18));
  if(LOGO_OK){
    var gl=ctx.createRadialGradient(hp[0],ly,0,hp[0],ly,lw*0.62);
    gl.addColorStop(0,'rgba('+RED+',.20)');gl.addColorStop(1,'rgba('+RED+',0)');
    ctx.fillStyle=gl;ctx.beginPath();ctx.arc(hp[0],ly,lw*0.62,0,6.283);ctx.fill();
    ctx.drawImage(LOGO,hp[0]-lw/2,ly-lh/2,lw,lh);
  }
  line([hp[0],ly+lh*0.42],[hp[0],hp[1]-hs],'rgba('+RED+',.45)',1.2);

  requestAnimationFrame(frame);
}
resize();frame(performance.now());
window.addEventListener('resize',resize);
})();
