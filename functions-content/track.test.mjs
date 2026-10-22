// Offline checks for track.js: node track.test.mjs
import assert from 'node:assert/strict';
import { normalizeProfile, externalId, rowToPost, plan, summary, newId, followerPlan, dayKey, recentVideos } from './track.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok -', name); };
const NOW = Date.UTC(2026, 9, 20, 16, 0);
const H = 3600 * 1000;
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test('profiles normalize from handles and links', () => {
  assert.deepEqual(normalizeProfile('tiktok', '@AvaChen'), { handle: 'AvaChen', url: 'https://www.tiktok.com/@AvaChen' });
  assert.deepEqual(normalizeProfile('tiktok', 'https://www.tiktok.com/@ava.chen?lang=en'), { handle: 'ava.chen', url: 'https://www.tiktok.com/@ava.chen' });
  assert.deepEqual(normalizeProfile('instagram', 'instagram.com/ava_chen/'), { handle: 'ava_chen', url: 'https://www.instagram.com/ava_chen/' });
  assert.equal(normalizeProfile('instagram', 'https://www.instagram.com/reel/Cabc123/'), null);
  assert.equal(normalizeProfile('tiktok', 'https://www.instagram.com/ava/'), null);
  assert.equal(normalizeProfile('tiktok', 'has spaces'), null);
  assert.equal(normalizeProfile('tiktok', ''), null);
});

test('video keys come from the link', () => {
  assert.equal(externalId('tiktok', 'https://www.tiktok.com/@ava/video/7412345678901234567?is_from_webapp=1'), 'tiktok:7412345678901234567');
  assert.equal(externalId('instagram', 'https://www.instagram.com/reel/DAbc_12-xy/'), 'instagram:DAbc_12-xy');
  assert.equal(externalId('instagram', 'https://www.instagram.com/ava_chen/reel/DAbc_12-xy/'), 'instagram:DAbc_12-xy');
  assert.equal(externalId('tiktok', 'https://www.tiktok.com/@ava'), '');
});

const ttRow = (id, plays, extra = {}) => ({
  url: `https://www.tiktok.com/@avachen/video/${id}`, post_id: String(id), profile_username: 'avachen',
  create_time: '2026-10-18T23:30:00.000Z', description: 'Asking the student section who wins 🏈 #gameday #USC #fomo',
  hashtags: ['gameday', 'USC', 'fomo'], play_count: plays, digg_count: 900, comment_count: 40, share_count: 12, collect_count: 30, ...extra
});
const igRow = (code, views) => ({
  url: `https://www.instagram.com/reel/${code}/`, post_id: '3456', user_posted: 'ava_chen', date_posted: '2026-10-17T20:00:00.000Z',
  description: 'Tailgate at 9am\n#tailgate #gameday', hashtags: null, views, likes: 300, num_comments: 18, shares: 7
});

test('rows become posts with numbers, title, hashtags and time', () => {
  const tt = rowToPost('tiktok', ttRow('7412345678901234567', 52000), NOW);
  assert.equal(tt.externalId, 'tiktok:7412345678901234567');
  assert.equal(tt.title, 'Asking the student section who wins 🏈');
  assert.equal(tt.hashtags, '#gameday #usc #fomo');
  assert.deepEqual(tt.numbers, { views: 52000, likes: 900, comments: 40, shares: 12 });
  assert.equal(tt.postedAt, Date.parse('2026-10-18T23:30:00.000Z'));
  const ig = rowToPost('instagram', igRow('DAbc12xy', 18000), NOW);
  assert.equal(ig.title, 'Tailgate at 9am');
  assert.equal(ig.hashtags, '#tailgate #gameday', 'falls back to hashtags in the caption');
  assert.deepEqual(ig.numbers, { views: 18000, likes: 300, comments: 18, shares: 7 });
  assert.equal(rowToPost('tiktok', { error: 'Page not found', url: 'https://www.tiktok.com/@x' }, NOW), null);
  assert.equal(rowToPost('tiktok', { url: 'javascript:alert(1)/video/123456789' }, NOW), null);
  const unix = rowToPost('tiktok', ttRow('7412345678901234999', 5, { create_time: 1760830200 }), NOW);
  assert.equal(unix.postedAt, 1760830200 * 1000, 'unix seconds are read too');
});

const creators = {
  'mfc1aaaa-aaaaa1': { name: 'Ava Chen', school: 'University of Southern California', state: 'CA', tiktok: 'https://www.tiktok.com/@AvaChen', instagram: 'https://www.instagram.com/ava_chen/', active: true },
  'mfc2bbbb-bbbbb2': { name: 'Marcus Lee', tiktok: '@marcuslee', active: true }
};

