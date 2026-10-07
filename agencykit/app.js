import { createProjectCloud } from './project-cloud.js';
import { createProjectStore } from './project-store.js';
import { createProjectsUI } from './projects-ui.js';
import { skeletonHandoff } from './project-workflow.js';
import { blocks, categories, searchArchiveDetailed } from './catalog.js';
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
    && $('#search-suggestions').hidden,
});
const escape = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const shapes = {
  archive:'<rect x="3" y="4" width="18" height="4" rx="1.5"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  external:'<path d="M14 4h6v6m0-6L10 14M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
};
const icon = (name, cls='') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || ''}</svg>`;
const allArchive = archiveProjects.flatMap(project => project.items.map(item => ({...item, project: project.name, projectId:project.id, origin:project.name, archived:true})));
const archiveDeck = shuffleItems(allArchive), archiveLayoutSeed = Math.floor(Math.random()*0xFFFFFFFF);
const types = ['All', ...categories];
const makeRoutes = ['clients','client','projects','project'];
let archivePage = 0, archivePageCount = 1;
const state = { route:'archive', query:'', type:'All' };

let toastTimer, detailId = null, detailView = 'original', previousFocus = null;
function notify(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600); }
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

// Saved and Collections were browser-only shortlists. Each moves once into an
// unassigned project in Make, and leaves old storage only after it is saved.
const LEGACY_SHORTLISTS='gtm-kit-v1';
const currentIds=ids=>[...new Set((Array.isArray(ids)?ids:[]).map(id=>allArchive.some(item=>item.id===id)?id:blocks.find(item=>item.id===id)?.sourceId).filter(id=>allArchive.some(item=>item.id===id)))];
function moveShortlistsIntoProjects(){
  let data;
  try{data=JSON.parse(localStorage.getItem(LEGACY_SHORTLISTS)||'null');}catch{return;}
  if(!data||typeof data!=='object')return;
  const collections=(Array.isArray(data.collections)?data.collections:[]).filter(x=>x&&typeof x.name==='string').slice(0,30);
  let saved=currentIds(data.saved), moved=0;
  const remember=()=>{try{if(collections.length||saved.length)localStorage.setItem(LEGACY_SHORTLISTS,JSON.stringify({saved,collections}));else localStorage.removeItem(LEGACY_SHORTLISTS);}catch{/* Retry next visit. */}};
  try{
    while(collections.length){const collection=collections[0];projectStore.createProject({name:collection.name.trim().slice(0,60)||'Collection',description:String(collection.note||'').slice(0,240),originalIds:currentIds(collection.items)});collections.shift();moved++;remember();}
    if(saved.length){projectStore.createProject({name:'Saved pages',description:'Pages saved for later, moved here from the old Saved list.',originalIds:saved});saved=[];moved++;}
  }catch{notify('Some saved pages could not move into Make yet. They will try again next visit.');}
  remember();
  if(moved)notify(`Your saved pages and collections are now ${moved===1?'a project':moved+' projects'} in Make.`);
}

function render() {
  const makeRoute=makeRoutes.includes(state.route);
  $('#projects-workspace').hidden=!makeRoute;
  $('#archive-workspace').hidden=makeRoute;
  document.body.classList.toggle('projects-mode',makeRoute);
  document.body.classList.toggle('archive-mode',!makeRoute);
  document.body.classList.toggle('workspace-mode',makeRoute);
  document.querySelectorAll('[data-nav-route]').forEach(a=>{if(a.dataset.navRoute===(makeRoute?'clients':'archive'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(!makeRoute){renderArchive();archiveMotion.sync();return;}
  document.body.classList.remove('archive-home','archive-results');
  archiveMotion.sync();
  projectsUI.render(location.hash.slice(1).split('/'));paintProjectAccount();
}

function preview(item) {
  if(item.thumbnail)return `<img class="source-screenshot" src="${escape(item.thumbnail)}" alt="${escape(item.name)} original page preview" loading="lazy">`;
  return `<div class="original-preview-unavailable"><strong>${escape(item.name)}</strong><span>Original preview unavailable</span></div>`;
}
function archiveTile(item,slot,decorative=false) {
  const position=`left:${slot.x}px;top:${slot.y}px;width:${slot.width}px;height:${slot.height}px;--tile-visual-height:${slot.visualHeight}px`;
  if(decorative)return `<div class="archive-tile" style="${position}" aria-hidden="true"><span class="tile-visual">${preview(item)}</span></div>`;
  return `<button class="archive-tile" style="${position}" data-detail="${escape(item.id)}" aria-label="Preview ${escape(item.name)} — ${escape(item.project)}"><span class="tile-visual">${preview(item)}</span><span class="tile-caption"><strong>${escape(item.name)}</strong><span>${escape(item.project)} <i>·</i> ${escape(item.category)}${item.status==='prototype'?' · Prototype':''}</span></span></button>`;
}
// Page-type chips replace the old Library tabs. They only appear when a
// search returns more than one type, and they narrow the same results.
function renderTypes(home,total,counts){
  const present=categories.filter(type=>counts[type]), group=$('#archive-types');
  group.hidden=home||present.length<2;
  group.innerHTML=group.hidden?'':['All',...present].map(type=>`<button type="button" data-archive-type="${type}" aria-pressed="${state.type===type}">${type} <span>${type==='All'?total:counts[type]}</span></button>`).join('');
}
function renderArchive(){
  const home=!state.query.trim();
  if(home){archivePage=0;state.type='All';}
  const compact=innerHeight<568;
  document.body.classList.toggle('archive-home',home);
  document.body.classList.toggle('archive-results',!home);
  document.body.classList.toggle('archive-compact',compact);
  const result=home?{items:archiveDeck,corrections:[]}:searchArchiveDetailed(allArchive,state.query);
  const counts=Object.fromEntries(categories.map(type=>[type,result.items.filter(item=>item.category===type).length]));
  if(state.type!=='All'&&!counts[state.type])state.type='All';
  const items=state.type==='All'?result.items:result.items.filter(item=>item.category===state.type);
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
  renderTypes(home,result.items.length,counts);
  $('#archive-count').textContent=!items.length?'0 matches':page.items.length?`${archivePage*page.capacity+1}–${archivePage*page.capacity+page.items.length} of ${items.length}`:`${items.length} pieces`;
  $('#archive-previous').disabled=!page.hasPrevious;$('#archive-next').disabled=!page.hasNext;
  $('#archive-pagination').hidden=page.pageCount<=1;
  $('#archive-page-label').textContent=`View ${archivePage+1} of ${page.pageCount||1}`;
  $('#archive-clear').hidden=!$('#archive-search').value;
}
function searchFromInput(){state.query=$('#archive-search').value.trim().slice(0,160);state.type='All';archiveStateChanged();$('#archive-search').focus();}
function archiveStateChanged({resetPage=true}={}){
  if(resetPage)archivePage=0;
  const url=new URL(location.href);url.search='';
  if(state.query)url.searchParams.set('q',state.query);
  if(state.query&&state.type!=='All')url.searchParams.set('type',state.type.toLowerCase());
  if(state.query&&archivePage>0)url.searchParams.set('page',String(archivePage+1));
  url.hash='archive';history.pushState(null,'',url);toggleSuggestions(false);render();window.scrollTo({top:0,behavior:'instant'});
}
function resetArchive(){state.query='';state.type='All';$('#archive-search').value='';archiveStateChanged();}
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

// Old Library, Saved, Collections, and Foundations links land in Find or Make.
const legacyRoutes={library:'archive',foundations:'archive',saved:'clients',collection:'clients'};
function route() {
  const parts=location.hash.slice(1).split('/');
  if(legacyRoutes[parts[0]]){
    const clean=new URL(location.href);clean.search='';clean.hash=legacyRoutes[parts[0]];
    if(parts[0]==='library'&&categories.some(category=>category.toLowerCase()===parts[1]))clean.searchParams.set('q',parts[1]);
    history.replaceState(null,'',clean);
  }
  const current=location.hash.slice(1).split('/')[0];
  state.route=['archive',...makeRoutes].includes(current)?current:'archive';
  const params=new URLSearchParams(location.search);
  archivePage=Math.max(0,Math.min(10000,Math.floor(Number(params.get('page'))||1)-1));
  state.query=state.route==='archive'?(params.get('q')||'').trim().slice(0,160):'';
  state.type=(state.query&&types.find(type=>type.toLowerCase()===params.get('type')))||'All';
  if(state.route==='archive'){
    if(!state.query)archivePage=0;
    const clean=new URL(location.href);clean.search='';clean.hash='archive';
    if(state.query)clean.searchParams.set('q',state.query);
    if(state.type!=='All')clean.searchParams.set('type',state.type.toLowerCase());
    if(archivePage>0)clean.searchParams.set('page',String(archivePage+1));
    history.replaceState(null,'',clean);
  }
  $('#archive-search').value=state.query;
  closeDetails(); render(); window.scrollTo({top:0,behavior:'instant'});
}
function fillDetails(id) {
  const item=allArchive.find(x=>x.id===id); if(!item)return;
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
  $('#detail-content').innerHTML=
    '<div class="detail-view-switch" role="group" aria-label="Preview version"><button data-detail-view="original" aria-pressed="'+!skeleton+'">Original</button><button data-detail-view="skeleton" aria-pressed="'+skeleton+'">Skeletonify '+icon('arrow')+'</button></div>'+visual+
    '<div class="drawer-body"><div class="detail-heading"><h2 id="detail-title">'+escape(source.name)+'</h2></div><p class="detail-description">'+(skeleton?'An unbranded starter for this page type. Use it in a project to add your branding and copy.':escape(source.description))+'</p>'+
    (skeleton?'<div class="skeleton-includes"><span>'+icon('check')+' Editable page</span><span>'+icon('check')+' Example content</span></div><a class="skeleton-full-link" href="'+previewUrl+'" target="_blank" rel="noopener noreferrer">Open full preview '+icon('external')+'</a>':'<div class="detail-status">'+icon('archive')+'<span>'+escape(source.project||source.origin)+' · '+status+'</span></div>')+
    sections+setup+sourceInfo+'</div><div class="drawer-footer"><button class="primary-button" data-use-project="'+escape(source.id)+'">Use in project '+icon('arrow')+'</button>'+
    (skeleton?'<button class="quiet-button" data-download-skeleton="'+escape(source.id)+'">Download HTML '+icon('arrow')+'</button>':'')+'</div>';
}
function setBackgroundInert(value){['#archive-workspace','#projects-workspace','.archive-header'].forEach(selector=>$(selector).inert=value);}
function openDetails(id) {if($('#detail-overlay').hidden)previousFocus=document.activeElement;detailId=id;detailView='original';fillDetails(id);$('#detail-content').scrollTop=0;$('#detail-overlay').hidden=false;document.body.classList.add('modal-open');setBackgroundInert(true);archiveMotion.sync();$('#detail-close').focus();}
function closeDetails() {if($('#detail-overlay').hidden)return;$('#detail-overlay').hidden=true;document.body.classList.remove('modal-open');setBackgroundInert(false);detailId=null;if(previousFocus?.isConnected&&previousFocus.getClientRects().length)previousFocus.focus();else (state.route==='archive'?$('#archive-search'):$('#projects-workspace')).focus();}
function focusFind(){if(state.route!=='archive')$('.archive-header a[href="#archive"]').click();$('#archive-search').focus();}

['detail-close','about-close'].forEach(id=>$('#'+id).innerHTML=icon('close'));
document.addEventListener('click',event=>{
  const use=event.target.closest('[data-use-project]');
  if(use){closeDetails();projectsUI.openUse(use.dataset.useProject);return;}
  const version=event.target.closest('[data-detail-view]');
  if(version&&detailId){detailView=version.dataset.detailView;fillDetails(detailId);$('#detail-content').scrollTop=0;$('#detail-content [data-detail-view="'+detailView+'"]')?.focus();return;}
  const download=event.target.closest('[data-download-skeleton]');
  if(download){const item=allArchive.find(x=>x.id===download.dataset.downloadSkeleton);if(item){try{downloadSkeleton(item);notify('Your editable skeleton is downloading.');}catch{notify('The download could not start. Try the full-size preview.');}}return;}
  const type=event.target.closest('[data-archive-type]');
  if(type){state.type=types.includes(type.dataset.archiveType)?type.dataset.archiveType:'All';archiveStateChanged();$(`[data-archive-type="${CSS.escape(state.type)}"]`)?.focus({preventScroll:true});return;}
  const detail=event.target.closest('[data-detail]');
  if(detail)openDetails(detail.dataset.detail);
});
$('#detail-close').addEventListener('click',closeDetails);$('#detail-overlay').addEventListener('click',e=>{if(e.target===$('#detail-overlay'))closeDetails();});
$('#about-close').addEventListener('click',()=>$('#about-modal').close());
document.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]'))return;
  const typing=['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName);
  const drawerOpen=!$('#detail-overlay').hidden;
  if(!drawerOpen&&(event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();focusFind();}
  if(event.key==='/'&&!typing&&!drawerOpen){event.preventDefault();focusFind();}
  if(event.key==='Escape'){if(drawerOpen)closeDetails();else if(!$('#search-suggestions').hidden){toggleSuggestions(false);$('#suggestion-toggle').focus({preventScroll:true});}}
  if(event.key==='Tab'&&drawerOpen){const focusable=[...$('#detail-drawer').querySelectorAll('button,a[href]')].filter(x=>!x.disabled);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
document.querySelectorAll('.archive-header a[href="#archive"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();state.route='archive';closeDetails();resetArchive();}));
window.addEventListener('hashchange',route);
window.addEventListener('popstate',route);
$('#archive-about').addEventListener('click',()=>$('#about-modal').showModal());
$('.skip-link').addEventListener('click',event=>{event.preventDefault();(state.route==='archive'?$('#archive-search'):$('#projects-workspace')).focus();});
await projectCloud.start();
moveShortlistsIntoProjects();
route();
if(projectCloud.getState().needsEmail){location.hash='clients';openProjectSignIn();}
