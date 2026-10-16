/* Job application form: uploads files to Vercel Blob, then sends the application to /api/careers/apply */
import { upload } from 'https://esm.sh/@vercel/blob@1/client';

const MAX = 20 * 1024 * 1024;
const form = document.getElementById('appForm');
if (form) {
  const ok = document.getElementById('appSuccess');
  const btn = form.querySelector('button[type=submit]');
  const btnHTML = btn ? btn.innerHTML : '';
  let err = form.querySelector('.app-err');
  if (!err) {
    err = document.createElement('div'); err.className = 'app-err'; err.setAttribute('role', 'alert'); err.hidden = true;
    err.style.cssText = 'margin:0 0 16px;padding:12px 14px;border:1px solid rgba(255,57,50,.55);border-radius:8px;background:rgba(255,57,50,.08);color:#f5f7fa;font-size:14px;line-height:1.5';
    (form.querySelector('.form-submit') || form).prepend(err);
  }
  if (!form.querySelector('[name="_hp"]')) {
    const hp = document.createElement('input'); hp.type = 'text'; hp.name = '_hp'; hp.tabIndex = -1; hp.autocomplete = 'off'; hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute!important;left:-10000px!important;width:1px;height:1px;opacity:0'; form.appendChild(hp);
  }
  const showErr = (m) => { err.textContent = m || ''; err.hidden = !m; };
  const busy = (t) => { if (!btn) return; if (t) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = t; } else { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = btnHTML; } };
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const safe = (n) => n.normalize('NFKD').replace(/[^\w.\-]+/g, '_').slice(-120) || 'file';
  const position = () => { const h = document.querySelector('h1'); return (h && h.textContent.trim()) || document.title.split('|')[0].trim(); };

  form.addEventListener('input', (e) => e.target.removeAttribute && e.target.removeAttribute('aria-invalid'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); e.stopImmediatePropagation();
    if (btn && btn.disabled) return;
    showErr('');
    if (!form.reportValidity()) return;
    const inputs = [...form.querySelectorAll('input[type=file]')];
    const list = [];
    for (const inp of inputs) for (const file of inp.files) list.push({ field: inp.name, file });
    const big = list.find((x) => x.file.size > MAX);
    if (big) return showErr('"' + big.file.name + '" is larger than 20 MB. Please upload a smaller file.');
    const fields = {};
    new FormData(form).forEach((v, k) => { if (typeof v === 'string' && k !== '_hp' && v.trim()) fields[k] = v.trim(); });
    if (!fields.full_name && (fields.first_name || fields.last_name)) fields.full_name = [fields.first_name, fields.last_name].filter(Boolean).join(' ');
    const id = rid(), files = [];
    try {
      for (let i = 0; i < list.length; i++) {
        const x = list[i];
        busy('Uploading ' + (i + 1) + ' / ' + list.length + '…');
        const r = await upload('careers/' + id + '/' + x.field + '-' + safe(x.file.name), x.file, { access: 'public', handleUploadUrl: '/api/careers/upload', contentType: x.file.type || 'application/octet-stream', multipart: x.file.size > 8 * 1024 * 1024 });
        files.push({ field: x.field, name: x.file.name, url: r.url, size: x.file.size });
      }
    } catch (ex) {
      console.error('[careers] upload failed', ex);
      const m = String((ex && ex.message) || '');
      busy(''); return showErr(/not available/i.test(m) ? 'Document uploads are not available right now. Please try again later or e-mail your CV to jobs@ekin.com.' : /content type|file type/i.test(m) ? 'This file type is not supported. Please upload a PDF, DOC/DOCX, PPT/PPTX, PNG or JPG.' : 'We could not upload your documents. Please check your connection and try again.' + (m ? ' (' + m.slice(0, 140) + ')' : ''));
    }
    busy('Sending…');
    try {
      const hp = form.querySelector('[name="_hp"]');
      const r = await fetch('/api/careers/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ request_id: id, position: position(), page_url: location.href.split('#')[0], fields, files, _hp: hp ? hp.value : '' }) });
      const b = await r.json().catch(() => ({}));
      if (!b.ok) {
        busy('');
        if (b.errors) { Object.keys(b.errors).forEach((k) => { const el = form.querySelector('[name="' + k + '"]') || (k === 'cv' && form.querySelector('[name="resume"]')); if (el) el.setAttribute('aria-invalid', 'true'); }); return showErr(Object.values(b.errors).join(' ')); }
        return showErr(b.message || 'We could not send your application right now. Please try again in a moment.');
      }
      form.style.display = 'none';
      if (ok) { ok.style.display = 'block'; window.scrollTo({ top: ok.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' }); }
    } catch (ex) {
      busy(''); showErr('Connection problem. Please try again; your details are still here.');
    }
  }, true);
}
