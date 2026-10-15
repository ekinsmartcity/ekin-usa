'use strict';
// POST /api/careers/upload — issues short-lived client-upload tokens for Vercel Blob (CVs, portfolios, documents).
const { handleUpload } = require('@vercel/blob/client');

const MAX_BYTES = 20 * 1024 * 1024;
const TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png', 'image/jpeg', 'text/plain', 'application/zip', 'application/octet-stream'
];

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
    req.on('data', (c) => { d += c; if (d.length > 32 * 1024) { d = ''; req.destroy(); } });
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Method not allowed' }); }
  if (!originAllowed(req)) return send(res, 403, { error: 'Origin not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error('[careers] BLOB_READ_WRITE_TOKEN not set'); return send(res, 503, { error: 'Uploads are not available right now.' }); }
  const body = await readBody(req);
  if (!body) return send(res, 400, { error: 'Invalid request body' });
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^careers\/[A-Za-z0-9-]{8,64}\/[^/]{1,200}$/.test(pathname)) throw new Error('Invalid upload path');
        return { allowedContentTypes: TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {}
    });
    return send(res, 200, json);
  } catch (e) {
    return send(res, 400, { error: String((e && e.message) || e) });
  }
};
