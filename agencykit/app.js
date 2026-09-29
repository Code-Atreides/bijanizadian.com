import { blocks, categories, filterItems, lookupItems, searchArchive } from './catalog.js';
import { archiveProjects } from './archive-data.js';
import { createArchiveMotion } from './archive-motion.js';

const $ = selector => document.querySelector(selector);
const archiveMotion = createArchiveMotion({
  canvas: $('#archive-canvas'),
  isActive: () => document.body.classList.contains('archive-home')
    && !document.body.classList.contains('modal-open')
    && !document.querySelector('dialog[open]')
    && $('#assistant-panel').hidden && $('#search-suggestions').hidden
    && !document.activeElement?.matches('input,textarea,select'),
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
const catalog = [...blocks, ...allArchive];
const state = { route:'archive', scope:'finished', category:'All', project:null, collection:null, query:'', compact:false, saved:[], collections:[] };
try {
  const data = JSON.parse(localStorage.getItem('gtm-kit-v1') || '{}');
  state.saved = Array.isArray(data.saved) ? data.saved.filter(id => catalog.some(x=>x.id===id)) : [];
  state.collections = Array.isArray(data.collections) ? data.collections.filter(x => typeof x.id==='string' && typeof x.name==='string' && Array.isArray(x.items)).slice(0,30).map(x=>({id:x.id,name:x.name.slice(0,60),note:String(x.note||'').slice(0,240),items:x.items.filter(id=>catalog.some(i=>i.id===id))})) : [];
} catch { /* The local frame works without browser storage. */ }

let toastTimer, detailId = null, previousFocus = null;
function notify(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600); }
function persist() { try { localStorage.setItem('gtm-kit-v1',JSON.stringify({saved:state.saved,collections:state.collections})); } catch { notify('Browser storage is unavailable. Changes last for this visit.'); } }
function navLink(label,href,name,count,active=false) { return `<a class="nav-item ${active?'active':''}" href="${href}" ${active?'aria-current="page"':''}>${icon(name,'nav-icon')}<span>${escape(label)}</span>${count===undefined?'':`<span class="nav-count">${count}</span>`}</a>`; }
function renderNav() {
  $('#library-nav').innerHTML=navLink('All blocks','#library','grid',blocks.length,state.route==='library'&&state.category==='All')+categories.map(category=>navLink(category,`#library/${category.toLowerCase()}`,categoryIcon(category),blocks.filter(x=>x.category===category).length,state.route==='library'&&state.category===category)).join('');
  $('#workspace-nav').innerHTML=navLink('Saved','#saved','bookmark',state.saved.length,state.route==='saved')+navLink('Archive','#archive','archive',allArchive.length,state.route==='archive')+navLink('Foundations','#foundations','curve',undefined,state.route==='foundations');
  $('#collections-nav').hidden=!state.collections.length;
  $('#collection-links').innerHTML=state.collections.map(c=>navLink(c.name,`#collection/${encodeURIComponent(c.id)}`,'collection',c.items.length,state.collection===c.id)).join('');
}

const line = (w='75%') => `<span class="mini-line" style="width:${w}"></span>`;
const lines = () => `<div class="mini-lines">${line('95%')}${line('81%')}${line('60%')}</div>`;
const button = (label='Continue') => `<span class="mini-button">${label}</span>`;
const miniNav = () => `<div class="mini-nav"><span class="mini-logo"></span><div class="mini-links"><i></i><i></i><i></i></div><span class="mini-label">Menu ↗</span></div>`;
function preview(item) {
  if(item.thumbnail) return `<img class="source-screenshot" src="${escape(item.thumbnail)}" alt="${escape(item.name)} page preview" loading="lazy">`;
  const name = item.preview;
  let html='';
  if(name==='portal') html=`${miniNav()}<div class="mini-content portal-content"><span class="mini-label">YOUR COMMUNITY</span><div class="mini-title">A place to belong.</div><div class="mini-panel"><div class="mini-stat"><b>24 <em>/ 40</em></b><span class="mini-label">Members joined</span></div><div class="mini-progress"><span></span></div>${line('71%')}${button('Join your community →')}</div></div>`;
  else if(name==='dashboard') html=`<div class="mini-dashboard"><div class="mini-sidebar"><span class="mini-logo"></span>${line('70%')}${line('90%')}${line('65%')}${line('80%')}</div><div class="mini-dashboard-main"><span class="mini-label">OVERVIEW</span><div class="mini-title">Welcome back.</div><div class="mini-columns"><div class="mini-tile"><b>12</b>${line()}</div><div class="mini-tile"><b>08</b>${line()}</div><div class="mini-tile"><b>04</b>${line()}</div></div><div class="mini-chart"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>`;
  else if(name==='landing') html=`${miniNav()}<div class="mini-content landing-content"><span class="mini-label">SOMETHING WORTH JOINING</span><div class="mini-title">A new chapter<br>starts here.</div>${lines()}${button('Find your place ↗')}<div class="mini-landscape"><span></span><span></span><span></span></div></div>`;
  else if(name==='event') html=`${miniNav()}<div class="mini-content event-content"><div class="mini-event-art"><span class="mini-event-ring"></span><i>together.</i></div><div><span class="mini-label">GOOD COMPANY</span><div class="mini-title">A seat at<br>the table.</div>${lines()}${button('Save a seat')}</div></div>`;
  else if(name==='form') html=`${miniNav()}<div class="mini-content form-content"><span class="mini-label">01 — A LITTLE ABOUT YOU</span><div class="mini-title">Let’s start<br>with your name.</div><div class="mini-input">Your name</div>${button('Next step →')}<div class="mini-step"><b></b><b></b><b></b><b></b></div></div>`;
  else if(name==='referral') html=`${miniNav()}<div class="mini-content referral-content"><div class="mini-share-icon">↗</div><div class="mini-title">Better, together.</div>${lines()}<div class="mini-input">your.link / invite<span>Copy</span></div>${button('Invite someone →')}</div>`;
  else if(name==='gallery') html=`${miniNav()}<div class="mini-content"><div class="mini-title">Selected works.</div><div class="mini-art-grid"><div></div><div></div><div></div><div></div></div></div>`;
  else if(name==='directory') html=`<div class="mini-dashboard"><div class="mini-sidebar"><span class="mini-logo"></span>${line()}${line('90%')}${line('65%')}</div><div class="mini-dashboard-main"><span class="mini-label">PEOPLE & POSSIBILITIES</span><div class="mini-title">Stay in touch.</div><div class="mini-table">${[0,1,2,3].map(i=>`<div class="mini-row"><span class="mini-circle"></span><div>${line('80%')}${line('55%')}</div><i></i></div>`).join('')}</div></div></div>`;
  else html=`<div class="mini-assistant"><div class="mini-assistant-orb"><span></span></div><div class="mini-assistant-panel"><span class="mini-label">A LITTLE HELP</span><div class="mini-title">What’s on<br>your mind?</div><div class="mini-question">Find my next step <span>↗</span></div><div class="mini-question">Help me get started <span>↗</span></div><div class="mini-input">Ask anything… <span>↑</span></div></div></div>`;
  return `<div class="mini-page mini-${escape(name)}" aria-hidden="true">${html}</div>`;
}
function card(item) {
  const saved=state.saved.includes(item.id);
  return `<article class="block-card" data-id="${escape(item.id)}"><button class="card-preview" data-detail="${escape(item.id)}" aria-label="Preview ${escape(item.name)}">${preview(item)}<span class="preview-open">Explore ${icon('arrow')}</span></button><div class="card-meta"><div class="card-topline"><button class="card-title" data-detail="${escape(item.id)}">${escape(item.name)}</button><button class="card-menu ${saved?'is-saved':''}" data-save="${escape(item.id)}" aria-label="${saved?'Unsave':'Save'} ${escape(item.name)}" aria-pressed="${saved}">${icon('bookmark')}</button></div><p class="card-description">${escape(item.description)}</p><div class="card-bottom"><span class="category-label">${icon(categoryIcon(item.category))}${escape(item.category)}</span><span class="status-tag">${item.archived?(item.status==='prototype'?'Prototype':'Original'):'Blueprint'}</span></div></div></article>`;
}
function empty(title,body) { return `<div class="empty-state">${icon('search')}<h2>${escape(title)}</h2><p>${escape(body)}</p><button class="quiet-button" data-clear-search>Clear filters</button></div>`; }
function grid(items) { return `<div class="grid ${state.compact?'compact':''}">${items.map(card).join('')}</div>`; }

function render() {
  renderNav();
  document.body.classList.toggle('archive-mode',state.route==='archive');
  document.body.classList.toggle('workspace-mode',state.route!=='archive');
  $('#archive-workspace').hidden=state.route!=='archive';
  $('.app-shell').hidden=state.route==='archive';
  document.querySelectorAll('[data-nav-route]').forEach(a=>{if(a.dataset.navRoute===state.route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(state.route==='archive'){renderArchive();archiveMotion.sync();return;}
  document.body.classList.remove('archive-home','archive-results');
  archiveMotion.sync();
  const inArchive=state.route==='archive';
  const collection=state.collections.find(c=>c.id===state.collection);
  const heading=state.route==='saved'?'Saved for later.':inArchive?'The archive.':state.route==='foundations'?'A familiar feeling.':collection?`${collection.name}.`:state.category==='All'?'The skeletons.':`${state.category}.`;
  const descriptions={library:'The shapes of things to come. Blueprints now, reusable pieces next.',saved:'The pieces you want to come back to.',archive:'Original work, kept together by project. A little history to build on.',foundations:'Quiet details that make the whole kit feel like it belongs together.',collection:collection?.note||'A few good pieces, brought together for what comes next.'};
  $('#page-title').textContent=heading;
  $('#page-description').textContent=descriptions[state.route]||descriptions.library;
  $('#page-eyebrow').textContent=inArchive?'BEFORE IT BECOMES A STARTING POINT':state.route==='foundations'?'SMALL DETAILS. SHARED EVERYWHERE.':state.route==='saved'?'WORTH KEEPING CLOSE':collection?'A COLLECTION OF POSSIBILITIES':'A LITTLE LESS FROM SCRATCH';
  $('#breadcrumb-current').textContent=inArchive?'Archive':state.route==='foundations'?'Foundations':state.route==='saved'?'Saved':collection?'Collections':state.category==='All'?'Library':state.category;
  $('#search').placeholder=inArchive?'Search the archive…':'Find a starting point…';
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
    let items=state.route==='saved'?catalog.filter(x=>state.saved.includes(x.id)):collection?catalog.filter(x=>collection.items.includes(x.id)):blocks;
    items=filterItems(items,{query:state.query,category:state.category});
    const label=collection?'IN THIS COLLECTION':state.route==='saved'?'YOUR SAVED PIECES':state.category==='All'?'THE STARTING POINTS':state.category.toUpperCase();
    target.innerHTML=`<div class="section-heading"><span>${label}<span class="section-count">${items.length}</span></span><span class="section-description">${state.route==='library'?'Blueprints for now. Originals live in the archive.':collection?'A shortlist, not a generated site.':'Kept in this browser.'}</span></div>`+(items.length?grid(items):empty(state.query?'No matches this time.':collection?'Room for a few good pieces.':'Keep something for later.',state.query?'Try “portal”, “referral”, or “assistant”.':'Use the bookmark on a block to save it, or collect a few starting points.'));
  }
  $('#footer-meta').textContent=inArchive?`${allArchive.length} originals · ${archiveProjects.length} projects`:'Kit frame · v0.2';
}


function archiveTile(item) {
  return `<button class="archive-tile" data-detail="${escape(item.id)}" aria-label="Preview ${escape(item.name)} — ${escape(item.project)}"><span class="tile-visual">${preview(item)}</span><span class="tile-caption"><strong>${escape(item.name)}</strong><span>${escape(item.project)} <i>·</i> ${escape(item.category)}${item.status==='prototype'?' · Prototype':''}</span></span></button>`;
}
function renderArchive(){
  const home=!state.query&&state.category==='All'&&!state.project&&state.scope==='finished';
  document.body.classList.toggle('archive-home',home);
  document.body.classList.toggle('archive-results',!home);
  let items=allArchive.filter(item=>state.scope==='all'||(state.scope==='prototype'?item.status==='prototype':['finished','contextual'].includes(item.status)));
  items=items.filter(item=>(!state.project||item.projectId===state.project)&&(state.category==='All'||item.category===state.category));
  items=searchArchive(items,state.query);
  // Mix projects across the home canvas; filtered results retain their relevance order.
  if(home){const preferred=['fomo-campus','lucien-gallery','fomo-greek-wars','fomo-clan-claim','lucien-collection','fomo-dinners','fomo-refer','fomo-clan','lucien-shows','fomo-onboard','fomo-campus-visit','lucien-about','fomo-dinner-application','fomo-campus-directory'];items.sort((a,b)=>preferred.indexOf(a.id)-preferred.indexOf(b.id));}
  $('#archive-canvas').innerHTML=items.length?items.map(archiveTile).join(''):`<div class="archive-empty"><h2>No pieces found.</h2><p>Try a project, a page type, or a simpler idea. “All originals” also includes local prototypes and protected tools.</p><button type="button" data-reset-archive>Show all finished work ↗</button></div>`;
  $('#archive-project').innerHTML='<option value="">All projects</option>'+archiveProjects.map(p=>`<option value="${p.id}">${escape(p.name)}</option>`).join('');
  $('#archive-project').value=state.project||'';$('#archive-type').value=state.category;$('#archive-scope').value=state.scope;
  $('#archive-count').textContent=`${items.length} ${items.length===1?'piece':'pieces'}${state.query?' found':''}`;
  $('#archive-reset').hidden=home;$('#archive-clear').hidden=!$('#archive-search').value;
}
function searchFromInput(){state.query=$('#archive-search').value.trim().slice(0,160);archiveStateChanged();$('#archive-search').focus();}
function archiveStateChanged(){
  const url=new URL(location.href);url.search='';
  if(state.query)url.searchParams.set('q',state.query);
  if(state.category!=='All')url.searchParams.set('type',state.category);
  if(state.project)url.searchParams.set('project',state.project);
  if(state.scope!=='finished')url.searchParams.set('scope',state.scope);
  url.hash='archive';history.pushState(null,'',url);toggleSuggestions(false);render();window.scrollTo({top:0,behavior:'instant'});
}
function resetArchive(){state.query='';state.project=null;state.category='All';state.scope='finished';$('#archive-search').value='';archiveStateChanged();}
function toggleSuggestions(open){$('#search-suggestions').hidden=!open;$('#suggestion-toggle').setAttribute('aria-expanded',String(open));$('#suggestion-toggle').setAttribute('aria-label',open?'Hide search ideas':'Show search ideas');$('#archive-search-stage').classList.toggle('suggestions-open',open);archiveMotion.sync();}
$('#archive-search-form').addEventListener('submit',event=>{event.preventDefault();searchFromInput();});
$('#archive-search').addEventListener('input',()=>{$('#archive-clear').hidden=!$('#archive-search').value;});
$('#archive-clear').addEventListener('click',()=>{$('#archive-search').value='';state.query='';archiveStateChanged();$('#archive-search').focus();});
$('#suggestion-toggle').addEventListener('click',()=>toggleSuggestions($('#search-suggestions').hidden));
$('#archive-project').addEventListener('change',event=>{state.project=event.target.value||null;archiveStateChanged();});
$('#archive-type').addEventListener('change',event=>{state.category=event.target.value;archiveStateChanged();});
$('#archive-scope').addEventListener('change',event=>{state.scope=event.target.value;archiveStateChanged();});
$('#archive-reset').addEventListener('click',resetArchive);
document.addEventListener('click',event=>{const suggestion=event.target.closest('[data-archive-query]');if(suggestion){$('#archive-search').value=suggestion.dataset.archiveQuery;searchFromInput();}if(event.target.closest('[data-reset-archive]'))resetArchive();});

function foundations() {return `<div class="foundation-intro"><span class="eyebrow">01 / THE CURVE</span><h2>Soft edges.<br>A consistent character.</h2><p>The same continuous curve, scaled to suit the thing you’re holding. Small on a control. Generous on a surface. A little more character in the assistant.</p></div><div class="curve-study"><div class="curve-swatch"><span class="curve-sample tiny"></span><strong>Small</strong><p>Controls & icons</p><code>12 px</code></div><div class="curve-swatch"><span class="curve-sample medium"></span><strong>Medium</strong><p>Cards & objects</p><code>22 px</code></div><div class="curve-swatch"><span class="curve-sample large"></span><strong>Large</strong><p>Panels & dialogs</p><code>32 px</code></div><div class="curve-swatch"><span class="assistant-orb"><span></span></span><strong>Companion</strong><p>A shape with a presence</p><code>Continuous</code></div></div><div class="foundation-bottom"><div><span class="eyebrow">02 / THE PALETTE</span><h2>Room for the work.</h2><p>Paper, stone, graphite, and ink. Color can arrive with a client. The library stays quiet.</p><div class="palette"><span style="background:#f7f7f5"></span><span style="background:#e9e9e6"></span><span style="background:#b8b8b3"></span><span style="background:#747470"></span><span style="background:#242423"></span></div></div><div><span class="eyebrow">03 / THE VOICE</span><h2>A helpful person.</h2><p>Say what a thing does. Make the next step clear. Leave a little room to breathe.</p><div class="voice-example">“What are we making?”<small>A question, not a command.</small></div></div></div>`; }

function route() {
  const parts=location.hash.slice(1).split('/');
  state.route=['library','archive','saved','foundations','collection'].includes(parts[0])?parts[0]:'archive';
  state.category=state.route==='library'?(categories.find(c=>c.toLowerCase()===parts[1])||'All'):'All';
  state.project=state.route==='archive'&&archiveProjects.some(p=>p.id===parts[1])?parts[1]:null;
  state.collection=state.route==='collection'?parts[1]:null;
  if(state.route==='collection'&&!state.collections.some(c=>c.id===state.collection)){state.route='library';state.collection=null;}
  const params=new URLSearchParams(location.search);
  state.query=state.route==='archive'?(params.get('q')||'').slice(0,160):'';
  if(state.route==='archive'){
    state.category=categories.includes(params.get('type'))?params.get('type'):'All';
    state.scope=['all','prototype'].includes(params.get('scope'))?params.get('scope'):'finished';
    state.project=state.project||(archiveProjects.some(p=>p.id===params.get('project'))?params.get('project'):null);
    if(parts[1]){state.query='';state.category='All';state.scope='all';const clean=new URL(location.href);clean.search='';clean.searchParams.set('scope','all');history.replaceState(null,'',clean);}
  }
  $('#search').value=''; $('#archive-search').value=state.query;
  closeSidebar(); closeDetails(); render(); window.scrollTo({top:0,behavior:'instant'});
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
  $('#detail-kicker').textContent=item.archived?`${item.project} / ${item.status==='prototype'?'PROTOTYPE':'ORIGINAL'}`:`${item.category} / BLUEPRINT`;
  $('#detail-content').innerHTML=`<div class="drawer-preview">${preview(item)}<span class="layout-caption">${item.thumbnail?'Original page · captured September 2026':(item.archived?'Layout sketch · source requires context':'Illustrative blueprint · not built yet')}</span></div><div class="drawer-body"><h2 id="detail-title">${escape(item.name)}</h2><p class="detail-description">${escape(item.description)}</p><div class="detail-status">${icon(item.archived?'archive':'curve')}<span>${item.archived?(item.status==='prototype'?'Local prototype · not deployed':item.status==='protected'?'Protected workspace · original':item.status==='contextual'?'Chapter link required · original':'Original page · not converted'):'A proposed starting point · not a working template yet'}</span></div>${item.includes?`<div class="detail-label">WHAT IT WILL HOLD</div><ul class="detail-list">${item.includes.map(x=>`<li>${icon('check')}${escape(x)}</li>`).join('')}</ul>`:''}<div class="detail-label">${item.archived?'PROJECT':'INSPIRED BY'}</div><p class="detail-value">${escape(item.origin||item.project)}</p>${item.archived?`<div class="detail-label">SOURCE REFERENCE</div><p class="source-path">${escape(item.sourcePath)}</p><p class="detail-small">${escape(item.notes||'Original source inspected locally. No template extraction has been performed.')}</p>`:`<p class="detail-small">Client branding, content, data, and connections will be separated when we build this block.</p>`}</div><div class="drawer-footer"><button class="primary-button" data-save="${escape(id)}">${icon('bookmark')}${state.saved.includes(id)?'Saved':'Save block'}</button><button class="quiet-button" data-collect="${escape(id)}">Create collection</button>${original?`<button class="text-button" data-detail="${original.id}">View original ${icon('arrow')}</button>`:''}${item.sourceUrl?`<a class="text-button" href="${escape(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source site ${icon('external')}</a>`:''}</div>`;
}
function setBackgroundInert(value){['.app-shell','#archive-workspace','.archive-header','#assistant-launcher'].forEach(selector=>$(selector).inert=value);}
function openDetails(id) {if($('#detail-overlay').hidden)previousFocus=document.activeElement;closeAssistant(false);detailId=id;fillDetails(id);$('#detail-overlay').hidden=false;document.body.classList.add('modal-open');setBackgroundInert(true);$('#detail-close').focus();}
function closeDetails() {if($('#detail-overlay').hidden)return;$('#detail-overlay').hidden=true;document.body.classList.remove('modal-open');setBackgroundInert(false);detailId=null;if(previousFocus?.isConnected&&previousFocus.getClientRects().length)previousFocus.focus();else (state.route==='archive'?$('#archive-search'):$('#search')).focus();}
function openCollection(selectedId=null) {
  $('#collection-form').reset();
  $('#collection-options').innerHTML=blocks.map(item=>`<label class="pick-block"><input type="checkbox" name="blocks" value="${item.id}" ${selectedId===item.id?'checked':''}><span>${escape(item.name)}</span><small>${item.category}</small></label>`).join('');
  if(selectedId&&!blocks.some(x=>x.id===selectedId)){const item=catalog.find(x=>x.id===selectedId);$('#collection-options').insertAdjacentHTML('beforeend',`<label class="pick-block"><input type="checkbox" name="blocks" value="${escape(item.id)}" checked><span>${escape(item.name)}</span><small>Archive</small></label>`);}
  $('#collection-modal').showModal();$('#collection-name').focus();
}
function openAssistant(){ $('#assistant-panel').hidden=false;$('#assistant-launcher').setAttribute('aria-expanded','true');$('#assistant-question').focus(); }
function closeAssistant(restore=true){ $('#assistant-panel').hidden=true;$('#assistant-launcher').setAttribute('aria-expanded','false');if(restore)$('#assistant-launcher').focus(); }
function askGuide(message) {
  const text=message.trim().slice(0,600);if(!text)return;
  $('#assistant-intro').hidden=true;
  const log=$('#assistant-messages');
  const user=document.createElement('p');user.className='assistant-message user';user.textContent=text;log.append(user);
  const reply=document.createElement('div');reply.className='assistant-message';
  let answer, matches=[];
  if(/archiv|original|past work/i.test(text)){answer='The archive keeps original work together by project. These pages haven’t been turned into reusable blocks yet.';matches=archiveProjects.map(p=>({name:p.name,href:`#archive/${p.id}`}));}
  else if(/curve|corner|round|design|aesthetic/i.test(text)){answer='The kit has a neutral frame with continuous corners in three sizes. Original project previews keep their own colors. The assistant carries the same curved shape; explore it in Foundations.';matches=[{name:'Explore the foundations',href:'#foundations'}];}
  else if(/collect|bundle|shortlist/i.test(text)){answer='A collection is a shortlist for a client or project. Choose “New collection”, give it a name, and select a few starting points. It stays in this browser; it doesn’t generate a site yet.';}
  else {const found=lookupItems(blocks,text);answer=found.length?'These starting points look relevant. Open one to see what it will include and the original work behind it.':'I couldn’t find a matching starting point. Try a portal, campaign page, application form, or referral flow. This preview searches the catalog; an AI connection comes later.';matches=found.map(x=>({name:x.name,id:x.id}));}
  const label=document.createElement('span');label.className='guide-label';label.textContent='FROM THE LIBRARY';reply.append(label);
  const body=document.createElement('p');body.textContent=answer;reply.append(body);
  const choices=document.createElement('div');choices.className='guide-matches';
  matches.forEach(match=>{const el=document.createElement(match.href?'a':'button');el.className='guide-match';el.textContent=match.name;if(match.href){el.href=match.href;el.addEventListener('click',closeAssistant);}else{el.type='button';el.dataset.detail=match.id;}el.insertAdjacentHTML('beforeend',icon('arrow'));choices.append(el);});
  reply.append(choices);log.append(reply);$('#assistant-question').value='';$('#assistant-body').scrollTop=$('#assistant-body').scrollHeight;
}
function closeSidebar(){document.body.classList.remove('nav-open');$('#sidebar-backdrop').hidden=true;$('#mobile-menu').setAttribute('aria-expanded','false');}

['detail-close','collection-close','about-close','assistant-close'].forEach(id=>$('#'+id).innerHTML=icon('close'));
$('#mobile-menu').innerHTML=icon('menu');$('#search-icon').innerHTML=icon('search');$('#view-toggle').innerHTML=icon('grid');$('#assistant-send').innerHTML=icon('up');
$('#assistant-suggestions').innerHTML=['Find a portal for onboarding','Explore the project archive','How do collections work?'].map(q=>`<button type="button" data-question="${escape(q)}">${escape(q)}${icon('arrow')}</button>`).join('');
document.addEventListener('click',event=>{
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
$('#about-button').addEventListener('click',()=>$('#about-modal').showModal());$('#about-close').addEventListener('click',()=>$('#about-modal').close());
$('#assistant-launcher').addEventListener('click',()=>$('#assistant-panel').hidden?openAssistant():closeAssistant());$('#open-assistant-top').addEventListener('click',openAssistant);$('#assistant-close').addEventListener('click',closeAssistant);
$('#assistant-form').addEventListener('submit',e=>{e.preventDefault();askGuide($('#assistant-question').value);});
$('#mobile-menu').addEventListener('click',()=>{const open=!document.body.classList.contains('nav-open');document.body.classList.toggle('nav-open',open);$('#sidebar-backdrop').hidden=!open;$('#mobile-menu').setAttribute('aria-expanded',String(open));});$('#sidebar-backdrop').addEventListener('click',closeSidebar);
document.addEventListener('keydown',event=>{
  if($('#collection-modal').open||$('#about-modal').open)return;
  const typing=['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName);
  const drawerOpen=!$('#detail-overlay').hidden;
  if(!drawerOpen&&(event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openAssistant();}
  if(event.key==='/'&&!typing&&!drawerOpen){event.preventDefault();(state.route==='archive'?$('#archive-search'):$('#search')).focus();}
  if(event.key==='Escape'){if(!$('#detail-overlay').hidden)closeDetails();else if(!$('#assistant-panel').hidden)closeAssistant();else closeSidebar();}
  if(event.key==='Tab'&&!$('#detail-overlay').hidden&&!$('#collection-modal').open){const focusable=[...$('#detail-drawer').querySelectorAll('button,a[href]')].filter(x=>!x.disabled);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
document.querySelectorAll('.archive-header a[href="#archive"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();state.route='archive';closeDetails();resetArchive();}));
window.addEventListener('hashchange',route);
window.addEventListener('popstate',route);
$('#archive-about').addEventListener('click',()=>$('#about-modal').showModal());
$('.skip-link').addEventListener('click',event=>{event.preventDefault();(state.route==='archive'?$('#archive-workspace'):$('#main-content')).focus();});
route();
