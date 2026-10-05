'use strict';
/*
 * Ekin Mint web-intake integration (server side only).
 * Guide: docs/mint-guide.md  ·  Runbook: docs/mint-integration.md
 *
 * - The Mint API key is read from process.env.MINT_API_KEY and never leaves the server.
 * - Every submission is written to a durable store (Upstash Redis REST) BEFORE it is sent,
 *   keyed by request_id, so a Mint outage never loses a lead and retries never duplicate it.
 */

const MINT_URL_DEFAULT = 'https://mint.ekin.com/api/method/ekin_mint.api.web_intake.submit';
const countries = require('./countries');

// Forms this site sends to Mint. Career / internship / newsletter are deliberately NOT accepted.
const ALLOWED_FORMS = ['contact', 'demo', 'quote', 'partnership', 'support', 'ventures'];
// Mint's current rule set (guide §3). Keep in sync if Mint settings change.
const SALES_FORMS = ['contact', 'demo', 'quote', 'partnership', 'support'];
const MESSAGE_REQUIRED = ['contact', 'other'];

const TEXT_FIELDS = ['full_name', 'first_name', 'last_name', 'email', 'phone', 'company', 'job_title',
  'country', 'city', 'website', 'subject', 'language', 'page_url', 'utm_source', 'utm_medium',
  'utm_campaign', 'submitted_at', 'source_site'];

const KEY = {
  rec: (id) => 'mint:req:' + id,
  queue: 'mint:queue',
  dead: 'mint:dead',
  warned: 'mint:warned',
  lock: 'mint:retry-lock',
  rate: (ip) => 'mint:rl:' + ip,
};

const DELIVERED_TTL_S = 60 * 60 * 24 * 30; // keep delivered records 30 days
const GIVE_UP_AFTER_MS = 1000 * 60 * 60 * 24 * 14; // 14 days of failed retries → dead-letter
const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

function env(name, fallback) {
  const v = (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  return v || fallback || '';
}

/* ------------------------------------------------------------------ normalize + validate */

function clip(v, n) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/\s+/g, ' ').trim().slice(0, n);
}

function normalize(input, ctx) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  out.request_id = clip(src.request_id, 64);
  out.form = clip(src.form, 40).toLowerCase();
  for (const f of TEXT_FIELDS) {
    const v = clip(src[f], 140);
    if (v) out[f] = v;
  }
  if (src.page_url) out.page_url = clip(src.page_url, 500);
  const msg = src.message === undefined || src.message === null ? '' : String(src.message).trim().slice(0, 10000);
  if (msg) out.message = msg;
  let products = src.products;
  if (Array.isArray(products)) products = products.map((p) => clip(p, 80)).filter(Boolean);
  else if (products) products = clip(products, 1000);
  if (products && (Array.isArray(products) ? products.length : true)) {
    if (Array.isArray(products) && products.join(', ').length > 1000) products = products.join(', ').slice(0, 1000);
    out.products = products;
  }
  if (src.consent !== undefined) out.consent = src.consent === true || src.consent === 'true' || src.consent === 'on';
  if (!out.full_name && (out.first_name || out.last_name)) out.full_name = clip([out.first_name, out.last_name].filter(Boolean).join(' '), 140);
  if (out.email) out.email = out.email.toLowerCase();
  if (out.country) {
    const iso = countries.toIso2(out.country);
    if (iso) out.country = iso;
    else { out._country_raw = out.country; delete out.country; }
  }
  if (!out.language) out.language = 'en';
  if (!out.submitted_at || isNaN(Date.parse(out.submitted_at))) out.submitted_at = new Date().toISOString();
  out.source_site = clip((ctx && ctx.sourceSite) || out.source_site || 'www.ekin.com', 140);
  return out;
}

