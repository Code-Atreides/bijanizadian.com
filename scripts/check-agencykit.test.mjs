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

test('archive search intersects project and category concepts in natural requests', () => {
  const result = searchArchive(archive, 'Please show me the fomo portals');
  assert.ok(result.length >= 2);
  assert.ok(result.every(item => item.projectId === 'fomo' && item.category === 'Portals'));
  assert.ok(result.some(item => item.id === 'fomo-clan'));
  assert.deepEqual(searchArchive(archive, 'Lucien portals'), []);
});

test('archive website and application aliases select their actual categories', () => {
  const pages = searchArchive(archive, 'I would like to see Lucien websites');
  assert.equal(pages.length, archive.filter(item => item.projectId === 'lucien-smith' && item.category === 'Pages').length);
  assert.ok(pages.every(item => item.projectId === 'lucien-smith' && item.category === 'Pages'));
  assert.deepEqual(new Set(ids(searchArchive(archive, 'Find applications'))), new Set(ids(archive.filter(item => item.category === 'Forms'))));
});

test('archive onboarding and program synonyms retain useful constrained matches', () => {
  const onboarding = searchArchive(archive, 'Show me forms for onboarding');
  assert.ok(onboarding.some(item => item.id === 'fomo-onboard'));
  assert.ok(onboarding.every(item => item.category === 'Forms'));
  const greekPortals = searchArchive(archive, 'Greek Wars portals');
  assert.ok(greekPortals.some(item => item.id === 'fomo-clan'));
  assert.ok(greekPortals.every(item => item.category === 'Portals' && item.projectId === 'fomo'));
  assert.equal(searchArchive(archive, 'fomo referral')[0].id, 'fomo-refer');
});

test('artwork search matches Lucien work and ranks the painting archive first', () => {
  const result = searchArchive(archive, 'Find me Lucien artwork');
  assert.equal(result[0]?.id, 'lucien-gallery');
  assert.ok(result.every(item => item.projectId === 'lucien-smith'));
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
  for (const query of ['quantum astrophysics nebula', 'fomo portals zyzzyva', 'Lucien artwork blockchain']) {
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

test('every visible archive search suggestion finds work in the default scope', () => {
  const markup = readFileSync(new URL('../agencykit/index.html', import.meta.url), 'utf8');
  const queries = [...markup.matchAll(/data-archive-query="([^"]+)"/g)].map(match => match[1]);
  const finished = archive.filter(item => ['finished', 'contextual'].includes(item.status));
  assert.equal(queries.length, 5);
  for (const query of queries) {
    assert.ok(searchArchive(finished, query).length > 0, `suggestion must return work: ${query}`);
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
