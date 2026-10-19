'use strict';
// POST /api/careers/apply — validates the application, forwards it to Ekin Bloom (career.ekin.com) with the CV,
// and (optionally) sends a copy / fallback e-mail via Resend.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com$/i;
const BLOOM_URL = process.env.EKIN_BLOOM_URL || 'https://career.ekin.com/api/method/ekin_erp.api.career.submit_application';
const CV_MAX = 5 * 1024 * 1024;
const CV_EXT = /\.(pdf|docx?|rtf|png|jpe?g|webp|gif|heic|bmp|tiff?)$/i;

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return null; } }
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 128 * 1024) { d = ''; req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (_) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}
function originAllowed(req) {
  const allow = String(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allow.length) return true;
  const o = String(req.headers.origin || '');
  return !o || allow.includes(o);
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
const label = (k) => k.replace(/_/g, ' ').replace(/\b(uni|dept|gpa|dob)\b/gi, (m) => ({ uni: 'University', dept: 'Department', gpa: 'GPA', dob: 'Date of birth' }[m.toLowerCase()])).replace(/^\w/, (c) => c.toUpperCase());
const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const US = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ');
const COUNTRIES = { 'united states': 'US', usa: 'US', 'u.s.': 'US', 'u.s.a.': 'US', america: 'US', turkey: 'TR', 'türkiye': 'TR', turkiye: 'TR', germany: 'DE', deutschland: 'DE', poland: 'PL', polska: 'PL', hungary: 'HU', 'magyarország': 'HU', switzerland: 'CH', schweiz: 'CH', suisse: 'CH', 'united kingdom': 'GB', uk: 'GB', england: 'GB', france: 'FR', italy: 'IT', spain: 'ES', netherlands: 'NL', austria: 'AT', canada: 'CA', mexico: 'MX', india: 'IN', 'united arab emirates': 'AE', uae: 'AE', 'saudi arabia': 'SA', qatar: 'QA', azerbaijan: 'AZ', romania: 'RO', bulgaria: 'BG', greece: 'GR', ukraine: 'UA', 'czech republic': 'CZ', czechia: 'CZ', portugal: 'PT', belgium: 'BE', sweden: 'SE', ireland: 'IE', israel: 'IL', egypt: 'EG', brazil: 'BR', japan: 'JP', china: 'CN', 'south korea': 'KR', australia: 'AU' };
function countryOf(s) {
  s = String(s || '').trim(); if (!s) return '';
  const parts = s.split(/[,/|]/).map((p) => p.trim()).filter(Boolean); const last = parts[parts.length - 1] || '';
  const c = COUNTRIES[last.toLowerCase().replace(/\s+\d.*$/, '')]; if (c) return c;
  const st = last.toUpperCase().match(/^([A-Z]{2})(\s+\d{5}(-\d{4})?)?$/); if (st && US.includes(st[1])) return 'US';
  for (const k of Object.keys(COUNTRIES)) if (k.length > 3 && s.toLowerCase().includes(k)) return COUNTRIES[k];
  if (/\b(istanbul|ankara|izmir|bursa|antalya)\b/i.test(s)) return 'TR';
  return '';
}
function birthDate(v) {
  v = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(v)) return v;
  return '';
}
// Bloom error key → form field name
const FIELD_MAP = { first_name: 'full_name', last_name: 'full_name', birth_date: 'dob', country: 'location', cover_letter: 'summary', consent: 'privacy' };