// User-facing messages keyed by Mint field name.
const MESSAGES = {
  required: {
    full_name: 'Please enter your name.', first_name: 'Please enter your first name.', last_name: 'Please enter your last name.',
    email: 'Please enter your e-mail address.', phone: 'Please enter a phone number.', company: 'Please enter your company or organization.',
    job_title: 'Please enter your job title.', country: 'Please select your country.', message: 'Please enter a message.',
  },
  invalid: {
    email: 'Please enter a valid e-mail address.', phone: 'Please check the phone number.', country: 'Please select a country from the list.',
    full_name: 'Please check your name.', message: 'Your message is too long or contains invalid characters.',
  },
};
function messageFor(field, kind) {
  return (MESSAGES[kind] && MESSAGES[kind][field]) || MESSAGES.required[field] || 'Please check this field.';
}

// Returns {} when valid, otherwise { field: message } using Mint's own field names.
function validate(p) {
  const e = {};
  if (!REQUEST_ID_RE.test(p.request_id || '')) e.request_id = 'request_id is missing or invalid';
  if (!ALLOWED_FORMS.includes(p.form)) e.form = 'This form is not sent to Mint';
  if (!p.full_name) e.full_name = messageFor('full_name', 'required');
  if (!p.email && !p.phone) e.email = messageFor('email', 'required');
  if (p.email && !EMAIL_RE.test(p.email)) e.email = messageFor('email', 'invalid');
  if (SALES_FORMS.includes(p.form)) {
    if (!p.company) e.company = messageFor('company', 'required');
    if (!p.job_title) e.job_title = messageFor('job_title', 'required');
    if (!p.country) e.country = p._country_raw ? messageFor('country', 'invalid') : messageFor('country', 'required');
  } else if (p._country_raw) {
    e.country = messageFor('country', 'invalid');
  }
  if (MESSAGE_REQUIRED.includes(p.form) && !p.message) e.message = messageFor('message', 'required');
  return e;
}

/* ------------------------------------------------------------------ Mint client */

const MINT_FIELDS = ['request_id', 'form', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'country', 'message', 'city', 'website', 'subject', 'products', 'language', 'page_url', 'consent', 'submitted_at', 'source_site', 'instance'];
const FIELD_TOKEN_RE = new RegExp('\\b(' + MINT_FIELDS.join('|') + ')\\b');

// Mint 400 → { text, fields: [...], issues: { field: { kind, detail, message } } }.
// Mint lists every problem in one message, e.g.
// "Missing or invalid fields: company is required for the 'contact' form; job_title is required for the 'contact' form."
function parseMintError(body) {
  let text = '';
  if (body && typeof body === 'object') {
    text = body.exception || '';
    if (!text && body._server_messages) {
      try { text = JSON.parse(body._server_messages).map((m) => { try { return JSON.parse(m).message; } catch (_) { return m; } }).join('; '); } catch (_) { text = String(body._server_messages); }
    }
    if (!text && typeof body.message === 'string') text = body.message;
  } else if (body) text = String(body);
  text = String(text || '').replace(/^[\w.]*(WebIntakeError|ValidationError):\s*/, '').trim();
  const list = text.replace(/^[^:]*fields?\s*:\s*/i, '');
  const issues = {};
  list.split(/\s*;\s*/).map((s) => s.replace(/\.$/, '').trim()).filter(Boolean).forEach((clause) => {
    const m = clause.match(FIELD_TOKEN_RE);
    if (!m) return;
    const field = m[1];
    const kind = /\b(required|missing)\b/i.test(clause) ? 'required' : 'invalid';
    if (!issues[field]) issues[field] = { kind, detail: clause, message: messageFor(field, kind) };
  });
  return { text: text.slice(0, 1000), fields: Object.keys(issues), issues };
}

