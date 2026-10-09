// fomo campus ambassadors: the live workspace preview, school cycling, the experience
// unlock, and view-triggered motion. Built on the Campus Tasks landing (/tasks) with
// fomo as the only client, so the accent stays fomo blue. Nothing here is scroll-linked.
(function () {
  'use strict';
  window.ambassadorsReady = true;

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // [id, name, logo] for the schools the preview cycles through.
  var SCHOOLS = [
    ['university-of-oregon', 'University of Oregon', '/tasks/assets/schools/university-of-oregon.png'],
    ['university-of-michigan-ann-arbor', 'University of Michigan - Ann Arbor', '/tasks/assets/schools/university-of-michigan-ann-arbor.png'],
    ['the-university-of-texas-at-austin', 'The University of Texas at Austin', '/tasks/assets/schools/the-university-of-texas-at-austin.png'],
    ['university-of-southern-california', 'University of Southern California', '/tasks/assets/schools/university-of-southern-california.png'],
    ['university-of-washington', 'University of Washington', '/tasks/assets/schools/university-of-washington.png'],
    ['university-of-florida', 'University of Florida', '/tasks/assets/schools/university-of-florida.png']
  ].map(function (r) { return { id: r[0], name: r[1], logo: r[2] }; });

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

  function isOnScreen(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  function swapText(el, text) {
    if (el.textContent === text) return;
    if (reduced || !el.animate || !isOnScreen(el)) { el.textContent = text; return; }
    el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-35%)' }], { duration: 220, easing: 'ease-in' })
      .onfinish = function () {
        el.textContent = text;
        el.animate([{ opacity: 0, transform: 'translateY(35%)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      };
  }

  // ── Schools: names and logos change page-wide; the colour stays fomo blue. ──
  var current = null;
  var schoolIndex = -1;

  function setTile(tile, school) {
    var logo = tile.querySelector('[data-school-logo]');
    if (logo && school) logo.src = school.logo;
    tile.classList.toggle('has-logo', Boolean(logo && school));
  }

  function applySchool(school, animate) {
    if (school === current) return;
    current = school;
    $$('[data-school-name]').forEach(function (el) { swapText(el, school ? school.name : 'Your campus'); });
    $$('[data-mono]').forEach(function (el) {
      var tile = el.parentElement;
      if (!animate || reduced || !isOnScreen(tile)) { setTile(tile, school); return; }
      tile.classList.remove('is-flipping');
      void tile.offsetWidth;
      tile.classList.add('is-flipping');
      setTimeout(function () { setTile(tile, school); }, 340);
    });
  }

  function nextSchool() {
    schoolIndex = (schoolIndex + 1) % SCHOOLS.length;
    return SCHOOLS[schoolIndex];
  }

  // ── Header ────────────────────────────────────────────
  var head = $('[data-head]');
  function onScroll() { head.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── View-triggered reveals ────────────────────────────
  var revealTargets = $$('.reveal, .reveal-line, [data-arrival]');
  if ('IntersectionObserver' in window && !reduced) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealTargets.forEach(function (el) { revealer.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ── Hero workspace preview ────────────────────────────
  var stage = $('[data-stage]');
  var win = $('[data-window]');
  var tasks = {};
  $$('[data-mtask]').forEach(function (li) { tasks[li.getAttribute('data-mtask')] = li; });
  var LABELS = { available: 'Available', active: 'In progress', review: 'In review', approved: 'Approved' };
  var lanes = $$('[data-lane]');
  var laneIndex = -1;
  var unlockBox = $('.win-unlock');
  var badge = $('[data-progress-badge]');
  // The five starter tasks move through review in an overlapping order; all five land
  // approved by 10.2s, then the unlock opens and a lane lights up before the loop restarts.
  var TIMELINE = [
    [600, 'a', 'active'], [1300, 'a', 'review'], [2000, 'b', 'active'], [2700, 'a', 'approved'],
    [3300, 'c', 'active'], [3900, 'b', 'review'], [4600, 'b', 'approved'], [5200, 'd', 'active'],
    [5800, 'c', 'review'], [6400, 'c', 'approved'], [7000, 'e', 'active'], [7600, 'd', 'review'],
    [8300, 'd', 'approved'], [9000, 'e', 'review'], [10200, 'e', 'approved']
  ];
  var CYCLE = 13400;
  var timers = [];
  var heroVisible = true;
  var running = false;

  function bump(el) {
    if (reduced) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function paintCounts() {
    var counts = { active: 0, review: 0, approved: 0 };
    Object.keys(tasks).forEach(function (k) {
      var s = tasks[k].getAttribute('data-state');
      if (counts[s] !== undefined) counts[s]++;
    });
    $$('[data-count]').forEach(function (el) {
      var next = String(counts[el.getAttribute('data-count')]);
      if (el.textContent !== next) { el.textContent = next; bump(el); }
    });
    $('[data-progress-bar]').style.setProperty('--p', (counts.approved / 5 * 100) + '%');
    $('[data-progress-text]').textContent = counts.approved + ' of 5 approved';
    var open = counts.approved === 5;
    if (open !== unlockBox.classList.contains('is-open')) {
      unlockBox.classList.toggle('is-open', open);
      badge.querySelector('use').setAttribute('href', open ? '#i-unlock' : '#i-lock');
      badge.querySelector('span').textContent = open ? 'Unlocked' : 'Locked';
      if (open) bump(badge);
    }
    return counts;
  }

  function setState(id, state) {
    var li = tasks[id];
    if (!li) return;
    li.setAttribute('data-state', state);
    var pill = li.querySelector('.status');
    pill.textContent = LABELS[state];
    bump(pill);
    var counts = paintCounts();
    // Once all five are approved, the role check-in places this ambassador in a lane.
    if (counts.approved === 5 && lanes.length) {
      laneIndex = (laneIndex + 1) % lanes.length;
      var lane = lanes[laneIndex];
      lane.classList.add('is-in', 'is-joining');
      setTimeout(function () { lane.classList.remove('is-joining'); }, 800);
    }
  }

  function resetMock() {
    Object.keys(tasks).forEach(function (k) {
      tasks[k].setAttribute('data-state', 'available');
      tasks[k].querySelector('.status').textContent = LABELS.available;
    });
    lanes.forEach(function (m) { m.classList.remove('is-in', 'is-joining'); });
    paintCounts();
  }

  function clearCycle() {
    timers.forEach(clearTimeout);
    timers = [];
    running = false;
  }

  function runCycle() {
    clearCycle();
    running = true;
    resetMock();
    TIMELINE.forEach(function (step) {
      timers.push(setTimeout(function () { setState(step[1], step[2]); }, step[0]));
    });
    // A new school takes over at the start of each loop.
    timers.push(setTimeout(function () { applySchool(nextSchool(), true); runCycle(); }, CYCLE));
  }

  function syncCycle() {
    var shouldRun = heroVisible && !document.hidden && !reduced;
    if (shouldRun && !running) runCycle();
    if (!shouldRun && running) clearCycle();
  }

  // Warm the cache so a flipped logo never shows up blank.
  SCHOOLS.forEach(function (s) { new Image().src = s.logo; });

  // A calm, finished frame for reduced motion.
  function staticMock() {
    applySchool(SCHOOLS[0], false);
    setState('a', 'approved');
    setState('b', 'approved');
    setState('c', 'review');
    setState('d', 'active');
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (root.classList.contains('is-ready')) syncCycle();
    }, { threshold: 0.15 }).observe($('.hero'));
  }
  document.addEventListener('visibilitychange', function () { if (root.classList.contains('is-ready')) syncCycle(); });

  // Pointer depth on the preview, for fine pointers only.
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var frame = 0;
    stage.addEventListener('pointermove', function (e) {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        var r = stage.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        win.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        win.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
        stage.style.setProperty('--px', (x * -16).toFixed(1) + 'px');
        stage.style.setProperty('--py', (y * -12).toFixed(1) + 'px');
      });
    });
    stage.addEventListener('pointerleave', function () {
      ['--rx', '--ry'].forEach(function (p) { win.style.removeProperty(p); });
      ['--px', '--py'].forEach(function (p) { stage.style.removeProperty(p); });
    });
  }

  // ── Experience unlock ─────────────────────────────────
  var rewards = $('[data-unlock]');
  var unlockText = $('[data-unlock-text]');
  var segments = $$('.unlock-bar i', rewards);
  function unlock(instant) {
    function done() {
      rewards.classList.add('is-unlocked');
      unlockText.textContent = 'All five approved. Your lane is unlocked.';
    }
    if (instant) { segments.forEach(function (s) { s.classList.add('on'); }); done(); return; }
    segments.forEach(function (s, i) {
      setTimeout(function () {
        s.classList.add('on');
        unlockText.textContent = (i + 1) + ' of 5 tasks approved';
      }, 700 + i * 480);
    });
    setTimeout(done, 700 + segments.length * 480 + 250);
  }
  if ('IntersectionObserver' in window && !reduced) {
    var unlockWatch = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      unlockWatch.disconnect();
      unlock(false);
    }, { rootMargin: '0px 0px -8% 0px', threshold: 1 });
    unlockWatch.observe($('.unlock', rewards));
  } else {
    unlock(true);
  }

  // ── Start ─────────────────────────────────────────────
  paintCounts();

  var started = false;
  function start() {
    if (started) return;
    started = true;
    root.classList.add('is-ready');
    if (reduced) { staticMock(); return; }
    // Let the default workspace land first, then hand it to a school.
    setTimeout(function () {
      applySchool(nextSchool(), true);
      syncCycle();
    }, 1500);
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 900); })]).then(function () { requestAnimationFrame(start); });
})();
