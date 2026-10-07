/**
 * Give the archive collage a small, inertial response to a desktop pointer.
 * Only the canvas is translated; its children keep their own layout and hover
 * transforms. Call sync() after changing the archive or opening an overlay.
 */
export function createArchiveMotion({ canvas, isActive }) {
  if (!canvas?.style || typeof isActive !== 'function') {
    throw new TypeError('Archive motion requires a canvas and an isActive function.');
  }

  const doc = canvas.ownerDocument || document;
  const view = doc.defaultView || window;
  const finePointer = view.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 721px)');
  const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const removeListeners = [];
  const settlingTime = 180;
  const precision = 0.035;
  let width = Math.max(1, view.innerWidth);
  let height = Math.max(1, view.innerHeight);
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let frame = null;
  let lastFrameTime = null;
  let pointerHeld = false;
  let keyboardInput = true;
  let destroyed = false;
  let lastPointerType = '';

  // Window focus is deliberately not required: a browser beside another app
  // still receives hover, and the collage should follow it without a click.
  function eligible() {
    return !destroyed && doc.visibilityState !== 'hidden'
      && finePointer.matches && !reducedMotion.matches && isActive();
  }

  function stop() {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    lastFrameTime = null;
  }

  function paint() {
    if (currentX === 0 && currentY === 0) {
      canvas.style.removeProperty('transform');
    } else {
      canvas.style.transform = `translate3d(${currentX.toFixed(3)}px, ${currentY.toFixed(3)}px, 0)`;
    }
  }

  function reset() {
    stop();
    currentX = currentY = targetX = targetY = 0;
    pointerHeld = false;
    paint();
  }

  function tick(timestamp) {
    frame = null;
    if (!eligible()) { reset(); return; }
    if (pointerHeld) { lastFrameTime = null; return; }

    const elapsed = lastFrameTime === null ? 1000 / 60 : Math.max(0, timestamp - lastFrameTime);
    lastFrameTime = timestamp;
    const damping = 1 - Math.exp(-elapsed / settlingTime);
    currentX += (targetX - currentX) * damping;
    currentY += (targetY - currentY) * damping;

    if (Math.abs(targetX - currentX) < precision && Math.abs(targetY - currentY) < precision) {
      currentX = targetX;
      currentY = targetY;
      lastFrameTime = null;
      paint();
      return;
    }
    paint();
    frame = view.requestAnimationFrame(tick);
  }

  function start() {
    if (frame === null && !pointerHeld) frame = view.requestAnimationFrame(tick);
  }

  function onPointerMove(event) {
    lastPointerType = event.pointerType || '';
    // A touchscreen must not move the collage, including hybrid laptops.
    if (event.pointerType !== 'mouse') return;
    keyboardInput = false;
    if (!eligible()) { reset(); return; }
    if (pointerHeld || event.buttons) return;

    const x = Math.max(-1, Math.min(1, event.clientX / width * 2 - 1));
    const y = Math.max(-1, Math.min(1, event.clientY / height * 2 - 1));
    targetX = -x * Math.min(64, width * 0.05);
    targetY = -y * Math.min(36, height * 0.045);
    start();
  }

  function onPointerDown(event) {
    lastPointerType = event.pointerType || '';
    keyboardInput = false;
    if (event.pointerType !== 'mouse') { reset(); return; }
    // Keep the hit target in exactly the same position until its click fires.
    pointerHeld = true;
    stop();
  }

  function onPointerUp(event) {
    pointerHeld = false;
    if (event.pointerType !== 'mouse') return;
    // The next frame follows click dispatch. Opening a detail dialog can cancel
    // it first, while a blank-canvas click continues toward the pointer target.
    if (eligible()) start(); else reset();
  }

  function isControl(target) {
    return Boolean(target?.closest?.('a, button, input, textarea, select, summary, [tabindex], [contenteditable="true"]'));
  }

  function isTextEntry(target) {
    return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
  }

  function onKeyDown(event) {
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    keyboardInput = true;
    // Typing a search leaves the collage where the pointer put it.
    if (event.key !== 'Tab' && isTextEntry(event.target)) return;
    if (!pointerHeld && (event.key === 'Tab' || isControl(event.target))) reset();
  }

  function onFocusIn(event) {
    // Pointer focus happens between down and up; resetting then would move a tile.
    if (pointerHeld) return;
    if (!eligible() || (keyboardInput && isControl(event.target))) reset();
  }

  function onResize() {
    width = Math.max(1, view.innerWidth);
    height = Math.max(1, view.innerHeight);
    reset();
  }

  function onVisibilityChange() { reset(); }

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    removeListeners.push(() => target.removeEventListener(type, handler, options));
  }

  listen(doc, 'pointermove', onPointerMove, { passive: true });
  listen(doc, 'pointerdown', onPointerDown, { passive: true, capture: true });
  listen(doc, 'pointerup', onPointerUp, { passive: true });
  listen(doc, 'pointercancel', reset, { passive: true });
  listen(doc, 'pointerleave', reset, { passive: true });
  listen(doc, 'keydown', onKeyDown);
  listen(doc, 'focusin', onFocusIn);
  listen(doc, 'visibilitychange', onVisibilityChange);
  // Recenter when the window loses focus; the next hover resumes motion.
  listen(view, 'blur', reset);
  listen(view, 'resize', onResize, { passive: true });
  // Clear motion before caching, while keeping listeners for a BFCache return.
  listen(view, 'pagehide', reset);
  listen(finePointer, 'change', reset);
  listen(reducedMotion, 'change', reset);

  reset();
  return {
    sync() { if (!destroyed) reset(); },
    /** Why the collage is or isn't following the pointer, for the motion check. */
    status() {
      const reasons = [];
      if (doc.visibilityState === 'hidden') reasons.push('page-hidden');
      if (view.innerWidth < 721) reasons.push('narrow');
      else if (!view.matchMedia('(hover: hover) and (pointer: fine)').matches) reasons.push('no-hover-pointer');
      if (reducedMotion.matches) reasons.push('reduced-motion');
      if (!isActive()) reasons.push('paused');
      if (pointerHeld) reasons.push('button-held');
      return { reasons, pointerType: lastPointerType, x: currentX, y: currentY };
    },
    destroy() {
      if (destroyed) return;
      reset();
      destroyed = true;
      removeListeners.splice(0).forEach((remove) => remove());
    },
  };
}
