import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectStore, PROJECT_STORAGE_KEY } from '../agencykit/project-store.js';
import { archiveProjects as originals } from '../agencykit/archive-data.js';

const catalog = [
  { id: 'source-a', name: 'Campus page', projectId: 'fomo', sourceUrl: 'https://example.com/campus', description: 'Original copy.' },
  { id: 'source-b', name: 'Signup form', projectId: 'milo', sourceUrl: 'https://example.com/signup' },
  { id: 'source-c', name: 'Contact page', projectId: 'bijan', sourceUrl: 'https://example.com/contact' },
];
const archiveProjects = [
  { id: 'fomo', name: 'fomo', description: 'Campus work.', items: [catalog[0]] },
  { id: 'milo', name: 'Milo', description: 'Client work.', items: [catalog[1]] },
  { id: 'bijan', name: 'Bijan', description: 'Studio work.', items: [catalog[2]] },
];
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, writes: [], failure: null, getItem(key) { return data.get(key) ?? null; }, setItem(key, value) { if (this.failure?.(key, value)) throw new Error('Storage quota exceeded'); this.writes.push(key); data.set(key, value); } };
}
const make = (storage = memory(), extra = {}) => createProjectStore({ storage, catalog, archiveProjects, ...extra });
const payload = projects => ({ version: 1, projects });

test('the real archive seeds deterministic profiles without writing or changing originals', () => {
  const sourceCatalog = originals.flatMap(project => project.items.map(item => ({ ...item, projectId: project.id })));
  const before = JSON.stringify(originals), storage = memory();
  const store = createProjectStore({ storage, catalog: sourceCatalog, archiveProjects: originals });
  assert.deepEqual(store.getProjects().map(project => project.id), originals.map(project => project.id));
  for (const project of originals) {
    const seeded = store.getProject(project.id);
    assert.equal(seeded.name, project.name);
    assert.deepEqual(seeded.originalIds, project.items.map(item => item.id));
    assert.deepEqual(seeded.drafts, []);
    assert.equal(seeded.seeded, true);
  }
  assert.deepEqual(storage.writes, []);
  assert.equal(JSON.stringify(originals), before);
  assert.deepEqual(createProjectStore({ storage, catalog: sourceCatalog, archiveProjects: originals }).getProjects(), store.getProjects());
});

test('profile edits persist, partial nested updates preserve other fields, and notifications are detached', () => {
  const storage = memory(), store = make(storage);
  let events = 0;
  const unsubscribe = store.subscribe(projects => { events += 1; projects[0].name = 'Outside mutation'; });
  const project = store.createProject({ name: 'Client launch', client: 'Acme', brand: { accent: '#AA33CC', font: 'editorial' }, brief: { audience: 'Students', goal: 'Join a program' } });
  store.updateProject(project.id, { brand: { bg: '#ffffff' }, brief: { tone: 'Friendly' }, status: 'paused' });
  const saved = store.getProject(project.id);
  assert.equal(saved.brand.accent, '#aa33cc');
  assert.equal(saved.brand.font, 'editorial');
  assert.equal(saved.brief.goal, 'Join a program');
  assert.equal(saved.status, 'paused');
  assert.equal(store.getProject('fomo').name, 'fomo');
  assert.equal(events, 2);
  unsubscribe();
  store.updateProject(project.id, { name: 'Updated launch' });
  assert.equal(events, 2);
  assert.deepEqual(make(storage).getProjects(), store.getProjects());
  assert.match(project.id, /^[a-z0-9][a-z0-9_-]+$/i);
});

test('drafts are independent copies with immutable provenance and no writes to originals', () => {
  const store = make(), before = JSON.stringify(catalog);
  const first = store.createDraft('fomo', 'source-a');
  const second = store.createDraft('milo', 'source-a');
  store.updateDraft('fomo', first.id, { name: 'Client version', copy: { title: 'New client title' }, sourceId: 'source-b', id: 'changed', createdAt: '2099-01-01', provenance: { sourceName: 'Forged' }, versions: [{ id: 'forged' }] });
  const result = store.getDraft('fomo', first.id);
  assert.equal(result.copy.title, 'New client title');
  assert.equal(result.copy.cta, first.copy.cta);
  assert.equal(result.sourceId, first.sourceId);
  assert.equal(result.id, first.id);
  assert.equal(result.createdAt, first.createdAt);
  assert.deepEqual(result.provenance, first.provenance);
  assert.deepEqual(result.versions, []);
  assert.equal(store.getDraft('milo', second.id).copy.title, second.copy.title);
  result.copy.title = 'External mutation';
  assert.equal(store.getDraft('fomo', first.id).copy.title, 'New client title');
  assert.ok(store.getProject('milo').originalIds.includes('source-a'));
  assert.equal(JSON.stringify(catalog), before);
  assert.throws(() => store.createDraft('fomo', 'unknown-source'));
  assert.equal(store.getDraft('milo', first.id), null);
});

