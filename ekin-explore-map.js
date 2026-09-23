(function(){
var scroll=document.getElementById('xsScroll'),stage=document.getElementById('xsStage'),cv=document.getElementById('xsCanvas'),rail=document.getElementById('xsRail'),hud=document.getElementById('xsHud'),cue=document.getElementById('xsCue');
if(!scroll||!cv)return;
var ctx=cv.getContext('2d'),W=0,H=0,dpr=1;
var WORLD={w:2400,h:1600};
var STOPS=[
 {n:'Spotter',c:'Corridor',x:1400,y:1120,z:3.0},
 {n:'Patrol G2',c:'Vehicle',x:560,y:800,z:3.0},
 {n:'Box Spotter',c:'Portable',x:1830,y:320,z:3.4},
 {n:'X Spotter',c:'Junction',x:1000,y:500,z:3.4},
 {n:'Bike Patrol',c:'Pedestrian',x:760,y:1260,z:3.6},
 {n:'Maestro OS',c:'Command',x:1200,y:800,z:1.35}
];
var N=STOPS.length;
var KF=[{x:1200,y:800,z:.95,ax:.5,ay:.5}];
for(var i=0;i<N;i++){var m=STOPS[i].n==='Maestro OS';
  KF.push({x:STOPS[i].x,y:STOPS[i].y,z:STOPS[i].z,ax:m?.5:.37,ay:m?.5:.46});}
var stops=[].slice.call(document.querySelectorAll('.xs-stop'));
var cards=stops.map(function(s){return s.querySelector('.xs-card')});
var units=stops.map(function(s){return s.querySelector('.xs-shot')||s.querySelector('.xs-maestro')});

var btns=STOPS.map(function(s,j){
  var b=document.createElement('button');
  b.type='button';
  b.innerHTML='<i></i><span class="rn">'+String(j+1).padStart(2,'0')+'</span><span class="rl"><b>'+s.n+'</b><em>'+s.c+'</em></span>';
  b.setAttribute('aria-label','Jump to '+s.n);
  b.addEventListener('click',function(){goTo(j)});
  rail.appendChild(b);return b;
});
function scrollLen(){return scroll.offsetHeight-window.innerHeight}
function goTo(j){
  var top=scroll.getBoundingClientRect().top+window.pageYOffset;
  window.scrollTo({top:top+((j+1)/N)*scrollLen(),behavior:'smooth'});
}

/* deterministic city */
var seed=20260915;
function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff}
var VX=[0,200,600,1000,1400,1800,2200,2400],HY=[0,200,500,800,1100,1400,1600];
var blocks=[],bldgs=[],streets=[];
for(var a=0;a<VX.length-1;a++)for(var b=0;b<HY.length-1;b++){
  var x0=VX[a]+16,y0=HY[b]+16,x1=VX[a+1]-16,y1=HY[b+1]-16;
  blocks.push({x:x0,y:y0,w:x1-x0,h:y1-y0,t:rnd()});
  if(rnd()>.45)streets.push({x0:x0,y0:(y0+y1)/2,x1:x1,y1:(y0+y1)/2});
  if(rnd()>.5)streets.push({x0:(x0+x1)/2,y0:y0,x1:(x0+x1)/2,y1:y1});
  var cols=Math.max(2,Math.round((x1-x0)/76)),rows=Math.max(2,Math.round((y1-y0)/76));
  for(var c=0;c<cols;c++)for(var r=0;r<rows;r++){
    if(rnd()>.74)continue;
    var cw=(x1-x0)/cols,ch=(y1-y0)/rows,px=x0+c*cw+5,py=y0+r*ch+5,t=rnd();
    bldgs.push({x:px,y:py,w:Math.max(12,cw-10-rnd()*12),h:Math.max(12,ch-10-rnd()*12),t:t,z:8+t*t*46});
  }
}
bldgs.sort(function(p,q){return (p.y+p.x*.3)-(q.y+q.x*.3)});
var park={x:VX[2]+16,y:HY[4]+16,w:VX[3]-VX[2]-32,h:HY[5]-HY[4]-32};
var river=[{x:-40,y:1180},{x:420,y:1300},{x:900,y:1330},{x:1500,y:1450},{x:2000,y:1520},{x:2440,y:1560}];

function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2);
  var r=stage.getBoundingClientRect();W=r.width;H=r.height;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize);
if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);

