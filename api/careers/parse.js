'use strict';
// POST /api/careers/parse — { text } extracted from a CV in the browser → structured fields for form pre-fill (Claude).
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
    req.on('data', (c) => { d += c; if (d.length > 200 * 1024) { d = ''; req.destroy(); } });
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

const PROMPT = `You extract data from a CV/resume to pre-fill a job application form.
Return ONLY a JSON object, no prose, no code fences, with exactly these keys (use "" or [] when unknown; never invent data):
{
 "first_name":"", "last_name":"", "full_name":"",
 "email":"", "phone":"", "location":"City, Country", "address":"",
 "linkedin":"full URL or empty", "website":"portfolio/personal site URL or empty",
 "date_of_birth":"YYYY-MM-DD or empty",
 "years_experience": 0,
 "summary":"2-4 sentence professional summary in first person, max 600 characters, based only on the CV",
 "experience_text":"most recent roles, one per line: Title, Company (Start-End)",
 "languages":"comma-separated languages with level if stated",
 "software":"comma-separated tools/software",
 "competencies":"comma-separated key skills",
 "education":[{"level":"bachelor|master|phd","university":"","department":"","start":"YYYY","end":"YYYY","gpa":""}]
}
CV text:
`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false }); }
  if (!originAllowed(req)) return send(res, 403, { ok: false });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.error('[careers/parse] ANTHROPIC_API_KEY not set'); return send(res, 503, { ok: false, message: 'Auto-fill is not available right now.' }); }
  const b = await readBody(req);
  const text = String((b && b.text) || '').replace(/\s+\n/g, '\n').slice(0, 24000).trim();
  if (text.length < 40) return send(res, 400, { ok: false, message: 'We could not read text from this file.' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: (process.env.CV_PARSE_MODEL || '').trim() || 'claude-sonnet-4-5', max_tokens: 1500, messages: [{ role: 'user', content: PROMPT + text }] })
    });
    if (!r.ok) { console.error('[careers/parse] API error', r.status, await r.text().catch(() => '')); return send(res, 502, { ok: false, status: r.status, message: 'Auto-fill failed. Please fill the form manually.' }); }
    const j = await r.json();
    const out = ((j.content || []).find((c) => c.type === 'text') || {}).text || '';
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return send(res, 502, { ok: false, status: r.status, message: 'Auto-fill failed. Please fill the form manually.' });
    const data = JSON.parse(m[0]);
    return send(res, 200, { ok: true, data });
  } catch (e) {
    console.error('[careers/parse] failed', String((e && e.message) || e));
    return send(res, 502, { ok: false, status: r.status, message: 'Auto-fill failed. Please fill the form manually.' });
  }
};
