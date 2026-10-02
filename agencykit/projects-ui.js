import { recommendOriginals, projectJourneys, skeletonHandoff, LAUNCH_CHECKS, reviewProgress, projectNextStep } from './project-workflow.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const safeUrl = value => {
  if (!String(value || '').trim()) return '';
  if (/[\u0000-\u0020\u007f]/.test(String(value).trim())) return '';
  try {
    const url = new URL(String(value).trim());
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};
const sourceHost = source => {
  const url=safeUrl(source?.sourceUrl);
  if(url)return new URL(url).hostname.replace(/^www\./,'');
  const host=String(source?.sourceHost||'').trim().toLowerCase();
  return /^[a-z\d.-]+\.[a-z]{2,}$/i.test(host)?host.replace(/^www\./,''):'';
};
const monogram = name => String(name || 'Project').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const dateLabel = value => { const date = new Date(value); return Number.isNaN(date.valueOf()) || date.getUTCFullYear() <= 1970 ? '' : date.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}); };
const decode = value => { try { return decodeURIComponent(value || ''); } catch { return ''; } };
const statuses = ['draft', 'review', 'live'];
const statusOptions = current => statuses.map(status => `<option value="${status}" ${current === status ? 'selected' : ''}>${status[0].toUpperCase() + status.slice(1)}</option>`).join('');
const projectStatusOptions = current => ['active','paused','complete'].map(status => `<option value="${status}" ${current === status ? 'selected' : ''}>${status[0].toUpperCase() + status.slice(1)}</option>`).join('');
const relationshipOptions = current => ['current','previous'].map(value => `<option value="${value}" ${current === value ? 'selected' : ''}>${value === 'current' ? 'Current client' : 'Previous client'}</option>`).join('');
const field = (label, name, value, options = {}) => `<label class="pu-field"><span>${escape(label)}</span>${options.multiline ? `<textarea name="${name}" rows="${options.rows || 3}" maxlength="${options.max || 1200}" ${options.required ? 'required' : ''}>${escape(value)}</textarea>` : `<input name="${name}" type="${options.type || 'text'}" value="${escape(value)}" maxlength="${options.max || 160}" ${options.required ? 'required' : ''} ${options.placeholder ? `placeholder="${escape(options.placeholder)}"` : ''}>`}${options.hint ? `<small>${escape(options.hint)}</small>` : ''}</label>`;

