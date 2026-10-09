// Campus Tasks landing page: school theming, the live workspace preview,
// the task showcase, and view-triggered motion. Nothing here is scroll-linked.
(function () {
  'use strict';
  window.campusTasksReady = true;

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BRAND_ACCENT = '#4A36FF';

  // [id, name, primary colour, logo] for the schools the preview cycles through, from the
  // product's public school list (/api/task-schools).
  var SCHOOL_ROWS = [
    ["university-of-oregon","University of Oregon","#00934B","/tasks/assets/schools/university-of-oregon.png"],
    ["university-of-michigan-ann-arbor","University of Michigan - Ann Arbor","#00274C","/tasks/assets/schools/university-of-michigan-ann-arbor.png"],
    ["the-university-of-texas-at-austin","The University of Texas at Austin","#BF5700","/tasks/assets/schools/the-university-of-texas-at-austin.png"],
    ["university-of-southern-california","University of Southern California","#9D2235","/tasks/assets/schools/university-of-southern-california.png"],
    ["university-of-washington","University of Washington","#33006F","/tasks/assets/schools/university-of-washington.png"],
    ["university-of-florida","University of Florida","#0021A5","/tasks/assets/schools/university-of-florida.png"]
  ];
  var FEATURED = ['university-of-oregon', 'university-of-michigan-ann-arbor', 'the-university-of-texas-at-austin', 'university-of-southern-california', 'university-of-washington', 'university-of-florida'];
  var MONO_OVERRIDES = { 'the-university-of-texas-at-austin': 'UT' };
  var STOP_WORDS = { of: 1, the: 1, at: 1, and: 1, in: 1, for: 1 };

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

  // Same contrast rule the workspace uses: darken the school colour until it reads as text.
  function readable(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return BRAND_ACCENT;
    var c = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); });
    function lum(rgb) {
      return rgb.map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
        .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
    }
    for (var guard = 0; lum(c) > 0.14 && guard < 60; guard++) for (var i = 0; i < 3; i++) c[i] = Math.round(c[i] * 0.9);
    return '#' + c.map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }

  function monogram(id, name) {
    if (MONO_OVERRIDES[id]) return MONO_OVERRIDES[id];
    var base = name.split(' - ')[0].replace(/['’]/g, '').replace(/&/g, ' ').replace(/[^A-Za-z\s]/g, ' ');
    var out = base.split(/\s+/).filter(function (w) { return w && !STOP_WORDS[w.toLowerCase()]; })
      .map(function (w) { return /^[A-Z]{2,5}$/.test(w) ? w : w[0].toUpperCase(); }).join('');
    return out.slice(0, 4);
  }

  var SCHOOLS = SCHOOL_ROWS.map(function (r) {
    return { id: r[0], name: r[1], accent: readable(r[2]), mono: monogram(r[0], r[1]), logo: r[3] };
  });
  var BY_ID = {};
  SCHOOLS.forEach(function (s) { BY_ID[s.id] = s; });
  var featured = FEATURED.map(function (id) { return BY_ID[id]; }).filter(Boolean);

  // ── Theme ─────────────────────────────────────────────
  var current = null;

  function swapText(el, text) {
    if (el.textContent === text) return;
    if (reduced || !el.animate || !isOnScreen(el)) { el.textContent = text; return; }
    el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-35%)' }], { duration: 220, easing: 'ease-in' })
      .onfinish = function () {
        el.textContent = text;
        el.animate([{ opacity: 0, transform: 'translateY(35%)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      };
  }

  function isOnScreen(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  function setTile(tile, school) {
    var mono = school ? school.mono : 'CT';
    var monoEl = tile.querySelector('[data-mono]');
    var logo = tile.querySelector('[data-school-logo]');
    monoEl.style.setProperty('--mono-size', mono.length <= 2 ? '.95em' : mono.length === 3 ? '.78em' : '.64em');
    monoEl.textContent = mono;
    if (logo && school && school.logo) logo.src = school.logo;
    tile.classList.toggle('has-logo', Boolean(logo && school && school.logo));
  }

  function applySchool(school, animate) {
    if (school === current) return;
    current = school;
    root.style.setProperty('--accent', school ? school.accent : BRAND_ACCENT);
    var name = school ? school.name : 'Your campus';
    $$('[data-school-name]').forEach(function (el) { swapText(el, name); });
    $$('[data-mono]').forEach(function (el) {
      var tile = el.parentElement;
      if (!animate || reduced || !isOnScreen(tile)) { setTile(tile, school); return; }
      tile.classList.remove('is-flipping');
      void tile.offsetWidth;
      tile.classList.add('is-flipping');
      setTimeout(function () { setTile(tile, school); }, 340);
    });
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
  // Each cycle features one client's real tasks; the brand flips in with the school.
  // Rho's rows are placeholders until Rho's real tasks are in; they promise nothing on Rho's behalf.
  var BRANDS = [
    { logo: '/tasks/assets/fomo-wordmark.svg', wide: false, tagline: 'Build the campus culture.',
      rows: { a: ['dinner', 'Host the creator dinner', 'A DINNER ON fomo'], b: ['video', 'Find your chapter filmer', 'FINAL CUT + PARTY FUNDING'], c: ['mic', 'Recruit your campus media host', 'A PAID ROLE TO OFFER'] },
      joins: { b: 'filmer', c: 'host' } },
    { logo: '/tasks/assets/icybox-wordmark.svg', wide: true, tagline: 'Get your house spinning together.',
      rows: { a: ['users', 'Host a chapter spin night', 'SPINS ON ICYBOX'], b: ['video', 'Hire your chapter filmer', 'A PAID CAMERA ROLE'], c: ['trophy', 'Call out another house', 'HOUSE VS HOUSE'] },
      joins: { b: 'filmer' } },
    { logo: '/tasks/assets/rho-wordmark.svg', wide: false, tagline: 'Back the builders on your campus.',
      rows: { a: ['dinner', 'Host a founder night', 'A NIGHT FOR BUILDERS'], b: ['video', 'Find your chapter filmer', 'A CAMERA ROLE'], c: ['users', 'Find your campus founders', 'STUDENT STARTUPS'] },
      joins: { b: 'filmer' } }
  ];
  var brandIndex = 0;
  var brand = BRANDS[0];
  var TIMELINE = [
    [700, 'a', 'active'],
    [1600, 'a', 'review'],
    [2500, 'b', 'active'],
    [3400, 'a', 'approved'],
    [4200, 'c', 'active'],
    [5000, 'b', 'review'],
    [5900, 'b', 'approved'],
    [6800, 'c', 'review'],
    [7800, 'c', 'approved']
  ];
  var CYCLE = 10200;
  var timers = [];
  var cycleIndex = -1;
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
    $('[data-bonus-bar]').style.setProperty('--p', (counts.approved / 5 * 100) + '%');
    $('[data-bonus-text]').textContent = counts.approved + ' of 5 approved';
  }

  function setState(id, state) {
    var li = tasks[id];
    if (!li) return;
    li.setAttribute('data-state', state);
    var pill = li.querySelector('.status');
    pill.textContent = LABELS[state];
    bump(pill);
    paintCounts();
    if (state === 'approved') {
      var member = brand.joins[id] ? $('[data-member="' + brand.joins[id] + '"]') : null;
      if (member) {
        member.classList.add('is-in', 'is-joining');
        setTimeout(function () { member.classList.remove('is-joining'); }, 800);
      }
    }
  }

  function resetMock() {
    Object.keys(tasks).forEach(function (k) {
      tasks[k].setAttribute('data-state', 'available');
      tasks[k].querySelector('.status').textContent = LABELS.available;
    });
    $$('[data-member]').forEach(function (m) { m.classList.remove('is-in', 'is-joining'); });
    paintCounts();
  }

  function clearCycle() {
    timers.forEach(clearTimeout);
    timers = [];
    running = false;
  }

  function nextSchool(advance) {
    if (!featured.length) return null;
    if (advance || cycleIndex < 0) cycleIndex = (cycleIndex + 1) % featured.length;
    return featured[cycleIndex];
  }

  // Three clocks share one 10.2s loop: task statuses run the full loop, the brand
  // flips every 3.4s, and the school once a loop, between brand flips.
  var BRAND_EVERY = 3400;
  var BRAND_FLIPS = [BRAND_EVERY, BRAND_EVERY * 2];
  var SCHOOL_EVERY = 8000;
  var cycleStart = 0;
  var schoolTimer = null;
  function nextBrand() {
    brandIndex = (brandIndex + 1) % BRANDS.length;
    applyBrand(BRANDS[brandIndex]);
  }

  function runCycle() {
    clearCycle();
    running = true;
    cycleStart = performance.now();
    resetMock();
    TIMELINE.forEach(function (step) {
      timers.push(setTimeout(function () {
        setState(step[1], step[2]);
      }, step[0]));
    });
    BRAND_FLIPS.forEach(function (t) { timers.push(setTimeout(nextBrand, t)); });
    timers.push(setTimeout(function () { nextBrand(); runCycle(); }, CYCLE));
  }

  // Flip a logo slot like the school tile, swapping its content at the halfway point.
  function flip(el, swap) {
    if (reduced || !isOnScreen(el)) { swap(); return; }
    el.classList.remove('is-flipping');
    void el.offsetWidth;
    el.classList.add('is-flipping');
    setTimeout(swap, 340);
  }

  function applyBrand(next) {
    brand = next;
    var slot = $('[data-co-logo]');
    flip(slot, function () {
      var img = slot.querySelector('img');
      img.src = next.logo;
      img.classList.toggle('is-wide', next.wide);
    });
    // Text fades out over 220ms, so starting it 120ms in lands the swap with the logo's.
    setTimeout(function () {
      swapText($('[data-co-tagline]'), next.tagline);
      Object.keys(next.rows).forEach(function (id) {
        var row = next.rows[id];
        swapText(tasks[id].querySelector('.mt-text b'), row[1]);
        swapText(tasks[id].querySelector('.mt-text small'), row[2]);
      });
    }, reduced ? 0 : 120);
    setTimeout(function () {
      Object.keys(next.rows).forEach(function (id) {
        tasks[id].querySelector('.mt-icon use').setAttribute('href', '#i-' + next.rows[id][0]);
      });
    }, reduced ? 0 : 340);
  }

  // Warm the cache so a flipped logo never shows up blank.
  ['/tasks/assets/icybox-wordmark.svg', '/tasks/assets/icybox-app-icon.svg', '/tasks/assets/rho-wordmark.svg', '/tasks/assets/rho-icon.svg'].concat(featured.map(function (s) { return s.logo; })).forEach(function (src) { new Image().src = src; });

  function syncCycle() {
    var shouldRun = heroVisible && !document.hidden && !reduced;
    if (shouldRun && !running) runCycle();
    if (!shouldRun && running) clearCycle();
  }

  // The school changes every 8s across the whole page, so its colour carries into every
  // section. While the brand clock runs, a school flip waits for a gap between brand flips.
  function scheduleSchool(delay) {
    clearTimeout(schoolTimer);
    schoolTimer = setTimeout(schoolTick, delay);
  }
  function schoolTick() {
    if (running) {
      var phase = (performance.now() - cycleStart) % BRAND_EVERY;
      if (phase < 800 || phase > BRAND_EVERY - 800) {
        scheduleSchool((BRAND_EVERY / 2 - phase + BRAND_EVERY) % BRAND_EVERY);
        return;
      }
    }
    applySchool(nextSchool(true), true);
    scheduleSchool(SCHOOL_EVERY);
  }
  function syncSchool() {
    if (document.hidden || reduced) clearTimeout(schoolTimer);
    else scheduleSchool(SCHOOL_EVERY);
  }

  // A calm, finished frame for reduced motion.
  function staticMock() {
    applySchool(featured[0] || null, false);
    setState('a', 'approved');
    setState('b', 'review');
    setState('c', 'active');
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (root.classList.contains('is-ready')) syncCycle();
    }, { threshold: 0.15 }).observe($('.hero'));
  }
  document.addEventListener('visibilitychange', function () { if (root.classList.contains('is-ready')) { syncCycle(); syncSchool(); } });

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
  // Once unlocked, the experience flips through every company in the circle.
  var EXPERIENCES = [['fomo', '/tasks/assets/fomo-linkedin.svg'], ['IcyBox', '/tasks/assets/icybox-app-icon.svg'], ['Rho', '/tasks/assets/rho-icon.svg']];
  var experienceIndex = 0;
  function nextExperience() {
    if (document.hidden || !isOnScreen(rewards)) return;
    experienceIndex = (experienceIndex + 1) % EXPERIENCES.length;
    var next = EXPERIENCES[experienceIndex];
    var logo = $('[data-li-logo]', rewards);
    flip(logo, function () { logo.querySelector('img').src = next[1]; });
    $$('[data-li-co]', rewards).forEach(function (el) { swapText(el, next[0]); });
  }
  function unlock(instant) {
    function done() {
      rewards.classList.add('is-unlocked');
      unlockText.textContent = 'All five approved. Add it to LinkedIn with your actual dates.';
      if (!reduced) setInterval(nextExperience, 3400);
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
      applySchool(nextSchool(false), true);
      syncCycle();
      syncSchool();
    }, 1500);
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 900); })]).then(function () { requestAnimationFrame(start); });
})();
