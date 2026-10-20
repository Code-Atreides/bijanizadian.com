// Content tracking for the campus media CRM: turns Bright Data's TikTok and
// Instagram scraper rows into RTDB content_posts (new videos) and dated
// snapshots (numbers for videos already known), and profile rows into each
// tracked account's daily follower count. Pure functions only, so the
// logic is tested offline (track.test.mjs); index.js does the I/O.

export const DATASETS = {
  tiktok: { id: 'gd_lu702nij2f790tmv9h', name: 'TikTok - Posts', discoverBy: 'profile_url' },
  instagram: { id: 'gd_lyclm20il4r5helnj', name: 'Instagram - Reels', discoverBy: 'url' }
};
// follower counts come from each account's profile, one row per account
export const PROFILES = {
  tiktok: { id: 'gd_l1villgoiiidt09ci', name: 'TikTok - Profiles' },
  instagram: { id: 'gd_l1vikfch901nx3by4', name: 'Instagram - Profiles' }
};
export const POSTS_PER_PROFILE = 8;
// a second run within this window updates the last snapshot instead of adding one
export const SNAPSHOT_GAP = 6 * 3600 * 1000;
const EARLIEST = Date.UTC(2020, 0, 1);

// ---------- profiles ----------

const HANDLE = { tiktok: /^[A-Za-z0-9._]{2,24}$/, instagram: /^[A-Za-z0-9._]{1,30}$/ };

// "@name", "name" or a profile link, to the canonical profile URL and handle
export function normalizeProfile(platform, value) {
  let text = String(value || '').trim();
  if (!text) return null;
  let handle = '';
  const link = /^(https?:\/\/)?(www\.|m\.)?(tiktok|instagram)\.com\//i.test(text);
  if (link) {
    try {
      const url = new URL(/^https?:/i.test(text) ? text : 'https://' + text);
      const host = url.hostname.replace(/^(www|m)\./, '');
      if (host !== platform + '.com') return null;
      const first = url.pathname.split('/').filter(Boolean)[0] || '';
      handle = platform === 'tiktok' ? (first.startsWith('@') ? first.slice(1) : '') : first;
    } catch { return null; }
  } else handle = text.replace(/^@/, '');
  if (!HANDLE[platform].test(handle) || (platform === 'instagram' && /^(p|reel|reels|stories|explore)$/i.test(handle))) return null;
  return platform === 'tiktok'
    ? { handle, url: 'https://www.tiktok.com/@' + handle }
    : { handle, url: 'https://www.instagram.com/' + handle + '/' };
}

// ---------- posts ----------

// the stable key for a video, from its link: the TikTok video id or the Instagram shortcode
export function externalId(platform, url) {
  const text = String(url || '');
  if (platform === 'tiktok') { const m = /\/video\/(\d{6,25})/.exec(text); return m ? 'tiktok:' + m[1] : ''; }
  const m = /instagram\.com\/(?:[A-Za-z0-9._]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,40})/.exec(text);
  return m ? 'instagram:' + m[1] : '';
}