test('new videos become posts for the right creator', () => {
  const { updates, report } = plan({ creators, posts: {}, rows: [{ platform: 'tiktok', row: ttRow('7412345678901234567', 52000) }, { platform: 'instagram', row: igRow('DAbc12xy', 18000) }], now: NOW, rand });
  const created = Object.entries(updates).filter(([k]) => /^content_posts\/[a-z0-9]{8,10}-[a-z0-9]{6}$/.test(k));
  assert.equal(created.length, 2);
  const tt = created.map(([, v]) => v).find(p => p.platform === 'tiktok');
  assert.equal(tt.creator, 'Ava Chen'); assert.equal(tt.state, 'CA'); assert.equal(tt.source, 'brightdata');
  assert.equal(tt.creator_id, 'mfc1aaaa-aaaaa1'); assert.equal(tt.latest.views, 52000); assert.equal(Object.keys(tt.snapshots).length, 1);
  assert.match(Object.keys(tt.snapshots)[0], /^[a-z0-9-]{6,24}$/);
  assert.deepEqual(report['mfc1aaaa-aaaaa1'], { found: 2, added: 2, updated: 0, errors: 0, noViews: 0 });
  assert.equal(summary(report['mfc1aaaa-aaaaa1']), '2 posts, 2 new · numbers updated');
});

test('known videos get a new dated snapshot, including manually logged ones', () => {
  const posts = {
    'mfp1aaaa-aaaaaa': { url: 'https://www.tiktok.com/@avachen/video/7412345678901234567', platform: 'tiktok', title: 'Game day', posted_at: NOW - 40 * H,
      latest: { at: NOW - 24 * H, views: 30000 }, snapshots: { s1: { at: NOW - 24 * H, views: 30000 } } }
  };
  const { updates, report } = plan({ creators, posts, rows: [{ platform: 'tiktok', row: ttRow('7412345678901234567', 52000) }], now: NOW, rand });
  const snapKeys = Object.keys(updates).filter(k => k.startsWith('content_posts/mfp1aaaa-aaaaaa/snapshots/'));
  assert.equal(snapKeys.length, 1);
  assert.notEqual(snapKeys[0], 'content_posts/mfp1aaaa-aaaaaa/snapshots/s1', 'a day-old snapshot is kept');
  assert.equal(updates['content_posts/mfp1aaaa-aaaaaa/latest'].views, 52000);
  assert.equal(updates['content_posts/mfp1aaaa-aaaaaa/external_id'], 'tiktok:7412345678901234567');
  assert.equal(updates['content_posts/mfp1aaaa-aaaaaa/creator_id'], 'mfc1aaaa-aaaaa1');
  assert.equal(Object.keys(updates).some(k => /^content_posts\/[^/]+$/.test(k)), false, 'no duplicate post');
  assert.deepEqual(report['mfc1aaaa-aaaaa1'], { found: 1, added: 0, updated: 1, errors: 0, noViews: 0 });
});

test('a second check the same day refreshes the snapshot instead of adding one', () => {
  const posts = { 'mfp1aaaa-aaaaaa': { url: 'https://www.tiktok.com/@avachen/video/7412345678901234567', platform: 'tiktok', external_id: 'tiktok:7412345678901234567',
    latest: { at: NOW - 2 * H, views: 50000 }, snapshots: { recent: { at: NOW - 2 * H, views: 50000 } } } };
  const { updates } = plan({ creators, posts, rows: [{ platform: 'tiktok', row: ttRow('7412345678901234567', 52000) }], now: NOW, rand });
  assert.equal(updates['content_posts/mfp1aaaa-aaaaaa/snapshots/recent'].views, 52000);
  assert.equal(Object.keys(updates).filter(k => k.includes('/snapshots/')).length, 1);
});

test('unknown accounts, duplicates and error rows are skipped', () => {
  const rows = [
    { platform: 'tiktok', row: { ...ttRow('7400000000000000001', 10), profile_username: 'someoneelse' } },
    { platform: 'tiktok', row: ttRow('7412345678901234567', 52000) },
    { platform: 'tiktok', row: ttRow('7412345678901234567', 52000) },
    { platform: 'tiktok', row: { error: 'Profile is private', error_code: 'private' }, input: 'https://www.tiktok.com/@marcuslee' }
  ];
  const { updates, report } = plan({ creators, posts: {}, rows, now: NOW, rand });
  assert.equal(Object.keys(updates).filter(k => /^content_posts\/[^/]+$/.test(k)).length, 1);
  assert.deepEqual(report['mfc2bbbb-bbbbb2'], { found: 0, added: 0, updated: 0, errors: 1, noViews: 0 });
  assert.equal(summary(report['mfc2bbbb-bbbbb2']), 'No posts came back');
});

