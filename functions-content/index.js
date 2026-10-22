// Automatic content tracking for the campus media CRM, deployed as its own
// Functions codebase ("content") so deploys from here never touch the
// project's other functions.
//
//   contentTrackDaily  every day at 9 AM ET: asks Bright Data for each tracked
//                      account's profile (followers, and on Instagram its recent
//                      reels) and for each TikTok account's latest posts
//   contentCollect     every 15 minutes: picks up finished Bright Data
//                      snapshots and writes posts, captions, numbers and
//                      followers (track.js); an Instagram profile queues its
//                      reels to be collected by link
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
import { DATASETS, PROFILES, POSTS_PER_PROFILE, normalizeProfile, plan, followerPlan, recentVideos, summary } from './track.js';

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
// what a creator's row says when every row of a finished job is an error
function rowProblem(rows) {
  const text = rows.map(r => String(r.error || '')).join(' ');
  if (/too many requests|rate.?limit/i.test(text)) return 'Instagram is rate-limiting Bright Data right now. The next check tries again.';
  return 'Bright Data couldn\'t read these posts.';
}
function snapshotOf(res) {
  const id = res.json && res.json.snapshot_id;
  return id && /^[A-Za-z0-9_-]{4,80}$/.test(id) ? id : '';
}
function failAll(updates, ids, message, now) {
  ids.forEach(id => { updates[`content_creators/${id}/last_error`] = message; updates[`content_creators/${id}/last_checked_at`] = now; });
  updates['content_sync/last_error'] = { at: now, message };
}

// ask Bright Data for the latest of every active creator (or one)
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
    const ids = list.map(x => x.id), ds = DATASETS[platform];
    // TikTok: the latest posts straight from each profile link
    if (ds.discoverBy) {
      const res = await brightData('POST', `/datasets/v3/trigger?dataset_id=${ds.id}&include_errors=true&type=discover_new&discover_by=${ds.discoverBy}`,
        list.map(x => ({ url: x.profile.url, num_of_posts: POSTS_PER_PROFILE })));
      const snapshot = snapshotOf(res);
      if (!snapshot) { failAll(updates, ids, problem(res), now); continue; }
      updates[`content_sync/pending/${snapshot}`] = { platform, kind: 'posts', started_at: now, creators: ids.join(',') };
      started.push({ platform, creators: list.length });
    }
    // the profile: followers, and on Instagram the recent reels to collect next
    const prof = await brightData('POST', `/datasets/v3/trigger?dataset_id=${PROFILES[platform].id}&include_errors=true`,
      list.map(x => ({ url: x.profile.url })));
    const profSnapshot = snapshotOf(prof);
    if (profSnapshot) {
      updates[`content_sync/pending/${profSnapshot}`] = { platform, kind: 'profiles', started_at: now, creators: ids.join(',') };
      if (!ds.discoverBy) started.push({ platform, creators: list.length });
    } else if (!ds.discoverBy) failAll(updates, ids, problem(prof), now);
    else console.warn('profiles trigger failed', platform, prof.status); // TikTok keeps yesterday's follower count
  }
  if (Object.keys(updates).length) await db.ref().update(updates);
  return started;
}

// Instagram: the profile listed the recent reels; collect each by its link for
// numbers and captions, and tell the creators with none why
async function queueVideos(platform, creators, rows, ids, now, updates) {
  const { picks, failed } = recentVideos({ creators, platform, rows, now });
  const withVideos = [...new Set(picks.map(p => p.creatorId))];
  ids.filter(id => creators[id] && !withVideos.includes(id)).forEach(id => {
    updates[`content_creators/${id}/last_checked_at`] = now;
    updates[`content_creators/${id}/${platform}_result`] = failed.includes(id) ? 'Profile couldn\'t be read' : 'No public reels found';
    updates[`content_creators/${id}/last_error`] = null;
  });
  if (!picks.length) return;
  const res = await brightData('POST', `/datasets/v3/trigger?dataset_id=${DATASETS[platform].id}&include_errors=true`, picks.map(p => ({ url: p.url })));
  const snapshot = snapshotOf(res);
  if (snapshot) updates[`content_sync/pending/${snapshot}`] = { platform, kind: 'posts', started_at: now, creators: withVideos.join(',') };
  else failAll(updates, withVideos, problem(res), now);
}

// write every snapshot Bright Data has finished
async function collect() {
  const db = getDatabase();
  const pending = (await db.ref('content_sync/pending').get()).val() || {};
  for (const [snapshot, info] of Object.entries(pending)) {
    const ids = String(info.creators || '').split(',').filter(Boolean);
    const profiles = info.kind === 'profiles';
    const now = Date.now(), updates = {};
    const fail = message => {
      updates[`content_sync/pending/${snapshot}`] = null;
      // a TikTok profile only carries followers, so its posts job reports problems;
      // an Instagram profile is where the check starts, so it reports its own
      if (profiles && !DATASETS[info.platform].byUrl) return;
      ids.forEach(id => { updates[`content_creators/${id}/last_error`] = message; updates[`content_creators/${id}/last_checked_at`] = now; });
    };
    if (now - Number(info.started_at || 0) > PENDING_TTL) { fail('Bright Data didn\'t finish within a day.'); await db.ref().update(updates); continue; }
    const progress = await brightData('GET', `/datasets/v3/progress/${snapshot}`);
    const status = progress.json && progress.json.status;
    if (status === 'failed') { fail('Bright Data couldn\'t collect these posts.'); await db.ref().update(updates); continue; }
    if (status !== 'ready') continue;
    const data = await brightData('GET', `/datasets/v3/snapshot/${snapshot}?format=json`);
    if (data.status !== 200 || !Array.isArray(data.json)) continue;
    if (profiles) {
      const creators = (await db.ref('content_creators').get()).val() || {};
      Object.assign(updates, followerPlan({ creators, platform: info.platform, rows: data.json, now }));
      if (DATASETS[info.platform].byUrl) await queueVideos(info.platform, creators, data.json, ids, now, updates);
      updates[`content_sync/pending/${snapshot}`] = null;
      await db.ref().update(updates);
      continue;
    }
    // every row an error (Instagram refusing Bright Data, say): say so, keep the numbers
    if (data.json.length && data.json.every(row => row && (row.error || row.error_code))) {
      fail(rowProblem(data.json));
      updates['content_sync/last_run'] = { at: now, platform: info.platform, rows: data.json.length, errors: data.json.length };
      await db.ref().update(updates);
      continue;
    }
    const [creators, posts] = await Promise.all([db.ref('content_creators').get(), db.ref('content_posts').get()]);
    const rows = data.json.map(row => ({ platform: info.platform, row, input: (row.input && row.input.url) || (row.discovery_input && row.discovery_input.url) || '' }));
    const result = plan({ creators: creators.val() || {}, posts: posts.val() || {}, rows, now });
    Object.assign(updates, result.updates);
    // a creator removed while the check ran stays removed
    ids.filter(id => (creators.val() || {})[id]).forEach(id => {
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