test('versions restore draft fields, retain source identity, and cap history at twenty snapshots', () => {
  const storage = memory(), store = make(storage), draft = store.createDraft('fomo', 'source-a');
  store.updateDraft('fomo', draft.id, { copy: { title: 'Approved title' }, status: 'review', liveUrl: 'https://example.com/client' });
  const version = store.saveVersion('fomo', draft.id, 'For client review');
  store.updateDraft('fomo', draft.id, { copy: { title: 'Another direction' }, status: 'draft', liveUrl: '' });
  const restored = store.restoreVersion('fomo', draft.id, version.id);
  assert.equal(restored.copy.title, 'Approved title');
  assert.equal(restored.status, 'review');
  assert.equal(restored.liveUrl, 'https://example.com/client');
  assert.equal(restored.sourceId, 'source-a');
  for (let i = 0; i < 22; i += 1) store.saveVersion('fomo', draft.id, `Checkpoint ${i}`);
  const versions = store.getDraft('fomo', draft.id).versions;
  assert.equal(versions.length, 20);
  assert.equal(versions[0].label, 'Checkpoint 2');
  assert.equal(versions.at(-1).label, 'Checkpoint 21');
  assert.throws(() => store.restoreVersion('fomo', draft.id, version.id), /Version not found/);
  assert.deepEqual(make(storage).getDraft('fomo', draft.id).versions, versions);
});

test('profile sanitation rejects active URLs and CSS values, bounds copy, and permits only small raster logos', () => {
  const store = make();
  const hostile = JSON.parse('{"name":"Client","__proto__":{"polluted":true},"brand":{"accent":"url(https://bad.test)","font":"evil","logo":"data:image/svg+xml,<svg onload=alert(1)>"},"links":{"website":"javascript:alert(1)","repo":"https://user:password@example.com/","files":"https://example.com/files"},"originalIds":["source-a","missing","source-a"]}');
  const project = store.createProject(hostile);
  assert.equal({}.polluted, undefined);
  assert.equal(own(project, '__proto__'), false);
  assert.equal(project.brand.accent, '#6366f1');
  assert.equal(project.brand.font, 'system');
  assert.equal(project.brand.logo, '');
  assert.deepEqual(project.links, { website: '', repo: '', files: 'https://example.com/files' });
  assert.deepEqual(project.originalIds, ['source-a']);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ZkAAAAASUVORK5CYII=';
  assert.equal(store.updateProject(project.id, { brand: { logo: png } }).brand.logo, png);
  assert.equal(store.updateProject(project.id, { brand: { logo: png.replace('image/png', 'image/jpeg') } }).brand.logo, '');
  assert.equal(store.updateProject(project.id, { brand: { logo: `data:image/png;base64,${'A'.repeat(180000)}` } }).brand.logo, '');
  const draft = store.createDraft(project.id, 'source-a');
  const saved = store.updateDraft(project.id, draft.id, { copy: { title: 'A'.repeat(1000), description: 'B'.repeat(9000) }, liveUrl: 'data:text/html,boom' });
  assert.equal(saved.copy.title.length, 240);
  assert.equal(saved.copy.description.length, 4000);
  assert.equal(saved.liveUrl, '');
});
const own = (object, key) => Object.hasOwn(object, key);

test('backup import merges new records while preserving local edits and restores pristine seed profiles', () => {
  const local = make(), remote = make();
  const originalDraft = local.createDraft('fomo', 'source-a');
  remote.importData(local.exportData());
  remote.updateProject('fomo', { client: 'Backup client' });
  remote.updateDraft('fomo', originalDraft.id, { copy: { title: 'Backup title' } });
  remote.saveVersion('fomo', originalDraft.id, 'Remote snapshot');
  const remoteDraft = remote.createDraft('fomo', 'source-b');
  const added = remote.createProject({ name: 'Additional project' });
  local.updateDraft('fomo', originalDraft.id, { copy: { title: 'Local title' } });
  local.importData(remote.exportData());
  assert.equal(local.getDraft('fomo', originalDraft.id).copy.title, 'Local title');
  assert.equal(local.getDraft('fomo', originalDraft.id).versions[0].snapshot.copy.title, 'Backup title');
  assert.equal(local.getDraft('fomo', remoteDraft.id).sourceId, 'source-b');
  assert.ok(local.getProject(added.id));
  const once = local.exportData();
  local.importData(remote.exportData());
  assert.equal(local.exportData(), once, 'importing the same backup twice is idempotent');
  const fresh = make();
  fresh.importData(remote.exportData());
  assert.equal(fresh.getProject('fomo').client, 'Backup client');
});