// what Bright Data's Instagram Reels dataset really sends since July 2026
const igLive = (code) => ({
  url: `https://www.instagram.com/p/${code}/`, user_posted: 'ava_chen', date_posted: '2026-10-18T23:14:12.000Z', product_type: 'clips',
  description: 'Rush week recap', likes: 25, num_comments: 2, views: null, video_play_count: null
});

test('Instagram views that never came back stay unknown, not 0', () => {
  const ig = rowToPost('instagram', igLive('Dep1N5tIZMG'), NOW);
  assert.deepEqual(ig.numbers, { likes: 25, comments: 2 });
  const { updates, report } = plan({ creators, posts: {}, rows: [{ platform: 'instagram', row: igLive('Dep1N5tIZMG') }], now: NOW, rand });
  const post = Object.values(updates)[0];
  assert.deepEqual(post.latest, { likes: 25, comments: 2, at: NOW });
  assert.equal('views' in Object.values(post.snapshots)[0], false);
  assert.equal(summary(report['mfc1aaaa-aaaaa1'], 'instagram'), '1 post, 1 new · likes and comments updated, Instagram hides views');
  assert.equal(summary({ found: 0, added: 0, updated: 0, errors: 0 }, 'instagram'), 'No public reels found');
});

test('views typed in by the team survive the next Instagram check', () => {
  const posts = { 'mfp3cccc-cccccc': { url: 'https://www.instagram.com/p/Dep1N5tIZMG/', platform: 'instagram', title: 'Rush week', external_id: 'instagram:Dep1N5tIZMG',
    latest: { at: NOW - 1 * H, views: 1200, likes: 20, comments: 2, shares: 3 }, snapshots: { typed: { at: NOW - 1 * H, views: 1200, likes: 20, comments: 2, shares: 3 } } } };
  const { updates } = plan({ creators, posts, rows: [{ platform: 'instagram', row: igLive('Dep1N5tIZMG') }], now: NOW, rand });
  assert.equal(updates['content_posts/mfp3cccc-cccccc/snapshots/typed'], undefined, 'the typed snapshot is left alone');
  const added = Object.entries(updates).filter(([k]) => k.includes('/snapshots/'));
  assert.equal(added.length, 1);
  assert.deepEqual(added[0][1], { likes: 25, comments: 2, at: NOW });
  assert.deepEqual(updates['content_posts/mfp3cccc-cccccc/latest'], { at: NOW, views: 1200, likes: 25, comments: 2, shares: 3 });
  // a second check soon after refreshes its own snapshot, not the typed one
  const again = plan({ creators, posts: { 'mfp3cccc-cccccc': { ...posts['mfp3cccc-cccccc'], snapshots: { ...posts['mfp3cccc-cccccc'].snapshots, auto: added[0][1] } } },
    rows: [{ platform: 'instagram', row: { ...igLive('Dep1N5tIZMG'), likes: 26 } }], now: NOW + 0.5 * H, rand });
  assert.equal(again.updates['content_posts/mfp3cccc-cccccc/snapshots/auto'].likes, 26);
  assert.equal(Object.keys(again.updates).filter(k => k.includes('/snapshots/')).length, 1);
});

test('follower counts land on the right creator, one count per day', () => {
  // the shape Bright Data's Profiles datasets returned on 2026-10-20
  const rows = [
    { account: 'ava_chen', followers: 66, posts_count: 2, url: 'https://www.instagram.com/ava_chen/', input: { url: 'https://www.instagram.com/ava_chen/' } },
    { account: 'stranger', followers: 5000, url: 'https://www.instagram.com/stranger/', input: { url: 'https://www.instagram.com/stranger/' } },
    { error: 'Profile not found', input: { url: 'https://www.instagram.com/gone/' } },
    { account: 'ava_chen', followers: null, input: { url: 'https://www.instagram.com/ava_chen/' } }
  ];
  const updates = followerPlan({ creators, platform: 'instagram', rows, now: NOW });
  assert.deepEqual(updates, {
    'content_creators/mfc1aaaa-aaaaa1/followers/instagram': { count: 66, at: NOW },
    'content_creators/mfc1aaaa-aaaaa1/followers_log/instagram/2026-10-20': 66
  });
  const tt = followerPlan({ creators, platform: 'tiktok', rows: [{ account_id: 'marcuslee', followers: 96400, url: 'https://www.tiktok.com/@marcuslee', input: { url: 'https://www.tiktok.com/@marcuslee' } }], now: NOW });
  assert.equal(tt['content_creators/mfc2bbbb-bbbbb2/followers/tiktok'].count, 96400);
  assert.equal(dayKey(Date.UTC(2026, 9, 21, 2, 0)), '2026-10-20', 'days follow Eastern time');
});

