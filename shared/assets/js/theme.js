/* URL-first, language-neutral theme state. Missing theme always means light. */
(function(){'use strict';
 const KEY='lernkurs-reader-stand-v1:theme';
 const choose=t=>t==='dark'?'dark':'light';
 const urlTheme=()=>choose(new URLSearchParams(location.search).get('theme'));
 let current=urlTheme();
 // The URL is authoritative, including the canonical language of information pages.
 function uiLanguage(here){return here.get('syslang')||window.LC_I18N?.locale||document.documentElement.lang||'de';}
 function applyPreferences(query,here,portal=false){
  query.delete('lang');query.set('syslang',uiLanguage(here));
  query.set('doclang',(portal?here.get('doclang'):query.get('doclang')||here.get('doclang'))||'de');
  query.set('theme',current);
 }
 function updateLinks(){
  const here=new URLSearchParams(location.search);
  document.querySelectorAll('a[href]').forEach(a=>{
   const href=a.getAttribute('href')||'';
   if(!href||href.startsWith('#'))return;
   if(/^(?:\/\/|[a-z][a-z0-9+.-]*:)/i.test(href)){
    let target;try{target=new URL(href,location.href)}catch(_){return;}
    const portal=target.origin==='https://monowlith-com.github.io'&&/^\/(?:index\.html)?$/.test(target.pathname);
    // Absolute UI navigation may be produced by an earlier update. Never modify external credits or source links.
    const internalUI=target.origin===location.origin&&target.protocol===location.protocol&&
      a.closest?.('.header-first,.lc-global-footer nav')&&/(?:\.html?|\/)$/.test(target.pathname);
    if(!portal&&!internalUI)return;
    applyPreferences(target.searchParams,here,portal);a.setAttribute('href',target.href);return;
   }
   const hashPos=href.indexOf('#'),frag=hashPos<0?'':href.slice(hashPos);
   const base=hashPos<0?href:href.slice(0,hashPos);
   const q=base.indexOf('?'),path=q<0?base:base.slice(0,q);
   // Keep relative reader routes relative for the in-document navigation handler.
   if(!path||/(?:\.html?|\/)$/.test(path)){
    const query=new URLSearchParams(q<0?'':base.slice(q+1));applyPreferences(query,here);
    const qs=query.toString();a.setAttribute('href',path+(qs?'?'+qs:'')+frag);
   }
  });
 }
 function syncAddress(){
  const next=new URL(location.href);
  next.searchParams.delete('lang');
  next.searchParams.set('syslang',uiLanguage(next.searchParams));
  next.searchParams.set('doclang',next.searchParams.get('doclang')==='en'?'en':'de');
  next.searchParams.set('theme',current);
  const value=next.pathname+next.search+next.hash;
  if(value!==location.pathname+location.search+location.hash){
   try{history.replaceState(history.state,'',value)}catch(_){location.replace(next.href)}
  }
 }
 function set(t){
  current=choose(t);document.documentElement.dataset.theme=current;
  try{localStorage.setItem(KEY,JSON.stringify(current))}catch(_e){}
  syncAddress();updateLinks();return current;
 }
 document.documentElement.dataset.theme=current;
 window.LernkursTheme={get current(){return current},set,updateLinks};
 document.addEventListener('DOMContentLoaded',()=>{syncAddress();updateLinks()});
 window.addEventListener('pageshow',()=>{
  const desired=urlTheme();if(desired!==current)set(desired);else updateLinks();
 });
})();

/* ID-L118 – Direct CSS overrides for the temporary debug layout editor.
   No CSS custom properties. All generated declarations contain literal values. */
