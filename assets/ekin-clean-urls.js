/* Live site only: show clean URLs (no .html) in links and the address bar */
(function(){var h=location.hostname;if(!h||/claudeusercontent|localhost|127\.0\.0\.1/.test(h)||location.protocol==='file:')return;
function c(u){if(/^(\.\/|\/)?ekin-home\.html(?=$|[?#])/.test(u))return '/'+u.replace(/^(\.\/|\/)?ekin-home\.html/,'');return u.replace(/\.html(?=$|[?#])/,'')}
var p=location.pathname;if(/^\/ekin-home(\.html)?\/?$/.test(p))history.replaceState(null,'','/'+location.hash);else if(/\.html$/.test(p))history.replaceState(null,'',c(p)+location.search+location.hash);
function fix(){[].forEach.call(document.querySelectorAll('a[href]'),function(a){var x=a.getAttribute('href');if(!x||/^(https?:|mailto:|tel:|#|\/\/)/i.test(x)||!/\.html(?=$|[?#])/.test(x))return;a.setAttribute('href',c(x))})}
fix();document.addEventListener('DOMContentLoaded',fix);})();
