import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { archiveProjects } from '../agencykit/archive-data.js';
import { buildSkeletonDocument, skeletonFamily, calculateInvoice } from '../agencykit/skeletons.js';

const archive = archiveProjects.flatMap(project => project.items);
const families = ['campaign-page', 'event-page', 'application-form', 'referral-flow', 'member-portal', 'relationship-workspace', 'assistant', 'directory', 'handbook', 'crew-planner', 'gallery', 'invoice'];
const escaped = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const scripts = html => [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);

test('every original produces an independent local-only HTML starter with a supported family', () => {
  assert.ok(archive.length > 0);
  for (const item of archive) {
    assert.ok(families.includes(item.skeletonKey), `${item.id} has an explicit supported family`);
    assert.ok(Array.isArray(item.skeletonSections) && item.skeletonSections.length > 0, `${item.id} records its structure`);
    assert.equal(skeletonFamily(item), item.skeletonKey);
    const html = buildSkeletonDocument(item);
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<meta name="viewport"/);
    assert.ok(html.includes(`data-skeleton-family="${item.skeletonKey}"`));
    assert.match(html, /<style>[\s\S]+<\/style>/);
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /form-action 'none'/);
    assert.match(html, /(?:local|demo)/i);
    const inline = scripts(html);
    assert.equal(inline.length, 1, `${item.id} includes its own interaction code`);
    assert.doesNotThrow(() => new Script(inline[0]), `${item.id} has valid standalone JavaScript`);
    assert.doesNotMatch(inline[0], /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/, 'no backend request API');
    assert.doesNotMatch(html, /@import\b|url\(\s*["']?(?:https?:|\/\/)/i, 'no remote styles or fonts');
    for (const [, attr, target] of html.matchAll(/\s(href|src|action|poster)\s*=\s*"([^"]*)"/gi)) {
      assert.ok(attr === 'href' && target.startsWith('#'), `${item.id} must not load or submit ${attr}=${target}`);
    }
    for (const [form] of html.matchAll(/<form\b[^>]*>/gi)) {
      assert.match(form, /method="dialog"/, `${item.id} form stays local if script fails`);
      assert.doesNotMatch(form, /\saction=/i);
    }
  }
});

test('downloaded starters omit source URLs, credentials, branding, and private identifiers', () => {
  const item = {
    id: 'private-record-984392', name: 'SecretClientBrand984392', category: 'Portals',
    skeletonKey: 'member-portal', skeletonSections: ['Welcome', 'Progress'],
    description: 'ConfidentialDescription984392', notes: 'PrivateNotes984392',
    project: 'PrivateProject984392', sourceUrl: 'https://private.example/portal?head=secret984392',
    sourcePath: 'C:/Users/private984392/client/internal.html',
    thumbnail: 'https://private.example/secret984392.png', token: 'private-token-984392',
  };
  const html = buildSkeletonDocument(item);
  for (const value of [item.id, item.name, item.description, item.notes, item.project, item.sourceUrl, item.sourcePath, item.thumbnail, item.token]) {
    assert.ok(!html.includes(value), `source-only metadata is not copied: ${value}`);
  }
  assert.match(html, /Your project/);
  assert.match(html, /No real membership was created/);
});

test('hostile metadata is escaped or ignored instead of becoming executable markup', () => {
  const hostile = '<img src="https://attacker.example/x" onerror="alert(1)">';
  const breakout = '</script><script data-injected>alert(2)</script>';
  const html = buildSkeletonDocument({
    id: hostile, name: breakout, category: hostile, skeletonKey: hostile,
    skeletonSections: [hostile, breakout, '" & \' < >'],
  });
  assert.ok(html.includes(escaped(hostile)));
  assert.ok(html.includes(escaped(breakout)));
  assert.ok(html.includes(escaped('" & \' < >')));
  assert.ok(!html.includes(hostile));
  assert.ok(!html.includes(breakout));
  assert.equal(scripts(html).length, 1);
  assert.doesNotMatch(html, /<script\b[^>]*data-injected/);
  assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i);
  assert.equal(skeletonFamily({ skeletonKey: hostile, category: 'Forms' }), 'application-form');
});

test('family layouts expose their intended semantic controls rather than one generic mockup', () => {
  const structures = {
    'campaign-page': [/<h1>/, /href="#path-1"/, /id="path-3"/],
    'event-page': [/<table\b/, /id="steps"/, /data-demo-action=/],
    'application-form': [/<form\b/, /<fieldset\b/, /<legend\b/, /type="email"/, /data-step-submit/],
    'referral-flow': [/data-referral-form/, /data-referral-link/, /data-copy/],
    'member-portal': [/data-member-form/, /data-member-count/, /data-member-progress/],
    'relationship-workspace': [/<table\b/, /data-record-search/, /data-note-form/, /fictional/],
    assistant: [/role="dialog"/, /role="log"/, /data-chat-form/, /AI is not connected/],
    directory: [/data-directory-search/, /data-directory-item/, /data-directory-open/],
    handbook: [/aria-label="Handbook chapters"/, /<article\b/, /<details>/, /<summary>/],
    'crew-planner': [/type="checkbox"/, /data-task-count/, /data-task-form/],
    gallery: [/data-gallery-filter/, /<figure\b/, /<figcaption>/, /data-gallery-count/],
    invoice: [/data-invoice-quantity/, /data-invoice-rate/, /data-invoice-total/, /Nothing is stored, sent, or paid/],
  };
  for (const family of families) {
    const html = buildSkeletonDocument({ skeletonKey: family });
    for (const structure of structures[family]) assert.match(html, structure, family);
  }
});

