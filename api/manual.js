'use strict';
// GET /manual/:product/:country/:lang  (rewritten here by vercel.json)
// Finds the newest PDF in the ekin-manuals Blob store and 307-redirects to it, so the
// final address shows the file's own (versioned) name, e.g. /manuals/bike-patrol/us/en/v1.0.261126.pdf
// Looks in manuals/<product>/<country>/<lang>/ first; for English it also accepts files placed
// directly in manuals/<product>/<country>/. Falls back to /manuals/<product>/<country>/<lang>.pdf
// (files bundled with the site, e.g. Patrol G2 Malaysia).
let list = null;
try { ({ list } = require('@vercel/blob')); } catch (_) {}

const OK = /^[a-z0-9][a-z0-9-]{0,40}$/;

async function newest(prefix, token, flatOnly) {
  const { blobs } = await list({ prefix, token, limit: 1000 });
  const pdfs = blobs.filter((b) => /\.pdf$/i.test(b.pathname) && (!flatOnly || !b.pathname.slice(prefix.length).includes('/')));
  pdfs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  return pdfs[0] || null;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const p = String(q.product || '').toLowerCase(), c = String(q.country || '').toLowerCase(), l = String(q.lang || '').toLowerCase();
  const go = (loc, cache) => {
    res.statusCode = 307;
    res.setHeader('Location', loc);
    res.setHeader('Cache-Control', cache || 'public, max-age=0, s-maxage=60');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.end();
  };
  if (!OK.test(p) || !OK.test(c) || !OK.test(l)) { res.statusCode = 404; res.setHeader('X-Robots-Tag', 'noindex'); return res.end('Not found'); }
  const fallback = '/manuals/' + p + '/' + c + '/' + l + '.pdf';
  const token = process.env.MANUALS_READ_WRITE_TOKEN;
  if (!list || !token) return go(fallback);
  try {
    const base = 'manuals/' + p + '/' + c + '/';
    let hit = await newest(base + l + '/', token, false);
    if (!hit && l === 'en') hit = await newest(base, token, true);
    if (!hit) return go(fallback);
    return go('/' + hit.pathname.split('/').map(encodeURIComponent).join('/'));
  } catch (_) {
    return go(fallback, 'no-store');
  }
};