test('invalid imports and provenance conflicts fail atomically without losing any existing data', () => {
  const storage = memory(), store = make(storage), draft = store.createDraft('fomo', 'source-a');
  const before = store.exportData(), saved = storage.getItem(PROJECT_STORAGE_KEY);
  const conflict = JSON.parse(before); conflict.projects.find(project => project.id === 'fomo').drafts[0].sourceId = 'source-b';
  const unknown = JSON.parse(before); unknown.projects.find(project => project.id === 'fomo').drafts[0].sourceId = 'unknown';
  for (const input of ['{bad json', payload([{ id: '__proto__' }]), payload([{ id: 'new-project' }, { id: 'new-project' }]), conflict, unknown, { version: 999, projects: [] }, ' '.repeat(5 * 1024 * 1024 + 1)]) {
    assert.throws(() => store.importData(input));
    assert.equal(store.exportData(), before);
    assert.equal(storage.getItem(PROJECT_STORAGE_KEY), saved);
  }
  assert.throws(() => store.importData(JSON.stringify({ version: 1, projects: [], unused: '界'.repeat(2 * 1024 * 1024) })), /5 MB/, 'backup size is bounded in UTF-8 bytes, not just characters');
  assert.equal(store.getDraft('fomo', draft.id).sourceId, 'source-a');
});

test('failed storage writes throw before updating state or sending successful-change notifications', () => {
  const storage = memory(), errors = [], store = make(storage, { onError: error => errors.push(error) });
  const project = store.createProject({ name: 'Saved project' });
  const before = store.exportData(); let events = 0;
  store.subscribe(() => { events += 1; }); storage.failure = () => true;
  for (const action of [() => store.updateProject(project.id, { name: 'Not saved' }), () => store.createDraft(project.id, 'source-a'), () => store.replaceData(payload([])), () => store.importData(payload([{ id: 'new-project', name: 'New' }]))]) {
    assert.throws(action, /quota/);
    assert.equal(store.exportData(), before);
  }
  assert.equal(events, 0);
  assert.equal(errors.length, 4);
  storage.failure = null;
  assert.deepEqual(make(storage).getProjects(), store.getProjects());
});

test('corrupted storage is preserved before recovery and a failed recovery backup blocks overwrite', () => {
  const corrupt = '{broken but potentially recoverable', storage = memory({ [PROJECT_STORAGE_KEY]: corrupt });
  const errors = [], store = make(storage, { onError: error => errors.push(error) });
  assert.equal(store.getProjects().length, 3);
  assert.equal(storage.getItem(PROJECT_STORAGE_KEY), corrupt);
  assert.equal(storage.writes.length, 0);
  storage.failure = key => key !== PROJECT_STORAGE_KEY;
  assert.throws(() => store.createProject({ name: 'Blocked' }), /quota/);
  assert.equal(storage.getItem(PROJECT_STORAGE_KEY), corrupt);
  assert.equal(store.getProjects().length, 3);
  storage.failure = null;
  store.createProject({ name: 'Recovered workspace' });
  const recovery = [...storage.data].filter(([key]) => key.startsWith(`${PROJECT_STORAGE_KEY}.recovery.`));
  assert.equal(recovery.length, 1);
  assert.equal(recovery[0][1], corrupt);
  assert.equal(make(storage).getProjects().length, 4);
  assert.ok(errors.length >= 1);
});

test('cloud-style replacement sanitizes and replaces rather than merging while keeping seed fallbacks', () => {
  const storage = memory(), store = make(storage);
  store.createProject({ name: 'Old local-only project' });
  const remote = make(), project = remote.createProject({ name: 'Private project', links: { website: 'https://example.com/client' } });
  const draft = remote.createDraft(project.id, 'source-b');
  remote.updateDraft(project.id, draft.id, { copy: { title: 'Private client copy' } });
  let events = 0; store.subscribe(() => { events += 1; });
  const replaced = store.replaceData(remote.exportData());
  assert.deepEqual(replaced, remote.getProjects());
  assert.equal(events, 1);
  assert.deepEqual(make(storage).getProjects(), remote.getProjects());
  store.replaceData(payload([]));
  assert.deepEqual(store.getProjects().map(item => item.id), ['fomo', 'milo', 'bijan']);
  assert.equal(store.getProject(project.id), null);
});

test('unreadable storage cannot be overwritten with guessed empty state', () => {
  let writes = 0;
  const storage = { getItem() { throw new Error('Access denied'); }, setItem() { writes += 1; } };
  const store = make(storage);
  assert.equal(store.getProjects().length, 3);
  assert.throws(() => store.createProject({ name: 'Unsaved' }), /could not be read/);
  assert.throws(() => store.replaceData(payload([])), /could not be read/);
  assert.equal(writes, 0);
});
