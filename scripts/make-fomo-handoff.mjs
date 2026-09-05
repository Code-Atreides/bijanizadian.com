// Builds fomo-handoff/ — a standalone copy of the fomo pages that someone else
// can deploy to their own domain and their own Firebase project.
//
//   node scripts/make-fomo-handoff.mjs
//
// Everything tying the pages to this project is swapped for a PASTE_ placeholder.
// That prefix is deliberate: crewsheet already tests for it and falls back to a
// local preview mode, and the campus/dinners forms fail closed with a readable
// message, so the bundle degrades gracefully before it is configured rather than
// throwing at the user.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUT = 'fomo-handoff';
// One file per page — the name is the clean URL. campus/ and greekwars/ survive
// only as folders for the sub-pages and the shared art.
const PAGES = ['campus.html', 'campus/manual.html', 'greekwars.html',
               'greekwars/onboard.html', 'gameday.html', 'dinners.html', 'crewsheet.html'];
const FILES = ['fomo-favicon.svg', 'badge-app-store.svg', 'badge-google-play.svg',
               'campus/space-bg.webp', 'campus/astronaut.webp', 'campus/astronaut-mobile.webp'];
const DIRS = ['campus/fonts'];
// the rules the bundle ships are the live ones, minus the nodes no bundled page
// touches — generated rather than retyped, so the two cannot drift
const RULE_NODES = ['sheets', 'dinners', 'campus', 'greekwars', 'greekwars_onboard'];

const CONFIG = `firebaseConfig = {
    apiKey: 'PASTE_YOUR_API_KEY',
    authDomain: 'PASTE_YOUR_PROJECT.firebaseapp.com',
    databaseURL: 'PASTE_YOUR_DATABASE_URL',
    projectId: 'PASTE_YOUR_PROJECT'
  }`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const d of DIRS) await cp(d, join(OUT, d), { recursive: true });
for (const f of [...PAGES, ...FILES]) {
  await mkdir(dirname(join(OUT, f)), { recursive: true });
  await cp(f, join(OUT, f));
}

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
    // greekwars passes the config straight to initializeApp instead of naming it,
    // so the shape above misses it; catch any remaining literal by its apiKey.
    // The negative lookahead keeps it off the ones just replaced, which would
    // otherwise be rewritten a second time and double the count.
    src = src.replace(/\{\s*apiKey:\s*'(?!PASTE_)[^']*',[^}]*projectId:\s*'[^']*'\s*\}/g, () => {
      swapped.config++;
      return `{
      apiKey: 'PASTE_YOUR_API_KEY',
      authDomain: 'PASTE_YOUR_PROJECT.firebaseapp.com',
      databaseURL: 'PASTE_YOUR_DATABASE_URL',
      projectId: 'PASTE_YOUR_PROJECT'
    }`;
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

// Only the nodes the bundled pages actually use. Applications carry phone and
// email, so they stay write-once and unreadable from the web; the Greek Wars
// season data is public-read because it is public information.
const live = JSON.parse(await readFile('database.rules.json', 'utf8'));
const rules = {};
for (const node of RULE_NODES) {
  if (live.rules[node]) rules[node] = live.rules[node];
  else console.warn(`  ! no rule for ${node} in database.rules.json`);
}
await writeFile(join(OUT, 'database.rules.json'), JSON.stringify({ rules }, null, 2) + '\n');

// A way in. Without this the bundle opens as a bare directory listing, which is
// a poor first thing to hand someone. The wordmark is lifted from /campus so it
// cannot drift from the pages it introduces.
const heroMark = (await readFile('campus.html', 'utf8'))
  .match(/<svg viewBox="0 0 352 113"[\s\S]*?<\/svg>/)[0];
await writeFile(join(OUT, 'index.html'),
  (await readFile('scripts/handoff-index.html', 'utf8')).replace('{{HERO_MARK}}', heroMark));

await writeFile(join(OUT, 'README.md'), `# fomo / campus — site bundle

A standalone copy of the fomo campus pages. Everything tying them to the
original project has been replaced with a \`PASTE_\` placeholder, so the bundle
opens and reads correctly before it is configured — only the forms are inert.

## What is in here

One file per page. The file name is the URL, minus the \`.html\` — a static
host with clean URLs on (\`npx serve\` does this by default, as does Firebase
Hosting with \`cleanUrls: true\`) serves \`campus.html\` at \`/campus\`.

| File | Served at | |
|---|---|---|
| \`campus.html\` | \`/campus\` | The hub. Links to everything below, and the campus-team application. |
| \`campus/manual.html\` | \`/campus/manual\` | The internship manual — the five seats, what fomo is, the tasks that pay, the rules. |
| \`greekwars.html\` | \`/greekwars\` | Greek Wars: the prizes, onboarding, the live map and the PnL board. |
| \`greekwars/onboard.html\` | \`/greekwars/onboard\` | Chapter registration, twelve steps. |
| \`gameday.html\` | \`/gameday\` | Game Day: the second scoreboard, with a simulated demo game. |
| \`dinners.html\` | \`/dinners\` | The Dinner Series: funded tables of 12, and the host application. |
| \`crewsheet.html\` | \`/crewsheet\` | The crew sheet — who is doing what for a dinner. |

Shared assets live at the root: the favicon and the two store badges. The
\`campus/\` folder holds what the pages load by path — the Aeonik woff2 files
under \`campus/fonts/\`, and the hero art.

Every page links to the others as \`/campus\`, \`/dinners\` and so on, so they
need to be served rather than opened from disk.

## Running it

Any static server will do:

    npx serve .

## Deploying it

1. Make a Firebase project, then put its id in \`.firebaserc\` and its config
   into every \`PASTE_YOUR_...\` in the HTML (search for \`PASTE_\`).
2. Replace \`https://YOUR-DOMAIN.com\` in the canonical and og:url tags.
3. \`firebase deploy\`

## The data

| Node | Read | Written by |
|---|---|---|
| \`campus/\` | no | the campus-team application |
| \`dinners/\` | no | the dinner host application |
| \`greekwars_onboard/\` | no | chapter registration |
| \`greekwars/\` | **yes** | nobody on the web — the map and board read it |
| \`sheets/\` | yes | anyone with the crew-sheet code, by design |

The three application nodes hold names, emails and phone numbers, so they are
write-once and cannot be read back from a browser. \`greekwars/\` is the reverse:
public season data, readable by the map and the board, writable only from the
Admin SDK. Write \`greekwars/schools/<id>\` and \`greekwars/chapters/<id>\` and
both light up; until then they show a clearly labelled sample season.
`);

console.log(`built ${OUT}/ — ${PAGES.length} pages, ${swapped.config} firebase configs, ${swapped.domain} domain refs replaced`);
console.log('zip it with:  powershell Compress-Archive -Path fomo-handoff\* -DestinationPath fomo-handoff.zip -Force');
