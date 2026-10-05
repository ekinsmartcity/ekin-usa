/* Phone only (≤640px): drawer groups and footer columns become accordions. */
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width:640px)');
  var uid = 0;

  function wire(group, head, cls) {
    if (group.dataset.acc) return;
    group.dataset.acc = '1';
    group.classList.add(cls);
    var body = document.createElement('div');
    body.className = 'm-acc-body';
    body.id = 'm-acc-' + (++uid);
    var n = head.nextSibling;
    while (n) { var next = n.nextSibling; body.appendChild(n); n = next; }
    group.appendChild(body);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'm-acc-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', body.id);
    btn.innerHTML = '<span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    btn.firstChild.textContent = head.textContent;
    head.textContent = '';
    head.appendChild(btn);
    btn.addEventListener('click', function () {
      if (!mq.matches) return;
      var open = btn.getAttribute('aria-expanded') !== 'true';
      var scope = group.parentNode;
      [].forEach.call(scope.querySelectorAll(':scope > .' + cls + '.is-open'), function (g) {
        if (g !== group) { g.classList.remove('is-open'); g.querySelector('.m-acc-btn').setAttribute('aria-expanded', 'false'); }
      });
      group.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  function init() {
    if (!mq.matches) {
      var once = function (e) { if (e.matches) { mq.removeEventListener ? mq.removeEventListener('change', once) : mq.removeListener(once); init(); } };
      mq.addEventListener ? mq.addEventListener('change', once) : mq.addListener(once);
      return;
    }
    [].forEach.call(document.querySelectorAll('.drawer .drawer-group'), function (g) {
      var h = g.querySelector(':scope > h6'); if (h) wire(g, h, 'm-acc-drawer');
    });
    [].forEach.call(document.querySelectorAll('footer .foot-col'), function (g) {
      var h = g.querySelector(':scope > h5'); if (h) wire(g, h, 'm-acc-foot');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
