// Builds greekwars-onboarding/ — the chapter onboarding portal (the claim page
// and the clan page) for fomo's official campus site, whose developer connects
// it to their own Supabase.
//
//   node scripts/make-onboarding-handoff.mjs
//
// The pages go out working: they still save to this project's Firebase, so the
// bundle runs as delivered. Each page reaches its database only through a DATA
// block at the top of its script; PORTING.md says what to put in its place.
// The two documents live in scripts/onboarding-handoff/ so they can be read and
// reviewed as themselves.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUT = 'greekwars-onboarding';
const PAGES = ['greekwars/claim.html', 'greekwars/clan.html'];
const FILES = ['fomo-favicon.svg', 'badge-app-store.svg', 'badge-google-play.svg', 'campus/space-bg.webp'];
const DIRS = ['campus/fonts'];
const DOCS = 'scripts/onboarding-handoff';
// the rules the pages rely on today: the spec for whatever replaces them
const RULE_NODES = ['greekwars_clans', 'greekwars_clan_leads', 'greekwars_clan_members',
                    'greekwars_clan_roster', 'greekwars_clan_heads'];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const d of DIRS) await cp(d, join(OUT, d), { recursive: true });
for (const f of [...PAGES, ...FILES]) {
  await mkdir(dirname(join(OUT, f)), { recursive: true });
  await cp(f, join(OUT, f));
}
for (const doc of ['README.md', 'PORTING.md']) await cp(join(DOCS, doc), join(OUT, doc));

// Only the share tags name a domain; links are built from the serving site,
// and the header and footer point at /campus and /greekwars on the same site.
for (const page of PAGES) {
  const path = join(OUT, page);
  let src = await readFile(path, 'utf8');
  src = src.replace(/(<meta property="og:(?:url|image)" content=")https:\/\/bijanizadian\.com/g, '$1https://YOUR-DOMAIN.com');
  src = src.replace(/(<link rel="canonical" href=")https:\/\/bijanizadian\.com/g, '$1https://YOUR-DOMAIN.com');
  const stray = src.split('\n').filter((line) => /bijanizadian\.com/.test(line));
  if (stray.length) throw new Error(`${page}: unexpected domain reference\n${stray.join('\n')}`);
  if (!src.includes('THE DATA LAYER') || !src.includes('var DATA = (function () {'))
    throw new Error(`${page}: DATA block not found`);
  await writeFile(path, src);
}

const live = JSON.parse(await readFile('database.rules.json', 'utf8'));
const rules = {};
for (const node of RULE_NODES) {
  if (!live.rules[node]) throw new Error(`no rule for ${node} in database.rules.json`);
  rules[node] = live.rules[node];
}
await mkdir(join(OUT, 'reference'), { recursive: true });
await writeFile(join(OUT, 'reference', 'current-firebase-rules.json'), JSON.stringify({ rules }, null, 2) + '\n');

console.log(`built ${OUT}/ — ${PAGES.length} pages, README, PORTING and the current rules for reference`);
// Windows' own tar writes forward-slash paths; Compress-Archive writes
// backslashes, which some Mac and Linux unzip tools turn into flat file names.
console.log(`zip it with:  tar -a -c -f ${OUT}.zip ${OUT}   (in PowerShell: Windows' tar.exe, not Compress-Archive)`);
