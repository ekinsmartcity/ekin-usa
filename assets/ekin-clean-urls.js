/* Live site only: show clean URLs (no .html) in links and the address bar; keeps the /us or /eu prefix */
(function(){var h=location.hostname;if(!h||/claudeusercontent|localhost|127\.0\.0\.1/.test(h)||location.protocol==='file:')return;
var B=(/^\/(us|eu)(?=\/|$)/.exec(location.pathname)||[''])[0];
function c(u){if(/^(\.\/|\/)?ekin-home\.html(?=$|[?#])/.test(u))return (B||'/')+u.replace(/^(\.\/|\/)?ekin-home\.html/,'');return u.replace(/\.html(?=$|[?#])/,'')}
var p=location.pathname.slice(B.length)||'/';if(/^\/ekin-home(\.html)?\/?$/.test(p))history.replaceState(null,'',(B||'/')+location.search+location.hash);else if(/\.html$/.test(p))history.replaceState(null,'',B+c(p)+location.search+location.hash);
function fix(){[].forEach.call(document.querySelectorAll('a[href]'),function(a){var x=a.getAttribute('href');if(!x||/^(https?:|mailto:|tel:|#|\/\/)/i.test(x)||!/\.html(?=$|[?#])/.test(x))return;a.setAttribute('href',c(x))})}
fix();document.addEventListener('DOMContentLoaded',fix);})();
