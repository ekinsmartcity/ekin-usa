(function(){
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
function vis(el,on,off,th){if(!('IntersectionObserver' in window)){on();return}new IntersectionObserver(function(es){es.forEach(function(e){e.isIntersecting?on():off&&off()})},{threshold:th||.2}).observe(el)}
window.EkinTx={RM:RM,vis:vis,tabs:function(wrap,labels,onSel,dur){
  var i=0,timer=0,hover=false,shown=false,btns=labels.map(function(l,k){var b=document.createElement('button');b.type='button';b.setAttribute('role','tab');b.innerHTML=l+'<i></i>';b.style.setProperty('--dur',dur+'ms');b.addEventListener('click',function(){user=true;sel(k)});wrap.appendChild(b);return b}),user=false;
  function arm(){clearTimeout(timer);btns.forEach(function(b){b.classList.remove('run')});if(RM||hover||!shown||user)return;var b=btns[i];void b.offsetWidth;b.classList.add('run');timer=setTimeout(function(){sel((i+1)%btns.length)},dur)}
  function sel(k){i=k;btns.forEach(function(b,j){b.setAttribute('aria-selected',j===k?'true':'false')});var b=btns[k];if(b.offsetLeft<wrap.scrollLeft||b.offsetLeft+b.offsetWidth>wrap.scrollLeft+wrap.clientWidth)wrap.scrollTo({left:b.offsetLeft-14,behavior:RM?'auto':'smooth'});onSel(k);arm()}
  var host=wrap.parentElement;host.addEventListener('mouseenter',function(){hover=true;arm()});host.addEventListener('mouseleave',function(){hover=false;arm()});
  vis(host,function(){if(!shown){shown=true;sel(i)}},function(){shown=false;clearTimeout(timer)},.3);
  sel(0);return{sel:sel}}};
/* platform pillars reveal */
var pl=[].slice.call(document.querySelectorAll('.tx-pils li'));
if(pl.length){if(RM||!('IntersectionObserver' in window))pl.forEach(function(l){l.classList.add('in')});else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.3});pl.forEach(function(l,k){l.querySelectorAll('svg *').forEach(function(p){p.style.transitionDelay=(k*.08+.1)+'s'});io.observe(l)})}}
/* ---------- ghost plate ---------- */
var gp=document.getElementById('gpViz');
if(gp){var tm=[],on=false,st=gp.querySelectorAll('.g2-step');
function set(n){gp.dataset.s=n;st.forEach(function(e,i){e.classList.toggle('on',i<n)})}
function clr(){tm.forEach(clearTimeout);tm=[]}
function cycle(){clr();if(RM){set(3);return}set(0);[[700,1],[2600,2],[4600,3],[9800,-1]].forEach(function(p){tm.push(setTimeout(function(){if(p[1]<0){if(on)cycle()}else set(p[1])},p[0]))})}
EkinTx.vis(gp,function(){if(!on){on=true;cycle()}},function(){on=false;clr()},.3);set(RM?3:0)}
/* ---------- distracted driving ---------- */
var dd=document.getElementById('ddViz');
if(dd){
var fr=dd.querySelector('.dd-frame'),hand=fr.querySelector('.dd-box.hand'),belt=fr.querySelector('.dd-belt'),rec=dd.querySelector('.se-rec'),cur=0,tm=[];
var D=[{t:'Handheld phone',ph:1,bt:0,det:'Handheld phone use'},{t:'Seatbelt',ph:0,bt:1,det:'Seatbelt non-compliance'},{t:'Phone + seatbelt',ph:1,bt:1,det:'Phone use &middot; no seatbelt'}];
function f(k,v){var d=rec.querySelector('[data-f="'+k+'"]');if(d){d.innerHTML=v}}
function hole(){var z=fr.querySelector('.dd-z.drv'),a=fr.getBoundingClientRect(),b=z.getBoundingClientRect();fr.querySelector('.dd-rel').style.setProperty('--hole','linear-gradient(#000,#000) '+(b.left-a.left)+'px '+(b.top-a.top)+'px/'+b.width+'px '+b.height+'px no-repeat')}
function run(k){cur=k;var c=D[k];tm.forEach(clearTimeout);tm=[];hand.classList.remove('on');belt.classList.remove('on','bad');
  var go=function(fn,ms){RM?fn():tm.push(setTimeout(fn,ms))};
  go(function(){belt.classList.toggle('bad',!!c.bt);belt.classList.add('on')},300);
  if(c.ph)go(function(){hand.classList.add('on')},800);
  go(function(){rec.classList.remove('in');void rec.offsetWidth;rec.classList.add('in');f('det','<b>'+c.det+'</b>');f('crop',c.ph&&c.bt?'Hand region, belt path':c.ph?'Hand region':'Belt path')},1200)}
dd.querySelectorAll('.se-seg button').forEach(function(b){b.addEventListener('click',function(){fr.dataset.view=b.dataset.view;dd.querySelectorAll('.se-seg button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});f('rev',b.dataset.view==='released'?'Released: crop and plate only':'Reviewer: faces masked');hole()})});
addEventListener('resize',hole);hole();
EkinTx.tabs(dd.querySelector('.tx-tabs'),D.map(function(d){return d.t}),run,5500);
}
})();
