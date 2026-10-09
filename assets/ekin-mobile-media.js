/* Ekin — on phones, wide in-page videos/images are shown as 4:5 portrait crops.
   Heroes (#top), cards, rails, maps, logos and header/footer are left alone.
   Per-item focus: add data-m-focus="x% y%" to the <video>/<img>, or list it in FOCUS below. */
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width:640px)');
  var FOCUS = {
    'ekin-film-v3.mp4': '50% 50%',
    'edge-chip-to-street.mp4': '50% 50%',
    'maestro-hero.mp4': '50% 50%',
    'ventures-a-to-z.mp4': '50% 50%',
    'patrol-g2-los-angeles-v3-fs.mp4': '50% 55%',
    'patrol-g2-workflow-v2.mp4': '50% 50%',
    'spotter-modular-full.mp4': '50% 50%',
    'spotter-full-picture.mp4': '50% 50%',
    'pk-enforce-accuracy-v2.opt.webp': '50% 50%',
    'pk-streamlined-bike-2400.webp': '45% 50%',
    'public-safety-accuracy.opt.webp': '50% 50%',
    'mission-campus-aerial.opt.webp': '50% 50%',
    'mission-sariyer-office.opt.webp': '50% 50%'
  };
  var SKIP = 'header,footer,#drawer,.drawer,#top,#videoSlot,.hero,.numhero,.band,.band-bleed,.ms-band,.le-cta-card,.le-cta-bleed,.pe-card,.xs-sec,.xs-lcard,.rail,.rail-card,.cs-mount,.cs-frame,.awards-wall,.award-tile,.logo,.pe-logo,.dm-tile,.jb-card,.news-card,.v-card,.ab-card,.lead-card,[data-m-keep]';
  var done = [];

  // A frame may only hold media — never headings, copy, links or buttons.
  function mediaOnly(frame) {
    if (frame.querySelector('h1,h2,h3,h4,h5,h6,p,a,button,form,ul,ol,blockquote,.btn')) return false;
    var clone = frame.cloneNode(true);
    [].forEach.call(clone.querySelectorAll('img,video,picture,source,svg,canvas,image-slot'), function (n) { n.remove(); });
    return !clone.textContent.trim();
  }

  function frameFor(el) {
    var cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') {
      var p = el.parentElement;
      while (p && p !== document.body && getComputedStyle(p).position === 'static') p = p.parentElement;
      if (!p || p === document.body || /^(SECTION|MAIN|ARTICLE|BODY)$/.test(p.tagName)) return null;
      return mediaOnly(p) ? p : null;
    }
    return el;
  }

  function apply() {
    if (!mq.matches) return;
    var vw = document.documentElement.clientWidth;
    [].forEach.call(document.querySelectorAll('main video, main img, body > section video, body > section img, section video, section img'), function (el) {
      if (el.dataset.mPortrait || el.closest(SKIP)) return;
      var r = el.getBoundingClientRect();
      var w = r.width || el.offsetWidth, h = r.height || el.offsetHeight;
      if (!w || !h || w < vw * 0.86) return;
      var ratio = w / h;
      if (ratio < 1.35) return;
      var frame = frameFor(el);
      if (!frame) return;
      var name = (el.currentSrc || el.getAttribute('src') || '').split('?')[0].split('/').pop();
      var focus = el.getAttribute('data-m-focus') || FOCUS[name] || '50% 50%';
      el.dataset.mPortrait = '1';
      frame.classList.add('m-portrait-frame');
      if (frame !== el) el.classList.add('m-portrait-fill');
      else el.classList.add('m-portrait-self');
      el.style.setProperty('--m-focus', focus);
      done.push({ el: el, frame: frame });
    });
  }

  function reset() {
    done.forEach(function (d) { d.frame.classList.remove('m-portrait-frame'); d.el.classList.remove('m-portrait-fill', 'm-portrait-self'); delete d.el.dataset.mPortrait; });
    done = [];
  }

  var st = document.createElement('style');
  st.textContent =
    '@media (max-width:640px){' +
    '.m-portrait-frame{aspect-ratio:4/5!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:hidden!important}' +
    'img.m-portrait-self,video.m-portrait-self{display:block;width:100%!important;height:auto!important;aspect-ratio:4/5!important;object-fit:cover!important;object-position:var(--m-focus,50% 50%)!important;max-width:none!important}' +
    '.m-portrait-fill{inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:var(--m-focus,50% 50%)!important;max-width:none!important;max-height:none!important;transform:none!important}' +
    '}';
  document.head.appendChild(st);

  var runs = 0, busy = false;
  function run() { if (busy || runs > 40) return; busy = true; runs++; try { apply(); } catch (e) {} busy = false; }
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
  document.addEventListener('loadedmetadata', run, true);
  // lazy images: re-check each time one finishes loading (capture phase catches <img> load)
  var q;
  document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'IMG') { clearTimeout(q); q = setTimeout(run, 60); } }, true);
  if (document.readyState !== 'loading') run(); else document.addEventListener('DOMContentLoaded', run);
  var t;
  mq.addEventListener ? mq.addEventListener('change', function () { reset(); run(); }) : null;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (!mq.matches) reset(); else run(); }, 200); });
})();