var f=0,ft=0;
function onScroll(){
  var r=scroll.getBoundingClientRect(),len=scrollLen();
  ft=len>0?Math.max(0,Math.min(1,-r.top/len))*N:0;
}
window.addEventListener('scroll',onScroll,{passive:true});
function lerp(a,b,t){return a+(b-a)*t}
function smooth(t){return t*t*(3-2*t)}
function cam(fv){
  var i=Math.max(0,Math.min(N-1,Math.floor(fv))),t=smooth(Math.max(0,Math.min(1,fv-i))),A=KF[i],B=KF[i+1]||KF[i];
  return{x:lerp(A.x,B.x,t),y:lerp(A.y,B.y,t),z:lerp(A.z,B.z,t),ax:lerp(A.ax,B.ax,t),ay:lerp(A.ay,B.ay,t)};
}
function base(){return Math.max(W/WORLD.w,H/WORLD.h*.82)}
function project(c,k,wx,wy){return{x:(wx-c.x)*k+W*c.ax,y:(wy-c.y)*k+H*c.ay}}

function drawMap(c,k){
  ctx.save();
  ctx.translate(W*c.ax,H*c.ay);ctx.scale(k,k);ctx.translate(-c.x,-c.y);
  ctx.fillStyle='#040405';ctx.fillRect(-400,-400,WORLD.w+800,WORLD.h+800);
  for(var i=0;i<blocks.length;i++){var bl=blocks[i];
    ctx.fillStyle=bl.t>.7?'#0a0b0e':'#07080a';ctx.fillRect(bl.x,bl.y,bl.w,bl.h);}
  ctx.fillStyle='#08110c';ctx.fillRect(park.x,park.y,park.w,park.h);
  ctx.strokeStyle='rgba(120,150,130,.12)';ctx.lineWidth=1.2/k;ctx.strokeRect(park.x,park.y,park.w,park.h);
  /* river */
  ctx.beginPath();ctx.moveTo(river[0].x,river[0].y);
  for(var q=1;q<river.length;q++)ctx.lineTo(river[q].x,river[q].y);
  ctx.strokeStyle='#081016';ctx.lineWidth=120;ctx.lineJoin='round';ctx.stroke();
  ctx.strokeStyle='rgba(120,160,200,.09)';ctx.lineWidth=1.4/k;ctx.stroke();
  /* interior streets */
  ctx.strokeStyle='#0d0e11';ctx.lineWidth=10;
  for(var s=0;s<streets.length;s++){var st=streets[s];ctx.beginPath();ctx.moveTo(st.x0,st.y0);ctx.lineTo(st.x1,st.y1);ctx.stroke();}
  /* arterials */
  function road(x0,y0,x1,y1,w){
    ctx.strokeStyle='#161a1f';ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
    ctx.strokeStyle='rgba(159,180,214,.075)';ctx.lineWidth=Math.max(.6,1/k);ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
    if(k>1.4){ctx.save();ctx.setLineDash([16,20]);ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=Math.max(.8,1.4/k);
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();ctx.restore();}
  }
  for(var v=1;v<VX.length-1;v++)road(VX[v],-100,VX[v],WORLD.h+100,28);
  for(var hz=1;hz<HY.length-1;hz++)road(-100,HY[hz],WORLD.w+100,HY[hz],HY[hz]===800?46:28);
  /* 2.5D extruded buildings, light from upper-left */
  for(var j2=0;j2<bldgs.length;j2++){
    var g=bldgs[j2],hh=g.z,ox=-hh*.30,oy=-hh*.44;
    var rx=g.x+ox,ry=g.y+oy;
    /* south wall */
    ctx.fillStyle='#090a0d';
    ctx.beginPath();ctx.moveTo(g.x,g.y+g.h);ctx.lineTo(g.x+g.w,g.y+g.h);ctx.lineTo(rx+g.w,ry+g.h);ctx.lineTo(rx,ry+g.h);ctx.closePath();ctx.fill();
    /* east wall */
    ctx.fillStyle='#0c0e12';
    ctx.beginPath();ctx.moveTo(g.x+g.w,g.y);ctx.lineTo(g.x+g.w,g.y+g.h);ctx.lineTo(rx+g.w,ry+g.h);ctx.lineTo(rx+g.w,ry);ctx.closePath();ctx.fill();
    /* roof */
    ctx.fillStyle=g.t>.86?'#191d24':(g.t>.55?'#13171d':'#0f1216');
    ctx.fillRect(rx,ry,g.w,g.h);
    if(k>1.5){ctx.strokeStyle='rgba(159,180,214,.10)';ctx.lineWidth=.7/k;ctx.strokeRect(rx,ry,g.w,g.h);}
  }
  ctx.restore();
}

function drawRoute(c,k,fv){
  var pts=STOPS.map(function(s){return project(c,k,s.x,s.y)});
  ctx.save();
  ctx.strokeStyle='rgba(255,57,50,.14)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
  for(var i=1;i<N;i++)ctx.lineTo(pts[i].x,pts[i].y);
  ctx.stroke();
  var seg=Math.max(0,Math.min(N-1,Math.floor(fv-1))),t=Math.max(0,Math.min(1,fv-1-seg));
  if(seg<N-1){
    var A=pts[seg],B=pts[seg+1];
    ctx.strokeStyle='rgba(255,57,50,.55)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(lerp(A.x,B.x,t),lerp(A.y,B.y,t));ctx.stroke();
  }
  ctx.restore();
  return pts;
}

