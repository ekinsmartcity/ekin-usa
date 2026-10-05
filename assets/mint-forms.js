/* Ekin → Mint form client. Posts to our own /api/forms/submit (never to Mint directly; no keys here). */
(function () {
  'use strict';
  var ENDPOINT = '/api/forms/submit';
  var C = 'US:United States|AF:Afghanistan|AX:Åland Islands|AL:Albania|DZ:Algeria|AS:American Samoa|AD:Andorra|AO:Angola|AI:Anguilla|AG:Antigua and Barbuda|AR:Argentina|AM:Armenia|AW:Aruba|AU:Australia|AT:Austria|AZ:Azerbaijan|BS:Bahamas|BH:Bahrain|BD:Bangladesh|BB:Barbados|BY:Belarus|BE:Belgium|BZ:Belize|BJ:Benin|BM:Bermuda|BT:Bhutan|BO:Bolivia|BA:Bosnia and Herzegovina|BW:Botswana|BR:Brazil|BN:Brunei|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|CV:Cabo Verde|KH:Cambodia|CM:Cameroon|CA:Canada|KY:Cayman Islands|CF:Central African Republic|TD:Chad|CL:Chile|CN:China|CO:Colombia|KM:Comoros|CG:Congo|CD:Congo (DRC)|CR:Costa Rica|CI:Côte d’Ivoire|HR:Croatia|CU:Cuba|CW:Curaçao|CY:Cyprus|CZ:Czechia|DK:Denmark|DJ:Djibouti|DM:Dominica|DO:Dominican Republic|EC:Ecuador|EG:Egypt|SV:El Salvador|GQ:Equatorial Guinea|ER:Eritrea|EE:Estonia|SZ:Eswatini|ET:Ethiopia|FJ:Fiji|FI:Finland|FR:France|GF:French Guiana|PF:French Polynesia|GA:Gabon|GM:Gambia|GE:Georgia|DE:Germany|GH:Ghana|GI:Gibraltar|GR:Greece|GL:Greenland|GD:Grenada|GP:Guadeloupe|GU:Guam|GT:Guatemala|GG:Guernsey|GN:Guinea|GW:Guinea-Bissau|GY:Guyana|HT:Haiti|HN:Honduras|HK:Hong Kong|HU:Hungary|IS:Iceland|IN:India|ID:Indonesia|IR:Iran|IQ:Iraq|IE:Ireland|IM:Isle of Man|IL:Israel|IT:Italy|JM:Jamaica|JP:Japan|JE:Jersey|JO:Jordan|KZ:Kazakhstan|KE:Kenya|KI:Kiribati|XK:Kosovo|KW:Kuwait|KG:Kyrgyzstan|LA:Laos|LV:Latvia|LB:Lebanon|LS:Lesotho|LR:Liberia|LY:Libya|LI:Liechtenstein|LT:Lithuania|LU:Luxembourg|MO:Macao|MG:Madagascar|MW:Malawi|MY:Malaysia|MV:Maldives|ML:Mali|MT:Malta|MH:Marshall Islands|MQ:Martinique|MR:Mauritania|MU:Mauritius|YT:Mayotte|MX:Mexico|FM:Micronesia|MD:Moldova|MC:Monaco|MN:Mongolia|ME:Montenegro|MS:Montserrat|MA:Morocco|MZ:Mozambique|MM:Myanmar|NA:Namibia|NR:Nauru|NP:Nepal|NL:Netherlands|NC:New Caledonia|NZ:New Zealand|NI:Nicaragua|NE:Niger|NG:Nigeria|KP:North Korea|MK:North Macedonia|MP:Northern Mariana Islands|NO:Norway|OM:Oman|PK:Pakistan|PW:Palau|PS:Palestine|PA:Panama|PG:Papua New Guinea|PY:Paraguay|PE:Peru|PH:Philippines|PL:Poland|PT:Portugal|PR:Puerto Rico|QA:Qatar|RE:Réunion|RO:Romania|RU:Russia|RW:Rwanda|KN:Saint Kitts and Nevis|LC:Saint Lucia|VC:Saint Vincent and the Grenadines|WS:Samoa|SM:San Marino|ST:São Tomé and Príncipe|SA:Saudi Arabia|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leone|SG:Singapore|SX:Sint Maarten|SK:Slovakia|SI:Slovenia|SB:Solomon Islands|SO:Somalia|ZA:South Africa|KR:South Korea|SS:South Sudan|ES:Spain|LK:Sri Lanka|SD:Sudan|SR:Suriname|SE:Sweden|CH:Switzerland|SY:Syria|TW:Taiwan|TJ:Tajikistan|TZ:Tanzania|TH:Thailand|TL:Timor-Leste|TG:Togo|TO:Tonga|TT:Trinidad and Tobago|TN:Tunisia|TR:Türkiye|TM:Turkmenistan|TC:Turks and Caicos Islands|TV:Tuvalu|UG:Uganda|UA:Ukraine|AE:United Arab Emirates|GB:United Kingdom|UY:Uruguay|UZ:Uzbekistan|VU:Vanuatu|VA:Vatican City|VE:Venezuela|VN:Vietnam|VG:Virgin Islands (UK)|VI:Virgin Islands (US)|YE:Yemen|ZM:Zambia|ZW:Zimbabwe';

  function fillCountries(root) {
    [].forEach.call(root.querySelectorAll('select[data-country]'), function (s) {
      if (s.options.length > 1) return;
      C.split('|').forEach(function (e, i) {
        var p = e.split(':'), o = document.createElement('option');
        o.value = p[0]; o.textContent = p[1]; s.appendChild(o);
        if (i === 0) { var sep = document.createElement('option'); sep.disabled = true; sep.textContent = '──────────'; s.appendChild(sep); }
      });
    });
  }

  function utm() {
    var q = new URLSearchParams(location.search), keep = {};
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) keep[k] = q.get(k); });
    try {
      if (Object.keys(keep).length) sessionStorage.setItem('ekin:utm', JSON.stringify(keep));
      return JSON.parse(sessionStorage.getItem('ekin:utm') || '{}');
    } catch (_) { return keep; }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = [].map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // One request_id per form fill; reused for every retry until the server confirms receipt.
  function rid(form) {
    var k = 'ekin:rid:' + location.pathname + '#' + form.id;
    try { var v = sessionStorage.getItem(k); if (!v) { v = uuid(); sessionStorage.setItem(k, v); } return v; } catch (_) { return form._rid || (form._rid = uuid()); }
  }
  function clearRid(form) { try { sessionStorage.removeItem('ekin:rid:' + location.pathname + '#' + form.id); } catch (_) {} form._rid = null; }

  var V = function (f, n) { var el = f.querySelector('[name="' + n + '"]'); return el ? String(el.value || '').trim() : ''; };
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

  /* ---------- per-form configuration: site field names → Mint fields ---------- */
  var FORMS = {
    demoForm: {
      form: 'demo', err: '#demoErr', done: '#demoDone', hide: '.field,.consent,.fsubmit,.prod-pick',
      fields: { first_name: 'firstName', last_name: 'lastName', email: 'email', phone: 'phone', company: 'organization', job_title: 'jobTitle', country: 'country', message: 'message', products: 'products', consent: 'consent' },
      checks: [['firstName', 'Please enter your first name.'], ['lastName', 'Please enter your last name.'], ['email', 'Please enter a valid work e-mail address.', 'email'], ['phone', 'Please enter a phone number.'], ['organization', 'Please enter your organization.'], ['jobTitle', 'Please enter your job title.'], ['organizationType', 'Please select your organization type.'], ['country', 'Please select your country.'], ['products', 'Please select at least one product for the demo.', 'checked'], ['message', 'Please tell us what you would like to see.'], ['consent', 'Please accept the contact consent to continue.', 'checked']],
      build: function (f) { return { subject: 'Demo request — ' + V(f, 'organizationType') }; }
    },
    contactForm: {
      form: 'contact', err: '#contactErr', done: '#contactDone', hide: '.field,.consent,.fsubmit',
      fields: { first_name: 'firstName', last_name: 'lastName', email: 'email', phone: 'phone', company: 'organization', job_title: 'jobTitle', country: 'country', message: 'message', consent: 'consent' },
      checks: [['firstName', 'Please enter your first name.'], ['lastName', 'Please enter your last name.'], ['email', 'Please enter a valid work e-mail address.', 'email'], ['organization', 'Please enter your organization.'], ['jobTitle', 'Please enter your job title.'], ['country', 'Please select your country.'], ['reason', 'Please choose what this is about.'], ['message', 'Please enter a message.'], ['consent', 'Please accept the contact consent to continue.', 'checked']],
      build: function (f) {
        var r = V(f, 'reason');
        return { form: r === 'Pricing or quote' ? 'quote' : r === 'Partnership' ? 'partnership' : 'contact', subject: 'Website contact — ' + r };
      }
    },
    supportForm: {
      form: 'support', err: '#supErr', done: '#supDone', hide: '.field,.consent,.fsubmit',
      fields: { first_name: 'firstName', last_name: 'lastName', email: 'email', phone: 'phone', company: 'organization', job_title: 'jobTitle', country: 'country', consent: 'consent' },
      checks: [['firstName', 'Please enter your first name.'], ['lastName', 'Please enter your last name.'], ['email', 'Please enter a valid work e-mail address.', 'email'], ['organization', 'Please enter your organization.'], ['jobTitle', 'Please enter your job title.'], ['country', 'Please select your country.'], ['topic', 'Please select a request type.'], ['urgency', 'Please select how urgent this is.'], ['message', 'Please describe how we can help.'], ['consent', 'Please accept the contact consent to continue.', 'checked']],
      build: function (f) {
        var head = [['Request type', V(f, 'topic')], ['Urgency', V(f, 'urgency')], ['Product', V(f, 'product')], ['Site / contract reference', V(f, 'reference')]]
          .filter(function (x) { return x[1]; }).map(function (x) { return x[0] + ': ' + x[1]; }).join('\n');
        var o = { subject: 'Support — ' + V(f, 'topic') + ' (' + V(f, 'urgency') + ')', message: head + '\n\n' + V(f, 'message') };
        if (V(f, 'product')) o.products = [V(f, 'product')];
        return o;
      }
    },
    findForm: {
      form: 'contact', err: '.pform-err', done: '.pform-done', pform: true,
      fields: { full_name: 'name', job_title: 'title', company: 'company', email: 'email', phone: 'phone', country: 'country', message: 'message' },
      checks: [['name', 'Please enter your name.'], ['title', 'Please enter your title.'], ['company', 'Please enter your company name.'], ['email', 'Please enter a valid e-mail address.', 'email'], ['country', 'Please select your country.'], ['message', 'Please tell us what you are looking for.']],
      build: function () { return { subject: 'Find a partner' }; }
    },
    becomeForm: {
      form: 'partnership', err: '.pform-err', done: '.pform-done', pform: true,
      fields: { full_name: 'name', job_title: 'title', company: 'company', email: 'email', phone: 'phone', country: 'country', message: 'message' },
      checks: [['name', 'Please enter your name.'], ['title', 'Please enter your title.'], ['company', 'Please enter your company name.'], ['email', 'Please enter a valid e-mail address.', 'email'], ['country', 'Please select your country.']],
      build: function () { return { subject: 'Become a partner' }; }
    },
    buildForm: {
      form: 'ventures', err: '.vform-msg', done: '.vform-msg', ventures: true,
      fields: { full_name: 'name', email: 'email', company: 'company', website: 'website' },
      checks: [['name', 'Please enter your name.'], ['email', 'Please enter a valid e-mail address.', 'email']],
      build: function () { return { subject: 'Ekin Ventures — founder enquiry' }; }
    }
  };

  function $(f, sel) { return sel ? (f.querySelector(sel) || document.querySelector(sel)) : null; }

  function showMsg(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    if (el.classList.contains('dform-err')) el.classList.toggle('on', !!text);
    else el.hidden = !text;
    el.classList.toggle('is-error', !!isError);
  }

  function markInvalid(f, names) {
    [].forEach.call(f.querySelectorAll('[aria-invalid="true"]'), function (el) { el.removeAttribute('aria-invalid'); });
    var first = null;
    names.forEach(function (n) {
      var el = f.querySelector('[name="' + n + '"]');
      if (el) { el.setAttribute('aria-invalid', 'true'); first = first || el; }
    });
    if (first && first.focus) first.focus({ preventScroll: false });
  }

  // Returns every failing field so all of them can be highlighted at once.
  function clientCheck(f, cfg) {
    var bad = [];
    for (var i = 0; i < cfg.checks.length; i++) {
      var c = cfg.checks[i], n = c[0], ok;
      if (c[2] === 'checked') ok = !!f.querySelector('[name="' + n + '"]:checked');
      else if (c[2] === 'email') ok = EMAIL.test(V(f, n));
      else if (n === 'country') ok = /^[A-Z]{2}$/.test(V(f, n));
      else ok = !!V(f, n);
      if (!ok) bad.push({ name: n, msg: c[1] });
    }
    return bad;
  }

  function showList(el, intro, msgs) {
    if (!el) return;
    var uniq = msgs.filter(function (m, i) { return m && msgs.indexOf(m) === i; });
    if (uniq.length <= 1) return showMsg(el, uniq[0] || intro, true);
    el.textContent = '';
    var p = document.createElement('div'); p.textContent = intro; el.appendChild(p);
    var ul = document.createElement('ul'); ul.style.cssText = 'margin:6px 0 0 18px;padding:0';
    uniq.forEach(function (m) { var li = document.createElement('li'); li.textContent = m; ul.appendChild(li); });
    el.appendChild(ul);
    if (el.classList.contains('dform-err')) el.classList.add('on'); else el.hidden = false;
    el.classList.add('is-error');
  }

  // Mint / server field name → this form's input name.
  function inputFor(cfg, mintField) {
    if (cfg.fields[mintField]) return cfg.fields[mintField];
    if (mintField === 'full_name') return cfg.fields.first_name ? [cfg.fields.first_name, cfg.fields.last_name] : 'name';
    return null;
  }

  function buildPayload(f, cfg) {
    var p = { request_id: rid(f), form: cfg.form, language: (document.documentElement.lang || 'en').slice(0, 2), page_url: location.href.split('#')[0], submitted_at: new Date().toISOString() };
    Object.keys(cfg.fields).forEach(function (mintKey) {
      var n = cfg.fields[mintKey];
      if (mintKey === 'products') p.products = [].map.call(f.querySelectorAll('[name="' + n + '"]:checked'), function (c) { return c.value; });
      else if (mintKey === 'consent') { var cb = f.querySelector('[name="' + n + '"]'); if (cb) p.consent = !!cb.checked; }
      else { var v = V(f, n); if (v) p[mintKey] = v; }
    });
    var extra = cfg.build ? cfg.build(f) : {};
    Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    var u = utm(); Object.keys(u).forEach(function (k) { p[k] = u[k]; });
    var hp = f.querySelector('[name="_hp"]'); if (hp && hp.value) p._hp = hp.value;
    return p;
  }

  function finish(f, cfg, ref) {
    clearRid(f);
    var done = $(f, cfg.done);
    if (cfg.ventures) { f.reset(); showMsg(done, 'Thank you — we have received your details.' + (ref ? ' Reference: ' + ref : ''), false); return; }
    if (cfg.pform) {
      f.reset(); if (done) done.hidden = false;
      var fs = f.querySelector('.fsubmit'); if (fs) fs.hidden = true;
      showMsg($(f, cfg.err), '', false);
    } else {
      [].forEach.call(f.querySelectorAll(cfg.hide), function (el) { el.style.display = 'none'; });
      showMsg($(f, cfg.err), '', false);
      if (done) done.classList.add('on');
    }
    if (ref && done && !done.querySelector('.mint-ref')) {
      var r = document.createElement('p'); r.className = 'mint-ref'; r.textContent = 'Reference: ' + ref; done.appendChild(r);
    }
  }

  function bind(f, cfg) {
    f.setAttribute('novalidate', '');
    f.setAttribute('data-mint', cfg.form);
    if (!f.querySelector('[name="_hp"]')) {
      var hp = document.createElement('input');
      hp.type = 'text'; hp.name = '_hp'; hp.tabIndex = -1; hp.autocomplete = 'off'; hp.setAttribute('aria-hidden', 'true');
      hp.style.cssText = 'position:absolute!important;left:-10000px!important;width:1px;height:1px;opacity:0';
      f.appendChild(hp);
    }
    f.addEventListener('input', function (e) { if (e.target && e.target.removeAttribute) e.target.removeAttribute('aria-invalid'); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      var err = $(f, cfg.err), btn = f.querySelector('button[type=submit],button:not([type])');
      if (btn && btn.getAttribute('aria-busy') === 'true') return;
      showMsg(err, '', false);
      var bad = clientCheck(f, cfg);
      if (bad.length) { markInvalid(f, bad.map(function (b) { return b.name; })); return showList(err, 'Please complete the highlighted fields:', bad.map(function (b) { return b.msg; })); }
      markInvalid(f, []);
      if (btn) btn.setAttribute('aria-busy', 'true');
      var payload = buildPayload(f, cfg);
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { code: r.status, body: b || {} }; }); })
        .then(function (res) {
          if (res.body.ok) return finish(f, cfg, res.body.reference);
          if (res.code === 400 && res.body.errors) {
            var keys = Object.keys(res.body.errors), names = [];
            keys.forEach(function (k) { var n = inputFor(cfg, k); if (n) names = names.concat(n); });
            markInvalid(f, names);
            if (!keys.length) return showMsg(err, res.body.message || 'Please review the form and try again.', true);
            return showList(err, res.body.message || 'Please check the highlighted fields:', keys.map(function (k) { return res.body.errors[k]; }));
          }
          showMsg(err, res.body.message || 'We could not send your request right now. Please try again in a moment — your details are still here.', true);
        })
        .catch(function () { showMsg(err, 'Connection problem. Please try again — your details are still here and will not be sent twice.', true); })
        .then(function () { if (btn) btn.removeAttribute('aria-busy'); });
    }, true);
  }

  function init() {
    fillCountries(document);
    var st = document.createElement('style');
    st.textContent = 'form[data-mint] [aria-invalid="true"]{border-color:#e11d2a!important;box-shadow:0 0 0 3px rgba(225,29,42,.14)!important}.mint-ref{margin-top:12px;font-size:13px;opacity:.7;letter-spacing:.02em}';
    document.head.appendChild(st);
    Object.keys(FORMS).forEach(function (id) { var f = document.getElementById(id); if (f) bind(f, FORMS[id]); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.EkinMintForms = { FORMS: FORMS, buildPayload: buildPayload, clientCheck: clientCheck };
})();
