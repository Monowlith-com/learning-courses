/* URL-first, language-neutral theme state. Missing theme always means light. */
(function(){'use strict';
 const KEY='lernkurs-reader-stand-v1:theme';
 const choose=t=>t==='dark'?'dark':'light';
 const urlTheme=()=>choose(new URLSearchParams(location.search).get('theme'));
 let current=urlTheme();
 function updateLinks(){
  document.querySelectorAll('a[href]').forEach(a=>{
   const href=a.getAttribute('href')||'';
   if(!href||/^(?:#|\/\/|[a-z][a-z0-9+.-]*:)/i.test(href))return;
   const hashPos=href.indexOf('#'),frag=hashPos<0?'':href.slice(hashPos);
   const base=hashPos<0?href:href.slice(0,hashPos);
   const q=base.indexOf('?'),path=q<0?base:base.slice(0,q);
   const query=new URLSearchParams(q<0?'':base.slice(q+1));query.delete('lang');
   // Media downloads are not navigation routes.
   if(!path||/(?:\.html?|\/)$/.test(path)){const here=new URLSearchParams(location.search);query.set('syslang',window.LC_I18N?.locale||here.get('syslang')||document.documentElement.lang||'de');query.set('doclang',query.get('doclang')||here.get('doclang')||'de');query.set('theme',current);}
   const qs=query.toString();a.setAttribute('href',path+(qs?'?'+qs:'')+frag);
  });
 }
 function syncAddress(){
  const next=new URL(location.href);
  next.searchParams.delete('lang');
  next.searchParams.set('syslang',window.LC_I18N?.locale||next.searchParams.get('syslang')||document.documentElement.lang||'de');
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

/* Content list geometry: each list's widest actual marker defines its own column. */
(function(){'use strict';
 function alpha(n){if(n<1)return String(n);let s='';while(n){n--;s=String.fromCharCode(97+n%26)+s;n=Math.floor(n/26);}return s;}
 function roman(n){if(n<1||n>3999)return String(n);let out='';for(const [v,c] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){out+=c;n-=v;}return out;}
 function label(n,type){switch(type){case 'a':return alpha(n)+'.';case 'A':return alpha(n).toUpperCase()+'.';case 'i':return roman(n).toLowerCase()+'.';case 'I':return roman(n)+'.';default:return n+'.';}}
 function prepare(root){
  if(!root)return;
  for(const list of root.querySelectorAll('ul,ol')){
   if(list.classList.contains('lc-content-list')||list.closest('.lesson-contents-list,.formula-jumps,nav,.section-tools'))continue;
   const items=Array.from(list.children).filter(node=>node.tagName==='LI');if(!items.length)continue;
   const ordered=list.tagName==='OL',reverse=list.hasAttribute('reversed'),step=reverse?-1:1;
   let n=list.hasAttribute('start')?list.start:reverse?items.length:1;
   list.classList.add('lc-content-list');list.setAttribute('role','list');
   for(const item of items){
    if(ordered&&item.hasAttribute('value'))n=item.value;
    const marker=document.createElement('span');marker.className='lc-item-marker';marker.setAttribute('aria-hidden','true');marker.textContent=ordered?label(n,list.type):'•';n+=step;
    const content=document.createElement('div');content.className='lc-item-content';while(item.firstChild)content.append(item.firstChild);
    item.append(marker,content);item.setAttribute('role','listitem');
   }
  }
 }
 window.LCContentLists={prepare};
 document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('.reader').forEach(prepare));
})();
