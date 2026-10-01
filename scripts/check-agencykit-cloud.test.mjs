import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectCloud, emailLinkCode } from '../agencykit/project-cloud.js';
import { createProjectStore, PROJECT_STORAGE_KEY } from '../agencykit/project-store.js';

const AUTH = 'agencykit-session-v1', PENDING = 'agencykit-pending-v1';
const catalog = [{ id: 'source', name: 'Original', projectId: 'fomo' }];
const archiveProjects = [{ id: 'fomo', name: 'fomo', items: catalog }];
const snapshot = (name, id = 'shared-project') => JSON.stringify({ version: 1, projects: [{ id, name, drafts: [] }] });
const identity = () => ({ uid: 'test-user', email: 'approved@example.test', idToken: 'fake-id-token', refreshToken: 'fake-refresh-token', expiresAt: Date.now() + 3600000 });
const cloudValue = (name = 'Cloud copy', revision = 3) => ({ payload: snapshot(name), revision });
function response(value, { status = 200, etag = '"v1"' } = {}) {
  return { ok: status >= 200 && status < 300, status, headers: { get: name => name.toLowerCase() === 'etag' ? etag : null }, json: async () => value };
}
function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, fail: null, getItem: key => data.get(key) ?? null, setItem(key, value) { if (this.fail?.(key)) throw Error('Storage unavailable'); data.set(key, String(value)); }, removeItem(key) { data.delete(key); } };
}
function environment(t, { auth = null, pending = null, href = 'https://example.test/agencykit#projects', replies = [] } = {}) {
  const local = storage({ [PROJECT_STORAGE_KEY]: snapshot('Local project', 'local-project') });
  const session = storage({ ...(auth ? { [AUTH]: JSON.stringify(auth) } : {}), ...(pending ? { [PENDING]: JSON.stringify(pending) } : {}) });
  const calls = [], changes = [], timers = new Map(), historyCalls = [];
  let timerId = 0, mode = 'local', cloud;
  const overrides = {
    location: { href, origin: 'https://example.test' }, history: { replaceState(...args) { historyCalls.push(args); } },
    sessionStorage: session, localStorage: local, window: new EventTarget(),
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    async fetch(url, options = {}) {
      calls.push({ url: String(url), ...options });
      const reply = replies.shift();
      if (!reply) throw Error(`Unexpected mocked request: ${options.method || 'GET'} ${url}`);
      return typeof reply === 'function' ? reply(String(url), options) : reply;
    },
  };
  const descriptors = new Map(Object.keys(overrides).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(overrides)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  const adapter = {
    getItem: key => local.getItem(key),
    setItem(key, value) {
      const state = cloud?.getState();
      if (state?.signedIn && !state.ready && !state.applying) throw Error('Cloud workspace is not ready');
      if (mode === 'shared') session.setItem('agencykit-shared-cache', value); else local.setItem(key, value);
    },
  };
  const store = createProjectStore({ storage: adapter, catalog, archiveProjects });
  cloud = createProjectCloud({ store, setStorageMode: value => { mode = value; }, onChange: detail => changes.push(detail) });
  return { cloud, store, local, session, calls, changes, timers, replies, historyCalls, get mode() { return mode; } };
}

test('email sign-in code extraction accepts direct and nested links but ignores unrelated actions', () => {
  const direct = 'https://example.test/action?mode=signIn&oobCode=fake-code';
  assert.equal(emailLinkCode(direct), 'fake-code');
  assert.equal(emailLinkCode(`https://example.test/redirect?link=${encodeURIComponent(direct)}`), 'fake-code');
  assert.equal(emailLinkCode(`https://example.test/redirect?deep_link_id=${encodeURIComponent(direct)}`), 'fake-code');
  assert.equal(emailLinkCode('https://example.test/action?mode=resetPassword&oobCode=fake-code'), '');
  assert.equal(emailLinkCode('https://example.test/action?mode=signIn'), '');
  assert.equal(emailLinkCode('not a url'), '');
});

test('anonymous startup and local edits never perform a cloud write or send an email', async t => {
  const env = environment(t);
  await env.cloud.start();
  env.store.createDraft('local-project', 'source');
  await env.cloud.retry();
  assert.equal(env.cloud.getState().signedIn, false);
  assert.equal(env.mode, 'local');
  assert.equal(env.calls.length, 0);
  assert.equal(env.session.getItem(PENDING), null);
  assert.ok(JSON.parse(env.local.getItem(PROJECT_STORAGE_KEY)).projects.find(project => project.id === 'local-project').drafts.length);
});

test('session restore uses ETag updates and signing out restores untouched local projects', async t => {
  const env = environment(t, { auth: identity(), replies: [response(cloudValue()), response({}, { etag: '"v2"' })] });
  const localBefore = env.local.getItem(PROJECT_STORAGE_KEY);
  await env.cloud.start();
  assert.equal(env.store.getProject('shared-project').name, 'Cloud copy');
  assert.equal(env.store.getProject('local-project'), null);
  env.store.updateProject('shared-project', { name: 'Shared edit' });
  assert.equal(env.cloud.getState().dirty, true);
  assert.ok(env.session.getItem(PENDING));
  await env.cloud.retry();
  const write = env.calls.find(call => call.method === 'PUT');
  assert.equal(write.headers['if-match'], '"v1"');
  assert.equal(JSON.parse(write.body).revision, 4);
  assert.equal(JSON.parse(write.body).updatedBy, 'test-user');
  assert.equal(env.cloud.getState().dirty, false);
  assert.equal(env.session.getItem(PENDING), null);
  assert.equal(env.local.getItem(PROJECT_STORAGE_KEY), localBefore, 'shared edits never enter local storage');
  await env.cloud.signOut();
  assert.equal(env.store.getProject('local-project').name, 'Local project');
  assert.equal(env.store.getProject('shared-project'), null);
  assert.equal(env.session.getItem(AUTH), null);
  assert.equal(env.session.getItem('agencykit-shared-cache'), null);
  assert.equal(env.cloud.getState().signedIn, false);
});

test('access-denied identities remain disconnected and cannot write or replace local work', async t => {
  const env = environment(t, { auth: identity(), replies: [response({ error: 'Permission denied' }, { status: 403 })] });
  const before = env.store.exportData();
  await env.cloud.start();
  assert.equal(env.cloud.getState().ready, false);
  assert.match(env.cloud.getState().message, /does not have access/);
  assert.equal(env.store.exportData(), before);
  assert.throws(() => env.store.createProject({ name: 'Blocked edit' }), /not ready/);
  assert.equal(env.calls.filter(call => call.method === 'PUT').length, 0);
  assert.equal(env.mode, 'local');
});

test('a stale cloud write enters conflict without retries overwriting another device', async t => {
  const env = environment(t, { auth: identity(), replies: [response(cloudValue()), response(null, { status: 412 })] });
  await env.cloud.start();
  env.store.updateProject('shared-project', { name: 'Unsynced edit' });
  await env.cloud.retry();
  assert.equal(env.cloud.getState().conflict, true);
  assert.equal(env.cloud.getState().dirty, true);
  assert.equal(env.store.getProject('shared-project').name, 'Unsynced edit');
  assert.ok(env.session.getItem(PENDING));
  await env.cloud.retry();
  await assert.rejects(env.cloud.signOut(), /unsynced/);
  assert.equal(env.calls.length, 2, 'conflicted edits are never retried as unconditional writes');
});

test('same-session pending edits recover and sync only against their original cloud version', async t => {
  const pending = { uid: 'test-user', payload: snapshot('Recovered pending edit'), etag: '"v1"', revision: 3 };
  const env = environment(t, { auth: identity(), pending, replies: [response(cloudValue()), response({}, { etag: '"v2"' })] });
  await env.cloud.start();
  assert.equal(env.store.getProject('shared-project').name, 'Recovered pending edit');
  assert.equal(env.calls[1].headers['if-match'], '"v1"');
  assert.equal(env.session.getItem(PENDING), null);
  assert.equal(env.cloud.getState().dirty, false);
  assert.equal(env.cloud.getState().ready, true);
});

test('failed conflict reload preserves pending recovery and a later successful reload clears it', async t => {
  const pending = { uid: 'test-user', payload: snapshot('Pending conflict edit'), etag: '"v1"', revision: 3 };
  const env = environment(t, { auth: identity(), pending, replies: [response(cloudValue('New cloud copy', 4), { etag: '"v2"' }), () => { throw Error('Offline'); }, response(cloudValue('Latest cloud copy', 5), { etag: '"v3"' })] });
  await env.cloud.start();
  assert.equal(env.cloud.getState().conflict, true);
  assert.equal(env.store.getProject('shared-project').name, 'Pending conflict edit');
  await assert.rejects(env.cloud.loadCloud(), /could not load/);
  assert.equal(env.cloud.getState().dirty, true);
  assert.equal(env.cloud.getState().conflict, true);
  assert.equal(env.session.getItem(PENDING), JSON.stringify(pending));
  assert.equal(env.store.getProject('shared-project').name, 'Pending conflict edit');
  await env.cloud.loadCloud();
  assert.equal(env.store.getProject('shared-project').name, 'Latest cloud copy');
  assert.equal(env.cloud.getState().dirty, false);
  assert.equal(env.cloud.getState().conflict, false);
  assert.equal(env.session.getItem(PENDING), null);
  assert.ok(env.session.getItem('agencykit-conflict-backup').includes('Pending conflict edit'));
  assert.equal(env.calls.filter(call => call.method === 'PUT').length, 0);
});

test('pending edits for a different identity never replace the authenticated workspace', async t => {
  const env = environment(t, { auth: identity(), pending: { uid: 'other-user', payload: snapshot('Other private copy'), etag: '"v1"' }, replies: [response(cloudValue())] });
  await env.cloud.start();
  assert.equal(env.store.getProject('shared-project').name, 'Cloud copy');
  assert.equal(env.calls.filter(call => call.method === 'PUT').length, 0);
  assert.equal(env.cloud.getState().dirty, false);
});

test('a missing ETag never permits a blind cloud overwrite', async t => {
  const env = environment(t, { auth: identity(), replies: [response(cloudValue(), { etag: null })] });
  await env.cloud.start();
  env.store.updateProject('shared-project', { name: 'Keep this pending' });
  await env.cloud.retry();
  assert.equal(env.calls.filter(call => call.method === 'PUT').length, 0);
  assert.equal(env.cloud.getState().dirty, true);
  assert.match(env.cloud.getState().message, /version could not be verified/);
  assert.ok(env.session.getItem(PENDING));
});

test('edits made during an in-flight save remain pending and use the new ETag on the next save', async t => {
  let release;
  const env = environment(t, { auth: identity(), replies: [response(cloudValue()), () => new Promise(resolve => { release = resolve; }), response({}, { etag: '"v3"' })] });
  await env.cloud.start();
  env.store.updateProject('shared-project', { name: 'First edit' });
  const saving = env.cloud.retry();
  for (let i = 0; !release && i < 10; i += 1) await Promise.resolve();
  assert.equal(typeof release, 'function');
  env.store.updateProject('shared-project', { name: 'Second edit' });
  release(response({}, { etag: '"v2"' })); await saving;
  assert.equal(env.cloud.getState().dirty, true);
  assert.ok(JSON.parse(env.session.getItem(PENDING)).payload.includes('Second edit'));
  await env.cloud.retry();
  assert.equal(env.calls[2].headers['if-match'], '"v2"');
  assert.ok(JSON.parse(env.calls[2].body).payload.includes('Second edit'));
  assert.equal(env.cloud.getState().dirty, false);
});

test('failed local restoration on sign-out cannot leave shared projects writable to local storage', async t => {
  const env = environment(t, { auth: identity(), replies: [response(cloudValue())] });
  await env.cloud.start();
  const before = env.local.getItem(PROJECT_STORAGE_KEY);
  env.local.fail = key => key === PROJECT_STORAGE_KEY;
  await assert.rejects(env.cloud.signOut());
  assert.equal(env.mode, 'shared', 'failure must retain the private storage mode');
  assert.equal(env.cloud.getState().signedIn, true, 'failed sign-out must retain its authenticated context');
  env.local.fail = null;
  env.store.updateProject('shared-project', { name: 'Still private' });
  assert.equal(env.local.getItem(PROJECT_STORAGE_KEY), before);
});

test('restored-session requests have a bounded abort path and never write when startup aborts', async t => {
  let timeout;
  t.mock.method(AbortSignal, 'timeout', value => { timeout = value; return AbortSignal.abort(new DOMException('Timed out', 'TimeoutError')); });
  const env = environment(t, { auth: identity(), replies: [(url, options) => { options.signal.throwIfAborted(); }] });
  await env.cloud.start();
  assert.ok(timeout > 0 && timeout <= 15000);
  assert.equal(env.cloud.getState().ready, false);
  assert.equal(env.calls.filter(call => call.method === 'PUT').length, 0);
  assert.equal(env.store.getProject('local-project').name, 'Local project');
});
