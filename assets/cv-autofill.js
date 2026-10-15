/* CV auto-fill: reads the uploaded CV in the browser (PDF/DOCX), asks /api/careers/parse for fields, fills empty inputs. */
const form = document.getElementById('appForm');
const cvIn = form && form.querySelector('input[type=file][name="cv"],input[type=file][name="resume"]');
if (cvIn) {
  const st = document.createElement('div');
  st.className = 'cv-fill-status'; st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite'); st.hidden = true;
  const field = cvIn.closest('.field') || cvIn.parentElement;
  field.appendChild(st);
  const hint = document.createElement('span'); hint.className = 'hint cv-fill-hint';
  hint.textContent = 'Upload a PDF or DOCX and we will pre-fill the form from your CV. Please review before submitting.';
  field.appendChild(hint);

  const css = document.createElement('style');
  css.textContent = '.cv-fill-status{display:flex;align-items:center;gap:10px;margin-top:4px;font-size:14px;line-height:1.45;color:rgba(255,255,255,.82)}.cv-fill-status[hidden]{display:none}.cv-fill-status.err{color:#ff8a85}.cv-fill-status .sp{flex:none;width:14px;height:14px;border:2px solid rgba(255,255,255,.25);border-top-color:#FF3932;border-radius:50%;animation:cvsp .8s linear infinite}.cv-fill-status .ok{flex:none;width:8px;height:8px;border-radius:50%;background:#FF3932}@keyframes cvsp{to{transform:rotate(360deg)}}#appForm .cv-filled{border-color:rgba(255,57,50,.75)!important;box-shadow:0 0 0 3px rgba(255,57,50,.16)!important;transition:border-color 1.2s ease,box-shadow 1.2s ease}@media (prefers-reduced-motion:reduce){.cv-fill-status .sp{animation:none}}';
  document.head.appendChild(css);

  const say = (msg, kind) => { st.hidden = !msg; st.className = 'cv-fill-status' + (kind === 'err' ? ' err' : ''); st.innerHTML = msg ? '<span class="' + (kind === 'busy' ? 'sp' : kind === 'ok' ? 'ok' : '') + '" aria-hidden="true"></span><span></span>' : ''; if (msg) st.lastChild.textContent = msg; };

  async function pdfText(file) {
    const pdfjs = await import('https://esm.sh/pdfjs-dist@4.10.38/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = '';
    for (let p = 1; p <= Math.min(doc.numPages, 6); p++) {
      const c = await (await doc.getPage(p)).getTextContent();
      let line = '', y = null;
      c.items.forEach((it) => { const yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 3) { out += line.trim() + '\n'; line = ''; } line += it.str + (it.hasEOL ? '\n' : ' '); y = yy; });
      out += line.trim() + '\n\n';
    }
    return out;
  }
  async function docxText(file) {
    const m = await import('https://esm.sh/mammoth@1.8.0/mammoth.browser.js');
    const mammoth = m.default || m;
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }

  const q = (n) => form.querySelector('[name="' + CSS.escape(n) + '"]');
  function put(name, val) {
    const el = q(name); val = val == null ? '' : String(val).trim();
    if (!el || !val || el.disabled || el.type === 'file' || el.type === 'checkbox') return 0;
    if (el.value && el.value.trim()) return 0;
    if (el.tagName === 'SELECT') { const o = [...el.options].find((o) => o.value === val || o.text === val); if (!o) return 0; el.value = o.value; }
    else if (el.type === 'url') { if (!/^https?:\/\//i.test(val)) val = 'https://' + val.replace(/^\/+/, ''); el.value = val; }
    else if (el.type === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return 0; el.value = val; }
    else { if (el.maxLength > 0) val = val.slice(0, el.maxLength); el.value = val; }
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    el.classList.add('cv-filled'); setTimeout(() => el.classList.remove('cv-filled'), 2600);
    return 1;
  }
  function yearsOption(n) { n = +n || 0; if (!n) return ''; const sel = q('experience'); if (!sel || sel.tagName !== 'SELECT') return '';
    const o = [...sel.options].find((o) => { const t = o.text.replace(/\u2013/g, '-'); const m = t.match(/(\d+)\s*-\s*(\d+)/); if (m) return n >= +m[1] && n <= +m[2]; const p = t.match(/(\d+)\+/); return p && n >= +p[1]; });
    return o ? o.text : ''; }
  function apply(d) {
    let n = 0;
    const full = d.full_name || [d.first_name, d.last_name].filter(Boolean).join(' ');
    n += put('full_name', full) + put('first_name', d.first_name) + put('last_name', d.last_name);
    n += put('email', d.email) + put('phone', d.phone) + put('location', d.location) + put('address', d.address || d.location);
    n += put('linkedin', d.linkedin) + put('dob', d.date_of_birth);
    const pf = q('portfolio'); if (pf && pf.type === 'url') n += put('portfolio', d.website);
    n += put('summary', d.summary) + put('languages', d.languages) + put('software', d.software) + put('competencies', d.competencies);
    const ex = q('experience'); if (ex) n += ex.tagName === 'SELECT' ? put('experience', yearsOption(d.years_experience)) : put('experience', d.experience_text);
    const L = { bachelor: "Bachelor's Degree", master: "Master's Degree", phd: 'PhD' };
    (Array.isArray(d.education) ? d.education : []).forEach((e) => { const p = L[String(e.level || '').toLowerCase()]; if (!p) return;
      n += put(p + '_uni', e.university) + put(p + '_dept', e.department) + put(p + '_start', e.start) + put(p + '_end', e.end) + put(p + '_gpa', e.gpa); });
    return n;
  }

  let run = 0;
  cvIn.addEventListener('change', async () => {
    const file = cvIn.files && cvIn.files[0]; const id = ++run;
    if (!file) return say('');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) return say('Auto-fill works with PDF or DOCX files. Your file will still be attached.');
    if (file.size > 20 * 1024 * 1024) return say('');
    say('Reading your CV…', 'busy');
    try {
      const text = ext === 'pdf' ? await pdfText(file) : await docxText(file);
      if (id !== run) return;
      if (!text || text.replace(/\s/g, '').length < 40) return say('We could not read text from this CV (it may be a scanned image). Please fill the form manually.', 'err');
      say('Filling the form from your CV…', 'busy');
      const r = await fetch('/api/careers/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 24000) }) });
      const b = await r.json().catch(() => ({}));
      if (id !== run) return;
      if (!b.ok || !b.data) return say(b.message || 'Auto-fill is not available right now. Please fill the form manually.', 'err');
      const n = apply(b.data);
      say(n ? 'Filled ' + n + ' field' + (n > 1 ? 's' : '') + ' from your CV. Please review before submitting.' : 'Nothing new to fill. Your existing entries were kept.', 'ok');
    } catch (e) {
      if (id === run) say('Auto-fill is not available right now. Please fill the form manually.', 'err');
    }
  });
}
