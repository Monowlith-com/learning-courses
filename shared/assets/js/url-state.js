/* One language-neutral route codec. Legacy course names accepted on input only. */
(function(){'use strict';
 const keys=Object.freeze({school_mathematics_de:'school_mathematics',university_mathematics_de:'university_mathematics',university_computer_science_de:'university_computer-science'});
 const lang=v=>v==='en'?'en':'de',mode=v=>v==='dark'?'dark':'light';
 const canonical=id=>String(id||'').replace(/^(.+)_(school|university)_(de|en)$/,'$2_$1_$3');
 const publicCourse=id=>{const clean=canonical(id);return keys[clean]||keys[clean.replace(/_en$/,'_de')]||clean.replace(/^(school|university)_(.+)_(de|en)$/,(_,level,subject)=>level+'_'+subject.replace(/_/g,'-')).replace(/_(de|en)$/,'');};
 const internalCourse=(id,language='de')=>{const clean=publicCourse(id).replace(/_(de|en)$/,'');const key=Object.keys(keys).find(k=>keys[k]===clean);const registered=(window.LC_CATALOG||[]).find(c=>publicCourse(c.id)===clean);return key?key.replace(/_de$/,'_'+lang(language)):registered?registered.id.replace(/_(de|en)$/,'_'+lang(language)):null;};
 const preferences=p=>({syslang:lang(p.get('syslang')||p.get('lang')),doclang:lang(p.get('doclang')),theme:mode(p.get('theme'))});
 function fromURL(value,docs){
  const raw=String(value||''),split=raw.indexOf('#'),query=raw.slice(0,split<0?raw.length:split),hash=split<0?'':raw.slice(split+1),p=new URLSearchParams(query.includes('?')?query.slice(query.indexOf('?')+1):query),pref=preferences(p);
  const course=internalCourse(p.get('course'),pref.doclang),mod=p.get('module'),lesson=p.get('lesson'),page=p.get('page'),section=p.get('section');
  let anchor=null;try{anchor=hash?decodeURIComponent(hash):null}catch(_){return {id:null,section:null,invalid:true,...pref}}
  if(!course||p.has('doc')||p.has('anchor')||hash.includes('=')||(section!==null&&!/^S[1-9]\d*$/.test(section)))return {id:null,section:null,invalid:true,...pref};
  const options=docs.filter(d=>d.id.startsWith(course+':'));let id=null;
  if(page&&mod===null&&lesson===null)id=options.find(d=>d.id===(window.LC_LEGACY_DOCUMENT_MAP?.[course+':'+page]||course+':'+page)&&!/^M[1-9]\d*-L[1-9]\d*$/.test(page))?.id||null;
  else if(page===null&&/^M[1-9]\d*$/.test(mod||'')){
   if(/^L[1-9]\d*$/.test(lesson||''))id=options.find(d=>d.id===course+':'+mod+'-'+lesson)?.id||null;
   else if(lesson===null)id=options.filter(d=>d.id.startsWith(course+':'+mod+'-L')).sort((a,b)=>Number(a.id.split('-L').pop())-Number(b.id.split('-L').pop()))[0]?.id||null;
  }
  if(anchor&&id){const aliases=options.find(d=>d.id===id)?.section_aliases;if(aliases&&Object.prototype.hasOwnProperty.call(aliases,anchor))anchor=aliases[anchor];}
  return {id,section:section||anchor,invalid:!id&&(mod!==null||lesson!==null||page!==null||section!==null),...pref};
 }
 function toURL(id,section,theme,syslang,doclang){
  const [course,suffix]=String(id||'').split(':'),p=new URLSearchParams();if(course)p.set('course',publicCourse(course));
  const match=/^(M[1-9]\d*)-(L[1-9]\d*)$/.exec(suffix||'');
  if(match){p.set('module',match[1]);p.set('lesson',match[2]);}else if(suffix)p.set('page',suffix);
  if(section==='__lektion__'||(match&&section===match[2]))section=null;
  if(/^S[1-9]\d*$/.test(section||'')){p.set('section',section);section=null;}
  p.set('syslang',lang(syslang));p.set('doclang',lang(doclang||(/_en$/.test(course)?'en':'de')));p.set('theme',mode(theme));
  return '?'+p.toString()+(section?'#'+encodeURIComponent(section):'');
 }
 // Select the target document language without inventing unregistered datasets.
 function switchLanguage(url,next){
  const p=url.searchParams,catalog=window.LC_CATALOG||[],course=p.get('course');
  const current=lang(p.get('doclang'));
  const available=course?catalog.some(c=>c.id===internalCourse(course,next)&&c.language===next):catalog.some(c=>c.language===next);
  p.delete('lang');p.set('syslang',next);
  if(!available){p.set('doclang',current);return false;}
  const pages={glossar:'glossary',pfad:'path',studienweg:'study-path',quellenverzeichnis:'sources',kursuebersicht:'course-overview'};
  const page=p.get('page');if(page){const map=next==='en'?pages:Object.fromEntries(Object.entries(pages).map(([a,b])=>[b,a]));if(map[page])p.set('page',map[page]);}
  p.set('doclang',next);return true;
 }
 window.LC_URL={fromURL,toURL,publicCourse,internalCourse,preferences,switchLanguage};
})();
