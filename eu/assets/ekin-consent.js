/* TRAFFIC LAUNCH SWITCH: hide Traffic nav/footer links on the published site only (design preview keeps them). Remove this line to publish Traffic. */
(function(){var h=location.hostname;if(h&&!/claudeusercontent|localhost|127\.0\.0\.1/.test(h)&&location.protocol!=='file:')document.documentElement.classList.add('traffic-off')})();
/* Ekin cookie consent — region-aware, Google Consent Mode v2.
   Load synchronously in <head> BEFORE the Google tag.
   data-mode="geo" (default): opt-in banner only in OPTIN regions; elsewhere opt-out via footer link.
   data-mode="all": opt-in banner for every visitor (EU site). */
(function(){
var me=document.currentScript,MODE=(me&&me.getAttribute('data-mode'))||'geo',KEY='ekin_consent_v1',GEOKEY='ekin_geo_v1',GA=(me&&me.getAttribute('data-ga'))||'G-8864G409HQ',gaOn=false;
/* Google Analytics is only downloaded once analytics is allowed for this visitor (never before consent in opt-in regions). */
function loadGA(){if(gaOn)return;gaOn=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+GA;(document.head||document.documentElement).appendChild(s)}
var EEA=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO'];
var OPTIN=EEA.concat(['GB','CH','TR','BR']),OPTIN_SUB=['CA-QC'];
window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};
var DEN={ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'};
var gpc=navigator.globalPrivacyControl===true;
if(MODE==='all')gtag('consent','default',Object.assign({wait_for_update:500},DEN));
else{
  gtag('consent','default',Object.assign({region:OPTIN.concat(OPTIN_SUB),wait_for_update:500},DEN));
  gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:gpc?'denied':'granted'});
}
gtag('set','ads_data_redaction',true);
function read(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}}
function apply(a){gtag('consent','update',{analytics_storage:a?'granted':'denied'});if(a)loadGA()}
function clearGA(){document.cookie.split(';').forEach(function(c){var n=c.split('=')[0].trim();if(/^_ga|^_gid|^_gat/.test(n)){var d=location.hostname.split('.');for(var i=0;i<d.length-1;i++){document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.'+d.slice(i).join('.')}document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'}})}
function save(a){try{localStorage.setItem(KEY,JSON.stringify({a:!!a,t:Date.now()}))}catch(e){}apply(a);if(!a)clearGA()}
var st=read();if(st)apply(st.a);

function tzGuess(){try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone||'';if(z==='Europe/Istanbul')return'TR';if(/^Europe\/|^Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe)/.test(z))return'EU';if(/^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Manaus|Belem)/.test(z))return'BR'}catch(e){}return''}
function isOptin(g){if(!g||!g.country)return null;return OPTIN.indexOf(g.country)>-1||OPTIN_SUB.indexOf(g.country+'-'+g.region)>-1}
function geo(cb){try{var c=JSON.parse(sessionStorage.getItem(GEOKEY));if(c)return cb(c)}catch(e){}
  var done=false,fin=function(g){if(done)return;done=true;try{sessionStorage.setItem(GEOKEY,JSON.stringify(g))}catch(e){}cb(g)};
  var t=setTimeout(function(){fin({country:'',region:'',tz:tzGuess()})},2500);
  fetch('/api/geo',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(g){clearTimeout(t);fin(g&&g.country?g:{country:'',region:'',tz:tzGuess()})}).catch(function(){clearTimeout(t);fin({country:'',region:'',tz:tzGuess()})})}

