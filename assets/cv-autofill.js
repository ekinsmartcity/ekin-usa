/* CV auto-fill: reads the uploaded CV in the browser (PDF/DOCX), extracts fields locally (no external API), fills empty inputs. */
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
    const pdfjs = await import(new URL('vendor/pdf.min.mjs', import.meta.url).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.mjs', import.meta.url).href;
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
    if (!window.mammoth) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = new URL('vendor/mammoth.browser.min.js', import.meta.url).href; s.onload = ok; s.onerror = () => no(new Error('mammoth load failed')); document.head.appendChild(s); });
    const mammoth = window.mammoth;
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }


  function localParse(text) {
    const lines = text.split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const all = lines.join('\n');
    const d = {};
    const em = all.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i); if (em) d.email = em[0];
    const ph = all.match(/(\+?\d[\d\s().-]{7,}\d)/); if (ph && ph[1].replace(/\D/g, '').length >= 9) d.phone = ph[1].replace(/\s{2,}/g, ' ').trim();
    const li = all.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_%-]+/i); if (li) d.linkedin = li[0];
    const web = all.match(/(?:https?:\/\/)?(?:www\.)?(?:github\.com\/[A-Za-z0-9_-]+|behance\.net\/[A-Za-z0-9_-]+|[a-z0-9-]+\.(?:com|io|dev|me|net|design|studio)(?:\/[^\s]*)?)/gi);
    if (web) { const w = web.find((u) => !/linkedin|@|gmail|outlook|hotmail|yahoo/i.test(u) && (!d.email || !d.email.includes(u.replace(/^https?:\/\/(www\.)?/i, '')))); if (w) d.website = w; }
    const skip = /curriculum|resume|cv\b|@|\d{3}|linkedin|http|www\.|profile|summary|contact/i;
    const nm = lines.slice(0, 8).find((l) => !skip.test(l) && /^[\p{L}'’.-]+(?: [\p{L}'’.-]+){1,3}$/u.test(l) && l.length <= 48);
    if (nm) { const parts = nm.split(' ').map((p) => p === p.toUpperCase() ? p.charAt(0) + p.slice(1).toLowerCase() : p); d.full_name = parts.join(' '); d.first_name = parts.slice(0, -1).join(' '); d.last_name = parts[parts.length - 1]; }
    const head = lines.slice(0, 15).join('\n');
    const loc = head.match(/(?:^|\n|[|•·,] ?)([A-Z][\p{L}. -]+, ?(?:[A-Z]{2}|[A-Z][\p{L} ]+))(?=\s*(?:$|\n|[|•·]|\d{5}))/mu);
    if (loc && !/university|college|street|avenue/i.test(loc[1])) d.location = loc[1].trim();
    const yrs = [...all.matchAll(/\b(19[7-9]\d|20[0-4]\d)\b/g)].map((m) => +m[1]);
    const nowY = new Date().getFullYear(); const cur = /present|current|günümüz|halen|now/i.test(all);
    if (yrs.length >= 2) { const mn = Math.min(...yrs), mx = cur ? nowY : Math.max(...yrs); const span = mx - mn; if (span > 0 && span < 45) d.years_experience = Math.max(0, span - 4); }
    const HEAD = /^(summary|profile|professional summary|about me|objective|experience|work experience|professional experience|employment( history)?|work history|career history|internships?|education|academic background|qualifications|skills|technical skills|core competencies|competencies|languages?|software|tools|technologies|certifications?|certificates|projects|references|interests|hobbies|awards|volunteer(ing)?|publications|contact|personal (details|information)|özet|hakkımda|deneyim|iş deneyimi|eğitim|yetenekler|yetkinlikler|diller|sertifikalar|referanslar|projeler|programlar)\b[:\s]*$/i;
    const isHead = (l) => l.length < 42 && (HEAD.test(l) || /^[A-ZÇĞİÖŞÜ &/]{4,}$/.test(l));
    const secLines = (re, max, strict) => { const i = lines.findIndex((l) => re.test(l) && l.length < 42); if (i < 0) return []; const out = []; for (let k = i + 1; k < lines.length && out.length < (max || 6); k++) { if (strict ? (lines[k].length < 42 && HEAD.test(lines[k].replace(/İ/g, 'I').toLowerCase())) : isHead(lines[k])) break; out.push(lines[k]); } return out; };
    const sec = (re) => secLines(re).join(' ');
    const lang = sec(/^(languages?|diller)\b/i); if (lang) d.languages = lang.slice(0, 300);
    const sk = sec(/^(skills|technical skills|competencies|core competencies|yetkinlikler)\b/i); if (sk) d.competencies = sk.slice(0, 400);
    const sw = sec(/^(software|tools|technologies|programlar)\b/i); if (sw) d.software = sw.slice(0, 300);
    const sum = sec(/^(summary|profile|professional summary|about me|objective|özet|hakkımda)\b/i); if (sum) d.summary = sum.slice(0, 600);
    const exp = secLines(/^(experience|work experience|professional experience|employment( history)?|work history|career history|work \/ internship experience|work & internship experience|internships?|relevant experience|deneyim|iş deneyimi|is deneyimi|DENEYİM|İŞ DENEYİMİ)(\s|:|$)/i, 200, true);
    if (exp.length) {
      const RNG = /((?:(?:0?[1-9]|1[0-2])[\/.]|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? |(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık) )?(?:19|20)\d{2})\s*(?:[-–—]|to|until|bis|-)\s*((?:(?:0?[1-9]|1[0-2])[\/.]|[a-zçğıöşü]+\.? )?(?:19|20)\d{2}|present|current|now|today|ongoing|günümüz|halen|devam ediyor|heute|obecnie|jelenleg)/i;
      const bullet = (l) => /^[•●▪◦·\-*–]\s?/.test(l);
      const entries = []; let cur = null; let pending = [];
      exp.forEach((l) => {
        if (RNG.test(l)) { const lead = cur && !cur.hasDate ? [] : pending.splice(-2); if (cur && !cur.hasDate) { cur.lines.push(...pending, l); cur.hasDate = 1; pending = []; return; } if (cur) cur.lines.push(...pending); pending = []; cur = { lines: [...lead, l], hasDate: 1 }; entries.push(cur); return; }
        if (bullet(l) || !cur) { if (!cur) { pending.push(l); if (pending.length > 2) { cur = { lines: pending.splice(0), hasDate: 0 }; entries.push(cur); } return; } cur.lines.push(...pending, l); pending = []; return; }
        pending.push(l); if (pending.length > 2) { cur.lines.push(...pending.splice(0, pending.length - 2)); }
      });
      if (pending.length) { if (cur) cur.lines.push(...pending); else entries.push({ lines: pending, hasDate: 0 }); }
      const endYear = (e) => { const t = e.lines.join(' '); const m = t.match(RNG); if (!m) return -1; if (/present|current|now|today|ongoing|günümüz|halen|devam|heute|obecnie|jelenleg/i.test(m[2])) return 9999; const y = m[2].match(/(19|20)\d{2}/); return y ? +y[0] : -1; };
      const sorted = entries.map((e, i) => ({ e, i, y: endYear(e) })).sort((a, b) => (b.y - a.y) || (a.i - b.i)).map((x) => x.e.lines.join('\n'));
      d.experience_text = sorted.join('\n\n').slice(0, 6000);
      const ey = [...exp.join(' ').matchAll(/\b(19[7-9]\d|20[0-4]\d)\b/g)].map((m) => +m[1]); if (ey.length) { const ex = /present|current|günümüz|halen|now/i.test(exp.join(' ')) ? nowY : Math.max(...ey); const sp = ex - Math.min(...ey); if (sp >= 0 && sp < 45) d.years_experience = Math.max(1, sp); }
    }
    const ed = secLines(/^(education|academic background|education & training|eğitim( bilgileri)?|EĞİTİM( BİLGİLERİ)?|Eğitim)(\s|:|$)/i, 30);
    const UNI = /(universit|üniversite|college|institut|school of|polytechnic|politechnika|egyetem|hochschule|akademi|academy|\bMIT\b|\bETH\b)/i;
    const LVL = [['phd', /\b(ph\.? ?d|doctor(ate|al)?|doktora|dr\. ?rer|promotion)\b/i], ['master', /\b(master'?s?|m\.? ?sc|m\.? ?s\b|m\.? ?a\b|mba|m\.? ?eng|meng|yüksek lisans|magister|msc)\b/i], ['bachelor', /\b(bachelor'?s?|b\.? ?sc|b\.? ?s\b|b\.? ?a\b|b\.? ?eng|beng|bsc|lisans|undergraduate|licencjat|diplom)\b/i]];
    const dateRe = /((?:0?[1-9]|1[0-2])[\/.](?:19|20)\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (?:19|20)\d{2}|(?:19|20)\d{2})/gi;
    const mmyy = (s) => { if (!s) return ''; const mo = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }; let m = s.match(/^(\d{1,2})[\/.](\d{4})$/); if (m) return String(m[1]).padStart(2, '0') + '/' + m[2]; m = s.match(/^([a-z]{3})[a-z]*\.? (\d{4})$/i); if (m) return String(mo[m[1].toLowerCase()]).padStart(2, '0') + '/' + m[2]; return s; };
    const uIdx = ed.map((l, i) => (UNI.test(l) ? i : -1)).filter((i) => i >= 0);
    const education = []; const used = new Set(); const claimed = new Set(uIdx);
    const lvlOf = (l) => (LVL.find((x) => x[1].test(l)) || [null])[0];
    const fLv = ed.findIndex((l) => lvlOf(l) && !UNI.test(l)); const degFirst = fLv >= 0 && uIdx.length && fLv < uIdx[0];
    uIdx.forEach((ui) => {
      let di = -1;
      for (const k of (degFirst ? [ui, ui - 1, ui + 1, ui - 2] : [ui, ui + 1, ui - 1, ui + 2])) { if (k < 0 || k >= ed.length) continue; if (k !== ui && (claimed.has(k) || UNI.test(ed[k]))) continue; if (lvlOf(ed[k])) { di = k; break; } }
      if (di < 0) return; if (di !== ui) claimed.add(di);
      const lv = lvlOf(ed[di]); if (!lv || used.has(lv)) return; used.add(lv);
      const blkIdx = [ui, di]; const nx = Math.max(ui, di) + 1; if (nx < ed.length && !claimed.has(nx) && !UNI.test(ed[nx]) && !lvlOf(ed[nx]) && /(19|20)\d{2}|gpa|gno/i.test(ed[nx])) { blkIdx.push(nx); claimed.add(nx); }
      const txt = [...new Set(blkIdx)].sort((x, y) => x - y).map((k) => ed[k]).join(' \n ');
      let uni = ed[ui].split(/\s[|•·–—-]\s|,\s*(?=(?:19|20)\d{2})/)[0].replace(dateRe, '').replace(/[\s,–—-]+$/, '').trim();
      if (di === ui) { const p = uni.split(/,\s*/); const u = p.find((s) => UNI.test(s)); if (u) uni = u.trim(); }
      const dl = ed[di];
      const cut = (s) => s.split(/,|\||•|·|\bc?gpa\b|\bgno\b|\(/i)[0];
      let dept = ''; const m = dl.match(/\bin\s+([^,|•·(\d]+)/i) || txt.match(/department of\s+([^,|•·(\n\d]+)/i) || dl.match(/\bof\s+(?!science\b|arts\b)([^,|•·(\d]+)/i);
      if (m) dept = m[1]; else { let r = dl.replace(LVL.find((x) => x[0] === lv)[1], ''); if (di === ui) r = r.replace(uni, ''); r = cut(r.replace(/^[\s,.:|•·–—-]+/, '')).replace(dateRe, '').replace(/[\s,.:|•·–—-]+$/g, '').trim(); if (r.length > 2 && r.length < 70 && !UNI.test(r)) dept = r; }
      dept = cut(dept).replace(/\s+(at|from)\s.*$/i, '').replace(/[\s,.;–—-]+$/, '').trim();
      if (UNI.test(dept)) dept = '';
      const ds = (txt.match(dateRe) || []); const end = /present|current|ongoing|devam|halen/i.test(txt) ? 'Present' : mmyy(ds[1] || '');
      const g = txt.match(/\b(?:GPA|CGPA|GNO|grade|note)\b[:\s]*([0-9]+[.,][0-9]{1,2}(?:\s*\/\s*[0-9]+(?:[.,][0-9]+)?)?)/i);
      education.push({ level: lv, university: uni.slice(0, 120), department: dept.slice(0, 120), start: mmyy(ds[0] || ''), end: end, gpa: g ? g[1].replace(/\s+/g, '') : '' });
    });
    if (education.length) d.education = education;
    return d;
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
      const n = apply(localParse(text));
      say(n ? 'Filled ' + n + ' field' + (n > 1 ? 's' : '') + ' from your CV. Please review before submitting.' : 'Nothing new to fill. Your existing entries were kept.', 'ok');
    } catch (e) {
      console.warn('[cv-autofill] failed', e);
      if (id === run) say('Auto-fill is not available right now. Please fill the form manually.', 'err');
    }
  });
}
