// Builds fomo-handoff/ — a standalone copy of the four fomo pages that someone
// else can deploy to their own domain and their own Firebase project.
//
//   node scripts/make-fomo-handoff.mjs
//
// Everything tying the pages to this project is swapped for a PASTE_ placeholder.
// That prefix is deliberate: crewsheet already tests for it and falls back to a
// local preview mode, and the campus/dinners forms fail closed with a readable
// message, so the bundle degrades gracefully before it is configured rather than
// throwing at the user.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'fomo-handoff';
const PAGES = ['campus', 'gameday', 'dinners', 'crewsheet'];
const FILES = ['fomo-favicon.svg'];

const CONFIG = `firebaseConfig = {
    apiKey: 'PASTE_YOUR_API_KEY',
    authDomain: 'PASTE_YOUR_PROJECT.firebaseapp.com',
    databaseURL: 'PASTE_YOUR_DATABASE_URL',
    projectId: 'PASTE_YOUR_PROJECT'
  }`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const p of PAGES) await cp(p, join(OUT, p), { recursive: true });
for (const f of FILES) await cp(f, join(OUT, f));

// rewrite every html file in the bundle
let swapped = { config: 0, domain: 0 };
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) { await walk(path); continue; }
    if (!e.name.endsWith('.html')) continue;
    let src = await readFile(path, 'utf8');
    src = src.replace(/(var|const)\s+firebaseConfig\s*=\s*\{[^}]*\}/g, (_, kw) => {
      swapped.config++;
      return `${kw} ${CONFIG}`;
    });
    src = src.replace(/https:\/\/bijanizadian\.com/g, () => {
      swapped.domain++;
      return 'https://YOUR-DOMAIN.com';
    });
    await writeFile(path, src);
  }
}
await walk(OUT);

await writeFile(join(OUT, '.firebaserc'), JSON.stringify({
  projects: { default: 'PASTE_YOUR_PROJECT' }
}, null, 2) + '\n');

await writeFile(join(OUT, 'firebase.json'), JSON.stringify({
  database: { rules: 'database.rules.json' },
  hosting: {
    public: '.',
    ignore: ['firebase.json', '**/.*', '**/node_modules/**', 'README.md', 'database.rules.json'],
    cleanUrls: true,
    trailingSlash: false
  }
}, null, 2) + '\n');

// Only the nodes these four pages actually write to. Applications carry phone
// and email, so they are write-once and never readable from the web.
const APPLICATION = (fields) => ({
  '.read': false,
  $key: {
    '.write': '!data.exists()',
    '.validate':
      `newData.hasChildren([${fields.map((f) => `'${f}'`).join(', ')}])` +
      " && newData.child('email').val().length < 200" +
      " && newData.child('why').val().length < 4000"
  }
});
await writeFile(join(OUT, 'database.rules.json'), JSON.stringify({
  rules: {
    // a crew sheet is shared by everyone who knows its code, by design
    sheets: { $code: { '.read': true, '.write': true } },
    dinners: APPLICATION(['first_name', 'last_name', 'email', 'phone', 'instagram', 'school', 'city', 'host_type', 'guests', 'why', 'submitted_at']),
    campus: APPLICATION(['first_name', 'last_name', 'email', 'phone', 'instagram', 'school', 'role', 'why', 'submitted_at'])
  }
}, null, 2) + '\n');

console.log(`built ${OUT}/ — ${swapped.config} firebase configs, ${swapped.domain} domain refs replaced`);
