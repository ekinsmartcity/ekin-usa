/* Ekin — shared mobile behaviour: drawer a11y + scroll lock, reduced-motion video handling. */
(function () {
  'use strict';
  var drawer = document.getElementById('drawer'), burger = document.getElementById('burger'), closeBtn = document.getElementById('drawerClose');
  if (drawer && burger) {
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Site menu');
    burger.setAttribute('aria-controls', 'drawer');
    burger.setAttribute('aria-expanded', 'false');
    var lastY = 0;
    function sync() {
      var open = drawer.classList.contains('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open && !document.documentElement.classList.contains('drawer-lock')) {
        lastY = window.scrollY;
        document.documentElement.classList.add('drawer-lock');
        document.body.style.top = -lastY + 'px';
        setTimeout(function () { (closeBtn || drawer).focus({ preventScroll: true }); }, 30);
      } else if (!open && document.documentElement.classList.contains('drawer-lock')) {
        document.documentElement.classList.remove('drawer-lock');
        document.body.style.top = '';
        window.scrollTo(0, lastY);
        burger.focus({ preventScroll: true });
      }
    }
    burger.addEventListener('click', function (e) { if (drawer.classList.contains('open')) { e.stopImmediatePropagation(); drawer.classList.remove('open'); } }, true);
    new MutationObserver(sync).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    sync();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) drawer.classList.remove('open'); });
    drawer.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href]'); if (a) drawer.classList.remove('open'); });
    var st = document.createElement('style');
    st.textContent = 'html.drawer-lock,html.drawer-lock body{overflow:hidden}html.drawer-lock body{position:fixed;left:0;right:0;width:100%}';
    document.head.appendChild(st);
  }

  // Reduced motion: stop autoplay loops and keep their poster frame.
  var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  function still() {
    if (!mq || !mq.matches) return;
    [].forEach.call(document.querySelectorAll('video[autoplay]'), function (v) {
      v.removeAttribute('autoplay'); v.pause();
      v.setAttribute('controls', '');
    });
  }
  still();
  if (mq && mq.addEventListener) mq.addEventListener('change', still);
  // Below-the-fold videos: download and play only when they scroll into view.
  var lazyV = [].slice.call(document.querySelectorAll('video[data-lazy-play]'));
  function playV(v) {
    if (mq && mq.matches) { v.setAttribute('controls', ''); return; }
    if (v.preload === 'none') v.preload = 'auto';
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  if (lazyV.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) playV(e.target);
          else if (!e.target.paused) e.target.pause();
        });
      }, { rootMargin: '300px 0px' });
      lazyV.forEach(function (v) { v.muted = true; io.observe(v); });
    } else lazyV.forEach(playV);
  }
})();
