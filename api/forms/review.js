'use strict';
// GET /api/forms/review — internal review of submissions that need attention.
//   Authorization: Bearer <REVIEW_TOKEN>   (falls back to CRON_SECRET if REVIEW_TOKEN is not set)
//   ?set=warned|queue|dead  (default: all three)   ?limit=50   ?format=html
//   POST ?resolve=<request_id> marks a warned record as reviewed.
const mint = require('../../lib/mint');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function row(r) {
  const p = r.payload || {};
  return {
    request_id: r.request_id,
    state: r.state,
    form: p.form,
    mint_name: r.mint && r.mint.name,
    mint_status: r.mint && r.mint.status,
    warnings: (r.mint && r.mint.warnings) || [],
    country_sent: p.country || null,
    company: p.company,
    email: p.email,
    created_at: r.created_at,
    attempts: r.attempts,
    last_error: r.last_error || null,
    next_attempt_at: r.next_attempt_at ? new Date(r.next_attempt_at).toISOString() : null,
  };
}

module.exports = async function handler(req, res) {
  const token = mint.env('REVIEW_TOKEN') || mint.env('CRON_SECRET');
  const url = new URL(req.url, 'http://x');
  const auth = String(req.headers.authorization || '');
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('token');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (!token || given !== token) { res.statusCode = 401; res.setHeader('Content-Type', 'application/json'); return res.end('{"ok":false}'); }
  const store = mint.createStore();
  if (!store) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); return res.end('{"ok":false,"message":"Store not configured"}'); }

  if (req.method === 'POST' && url.searchParams.get('resolve')) {
    await store.resolve(url.searchParams.get('resolve'));
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); return res.end('{"ok":true}');
  }

  const limit = Math.min(200, Number(url.searchParams.get('limit')) || 50);
  const sets = url.searchParams.get('set') ? [url.searchParams.get('set')] : ['warned', 'queue', 'dead'];
  const out = { ok: true, counts: await store.counts() };
  for (const s of sets) if (['warned', 'queue', 'dead'].includes(s)) out[s] = (await store.recent(s, limit)).map(row);

  if (url.searchParams.get('format') === 'html') {
    const table = (title, rows) => '<h2>' + esc(title) + ' (' + rows.length + ')</h2>' + (rows.length
      ? '<table><tr><th>Received</th><th>Form</th><th>Company</th><th>Mint</th><th>Country sent</th><th>Warnings / last error</th><th>Attempts</th><th>request_id</th></tr>' +
        rows.map((r) => '<tr><td>' + esc(r.created_at) + '</td><td>' + esc(r.form) + '</td><td>' + esc(r.company) + '</td><td>' + esc([r.mint_name, r.mint_status].filter(Boolean).join(' · ')) +
          '</td><td>' + esc(r.country_sent || '—') + '</td><td>' + esc(r.warnings.length ? r.warnings.join(' | ') : r.last_error || '') + '</td><td>' + esc(r.attempts) + '</td><td><code>' + esc(r.request_id) + '</code></td></tr>').join('') + '</table>'
      : '<p>Nothing here.</p>');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><meta charset="utf-8"><title>Mint intake review</title><style>body{font:14px/1.5 system-ui;margin:32px;color:#111}table{border-collapse:collapse;width:100%;margin-bottom:28px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f5f5f5}code{font-size:12px}</style>' +
      '<h1>Mint intake review</h1><p>Queued: ' + out.counts.queued + ' · Dead-letter: ' + out.counts.dead + ' · Accepted with warnings: ' + out.counts.warned + '</p>' +
      (out.warned ? table('Accepted with warnings (lead may be missing data, e.g. country)', out.warned) : '') +
      (out.queue ? table('Waiting to be re-sent to Mint', out.queue) : '') +
      (out.dead ? table('Dead-letter (not delivered after 14 days)', out.dead) : ''));
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(out));
};
