/* Keeps the red glow in "See it in action" cards centred behind the product image */
(function(){
  function place(card){
    var img=card.querySelector('.demo-img');if(!img)return;
    var c=card.getBoundingClientRect(),r=img.getBoundingClientRect();
    if(!r.width||!r.height)return;
    card.style.setProperty('--gx',(r.left-c.left+r.width/2)+'px');
    card.style.setProperty('--gy',(r.top-c.top+r.height/2)+'px');
    card.style.setProperty('--gs',Math.round(Math.max(r.width,r.height)*1.45)+'px');
  }
  function all(){[].forEach.call(document.querySelectorAll('.demo-card'),place)}
  [].forEach.call(document.querySelectorAll('.demo-card .demo-img'),function(i){if(!i.complete)i.addEventListener('load',all)});
  addEventListener('load',all);addEventListener('resize',all);
  if(window.ResizeObserver){var ro=new ResizeObserver(all);[].forEach.call(document.querySelectorAll('.demo-card'),function(c){ro.observe(c)})}
  all();
})();
