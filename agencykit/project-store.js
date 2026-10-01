/** Local project drafts. Originals are references, never writable source data. */
export const PROJECT_STORAGE_KEY = 'agencykit-projects-v1';
const VERSION = 1;
const SEED_TIME = '1970-01-01T00:00:00.000Z';
const MAX_IMPORT = 5 * 1024 * 1024;
const MAX_PROJECTS = 100;
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
export function createProjectStore({ storage, catalog = [], archiveProjects = [], onError = () => {} } = {}) {
  const sources = new Map();
  for (const item of catalog) {
    if (!safeId(item?.id) || sources.has(item.id)) throw new TypeError('Catalog source IDs must be unique and safe.');
    sources.set(item.id, clone(item));
  }
  const seeds = new Map();
  for (const project of archiveProjects) {
    if (!safeId(project?.id) || seeds.has(project.id)) throw new TypeError('Archive project IDs must be unique and safe.');
    seeds.set(project.id, project);
  }
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
      client: text(value('client'), 120), description: text(value('description'), 4000),
      status: choice(value('status'), ['active', 'paused', 'complete'], 'active'),
      brand: { accent: color(brand.accent, '#6366f1'), bg: color(brand.bg, '#f7f7f5'), ink: color(brand.ink, '#242423'), font: choice(brand.font, ['system', 'editorial', 'modern'], 'system'), logo: logo(brand.logo) },
      brief: { audience: text(brief.audience, 1000), goal: text(brief.goal, 1600), tone: text(brief.tone, 500) },
      links: { website: url(links.website), repo: url(links.repo), files: url(links.files) },
      originalIds: originalIds(value('originalIds')),
    };
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
    return { id, seeded: true, ...profile({ name: seed.name, description: seed.description, originalIds: seed.items?.map(item => item.id) }), drafts: [], createdAt: SEED_TIME, updatedAt: SEED_TIME };
  }
  function normalizeProject(raw) {
    if (!object(raw) || !safeId(raw.id)) throw new TypeError('Invalid project ID.');
    if (raw.drafts !== undefined && !Array.isArray(raw.drafts)) throw new TypeError('Invalid draft list.');
    if ((raw.drafts || []).length > MAX_DRAFTS) throw new RangeError('A project can hold at most 100 drafts.');
    const drafts = (raw.drafts || []).map(normalizeDraft);
    if (new Set(drafts.map(draft => draft.id)).size !== drafts.length) throw new TypeError('Duplicate draft IDs.');
    const normalized = { id: raw.id, seeded: seeds.has(raw.id), ...profile(raw), drafts, createdAt: stamp(raw.createdAt), updatedAt: stamp(raw.updatedAt) };
    normalized.originalIds = originalIds([...normalized.originalIds, ...drafts.map(draft => draft.sourceId), ...(seeds.has(raw.id) ? seedProject(raw.id).originalIds : [])]);
    return normalized;
  }
  function parse(input) {
    const serialized = typeof input === 'string' ? input : JSON.stringify(input);
    if (!fitsBackup(serialized)) throw new RangeError('Project backup must be smaller than 5 MB.');
    const data = JSON.parse(serialized);
    if (!object(data) || data.version !== VERSION || !Array.isArray(data.projects)) throw new TypeError('Unsupported project backup format.');
    if (data.projects.length > MAX_PROJECTS) throw new RangeError('A backup can hold at most 100 projects.');
    const projects = data.projects.map(normalizeProject);
    if (new Set(projects.map(project => project.id)).size !== projects.length) throw new TypeError('Duplicate project IDs.');
    return { version: VERSION, projects };
  }
  function withSeeds(data) {
    const projects = [...data.projects];
    for (const id of seeds.keys()) if (!projects.some(project => project.id === id)) projects.push(seedProject(id));
    if (projects.length > MAX_PROJECTS) throw new RangeError('This workspace can hold at most 100 projects.');
    return { version: VERSION, projects };
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
    const result = callback(project);
    project.updatedAt = new Date().toISOString();
    commit(next);
    return clone(result);
  }
  return {
    getProjects: () => clone(state.projects),
    getProject: id => clone(state.projects.find(project => project.id === id) || null),
    getDraft: (projectId, draftId) => clone(state.projects.find(project => project.id === projectId)?.drafts.find(draft => draft.id === draftId) || null),
    createProject(fields = {}) {
      if (state.projects.length >= MAX_PROJECTS) throw new RangeError('This workspace can hold at most 100 projects.');
      const now = new Date().toISOString();
      const project = { id: freshId('project'), seeded: false, ...profile(fields), drafts: [], createdAt: now, updatedAt: now };
      commit({ version: VERSION, projects: [...clone(state.projects), project] });
      return clone(project);
    },
    updateProject(projectId, patch) {
      return mutate(projectId, project => {
        Object.assign(project, profile(patch, project));
        project.originalIds = originalIds([...project.originalIds, ...project.drafts.map(draft => draft.sourceId), ...(seeds.has(projectId) ? seedProject(projectId).originalIds : [])]);
        return project;
      });
    },
    createDraft(projectId, sourceId) {
      if (!sources.has(sourceId)) throw new RangeError('Choose an existing original for this draft.');
      return mutate(projectId, project => {
        if (project.drafts.length >= MAX_DRAFTS) throw new RangeError('A project can hold at most 100 drafts.');
        const now = new Date().toISOString(), source = sources.get(sourceId);
        const draft = { id: freshId('draft'), sourceId, ...draftFields({ name: `${source.name || 'Original'} draft`, copy: { eyebrow: project.client || project.name, title: 'Your next chapter.', description: 'A clear introduction to what you do and who it is for.', cta: 'Get started' } }), provenance: provenance(sourceId), createdAt: now, updatedAt: now, versions: [] };
        project.drafts.push(draft); project.originalIds = originalIds([...project.originalIds, sourceId]);
        return draft;
      });
    },
    updateDraft(projectId, draftId, patch) {
      return mutate(projectId, project => {
        const draft = locateDraft(project, draftId);
        Object.assign(draft, draftFields(patch, draft), { updatedAt: new Date().toISOString() });
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
        Object.assign(draft, draftFields(version.snapshot), { updatedAt: new Date().toISOString() });
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
      for (const imported of incoming.projects) {
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
