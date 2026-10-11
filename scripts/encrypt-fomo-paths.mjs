// Encrypts the fomo window's path list into desktop.html, so the list is only
// readable after the unlock password is typed on the page.
// Run: node scripts/encrypt-fomo-paths.mjs <password>
// Edit GROUPS here, rerun, and commit desktop.html. The password is not stored.
import fs from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// [heading, [[path, page name], ...]]; the first two groups fill the left column.
const GROUPS = [
  ['campus', [['/campus', 'Campus hub'], ['/campus/landing', 'Campus landing page'], ['/campus/directory', 'Page directory'], ['/campus/manual', 'Campus manual'], ['/campus/visit', 'Visit a friend'], ['/campus/ambassadors', 'Campus ambassadors'], ['/campus/ambassadors/apply', 'Apply to be an ambassador'], ['/campus/brandkit', 'Campus brand kit'], ['/taskbook', 'Campus task book']]],
  ['team & earlier designs', [['/irrigation', 'Irrigation, the team workspace'], ['/campus-wars', 'Campus Wars'], ['/campus-connected', 'Earlier campus design']]],
  ['greek wars', [['/greekwars', 'Greek Wars'], ['/greekwars/onboard', 'Chapter onboarding'], ['/greekwars/claim', 'Onboard your chapter'], ['/greekwars/refer', 'Refer a fraternity'], ['/greekwars/invite', 'Greek Wars invite'], ['/claimlinks', 'Claim links']]],
  ['dinners & events', [['/dinners', 'Dinner Series'], ['/dinners/apply', 'Apply to host a dinner'], ['/crewsheet', 'Dinner crew sheet'], ['/gameday', 'Game Day'], ['/hqvisitform', 'Come by fomo HQ']]],
  ['houses', [['/LAhousepitch', 'Los Angeles house'], ['/NYhousepitch', 'New York loft']]]
];
const ITERATIONS = 250000; // must match the unlock code in desktop.html

const password = process.argv[2];
if (!password) { console.error('Usage: node scripts/encrypt-fomo-paths.mjs <password>'); process.exit(1); }

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(GROUPS))));
const b64 = bytes => Buffer.from(bytes).toString('base64');

const file = fileURLToPath(new URL('../desktop.html', import.meta.url));
const html = fs.readFileSync(file, 'utf8');
const line = /var FOMO_LOCKED = \{[^\n]*\};/;
if (!line.test(html)) { console.error('desktop.html: FOMO_LOCKED line not found'); process.exit(1); }
fs.writeFileSync(file, html.replace(line, `var FOMO_LOCKED = { salt: '${b64(salt)}', iv: '${b64(iv)}', data: '${b64(data)}' };`));
console.log(`Encrypted ${GROUPS.reduce((n, g) => n + g[1].length, 0)} paths into desktop.html.`);
