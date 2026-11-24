// Ekin — one Vercel project, two sites, routed by visitor country.
//   /us/...  → US site (files at the project root)
//   /eu/...  → EU site (files in /eu)
//   no prefix: US → redirect to /us, Europe → redirect to /eu,
//              Canada + Latin America → US site, everyone else → EU site (URL stays ekin.com/...).
// Visitors can always open /us or /eu directly; that choice is never overridden.
export const config = { matcher: '/((?!api/|_vercel|manual/|manuals/|robots\\.txt|sitemap\\.xml|\\.well-known/).*)' };

const EUROPE = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH'.split(' '));
const AMERICAS_US = new Set('CA MX GT BZ SV HN NI CR PA CU DO HT PR JM BS BB TT AG DM GD KN LC VC AR BO BR CL CO EC GY PY PE SR UY VE'.split(' '));

function rewrite(url, path) {
  const u = new URL(path + url.search, url);
  return new Response(null, { headers: { 'x-middleware-rewrite': u.toString() } });
}
function redirect(url, path) {
  return new Response(null, { status: 307, headers: { Location: new URL(path + url.search, url).toString(), 'Cache-Control': 'private, no-store', Vary: 'x-vercel-ip-country' } });
}
const home = (p) => (p === '/' || p === '' ? '/ekin-home' : p);

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const m = path.match(/^\/(us|eu)(\/.*)?$/);
  if (m) {
    const rest = home(m[2] || '/');
    return rewrite(url, m[1] === 'us' ? rest : '/eu' + rest);
  }
  const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  if (country === 'US') return redirect(url, '/us' + (path === '/' ? '' : path));
  if (EUROPE.has(country)) return redirect(url, '/eu' + (path === '/' ? '' : path));
  if (AMERICAS_US.has(country)) return rewrite(url, home(path));
  return rewrite(url, '/eu' + home(path));
}
