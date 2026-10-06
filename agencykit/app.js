import { createProjectCloud } from './project-cloud.js';
import { createProjectStore } from './project-store.js';
import { createProjectsUI } from './projects-ui.js';
import { skeletonHandoff } from './project-workflow.js';
import { blocks, categories, filterItems, searchArchive, searchArchiveDetailed } from './catalog.js';
import { archiveProjects, publishingDomains } from './archive-data.js';
import { createArchiveMotion } from './archive-motion.js';
import { downloadSkeleton } from './skeletons.js';
import { generateArchiveLayout, shuffleItems, paginateItems } from './archive-layout.js';

const $ = selector => document.querySelector(selector);
const archiveMotion = createArchiveMotion({
  canvas: $('#archive-canvas'),
  isActive: () => document.body.classList.contains('archive-home')
    && !document.body.classList.contains('modal-open')
    && !document.querySelector('dialog[open]')
    && $('#assistant-panel').hidden && $('#search-suggestions').hidden,
});
const escape = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const shapes = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  portal:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M4 9h16M10 9v12"/>',
  page:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  form:'<path d="M15 4h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3"/><rect x="9" y="2" width="6" height="4" rx="1.5"/><path d="M8 11h8M8 15h6"/>',
  tool:'<path d="m14 6 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z"/>',
  archive:'<rect x="3" y="4" width="18" height="4" rx="1.5"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
  bookmark:'<path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z"/>',
  collection:'<rect x="3" y="5" width="14" height="16" rx="3"/><path d="M8 2h11a2 2 0 0 1 2 2v12"/>',
  curve:'<path d="M3 21V12C3 5 5 3 12 3h9M8 21v-8c0-4 1-5 5-5h8"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  up:'<path d="M12 19V5m-6 6 6-6 6 6"/>',
  external:'<path d="M14 4h6v6m0-6L10 14M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
};
const icon = (name, cls='') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.grid}</svg>`;
const categoryIcon = category => ({Portals:'portal',Pages:'page',Forms:'form',Tools:'tool'}[category] || 'grid');
const allArchive = archiveProjects.flatMap(project => project.items.map(item => ({...item, project: project.name, projectId:project.id, origin:project.name, archived:true})));
const catalog = allArchive;
const archiveDeck = shuffleItems(allArchive), archiveLayoutSeed = Math.floor(Math.random()*0xFFFFFFFF);
let archivePage = 0, archivePageCount = 1;
const currentIds = ids => [...new Set(ids.map(id=>catalog.some(item=>item.id===id)?id:blocks.find(item=>item.id===id)?.sourceId).filter(id=>catalog.some(item=>item.id===id)))];
const state = { route:'archive', scope:'all', category:'All', project:null, collection:null, query:'', compact:false, saved:[], collections:[] };
try {
  const data = JSON.parse(localStorage.getItem('gtm-kit-v1') || '{}');
  state.saved = Array.isArray(data.saved) ? currentIds(data.saved) : [];
  state.collections = Array.isArray(data.collections) ? data.collections.filter(x => typeof x.id==='string' && typeof x.name==='string' && Array.isArray(x.items)).slice(0,30).map(x=>({id:x.id,name:x.name.slice(0,60),note:String(x.note||'').slice(0,240),items:currentIds(x.items)})) : [];
} catch { /* The local frame works without browser storage. */ }

let toastTimer, detailId = null, detailView = 'original', previousFocus = null;
function notify(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600); }
function persist() { try { localStorage.setItem('gtm-kit-v1',JSON.stringify({saved:state.saved,collections:state.collections})); } catch { notify('Browser storage is unavailable. Changes last for this visit.'); } }
function navLink(label,href,name,count,active=false) { return `<a class="nav-item ${active?'active':''}" href="${href}" ${active?'aria-current="page"':''}>${icon(name,'nav-icon')}<span>${escape(label)}</span>${count===undefined?'':`<span class="nav-count">${count}</span>`}</a>`; }
let projectStorageMode='local', projectCloud;
const projectStorage={getItem(key){return localStorage.getItem(key);},setItem(key,value){const cloud=projectCloud?.getState();if(cloud?.signedIn&&!cloud.ready&&!cloud.applying)throw Error('Wait for the shared workspace to connect, or sign out to edit locally.');if(projectStorageMode==='shared')sessionStorage.setItem('agencykit-shared-cache',value);else localStorage.setItem(key,value);}};
const projectStore=createProjectStore({storage:projectStorage,catalog:allArchive,archiveProjects,publishingDomains,onError:()=>notify('Your changes could not be saved. Export a backup before closing.')});
const projectsUI=createProjectsUI({container:$('#projects-workspace'),store:projectStore,catalog:allArchive,publishingDomains,notify,onOpenOriginal:openDetails,onRender:paintProjectAccount,
  onPreviewDraft({draft,project,source,frame}) {
    const send=()=>frame.contentWindow?.postMessage({type:'agencykit-draft-preview',sourceId:source.id,project,draft},location.origin);
    frame.onload=send;
    const url='/agencykit/skeleton?item='+encodeURIComponent(source.id)+'&embed=1';
    if(frame.getAttribute('src')!==url)frame.src=url;else send();
  },
  onDownloadDraft({draft,project,source}){downloadSkeleton(source,{draft,project});notify('Your editable project page is downloading.');}
});

const accountDialog=document.createElement('dialog');accountDialog.className='modal project-account-dialog';accountDialog.setAttribute('aria-labelledby','cloud-title');
accountDialog.innerHTML='<form id="cloud-form"><div class="modal-header"><h2 id="cloud-title">Your agency workspace.</h2><button type="button" class="icon-button" data-cloud-close aria-label="Close sign-in">×</button></div><p>Sign in with your approved email. We’ll send a one-time link.</p><label class="field">Email address<input name="email" type="email" autocomplete="email" required maxlength="254"></label><p class="cloud-dialog-note">Your local drafts stay in this browser. Sign-in opens the separate shared workspace; use a backup to bring local work across.</p><p data-cloud-feedback role="status"></p><div class="modal-actions"><button class="primary-button" type="submit">Send sign-in link</button></div></form>';
document.body.append(accountDialog);
function paintProjectAccount(){
  if(!projectCloud)return;const cloud=projectCloud.getState();
  document.querySelectorAll('[data-project-account]').forEach(element=>{
    element.innerHTML='<span class="cloud-state">'+escape(cloud.status)+(cloud.signedIn?' <small>· '+escape(cloud.email)+'</small>':' <small>· this browser</small>')+'</span>'+
      (cloud.message?'<span class="cloud-message">'+escape(cloud.message)+'</span>':'')+
      (!cloud.signedIn?'<button class="quiet-button" data-cloud-login>'+(cloud.needsEmail?'Finish sign-in':'Sign in to sync')+'</button>':
       (cloud.conflict?'<button class="quiet-button" data-cloud-backup>Export my edits</button><button class="quiet-button" data-cloud-reload>Load cloud copy</button>':(!cloud.ready||cloud.status==='Not synced'?'<button class="quiet-button" data-cloud-retry>Retry sync</button>':''))+'<button class="quiet-button" data-cloud-signout>Sign out</button>');
  });
}
function cloudDownload(){const blob=new Blob([projectStore.exportData()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='agencykit-project-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function openProjectSignIn(){
  const cloud=projectCloud.getState();accountDialog.querySelector('[data-cloud-feedback]').textContent='';
  accountDialog.querySelector('button[type="submit"]').textContent=cloud.needsEmail?'Finish sign-in':'Send sign-in link';
  accountDialog.querySelector('#cloud-title').textContent=cloud.needsEmail?'Confirm your email.':'Your agency workspace.';
  try{accountDialog.querySelector('input').value=localStorage.getItem('agencykit-signin-email')||'';}catch{}
  accountDialog.showModal();accountDialog.querySelector('input').focus();
}
accountDialog.querySelector('[data-cloud-close]').addEventListener('click',()=>accountDialog.close());
accountDialog.querySelector('form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;const feedback=accountDialog.querySelector('[data-cloud-feedback]');feedback.textContent='Connecting…';
  try{const email=accountDialog.querySelector('input').value;if(projectCloud.getState().needsEmail){await projectCloud.finishSignIn(email);accountDialog.close();location.hash='clients';render();}else{await projectCloud.sendLink(email);feedback.textContent='Check your inbox for the sign-in link. You can close this window.';}}catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-cloud-login],[data-cloud-signout],[data-cloud-retry],[data-cloud-reload],[data-cloud-backup]');if(!button)return;
  if(button.hasAttribute('data-cloud-login')){openProjectSignIn();return;}
  if(button.hasAttribute('data-cloud-backup')){cloudDownload();return;}
  button.disabled=true;
  try{if(button.hasAttribute('data-cloud-signout'))await projectCloud.signOut();else if(button.hasAttribute('data-cloud-retry'))await projectCloud.retry();else if(button.hasAttribute('data-cloud-reload')){cloudDownload();await projectCloud.loadCloud();notify('Your edits were backed up. The cloud copy is open.');}}catch(error){notify(error.message);}finally{button.disabled=false;}
});
projectCloud=createProjectCloud({store:projectStore,setStorageMode:mode=>{projectStorageMode=mode;},notify,onChange:({reload}={})=>{if(reload){projectsUI.reset?.();if(['client','clients','project','projects'].includes(state.route))render();}paintProjectAccount();}});

function renderNav() {
  $('#library-nav').innerHTML=navLink('All originals','#library','grid',allArchive.length,state.route==='library'&&state.category==='All')+categories.map(category=>navLink(category,`#library/${category.toLowerCase()}`,categoryIcon(category),allArchive.filter(x=>x.category===category).length,state.route==='library'&&state.category===category)).join('');
  $('#collections-nav').hidden=!state.collections.length||state.route==='foundations';
  $('#library-nav').hidden=state.route!=='library';
  $('#collection-links').innerHTML=state.collections.map(c=>navLink(c.name,`#collection/${encodeURIComponent(c.id)}`,'collection',c.items.length,state.collection===c.id)).join('');
}