function drawFocus(c,k,fv,pts){
  var near=Math.max(0,Math.min(N-1,Math.round(fv)-1));
  var act=Math.max(0,Math.min(1,1-Math.abs(fv-(near+1))/.9));
  var p=pts[near],r=Math.max(W,H)*(0.62-0.22*act);
  var g=ctx.createRadialGradient(p.x,p.y,r*.18,p.x,p.y,r);
  g.addColorStop(0,'rgba(0,0,0,0)');
  g.addColorStop(.55,'rgba(0,0,0,'+(.42+.28*act)+')');
  g.addColorStop(1,'rgba(0,0,0,'+(.8+.15*act)+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}

function drawMarkers(c,k,t,fv,pts){
  var mA=Math.max(0,Math.min(1,1-Math.abs(fv-N)/.85));
  if(mA>.01){
    var m=pts[N-1];
    for(var i=0;i<N-1;i++){
      ctx.strokeStyle='rgba(255,57,50,'+(.28*mA)+')';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(m.x,m.y);ctx.stroke();
      var pr=(t/2200+i/N)%1;
      ctx.fillStyle='rgba(255,57,50,'+(.85*mA)+')';
      ctx.beginPath();ctx.arc(lerp(pts[i].x,m.x,pr),lerp(pts[i].y,m.y,pr),2,0,6.2832);ctx.fill();
    }
  }
  for(var j=0;j<N;j++){
    var p=pts[j],d=Math.abs(fv-(j+1)),act=Math.max(0,1-d/.85);
    ctx.strokeStyle='rgba(255,57,50,'+(.22+.62*act)+')';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(p.x,p.y,7,0,6.2832);ctx.stroke();
    ctx.fillStyle='rgba(255,57,50,'+(.45+.55*act)+')';
    ctx.beginPath();ctx.arc(p.x,p.y,2.6,0,6.2832);ctx.fill();
    if(act>.06){
      var ph=(t/1600)%1;
      ctx.strokeStyle='rgba(255,57,50,'+((1-ph)*.45*act)+')';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(p.x,p.y,7+ph*34,0,6.2832);ctx.stroke();
      ctx.strokeStyle='rgba(255,57,50,'+(.45*act)+')';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(p.x+9,p.y);ctx.lineTo(p.x+24,p.y);ctx.stroke();
      ctx.font='500 10px "Roboto Mono",monospace';ctx.fillStyle='rgba(255,255,255,'+(.62*act)+')';
      ctx.fillText(STOPS[j].c.toUpperCase(),p.x+30,p.y+3.5);
    }
  }
}

var last=-1;
function frame(ts){
  if(!stage.offsetParent||!W){if(stage.offsetParent)resize();requestAnimationFrame(frame);return;}
  if(!isFinite(ft))ft=0;
  f+=(ft-f)*.09;
  if(!isFinite(f))f=0;
  var c=cam(f),k=base()*c.z;
  ctx.clearRect(0,0,W,H);
  drawMap(c,k);
  var pts=drawRoute(c,k,f);
  drawFocus(c,k,f,pts);
  drawMarkers(c,k,ts||0,f,pts);
  for(var j=0;j<stops.length;j++){
    var d=Math.abs(f-(j+1)),a=Math.max(0,Math.min(1,1-(d-.16)/.34)),off=f-(j+1);
    stops[j].style.opacity=a;
    stops[j].classList.toggle('on',a>.5);
    if(cards[j]){cards[j].style.transform='translate3d(0,'+(off*40)+'px,0)';cards[j].tabIndex=a>.5?0:-1;}
    if(units[j])units[j].style.transform='translate3d('+(off*-90)+'px,calc(-50% + '+(off*40)+'px),0) scale('+(1-Math.min(.14,Math.abs(off)*.16))+')';
  }
  var near=Math.max(0,Math.min(N-1,Math.round(f)-1));
  if(near!==last){last=near;btns.forEach(function(b,i){b.setAttribute('aria-current',i===near?'true':'false')});}
  if(hud)hud.textContent=f<.45?'Ekin deployment map':STOPS[near].n;
  if(cue)cue.style.opacity=f<.35?'1':'0';
  requestAnimationFrame(frame);
}
resize();onScroll();requestAnimationFrame(frame);

window.addEventListener('keydown',function(e){
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
  var r=stage.getBoundingClientRect();
  if(r.top>40||r.bottom<window.innerHeight-40)return;
  var cur=Math.round(f)-1;
  goTo(Math.max(0,Math.min(N-1,cur+(e.key==='ArrowRight'?1:-1))));e.preventDefault();
});
})();