async function postBloom(key, payload) {
  let last = { status: 0, body: null };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(BLOOM_URL, { method: 'POST', headers: { 'X-Ekin-Api-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      const m = (j && j.message && typeof j.message === 'object') ? j.message : j;
      last = { status: r.status, body: m };
      if (r.status < 500 && r.status !== 429) return last;
    } catch (e) { last = { status: 0, body: { error: String((e && e.message) || e) } }; }
    await sleep(600 * (attempt + 1));
  }
  return last;
}

async function sendMail(f, files, position, ref, pageUrl, note) {
  const key = process.env.RESEND_API_KEY; if (!key) return false;
  const to = String(process.env.CAREERS_TO || 'jobs@ekin.com').split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.CAREERS_FROM || 'Ekin Careers <careers@ekin.com>';
  const rows = Object.keys(f).map((k) => '<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top;white-space:nowrap">' + esc(label(k)) + '</td><td style="padding:6px 0;white-space:pre-wrap">' + esc(f[k]) + '</td></tr>').join('');
  const fileRows = files.map((x) => '<li style="margin:4px 0"><b>' + esc(label(x.field)) + ':</b> <a href="' + esc(x.url) + '">' + esc(x.name) + '</a> <span style="color:#888">(' + kb(x.size) + ')</span></li>').join('');
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">' + (note ? '<p style="margin:0 0 14px;padding:10px 12px;background:#fff4f3;border:1px solid #ffc9c6">' + esc(note) + '</p>' : '') +
    '<h2 style="margin:0 0 4px">New application: ' + esc(position) + '</h2><p style="margin:0 0 18px;color:#666">Reference ' + esc(ref) + (pageUrl ? ' &middot; <a href="' + esc(pageUrl) + '">job page</a>' : '') + '</p>' +
    '<table style="border-collapse:collapse">' + rows + '</table><h3 style="margin:22px 0 6px">Documents</h3><ul style="padding-left:18px;margin:0">' + fileRows + '</ul></div>';
  const text = (note ? note + '\n\n' : '') + 'New application: ' + position + '\nReference ' + ref + '\n\n' + Object.keys(f).map((k) => label(k) + ': ' + f[k]).join('\n') + '\n\nDocuments:\n' + files.map((x) => label(x.field) + ': ' + x.name + ' ' + x.url).join('\n');
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, reply_to: f.email, subject: 'Application: ' + position + ' — ' + (f.full_name || ''), html, text }) });
    if (!r.ok) console.error('[careers] Resend error', r.status, await r.text().catch(() => ''));
    return r.ok;
  } catch (e) { console.error('[careers] mail failed', String((e && e.message) || e)); return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, message: 'Method not allowed' }); }
  if (!originAllowed(req)) return send(res, 403, { ok: false, message: 'Origin not allowed' });
  const b = await readBody(req);
  if (!b) return send(res, 400, { ok: false, message: 'Invalid request body' });
  if (b._hp) return send(res, 200, { ok: true });

  const f = {};
  Object.keys(b.fields || {}).slice(0, 80).forEach((k) => { const v = clip(b.fields[k], 4000).trim(); if (v) f[clip(k, 80)] = v; });
  const files = (Array.isArray(b.files) ? b.files : []).slice(0, 12).filter((x) => {
    try { const u = new URL(x.url); return u.protocol === 'https:' && BLOB_HOST_RE.test(u.hostname); } catch (_) { return false; }
  }).map((x) => ({ field: clip(x.field, 40), name: clip(x.name, 200), url: String(x.url), size: +x.size || 0 }));

  let first = f.first_name || '', last = f.last_name || '';
  if ((!first || !last) && f.full_name) { const p = f.full_name.split(/\s+/); last = last || (p.length > 1 ? p.pop() : ''); first = first || p.join(' '); }
  if (!f.full_name) f.full_name = [first, last].filter(Boolean).join(' ');
  const cv = files.find((x) => x.field === 'cv' || x.field === 'resume');
  const cvName = cv ? 'cv' : (f.resume !== undefined ? 'resume' : 'cv');
  const consent = !!(f.privacy || f.consent || b.consent);

  const errors = {};
  if (!first || !last) errors.full_name = 'Please enter your first and last name.';
  if (!f.email || !EMAIL_RE.test(f.email)) errors.email = 'Please enter a valid e-mail address.';
  if (!f.phone) errors.phone = 'Please enter a phone number.';
  if (!cv) errors[cvName] = 'Please attach your resume / CV.';
  else if (!CV_EXT.test(cv.name)) errors[cvName] = 'Please upload your CV as PDF, DOC, DOCX, RTF or an image.';
  else if (cv.size > CV_MAX) errors[cvName] = 'Your CV must be 5 MB or smaller.';
  if (!consent) errors.privacy = 'Please accept the privacy consent to apply.';
  if (Object.keys(errors).length) return send(res, 400, { ok: false, errors, message: 'Please check the highlighted fields.' });

  const position = clip(b.position || 'General application', 160);
  const requestId = /^[A-Za-z0-9-]{8,64}$/.test(String(b.request_id || '')) ? String(b.request_id) : 'web-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pageUrl = clip(b.page_url || '', 400);

  // Everything not mapped to a Bloom field goes into cover_letter so HR sees the full application.
  const used = new Set(['first_name', 'last_name', 'full_name', 'email', 'phone', 'privacy', 'consent', 'linkedin', 'dob', 'summary']);
  const extra = Object.keys(f).filter((k) => !used.has(k)).map((k) => label(k) + ': ' + f[k]);
  const others = files.filter((x) => x !== cv).map((x) => label(x.field) + ': ' + x.name + ' — ' + x.url);
  const cover = [f.summary || '', extra.length ? '— Application details —\n' + extra.join('\n') : '', others.length ? '— Additional documents —\n' + others.join('\n') : '', pageUrl ? 'Applied via: ' + pageUrl : ''].filter(Boolean).join('\n\n');

  const key = process.env.EKIN_BLOOM_API_KEY;
  if (!key) {
    console.error('[careers] EKIN_BLOOM_API_KEY not set');
    if (await sendMail(f, files, position, requestId, pageUrl, 'Not delivered to Ekin Bloom: EKIN_BLOOM_API_KEY is not configured.')) return send(res, 200, { ok: true, reference: requestId, via: 'email' });
    return send(res, 503, { ok: false, message: 'We could not send your application right now. Please try again later.' });
  }

  let cvB64 = '';
  try {
    const r = await fetch(cv.url); if (!r.ok) throw new Error('blob ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > CV_MAX) return send(res, 400, { ok: false, errors: { [cvName]: 'Your CV must be 5 MB or smaller.' }, message: 'Your CV must be 5 MB or smaller.' });
    cvB64 = buf.toString('base64');
  } catch (e) {
    console.error('[careers] CV fetch failed', String((e && e.message) || e));
    return send(res, 502, { ok: false, message: 'We could not process your CV. Please try again.' });
  }

  const ext = (cv.name.match(/\.[a-z0-9]+$/i) || ['.pdf'])[0].toLowerCase();
  const slug = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';
  const payload = {
    request_id: requestId,
    application_type: /\bintern(ship)?\b|staj/i.test(position + ' ' + (f.employment || '')) ? 'internship' : 'job',
    first_name: clip(first, 140), last_name: clip(last, 140),
    email: clip(f.email, 200), phone: clip(f.phone, 60), consent: true,
    position_title: position,
    cv_base64: cvB64, cv_filename: slug(first + '-' + last) + ext
  };
  if (b.position_slug) payload.position = clip(b.position_slug, 140);
  const bd = birthDate(f.dob); if (bd) payload.birth_date = bd;
  const cc = countryOf(f.location || f.address); if (cc) payload.country = cc;
  if (f.linkedin) payload.linkedin = clip(f.linkedin, 300);
  if (cover) payload.cover_letter = clip(cover, 12000);

  const out = await postBloom(key, payload);
  const m = out.body || {};
  if (out.status === 200 && m.ok) {
    if (process.env.CAREERS_EMAIL_COPY === '1') await sendMail(f, files, position, m.applicant || requestId, pageUrl, '');
    return send(res, 200, { ok: true, reference: m.applicant || requestId, duplicate: !!m.duplicate });
  }
  console.error('[careers] Bloom error', out.status, JSON.stringify(m).slice(0, 800));
  if (out.status === 400 && m.errors) {
    const errs = {}; let general = '';
    Object.keys(m.errors).forEach((k) => { const v = String(m.errors[k]); if (k === '__') general = v; else { const fk = k === 'cv' ? cvName : (FIELD_MAP[k] || k); errs[fk] = errs[fk] ? errs[fk] + ' ' + v : v; } });
    return send(res, 400, { ok: false, errors: Object.keys(errs).length ? errs : undefined, message: general || 'Please check the highlighted fields.' });
  }
  if (out.status === 403) return send(res, 403, { ok: false, message: 'Applications are currently closed. Please check back later.' });
  if (out.status === 429) return send(res, 429, { ok: false, message: 'Too many applications right now. Please wait a minute and try again.' });
  // 5xx / network after retries: e-mail fallback so the application is not lost
  if (await sendMail(f, files, position, requestId, pageUrl, 'Ekin Bloom was unavailable (status ' + out.status + '). Please add this applicant manually. request_id: ' + requestId)) return send(res, 200, { ok: true, reference: requestId, via: 'email' });
  return send(res, 502, { ok: false, message: 'We could not send your application right now. Please try again in a moment.' });
};
