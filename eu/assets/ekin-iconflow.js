/* Phone only: stacked icon lists flow in one row after another */
(function(){
  if(!matchMedia('(max-width:640px)').matches||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var SEL='.pw-grid>.pw-card,.ch-grid>.ch-card,.mh-grid>.mh-card,.pg-m-grid>div,.bs-m-grid>div,.xs-m-grid>div,#why .ben-grid>.ben-card,.cap-grid.ss-caps>.cap,.cm-benefits>.cm-bcard,.partner-grid>.partner-card';
  var rows=[].slice.call(document.querySelectorAll(SEL));if(!rows.length)return;
  var st=document.createElement('style');
  st.textContent='@media (max-width:640px){'+
    'html.icf .icf-row{opacity:0;transform:translateX(-26px);transition:opacity .55s ease var(--icfd,0s),transform .7s cubic-bezier(.2,.8,.2,1) var(--icfd,0s)!important}'+
    'html.icf .icf-row.icf-in{opacity:1;transform:none}'+
    'html.icf .icf-row :is(img,.pw-ic,.cap-ic,.ch-ic,.chw-ic,.ic):first-child{transform:scale(.5) rotate(-14deg);opacity:0;transition:transform .7s cubic-bezier(.2,.9,.25,1.35) calc(var(--icfd,0s) + .12s),opacity .4s ease calc(var(--icfd,0s) + .12s)}'+
    'html.icf .icf-row.icf-in :is(img,.pw-ic,.cap-ic,.ch-ic,.chw-ic,.ic):first-child{transform:none;opacity:1}'+
  '}';
  document.head.appendChild(st);document.documentElement.classList.add('icf');
  rows.forEach(function(r){r.classList.add('icf-row')});
  var io=new IntersectionObserver(function(es){
    var vis=es.filter(function(e){return e.isIntersecting}).sort(function(a,b){return a.boundingClientRect.top-b.boundingClientRect.top});
    vis.forEach(function(e,i){e.target.style.setProperty('--icfd',(i*.1).toFixed(2)+'s');e.target.classList.add('icf-in');io.unobserve(e.target)});
  },{threshold:.2,rootMargin:'0px 0px -8% 0px'});
  rows.forEach(function(r){io.observe(r)});
})();
