import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blocks, categories, filterItems, lookupItems, searchArchive } from '../agencykit/catalog.js';
import { archiveProjects } from '../agencykit/archive-data.js';

const ids = items => items.map(item => item.id);
const archive = archiveProjects.flatMap(project => project.items.map(item => ({ ...item, project: project.name, projectId: project.id })));

test('catalog has unique IDs, recognized categories, and honest Blueprint status', () => {
  assert.equal(new Set(blocks.map(item => item.id)).size, blocks.length);
  assert.ok(blocks.length > 0);
  for (const block of blocks) {
    assert.ok(categories.includes(block.category), `${block.id} has a recognized category`);
    assert.equal(block.status, 'Blueprint', `${block.id} is not presented as a shipped integration`);
  }
});

test('category, search, and saved filters intersect rather than override each other', () => {
  const saved = ['member-portal', 'application-form', 'assistant'];
  assert.deepEqual(ids(filterItems(blocks, { query: 'onboarding', category: 'Portals', saved })), ['member-portal']);
  assert.deepEqual(filterItems(blocks, { query: 'onboarding', category: 'Tools', saved }), []);
});

test('search requires every case-insensitive query term regardless of whitespace', () => {
  assert.deepEqual(ids(filterItems(blocks, { query: '  CHAPTER   onboarding  ' })), ['member-portal', 'application-form']);
  assert.deepEqual(filterItems(blocks, { query: 'chapter chatbot' }), []);
  assert.deepEqual(filterItems(blocks, { query: '   ' }), blocks);
});

test('saved-only filtering includes exactly saved catalog items and supports an empty list', () => {
  assert.deepEqual(ids(filterItems(blocks, { saved: ['assistant', 'event-page', 'deleted-item'] })), ['event-page', 'assistant']);
  assert.deepEqual(filterItems(blocks, { saved: [] }), []);
  assert.deepEqual(filterItems(blocks), blocks);
});

test('assistant lookup connects common requests to documented catalog keywords', () => {
  for (const [message, expected] of [
    ['I need a chatbot', 'assistant'],
    ['Help me launch', 'campaign-page'],
    ['What should I use for dinner?', 'event-page'],
    ['Show me something for people', 'relationship-workspace'],
    ['I need a CRM for outreach', 'relationship-workspace'],
  ]) {
    assert.equal(lookupItems(blocks, message)[0]?.id, expected, message);
  }
  assert.ok(lookupItems(blocks, 'portal onboarding signup').length <= 3);
});

test('assistant lookup returns no invented match for unknown or empty requests', () => {
  assert.deepEqual(lookupItems(blocks, 'quantum astrophysics nebula'), []);
  assert.deepEqual(lookupItems(blocks, ''), []);
  assert.deepEqual(lookupItems(blocks, 'What can I do?'), []);
  for (const result of lookupItems(blocks, 'client portal referral assistant')) {
    assert.ok(blocks.includes(result), 'matches are the existing catalog entries');
  }
});

test('global archive search finds fomo work across projects while retaining portal constraints', () => {
  const result = searchArchive(archive, 'Please show me the fomo portals');
  assert.ok(result.every(item => item.category === 'Portals'));
  for (const id of ['fomo-clan', 'fomo-irrigation', 'milo-fomoportal']) assert.ok(ids(result).includes(id), `finds ${id}`);
  assert.ok(!ids(result).includes('milo-home'), 'unrelated portfolio is not a fomo portal');
  assert.deepEqual(searchArchive(archive, 'UnknownCompany portals'), []);
});

test('archive website and application aliases select their actual categories', () => {
  const pages = searchArchive(archive, 'I would like to see fomo websites');
  for (const id of ['fomo-campus', 'milo-fomo', 'milo-campuswars']) assert.ok(ids(pages).includes(id), `finds ${id}`);
  assert.ok(pages.every(item => item.category === 'Pages'));
  assert.ok(!ids(pages).includes('milo-photos'), 'unrelated photography does not match the fomo concept');
  assert.deepEqual(new Set(ids(searchArchive(archive, 'Find applications'))), new Set(ids(archive.filter(item => item.category === 'Forms'))));
});

test('archive onboarding and program synonyms retain useful constrained matches', () => {
  const onboarding = searchArchive(archive, 'Show me forms for onboarding');
  assert.ok(onboarding.some(item => item.id === 'fomo-onboard'));
  assert.ok(onboarding.every(item => item.category === 'Forms'));
  const greekPortals = searchArchive(archive, 'Greek Wars portals');
  assert.ok(greekPortals.some(item => item.id === 'fomo-clan'));
  assert.ok(greekPortals.every(item => item.category === 'Portals'));
  assert.ok(!ids(greekPortals).includes('milo-visit-console'), 'a general operations portal does not become a Greek Wars match');
  const referrals = searchArchive(archive, 'fomo referral');
  for (const id of ['fomo-refer', 'milo-fomo-refer']) assert.ok(ids(referrals).includes(id), `finds ${id}`);
  assert.ok(!ids(referrals).includes('fomo-dinners'), 'fomo branding alone does not satisfy the referral concept');
  assert.deepEqual(new Set(ids(searchArchive(archive, 'fomo invitations'))), new Set(ids(referrals)), 'invitation and referral aliases select the same matching work');
});

test('archive topic searches find fomo work without weakening category constraints', () => {
  const result = searchArchive(archive, 'Find me fomo dinner pages');
  assert.ok(result.some(item => item.id === 'fomo-dinners'));
  assert.ok(result.every(item => item.category === 'Pages'));
  assert.ok(!ids(result).includes('milo-fomo'), 'a general fomo page does not satisfy the dinner concept');
});

