/** Local project drafts. Originals are references, never writable source data. */
export const PROJECT_STORAGE_KEY = 'agencykit-projects-v1';
const VERSION = 4;
const REVIEW_KEYS = ['content', 'brand', 'links', 'services', 'mobile', 'privacy'];
const reviewFields = raw => Object.fromEntries(REVIEW_KEYS.map(key => [key, raw?.[key] === true]));
const SEED_TIME = '1970-01-01T00:00:00.000Z';
const MAX_IMPORT = 5 * 1024 * 1024;
const MAX_PROJECTS = 100;
const MAX_CLIENTS = 200;
const MAX_DRAFTS = 100;
const MAX_VERSIONS = 20;
const fitsBackup = value => typeof value === 'string' && value.length <= MAX_IMPORT && new TextEncoder().encode(value).byteLength <= MAX_IMPORT;
const own = (object, key) => Object.hasOwn(object, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const record = value => object(value) ? value : {};
const clone = value => JSON.parse(JSON.stringify(value));
const text = (value, max, fallback = '') => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max).trim() : fallback;
const choice = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const safeId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value) && !['constructor', 'prototype', '__proto__'].includes(value.toLowerCase());
const stamp = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : SEED_TIME;
const freshId = prefix => `${prefix}-${globalThis.crypto.randomUUID()}`;
const clientKey = name => name.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
function legacyClientId(name) {
  let hash = 14695981039346656037n;
  for (const byte of new TextEncoder().encode(clientKey(name))) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
  return `client-legacy-${hash.toString(16)}`;
}
function url(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) return '';
  try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : ''; } catch { return ''; }
}
function logo(value) {
  if (typeof value !== 'string' || value.length > 180000) return '';
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4) return '';
  try {
    const bytes = globalThis.atob(match[2].slice(0, 32));
    const valid = match[1] === 'png' ? bytes.startsWith('\x89PNG\r\n\x1a\n') : match[1] === 'jpeg' ? bytes.startsWith('\xff\xd8\xff') : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP';
    return valid ? value : '';
  } catch { return ''; }
}
const color = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;

/** All reads are detached snapshots. Mutations persist before notifying listeners.
 * Import merges new records; local edited records win collisions. Untouched seeded
 * profiles can adopt backup settings. Malformed prior storage is backed up before
 * the first replacement write. No cloud, network, or authentication is involved. */
