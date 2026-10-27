// Refreshes the /data campus tracker (fomocampustracker/). Reads the eyes chapter
// feed (milomessina.com) and the Greek Wars admin (fomocampus.com/admin), keeps
// only per-chapter counts and dates (no names, emails, phones or handles), adds
// school colors, and writes the AES-GCM-encrypted payload the page unlocks.
//
// Run (the passwords are read from the environment and never stored):
//   EYES_USER=… EYES_PASS=… ADMIN_USER=… ADMIN_PASS=… DATA_PASSWORD=… \
//     node scripts/refresh-campus-tracker.mjs
// --from <dir>  reuse responses saved by --save instead of fetching
// --save <dir>  keep the raw responses (they hold member contact details: keep
//               them outside the repo, e.g. in a temp folder)
// Then commit fomocampustracker/data.enc.json and deploy Hosting.
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const OUT = path.join(root, 'fomocampustracker/data.enc.json');
const ITERATIONS = 250000; // must match fomocampustracker/tracker.js
const TZ = 'America/New_York';
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const from = arg('--from'), save = arg('--save');
const env = name => { const v = process.env[name]; if (!v) { console.error(`Missing ${name}; see the header of this script.`); process.exit(1); } return v; };
const password = env('DATA_PASSWORD');

// ---------- fetch ----------
const basic = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
async function get(url, auth, cookie) {
  const r = await fetch(url, { headers: { Authorization: auth, ...(cookie ? { Cookie: cookie } : {}) }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`${url} returned ${r.status}`);
  return r;
}
const adminAuth = () => basic(env('ADMIN_USER'), env('ADMIN_PASS'));
async function fetchSources() {
  const eyes = basic(env('EYES_USER'), env('EYES_PASS'));
  const gate = await get('https://milomessina.com/eyes', eyes);
  const cookie = gate.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  await gate.body?.cancel();
  const feed = await (await get('https://milomessina.com/api/campuswars/', eyes, cookie)).text();
  const admin = await (await get('https://fomocampus.com/admin/', adminAuth())).text();
  return { feed, admin };
}
const raw = from
  ? { feed: fs.readFileSync(path.join(from, 'feed.json'), 'utf8'), admin: fs.readFileSync(path.join(from, 'admin.html'), 'utf8') }
  : await fetchSources();
if (save) { fs.mkdirSync(path.join(save, 'chapters'), { recursive: true }); fs.writeFileSync(path.join(save, 'feed.json'), raw.feed); fs.writeFileSync(path.join(save, 'admin.html'), raw.admin); }
async function chapterPage(id) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error(`Unexpected chapter id ${id}`);
  const file = name => path.join(name, 'chapters', `${id}.html`);
  if (from) return fs.readFileSync(file(from), 'utf8');
  const html = await (await get(`https://fomocampus.com/admin/chapter/${id}/`, adminAuth())).text();
  if (save) fs.writeFileSync(file(save), html);
  return html;
}
const feed = JSON.parse(raw.feed);
if (!Array.isArray(feed.chapters) || !feed.updatedAt) throw new Error('The eyes feed changed shape');