function preview(item) {
  if(item.thumbnail)return `<img class="source-screenshot" src="${escape(item.thumbnail)}" alt="${escape(item.name)} original page preview" loading="lazy">`;
  return `<div class="original-preview-unavailable"><strong>${escape(item.name)}</strong><span>Original preview unavailable</span></div>`;
}
function card(item) {
  const saved=state.saved.includes(item.id);
  return `<article class="block-card" data-id="${escape(item.id)}"><button class="card-preview" data-detail="${escape(item.id)}" aria-label="Preview ${escape(item.name)}">${preview(item)}<span class="preview-open">Explore ${icon('arrow')}</span></button><div class="card-meta"><div class="card-topline"><button class="card-title" data-detail="${escape(item.id)}">${escape(item.name)}</button><button class="card-menu ${saved?'is-saved':''}" data-save="${escape(item.id)}" aria-label="${saved?'Unsave':'Save'} ${escape(item.name)}" aria-pressed="${saved}">${icon('bookmark')}</button></div><p class="card-description">${escape(item.description)}</p><div class="card-bottom"><span class="category-label">${icon(categoryIcon(item.category))}${escape(item.category)}</span><span class="status-tag">${item.status==='prototype'?'Prototype':'Original'}</span></div></div></article>`;
}
function empty(title,body) { return `<div class="empty-state">${icon('search')}<h2>${escape(title)}</h2><p>${escape(body)}</p><button class="quiet-button" data-clear-search>Clear filters</button></div>`; }
function grid(items) { return `<div class="grid ${state.compact?'compact':''}">${items.map(card).join('')}</div>`; }

