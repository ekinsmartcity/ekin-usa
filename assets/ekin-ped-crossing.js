/* Pedestrian crossing demo — deterministic scripted scene + synchronised activity feed.
   Two-way road, right-hand traffic: top lane westbound (right → left), bottom lane eastbound (left → right).
   viewBox 200×100 · pavements y 20–32 / 68–80 · road y 32–68 · centre line y 50 · zebra x 92–108 */
(function () {
  var root = document.getElementById('pxViz');
  if (!root) return;
  var NS = 'http://www.w3.org/2000/svg', svg = root.querySelector('svg'), feed = root.querySelector('.px-feed');
  var fDone = root.querySelector('[data-f="done"]'), fOn = root.querySelector('[data-f="on"]');
  var bPP = root.querySelector('[data-a="pp"]'), bRe = root.querySelector('[data-a="re"]'), bNx = root.querySelector('[data-a="nx"]');
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CYCLE = 37, LANE = { W: 41, E: 59 }, ZX0 = 92, ZX1 = 108, RY0 = 32, RY1 = 68, PAVE = { top: 26, bot: 74 };
  var CAR_HALF = 5, BRAKE = 12, PED_V = 6, SIDE = 28;

  // ---- one cycle of scripted activity (seconds within cycle) ----
  // Vehicles: lane, entry time t0, speed V (units/s). Optional stop: arrival time at stop line, go time.
  var VEH = [
    { id: 'w0', lane: 'W', t0: 0, V: 28 },
    { id: 'e1', lane: 'E', V: 24, stop: { at: 6.5, go: 11.6 }, rel: [5.4, 12.6], lab: ['Vehicle yielded', 6.5, 11.6] },
    { id: 'e2', lane: 'E', t0: 10.5, V: 26 },
    { id: 'w1', lane: 'W', t0: 19.5, V: 28 },
    { id: 'e3', lane: 'E', t0: 24.57, V: 26, flag: [28.3, 30.3], lab: ['Crossing interaction', 28.3, 30.3] },
    { id: 'w2', lane: 'W', t0: 30, V: 28 }
  ];
  // Pedestrians: crossing x, direction, tc = time standing at kerb edge before stepping onto the road.
  var PED = [
    { id: 'a', x: 97, dir: 'down', from: -1, tc: 4.3, rel: [5.3, 12.3] },
    { id: 'b', x: 103, dir: 'up', from: 1, tc: 15.3 },
    { id: 'c', x: 96, dir: 'down', from: -1, tc: 26.7, rel: [27.7, 34.7] }
  ];
  var ZONE_FLAG = [28.3, 30.3];
  var XOFF = [0, 1.5, -1.5]; // small deterministic variation per cycle

  // resolve stop-car entry times so they arrive exactly at the stop line
  VEH.forEach(function (v) {
    v.dir = v.lane === 'E' ? 1 : -1; v.x0 = v.lane === 'E' ? -10 : 210;
    if (v.stop) {
      v.xs = (v.lane === 'E' ? 88 : 112) - v.dir * (CAR_HALF + 1); v.xb = v.xs - v.dir * BRAKE;
      var dec = 2 * BRAKE / v.V; v.t1 = v.stop.at - dec; v.t0 = v.t1 - Math.abs(v.xb - v.x0) / v.V;
    }
  });
  function vx(v, t) {
    var s = t - v.t0; if (s < 0) return null;
    if (!v.stop) return v.x0 + v.dir * v.V * s;
    var dec = 2 * BRAKE / v.V, t1 = v.t1, t2 = t1 + dec, tg = v.stop.go, t3 = tg + dec, A = v.V * v.V / (4 * BRAKE);
    if (t < t1) return v.x0 + v.dir * v.V * s;
    if (t < t2) { var u = t - t1; return v.xb + v.dir * (v.V * u - A * u * u); }
    if (t < tg) return v.xs;
    if (t < t3) { var w = t - tg; return v.xs + v.dir * A * w * w; }
    return v.xs + v.dir * (BRAKE + v.V * (t - t3));
  }
  var CROSS_T = (PAVE.bot - PAVE.top) / PED_V, SIDE_T = SIDE / PED_V;
  function pp(p, t, xo) {
    var x = p.x + xo, y0 = p.dir === 'down' ? PAVE.top : PAVE.bot, y1 = p.dir === 'down' ? PAVE.bot : PAVE.top, sy = p.dir === 'down' ? 1 : -1;
    var ta = p.tc - SIDE_T, tb = p.tc + CROSS_T, te = tb + SIDE_T;
    if (t < ta || t > te) return null;
    var o = Math.min(1, (t - ta) / .5, (te - t) / .5);
    if (t < p.tc) return { x: x + p.from * (p.tc - t) * PED_V, y: y0, hd: p.from > 0 ? 180 : 0, o: o };
    if (t < tb) return { x: x, y: y0 + sy * (t - p.tc) * PED_V, hd: sy > 0 ? 90 : -90, o: o };
    return { x: x - p.from * (t - tb) * PED_V, y: y1, hd: p.from > 0 ? 180 : 0, o: o };
  }

  // ---- events derived from the same script ----
  var EVC = [];
  PED.forEach(function (p) {
    EVC.push({ t: p.tc + (RY0 - PAVE.top) / PED_V, k: 'enter', txt: 'Pedestrian entered crossing', p: p.id });
    EVC.push({ t: p.tc + CROSS_T, k: 'done', txt: 'Crossing completed', p: p.id });
  });
  VEH.forEach(function (v) {
    if (v.stop) EVC.push({ t: v.stop.at, k: 'yield', txt: 'Vehicle yielded' });
    if (v.flag) EVC.push({ t: v.flag[0], k: 'flag', txt: 'Crossing interaction flagged' });
  });
  EVC.sort(function (a, b) { return a.t - b.t; });
  function eventAt(i) { var c = Math.floor(i / EVC.length), e = EVC[i % EVC.length]; return { t: c * CYCLE + e.t, k: e.k, txt: e.txt }; }

  // ---- scene ----
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  el('rect', { 'class': 'px-pave', x: 0, y: 20, width: 200, height: 12 }, svg);
  el('rect', { 'class': 'px-pave', x: 0, y: 68, width: 200, height: 12 }, svg);
  el('rect', { 'class': 'px-road', x: 0, y: 32, width: 200, height: 36 }, svg);
  el('path', { 'class': 'px-kerb', d: 'M0 32H200M0 68H200' }, svg);
  el('path', { 'class': 'px-cl', d: 'M0 50H86M114 50H200' }, svg);
  for (var y = 33.4; y < 67; y += 4.4) el('rect', { 'class': 'px-zeb', x: ZX0, y: y, width: ZX1 - ZX0, height: 2.2 }, svg);
  el('path', { 'class': 'px-stop', d: 'M88 50.4V67.6M112 32.4V49.6' }, svg);
  [[30, 41, -1], [170, 41, -1], [30, 59, 1], [170, 59, 1]].forEach(function (a) {
    var x = a[0], yy = a[1], d = a[2];
    el('path', { 'class': 'px-arr', d: 'M' + (x - 4 * d) + ' ' + (yy - .5) + 'H' + x + 'V' + (yy - 1.6) + 'L' + (x + 3 * d) + ' ' + yy + 'L' + x + ' ' + (yy + 1.6) + 'V' + (yy + .5) + 'H' + (x - 4 * d) + 'Z' }, svg);
  });
  var t1 = el('text', { 'class': 'px-sl', x: 3, y: 37.6 }, svg); t1.textContent = 'Westbound';
  var t2 = el('text', { 'class': 'px-sl', x: 197, y: 65.4, 'text-anchor': 'end' }, svg); t2.textContent = 'Eastbound';
  var zone = el('rect', { 'class': 'px-zone', x: ZX0 - 1, y: RY0 + .3, width: ZX1 - ZX0 + 2, height: RY1 - RY0 - .6, rx: .6 }, svg);
  var layer = el('g', {}, svg), labs = el('g', {}, svg);

  function carShape(g) {
    el('rect', { 'class': 'b', x: -5, y: -2.4, width: 10, height: 4.8, rx: 1.4 }, g);
    el('rect', { 'class': 'c', x: -2.8, y: -1.9, width: 4, height: 3.8, rx: .7 }, g);
    el('rect', { 'class': 'w', x: 1.2, y: -1.9, width: 1.3, height: 3.8, rx: .45 }, g);
    el('rect', { 'class': 'w', x: -3.8, y: -1.75, width: .95, height: 3.5, rx: .35 }, g);
    el('rect', { 'class': 'px-ol', x: -5.8, y: -3.2, width: 11.6, height: 6.4, rx: 1.8 }, g);
  }
  function pedShape(g) {
    var f1 = el('ellipse', { 'class': 'ft', rx: .55, ry: .38, cx: 0, cy: -.55 }, g);
    var f2 = el('ellipse', { 'class': 'ft', rx: .55, ry: .38, cx: 0, cy: .55 }, g);
    el('ellipse', { 'class': 'sh', rx: .85, ry: 1.45 }, g);
    el('circle', { 'class': 'hd', r: .62, cx: .1 }, g);
    el('circle', { 'class': 'px-ol', r: 2.4 }, g);
    return [f1, f2];
  }
  var pool = {};
  function node(key, kind) {
    if (pool[key]) return pool[key];
    var g = el('g', { 'class': kind === 'car' ? 'px-car' : 'px-ped' }, layer), feet = null;
    if (kind === 'car') carShape(g); else feet = pedShape(g);
    return (pool[key] = { g: g, feet: feet, seen: true });
  }
  function label(key, txt, flag) {
    var k = 'l' + key; if (pool[k]) return pool[k];
    var g = el('g', {}, labs), t = el('text', { 'class': 'px-lab' + (flag ? ' flag' : ''), 'text-anchor': 'middle' }, g); t.textContent = txt;
    return (pool[k] = { g: g, t: t, seen: true });
  }

  var VB = [0, 200], LW = 0.58; // current viewBox x-range; label glyph width per font unit
  var T = 0, evI = 0, done = 0, playing = false, inView = false, userPaused = false, raf = 0, last = 0, started = false;

  function render() {
    Object.keys(pool).forEach(function (k) { pool[k].seen = false; });
    var c0 = Math.max(0, Math.floor(T / CYCLE) - 1), on = 0;
    for (var c = c0; c <= c0 + 1; c++) {
      var lt = T - c * CYCLE, xo = XOFF[c % XOFF.length];
      if (lt < -12) continue;
      VEH.forEach(function (v) {
        var x = vx(v, lt); if (x === null || x < -14 || x > 214) return;
        var n = node(c + v.id, 'car'); n.seen = true;
        n.g.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + LANE[v.lane] + ') rotate(' + (v.dir > 0 ? 0 : 180) + ')');
        var rel = v.rel && lt >= v.rel[0] && lt < v.rel[1], fl = v.flag && lt >= v.flag[0] && lt < v.flag[1];
        n.g.classList.toggle('rel', !!rel); n.g.classList.toggle('flag', !!fl);
        if (v.lab && lt >= v.lab[1] && lt < v.lab[2]) {
          var L = label(c + v.id, v.lab[0], !!v.flag); L.seen = true;
          var half = v.lab[0].length * labelFont() * LW / 2 + 1.5;
          L.t.setAttribute('x', Math.max(VB[0] + half, Math.min(VB[1] - half, x)).toFixed(2)); L.t.setAttribute('y', v.lane === 'E' ? 88 : 15);
        }
      });
      PED.forEach(function (p) {
        var q = pp(p, lt, xo); if (!q) return;
        var n = node(c + p.id, 'ped'); n.seen = true;
        n.g.setAttribute('transform', 'translate(' + q.x.toFixed(2) + ' ' + q.y.toFixed(2) + ') rotate(' + q.hd + ')');
        n.g.setAttribute('opacity', q.o.toFixed(2));
        var ph = Math.sin(lt * 9) * .45; n.feet[0].setAttribute('cx', ph.toFixed(2)); n.feet[1].setAttribute('cx', (-ph).toFixed(2));
        n.g.classList.toggle('rel', !!(p.rel && lt >= p.rel[0] && lt < p.rel[1]));
        if (q.y > RY0 && q.y < RY1 && q.x > ZX0 - 2 && q.x < ZX1 + 2) on++;
      });
    }
    var zl = T - Math.floor(T / CYCLE) * CYCLE; zone.classList.toggle('on', zl >= ZONE_FLAG[0] && zl < ZONE_FLAG[1]);
    Object.keys(pool).forEach(function (k) { if (!pool[k].seen) { pool[k].g.remove(); delete pool[k]; } });
    fOn.textContent = on;
    // emit events whose time has passed
    while (true) { var ev = eventAt(evI); if (ev.t > T) break; emit(ev); evI++; }
  }

  function emit(ev) {
    var w = feed.querySelector('.px-wait'); if (w) w.remove();
    if (ev.k === 'done') { done++; fDone.textContent = done; }
    var li = document.createElement('li'); if (ev.k === 'flag') li.className = 'flag';
    var m = Math.floor(ev.t / 60), s = Math.floor(ev.t % 60);
    li.innerHTML = '<b>' + ev.txt + '</b><span>' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '</span>';
    var old = [].slice.call(feed.children, 0, 6), tops = old.map(function (n) { return n.offsetTop; });
    feed.insertBefore(li, feed.firstChild);
    if (!RM && feed.scrollTop < 6) {
      old.forEach(function (n, i) { var dy = tops[i] - n.offsetTop; if (dy) { n.style.transition = 'none'; n.style.transform = 'translateY(' + dy + 'px)'; } });
      void feed.offsetHeight;
      old.forEach(function (n) { n.style.transition = 'transform .26s ease, background-color .8s ease'; n.style.transform = ''; });
      li.classList.add('enter');
    }
    li.classList.add('new'); setTimeout(function () { li.classList.remove('new'); }, 800);
    while (feed.children.length > 30) feed.removeChild(feed.lastChild);
  }

  function tick(now) {
    if (!playing) return;
    T += Math.min(.05, (now - last) / 1000); last = now;
    render(); raf = requestAnimationFrame(tick);
  }
  function sync() {
    var want = !RM && !userPaused && inView;
    if (want && !playing) { playing = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    else if (!want && playing) { playing = false; cancelAnimationFrame(raf); }
    bPP.textContent = userPaused ? 'Resume' : 'Pause';
  }
  function restart() {
    T = 0; evI = 0; done = 0; fDone.textContent = '0'; fOn.textContent = '0';
    Object.keys(pool).forEach(function (k) { pool[k].g.remove(); }); pool = {};
    feed.innerHTML = '<li class="px-wait">Waiting for crossing activity</li>';
    render();
  }
  bPP.addEventListener('click', function () { userPaused = !userPaused; sync(); });
  bRe.addEventListener('click', function () { restart(); sync(); });
  bNx.addEventListener('click', function () { T = eventAt(evI).t + .01; render(); });

  // keep figures readable on narrow screens by cropping to the crossing instead of shrinking
  function labelFont() { return parseFloat(getComputedStyle(svg.querySelector('.px-lab') || svg).fontSize) || 4.4; }
  function fit() {
    var crop = root.clientWidth < 560;
    svg.setAttribute('viewBox', crop ? '44 10 112 84' : '0 0 200 100');
    VB = crop ? [44, 156] : [0, 200];
    t1.setAttribute('x', VB[0] + 2); t2.setAttribute('x', VB[1] - 2);
  }
  fit(); window.addEventListener('resize', fit);

  restart();
  if (RM) { bPP.hidden = true; bNx.hidden = false; return; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { inView = e.isIntersecting; sync(); }); }, { threshold: .3 }).observe(root);
  } else { inView = true; sync(); }
})();
