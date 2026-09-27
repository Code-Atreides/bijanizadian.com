// Builds greekwars-onboarding/ — the new-chapter portal (the claim page and the
// clan page) for someone to host on their own domain.
//
//   node scripts/make-onboarding-handoff.mjs
//
// Unlike make-fomo-handoff.mjs, the pages keep writing to this project's
// Realtime Database, so every clan, head and member stays in one place: the clan
// pages' live counts, the team's Irrigation workspace and the recipient's admin
// all read the same data. The bundle deliberately has no route to another
// Firebase project, since that would disconnect it from Irrigation.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUT = 'greekwars-onboarding';
const PAGES = ['greekwars/claim.html', 'greekwars/clan.html'];
const FILES = ['fomo-favicon.svg', 'badge-app-store.svg', 'badge-google-play.svg', 'campus/space-bg.webp'];
const DIRS = ['campus/fonts'];
const DATABASE_URL = 'https://bijanizadian-84e48-default-rtdb.firebaseio.com';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const d of DIRS) await cp(d, join(OUT, d), { recursive: true });
for (const f of [...PAGES, ...FILES]) {
  await mkdir(dirname(join(OUT, f)), { recursive: true });
  await cp(f, join(OUT, f));
}

// Only the share tags name a domain; links are built from the serving site.
// The header and footer point at pages that aren't in the bundle, so they go
// to the originals rather than to nothing.
function must(src, from, to, file) {
  if (!src.includes(from)) throw new Error(`${file}: expected ${from}`);
  return src.split(from).join(to);
}
for (const page of PAGES) {
  const path = join(OUT, page);
  let src = await readFile(path, 'utf8');
  src = src.replace(/(<meta property="og:(?:url|image)" content=")https:\/\/bijanizadian\.com/g, '$1https://YOUR-DOMAIN.com');
  src = src.replace(/(<link rel="canonical" href=")https:\/\/bijanizadian\.com/g, '$1https://YOUR-DOMAIN.com');
  src = must(src, 'href="/campus"', 'href="https://bijanizadian.com/campus"', page);
  src = must(src, '<a href="/greekwars">', '<a href="https://bijanizadian.com/greekwars">', page);
  const stray = src.split('\n').filter((line) => /bijanizadian\.com/.test(line) &&
    !/href="https:\/\/bijanizadian\.com\/(campus|greekwars)"/.test(line));
  if (stray.length) throw new Error(`${page}: unexpected domain reference\n${stray.join('\n')}`);
  if (!src.includes(DATABASE_URL)) throw new Error(`${page}: database config not found`);
  await writeFile(path, src);
}

await writeFile(join(OUT, 'admin-read-example.mjs'), `// Reads every Greek Wars clan, its head and its members, shaped for an admin
// page. Run it on a server, never in a browser: heads' and members' details are
// private, so reading them needs Admin SDK credentials with read access to the
// database. The "Firebase Realtime Database Viewer" role is enough.
//
//   npm install firebase-admin
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node admin-read-example.mjs
//
// In an API route, import { readClans } and return its result as JSON.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { pathToFileURL } from 'node:url';

const DATABASE_URL = '${DATABASE_URL}';

// Pure shaping, so it can be tested without a database.
export function toAdminRows(clans = {}, heads = {}, members = {}) {
  const date = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);
  return Object.entries(clans).map(([id, clan]) => {
    const head = heads[id];
    const list = Object.values(members[id] || {}).map((m) => ({
      fomoUsername: m.fomo_username,
      name: [m.first_name, m.last_name].filter(Boolean).join(' '),
      email: m.email || '',
      signedUpAt: date(m.submitted_at),
    }));
    return {
      id,
      chapter: clan.chapter,
      school: clan.school,
      actives: clan.actives ?? null,
      goal: clan.actives ? Math.ceil(clan.actives * 0.8) : null,
      signedUp: list.length,
      createdAt: date(clan.created_at),
      // claim clans were made by the fomo team for chapters that registered
      // before these pages; their heads attach a referral link later
      madeByTeam: clan.kind === 'claim',
      headFomoUsername: clan.lead || null,
      head: head
        ? {
            name: [head.first_name, head.last_name].filter(Boolean).join(' '),
            email: head.email,
            phone: head.phone || '',
            fomoUsername: head.fomo_username,
            referralLink: head.referral_link,
            signedUpAt: date(head.submitted_at),
          }
        : null,
      members: list,
    };
  });
}

// one named app, made on first use, so it can sit beside the server's own
let app;
export async function readClans() {
  app ??= initializeApp({ credential: applicationDefault(), databaseURL: DATABASE_URL }, 'greekwars-admin');
  const db = getDatabase(app);
  const [clans, heads, members] = await Promise.all(
    ['greekwars_clans', 'greekwars_clan_leads', 'greekwars_clan_members'].map(
      async (path) => (await db.ref(path).get()).val() || {},
    ),
  );
  return toAdminRows(clans, heads, members);
}

// run directly: print every clan as JSON (the database connection stays open, so exit)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await readClans(), null, 2));
  process.exit(0);
}
`);

await writeFile(join(OUT, 'README.md'), `# Greek Wars onboarding portal

Two static pages that take a fraternity or sorority chapter from "never heard of
it" to a clan with a sign-up link, then sign its members up.

| File | Who uses it | What happens |
|---|---|---|
| \`greekwars/claim.html\` | The chapter head | Three steps: their chapter (name, school, chapter, email, phone, active members), their fomo referral link, then the clan link to send the chapter. |
| \`greekwars/clan.html\` | Everyone in the chapter | The clan's page, with a live count toward 80% of the roster. People already on fomo add their name, fomo username and email. New people download fomo through the head's referral link, so the head's code is filled in at sign-up, then come back and add themselves. |

Nothing on these pages puts anyone in a clan. They collect who should be in it;
the fomo team adds people to clans in the fomo app.

Everything else in the folder is what the pages load: the Aeonik fonts
(\`campus/fonts/\`), the favicon, the two store badges and the share image.

## Deploying

The pages are plain HTML with no build step. Upload the folder as it is, so the
paths inside stay the same (the pages load \`/campus/fonts/...\`,
\`/fomo-favicon.svg\` and \`/badge-*.svg\` from the site root).

Each clan's link looks like \`https://YOUR-DOMAIN.com/greekwars/clan/sigma-chi-7kyx\`.
Your host has to send every \`/greekwars/clan/<anything>\` to \`greekwars/clan.html\`:

- **Vercel** (\`vercel.json\`): \`{ "rewrites": [{ "source": "/greekwars/clan/:id", "destination": "/greekwars/clan.html" }] }\`
- **Netlify** (\`_redirects\`): \`/greekwars/clan/*  /greekwars/clan.html  200\`
- **Firebase Hosting** (\`firebase.json\`): \`"rewrites": [{ "source": "/greekwars/clan/**", "destination": "/greekwars/clan.html" }]\`
- **nginx**: \`location ^~ /greekwars/clan/ { try_files /greekwars/clan.html =404; }\`
- **Express**: \`app.get('/greekwars/clan/:id', (req, res) => res.sendFile(path.resolve('greekwars/clan.html')))\`

**No rewrites?** In \`greekwars/claim.html\`, change
\`var CLAN_PATH = '/greekwars/clan/';\` to \`var CLAN_PATH = '/greekwars/clan.html?c=';\`.
The clan page also opens as \`clan.html?c=<id>\`.

**Different folder?** The clan page works from any address ending in
\`/clan/<id>\`, or with \`?c=<id>\`. Set \`CLAN_PATH\` to match, and keep
\`claim.html\` and \`clan.html\` side by side (the clan page links to \`claim\` for
anyone who lands on a missing clan).

Then replace \`https://YOUR-DOMAIN.com\` in the share tags at the top of both
pages (\`og:url\`, \`og:image\`, \`canonical\`). The header logo and footer link to
bijanizadian.com's campus pages; point them at yours if you like.

To check it on a phone: open \`/greekwars/claim\`, make a clan, open the link it
gives you, and sign up. Those are real records in the live database, so use an
obviously fake chapter and tell the fomo team so they can remove it.

## Where the data goes

The pages write to the fomo team's Firebase Realtime Database
(\`${DATABASE_URL}\`). It is the same database bijanizadian.com uses, so clans
made on your site show up in the team's tools straight away. The database rules
decide what a browser may do; the pages don't need a login.

**Keep the \`firebaseConfig\` in both pages exactly as it is.** The fomo team's
Irrigation workspace and your admin both read this database, so pointing the
pages anywhere else would disconnect them.

| Node | Holds | Browser can read |
|---|---|---|
| \`greekwars_clans/<id>\` | chapter, school, head's fomo username (\`lead\`), active members (\`actives\`), \`created_at\`; \`kind: "claim"\` on clans the team made | one clan at a time, by id |
| \`greekwars_clan_leads/<id>\` | the head: first and last name, email, phone, fomo username, referral link, school, chapter, actives, \`submitted_at\` | no |
| \`greekwars_clan_members/<id>/<username>\` | a member: fomo username, first and last name, email, \`submitted_at\` | no |
| \`greekwars_clan_roster/<id>/<username>\` | \`true\` for each sign-up, which is the live count | one clan at a time |

Timestamps are milliseconds since 1970 (Firebase server time). Usernames in keys
are lowercased, with dots stored as commas.

## Connecting your admin page

Heads' and members' details can't be read from a browser, so your admin has to
read them on the server:

1. Make a service account in your own Google Cloud project, or use the one your
   server already runs as.
2. Send its email address (\`something@your-project.iam.gserviceaccount.com\`) to
   the fomo team. They'll grant it the **Firebase Realtime Database Viewer**
   role on the \`bijanizadian-84e48\` project. That role can read and can't
   write, and no key file has to change hands.
3. Use \`admin-read-example.mjs\`. \`readClans()\` returns one row per clan with its
   head and members, ready to render or return as JSON. Show your admin behind
   its own login, since the rows include emails and phone numbers.
`);

console.log(`built ${OUT}/ — ${PAGES.length} pages, admin example and README`);
// Windows' own tar writes forward-slash paths; Compress-Archive writes
// backslashes, which some Mac and Linux unzip tools turn into flat file names.
console.log(`zip it with:  tar -a -c -f ${OUT}.zip ${OUT}   (in PowerShell: Windows' tar.exe, not Compress-Archive)`);
