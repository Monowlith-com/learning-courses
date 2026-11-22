
window.addEventListener('lernkurs-daten-bereit', () => {
'use strict';
const DATA=window.LERNKURS_DATEN;
const $=id=>document.getElementById(id);
const tr=(key,args)=>window.LC_I18N.t(key,args);
// Schlüssel aus v0.2.57 beibehalten, damit Lesemarkierungen nicht verlorengehen.
const storageKey='lernkurs-reader-stand-v1';
const storage=(()=>{try{const test='__lr_test';localStorage.setItem(test,'1');localStorage.removeItem(test);return localStorage}catch{return null}})();
const load=(k,def)=>{if(!storage)return def;try{return JSON.parse(storage.getItem(storageKey+k))??def}catch{return def}};
const save=(k,v)=>{if(!storage)return false;try{storage.setItem(storageKey+k,JSON.stringify(v));return true}catch{const status=document.getElementById('progress-feedback');if(status)status.textContent=tr('progress.storage_error');return false}};
const debugProfile=document.documentElement.dataset.lcProfile==='debug';
const viewKey=key=>debugProfile?':debug'+key:key;
const defaultFont=()=>1;
let theme=load(':theme','light'),font=load(viewKey(':font'),defaultFont());
const COURSE_ID=String(window.LERNKURS_KONFIGURATION.kurskennung);
// Historical A/B/C document IDs remain usable in links, browser backups and notes.
// Active generated lesson IDs are course-scoped M<number>-L<number>.
const historicalDocumentMap=window.LC_LEGACY_DOCUMENT_MAP||{};
// Level-first identity; accept previous storage/backup IDs only as input.
const normalizeCourseId=id=>typeof id==='string'?id.replace(/^(.+)_(school|university)_(de|en)$/,'$2_$1_$3'):id;
const previousCourseId=id=>typeof id==='string'?id.replace(/^(school|university)_(.+)_(de|en)$/,'$2_$1_$3'):id;
const normalizeDocId=id=>{if(typeof id!=='string')return id;const pos=id.indexOf(':');const key=pos<0?id:normalizeCourseId(id.slice(0,pos))+id.slice(pos);return Object.prototype.hasOwnProperty.call(historicalDocumentMap,key)?historicalDocumentMap[key]:key;};
// Keep the shared historical read key, but merge individual changes with the latest
// stored snapshot. Separate course tabs must not overwrite each other's marks.
function readSnapshot(value){
 const flags=Object.create(null);
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  // Prefer canonical entries to a stale alias, regardless of storage insertion order.
  for(const [id,flag] of Object.entries(value))if(typeof flag==='boolean'){const canonical=normalizeDocId(id);if(id===canonical||!Object.hasOwn(flags,canonical))flags[canonical]=flag;}
 }
 for(const [historical,canonical] of Object.entries(historicalDocumentMap)){
  if(Object.prototype.hasOwnProperty.call(flags,historical)&&!Object.prototype.hasOwnProperty.call(flags,canonical))flags[canonical]=flags[historical];
 }
 return flags;
}
let read=readSnapshot(load(':read',{}));
const pendingRead=new Map();
function latestRead(fallback=read){
 const next=readSnapshot(load(':read',fallback));
 for(const [id,flag] of pendingRead)next[id]=flag;
 return next;
}
function commitRead(changes){
 for(const [id,flag] of changes)pendingRead.set(id,flag);
 read=latestRead();
 const persisted=save(':read',read);
 if(persisted)pendingRead.clear();
 return persisted;
}
const lastDocKey=':lastDoc:'+COURSE_ID;
const favoritesKey=':favorites:'+COURSE_ID,notesKey=':notes:'+COURSE_ID,bookmarksKey=':bookmarks:'+COURSE_ID;
let readingWide=!!load(viewKey(':readingWide'),false),panelsWide=!!load(viewKey(':panelsWide'),false);
let favorites=[],bookmarks=[],notes=[],editingNoteId=null,rightTab='contents',pendingQuote='',pendingQuoteAnchor='',pendingPosition='';

let course=DATA.courses[0],current=null,searchTerm='',searchIndex={};
const allDocs=()=>course.docs;
const courseFor=id=>DATA.courses.find(c=>c.docs.some(d=>d.id===normalizeDocId(id)));
const getDoc=id=>allDocs().find(d=>d.id===normalizeDocId(id));
const paramsFromHash=()=>new URLSearchParams(location.search);
const docHash=(id,section)=>window.LC_URL.toURL(id,section,theme,window.LC_I18N.locale,window.LERNKURS_KONFIGURATION.sprache);
const routeFromHash=()=>window.LC_URL.fromURL(location.search+location.hash,allDocs());
const scrollToAnchor=anchor=>{const h=anchor==='__lektion__'?$('reader').querySelector('h1'):(anchor&&document.getElementById(anchor));if(h)h.scrollIntoView({block:'start'});else window.scrollTo(0,0)};
function setTheme(v){theme=v==='dark'?'dark':'light';window.LernkursTheme.set(theme);save(':theme',theme);$('theme').textContent=theme==='light'?'☾':'☀';$('theme').setAttribute('aria-label',theme==='light'?tr('header.theme_dark'):tr('header.theme_light'));$('theme').title=theme==='light'?tr('header.theme_dark'):tr('header.theme_light')}
function setFont(v){font=Math.max(.84,Math.min(1.48,Number(v)||1));window.LCDirectStyles?.set('--read-font',font.toFixed(2)+'rem');save(viewKey(':font'),font);scheduleMarginNotes();requestAnimationFrame(()=>requestAnimationFrame(renderMarginNotes))}
// The temporary settings panel delegates reader text size to this existing persistent control.
window.addEventListener('lc-preview-font-request',event=>{
 if(!debugProfile)return;
 const value=String(event.detail?.value||'');const n=Number.parseFloat(value);
 if(Number.isFinite(n)&&/^[0-9.]+rem$/.test(value))setFont(n);
});
function setWidths(){
 document.body.classList.toggle('reader-wide',readingWide);
 document.body.classList.toggle('panels-wide',panelsWide);
 $('width-toggle').setAttribute('aria-pressed',String(readingWide));
 $('panels-toggle').setAttribute('aria-pressed',String(panelsWide));
 // CSS layout and line wrapping settle asynchronously after a width change.
 scheduleMarginNotes();requestAnimationFrame(()=>requestAnimationFrame(renderMarginNotes));
}
$('width-toggle').onclick=()=>{readingWide=!readingWide;save(viewKey(':readingWide'),readingWide);setWidths()};
$('panels-toggle').onclick=()=>{panelsWide=!panelsWide;save(viewKey(':panelsWide'),panelsWide);setWidths()};
const textSearch=d=>{if(!searchIndex[d.id]){const div=document.createElement('div');div.innerHTML=d.html;searchIndex[d.id]=(d.title+' '+div.textContent).toLocaleLowerCase('de')}return searchIndex[d.id]};
function setMenu(open){
  if(open)setToc(false);
  const active=!!open&&window.matchMedia('(max-width:760px)').matches;
  $('sidebar').classList.toggle('show',active);document.body.classList.toggle('nav-open',active);
  $('menu').setAttribute('aria-expanded',active?'true':'false');
  $('sidebar').setAttribute('role',active?'dialog':'complementary');
  if(active){$('sidebar').setAttribute('aria-modal','true');$('close-menu').focus()}
  else{$('sidebar').removeAttribute('aria-modal')}
  updateBackdrop();
}
function updateBackdrop(){
 const shown=$('sidebar').classList.contains('show')||$('toc').classList.contains('is-open');
 $('overlay-backdrop').classList.toggle('is-open',shown);
}
function setToc(open){
 const active=!!open&&window.matchMedia('(max-width:1120px)').matches;
 $('toc').classList.toggle('is-open',active);
 $('toc-toggle').setAttribute('aria-expanded',active?'true':'false');
 document.body.classList.toggle('toc-open',active);
 if(active){$('toc').setAttribute('role','dialog');$('toc').setAttribute('aria-modal','true');$('close-right').focus()}
 else{$('toc').setAttribute('role','complementary');$('toc').removeAttribute('aria-modal')}
 updateBackdrop();updateFavoriteButton();
}
function closeOverlays(){const wasMenu=$('sidebar').classList.contains('show'),wasToc=$('toc').classList.contains('is-open');setMenu(false);setToc(false);if(wasMenu)$('menu').focus();else if(wasToc)$('toc-toggle').focus()}

function nav(){
 const searchable=allDocs();
 const items=searchable.filter(d=>!searchTerm||textSearch(d).includes(searchTerm));
 const groups=new Map();for(const d of items){const group=d.group;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(d)}
 $('groups').replaceChildren();
 for(const [group,docs] of groups){
  const details=document.createElement('details');details.open=!!searchTerm||docs.some(d=>d.id===current?.id);
  const summary=document.createElement('summary');summary.textContent=group+' ('+docs.length+')';details.append(summary);
  // Close other groups upon activation, not on subsequent lesson navigation.
  summary.addEventListener('click',()=>{if(!details.open)for(const other of $('groups').querySelectorAll(':scope > details[open]'))if(other!==details)other.open=false});
  for(const d of docs){
   const btn=document.createElement('button');btn.type='button';btn.className='nav-item'+(current?.id===d.id?' active':'');
   btn.setAttribute('aria-current',current?.id===d.id?'page':'false');btn.title=d.title;
   const tick=document.createElement('span');tick.className='tick';tick.textContent=read[d.id]?'✓':'•';
   const label=document.createElement('span');label.textContent=d.title;btn.append(tick,label);
   btn.onclick=()=>openDoc(d.id);details.append(btn);
  }$('groups').append(details)
 }
 $('search-feedback').textContent=searchTerm?tr('side.found',{count:items.length,term:searchTerm}):'';
 if(!items.length){const e=document.createElement('div');e.className='empty';e.textContent=tr('side.none');$('groups').append(e)}
 const completed=allDocs().filter(x=>read[x.id]).length,total=allDocs().length;
 $('progress').textContent=tr('side.read',{count:completed,total});
 renderFavorites();
}
// Visible chapter numbers are derived from document order, not from permanent section IDs.
// Sources are intentionally unnumbered but remain reachable via the right TOC.
const isSourcesHeading=(h,doc=current)=>h.id==='quellen'||/^quellen(?:-|$)/i.test(h.id)||Object.entries(doc?.section_aliases||{}).some(([old,id])=>id===h.id&&/^quellen(?:-|$)/i.test(old))||/^(?:quellen|sources)(?:\s|$)/i.test(h.textContent.trim());
// One chapter list for both in-lesson and right-hand contents. Keep Sources last.
const lessonContentsHeadings=article=>{
 const all=[...article.querySelectorAll('h2[id],h3[id],h4[id]')].filter(h=>
  !h.closest('nav,aside,details,.quellen-stand'));
 return [...all.filter(h=>!isSourcesHeading(h)),...all.filter(h=>isSourcesHeading(h))];
};
function numberChapterHeadings(article,doc=current){
 const counters={H2:0,H3:0,H4:0};
 for(const h of article.querySelectorAll('h2[id],h3[id],h4[id]')){
  if(h.closest('nav,aside,details')||isSourcesHeading(h,doc))continue;
  const level=h.tagName;
  if(level==='H2'){counters.H2++;counters.H3=0;counters.H4=0}
  else if(level==='H3'){if(counters.H2===0)continue;counters.H3++;counters.H4=0}
  else {if(counters.H3===0)continue;counters.H4++}
  const number=level==='H2'?String(counters.H2):level==='H3'?`${counters.H2}.${counters.H3}`:`${counters.H2}.${counters.H3}.${counters.H4}`;
  h.dataset.sectionNumber=number;
  let span=h.querySelector(':scope > .section-number');
  if(!span){span=document.createElement('span');span.className='section-number';h.prepend(span)}
  // Retain the source heading/anchor; suppress only an identical full hierarchy prefix.
  if(span.nextSibling?.nodeType===Node.TEXT_NODE){
   const prefix=span.nextSibling.textContent.match(/^\s*(\d+(?:\.\d+)*)(?:\.)?\s+/);
   if(prefix&&prefix[1]===number)span.nextSibling.textContent=span.nextSibling.textContent.slice(prefix[0].length);
  }
  span.removeAttribute('style');span.removeAttribute('aria-hidden');span.textContent=number+'. ';
 }
}

// Reader-only presentation additions. Fachtext, IDs and Markdown stay untouched.
function enhanceLessonPresentation(){
 const article=$('reader').querySelector('.lesson-standard');
 if(!article)return;
 const h1=article.querySelector('h1');
 if(!h1)return;
 // Separate the displayed M/L code without the redundant separator. Preserve the title,
 // source document ID and original lesson HTML.
 if(h1.childNodes.length===1&&h1.firstChild.nodeType===Node.TEXT_NODE){
  const heading=h1.textContent.match(/^(M\d+-L\d+)(\s*[–-]\s*)(.+)$/);
  if(heading){
   const number=document.createElement('span');number.className='lesson-number';number.textContent=heading[1];
   h1.replaceChildren(number,document.createTextNode(" "+heading[3]));
  }
 }
 numberChapterHeadings(article);
 // Use the actual semantic header to make the "Lektion" column keep short labels on one line.
  for(const tbl of document.querySelectorAll('#reader table')){
   const first=tbl.querySelector('thead th');
   if(first?.textContent.trim()==='Lektion')tbl.classList.add('lc-lesson-table');
  }
 // Move the existing four/five introductory metadata paragraphs into a compact panel.
 const accepted=new Set(['Kursbereich','Niveau','Vorwissen','Einordnung','Lernziel']);
 const meta=[];
 let next=h1.nextElementSibling;
 while(next&&next.tagName==='P'&&meta.length<5){
  const strong=next.firstElementChild;
  const label=strong?.tagName==='STRONG'?strong.textContent.trim().replace(/:$/,''):'';
  if(!accepted.has(label))break;
  meta.push(next);next=next.nextElementSibling;
 }
 if(meta.length>=2){
  const panel=document.createElement('div');panel.className='lesson-meta';
  h1.after(panel);for(const p of meta)panel.append(p);
  if(current?.lesson){const legend=document.createElement('p');legend.className='lesson-notation';legend.textContent=tr('reader.ml-legend');panel.append(legend);}
 }
 // Highlight stand-alone block formulas without touching inline formulas in prose or tables.
 for(const formula of article.querySelectorAll('p > math[display="block"]')){
  const p=formula.parentElement;
  if(p.children.length===1&&!Array.from(p.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())){
   p.classList.add('formula-box');
  }
 }
 // Restore the original in-lesson collapsible contents overview from live headings.
 const headings=lessonContentsHeadings(article);
 if(!headings.length)return;
 const details=document.createElement('details');details.className='lesson-contents';
 const summary=document.createElement('summary');summary.textContent=tr('reader.toc');details.append(summary);
 const nav=document.createElement('nav');nav.setAttribute('aria-label',tr('reader.toc'));
 const ul=document.createElement('ul');ul.className='lesson-contents-list';
 for(const h of headings){
  const li=document.createElement('li');
  if(isSourcesHeading(h))li.className='toc-sources';
  else if(h.tagName==='H3')li.className='toc-h3';else if(h.tagName==='H4')li.className='toc-h4';
  const a=document.createElement('a');a.href=docHash(current.id,h.id);a.dataset.navLevel=h.tagName.toLowerCase();
  a.textContent=isSourcesHeading(h)?h.textContent.replace(/^\s*[0-9.]+\s*/, '').trim():(h.textContent.trim()||tr('reader.section'));
  a.onclick=e=>{e.preventDefault();navigateAnchor(h.id)};
  li.append(a);ul.append(li);
 }
 nav.append(ul);details.append(nav);
 (article.querySelector('.lesson-meta')||h1).after(details);
}
function toc(){
 const el=$('toc-content');el.replaceChildren();const article=$('reader').querySelector('.lesson-standard');
 const headings=article?lessonContentsHeadings(article).filter(h=>
  isSourcesHeading(h)||!!h.querySelector('.section-number')):
  [...$('reader').querySelectorAll('h2,h3,h4')];
 if(!headings.length)return;
 const head=document.createElement('div');head.className='toc-head';const strong=document.createElement('strong');strong.textContent=tr('reader.in_chapter');head.append(strong);el.append(head);
 for(const h of headings.slice(0,90)){
  const a=document.createElement('a');a.href=docHash(current.id,h.id);a.dataset.navLevel=h.tagName.toLowerCase();
  const sourceHeading=isSourcesHeading(h), number=sourceHeading?null:h.querySelector('.section-number');
  if(number){
   const marker=document.createElement('span');marker.className='toc-number';marker.textContent=number.textContent.trim();
   const label=document.createElement('span');label.className='toc-label';
   const copy=h.cloneNode(true);copy.querySelector('.section-number').remove();
   label.textContent=copy.textContent.trim()||tr('reader.section');
   a.append(marker,document.createTextNode(' '),label);
  }else a.textContent=sourceHeading?h.textContent.replace(/^\s*[0-9.]+\s*/, '').trim():(h.textContent||tr('reader.section'));
  if(isSourcesHeading(h))a.className='toc-sources';
  else if(h.tagName==='H3'||h.tagName==='H4')a.className='subheading';
  a.onclick=e=>{e.preventDefault();setToc(false);navigateAnchor(h.id)};el.append(a)
 }
}
function syncHash(id,anchor,mode){
 if(mode==='none')return;
 const path=docHash(id,anchor);
 const next=new URL(path,location.href),prior=new URLSearchParams(location.search);
 
 if(mode==='replace'&&prior.has('lc_return_y'))next.searchParams.set('lc_return_y',prior.get('lc_return_y'));
 const address=next.search+next.hash;
 if(location.search+location.hash===address)return;
 try{
  if(mode==='replace')history.replaceState(null,'',address);
  else history.pushState(null,'',address);
 }catch(_){
  // Some file:// implementations deny changing the query via History API.
  if(mode==='replace')location.replace(next.href);else location.assign(next.href);
 }
}
function navigateAnchor(anchor){
 if(!current)return;
 if(anchor!=='__lektion__'&&!document.getElementById(anchor))return;
 menuAnchor=anchor;syncHash(current.id,anchor,'push');scrollToAnchor(anchor);updateMenuSelection()
}
function openDoc(id,anchor=null,mode='push'){
 id=normalizeDocId(id);
 const targetCourse=courseFor(id);
 if(targetCourse&&targetCourse!==course){course=targetCourse;searchIndex={};searchTerm='';$('search').value='';}
 const d=getDoc(id)||allDocs()[0];if(!d)return;
 const changed=current?.id!==d.id;
 current=d;
 anchor=canonicalAnchor(d.id,anchor);
 if(changed){
  $('reader').innerHTML=d.html; $('reader').lang=window.LERNKURS_KONFIGURATION.sprache;
  window.LernkursTheme?.updateLinks();
  enhanceLessonPresentation();
  for(const link of $('reader').querySelectorAll('a[href^="https://"],a[href^="http://"]')){
   link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
  }
  injectSectionActions();
  $('crumb').textContent=course.title+' / '+d.group;$('course-label').textContent=course.title.replace('Lernkurs – ','Lernkurs ');
  document.title=d.title+' – Lernkurs Reader';
  toc();nav();if($('note-dialog').open)$('note-dialog').close();renderNotes();renderBookmarks();requestAnimationFrame(renderMarginNotes);
 }
 const i=allDocs().indexOf(d);$('previous').disabled=i<=0;$('next').disabled=i>=allDocs().length-1;
 $('done').disabled=false;
 $('done').textContent=read[d.id]?tr('reader.mark_unread'):tr('reader.mark_read');
 $('done').setAttribute('aria-pressed',read[d.id]?'true':'false');
 updateFavoriteButton();
 setMenu(false);setToc(false);
 save(lastDocKey,d.id);
 save(':lastDoc',d.id); // Maintain compatibility with earlier Reader versions.
 if(anchor&&anchor!=='__lektion__'&&!document.getElementById(anchor))anchor=null;
 menuAnchor=anchor;syncHash(d.id,anchor,mode);
 scrollToAnchor(anchor);updateMenuSelection();
 if(changed&&mode==='push')$('reader').focus({preventScroll:true});
}
function followLocation(){
 const p=paramsFromHash(),route=routeFromHash();
 const wanted=p.get('theme')==='dark'?'dark':'light';
 if(theme!==wanted)setTheme(wanted);
 // Replace only the current history entry: normalize legacy/invalid anchors without adding history.
 if(route.id&&courseFor(route.id))openDoc(route.id,route.section,'replace');
 else if(current)syncHash(current.id,null,'replace');
}


const knownDocs=new Map(DATA.courses.flatMap(c=>c.docs).map(d=>[d.id,d]));
// Document classification affects navigation only, never reader user actions.
const isCourseDocument=id=>knownDocs.has(id);
// Resolve document-scoped legacy headings before validating canonical bookmark IDs.
// Object prototype names must never be interpreted as aliases.
const canonicalAnchor=(id,anchor)=>{
 const aliases=knownDocs.get(id)?.section_aliases;
 return aliases&&Object.prototype.hasOwnProperty.call(aliases,anchor)?aliases[anchor]:anchor;
};
const uniqueIds=values=>[...new Set(values.filter(v=>typeof v==='string').map(normalizeDocId).filter(isCourseDocument))];
const validBookmarks=values=>{
 const seen=new Set(),valid=[];
 for(const v of values){
  if(!v||typeof v!=='object'||!isCourseDocument(normalizeDocId(v.lesson_id))||typeof v.anchor!=='string'||v.anchor.length>4096||typeof v.title!=='string'||v.title.length>240)continue;
  const id=normalizeDocId(v.lesson_id),anchor=canonicalAnchor(id,v.anchor);if(typeof anchor!=='string'||!/^[a-zA-Z0-9_\-:.]{1,180}$/.test(anchor))continue;const key=id+'|'+anchor;if(seen.has(key))continue;seen.add(key);valid.push({lesson_id:id,anchor,title:v.title});
 }return valid;
};
const validNotes=values=>values.filter(v=>v&&typeof v==='object'&&typeof v.id==='string'&&v.id.length<=120&&isCourseDocument(normalizeDocId(v.lesson_id))&&typeof v.text==='string'&&v.text.length<=20000&&typeof v.anchor==='string'&&v.anchor.length<=180&&typeof v.section_title==='string'&&v.section_title.length<=240&&typeof v.created==='string'&&typeof v.updated==='string'&&(v.quote==null||(typeof v.quote==='string'&&v.quote.length<=1200))&&(v.position==null||(typeof v.position==='string'&&(/^(p:[0-9]{1,5}|)$/.test(v.position))))).map(v=>({...v,lesson_id:normalizeDocId(v.lesson_id),anchor:canonicalAnchor(normalizeDocId(v.lesson_id),v.anchor)}));
 // Compatibility: the unsplit legacy courses retain their original storage keys.
// New course keys are distinct. The import is an additive copy; originals remain intact.
const legacyCourseId=previousCourseId(COURSE_ID);
function migrateItems(suffix,validate){
 const key=suffix+COURSE_ID, marker=':legacy-items-copied:'+key;
 const existing=load(key,[]);
 const copied=load(marker,false)===true;
 const historical=(copied||legacyCourseId===COURSE_ID)?[]:load(suffix+legacyCourseId,[]);
 const items=validate([...(Array.isArray(existing)?existing:[]),...(Array.isArray(historical)?historical:[])]);
 // Commit each collection before marking it copied. Do not touch historical keys.
 // A later deletion/edit in the canonical collection must survive a reload.
 if(!copied&&legacyCourseId!==COURSE_ID&&save(key,items))save(marker,true);
 return items;
}
function uniqueNotes(values){
 const seen=new Set();return validNotes(values).filter(n=>{if(seen.has(n.id))return false;seen.add(n.id);return true});
}
favorites=migrateItems(':favorites:',uniqueIds);
bookmarks=migrateItems(':bookmarks:',validBookmarks);
notes=migrateItems(':notes:',uniqueNotes);

function updateFavoriteButton(){
 const on=!!current&&favorites.includes(current.id);
 $('favorite-toggle').disabled=!current;
 $('favorite-toggle').textContent=on?'★ '+tr('reader.favorite'):'☆ '+tr('reader.favorite');
 $('favorite-toggle').setAttribute('aria-pressed',on?'true':'false');
 $('favorite-toggle').title=tr(on?'notes.favorite_remove':'notes.favorite_add');
}
// Keep individual collection changes instead of replacing another tab's snapshot.
// This is read/merge/write, not a transaction across simultaneous browser writes.
function collectionSync(key,initial,identify,validate){
 const copy=values=>JSON.parse(JSON.stringify(values));
 const snapshot=values=>validate(Array.isArray(values)?values:[]);
 const map=values=>new Map(snapshot(values).map(v=>[identify(v),v]));
 let baseline=map(copy(initial));
 const pending=new Map();
 const stored=map(load(key,initial));
 // Preserve any failed initial legacy copy until the next successful save.
 for(const [id,value] of baseline)if(!stored.has(id))pending.set(id,value);
 function refresh(fallback=[...baseline.values()]){
  const next=map(load(key,fallback));
  for(const [id,value] of pending){if(value===null)next.delete(id);else next.set(id,value)}
  baseline=map(copy([...next.values()]));
  return copy([...baseline.values()]);
 }
 function commit(values){
  const desired=map(copy(values));
  for(const id of baseline.keys())if(!desired.has(id))pending.set(id,null);
  for(const [id,value] of desired){
   if(!baseline.has(id)||JSON.stringify(baseline.get(id))!==JSON.stringify(value))pending.set(id,value);
  }
  const items=refresh();
  const persisted=save(key,items);if(persisted)pending.clear();
  return {items,persisted};
 }
 function reset(){baseline=new Map();pending.clear()}
 return {refresh,commit,reset};
}
const collectionStates=new Map([
 [favoritesKey,collectionSync(favoritesKey,favorites,x=>x,uniqueIds)],
 [bookmarksKey,collectionSync(bookmarksKey,bookmarks,x=>x.lesson_id+'|'+x.anchor,validBookmarks)],
 [notesKey,collectionSync(notesKey,notes,x=>x.id,uniqueNotes)]
]);
function collectionValues(key,items){
 if(key===favoritesKey)favorites=items;
 else if(key===bookmarksKey)bookmarks=items;
 else if(key===notesKey)notes=items;
}
function refreshCollection(key,cleared=false){
 collectionValues(key,collectionStates.get(key).refresh(cleared?[]:undefined));
}
function persistCollection(key,items){
 const result=collectionStates.get(key).commit(items);collectionValues(key,result.items);return result.persisted;
}
function refreshReaderCollections(cleared=false){
 for(const key of collectionStates.keys())refreshCollection(key,cleared);
}
function toggleDropDown(name){
 if(name==='favorites')renderFavorites();else renderBookmarks();
 for(const type of ['favorites','bookmarks']){
  const open=type===name&&$(type+'-menu').hidden;
  $(type+'-menu').hidden=!open;
  $(type+'-menu-toggle').setAttribute('aria-expanded',String(open));
 }
}
$('favorites-menu-toggle').onclick=()=>toggleDropDown('favorites');
$('bookmarks-menu-toggle').onclick=()=>toggleDropDown('bookmarks');
// Outside click and Escape dismiss menus; clicks in the menu keep it open for multiple removals.
function closeDropDowns(){
 for(const type of ['favorites','bookmarks']){
  $(type+'-menu').hidden=true;
  $(type+'-menu-toggle').setAttribute('aria-expanded','false');
 }
}
document.addEventListener('pointerdown',event=>{
 if(!event.target.closest('.header-dropdown'))closeDropDowns();
});
// One geometry and icon for every removable dropdown entry.
function dropdownRemove(label, title, remove){
 const button=document.createElement('button');button.type='button';button.className='dropdown-remove';button.title=title;button.setAttribute('aria-label',label);
 button.innerHTML=window.LC_ICON('close');button.onclick=remove;return button;
}
let menuAnchor=null;
function updateMenuSelection(){
 for(const row of document.querySelectorAll('.header-dropdown-list [data-target-doc]')){
  const active=row.dataset.targetDoc===current?.id&&(!row.dataset.targetAnchor||row.dataset.targetAnchor===(menuAnchor||'__lektion__'));
  row.classList.toggle('dropdown-selected',active);
  const button=row.querySelector('.dropdown-entry');if(button){if(active)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');}
 }
}
function dropdownRow(list,label,go,remove,id,anchor){
 const row=document.createElement('div');row.className='dropdown-row';row.dataset.targetDoc=id;if(anchor)row.dataset.targetAnchor=anchor;
 const btn=document.createElement('button');btn.className='dropdown-entry';btn.type='button';btn.textContent=label;
 btn.onclick=()=>{go();const menu=btn.closest('.header-dropdown-list');if(menu){menu.hidden=true;const type=menu.id.replace('-menu','');$(type+'-menu-toggle').setAttribute('aria-expanded','false')}};
 const x=dropdownRemove(tr('notes.remove_named',{title:label}),tr('notes.remove_entry'),remove);
 row.append(btn,x);list.append(row);updateMenuSelection();
}
function renderFavorites(){
 const list=$('favorites-menu');list.replaceChildren();$('favorites-count').textContent='('+favorites.length+')';
 if(!favorites.length){const e=document.createElement('span');e.className='dropdown-empty';e.textContent=tr('notes.no_favorites');list.append(e);return}
 for(const id of favorites){const d=knownDocs.get(id);if(!d)continue;
  dropdownRow(list,d.title,()=>openDoc(id),()=>{favorites=favorites.filter(x=>x!==id);persistCollection(favoritesKey,favorites);renderFavorites();updateFavoriteButton()},id);
 }
}
function sortedBookmarks(){
 const order=new Map(allDocs().map((d,i)=>[d.id,i]));
 const anchors=new Map();
 for(const b of bookmarks){if(!anchors.has(b.lesson_id)){
  const d=knownDocs.get(b.lesson_id),div=document.createElement('div');div.innerHTML=d?.html||'';
  anchors.set(b.lesson_id,[...div.querySelectorAll('h2[id],h3[id],h4[id]')].map(h=>h.id));
 }}
 return [...bookmarks].sort((a,b)=>(order.get(a.lesson_id)??999)-(order.get(b.lesson_id)??999) || (a.anchor==='__lektion__'?-1:anchors.get(a.lesson_id).indexOf(a.anchor))-(b.anchor==='__lektion__'?-1:anchors.get(b.lesson_id).indexOf(b.anchor)));
}
// Derive display labels from the same heading-numbering routine as the document.
const sectionLabelCache=new WeakMap();
function documentSectionLabels(lessonId){
 const d=knownDocs.get(lessonId);if(!d)return new Map();
 if(sectionLabelCache.has(d))return sectionLabelCache.get(d);
 const holder=document.createElement('div');holder.innerHTML=d.html||'';
 const article=holder.querySelector('.lesson-standard')||holder;
 numberChapterHeadings(article,d);
 const labels=new Map();let chapter={id:'',title:''};
 for(const h of article.querySelectorAll('h2[id],h3[id],h4[id]')){
  if(h.closest('nav,aside,details,.quellen-stand'))continue;
  const title=h.textContent.trim();
  if(h.tagName==='H2')chapter={id:h.id,title};
  labels.set(h.id,{...chapter,own:h.tagName==='H2',label:title});
 }
 sectionLabelCache.set(d,labels);return labels;
}
function bookmarkChapter(lessonId,anchor){
 return documentSectionLabels(lessonId).get(anchor)||{id:anchor,title:'',own:true,label:''};
}
function renderBookmarks(){
 const list=$('bookmarks-menu');list.replaceChildren();$('bookmarks-count').textContent='('+bookmarks.length+')';
 if(!bookmarks.length){const e=document.createElement('span');e.className='dropdown-empty';e.textContent=tr('notes.no_bookmarks');list.append(e);return}
 let previousLesson='',previousChapter='';
 const sorted=sortedBookmarks();
 const bookmarkedChapters=new Set(sorted.filter(b=>bookmarkChapter(b.lesson_id,b.anchor).own).map(b=>b.lesson_id+'|'+b.anchor));
 for(const b of sorted){
  const d=knownDocs.get(b.lesson_id),chapter=bookmarkChapter(b.lesson_id,b.anchor);
  if(previousLesson!==b.lesson_id){
   const head=document.createElement('div');head.className='bookmark-course'+(previousLesson?' bookmark-group-divider':'');
   const h1Bookmarked=sorted.some(x=>x.lesson_id===b.lesson_id&&x.anchor==='__lektion__');
   if(h1Bookmarked){
    head.classList.add('bookmark-course-link');head.dataset.targetDoc=b.lesson_id;head.dataset.targetAnchor='__lektion__';
    const goto=document.createElement('button');goto.type='button';goto.className='dropdown-entry';goto.textContent=d?.title||b.lesson_id;
    goto.title=tr('notes.bookmark_lesson');goto.onclick=()=>{openDoc(b.lesson_id,'__lektion__');closeDropDowns()};
    const remove=dropdownRemove(tr('notes.bookmark_lesson_remove'),tr('notes.bookmark_lesson_remove'),()=>{bookmarks=bookmarks.filter(x=>!(x.lesson_id===b.lesson_id&&x.anchor==='__lektion__'));persistCollection(bookmarksKey,bookmarks);renderBookmarks();updateSectionActions()});
    head.append(goto,remove);
   }else {head.classList.add('bookmark-course-context');head.textContent=d?.title||b.lesson_id;}
   list.append(head);
   previousLesson=b.lesson_id;previousChapter='';
  }
  if(b.anchor==='__lektion__')continue; // H1 is the removable heading itself.
  const chapterKey=b.lesson_id+'|'+chapter.id;
  if(!chapter.own&&chapterKey!==previousChapter&&!bookmarkedChapters.has(chapterKey)){
   const head=document.createElement('div');head.className='bookmark-chapter bookmark-chapter-context';head.textContent=chapter.title;list.append(head);
  }
  previousChapter=chapterKey;
  const item=document.createElement('div');item.className='bookmark-item'+(!chapter.own?' bookmark-subitem':'');list.append(item);
  dropdownRow(item,chapter.label||b.title,()=>openDoc(b.lesson_id,b.anchor),()=>{
   bookmarks=bookmarks.filter(x=>!(x.lesson_id===b.lesson_id&&x.anchor===b.anchor));persistCollection(bookmarksKey,bookmarks);renderBookmarks();updateSectionActions();
  },b.lesson_id,b.anchor);
 }
 updateMenuSelection();
}

function toggleBookmark(anchor,title){
 if(!current)return;
 const has=bookmarks.some(b=>b.lesson_id===current.id&&b.anchor===anchor);
 bookmarks=has?bookmarks.filter(b=>!(b.lesson_id===current.id&&b.anchor===anchor)):[...bookmarks,{lesson_id:current.id,anchor,title}];
 persistCollection(bookmarksKey,bookmarks);renderBookmarks();updateSectionActions();
}
function icon(name){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 path.setAttribute('d',name==='bookmark'?'M6 4.5h12v16l-6-4-6 4z':'M12 20h9M14 4l6 6M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11L4 20z');
 svg.append(path);return svg;
}
function sectionHeadings(){const article=$('reader').querySelector('.lesson-standard');return article?lessonContentsHeadings(article).filter(h=>!!h.querySelector('.section-number')||isSourcesHeading(h)):[]}
function injectSectionActions(){
 if(!current)return;
 const h1=$('reader').querySelector('h1');
 if(h1&&!h1.querySelector('.section-tools')){
  h1.classList.add('section-head');
  const text=document.createElement('span');text.className='section-title-inner';while(h1.firstChild)text.append(h1.firstChild);h1.append(text);
  const actions=document.createElement('span');actions.className='section-tools';
  const mark=document.createElement('button');mark.type='button';mark.className='section-bookmark';mark.dataset.anchor='__lektion__';mark.title=tr('notes.bookmark_lesson');mark.append(icon('bookmark'));
  mark.onclick=()=>toggleBookmark('__lektion__',current.title);
  const note=document.createElement('button');note.type='button';note.className='section-note';note.title=tr('notes.note_lesson');note.setAttribute('aria-label',tr('notes.note_doc'));note.append(icon('pen'));note.onclick=()=>openNoteEditor('');actions.append(mark,note);h1.append(actions);
 }
 for(const h of sectionHeadings()){
  if(h.querySelector('.section-tools'))continue;
  h.classList.add('section-head');const text=document.createElement('span');text.className='section-title-inner';while(h.firstChild)text.append(h.firstChild);h.append(text);
  const actions=document.createElement('span');actions.className='section-tools';
  const mark=document.createElement('button');mark.type='button';mark.className='section-bookmark';mark.dataset.anchor=h.id;mark.title=tr('notes.bookmark_section');mark.append(icon('bookmark'));
  mark.onclick=()=>toggleBookmark(h.id,text.textContent.replace(/^\s*\d+(?:\.\d+)*\.?\s*/, '').trim());
  const note=document.createElement('button');note.type='button';note.className='section-note';note.title=tr('notes.note_section');note.setAttribute('aria-label',tr('notes.note_to',{title:h.textContent.trim()}));note.append(icon('pen'));
  note.onclick=()=>openNoteEditor(h.id);
  actions.append(mark,note);h.append(actions);
 }
 updateSectionActions();
}
function updateSectionActions(){
 for(const b of $('reader').querySelectorAll('.section-bookmark')){
  const active=!!current&&bookmarks.some(x=>x.lesson_id===current.id&&x.anchor===b.dataset.anchor);
  b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-label',tr(active?'notes.bookmark_remove':'notes.bookmark_add'));
 }
 for(const b of $('reader').querySelectorAll('.section-note')){
  const parent=b.closest('h1,h2[id],h3[id],h4[id]');const anchor=parent?.tagName==='H1'?'':parent?.id;const count=notes.filter(x=>x.lesson_id===current?.id&&x.anchor===anchor).length;
  b.classList.toggle('has-note',count>0);b.setAttribute('aria-label',(count?tr('notes.in_section',{count,title:(parent?.querySelector('.section-title-inner')?.textContent||tr('reader.section')).trim()})+'; ':'')+tr('notes.note_to',{title:(parent?.querySelector('.section-title-inner')?.textContent||tr('reader.section')).trim()}));
 }
}
$('favorite-toggle').onclick=()=>{
 if(!current)return;
 const id=current.id;
 favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
 persistCollection(favoritesKey,favorites);updateFavoriteButton();renderFavorites();
 // Keine Meldung im Lesetext: Stern und Favoritenzähler zeigen den Zustand unmittelbar an.
};
function setRightTab(which){
 rightTab=which==='notes'?'notes':'contents';
 $('tab-contents').setAttribute('aria-selected',rightTab==='contents'?'true':'false');
 $('tab-notes').setAttribute('aria-selected',rightTab==='notes'?'true':'false');
 $('toc-content').hidden=rightTab!=='contents';$('notes-section').hidden=rightTab!=='notes';
 $('toc').classList.toggle('notes-view',rightTab==='notes');
 updateFavoriteButton();requestAnimationFrame(renderMarginNotes);
}
$('tab-contents').onclick=()=>setRightTab('contents');
$('tab-notes').onclick=()=>{setRightTab('notes');renderNotes()};
$('close-right').onclick=closeOverlays;
function showQuote(){
 $('note-quote-wrap').hidden=!pendingQuote;$('note-quote').value=pendingQuote;
}
$('note-quote-clear').onclick=()=>{pendingQuote='';showQuote()};
function noteSectionTitle(anchor){
 if(!anchor)return tr('reader.note_location');
 const h=[...$('reader').querySelectorAll('h2[id],h3[id],h4[id]')].find(h=>h.id===anchor);
 return h?.querySelector('.section-title-inner')?.textContent.trim()||h?.textContent.trim()||(tr('reader.section')+' '+anchor);
}
function openNoteEditor(anchor='',quote='',position=''){
 editingNoteId=null;pendingQuote=quote.slice(0,1200);pendingQuoteAnchor=anchor;pendingPosition=position;
 $('note-text').value='';$('note-dialog-feedback').textContent='';
 $('note-dialog-title').textContent=tr('notes.add');
 $('note-dialog-location').textContent=current?.title+' · '+noteSectionTitle(anchor);
 showQuote();
 const dialog=$('note-dialog');if(!dialog.open)dialog.showModal();$('note-text').focus();
}
function editNoteById(id){
 const n=notes.find(x=>x.id===id);if(!n)return;
 openNoteEditor(n.anchor,n.quote||'',n.position||'');editingNoteId=id;$('note-text').value=n.text;
 $('note-dialog-title').textContent=tr('notes.edit');$('note-dialog-location').textContent=(knownDocs.get(n.lesson_id)?.title||current?.title||tr('reader.note_location'))+' · '+(n.section_title||tr('reader.note_location'));
}
$('note-cancel').onclick=$('note-cancel-x').onclick=()=>$('note-dialog').close();
$('note-dialog').addEventListener('close',()=>{editingNoteId=null;pendingQuote='';pendingPosition=''});
function noteCard(n){
 const card=document.createElement('div');card.className='margin-note';
 const tools=document.createElement('div');tools.className='note-tools';
 // Reserve button space only in the lesson-title row. The section spans the card.
 const headingLabel=document.createElement('span');headingLabel.className='note-section-title';
 headingLabel.textContent=knownDocs.get(n.lesson_id)?.title||current?.title||tr('reader.note_location');
 headingLabel.title=headingLabel.textContent;
 tools.append(headingLabel);
 const makeAction=(icon,key,action)=>{const b=document.createElement('button');b.type='button';b.className='note-action';b.innerHTML=window.LC_ICON(icon);b.title=tr(key);b.setAttribute('aria-label',tr(key));b.onclick=action;return b};
 const edit=makeAction('edit','notes.edit',()=>editNoteById(n.id));
 const copy=makeAction('copy','notes.copy',async()=>{
  let ok=false;
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(n.text);ok=true}}catch(_){}
  if(!ok){const area=document.createElement('textarea');area.className='sr-only';area.value=n.text;document.body.append(area);area.select();try{ok=document.execCommand('copy')}catch(_){}area.remove();copy.focus()}
  const feedback=$('note-feedback');feedback.textContent=tr(ok?'notes.copied':'notes.copy_failed');copy.title=feedback.textContent;copy.setAttribute('aria-label',feedback.textContent);
 });
 const del=makeAction('close','notes.delete',()=>{
  if(!window.confirm(tr('notes.confirm_delete')))return;
  notes=notes.filter(x=>x.id!==n.id);persistCollection(notesKey,notes);renderNotes();updateSectionActions();renderMarginNotes();
 });
 const buttons=document.createElement('div');buttons.className='note-button-group';buttons.append(edit,copy,del);tools.append(buttons);card.append(tools);
 if(n.anchor){const section=document.createElement('div');section.className='note-chapter-title';section.textContent=documentSectionLabels(n.lesson_id).get(n.anchor)?.label||n.section_title||tr('reader.section');card.append(section);}
 const divider=document.createElement('hr');divider.className='note-divider';card.append(divider);
 if(n.quote){const q=document.createElement('div');q.className='note-quote-box';q.textContent=n.quote;card.append(q)}
 const p=document.createElement('p');p.textContent=n.text;card.append(p);return card;
}
let notesRaf=0;
function scheduleMarginNotes(){if(!notesRaf)notesRaf=requestAnimationFrame(()=>{notesRaf=0;renderMarginNotes()})}
function renderMarginNotes(){
 const track=$('notes-track');if(!track)return;
 const formerScroll=new Map([...track.querySelectorAll('.note-group')].map(g=>[g.dataset.anchor,g.scrollTop]));
 track.replaceChildren();
 if(!current||rightTab!=='notes')return;
 const subset=notes.filter(n=>n.lesson_id===current.id);
 if(!subset.length)return;
 const desktop=window.innerWidth>1120;
 const viewportTop=track.getBoundingClientRect().top,viewportHeight=track.clientHeight;
 const headingPositions=[...$('reader').querySelectorAll('h1,h2[id],h3[id],h4[id]')]
  .filter(h=>h.tagName==='H1'||!h.closest('nav,aside,details'))
  .map(h=>h.getBoundingClientRect().top-viewportTop).sort((a,b)=>a-b);
 const grouped=new Map();
 for(const n of subset){const key=n.anchor||'__lektion__';if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(n)}
 const items=[];
 for(const [anchor,entries] of grouped){
  const target=(anchor!=='__lektion__'&&document.getElementById(anchor))||$('reader').querySelector('h1')||$('reader');
  const y=target.getBoundingClientRect().top-viewportTop;
  items.push({y,entries,anchor});
 }
 items.sort((a,b)=>a.y-b.y);
 for(let i=0;i<items.length;i++){
  const item=items[i],next=items[i+1];
  const group=document.createElement('div');group.className='note-group';group.dataset.anchor=item.anchor;
  group.setAttribute('aria-label',tr('notes.in_section',{count:item.entries.length,title:item.entries[0].section_title||tr('reader.note_location')}));
  for(const n of item.entries)group.append(noteCard(n));
  track.append(group);
  if(desktop){
   // Every group is anchored to its own heading. Never shift a later note below a long earlier note.
   // The logical section ends at the next heading or the next note, whichever comes first.
   const nextHeading=headingPositions.find(y=>y>item.y+2);
   // The final section (Quellen) stops at the bottom of the visible right panel.
   const limit=Math.min(next?.y??Infinity,nextHeading??Infinity,viewportHeight);
   const free=Number.isFinite(limit)?Math.max(0,limit-item.y-8):Infinity;
   const natural=group.scrollHeight;
   const height=Math.min(natural,free);
   group.style.top=item.y+'px';
   // Grow with content up to the actual available section height; scroll only at that boundary.
   group.style.height=Math.max(0,height)+'px';
   group.style.maxHeight='none';
   group.hidden=item.y>viewportHeight||item.y+height<0||height<26;
   group.scrollTop=formerScroll.get(item.anchor)||0;
  }else group.scrollTop=formerScroll.get(item.anchor)||0;
 }
}
// Floating text-marking shortcut removed by the editor. Section and
// lesson-note actions remain the supported way to create notes.
function renderNotes(){
 $('notes-counter').textContent=tr('reader.saved_notes',{count:notes.length});
 // No duplicate note manager: cards are edited at the chapter and exported at the top.
 scheduleMarginNotes();
}
$('note-form').onsubmit=e=>{
 e.preventDefault();
 if(!current)return;
 const value=$('note-text').value.trim();if(!value){$('note-dialog-feedback').textContent=tr('notes.empty');return}
 refreshCollection(notesKey);
 const anchor=pendingQuoteAnchor,section=noteSectionTitle(anchor),now=new Date().toISOString();
 if(editingNoteId){
  const n=notes.find(x=>x.id===editingNoteId&&x.lesson_id===current.id);
  if(!n){$('note-dialog-feedback').textContent=tr('notes.not_found');return}
  Object.assign(n,{text:value,anchor,section_title:section,quote:pendingQuote,position:pendingPosition,updated:now});
 }else{
  if(notes.length>=1000){$('note-dialog-feedback').textContent=tr('notes.limit');return}
  notes.push({id:now+'-'+Math.random().toString(36).slice(2,11),lesson_id:current.id,anchor,section_title:section,quote:pendingQuote,position:pendingPosition,text:value,created:now,updated:now});
 }
 const persisted=persistCollection(notesKey,notes);$('note-dialog').close();setRightTab('notes');
 if(window.innerWidth<=1120)setToc(true);
 updateSectionActions();renderNotes();renderMarginNotes();
 $('note-feedback').textContent=tr(persisted?'notes.stored':'progress.storage_error');
};
function downloadText(name,content,type){
 const blob=new Blob([content],{type:type||'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function notesMarkdown(){
 let result='# '+tr('notes.markdown_title',{title:course.title})+'\n\n';
 for(const n of notes){
  const d=knownDocs.get(n.lesson_id);
  result+='## '+(d?.title||n.lesson_id)+'\n\n';
  result+='**'+tr('notes.md_section')+'** '+(n.section_title||tr('reader.note_location'))+'\n\n';
  if(n.quote)result+='**'+tr('notes.md_quote')+'**\n> '+n.quote.replace(/\n/g,'\n> ')+'\n\n';
  result+='**'+tr('notes.md_created')+'** '+n.created+'  \n**'+tr('notes.md_changed')+'** '+n.updated+'\n\n';
  result+=n.text+'\n\n';
 }
 return result;
}
const validDocumentIds=new Set(knownDocs.keys());
const transferKinds=['read','favorites','bookmarks','notes'];
const progressFeedback=message=>{$('progress-feedback').textContent=message}; // accessibility-only non-dialog storage failures
const transferDialog=document.createElement('dialog');transferDialog.id='transfer-dialog';transferDialog.className='note-dialog transfer-dialog';transferDialog.setAttribute('aria-labelledby','transfer-title');
transferDialog.innerHTML=`<div class="transfer-body"><div class="note-dialog-head"><strong id="transfer-title"></strong><button id="transfer-x" type="button" aria-label="Close">${window.LC_ICON('close')}</button></div><p id="transfer-scope"></p><p id="transfer-local"></p><section class="transfer-section" aria-labelledby="transfer-export-title"><strong id="transfer-export-title"></strong><div id="transfer-export-options" class="transfer-options"></div><div class="transfer-controls"><button id="transfer-export" type="button"></button><button id="transfer-md" type="button"></button></div><div id="transfer-export-result" class="transfer-result" role="status" aria-live="polite"></div></section><section class="transfer-section" aria-labelledby="transfer-import-title"><strong id="transfer-import-title"></strong><div id="transfer-file-row"><button id="transfer-choose" type="button"></button> <span id="transfer-file-name"></span></div><div id="transfer-options" class="transfer-options"></div><label id="transfer-keep-row" class="transfer-keep"><input type="checkbox" id="transfer-keep" checked><span id="transfer-keep-label"></span></label><p id="transfer-info" class="notes-hint"></p><div class="transfer-controls"><button id="transfer-primary" type="button"></button></div><div id="transfer-result" class="transfer-result" role="status" aria-live="polite"></div></section><section id="transfer-reset" class="transfer-section" aria-labelledby="transfer-reset-title"><strong id="transfer-reset-title"></strong><p id="transfer-reset-info" class="notes-hint"></p></section><div class="note-dialog-buttons"><button id="transfer-cancel" type="button"></button></div></div>`;
document.body.append(transferDialog);
let transferPayload=null,transferGeneration=0;
const transferChecks=new Map(),exportChecks=new Map();
for(const [checks,target,prefix] of [[transferChecks,'transfer-options','transfer-'],[exportChecks,'transfer-export-options','transfer-export-']])for(const k of transferKinds){const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span'),count=document.createElement('span');input.type='checkbox';input.id=prefix+k;label.append(input,name,count);$(target).append(label);checks.set(k,{input,name,count});input.onchange=syncTransfer;}
function getReadingData(){refreshReaderCollections();read=latestRead();return {read:Object.keys(read).filter(id=>validDocumentIds.has(id)&&read[id]).sort(),favorites:[...favorites],bookmarks:sortedBookmarks(),notes:notes.map(n=>({...n}))};}
function transferResult(message,done=false){$('transfer-result').textContent=message;syncTransfer();}
function exportResult(message){$('transfer-export-result').textContent=message;}
function syncTransfer(){const selected=checks=>transferKinds.some(k=>checks.get(k).input.checked&&!checks.get(k).input.disabled);
 $('transfer-primary').disabled=!selected(transferChecks)||!transferPayload||!storage;
 $('transfer-export').disabled=!selected(exportChecks);
 $('transfer-md').disabled=!exportChecks.get('notes').input.checked;
 $('transfer-info').textContent=tr($('transfer-keep').checked?'transfer.keep_info':'transfer.replace_info');
}
function populateTransfer(data,checks=transferChecks,resetSelection=true){for(const k of transferKinds){const {input,name,count}=checks.get(k);const available=Object.hasOwn(data,k);name.textContent=tr('transfer.'+k);count.textContent=available?String(data[k].length):'–';if(resetSelection)input.checked=available;input.disabled=!available;}syncTransfer();}
function openTransfer(){transferGeneration++;transferPayload=null;$('transfer-title').textContent=tr('transfer.title');$('transfer-export-title').textContent=tr('transfer.export_title');$('transfer-import-title').textContent=tr('transfer.import_title');$('transfer-reset-title').textContent=tr('reset.title');$('transfer-reset-info').textContent=tr('transfer.reset_info');$('transfer-x').setAttribute('aria-label',tr('transfer.close'));$('transfer-scope').textContent=tr('transfer.scope',{course:course.title});$('transfer-local').textContent=tr('transfer.local');$('transfer-choose').textContent=tr('transfer.select_file');$('transfer-choose').disabled=false;$('transfer-file-name').textContent='';$('transfer-keep').checked=true;$('transfer-keep').disabled=false;$('transfer-keep-label').textContent=tr('transfer.keep');$('transfer-primary').textContent=tr('transfer.import');$('transfer-export').textContent=tr('transfer.export_json');$('transfer-md').textContent=tr('transfer.export_md');$('transfer-cancel').textContent=tr('transfer.close');$('transfer-result').textContent='';$('transfer-export-result').textContent='';$('progress-file').value='';populateTransfer({});populateTransfer(getReadingData(),exportChecks);transferDialog.showModal();}
$('transfer-x').onclick=$('transfer-cancel').onclick=()=>transferDialog.close();$('transfer-keep').onchange=syncTransfer;
transferDialog.addEventListener('close',()=>{transferGeneration++;transferPayload=null;});
$('reading-data').onclick=openTransfer;
$('transfer-md').onclick=()=>{try{refreshCollection(notesKey);downloadText('notizen-'+COURSE_ID+'.md',notesMarkdown(),'text/markdown;charset=utf-8');exportResult(tr('notes.exported_md',{count:notes.length}));}catch(e){exportResult(tr('transfer.export_failed',{message:e.message}));}};
function selectedData(data,checks=transferChecks){return Object.fromEntries(transferKinds.filter(k=>checks.get(k).input.checked&&!checks.get(k).input.disabled&&Object.hasOwn(data,k)).map(k=>[k,data[k]]));}
function counts(data){return Object.fromEntries(transferKinds.map(k=>[k,data[k]?.length||0]));}
function exportReadingData(){try{const data=selectedData(getReadingData(),exportChecks);if(!Object.keys(data).length)throw Error(tr('transfer.empty'));downloadText('lernkurse-'+COURSE_ID+'-lesestand.json',JSON.stringify({format:'lernkurse-lesestand',version:4,course_id:COURSE_ID,exported_utc:new Date().toISOString(),...data},null,2)+'\n','application/json');exportResult(tr('progress.saved',counts(data)));}catch(e){exportResult(tr('transfer.export_failed',{message:e.message}));}}
function validateTransfer(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error(tr('progress.bad_backup'));
 const oldNotes=payload.format==='lernkurse-notizen'&&payload.version===1;
 if(!oldNotes&&(payload.format!=='lernkurse-lesestand'||![1,2,3,4].includes(payload.version)))throw Error(tr('progress.bad_backup'));
 const version=payload.version;
 if((oldNotes||version>=2||payload.course_id!==undefined)&&normalizeCourseId(payload.course_id)!==COURSE_ID)throw Error(tr('progress.bad_course'));
 const required=oldNotes?['notes']:version===1?['read']:version===2?['read','favorites','notes']:version===3?transferKinds:[];
 if(required.some(k=>!Object.hasOwn(payload,k)))throw Error(tr('progress.bad_backup'));
 const out={};
 for(const k of transferKinds){if(!Object.hasOwn(payload,k))continue;const entries=payload[k];const limit=k==='read'?10000:k==='notes'?1000:2000;
  if(!Array.isArray(entries)||entries.length>limit)throw Error(tr('transfer.invalid'));
  let normalized;
  if(k==='read'||k==='favorites'){
   if(!entries.every(id=>typeof id==='string'&&id.length<180))throw Error(tr('progress.invalid_ids'));
   normalized=uniqueIds(entries);
   // v1 was a shared unscoped read list. Preserve historic filtering; never reset from it.
   if(!(version===1&&!oldNotes&&k==='read')&&normalized.length!==entries.length)throw Error(tr('transfer.invalid'));
  }else {normalized=k==='notes'?uniqueNotes(entries):validBookmarks(entries);if(normalized.length!==entries.length)throw Error(tr('transfer.invalid'));}
  out[k]=normalized;
 }
 if(!Object.keys(out).length)throw Error(tr('progress.bad_backup'));
 return out;
}
$('transfer-choose').onclick=()=>$('progress-file').click();
$('progress-file').addEventListener('change',async()=>{
 const file=$('progress-file').files?.[0];if(!file)return;const generation=++transferGeneration;transferPayload=null;populateTransfer({});$('transfer-result').textContent='';$('transfer-file-name').textContent=file.name;
 try{if(file.size>32*1024*1024)throw Error(tr('notes.file_big'));const payload=JSON.parse(await file.text());if(generation!==transferGeneration||!transferDialog.open)return;transferPayload=validateTransfer(payload);$('transfer-keep').disabled=payload.format==='lernkurse-lesestand'&&payload.version===1;if($('transfer-keep').disabled)$('transfer-keep').checked=true;populateTransfer(transferPayload);transferResult(tr('transfer.ready'));}
 catch(e){if(generation===transferGeneration)transferResult(tr('progress.bad_file',{message:e.message}));}
 finally{$('progress-file').value='';}
});
function mergeData(existing,incoming,key){const m=new Map(existing.map(x=>[key(x),x]));for(const item of incoming)m.set(key(item),item);return [...m.values()];}
function restoreReadingData(){
 try{
  if(!storage||!transferPayload)throw Error(tr('progress.storage_error'));
  const selected=selectedData(transferPayload),keep=$('transfer-keep').checked;if(!Object.keys(selected).length)throw Error(tr('transfer.empty'));
  if(!keep&&!window.confirm(tr('transfer.confirm_replace')))return;
  const old=getReadingData();const next={};const identity={read:x=>x,favorites:x=>x,bookmarks:x=>x.lesson_id+'|'+x.anchor,notes:x=>x.id};
  for(const k of transferKinds){next[k]=mergeData(keep?old[k]:[],selected[k]||[],identity[k]);if(next[k].length>(k==='read'?10000:k==='notes'?1000:2000))throw Error(tr('transfer.limit'));}
  const flags=latestRead();if(!keep)for(const id of Object.keys(flags))if(validDocumentIds.has(normalizeDocId(id)))delete flags[id];for(const id of next.read)flags[id]=true;
  const writes=new Map([[storageKey+':read',flags],[storageKey+favoritesKey,next.favorites],[storageKey+bookmarksKey,next.bookmarks],[storageKey+notesKey,next.notes]]);
  // Set migration markers so pre-existing legacy entries cannot repopulate replaced collections.
  if(!keep)for(const key of [favoritesKey,bookmarksKey,notesKey])writes.set(storageKey+':legacy-items-copied:'+key,true);
  const snapshot=new Map([...writes.keys()].map(k=>[k,storage.getItem(k)]));
  try{for(const [key,value] of writes)storage.setItem(key,JSON.stringify(value));}catch(error){for(const [key,value] of snapshot){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch(_){} }throw Error(tr('transfer.storage_error'));}
  pendingRead.clear();read=readSnapshot(flags);for(const [key,state] of collectionStates){state.reset();refreshCollection(key,true);}
  nav();renderFavorites();renderBookmarks();updateFavoriteButton();renderNotes();updateSectionActions();renderMarginNotes();
  if(current){const done=!!read[current.id];$('done').textContent=tr(done?'reader.mark_unread':'reader.mark_read');$('done').setAttribute('aria-pressed',String(done));}
  populateTransfer(getReadingData(),exportChecks,false);transferPayload=null;syncTransfer();
  transferResult(tr('transfer.result',counts(selected)),true);
 }catch(e){transferResult(tr('transfer.failed',{message:e.message}));}
}
$('transfer-primary').onclick=restoreReadingData;$('transfer-export').onclick=exportReadingData;
// Only known Learning Courses keys are touched; never clear the whole origin.
const resetKinds=[':favorites:',':bookmarks:',':notes:',':lastDoc:'];
const resetSettings=[':theme',':font',':readingWide',':panelsWide',':debug:font',':debug:readingWide',':debug:panelsWide'].map(k=>storageKey+k).concat(['lc-ui-language-v1','lc-editor-layout-preview-v1']);
const resetCourseIds=new Set([COURSE_ID,legacyCourseId]);
const ownsDoc=id=>typeof id==='string'&&validDocumentIds.has(normalizeDocId(id));
function resetSuffix(key){return key.startsWith(storageKey+':')?key.slice(storageKey.length):''}
function collectionKind(key){return resetKinds.find(kind=>key.startsWith(kind))}
function isResetCollection(key,all){
 const suffix=resetSuffix(key),kind=collectionKind(suffix);
 if(kind)return all||resetCourseIds.has(suffix.slice(kind.length));
 if(suffix.startsWith(':legacy-items-copied:')){
  const nested=suffix.slice(':legacy-items-copied:'.length),type=collectionKind(nested);
  return !!type&&(all||resetCourseIds.has(nested.slice(type.length)));
 }
 return false;
}
function storedKeys(){return Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(Boolean)}
function storedValue(key,def){try{return JSON.parse(storage.getItem(key))??def}catch{return def}}
function resetSummary(all){
 const flags=storedValue(storageKey+':read',{}),keys=storedKeys();
 const readIds=new Set(Object.entries(flags).filter(([id,flag])=>flag===true&&(all||ownsDoc(id))).map(([id])=>normalizeDocId(id)));
 const collections={favorites:new Set(),bookmarks:new Set(),notes:new Set()};
 for(const key of keys){if(!isResetCollection(key,all))continue;const kind=collectionKind(resetSuffix(key));if(!kind||kind===':lastDoc:')continue;
  const values=storedValue(key,[]);if(!Array.isArray(values))continue;
  for(const v of values){const doc=typeof v==='string'?v:v?.lesson_id;if(!doc||(!all&&!ownsDoc(doc)))continue;
   const id=normalizeDocId(doc);const token=kind===':favorites:'?id:kind===':bookmarks:'?id+'|'+v.anchor:id+'|'+v.id;
   collections[kind.slice(1,-1)].add(token);
  }
 }
 return {read:readIds.size,favorites:collections.favorites.size,bookmarks:collections.bookmarks.size,notes:collections.notes.size,settings:all?resetSettings.filter(k=>storage.getItem(k)!==null).length:0};
}
function deleteReaderData(all){
 if(!storage)return;
 try{
  const keys=storedKeys();
  for(const key of keys)if(isResetCollection(key,all)||(all&&resetSettings.includes(key)))storage.removeItem(key);
  const readKey=storageKey+':read',lastKey=storageKey+':lastDoc';
  if(all)storage.removeItem(readKey);
  else {const flags=storedValue(readKey,{});for(const id of Object.keys(flags))if(ownsDoc(id))delete flags[id];if(Object.keys(flags).length)storage.setItem(readKey,JSON.stringify(flags));else storage.removeItem(readKey)}
  if(all||ownsDoc(storedValue(lastKey,null)))storage.removeItem(lastKey);
  pendingRead.clear();read=readSnapshot(load(':read',{}));
  for(const [key,state] of collectionStates){state.reset();collectionValues(key,[])}
  if($('note-dialog').open)$('note-dialog').close();
  nav();renderFavorites();updateFavoriteButton();renderBookmarks();renderNotes();updateSectionActions();renderMarginNotes();
  if(current){$('done').textContent=tr('reader.mark_read');$('done').setAttribute('aria-pressed','false')}
  resetDialog.close();transferPayload=null;populateTransfer({});$('transfer-file-name').textContent='';populateTransfer(getReadingData(),exportChecks,false);$('transfer-export-result').textContent='';transferResult(tr('reset.success'));
  // The all-course reset restores default theme and layout on the next page load.
  // Keep the current view until navigation, but reset the public controls now.
  if(all){setTheme('light');setFont(1);readingWide=false;panelsWide=false;setWidths();for(const key of resetSettings)storage.removeItem(key)}
 }catch(e){resetDialog.close();transferResult(tr('progress.storage_error'));}
}
const resetBtn=document.createElement('button');resetBtn.type='button';resetBtn.id='reset-progress';resetBtn.textContent=tr('reset.button');
$('transfer-reset').append(resetBtn);
const resetDialog=document.createElement('dialog');resetDialog.id='reset-dialog';resetDialog.className='note-dialog';resetDialog.setAttribute('aria-labelledby','reset-title');
resetDialog.innerHTML='<div class="reset-content"><strong id="reset-title"></strong><p id="reset-question"></p><table class="reset-counts"><thead><tr><th></th><th id="reset-course-head"></th><th id="reset-all-head"></th></tr></thead><tbody id="reset-counts"></tbody></table><p id="reset-info" class="notes-hint"></p><div class="note-dialog-buttons reset-actions"><button type="button" id="reset-course"></button><button type="button" id="reset-all"></button><button type="button" id="reset-cancel" autofocus></button></div></div>';
document.body.append(resetDialog);
function localizeReset(){resetBtn.textContent=tr('reset.button');resetBtn.title=tr('reset.title');resetBtn.setAttribute('aria-label',tr('reset.title'));for(const k of ['title','question','course-head','all-head','info','course','all','cancel'])$('reset-'+k).textContent=tr('reset.'+k.replace('-','_'))}
localizeReset();window.addEventListener('lc-language-change',localizeReset);
resetBtn.disabled=!storage;resetBtn.onclick=()=>{
 localizeReset();const a=resetSummary(false),b=resetSummary(true),body=$('reset-counts');body.replaceChildren();
 for(const key of ['read','favorites','bookmarks','notes','settings']){const row=document.createElement('tr');for(const val of [tr('reset.'+key),key==='settings'?'–':a[key],b[key]]){const cell=document.createElement('td');cell.textContent=String(val);row.append(cell)}body.append(row)}
 resetDialog.showModal();$('reset-cancel').focus();
};
$('reset-course').onclick=()=>deleteReaderData(false);$('reset-all').onclick=()=>deleteReaderData(true);$('reset-cancel').onclick=()=>resetDialog.close();

function runSearch(value){searchTerm=value.trim().toLocaleLowerCase('de');$('search').value=value;$('overlay-search').value=value;nav()}
$('search').addEventListener('input',e=>runSearch(e.target.value));
$('overlay-search').addEventListener('input',e=>runSearch(e.target.value));

$('smaller').onclick=()=>setFont(font-.08);$('larger').onclick=()=>setFont(font+.08);$('theme').onclick=()=>setTheme(theme==='light'?'dark':'light');
$('menu').onclick=()=>setMenu(!$('sidebar').classList.contains('show'));
$('close-menu').onclick=closeOverlays;
$('smaller-mobile').onclick=()=>setFont(font-.08);
$('larger-mobile').onclick=()=>setFont(font+.08);
$('reading-data-mobile').onclick=()=>$('reading-data').click();
$('toc-toggle').onclick=()=>{setRightTab('contents');setToc(!$('toc').classList.contains('is-open'))};
$('overlay-backdrop').onclick=closeOverlays;
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&($('sidebar').classList.contains('show')||$('toc').classList.contains('is-open'))) {closeOverlays();return}
 if(e.key==='Escape'){closeDropDowns()}
 if(e.key==='Tab'){
  const panel=$('sidebar').classList.contains('show')?$('sidebar'):($('toc').classList.contains('is-open')?$('toc'):null);
  if(panel){const els=[...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),summary,select:not([disabled])')].filter(x=>x.getClientRects().length>0);
   if(els.length){const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  }
 }
});
window.addEventListener('resize',()=>{if(window.innerWidth>760)setMenu(false);if(window.innerWidth>1120)setToc(false);scheduleMarginNotes();requestAnimationFrame(()=>requestAnimationFrame(renderMarginNotes))});

$('previous').onclick=()=>{const x=allDocs().indexOf(current);if(x>0)openDoc(allDocs()[x-1].id)};
$('next').onclick=()=>{const x=allDocs().indexOf(current);if(x>=0&&x<allDocs().length-1)openDoc(allDocs()[x+1].id)};
$('done').onclick=()=>{
 if(!current)return;
 read=latestRead();commitRead([[current.id,!read[current.id]]]);nav();
 $('done').textContent=read[current.id]?tr('reader.mark_unread'):tr('reader.mark_read');
 $('done').setAttribute('aria-pressed',read[current.id]?'true':'false')
};
$('reader').addEventListener('click',e=>{
 const a=e.target.closest('a');if(!a)return;const href=a.getAttribute('href')||'';
 if(/^(?:index\.html)?\?/.test(href)){
  const url=new URL(href,location.href);
  if(window.LC_URL.internalCourse(url.searchParams.get('course'),url.searchParams.get('doclang')||window.LERNKURS_KONFIGURATION.sprache)!==COURSE_ID||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  const route=window.LC_URL.fromURL(url.search+url.hash,allDocs());
  e.preventDefault();if(route.id&&courseFor(route.id))openDoc(route.id,route.section);
 }else if(href.startsWith('#')){
  e.preventDefault();navigateAnchor(decodeURIComponent(href.substring(1)))
 }
});

// Rail position and height are CSS-only. The intrinsic header height is
// updated only when it actually changes, never during a scroll callback.
const paper=document.querySelector('.paper'),jump=document.querySelector('.bottom-jumpbar');
// Measured geometry is applied to a constructable stylesheet with direct pixel values.
const geometrySheet=(()=>{try{const s=new CSSStyleSheet();document.adoptedStyleSheets=[...document.adoptedStyleSheets,s];return s}catch{return null}})();
let geometryRaf=0,headerPx=116,jumpX='50%',jumpBottom='0.8rem';
function paintGeometry(){if(!geometrySheet)return;geometrySheet.replaceSync(
 `html{scroll-padding-top:${Math.round(headerPx+12)}px}`+

 `.bottom-jumpbar{left:${jumpX};bottom:${jumpBottom}}`
)}
function syncHeaderHeight(){
 headerPx=$('site-header').getBoundingClientRect().height;
 paintGeometry();scheduleReaderGeometry();
}
function syncReaderGeometry(){
 geometryRaf=0;
 const headerHeight=$('site-header').getBoundingClientRect().height;
 const viewport=window.innerHeight;
 const paperRect=paper.getBoundingClientRect();
 const rootSize=Number.parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
 const bottom=Math.max(.8*rootSize,viewport-paperRect.bottom+.25*rootSize);
 jumpX=`${Math.round(paperRect.left+paperRect.width/2)}px`;
 jumpBottom=`${Math.round(bottom)}px`;
 paintGeometry();
 document.body.classList.toggle('has-scrolled',window.scrollY>0&&viewport-bottom-jump.offsetHeight>=headerHeight);
 scheduleMarginNotes();
}
function scheduleReaderGeometry(){if(!geometryRaf)geometryRaf=requestAnimationFrame(syncReaderGeometry)}
window.addEventListener('scroll',scheduleReaderGeometry,{passive:true});
window.addEventListener('resize',syncHeaderHeight,{passive:true});
const headerObserver=new ResizeObserver(syncHeaderHeight);headerObserver.observe($('site-header'));
const geometryObserver=new ResizeObserver(scheduleReaderGeometry);
for(const target of [paper,jump])geometryObserver.observe(target);
syncHeaderHeight();syncReaderGeometry();
$('to-top').onclick=()=>{window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})};
const articleObserver=new ResizeObserver(scheduleMarginNotes);
// Observe every geometry source that may change the heading Y coordinates.
// These measurements do not observe note cards, avoiding a resize feedback loop.
for(const id of ['reader','reader-layout','toc','notes-track'])articleObserver.observe($(id));
$('reader').addEventListener('toggle',scheduleMarginNotes,true);
// Exactly one independent course per repository; no cross-course switches.
setTheme(window.LernkursTheme.current||paramsFromHash().get('theme')||theme);setFont(font);setRightTab('contents');setWidths();
const route=routeFromHash();
const stored=load(lastDocKey,null)||load(':lastDoc:'+legacyCourseId,null)||load(':lastDoc',null);
const startId=(route.id&&courseFor(route.id)&&route.id)||
 (stored&&courseFor(stored)&&stored)||course.docs[0].id;
