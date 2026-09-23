/* Ekin Connected Solutions — interactive product map (vanilla JS) */
(function(){
var HOSTS=[].slice.call(document.querySelectorAll('.cs-mount,#csMap'));if(!HOSTS.length)return;
HOSTS.forEach(function(HOST){build(HOST)});
function build(HOST){

/* ---------- data: edit everything here ---------- */
var PRODUCTS=[
 {id:'spotter',name:'Spotter',zone:'Zone 01',units:6,color:'#3ddc84',scale:1.0,form:'tall',img:'assets/map/spotter.png',href:'Spotter.html',
  pins:[{x:19,y:22,zone:'Zone 01',status:'Connected',sync:'Just now'},{x:62,y:45,zone:'Zone 03',status:'Connected',sync:'1 min ago'},{x:74,y:72,zone:'Zone 05',status:'Connected',sync:'Just now'}]},
 {id:'xspotter',name:'X Spotter',zone:'Zone 02',units:4,color:'#4a90ff',scale:1.4,form:'wide',img:'assets/map/x-spotter.png',href:'X Spotter.html',
  pins:[{x:82,y:58,zone:'Zone 03',status:'Connected',sync:'Just now'},{x:30,y:71,zone:'Zone 04',status:'Standby',sync:'6 min ago'}]},
 {id:'boxspotter',name:'Box Spotter',zone:'Zone 03',units:3,color:'#9b6bff',scale:1.35,form:'wide',img:'assets/map/box-spotter.png',href:'Box Spotter.html',
  pins:[{x:76,y:27,zone:'Zone 02',status:'Connected',sync:'2 min ago'}]},
 {id:'patrolg2',name:'Patrol G2',zone:'Zone 04',units:6,color:'#FF3932',scale:1.45,form:'wide',img:'assets/map/patrol-g2.png',href:'Patrol G2.html',
  pins:[{x:47,y:45,zone:'Zone 04',status:'Connected',sync:'Just now',trail:[[47,45],[52,52],[52,57]]}]},
 {id:'bikepatrol',name:'Bike Patrol',zone:'Zone 05',units:5,color:'#e8edf6',scale:1.4,form:'wide',img:'assets/map/bike-patrol.png',href:'Bike Patrol.html',
  pins:[{x:43,y:24,zone:'Zone 01',status:'Connected',sync:'Just now',trail:[[43,24],[47,32],[52,37]]},{x:60,y:75,zone:'Zone 05',status:'Standby',sync:'4 min ago',trail:[[60,75],[66,82],[72,84]]}]}
];
var SUMMARY={connected:24,active:21,standby:3};
var ZONES=[{n:'Zone 01',x:24,y:35},{n:'Zone 02',x:80,y:22},{n:'Zone 03',x:85,y:54},{n:'Zone 04',x:33,y:64},{n:'Zone 05',x:82,y:79}];

/* ---------- shell ---------- */
HOST.innerHTML=''+
'<div class="cs-frame">'+
 '<aside class="cs-side">'+
  '<div class="cs-brand"><img src="assets/ekin-logo-white.png" alt="Ekin" /></div>'+
  '<span class="cs-eyebrow">Smart city</span>'+
  '<h3 class="cs-title">Connected<br />Solutions</h3>'+
  '<div class="cs-lhead"><span>Solutions</span><span>Units</span></div>'+
  '<div class="cs-list" role="listbox" aria-label="Ekin products"></div>'+
  '<button class="cs-reset" type="button">View all</button>'+
  '<div class="cs-foot"><span class="cs-dots" aria-hidden="true"></span><span>One connected ecosystem</span></div>'+
 '</aside>'+
 '<div class="cs-main">'+
  '<canvas class="cs-canvas"></canvas>'+
  '<div class="cs-zones"></div>'+
  '<div class="cs-summary">'+
   '<div><b>'+SUMMARY.connected+'</b><span>Connected</span></div>'+
   '<div><b class="ok">'+SUMMARY.active+'</b><span>Active</span></div>'+
   '<div><b>'+SUMMARY.standby+'</b><span>Standby</span></div>'+
  '</div>'+
  '<div class="cs-compass" aria-hidden="true"><i></i><span>N</span></div>'+
  '<div class="cs-pins"></div>'+
  '<div class="cs-detail"></div>'+
 '</div>'+
'</div>';

var side=HOST.querySelector('.cs-list'),main=HOST.querySelector('.cs-main'),pinLayer=HOST.querySelector('.cs-pins'),
    detail=HOST.querySelector('.cs-detail'),zoneLayer=HOST.querySelector('.cs-zones'),cv=HOST.querySelector('.cs-canvas'),
    resetBtn=HOST.querySelector('.cs-reset');
var selected=null,activePin=null;

/* sidebar rows */
PRODUCTS.forEach(function(p){
  var b=document.createElement('button');
  b.type='button';b.className='cs-row';b.dataset.id=p.id;b.setAttribute('role','option');b.setAttribute('aria-selected','false');
  b.style.setProperty('--c',p.color);
  b.innerHTML='<span class="cs-thumb"><img src="'+p.img+'" alt="'+p.name+'" /></span>'+
    '<span class="cs-rtext"><span class="cs-rname">'+p.name+'<i class="cs-dot"></i></span><span class="cs-rzone">'+p.zone+'</span></span>'+
    '<span class="cs-runits">'+p.units+'</span>';
  b.addEventListener('click',function(){select(p.id===selected?null:p.id)});
  side.appendChild(b);
});

/* zone labels */
ZONES.forEach(function(z){
  var e=document.createElement('span');e.className='cs-zone';e.textContent=z.n.toUpperCase();
  e.style.left=z.x+'%';e.style.top=z.y+'%';zoneLayer.appendChild(e);
});

/* pins */
var pins=[];
PRODUCTS.forEach(function(p){
  p.pins.forEach(function(pin,i){
    var el=document.createElement('button');
    el.type='button';el.className='cs-pin';el.dataset.id=p.id;
    el.style.left=pin.x+'%';el.style.top=pin.y+'%';el.style.setProperty('--c',p.color);
    el.style.setProperty('--s',p.scale||1.2);
    el.classList.add('form-'+(p.form||'wide'));
    if(pin.status!=='Connected')el.classList.add('standby');
    el.setAttribute('aria-label',p.name+', '+pin.zone+', '+pin.status);
    el.innerHTML='<span class="cs-pimg"><img src="'+p.img+'" alt="" /><i class="cs-pstate" aria-hidden="true"></i></span>'+
      '<span class="cs-tip"><b>'+p.name+'</b><u>'+pin.zone+'</u><em class="'+(pin.status==='Connected'?'ok':'sb')+'">'+pin.status+'</em><u>Last sync '+pin.sync+'</u></span>';
    el.addEventListener('click',function(e){e.stopPropagation();setPin(p,pin,el)});
    pinLayer.appendChild(el);pins.push({el:el,p:p,pin:pin});
  });
});

function setDetail(p,pin){
  if(!p){detail.innerHTML='<div class="cs-dempty"><span>Select a solution to view connection status</span></div>';return}
  var st=pin?pin.status:'Connected',zone=pin?pin.zone:p.zone;
  detail.innerHTML='<span class="cs-dmark"><img src="'+p.img+'" alt="" /></span>'+
    '<span class="cs-dline">'+(p.name+' \u00b7 '+p.units+' connected \u00b7 '+zone).toUpperCase()+'</span>'+
    '<span class="cs-dstate '+(st==='Connected'?'ok':'sb')+'"><i></i>'+st+'</span>'+
    '<a class="cs-dmore" href="'+p.href+'" aria-label="Open '+p.name+'">&#8599;</a>';
}
function setPin(p,pin,el){
  activePin=el;
  pins.forEach(function(o){o.el.classList.toggle('on',o.el===el)});
  if(selected!==p.id)select(p.id,true);
  setDetail(p,pin);
}
function select(id,keep){
  selected=id||null;
  HOST.querySelectorAll('.cs-row').forEach(function(r){
    var on=r.dataset.id===selected;r.classList.toggle('on',on);r.setAttribute('aria-selected',on?'true':'false');
  });
  pins.forEach(function(o){
    var dim=selected&&o.p.id!==selected;
    o.el.classList.toggle('dim',!!dim);
    if(dim)o.el.classList.remove('on');
  });
  resetBtn.classList.toggle('on',!selected);
  if(!keep){
    activePin=null;pins.forEach(function(o){o.el.classList.remove('on')});
    var p=selected?PRODUCTS.filter(function(x){return x.id===selected})[0]:null;
    setDetail(p,p?p.pins[0]:null);
  }
  draw();
}
resetBtn.addEventListener('click',function(){select(null)});
main.addEventListener('click',function(){activePin=null;pins.forEach(function(o){o.el.classList.remove('on')});draw()});

/* ---------- stylised city canvas ---------- */
var ctx=cv.getContext('2d'),W=0,H=0,seed=771131;
function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff}
var net=null;
function buildNet(){
  seed=771131;
  var majors=[],minors=[],river=[],districts=[];
  for(var i=0;i<7;i++){var x=.08+i*.135+rnd()*.03;majors.push([[x-.06,0],[x,.5],[x+.05,1]])}
  for(var j=0;j<6;j++){var y=.1+j*.16+rnd()*.03;majors.push([[0,y+.04],[.5,y],[1,y+.05]])}
  for(var k=0;k<150;k++){
    var ax=rnd(),ay=rnd(),hor=rnd()>.5,len=.05+rnd()*.14;
    minors.push(hor?[[ax,ay],[Math.min(1,ax+len),ay]]:[[ax,ay],[ax,Math.min(1,ay+len)]]);
  }
  river=[[-.02,.12],[.18,.26],[.26,.44],[.22,.62],[.3,.8],[.28,1.02]];
  for(var d=0;d<5;d++){
    var pts=[],cx=.2+rnd()*.6,cy=.2+rnd()*.6,r=.16+rnd()*.14;
    for(var a=0;a<9;a++){var an=a/9*6.2832,rr=r*(.7+rnd()*.6);pts.push([cx+Math.cos(an)*rr,cy+Math.sin(an)*rr])}
    districts.push(pts);
  }
  net={majors:majors,minors:minors,river:river,districts:districts};
}
function resize(){
  var dpr=Math.min(devicePixelRatio||1,2),r=main.getBoundingClientRect();
  W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);draw();
}
function poly(pts,close){ctx.beginPath();ctx.moveTo(pts[0][0]*W,pts[0][1]*H);for(var i=1;i<pts.length;i++)ctx.lineTo(pts[i][0]*W,pts[i][1]*H);if(close)ctx.closePath();ctx.stroke()}
function draw(){
  if(!W)return;if(!net)buildNet();
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#0a0a0c';ctx.fillRect(0,0,W,H);
  var g=ctx.createRadialGradient(W*.5,H*.42,0,W*.5,H*.42,Math.max(W,H)*.7);
  g.addColorStop(0,'rgba(24,26,30,1)');g.addColorStop(1,'rgba(8,8,10,1)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  /* parks */
  ctx.fillStyle='rgba(22,30,26,.55)';
  [[.62,.12,.12,.08],[.08,.52,.1,.09],[.78,.66,.13,.1]].forEach(function(p){
    ctx.beginPath();ctx.ellipse((p[0]+p[2]/2)*W,(p[1]+p[3]/2)*H,p[2]*W/2,p[3]*H/2,0,0,6.2832);ctx.fill();
  });
  /* minor grid */
  ctx.strokeStyle='rgba(150,160,175,.035)';ctx.lineWidth=1;
  net.minors.forEach(function(s){poly(s)});
  /* majors */
  ctx.strokeStyle='rgba(170,182,200,.17)';ctx.lineWidth=2.2;ctx.lineCap='round';
  net.majors.forEach(function(s){poly(s)});
  /* river */
  ctx.strokeStyle='rgba(28,44,62,.95)';ctx.lineWidth=Math.max(14,W*.028);ctx.lineJoin='round';poly(net.river);
  ctx.strokeStyle='rgba(90,130,170,.12)';ctx.lineWidth=1;poly(net.river);
  /* district boundaries */
  ctx.save();ctx.setLineDash([4,6]);ctx.strokeStyle='rgba(200,212,228,.1)';ctx.lineWidth=1;
  net.districts.forEach(function(p){poly(p,true)});ctx.restore();
  /* trails for visible pins */
  pins.forEach(function(o){
    if(!o.pin.trail)return;
    if(selected&&o.p.id!==selected)return;
    var on=o.el===activePin||(selected===o.p.id);
    ctx.save();ctx.setLineDash([2,6]);ctx.lineCap='round';
    ctx.strokeStyle=on?o.p.color:'rgba(210,220,235,.24)';
    ctx.globalAlpha=on?.85:.3;ctx.lineWidth=2;
    poly(o.pin.trail.map(function(t){return [t[0]/100,t[1]/100]}));
    ctx.restore();
    var end=o.pin.trail[o.pin.trail.length-1];
    ctx.fillStyle=on?o.p.color:'rgba(210,220,235,.3)';
    ctx.beginPath();ctx.arc(end[0]/100*W,end[1]/100*H,3,0,6.2832);ctx.fill();
  });
}
addEventListener('resize',resize);
if(window.ResizeObserver)new ResizeObserver(resize).observe(main);
setDetail(null);select(null);resize();
}
})();