function render() {
  renderNav();
  const projectRoute=['clients','client','projects','project'].includes(state.route);
  document.body.classList.toggle('projects-mode',projectRoute);
  $('#projects-workspace').hidden=!projectRoute;
  document.body.classList.toggle('archive-mode',state.route==='archive');
  document.body.classList.toggle('workspace-mode',state.route!=='archive');
  $('#archive-workspace').hidden=state.route!=='archive';
  $('.app-shell').hidden=state.route==='archive'||projectRoute;
  document.querySelectorAll('[data-nav-route]').forEach(a=>{if(a.dataset.navRoute===state.route||(state.route==='collection'&&a.dataset.navRoute==='saved')||(projectRoute&&a.dataset.navRoute==='clients'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(state.route==='archive'){renderArchive();archiveMotion.sync();return;}
  document.body.classList.remove('archive-home','archive-results');
  archiveMotion.sync();
  if(projectRoute){projectsUI.render(location.hash.slice(1).split('/'));paintProjectAccount();return;}
  const inArchive=state.route==='archive';
  const collection=state.collections.find(c=>c.id===state.collection);
  const heading=state.route==='saved'?'Saved for later.':inArchive?'The archive.':state.route==='foundations'?'A familiar feeling.':collection?`${collection.name}.`:state.category==='All'?'Choose an original.':`${state.category}.`;
  const descriptions={library:'Browse original pages. Open one to preview it or create a reusable draft.',saved:'The originals you want to come back to.',archive:'Original work, kept together by project. A little history to build on.',foundations:'Quiet details that make the whole kit feel like it belongs together.',collection:collection?.note||'A few good pieces, brought together for what comes next.'};
  $('#page-title').textContent=heading;
  $('#page-description').textContent=descriptions[state.route]||descriptions.library;
  $('#page-eyebrow').textContent=inArchive?'BEFORE IT BECOMES A STARTING POINT':state.route==='foundations'?'SMALL DETAILS. SHARED EVERYWHERE.':state.route==='saved'?'WORTH KEEPING CLOSE':collection?'A COLLECTION OF POSSIBILITIES':'A LITTLE LESS FROM SCRATCH';
  $('#search').placeholder=inArchive?'Search the archive…':'Find original work…';
  $('#search').setAttribute('aria-label',inArchive?'Search the archive':'Search the library');
  $('#toolbar').hidden=state.route==='foundations';
  $('#new-collection').hidden=state.route==='foundations';
  $('#filter-tabs').innerHTML=(inArchive?['All projects',...archiveProjects.map(p=>p.name)]:[]).map(name=>{const id=archiveProjects.find(p=>p.name===name)?.id||'';return `<button class="filter-tab ${state.project===(id||null)?'active':''}" data-project="${id}" aria-pressed="${state.project===(id||null)}">${escape(name)}</button>`;}).join('');
  const target=$('#view-content');
  if(state.route==='foundations') target.innerHTML=foundations();
  else if(inArchive) {
    const projects=archiveProjects.filter(p=>!state.project||p.id===state.project).map(p=>({...p,filtered:filterItems(allArchive.filter(x=>x.projectId===p.id),{query:state.query})})).filter(p=>p.filtered.length);
    target.innerHTML=`<div class="notice">${icon('archive')}<span>Originals stay here until we turn them into reusable blocks.</span><span class="notice-end">Layout sketches · starter inventory</span></div>`+(projects.length?projects.map(p=>`<section class="archive-project"><div class="project-heading"><span class="project-mark">${escape(p.name.substring(0,1).toLowerCase())}</span><div><h2>${escape(p.name)}</h2><p>${escape(p.description)}</p></div><span class="project-count">${p.filtered.length} pieces</span></div>${grid(p.filtered)}</section>`).join(''):empty('Nothing here just yet.','Try another project or a simpler search.'));
  } else {
    let items=state.route==='saved'?catalog.filter(x=>state.saved.includes(x.id)):collection?catalog.filter(x=>collection.items.includes(x.id)):allArchive;
    items=filterItems(items,{query:state.query,category:state.category});
    const label=collection?'In this collection':state.route==='saved'?'Saved originals':state.category==='All'?'Original work':state.category;
    target.innerHTML=`<div class="section-heading"><span>${label}<span class="section-count">${items.length}</span></span><span class="section-description">${state.route==='library'?'Preview a page, then make it yours.':collection?'A shortlist for your next project.':'Kept in this browser.'}</span></div>`+(items.length?grid(items):empty(state.query?'No matches this time.':collection?'Room for a few good pieces.':'Keep something for later.',state.query?'Try “portal”, “referral”, or “assistant”.':'Use the bookmark on an original to save it, or collect a few pieces.'));
  }
  $('#footer-meta').textContent=`${allArchive.length} originals · ready to skeletonify`;
}


function archiveTile(item,slot,decorative=false) {
  const position=`left:${slot.x}px;top:${slot.y}px;width:${slot.width}px;height:${slot.height}px;--tile-visual-height:${slot.visualHeight}px`;
  if(decorative)return `<div class="archive-tile" style="${position}" aria-hidden="true"><span class="tile-visual">${preview(item)}</span></div>`;
  return `<button class="archive-tile" style="${position}" data-detail="${escape(item.id)}" aria-label="Preview ${escape(item.name)} — ${escape(item.project)}"><span class="tile-visual">${preview(item)}</span><span class="tile-caption"><strong>${escape(item.name)}</strong><span>${escape(item.project)} <i>·</i> ${escape(item.category)}${item.status==='prototype'?' · Prototype':''}</span></span></button>`;
}
function renderArchive(){
  const home=!state.query.trim();
  if(home){archivePage=0;closeAssistant(false);}
  const compact=innerHeight<568;
  document.body.classList.toggle('archive-home',home);
  document.body.classList.toggle('archive-results',!home);
  document.body.classList.toggle('archive-compact',compact);
  const result=home?{items:archiveDeck,corrections:[]}:searchArchiveDetailed(allArchive,state.query);
  const items=result.items;
  const feedback=$('#archive-search-feedback');
  feedback.textContent=result.corrections.length?`Including ${result.corrections.map(({from,to})=>`“${to}” for “${from}”`).join('; ')}`:'';
  feedback.hidden=home||!result.corrections.length;
  document.body.classList.toggle('archive-corrected',!feedback.hidden);
  const canvas=$('#archive-canvas');
  $('#archive-gallery').setAttribute('aria-label',home?'A glimpse of our work':'Search results');
  $('#archive-gallery').setAttribute('aria-hidden',String(home));
  $('#archive-gallery').inert=home;
  const layout=generateArchiveLayout({width:canvas.clientWidth,height:canvas.clientHeight,home,seed:archiveLayoutSeed+archivePage});
  const page=paginateItems(items,archivePage,layout.capacity);
  archivePage=page.page;archivePageCount=page.pageCount;
  const focused=document.activeElement?.closest('.archive-tile')?.dataset.detail;
  canvas.innerHTML=!items.length?`<div class="archive-empty"><h2>No pieces found.</h2><p>Try a project, a page type, or a simpler idea.</p><button type="button" data-refine-search>Try another search ↗</button></div>`:layout.capacity?page.items.map((item,index)=>archiveTile(item,layout.slots[index],home)).join(''):home?'':`<div class="archive-empty archive-space-needed"><h2>A little more room.</h2><p>Make this window taller to see the search results.</p></div>`;
  if(focused)canvas.querySelector(`[data-detail="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  $('#archive-result-controls').hidden=home;
  $('#archive-count').textContent=!items.length?'0 matches':page.items.length?`${archivePage*page.capacity+1}–${archivePage*page.capacity+page.items.length} of ${items.length}`:`${items.length} pieces`;
  $('#archive-previous').disabled=!page.hasPrevious;$('#archive-next').disabled=!page.hasNext;
  $('#archive-pagination').hidden=page.pageCount<=1;
  $('#archive-page-label').textContent=`View ${archivePage+1} of ${page.pageCount||1}`;
  $('#archive-clear').hidden=!$('#archive-search').value;
}
function searchFromInput(){state.query=$('#archive-search').value.trim().slice(0,160);archiveStateChanged();$('#archive-search').focus();}
function archiveStateChanged({resetPage=true}={}){
  if(resetPage)archivePage=0;
  const url=new URL(location.href);url.search='';
  if(state.query)url.searchParams.set('q',state.query);
  if(state.query&&archivePage>0)url.searchParams.set('page',String(archivePage+1));
  url.hash='archive';history.pushState(null,'',url);toggleSuggestions(false);render();window.scrollTo({top:0,behavior:'instant'});
}
function resetArchive(){state.query='';state.project=null;state.category='All';state.scope='all';$('#archive-search').value='';archiveStateChanged();}
function toggleSuggestions(open){$('#search-suggestions').hidden=!open;$('#suggestion-toggle').setAttribute('aria-expanded',String(open));$('#suggestion-toggle').setAttribute('aria-label',open?'Hide search ideas':'Show search ideas');$('#archive-search-stage').classList.toggle('suggestions-open',open);archiveMotion.sync();}
$('#archive-search-form').addEventListener('submit',event=>{event.preventDefault();searchFromInput();});
$('#archive-search').addEventListener('input',()=>{$('#archive-clear').hidden=!$('#archive-search').value;});
$('#archive-clear').addEventListener('click',()=>{$('#archive-search').value='';state.query='';archiveStateChanged();$('#archive-search').focus();});
$('#suggestion-toggle').addEventListener('click',()=>toggleSuggestions($('#search-suggestions').hidden));
$('#archive-search-stage').addEventListener('focusout',event=>{if(event.relatedTarget&&!$('#archive-search-stage').contains(event.relatedTarget)&&!$('#search-suggestions').hidden)toggleSuggestions(false);});
$('#archive-previous').addEventListener('click',()=>{archivePage=Math.max(0,archivePage-1);archiveStateChanged({resetPage:false});if($('#archive-previous').disabled)$('#archive-search').focus({preventScroll:true});});
$('#archive-next').addEventListener('click',()=>{archivePage=Math.min(archivePageCount-1,archivePage+1);archiveStateChanged({resetPage:false});if($('#archive-next').disabled)$('#archive-search').focus({preventScroll:true});});
let layoutFrame=0;
new ResizeObserver(()=>{cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{if(state.route==='archive'){renderArchive();archiveMotion.sync();}});}).observe($('#archive-canvas'));
document.addEventListener('click',event=>{const suggestion=event.target.closest('[data-archive-query]');if(suggestion){$('#archive-search').value=suggestion.dataset.archiveQuery;searchFromInput();}if(event.target.closest('[data-refine-search]')){$('#archive-search').focus();$('#archive-search').select();}});

function foundations() {return `<div class="foundation-intro"><span class="eyebrow">01 / THE CURVE</span><h2>Soft edges.<br>A consistent character.</h2><p>The same continuous curve, scaled to suit the thing you’re holding. Small on a control. Generous on a surface. A little more character in the assistant.</p></div><div class="curve-study"><div class="curve-swatch"><span class="curve-sample tiny"></span><strong>Small</strong><p>Controls & icons</p><code>12 px</code></div><div class="curve-swatch"><span class="curve-sample medium"></span><strong>Medium</strong><p>Cards & objects</p><code>22 px</code></div><div class="curve-swatch"><span class="curve-sample large"></span><strong>Large</strong><p>Panels & dialogs</p><code>32 px</code></div><div class="curve-swatch"><span class="assistant-orb"><span></span></span><strong>Companion</strong><p>A shape with a presence</p><code>Continuous</code></div></div><div class="foundation-bottom"><div><span class="eyebrow">02 / THE PALETTE</span><h2>Room for the work.</h2><p>Ink, graphite, and a little light. A quiet frame lets the color in the work come through.</p><div class="palette"><span style="background:#0c0c0c"></span><span style="background:#171717"></span><span style="background:#282828"></span><span style="background:#8a8a87"></span><span style="background:#ededeb"></span></div></div><div><span class="eyebrow">03 / THE VOICE</span><h2>A helpful person.</h2><p>Say what a thing does. Make the next step clear. Leave a little room to breathe.</p><div class="voice-example">“What are we making?”<small>A question, not a command.</small></div></div></div>`; }

function route() {
  const parts=location.hash.slice(1).split('/');
  state.route=['library','archive','saved','foundations','collection','clients','client','projects','project'].includes(parts[0])?parts[0]:'archive';
  state.category=state.route==='library'?(categories.find(c=>c.toLowerCase()===parts[1])||'All'):'All';
  state.project=state.route==='archive'&&archiveProjects.some(p=>p.id===parts[1])?parts[1]:null;
  state.collection=state.route==='collection'?parts[1]:null;
  if(state.route==='collection'&&!state.collections.some(c=>c.id===state.collection)){state.route='library';state.collection=null;}
  const params=new URLSearchParams(location.search);
  archivePage=Math.max(0,Math.min(10000,Math.floor(Number(params.get('page'))||1)-1));
  state.query=state.route==='archive'?(params.get('q')||'').trim().slice(0,160):'';
  if(state.route==='archive'){
    state.category='All';state.scope='all';state.project=null;
    if(!state.query)archivePage=0;
    const clean=new URL(location.href);clean.search='';clean.hash='archive';
    if(state.query)clean.searchParams.set('q',state.query);
    if(archivePage>0)clean.searchParams.set('page',String(archivePage+1));
    history.replaceState(null,'',clean);
  }
  $('#search').value=''; $('#archive-search').value=state.query;
  closeDetails(); render(); window.scrollTo({top:0,behavior:'instant'});
}
function toggleSave(id) {
  const was=state.saved.includes(id);
  state.saved=was?state.saved.filter(x=>x!==id):[...state.saved,id];
  const insideDetail=!$('#detail-overlay').hidden;
  persist();render(); if(detailId===id){fillDetails(id);$('#detail-content [data-save]')?.focus();}
  else if(!insideDetail)document.querySelector('[data-save="'+CSS.escape(id)+'"]')?.focus();
  notify(was?'Removed from saved.':'Saved for another day.');
}
function fillDetails(id) {
  const item=catalog.find(x=>x.id===id); if(!item)return;
  const original=item.sourceId?allArchive.find(x=>x.id===item.sourceId):null;
  const source=original||item;
  const skeleton=detailView==='skeleton';
  const handoff=skeletonHandoff(source);
  const previewUrl=`/agencykit/skeleton?item=${encodeURIComponent(source.id)}`;
  $('#detail-kicker').textContent=`${source.project||source.origin} / ${source.category}`;
  $('#detail-drawer').classList.toggle('showing-skeleton',skeleton);
  const originalPreview=`${preview(source)}<span class="layout-caption">${escape(source.previewCaption||'Original page · captured September 2026')}</span>`;
  const visual=skeleton?`<div class="skeleton-window" inert><iframe src="${previewUrl}&embed=1" title="${escape(source.name)} skeleton layout" tabindex="-1" aria-hidden="true" loading="eager"></iframe></div>`:source.sourceUrl?`<a class="drawer-preview original-site-preview" href="${escape(source.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${escape(source.name)} — opens in a new tab">${originalPreview}<span class="original-site-cue">Visit site ${icon('external')}</span></a>`:`<div class="drawer-preview">${originalPreview}</div>`;
  const status=source.status==='prototype'?'Local prototype':source.status==='protected'?'Protected workspace':source.status==='contextual'?'Context-specific page':'Original page';
  const sections=source.skeletonSections?.length ? '<details class="detail-sections"><summary>Page sections</summary><ul class="detail-list">'+source.skeletonSections.map(section=>'<li>'+icon('check')+'<span>'+escape(section)+'</span></li>').join('')+'</ul></details>' : '';
  const sourceInfo='<details class="source-details"><summary>About the original</summary>'+(source.sourceHost?'<p class="detail-small">Published on '+escape(source.sourceHost)+'</p>':'')+'<p class="source-path">'+escape(source.sourcePath)+'</p><p class="detail-small">'+escape(source.notes)+'</p></details>';
  const setup=skeleton?'<details class="source-details"><summary>What needs connecting?</summary><p class="detail-small">'+escape(handoff.includes)+'</p><p class="detail-small">'+escape(handoff.note)+'</p><p class="detail-small">'+escape(handoff.connect)+'</p></details>':'';
  const secondary='<div class="detail-secondary">'+(skeleton?'<button class="text-button" data-save="'+escape(source.id)+'">'+icon('bookmark')+(state.saved.includes(source.id)?'Saved':'Save for later')+'</button>':'')+'<button class="text-button" data-collect="'+escape(source.id)+'">Add to a collection '+icon('collection')+'</button></div>';
  $('#detail-content').innerHTML=
    '<div class="detail-view-switch" role="group" aria-label="Preview version"><button data-detail-view="original" aria-pressed="'+!skeleton+'">Original</button><button data-detail-view="skeleton" aria-pressed="'+skeleton+'">Skeletonify '+icon('arrow')+'</button></div>'+visual+
    '<div class="drawer-body"><div class="detail-heading"><h2 id="detail-title">'+escape(source.name)+'</h2></div><p class="detail-description">'+(skeleton?'An unbranded starter for this page type. Use it in a project to add your branding and copy.':escape(source.description))+'</p>'+
    (skeleton?'<div class="skeleton-includes"><span>'+icon('check')+' Editable page</span><span>'+icon('check')+' Example content</span></div><a class="skeleton-full-link" href="'+previewUrl+'" target="_blank" rel="noopener noreferrer">Open full preview '+icon('external')+'</a>':'<div class="detail-status">'+icon('archive')+'<span>'+escape(source.project||source.origin)+' · '+status+'</span></div>')+
    sections+setup+sourceInfo+secondary+'</div><div class="drawer-footer"><button class="primary-button" data-use-project="'+escape(source.id)+'">Use in project '+icon('arrow')+'</button>'+
    (skeleton?'<button class="quiet-button" data-download-skeleton="'+escape(source.id)+'">Download HTML '+icon('arrow')+'</button>':'<button class="quiet-button" data-save="'+escape(source.id)+'">'+icon('bookmark')+(state.saved.includes(source.id)?'Saved':'Save for later')+'</button>')+'</div>';
}
function setBackgroundInert(value){['.app-shell','#archive-workspace','#projects-workspace','.archive-header','#assistant-launcher'].forEach(selector=>$(selector).inert=value);}
function openDetails(id) {if($('#detail-overlay').hidden)previousFocus=document.activeElement;closeAssistant(false);detailId=id;detailView='original';fillDetails(id);$('#detail-content').scrollTop=0;$('#detail-overlay').hidden=false;document.body.classList.add('modal-open');setBackgroundInert(true);archiveMotion.sync();$('#detail-close').focus();}
function closeDetails() {if($('#detail-overlay').hidden)return;$('#detail-overlay').hidden=true;document.body.classList.remove('modal-open');setBackgroundInert(false);detailId=null;if(previousFocus?.isConnected&&previousFocus.getClientRects().length)previousFocus.focus();else (state.route==='archive'?$('#archive-search'):['client','clients','project','projects'].includes(state.route)?$('#projects-workspace'):$('#search')).focus();}
function openCollection(selectedId=null) {
  $('#collection-form').reset();
  $('#collection-options').innerHTML=allArchive.map(item=>`<label class="pick-block"><input type="checkbox" name="blocks" value="${item.id}" ${selectedId===item.id?'checked':''}><span>${escape(item.name)}</span><small>${item.category}</small></label>`).join('');
  $('#collection-modal').showModal();$('#collection-name').focus();
}
function openAssistant(){ if(state.route==='archive'&&!state.query.trim()){$('#archive-search').focus({preventScroll:true});return;}$('#assistant-panel').hidden=false;$('#assistant-launcher').setAttribute('aria-expanded','true');$('#assistant-question').focus(); }
function closeAssistant(restore=true){ $('#assistant-panel').hidden=true;$('#assistant-launcher').setAttribute('aria-expanded','false');if(restore)$('#assistant-launcher').focus(); }
function askGuide(message) {
  const text=message.trim().slice(0,600);if(!text)return;
  $('#assistant-intro').hidden=true;
  const log=$('#assistant-messages');
  const user=document.createElement('p');user.className='assistant-message user';user.textContent=text;log.append(user);
  const reply=document.createElement('div');reply.className='assistant-message';
  let answer, matches=[];
  if(/domain|hosting|hosted|publish(?:ing)? location/i.test(text)){answer='Publishing domains are shared locations where pages are hosted. Choose the client for a project separately; a page on milomessina.com or bijanizadian.com can belong to any client.';matches=[{name:'Clients and publishing domains',href:'#clients'}];}
  else if(/archiv|original|past work/i.test(text)){answer='Search all the original pages, open one you like, then choose “Skeletonify”. You can preview the neutral version and download an editable page for another client.';matches=archiveProjects.map(p=>({name:p.name,href:`#archive/${p.id}`}));}
  else if(/project|client|draft|brand/i.test(text)){answer='Clients are organized into Current clients and Previous clients. Each client keeps its projects, briefs, branding, original work, and editable drafts together. Open an original and choose “Use in project”. Save a version when you want a checkpoint, then export the HTML when it is ready to build on.';matches=[{name:'Your clients',href:'#clients'}];}
  else if(/skeleton|download|reus|template/i.test(text)){answer='Start with the original work. Open a page, choose “Skeletonify”, then download the self-contained HTML file. The neutral layout and local demo interactions are ready to edit; connect your own data and services for a client launch.';matches=[{name:'Browse original work',href:'#library'}];}
  else if(/curve|corner|round|design|aesthetic/i.test(text)){answer='The kit has a neutral frame with continuous corners in three sizes. Original project previews keep their own colors. The assistant carries the same curved shape; explore it in Foundations.';matches=[{name:'Explore the foundations',href:'#foundations'}];}
  else if(/collect|bundle|shortlist/i.test(text)){answer='A collection is a shortlist for a client or project. Choose “New collection”, give it a name, and select a few starting points. It stays in this browser; it doesn’t generate a site yet.';}
  else {const found=searchArchive(allArchive,text).slice(0,4);answer=found.length?'These originals look relevant. Open one to explore the work, then choose “Skeletonify” when you want to reuse it.':'I couldn’t find a matching original. Try a portal, campaign page, application form, or referral flow. This guide searches the catalog; an AI connection comes later.';matches=found.map(x=>({name:x.name,id:x.id}));}
  const label=document.createElement('span');label.className='guide-label';label.textContent='FROM THE LIBRARY';reply.append(label);
  const body=document.createElement('p');body.textContent=answer;reply.append(body);
  const choices=document.createElement('div');choices.className='guide-matches';
  matches.forEach(match=>{const el=document.createElement(match.href?'a':'button');el.className='guide-match';el.textContent=match.name;if(match.href){el.href=match.href;el.addEventListener('click',closeAssistant);}else{el.type='button';el.dataset.detail=match.id;}el.insertAdjacentHTML('beforeend',icon('arrow'));choices.append(el);});
  reply.append(choices);log.append(reply);$('#assistant-question').value='';$('#assistant-body').scrollTop=$('#assistant-body').scrollHeight;
}

['detail-close','collection-close','about-close','assistant-close'].forEach(id=>$('#'+id).innerHTML=icon('close'));
$('#search-icon').innerHTML=icon('search');$('#view-toggle').innerHTML=icon('grid');$('#assistant-send').innerHTML=icon('up');
$('#assistant-suggestions').innerHTML=['Find a portal for onboarding','Explore the project archive','How do collections work?'].map(q=>`<button type="button" data-question="${escape(q)}">${escape(q)}${icon('arrow')}</button>`).join('');
document.addEventListener('click',event=>{
  const use=event.target.closest('[data-use-project]');
  if(use){closeDetails();projectsUI.openUse(use.dataset.useProject);return;}
  const version=event.target.closest('[data-detail-view]');
  if(version&&detailId){detailView=version.dataset.detailView;fillDetails(detailId);$('#detail-content').scrollTop=0;$('#detail-content [data-detail-view="'+detailView+'"]')?.focus();return;}
  const download=event.target.closest('[data-download-skeleton]');
  if(download){const item=allArchive.find(x=>x.id===download.dataset.downloadSkeleton);if(item){try{downloadSkeleton(item);notify('Your editable skeleton is downloading.');}catch{notify('The download could not start. Try the full-size preview.');}}return;}
  const el=event.target.closest('[data-detail],[data-save],[data-project],[data-clear-search],[data-collect],[data-question]');if(!el)return;
  if(el.dataset.detail)openDetails(el.dataset.detail);
  else if(el.dataset.save)toggleSave(el.dataset.save);
  else if(el.hasAttribute('data-project'))location.hash=`archive${el.dataset.project?'/'+el.dataset.project:''}`;
  else if(el.hasAttribute('data-clear-search')){state.query='';$('#search').value='';render();}
  else if(el.dataset.collect)openCollection(el.dataset.collect);
  else if(el.dataset.question)askGuide(el.dataset.question);
});
$('#search').addEventListener('input',e=>{state.query=e.target.value;render();});
$('#view-toggle').addEventListener('click',()=>{state.compact=!state.compact;$('#view-toggle').setAttribute('aria-pressed',String(state.compact));$('#view-toggle').setAttribute('aria-label',state.compact?'Switch to comfortable previews':'Switch to compact previews');render();});
$('#new-collection').addEventListener('click',()=>openCollection());
$('#collection-close').addEventListener('click',()=>$('#collection-modal').close());
$('#collection-form').addEventListener('submit',event=>{
  event.preventDefault();const name=$('#collection-name').value.trim();if(!name)return;
  if(state.collections.length>=30){notify('This preview holds up to 30 collections.');return;}
  const data=new FormData(event.target);const id=crypto.randomUUID();
  state.collections.push({id,name,note:$('#collection-note').value.trim(),items:data.getAll('blocks').filter(id=>catalog.some(x=>x.id===id))});persist();$('#collection-modal').close();location.hash=`collection/${id}`;notify('A new collection, ready for ideas.');
});
$('#detail-close').addEventListener('click',closeDetails);$('#detail-overlay').addEventListener('click',e=>{if(e.target===$('#detail-overlay'))closeDetails();});
$('#about-close').addEventListener('click',()=>$('#about-modal').close());
$('#assistant-launcher').addEventListener('click',()=>$('#assistant-panel').hidden?openAssistant():closeAssistant());$('#assistant-close').addEventListener('click',closeAssistant);
$('#assistant-form').addEventListener('submit',e=>{e.preventDefault();askGuide($('#assistant-question').value);});
document.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]'))return;
  const typing=['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName);
  const drawerOpen=!$('#detail-overlay').hidden;
  if(!drawerOpen&&(event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openAssistant();}
  if(event.key==='/'&&!typing&&!drawerOpen){event.preventDefault();if(['client','clients','project','projects'].includes(state.route)){$('.archive-header a[href="#archive"]').click();$('#archive-search').focus();}else (state.route==='archive'?$('#archive-search'):$('#search')).focus();}
  if(event.key==='Escape'){if(!$('#detail-overlay').hidden)closeDetails();else if(!$('#assistant-panel').hidden)closeAssistant();else if(!$('#search-suggestions').hidden){toggleSuggestions(false);$('#suggestion-toggle').focus({preventScroll:true});}}
  if(event.key==='Tab'&&!$('#detail-overlay').hidden&&!$('#collection-modal').open){const focusable=[...$('#detail-drawer').querySelectorAll('button,a[href]')].filter(x=>!x.disabled);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
document.querySelectorAll('.archive-header a[href="#archive"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();state.route='archive';closeDetails();resetArchive();}));
window.addEventListener('hashchange',route);
window.addEventListener('popstate',route);
$('#archive-about').addEventListener('click',()=>$('#about-modal').showModal());
$('.skip-link').addEventListener('click',event=>{event.preventDefault();(state.route==='archive'?$('#archive-search'):['client','clients','project','projects'].includes(state.route)?$('#projects-workspace'):$('#main-content')).focus();});
await projectCloud.start();
route();
if(projectCloud.getState().needsEmail){location.hash='clients';openProjectSignIn();}
