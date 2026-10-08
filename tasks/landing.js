// Campus Tasks landing page: school theming, the live workspace preview,
// the task showcase, and view-triggered motion. Nothing here is scroll-linked.
(function () {
  'use strict';
  window.campusTasksReady = true;

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BRAND_ACCENT = '#4A36FF';

  // [id, name, primary colour] for the schools the preview cycles through, from the
  // product's public school list (/api/task-schools).
  var SCHOOL_ROWS = [
    ["university-of-oregon","University of Oregon","#00934B"],
    ["university-of-michigan-ann-arbor","University of Michigan - Ann Arbor","#00274C"],
    ["the-university-of-texas-at-austin","The University of Texas at Austin","#BF5700"],
    ["university-of-southern-california","University of Southern California","#9D2235"],
    ["university-of-washington","University of Washington","#33006F"],
    ["university-of-florida","University of Florida","#0021A5"]
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
    return { id: r[0], name: r[1], accent: readable(r[2]), mono: monogram(r[0], r[1]) };
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

  function setMono(el, text) {
    el.style.setProperty('--mono-size', text.length <= 2 ? '.95em' : text.length === 3 ? '.78em' : '.64em');
    el.textContent = text;
  }

  function applySchool(school, animate) {
    if (school === current) return;
    current = school;
    root.style.setProperty('--accent', school ? school.accent : BRAND_ACCENT);
    var name = school ? school.name : 'Your campus';
    var mono = school ? school.mono : 'CT';
    $$('[data-school-name]').forEach(function (el) { swapText(el, name); });
    $$('[data-mono]').forEach(function (el) {
      var tile = el.parentElement;
      if (!animate || reduced || !isOnScreen(tile)) { setMono(el, mono); return; }
      tile.classList.remove('is-flipping');
      void tile.offsetWidth;
      tile.classList.add('is-flipping');
      setTimeout(function () { setMono(el, mono); }, 340);
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
  // Rho has no tasks yet, so it appears where only a logo applies.
  var BRANDS = [
    { logo: '/tasks/assets/fomo-wordmark.svg', wide: false, tagline: 'Build the campus culture.',
      rows: { a: ['dinner', 'Host the creator dinner', 'A DINNER ON fomo'], b: ['video', 'Find your chapter filmer', 'FINAL CUT + PARTY FUNDING'], c: ['mic', 'Recruit your campus media host', 'A PAID ROLE TO OFFER'] },
      joins: { b: 'filmer', c: 'host' },
      toasts: { a: 'Approved by fomo', c: 'Your media host joined the team' } },
    { logo: '/tasks/assets/icybox-wordmark.svg', wide: true, tagline: 'Get your house spinning together.',
      rows: { a: ['users', 'Host a chapter spin night', 'SPINS ON ICYBOX'], b: ['video', 'Hire your chapter filmer', 'A PAID CAMERA ROLE'], c: ['trophy', 'Call out another house', 'HOUSE VS HOUSE'] },
      joins: { b: 'filmer' },
      toasts: { a: 'Approved by IcyBox', b: 'Your filmer joined the team' } }
  ];
  var brandIndex = 0;
  var brand = BRANDS[0];
  var TIMELINE = [
    [700, 'a', 'active'],
    [1600, 'a', 'review', 'Step 1 sent for review'],
    [2500, 'b', 'active'],
    [3400, 'a', 'approved'],
    [4200, 'c', 'active'],
    [5000, 'b', 'review'],
    [5900, 'b', 'approved'],
    [6800, 'c', 'review'],
    [7800, 'c', 'approved']
  ];
  var CYCLE = 10200;
  var toast = $('[data-toast]');
  var toastText = $('[data-toast-text]');
  var toastTimer = null;
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
      if (brand.toasts[id] && !reduced) showToast(brand.toasts[id]);
    }
  }

  function showToast(text) {
    toastText.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2300);
  }

  function resetMock() {
    Object.keys(tasks).forEach(function (k) {
      tasks[k].setAttribute('data-state', 'available');
      tasks[k].querySelector('.status').textContent = LABELS.available;
    });
    $$('[data-member]').forEach(function (m) { m.classList.remove('is-in', 'is-joining'); });
    toast.classList.remove('show');
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
  // flips every 3.4s, and the school every 5.1s, offset so no two flips land together.
  var BRAND_FLIPS = [3400, 6800];
  var SCHOOL_FLIPS = [2550, 7650];
  function nextBrand() {
    brandIndex = (brandIndex + 1) % BRANDS.length;
    applyBrand(BRANDS[brandIndex]);
  }

  function runCycle() {
    clearCycle();
    running = true;
    applySchool(nextSchool(false), true);
    resetMock();
    TIMELINE.forEach(function (step) {
      timers.push(setTimeout(function () {
        setState(step[1], step[2]);
        if (step[3]) showToast(step[3]);
      }, step[0]));
    });
    BRAND_FLIPS.forEach(function (t) { timers.push(setTimeout(nextBrand, t)); });
    SCHOOL_FLIPS.forEach(function (t) { timers.push(setTimeout(function () { applySchool(nextSchool(true), true); }, t)); });
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
  ['/tasks/assets/icybox-wordmark.svg', '/tasks/assets/icybox-app-icon.svg', '/tasks/assets/rho-icon.svg'].forEach(function (src) { new Image().src = src; });

  function syncCycle() {
    var shouldRun = heroVisible && !document.hidden && !reduced;
    if (shouldRun && !running) runCycle();
    if (!shouldRun && running) clearCycle();
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

  // ── Task showcase ─────────────────────────────────────
  var taskx = $('[data-taskx]');
  var tabs = $$('[role=tab]', taskx);
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var tabList = $('.taskx-list', taskx);
  var selected = 0;
  var taskxSeen = false;
  var taskxVisible = false;
  var hovering = false;

  panels.forEach(function (p) {
    $$('.a', p).forEach(function (el, i) { el.style.setProperty('--n', i); });
    $$('.tp-steps li', p).forEach(function (li, i) { li.style.setProperty('--k', i); });
  });

  function enter(panel) {
    if (reduced) return;
    panel.classList.remove('is-entering');
    void panel.offsetWidth;
    panel.classList.add('is-entering');
  }

  // Each company has its own five tabs; the switcher shows one company's at a time.
  var coButtons = $$('.co-switch [data-co]', taskx);
  var activeCo = 'fomo';
  function showCompany(co) {
    if (co === activeCo) return;
    activeCo = co;
    coButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-co') === co)); });
    tabs.forEach(function (t) { t.hidden = t.getAttribute('data-co') !== co; });
    if (reduced || !Element.prototype.animate) return;
    visibleTabs().forEach(function (t, k) {
      t.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: k * 55, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    });
  }
  function visibleTabs() { return tabs.filter(function (t) { return !t.hidden; }); }
  coButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var co = b.getAttribute('data-co');
      stopAuto();
      if (co === activeCo) return;
      selectTab(tabs.findIndex(function (t) { return t.getAttribute('data-co') === co; }));
    });
  });

  function selectTab(i, opts) {
    opts = opts || {};
    if (i === selected && !opts.force) return;
    showCompany(tabs[i].getAttribute('data-co'));
    // Panels share one grid cell, so the section keeps its height as tasks change.
    tabs.forEach(function (t, idx) {
      var on = idx === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[idx].hidden = !on;
      panels[idx].classList.toggle('is-active', on);
    });
    selected = i;
    enter(panels[i]);
    if (opts.focus) tabs[i].focus();
    // On phones the tabs are a sideways strip: scroll the strip itself, never the page.
    if (tabList.scrollWidth > tabList.clientWidth) {
      tabList.scrollTo({ left: Math.max(0, tabs[i].offsetLeft - tabList.offsetLeft - 16), behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function stopAuto() { taskx.classList.remove('is-auto'); }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { stopAuto(); selectTab(i); });
    tab.addEventListener('keydown', function (e) {
      var shown = visibleTabs();
      var pos = shown.indexOf(tab);
      var next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = shown[(pos + 1) % shown.length];
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = shown[(pos - 1 + shown.length) % shown.length];
      else if (e.key === 'Home') next = shown[0];
      else if (e.key === 'End') next = shown[shown.length - 1];
      if (!next) return;
      e.preventDefault();
      stopAuto();
      selectTab(tabs.indexOf(next), { focus: true });
    });
  });

  taskx.addEventListener('animationend', function (e) {
    if (e.animationName !== 'timer' || !taskx.classList.contains('is-auto')) return;
    selectTab((selected + 1) % tabs.length);
  });

  function syncPause() { taskx.classList.toggle('is-paused', hovering || !taskxVisible || document.hidden); }
  taskx.addEventListener('pointerenter', function () { hovering = true; syncPause(); });
  taskx.addEventListener('pointerleave', function () { hovering = false; syncPause(); });
  taskx.addEventListener('focusin', function () { hovering = true; syncPause(); });
  taskx.addEventListener('focusout', function (e) { if (!taskx.contains(e.relatedTarget)) { hovering = false; syncPause(); } });
  document.addEventListener('visibilitychange', syncPause);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var entry = entries[0];
      taskxVisible = entry.isIntersecting && entry.intersectionRect.height > Math.min(window.innerHeight * 0.45, entry.boundingClientRect.height * 0.5);
      if (taskxVisible && !taskxSeen) {
        taskxSeen = true;
        enter(panels[selected]);
        if (!reduced) taskx.classList.add('is-auto');
      }
      syncPause();
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75] }).observe(taskx);
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
    setTimeout(syncCycle, 1500);
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 900); })]).then(function () { requestAnimationFrame(start); });
})();
