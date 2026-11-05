(function(){
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
function vis(el,on,off){if(!('IntersectionObserver' in window)){on();return}new IntersectionObserver(function(es){es.forEach(function(e){e.isIntersecting?on():off()})},{threshold:.15}).observe(el)}
function loop(el,step){var run=false,last=0,raf=0;function f(t){if(!run)return;var dt=Math.min(.05,(t-last)/1000||0);last=t;step(dt);raf=requestAnimationFrame(f)}
  if(RM){for(var i=0;i<480;i++)step(1/30);return}
  vis(el,function(){if(!run){run=true;last=performance.now();raf=requestAnimationFrame(f)}},function(){run=false;cancelAnimationFrame(raf)})}
var LET='ABCDEFGHJKLMNPRSTUVWXYZ';
function plate(){var s='';for(var i=0;i<3;i++)s+=LET[Math.random()*LET.length|0];return s+' '+(1000+Math.random()*9000|0)}
function sm(){return innerWidth<=640}
function bump(rec){rec.classList.remove('in');void rec.offsetWidth;rec.classList.add('in')}
function setF(rec,k,v,hi){var d=rec.querySelector('[data-f="'+k+'"]');if(!d)return;d.innerHTML=v;d.classList.toggle('hi',!!hi)}
function mkVeh(box,cls,lane,top){var el=document.createElement('div');el.className='se-veh '+cls;el.style.top=top+'%';el.innerHTML='<i class="se-snap"></i><span class="se-tag"></span>';box.appendChild(el);return{el:el,tag:el.querySelector('.se-tag'),cls:cls,lane:lane,plate:plate()}}
var SZ={car:[6.4,.44],bus:[12,.5],truck:[13,.52],ems:[7,.46]},SZM={car:[11,.42],bus:[20,.48],truck:[22,.5],ems:[12,.44]};
function size(v,lh){var s=(sm()?SZM:SZ)[v.cls];v.w=s[0]/100;v.el.style.width=s[0]+'%';v.el.style.height=(s[1]*lh)+'%'}
function tagOn(v,html,keep){v.tag.innerHTML=html;v.tag.classList.add('on');clearTimeout(v.tt);if(!keep&&!RM)v.tt=setTimeout(function(){v.tag.classList.remove('on')},2400)}
function snap(v){v.el.classList.remove('snap');void v.el.offsetWidth;v.el.classList.add('snap')}
var NM={car:'CAR',bus:'BUS',truck:'TRUCK',ems:'EMERGENCY'},NAMES={car:'Car',bus:'Bus',truck:'Truck',ems:'Emergency'};

/* ---------- red light ---------- */
var rl=document.getElementById('rlViz');
if(rl){
var lanes=rl.querySelector('.rl-lanes'),sig=rl.querySelector('.rl-sig'),cur=rl.querySelector('.rl-cur'),rec=rl.querySelector('.se-rec'),sigl=rl.querySelector('.rl-sigl');
var S=.56,G=7,A=2.5,R=8,T=G+A+R,V=.1,t=0,vs=[],W=0,cyc=0,phase='g',redStart=0,spT=[.2,1.2],nEms=0,src='controller';
var SEQ=[['car','car','truck','car','car','bus','car'],['car','bus','car','car','truck','car']],si=[0,0];
function ph(x){var m=x%T;return m<G?'g':m<G+A?'a':'r'}
function lay(){W=lanes.clientWidth;vs.forEach(function(v){size(v,50)})}
function spawn(l,cls){var last=vs.filter(function(v){return v.lane===l}).sort(function(a,b){return a.x-b.x})[0];if(last&&last.x<.09)return false;var v=mkVeh(lanes,cls||SEQ[l][si[l]++%SEQ[l].length],l,l?75:25);size(v,50);v.x=-v.w-.01;vs.push(v);return v}
function record(v,ev,rt,fx){bump(rec);var fr=rec.querySelectorAll('.rl-fr');fx.forEach(function(x,i){fr[i].classList.add('on');fr[i].querySelector('i').style.setProperty('--x',(x*100)+'%')});
  setF(rec,'plate',v.plate);setF(rec,'lane','Lane '+(v.lane+1));setF(rec,'cls',NAMES[v.cls]);setF(rec,'ev',ev,1);setF(rec,'red',rt.toFixed(1)+' s',1);setF(rec,'src',src==='device'?'On-device':'Controller')}
function onRed(){cyc++;var k=cyc%3,c=vs.filter(function(v){var f=v.x+v.w;return!v.commit&&f>S-.24&&f<S-.03}).sort(function(a,b){return b.x-a.x})[0];
  if(k===1&&c){c.runner=true;c.must=false}else if(k===2&&c){c.creep=true}else if(k===0)setTimeout(function(){if(vs.every(function(v){return v.lane!==1||v.x+v.w>S+.02})){var e=spawn(1,'ems');if(e)e.ems=true}},RM?0:400)}
function step(dt){t+=dt;var p=ph(t);
  if(p!==phase){if(p==='a')vs.forEach(function(v){if(v.x+v.w<S-.035&&!v.ems)v.must=true;else v.commit=true});if(p==='r'){redStart=t;onRed()}if(p==='g')vs.forEach(function(v){v.must=false;v.creep=false});phase=p;sig.dataset.p=p}
  if(p!=='g')vs.forEach(function(v){if(!v.commit&&!v.runner&&!v.ems&&v.x+v.w<S-.004)v.must=true});
  [0,1].forEach(function(l){spT[l]-=dt;if(spT[l]<=0)spT[l]=spawn(l)?(l?2.6:1.8)+Math.random():.3});
  [0,1].forEach(function(l){var L=vs.filter(function(v){return v.lane===l}).sort(function(a,b){return b.x-a.x});
    L.forEach(function(v,i){var f=v.x+v.w,cap=Infinity;if(v.must)cap=S-.004+(v.creep?.028:0);if(i>0)cap=Math.min(cap,L[i-1].x-.016);
      var nf=cap===Infinity?f+V*dt:f+Math.min(V*dt,Math.max(0,cap-f)*3.4*dt);v.x=nf-v.w;
      if(f<S&&nf>=S&&p==='r'){snap(v);if(v.ems){tagOn(v,'L'+(l+1)+' &middot; EMERGENCY &middot; <em>EXEMPT</em>')}else if(!v.creep){v.el.classList.add('over');var rt=t-redStart;tagOn(v,'L'+(l+1)+' &middot; '+NM[v.cls]+' &middot; <em>RED +'+rt.toFixed(1)+' s</em>');record(v,'Red light running',rt,[S-.07,S+.012,S+.15])}}
      if(v.creep&&!v.flag&&p==='r'&&nf>S&&nf-f<V*dt*.04){v.flag=1;v.el.classList.add('over');snap(v);tagOn(v,'L'+(l+1)+' &middot; '+NM[v.cls]+' &middot; <em>STOP LINE</em>');record(v,'Stop line crossing',t-redStart,[S-.05,S+.012,S+.026])}
      v.el.style.transform='translate3d('+(v.x*W).toFixed(1)+'px,-50%,0)'})});
  for(var i=vs.length-1;i>=0;i--)if(vs[i].x>1.03){vs[i].el.remove();vs.splice(i,1)}
  cur.style.left=((t%T)/T*100)+'%'}
rl.querySelectorAll('.se-seg button').forEach(function(b){b.addEventListener('click',function(){src=b.dataset.src;rl.dataset.src=src;sigl.innerHTML=src==='device'?'Phase &middot; on-device':'Phase &middot; controller';rl.querySelectorAll('.se-seg button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});setF(rec,'src',src==='device'?'On-device':'Controller')})});
addEventListener('resize',lay);lay();sig.dataset.p='g';loop(rl,step);
}

/* turn and lane: moved to assets/ekin-turnlane.js */
/* ---------- pedestrian safety ---------- */
var pd=document.getElementById('pdViz');
if(pd){
var road=pd.querySelector('.pd-road'),plane=pd.querySelector('.pd-lanes'),prec=pd.querySelector('.se-rec'),ev=prec.querySelector('.pd-ev');
var CW0=.47,CW1=.55,YL=.445,V2=.105,cars=[],us=[],RW=0,RH=0,LW=0,tt=0,occT=0,cnt={ped:0,cyc:0,mob:0,pmd:0},dw=[],nev=0,cs=[.5,1.6],us0=.6,carN=0,upd=0;
var UT=[['ped',.085,.46],['cyc',.2,.2],['mob',.065,.17],['pmd',.16,.17]],UN={ped:'Pedestrian',cyc:'Cyclist',mob:'Mobility vehicle user',pmd:'PMD rider'};
function lay2(){RW=road.clientWidth;RH=road.clientHeight;LW=plane.clientWidth;cars.forEach(function(v){size(v,50)})}
function band(y){return y>=.22&&y<.5?0:y>=.5&&y<=.78?1:-1}
function onCW(u){return u.y>.215&&u.y<.785}
function spawnU(){var r=Math.random(),a=0,ty=UT[0];for(var i=0;i<UT.length;i++){a+=UT[i][2];if(r<a){ty=UT[i];break}}
  var down=Math.random()<.5,el=document.createElement('i');el.className='pd-u '+ty[0];road.appendChild(el);
  us.push({el:el,ty:ty[0],v:ty[1]*(.9+Math.random()*.2),dir:down?1:-1,y:down?.06:.94,x:CW0+.012+Math.random()*(CW1-CW0-.024),t0:0,in:false})}
function spawnC(l){var last=cars.filter(function(v){return v.lane===l}).sort(function(a,b){return a.x-b.x})[0];if(last&&last.x<.1)return false;carN++;var v=mkVeh(plane,carN%7===0?'bus':'car',l,l?75:25);size(v,50);v.x=-v.w-.01;v.noy=carN%4===0;cars.push(v);return true}
function danger(l){return cars.some(function(c){var f=c.x+c.w;if(c.lane!==l)return false;if(f>CW0-.005&&c.x<CW1+.01)return true;return f>CW0-.12&&f<=YL+.004&&c.noy&&c.spd>.3*V2})}
function step2(dt){tt+=dt;us0-=dt;if(us0<=0){spawnU();us0=1.6+Math.random()*2.2}
  [0,1].forEach(function(l){cs[l]-=dt;if(cs[l]<=0)cs[l]=spawnC(l)?2+Math.random()*1.4:.3});
  var occ=false;
  us.forEach(function(u){var ny=u.y+u.v*u.dir*dt,b0=band(u.y),b1=band(ny);
    if(b1!==-1&&b1!==b0&&danger(b1))ny=u.y;
    if(!u.in&&onCW({y:ny})){u.in=true;u.t0=tt}
    if(u.in&&!onCW({y:ny})&&((u.dir>0&&ny>.78)||(u.dir<0&&ny<.22))&&!u.out){u.out=true;dw.push(tt-u.t0);if(dw.length>30)dw.shift();cnt[u.ty]++}
    u.y=ny;if(onCW(u))occ=true;u.el.style.transform='translate3d('+(u.x*RW).toFixed(1)+'px,'+(u.y*RH).toFixed(1)+'px,0)'});
  for(var i=us.length-1;i>=0;i--)if(us[i].y<-.05||us[i].y>1.05){us[i].el.remove();us.splice(i,1)}
  if(occ)occT+=dt;road.classList.toggle('occ',occ);
  [0,1].forEach(function(l){var L=cars.filter(function(v){return v.lane===l}).sort(function(a,b){return b.x-a.x});
    L.forEach(function(v,i){var f=v.x+v.w,cap=Infinity,mine=us.some(function(u){return onCW(u)&&band(u.y)===l}),any=us.some(function(u){return onCW(u)||(u.dir>0&&u.y>.13&&u.y<=.215)||(u.dir<0&&u.y<.87&&u.y>=.785)});
      v.yield=!v.noy&&any;if(f<=YL+.004&&(v.yield||mine))cap=YL;if(i>0)cap=Math.min(cap,L[i-1].x-.016);
      var nf=cap===Infinity?f+V2*dt:f+Math.min(V2*dt,Math.max(0,cap-f)*3.4*dt);v.spd=(nf-f)/dt;v.x=nf-v.w;
      if(v.noy&&!v.flag&&nf>CW0&&v.x<CW1){var tgt=us.filter(onCW).sort(function(a,b){return Math.abs(a.y-(l?.64:.36))-Math.abs(b.y-(l?.64:.36))})[0];
        if(tgt){v.flag=1;nev++;v.el.classList.add('over');snap(v);tgt.el.classList.add('risk');(function(e){setTimeout(function(){e.classList.remove('risk')},1400)})(tgt.el);
          var gap=Math.abs(tgt.y-(l?.64:.36))/.56*7.4;tagOn(v,'L'+(l+1)+' &middot; <em>FAILED TO YIELD</em>');
          ev.classList.remove('in');void ev.offsetWidth;ev.classList.add('in');ev.innerHTML='<span class="tx-lbl">Latest event</span><strong>Failure to yield &middot; Lane '+(l+1)+'</strong><p>'+UN[tgt.ty]+' on the crossing. Closest gap '+gap.toFixed(1)+' m. Plate '+v.plate+'.</p>'}}
      v.el.style.transform='translate3d('+(v.x*LW).toFixed(1)+'px,-50%,0)'})});
  for(var j=cars.length-1;j>=0;j--)if(cars[j].x>1.03){cars[j].el.remove();cars.splice(j,1)}
  upd-=dt;if(upd<=0){upd=.25;setF(prec,'ped',cnt.ped);setF(prec,'cyc',cnt.cyc);setF(prec,'mob',cnt.mob);setF(prec,'pmd',cnt.pmd);var o=tt?occT/tt*100:0;setF(prec,'occ',Math.round(o)+'%');prec.querySelector('.pd-bar i').style.width=o+'%';setF(prec,'dw',dw.length?(dw.reduce(function(a,b){return a+b},0)/dw.length).toFixed(1)+' s':'&mdash;');setF(prec,'nev',nev)}}
addEventListener('resize',lay2);lay2();loop(pd,step2);
}
})();