test('generic requests return the archive without mutation or a hidden result limit', () => {
  for (const query of ['', 'show me all', 'UI ideas', 'Browse our projects']) {
    const result = searchArchive(archive, query);
    assert.deepEqual(result, archive, query);
    assert.notEqual(result, archive, 'returns a new array');
    assert.ok(result.every((item, index) => item === archive[index]), 'retains original item objects');
  }
});

test('unrelated concepts cannot be hidden by a matching project or category', () => {
  for (const query of ['quantum astrophysics nebula', 'fomo portals zyzzyva', 'fomo dinner blockchain']) {
    assert.deepEqual(searchArchive(archive, query), [], query);
  }
  assert.deepEqual(searchArchive(archive, 'port'), [], 'does not match a fragment inside portal');
});

test('archive search uses tags, leaves status filtering to callers, and is stable for ties', () => {
  const items = [
    { id: 'first', name: 'First', category: 'Forms', project: 'Acme', tags: ['onboarding'], status: 'Original' },
    { id: 'second', name: 'Second', category: 'Forms', project: 'Acme', tags: ['onboarding'], status: 'Ready' },
    { id: 'third', name: 'Third', category: 'Forms', project: 'Elsewhere', tags: ['onboarding'], status: 'Ready' },
  ];
  assert.deepEqual(searchArchive(items, 'Acme onboarding forms'), items.slice(0, 2));
  assert.deepEqual(searchArchive(items.filter(item => item.status === 'Ready'), 'Acme onboarding forms'), [items[1]]);
});

test('every visible archive search suggestion finds work in the whole archive', () => {
  const markup = readFileSync(new URL('../agencykit/index.html', import.meta.url), 'utf8');
  const queries = [...markup.matchAll(/data-archive-query="([^"]+)"/g)].map(match => match[1]);
  assert.ok(queries.length > 0);
  for (const query of queries) {
    assert.ok(searchArchive(archive, query).length > 0, `suggestion must return work: ${query}`);
  }
});

test('archive entries have unique identities, recognized types, and safe source metadata', () => {
  assert.ok(archive.length > 0);
  assert.equal(new Set(archiveProjects.map(project => project.id)).size, archiveProjects.length);
  assert.equal(new Set(ids([...blocks, ...archive])).size, blocks.length + archive.length);
  assert.doesNotMatch(JSON.stringify(archiveProjects), /lucien/i, 'removed project is absent from the published catalog');
  for (const item of archive) {
    assert.ok(categories.includes(item.category), `${item.id} has a recognized category`);
    assert.ok(['finished', 'contextual', 'protected', 'prototype'].includes(item.status), `${item.id} has a recognized source status`);
    assert.ok(item.name && item.description && item.sourcePath, `${item.id} identifies its source`);
    assert.doesNotMatch(item.sourcePath, /^(?:[A-Z]:|\/)/i, 'source references do not expose absolute machine paths');
    if (!item.sourceUrl) continue;
    const url = new URL(item.sourceUrl);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.username + url.password, '', 'no credentials in source URLs');
    assert.equal(url.search, '', 'no participant tokens or personal query data');
    assert.equal(url.hash, '', 'no private route fragments');
    assert.ok(!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  }
});

test('explicit project filtering stays strict even when global keywords cross project boundaries', () => {
  const items = [
    { id: 'brand', project: 'fomo', projectId: 'fomo', category: 'Portals', name: 'Member hub', tags: [] },
    { id: 'partner', project: 'Partner studio', projectId: 'partner', category: 'Portals', name: 'Campus hub', tags: ['fomo'] },
    { id: 'unrelated', project: 'Partner studio', projectId: 'partner', category: 'Portals', name: 'Travel hub', tags: [] },
    { id: 'wrong-type', project: 'Partner studio', projectId: 'partner', category: 'Forms', name: 'Signup', tags: ['fomo'] },
  ];
  assert.deepEqual(new Set(ids(searchArchive(items, 'fomo portals'))), new Set(['brand', 'partner']));
  assert.deepEqual(ids(searchArchive(items.filter(item => item.projectId === 'fomo'), 'fomo portals')), ['brand']);
  assert.deepEqual(ids(searchArchive(items.filter(item => item.projectId === 'partner'), 'fomo portals')), ['partner']);
});

test('every explicit project filter intersects correctly with page types across the full archive', () => {
  for (const project of archiveProjects) {
    const scoped = archive.filter(item => item.projectId === project.id);
    for (const category of categories) {
      const expected = scoped.filter(item => item.category === category);
      const found = searchArchive(scoped, category);
      assert.deepEqual(new Set(ids(found)), new Set(ids(expected)), `${project.name} ${category}`);
    }
  }
});

test('published screenshots have matching image bytes and a public source reference', () => {
  for (const item of archive.filter(item => item.thumbnail)) {
    assert.match(item.thumbnail, /^\/agencykit\/thumbnails\/[a-z0-9-]+\.(?:png|jpg)$/);
    const bytes = readFileSync(new URL(`../agencykit/${item.thumbnail.slice('/agencykit/'.length)}`, import.meta.url));
    if (item.thumbnail.endsWith('.png')) assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${item.id} is a PNG`);
    else assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff', `${item.id} is a JPEG`);
    assert.equal(new URL(item.sourceUrl).protocol, 'https:');
    assert.ok(item.sourcePath && item.notes, `${item.id} identifies its source and context`);
    assert.ok(!/^(?:[A-Z]:|\/)/i.test(item.sourcePath), 'does not publish a local absolute source path');
  }
});
