/* Turn & lane enforcement scenarios. Right-hand traffic, viewBox 160×90.
   Eastbound lanes y 49.75 / 59.25 · westbound 40.25 / 30.75 · northbound x 84.5 / 93.5 · southbound 75.5 / 66.5 */
(function () {
  var root = document.getElementById('tlViz');
  if (!root) return;
  var st = root.querySelector('.tl-stage'), trail = root.querySelector('#tlTrail'), red = root.querySelector('#tlRed'),
    veh = root.querySelector('#tlVeh'), pts = root.querySelector('#tlPts'), sign = root.querySelector('.tl-sign'),
    tabs = root.querySelector('.tl-tabs'), fRule = root.querySelector('[data-f="rule"]'), fMan = root.querySelector('[data-f="man"]'),
    fSt = root.querySelector('[data-f="st"]'), bPP = root.querySelector('[data-a="pp"]'), bRe = root.querySelector('[data-a="re"]');
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var PRE = 1300, MOVE = 5600;

  // m: when the manoeuvre starts; h: when the prohibited movement is clear (status turns red, trail turns red from m).
  var K = [
    { t: 'Illegal U-turn', c: 'uturn', d: 'M-10 49.75H66C80 49.75 87 47.5 87 45C87 42.5 80 40.25 66 40.25H-10',
      rule: 'No U-turn', man: 'U-turn', sign: ['No U-turn', '', 22, 76],
      s: ['Approaching junction', 'Turning', 'Illegal U-turn detected'],
      m: function (p) { return p.x >= 66; }, h: function (p, a) { return p.y <= 41 && Math.cos(a) < -0.6; } },
    { t: 'No left turn', c: 'left', d: 'M-10 49.75H64C77 49.75 84.5 42 84.5 30V-10',
      rule: 'No left turn', man: 'Left turn', sign: ['No left turn', '', 22, 76],
      s: ['Approaching junction', 'Turning left', 'Prohibited left turn detected'],
      m: function (p) { return p.x >= 64; }, h: function (p) { return p.y <= 36; } },
    { t: 'Solid line', c: 'solid', d: 'M-10 49.75H16C26 49.75 28 59.25 38 59.25H170',
      rule: 'Solid lane line: no lane change', man: 'Lane change', sign: null,
      s: ['Driving in lane', 'Changing lanes', 'Solid line crossing detected'],
      m: function (p) { return p.x >= 16; }, h: function (p) { return p.y >= 54.5; } },
    { t: 'Double line', c: 'traj', d: 'M-10 49.75H10C18 49.75 20 40.25 28 40.25H36C44 40.25 46 49.75 54 49.75H170',
      rule: 'Double centre line: no crossing', man: 'Overtake across centre line', sign: null,
      s: ['Driving in lane', 'Moving toward centre line', 'Double line crossing detected'],
      m: function (p) { return p.x >= 10; }, h: function (p) { return p.y <= 44.3; }, e: function (p) { return p.y >= 49.5; } },
    { t: 'Wrong way', c: 'wrong', d: 'M170 49.75H-10',
      rule: 'One direction: eastbound only', man: 'Travel against flow', sign: ['No entry', 'ne', 64, 76],
      s: ['Entering road', 'Travelling against flow', 'Wrong-way driving detected'],
      m: function (p) { return p.x <= 160; }, h: function (p) { return p.x <= 136; } },
    { t: 'Bus lane', c: 'bus', d: 'M170 40.25H150C141 40.25 139 30.75 130 30.75H-10',
      rule: 'Bus lane: buses only', man: 'Car entering bus lane', sign: null,
      s: ['Approaching', 'Changing lanes', 'Bus lane entry detected'],
      m: function (p) { return p.x <= 150; }, h: function (p) { return p.y <= 32; } },
    { t: 'Legal path', c: 'ok', d: 'M-10 49.75H170',
      rule: 'Through movement permitted', man: 'Straight through', sign: null, ok: true,
      s: ['Approaching junction', 'Passing through', 'No violation'],
      m: function (p) { return p.x >= 62; }, h: function () { return false; } }
  ];

  var cur = 0, L = 0, mL = 0, hL = 0, eL = Infinity, raf = 0, t0 = 0, el = 0, playing = false, done = false, lastSt = -1, started = false;
  var MARKS = [0.18, 0.4, 0.62, 0.84];

  function ang(l) {
    var a = trail.getPointAtLength(Math.max(0, l - 0.8)), b = trail.getPointAtLength(Math.min(L, l + 0.8));
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  function find(fn) {
    for (var i = 0; i <= 400; i++) { var l = L * i / 400, p = trail.getPointAtLength(l); if (fn(p, ang(l))) return l; }
    return Infinity;
  }
  function findFrom(l0, fn) {
    for (var i = 0; i <= 400; i++) { var l = l0 + (L - l0) * i / 400, p = trail.getPointAtLength(l); if (fn(p, ang(l))) return l; }
    return Infinity;
  }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function setStatus(i) {
    if (i === lastSt) return; lastSt = i;
    var c = K[cur];
    fSt.textContent = c.s[i];
    fSt.classList.toggle('hit', i === 2 && !c.ok);
  }

  function draw(e) {
    var c = K[cur], l = e * L, p = trail.getPointAtLength(l), a = ang(l) * 180 / Math.PI;
    veh.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ') rotate(' + a.toFixed(1) + ')');
    trail.style.strokeDasharray = l.toFixed(2) + ' ' + (L + 1).toFixed(2);
    var hit = !c.ok && l >= hL;
    red.style.strokeDasharray = hit ? ('0 ' + mL.toFixed(2) + ' ' + Math.max(0, Math.min(l, eL) - mL).toFixed(2) + ' ' + (L + 1).toFixed(2)) : '0 ' + (L + 1);
    [].forEach.call(pts.childNodes, function (n) {
      var ml = +n.getAttribute('data-l');
      n.style.display = ml <= l ? '' : 'none';
      n.classList.toggle('red', hit && ml >= mL && ml <= eL);
    });
    setStatus(hit || (c.ok && e >= 1) ? 2 : l >= mL ? 1 : 0);
  }

  function frame(now) {
    if (!playing) return;
    el = now - t0;
    var mv = Math.max(0, el - PRE), e = Math.min(1, mv / MOVE);
    draw(ease(e));
    if (e < 1) raf = requestAnimationFrame(frame);
    else { playing = false; done = true; bPP.textContent = 'Play'; bPP.setAttribute('aria-label', 'Play'); }
  }
  function play() { if (done) return start(cur); playing = true; t0 = performance.now() - el; bPP.textContent = 'Pause'; bPP.setAttribute('aria-label', 'Pause'); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
  function pause() { playing = false; cancelAnimationFrame(raf); bPP.textContent = 'Play'; bPP.setAttribute('aria-label', 'Play'); }

  function start(k) {
    cancelAnimationFrame(raf);
    cur = k; var c = K[k];
    st.dataset.case = c.c;
    trail.setAttribute('d', c.d); red.setAttribute('d', c.d);
    L = trail.getTotalLength();
    mL = find(c.m); hL = c.ok ? Infinity : find(c.h);
    if (mL === Infinity) mL = 0;
    eL = c.e && hL !== Infinity ? findFrom(hL, c.e) : Infinity;
    pts.innerHTML = '';
    MARKS.forEach(function (f) {
      var l = L * f, q = trail.getPointAtLength(l);
      if (q.x < 1 || q.x > 159 || q.y < 1 || q.y > 89) return;
      var ci = document.createElementNS(NS, 'circle');
      ci.setAttribute('cx', q.x.toFixed(2)); ci.setAttribute('cy', q.y.toFixed(2)); ci.setAttribute('r', '.7');
      ci.setAttribute('class', 'tl-pt'); ci.setAttribute('data-l', l.toFixed(2)); pts.appendChild(ci);
    });
    if (c.sign) {
      sign.querySelector('span').textContent = c.sign[0];
      sign.className = 'tl-sign on' + (c.sign[1] ? ' ' + c.sign[1] : '');
      sign.style.left = c.sign[2] + '%'; sign.style.top = c.sign[3] + '%';
    } else sign.className = 'tl-sign';
    fRule.textContent = c.rule; fMan.textContent = c.man;
    lastSt = -1; done = false; el = 0;
    [].forEach.call(tabs.children, function (b, i) { b.setAttribute('aria-selected', i === k ? 'true' : 'false'); b.tabIndex = i === k ? 0 : -1; });
    if (RM) { draw(1); done = true; bPP.hidden = true; return; }
    draw(0);
    play();
  }

  K.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = c.t;
    b.addEventListener('click', function () { start(i); });
    b.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? (i + 1) % K.length : e.key === 'ArrowLeft' ? (i - 1 + K.length) % K.length : -1;
      if (n < 0) return; e.preventDefault(); tabs.children[n].focus(); start(n);
    });
    tabs.appendChild(b);
  });
  bPP.addEventListener('click', function () { playing ? pause() : play(); });
  bRe.addEventListener('click', function () { start(cur); });

  // Prepare scenario 1 (rule visible, vehicle at start) and play once when the component scrolls into view.
  function prime() {
    var c = K[0]; st.dataset.case = c.c; trail.setAttribute('d', c.d); red.setAttribute('d', c.d); L = trail.getTotalLength();
  }
  prime();
  if (RM || !('IntersectionObserver' in window)) { start(0); return; }
  start(0); pause(); el = 0; draw(0); bPP.textContent = 'Play';
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && !started) { started = true; io.disconnect(); start(cur); } });
  }, { threshold: 0.4 });
  io.observe(root);
})();