test('invoice arithmetic handles zero and fractional line items without floating-point cent errors', () => {
  assert.deepEqual(calculateInvoice([]), { lineTotalsCents: [], totalCents: 0 });
  const lines = [{ quantity: 0, unitPrice: 500 }, { quantity: '0.5', unitPrice: '0.01' }, { quantity: '3', unitPrice: '0.10' }, { quantity: '.25', unitPrice: '19.99' }];
  const original = structuredClone(lines);
  assert.deepEqual(calculateInvoice(lines), { lineTotalsCents: [0, 1, 30, 500], totalCents: 531 });
  assert.deepEqual(lines, original);
  assert.deepEqual(calculateInvoice([{ quantity: 1, unitPrice: 125 }, { quantity: 2, unitPrice: 75 }, { quantity: 0.5, unitPrice: 60 }]), { lineTotalsCents: [12500, 15000, 3000], totalCents: 30500 });
});

test('invoice arithmetic rejects invalid, negative, over-precise and excessive inputs', () => {
  for (const quantity of [-1, NaN, Infinity, '', '1.001', '10001', null, true]) {
    assert.throws(() => calculateInvoice([{ quantity, unitPrice: 10 }]), RangeError);
  }
  for (const unitPrice of [-1, '1.005', 1000001]) assert.throws(() => calculateInvoice([{ quantity: 1, unitPrice }]), RangeError);
});

test('standalone invoice includes its calculator and updates only local outputs', () => {
  const output = { textContent: '' }, status = { textContent: '' }, line = { textContent: '' };
  const quantity = { value: '0.5' }, rate = { value: '19.99' };
  const row = { querySelector: selector => ({ '[data-invoice-quantity]': quantity, '[data-invoice-rate]': rate, '[data-invoice-line]': line })[selector] };
  const events = new Map();
  const root = {
    querySelector: selector => ({ '[data-invoice-total]': output, '[data-invoice-status]': status })[selector] || null,
    querySelectorAll: selector => selector === '[data-invoice-row]' ? [row] : [],
    addEventListener: (type, handler) => events.set(type, handler),
  };
  new Script(scripts(buildSkeletonDocument({ skeletonKey: 'invoice' }))[0]).runInNewContext({ document: { querySelector: () => root }, AbortController, setTimeout, clearTimeout });
  assert.equal(output.textContent, '$10.00');
  assert.equal(line.textContent, '$10.00');
  rate.value = '';
  events.get('input')({ target: { matches: () => true } });
  assert.equal(output.textContent, '—');
  assert.match(status.textContent, /Enter non-negative/);
});

test('gallery filters change visible placeholder pieces locally', async () => {
  const groups = ['All', 'Spaces', 'Objects', 'Studies'];
  const buttons = groups.map(group => ({ dataset: { galleryFilter: group }, attributes: {}, hasAttribute: name => name === 'data-gallery-filter', setAttribute(name, value) { this.attributes[name] = value; } }));
  const pieces = ['Spaces', 'Objects', 'Studies', 'Spaces'].map(group => ({ dataset: { galleryCategory: group }, hidden: false }));
  const count = { textContent: '' }, events = new Map();
  const root = {
    querySelector: selector => selector === '[data-gallery-count]' ? count : null,
    querySelectorAll: selector => selector === '[data-gallery-item]' ? pieces : selector === '[data-gallery-filter]' ? buttons : [],
    addEventListener: (type, handler) => events.set(type, handler), contains: () => true,
  };
  new Script(scripts(buildSkeletonDocument({ skeletonKey: 'gallery' }))[0]).runInNewContext({ document: { querySelector: () => root }, AbortController, setTimeout, clearTimeout });
  await events.get('click')({ target: { closest: () => buttons[1] } });
  assert.equal(pieces.filter(piece => !piece.hidden).length, 2);
  assert.equal(count.textContent, '2 sample pieces');
  assert.equal(buttons[1].attributes['aria-pressed'], 'true');
  await events.get('click')({ target: { closest: () => buttons[0] } });
  assert.ok(pieces.every(piece => !piece.hidden));
});

test('every starter has unique IDs and working internal link destinations', () => {
  for (const item of archive) {
    const html = buildSkeletonDocument(item).split('<script>')[0];
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${item.id} contains duplicate IDs`);
    for (const [, target] of html.matchAll(/\bhref="#([^"]+)"/g)) {
      assert.ok(ids.includes(target), `${item.id} has a missing #${target} destination`);
    }
  }
});

test('the exported referral demo handles submit locally and encodes the sample path', () => {
  const listeners = new Map();
  const form = {
    elements: { username: { value: 'sample-user' } },
    reportValidity: () => true,
    addEventListener: (type, handler) => listeners.set(type, handler),
  };
  const link = { value: '' };
  const result = { hidden: true };
  const controls = new Map([['[data-referral-form]', form], ['[data-referral-link]', link], ['[data-referral-result]', result]]);
  const root = { querySelector: selector => controls.get(selector) || null, querySelectorAll: () => [], addEventListener() {} };
  const script = scripts(buildSkeletonDocument({ skeletonKey: 'referral-flow' }))[0];
  new Script(script).runInNewContext({ document: { querySelector: () => root }, AbortController, setTimeout, clearTimeout });
  let prevented = false;
  listeners.get('submit')({ currentTarget: form, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(link.value, '/join?ref=sample-user');
  assert.equal(result.hidden, false);
  form.elements.username.value = 'a&head=private';
  listeners.get('submit')({ currentTarget: form, preventDefault() {} });
  assert.equal(link.value, '/join?ref=a%26head%3Dprivate');
});