/** Render project profiles and independent drafts. All persistence belongs to store. */
export function createProjectsUI({container, store, catalog, publishingDomains = [], onOpenOriginal, onPreviewDraft, onDownloadDraft, onRender = () => {}, notify = () => {}}) {
  const sources = new Map(catalog.map(item => [item.id, item]));
  const draftBuffers = new Map(), projectBuffers = new Map(), linkBuffers = new Map(), briefBuffers = new Map(), reviewBuffers = new Map(), tabs = new Map();
  let routeParts = [], currentClient = null, currentProject = null, currentDraft = null, previewRevision = 0, pendingBackup = null;
  const dialog = document.createElement('dialog');
  dialog.className = 'pu-dialog';
  dialog.setAttribute('aria-labelledby', 'pu-dialog-title');
  document.body.append(dialog);
  const routeFor = project => `#project/${encodeURIComponent(project.id)}`;
  const clientRoute = client => `#client/${encodeURIComponent(client.id)}`;
  const clientProjects = client => store.getProjects().filter(project => project.clientId === client.id);
  const projectClient = project => project.clientId ? store.getClient(project.clientId) : null;
  const draftRoute = (project, draft) => `${routeFor(project)}/draft/${encodeURIComponent(draft.id)}`;
  const bufferKey = (projectId, draftId) => `${projectId}/${draftId}`;
  const announce = message => notify(message);
  const picture = (source, className = '') => source?.thumbnail ? `<img class="${className}" src="${escape(source.thumbnail)}" alt="${escape(source.name)} original page" loading="lazy">` : `<span class="pu-preview-missing">Original preview unavailable</span>`;
  const projectOriginals = project => (project.originalIds || []).map(id => sources.get(id)).filter(Boolean);
  const errorText = error => error?.message || 'That change could not be saved. Please try again.';
  function report(error, form) {
    const output = form?.querySelector('[data-pu-error]');
    if (output) output.textContent = errorText(error);
    else announce(errorText(error));
  }
  function openDialog(markup) {
    if (dialog.open) dialog.close();
    dialog.innerHTML = markup;
    dialog.showModal();
    requestAnimationFrame(() => dialog.querySelector('input:not([type="hidden"]),select,button')?.focus());
  }
  const dialogHeading = (title, description) => `<div class="pu-dialog-heading"><div><p class="pu-kicker">AGENCYKIT / CLIENTS</p><h2 id="pu-dialog-title">${escape(title)}</h2></div><button class="pu-close" type="button" data-pu-action="close-dialog" aria-label="Close dialog">×</button></div><p class="pu-dialog-copy">${escape(description)}</p>`;
  const formError = '<p class="pu-error" data-pu-error role="alert"></p>';
  function clientSelector(selected, allowCreate=false, allowUnassigned=false) {
    const clients=store.getClients();
    return `<label class="pu-field"><span>Client</span><select name="clientId" ${allowUnassigned?'':'required'}>${allowUnassigned?`<option value="" ${selected?'':'selected'}>Unassigned</option>`:''}${['current','previous'].map(relationship=>{const group=clients.filter(client=>client.relationship===relationship);return group.length?`<optgroup label="${relationship==='current'?'Current clients':'Previous clients'}">${group.map(client=>`<option value="${escape(client.id)}" ${client.id===selected?'selected':''}>${escape(client.name)}</option>`).join('')}</optgroup>`:'';}).join('')}${allowCreate?`<option value="__new__" ${clients.length?'':'selected'}>Create a new client…</option>`:''}</select></label>`;
  }
  const newClientFields=()=>`<fieldset class="pu-new-project-fields" data-pu-new-client-fields hidden disabled><legend>New client</legend>${field('Client name','newClientName','',{max:120})}<label class="pu-field"><span>Client relationship</span><select name="newClientRelationship">${relationshipOptions('current')}</select></label></fieldset>`;
  function syncDialogFields() {
    const form=dialog.querySelector('form');if(!form)return;
    const projectChoice=form.querySelector('[name="projectId"]'), creatingProject=!projectChoice||projectChoice.value==='__new__';
    const projectFields=form.querySelector('[data-pu-new-project-fields]');
    if(projectFields){projectFields.hidden=!creatingProject;projectFields.disabled=!creatingProject;projectFields.querySelector('[name="newName"]').required=creatingProject;}
    const clientChoice=form.querySelector('[name="clientId"]'), creatingClient=creatingProject&&clientChoice?.value==='__new__', clientFields=form.querySelector('[data-pu-new-client-fields]');
    if(clientFields){clientFields.hidden=!creatingClient;clientFields.disabled=!creatingClient;clientFields.querySelector('[name="newClientName"]').required=creatingClient;}
  }
  function showNewClient(client=null) {
    openDialog(`${dialogHeading(client?'Client details.':'A home for the relationship.',client?'Keep the client name consistent across every project.':'Create a client, then keep their projects together.')}<form data-pu-form="${client?'edit-client':'new-client'}" ${client?`data-client="${escape(client.id)}"`:''}>${field('Client name','name',client?.name||'',{required:true,max:120,placeholder:'e.g. Acme Studio'})}${client?'':`<label class="pu-field"><span>Client relationship</span><select name="relationship">${relationshipOptions('current')}</select></label>`}${formError}<div class="pu-dialog-actions"><button type="button" class="pu-button" data-pu-action="close-dialog">Cancel</button><button class="pu-button pu-button-primary" type="submit">${client?'Save client':'Create client'} <span aria-hidden="true">↗</span></button></div></form>`);
  }
  function showNewProject(clientId=currentClient?.id || currentProject?.clientId || '') {
    openDialog(`${dialogHeading('A place for the next thing.', 'A project belongs to one client. Keep its brief, brand, and working drafts together.')}<form data-pu-form="new-project">${field('Project name', 'name', '', {required:true, max:120, placeholder:'e.g. Autumn campaign'})}${clientSelector(clientId,true)}${newClientFields()}${field('What should this project do?', 'brief-goal', '', {multiline:true, rows:2, max:1600, required:true, placeholder:'e.g. Recruit campus ambassadors and collect applications'})}${field('Who is it for?', 'brief-audience', '', {max:1000, placeholder:'e.g. College students'})}${field('How should it feel?', 'brief-tone', '', {max:500, placeholder:'e.g. Warm, direct, confident'})}${formError}<div class="pu-dialog-actions"><button type="button" class="pu-button" data-pu-action="close-dialog">Cancel</button><button class="pu-button pu-button-primary" type="submit">Find starting points <span aria-hidden="true">↗</span></button></div></form>`);
    syncDialogFields();
  }
  function projectCard(project) {
    const originals = projectOriginals(project), cover = originals.find(source => source.thumbnail) || sources.get(project.drafts?.[0]?.sourceId);
    return `<a class="pu-project-card" href="${routeFor(project)}"><div class="pu-project-cover">${cover ? picture(cover) : `<span class="pu-large-monogram" aria-hidden="true">${escape(monogram(project.name))}</span>`}<span class="pu-cover-note">${cover ? 'ORIGINAL WORK' : 'ROOM TO BEGIN'}</span></div><div class="pu-project-card-body"><div class="pu-project-name"><span class="pu-monogram" aria-hidden="true">${escape(monogram(project.name))}</span><div><h2>${escape(project.name)}</h2><p>${escape(projectClient(project)?.name || 'Unassigned project')}</p></div><span class="pu-card-arrow" aria-hidden="true">↗</span></div><p class="pu-project-description">${escape(project.description || 'A new home for the work you want to make.')}</p><div class="pu-project-meta"><span>${originals.length} original${originals.length===1?'':'s'} <i>·</i> ${project.drafts?.length||0} draft${project.drafts?.length===1?'':'s'}</span><span class="pu-status">${escape(project.status || 'active')}</span></div></div></a>`;
  }
  function clientCard(client) {
    const projects=clientProjects(client), originals=projects.flatMap(projectOriginals), cover=originals.find(source=>source.thumbnail), drafts=projects.reduce((sum,project)=>sum+(project.drafts?.length||0),0);
    return `<a class="pu-project-card pu-client-card" href="${clientRoute(client)}"><div class="pu-project-cover">${cover?picture(cover):`<span class="pu-large-monogram" aria-hidden="true">${escape(monogram(client.name))}</span>`}<span class="pu-cover-note">${cover?'FROM THEIR PROJECTS':'ROOM TO BEGIN'}</span></div><div class="pu-project-card-body"><div class="pu-project-name"><span class="pu-monogram" aria-hidden="true">${escape(monogram(client.name))}</span><div><h3>${escape(client.name)}</h3><p>${projects.length} project${projects.length===1?'':'s'} <i>·</i> ${drafts} draft${drafts===1?'':'s'}</p></div><span class="pu-card-arrow" aria-hidden="true">↗</span></div><p class="pu-client-projects">${projects.length?projects.slice(0,3).map(project=>escape(project.name)).join('<span aria-hidden="true"> / </span>')+(projects.length>3?` <span>+${projects.length-3} more</span>`:''):'Start with their first project.'}</p></div></a>`;
  }
  function directory() {
    const clients=store.getClients();
    const unassigned=store.getProjects().filter(project=>!project.clientId);
    return `<div class="pu-directory"><header class="pu-directory-heading"><div><p class="pu-kicker">THE PEOPLE BEHIND THE WORK</p><h1>Your clients<span>.</span></h1><p class="pu-lead">Each relationship, with its projects kept together.</p></div><div class="pu-heading-actions"><button class="pu-button" data-pu-action="new-client">New client +</button><button class="pu-button pu-button-primary" data-pu-action="new-project">Start a project ↗</button></div></header><div class="pu-account-bar" data-project-account></div>${['current','previous'].map(relationship=>{const group=clients.filter(client=>client.relationship===relationship);return `<section class="pu-client-section" aria-labelledby="pu-${relationship}-clients"><div class="pu-section-heading"><h2 id="pu-${relationship}-clients">${relationship==='current'?'Current clients':'Previous clients'} <span>${group.length}</span></h2></div>${group.length?`<div class="pu-project-grid">${group.map(clientCard).join('')}</div>`:`<div class="pu-clients-empty"><p>${relationship==='current'?'No current clients yet.':'No previous clients yet.'}</p><span>${relationship==='current'?'Add a client to give their projects a home.':'When a relationship moves on, keep its projects here.'}</span></div>`}</section>`;}).join('')}${unassigned.length?`<section class="pu-client-section pu-unassigned-section" aria-labelledby="pu-unassigned-title"><div class="pu-section-heading"><div><h2 id="pu-unassigned-title">Unassigned projects <span>${unassigned.length}</span></h2><p>Projects kept without a client. Assign one from Brand &amp; brief.</p></div></div><div class="pu-project-grid">${unassigned.map(projectCard).join('')}</div></section>`:''}${publishingSection()}<footer class="pu-directory-footer"><div class="pu-backup-actions"><span>Keep a copy of your workspace.</span><button data-pu-action="export-backup">Export backup</button><button data-pu-action="choose-backup">Import backup</button><input type="file" data-pu-backup accept="application/json,.json" hidden></div></footer></div>`;
  }
  function publishingSection() {
    const domains=publishingDomains.filter(domain=>safeUrl(domain.url));
    if(!domains.length)return '';
    return `<section class="pu-publishing-domains" aria-labelledby="pu-publishing-title"><div><h2 id="pu-publishing-title">Publishing domains</h2><p>Shared publishing locations for client work.</p></div><ul>${domains.map(domain=>`<li><a href="${escape(safeUrl(domain.url))}" target="_blank" rel="noopener noreferrer">${escape(domain.name)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>`;
  }
  function publishingNote(projects) {
    const originalHosts=[...new Set(projects.flatMap(project=>projectOriginals(project).map(sourceHost)).filter(Boolean))];
    const liveHosts=[...new Set(projects.flatMap(project=>(project.drafts||[]).filter(draft=>draft.status==='live').map(draft=>{const url=safeUrl(draft.liveUrl);return url?new URL(url).hostname.replace(/^www\./,''):'';})).filter(Boolean))];
    return [['Original page domains',originalHosts],['Live page domains',liveHosts]].map(([label,hosts])=>hosts.length?`<p class="pu-profile-domains"><span>${label}</span>${hosts.map(host=>`<span>${escape(host)}</span>`).join('')}</p>`:'').join('');
  }
  function clientProfile(client) {
    const projects=clientProjects(client), previous=client.relationship==='previous';
    return `<div class="pu-profile pu-client-profile"><a class="pu-back" href="#clients"><span aria-hidden="true">←</span> All clients</a><header class="pu-profile-heading"><span class="pu-profile-monogram" aria-hidden="true">${escape(monogram(client.name))}</span><div><p class="pu-kicker">CLIENT PROFILE <span class="pu-status">${previous?'Previous client':'Current client'}</span></p><h1>${escape(client.name)}<span>.</span></h1><p class="pu-lead">${projects.length} project${projects.length===1?'':'s'}, with their original work, brand, and working drafts.</p></div></header><div class="pu-account-bar" data-project-account></div>${publishingNote(projects)}<div class="pu-client-management"><p>Client relationship <span>${previous?'Previous':'Current'}</span></p><div><button type="button" class="pu-text-link" data-pu-action="edit-client">Edit client name</button><button type="button" class="pu-button" data-pu-action="client-relationship" data-relationship="${previous?'current':'previous'}">Move to ${previous?'current':'previous'} clients <span aria-hidden="true">↗</span></button></div><small>Project progress stays as it is. You can move this client back at any time.</small></div><section class="pu-client-project-section"><div class="pu-section-heading"><div><p class="pu-kicker">THE WORK TOGETHER</p><h2>Projects <span>${projects.length}</span></h2></div><button type="button" class="pu-button pu-button-primary" data-pu-action="new-project">New project <span aria-hidden="true">+</span></button></div>${projects.length?`<div class="pu-project-grid">${projects.map(projectCard).join('')}</div>`:'<div class="pu-empty"><span class="pu-empty-mark" aria-hidden="true">+</span><h3>The first project starts here.</h3><p>Create a project, then bring in original work to make something new.</p><button type="button" class="pu-button" data-pu-action="new-project">Create a project ↗</button></div>'}</section></div>`;
  }
  function originalCard(source) {
    const host=sourceHost(source);
    return `<article class="pu-original-card"><button type="button" class="pu-original-preview" data-pu-action="open-original" data-source="${escape(source.id)}" aria-label="Open original ${escape(source.name)}">${picture(source)}<span>View original <i aria-hidden="true">↗</i></span></button><div class="pu-original-caption"><button type="button" data-pu-action="open-original" data-source="${escape(source.id)}">${escape(source.name)}</button><span>${escape(source.category)} <i>·</i> ${source.status === 'prototype' ? 'Prototype' : 'Original'}</span>${host?`<span class="pu-source-host">Published on ${escape(host)}</span>`:''}</div></article>`;
  }

  function handoffPanel(source) {
    const handoff=skeletonHandoff(source);
    return '<details class="pu-handoff"><summary>What is in this skeleton?</summary><p><strong>'+escape(handoff.name)+'</strong> · '+escape(handoff.includes)+'</p><p>'+escape(handoff.note)+'</p><p><strong>Before launch</strong><br>'+escape(handoff.connect)+'</p><p>Your project brand and page copy carry into the preview and exported HTML. Replace the remaining example content in the exported file.</p></details>';
  }
  function reviewPanel(draft) {
    const progress=reviewProgress(draft), review=reviewBuffers.get(bufferKey(currentProject.id,draft.id))||draft.review||{};
    return '<section class="pu-launch-review"><div class="pu-section-heading"><h2>Before this goes live.</h2><span>'+progress.done+' / '+progress.total+' reviewed</span></div><p class="pu-muted">Your team’s checklist for the final build. These are manual confirmations, not automatic tests.</p><form data-pu-form="draft-review"><div class="pu-review-checks">'+LAUNCH_CHECKS.map(check=>'<label class="pu-review-check"><input type="checkbox" name="'+check.id+'" '+(review[check.id]?'checked':'')+'><span><strong>'+escape(check.label)+'</strong><small>'+escape(check.detail)+'</small></span></label>').join('')+'</div>'+formError+'<div class="pu-review-footer"><p class="pu-save-state" data-pu-save-state role="status">'+(reviewBuffers.has(bufferKey(currentProject.id,draft.id))?'Unsaved review changes':'Saved checks reset when related content changes.')+'</p><button class="pu-button" type="submit">Save review ↗</button></div></form></section>';
  }
  function planPanel(project) {
    const brief=briefBuffers.get(project.id)||project.brief||{}, matches=recommendOriginals(catalog,project.brief), journeys=projectJourneys(catalog,project.brief);
    const total=(project.drafts||[]).length, reviewed=(project.drafts||[]).filter(draft=>reviewProgress(draft).done===LAUNCH_CHECKS.length).length;
    const card=match=>{
      const source=match.source, existing=project.drafts.find(draft=>draft.sourceId===source.id);
      return '<article class="pu-match">'+originalCard(source)+'<ul class="pu-match-reasons">'+match.reasons.map(reason=>'<li>'+escape(reason)+'</li>').join('')+'</ul>'+(existing?'<a class="pu-button" href="'+draftRoute(project,existing)+'">Continue draft ↗</a>':'<button class="pu-button" data-pu-action="draft-from-plan" data-source="'+escape(source.id)+'">Create skeleton draft ↗</button>')+'</article>';
    };
    return '<div class="pu-plan"><section class="pu-plan-intro"><div><p class="pu-kicker">FROM AN IDEA TO SOMETHING REAL</p><h2>A starting point for this project.</h2><p>'+escape(projectNextStep(project))+'</p></div><div class="pu-plan-progress"><span>'+total+' working draft'+(total===1?'':'s')+'</span><span>'+reviewed+' of '+total+' fully reviewed</span><a class="pu-text-link" href="'+routeFor(project)+'/brand">Set the project brand ↗</a></div></section><form data-pu-form="project-brief" class="pu-plan-brief"><div>'+field('What should this project do?','brief-goal',brief.goal,{multiline:true,rows:3,required:true,max:1600,placeholder:'Recruit campus ambassadors and collect applications.'})+'</div><div>'+field('Who is it for?','brief-audience',brief.audience,{max:1000})+field('How should it feel?','brief-tone',brief.tone,{max:500})+'</div><div class="pu-plan-brief-footer"><p class="pu-save-state" data-pu-save-state role="status">'+(briefBuffers.has(project.id)?'Unsaved brief changes':'Matches use the saved goal and audience. Tone stays with the brief.')+'</p>'+formError+'<button class="pu-button pu-button-primary" type="submit">Save brief & find pages ↗</button></div></form><section class="pu-plan-matches"><div class="pu-section-heading"><div><p class="pu-kicker">REAL WORK TO BUILD FROM</p><h2>Starting points.</h2></div><a class="pu-text-link" href="#archive">Search the whole archive ↗</a></div><p class="pu-muted">Matched against page types and archive descriptions. Open an original to inspect it before making a neutral draft.</p>'+(matches.length?'<div class="pu-match-grid">'+matches.map(card).join('')+'</div>':'<div class="pu-plan-empty"><p>'+(project.brief?.goal?'No close matches yet. Try describing the page’s job: applications, a member portal, referrals, or a portfolio.':'Add a goal above and we’ll suggest originals to start from.')+'</p></div>')+'</section><section class="pu-plan-journeys"><div class="pu-section-heading"><div><p class="pu-kicker">A FEW PAGES THAT WORK TOGETHER</p><h2>Start with a journey.</h2></div></div><p class="pu-muted">Create independent drafts in a useful order. Connect their links and services as you build; existing drafts are kept.</p><div class="pu-journey-grid">'+journeys.map(journey=>'<article class="pu-journey"><span class="pu-kicker">'+(journey.relevant?'RELATED TO YOUR GOAL':'A REUSABLE FLOW')+'</span><h3>'+escape(journey.name)+'</h3><p>'+escape(journey.description)+'</p><ol>'+journey.steps.map(step=>'<li><span>'+escape(step.label)+'</span><button class="pu-text-link" data-pu-action="open-original" data-source="'+escape(step.source.id)+'">'+escape(step.source.name)+' ↗</button></li>').join('')+'</ol><button class="pu-button" data-pu-action="create-journey" data-journey="'+journey.id+'">Use this journey ↗</button></article>').join('')+'</div></section></div>';
  }

  function workPanel(project) {
    const originals = projectOriginals(project), drafts = project.drafts || [];
    return `<section class="pu-work-section"><div class="pu-section-heading"><div><p class="pu-kicker">MAKING SOMETHING NEW</p><h2>Working drafts <span>${drafts.length}</span></h2></div><a class="pu-text-link" href="${routeFor(project)}/plan">Find a starting point <span aria-hidden="true">↗</span></a></div>${drafts.length ? `<div class="pu-draft-grid">${drafts.map(draft => `<a class="pu-draft-card" href="${draftRoute(project, draft)}"><div class="pu-draft-top"><span class="pu-status">${escape(draft.status)}</span><span aria-hidden="true">↗</span></div><h3>${escape(draft.name)}</h3><p>From ${escape(sources.get(draft.sourceId)?.name || draft.provenance?.sourceName || 'original work')}</p><span class="pu-card-date">${reviewProgress(draft).done} / ${LAUNCH_CHECKS.length} launch checks reviewed <i>·</i> Edited ${escape(dateLabel(draft.updatedAt))}</span></a>`).join('')}</div>` : `<div class="pu-empty"><span class="pu-empty-mark" aria-hidden="true">+</span><h3>Give an original a new direction.</h3><p>Open a piece from the archive and choose “Use in project” to start an independent draft.</p><a class="pu-button" href="#archive">Explore the archive <span aria-hidden="true">↗</span></a></div>`}</section><section class="pu-work-section"><div class="pu-section-heading"><div><p class="pu-kicker">WHERE IT STARTED</p><h2>Original work <span>${originals.length}</span></h2></div><span class="pu-section-note">Kept as it was made.</span></div>${originals.length ? `<div class="pu-original-grid">${originals.map(originalCard).join('')}</div>` : '<p class="pu-muted">Originals used by this project will appear here.</p>'}</section>`;
  }
  function brandPanel(project) {
    const model = projectBuffers.get(project.id) || project;
    const brand = model.brand || {}, brief = model.brief || {};
    const fonts = ['system', 'editorial', 'modern'];
    return `<form data-pu-form="project-brand" class="pu-profile-form"><section class="pu-form-section"><div><p class="pu-kicker">THE BASICS</p><h2>Project details.</h2><p>A little context makes the next decision easier.</p></div><div class="pu-field-grid">${field('Project name', 'name', model.name, {required:true, max:120})}${clientSelector(model.clientId,false,true)}${field('Description', 'description', model.description, {multiline:true, max:4000})}<label class="pu-field"><span>Project status</span><select name="status">${projectStatusOptions(model.status)}</select></label></div></section><section class="pu-form-section"><div><p class="pu-kicker">A FAMILIAR FEELING</p><h2>Brand.</h2><p>These choices carry through to every draft in this project.</p></div><div class="pu-field-grid"><div class="pu-color-fields">${[['Accent','accent','#c7c7c2'],['Background','bg','#f7f7f2'],['Text','ink','#262623']].map(([label,key,fallback])=>`<label class="pu-field pu-color-field"><span>${label}</span><input type="color" name="brand-${key}" value="${/^#[a-f\d]{6}$/i.test(brand[key] || '') ? escape(brand[key]) : fallback}"></label>`).join('')}</div><label class="pu-field"><span>Typeface</span><select name="brand-font">${fonts.map(font=>`<option value="${escape(font)}" ${brand.font===font?'selected':''}>${escape(({system:'System sans',editorial:'Editorial serif',modern:'Modern sans'})[font]||font)}</option>`).join('')}</select></label><div class="pu-logo-field"><span>Logo</span><div class="pu-logo-preview" data-pu-logo-preview>${brand.logo?`<img src="${escape(brand.logo)}" alt="Project logo">`:'<span>No logo added</span>'}</div><input type="hidden" name="brand-logo" value="${escape(brand.logo || '')}"><label class="pu-logo-upload">Choose image<input type="file" data-pu-logo-file accept="image/png,image/jpeg,image/webp"></label><button type="button" class="pu-text-link" data-pu-action="remove-logo" ${brand.logo?'':'hidden'}>Remove logo</button><small>PNG, JPEG, or WebP · up to 130 KB. Included in exported drafts.</small></div></div></section><section class="pu-form-section"><div><p class="pu-kicker">THE BRIEF</p><h2>What are we making?</h2><p>A shared point of reference for the work.</p></div><div class="pu-field-grid">${field('Audience', 'brief-audience', brief.audience, {multiline:true, rows:2, max:1000})}${field('Goal', 'brief-goal', brief.goal, {multiline:true, rows:3, max:1600})}${field('Tone', 'brief-tone', brief.tone, {max:500, placeholder:'e.g. Warm, direct, quietly confident'})}</div></section><div class="pu-form-footer"><p class="pu-save-state" data-pu-save-state role="status">${projectBuffers.has(project.id)?'Unsaved changes':'Brand shared across this project.'}</p>${formError}<button class="pu-button pu-button-primary" type="submit">Save project <span aria-hidden="true">↗</span></button></div></form>`;
  }
  function linksPanel(project) {
    const links = linkBuffers.get(project.id) || project.links || {};
    return `<form data-pu-form="project-links" class="pu-profile-form"><section class="pu-form-section"><div><p class="pu-kicker">USEFUL PLACES</p><h2>Keep the links close.</h2><p>A few destinations for the people working on this project.</p></div><div class="pu-field-grid">${[['Website','website'],['Repository','repo'],['Files & references','files']].map(([label,key])=>`${field(label,key,links[key],{type:'url',max:1000,placeholder:'https://'})}${safeUrl(links[key])?`<a class="pu-text-link pu-saved-link" href="${escape(safeUrl(links[key]))}" target="_blank" rel="noopener noreferrer">Open ${label.toLowerCase()} <span aria-hidden="true">↗</span></a>`:''}`).join('')}</div></section><div class="pu-form-footer">${formError}<button class="pu-button pu-button-primary" type="submit">Save links <span aria-hidden="true">↗</span></button></div></form>`;
  }
  function profile(project) {
    const tab = ['plan','work','brand','links'].includes(routeParts[2]) ? routeParts[2] : tabs.get(project.id) || 'work';
    const client = projectClient(project);
    return `<div class="pu-profile"><a class="pu-back" href="${client?clientRoute(client):'#clients'}"><span aria-hidden="true">←</span> ${client?escape(client.name):'All clients'}</a><header class="pu-profile-heading"><span class="pu-profile-monogram" aria-hidden="true">${escape(monogram(project.name))}</span><div><p class="pu-kicker">${escape(client?.name || 'UNASSIGNED PROJECT')} <span class="pu-status">${escape(project.status)}</span></p><h1>${escape(project.name)}<span>.</span></h1><p class="pu-lead">${escape(project.description || 'A place for the work, and whatever comes next.')}</p></div></header><div class="pu-account-bar" data-project-account></div><nav class="pu-tabs" role="tablist" aria-label="Project sections">${[['plan','Plan'],['work','Work'],['brand','Brand & brief'],['links','Links']].map(([key,label])=>`<button type="button" role="tab" id="pu-tab-${key}" aria-controls="pu-profile-panel" aria-selected="${tab===key}" tabindex="${tab===key?0:-1}" data-pu-tab="${key}">${label}</button>`).join('')}</nav><div id="pu-profile-panel" role="tabpanel" aria-labelledby="pu-tab-${tab}">${tab==='plan'?planPanel(project):tab==='brand'?brandPanel(project):tab==='links'?linksPanel(project):workPanel(project)}</div><footer class="pu-profile-footer"><span>${dateLabel(project.updatedAt)?`Updated ${escape(dateLabel(project.updatedAt))}`:'From the archive'}</span></footer></div>`;
  }
  function draftEditor(project, savedDraft) {
    const draft = draftBuffers.get(bufferKey(project.id, savedDraft.id)) || savedDraft;
    const source = sources.get(draft.sourceId), copy = draft.copy || {};
    return `<div class="pu-editor"><a class="pu-back" href="${routeFor(project)}"><span aria-hidden="true">←</span> ${escape(project.name)}</a><header class="pu-editor-heading"><div><p class="pu-kicker">A NEW DIRECTION / ${escape(source?.name || 'ORIGINAL WORK')}</p><h1>${escape(draft.name)}</h1><p>Project brand applied. The original stays intact.</p></div><button type="button" class="pu-button pu-button-primary" data-pu-action="download-draft">Export HTML <span aria-hidden="true">↓</span></button></header><div class="pu-editor-account" data-project-account></div><div class="pu-editor-grid"><div class="pu-editor-settings"><form data-pu-form="draft"><div class="pu-editor-section"><h2>The page.</h2>${field('Draft name','name',draft.name,{required:true,max:120})}${field('Eyebrow','eyebrow',copy.eyebrow,{max:120})}${field('Headline','title',copy.title,{required:true,max:240,multiline:true,rows:2})}${field('Description','description',copy.description,{multiline:true,max:4000,rows:4})}${field('Button label','cta',copy.cta,{max:120})}</div><div class="pu-editor-section"><h2>Progress.</h2><label class="pu-field"><span>Status</span><select name="status">${statusOptions(draft.status)}</select></label>${field('Live URL','liveUrl',draft.liveUrl,{type:'url',max:1000,required:draft.status==='live',placeholder:'https://',hint:'Record a published address here. Saving or exporting does not publish this draft.'})}${safeUrl(draft.liveUrl)?`<a class="pu-text-link" href="${escape(safeUrl(draft.liveUrl))}" target="_blank" rel="noopener noreferrer">Open recorded live page ↗</a>`:''}</div><div class="pu-editor-save"><p class="pu-save-state" data-pu-save-state role="status">${draftBuffers.has(bufferKey(project.id,draft.id))?'Unsaved changes':'Saved'}</p>${formError}<button class="pu-button pu-button-primary" type="submit">Save draft <span aria-hidden="true">↗</span></button></div></form><section class="pu-versions"><div class="pu-section-heading"><h2>Versions.</h2><button class="pu-text-link" type="button" data-pu-action="save-version">Save version +</button></div><p class="pu-muted">Keep a point you can return to.</p>${savedDraft.versions?.length?`<ol>${[...savedDraft.versions].reverse().map((version,index)=>`<li><div><strong>${escape(version.label || `Version ${savedDraft.versions.length-index}`)}</strong><span>${escape(dateLabel(version.createdAt))}</span></div><button type="button" data-pu-action="restore-version" data-version="${escape(version.id)}">Restore</button></li>`).join('')}</ol>`:'<p class="pu-version-empty">No saved versions yet.</p>'}</section></div><section class="pu-editor-preview" aria-label="Customized draft preview"><div class="pu-preview-chrome"><span><i></i><i></i><i></i></span><span>LIVE PREVIEW</span><a href="${routeFor(project)}" data-pu-action="open-brand">Brand & brief ↗</a></div><iframe class="pu-draft-frame" title="${escape(draft.name)} customized preview" sandbox="allow-scripts allow-same-origin"></iframe><p class="pu-preview-note">Editable frontend · local demo interactions. Connect your services before launch.</p>${handoffPanel(source)}${reviewPanel(savedDraft)}</section></div></div>`;
  }
  function draftFromForm() {
    const form = container.querySelector('[data-pu-form="draft"]');
    if (!form || !currentDraft) return currentDraft;
    const data = new FormData(form);
    return {...currentDraft, name:String(data.get('name') || ''), status:String(data.get('status') || 'draft'), liveUrl:String(data.get('liveUrl') || '').trim(), copy:Object.fromEntries(['eyebrow','title','description','cta'].map(key=>[key,String(data.get(key)||'')]))};
  }
  function brandFromForm(form) {
    const data = new FormData(form);
    return {...currentProject,name:String(data.get('name')||''),clientId:String(data.get('clientId')||''),description:String(data.get('description')||''),status:String(data.get('status')||'active'),brand:Object.fromEntries(['accent','bg','ink','font','logo'].map(key=>[key,String(data.get(`brand-${key}`)||'')])),brief:Object.fromEntries(['audience','goal','tone'].map(key=>[key,String(data.get(`brief-${key}`)||'')]))};
  }
  function validateUrl(value, label) { if (value && !safeUrl(value)) throw new Error(`${label} must be an http or https URL without credentials.`); }
  function validateDraft(draft) { validateUrl(draft.liveUrl,'Live URL');if(draft.status==='live'&&!draft.liveUrl)throw new Error('Add the published page URL before marking this draft live.'); }
  function savedDraftFromForm() {
    const form = container.querySelector('[data-pu-form="draft"]');
    if (!form?.reportValidity()) return null;
    const draft = draftFromForm();
    validateDraft(draft);
    const updated = store.updateDraft(currentProject.id,currentDraft.id,{name:draft.name,status:draft.status,copy:draft.copy,liveUrl:draft.liveUrl});
    draftBuffers.delete(bufferKey(currentProject.id,currentDraft.id));
    reviewBuffers.delete(bufferKey(currentProject.id,currentDraft.id));
    currentDraft = updated;
    return updated;
  }
  function updatePreview() {
    const frame = container.querySelector('.pu-draft-frame');
    if (!frame || !currentDraft || !onPreviewDraft) return;
    const revision = ++previewRevision, draft = draftFromForm();
    frame.title = `${draft.name || 'Draft'} customized preview`;
    try {
      const result = onPreviewDraft({draft,project:currentProject,source:sources.get(draft.sourceId),frame});
      if (result?.catch) result.catch(error => { if(revision===previewRevision && frame.isConnected) announce(errorText(error)); });
    } catch(error) { announce(errorText(error)); }
  }
  function render(parts = location.hash.slice(1).split('/')) {
    routeParts = Array.isArray(parts) ? parts : String(parts).replace(/^#/,'').split('/');
    const active = ['clients','client','projects','project'].includes(routeParts[0]);
    container.hidden = !active;
    container.classList.add('projects-space');
    document.body.classList.toggle('projects-mode',active);
    if (!active) { currentClient=null;currentProject=null;currentDraft=null;return false; }
    currentClient = routeParts[0]==='client'?store.getClient(decode(routeParts[1])):null;
    currentProject = routeParts[0]==='project'?store.getProject(decode(routeParts[1])):null;
    currentDraft = currentProject && routeParts[2]==='draft'?store.getDraft(currentProject.id,decode(routeParts[3])):null;
    if (['clients','projects'].includes(routeParts[0])) container.innerHTML=directory();
    else if(routeParts[0]==='client')container.innerHTML=currentClient?clientProfile(currentClient):'<div class="pu-empty pu-missing"><h1>This client is not here.</h1><p>It may belong to another workspace or backup.</p><a class="pu-button" href="#clients">Back to clients ↗</a></div>';
    else if (!currentProject || (routeParts[2]==='draft'&&!currentDraft)) container.innerHTML='<div class="pu-empty pu-missing"><h1>This project is not here.</h1><p>It may belong to another workspace or backup.</p><a class="pu-button" href="#clients">Back to clients ↗</a></div>';
    else container.innerHTML=currentDraft?draftEditor(currentProject,currentDraft):profile(currentProject);
    if(currentDraft)updatePreview();
    onRender();
    return true;
  }
  function openUse(sourceId) {
    const source=sources.get(sourceId);
    if(!source){announce('This original is no longer in the catalog.');return;}
    const projects=store.getProjects();
    const clients=store.getClients();
    const unassigned=projects.filter(project=>!project.clientId);
    const groups=clients.map(client=>{const contained=projects.filter(project=>project.clientId===client.id);return contained.length?`<optgroup label="${escape(client.name)} · ${client.relationship==='previous'?'Previous client':'Current client'}">${contained.map(project=>`<option value="${escape(project.id)}" ${project.id===currentProject?.id?'selected':''}>${escape(project.name)}</option>`).join('')}</optgroup>`:'';}).join('')+(unassigned.length?`<optgroup label="Unassigned projects">${unassigned.map(project=>`<option value="${escape(project.id)}" ${project.id===currentProject?.id?'selected':''}>${escape(project.name)}</option>`).join('')}</optgroup>`:'');
    openDialog(`${dialogHeading('Use in a project.', `Start an independent draft from ${source.name}. The original will stay as it is.`)}<form data-pu-form="use-original" data-source="${escape(sourceId)}"><label class="pu-field"><span>Project, grouped by client</span><select name="projectId">${groups}<option value="__new__" ${projects.length?'':'selected'}>Create a new project…</option></select></label><fieldset class="pu-new-project-fields" data-pu-new-project-fields ${projects.length?'hidden disabled':''}><legend>New project</legend>${field('Project name','newName','',{max:120})}${clientSelector(currentProject?.clientId||currentClient?.id||'',true)}${newClientFields()}</fieldset>${formError}<div class="pu-dialog-actions"><button type="button" class="pu-button" data-pu-action="close-dialog">Cancel</button><button class="pu-button pu-button-primary" type="submit">Create draft <span aria-hidden="true">↗</span></button></div></form>`);
    syncDialogFields();
  }
  function requireName(value,label){const name=String(value||'').trim();if(!name)throw new Error(`Add a ${label.toLowerCase()} to continue.`);return name;}
  function clientFromForm(data){
    const id=String(data.get('clientId')||'');
    if(id==='__new__')return store.createClient({name:requireName(data.get('newClientName'),'Client name'),relationship:String(data.get('newClientRelationship')||'current')}).id;
    if(!store.getClient(id))throw new Error('Choose an existing client.');
    return id;
  }
  function downloadBackup() {
    const data=store.exportData(), blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download=`agencykit-projects-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    announce('Project backup exported.');
  }
  async function handleClick(event) {
    const button=event.target.closest('[data-pu-action]');if(!button)return;
    const action=button.dataset.puAction;
    if(action==='open-brand'){event.preventDefault();tabs.set(currentProject.id,'brand');location.hash=routeFor(currentProject)+'/brand';return;}
    try {
      if(action==='close-dialog')dialog.close();
      else if(action==='new-project')showNewProject();
      else if(action==='new-client')showNewClient();
      else if(action==='edit-client'&&currentClient)showNewClient(currentClient);
      else if(action==='client-relationship'&&currentClient){store.updateClient(currentClient.id,{relationship:button.dataset.relationship});render(routeParts);announce(`Client moved to ${button.dataset.relationship} clients.`);}
      else if(action==='open-original')onOpenOriginal?.(button.dataset.source);
      else if(action==='draft-from-plan' && currentProject){
        const draft=store.createDrafts(currentProject.id,[button.dataset.source])[0];
        location.hash=draftRoute(currentProject,draft);announce('Your project brand is applied. The skeleton draft is ready to edit.');
      } else if(action==='create-journey' && currentProject){
        const journey=projectJourneys(catalog,currentProject.brief).find(item=>item.id===button.dataset.journey);
        if(!journey)throw Error('This journey is no longer available.');
        store.createDrafts(currentProject.id,journey.steps.map(step=>step.source.id));
        tabs.set(currentProject.id,'work');location.hash=routeFor(currentProject)+'/work';announce('Journey drafts are ready. Existing drafts and edits were kept.');
      }
      else if(action==='export-backup')downloadBackup();
      else if(action==='choose-backup')container.querySelector('[data-pu-backup]')?.click();
      else if(action==='download-draft'){
        const draft=savedDraftFromForm();if(!draft)return;
        await onDownloadDraft?.({draft,project:currentProject,source:sources.get(draft.sourceId)});
        render(routeParts);
      } else if(action==='remove-logo'){
        const form=button.closest('form');form.querySelector('[name="brand-logo"]').value='';form.querySelector('[data-pu-logo-preview]').innerHTML='<span>No logo added</span>';button.hidden=true;projectBuffers.set(currentProject.id,brandFromForm(form));form.querySelector('[data-pu-save-state]').textContent='Unsaved changes';
      } else if(action==='save-version'){
        const draft=savedDraftFromForm();if(!draft)return;
        store.saveVersion(currentProject.id,draft.id);render(routeParts);announce('Version saved.');
      } else if(action==='restore-version'){
        store.restoreVersion(currentProject.id,currentDraft.id,button.dataset.version);
        draftBuffers.delete(bufferKey(currentProject.id,currentDraft.id));reviewBuffers.delete(bufferKey(currentProject.id,currentDraft.id));render(routeParts);announce('Version restored. Review the restored page before launch.');
      }
    } catch(error){report(error,button.closest('form'));}
  }
  async function handleSubmit(event) {
    const form=event.target.closest('[data-pu-form]');if(!form)return;
    event.preventDefault();const data=new FormData(form);
    try {
      if(form.dataset.puForm==='new-client'){
        const client=store.createClient({name:requireName(data.get('name'),'Client name'),relationship:String(data.get('relationship')||'current')});dialog.close();location.hash=clientRoute(client);announce('Client created.');
      } else if(form.dataset.puForm==='edit-client'){
        store.updateClient(form.dataset.client,{name:requireName(data.get('name'),'Client name')});dialog.close();render(routeParts);announce('Client name saved across their projects.');
      } else if(form.dataset.puForm==='new-project'){
        const name=requireName(data.get('name'),'Project name'), clientId=clientFromForm(data);
        const brief=Object.fromEntries(['goal','audience','tone'].map(key=>[key,String(data.get('brief-'+key)||'').trim()]));
        const project=store.createProject({name,clientId,brief});dialog.close();location.hash=routeFor(project)+'/plan';announce('Project created. Here are your starting points.');
      } else if(form.dataset.puForm==='use-original'){
        let projectId=String(data.get('projectId')||'');
        if(projectId==='__new__'){const name=requireName(data.get('newName'),'Project name'),clientId=clientFromForm(data);projectId=store.createProject({name,clientId}).id;}
        const project=store.getProject(projectId), draft=store.createDraft(projectId,form.dataset.source);dialog.close();location.hash=draftRoute(project,draft);announce('An independent draft is ready.');
      } else if(form.dataset.puForm==='draft'){
        if(savedDraftFromForm()){reviewBuffers.delete(bufferKey(currentProject.id,currentDraft.id));render(routeParts);announce('Draft saved.');}
       } else if(form.dataset.puForm==='project-brief'){
        const brief=Object.fromEntries(['goal','audience','tone'].map(key=>[key,String(data.get('brief-'+key)||'').trim()]));
        store.updateProject(currentProject.id,{brief});briefBuffers.delete(currentProject.id);
        if(projectBuffers.has(currentProject.id))projectBuffers.get(currentProject.id).brief=brief;
        render(routeParts);announce('Brief saved. Starting points updated.');
      } else if(form.dataset.puForm==='draft-review'){
        if(draftBuffers.has(bufferKey(currentProject.id,currentDraft.id)))throw Error('Save your draft changes before confirming the launch review.');
        const review=Object.fromEntries(LAUNCH_CHECKS.map(check=>[check.id,data.has(check.id)]));
        store.updateDraft(currentProject.id,currentDraft.id,{review});reviewBuffers.delete(bufferKey(currentProject.id,currentDraft.id));render(routeParts);announce('Launch review saved.');
      } else if(form.dataset.puForm==='project-brand'){
        const project=brandFromForm(form);
        store.updateProject(currentProject.id,{name:requireName(project.name,'Project name'),clientId:project.clientId,description:project.description,status:project.status,brand:project.brand,brief:project.brief});projectBuffers.delete(currentProject.id);briefBuffers.delete(currentProject.id);reviewBuffers.clear();render(routeParts);announce('Project and brand saved.');
      } else if(form.dataset.puForm==='project-links'){
        const links=Object.fromEntries(['website','repo','files'].map(key=>[key,String(data.get(key)||'').trim()]));Object.entries(links).forEach(([key,value])=>validateUrl(value,key));store.updateProject(currentProject.id,{links});linkBuffers.delete(currentProject.id);render(routeParts);announce('Project links saved.');
      } else if(form.dataset.puForm==='import-backup'){
        store.importData(pendingBackup);pendingBackup=null;dialog.close();render(['clients']);if(location.hash!=='#clients')location.hash='#clients';announce('Client and project backup merged.');
      }
    } catch(error){report(error,form);}
  }
  function selectTab(key) {
    tabs.set(currentProject.id,key);
    routeParts=['project',currentProject.id,key];
    history.replaceState(null,'',location.pathname+location.search+routeFor(currentProject)+'/'+key);
    render(routeParts);container.querySelector('[data-pu-tab="'+key+'"]')?.focus();
  }
  container.addEventListener('click',event=>{
    const tab=event.target.closest('[data-pu-tab]');
    if(tab&&currentProject){selectTab(tab.dataset.puTab);return;}
    handleClick(event);
  });
  container.addEventListener('keydown',event=>{
    const tab=event.target.closest('[data-pu-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const keys=['plan','work','brand','links'], index=keys.indexOf(tab.dataset.puTab), next=event.key==='Home'?0:event.key==='End'?keys.length-1:(index+(event.key==='ArrowRight'?1:keys.length-1))%keys.length;
    selectTab(keys[next]);
  });
  container.addEventListener('input',event=>{
    const form=event.target.closest('[data-pu-form]');if(!form)return;
    if(form.dataset.puForm==='draft'){form.querySelector('[name="liveUrl"]').required=form.querySelector('[name="status"]').value==='live';draftBuffers.set(bufferKey(currentProject.id,currentDraft.id),draftFromForm());updatePreview();}
    else if(form.dataset.puForm==='project-brand')projectBuffers.set(currentProject.id,brandFromForm(form));
    else if(form.dataset.puForm==='project-brief'){const data=new FormData(form);briefBuffers.set(currentProject.id,Object.fromEntries(['goal','audience','tone'].map(key=>[key,String(data.get('brief-'+key)||'')])));}
    else if(form.dataset.puForm==='draft-review'){const data=new FormData(form);reviewBuffers.set(bufferKey(currentProject.id,currentDraft.id),Object.fromEntries(LAUNCH_CHECKS.map(check=>[check.id,data.has(check.id)])));}
    else if(form.dataset.puForm==='project-links'){const data=new FormData(form);linkBuffers.set(currentProject.id,Object.fromEntries(['website','repo','files'].map(key=>[key,String(data.get(key)||'')])));}
    const status=form.querySelector('[data-pu-save-state]');if(status)status.textContent='Unsaved changes';
    const error=form.querySelector('[data-pu-error]');if(error)error.textContent='';
  });
  container.addEventListener('change',async event=>{
    if(event.target.matches('[data-pu-logo-file]')){
      const form=event.target.closest('form'), file=event.target.files?.[0];event.target.value='';if(!file)return;
      try{
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>130*1024)throw new Error('Choose a PNG, JPEG, or WebP logo under 130 KB.');
        const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer()), signature=Array.from(bytes).map(byte=>String.fromCharCode(byte)).join('');
        const valid=file.type==='image/png'?signature.startsWith('\x89PNG\r\n\x1a\n'):file.type==='image/jpeg'?signature.startsWith('\xff\xd8\xff'):signature.startsWith('RIFF')&&signature.slice(8,12)==='WEBP';
        if(!valid)throw new Error('This file does not contain a supported image.');
        const logo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('The logo could not be read.'));reader.readAsDataURL(file);});
        if(!form.isConnected)return;
        form.querySelector('[name="brand-logo"]').value=logo;form.querySelector('[data-pu-logo-preview]').innerHTML=`<img src="${escape(logo)}" alt="Project logo">`;form.querySelector('[data-pu-action="remove-logo"]').hidden=false;projectBuffers.set(currentProject.id,brandFromForm(form));form.querySelector('[data-pu-save-state]').textContent='Unsaved changes';
      }catch(error){report(error,form);}
      return;
    }
    if(!event.target.matches('[data-pu-backup]'))return;
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try {
      if(file.size>5*1024*1024)throw new Error('Choose a project backup smaller than 5 MB.');
      const text=await file.text();JSON.parse(text);pendingBackup=text;
      openDialog(`${dialogHeading('Merge a workspace backup.', `Add clients, projects, brands, drafts, and versions from ${file.name}.`)}<form data-pu-form="import-backup"><p class="pu-dialog-copy">Your existing edits stay in place. New clients, projects, drafts, and saved versions from this backup are added.</p>${formError}<div class="pu-dialog-actions"><button type="button" class="pu-button" data-pu-action="close-dialog">Cancel</button><button class="pu-button pu-button-primary" type="submit">Merge backup <span aria-hidden="true">↗</span></button></div></form>`);
    }catch(error){announce(errorText(error));}
  });
  container.addEventListener('submit',handleSubmit);
  dialog.addEventListener('click',handleClick);
  dialog.addEventListener('submit',handleSubmit);
  dialog.addEventListener('change',event=>{
    if(!['projectId','clientId'].includes(event.target.name))return;
    syncDialogFields();
    if(event.target.value==='__new__')dialog.querySelector(event.target.name==='projectId'?'[name="newName"]':'[name="newClientName"]')?.focus();
  });
  return {render,openUse,close(){if(dialog.open)dialog.close();},reset(){draftBuffers.clear();projectBuffers.clear();linkBuffers.clear();briefBuffers.clear();reviewBuffers.clear();tabs.clear();pendingBackup=null;previewRevision++;if(dialog.open)dialog.close();}};
}