(function(){'use strict';
const defaults={"--lc-bookmarks-font":".88rem","--lc-bookmarks-group-gap":".35rem","--lc-bookmarks-item-gap":".10rem","--lc-bookmarks-width":"25rem","--lc-bullet-left":"1.5rem","--lc-bullet-right":"0rem","--lc-dropdown-close-size":"1.35rem","--lc-dropdown-row-padding-y":".12rem","--lc-favorites-font":".88rem","--lc-favorites-item-gap":".10rem","--lc-figcaption-top":".1rem","--lc-h1-above":"0rem","--lc-h1-below":"1rem","--lc-h1-border":"0.06rem","--lc-h1-number-gap":".75rem","--lc-h1-padding":".3rem","--lc-h1-phone-size":"1.45rem","--lc-h1-size":"2rem","--lc-h1-tablet-size":"1.7rem","--lc-h1-underline":"#d5d7dc","--lc-h2-above":"3rem","--lc-h2-below":".65rem","--lc-h2-border":"0.06rem","--lc-h2-number-gap":".35rem","--lc-h2-padding":".3rem","--lc-h2-phone-size":"1.2rem","--lc-h2-size":"1.4rem","--lc-h2-tablet-size":"1.26rem","--lc-h2-underline":"#d5d7dc","--lc-h3-above":"2.02rem","--lc-h3-below":".55rem","--lc-h3-border":"0.06rem","--lc-h3-number-gap":".35rem","--lc-h3-padding":".3rem","--lc-h3-phone-size":"1.08rem","--lc-h3-size":"1.2rem","--lc-h3-tablet-size":"1.08rem","--lc-h3-underline":"#d5d7dc","--lc-h4-above":"1.35rem","--lc-h4-below":".4rem","--lc-h4-border":"0.06rem","--lc-h4-number-gap":".35rem","--lc-h4-padding":".3rem","--lc-h4-phone-size":"1rem","--lc-h4-size":"1.1rem","--lc-h4-tablet-size":"1rem","--lc-h4-underline":"#d5d7dc","--lc-header-action-font":".9rem","--lc-left-normal":"20rem","--lc-left-wide":"25rem","--lc-list-above":"1rem","--lc-list-below":"1rem","--lc-list-gap":".25rem","--lc-list-leading":"1.5","--lc-mono-leading":"1.4","--lc-mono-padding":".85rem","--lc-mono-size":".88rem","--lc-nav-group-gap":".3rem","--lc-nav-group-padding-bottom":".2rem","--lc-nav-group-padding-top":".2rem","--lc-nav-item-gap":".2rem","--lc-nav-item-leading":"1.3","--lc-nav-marker-gap":".2rem","--lc-nav-marker-left":".7rem","--lc-nav-padding-bottom":".2rem","--lc-nav-padding-top":".2rem","--lc-nav-panel-bottom":"1rem","--lc-nav-panel-left":".65rem","--lc-nav-panel-right":".65rem","--lc-nav-panel-top":".4rem","--lc-nav-parent-child-gap":".3rem","--lc-note-button-right":".2rem","--lc-note-button-size":"1.25rem","--lc-note-button-top":".2rem","--lc-note-dialog-input":"1rem","--lc-note-dialog-label":".9rem","--lc-note-dialog-location":".95rem","--lc-note-dialog-title":"1.15rem","--lc-note-leading":"1.45","--lc-note-padding-bottom":".4rem","--lc-note-padding-left":".4rem","--lc-note-padding-right":".4rem","--lc-note-padding-top":".2rem","--lc-note-section-size":".9rem","--lc-note-text":".86rem","--lc-note-title":".92rem","--lc-number-left":"1.5rem","--lc-number-right":"0rem","--lc-p-spacing":"1rem","--lc-paper-normal":"60rem","--lc-paper-wide":"100rem","--lc-reader-leading":"1.7","--lc-right-normal":"20rem","--lc-right-wide":"25rem","--lc-search-font":".96rem","--lc-sidebar-font":"0.92rem","--lc-table-first-min":"8rem","--lc-table-font":"0.92rem","--lc-tablet-font-scale":".9","--lc-toc-head-bottom":".3rem","--lc-toc-head-gap":".3rem","--lc-toc-main-left":"0rem","--read-font":"1rem"};
const targets=[["","h1","font-size","{{--lc-h1-size}}"],["","h1","margin","{{--lc-h1-above}} 0 {{--lc-h1-below}}"],["","h1","padding-bottom","{{--lc-h1-padding}}"],["","h1","border-bottom","{{--lc-h1-border}} solid {{--lc-h1-underline}}"],["","h2","font-size","{{--lc-h2-size}}"],["","h2","margin","{{--lc-h2-above}} 0 {{--lc-h2-below}}"],["","h2","padding-bottom","{{--lc-h2-padding}}"],["","h2","border-bottom","{{--lc-h2-border}} solid {{--lc-h2-underline}}"],["","h3","font-size","{{--lc-h3-size}}"],["","h3","margin","{{--lc-h3-above}} 0 {{--lc-h3-below}}"],["","h3","padding-bottom","{{--lc-h3-padding}}"],["","h3","border-bottom","{{--lc-h3-border}} solid {{--lc-h3-underline}}"],["","h4","font-size","{{--lc-h4-size}}"],["","h4","margin","{{--lc-h4-above}} 0 {{--lc-h4-below}}"],["","h4","padding-bottom","{{--lc-h4-padding}}"],["","h4","border-bottom","{{--lc-h4-border}} solid {{--lc-h4-underline}}"],["","p","margin","{{--lc-p-spacing}} 0"],["","pre","font-size","{{--lc-mono-size}}"],["","pre","line-height","{{--lc-mono-leading}}"],["","pre","padding","{{--lc-mono-padding}}"],["","pre code","font-size","{{--lc-mono-size}}"],["","pre code","line-height","{{--lc-mono-leading}}"],["","table","font-size","{{--lc-table-font}}"],["","figcaption","margin-top","{{--lc-figcaption-top}}"],["",":is(.reader,.portal-tile-info) ul,:is(.reader,.portal-tile-info) ol","margin","{{--lc-list-above}} 0 {{--lc-list-below}}"],["",":is(.reader,.portal-tile-info) ul","padding-inline","{{--lc-bullet-left}} {{--lc-bullet-right}}"],["",":is(.reader,.portal-tile-info) ol","padding-inline","{{--lc-number-left}} {{--lc-number-right}}"],["",":is(.reader,.portal-tile-info) li","margin","{{--lc-list-gap}} 0"],["",":is(.reader,.portal-tile-info) li","line-height","{{--lc-list-leading}}"],["",":is(.reader,.portal-tile-info) li p","line-height","{{--lc-list-leading}}"],["",".search","font-size","{{--lc-search-font}}"],["",".header-progress button","font-size","{{--lc-header-action-font}}"],["",".shell","grid-template-columns","minmax(0,{{--lc-left-normal}}) minmax(0,1fr) minmax(0,{{--lc-right-normal}})"],["",".sidebar,.toc","font-size","{{--lc-sidebar-font}}"],["",".sidebar-heading","font-size","{{--lc-sidebar-font}}"],["",".groups,.toc-section,.lc-preview-nav","padding","{{--lc-nav-panel-top}} {{--lc-nav-panel-right}} {{--lc-nav-panel-bottom}} {{--lc-nav-panel-left}}"],["",".groups > details + details,.lc-preview-nav > details + details","margin-top","{{--lc-nav-group-gap}}"],["",":is(.groups,.lc-preview-nav) summary","padding","{{--lc-nav-group-padding-top}} 0 {{--lc-nav-group-padding-bottom}}"],["",":is(.groups,.lc-preview-nav) summary","line-height","{{--lc-nav-item-leading}}"],["",".nav-item","gap","{{--lc-nav-marker-gap}}"],["",".nav-item","padding","{{--lc-nav-padding-top}} 0 {{--lc-nav-padding-bottom}} {{--lc-nav-marker-left}}"],["",".nav-item","font-size","{{--lc-sidebar-font}}"],["",".nav-item","line-height","{{--lc-nav-item-leading}}"],["",".groups summary + .nav-item,.lc-preview-nav summary + .nav-item","margin-top","{{--lc-nav-parent-child-gap}}"],["",".groups .nav-item + .nav-item,.lc-preview-nav .nav-item + .nav-item","margin-top","{{--lc-nav-item-gap}}"],["",".tick","line-height","{{--lc-nav-item-leading}}"],["",".sidebar-status,.notes-status","font-size","{{--lc-sidebar-font}}"],["",".paper","max-width","{{--lc-paper-normal}}"],["",".reader","font-size","{{--read-font}}"],["",".reader","line-height","{{--lc-reader-leading}}"],["",".reader table.lc-lesson-table :is(th,td):first-child","min-width","{{--lc-table-first-min}}"],["",".reader h1 .lesson-number","font-size","{{--lc-h1-size}}"],["",".reader h1 .lesson-number","margin-inline-end","{{--lc-h1-number-gap}}"],["",".reader h2 .section-number","font-size","{{--lc-h2-size}}"],["",".reader h2 .section-number","margin-inline-end","{{--lc-h2-number-gap}}"],["",".reader h3 .section-number","font-size","{{--lc-h3-size}}"],["",".reader h3 .section-number","margin-inline-end","{{--lc-h3-number-gap}}"],["",".reader h4 .section-number","font-size","{{--lc-h4-size}}"],["",".reader h4 .section-number","margin-inline-end","{{--lc-h4-number-gap}}"],["",".toc-head","padding","{{--lc-nav-group-padding-top}} 0 {{--lc-toc-head-bottom}}"],["",".toc-head","margin-bottom","{{--lc-toc-head-gap}}"],["",".toc-head","line-height","{{--lc-nav-item-leading}}"],["",".toc-section a","gap","{{--lc-nav-marker-gap}}"],["",".toc-section a","padding","{{--lc-nav-padding-top}} 0 {{--lc-nav-padding-bottom}} {{--lc-toc-main-left}}"],["",".toc-section a","font-size","{{--lc-sidebar-font}}"],["",".toc-section a","line-height","{{--lc-nav-item-leading}}"],["",".toc-section a.subheading","padding-left","{{--lc-nav-marker-left}}"],["",".toc-section a:not(.subheading)","padding-block","{{--lc-nav-group-padding-top}} {{--lc-nav-group-padding-bottom}}"],["",".toc-section a + a","margin-top","{{--lc-nav-item-gap}}"],["",".toc-section a + a:not(.subheading)","margin-top","{{--lc-nav-group-gap}}"],["",".toc-section a[data-nav-level=\"h2\"] + a.subheading,.toc-section a[data-nav-level=\"h3\"] + a[data-nav-level=\"h4\"]","margin-top","{{--lc-nav-parent-child-gap}}"],["",".margin-note","padding","{{--lc-note-padding-top}} {{--lc-note-padding-right}} {{--lc-note-padding-bottom}} {{--lc-note-padding-left}}"],["",".margin-note","font-size","{{--lc-note-text}}"],["",".margin-note","line-height","{{--lc-note-leading}}"],["",".note-chapter-title","font-size","{{--lc-note-section-size}}"],["",".note-section-title","font-size","{{--lc-note-title}}"],["",".note-button-group","margin-top","calc({{--lc-note-button-top}} - {{--lc-note-padding-top}})"],["",".note-button-group","margin-right","calc({{--lc-note-button-right}} - {{--lc-note-padding-right}})"],["",".note-tools .note-action","width","{{--lc-note-button-size}}"],["",".note-tools .note-action","height","{{--lc-note-button-size}}"],["","#note-dialog-title,.lc-note-preview .note-dialog-head strong","font-size","{{--lc-note-dialog-title}}"],["","#note-dialog-location,.lc-note-preview-location","font-size","{{--lc-note-dialog-location}}"],["",".note-dialog label,.lc-note-preview-label","font-size","{{--lc-note-dialog-label}}"],["","#note-dialog textarea,.lc-note-preview-input","font-size","{{--lc-note-dialog-input}}"],["","#note-dialog textarea,.lc-note-preview-input","line-height","{{--lc-note-leading}}"],["",".transfer-options label,.transfer-keep","font-size","{{--lc-sidebar-font}}"],["",".transfer-dialog button","font-size","{{--lc-sidebar-font}}"],["","#favorites-menu .dropdown-row + .dropdown-row","margin-top","{{--lc-favorites-item-gap}}"],["",".header-progress .dropdown-entry","padding","{{--lc-dropdown-row-padding-y}} .35rem"],["",".header-progress .dropdown-remove","flex","0 0 {{--lc-dropdown-close-size}}"],["",".header-progress .dropdown-remove","width","{{--lc-dropdown-close-size}}"],["",".header-progress .dropdown-remove","height","{{--lc-dropdown-close-size}}"],["",".bookmark-course,.bookmark-chapter","padding","{{--lc-dropdown-row-padding-y}} .3rem"],["","#bookmarks-menu :is(.bookmark-item,.bookmark-chapter)","margin-top","{{--lc-bookmarks-item-gap}}"],["","#bookmarks-menu .bookmark-group-divider","margin-top","calc({{--lc-bookmarks-group-gap}} / 2)"],["","#bookmarks-menu .bookmark-group-divider","padding-top","calc({{--lc-bookmarks-group-gap}} / 2)"],["",".lc-footer-legal","max-width","{{--lc-paper-normal}}"],["",".lc-page,.repo-landing","max-width","{{--lc-paper-normal}}"],["",".lc-layout-preview :is(.lc-preview-nav,.lc-preview-toc)","font-size","{{--lc-sidebar-font}}"],["(max-width:70rem)",".shell","grid-template-columns","minmax(0,calc({{--lc-left-normal}} * .9)) minmax(0,1fr)"],["(min-width:47.5001rem) and (max-width:70rem)",".site-header,.shell","font-size","calc(1rem * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)",".reader","font-size","calc({{--read-font}} * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)","h1,.reader h1 .lesson-number","font-size","{{--lc-h1-tablet-size}}"],["(min-width:47.5001rem) and (max-width:70rem)","h2,.reader h2 .section-number","font-size","{{--lc-h2-tablet-size}}"],["(min-width:47.5001rem) and (max-width:70rem)","h3,.reader h3 .section-number","font-size","{{--lc-h3-tablet-size}}"],["(min-width:47.5001rem) and (max-width:70rem)","h4,.reader h4 .section-number","font-size","{{--lc-h4-tablet-size}}"],["(min-width:47.5001rem) and (max-width:70rem)","table","font-size","calc({{--lc-table-font}} * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)",".sidebar,.toc,.nav-item,.sidebar-heading,.toc-section a","font-size","calc({{--lc-sidebar-font}} * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)",".lc-brand,.lc-reader-wordmark,.lc-github-tag","font-size","calc(1.13rem * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)",".home-link,.lc-info-back,.lc-start-link","font-size","calc(1.13rem * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)",".course-title","font-size","calc(1.28rem * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)",".header-progress button","font-size","calc({{--lc-header-action-font}} * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)",".search","font-size","calc({{--lc-search-font}} * {{--lc-tablet-font-scale}})"],["(min-width:47.5001rem) and (max-width:70rem)",".icon-tool,.toc-trigger","font-size","calc(.86rem * {{--lc-tablet-font-scale}})"],["(max-width:47.5rem)","h1,.reader h1 .lesson-number","font-size","{{--lc-h1-phone-size}}"],["(max-width:47.5rem)","h2,.reader h2 .section-number","font-size","{{--lc-h2-phone-size}}"],["(max-width:47.5rem)","h3,.reader h3 .section-number","font-size","{{--lc-h3-phone-size}}"],["(max-width:47.5rem)","h4,.reader h4 .section-number","font-size","{{--lc-h4-phone-size}}"],["","body.panels-wide .shell","grid-template-columns","minmax(0,{{--lc-left-wide}}) minmax(0,1fr) minmax(0,{{--lc-right-wide}})"],["","body.reader-wide .paper,body.reader-wide .lc-page,body.reader-wide .repo-landing","max-width","{{--lc-paper-wide}}"],["","#bookmarks-menu","max-width","{{--lc-bookmarks-width}}"],["","#bookmarks-menu .dropdown-entry,#bookmarks-menu .dropdown-empty,#bookmarks-menu .bookmark-course,#bookmarks-menu .bookmark-chapter","font-size","{{--lc-bookmarks-font}}"],["","#favorites-menu .dropdown-entry,#favorites-menu .dropdown-empty","font-size","{{--lc-favorites-font}}"],["",":is(.reader,.portal-tile-info) ul","padding-left","{{--lc-bullet-left}}"],["",":is(.reader,.portal-tile-info) ol","padding-left","{{--lc-number-left}}"],["",":is(.reader,.portal-tile-info) ul","padding-right","{{--lc-bullet-right}}"],["",":is(.reader,.portal-tile-info) ol","padding-right","{{--lc-number-right}}"]];
const values=Object.create(null);
const TOKEN=/\{\{(--[a-z0-9-]+)\}\}/g;
const round=n=>String(Number(n.toFixed(2)))+'rem';
const remMul=(a,b)=>round(Number(a.slice(0,-3))*Number(b));
function rendered(template){
 let out=template.replace(TOKEN,(_,key)=>values[key]??defaults[key]??'0rem');
 out=out.replace(/calc\(\s*(\d*\.?\d+)rem\s*\*\s*(\d*\.?\d+)\s*\)/g,(_,a,b)=>round(Number(a)*Number(b)));
 out=out.replace(/calc\(\s*(\d*\.?\d+)rem\s*([+\-])\s*(\d*\.?\d+)rem\s*\)/g,(_,a,op,b)=>round(op==='+'?Number(a)+Number(b):Number(a)-Number(b)));
 if(/\b(?:var|calc|clamp)\(/.test(out))return null;
 return out;
}
let sheet=null;
try{sheet=new CSSStyleSheet();document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet]}catch(_e){sheet=null;}
function update(){
 if(!sheet)return false;
 const rules=[];
 for(const [media,selector,property,template] of targets){
  if(!Array.from(template.matchAll(TOKEN)).some(m=>Object.hasOwn(values,m[1])))continue;
  const value=rendered(template);if(value===null)continue;
  const css=selector+'{'+property+':'+value+'}';rules.push(media?'@media '+media+'{'+css+'}':css);
 }
 sheet.replaceSync(rules.join('\n'));return true;
}
function set(key,value){
 if(!Object.hasOwn(defaults,key))return false;
 values[key]=value;return update();
}
function clear(key){delete values[key];update();}
function get(key){return values[key]??defaults[key]??'';}
window.LCDirectStyles={get,set,clear,defaults:Object.freeze(defaults),supported:!!sheet};
})();