async function sendToMint(payload, opts) {
  const o = opts || {};
  const apiKey = o.apiKey || env('MINT_API_KEY');
  const url = o.url || env('MINT_API_URL', MINT_URL_DEFAULT);
  const doFetch = o.fetch || fetch;
  if (!apiKey) return { kind: 'retry', http: 0, error: 'MINT_API_KEY is not configured' };
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), o.timeoutMs || 8000) : null;
  let res;
  try {
    res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Ekin-Api-Key': apiKey },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined,
    });
  } catch (err) {
    return { kind: 'retry', http: 0, error: 'network: ' + (err && err.name === 'AbortError' ? 'timeout' : (err && err.message) || err) };
  } finally {
    if (timer) clearTimeout(timer);
  }
  let body = null;
  try { body = await res.json(); } catch (_) { body = null; }
  if (res.status === 200 && body && body.message && body.message.ok) {
    const m = body.message;
    return { kind: 'ok', http: 200, name: m.name, status: m.status, duplicate: !!m.duplicate, warnings: m.warnings || [] };
  }
  if (res.status === 400) {
    const pe = parseMintError(body);
    return { kind: 'invalid', http: 400, error: pe.text, fields: pe.fields, issues: pe.issues };
  }
  const retryAfter = Number(res.headers && res.headers.get && res.headers.get('Retry-After')) || 0;
  // 401/403 = key or intake switched off (config issue) — keep the submission and retry later.
  return { kind: 'retry', http: res.status, error: 'http ' + res.status + (body && body.exc_type ? ' ' + body.exc_type : ''), retryAfter };
}

/* ------------------------------------------------------------------ durable store (Upstash Redis REST) */

