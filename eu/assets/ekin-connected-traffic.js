/* Connected traffic solutions — one reusable component.
   Mount: <div class="ct" data-current="turn"></div>  (ghost | speed | red | turn | ped | distract)
   Scenario data lives in SOL / EV below; add a speed value to EV.speed.value only when supplied. */
(function () {
  var mount = document.querySelector('.ct[data-current]');
  if (!mount) return;
  var NS = 'http://www.w3.org/2000/svg';
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SOL = [
    { k: 'ghost', name: 'Ghost Plate Detection', href: 'ghost-plate-detection.html', ev: 'ghost' },
    { k: 'speed', name: 'Speed Enforcement', href: 'speed-enforcement.html', ev: 'speed' },
    { k: 'red', name: 'Red Light Enforcement', href: 'red-light-enforcement.html', ev: 'red' },
    { k: 'turn', name: 'Turn & Lane Enforcement', href: 'turn-and-lane-enforcement.html', ev: 'turn' },
    { k: 'ped', name: 'Pedestrian Safety', href: 'pedestrian-safety.html', ev: 'ped' },
    { k: 'distract', name: 'Distracted Driving Detection', href: 'distracted-driving-detection.html', ev: 'distract' }
  ];
  // intro sequence per page: current first, then two complementary applications
  var SEQ = { ghost: ['ghost', 'speed', 'red'], speed: ['speed', 'red', 'ped'], red: ['red', 'ped', 'turn'], turn: ['turn', 'red', 'ped'], ped: ['ped', 'red', 'turn'], distract: ['distract', 'speed', 'ped'] };

  // Scene events (viewBox 200×120, right-hand traffic). lab: [text, x, y, anchor]; at: fraction of the move when the label appears.
  var EV = {
    turn: { d: 'M-10 64H78C94 64 103.5 56 103.5 38V18', dur: 3600, at: .72, lab: ['Prohibited turn', 108, 22, 'start'], kind: 'veh' },
    red: { d: 'M96.5 -10V104', dur: 3200, at: .52, lab: ['Red-light violation', 92, 104, 'end'], kind: 'veh' },
    speed: { d: 'M-10 72H186', dur: 2200, at: .6, lab: ['Speed event', 196, 83.5, 'end'], kind: 'veh', lin: true, value: '' },
    ped: { d: 'M122 39V81', dur: 3600, at: .3, lab: ['Pedestrian at crossing', 128, 92, 'start'], kind: 'ped' },
    // Detail-card events: one specific vehicle; the card appears when it reaches `cap` (fraction of its path).
    ghost: { d: 'M-10 64H210', dur: 3800, lin: true, cap: .27, card: 'ghost', kind: 'veh' },
    distract: { d: 'M110.5 130V-10', dur: 4200, lin: true, cap: .24, card: 'distract', kind: 'veh' }
  };

  var current = SEQ[mount.dataset.current] ? mount.dataset.current : 'turn';
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }

  /* ---------- markup ---------- */
  mount.innerHTML = '<div class="ct-vis"><div class="ct-stage"></div><div class="ct-ctl"><button type="button" class="ct-btn" data-a="pp">Pause</button><button type="button" class="ct-btn" data-a="re">Replay</button></div></div><ul class="ct-list"></ul>';
  var stage = mount.querySelector('.ct-stage'), list = mount.querySelector('.ct-list'), bPP = mount.querySelector('[data-a="pp"]'), bRe = mount.querySelector('[data-a="re"]');
  var svg = el('svg', { viewBox: '0 0 200 120', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' }, stage);
  var scene = el('g', { 'class': 'ct-scene' }, svg);
  el('rect', { 'class': 'ct-road', x: 0, y: 44, width: 200, height: 32 }, scene);
  el('rect', { 'class': 'ct-road', x: 86, y: 0, width: 28, height: 120 }, scene);
  el('path', { 'class': 'ct-kerb', d: 'M0 44H86V0M114 0V44H200M0 76H86V120M114 120V76H200' }, scene);
  el('path', { 'class': 'ct-solid', d: 'M0 60H84M128 60H200M100 0V42M100 78V120' }, scene);
  el('path', { 'class': 'ct-dash', d: 'M0 52H84M0 68H84M128 52H200M128 68H200M93 0V42M107 0V42M93 78V120M107 78V120' }, scene);
  el('path', { 'class': 'ct-stop', d: 'M84 60.4V76M128 44V59.6M86 42H99.6M100.4 78H114' }, scene);
  var zb = el('g', { 'class': 'ct-zebra' }, scene);
  for (var y = 45.5; y < 75; y += 4) el('rect', { x: 118.5, y: y, width: 7, height: 2 }, zb);
  function signal(x, y, lit) { var g = el('g', { 'class': 'ct-sig' }, scene); el('rect', { 'class': 'b', x: x - 1.6, y: y - 4.2, width: 3.2, height: 8.4, rx: .5 }, g); [-2.6, 0, 2.6].forEach(function (o, i) { el('circle', { cx: x, cy: y + o, r: .95, 'class': (lit === 'r' && i === 0) ? 'r' : (lit === 'g' && i === 2) ? 'g' : '' }, g); }); }
  signal(82, 37, 'r'); signal(81, 83, 'g'); signal(131, 39, 'r'); signal(118, 83, 'g');
  var nlt = el('g', { 'class': 'ct-nlt', transform: 'translate(74 85)' }, scene);
  el('circle', { r: 3.6 }, nlt); el('path', { d: 'M1.4 1.8V-.4H-1.4M-.4 -1.4L-1.6 -.4L-.4 .6' }, nlt); el('line', { x1: -2.5, y1: -2.5, x2: 2.5, y2: 2.5 }, nlt);
  function car(p) { var g = el('g', { 'class': 'ct-veh' }, p); el('rect', { x: -3.2, y: -1.65, width: 6.4, height: 3.3, rx: .9 }, g); el('rect', { 'class': 'o', x: -3.9, y: -2.35, width: 7.8, height: 4.7, rx: 1.2 }, g); el('rect', { 'class': 'w', x: .6, y: -1.3, width: 1.1, height: 2.6, rx: .3 }, g); el('rect', { 'class': 'w', x: -2.45, y: -1.2, width: .8, height: 2.4, rx: .3 }, g); return g; }
  var amb = car(scene); amb.setAttribute('transform', 'translate(135 56) rotate(180)');
  var amb2 = car(scene); amb2.setAttribute('transform', 'translate(150 56) rotate(180)');

  var R = {};
  Object.keys(EV).forEach(function (k) {
    var e = EV[k]; if (e.kind === 'detail') return;
    var g = el('g', {}, scene);
    var tr = el('path', { 'class': 'ct-trail', d: e.d }, g);
    var actor;
    if (e.kind === 'ped') { actor = el('g', { 'class': 'ct-ped' }, g); el('circle', { r: 1.25 }, actor); el('circle', { 'class': 'h', r: .7, cy: -.2 }, actor); }
    else actor = car(g);
    if (!e.lab) { R[k] = { g: g, tr: tr, a: actor, lab: null, L: tr.getTotalLength() }; return; }
    var lg = el('g', { 'class': 'ct-lab', opacity: 0 }, svg);
    var txt = e.lab[0] + (e.value ? ' · ' + e.value : '');
    var w = txt.length * 1.95 + 3.2, x = e.lab[3] === 'end' ? e.lab[1] - w : e.lab[1];
    el('rect', { x: x, y: e.lab[2] - 3.4, width: w, height: 5, rx: .5 }, lg);
    var t = el('text', { x: x + 1.6, y: e.lab[2] + .35 }, lg); t.textContent = txt;
    R[k] = { g: g, tr: tr, a: actor, lab: lg, L: tr.getTotalLength() };
  });

  var det = document.createElement('div'); det.className = 'ct-detail'; stage.appendChild(det);
  var con = el('line', { 'class': 'ct-con' }, svg);
  var PLATE = '<span class="ct-plate"><i aria-hidden="true"></i><b>ABC XYZ</b></span>';
  function detail(k) {
    if (k === 'ghost') det.innerHTML = '<div class="ct-dh"><span class="ct-dt">Detection detail</span></div><div class="ct-thumbs"><figure class="ct-thumb"><div><img src="images/ghost-plate/suv-rear-visible.webp" alt="Visible-light capture of a tailgate and plate" loading="lazy" decoding="async"></div><figcaption><span>Visible</span><b>ABC XYZ</b></figcaption></figure><figure class="ct-thumb ir"><div><img src="images/ghost-plate/suv-rear-infrared.webp" alt="Infrared capture of the same plate; characters cannot be read" loading="lazy" decoding="async"></div><figcaption><span>Infrared</span><b class="no">NO READ</b></figcaption></figure></div>';
    else det.innerHTML = '<div class="ct-dh"><span class="ct-dt">Detection detail</span>' + PLATE + '</div><div class="ct-pic"><img src="images/dd/dd-ev1-navy.webp" alt="Driver holding a phone with the seatbelt fastened; face out of frame" loading="lazy" decoding="async"></div><div class="ct-dv">Handheld phone detected</div>';
  }

  /* ---------- list ---------- */
  SOL.forEach(function (s) {
    var li = document.createElement('li'); li.className = 'ct-item'; li.dataset.k = s.k;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ct-pick'; b.textContent = s.name; b.setAttribute('aria-label', 'Show ' + s.name + ' scenario');
    b.addEventListener('click', function () { userPaused = false; run([s.ev], s.ev); });
    li.appendChild(b);
    if (s.k === current) { var h = document.createElement('span'); h.className = 'ct-here'; h.textContent = 'This page'; li.appendChild(h); }
    else { var a = document.createElement('a'); a.className = 'ct-go'; a.href = s.href; a.innerHTML = 'View solution <span aria-hidden="true">&rarr;</span>'; a.setAttribute('aria-label', 'View ' + s.name); li.appendChild(a); }
    list.appendChild(li);
  });
  var items = list.children;

  /* ---------- timeline ---------- */
  var steps = [], focus = current, T = 0, total = 0, playing = false, userPaused = false, inView = false, raf = 0, last = 0;
  function run(seq, f) {
    focus = f; steps = []; var t = 0;
    seq.forEach(function (k) { steps.push({ k: k, s: t, d: EV[k].dur }); t += EV[k].dur + 450; });
    total = t; T = 0;
    var dkey = seq.filter(function (k) { return EV[k].card; })[0];
    det.classList.remove('on'); con.classList.remove('on');
    det.classList.toggle('used', !!dkey);
    if (dkey) { detail(EV[dkey].card); det.classList.toggle('cur', dkey === focus); } else det.innerHTML = '';
    det.dataset.k = dkey || '';
    if (RM) { T = total; render(); setPP(false); return; }
    render(); play();
  }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function render() {
    var activeK = null, ks = {};
    steps.forEach(function (st) { ks[st.k] = st; });
    Object.keys(R).forEach(function (k) {
      var r = R[k], st = ks[k];
      if (!st) { r.g.style.display = 'none'; if (r.lab) r.lab.setAttribute('opacity', 0); return; }
      var p = Math.max(0, Math.min(1, (T - st.s) / st.d)); if (T >= st.s) activeK = k;
      r.g.style.display = T >= st.s ? '' : 'none';
      var e = EV[k].lin ? p : ease(p), l = e * r.L, a = r.tr.getPointAtLength(l), b0 = r.tr.getPointAtLength(Math.max(0, l - .6)), b1 = r.tr.getPointAtLength(Math.min(r.L, l + .6));
      var ang = Math.atan2(b1.y - b0.y, b1.x - b0.x) * 180 / Math.PI;
      r.a.setAttribute('transform', 'translate(' + a.x.toFixed(2) + ' ' + a.y.toFixed(2) + ')' + (EV[k].kind === 'veh' ? ' rotate(' + ang.toFixed(1) + ')' : ''));
      r.tr.style.strokeDasharray = l.toFixed(2) + ' ' + (r.L + 1).toFixed(2);
      var cur = k === focus;
      if (EV[k].card) {
        var hit = T >= st.s && p >= EV[k].cap;
        r.a.classList.toggle('hit', hit);
        r.tr.classList.toggle('cur', hit && cur);
        if (det.dataset.k === k) {
          det.classList.toggle('on', hit);
          var near = hit && p < .82 && getComputedStyle(det).position === 'absolute';
          con.classList.toggle('on', near);
          if (near) {
            var sb = stage.getBoundingClientRect(), db = det.getBoundingClientRect(), vb = svg.viewBox.baseVal, s = sb.width / vb.width;
            var cx = (db.right - sb.left) / s, cy = (db.bottom - sb.top) / s * (vb.height / (sb.height / s));
            con.setAttribute('x1', a.x.toFixed(2)); con.setAttribute('y1', a.y.toFixed(2)); con.setAttribute('x2', cx.toFixed(2)); con.setAttribute('y2', ((db.bottom - sb.top) / (sb.height) * vb.height).toFixed(2));
          }
        }
        return;
      }
      r.tr.classList.toggle('cur', cur && p >= EV[k].at);
      r.lab.classList.toggle('cur', cur);
      r.lab.setAttribute('opacity', p >= EV[k].at ? 1 : 0);
    });
    nlt.style.display = ks.turn ? '' : 'none';
    steps.forEach(function (s) { if (T >= s.s) activeK = s.k; });
    if (T >= total && steps.length) activeK = focus;
    [].forEach.call(items, function (li) { var s = SOL.filter(function (x) { return x.k === li.dataset.k; })[0]; li.classList.toggle('on', !!activeK && s.ev === activeK); });
  }
  function tick(now) {
    if (!playing) return;
    T += Math.min(64, now - last); last = now;
    if (T >= total) { T = total; render(); setPP(false); playing = false; return; }
    render(); raf = requestAnimationFrame(tick);
  }
  function setPP(p) { bPP.textContent = p ? 'Pause' : 'Play'; bPP.setAttribute('aria-pressed', p ? 'false' : 'true'); }
  function play() { if (T >= total) T = 0; if (!inView) { setPP(true); return; } playing = true; last = performance.now(); setPP(true); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  function stop() { playing = false; cancelAnimationFrame(raf); }
  bPP.addEventListener('click', function () { if (playing) { userPaused = true; stop(); setPP(false); } else { userPaused = false; inView = true; play(); } });
  bRe.addEventListener('click', function () { userPaused = false; run(SEQ[current], current); });
  if (RM) { bPP.hidden = true; inView = true; run(SEQ[current], current); return; }

  var started = false;
  T = 0; steps = []; run.call(null, SEQ[current], current); stop(); T = 0; render(); setPP(false);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        inView = e.isIntersecting;
        if (!inView) { if (playing) { stop(); mount.dataset.auto = '1'; } return; }
        if (!started) { started = true; play(); }
        else if (mount.dataset.auto === '1' && !userPaused && T < total) { mount.dataset.auto = ''; play(); }
      });
    }, { threshold: .35 }).observe(mount);
  } else { inView = true; T = total; render(); }
})();
