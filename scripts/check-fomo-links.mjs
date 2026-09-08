// Static links, local assets, fragments, inline JS, and optional public URL checks.
// Does not submit forms or read database records.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const pages = ['campus/landing.html','campus/directory.html','campus/manual.html'];
const external = new Set();
let failures = 0, checked = 0, journeyChecks = 0;
function fail(message) { failures++; console.error(message); }
// Firebase's **/.* pattern excludes dotfiles, not all files inside dot-directories.
// Keep explicit recursive exclusions: a previous deployment included .git contents.
const hosting = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8')).hosting;
for (const required of ['**/.*', '**/.*/**', '.git/**', '.firebase/**', '**/*.log', 'scripts/**', 'AGENTS.md', 'portfolio/**', 'database.rules.json']) {
  if (!hosting.ignore?.includes(required)) fail(`firebase.json: missing protected-path exclusion ${required}`);
}
function assertJourney(condition, message) {
  journeyChecks++;
  if (!condition) fail(`campus/landing.html: ${message}`);
}
function attribute(attributes, name) {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2];
}
function plainText(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
}
function checkLandingJourneys(html) {
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  assertJourney(headings.length === 1 && plainText(headings[0][1]).toLowerCase() === 'campus.', 'use one campus. heading for the shared landing page');
  assertJourney([...html.matchAll(/<main\b/gi)].length === 1, 'use one main landmark');

  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(([, attrs, body]) => ({ attrs, body }));
  const chooser = anchors.filter(a => attribute(a.attrs, 'data-path') !== undefined);
  const primaryLinks = anchors.filter(a => attribute(a.attrs, 'data-path-cta') !== undefined);
  const sections = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)];
  const directory = fs.readFileSync(path.join(root, 'campus/directory.html'), 'utf8');
  assertJourney(chooser.length === 3, 'expose exactly three marked path choices');
  assertJourney(primaryLinks.length === 3, 'expose one primary destination per path');

  for (const [journey, destination] of Object.entries({
    compete: 'https://lucianopinilla.com/campus-wars.html',
    team: 'https://lucianopinilla.com/internship/',
    dinners: '/dinners'
  })) {
    const choices = chooser.filter(a => attribute(a.attrs, 'data-path') === journey);
    const section = sections.find(([, attrs]) => attribute(attrs, 'id') === journey);
    const primary = primaryLinks.filter(a => attribute(a.attrs, 'data-path-cta') === journey);
    assertJourney(choices.length === 1 && attribute(choices[0].attrs, 'href') === `#${journey}`, `${journey}: the path choice must be a native link to its section`);
    assertJourney(choices.length === 1 && Boolean(attribute(choices[0].attrs, 'aria-label') || plainText(choices[0].body)), `${journey}: the path choice needs an accessible name`);
    assertJourney(Boolean(section), `${journey}: include a matching section`);
    assertJourney(primary.length === 1 && attribute(primary[0].attrs, 'href') === destination, `${journey}: primary link must lead to ${destination}`);
    assertJourney(Boolean(section && primary.length === 1 && section[2].includes(primary[0].attrs)), `${journey}: put its primary link inside its section`);
    assertJourney(primary.length === 1 && Boolean(attribute(primary[0].attrs, 'aria-label') || plainText(primary[0].body)), `${journey}: the primary link needs an accessible name`);
    assertJourney(directory.includes(`href="${destination}"`), `${journey}: primary destination must remain represented in the directory`);
  }

  // This front door routes to applications; it does not collect or submit them.
  assertJourney(!/<form\b|<(?:button|input)\b[^>]*\btype\s*=\s*["']?submit\b/i.test(html), 'keep the landing page navigation-only, without form submission controls');
}
function localFile(url) {
  const base = path.join(root, decodeURIComponent(url.pathname));
  return [base,`${base}.html`,path.join(base,'index.html')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
}
for (const page of pages) {
  const html = fs.readFileSync(path.join(root,page),'utf8');
  if (page === 'campus/landing.html') checkLandingJourneys(html);
  const pageURL = new URL(page.replace(/\.html$/, ''), 'https://bijanizadian.com/');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if (ids.length !== new Set(ids).size) fail(`${page}: duplicate IDs`);
  for (const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    try { new vm.Script(script); } catch(e) { fail(`${page}: ${e.message}`); }
  }
  for (const [,attr,value] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    if (/^(data:|mailto:|tel:)/.test(value)) continue;
    const url = new URL(value,pageURL); checked++;
    if (url.origin !== pageURL.origin) { external.add(url.href); continue; }
    const file = localFile(url);
    if (!file) { fail(`${page}: missing ${value}`); continue; }
    if (attr === 'href' && url.hash && file.endsWith('.html')) {
      const target = fs.readFileSync(file,'utf8');
      if (!target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) fail(`${page}: missing anchor ${value}`);
    }
  }
}
for (const cssFile of ['assets/campus-landing.css','assets/campus-directory.css','assets/fomo-system.css','assets/manual-header.css']) {
  const css = fs.readFileSync(path.join(root,cssFile),'utf8');
  for (const [,asset] of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
    if (asset.startsWith('/') && !localFile(new URL(asset,'https://bijanizadian.com'))) fail(`${cssFile}: missing ${asset}`);
  }
}
for (const jsFile of ['assets/manual-header.js']) {
  try { new vm.Script(fs.readFileSync(path.join(root,jsFile),'utf8'), { filename: jsFile }); }
  catch(e) { fail(`${jsFile}: ${e.message}`); }
}
if (process.argv.includes('--live')) {
  await Promise.all([...external].map(async href => {
    try {
      const r = await fetch(href,{method:'GET',signal:AbortSignal.timeout(20000)});
      console.log(`${r.status} ${href}${r.redirected ? ` → ${r.url}` : ''}`);
      if (!r.ok) fail(`Public URL returned ${r.status}: ${href}`);
      await r.body?.cancel();
    } catch(e) { fail(`Cannot verify ${href}: ${e.message}`); }
  }));
}
console.log(`${checked} link/asset references checked; ${journeyChecks} landing journey checks; ${external.size} external destinations; ${failures} failures.`);
process.exitCode = failures ? 1 : 0;
