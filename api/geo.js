'use strict';
// GET /api/geo — visitor country/region from Vercel's edge geolocation headers (no IP stored or returned).
module.exports = (req, res) => {
  const h = req.headers || {};
  const country = String(h['x-vercel-ip-country'] || '').toUpperCase().slice(0, 2);
  const region = String(h['x-vercel-ip-country-region'] || '').toUpperCase().slice(0, 3);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).end(JSON.stringify({ country, region }));
};
