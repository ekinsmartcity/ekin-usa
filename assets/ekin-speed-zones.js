/* School / work zone schedule demo. All example values live in SZ_CONFIG (mph, common US values). */
var SZ_DAY_MS = 60000; // one full 24-hour cycle in ms of animation
var SZ_CONFIG = {
  school: { std: 35, red: 20, windows: [['07:00', '09:00'], ['14:00', '16:00']], start: '06:50' },
  work: { std: 55, red: 45, windows: [['07:00', '19:00']] }
};
(function () {
  var root = document.getElementById('szZone');
  if (!root) return;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = function (s) { return root.querySelector(s); };
  var tabs = root.querySelectorAll('.sz-tabs button'), track = q('.sz-track'), wins = q('.sz-wins'), cur = q('.sz-cur'), tip = q('.sz-tip');
  var num = q('.sz-num'), status = q('.sz-status'), tEl = q('.sz-time'), intEl = q('.sz-int'), note = q('.sz-note'), vStd = q('[data-v="std"]'), vRed = q('[data-v="red"]');
  var zone = 'school', mins = 410, shown = null, raf = 0, running = false, userPaused = false, dragging = false, inView = false, last = 0;
  var pp = q('[data-a="pp"]');

  function toM(s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; }
  function fmt(m) { m = Math.round(m); var h = Math.floor(m / 60) % 24, mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }
  function C() { return SZ_CONFIG[zone]; }
  function activeWin(m) { var w = C().windows; for (var i = 0; i < w.length; i++) if (m >= toM(w[i][0]) && m < toM(w[i][1])) return w[i]; return null; }

  function drawWins() {
    wins.innerHTML = '';
    C().windows.forEach(function (w) { var a = toM(w[0]), b = toM(w[1]), i = document.createElement('i'); i.style.left = (a / 1440 * 100) + '%'; i.style.width = ((b - a) / 1440 * 100) + '%'; wins.appendChild(i); });
    var s = C(); vStd.innerHTML = 'Standard: <b>' + s.std + ' mph</b>'; vRed.innerHTML = 'Reduced: <b>' + s.red + ' mph</b>';
  }
  function setNum(v) {
    if (shown === v) return;
    if (shown === null || RM) { num.textContent = v; shown = v; return; }
    shown = v; num.classList.add('out');
    setTimeout(function () { num.textContent = v; num.classList.remove('out'); }, 180);
  }
  function render() {
    var s = C(), w = activeWin(mins), lim = w ? s.red : s.std, t = fmt(mins);
    cur.style.left = (mins / 1440 * 100) + '%';
    tip.textContent = t; tEl.textContent = t;
    track.setAttribute('aria-valuenow', Math.round(mins)); track.setAttribute('aria-valuetext', t + ', ' + lim + ' mph');
    setNum(lim);
    status.textContent = w ? 'Reduced limit active' : 'Standard limit active';
    status.classList.toggle('on', !!w);
    intEl.textContent = w ? 'Scheduled period ' + w[0] + '–' + w[1] : 'Outside scheduled periods';
    vStd.classList.toggle('cur', !w); vRed.classList.toggle('cur', !!w);
    note.textContent = w ? s.red + ' mph applies during the selected scheduled period.' : s.std + ' mph applies outside the scheduled reduced-limit periods.';
  }

  // One shared time value (mins) drives clock, cursor, sign and status. Wraps 23:59 -> 00:00 without pausing.
  function tick(now) {
    if (!running) return;
    var dt = Math.min(100, now - last); last = now;
    mins = (mins + dt / SZ_DAY_MS * 1440) % 1440;
    render();
    raf = requestAnimationFrame(tick);
  }
  function canRun() { return !RM && !userPaused && !dragging && inView; }
  function sync() {
    var want = canRun();
    if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    else if (!want && running) { running = false; cancelAnimationFrame(raf); }
    pp.textContent = userPaused ? 'Resume' : 'Pause';
    pp.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
  }
  function stopAuto() {}

  function pick(z) {
    zone = z;
    [].forEach.call(tabs, function (b) { var on = b.dataset.z === z; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    drawWins(); render();
  }
  [].forEach.call(tabs, function (b, i) {
    b.addEventListener('click', function () { pick(b.dataset.z); });
    b.addEventListener('keydown', function (e) { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); var n = tabs[(i + 1) % tabs.length]; n.focus(); pick(n.dataset.z); });
  });

  function fromX(x) { var r = track.getBoundingClientRect(); mins = Math.max(0, Math.min(1439, (x - r.left) / r.width * 1440)); if (RM) { mins = Math.round(mins / 5) * 5; if (mins > 1439) mins = 1439; } render(); }
  track.addEventListener('pointerdown', function (e) {
    dragging = true; sync(); track.setPointerCapture(e.pointerId); fromX(e.clientX);
    function mv(ev) { fromX(ev.clientX); }
    function up() { dragging = false; sync(); track.removeEventListener('pointermove', mv); track.removeEventListener('pointerup', up); track.removeEventListener('pointercancel', up); }
    track.addEventListener('pointermove', mv); track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
  });
  track.addEventListener('keydown', function (e) {
    var k = e.key, d = 0;
    if (k === 'ArrowRight' || k === 'ArrowUp') d = e.shiftKey ? 60 : 15;
    else if (k === 'ArrowLeft' || k === 'ArrowDown') d = e.shiftKey ? -60 : -15;
    else if (k === 'PageUp') d = 60; else if (k === 'PageDown') d = -60;
    else if (k === 'Home') { e.preventDefault(); mins = 0; render(); return; }
    else if (k === 'End') { e.preventDefault(); mins = 1439; render(); return; }
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); userPaused = !userPaused; sync(); return; }
    else return;
    e.preventDefault(); mins = ((Math.round(mins) + d) % 1440 + 1440) % 1440; render();
  });
  pp.addEventListener('click', function () { userPaused = !userPaused; sync(); });

  pick('school');
  mins = toM(SZ_CONFIG.school.start || '06:50'); render();
  if (RM) { pp.hidden = true; return; }
  if (!('IntersectionObserver' in window)) { inView = true; sync(); return; }
  new IntersectionObserver(function (es) { es.forEach(function (e) { inView = e.isIntersecting; sync(); }); }, { threshold: .25 }).observe(root);
})();