// a number the scraper actually sent, or undefined; a missing count is unknown, not 0
function sent(v) {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}
function numbers(values) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
}
function when(v, now) {
  const n = typeof v === 'number' ? (v < 1e12 ? v * 1000 : v) : Date.parse(v);
  return Number.isFinite(n) && n >= EARLIEST && n <= now + 86400000 ? n : null;
}
function tagsFrom(value, caption) {
  let list = Array.isArray(value) ? value.map(t => (t && typeof t === 'object' ? t.name || t.title || t.hashtag : t)) : [];
  if (!list.length) list = String(caption || '').match(/#[\p{L}\p{N}_]+/gu) || [];
  const seen = new Set();
  return list.map(t => String(t || '').replace(/^#+/, '').toLowerCase().replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter(t => t && !seen.has(t) && seen.add(t)).slice(0, 30).map(t => '#' + t).join(' ');
}
function titleFrom(caption, platform, handle) {
  const line = String(caption || '').split('\n').map(s => s.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim()).find(Boolean) || '';
  if (!line) return (platform === 'tiktok' ? 'TikTok' : 'Instagram') + ' by @' + handle;
  return line.length > 120 ? line.slice(0, 117).trimEnd() + '…' : line;
}

// one scraper row to a post, or null for an error row or a row without a video link.
// Instagram stopped showing view counts to logged-out visitors in July 2026, so
// Bright Data's Instagram rows carry likes and comments but views: null; those
// posts get no views here and the team adds them from the app.
export function rowToPost(platform, row, now) {
  if (!row || row.error || row.error_code) return null;
  const url = String(row.url || '');
  const id = externalId(platform, url);
  if (!id || !/^https:\/\//.test(url)) return null;
  const tiktok = platform === 'tiktok';
  const handle = String((tiktok ? row.profile_username : row.user_posted) || '').replace(/^@/, '');
  const caption = row.description || row.caption || '';
  return {
    externalId: id, url: url.split('?')[0], handle: handle.toLowerCase(),
    postedAt: when(tiktok ? row.create_time : row.date_posted, now),
    title: titleFrom(caption, platform, handle || 'creator'),
    hashtags: tagsFrom(row.hashtags, caption),
    numbers: numbers(tiktok
      ? { views: sent(row.play_count), likes: sent(row.digg_count), comments: sent(row.comment_count), shares: sent(row.share_count ?? row.num_share_count) }
      : { views: sent(row.views ?? row.video_play_count ?? row.video_view_count), likes: sent(row.likes), comments: sent(row.num_comments), shares: sent(row.shares) })
  };
}

// ---------- the plan: what to write ----------

function randomId(n, rand) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'; let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(rand() * chars.length)];
  return out;
}
export function newId(now, rand = Math.random) { return now.toString(36) + '-' + randomId(6, rand); }

// creators: {id: creator}; posts: {id: post}; rows: [{platform, row}]
// returns { updates (one multi-path RTDB update), report: {creatorId: {...}} }
export function plan({ creators, posts, rows, now, rand = Math.random }) {
  const updates = {}, report = {};
  const byHandle = { tiktok: {}, instagram: {} };
  for (const [id, c] of Object.entries(creators || {})) {
    for (const platform of ['tiktok', 'instagram']) {
      const p = c && c[platform] ? normalizeProfile(platform, c[platform]) : null;
      if (p) byHandle[platform][p.handle.toLowerCase()] = id;
    }
  }
  const known = {};
  for (const [id, p] of Object.entries(posts || {})) {
    const key = (p && p.external_id) || externalId(p && p.platform, p && p.url);
    if (key) known[key] = { id, post: p };
  }
  const seen = new Set();
  for (const { platform, row, input } of rows || []) {
    const item = rowToPost(platform, row, now);
    const inputHandle = input ? (normalizeProfile(platform, input) || {}).handle : '';
    const creatorId = byHandle[platform][(item && item.handle) || ''] || byHandle[platform][(inputHandle || '').toLowerCase()];
    if (creatorId) report[creatorId] = report[creatorId] || { found: 0, added: 0, updated: 0, errors: 0, noViews: 0 };
    if (!item) { if (creatorId) report[creatorId].errors++; continue; }
    if (!creatorId || seen.has(item.externalId)) continue;
    seen.add(item.externalId);
    report[creatorId].found++;
    if (item.numbers.views === undefined) report[creatorId].noViews++;
    const snap = { ...item.numbers, at: now };
    const hit = known[item.externalId];
    if (hit) {
      // a snapshot from the last few hours is refreshed rather than duplicated, unless
      // it holds a number this row lacks (views the team typed in for an Instagram post)
      const snaps = (hit.post && hit.post.snapshots) || {};
      const recent = Object.entries(snaps).filter(([, s]) => s && now - Number(s.at) < SNAPSHOT_GAP).sort((a, b) => b[1].at - a[1].at)[0];
      const refresh = recent && Object.keys(recent[1]).every(k => k in snap);
      const snapId = refresh ? recent[0] : newId(now, rand);
      updates[`content_posts/${hit.id}/snapshots/${snapId}`] = snap;
      const newest = Object.values(snaps).reduce((m, s) => Math.max(m, Number(s && s.at) || 0), 0);
      // latest keeps the last known value of anything this row doesn't have
      if (now >= newest) updates[`content_posts/${hit.id}/latest`] = { ...numbers(hit.post.latest || {}), ...snap };
      if (!hit.post.external_id) updates[`content_posts/${hit.id}/external_id`] = item.externalId;
      if (!hit.post.creator_id) updates[`content_posts/${hit.id}/creator_id`] = creatorId;
      report[creatorId].updated++;
    } else {
      const c = creators[creatorId] || {};
      const post = {
        url: item.url, platform, title: item.title, posted_at: item.postedAt || now, created_at: now,
        source: 'brightdata', external_id: item.externalId, creator_id: creatorId,
        latest: snap, snapshots: { [newId(now, rand)]: snap }
      };
      if (c.name) post.creator = String(c.name).slice(0, 100);
      if (c.school) post.school = String(c.school).slice(0, 120);
      if (/^[A-Z]{2}$/.test(c.state || '')) post.state = c.state;
      if (item.hashtags) post.hashtags = item.hashtags.slice(0, 500);
      updates[`content_posts/${newId(now, rand)}`] = post;
      report[creatorId].added++;
    }
  }
  return { updates, report };
}

// ---------- followers ----------

// the team's calendar day for a count (one follower count per account per day)
export function dayKey(now, timeZone = 'America/New_York') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

// profile rows to follower counts: content_creators/<id>/followers/<platform> holds
// the newest count, followers_log/<platform>/<day> one count a day
export function followerPlan({ creators, platform, rows, now }) {
  const updates = {}, byHandle = {};
  for (const [id, c] of Object.entries(creators || {})) {
    const p = c && c[platform] ? normalizeProfile(platform, c[platform]) : null;
    if (p) byHandle[p.handle.toLowerCase()] = id;
  }
  const day = dayKey(now);
  for (const row of rows || []) {
    if (!row || row.error || row.error_code) continue;
    const followers = sent(row.followers);
    if (followers === undefined) continue;
    const profile = [row.input && row.input.url, row.url, row.profile_url].map(v => normalizeProfile(platform, v)).find(Boolean);
    const handle = (profile ? profile.handle : String((platform === 'tiktok' ? row.account_id : row.account) || '')).toLowerCase();
    const id = byHandle[handle];
    if (!id) continue;
    updates[`content_creators/${id}/followers/${platform}`] = { count: followers, at: now };
    updates[`content_creators/${id}/followers_log/${platform}/${day}`] = followers;
  }
  return updates;
}

// the line each creator shows under their handle; only reels are collected on Instagram
export function summary(r, platform) {
  if (!r || !r.found) return r && r.errors ? 'No posts came back' : platform === 'instagram' ? 'No public reels found' : 'No public posts found';
  return r.found + (r.found === 1 ? ' post' : ' posts') + (r.added ? ', ' + r.added + ' new' : '') +
    (r.noViews !== r.found ? ' · numbers updated'
      : platform === 'instagram' ? ' · likes and comments updated, Instagram hides views' : ' · numbers updated, no views came back');
}
