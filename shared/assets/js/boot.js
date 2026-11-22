"use strict";
/* Central offline entry: loads only the selected course. Classic scripts work on file://. */
(function(){
const root=document.getElementById('lc-root');
const catalog=window.LC_CATALOG||[];
const params=new URLSearchParams(location.search);
const site=window.LC_SITE_CONFIG||{};
const tr=(key,args)=>window.LC_I18N.t(key,args);
function langInit(){window.LC_I18N.install(root);}
// Use only an original, bundled local brand file. Never generate a substitute owl.
function installBrandImage(scope){
 const file=site.brand_logo;
 if(!file)return;
 for(const host of scope.querySelectorAll('[data-lc-brand-icon]')){
  const image=document.createElement('img');image.src=file;image.alt='';image.className='lc-brand-image';
  image.decoding='async';host.replaceChildren(image);
 }
}
function installOverviewTheme(scope){
 const button=scope.querySelector('#theme');if(!button)return;
 const reflect=()=>{const light=window.LernkursTheme.current!=='dark';
  button.textContent=light?'☾':'☀';button.title=tr(light?'header.theme_dark':'header.theme_light');
  button.setAttribute('aria-label',button.title);
 };
 button.addEventListener('click',()=>{window.LernkursTheme.set(window.LernkursTheme.current==='dark'?'light':'dark');reflect()});
 reflect();
}
function projectFooter(target){
 const markup=window.LC_GLOBAL_FOOTER_HTML?.[window.LC_I18N.locale];
 if(!markup)return;
 const holder=document.createElement('div');holder.innerHTML=markup;
 const footer=holder.firstElementChild;if(footer){
  target.replaceChildren(footer);
  footer.querySelectorAll('nav a[href]').forEach(a=>a.addEventListener('click',()=>{
   // Only same-site info links; the navigation context remains in the URL.
   const u=new URL(a.href,location.href);
   u.searchParams.set('back',location.search+location.hash);
   u.searchParams.set('y',String(Math.max(0,Math.round(window.scrollY))));
   u.searchParams.set('syslang',window.LC_I18N.locale);u.searchParams.set('doclang',preferences.doclang);u.searchParams.set('theme',window.LernkursTheme.current);
   a.href=u.href;
  }));
 }
}
const requestedCourse=params.get('course');
const preferences=window.LC_URL.preferences(params);
const courseId=window.LC_URL.internalCourse(requestedCourse,preferences.doclang);
function status(message){root.innerHTML='';const main=document.createElement('main');main.className='lc-status';main.textContent=message;root.append(main)}
// Missing translation: keep the requested location in the available German dataset.
function fallbackRoute(){
 const germanId=window.LC_URL.internalCourse(requestedCourse,'de');
 const available=catalog.some(c=>c.id===germanId&&c.language==='de');
 const lang=window.LC_I18N.locale, theme=window.LernkursTheme.current;
 if(!available)return window.LC_URL.toURL('',null,theme,lang,'de');
 const mod=params.get('module'),lesson=params.get('lesson'),page=params.get('page');
 let target=germanId;
 if(/^M[1-9]\d*$/.test(mod||'')&&/^L[1-9]\d*$/.test(lesson||'')&&!page)target+=':'+mod+'-'+lesson;
 else if(page&&/^[a-z0-9][a-z0-9-]*$/.test(page)&&!mod&&!lesson)target+=':'+({glossary:'glossar',path:'pfad','study-path':'studienweg',sources:'quellenverzeichnis'}[page]||page);
 const section=target!==germanId&&/^S[1-9]\d*$/.test(params.get('section')||'')?params.get('section'):null;
 return window.LC_URL.toURL(target,section,theme,lang,'de');
}
function returnLink(href){const a=document.createElement('a');a.href='index.html'+href;a.textContent=tr('status.return');root.firstChild.append(a);}

function load(path){return new Promise((resolve,reject)=>{
 const script=document.createElement('script');script.src=path;script.onload=resolve;
 script.onerror=()=>reject(new Error('Datei konnte nicht geladen werden: '+path));
 document.head.append(script);
})}
function home(){
 root.replaceChildren();
 // Homepage/selection header has no course-specific controls.
 const headerMount=document.createElement('div');headerMount.className='lc-home-header';
 headerMount.innerHTML=window.LC_HEADER({mode:'overview',locale:window.LC_I18N.locale});
 const header=headerMount.firstElementChild;root.append(header);
 langInit();installBrandImage(header);installOverviewTheme(header);
 const main=document.createElement('main');main.className='lc-home';
 const h=document.createElement('h1');h.className='sr-only';h.textContent=tr('home.select');main.append(h);
 // Keep alphabetical canonical course order within each educational level.
 for(const [level,labelDe,labelEn] of [
  ['university','Universität','University'],['school','Schule','School']]){
  const variants=new Map();
  for(const c of catalog.filter(c=>c.id.startsWith(level+'_'))){
   const key=window.LC_URL.publicCourse(c.id),old=variants.get(key);
   if(!old||c.language===window.LC_I18N.locale)variants.set(key,c);
  }
  const entries=[...variants.values()].sort((a,b)=>window.LC_URL.publicCourse(a.id).localeCompare(window.LC_URL.publicCourse(b.id),'en'));
  if(!entries.length)continue;
  const section=document.createElement('section');section.className='lc-home-course-section';
  const heading=document.createElement('h2');heading.className='lc-home-level';
  heading.textContent=window.LC_I18N.locale==='de'?labelDe:labelEn;section.append(heading);
  const grid=document.createElement('div');grid.className='lc-cards';grid.setAttribute('aria-label',heading.textContent);
  for(const c of entries){
   const card=document.createElement('article');card.className='lc-course-card';
   const locale=window.LC_I18N.locale,logical=window.LC_URL.publicCourse(c.id);
   const title=tr('course.title.'+logical);const displayTitle=title==='course.title.'+logical?c.title:title;
   const href='index.html'+window.LC_URL.toURL(c.id,null,window.LernkursTheme.current,window.LC_I18N.locale,c.language);
   if(c.image){
    const visual=document.createElement('a');visual.href=href;visual.className='lc-card-image-link';
    visual.setAttribute('aria-label',tr('home.open',{title:displayTitle}));
    const img=document.createElement('img');img.className='lc-card-image';img.src=c.image;
    img.alt=tr('home.cover',{title:displayTitle});img.loading='lazy';img.decoding='async';
    visual.append(img);card.append(visual);
   }
   const desc=document.createElement('div');desc.className='lc-card-body';
   const h2=document.createElement('h3');const a=document.createElement('a');a.href=href;a.textContent=displayTitle;h2.append(a);desc.append(h2);
   const summary=document.createElement('p');summary.textContent=tr(c.modules===1?'home.module_one':'home.modules',{count:c.modules})+' · '+tr(c.lessons===1?'home.lesson_one':'home.lessons',{count:c.lessons})+' · '+tr(c.documents===1?'home.document_one':'home.documents',{count:c.documents});desc.append(summary);
   const langs=[...new Set(catalog.filter(v=>window.LC_URL.publicCourse(v.id)===logical).map(v=>v.language))];
   const label=code=>code==='de'?tr('home.language.de'):code==='en'?tr('home.language.en'):code;
   const available=document.createElement('p');available.className='lc-card-languages';available.textContent=tr('home.languages')+': '+[...langs].sort((a,b)=>(a===locale?-1:b===locale?1:a.localeCompare(b))).map(label).join(', ');desc.append(available);
   card.append(desc);grid.append(card);
  }
  section.append(grid);main.append(section);
 }
 root.append(main);
 const footer=document.createElement('footer');footer.className='site-footer';
 footer.id='lc-project-footer';footer.setAttribute('role','contentinfo');projectFooter(footer);root.append(footer);
 window.LernkursTheme?.updateLinks();
}

async function start(c){
 root.innerHTML=window.LC_READER_SHELL;langInit();installBrandImage(root);
 const reader=document.getElementById('reader');reader.textContent=tr('status.loading');
 const progress=document.getElementById('progress-feedback');
 try{
  await load(c.metadata);
  const info=window.LC_META&&window.LC_META[c.id];
  if(!info||info.schema!==1||!Array.isArray(info.documents)||!Array.isArray(info.chunks))throw Error(tr('status.metadata'));
  progress.textContent=tr('status.documents',{count:info.documents.length});
  // Classical script tags are independent of CORS/file:// fetch restrictions.
  const dataBase=c.metadata.slice(0,c.metadata.lastIndexOf('/')+1);
  await Promise.all(info.chunks.map(chunk=>load(dataBase+chunk)));
  const chunks=window.LC_CHUNKS&&window.LC_CHUNKS[c.id]||{};
  const docs=info.documents.map((m)=>{
   const content=chunks[m.chunk]&&chunks[m.chunk][m.id];
   if(typeof content!=='string')throw Error(tr('status.missing',{id:m.id}));
   return {id:m.id,legacy_id:m.legacy_id||m.id,title:m.title,group:m.group,lesson:m.lesson,section_aliases:info.section_aliases?.[m.id]||{},html:content};
  });
  window.LC_LEGACY_COURSE_ID=info.legacy_course_id;
  window.LC_LEGACY_DOCUMENT_MAP=info.legacy_ids||{};
  window.LERNKURS_KONFIGURATION={schema:1,sprache:info.language,kurskennung:info.course_id,titel:info.title,anzeigetitel:info.title,herausgeber:site.brand||'Monowlith'};
  window.LERNKURS_DATEN={schema:1,courses:[{slug:info.course_id,title:info.title,docs:docs}]};
  for(const link of document.querySelectorAll('.footer-links a[href^="docs/"]')){
   if(/docs\/(vorwort|datenschutz)\.html$/.test(link.getAttribute('href'))){link.remove();continue;}
   const legacy=info.course_id.includes('_mathematics_')?'courses/de/mathematics':info.course_id.includes('_computer_science_')?'courses/de/computer_science':info.course_id;
   link.setAttribute('href',legacy+'/'+link.getAttribute('href'));
  }
  projectFooter(document.getElementById('lc-project-footer'));
  window.LernkursTheme?.updateLinks();
  progress.textContent='';reader.textContent='';
  window.dispatchEvent(new Event('lernkurs-daten-bereit'));
 }catch(error){
  status(tr('status.error',{message:error&&error.message||String(error)}));
  returnLink(window.LC_URL.toURL('',null,window.LernkursTheme.current,window.LC_I18N.locale,preferences.doclang));
 }
}
const selected=catalog.find(c=>c.id===courseId);
if(!requestedCourse)home();else if(!selected){
 status(preferences.doclang==='en'?(window.LC_I18N.locale==='en'?'English course documents are not available yet.':'Englische Kursdokumente sind noch nicht verfügbar.'):tr('status.unknown',{id:requestedCourse}));returnLink(fallbackRoute());
}else start(selected);
})();