var CSS='.ekc{position:fixed;z-index:2147483000;left:clamp(12px,2vw,24px);bottom:clamp(12px,2vw,24px);width:min(440px,calc(100vw - 24px));background:#0b0b0b;color:#f5f7fa;border:1px solid rgba(255,255,255,.14);border-radius:8px;box-shadow:0 24px 60px -20px rgba(0,0,0,.8);padding:20px;font:400 14.5px/1.55 var(--body,"Lunchtype22","Space Grotesk",system-ui,sans-serif);opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .45s cubic-bezier(.2,.8,.2,1)}'+
'.ekc.in{opacity:1;transform:none}.ekc h2{margin:0 0 6px;font:600 16px/1.3 var(--display,"Space Grotesk",system-ui,sans-serif);letter-spacing:-.01em;color:#fff}.ekc p{margin:0;color:rgba(255,255,255,.72)}.ekc p a{color:#fff;text-decoration:underline;text-underline-offset:2px}'+
'.ekc-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.ekc button{appearance:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:500;line-height:1;white-space:nowrap;border-radius:999px;padding:11px 16px;border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff;transition:background .2s,border-color .2s,color .2s}.ekc button:hover{border-color:#fff}'+
'.ekc .ekc-pri{background:#FF3932;border-color:#FF3932;color:#fff}.ekc .ekc-pri:hover{background:#e22a24;border-color:#e22a24}.ekc .ekc-link{border:0;padding:11px 4px;color:rgba(255,255,255,.72);text-decoration:underline;text-underline-offset:3px}.ekc .ekc-link:hover{color:#fff}'+
'.ekc-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 16px;align-items:center;padding:14px 0;border-top:1px solid rgba(255,255,255,.1)}.ekc-row:first-of-type{margin-top:12px}.ekc-row b{font-weight:600;color:#fff}.ekc-row small{grid-column:1;color:rgba(255,255,255,.6);font-size:13px;line-height:1.45}.ekc-row em{white-space:nowrap;font-style:normal;font:500 10.5px/1 var(--mono,"Roboto Mono",monospace);letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);grid-row:1/span 2;grid-column:2}'+
'.ekc-sw{grid-row:1/span 2;grid-column:2;position:relative;width:44px;height:26px}.ekc-sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}.ekc-sw i{position:absolute;inset:0;border-radius:999px;background:rgba(255,255,255,.18);transition:background .2s;pointer-events:none}.ekc-sw i::after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}.ekc-sw input:checked+i{background:#FF3932}.ekc-sw input:checked+i::after{transform:translateX(18px)}.ekc-sw input:focus-visible+i{outline:2px solid #fff;outline-offset:2px}'+
'.ekc-note{margin-top:10px!important;font-size:12.5px;color:rgba(255,255,255,.55)!important}'+
'@media (max-width:640px){.ekc{left:12px;right:12px;bottom:12px;width:auto;padding:18px}.ekc-btns button{flex:1 1 auto}}@media (prefers-reduced-motion:reduce){.ekc{transition:none}}';
var box=null;
function ensureCss(){if(document.getElementById('ekc-css'))return;var s=document.createElement('style');s.id='ekc-css';s.textContent=CSS;document.head.appendChild(s)}
function close(){if(!box)return;var b=box;box=null;b.classList.remove('in');setTimeout(function(){b.remove()},350)}
function open(kind){ensureCss();if(box)box.remove();var cur=read(),on=cur?cur.a:(kind==='prefs-us'?!gpc:false);
  box=document.createElement('div');box.className='ekc';box.setAttribute('role','dialog');box.setAttribute('aria-live','polite');box.setAttribute('aria-label','Cookie preferences');
  var pol='<a href="legal.html#cookies">Privacy Policy</a>';
  if(kind==='banner'){box.innerHTML='<h2>Cookies on ekin.com</h2><p>We use necessary cookies to run this site and, with your consent, analytics cookies to understand how it&rsquo;s used. See our '+pol+'.</p><div class="ekc-btns"><button type="button" class="ekc-pri" data-act="all">Accept all</button><button type="button" data-act="none">Reject all</button><button type="button" class="ekc-link" data-act="prefs">Settings</button></div>'}
  else{var us=kind==='prefs-us';box.innerHTML='<h2>'+(us?'Your Privacy Choices':'Cookie settings')+'</h2><p>'+(us?'We use analytics cookies to understand how this site is used. We don&rsquo;t sell your personal information or use advertising cookies. You can turn analytics off at any time.':'Choose which cookies we may use. You can change this at any time from the footer.')+'</p>'+
   '<div class="ekc-row"><b>Necessary</b><small>Required for the site to work, such as security and remembering this choice.</small><em>Always on</em></div>'+
   '<div class="ekc-row"><b>Analytics</b><small>Google Analytics: pages viewed and how visitors navigate the site.</small><label class="ekc-sw"><input type="checkbox" aria-label="Analytics cookies"'+(on?' checked':'')+' /><i></i></label></div>'+
   (us&&gpc?'<p class="ekc-note">Your browser sends a Global Privacy Control signal, so analytics is off by default.</p>':'')+
   '<div class="ekc-btns"><button type="button" class="ekc-pri" data-act="save">Save choices</button>'+(us?'':'<button type="button" data-act="all">Accept all</button><button type="button" data-act="none">Reject all</button>')+'</div>'}
  box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var a=b.getAttribute('data-act');
    if(a==='all'){save(true);close()}else if(a==='none'){save(false);close()}else if(a==='prefs'){open('prefs')}else if(a==='save'){save(box.querySelector('input').checked);close()}});
  document.body.appendChild(box);var b0=box;requestAnimationFrame(function(){requestAnimationFrame(function(){b0.classList.add('in')})});setTimeout(function(){b0.classList.add('in')},60);
  var f=box.querySelector('button');if(kind!=='banner'&&f)f.focus({preventScroll:true})}
function footer(optin){var label=optin?'Cookie Settings':'Your Privacy Choices';document.querySelectorAll('.foot-legal').forEach(function(el){if(el.querySelector('.ekc-foot'))return;var a=document.createElement('a');a.href='#';a.className='ekc-foot';a.textContent=label;a.addEventListener('click',function(e){e.preventDefault();open(optin?'prefs':'prefs-us')});el.appendChild(a)})}
function start(){
  if(MODE==='all'){footer(true);if(!st)open('banner');return}
  geo(function(g){var o=isOptin(g);if(o===null)o=!!g.tz;
    if(o){if(!st)apply(false);footer(true);if(!st)open('banner')}
    else{footer(false);if(!st){if(gpc)apply(false);else loadGA()}}})}
window.EkinConsent={open:function(){open(MODE==='all'?'prefs':'prefs')}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