openDoc(startId,route.id===normalizeDocId(startId)?route.section:null,'replace');
// The old reader already restores :lastDoc and #doc/#anchor; only pixel scroll is additional.
const returnY=new URLSearchParams(location.search).get('lc_return_y');
if(returnY!==null&&/^\d{1,8}$/.test(returnY)){
 const target=Math.min(20000000,Number(returnY));
 const restore=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:target,behavior:'instant'})));
 if(document.fonts?.ready)document.fonts.ready.then(restore,restore);else restore();
 window.addEventListener('load',restore,{once:true});
 const clean=new URL(location.href);clean.searchParams.delete('lc_return_y');
 try{history.replaceState(history.state,'',clean.pathname+clean.search+clean.hash)}catch(_){/* keep scroll context on restricted file:// */}
}

if(!storage)progressFeedback(tr('progress.storage'));
window.addEventListener('storage',event=>{
 if(event.storageArea!==storage)return;
 if(event.key===storageKey+':read'||event.key===null){
  if(event.newValue===null)pendingRead.clear();read=latestRead({});nav();
  if(current){const done=!!read[current.id];$('done').textContent=done?tr('reader.mark_unread'):tr('reader.mark_read');$('done').setAttribute('aria-pressed',String(done))}
 }
 const key=event.key?.startsWith(storageKey)?event.key.slice(storageKey.length):null;
 if(event.key===null||collectionStates.has(key)){
  if(event.key===null){for(const state of collectionStates.values())state.reset();refreshReaderCollections(true)}else {if(event.newValue===null)collectionStates.get(key).reset();refreshCollection(key,event.newValue===null);}
  renderFavorites();updateFavoriteButton();renderBookmarks();renderNotes();updateSectionActions();renderMarginNotes();
 }
});
window.addEventListener('popstate',followLocation);
// Native fragment changes trigger popstate and are handled by the same codec.
});

