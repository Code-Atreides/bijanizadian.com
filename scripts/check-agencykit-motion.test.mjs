import test from 'node:test';
import assert from 'node:assert/strict';
import { createArchiveMotion } from '../agencykit/archive-motion.js';

class Events {
  listeners = new Map();
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const fn of [...(this.listeners.get(type) || [])]) fn(event); }
  count() { return [...this.listeners.values()].reduce((total, set) => total + set.size, 0); }
}

function scene(t) {
  const doc = new Events();
  const view = new Events();
  const fine = Object.assign(new Events(), { matches: true });
  const reduced = Object.assign(new Events(), { matches: false });
  const frames = new Map();
  let id = 0, time = 0, active = true;
  Object.assign(view, {
    innerWidth: 1440, innerHeight: 900,
    matchMedia: query => query.includes('prefers-reduced-motion') ? reduced : fine,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: frame => frames.delete(frame),
  });
  Object.assign(doc, { defaultView: view, visibilityState: 'visible', activeElement: null });
  const style = { removeProperty(name) { delete this[name]; } };
  const canvas = { ownerDocument: doc, style };
  const motion = createArchiveMotion({ canvas, isActive: () => active });
  t.after(() => motion.destroy());
  const tick = () => {
    time += 1000 / 60;
    const pending = [...frames.values()];
    frames.clear();
    for (const fn of pending) fn(time);
  };
  const move = (props = {}) => doc.emit('pointermove', { pointerType: 'mouse', clientX: 1440, clientY: 900, buttons: 0, ...props });
  return { doc, view, fine, reduced, frames, canvas, motion, move, tick, setActive(value) { active = value; } };
}

test('mouse motion uses one bounded RAF loop and stops when it reaches the target', t => {
  const s = scene(t);
  for (let i = 0; i < 20; i++) s.move();
  assert.equal(s.frames.size, 1, 'pointer events share one animation loop');
  s.tick();
  assert.match(s.canvas.style.transform, /^translate3d\(-/);
  for (let i = 0; i < 200 && s.frames.size; i++) s.tick();
  assert.equal(s.frames.size, 0, 'settled canvas does not run forever');
  assert.equal(s.canvas.style.transform, 'translate3d(-64.000px, -36.000px, 0)');
});

test('touch, coarse pointers, and reduced-motion preference never keep a motion loop', t => {
  const s = scene(t);
  s.move({ pointerType: 'touch' });
  s.move({ pointerType: 'pen' });
  assert.equal(s.frames.size, 0);
  for (const [media, disabled, enabled] of [[s.fine, false, true], [s.reduced, true, false]]) {
    s.move(); s.tick();
    assert.ok(s.canvas.style.transform);
    media.matches = disabled; media.emit('change');
    assert.equal(s.canvas.style.transform, undefined);
    assert.equal(s.frames.size, 0);
    s.move();
    assert.equal(s.frames.size, 0);
    media.matches = enabled; media.emit('change');
  }
});

test('pointer down freezes the click target through focus, then overlay activation cancels resumed motion', t => {
  const s = scene(t);
  const tile = { closest() { return this; } };
  s.move(); s.tick();
  const frozen = s.canvas.style.transform;
  s.doc.emit('pointerdown', { pointerType: 'mouse', target: tile });
  s.doc.emit('focusin', { target: tile });
  s.move({ buttons: 1, clientX: 0 });
  assert.equal(s.canvas.style.transform, frozen);
  assert.equal(s.frames.size, 0);
  s.doc.emit('pointerup', { pointerType: 'mouse', target: tile });
  assert.equal(s.canvas.style.transform, frozen, 'pointerup does not synchronously shift the click target');
  assert.equal(s.frames.size, 1);
  s.setActive(false); // The ensuing click opens a modal in the caller.
  s.motion.sync();
  assert.equal(s.canvas.style.transform, undefined);
  assert.equal(s.frames.size, 0);
});

test('keyboard navigation clears motion without changing the focused element', t => {
  const s = scene(t);
  const tile = { closest() { return this; } };
  s.doc.activeElement = tile;
  s.move(); s.tick();
  s.doc.emit('keydown', { key: 'Tab', target: tile });
  s.doc.emit('focusin', { target: tile });
  assert.equal(s.canvas.style.transform, undefined);
  assert.equal(s.frames.size, 0);
  assert.equal(s.doc.activeElement, tile);
});

test('route eligibility is rechecked during frames and sync is safe to repeat', t => {
  const s = scene(t);
  s.move(); s.tick();
  s.setActive(false);
  s.tick();
  assert.equal(s.canvas.style.transform, undefined);
  assert.equal(s.frames.size, 0);
  s.move();
  assert.equal(s.frames.size, 0);
  const listeners = s.doc.count() + s.view.count() + s.fine.count() + s.reduced.count();
  for (let i = 0; i < 10; i++) s.motion.sync();
  assert.equal(s.doc.count() + s.view.count() + s.fine.count() + s.reduced.count(), listeners);
  s.setActive(true); s.move();
  assert.equal(s.frames.size, 1, 'eligible route can restart on a new pointer move');
});

test('typing in a field keeps the collage still; Tab still clears motion', t => {
  const s = scene(t);
  const field = { closest: selector => selector.includes('input') ? field : null };
  s.move(); s.tick();
  const placed = s.canvas.style.transform;
  for (const key of ['f', 'o', 'Backspace', 'Enter']) s.doc.emit('keydown', { key, target: field });
  assert.equal(s.canvas.style.transform, placed, 'typing a search does not snap the collage');
  s.move({ clientX: 0, clientY: 0 });
  assert.equal(s.frames.size, 1, 'hover still drives the collage while the field has focus');
  s.doc.emit('keydown', { key: 'Tab', target: field });
  assert.equal(s.canvas.style.transform, undefined);
  assert.equal(s.frames.size, 0);
});

test('blur recenters without blocking the next hover; hidden pages suspend motion; destroy removes every listener and scheduled frame', t => {
  const s = scene(t);
  s.move(); s.tick();
  s.view.emit('blur');
  assert.equal(s.frames.size, 0);
  assert.equal(s.canvas.style.transform, undefined);
  s.move(); // Hovering an unfocused window beside another app.
  assert.equal(s.frames.size, 1, 'motion resumes without the window regaining focus');
  s.tick();
  s.doc.visibilityState = 'hidden'; s.doc.emit('visibilitychange');
  s.move();
  assert.equal(s.frames.size, 0);
  s.doc.visibilityState = 'visible'; s.doc.emit('visibilitychange'); s.move();
  assert.equal(s.frames.size, 1);
  s.motion.destroy(); s.motion.destroy();
  assert.equal(s.doc.count() + s.view.count() + s.fine.count() + s.reduced.count(), 0);
  assert.equal(s.frames.size, 0);
  assert.equal(s.canvas.style.transform, undefined);
  s.move(); s.motion.sync();
  assert.equal(s.frames.size, 0);
});