// ---------- admin page ----------
const text = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
function table(heading) {
  const at = raw.admin.search(new RegExp(`<h1[^>]*>\\s*${heading}\\s*</h1>`));
  if (at < 0) throw new Error(`The admin page has no "${heading}" table`);
  const start = raw.admin.indexOf('<table', at);
  return [...raw.admin.slice(start, raw.admin.indexOf('</table>', start)).matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g)].filter(m => /<td\b/.test(m[2]));
}
const div = (html, cls) => text((html.match(new RegExp(`<div class="${cls}"[^>]*>([\\s\\S]*?)</div>`)) || [])[1] || '');
const cell = (html, label) => text((html.match(new RegExp(`<td[^>]*data-l="${label}"[^>]*>([\\s\\S]*?)</td>`)) || [])[1] || '');
const attr = (html, name) => (html.match(new RegExp(`${name}="([^"]*)"`)) || [])[1];
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
function isoDay(label) {
  const m = label.match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);
  if (!m) throw new Error(`Unexpected admin date "${label}"`);
  return `${m[3]}-${String(MONTHS[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}
const nyDay = ms => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const key = (name, school) => `${name}|${school}`.toLowerCase();

const registrations = table('Registrations').map(([, a, b]) => {
  const [school, type] = div(b, 'sc').split(' · ');
  const actives = Number((cell(b, 'Progress').match(/(\d+) actives/) || [])[1]);
  return { id: attr(a, 'data-row'), name: div(b, 'ch'), school, type, members: Number(attr(a, 'data-members')), created: Number(attr(a, 'data-created')), actives };
});
const memberDays = new Map();
for (const [, , b] of table('Members')) {
  const chapter = b.match(/data-l="Chapter"[^>]*>([\s\S]*?)<\/td>/)?.[1] || '';
  const k = key(div(chapter, 'ch'), div(chapter, 'sc'));
  const day = isoDay(text(b.match(/<td[^>]*\bend\b[^>]*>([\s\S]*?)<\/td>\s*$/)?.[1] || ''));
  const days = memberDays.get(k) || new Map();
  days.set(day, (days.get(day) || 0) + 1); memberDays.set(k, days);
}
// The Members table names a chapter only by name and school, so registrations
// that share both (re-registrations) read their own chapter page's "Day by day"
// table instead. Its days have no year; they run forward from the registration.
const sameName = new Map();
for (const r of registrations) sameName.set(key(r.name, r.school), [...(sameName.get(key(r.name, r.school)) || []), r]);
for (const r of registrations) {
  if (sameName.get(key(r.name, r.school)).length === 1) { r.days = memberDays.get(key(r.name, r.school)) || new Map(); continue; }
  r.days = new Map();
  if (!r.members) continue;
  const page = await chapterPage(r.id), at = page.indexOf('Day by day'), start = page.indexOf('<tbody', at);
  if (at < 0 || start < 0) throw new Error(`Chapter page ${r.id} has no "Day by day" table`);
  const year = Number(nyDay(r.created).slice(0, 4)), month = Number(nyDay(r.created).slice(5, 7));
  for (const [, row] of page.slice(start, page.indexOf('</tbody>', start)).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const [day, joined] = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => text(m[1]));
    const [mon, date] = day.split(' ');
    r.days.set(isoDay(`${mon} ${date}, ${MONTHS[mon] < month ? year + 1 : year}`), Number(joined));
  }
}

// ---------- school colors ----------
// Primary/secondary from Greek Village's school identities, then the reviewed
// Wikipedia infobox colors in campus-tracker-school-colors.json for the rest.
const norm = s => String(s).toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]+/g, ' ').trim();
const identities = JSON.parse(fs.readFileSync(path.join(root, '2dgreekvillage/shared/village-school-identities.js'), 'utf8').match(/schoolIdentities=(\[[\s\S]*?\]);/)[1]);
const colorOf = new Map();
for (const i of identities) for (const n of [i.name, ...(i.aliases || [])]) colorOf.set(norm(n), [i.primary, i.secondary]);
for (const [n, c] of Object.entries(JSON.parse(fs.readFileSync(path.join(root, 'scripts/campus-tracker-school-colors.json'), 'utf8')).schools)) if (!colorOf.has(norm(n))) colorOf.set(norm(n), c);

// ---------- merge ----------
// Greek letters become Latin initials, as Greek Village shows them.
const LATIN = 'ABGDEZHTIKLMNXOPR STUPCPO';
const latin = s => s.toUpperCase().replace(/[Ͱ-Ͽ]/g, c => (LATIN[c.charCodeAt(0) - 0x391] || '').trim());
// Pair each eyes chapter with its admin registration: by name and school, then
// within re-registrations by equal member count, then by nearest registration day.
const unclaimed = new Map([...sameName].map(([k, rs]) => [k, [...rs]]));
const pairs = new Map();
const claim = (c, pick) => { const rs = unclaimed.get(key(c.name, c.school)) || [], r = rs.length ? pick(rs) : null; if (r) { pairs.set(c, r); rs.splice(rs.indexOf(r), 1); } };
const dayGap = (c, r) => Math.abs(Date.parse(c.registered) - Date.parse(nyDay(r.created)));
const nearest = (c, rs) => rs.length ? rs.reduce((a, b) => dayGap(c, a) <= dayGap(c, b) ? a : b) : null;
for (const c of feed.chapters) claim(c, rs => rs.length === 1 ? rs[0] : nearest(c, rs.filter(r => r.members === c.joined)));
for (const c of feed.chapters) if (!pairs.has(c)) claim(c, rs => nearest(c, rs));
const noColor = new Set(), notInAdmin = [], mismatched = [];
const chapters = feed.chapters.map(c => {
  const r = pairs.get(c), days = r ? r.days : new Map();
  if (!r) notInAdmin.push(`${c.name} · ${c.school}`);
  else if (r.members !== c.joined) mismatched.push(`${c.name} · ${c.school}: eyes ${c.joined}, admin ${r.members}`);
  const colors = colorOf.get(norm(c.school)); if (!colors) noColor.add(c.school);
  return {
    id: c.id, name: c.name, letters: latin(c.letters), school: c.school, short: c.shortSchool, type: c.type,
    joined: c.joined, active: c.active, registered: r ? nyDay(r.created) : c.registered,
    days: [...days].sort(([a], [b]) => a.localeCompare(b)),
    colors: colors || null
  };
});
const adminOnly = [...unclaimed.values()].flat();

// Daily totals in New York days: members from the eyes time-of-day history (the
// feed's own total), chapters from each registration's creation time.
const daily = new Map();
const bump = (d, field, n) => { const row = daily.get(d) || { d, m: 0, c: 0 }; row[field] += n; daily.set(d, row); };
for (const { date, counts } of feed.memberHistory?.timeOfDay?.days || []) bump(date, 'm', counts.reduce((a, b) => a + b, 0));
for (const c of chapters) bump(c.registered, 'c', 1);
const days = [...daily.values()].sort((a, b) => a.d.localeCompare(b.d));

const payload = { v: 1, updatedAt: new Date().toISOString(), feedAt: feed.updatedAt, tz: TZ, days, chapters };

// ---------- report ----------
const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
console.log(`${chapters.length} chapters · ${new Set(chapters.map(c => c.school)).size} schools · ${sum(chapters, c => c.joined)} members (daily history ${sum(days, d => d.m)}, admin member rows ${sum(chapters, c => sum(c.days, d => d[1]))})`);
if (notInAdmin.length) console.log(`In eyes but not the admin (${notInAdmin.length}): ${notInAdmin.join('; ')}`);
if (adminOnly.length) console.log(`In the admin but not eyes (${adminOnly.length}): ${adminOnly.map(r => `${r.name} · ${r.school}`).join('; ')}`);
if (mismatched.length) console.log(`Member counts differ (${mismatched.length}): ${mismatched.slice(0, 12).join('; ')}`);
if (noColor.size) console.log(`No school colors yet (fomo colors only): ${[...noColor].join('; ')}`);

// ---------- encrypt ----------
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(payload))));
const b64 = bytes => Buffer.from(bytes).toString('base64');
fs.writeFileSync(OUT, JSON.stringify({ v: 1, salt: b64(salt), iv: b64(iv), data: b64(data) }) + '\n');
console.log(`Wrote ${path.relative(root, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB).`);
