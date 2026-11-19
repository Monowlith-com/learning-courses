"use strict";
/* UI-only localization. This does not translate course content or user-authored notes. */
(function(){
 const KEY='lc-ui-language-v1';
 let locale='de';
 const params=new URLSearchParams(location.search),param=params.get('syslang')||params.get('lang');if(param==='de'||param==='en')locale=param;
 const t=(key,params={})=>{const book=window.LC_LANGUAGE_PACKS?.[locale]||window.LC_LANGUAGE_PACKS?.de||{};const text=book[key]||window.LC_LANGUAGE_PACKS?.de?.[key]||key;
  return text.replace(/\{([a-z]+)\}/g,(_,k)=>params[k]??'');};
 // Stable UI-element bindings only. Never traverse into content (#reader), notes or user-written text.
 const map={
  'a.home-link .lc-home-link-label':['text','header.all_courses'], '#menu':['text','header.course'], '#toc-toggle':['text','header.chapters'],
  '#search':['placeholder','header.search'], '#favorites-menu-toggle':['first','header.favorites'],
  '#reading-data':['text','transfer.title'], '#reading-data-mobile':['text','transfer.title'],
  '#bookmarks-menu-toggle':['first','header.bookmarks'],
  '#note-dialog-title':['text','notes.new'], '#note-quote-clear':['text','notes.clear_quote'],
  '#smaller':['title','header.smaller'], '#larger':['title','header.larger'],
  '#width-toggle':['title','header.width'], '#panels-toggle':['title','header.panels'],
  '#sidebar .sidebar-heading':['text','side.overview'], '#close-menu':['last','side.close'],
  '#overlay-search':['placeholder','side.search'], '#tab-contents':['text','reader.contents'],
  '#tab-notes':['text','reader.notes'], '#previous':['prev','reader.previous'], '#next':['next','reader.next'],
  '#to-top':['up','reader.up'], '#note-cancel':['text','notes.cancel'], '#note-save':['text','notes.save'],
  '#note-text':['placeholder','notes.placeholder'], '#note-quote-clear':['text','notes.clear_quote'],
  'label[for="note-text"]':['text','notes.text'], 'label[for="note-quote"]':['text','notes.quote'],
  '.lc-layout-dialog header strong':['text','settings.title']
 };
 function apply(scope=document){
  for(const [selector,[mode,key]] of Object.entries(map)){
   const el=scope.querySelector?.(selector);if(!el)continue;const val=t(key);
   if(mode==='text')el.textContent=val;
   else if(mode==='prev')el.textContent='← '+val;
   else if(mode==='next')el.textContent=val+' →';
   else if(mode==='up')el.textContent='↑ '+val;
   else if(mode==='placeholder')el.placeholder=val;
   else if(mode==='title')el.title=val;
   else if(mode==='first'){const node=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(node)node.textContent=(el.id==='favorites-menu-toggle'?'★ ':'')+val+' ';}
   else if(mode==='last'){const node=[...el.childNodes].reverse().find(n=>n.nodeType===Node.TEXT_NODE);if(node)node.textContent=' '+val;}
  }
  const attrBindings=[
   ['#menu','aria-label','header.nav_open'],['#toc-toggle','aria-label','header.chapter_open'],
   ['#search','aria-label','reader.search'],['.header-progress','aria-label','header.progress'],
   ['.header-tools','aria-label','header.style'],['#reading-data','title','transfer.title'],['#progress-file','aria-label','header.progress_file'],
   ['#favorites-menu','aria-label','header.toggle_favorites'],['#bookmarks-menu','aria-label','header.toggle_bookmarks'],
   ['#smaller','aria-label','header.smaller'],['#larger','aria-label','header.larger'],
   ['#width-toggle','aria-label','header.width'],['#panels-toggle','aria-label','header.panels'],
   ['#sidebar','aria-label','side.overview'],['#toc','aria-label','reader.notes_aria'],
   ['#close-right','aria-label','reader.close_panel'],['#notes-track','aria-label','reader.section_notes'],
 ];
 for(const [selector,attribute,key] of attrBindings){const el=scope.querySelector?.(selector);if(el)el.setAttribute(attribute,t(key));}
 const switcher=scope.querySelector?.('#lc-language-switch');if(switcher){switcher.textContent=locale==='de'?'DE':'EN';switcher.title=t('header.lang');switcher.setAttribute('aria-label',t('header.lang'));switcher.removeAttribute('aria-pressed');}
  const doc=scope.querySelector?.('#lc-document-language-switch');
  if(doc){const lang=new URLSearchParams(location.search).get('doclang')==='en'?'en':'de';doc.textContent=lang.toUpperCase();doc.title=t('header.doclang');doc.setAttribute('aria-label',t('header.doclang')+' ('+lang.toUpperCase()+')');}
  window.LC_LOCALIZE_HEADER_EXTERNAL?.(locale,scope);
  document.documentElement.lang=locale;
 }
 function set(lang){if(lang!=='de'&&lang!=='en')return;locale=lang;try{localStorage.setItem(KEY,lang)}catch(_){};apply();window.dispatchEvent(new CustomEvent('lc-language-change',{detail:{locale}}));}
 function showUnavailable(next,trigger){
  const message=t(next==='en'?'header.doclang_unavailable_en':'header.doclang_unavailable_de');
  let dialog=document.getElementById('lc-doclang-unavailable');
  if(!dialog){
   dialog=document.createElement('dialog');dialog.id='lc-doclang-unavailable';dialog.className='note-dialog lc-doclang-notice';dialog.setAttribute('aria-labelledby','lc-doclang-notice-text');
   const form=document.createElement('form');form.method='dialog';
   const text=document.createElement('p');text.id='lc-doclang-notice-text';
   const actions=document.createElement('div');actions.className='lc-doclang-notice-actions';
   const close=document.createElement('button');close.type='submit';close.textContent='OK';close.autofocus=true;
   actions.append(close);form.append(text,actions);dialog.append(form);document.body.append(dialog);
  }
  dialog.querySelector('p').textContent=message;
  dialog.addEventListener('close',()=>trigger.focus({preventScroll:true}),{once:true});
  if(!dialog.open)dialog.showModal();
 }
 function install(root=document){const btn=root.querySelector?.('#lc-language-switch');if(!btn)return;btn.onclick=()=>{const next=locale==='de'?'en':'de';set(next);const target=new URL(location.href);target.searchParams.delete('lang');target.searchParams.set('syslang',next);location.href=target.href};
 const doc=root.querySelector?.('#lc-document-language-switch');if(doc)doc.onclick=()=>{
  const target=new URL(location.href),next=target.searchParams.get('doclang')==='en'?'de':'en';
  const catalog=window.LC_CATALOG||[],requested=target.searchParams.get('course');
  const available=requested
   ?catalog.some(c=>c.language===next&&c.id===window.LC_URL?.internalCourse(requested,next))
   :catalog.some(c=>c.language===next);
  if(!available){showUnavailable(next,doc);return;}
  const pages={glossar:'glossary',pfad:'path',studienweg:'study-path',quellenverzeichnis:'sources'};
  const page=target.searchParams.get('page');if(page){const map=next==='en'?pages:Object.fromEntries(Object.entries(pages).map(([a,b])=>[b,a]));if(map[page])target.searchParams.set('page',map[page]);}
  target.searchParams.set('doclang',next);target.searchParams.set('syslang',locale);location.href=target.href;
 };apply(root);}
 window.LC_I18N={get locale(){return locale},t,set,apply,install};
})();
