/* Keeps the red glow in "See it in action" cards centred behind the product image and fully faded inside whatever clips it */
(function(){
  function clipper(el){for(var n=el;n&&n!==document.body;n=n.parentElement){var s=getComputedStyle(n);if(s.overflowX!=='visible'||s.overflowY!=='visible'||(s.clipPath&&s.clipPath!=='none'))return n}return null}
  function place(card){
    var img=card.querySelector('.demo-img');if(!img)return;
    var c=card.getBoundingClientRect(),r=img.getBoundingClientRect();
    if(!r.width||!r.height)return;
    var cx=r.left+r.width/2,cy=r.top+r.height/2,s=Math.max(r.width,r.height)*1.4,w=s,h=s;
    var k=clipper(card);
    if(k){var b=k.getBoundingClientRect();w=Math.min(w,2*Math.max(0,Math.min(cx-b.left,b.right-cx)));h=Math.min(h,2*Math.max(0,Math.min(cy-b.top,b.bottom-cy)))}
    card.style.setProperty('--gx',(cx-c.left)+'px');
    card.style.setProperty('--gy',(cy-c.top)+'px');
    card.style.setProperty('--gw',Math.round(w)+'px');
    card.style.setProperty('--gh',Math.round(h)+'px');
  }
  function all(){[].forEach.call(document.querySelectorAll('.demo-card'),place)}
  [].forEach.call(document.querySelectorAll('.demo-card .demo-img'),function(i){if(!i.complete)i.addEventListener('load',all)});
  addEventListener('load',all);addEventListener('resize',all);
  if(window.ResizeObserver){var ro=new ResizeObserver(all);[].forEach.call(document.querySelectorAll('.demo-card'),function(c){ro.observe(c)})}
  all();
})();
