/* Ghost plate capture-analysis panel.
   IMAGE SOURCES: replace these three paths with the real captures of ONE white SUV.
   - GPA_VISIBLE_SRC:  visible-light crop of the vehicle's rear, plate attached and visible (ABC XYZ)
   - GPA_INFRARED_SRC: matching monochrome infrared crop, same vehicle, angle and framing; only the plate surface washed out
   - GPA_OVERVIEW_SRC: small overview of the same vehicle (optional; the slot shows a neutral placeholder until supplied) */
var GPA_VISIBLE_SRC = 'images/ghost-plate/suv-rear-visible.webp?v=2';
var GPA_INFRARED_SRC = 'images/ghost-plate/suv-rear-infrared.webp?v=2';
var GPA_OVERVIEW_SRC = 'images/ghost-plate/suv-overview.webp?v=2';

(function () {
  var root = document.getElementById('gpPanel');
  if (!root) return;
  var srcs = { visible: GPA_VISIBLE_SRC, infrared: GPA_INFRARED_SRC, overview: GPA_OVERVIEW_SRC };
  [].forEach.call(root.querySelectorAll('img[data-src-key]'), function (img) {
    var box = img.parentNode, key = img.getAttribute('data-src-key');
    var ph = box.querySelector('.gpa-ph'); if (ph) ph.textContent = 'Image source: ' + srcs[key];
    img.addEventListener('error', function () { box.classList.add('missing'); });
    if (!srcs[key]) box.classList.add('missing'); else img.src = srcs[key];
  });

  var steps = root.querySelectorAll('.gpa-step');
  var marks = root.querySelectorAll('.gpa-mark');
  var groups = {};
  [].forEach.call(root.querySelectorAll('[data-g]'), function (el) { var g = el.getAttribute('data-g'); (groups[g] = groups[g] || []).push(el); });
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll progress drives the sequence. Each group fades in over a range [start, start+FADE]
  // and the raw progress is eased toward its target every frame, so motion stays smooth even with wheel steps.
  var SHOW = { 1: .02, 3: .42, 4: .50, 5: .58, 6: .64, 7: .70, 8: .76 };
  var FADE = .12, SCAN_A = .12, SCAN_B = .40;
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function stageFor(p) { return p < .02 ? -1 : p < .50 ? 0 : p < .82 ? 1 : 2; }

  function render(p) {
    Object.keys(SHOW).forEach(function (g) {
      var o = ease(clamp((p - SHOW[g]) / FADE)).toFixed(3);
      (groups[g] || []).forEach(function (el) { el.style.setProperty('--o', o); });
    });
    var sp = clamp((p - SCAN_A) / (SCAN_B - SCAN_A));
    var mo = ease(clamp((p - SCAN_A + .04) / .06)).toFixed(3);
    [].forEach.call(marks, function (m) {
      m.style.setProperty('--mo', mo);
      m.style.setProperty('--scan', ease(sp).toFixed(4));
      m.classList.toggle('done', p >= SCAN_B);
    });
    var a = stageFor(p);
    [].forEach.call(steps, function (el, i) { el.classList.toggle('on', i === a); el.classList.toggle('done', i < a); });
  }

  if (RM) { [].forEach.call(root.querySelectorAll('[data-g]'), function (el) { el.style.setProperty('--o', 1); }); render(1); return; }
  root.classList.add('gpa-anim');
  var target = 0, cur = 0, raf = 0;
  function measure() {
    var r = root.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
    target = clamp((vh * 0.9 - r.top) / (vh * 0.9));
  }
  function tick() {
    cur += (target - cur) * 0.12;
    if (Math.abs(target - cur) < 0.0008) cur = target;
    render(cur);
    raf = cur === target ? 0 : requestAnimationFrame(tick);
  }
  function onScroll() { measure(); if (!raf) raf = requestAnimationFrame(tick); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  measure(); cur = target; render(cur);
})();
