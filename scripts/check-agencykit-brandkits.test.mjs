import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { brandKits, brandKitFor, draftBrand } from '../agencykit/brand-kits.js';
import { createProjectStore } from '../agencykit/project-store.js';
import { draftTheme, buildSkeletonDocument } from '../agencykit/skeletons.js';

const root = new URL('../', import.meta.url);
const kit = brandKitFor('fomo');
const tokens = JSON.parse(readFileSync(new URL('assets/campus-brandkit/downloads/tokens.json', root), 'utf8'));
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) }; };
const catalog = [{ id: 'source-a', name: 'Source A', category: 'Forms' }];

test('the fomo campus kit matches its published tokens', () => {
  assert.ok(kit, 'fomo has a brand kit');
  const core = tokens.color.core;
  for (const [name, token] of [['fomo blue', 'blue'], ['Electric blue', 'electric'], ['Light blue', 'highlight'], ['fomo ink', 'ink'], ['Pale lavender', 'pale'], ['White', 'white'], ['Action blue', 'action']]) {
    assert.equal(kit.colors.find(color => color.name === name)?.value, core[token].$value, `${name} matches tokens.json`);
  }
  const light = tokens.color.web.light;
  assert.equal(kit.draft.brand.bg, light.canvas.$value.toLowerCase());
  assert.equal(kit.draft.brand.ink, light.text.$value.toLowerCase());
  assert.equal(kit.draft.brand.accent, core.action.$value.toLowerCase());
  assert.equal(kit.type.family, tokens.typography.family.$value[0]);
});

test('every kit asset and logo is a real file in the published site', () => {
  for (const each of brandKits) {
    const paths = [each.logo.src, each.tokensUrl, ...each.assets.flatMap(group => group.files || []).flatMap(item => [item.svg, item.png, item.css, item.json]).filter(Boolean)];
    assert.ok(paths.length > 15);
    for (const path of paths) assert.ok(existsSync(new URL(path.replace(/^\//, ''), root)), `${path} exists`);
    for (const group of each.assets.filter(group => group.link)) assert.ok(existsSync(new URL(group.link.split('#')[0].replace(/^\//, '') + '.html', root)), `${group.link} exists`);
  }
});

test('the draft logo is a small embedded PNG the draft renderer accepts', () => {
  const logo = kit.draft.brand.logo;
  assert.match(logo, /^data:image\/png;base64,/);
  assert.ok(logo.length < 180000, 'fits the project logo limit');
  assert.ok(Buffer.from(logo.split(',')[1], 'base64').subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
  const theme = draftTheme({ project: { name: 'Campus', brand: kit.draft.brand } });
  assert.equal(theme.logo, logo);
  assert.equal(theme.font, 'Aeonik,Arial,sans-serif');
  assert.equal(theme.accent, '#4057df');
});

test('kit drafts never force fomo into capitals', () => {
  const source = { id: 'source-a', name: 'Source A', category: 'Forms' };
  const draft = { copy: { eyebrow: 'fomo', title: 'your campus' } };
  const kitPage = buildSkeletonDocument(source, { project: { name: 'fomo', brand: kit.draft.brand }, draft });
  assert.match(kitPage, /\.sk,\.sk \*\{text-transform:none!important\}/);
  assert.match(kitPage, />fomo</, 'the eyebrow keeps its lowercase text');
  const plainPage = buildSkeletonDocument(source, { project: { name: 'Acme', brand: { keepCase: 'true' } }, draft });
  assert.doesNotMatch(plainPage, /text-transform:none!important/, 'only a real kit flag changes case handling');
});

test('drafts follow the client kit unless the project customizes', () => {
  const custom = { accent: '#112233', bg: '#ffffff', ink: '#000000', font: 'editorial', logo: '' };
  assert.deepEqual(draftBrand({ client: 'fomo', brandMode: 'kit', brand: custom }), kit.draft.brand);
  assert.deepEqual(draftBrand({ client: 'FOMO ', brand: custom }), kit.draft.brand, 'client names match like the store compares them');
  assert.deepEqual(draftBrand({ client: 'fomo', brandMode: 'custom', brand: custom }), custom);
  assert.deepEqual(draftBrand({ client: 'Acme', brandMode: 'kit', brand: custom }), custom, 'clients without a kit keep the project brand');
  assert.equal(brandKitFor(''), null);
  assert.equal(brandKitFor('constructor'), null);
});

test('projects default to the kit, keep earlier custom brands, and reset brand review on a source change', () => {
  const storage = memory();
  const store = createProjectStore({ storage, catalog });
  const fresh = store.createProject({ name: 'Fresh' });
  assert.equal(fresh.brandMode, 'kit');
  const edited = store.createProject({ name: 'Edited', brand: { accent: '#aa33cc' } });
  assert.equal(edited.brandMode, 'custom', 'an edited brand from before kits stays custom');
  const draft = store.createDraft(fresh.id, 'source-a');
  store.updateDraft(fresh.id, draft.id, { review: { brand: true, mobile: true, content: true } });
  const switched = store.updateProject(fresh.id, { brandMode: 'custom' });
  assert.equal(switched.brandMode, 'custom');
  assert.deepEqual([switched.drafts[0].review.brand, switched.drafts[0].review.mobile, switched.drafts[0].review.content], [false, false, true]);
  assert.equal(store.updateProject(fresh.id, { brandMode: 'unknown' }).brandMode, 'custom', 'invalid modes are ignored');
  const reloaded = createProjectStore({ storage, catalog });
  assert.equal(reloaded.getProject(fresh.id).brandMode, 'custom', 'the choice persists');
});
