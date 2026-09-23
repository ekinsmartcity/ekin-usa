(function(){
// Numeric isometric city for the "Smart Cities — Connected Devices" section.
// The city is drawn entirely out of digits on a 2D canvas; scrolling the section
// moves an isometric camera from an overview into each connected Ekin device.
var cv=document.getElementById('sczCanvas'); if(!cv) return;
var ctx=cv.getContext('2d');
var sec=document.getElementById('products');
var nameEl=document.getElementById('sczName'), descEl=document.getElementById('sczDesc'),
    idxEl=document.getElementById('sczIdx'), linkEl=document.getElementById('sczLink'),
    rail=document.getElementById('sczRail');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

function rnd(a,b){return a+Math.random()*(b-a)}
var INK='rgba(186,203,232,', RED='rgba(255,57,50,';

// ---- city model ----
var BLOCK=13, ROAD=6, STEP=BLOCK+ROAD, N=7;
var origin=-((N*STEP-ROAD)/2);
var PTS=[];
function pushPt(x,y,z,w,c){PTS.push({x:x,y:y,z:z,w:w,g:Math.floor(Math.random()*10),c:c||0,s:Math.random()*6.28})}
for(var i=0;i<N;i++)for(var j=0;j<N;j++){
  var bx=origin+i*STEP, bz=origin+j*STEP;
  var q=Math.hypot(i-(N-1)/2,j-(N-1)/2)/((N-1)/2);
  var nb=Math.random()<0.82?1:0; if(!nb) continue;
  var count=Math.random()<0.5?1:2;
  for(var b=0;b<count;b++){
    var w=BLOCK*rnd(0.34,0.5), d=BLOCK*rnd(0.34,0.5);
    var ox=rnd(-BLOCK*0.24,BLOCK*0.24), oz=rnd(-BLOCK*0.24,BLOCK*0.24);
    var hh=2.5+Math.pow(1-Math.min(1,q),1.5)*rnd(7,26);
    var cx=bx+ox, cz=bz+oz;
    // vertical corner columns
    for(var c=0;c<4;c++){
      var px=cx+(c===0||c===3?-w/2:w/2), pz=cz+(c<2?-d/2:d/2);
      for(var t=0;t<Math.max(2,Math.round(hh/1.6));t++) pushPt(px,(t+0.4)*1.6,pz,0.9);
    }
    // roof outline
    var per=Math.max(6,Math.round((w+d)/1.5));
    for(var k=0;k<per;k++){
      var u=k/per*4, sidei=Math.floor(u), f=u-sidei, rx,rz;
      if(sidei===0){rx=cx-w/2+w*f;rz=cz-d/2}
      else if(sidei===1){rx=cx+w/2;rz=cz-d/2+d*f}
      else if(sidei===2){rx=cx+w/2-w*f;rz=cz+d/2}
      else {rx=cx-w/2;rz=cz+d/2-d*f}
      pushPt(rx,hh,rz,1);
    }
  }
  // street digits along the block edges
  for(var s=0;s<9;s++){
    pushPt(bx+rnd(-BLOCK/2,BLOCK/2),0,bz+BLOCK/2+ROAD*0.5,0.5);
    pushPt(bx+BLOCK/2+ROAD*0.5,0,bz+rnd(-BLOCK/2,BLOCK/2),0.5);
  }
}

// ---- devices on the plan ----
var DEV=[
  {id:'x-spotter',n:'X Spotter',lbl:'X Spotter',x:origin+2*STEP,z:origin+2*STEP,h:16,
   d:'Multi-lane detection and pedestrian-crossing enforcement at the junction.',href:'X Spotter.html'},
  {id:'spotter',n:'Spotter',lbl:'Spotter',x:origin+4*STEP,z:origin+3*STEP,h:19,
   d:'Smart-city module: ALPR, speed and environmental monitoring on one pole.',href:'Spotter.html'},
  {id:'box',n:'Box Spotter',lbl:'Box Spotter',x:origin+5*STEP,z:origin+1*STEP,h:12,
   d:'Portable unit deployed where coverage is needed, with no fixed infrastructure.',href:'Box Spotter.html'},
  {id:'patrol',n:'Patrol G2',lbl:'Patrol G2',x:origin+1*STEP,z:origin+4*STEP,h:3,
   d:'Mobile enforcement covering changing routes across the city.',href:'Patrol G2.html'},
  {id:'bike',n:'Bike Patrol',lbl:'Bike Patrol',x:origin+5*STEP,z:origin+5*STEP,h:2.5,
   d:'Enforcement reaching dense streets and areas vehicles cannot.',href:'Bike Patrol.html'}
];
var STOPS=[{n:'One connected city',lbl:'Overview',
  d:'Every Ekin device on one map, reporting into Maestro OS.',href:'Maestro OS.html',
  cam:{x:0,y:6,z:0,s:1}}];
DEV.forEach(function(dv){
  STOPS.push({n:dv.n,lbl:dv.lbl,d:dv.d,href:dv.href,dev:dv,
    cam:{x:dv.x,y:dv.h*0.55,z:dv.z,s:3.1}});
});

// ---- camera ----
var cam={x:0,y:6,z:0,s:1}, target={x:0,y:6,z:0,s:1};
var COS=Math.cos(Math.PI/6), SIN=Math.sin(Math.PI/6);
var W=0,H=0,DPR=Math.min(devicePixelRatio||1,2);
function resize(){
  var r=cv.getBoundingClientRect();
  W=r.width;H=r.height;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
function base(){ return Math.min(W,H)/(N*STEP*0.78); }
function project(x,y,z){
  var S=base()*cam.s;
  var sx=(x-cam.x - (z-cam.z))*COS*S;
  var sy=((x-cam.x)+(z-cam.z))*SIN*S - (y-cam.y)*S;
  return [W/2+sx, H*0.56+sy];
}
var cur=-1,dots=[];
STOPS.forEach(function(s,i){
  var b=document.createElement('button');b.type='button';b.className='scz-dot'+(i===0?' on':'');
  b.innerHTML='<i></i>'+s.lbl;
  b.addEventListener('click',function(){
    var top=sec.offsetTop+(sec.offsetHeight-window.innerHeight)*(i/(STOPS.length-1));
    window.scrollTo({top:top,behavior:'smooth'});
  });
  rail.appendChild(b);dots.push(b);
});
function apply(i){
  if(!isFinite(i)) i=0;
  i=Math.max(0,Math.min(STOPS.length-1,Math.round(i)));
  if(i===cur) return;
  var s=STOPS[i]; if(!s) return; cur=i;
  target={x:s.cam.x,y:s.cam.y,z:s.cam.z,s:s.cam.s};
  nameEl.textContent=s.n; descEl.textContent=s.d;
  idxEl.textContent=('0'+(i+1)).slice(-2)+' / 0'+STOPS.length;
  linkEl.setAttribute('href',s.href);
  dots.forEach(function(d,k){d.classList.toggle('on',k===i)});
}
function onScroll(){
  var r=sec.getBoundingClientRect();
  var total=Math.max(1,sec.offsetHeight-window.innerHeight);
  var p=(-r.top)/total; if(!isFinite(p)) p=0;
  p=Math.max(0,Math.min(1,p));
  apply(p*(STOPS.length-1));
}

// ---- render ----
var t0=performance.now();
function draw(now){
  var r0=cv.getBoundingClientRect();
  if(Math.round(r0.width*DPR)!==cv.width||Math.round(r0.height*DPR)!==cv.height) resize();
  if(!W||!H){requestAnimationFrame(draw);return}
  var k=reduce?1:0.075;
  cam.x+=(target.x-cam.x)*k; cam.y+=(target.y-cam.y)*k;
  cam.z+=(target.z-cam.z)*k; cam.s+=(target.s-cam.s)*k;
  ctx.clearRect(0,0,W,H);
  var S=base()*cam.s;
  var tick=Math.floor(now/420);
  var sorted=PTS;
  var fs=Math.max(9,Math.min(26,S*1.5));
  ctx.font='500 '+fs.toFixed(1)+'px "Roboto Mono", ui-monospace, monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(var i=0;i<sorted.length;i++){
    var p=sorted[i];
    var pr=project(p.x,p.y,p.z);
    if(pr[0]<-40||pr[0]>W+40||pr[1]<-40||pr[1]>H+40) continue;
    var dep=1-Math.min(1,Math.hypot(p.x-cam.x,p.z-cam.z)/(N*STEP*0.75));
    var a=(0.3+0.62*dep)*p.w;
    ctx.fillStyle=INK+a.toFixed(3)+')';
    ctx.fillText(String((p.g+tick+i)%10),pr[0],pr[1]);
  }
  // device markers
  ctx.font='600 10px "Roboto Mono", ui-monospace, monospace';
  DEV.forEach(function(dv){
    var pr=project(dv.x,dv.h+2.5,dv.z), gr=project(dv.x,0,dv.z);
    var on=STOPS[Math.max(0,cur)] && STOPS[Math.max(0,cur)].dev===dv;
    ctx.strokeStyle=RED+(on?0.95:0.4)+')';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(gr[0],gr[1]);ctx.lineTo(pr[0],pr[1]);ctx.stroke();
    ctx.beginPath();ctx.arc(pr[0],pr[1],on?6:4,0,6.283);
    ctx.fillStyle=RED+(on?0.9:0.5)+')';ctx.fill();
    if(on||cam.s<1.4){
      ctx.fillStyle='rgba(245,247,250,'+(on?0.95:0.55)+')';
      ctx.textAlign='left';
      ctx.fillText(dv.lbl.toUpperCase(),pr[0]+12,pr[1]-2);
      ctx.textAlign='center';
    }
  });
  requestAnimationFrame(draw);
}
resize();apply(0);
requestAnimationFrame(draw);
window.addEventListener('resize',function(){resize()});
window.addEventListener('scroll',onScroll,{passive:true});
try{onScroll()}catch(e){}
})();