// Instagram - Posts, collected by link: the shape it returned on 2026-10-22
const igByLink = (code, likes, caption = 'Wouldn\u2019t trust bro with a penny \ud83d\ude2d #reels #viral #crypto #fomo') => ({
  url: `https://www.instagram.com/p/${code}`, user_posted: 'ava_chen', date_posted: '2026-10-20T23:14:47.000Z', likes, num_comments: 0,
  content_type: 'Reel', description: caption, input: { url: `https://www.instagram.com/p/${code}`, country: '' }
});

test('captions come in with new posts and fill in once on known ones', () => {
  const fresh = plan({ creators, posts: {}, rows: [{ platform: 'instagram', row: igByLink('Deu_MVToZ8a', 11), input: 'https://www.instagram.com/p/Deu_MVToZ8a' }], now: NOW, rand });
  const post = Object.values(fresh.updates)[0];
  assert.equal(post.caption, 'Wouldn\u2019t trust bro with a penny \ud83d\ude2d #reels #viral #crypto #fomo');
  assert.equal(post.hashtags, '#reels #viral #crypto #fomo');
  assert.equal(post.creator_id, 'mfc1aaaa-aaaaa1', 'the creator comes from user_posted, not the post link');
  assert.deepEqual(post.latest, { likes: 11, comments: 0, at: NOW });
  const known = { 'mfp4dddd-dddddd': { url: 'https://www.instagram.com/p/Deu_MVToZ8a/', platform: 'instagram', title: 'x', external_id: 'instagram:Deu_MVToZ8a', latest: { at: NOW - 30 * H, likes: 9 }, snapshots: { a: { at: NOW - 30 * H, likes: 9 } } } };
  const again = plan({ creators, posts: known, rows: [{ platform: 'instagram', row: igByLink('Deu_MVToZ8a', 12) }], now: NOW, rand });
  assert.match(again.updates['content_posts/mfp4dddd-dddddd/caption'], /^Wouldn/);
  const typed = { 'mfp4dddd-dddddd': { ...known['mfp4dddd-dddddd'], caption: 'Fixed by the team' } };
  const kept = plan({ creators, posts: typed, rows: [{ platform: 'instagram', row: igByLink('Deu_MVToZ8a', 12) }], now: NOW, rand });
  assert.equal(kept.updates['content_posts/mfp4dddd-dddddd/caption'], undefined, 'a caption already there is kept');
  assert.equal(summary(again.report['mfc1aaaa-aaaaa1'], 'instagram'), '1 post · likes and comments updated, Instagram hides views');
});

test('Instagram profile rows list the recent reels to collect, not photos or old posts', () => {
  const day = d => new Date(NOW - d * 86400000).toISOString();
  const rows = [
    { account: 'ava_chen', input: { url: 'https://www.instagram.com/ava_chen/' }, posts: [
      { url: 'https://www.instagram.com/p/Deu_MVToZ8a', content_type: 'Video', datetime: day(1) },
      { url: 'https://www.instagram.com/p/DevRonENi1P', content_type: 'Image', datetime: day(1) },
      { url: 'https://www.instagram.com/p/DenIXc_Irhr', content_type: 'Video', datetime: day(5) },
      { url: 'https://www.instagram.com/p/OldOldOld12', content_type: 'Video', datetime: day(90) }
    ] },
    { input: { url: 'https://www.instagram.com/someoneelse/' }, posts: [{ url: 'https://www.instagram.com/p/Zzzzzzzzz1', content_type: 'Video', datetime: day(1) }] },
    { input: { url: 'https://www.instagram.com/ava_chen/' }, error: 'Profile not found', error_code: 'dead_page' }
  ];
  const { picks, failed } = recentVideos({ creators, platform: 'instagram', rows, now: NOW });
  assert.deepEqual(picks, [
    { url: 'https://www.instagram.com/p/Deu_MVToZ8a/', creatorId: 'mfc1aaaa-aaaaa1' },
    { url: 'https://www.instagram.com/p/DenIXc_Irhr/', creatorId: 'mfc1aaaa-aaaaa1' }
  ]);
  assert.deepEqual(failed, ['mfc1aaaa-aaaaa1']);
  assert.equal(recentVideos({ creators, platform: 'instagram', rows: rows.slice(0, 1), now: NOW, max: 1 }).picks.length, 1);
});

test('ids match the database rules', () => {
  assert.match(newId(NOW, rand), /^[a-z0-9]{8,10}-[a-z0-9]{6}$/);
});

console.log(`\n${passed} passed`);