export function createProjectStore({ storage, catalog = [], archiveProjects = [], publishingDomains = [], onError = () => {} } = {}) {
  const sources = new Map();
  for (const item of catalog) {
    if (!safeId(item?.id) || sources.has(item.id)) throw new TypeError('Catalog source IDs must be unique and safe.');
    sources.set(item.id, clone(item));
  }
  const seeds = new Map();
  for (const project of archiveProjects) {
    if (project?.seedProject === false) continue;
    if (!safeId(project?.id) || seeds.has(project.id)) throw new TypeError('Archive project IDs must be unique and safe.');
    seeds.set(project.id, project);
  }
  const domainNames = new Set(), oldSourceProjects = new Set(['milo-messina', 'bijan-izadian']);
  const oldDomainClients = new Set(['client-legacy-8698114e7eb628e8', 'client-legacy-62a5e2b4fd7ebd93']);
  const domainKey = value => {
    let normalized = clientKey(text(value, 2048));
    try { if (/^https?:\/\//.test(normalized)) normalized = new URL(normalized).hostname; } catch { /* Keep invalid URL-like names as plain text. */ }
    return normalized.replace(/^www\./, '').replace(/[/.]+$/, '');
  };
  for (const domain of [
    { id: 'milo-messina', name: 'milomessina.com', aliases: ['Milo Messina'] },
    { id: 'bijan-izadian', name: 'bijanizadian.com', aliases: ['Bijan Izadian'] },
    ...publishingDomains,
  ]) {
    if (safeId(domain.id)) oldSourceProjects.add(domain.id);
    for (const name of [domain.name, domain.url, ...(domain.aliases || [])].filter(value => typeof value === 'string' && value.trim())) {
      domainNames.add(domainKey(name)); oldDomainClients.add(legacyClientId(name));
    }
  }
  const isDomainName = name => Boolean(name) && domainNames.has(domainKey(name));
  const requireClientName = name => { if (isDomainName(name)) throw new TypeError('Publishing domains are source locations, not clients. Choose an actual client name.'); };
  const listeners = new Set();
  let state, unreadable = null, recoveryRaw = null, recoverySaved = false;
  const report = error => { try { onError(error); } catch { /* Reporting cannot change save semantics. */ } };
  const originalIds = values => [...new Set((Array.isArray(values) ? values : []).filter(id => safeId(id) && sources.has(id)))];

  function profile(raw, base = {}) {
    raw = record(raw);
    const brand = { ...record(base.brand), ...record(raw.brand) };
    const brief = { ...record(base.brief), ...record(raw.brief) };
    const links = { ...record(base.links), ...record(raw.links) };
    const value = key => own(raw, key) ? raw[key] : base[key];
    return {
      name: text(value('name'), 120, 'Untitled project') || 'Untitled project',
      clientId: value('clientId') || null, client: text(value('client'), 120), description: text(value('description'), 4000),
      status: choice(value('status'), ['active', 'paused', 'complete'], 'active'),
      brand: { accent: color(brand.accent, '#6366f1'), bg: color(brand.bg, '#f7f7f5'), ink: color(brand.ink, '#242423'), font: choice(brand.font, ['system', 'editorial', 'modern'], 'system'), logo: logo(brand.logo) },
      brief: { audience: text(brief.audience, 1000), goal: text(brief.goal, 1600), tone: text(brief.tone, 500) },
      links: { website: url(links.website), repo: url(links.repo), files: url(links.files) },
      originalIds: originalIds(value('originalIds')),
    };
  }
  function clientFields(raw, base = {}) {
    raw = record(raw);
    return {
      name: text(own(raw, 'name') ? raw.name : base.name, 120, 'Untitled client') || 'Untitled client',
      relationship: choice(own(raw, 'relationship') ? raw.relationship : base.relationship, ['current', 'previous'], 'current'),
    };
  }
  function normalizeClient(raw) {
    if (!object(raw) || !safeId(raw.id)) throw new TypeError('Invalid client ID.');
    return { id: raw.id, ...clientFields(raw), createdAt: stamp(raw.createdAt), updatedAt: stamp(raw.updatedAt) };
  }
  function clientByName(data, name, time = SEED_TIME) {
    name = text(name, 120, 'Untitled client') || 'Untitled client';
    requireClientName(name);
    const found = data.clients.find(client => clientKey(client.name) === clientKey(name));
    if (found) return found;
    if (data.clients.length >= MAX_CLIENTS) throw new RangeError('This workspace can hold at most 200 clients.');
    let id = time === SEED_TIME ? legacyClientId(name) : freshId('client');
    if (data.clients.some(client => client.id === id)) throw new TypeError('Client identities conflict. Import was not saved.');
    const client = { id, name, relationship: 'current', createdAt: time, updatedAt: time };
    data.clients.push(client);
    return client;
  }
  function assignClient(data, project, time = SEED_TIME) {
    if (!project.clientId && !project.client) { project.clientId = null; project.client = ''; return; }
    const client = project.clientId ? data.clients.find(item => item.id === project.clientId) : clientByName(data, project.client, time);
    if (!client || !safeId(client.id)) throw new TypeError('Choose an existing client for this project.');
    project.clientId = client.id; project.client = client.name;
  }
  function linkClients(data) {
    if (data.clients.length > MAX_CLIENTS) throw new RangeError('This workspace can hold at most 200 clients.');
    for (const project of data.projects) assignClient(data, project);
    return data;
  }
  function removePublishingClients(data, inputVersion) {
    const falseIds = new Set(data.clients.filter(client => isDomainName(client.name)).map(client => client.id));
    const actualIds = new Set(data.clients.filter(client => !falseIds.has(client.id)).map(client => client.id));
    data.clients = data.clients.filter(client => !falseIds.has(client.id));
    data.projects = data.projects.filter(project => {
      if (inputVersion < 3 && !project.clientId && !project.client && typeof seeds.get(project.id)?.client === 'string') project.client = text(seeds.get(project.id).client, 120);
      // A user-renamed real client is authoritative even if its ID began as one
      // of the mistaken legacy clients. Do not undo that explicit correction.
      const explicitActual = actualIds.has(project.clientId) || (!project.clientId && project.client && !isDomainName(project.client));
      const falseClient = falseIds.has(project.clientId) || (!explicitActual && (isDomainName(project.client) || oldDomainClients.has(project.clientId)));
      const oldSource = inputVersion < 3 && oldSourceProjects.has(project.id) && !explicitActual;
      if (falseClient || oldSource) { project.clientId = null; project.client = ''; }
      if (!oldSource) return true;
      const defaults = profile({}).brand;
      const untouched = project.updatedAt === SEED_TIME && !project.drafts.length && isDomainName(project.name)
        && project.status === 'active' && JSON.stringify(project.brand) === JSON.stringify(defaults)
        && Object.values(project.brief).every(value => !value) && Object.values(project.links).every(value => !value);
      return !untouched;
    });
    return data;
  }
  function draftFields(raw, base = {}) {
    raw = record(raw);
    const copy = { ...record(base.copy), ...record(raw.copy) };
    const value = key => own(raw, key) ? raw[key] : base[key];
    return {
      name: text(value('name'), 160, 'Untitled draft') || 'Untitled draft',
      status: choice(value('status'), ['draft', 'review', 'live'], 'draft'),
      copy: { eyebrow: text(copy.eyebrow, 120), title: text(copy.title, 240), description: text(copy.description, 4000), cta: text(copy.cta, 120) },
      liveUrl: url(value('liveUrl')),
      review: reviewFields(value('review')),
    };
  }
  function provenance(sourceId) {
    const source = sources.get(sourceId);
    return { sourceId, sourceName: text(source.name, 160), sourceProjectId: safeId(source.projectId) ? source.projectId : [...seeds.values()].find(project => project.items?.some(item => item.id === sourceId))?.id || '', sourceUrl: url(source.sourceUrl) };
  }
  function normalizeVersion(raw) {
    if (!object(raw) || !safeId(raw.id) || !object(raw.snapshot)) throw new TypeError('Invalid draft version.');
    return { id: raw.id, label: text(raw.label, 120), createdAt: stamp(raw.createdAt), snapshot: draftFields(raw.snapshot) };
  }
  function normalizeDraft(raw) {
    if (!object(raw) || !safeId(raw.id) || !sources.has(raw.sourceId)) throw new TypeError('A draft must reference an existing original.');
    if (raw.versions !== undefined && !Array.isArray(raw.versions)) throw new TypeError('Invalid version list.');
    const versions = (raw.versions || []).map(normalizeVersion);
    if (new Set(versions.map(version => version.id)).size !== versions.length) throw new TypeError('Duplicate version IDs.');
    return { id: raw.id, sourceId: raw.sourceId, ...draftFields(raw), provenance: provenance(raw.sourceId), createdAt: stamp(raw.createdAt), updatedAt: stamp(raw.updatedAt), versions: versions.slice(-MAX_VERSIONS) };
  }
  function seedProject(id) {
    const seed = seeds.get(id);
    return { id, seeded: true, ...profile({ name: seed.name, client: seed.client || '', description: seed.description, originalIds: seed.items?.map(item => item.id) }), drafts: [], createdAt: SEED_TIME, updatedAt: SEED_TIME };
  }
  function normalizeProject(raw) {
    if (!object(raw) || !safeId(raw.id)) throw new TypeError('Invalid project ID.');
    if (raw.drafts !== undefined && !Array.isArray(raw.drafts)) throw new TypeError('Invalid draft list.');
    if ((raw.drafts || []).length > MAX_DRAFTS) throw new RangeError('A project can hold at most 100 drafts.');
    const drafts = (raw.drafts || []).map(normalizeDraft);
    if (new Set(drafts.map(draft => draft.id)).size !== drafts.length) throw new TypeError('Duplicate draft IDs.');
    const normalized = { id: raw.id, seeded: seeds.has(raw.id), ...profile(raw), drafts, createdAt: stamp(raw.createdAt), updatedAt: stamp(raw.updatedAt) };
    const untouchedSeed = seeds.has(raw.id) && normalized.updatedAt === SEED_TIME;
    normalized.originalIds = originalIds([...(untouchedSeed ? [] : normalized.originalIds), ...drafts.map(draft => draft.sourceId), ...(seeds.has(raw.id) ? seedProject(raw.id).originalIds : [])]);
    return normalized;
  }
  function parse(input) {
    const serialized = typeof input === 'string' ? input : JSON.stringify(input);
    if (!fitsBackup(serialized)) throw new RangeError('Project backup must be smaller than 5 MB.');
    const data = JSON.parse(serialized);
    if (!object(data) || ![1, 2, 3, VERSION].includes(data.version) || !Array.isArray(data.projects)) throw new TypeError('Unsupported project backup format.');
    if (data.projects.length > MAX_PROJECTS) throw new RangeError('A backup can hold at most 100 projects.');
    if ((data.version >= 2 || data.clients !== undefined) && !Array.isArray(data.clients)) throw new TypeError('Invalid client list.');
    if ((data.clients || []).length > MAX_CLIENTS) throw new RangeError('A backup can hold at most 200 clients.');
    const clients = (data.clients || []).map(normalizeClient);
    if (new Set(clients.map(client => client.id)).size !== clients.length) throw new TypeError('Duplicate client IDs.');
    const projects = data.projects.map(normalizeProject);
    if (new Set(projects.map(project => project.id)).size !== projects.length) throw new TypeError('Duplicate project IDs.');
    return linkClients(removePublishingClients({ version: VERSION, clients, projects }, data.version));
  }
  function withSeeds(data) {
    const projects = [...data.projects];
    for (const id of seeds.keys()) if (!projects.some(project => project.id === id)) projects.push(seedProject(id));
    if (projects.length > MAX_PROJECTS) throw new RangeError('This workspace can hold at most 100 projects.');
    return linkClients({ version: VERSION, clients: [...(data.clients || [])], projects });
  }
  state = withSeeds({ projects: [] });
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    unreadable = new Error('Browser storage is unavailable. Project changes cannot be saved.'); report(unreadable);
  } else {
    let raw;
    try { raw = storage.getItem(PROJECT_STORAGE_KEY); } catch (error) { unreadable = error; report(error); }
    if (raw !== null && raw !== undefined) {
      try { state = withSeeds(parse(raw)); }
      catch { recoveryRaw = raw; report(new Error('Stored project data could not be read. The original will be preserved in a recovery backup before saving.')); }
    }
  }
  function commit(next) {
    try {
      if (unreadable) throw new Error('Project storage could not be read. Reload with browser storage enabled before saving.');
      const serialized = JSON.stringify(next);
      if (!fitsBackup(serialized)) throw new RangeError('Project data exceeds the 5 MB backup limit.');
      if (recoveryRaw !== null && !recoverySaved) {
        storage.setItem(`${PROJECT_STORAGE_KEY}.recovery.${freshId('backup')}`, recoveryRaw);
        recoverySaved = true;
      }
      storage.setItem(PROJECT_STORAGE_KEY, serialized);
    } catch (error) { report(error); throw error; }
    state = next; recoveryRaw = null;
    for (const listener of [...listeners]) { try { listener(clone(state.projects)); } catch (error) { report(error); } }
  }
  const locateProject = (data, id) => { const project = data.projects.find(item => item.id === id); if (!project) throw new RangeError('Project not found.'); return project; };
  const locateDraft = (project, id) => { const draft = project.drafts.find(item => item.id === id); if (!draft) throw new RangeError('Draft not found.'); return draft; };
  function mutate(projectId, callback) {
    const next = clone(state), project = locateProject(next, projectId);
    const result = callback(project, next);
    project.updatedAt = new Date().toISOString();
    commit(next);
    return clone(result);
  }
  function addDraft(project, sourceId) {
    const now = new Date().toISOString(), source = sources.get(sourceId);
    const draft = { id: freshId('draft'), sourceId, ...draftFields({ name: `${source.name || 'Original'} draft`, copy: { eyebrow: project.client || project.name, title: 'Your next chapter.', description: 'A clear introduction to what you do and who it is for.', cta: 'Get started' } }), provenance: provenance(sourceId), createdAt: now, updatedAt: now, versions: [] };
    project.drafts.push(draft); project.originalIds = originalIds([...project.originalIds, sourceId]);
    return draft;
  }
  return {
    getClients: () => clone(state.clients),
    getClient: id => clone(state.clients.find(client => client.id === id) || null),
    createClient(fields = {}) {
      if (state.clients.length >= MAX_CLIENTS) throw new RangeError('This workspace can hold at most 200 clients.');
      const now = new Date().toISOString(), next = clone(state);
      const client = { id: freshId('client'), ...clientFields(fields), createdAt: now, updatedAt: now };
      requireClientName(client.name);
      next.clients.push(client); commit(next);
      return clone(client);
    },
    updateClient(clientId, patch) {
      const next = clone(state), client = next.clients.find(item => item.id === clientId);
      if (!client) throw new RangeError('Client not found.');
      Object.assign(client, clientFields(patch, client), { updatedAt: new Date().toISOString() });
      requireClientName(client.name);
      for (const project of next.projects) if (project.clientId === clientId && project.client !== client.name) { project.client = client.name; project.updatedAt = client.updatedAt; }
      commit(next);
      return clone(client);
    },
    getProjects: () => clone(state.projects),
    getProject: id => clone(state.projects.find(project => project.id === id) || null),
    getDraft: (projectId, draftId) => clone(state.projects.find(project => project.id === projectId)?.drafts.find(draft => draft.id === draftId) || null),
    createProject(fields = {}) {
      if (state.projects.length >= MAX_PROJECTS) throw new RangeError('This workspace can hold at most 100 projects.');
      const now = new Date().toISOString(), next = clone(state);
      const project = { id: freshId('project'), seeded: false, ...profile(fields), drafts: [], createdAt: now, updatedAt: now };
      assignClient(next, project, now);
      next.projects.push(project); commit(next);
      return clone(project);
    },
    updateProject(projectId, patch) {
      return mutate(projectId, (project, next) => {
        const previousBrand = JSON.stringify(project.brand);
        Object.assign(project, profile(patch, project));
        if (JSON.stringify(project.brand) !== previousBrand) for (const draft of project.drafts) {
          draft.review = { ...draft.review, brand: false, mobile: false };
          draft.updatedAt = new Date().toISOString();
        }
        if (own(record(patch), 'client') && !own(record(patch), 'clientId')) project.clientId = '';
        if (own(record(patch), 'clientId') && !patch.clientId) project.client = '';
        assignClient(next, project, new Date().toISOString());
        project.originalIds = originalIds([...project.originalIds, ...project.drafts.map(draft => draft.sourceId), ...(seeds.has(projectId) ? seedProject(projectId).originalIds : [])]);
        return project;
      });
    },
    createDraft(projectId, sourceId) {
      if (!sources.has(sourceId)) throw new RangeError('Choose an existing original for this draft.');
      return mutate(projectId, project => {
        if (project.drafts.length >= MAX_DRAFTS) throw new RangeError('A project can hold at most 100 drafts.');
        return addDraft(project, sourceId);
      });
    },
    // A journey is one atomic save. Reusing it keeps existing edits intact.
    createDrafts(projectId, sourceIds) {
      if (!Array.isArray(sourceIds) || !sourceIds.length || sourceIds.some(id => !sources.has(id))) throw new RangeError('Choose existing originals for this journey.');
      const ids = [...new Set(sourceIds)];
      return mutate(projectId, project => {
        const missing = ids.filter(id => !project.drafts.some(draft => draft.sourceId === id));
        if (project.drafts.length + missing.length > MAX_DRAFTS) throw new RangeError('A project can hold at most 100 drafts.');
        return ids.map(id => project.drafts.find(draft => draft.sourceId === id) || addDraft(project, id));
      });
    },
    updateDraft(projectId, draftId, patch) {
      return mutate(projectId, project => {
        const draft = locateDraft(project, draftId);
        const updated = draftFields(patch, draft);
        if (JSON.stringify(draft.copy) !== JSON.stringify(updated.copy)) Object.assign(updated.review, {content:false, links:false, mobile:false});
        if (draft.liveUrl !== updated.liveUrl) updated.review = reviewFields();
        Object.assign(draft, updated, { updatedAt: new Date().toISOString() });
        return draft;
      });
    },
    saveVersion(projectId, draftId, label = '') {
      return mutate(projectId, project => {
        const draft = locateDraft(project, draftId);
        const version = { id: freshId('version'), label: text(label, 120), createdAt: new Date().toISOString(), snapshot: draftFields(draft) };
        draft.versions = [...draft.versions, version].slice(-MAX_VERSIONS); draft.updatedAt = version.createdAt;
        return version;
      });
    },
    restoreVersion(projectId, draftId, versionId) {
      return mutate(projectId, project => {
        const draft = locateDraft(project, draftId), version = draft.versions.find(item => item.id === versionId);
        if (!version) throw new RangeError('Version not found.');
        Object.assign(draft, draftFields(version.snapshot), { review: reviewFields(), updatedAt: new Date().toISOString() });
        return draft;
      });
    },
    exportData: () => JSON.stringify(state),
    replaceData(input) {
      const next = withSeeds(parse(input));
      commit(next);
      return clone(state.projects);
    },
    importData(input) {
      const incoming = parse(input), next = clone(state);
      const aliases = new Map();
      for (const imported of incoming.clients) {
        const existing = next.clients.find(client => client.id === imported.id)
          || (imported.id.startsWith('client-legacy-') ? next.clients.find(client => clientKey(client.name) === clientKey(imported.name)) : null);
        if (!existing) { next.clients.push(imported); continue; }
        aliases.set(imported.id, existing.id);
        if (existing.updatedAt === SEED_TIME) Object.assign(existing, clientFields(imported), { updatedAt: imported.updatedAt });
      }
      for (const imported of incoming.projects) {
        imported.clientId = aliases.get(imported.clientId) || imported.clientId;
        const existing = next.projects.find(project => project.id === imported.id);
        if (!existing) { next.projects.push(imported); continue; }
        if (existing.seeded && existing.updatedAt === SEED_TIME) Object.assign(existing, profile(imported), { updatedAt: imported.updatedAt });
        existing.originalIds = originalIds([...existing.originalIds, ...imported.originalIds]);
        for (const draft of imported.drafts) {
          const current = existing.drafts.find(item => item.id === draft.id);
          if (!current) { existing.drafts.push(draft); continue; }
          if (current.sourceId !== draft.sourceId) throw new TypeError('A conflicting draft ID refers to a different original. Import was not saved.');
          // Keep local snapshots on ID collisions, and retain the newest 20.
          current.versions = [...current.versions, ...draft.versions.filter(version => !current.versions.some(item => item.id === version.id))].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-MAX_VERSIONS);
        }
        if (existing.drafts.length > MAX_DRAFTS) throw new RangeError('A project can hold at most 100 drafts.');
      }
      if (next.projects.length > MAX_PROJECTS) throw new RangeError('This workspace can hold at most 100 projects.');
      commit(withSeeds(next));
      return clone(state.projects);
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Subscriber must be a function.');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
