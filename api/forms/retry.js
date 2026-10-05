'use strict';
// GET /api/forms/retry — re-sends queued submissions to Mint. Called by Vercel Cron (vercel.json).
const mint = require('../../lib/mint');

module.exports = async function handler(req, res) {
  const secret = mint.env('CRON_SECRET');
  const auth = String(req.headers.authorization || '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (!secret || auth !== 'Bearer ' + secret) { res.statusCode = 401; return res.end(JSON.stringify({ ok: false })); }

  const store = mint.createStore();
  if (!store) { res.statusCode = 500; return res.end(JSON.stringify({ ok: false, message: 'Store not configured' })); }

  if (!(await store.lock(240))) { res.statusCode = 200; return res.end(JSON.stringify({ ok: true, skipped: 'locked' })); }
  try {
    let total = { picked: 0, delivered: 0, requeued: 0, invalid: 0, dead: 0 };
    for (let round = 0; round < 8; round++) {
      const s = await mint.processQueue(store, { limit: 25, budgetMs: 6000 });
      Object.keys(total).forEach((k) => { total[k] += s[k]; });
      if (s.picked < 25 || s.requeued === s.picked) break;
    }
    const counts = await store.counts();
    mint.log('log', 'Retry run', Object.assign({}, total, counts));
    res.statusCode = 200;
    res.end(JSON.stringify(Object.assign({ ok: true }, total, counts)));
  } finally {
    await store.unlock();
  }
};
