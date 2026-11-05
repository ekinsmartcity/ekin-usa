/* Red Light Enforcement demo — one deterministic timeline drives signal, vehicles, evidence frames and records.
   viewBox 240×72 · traffic left → right · lanes y 30 (Lane 1) / 46 (Lane 2) · stop line x 150 · junction x 160–196 */
(function () {
  var root = document.getElementById('rxViz');
  if (!root) return;
  var NS = 'http://www.w3.org/2000/svg';
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = function (s) { return root.querySelector(s); };
  var road = q('.rx-road'), main = q('.rx-road svg'), frames = root.querySelectorAll('.rx-fr'), sel = q('.rx-sel'), bNew = q('.rx-new');
  var det = { empty: q('.rx-empty'), dl: q('.rx-dl'), plate: q('[data-f="plate"]'), lane: q('[data-f="lane"]'), into: q('[data-f="into"]') };
  var bPP = q('[data-a="pp"]'), bRe = q('[data-a="re"]'), bNx = q('[data-a="nx"]'), bLive = q('[data-a="live"]');

  // ---- scenario ----
  var CYC = 20, AMBER = 8, RED = 11;               // green 0–8 s, amber 8–11 s, red 11–20 s
  var STOP = 150, LANE_Y = [0, 30, 46], LEN = { car: 10, bus: 22, truck: 22 }, BRAKE = 18;
  var INTO = [0.8, 1.3, 0.4];                       // time into red at the line, per cycle (deterministic variation)
  var PLATES = ['ABC XYZ', 'XYZ ABC', 'KLM 204', 'DEF 315'];
  var BEFORE = -0.5, AFTER = 0.8;                   // capture offsets relative to the crossing

  function phase(t) { var u = ((t % CYC) + CYC) % CYC; return u < AMBER ? 'g' : u < RED ? 'a' : 'r'; }
  function laneA(c) { return c % 2 === 0 ? 1 : 2; }
  function laneB(c) { return c % 2 === 0 ? 2 : 1; }

  // vehicles of cycle c (absolute times). Passers: front at the stop line at tL. Stoppers: arrive at line at tS, go at tG.
  function cycleVehicles(c) {
    var b = c * CYC, A = laneA(c), B = laneB(c), into = INTO[((c % 3) + 3) % 3];
    return [
      { id: c + 'p1', k: 'car', lane: 1, V: 30, tL: b + 3.8 },
      { id: c + 'p2', k: 'truck', lane: 2, V: 26, tL: b + 5 },
      { id: c + 'p3', k: 'car', lane: A, V: 30, tL: b + 10.4 },                    // crosses on amber: not flagged
      { id: c + 's', k: 'car', lane: A, V: 30, tL: b + RED + into, ev: c },        // crosses after red: event
      { id: c + 'b1', k: 'car', lane: B, V: 30, tS: b + 9.6, tG: b + CYC + 1.0 },  // stops on amber
      { id: c + 'b2', k: 'bus', lane: A, V: 24, tS: b + 15.5, tG: b + CYC + 0.2 }  // stops on red
    ];
  }
  function front(v, t) {
    if (v.tL != null) return STOP + v.V * (t - v.tL);
    var xs = STOP - 2, dec = 2 * BRAKE / v.V, A = v.V * v.V / (4 * BRAKE), t1 = v.tS - dec;
    if (t < t1) return xs - BRAKE - v.V * (t1 - t);
    if (t < v.tS) { var s = t - t1; return xs - BRAKE + v.V * s - A * s * s; }
    if (t < v.tG) return xs;
    var w = t - v.tG; if (w < dec) return xs + A * w * w;
    return xs + BRAKE + v.V * (w - dec);
  }
  function eventOf(c) {
    var into = INTO[((c % 3) + 3) % 3], tc = c * CYC + RED + into;
    return { c: c, n: c + 1, plate: PLATES[c % PLATES.length], lane: laneA(c), into: into, tc: tc, tb: tc + BEFORE, ta: tc + AFTER };
  }

  // ---- drawing ----
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function staticScene(svg, withText) {
    el('rect', { 'class': 'rx-pave', x: 0, y: 14, width: 240, height: 8 }, svg);
    el('rect', { 'class': 'rx-pave', x: 0, y: 54, width: 240, height: 8 }, svg);
    el('rect', { 'class': 'rx-asph', x: 0, y: 22, width: 240, height: 32 }, svg);
    el('rect', { 'class': 'rx-asph', x: 160, y: 0, width: 36, height: 72 }, svg);
    el('path', { 'class': 'rx-kerb', d: 'M0 22H160M196 22H240M0 54H160M196 54H240M160 0V22M196 0V22M160 54V72M196 54V72' }, svg);
    el('path', { 'class': 'rx-sep', d: 'M0 38H148M198 38H240' }, svg);
    el('path', { 'class': 'rx-stop', d: 'M' + STOP + ' 22.4V53.6' }, svg);
    [[40, 30], [100, 30], [40, 46], [100, 46], [222, 30], [222, 46]].forEach(function (a) {
      var x = a[0], y = a[1];
      el('path', { 'class': 'rx-arr', d: 'M' + (x - 4) + ' ' + (y - .5) + 'H' + x + 'V' + (y - 1.6) + 'L' + (x + 3) + ' ' + y + 'L' + x + ' ' + (y + 1.6) + 'V' + (y + .5) + 'H' + (x - 4) + 'Z' }, svg);
    });
    var sg = el('g', { 'class': 'rx-sig' }, svg);
    el('rect', { x: 151.5, y: 2.5, width: 5.4, height: 14, rx: .8 }, sg);
    var L = { r: el('circle', { 'class': 'r', cx: 154.2, cy: 5.6, r: 1.6 }, sg), a: el('circle', { 'class': 'a', cx: 154.2, cy: 9.5, r: 1.6 }, sg), g: el('circle', { 'class': 'g', cx: 154.2, cy: 13.4, r: 1.6 }, sg) };
    if (withText) {
      var t = el('text', { 'class': 'rx-t', x: 149.5, y: 10.6, 'text-anchor': 'end' }, svg); t.textContent = 'Traffic signal';
      var l1 = el('text', { 'class': 'rx-t rx-ll', x: 3, y: 27.4 }, svg); l1.textContent = 'Lane 1';
      var l2 = el('text', { 'class': 'rx-t rx-ll', x: 3, y: 51.6 }, svg); l2.textContent = 'Lane 2';
      var sl = el('text', { 'class': 'rx-t', x: STOP, y: 59.6, 'text-anchor': 'middle' }, svg); sl.textContent = 'Stop line';
    }
    return { lamps: L, dyn: el('g', {}, svg), lab: el('g', {}, svg) };
  }
  function vehShape(k, g) {
    if (k === 'car') {
      el('rect', { 'class': 'b', x: -10, y: -2.4, width: 10, height: 4.8, rx: 1.4 }, g);
      el('rect', { 'class': 'c', x: -7.8, y: -1.9, width: 4, height: 3.8, rx: .7 }, g);
      el('rect', { 'class': 'w', x: -3.8, y: -1.9, width: 1.3, height: 3.8, rx: .45 }, g);
      el('rect', { 'class': 'w', x: -8.8, y: -1.75, width: .95, height: 3.5, rx: .35 }, g);
      el('rect', { 'class': 'o', x: -10.8, y: -3.2, width: 11.6, height: 6.4, rx: 1.8 }, g);
    } else if (k === 'bus') {
      el('rect', { 'class': 'b', x: -22, y: -2.8, width: 22, height: 5.6, rx: .9 }, g);
      el('rect', { 'class': 'c', x: -20.6, y: -2, width: 18.6, height: 4, rx: .5 }, g);
      el('rect', { 'class': 'w', x: -1.6, y: -2.4, width: 1.1, height: 4.8, rx: .35 }, g);
      el('rect', { 'class': 'o', x: -22.8, y: -3.6, width: 23.6, height: 7.2, rx: 1.2 }, g);
    } else {
      el('rect', { 'class': 't', x: -22, y: -2.9, width: 16.4, height: 5.8, rx: .4 }, g);
      el('rect', { 'class': 'b', x: -5.4, y: -2.6, width: 5.4, height: 5.2, rx: 1 }, g);
      el('rect', { 'class': 'w', x: -1.6, y: -2.2, width: 1.1, height: 4.4, rx: .35 }, g);
      el('rect', { 'class': 'o', x: -22.8, y: -3.7, width: 23.6, height: 7.4, rx: 1.2 }, g);
    }
  }
  // Renders the exact scene state at time t into a prepared scene. hlEvent: cycle whose selected vehicle is outlined.
  function drawAt(S, t, opts) {
    var ph = phase(t);
    ['r', 'a', 'g'].forEach(function (k) { S.lamps[k].classList.toggle('on', ph === k); });
    S.dyn.innerHTML = ''; S.lab.innerHTML = '';
    var c0 = Math.floor(t / CYC);
    for (var c = c0 - 1; c <= c0 + 1; c++) {
      if (c < 0) continue;
      cycleVehicles(c).forEach(function (v) {
        var x = front(v, t); if (x < -2 || x - LEN[v.k] > 242) return;
        var g = el('g', { 'class': 'rx-v ' + v.k, transform: 'translate(' + x.toFixed(2) + ' ' + LANE_Y[v.lane] + ')' }, S.dyn);
        vehShape(v.k, g);
        if (v.ev != null && t >= v.tL) {
          g.classList.add('hit');
          if (opts && opts.label && t - v.tL < 2.2) {
            var lt = el('text', { 'class': 'rx-lab', y: v.lane === 1 ? 19.6 : 66, 'text-anchor': 'middle', x: Math.max(30, Math.min(212, x - 5)).toFixed(2) }, S.lab);
            lt.textContent = 'Red-light event detected';
          }
        }
      });
    }
    return ph;
  }

  var M = staticScene(main, true);
  var F = [].map.call(frames, function (f) { return staticScene(f.querySelector('svg'), false); });
  var PHN = { g: 'Green', a: 'Amber', r: 'Red' };

  // ---- state ----
  var T = 0, playing = false, inView = false, userPaused = false, raf = 0, last = 0;
  var events = [], shown = null, inspectT = null, pinned = false;

  function fmtS(x) { return (x > 0 ? '+' : x < 0 ? '\u2212' : '') + Math.abs(x).toFixed(1) + ' s'; }
  function showEvent(e) {
    shown = e;
    var ks = { before: e.tb, cross: e.tc, after: e.ta }, offs = { before: BEFORE, cross: 0, after: AFTER };
    [].forEach.call(frames, function (f, i) {
      var k = f.dataset.k, tt = ks[k], has = T >= tt;
      f.classList.toggle('has', has); f.disabled = !has;
      f.querySelector('em').textContent = has ? fmtS(offs[k]) : '';
      var ph = has ? drawAt(F[i], tt, {}) : null;
      if (!has) { F[i].dyn.innerHTML = ''; }
      f.querySelector('.rx-fs').textContent = has ? 'Signal: ' + PHN[ph] : '';
      f.setAttribute('aria-label', f.querySelector('b').textContent + (has ? ', signal ' + PHN[ph] + ', ' + fmtS(offs[k]) : ', not yet captured'));
      f.classList.toggle('sel', inspectT !== null && Math.abs(inspectT - tt) < 1e-6);
    });
    var done = T >= e.tc;
    det.empty.hidden = done; det.dl.hidden = !done;
    if (done) { det.plate.textContent = e.plate; det.lane.textContent = 'Lane ' + e.lane; det.into.textContent = e.into.toFixed(1) + ' s'; }
    [].forEach.call(sel.children, function (b) { b.setAttribute('aria-pressed', +b.dataset.n === e.n ? 'true' : 'false'); });
  }
  function addSel(e) {
    var b = document.createElement('button'); b.type = 'button'; b.dataset.n = e.n; b.textContent = 'Event ' + e.n;
    b.addEventListener('click', function () { var ev = events.filter(function (x) { return x.n === e.n; })[0]; pinned = ev !== events[events.length - 1]; bNew.hidden = true; showEvent(ev); });
    sel.appendChild(b);
    while (sel.children.length > 5) sel.removeChild(sel.firstChild);
  }

  function step() {
    // start a new evidence sequence when its "before" moment occurs; reveal details at the crossing
    while (eventOf(events.length).tb <= T) {
      var e = eventOf(events.length);
      events.push(e); addSel(e);
      if (pinned || inspectT !== null) bNew.hidden = false; else showEvent(e);
    }
    if (shown && !pinned && inspectT === null) showEvent(shown);
    else if (shown) showEvent(shown);
    if (inspectT === null) drawAt(M, T, { label: true });
  }

  function tick(now) {
    if (!playing) return;
    T += Math.min(.05, (now - last) / 1000); last = now;
    step(); raf = requestAnimationFrame(tick);
  }
  function sync() {
    var want = !RM && !userPaused && inView && inspectT === null;
    if (want && !playing) { playing = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    else if (!want && playing) { playing = false; cancelAnimationFrame(raf); }
    bPP.textContent = userPaused ? 'Resume' : 'Pause';
  }
  function inspect(tt) {
    inspectT = tt; road.classList.add('insp'); bLive.hidden = false;
    drawAt(M, tt, { label: false }); showEvent(shown); sync();
  }
  function live() {
    inspectT = null; road.classList.remove('insp'); bLive.hidden = true;
    if (!pinned && events.length) { bNew.hidden = true; showEvent(events[events.length - 1]); }
    step(); sync();
  }
  [].forEach.call(frames, function (f) {
    f.addEventListener('click', function () {
      if (!shown || f.disabled) return;
      var tt = { before: shown.tb, cross: shown.tc, after: shown.ta }[f.dataset.k];
      inspect(tt);
    });
  });
  bLive.addEventListener('click', live);
  bNew.addEventListener('click', function () { pinned = false; bNew.hidden = true; inspectT = null; road.classList.remove('insp'); bLive.hidden = true; showEvent(events[events.length - 1]); step(); sync(); });
  bPP.addEventListener('click', function () { userPaused = !userPaused; sync(); });
  bRe.addEventListener('click', function () {
    T = 0; events = []; shown = null; inspectT = null; pinned = false; sel.innerHTML = ''; bNew.hidden = true; bLive.hidden = true; road.classList.remove('insp');
    [].forEach.call(frames, function (f, i) { f.classList.remove('has', 'sel'); f.disabled = true; f.querySelector('em').textContent = ''; f.querySelector('.rx-fs').textContent = ''; F[i].dyn.innerHTML = ''; });
    det.empty.hidden = false; det.dl.hidden = true; step(); sync();
  });

  // reduced motion: step through key moments of the timeline
  function nextKey() {
    var u = ((T % CYC) + CYC) % CYC, b = T - u, e = eventOf(Math.floor(T / CYC));
    var keys = [3, AMBER, 9.6, 10.4, RED, e.tb - b, e.tc - b, e.ta - b, 15.5, CYC + .4].sort(function (x, y) { return x - y; });
    for (var i = 0; i < keys.length; i++) if (keys[i] > u + 1e-3) return b + keys[i];
    return b + CYC + 3;
  }
  bNx.addEventListener('click', function () { if (inspectT !== null) live(); T = nextKey(); step(); });

  function fit() {
    var crop = root.clientWidth < 600;
    main.setAttribute('viewBox', crop ? '62 0 178 72' : '0 0 240 72');
    [].forEach.call(main.querySelectorAll('.rx-ll'), function (t) { t.setAttribute('x', crop ? 65 : 3); });
  }
  fit(); window.addEventListener('resize', fit);

  step();
  if (RM) { bPP.hidden = true; bNx.hidden = false; return; }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { inView = e.isIntersecting; sync(); }); }, { threshold: .3 }).observe(root);
  else { inView = true; sync(); }
})();
