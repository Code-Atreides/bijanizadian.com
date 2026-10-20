// Automatic content tracking for the campus media CRM, deployed as its own
// Functions codebase ("content") so deploys from here never touch the
// project's other functions.
//
//   contentTrackDaily  every day at 9 AM ET: asks Bright Data for each tracked
//                      creator's latest TikTok and Instagram posts
//   contentCollect     every 15 minutes: picks up finished Bright Data
//                      snapshots and writes posts and numbers (track.js)
//   contentTrackNow    POST /campus/api/track (Hosting rewrite), team only:
//                      the same request for one creator or everyone, now
//
// The Bright Data key is the BRIGHTDATA_TOKEN secret and never leaves the
// backend. Pending snapshots wait in RTDB content_sync/pending.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { DATASETS, POSTS_PER_PROFILE, normalizeProfile, plan, summary } from './track.js';

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 2 });

const BRIGHTDATA_TOKEN = defineSecret('BRIGHTDATA_TOKEN');
const ADMIN_EMAIL = 'izadianbijan@gmail.com';
const PENDING_TTL = 24 * 3600 * 1000;

async function brightData(method, path, body) {
  const response = await fetch('https://api.brightdata.com' + path, {
    method, headers: { Authorization: 'Bearer ' + BRIGHTDATA_TOKEN.value(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* some answers are plain text */ }
  return { status: response.status, json, text };
}

// what a creator's row says when Bright Data refuses the request
function problem(res) {
  const text = String(res.text || '');
  if (/customer is not active/i.test(text)) return 'Bright Data account isn\'t active yet. Verify it in Bright Data\'s dashboard.';
  if (res.status === 401 || res.status === 403) return 'Bright Data rejected the API key.';
  if (res.status === 402 || /balance|credit|payment/i.test(text)) return 'Bright Data account is out of credit.';
  return 'Bright Data error (HTTP ' + res.status + ').';
}

// ask Bright Data for the latest posts of every active creator (or one)
async function startChecks(only) {
  const db = getDatabase();
  const creators = (await db.ref('content_creators').get()).val() || {};
  const now = Date.now(), updates = {}, started = [];
  for (const platform of Object.keys(DATASETS)) {
    const list = Object.entries(creators)
      .filter(([id, c]) => c && c.active !== false && (!only || id === only))
      .map(([id, c]) => ({ id, profile: normalizeProfile(platform, c[platform]) }))
      .filter(x => x.profile);
    if (!list.length) continue;
    const ds = DATASETS[platform];
    const res = await brightData('POST', `/datasets/v3/trigger?dataset_id=${ds.id}&include_errors=true&type=discover_new&discover_by=${ds.discoverBy}`,
      list.map(x => ({ url: x.profile.url, num_of_posts: POSTS_PER_PROFILE })));
    const snapshot = res.json && res.json.snapshot_id;
    if (snapshot && /^[A-Za-z0-9_-]{4,80}$/.test(snapshot)) {
      updates[`content_sync/pending/${snapshot}`] = { platform, started_at: now, creators: list.map(x => x.id).join(',') };
      started.push({ platform, creators: list.length });
    } else {
      const message = problem(res);
      list.forEach(x => { updates[`content_creators/${x.id}/last_error`] = message; updates[`content_creators/${x.id}/last_checked_at`] = now; });
      updates['content_sync/last_error'] = { at: now, message };
    }
  }
  if (Object.keys(updates).length) await db.ref().update(updates);
  return started;
}

// write every snapshot Bright Data has finished
async function collect() {
  const db = getDatabase();
  const pending = (await db.ref('content_sync/pending').get()).val() || {};
  for (const [snapshot, info] of Object.entries(pending)) {
    const ids = String(info.creators || '').split(',').filter(Boolean);
    const now = Date.now(), updates = {};
    const fail = message => {
      updates[`content_sync/pending/${snapshot}`] = null;
      ids.forEach(id => { updates[`content_creators/${id}/last_error`] = message; updates[`content_creators/${id}/last_checked_at`] = now; });
    };
    if (now - Number(info.started_at || 0) > PENDING_TTL) { fail('Bright Data didn\'t finish within a day.'); await db.ref().update(updates); continue; }
    const progress = await brightData('GET', `/datasets/v3/progress/${snapshot}`);
    const status = progress.json && progress.json.status;
    if (status === 'failed') { fail('Bright Data couldn\'t collect these posts.'); await db.ref().update(updates); continue; }
    if (status !== 'ready') continue;
    const data = await brightData('GET', `/datasets/v3/snapshot/${snapshot}?format=json`);
    if (data.status !== 200 || !Array.isArray(data.json)) continue;
    const [creators, posts] = await Promise.all([db.ref('content_creators').get(), db.ref('content_posts').get()]);
    const rows = data.json.map(row => ({ platform: info.platform, row, input: (row.input && row.input.url) || (row.discovery_input && row.discovery_input.url) || '' }));
    const result = plan({ creators: creators.val() || {}, posts: posts.val() || {}, rows, now });
    Object.assign(updates, result.updates);
    ids.forEach(id => {
      updates[`content_creators/${id}/last_checked_at`] = now;
      updates[`content_creators/${id}/${info.platform}_result`] = summary(result.report[id], info.platform);
      updates[`content_creators/${id}/last_error`] = null;
    });
    updates[`content_sync/pending/${snapshot}`] = null;
    updates['content_sync/last_run'] = { at: now, platform: info.platform, rows: rows.length };
    await db.ref().update(updates);
  }
}

const options = { secrets: [BRIGHTDATA_TOKEN], timeoutSeconds: 300, memory: '256MiB' };

export const contentTrackDaily = onSchedule({ ...options, schedule: 'every day 09:00', timeZone: 'America/New_York' }, async () => {
  await collect();
  await startChecks(null);
});

export const contentCollect = onSchedule({ ...options, schedule: 'every 15 minutes' }, async () => {
  const pending = (await getDatabase().ref('content_sync/pending').get()).val();
  if (pending) await collect();
});

export const contentTrackNow = onRequest({ ...options, timeoutSeconds: 120 }, async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') || '');
  let user = null;
  try { user = match ? await getAuth().verifyIdToken(match[1]) : null; } catch { user = null; }
  if (!user || !user.email_verified || user.email !== ADMIN_EMAIL) { res.status(403).json({ error: 'Team only' }); return; }
  const only = req.body && typeof req.body.creator === 'string' && /^[a-z0-9]{8,10}-[a-z0-9]{6}$/.test(req.body.creator) ? req.body.creator : null;
  try {
    const started = await startChecks(only);
    res.json({ started });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'Could not reach Bright Data.' });
  }
});
