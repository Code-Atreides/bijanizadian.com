// Campus Tasks landing page: school theming, the live workspace preview,
// the task showcase, and view-triggered motion. Nothing here is scroll-linked.
(function () {
  'use strict';
  window.campusTasksReady = true;

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WORKSPACE = 'https://milomessina.com/tasks';
  var BRAND_ACCENT = '#4A36FF';
  var STORE_KEY = 'campusTasks.school';

  // [id, name, primary, secondary] from the product's public school list (/api/task-schools).
  var SCHOOL_ROWS = [["alma-college","Alma College","#8A1538","#FFFFFF"],
    ["appalachian-state-university","Appalachian State University","#000000","#FFCD00"],
    ["arizona-state-university","Arizona State University","#8C1D40","#FFC627"],
    ["bradley-university","Bradley University","#B70002","#C0C0C0"],
    ["california-institute-of-technology","California Institute of Technology","#FF6C0C","#FFFFFF"],
    ["california-state-university-chico","California State University, Chico","#9D2235","#FFFFFF"],
    ["california-state-university-fullerton","California State University, Fullerton","#003767","#FF8300"],
    ["california-state-university-northridge","California State University, Northridge","#B50000","#FFFFFF"],
    ["case-western-reserve-university","Case Western Reserve University","#003071","#A7A9AC"],
    ["clemson-university","Clemson University","#F56600","#FFFFFF"],
    ["coastal-carolina-university","Coastal Carolina University","#006F71","#A27752"],
    ["colby-college","Colby College","#012778","#FFFFFF"],
    ["college-of-charleston","College of Charleston","#7A2531","#9E8959"],
    ["colorado-mesa-university","Colorado Mesa University","#860037","#FED102"],
    ["colorado-state-university","Colorado State University","#004C23","#C8C372"],
    ["columbia-university","Columbia University","#7BA4DB","#183863"],
    ["cornell-university","Cornell University","#B31B1B","#FFFFFF"],
    ["covenant-college","Covenant College","#003E71","#75BEEA"],
    ["creighton-university","Creighton University","#005CA9","#6CADDE"],
    ["cuny-baruch-college","CUNY Baruch College","#003DA5","#FFFFFF"],
    ["cuny-city-college-of-ny","CUNY City College of NY","#7D55C7","#F3CF45"],
    ["dartmouth-college","Dartmouth College","#005730","#000000"],
    ["depauw-university","DePauw University","#111C24","#F2C75C"],
    ["duke-university","Duke University","#00539B","#FFFFFF"],
    ["duquesne-university","Duquesne University","#002D62","#B90B2E"],
    ["east-carolina-university","East Carolina University","#582C83","#FFC72C"],
    ["eastern-illinois-university","Eastern Illinois University","#004B85","#B2B7BB"],
    ["elon-university","Elon University","#020303","#B59A57"],
    ["embry-riddle-aeronautical-university","Embry-Riddle Aeronautical University","#003A70","#FFC72C"],
    ["emory-university","Emory University","#012169","#B58500"],
    ["florida-agricultural-and-mechanical-university","Florida Agricultural and Mechanical University","#F89728","#00843D"],
    ["florida-international-university","Florida International University","#081E3F","#D1A644"],
    ["florida-state-university","Florida State University","#782F40","#CEB888"],
    ["george-washington-university","George Washington University","#002843","#E8D2A1"],
    ["georgia-southern-university","Georgia Southern University","#041E42","#A3AAAE"],
    ["harvard-university","Harvard University","#990000","#DBDBDB"],
    ["high-point-university","High Point University","#330072","#FFFFFF"],
    ["hofstra-university","Hofstra University","#003594","#FFC72C"],
    ["indiana-university","Indiana University","#970310","#FFFFFF"],
    ["indiana-university-bloomington","Indiana University - Bloomington","#970310","#FFFFFF"],
    ["indiana-university-of-pennsylvania","Indiana University of Pennsylvania","#9E1B32","#FFFFFF"],
    ["james-madison-university","James Madison University","#450084","#CBB677"],
    ["kenyon-college","Kenyon College","#4B2E84","#FFFFFF"],
    ["lehigh-university","Lehigh University","#6C2B2A","#B69E70"],
    ["lone-star-college-system","Lone Star College System","#003768","#A6192E"],
    ["loyola-university-chicago","Loyola University Chicago","#9D1244","#FFFFFF"],
    ["marist-college","Marist College","#E53730","#F0F0F0"],
    ["miami-university-of-ohio","Miami University of Ohio","#C41230","#FFFFFF"],
    ["michigan-state-university","Michigan State University","#173F35","#FFFFFF"],
    ["mississippi-state-university","Mississippi State University","#5D1725","#C1C6C8"],
    ["new-mexico-state-university","New Mexico State University","#7E141B","#231F20"],
    ["new-york-university","New York University","#57068C","#FFFFFF"],
    ["north-carolina-state-university","North Carolina State University","#CC0000","#FFFFFF"],
    ["northeastern-university","Northeastern University","#CC0001","#C2C3C0"],
    ["northern-arizona-university","Northern Arizona University","#003976","#1B3069"],
    ["ohio-state-university-columbus","Ohio State University - Columbus","#BA0C2F","#A8ADB4"],
    ["ohio-university","Ohio University","#154734","#FFFFFF"],
    ["oklahoma-state-university","Oklahoma State University","#FE5C00","#000000"],
    ["oregon-state-university","Oregon State University","#DC4405","#000000"],
    ["pennsylvania-state-university","Pennsylvania State University","#061440","#FFFFFF"],
    ["princeton-university","Princeton University","#000000","#FF6000"],
    ["purdue-university","Purdue University","#CEB888","#000000"],
    ["queen-s-university","Queen's University","#002452","#FABD0F"],
    ["rowan-college","Rowan College","#5B1300","#FFCF44"],
    ["rutgers-university","Rutgers University","#CE0E2D","#FFFFFF"],
    ["sacred-heart-university","Sacred Heart University","#A40012","#C29472"],
    ["saint-joseph-s-university","Saint Joseph's University","#9E1B32","#6C6F70"],
    ["saint-leo-university","Saint Leo University","#205A41","#F5A800"],
    ["salisbury-university","Salisbury University","#8B0E04","#FDB913"],
    ["san-diego-state-university","San Diego State University","#D41736","#000000"],
    ["san-francisco-state-university","San Francisco State University","#231161","#C99700"],
    ["san-jose-state-university","San Jose State University","#0038A8","#FFB81A"],
    ["santa-monica-college","Santa Monica College","#003B71","#FFFFFF"],
    ["southern-methodist-university","Southern Methodist University","#A80000","#0033A1"],
    ["stanford-university","Stanford University","#8C1515","#FFFFFF"],
    ["state-university-of-new-york-at-albany","State University of New York at Albany","#3D2777","#FFFFFF"],
    ["state-university-of-new-york-at-binghamton","State University of New York at Binghamton","#00614A","#F0F0F0"],
    ["state-university-of-new-york-at-buffalo","State University of New York at Buffalo","#005BBB","#FFFFFF"],
    ["state-university-of-new-york-at-farmingdale","State University of New York at Farmingdale","#006F71","#D0D1D4"],
    ["state-university-of-new-york-at-stony-brook","State University of New York at Stony Brook","#990000","#FFFFFF"],
    ["state-university-of-new-york-college-at-new-paltz","State University of New York College at New Paltz","#003E7E","#F58426"],
    ["syracuse-university","Syracuse University","#000E54","#FF431B"],
    ["temple-university","Temple University","#A41E35","#FFFFFF"],
    ["texas-a-m-university-college-station","Texas A&M University - College Station","#500000","#FFFFFF"],
    ["texas-christian-university","Texas Christian University","#4D1979","#FFFFFF"],
    ["texas-state-university","Texas State University","#501214","#6A5638"],
    ["texas-tech-university","Texas Tech University","#DA291C","#000000"],
    ["the-college-of-new-jersey","The College of New Jersey","#293F6F","#D2A92A"],
    ["the-university-of-alabama","The University of Alabama","#9E1B32","#FFFFFF"],
    ["the-university-of-texas-at-austin","The University of Texas at Austin","#BF5700","#FFFFFF"],
    ["towson-university","Towson University","#FFC229","#000000"],
    ["tulane-university","Tulane University","#006747","#418FDE"],
    ["university-of-arizona","University of Arizona","#CC0033","#003366"],
    ["university-of-california-berkeley","University of California, Berkeley","#041E42","#FFC72C"],
    ["university-of-california-davis","University of California, Davis","#002855","#C3C4C6"],
    ["university-of-california-san-diego","University of California, San Diego","#182B49","#FFCD00"],
    ["university-of-california-santa-barbara","University of California, Santa Barbara","#1E1840","#FEBC11"],
    ["university-of-california-santa-cruz","University of California, Santa Cruz","#003C6C","#FDC700"],
    ["university-of-central-florida","University of Central Florida","#000000","#B4A169"],
    ["university-of-chicago","University of Chicago","#800000","#A6A6A6"],
    ["university-of-cincinnati","University of Cincinnati","#000000","#E00122"],
    ["university-of-colorado-at-boulder","University of Colorado at Boulder","#CFB87C","#000000"],
    ["university-of-florida","University of Florida","#0021A5","#FA4616"],
    ["university-of-houston","University of Houston","#C8102E","#FFFFFF"],
    ["university-of-illinois-chicago","University of Illinois Chicago","#001E62","#D50032"],
    ["university-of-illinois-springfield","University of Illinois Springfield","#003366","#FFFFFF"],
    ["university-of-illinois-urbana-champaign","University of Illinois Urbana-Champaign","#FF5F05","#13294B"],
    ["university-of-kansas","University of Kansas","#0051BA","#E8000D"],
    ["university-of-massachusetts-at-amherst","University of Massachusetts at Amherst","#881C1C","#FFFFFF"],
    ["university-of-miami","University of Miami","#F47423","#035131"],
    ["university-of-michigan-ann-arbor","University of Michigan - Ann Arbor","#00274C","#FFCB05"],
    ["university-of-minnesota","University of Minnesota","#5E0A2F","#FAB41C"],
    ["university-of-mississippi","University of Mississippi","#13294B","#CF142B"],
    ["university-of-missouri","University of Missouri","#F1B82D","#000000"],
    ["university-of-nevada-reno","University of Nevada, Reno","#041E42","#8A8D8F"],
    ["university-of-north-carolina-at-chapel-hill","University of North Carolina at Chapel Hill","#7BAFD4","#13294B"],
    ["university-of-north-carolina-at-charlotte","University of North Carolina at Charlotte","#005035","#A49665"],
    ["university-of-oklahoma","University of Oklahoma","#990000","#FFFFFF"],
    ["university-of-oregon","University of Oregon","#00934B","#FFF41B"],
    ["university-of-pennsylvania","University of Pennsylvania","#082A74","#A6163D"],
    ["university-of-pittsburgh","University of Pittsburgh","#003594","#FFB81C"],
    ["university-of-rhode-island","University of Rhode Island","#091F3F","#5AB3E8"],
    ["university-of-san-diego","University of San Diego","#2F99D4","#2F99D4"],
    ["university-of-south-carolina","University of South Carolina","#73000A","#000000"],
    ["university-of-southern-california","University of Southern California","#9D2235","#FFC72C"],
    ["university-of-tampa","University of Tampa","#C8102E","#000000"],
    ["university-of-tennessee-knoxville","University of Tennessee, Knoxville","#FF8200","#FFFFFF"],
    ["university-of-texas-at-arlington","University of Texas at Arlington","#004B7C","#F58024"],
    ["university-of-virginia-charlottesville","University of Virginia, Charlottesville","#232D4B","#F84C1E"],
    ["university-of-washington","University of Washington","#33006F","#E8D3A2"],
    ["university-of-wisconsin-madison","University of Wisconsin - Madison","#A00000","#FFFFFF"],
    ["university-of-wisconsin-milwaukee","University of Wisconsin - Milwaukee","#000000","#FFC20E"],
    ["virginia-tech","Virginia Tech","#861F41","#E87722"],
    ["wake-forest-university","Wake Forest University","#CEB888","#2C2A29"],
    ["washington-lee-university","Washington & Lee University","#003087","#FFFFFF"],
    ["washington-state-university","Washington State University","#A60F2D","#4D4D4D"],
    ["western-university","Western University","#4F2683","#FFFFFF"]];
  var FEATURED = ['university-of-oregon', 'university-of-michigan-ann-arbor', 'the-university-of-texas-at-austin', 'university-of-southern-california', 'university-of-washington', 'university-of-florida'];
  var MONO_OVERRIDES = { 'university-of-north-carolina-at-chapel-hill': 'UNC', 'texas-am-university-college-station': 'TAMU', 'the-university-of-texas-at-austin': 'UT', 'university-of-tennessee-knoxville': 'UT', 'university-of-virginia-charlottesville': 'UVA', 'the-college-of-new-jersey': 'TCNJ', 'university-of-colorado-at-boulder': 'CU', 'california-institute-of-technology': 'CIT', 'university-of-massachusetts-at-amherst': 'UMA' };
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
    return { id: r[0], name: r[1], primary: r[2], secondary: r[3], accent: readable(r[2]), mono: monogram(r[0], r[1]) };
  });
  var BY_ID = {};
  SCHOOLS.forEach(function (s) { BY_ID[s.id] = s; });
  var featured = FEATURED.map(function (id) { return BY_ID[id]; }).filter(Boolean);

  // ── Theme ─────────────────────────────────────────────
  var current = null;
  var pinned = null;

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

  function updateWorkspaceLinks() {
    var href = pinned ? WORKSPACE + '?school=' + encodeURIComponent(pinned.id) : WORKSPACE;
    $$('[data-workspace]').forEach(function (a) { a.href = href; });
  }

  function savePinned() {
    try {
      if (pinned) window.localStorage.setItem(STORE_KEY, pinned.id);
      else window.localStorage.removeItem(STORE_KEY);
    } catch (e) { /* Browser storage is a convenience only. */ }
  }

  function loadPinned() {
    var id = null;
    try { id = new URLSearchParams(window.location.search).get('school'); } catch (e) { id = null; }
    if (!id) { try { id = window.localStorage.getItem(STORE_KEY); } catch (e) { id = null; } }
    return id && BY_ID[id] ? BY_ID[id] : null;
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
  var TIMELINE = [
    [700, 'dinner', 'active'],
    [1600, 'dinner', 'review', 'Step 1 sent for review'],
    [2500, 'filmer', 'active'],
    [3400, 'dinner', 'approved', 'Approved by fomo'],
    [4200, 'host', 'active'],
    [5000, 'filmer', 'review'],
    [5900, 'filmer', 'approved'],
    [6800, 'host', 'review'],
    [7800, 'host', 'approved', 'Your media host joined the team']
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
      var member = $('[data-member="' + id + '"]');
      if (member) {
        member.classList.add('is-in', 'is-joining');
        setTimeout(function () { member.classList.remove('is-joining'); }, 800);
      }
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
    if (pinned) return pinned;
    if (!featured.length) return null;
    if (advance || cycleIndex < 0) cycleIndex = (cycleIndex + 1) % featured.length;
    return featured[cycleIndex];
  }

  function runCycle(advance) {
    clearCycle();
    running = true;
    applySchool(nextSchool(advance), true);
    resetMock();
    TIMELINE.forEach(function (step) {
      timers.push(setTimeout(function () {
        setState(step[1], step[2]);
        if (step[3]) showToast(step[3]);
      }, step[0]));
    });
    timers.push(setTimeout(function () { runCycle(true); }, CYCLE));
  }

  function syncCycle() {
    var shouldRun = heroVisible && !document.hidden && !reduced;
    if (shouldRun && !running) runCycle(false);
    if (!shouldRun && running) clearCycle();
  }

  // A calm, finished frame for reduced motion.
  function staticMock() {
    applySchool(pinned || featured[0] || null, false);
    setState('dinner', 'approved');
    setState('filmer', 'review');
    setState('host', 'active');
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

  // ── School search (combobox) ──────────────────────────
  var input = $('#school-input');
  var list = $('#school-list');
  var clearBtn = $('.combo-clear');
  var status = $('#school-status');
  var results = [];
  var activeIndex = -1;

  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    var scored = [];
    SCHOOLS.forEach(function (s) {
      var n = s.name.toLowerCase();
      var m = s.mono.toLowerCase();
      var score = -1;
      if (m === q || n.indexOf(q) === 0 || n.replace(/^the /, '').indexOf(q) === 0) score = 0;
      else if (m.indexOf(q) === 0) score = 1;
      else if (n.split(/[\s,\-]+/).some(function (w) { return w.indexOf(q) === 0; })) score = 2;
      else if (n.indexOf(q) !== -1) score = 3;
      if (score >= 0) scored.push([score, s]);
    });
    return scored.sort(function (a, b) { return a[0] - b[0] || a[1].name.localeCompare(b[1].name); })
      .slice(0, 8).map(function (x) { return x[1]; });
  }

  function openList(open) {
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (!open) { input.removeAttribute('aria-activedescendant'); activeIndex = -1; }
  }

  function renderList() {
    list.textContent = '';
    results = search(input.value);
    activeIndex = results.length ? 0 : -1;
    if (!input.value.trim()) { openList(false); return; }
    if (!results.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.setAttribute('role', 'option');
      empty.setAttribute('aria-disabled', 'true');
      empty.textContent = 'No match yet. Try the full name or an abbreviation.';
      list.appendChild(empty);
    }
    results.forEach(function (s, i) {
      var li = document.createElement('li');
      li.id = 'school-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === activeIndex));
      var sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = s.primary;
      var label = document.createElement('span');
      label.textContent = s.name;
      var abbr = document.createElement('small');
      abbr.textContent = s.mono;
      li.appendChild(sw); li.appendChild(label); li.appendChild(abbr);
      li.addEventListener('pointerdown', function (e) { e.preventDefault(); choose(s); });
      li.addEventListener('pointerenter', function () { highlight(i); });
      list.appendChild(li);
    });
    openList(true);
    highlight(activeIndex);
  }

  function highlight(i) {
    activeIndex = i;
    $$('[role=option]', list).forEach(function (li, idx) { li.setAttribute('aria-selected', String(idx === i && !li.hasAttribute('aria-disabled'))); });
    var el = i >= 0 ? $('#school-opt-' + i) : null;
    if (el) { input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }

  function choose(s) {
    pinned = s;
    input.value = s.name;
    openList(false);
    clearBtn.hidden = false;
    status.textContent = 'Previewing the workspace in ' + s.name + ' colors.';
    applySchool(s, true);
    updateWorkspaceLinks();
    savePinned();
  }

  input.addEventListener('input', renderList);
  input.addEventListener('focus', function () { if (input.value && !pinned) renderList(); });
  input.addEventListener('blur', function () { setTimeout(function () { openList(false); }, 120); });
  input.addEventListener('keydown', function (e) {
    var open = !list.hidden;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) renderList(); else if (results.length) highlight((activeIndex + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (open && results.length) highlight((activeIndex - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { if (open && results[activeIndex]) { e.preventDefault(); choose(results[activeIndex]); } }
    else if (e.key === 'Escape') { if (open) { e.preventDefault(); openList(false); } }
  });
  clearBtn.addEventListener('click', function () {
    pinned = null;
    input.value = '';
    clearBtn.hidden = true;
    status.textContent = '';
    updateWorkspaceLinks();
    savePinned();
    input.focus();
  });

  // ── Task showcase ─────────────────────────────────────
  var taskx = $('[data-taskx]');
  var tabs = $$('[role=tab]', taskx);
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var panelWrap = $('.taskx-panels', taskx);
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

  function selectTab(i, opts) {
    opts = opts || {};
    if (i === selected && !opts.force) return;
    var from = panelWrap.offsetHeight;
    tabs.forEach(function (t, idx) {
      var on = idx === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[idx].hidden = !on;
      panels[idx].classList.toggle('is-active', on);
    });
    selected = i;
    enter(panels[i]);
    var to = panelWrap.offsetHeight;
    if (!reduced && panelWrap.animate && from && from !== to) {
      panelWrap.style.overflow = 'clip';
      panelWrap.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)' })
        .onfinish = function () { panelWrap.style.overflow = ''; };
    }
    if (opts.focus) tabs[i].focus();
    if (opts.scroll) tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }

  function stopAuto() { taskx.classList.remove('is-auto'); }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { stopAuto(); selectTab(i); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      stopAuto();
      selectTab(next, { focus: true });
    });
  });

  taskx.addEventListener('animationend', function (e) {
    if (e.animationName !== 'timer' || !taskx.classList.contains('is-auto')) return;
    var listIsScroller = taskx.querySelector('.taskx-list').scrollWidth > taskx.querySelector('.taskx-list').clientWidth;
    selectTab((selected + 1) % tabs.length, { scroll: listIsScroller });
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
  function unlock(instant) {
    function done() {
      rewards.classList.add('is-unlocked');
      unlockText.textContent = 'All five approved. Add it to LinkedIn with your actual dates.';
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
  pinned = loadPinned();
  if (pinned) {
    input.value = pinned.name;
    clearBtn.hidden = false;
    status.textContent = 'Previewing the workspace in ' + pinned.name + ' colors.';
    applySchool(pinned, false);
  }
  updateWorkspaceLinks();
  paintCounts();

  var started = false;
  function start() {
    if (started) return;
    started = true;
    root.classList.add('is-ready');
    if (reduced) { staticMock(); return; }
    // Let the default workspace land first, then hand it to a school.
    setTimeout(syncCycle, pinned ? 600 : 1500);
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 900); })]).then(function () { requestAnimationFrame(start); });
})();
