/* Speed Enforcement demo — continuous traffic + synchronised record feed.
   ONE scenario dataset (SCN) drives vehicle movement, plate, class, lane, speed, limit and result.
   Playback is time-compressed: road units per second are scaled from mph (MPH_TO_U). */
(function () {
  var root = document.getElementById('spViz');
  if (!root) return;
  var NS = 'http://www.w3.org/2000/svg', svg = root.querySelector('svg'), list = root.querySelector('.sp-list');
  var bPP = root.querySelector('[data-a="pp"]'), bRe = root.querySelector('[data-a="re"]'), bNx = root.querySelector('[data-a="nx"]');
  var bLatest = root.querySelector('.sp-latest'), tabs = root.querySelectorAll('.sp-tabs button');
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LIMIT = { Car: 55, Bus: 45, Truck: 45 }; // mph, common US values
  var LANE_Y = [22, 40, 58];
  var KMH_TO_U = 0.00062; // road units per ms per mph
  var ROAD_W = 200;

  // Shared scenario: [plate, class, lane (1-3), mph, entry time ms]. Lane 1 = top. Entries are spaced so
  // vehicles in the same lane never overlap (checked against speed and length).
  var SCN = [
    ['ABC XYZ', 'Car', 1, 52, 0],
    ['KLM 204', 'Bus', 2, 43, 600],
    ['TRK 118', 'Truck', 3, 42, 1600],
    ['DEF 315', 'Car', 1, 61, 3400],
    ['XYZ ABC', 'Car', 2, 69, 6600],
    ['RST 836', 'Car', 1, 54, 7400],
    ['GHJ 742', 'Car', 3, 50, 7600],
    ['EFG 271', 'Car', 2, 55, 10200],
    ['BCD 963', 'Car', 1, 66, 11000],
    ['UVW 427', 'Bus', 3, 41, 11600],
    ['QRS 389', 'Car', 2, 63, 14600],
    ['NOP 155', 'Car', 1, 58, 15000],
    ['HIJ 648', 'Truck', 3, 43, 16000]
  ];
  var CYCLE = 18000; // scenario repeats with new instances, so traffic keeps flowing (spacing verified per lane)

  var MODE = {
    point: { m: 142 },
    section: { a: 52, b: 178, km: 0.5 } // B–A distance is presented as 0.5 mi
  };

  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function shape(type, g) {
    if (type === 'Car') {
      el('rect', { 'class': 'b', x: -4.5, y: -2.2, width: 9, height: 4.4, rx: 1.3 }, g);
      el('rect', { 'class': 'c', x: -2.5, y: -1.75, width: 3.6, height: 3.5, rx: .6 }, g);
      el('rect', { 'class': 'w', x: 1.1, y: -1.75, width: 1.2, height: 3.5, rx: .4 }, g);
      el('rect', { 'class': 'w', x: -3.4, y: -1.6, width: .85, height: 3.2, rx: .3 }, g);
      el('rect', { 'class': 'o', x: -5.2, y: -2.9, width: 10.4, height: 5.8, rx: 1.6 }, g);
      return 9;
    }
    if (type === 'Bus') {
      el('rect', { 'class': 'b', x: -11, y: -2.5, width: 22, height: 5, rx: .8 }, g);
      el('rect', { 'class': 'c', x: -9.6, y: -1.7, width: 18.6, height: 3.4, rx: .4 }, g);
      el('rect', { 'class': 'w', x: 9.6, y: -2.1, width: 1, height: 4.2, rx: .3 }, g);
      el('rect', { 'class': 'o', x: -11.7, y: -3.2, width: 23.4, height: 6.4, rx: 1 }, g);
      return 22;
    }
    el('rect', { 'class': 't', x: -12, y: -2.6, width: 16.6, height: 5.2, rx: .4 }, g);
    el('rect', { 'class': 'b', x: 5.2, y: -2.3, width: 5.4, height: 4.6, rx: .9 }, g);
    el('rect', { 'class': 'w', x: 8.9, y: -1.9, width: 1, height: 3.8, rx: .3 }, g);
    el('rect', { 'class': 'o', x: -12.7, y: -3.3, width: 24, height: 6.6, rx: 1 }, g);
    return 22.6;
  }

  var mode = 'point', T = 0, playing = false, inView = false, started = false, userPaused = false, raf = 0, last = 0;
  var vehLayer, labLayer, live = [], nextIdx = 0, cycle = 0, recs = {}, focusId = null, atTop = true, rmStep = 0;

  function drawRoad() {
    svg.innerHTML = '';
    el('rect', { 'class': 'sp-asph', x: 0, y: 13, width: ROAD_W, height: 54 }, svg);
    el('path', { 'class': 'sp-edge', d: 'M0 13H200M0 67H200' }, svg);
    el('path', { 'class': 'sp-sep', d: 'M0 31H200M0 49H200' }, svg);
    LANE_Y.forEach(function (y, i) {
      [30, 100, 170].forEach(function (x) { el('path', { 'class': 'sp-arr', d: 'M' + (x - 4) + ' ' + (y - .5) + 'H' + x + 'V' + (y - 1.6) + 'L' + (x + 3) + ' ' + y + 'L' + x + ' ' + (y + 1.6) + 'V' + (y + .5) + 'H' + (x - 4) + 'Z' }, svg); });
      var t = el('text', { 'class': 'sp-ln', x: 2.5, y: y - 5 }, svg); t.textContent = 'Lane ' + (i + 1);
    });
    var M = MODE[mode];
    if (mode === 'point') {
      el('path', { 'class': 'sp-mk', d: 'M' + M.m + ' 13V70' }, svg);
      var mt = el('text', { 'class': 'sp-mkt', x: M.m, y: 76.5, 'text-anchor': 'middle' }, svg); mt.textContent = 'Measurement point';
    } else {
      [['a', 'Checkpoint A'], ['b', 'Checkpoint B']].forEach(function (c) {
        el('path', { 'class': 'sp-mk', d: 'M' + M[c[0]] + ' 13V70' }, svg);
        var t = el('text', { 'class': 'sp-mkt', x: M[c[0]], y: 76.5, 'text-anchor': 'middle' }, svg); t.textContent = c[1];
      });
      el('path', { 'class': 'sp-dist', d: 'M' + M.a + ' 83H' + M.b + 'M' + M.a + ' 81.4V84.6M' + M.b + ' 81.4V84.6' }, svg);
      var dt = el('text', { 'class': 'sp-mkt', x: (M.a + M.b) / 2, y: 90.5, 'text-anchor': 'middle' }, svg); dt.textContent = 'Section · ' + M.km + ' mi';
    }
    vehLayer = el('g', {}, svg); labLayer = el('g', {}, svg);
  }

  function spawn(d, c) {
    var id = c + ':' + d[0];
    var g = el('g', { 'class': 'sp-v ' + d[1].toLowerCase() }, vehLayer);
    var inner = el('g', { transform: 'scale(1.35)' }, g); var len = shape(d[1], inner) * 1.35;
    var v = { id: id, plate: d[0], cls: d[1], lane: d[2], kmh: d[3], lim: LIMIT[d[1]], t0: c * CYCLE + d[4], len: len, g: g, x: -len, stage: 0, lab: null, labT: 0 };
    v.vio = v.kmh > v.lim;
    g.addEventListener('click', function () { setFocus(v.id); });
    live.push(v);
  }

  /* ---------- feed ---------- */
  function fmt(v, done) {
    var sec = mode === 'section';
    var ms = sec && !done ? '<span>Section in progress</span>' : '<i>' + (sec ? 'Average speed <b>' + v.avg + ' mph</b>' : '<b>' + v.kmh + ' mph</b>') + '</i> <i><span>/ Limit ' + v.lim + ' mph</span></i>';
    var st = sec && !done ? 'Awaiting checkpoint B' : (v.vio ? 'Speed violation detected' : 'Within limit');
    var extra = done && v.vio ? '<span>+' + ((sec ? v.avg : v.kmh) - v.lim) + ' mph</span>' : '';
    var time = sec && done ? '<span class="sp-tm">' + MODE.section.km + ' mi · ' + v.secT + ' s</span>' : '';
    return '<span class="sp-pl">' + v.plate + '</span><span class="sp-cls">' + v.cls + ' · Lane ' + v.lane + '</span><span class="sp-ms">' + ms + '</span>' + time + '<span class="sp-stt"><span>' + st + '</span>' + extra + '</span>';
  }
  function addRec(v, done) {
    var li = document.createElement('li');
    li.className = 'sp-rec' + (done ? (v.vio ? ' vio' : '') : ' pend');
    li.dataset.id = v.id;
    var b = document.createElement('button'); b.type = 'button'; b.innerHTML = fmt(v, done);
    b.setAttribute('aria-label', v.plate + ', ' + v.cls + ', lane ' + v.lane);
    b.addEventListener('click', function () { setFocus(v.id); });
    li.appendChild(b);
    // FLIP: slide existing rows down by the new row's height
    var old = [].slice.call(list.children, 0, 8), tops = old.map(function (n) { return n.offsetTop; });
    list.insertBefore(li, list.firstChild);
    if (!RM && atTop) {
      old.forEach(function (n, i) { var dy = tops[i] - n.offsetTop; if (dy) { n.style.transition = 'none'; n.style.transform = 'translateY(' + dy + 'px)'; } });
      void list.offsetHeight;
      old.forEach(function (n) { n.style.transition = ''; n.style.transform = ''; });
      li.classList.add('enter');
    }
    if (!atTop) { list.scrollTop += li.offsetHeight; bLatest.hidden = false; }
    li.classList.add('new'); setTimeout(function () { li.classList.remove('new'); }, 900);
    while (list.children.length > 40) list.removeChild(list.lastChild);
    recs[v.id] = li;
    focusSync();
  }
  function completeRec(v) {
    var li = recs[v.id]; if (!li) return addRec(v, true);
    li.className = 'sp-rec' + (v.vio ? ' vio' : '');
    li.firstChild.innerHTML = fmt(v, true);
    li.classList.add('new'); setTimeout(function () { li.classList.remove('new'); }, 900);
    focusSync();
  }
  list.addEventListener('scroll', function () { atTop = list.scrollTop < 6; if (atTop) bLatest.hidden = true; }, { passive: true });
  bLatest.addEventListener('click', function () { list.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); atTop = true; bLatest.hidden = true; });

  function setFocus(id) { focusId = focusId === id ? null : id; focusSync(); }
  function focusSync() {
    live.forEach(function (v) { v.g.classList.toggle('focus', v.id === focusId); });
    [].forEach.call(list.children, function (li) { li.classList.toggle('on', li.dataset.id === focusId); });
  }

  function label(v, txt) {
    if (v.lab) v.lab.remove();
    v.lab = el('text', { 'class': 'sp-sl' + (v.vio ? ' hit' : ''), 'text-anchor': 'middle', y: LANE_Y[v.lane - 1] - 5.6 }, labLayer);
    v.lab.textContent = txt; v.labT = T;
  }

  /* ---------- simulation ---------- */
  function step() {
    while (true) {
      var d = SCN[nextIdx], t0 = cycle * CYCLE + d[4];
      if (T < t0) break;
      spawn(d, cycle);
      nextIdx++; if (nextIdx >= SCN.length) { nextIdx = 0; cycle++; SCN.sort(function (a, b) { return a[4] - b[4]; }); }
    }
    var M = MODE[mode];
    live = live.filter(function (v) {
      var x = -v.len / 2 + (T - v.t0) * v.kmh * KMH_TO_U;
      v.x = x;
      v.g.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + LANE_Y[v.lane - 1] + ')');
      var front = x + v.len / 2;
      if (mode === 'point') {
        if (v.stage === 0 && front >= M.m) { v.stage = 1; v.g.classList.toggle('hit', v.vio); label(v, v.kmh + ' mph'); addRec(v, true); }
      } else {
        if (v.stage === 0 && front >= M.a) { v.stage = 1; v.tA = T; addRec(v, false); }
        if (v.stage === 1 && front >= M.b) {
          v.stage = 2;
          // displayed values are derived from the vehicle's assigned speed so distance/time/average stay consistent
          v.secT = Math.round(M.km / v.kmh * 3600); v.avg = Math.round(M.km / (v.secT / 3600));
          v.vio = v.avg > v.lim; v.g.classList.toggle('hit', v.vio); label(v, v.avg + ' mph avg'); completeRec(v);
        }
      }
      if (v.lab) { v.lab.setAttribute('x', Math.max(14, Math.min(186, x)).toFixed(2)); if (T - v.labT > 1600) { v.lab.remove(); v.lab = null; } }
      if (x - v.len / 2 > ROAD_W + 2) { v.g.remove(); if (v.lab) v.lab.remove(); if (v.id === focusId) { focusId = null; focusSync(); } return false; }
      return true;
    });
  }

  function tick(now) {
    if (!playing) return;
    T += Math.min(50, now - last); last = now;
    step();
    raf = requestAnimationFrame(tick);
  }
  function setPP() { bPP.textContent = playing ? 'Pause' : 'Resume'; }
  function play() { if (!inView) return; playing = true; last = performance.now(); setPP(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  function stop() { playing = false; cancelAnimationFrame(raf); setPP(); }

  function reset(m) {
    stop(); mode = m; root.dataset.mode = m;
    [].forEach.call(tabs, function (b) { var on = b.dataset.mode === m; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    SCN.sort(function (a, b) { return a[4] - b[4]; });
    drawRoad(); live = []; nextIdx = 0; cycle = 0; recs = {}; focusId = null; list.innerHTML = ''; list.scrollTop = 0; atTop = true; bLatest.hidden = true;
    T = 0; rmStep = 0;
    if (RM) { bPP.hidden = true; bNx.hidden = false; step(); return; }
    step(); setPP();
    if (started && !userPaused) play();
  }

  // Reduced motion: manual progression — each press advances until the next measurement occurs.
  bNx.addEventListener('click', function () {
    var n = list.children.length, guard = 0, before = live.map(function (v) { return v.stage; }).join();
    while (guard++ < 4000) { T += 25; step(); var now = live.map(function (v) { return v.stage; }).join(); if (list.children.length > n || (now !== before && mode === 'section')) break; }
  });

  [].forEach.call(tabs, function (b, i) {
    b.addEventListener('click', function () { reset(b.dataset.mode); });
    b.addEventListener('keydown', function (e) { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); var n = tabs[(i + 1) % 2]; n.focus(); reset(n.dataset.mode); });
  });
  bPP.addEventListener('click', function () { if (playing) { userPaused = true; stop(); } else { userPaused = false; inView = true; play(); } });
  bRe.addEventListener('click', function () { reset(mode); if (!RM && !playing && !userPaused) play(); });

  reset('point');
  if (RM) return;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        inView = e.isIntersecting;
        if (!inView) { if (playing) { playing = false; cancelAnimationFrame(raf); } return; }
        started = true;
        if (!userPaused) play();
      });
    }, { threshold: .3 }).observe(root);
  } else { inView = true; started = true; play(); }
})();
