'use strict';
// POST /api/careers/apply — receives the application (fields + Blob file links) and e-mails it to HR via Resend.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com$/i;

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

  const errors = {};
  if (!f.full_name) errors.full_name = 'Please enter your full name.';
  if (!f.email || !EMAIL_RE.test(f.email)) errors.email = 'Please enter a valid e-mail address.';
  if (!f.phone) errors.phone = 'Please enter a phone number.';
  if (!files.some((x) => x.field === 'cv' || x.field === 'resume')) errors.cv = 'Please attach your resume / CV.';
  if (Object.keys(errors).length) return send(res, 400, { ok: false, errors, message: 'Please check the highlighted fields.' });

  const key = process.env.RESEND_API_KEY;
  const to = String(process.env.CAREERS_TO || 'jobs@ekin.com').split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.CAREERS_FROM || 'Ekin Careers <careers@ekin.com>';
  if (!key) { console.error('[careers] RESEND_API_KEY not set'); return send(res, 503, { ok: false, message: 'We could not send your application right now. Please try again later.' }); }

  const position = clip(b.position || 'General application', 160);
  const ref = 'APP-' + Date.now().toString(36).toUpperCase();
  const rows = Object.keys(f).map((k) => '<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top;white-space:nowrap">' + esc(label(k)) + '</td><td style="padding:6px 0;white-space:pre-wrap">' + esc(f[k]) + '</td></tr>').join('');
  const fileRows = files.map((x) => '<li style="margin:4px 0"><b>' + esc(label(x.field)) + ':</b> <a href="' + esc(x.url) + '">' + esc(x.name) + '</a> <span style="color:#888">(' + kb(x.size) + ')</span></li>').join('');
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">' +
    '<h2 style="margin:0 0 4px">New application: ' + esc(position) + '</h2>' +
    '<p style="margin:0 0 18px;color:#666">Reference ' + ref + (b.page_url ? ' &middot; <a href="' + esc(clip(b.page_url, 400)) + '">job page</a>' : '') + '</p>' +
    '<table style="border-collapse:collapse">' + rows + '</table>' +
    '<h3 style="margin:22px 0 6px">Documents</h3><ul style="padding-left:18px;margin:0">' + fileRows + '</ul></div>';
  const text = 'New application: ' + position + '\nReference ' + ref + '\n\n' + Object.keys(f).map((k) => label(k) + ': ' + f[k]).join('\n') + '\n\nDocuments:\n' + files.map((x) => label(x.field) + ': ' + x.name + ' ' + x.url).join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, reply_to: f.email, subject: 'Application: ' + position + ' — ' + f.full_name, html, text })
    });
    if (!r.ok) { console.error('[careers] Resend error', r.status, await r.text().catch(() => '')); return send(res, 502, { ok: false, message: 'We could not send your application right now. Please try again in a moment.' }); }
    return send(res, 200, { ok: true, reference: ref });
  } catch (e) {
    console.error('[careers] send failed', String((e && e.message) || e));
    return send(res, 503, { ok: false, message: 'We could not send your application right now. Please try again in a moment.' });
  }
};
