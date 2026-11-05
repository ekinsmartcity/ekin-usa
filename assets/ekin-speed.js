(function(){
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
/* ---------- lane / speed visualisation ---------- */
var root=document.getElementById('seViz');
if(root){
var lanes=root.querySelector('.se-lanes'),gA=root.querySelector('.se-gate.a'),gB=root.querySelector('.se-gate.b'),span=root.querySelector('.se-span'),rec=root.querySelector('.se-rec');
var mode='point',LIM={car:55,bus:45,truck:45},NM={car:'CAR',bus:'BUS',truck:'TRUCK'},NAMES={car:'Car',bus:'Bus',truck:'Truck'};
var SEQ=[[0,'car',63],[2,'truck',43],[1,'car',52],[2,'bus',49],[0,'car',57],[1,'car',48],[2,'truck',51],[0,'car',54],[1,'bus',42],[0,'car',69],[2,'truck',44],[1,'car',59]];
var LET='ABCDEFGHJKLMNPRSTUVWXYZ';
function plate(){var s='';for(var i=0;i<3;i++)s+=LET[Math.random()*LET.length|0];return s+' '+(1000+Math.random()*9000|0)}
function sm(){return innerWidth<=640}
var SZ={car:[6.4,.44],bus:[12.5,.52],truck:[14,.54]},SZM={car:[13,.4],bus:[24,.48],truck:[27,.5]};
function G(){return sm()?{a:.3,b:.8}:{a:.36,b:.84}}
var vs=[],si=0,W=0,last=0,spawnT=.4,count=0,running=false,raf=0;
function q(s){return rec.querySelector(s)}
function layout(){W=lanes.clientWidth;var g=G();gA.style.left=g.a*100+'%';gB.style.left=g.b*100+'%';span.style.left=g.a*100+'%';span.style.right=(100-g.b*100)+'%';vs.forEach(size);vs.forEach(place)}
function size(v){var s=(sm()?SZM:SZ)[v.cls];v.w=s[0]/100;v.el.style.width=s[0]+'%';v.el.style.height=(s[1]*100/3)+'%'}
function place(v){var px=v.x*W;v.el.style.transform='translate3d('+px.toFixed(1)+'px,-50%,0)';if(v.tw){var c=px+v.w*W/2,half=v.tw/2,m=8,tx=0;if(c-half<m)tx=m-(c-half);else if(c+half>W-m)tx=(W-m)-(c+half);v.tag.style.setProperty('--tx',tx.toFixed(1)+'px')}}
function make(lane,cls,mph,x){
  var el=document.createElement('div');el.className='se-veh '+cls;el.style.top=((lane+.5)*100/3)+'%';
  el.innerHTML='<i class="se-snap"></i><span class="se-tag"></span>';lanes.appendChild(el);
  var v={el:el,tag:el.querySelector('.se-tag'),lane:lane,cls:cls,mph:mph,avg:Math.max(30,Math.round(mph+(Math.random()*6-3))),plate:plate(),x:0,w:0,hitA:0,hitB:0,vel:[.105,.093,.08][lane]*(1+(Math.random()*.03-.015))};
  size(v);v.x=x==null?-v.w-.02:x;place(v);vs.push(v);return v}
function spawn(){var s=SEQ[si%SEQ.length];
  for(var i=0;i<vs.length;i++){var o=vs[i];if(o.lane===s[0]&&o.x<.16)return false}
  si++;make(s[0],s[1],s[2]);return true}
function tag(v,html){v.tag.innerHTML=html;v.tw=v.tag.offsetWidth;place(v);v.tag.classList.add('on');clearTimeout(v.tt);if(!RM)v.tt=setTimeout(function(){v.tag.classList.remove('on')},2300)}
function flash(el){el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash')}
function snap(v){v.el.classList.remove('snap');void v.el.offsetWidth;v.el.classList.add('snap')}
function hit(v,g){
  var L='L'+(v.lane+1)+' · '+NM[v.cls]+' · ',lim=LIM[v.cls];
  if(g==='a'){flash(gA);snap(v);
    if(mode==='point'){var o=v.mph>lim;tag(v,L+'<em>'+v.mph+' mph</em>');if(o){v.el.classList.add('over');record(v,v.mph,'Point speed')}}
    else tag(v,L+'ENTRY')}
  else{flash(gB);snap(v);var o2=v.avg>lim;tag(v,L+'AVG <em>'+v.avg+' mph</em>');if(o2){v.el.classList.add('over');record(v,v.avg,'Section average')}}
}
function scramble(el,txt){if(RM){el.textContent=txt;return}var n=0,steps=12;clearInterval(el._t);el._t=setInterval(function(){n++;var k=Math.floor(txt.length*n/steps),s='';for(var i=0;i<txt.length;i++)s+=i<k||txt[i]===' '?txt[i]:(/\d/.test(txt[i])?(Math.random()*10|0):LET[Math.random()*LET.length|0]);el.textContent=s;if(n>=steps){clearInterval(el._t);el.textContent=txt}},40)}
function setF(k,v,hi){var d=q('[data-f="'+k+'"]');d.textContent=v;d.classList.toggle('hi',!!hi)}
function record(v,spd,method){count++;var lim=LIM[v.cls];
  rec.classList.remove('in');void rec.offsetWidth;rec.classList.add('in');
  q('.se-rh b').textContent='REC '+String(count).padStart(4,'0');
  scramble(q('.se-plate span'),v.plate);
  setF('lane','Lane '+(v.lane+1));setF('cls',NAMES[v.cls]);setF('lim',lim+' mph');setF('spd',spd+' mph',1);setF('method',method);setF('over','+'+(spd-lim)+' mph',1);
  var ul=q('.se-recent'),li=document.createElement('li');li.innerHTML='<span>'+v.plate+' · L'+(v.lane+1)+'</span><span>'+spd+' mph</span>';ul.insertBefore(li,ul.firstChild);while(ul.children.length>3)ul.removeChild(ul.lastChild)}
function tick(t){if(!running)return;var dt=Math.min(.05,(t-last)/1000||0);last=t;
  spawnT-=dt;if(spawnT<=0)spawnT=spawn()?1+Math.random()*.9:.25;
  var g=G();
  for(var i=vs.length-1;i>=0;i--){var v=vs[i];v.x+=v.vel*dt;var f=v.x+v.w;
    if(!v.hitA&&f>=g.a){v.hitA=1;hit(v,'a')}
    if(mode==='section'&&v.hitA&&!v.hitB&&f>=g.b){v.hitB=1;hit(v,'b')}
    place(v);if(v.x>1.03){v.el.remove();vs.splice(i,1)}}
  raf=requestAnimationFrame(tick)}
root.querySelectorAll('.se-seg button').forEach(function(b){b.addEventListener('click',function(){mode=b.dataset.mode;root.dataset.mode=mode;root.querySelectorAll('.se-seg button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});vs.forEach(function(v){if(!v.hitA||v.hitB)return;if(mode==='section'&&v.x+v.w<G().b)v.hitB=0;else v.hitB=1});if(RM)staticScene()})});
addEventListener('resize',layout);
function staticScene(){vs.forEach(function(v){v.el.remove()});vs=[];layout();var g=G();
  var P=[[0,'car',63,g.a+.04],[1,'car',52,g.a-.02],[2,'truck',43,g.a+.13],[0,'car',54,.06],[1,'bus',49,g.b+.02],[2,'truck',51,-.01]];
  P.forEach(function(p){var v=make(p[0],p[1],p[2],p[3]);if(v.x+v.w>=g.a){v.hitA=1;hit(v,'a')}if(mode==='section'&&v.x+v.w>=g.b){v.hitB=1;hit(v,'b')}})}
layout();
if(RM){staticScene()}
else if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&!running){running=true;last=performance.now();raf=requestAnimationFrame(tick)}else if(!e.isIntersecting){running=false;cancelAnimationFrame(raf)}})},{threshold:.15}).observe(root)}
else{running=true;raf=requestAnimationFrame(tick)}
}
/* ---------- school / work zone schedule ---------- */
var s=document.getElementById('seSched');
if(s){
var clock=s.querySelector('.se-clock'),tracks=s.querySelector('.se-tracks');
var Z=[].map.call(s.querySelectorAll('.se-signbox'),function(box,i){return{box:box,num:box.querySelector('.se-sign b'),st:box.querySelector('.st'),row:s.querySelectorAll('.se-row')[i],std:+box.dataset.std,red:+box.dataset.red,win:JSON.parse(box.dataset.win),on:null}});
function flip(b,v){if(RM){b.textContent=v;return}b.classList.add('flip');setTimeout(function(){b.textContent=v;b.classList.remove('flip')},180)}
function render(h){var hh=Math.floor(h),mm=Math.floor((h-hh)*60);clock.textContent=String(hh%24).padStart(2,'0')+':'+String(mm).padStart(2,'0');tracks.style.setProperty('--p',(h/24).toFixed(4));
  Z.forEach(function(z){var on=false;z.row.querySelectorAll('.se-win').forEach(function(w,k){var a=z.win[k],x=h>=a[0]&&h<a[1];w.classList.toggle('on',x);if(x)on=true});
    if(on!==z.on){z.on=on;z.box.classList.toggle('on',on);z.row.classList.toggle('on',on);flip(z.num,on?z.red:z.std);z.st.textContent=on?'Reduced limit':'Standard limit'}})}
var h=5.5,lt=0,run=false,r2=0,RATE=1.35;
function loop(t){if(!run)return;var dt=Math.min(.05,(t-lt)/1000||0);lt=t;h+=dt*RATE;if(h>=24)h-=24;render(h);r2=requestAnimationFrame(loop)}
render(RM?7.75:h);
if(!RM&&'IntersectionObserver' in window)new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&!run){run=true;lt=performance.now();r2=requestAnimationFrame(loop)}else if(!e.isIntersecting){run=false;cancelAnimationFrame(r2)}})},{threshold:.2}).observe(s);
}
})();
