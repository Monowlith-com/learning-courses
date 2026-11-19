/* Site-wide information page navigation. Preserves the original reader's URL state. */
(function(){'use strict';
const KEY='lc-ui-language-v1';
const params=new URLSearchParams(location.search);
const slug=location.pathname.split('/').pop();
const locale=location.pathname.split('/').slice(-2,-1)[0]==='en'?'en':'de';
const doclang=params.get('doclang')==='en'?'en':'de';
const backButton=document.getElementById('lc-info-back');
// A back parameter contains only a reader query and a fragment, not an arbitrary URL.
const back=params.get('back')||'';
const match=/^(\?(?:[a-zA-Z0-9_~.%!&=+-]*))?(#(?:[a-zA-Z0-9_~.%!&=:+-]*))?$/.test(back);
const hasCourse=match&&/^\?/.test(back)&&new URLSearchParams(back.slice(1).split('#')[0]).has('course');
function updateBack(){
 if(!backButton)return;
 const target=new URL('../../../index.html',location.href);
 if(match&&hasCourse){
  const backUrl=new URL('../../../index.html'+back,location.href);
  target.search=backUrl.search;target.hash=backUrl.hash;
 }
 const scrollY=params.get('y');
 if(hasCourse&&/^(?:0|[1-9]\d{0,7})$/.test(scrollY||''))target.searchParams.set('lc_return_y',scrollY);
 target.searchParams.delete('lang');target.searchParams.set('syslang',locale);target.searchParams.set('doclang',doclang);target.searchParams.set('theme',window.LernkursTheme?.current||'light');backButton.href=target.href;
 backButton.querySelector('.lc-home-link-label').textContent=hasCourse?(locale==='de'?'Zurück zum Lesen':'Back to reading'):(locale==='de'?'Kursübersicht':'Course overview');
}
const themeButton=document.getElementById('theme');
if(themeButton&&window.LernkursTheme){
 const update=()=>{const dark=window.LernkursTheme.current==='dark';
  themeButton.textContent=dark?'☀':'☾';
  themeButton.title=dark?(locale==='de'?'Hellmodus aktivieren':'Switch to light mode'):(locale==='de'?'Dunkelmodus aktivieren':'Switch to dark mode');
  themeButton.setAttribute('aria-label',themeButton.title);
 };
 themeButton.addEventListener('click',()=>{window.LernkursTheme.set(window.LernkursTheme.current==='dark'?'light':'dark');update();updateNavigation()});
 window.addEventListener('pageshow',()=>{update();updateNavigation()});
 update();
}
const language=document.getElementById('lc-language-switch');
if(language){
 language.textContent=locale==='de'?'DE':'EN';
 language.title=locale==='de'?'Sprache wechseln (Deutsch / Englisch)':'Change language (English / German)';language.setAttribute('aria-label',language.title);
 language.onclick=()=>{
  const next=locale==='de'?'en':'de';
  try{localStorage.setItem(KEY,next)}catch(_e){}
  const target=new URL('../'+next+'/'+slug,location.href);
  target.search=location.search;target.searchParams.set('syslang',next);target.hash=location.hash;
  let available=true;
  if(hasCourse){
   const returnRoute=new URL('../../../index.html'+back,location.href);
   returnRoute.searchParams.set('doclang',doclang);
   available=window.LC_URL.switchLanguage(returnRoute,next);
   target.searchParams.set('doclang',returnRoute.searchParams.get('doclang'));
   target.searchParams.set('back',returnRoute.search+returnRoute.hash);
  }else if((window.LC_CATALOG||[]).some(c=>c.language===next))target.searchParams.set('doclang',next);
  target.searchParams.set('theme',window.LernkursTheme?.current||'light');
  const go=()=>location.href=target.href;
  if(available)go();else {window.LC_I18N.set(next);window.LC_I18N.showUnavailable(next,language,go);}

 };
}
// Navigating between legal and information pages must preserve the return context.
function updateNavigation(){
 updateBack();
 for(const a of document.querySelectorAll('.lc-global-footer nav a[href]')){
  const target=new URL(a.href,location.href);
  // Preserve only links to actual information pages, not external credits.
  const current=new URL(location.href);
  if(target.origin!==current.origin||target.protocol!==current.protocol||target.host!==current.host||!target.pathname.startsWith(current.pathname.slice(0,current.pathname.lastIndexOf('/')+1))||!target.pathname.endsWith('.html'))continue;
  if(match&&back){
   target.searchParams.set('back',back);
   if(params.has('y'))target.searchParams.set('y',params.get('y'));
  }
  target.searchParams.delete('lang');target.searchParams.set('syslang',locale);target.searchParams.set('doclang',doclang);target.searchParams.set('theme',window.LernkursTheme?.current||'light');
  a.href=target.href;
 }
}
document.documentElement.lang=locale;
// The route of a static page determines its actual UI language.
const canonical=new URL(location.href);canonical.searchParams.delete('lang');canonical.searchParams.set('syslang',locale);canonical.searchParams.set('doclang',doclang);canonical.searchParams.set('theme',window.LernkursTheme?.current||'light');
if(canonical.href!==location.href){try{history.replaceState(history.state,'',canonical.href)}catch(_){/* retain current document on restricted file:// */}}
updateNavigation();
})();
