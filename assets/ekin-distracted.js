/* Distracted driving demo — continuous road + compact event card + event history.
   DX_EVENTS is the single source for each event's photo, regions, plate, vehicle, lane and results.
   Regions are in the photo's intrinsic pixels (1448×1086); the card shows the band y 0–CROP_H. */
var DX_EVENTS = [
  { id: 1, img: 'images/dd/dd-ev1-navy.webp', alt: 'Driver in a navy blouse holding a phone, seatbelt fastened; face out of frame',
    plate: 'ABC XYZ', vehicle: 'Silver car', cls: 'car', tone: 'silver', lane: 1, short: 'Handheld phone',
    results: ['Handheld phone detected'], regions: [{ x: 290, y: 160, w: 300, h: 450 }] },
  { id: 2, img: 'images/dd/dd-ev2-beige.webp', alt: 'Driver in a beige shirt with both hands on the wheel and no seatbelt; face out of frame',
    plate: 'XYZ ABC', vehicle: 'Charcoal car', cls: 'car', tone: 'charcoal', lane: 2, short: 'Seatbelt not fastened',
    results: ['Seatbelt not fastened'], regions: [{ x: 690, y: 50, w: 560, h: 470 }] },
  { id: 3, img: 'images/dd/dd-ev3-olive.webp', alt: 'Driver in an olive sweatshirt holding a phone with no seatbelt; face out of frame',
    plate: 'BCD XYZ', vehicle: 'White SUV', cls: 'suv', tone: 'white', lane: 3, short: 'Phone + seatbelt',
    results: ['Handheld phone detected', 'Seatbelt not fastened'], regions: [{ x: 215, y: 230, w: 320, h: 470 }, { x: 740, y: 90, w: 520, h: 430 }] }
];
(function () {
  var root = document.getElementById('dxViz');
  if (!root) return;
  var NS = 'http://www.w3.org/2000/svg', W = 1448, CROP_H = 740;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = function (s) { return root.querySelector(s); };
  var svg = q('.dx-road svg'), wait = q('.dx-wait'), card = q('.dx-card'), plateEl = q('.dx-plate b'), phImg = q('.dx-ph img'), phOv = q('.dx-ph .dx-ov');
  var resEl = q('.dx-res'), vehEl = q('[data-f="veh"]'), laneEl = q('[data-f="lane"]'), rows = q('.dx-rows'), bLatest = q('.dx-latest');
  var bPP = q('[data-a="pp"]'), bRe = q('[data-a="re"]'), bNx = q('[data-a="nx"]');
  var EV = {}; DX_EVENTS.forEach(function (e) { EV[e.id] = e; var i = new Image(); i.src = e.img; });

  var LANE_Y = [0, 30, 48, 66], CAP = 124, SC = 1.35;
  var LEN = { car: 9 * SC, suv: 10.5 * SC, bus: 22 * SC, truck: 22.6 * SC };
  // [class, lane, speed (units/s), entry time (s), event id]. Event vehicles take class/tone/lane from DX_EVENTS.
  // Captures land at ~5 s, 12 s and 19 s of each 21 s cycle; same-lane spacing verified offline.
  var TRAFFIC = [
    ['ev', 1, 26, 0.2, 1], ['car', 2, 27, 1.0], ['truck', 3, 20, 2.4], ['ev', 2, 28, 7.5, 2],
    ['car', 1, 24, 8.6], ['ev', 3, 25, 13.96, 3], ['car', 1, 26, 16.4]
  ];
  var CYCLE = 21;

  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  el('rect', { 'class': 'dx-pave', x: 0, y: 15, width: 200, height: 6 }, svg);
  el('rect', { 'class': 'dx-pave', x: 0, y: 75, width: 200, height: 6 }, svg);
  el('rect', { 'class': 'dx-asph', x: 0, y: 21, width: 200, height: 54 }, svg);
  el('path', { 'class': 'dx-edge', d: 'M0 21H200M0 75H200' }, svg);
  el('path', { 'class': 'dx-sep', d: 'M0 39H200M0 57H200' }, svg);
  [1, 2, 3].forEach(function (l) { [30, 90, 170].forEach(function (x) { var y = LANE_Y[l]; el('path', { 'class': 'dx-arr', d: 'M' + (x - 4) + ' ' + (y - .5) + 'H' + x + 'V' + (y - 1.6) + 'L' + (x + 3) + ' ' + y + 'L' + x + ' ' + (y + 1.6) + 'V' + (y + .5) + 'H' + (x - 4) + 'Z' }, svg); }); });
  el('path', { 'class': 'dx-cp', d: 'M' + CAP + ' 18V78' }, svg);
  var cpt = el('text', { 'class': 'dx-t', x: CAP, y: 86, 'text-anchor': 'middle' }, svg); cpt.textContent = 'Capture point';
  var lt = [1, 2, 3].map(function (l) { var t = el('text', { 'class': 'dx-t', x: 3, y: LANE_Y[l] - 4.6 }, svg); t.textContent = 'Lane ' + l; return t; });
  var dyn = el('g', {}, svg), over = el('g', {}, svg);

  function shape(k, g) {
    var s = el('g', { transform: 'scale(' + SC + ')' }, g);
    if (k === 'car' || k === 'suv') {
      var L = k === 'suv' ? 10.5 : 9, Wd = k === 'suv' ? 4.8 : 4.4;
      el('rect', { 'class': 'b', x: -L, y: -Wd / 2, width: L, height: Wd, rx: 1.2 }, s);
      el('rect', { 'class': 'c', x: -L + 2, y: -Wd / 2 + .45, width: k === 'suv' ? 5.4 : 3.6, height: Wd - .9, rx: .6 }, s);
      el('rect', { 'class': 'w', x: -3.4, y: -Wd / 2 + .45, width: 1.2, height: Wd - .9, rx: .4 }, s);
      el('rect', { 'class': 'w', x: -L + 1.1, y: -Wd / 2 + .6, width: .85, height: Wd - 1.2, rx: .3 }, s);
      el('rect', { 'class': 'o', x: -L - .7, y: -Wd / 2 - .7, width: L + 1.4, height: Wd + 1.4, rx: 1.6 }, s);
    } else if (k === 'bus') {
      el('rect', { 'class': 'b', x: -22, y: -2.5, width: 22, height: 5, rx: .8 }, s);
      el('rect', { 'class': 'c', x: -20.6, y: -1.7, width: 18.6, height: 3.4, rx: .4 }, s);
    } else {
      el('rect', { 'class': 't', x: -22.6, y: -2.6, width: 16.6, height: 5.2, rx: .4 }, s);
      el('rect', { 'class': 'b', x: -5.4, y: -2.3, width: 5.4, height: 4.6, rx: .9 }, s);
      el('rect', { 'class': 'w', x: -1.7, y: -1.9, width: 1, height: 3.8, rx: .3 }, s);
    }
  }

  var T = 0, playing = false, inView = false, userPaused = false, raf = 0, last = 0, evStamp = -1;
  var live = null, shown = null, hist = {}, pinned = false;

  function front(v, c, t) { return -2 + v[2] * (t - (c * CYCLE + v[3])); }
  function capT(v, c) { return c * CYCLE + v[3] + (CAP + 2) / v[2]; }

  function regions(box, list) {
    box.innerHTML = '';
    list.forEach(function (r) {
      var i = document.createElement('i'), top = r.y / CROP_H * 100, ht = Math.min(r.h / CROP_H * 100, 100 - top);
      i.style.left = (r.x / W * 100) + '%'; i.style.width = (r.w / W * 100) + '%'; i.style.top = top + '%'; i.style.height = ht + '%';
      box.appendChild(i);
    });
  }
  function fill(ev) {
    var d = EV[ev.id];
    plateEl.textContent = d.plate; phImg.src = d.img; phImg.alt = d.alt; regions(phOv, d.regions);
    phImg.style.objectPosition = '50% 0';
    resEl.innerHTML = d.results.map(function (r) { return '<li>' + r + '</li>'; }).join('');
    vehEl.textContent = 'Vehicle: ' + d.vehicle; laneEl.textContent = 'Lane: ' + d.lane;
  }
  function show(ev) {
    shown = ev; wait.hidden = true;
    if (card.hidden || RM) { card.hidden = false; fill(ev); }
    else { card.classList.add('fade'); setTimeout(function () { fill(ev); card.classList.remove('fade'); }, 220); }
    [].forEach.call(rows.querySelectorAll('button'), function (b) { b.setAttribute('aria-current', +b.dataset.id === ev.id && ev === hist[ev.id] ? 'true' : 'false'); });
  }
  function addHist(ev) {
    var d = EV[ev.id], li = rows.querySelector('[data-id="' + ev.id + '"]');
    li.classList.remove('sk'); li.disabled = false;
    li.innerHTML = '<b>' + d.plate + '</b><span>' + d.short + '</span>';
    li.setAttribute('aria-label', d.plate + ', ' + d.results.join(' and '));
    hist[ev.id] = ev;
  }
  function capture(ev) {
    live = ev; addHist(ev);
    if (!pinned) show(ev); else bLatest.hidden = false;
  }
  bLatest.addEventListener('click', function () { pinned = false; bLatest.hidden = true; if (live) show(live); });

  function render() {
    dyn.innerHTML = ''; over.innerHTML = '';
    var c0 = Math.floor(T / CYCLE);
    for (var c = c0 - 1; c <= c0; c++) {
      if (c < 0) continue;
      TRAFFIC.forEach(function (v) {
        var d = v[4] ? EV[v[4]] : null, cls = d ? d.cls : v[0], lane = d ? d.lane : v[1];
        var x = front(v, c, T), len = LEN[cls];
        if (x < -1 || x - len > 202) return;
        var g = el('g', { 'class': 'dx-v ' + cls + (d ? ' ' + d.tone : ''), transform: 'translate(' + x.toFixed(2) + ' ' + LANE_Y[lane] + ')' }, dyn);
        shape(cls, g);
        if (!d) return;
        var tc = capT(v, c);
        if (T >= tc) {
          if (tc > evStamp) { evStamp = tc; capture({ id: d.id, key: c + ':' + d.id, t: tc }); }
          if (live && live.key === c + ':' + d.id) {
            g.classList.add('hit');
            if (T - tc < 2.6 && x < 196) {
              var y = LANE_Y[lane], tx = Math.min(x - len / 2, 186);
              var t = el('text', { 'class': 'dx-lab', x: tx.toFixed(2), y: (y - 5.2).toFixed(2), 'text-anchor': 'middle' }, over); t.textContent = 'DETECTED';
              el('path', { 'class': 'dx-con', d: 'M' + (x + 1).toFixed(2) + ' ' + y + 'L200 ' + y }, over);
            }
          }
        }
      });
    }
  }

  function tick(now) { if (!playing) return; T += Math.min(.05, (now - last) / 1000); last = now; render(); raf = requestAnimationFrame(tick); }
  function sync() {
    var want = !RM && !userPaused && inView;
    if (want && !playing) { playing = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    else if (!want && playing) { playing = false; cancelAnimationFrame(raf); }
    bPP.textContent = userPaused ? 'Resume' : 'Pause';
  }
  function restart() {
    T = 0; evStamp = -1; live = shown = null; hist = {}; pinned = false;
    rows.innerHTML = '';
    DX_EVENTS.forEach(function (d) {
      var rl = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'sk'; b.disabled = true; b.dataset.id = d.id; b.setAttribute('aria-label', 'No event yet');
      b.addEventListener('click', function () { var e = hist[d.id]; if (!e) return; pinned = e !== live; bLatest.hidden = !pinned; show(e); });
      rl.appendChild(b); rows.appendChild(rl);
    });
    bLatest.hidden = true; card.hidden = true; card.classList.remove('fade'); wait.hidden = false; render();
  }
  bPP.addEventListener('click', function () { userPaused = !userPaused; sync(); });
  bRe.addEventListener('click', function () { restart(); sync(); });
  bNx.addEventListener('click', function () {
    var best = Infinity, c0 = Math.floor(T / CYCLE);
    for (var c = c0; c <= c0 + 1; c++) TRAFFIC.forEach(function (v) { if (!v[4]) return; var t = capT(v, c); if (t > T + .01 && t < best) best = t; });
    T = best + .6; render();
  });

  function fit() {
    var crop = root.clientWidth < 600;
    svg.setAttribute('viewBox', crop ? '48 12 152 78' : '0 0 200 96');
    lt.forEach(function (t) { t.setAttribute('x', crop ? 51 : 3); });
  }
  fit(); window.addEventListener('resize', fit);

  restart();
  if (RM) { bPP.hidden = true; bNx.hidden = false; return; }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { inView = e.isIntersecting; sync(); }); }, { threshold: .3 }).observe(root);
  else { inView = true; sync(); }
})();
