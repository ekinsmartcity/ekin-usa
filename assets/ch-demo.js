(function(){
'use strict';
var root=document.getElementById('ch-demo');if(!root)return;
var IMG={pothole:'images/ch-ic-pothole.png',cracking:'images/ch-ic-cracking.png',graffiti:'images/ch-ic-graffiti.png',sidewalk:'images/ch-ic-sidewalk.png',markings:'images/ch-ic-markings.png'};
var SVG={dumping:'<svg viewBox="0 0 24 24" fill="none" stroke="#FF3932" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',tree:'<svg viewBox="0 0 24 24" fill="none" stroke="#FF3932" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-6M12 15l-3-2.5M12 15l3-2.5"/><path d="M7.5 14.5A4.5 4.5 0 0 1 6 6.2 6 6 0 0 1 17.6 6a4.5 4.5 0 0 1-1.1 8.5z"/></svg>'};
var CATS=[['pothole','Pothole'],['cracking','Cracked Pavement'],['dumping','Illegal Dumping'],['graffiti','Graffiti'],['sidewalk','Sidewalk Damage'],['markings','Worn Road Markings'],['tree','Tree']];
var CN={};CATS.forEach(function(c){CN[c[0]]=c[1]});
var STAGES=[['Detect','An issue is noted along a route and added to the map.'],['Verify','A team member reviews the issue type and location.'],['Prioritize','Issues are ranked by urgency so crews know what comes first.'],['Dispatch','A crew is assigned to the location.'],['Resolve','The repair is completed and the issue is closed.']];
var STAGE_OF={Detected:0,Verified:1,Prioritized:2,Dispatched:3,Resolved:4};
var EV=[
{id:'e1',c:'pothole',t:'Pothole',loc:'E. Harding Way & N 1st St',p:'High',s:'Detected',x:26.5,y:29,card:1},
{id:'e2',c:'cracking',t:'Cracked Pavement',loc:'W. Fremont St',p:'High',s:'Verified',x:53,y:56},
{id:'e3',c:'dumping',t:'Illegal Dumping',loc:'S. Lincoln Ave',p:'High',s:'Prioritized',x:18.5,y:64,card:1},
{id:'e4',c:'graffiti',t:'Graffiti',loc:'Berkley Ave',p:'Low',s:'Dispatched',x:89,y:58},
{id:'e5',c:'sidewalk',t:'Sidewalk Damage',loc:'N Center St',p:'Medium',s:'Verified',x:72,y:70,card:1},
{id:'e6',c:'markings',t:'Worn Crosswalk',loc:'Riverside Dr & Elm St',p:'Medium',s:'Detected',x:66,y:22},
{id:'e7',c:'tree',t:'Overhanging Branches',loc:'Park Ave',p:'Medium',s:'Dispatched',x:44,y:36},
{id:'e8',c:'pothole',t:'Pothole',loc:'Westlake Blvd',p:'Medium',s:'Resolved',x:84,y:85},
{id:'e9',c:'graffiti',t:'Graffiti',loc:'Market St Underpass',p:'Low',s:'Detected',x:34,y:86},
{id:'e10',c:'cracking',t:'Cracked Pavement',loc:'Oak St',p:'Low',s:'Prioritized',x:8,y:40}
];
function ic(c){return IMG[c]?'<img src="'+IMG[c]+'" alt="" width="24" height="24" />':SVG[c]}
function esc(s){return String(s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
var $=function(s){return root.querySelector(s)};
var map=$('.chd-map'),layer=$('.chd-layer'),cards=$('.chd-cards'),list=$('.chd-list'),count=$('[data-count]'),detail=$('.chd-detail'),mdetail=$('.chd-mdetail'),desc=$('.chd-desc');
var st={cat:'all',pri:'all',sel:null,z:1,tx:0,ty:0,stage:null};
var RM=window.matchMedia('(prefers-reduced-motion: reduce)');
var MOB=window.matchMedia('(max-width:640px)');
function vis(){return EV.filter(function(e){return(st.cat==='all'||e.c===st.cat)&&(st.pri==='all'||e.p===st.pri)})}

/* filters */
var catRow=$('[data-f="cat"]'),priRow=$('[data-f="pri"]');
catRow.innerHTML='<button type="button" class="chd-chip" data-v="all" aria-pressed="true">All</button>'+CATS.map(function(c){return'<button type="button" class="chd-chip" data-v="'+c[0]+'" aria-pressed="false">'+ic(c[0])+esc(c[1])+'</button>'}).join('');
priRow.innerHTML=['all','High','Medium','Low'].map(function(p){return'<button type="button" class="chd-chip" data-v="'+p+'" aria-pressed="'+(p==='all')+'">'+(p==='all'?'All priorities':p)+'</button>'}).join('');
function bindRow(row,key){row.addEventListener('click',function(e){var b=e.target.closest('.chd-chip');if(!b)return;st[key]=b.dataset.v;[].forEach.call(row.children,function(x){x.setAttribute('aria-pressed',String(x===b))});if(st.sel&&vis().every(function(v){return v.id!==st.sel}))st.sel=null;render()})}
bindRow(catRow,'cat');bindRow(priRow,'pri');
$('.chd-reset').addEventListener('click',function(){st.cat='all';st.pri='all';[catRow,priRow].forEach(function(r){[].forEach.call(r.children,function(x){x.setAttribute('aria-pressed',String(x.dataset.v==='all'))})});render()});

/* pins */
EV.forEach(function(e){var b=document.createElement('button');b.type='button';b.className='chd-pin';b.dataset.id=e.id;b.dataset.p=e.p;b.style.left=e.x+'%';b.style.top=e.y+'%';b.setAttribute('aria-label',e.t+', '+e.loc+', '+e.p+' priority, '+e.s+' (sample)');b.innerHTML=ic(e.c);b.addEventListener('click',function(ev){ev.stopPropagation();select(e.id)});layer.appendChild(b);e.pin=b});

/* view transform */
function size(){return{w:map.clientWidth,h:map.clientHeight}}
function clamp(){var s=size();st.tx=Math.min(0,Math.max(s.w*(1-st.z),st.tx));st.ty=Math.min(0,Math.max(s.h*(1-st.z),st.ty))}
function apply(){clamp();layer.style.transform='translate('+st.tx+'px,'+st.ty+'px) scale('+st.z+')';layer.style.setProperty('--inv',1/st.z);EV.forEach(function(e){e.pin.style.setProperty('--inv',1/st.z)});$('[data-z="in"]').disabled=st.z>=3;$('[data-z="out"]').disabled=st.z<=1;map.style.touchAction=st.z>1?'none':'pan-y';place()}
function screen(e){var s=size();return{x:st.tx+e.x/100*s.w*st.z,y:st.ty+e.y/100*s.h*st.z}}
function zoomTo(z,cx,cy){var s=size();cx=cx==null?s.w/2:cx;cy=cy==null?s.h/2:cy;var k=z/st.z;st.tx=cx-(cx-st.tx)*k;st.ty=cy-(cy-st.ty)*k;st.z=z;apply()}
function focus(e){var s=size();if(st.z<1.6)st.z=1.6;st.tx=s.w/2-e.x/100*s.w*st.z;st.ty=s.h/2-e.y/100*s.h*st.z;apply()}
$('[data-z="in"]').addEventListener('click',function(){zoomTo(Math.min(3,st.z+.5))});
$('[data-z="out"]').addEventListener('click',function(){zoomTo(Math.max(1,st.z-.5))});
$('[data-z="home"]').addEventListener('click',function(){st.z=1;st.tx=0;st.ty=0;apply()});
var drag=null;
map.addEventListener('pointerdown',function(e){if(st.z<=1||e.target.closest('button,.chd-detail'))return;drag={x:e.clientX,y:e.clientY,tx:st.tx,ty:st.ty,moved:false};map.setPointerCapture(e.pointerId);map.classList.add('dragging')});
map.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;st.tx=drag.tx+dx;st.ty=drag.ty+dy;apply()});
function end(){if(!drag)return;drag=null;map.classList.remove('dragging')}
map.addEventListener('pointerup',end);map.addEventListener('pointercancel',end);
map.addEventListener('keydown',function(e){if(e.target!==map)return;var d=40,m={ArrowLeft:[d,0],ArrowRight:[-d,0],ArrowUp:[0,d],ArrowDown:[0,-d]}[e.key];if(m&&st.z>1){e.preventDefault();st.tx+=m[0];st.ty+=m[1];apply()}else if(e.key==='+'||e.key==='='){zoomTo(Math.min(3,st.z+.5))}else if(e.key==='-'){zoomTo(Math.max(1,st.z-.5))}});

/* cards + detail placement */
function placeBox(el,e,w,h,gap){var s=size(),p=screen(e),x=p.x-w/2,y=p.y-h-gap;if(y<8)y=p.y+gap;x=Math.max(8,Math.min(s.w-w-8,x));y=Math.max(8,Math.min(s.h-h-8,y));el.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)'}
function place(){var v=vis().map(function(e){return e.id});[].forEach.call(cards.children,function(c){var e=EV.filter(function(x){return x.id===c.dataset.id})[0];if(!e)return;var p=screen(e),s=size();c.hidden=v.indexOf(e.id)<0||st.sel===e.id||p.x<0||p.y<0||p.x>s.w||p.y>s.h;if(!c.hidden)placeBox(c,e,228,c.offsetHeight||58,24)});if(st.sel&&!MOB.matches&&!detail.hidden){var e=byId(st.sel);placeSide(detail,e,280,detail.offsetHeight||240,28)}}
function placeSide(el,e,w,h,gap){var s=size(),p=screen(e),x=p.x+gap;if(x+w>s.w-8)x=p.x-w-gap;if(x<8){x=Math.max(8,Math.min(s.w-w-8,p.x-w/2));var y2=p.y-h-gap;if(y2<8)y2=p.y+gap;el.style.transform='translate('+Math.round(x)+'px,'+Math.round(Math.max(8,Math.min(s.h-h-8,y2)))+'px)';return}var y=Math.max(8,Math.min(s.h-h-8,p.y-h/2));el.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)'}
function byId(id){return EV.filter(function(e){return e.id===id})[0]}
EV.forEach(function(e){if(!e.card)return;var b=document.createElement('button');b.type='button';b.className='chd-card';b.dataset.id=e.id;b.style.left='0';b.style.top='0';b.tabIndex=-1;b.setAttribute('aria-hidden','true');b.innerHTML='<span class="chd-ic">'+ic(e.c)+'</span><span><h5>'+esc(e.t)+'</h5><span class="chd-pri" data-p="'+e.p+'">'+e.p+' &middot; '+e.s+'</span></span>';b.addEventListener('click',function(){select(e.id)});cards.appendChild(b)});

function renderDetail(){var host=MOB.matches?mdetail:map;if(detail.parentNode!==host)host.appendChild(detail);if(!st.sel){detail.hidden=true;return}var e=byId(st.sel);detail.hidden=false;detail.style.left=MOB.matches?'':'0';detail.style.top=MOB.matches?'':'0';if(MOB.matches)detail.style.transform='';
detail.innerHTML='<div class="chd-dhead"><span class="chd-ic">'+ic(e.c)+'</span><div><h3 id="chd-dt">'+esc(e.t)+'</h3><span class="chd-pri" data-p="'+e.p+'">'+e.p+' priority</span><span class="chd-nophoto">No photo &middot; sample event</span></div><button type="button" class="chd-close" aria-label="Close details">&times;</button></div><dl class="chd-dl"><dt>Category</dt><dd>'+esc(CN[e.c])+'</dd><dt>Location</dt><dd>'+esc(e.loc)+' <span style="color:#7d8794">(sample)</span></dd><dt>Priority</dt><dd>'+e.p+'</dd><dt>Status</dt><dd>'+e.s+'</dd></dl><button type="button" class="btn btn-primary chd-wfbtn">View workflow <span class="arrow">&rarr;</span></button>';
detail.querySelector('.chd-close').addEventListener('click',function(){var id=st.sel;st.sel=null;render();var r=list.querySelector('[data-id="'+id+'"]');if(r)r.focus()});
detail.querySelector('.chd-wfbtn').addEventListener('click',function(){setStage(STAGE_OF[e.s],e);var f=root.querySelector('.chd-flow'),r=f.getBoundingClientRect();if(r.bottom>innerHeight||r.top<0)window.scrollTo({top:scrollY+r.top-120,behavior:RM.matches?'auto':'smooth'});var b=f.querySelectorAll('.chd-step button')[STAGE_OF[e.s]];if(b)b.focus({preventScroll:true})})}

function select(id){st.sel=st.sel===id&&!MOB.matches?id:id;render();focus(byId(id));var r=list.querySelector('[data-id="'+id+'"]');if(r&&list.scrollHeight>list.clientHeight){var lt=r.offsetTop-list.offsetTop;if(lt<list.scrollTop||lt>list.scrollTop+list.clientHeight-r.offsetHeight)list.scrollTop=lt-8}}

function render(){var v=vis();count.textContent=v.length;
list.innerHTML=v.length?v.map(function(e){return'<li><button type="button" class="chd-row" data-id="'+e.id+'" aria-current="'+(st.sel===e.id)+'"><span class="chd-ic">'+ic(e.c)+'</span><span style="min-width:0"><h4>'+esc(e.t)+'</h4><small>'+esc(e.loc)+'</small></span><span class="chd-pri" data-p="'+e.p+'">'+e.p+'</span></button></li>'}).join(''):'<li class="chd-empty">No demo events match these filters.</li>';
EV.forEach(function(e){var on=v.indexOf(e)>=0;e.pin.hidden=!on;e.pin.setAttribute('aria-pressed',String(st.sel===e.id))});
renderDetail();place()}
list.addEventListener('click',function(e){var b=e.target.closest('.chd-row');if(b)select(b.dataset.id)});
root.addEventListener('keydown',function(e){if(e.key==='Escape'&&st.sel){st.sel=null;render()}});

/* workflow strip */
var steps=$('.chd-steps');
steps.innerHTML=STAGES.map(function(s,i){return'<li class="chd-step"><button type="button" aria-pressed="false" data-i="'+i+'"><span class="n">0'+(i+1)+'</span><span class="t">'+s[0]+'</span></button></li>'}).join('');
function setStage(i,e){st.stage=i;[].forEach.call(steps.querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',String(+b.dataset.i===i))});desc.innerHTML='<b>'+STAGES[i][0]+'.</b> '+STAGES[i][1]+(e?' <span style="color:#8a94a1">&mdash; '+esc(e.t)+', '+esc(e.loc)+' is at this step in the sample data.</span>':'')}
steps.addEventListener('click',function(e){var b=e.target.closest('button');if(b)setStage(+b.dataset.i)});

window.addEventListener('resize',function(){apply();renderDetail();place()});
MOB.addEventListener&&MOB.addEventListener('change',function(){render()});
render();apply();setStage(0);
})();
