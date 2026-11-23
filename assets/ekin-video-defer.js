/* Hero videos: show the poster first, start the video once the page has loaded */
(function(){
  var started=[];
  function play(v){var p=v.play();if(p&&p.catch)p.catch(function(){})}
  function start(){
    [].forEach.call(document.querySelectorAll('video[data-defer-src]'),function(v){
      var s=v.getAttribute('data-defer-src');if(!s)return;v.removeAttribute('data-defer-src');
      v.muted=true;v.autoplay=true;v.setAttribute('autoplay','');v.preload='auto';v.src=s;started.push(v);play(v);
    });
  }
  function go(){(window.requestIdleCallback||function(f){setTimeout(f,200)})(start,{timeout:1500})}
  if(document.readyState==='complete')go();else window.addEventListener('load',go);
  setTimeout(start,4000);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState!=='visible')return;started.forEach(function(v){if(v.paused&&v.getAttribute('src'))play(v)})});
  window.addEventListener('pageshow',function(){started.forEach(function(v){if(v.paused&&v.getAttribute('src'))play(v)})});
})();