function storeConfig() {
  const url = env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL');
  const token = env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN');
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function createStore(opts) {
  const cfg = (opts && opts.config) || storeConfig();
  const doFetch = (opts && opts.fetch) || fetch;
  if (!cfg) return null;
  async function pipeline(cmds) {
    const r = await doFetch(cfg.url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    if (!r.ok) throw new Error('store http ' + r.status);
    const out = await r.json();
    return out.map((x) => { if (x.error) throw new Error('store: ' + x.error); return x.result; });
  }
  const one = async (cmd) => (await pipeline([cmd]))[0];
  return {
    async get(id) { const v = await one(['GET', KEY.rec(id)]); return v ? JSON.parse(v) : null; },
    async createIfAbsent(rec) { return (await one(['SET', KEY.rec(rec.request_id), JSON.stringify(rec), 'NX'])) === 'OK'; },
    async save(rec) {
      const cmds = [];
      const k = KEY.rec(rec.request_id);
      if (rec.state === 'delivered' || rec.state === 'invalid') {
        cmds.push(['SET', k, JSON.stringify(rec), 'EX', String(DELIVERED_TTL_S)], ['ZREM', KEY.queue, rec.request_id]);
        if (rec.review) cmds.push(['ZADD', KEY.warned, String(Date.now()), rec.request_id]);
      } else if (rec.state === 'dead') {
        cmds.push(['SET', k, JSON.stringify(rec)], ['ZREM', KEY.queue, rec.request_id], ['ZADD', KEY.dead, String(Date.now()), rec.request_id]);
      } else {
        cmds.push(['SET', k, JSON.stringify(rec)], ['ZADD', KEY.queue, String(rec.next_attempt_at || Date.now()), rec.request_id]);
      }
      await pipeline(cmds);
    },
    async dequeue(id) { await one(['ZREM', KEY.queue, id]); },
    async due(limit) { return one(['ZRANGEBYSCORE', KEY.queue, '-inf', String(Date.now()), 'LIMIT', '0', String(limit || 25)]); },
    async counts() { const [q, d, w] = await pipeline([['ZCARD', KEY.queue], ['ZCARD', KEY.dead], ['ZCARD', KEY.warned]]); return { queued: q, dead: d, warned: w }; },
    async recent(set, limit) {
      const key = { queue: KEY.queue, dead: KEY.dead, warned: KEY.warned }[set];
      const ids = await one(['ZREVRANGE', key, '0', String((limit || 50) - 1)]);
      if (!ids || !ids.length) return [];
      const vals = await pipeline(ids.map((id) => ['GET', KEY.rec(id)]));
      return ids.map((id, i) => (vals[i] ? JSON.parse(vals[i]) : { request_id: id, state: 'expired' }));
    },
    async resolve(id) { await one(['ZREM', KEY.warned, id]); },
    async lock(ttlS) { return (await one(['SET', KEY.lock, String(Date.now()), 'NX', 'EX', String(ttlS || 240)])) === 'OK'; },
    async unlock() { await one(['DEL', KEY.lock]); },
    async hit(ip, limit, windowS) {
      const [n] = await pipeline([['INCR', KEY.rate(ip)], ['EXPIRE', KEY.rate(ip), String(windowS), 'NX']]);
      return n <= limit;
    },
  };
}

/* ------------------------------------------------------------------ delivery */

function backoffMs(attempts, retryAfterS) {
  const base = Math.min(60000 * Math.pow(2, Math.max(0, attempts - 1)), 6 * 3600000);
  const jitter = Math.floor(Math.random() * 15000);
  return Math.max(base + jitter, (retryAfterS || 0) * 1000);
}

function log(level, msg, extra) {
  const line = '[mint] ' + msg + (extra ? ' ' + JSON.stringify(extra) : '');
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

// Sends one stored record and updates its state. Returns the Mint result.
async function deliver(rec, store, opts) {
  rec.attempts = (rec.attempts || 0) + 1;
  rec.last_attempt_at = new Date().toISOString();
  const r = await sendToMint(Object.assign({}, rec.payload, { _country_raw: undefined }), opts);
  if (r.kind === 'ok') {
    rec.state = 'delivered';
    rec.mint = { name: r.name, status: r.status, duplicate: r.duplicate, warnings: r.warnings };
    rec.last_error = null;
    if (r.warnings && r.warnings.length) {
      rec.review = { reason: 'warnings', at: new Date().toISOString() };
      log('warn', 'Mint accepted with warnings — see /api/forms/review', { id: rec.request_id, name: r.name, warnings: r.warnings });
    }
    if (r.status === 'Auto Rejected') log('log', 'Mint auto-rejected (non-sales)', { id: rec.request_id, form: rec.payload.form, name: r.name });
  } else if (r.kind === 'invalid') {
    rec.state = 'invalid';
    rec.last_error = r.error;
    rec.issues = r.issues;
    log('warn', 'Mint rejected payload (400)', { id: rec.request_id, form: rec.payload.form, error: r.error });
  } else {
    const age = Date.now() - Date.parse(rec.created_at);
    rec.last_error = r.error;
    if (age > GIVE_UP_AFTER_MS) {
      rec.state = 'dead';
      log('error', 'Giving up after 14 days — kept in dead-letter set', { id: rec.request_id, attempts: rec.attempts, error: r.error });
    } else {
      rec.state = 'queued';
      rec.next_attempt_at = Date.now() + backoffMs(rec.attempts, r.retryAfter);
      log(r.http === 401 || r.http === 403 ? 'error' : 'warn', 'Mint unavailable, queued for retry', { id: rec.request_id, attempts: rec.attempts, error: r.error });
    }
  }
  if (store) await store.save(rec);
  return r;
}

async function processQueue(store, opts) {
  const o = opts || {};
  const deadline = Date.now() + (o.budgetMs || 20000);
  const ids = await store.due(o.limit || 25);
  const summary = { picked: ids.length, delivered: 0, requeued: 0, invalid: 0, dead: 0 };
  for (const id of ids) {
    if (Date.now() > deadline) break;
    const rec = await store.get(id);
    if (!rec || rec.state === 'delivered' || rec.state === 'invalid') { await store.dequeue(id); continue; }
    await deliver(rec, store, o);
    if (rec.state === 'delivered') summary.delivered++;
    else if (rec.state === 'invalid') summary.invalid++;
    else if (rec.state === 'dead') summary.dead++;
    else summary.requeued++;
  }
  return summary;
}

module.exports = {
  MINT_URL_DEFAULT, ALLOWED_FORMS, SALES_FORMS, messageFor,
  normalize, validate, parseMintError, sendToMint, createStore, storeConfig, deliver, processQueue, backoffMs, log, env,
};
