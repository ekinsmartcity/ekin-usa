'use strict';
// POST /api/forms/submit — the only way the site's lead forms reach Ekin Mint.
const crypto = require('crypto');
const mint = require('../../lib/mint');

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || String(req.headers['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function originAllowed(req) {
  const allow = mint.env('ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allow.length) return true;
  const o = String(req.headers.origin || '');
  return !o || allow.includes(o);
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return null; } }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 64 * 1024) { data = ''; req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (_) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, message: 'Method not allowed' }); }
  if (!originAllowed(req)) return send(res, 403, { ok: false, message: 'Origin not allowed' });

  const raw = await readBody(req);
  if (!raw) return send(res, 400, { ok: false, message: 'Invalid request body' });

  // Honeypot: bots fill the hidden field. Pretend success, store nothing.
  if (raw._hp) return send(res, 200, { ok: true, queued: false });

  if (!raw.request_id) raw.request_id = crypto.randomUUID();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0];
  const payload = mint.normalize(raw, { sourceSite: mint.env('SOURCE_SITE') || host || 'www.ekin.com' });
  const errors = mint.validate(payload);
  if (Object.keys(errors).length) return send(res, 400, { ok: false, errors, message: 'Please check the highlighted fields.' });

  let store = null;
  try { store = mint.createStore(); } catch (e) { mint.log('error', 'Store init failed', { error: String(e) }); }
  if (!store) mint.log('error', 'KV_REST_API_URL / KV_REST_API_TOKEN not set — submissions cannot be queued for retry');

  try {
    if (store) {
      const ip = clientIp(req);
      if (!(await store.hit(ip, 10, 600))) return send(res, 429, { ok: false, message: 'Too many submissions. Please try again in a few minutes.' });
    }

    // 1) Persist first (idempotent on request_id).
    let rec = null;
    if (store) {
      const fresh = { request_id: payload.request_id, payload, state: 'queued', attempts: 0, created_at: new Date().toISOString(), next_attempt_at: Date.now() };
      const created = await store.createIfAbsent(fresh);
      if (created) rec = fresh;
      else {
        rec = await store.get(payload.request_id);
        if (rec && rec.state === 'delivered') return send(res, 200, { ok: true, queued: false, reference: rec.mint && rec.mint.name, mint_status: rec.mint && rec.mint.status });
        if (rec && (rec.state === 'queued' || rec.state === 'dead')) return send(res, 202, { ok: true, queued: true });
        // Previously rejected as invalid → the visitor corrected the form; replace with the new payload.
        rec = { request_id: payload.request_id, payload, state: 'queued', attempts: 0, created_at: new Date().toISOString(), next_attempt_at: Date.now() };
        await store.save(rec);
      }
    } else {
      rec = { request_id: payload.request_id, payload, state: 'queued', attempts: 0, created_at: new Date().toISOString() };
    }

    // 2) Try to deliver now.
    const r = await mint.deliver(rec, store);

    // 3) Opportunistically drain a few older queued items (keeps recovery fast even on a daily cron).
    if (store && r.kind === 'ok') {
      try { if (await store.lock(30)) { await mint.processQueue(store, { limit: 3, budgetMs: 3000 }); await store.unlock(); } } catch (_) {}
    }

    if (r.kind === 'ok') return send(res, 200, { ok: true, queued: false, reference: r.name, mint_status: r.status });
    if (r.kind === 'invalid') {
      const errs = {};
      Object.keys(r.issues || {}).forEach((f) => { errs[f] = r.issues[f].message; });
      const message = Object.keys(errs).length
        ? 'Please check the highlighted fields.'
        : 'We could not accept this request. Please review the form and try again.';
      return send(res, 400, { ok: false, errors: errs, message });
    }
    if (store) return send(res, 202, { ok: true, queued: true });
    // No durable store and Mint is down: tell the browser to retry with the SAME request_id.
    return send(res, 503, { ok: false, retryable: true, message: 'We could not send your request right now. Please try again in a moment.' });
  } catch (e) {
    mint.log('error', 'Submit failed', { id: payload.request_id, error: String(e && e.message || e) });
    return send(res, 503, { ok: false, retryable: true, message: 'We could not send your request right now. Please try again in a moment.' });
  }
};
