// /data, the fomo campus tracker. Unlocks data.enc.json (written by
// scripts/refresh-campus-tracker.mjs) with the team password, then draws the
// daily growth charts, the chapter grid, and each chapter's backdrop: a canvas
// over a mesh of the fomo colors and the school's colors, saved as the image.
// Classic script with no inline code: the page's CSP is script-src 'self'.
(function () {
  'use strict';
  var ITERATIONS = 250000; // must match scripts/refresh-campus-tracker.mjs
  var TZ = 'America/New_York';
  var PAGE = 40;
  var $ = function (id) { return document.getElementById(id); };
  var SVG = 'http://www.w3.org/2000/svg';

  // ---------- small helpers ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVG, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  var num = function (n) { return Number(n).toLocaleString('en-US'); };
  var compact = function (n) { return n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(/\.0$/, '') + 'K' : String(n); };
  var utc = function (d) { return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)); };
  var addDays = function (d, n) { return new Date(utc(d) + n * 864e5).toISOString().slice(0, 10); };
  var dayLabel = function (d, year) { return new Date(utc(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: year ? 'numeric' : undefined, timeZone: 'UTC' }); };
  var nyDay = function (ms) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); };
  var plural = function (n, one, many) { return num(n) + ' ' + (n === 1 ? one : many || one + 's'); };

  // ---------- unlock ----------
  var bytes = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); };
  async function decrypt(password) {
    var res = await fetch('/fomocampustracker/data.enc.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('load');
    var box = await res.json();
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(box.salt), iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    var plain;
    try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(box.iv) }, key, bytes(box.data)); }
    catch (e) { throw new Error('password'); }
    return JSON.parse(new TextDecoder().decode(plain));
  }
  $('unlock').addEventListener('submit', async function (event) {
    event.preventDefault();
    var button = $('unlock-button'), error = $('lock-error');
    button.disabled = true; button.textContent = 'Unlocking…'; error.hidden = true;
    try { start(await decrypt($('password').value)); }
    catch (e) {
      error.textContent = e.message === 'password' ? 'That password didn’t work. Try again.' : 'The tracker couldn’t load. Check your connection and try again.';
      error.hidden = false; button.disabled = false; button.textContent = 'Unlock';
      $('password').select();
    }
  });
  $('lock').addEventListener('click', function () { location.replace(location.pathname); });

  // ---------- state ----------
  var data, today, series, chapters, list = [], shown = PAGE;
  var state = { range: '7', mode: 'daily', type: 'all', sort: 'members', query: '', format: 'post' };

  function start(payload) {
    data = payload;
    today = nyDay(Date.parse(data.updatedAt));
    // A continuous day series with running totals, from the first day to today.
    var byDay = new Map(data.days.map(function (d) { return [d.d, d]; }));
    series = [];
    var m = 0, c = 0;
    for (var d = data.days[0].d; d <= today; d = addDays(d, 1)) {
      var row = byDay.get(d) || { m: 0, c: 0 };
      m += row.m; c += row.c;
      series.push({ d: d, m: row.m, c: row.c, mt: m, ct: c });
    }
    var weekStart = addDays(today, -6);
    chapters = data.chapters.map(function (ch) {
      var target = ch.active ? Math.ceil(ch.active * 0.8) : 0, total = 0, reachedOn = null, week = 0, best = null;
      ch.days.forEach(function (x) {
        total += x[1];
        if (!reachedOn && target && total >= target) reachedOn = x[0];
        if (x[0] >= weekStart) week += x[1];
        if (!best || x[1] > best[1]) best = x;
      });
      return Object.assign({}, ch, { target: target, reachedOn: reachedOn, week: week, best: best, search: (ch.name + ' ' + ch.letters + ' ' + ch.school + ' ' + ch.short).toLowerCase() });
    });

    $('lock-view').hidden = true;
    $('app').hidden = false;
    $('header-meta').hidden = false;
    $('updated').textContent = 'Updated ' + new Date(data.updatedAt).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET';
    renderGrowth();
    renderGrid();
    new ResizeObserver(function () { drawCharts(); }).observe(document.querySelector('.charts'));
    route();
  }

  // ---------- filters ----------
  function segmented(id, field, after) {
    $(id).addEventListener('click', function (event) {
      var b = event.target.closest('button');
      if (!b) return;
      var value = b.dataset[field];
      if (value === state[field]) return;
      state[field] = value;
      $(id).querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      after();
    });
  }
  segmented('range', 'range', renderGrowth);
  segmented('mode', 'mode', renderGrowth);
  segmented('type', 'type', function () { shown = PAGE; renderGrid(); });
  segmented('format', 'format', function () { drawPoster(); });
  $('sort').addEventListener('change', function () { state.sort = this.value; shown = PAGE; renderGrid(); });
  $('search').addEventListener('input', function () { state.query = this.value.trim().toLowerCase(); shown = PAGE; renderGrid(); });
  $('more').addEventListener('click', function () { shown += PAGE; renderGrid(); });

  // ---------- growth: stats ----------
  function windowRows() {
    return state.range === 'all' ? series : series.slice(-Number(state.range));
  }
  function renderGrowth() {
    var rows = windowRows(), from = rows[0].d;
    var since = state.range === 'all' ? 'since ' + dayLabel(from) : 'in the last ' + state.range + ' days';
    var sum = function (f) { return rows.reduce(function (s, r) { return s + r[f]; }, 0); };
    var members = chapters.reduce(function (s, c) { return s + c.joined; }, 0);
    var actives = chapters.reduce(function (s, c) { return s + c.active; }, 0);
    var firstAt = new Map();
    chapters.forEach(function (c) { if (!firstAt.has(c.school) || c.registered < firstAt.get(c.school)) firstAt.set(c.school, c.registered); });
    var newSchools = Array.from(firstAt.values()).filter(function (d) { return d >= from; }).length;
    var reached = chapters.filter(function (c) { return c.reachedOn; });
    var reachedNow = reached.filter(function (c) { return c.reachedOn >= from; }).length;
    var tiles = [
      ['Members', num(members), '+' + num(sum('m')) + ' ' + since, true],
      ['Chapters', num(chapters.length), '+' + num(sum('c')) + ' ' + since],
      ['Schools', num(firstAt.size), '+' + num(newSchools) + ' new ' + since],
      ['At 80% of roster', num(reached.length), '+' + num(reachedNow) + ' ' + since],
      ['Roster joined', (actives ? (members / actives * 100).toFixed(1) : '0') + '%', num(members) + ' of ' + num(actives) + ' actives']
    ];
    var stats = $('stats');
    stats.replaceChildren.apply(stats, tiles.map(function (t) {
      var tile = el('div', 'stat' + (t[3] ? ' hero' : ''));
      tile.append(el('span', null, t[0]), el('strong', null, t[1]), el('small', null, t[2]));
      return tile;
    }));
    var sub = state.mode === 'total' ? 'running total' : 'per day, New York time';
    document.querySelectorAll('[data-sub]').forEach(function (s) { s.textContent = sub; });
    drawCharts();
    renderTable(rows);
  }
  function renderTable(rows) {
    var t = $('day-table'), head = el('tr');
    ['Day', 'Members', 'Chapters', 'Members total', 'Chapters total'].forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; head.append(th); });
    var thead = el('thead'), tbody = el('tbody');
    thead.append(head);
    rows.slice().reverse().forEach(function (r) {
      var tr = el('tr');
      tr.append(el('td', null, dayLabel(r.d, true) + (r.d === today ? ' (today)' : '')), el('td', null, num(r.m)), el('td', null, num(r.c)), el('td', null, num(r.mt)), el('td', null, num(r.ct)));
      tbody.append(tr);
    });
    t.replaceChildren(thead, tbody);
  }

  // ---------- growth: charts ----------
  function nice(x) {
    if (x <= 1) return 1;
    var e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  function drawCharts() {
    if (!series) return;
    var rows = windowRows();
    drawChart($('chart-members'), rows, state.mode === 'total' ? 'mt' : 'm', 'members', 'mt');
    drawChart($('chart-chapters'), rows, state.mode === 'total' ? 'ct' : 'c', 'chapters', 'ct');
  }
  function columnPath(x, y, w, base) {
    var r = Math.min(4, w / 2, base - y);
    if (base - y < 0.5) return '';
    return 'M' + x + ',' + base + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + base + 'Z';
  }
  function drawChart(card, rows, field, noun, totalField) {
    var box = card.querySelector('[data-chart]');
    var W = box.clientWidth, H = box.clientHeight;
    if (!W || !H) return;
    var total = state.mode === 'total';
    var m = { l: 38, r: 12, t: 18, b: 26 }, pw = W - m.l - m.r, ph = H - m.t - m.b, base = m.t + ph;
    var values = rows.map(function (r) { return r[field]; });
    var max = Math.max.apply(null, values.concat([1]));
    var step = nice(max / 4), top = Math.ceil(max / step) * step;
    var y = function (v) { return m.t + ph - v / top * ph; };
    var n = rows.length, slot = pw / n;
    var x = function (i) { return m.l + slot * (i + 0.5); };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', (noun === 'members' ? 'Members' : 'Chapters') + (total ? ' running total' : ' added per day') + ', ' + dayLabel(rows[0].d) + ' to today. Values are in the table below.');
    for (var t = 0; t <= top + 1e-9; t += step) {
      if (t > 0) s.append(svg('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }));
      var tick = svg('text', { class: 'tick', x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end' });
      tick.textContent = compact(t);
      s.append(tick);
    }
    var bars = [], cross, dot;
    if (total) {
      var pts = rows.map(function (r, i) { return x(i) + ',' + y(r[field]); });
      s.append(svg('path', { class: 'area', d: 'M' + x(0) + ',' + base + 'L' + pts.join('L') + 'L' + x(n - 1) + ',' + base + 'Z' }));
      s.append(svg('path', { class: 'line', d: 'M' + pts.join('L') }));
      var endLabel = svg('text', { class: 'label', x: Math.min(x(n - 1), W - m.r), y: y(values[n - 1]) - 10, 'text-anchor': 'end' });
      endLabel.textContent = num(values[n - 1]);
      s.append(endLabel);
      cross = svg('line', { class: 'cross', y1: m.t, y2: base, visibility: 'hidden' });
      dot = svg('circle', { class: 'dot', r: 4.5, visibility: 'hidden' });
      s.append(cross, dot);
    } else {
      var bw = Math.max(1, Math.min(24, slot * 0.72, slot - 2));
      var peak = values.indexOf(max);
      rows.forEach(function (r, i) {
        var p = svg('path', { class: 'bar' + (r.d === today ? ' today' : ''), d: columnPath(x(i) - bw / 2, y(r[field]), bw, base) });
        bars.push(p);
        s.append(p);
      });
      if (values[peak] > 0) {
        var pl = svg('text', { class: 'label', x: Math.max(m.l + 12, Math.min(W - m.r - 12, x(peak))), y: y(values[peak]) - 7, 'text-anchor': 'middle' });
        pl.textContent = num(values[peak]);
        s.append(pl);
      }
    }
    s.append(svg('line', { class: 'baseline', x1: m.l, x2: W - m.r, y1: base, y2: base }));
    var labels = n <= 8 && pw / n >= 44 ? n : Math.min(n, W < 520 ? 4 : 6);
    var picks = new Set();
    for (var k = 0; k < labels; k++) picks.add(Math.round(k * (n - 1) / Math.max(1, labels - 1)));
    picks.forEach(function (i) {
      var lx = x(i), anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      var label = svg('text', { class: 'tick', x: i === 0 ? Math.max(m.l, lx - slot / 2) : i === n - 1 ? Math.min(W - m.r, lx + slot / 2) : lx, y: H - 6, 'text-anchor': anchor });
      label.textContent = rows[i].d === today ? 'Today' : dayLabel(rows[i].d);
      s.append(label);
    });
    var hit = svg('rect', { class: 'hit', x: m.l, y: m.t, width: pw, height: ph });
    s.append(hit);
    box.replaceChildren(s);

    // Hover and keyboard: one readout per day, never the only way to a value.
    var active = -1, tip = $('chart-tooltip');
    function show(i, clientX, clientY) {
      if (active >= 0 && bars[active]) bars[active].classList.remove('hover');
      active = i;
      var r = rows[i];
      if (bars[i]) bars[i].classList.add('hover');
      if (cross) {
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(r[field])); dot.setAttribute('visibility', 'visible');
      }
      var strong = el('strong'), key = el('i');
      strong.append(key, document.createTextNode(total ? num(r[field]) + ' ' + noun : '+' + num(r[field]) + ' ' + noun));
      var when = el('span', null, dayLabel(r.d, true) + (r.d === today ? ' · today so far' : ''));
      var extra = el('span', null, total ? '+' + num(r[noun === 'members' ? 'm' : 'c']) + ' that day' : 'Running total ' + num(r[totalField]));
      tip.replaceChildren(strong, when, extra);
      tip.hidden = false;
      var rect = box.getBoundingClientRect();
      var px = clientX != null ? clientX : rect.left + x(i);
      var py = clientY != null ? clientY : rect.top + y(r[field]);
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(8, Math.min(innerWidth - tw - 8, px + 14)) + 'px';
      tip.style.top = Math.max(8, py - th - 12) + 'px';
    }
    function hide() {
      if (active >= 0 && bars[active]) bars[active].classList.remove('hover');
      if (cross) { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); }
      tip.hidden = true; active = -1;
    }
    var index = function (clientX) { return Math.max(0, Math.min(n - 1, Math.floor((clientX - box.getBoundingClientRect().left - m.l) / slot))); };
    hit.addEventListener('pointermove', function (e) { show(index(e.clientX), e.clientX, e.clientY); });
    hit.addEventListener('pointerleave', hide);
    box.tabIndex = 0;
    box.onfocus = function () { show(n - 1); };
    box.onblur = hide;
    box.onkeydown = function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      show(Math.max(0, Math.min(n - 1, (active < 0 ? n - 1 : active) + (e.key === 'ArrowLeft' ? -1 : 1))));
    };
  }

  // ---------- chapter grid ----------
  var SORTS = {
    members: function (a, b) { return b.joined - a.joined || a.name.localeCompare(b.name); },
    week: function (a, b) { return b.week - a.week || b.joined - a.joined; },
    progress: function (a, b) { return (b.target ? b.joined / b.target : 0) - (a.target ? a.joined / a.target : 0) || b.joined - a.joined; },
    newest: function (a, b) { return b.registered.localeCompare(a.registered) || b.joined - a.joined; },
    school: function (a, b) { return a.school.localeCompare(b.school) || b.joined - a.joined; }
  };
  function renderGrid() {
    list = chapters.filter(function (c) {
      if (state.type === 'other' ? c.type === 'Fraternity' || c.type === 'Sorority' : state.type !== 'all' && c.type !== state.type) return false;
      return !state.query || c.search.indexOf(state.query) >= 0;
    }).sort(SORTS[state.sort]);
    var grid = $('grid');
    $('chapter-count').textContent = list.length === chapters.length ? plural(chapters.length, 'chapter') : num(list.length) + ' of ' + plural(chapters.length, 'chapter') + ' match';
    if (!list.length) { grid.replaceChildren(el('li', 'empty', 'No chapters match that search.')); $('more').hidden = true; return; }
    grid.replaceChildren.apply(grid, list.slice(0, shown).map(card));
    $('more').hidden = shown >= list.length;
    $('more').textContent = 'Show more (' + num(list.length - shown) + ' left)';
  }
  function card(c) {
    var li = el('li'), b = el('button', 'card');
    b.type = 'button';
    b.style.backgroundImage = meshCSS(mesh(c));
    b.setAttribute('aria-label', c.name + ', ' + c.school + ': ' + plural(c.joined, 'member') + ' of ' + num(c.active) + ' actives. Open backdrop.');
    var pct = c.active ? Math.min(100, c.joined / c.active * 100) : 0;
    var track = el('span', 'track'), fill = el('b');
    fill.style.width = pct + '%';
    track.append(fill, el('i'));
    var progress = el('span', 'progress');
    progress.append(track, el('span', null, num(c.joined) + ' / ' + num(c.active)));
    var meta = el('span', 'meta');
    meta.append(el('span', 'name', c.name), el('span', 'school', c.short || c.school), progress);
    var top = el('span', 'top');
    top.append(el('span', 'letters' + (c.letters.length > 4 ? ' long' : ''), c.letters));
    if (c.logo) {
      var logo = el('span', 'logo'), img = el('img');
      img.src = '/fomocampustracker/logos/' + c.logo + '.webp';
      img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      logo.append(img);
      top.append(logo);
    }
    b.append(top);
    if (c.reachedOn) b.append(el('span', 'badge', '80% reached'));
    b.append(meta);
    b.addEventListener('click', function () { openViewer(c.id); });
    li.append(b);
    return li;
  }

  // ---------- mesh ----------
  // fomo ink with a soft fomo blue spotlight (the brand gradient), plus the
  // school's colors as large diffuse glows. Each glow's strength is capped so
  // the blend over ink stays dark enough for white type (luminance <= 0.19,
  // about fomo blue's own), and near-black or near-white school colors become
  // the deep indigo halo or a pale haze instead of a flat block.
  var INK = [11, 9, 31], BLUE = [81, 106, 246], ELECTRIC = [74, 54, 255], GLOW = [172, 184, 249], HALO = [34, 29, 75];
  var rgb = function (hex) { var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); return m ? [0, 2, 4].map(function (i) { return parseInt(m[1].slice(i, i + 2), 16); }) : null; };
  var lin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var lum = function (c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); };
  var mix = function (a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); };
  function cap(color, want) {
    if (lum(mix(INK, color, want)) <= 0.19) return want;
    var lo = 0, hi = want;
    for (var i = 0; i < 18; i++) { var mid = (lo + hi) / 2; if (lum(mix(INK, color, mid)) <= 0.19) lo = mid; else hi = mid; }
    return lo;
  }
  function seeded(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  function mesh(c) {
    var rand = seeded(c.id), j = function (s) { return (rand() - 0.5) * s; };
    var school = (c.colors || []).map(rgb).filter(Boolean).map(function (color) {
      var spread = Math.max.apply(null, color) - Math.min.apply(null, color);
      if (spread < 40 && lum(color) < 0.05) return { color: HALO, want: 0.95 };
      if (spread < 40 || lum(color) > 0.8) return { color: GLOW, want: 0.2 };
      return { color: color, want: 0.92 };
    });
    var blobs = [
      { color: ELECTRIC, x: 0.9 + j(0.1), y: 0.06 + j(0.08), r: 0.5, a: 0.5 },
      { color: BLUE, x: 0.5 + j(0.3), y: 1.02, r: 0.78, a: cap(BLUE, 0.9) }
    ];
    if (school[0]) blobs.push({ color: school[0].color, x: 0.16 + j(0.16), y: 0.12 + j(0.14), r: 0.86, a: cap(school[0].color, school[0].want) });
    if (school[1]) blobs.push({ color: school[1].color, x: 0.9 + j(0.12), y: 0.62 + j(0.16), r: 0.62, a: cap(school[1].color, school[1].want) });
    blobs.push({ color: GLOW, x: 0.34 + j(0.2), y: 0.5 + j(0.2), r: 0.36, a: cap(GLOW, 0.18) });
    return blobs;
  }
  var STOPS = [[0, 1], [0.25, 0.82], [0.5, 0.45], [0.75, 0.15], [1, 0]];
  var rgba = function (c, a) { return 'rgba(' + c.map(Math.round).join(',') + ',' + a.toFixed(3) + ')'; };
  function meshCSS(blobs) {
    return blobs.slice().reverse().map(function (b) {
      return 'radial-gradient(ellipse ' + Math.round(b.r * 140) + '% ' + Math.round(b.r * 140) + '% at ' + Math.round(b.x * 100) + '% ' + Math.round(b.y * 100) + '%, ' + STOPS.map(function (s) { return rgba(b.color, b.a * s[1]) + ' ' + s[0] * 100 + '%'; }).join(', ') + ')';
    }).join(', ');
  }
  var grain;
  function paintMesh(ctx, W, H, blobs) {
    ctx.fillStyle = rgba(INK, 1);
    ctx.fillRect(0, 0, W, H);
    var R = Math.max(W, H);
    blobs.forEach(function (b) {
      var g = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, b.r * R);
      STOPS.forEach(function (s) { g.addColorStop(s[0], rgba(b.color, b.a * s[1])); });
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
    // Fine grain keeps the large gradients from banding in the saved PNG.
    if (!grain) {
      var tile = document.createElement('canvas');
      tile.width = tile.height = 180;
      var t = tile.getContext('2d'), img = t.createImageData(180, 180);
      for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 10; }
      t.putImageData(img, 0, 0);
      grain = ctx.createPattern(tile, 'repeat');
    }
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- backdrop poster ----------
  var WORDMARK = Array.prototype.map.call(document.querySelectorAll('#wordmark path'), function (p) { return new Path2D(p.getAttribute('d')); });
  var LAYOUT = {
    post: { H: 1350, top: 88, bottom: 88, letters: 236, name: 64, school: 36, big: 150, chartMin: 220 },
    story: { H: 1920, top: 210, bottom: 230, letters: 300, name: 76, school: 42, big: 190, chartMin: 420 }
  };
  var fontsReady;
  function font(weight, size) { return weight + ' ' + size + 'px Aeonik, "Schibsted Grotesk", Arial, sans-serif'; }
  function fit(ctx, text, weight, size, maxW, min) {
    var s = size;
    ctx.font = font(weight, s);
    while (s > min && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = font(weight, s); }
    return s;
  }
  function wrap(ctx, text, maxW, lines) {
    var words = text.split(/\s+/), out = [''];
    words.forEach(function (w) {
      var line = out[out.length - 1], next = line ? line + ' ' + w : w;
      if (ctx.measureText(next).width <= maxW || !line) out[out.length - 1] = next;
      else out.push(w);
    });
    if (out.length > lines) {
      out = out.slice(0, lines);
      var last = out[lines - 1];
      while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      out[lines - 1] = last.replace(/\s+$/, '') + '…';
    }
    return out;
  }
  function spacing(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }

  function renderPoster(canvas, c, format) {
    var L = LAYOUT[format], W = 1080, H = L.H, pad = 88, inner = W - pad * 2;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    paintMesh(ctx, W, H, mesh(c));
    var white = '#ffffff', soft = 'rgba(234,237,255,.76)', faint = 'rgba(234,237,255,.6)';
    ctx.textBaseline = 'alphabetic';

    // lockup + season
    var markH = 38, scale = markH / 113;
    ctx.save(); ctx.translate(pad, L.top); ctx.scale(scale, scale); ctx.fillStyle = white;
    WORDMARK.forEach(function (p) { ctx.fill(p); });
    ctx.restore();
    spacing(ctx, -1);
    ctx.font = font(400, 40); ctx.fillStyle = faint; ctx.textAlign = 'left';
    ctx.fillText('/campus', pad + 352 * scale + 10, L.top + markH - 1);
    ctx.font = font(500, 28); ctx.fillStyle = soft; ctx.textAlign = 'right';
    spacing(ctx, 0);
    ctx.fillText('Greek Wars · Fall 2026', W - pad, L.top + markH - 4);
    ctx.textAlign = 'left';

    // letters, name, school
    var y = L.top + markH + (format === 'story' ? 130 : 96);
    var ls = fit(ctx, c.letters, 700, L.letters, inner, 90);
    spacing(ctx, -ls * 0.03);
    ctx.font = font(700, ls); ctx.fillStyle = white;
    var asc = ctx.measureText(c.letters).actualBoundingBoxAscent;
    y += asc; ctx.fillText(c.letters, pad - ls * 0.03, y);
    y += format === 'story' ? 70 : 48;
    spacing(ctx, -1.5);
    ctx.font = font(500, L.name);
    wrap(ctx, c.name, inner, 2).forEach(function (line, i) {
      y += i ? L.name * 1.14 : L.name * 0.74;
      ctx.fillText(line, pad, y);
    });
    spacing(ctx, -0.5);
    ctx.font = font(400, L.school); ctx.fillStyle = soft;
    y += L.school * 1.5;
    ctx.fillText(wrap(ctx, c.school, inner, 1)[0], pad, y);

    // progress
    y += format === 'story' ? 120 : 104;
    var big = num(c.joined);
    spacing(ctx, -L.big * 0.03);
    ctx.font = font(700, L.big); ctx.fillStyle = white;
    var bigW = ctx.measureText(big).width;
    y += ctx.measureText(big).actualBoundingBoxAscent;
    ctx.fillText(big, pad, y);
    spacing(ctx, -0.5);
    ctx.font = font(500, 36); ctx.fillStyle = white;
    ctx.fillText(c.joined === 1 ? 'member joined' : 'members joined', pad + bigW + 28, y - 48);
    ctx.font = font(400, 34); ctx.fillStyle = soft;
    ctx.fillText('of ' + num(c.active) + ' actives', pad + bigW + 28, y - 2);

    y += 40;
    var barH = 16, pct = c.active ? Math.min(1, c.joined / c.active) : 0;
    ctx.fillStyle = 'rgba(234,237,255,.2)';
    roundRect(ctx, pad, y, inner, barH, barH / 2); ctx.fill();
    if (pct > 0) { ctx.fillStyle = white; roundRect(ctx, pad, y, Math.max(barH, inner * pct), barH, barH / 2); ctx.fill(); }
    if (c.target) {
      var tx = pad + inner * 0.8;
      ctx.fillStyle = c.joined >= c.target ? 'rgba(11,9,31,.55)' : 'rgba(234,237,255,.9)';
      ctx.fillRect(tx - 1.5, y - 8, 3, barH + 16);
    }
    y += barH + 50;
    ctx.font = font(500, 32); ctx.fillStyle = white;
    var status = !c.target ? '' : c.reachedOn ? '80% reached ' + dayLabel(c.reachedOn) : num(c.target - c.joined) + ' to go to 80% (' + num(c.target) + ')';
    ctx.fillText(status, pad, y);
    ctx.textAlign = 'right'; ctx.font = font(400, 30); ctx.fillStyle = soft;
    if (c.active) ctx.fillText(Math.round(c.joined / c.active * 100) + '% of roster', W - pad, y);
    ctx.textAlign = 'left';

    // timeline
    var footY = H - L.bottom;
    var chartTop = y + (format === 'story' ? 110 : 76), chartBottom = footY - (format === 'story' ? 124 : 104);
    if (chartBottom - chartTop < L.chartMin * 0.6) chartTop = chartBottom - L.chartMin * 0.6;
    timeline(ctx, c, pad, chartTop, inner, chartBottom - chartTop);

    // footer
    ctx.font = font(400, 26); ctx.fillStyle = faint;
    ctx.fillText('fomocampus.com', pad, footY);
    ctx.textAlign = 'right';
    ctx.fillText('Updated ' + dayLabel(today, true), W - pad, footY);
    ctx.textAlign = 'left';
    spacing(ctx, 0);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function timeline(ctx, c, x0, y0, w, h) {
    var first = c.days.length && c.days[0][0] < c.registered ? c.days[0][0] : c.registered;
    var byDay = new Map(c.days), pts = [[0, 0]], total = 0, n = 0;
    for (var d = first; d <= today; d = addDays(d, 1)) { total += byDay.get(d) || 0; n++; pts.push([n, total]); }
    var top = Math.max(c.target, total, 1) * 1.3;
    var X = function (i) { return x0 + i / n * w; }, Y = function (v) { return y0 + h - v / top * h; };
    ctx.font = font(500, 28); ctx.fillStyle = 'rgba(234,237,255,.76)';
    ctx.fillText('Members since registering', x0, y0 - 26);
    // baseline, and the 80% line keyed in the title row so it never meets the data
    ctx.fillStyle = 'rgba(234,237,255,.25)';
    ctx.fillRect(x0, y0 + h, w, 2);
    if (c.target) {
      ctx.fillStyle = 'rgba(234,237,255,.5)';
      ctx.fillRect(x0, Math.round(Y(c.target)) - 1, w, 2);
      ctx.font = font(400, 26); ctx.fillStyle = 'rgba(234,237,255,.76)'; ctx.textAlign = 'right';
      var key = '80% mark · ' + num(c.target);
      ctx.fillText(key, x0 + w, y0 - 26);
      ctx.fillStyle = 'rgba(234,237,255,.5)';
      ctx.fillRect(x0 + w - ctx.measureText(key).width - 46, y0 - 35, 32, 2);
      ctx.textAlign = 'left';
    }
    if (!total) {
      ctx.font = font(400, 30); ctx.fillStyle = 'rgba(234,237,255,.76)'; ctx.textAlign = 'center';
      ctx.fillText('First members coming soon', x0 + w / 2, y0 + h / 2);
      ctx.textAlign = 'left';
    } else {
      var fill = ctx.createLinearGradient(0, y0, 0, y0 + h);
      fill.addColorStop(0, 'rgba(255,255,255,.26)'); fill.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      pts.forEach(function (p) { ctx.lineTo(X(p[0]), Y(p[1])); });
      ctx.lineTo(X(n), y0 + h); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      ctx.beginPath();
      pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); });
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      var marker = function (i, v) {
        ctx.beginPath(); ctx.arc(X(i), Y(v), 11, 0, Math.PI * 2); ctx.fillStyle = '#0b091f'; ctx.fill();
        ctx.beginPath(); ctx.arc(X(i), Y(v), 7, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      };
      if (c.reachedOn) {
        var ri = Math.round((utc(c.reachedOn) - utc(first)) / 864e5) + 1;
        if (ri < n) marker(ri, pts[ri][1]);
      }
      marker(n, total);
      ctx.font = font(700, 40); ctx.fillStyle = '#ffffff'; ctx.textAlign = 'right';
      var gap = c.target ? Y(total) - Y(c.target) : 0; // the 80% line's height above the end dot
      ctx.fillText(num(total), X(n) - 4, gap > 18 && gap < 64 ? Y(total) + 58 : Y(total) - 26);
      ctx.textAlign = 'left';
    }
    ctx.font = font(400, 26); ctx.fillStyle = 'rgba(234,237,255,.76)';
    ctx.fillText('Registered ' + dayLabel(c.registered), x0, y0 + h + 42);
    ctx.textAlign = 'right';
    ctx.fillText(n > 1 ? 'Today · day ' + num(n) : 'Today', x0 + w, y0 + h + 42);
    ctx.textAlign = 'left';
  }

  // ---------- viewer ----------
  var current = null;
  function openViewer(id) {
    var c = chapters.find(function (x) { return x.id === id; });
    if (!c) return;
    current = c;
    if (list.indexOf(c) < 0) { state.query = ''; $('search').value = ''; state.type = 'all'; renderGrid(); }
    var viewer = $('viewer');
    $('viewer-mesh').style.backgroundImage = meshCSS(mesh(c));
    $('viewer-name').textContent = c.name;
    var school = $('viewer-school');
    school.replaceChildren(document.createTextNode(c.school + ' · ' + c.type));
    var i = list.indexOf(c);
    $('viewer-position').textContent = num(i + 1) + ' of ' + num(list.length);
    var facts = [
      ['Members joined', num(c.joined)],
      ['Active roster', num(c.active)],
      ['80% mark', c.target ? num(c.target) : '—'],
      [c.reachedOn ? 'Reached 80%' : 'To go to 80%', c.reachedOn ? dayLabel(c.reachedOn) : c.target ? num(Math.max(0, c.target - c.joined)) : '—'],
      ['Registered', dayLabel(c.registered, true)],
      ['Last 7 days', '+' + num(c.week)],
      ['Best day', c.best ? dayLabel(c.best[0]) + ' · ' + num(c.best[1]) : '—'],
      ['Roster joined', (c.active ? Math.round(c.joined / c.active * 100) : 0) + '%']
    ];
    $('facts').replaceChildren.apply($('facts'), facts.map(function (f) {
      var d = el('div'); d.append(el('dt', null, f[0]), el('dd', null, f[1])); return d;
    }));
    var table = $('chapter-days'), head = el('tr'), body = el('tbody'), running = 0;
    ['Day', 'Joined', 'Total'].forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; head.append(th); });
    var rows = c.days.map(function (x) { running += x[1]; return [x[0], x[1], running]; }).reverse();
    rows.forEach(function (r) { var tr = el('tr'); tr.append(el('td', null, dayLabel(r[0], true)), el('td', null, num(r[1])), el('td', null, num(r[2]))); body.append(tr); });
    if (!rows.length) { var tr = el('tr'), td = el('td', null, 'No members yet'); td.colSpan = 3; tr.append(td); body.append(tr); }
    var thead = el('thead'); thead.append(head);
    table.replaceChildren(thead, body);
    $('save-note').textContent = '';
    if (!viewer.open) viewer.showModal();
    history.replaceState(null, '', '#chapter=' + encodeURIComponent(c.id));
    drawPoster();
  }
  async function drawPoster() {
    if (!current) return;
    var c = current, canvas = $('poster');
    if (!fontsReady) fontsReady = Promise.all(['400', '500', '700'].map(function (w) { return document.fonts.load(w + ' 100px Aeonik'); })).catch(function () {});
    await fontsReady;
    if (c !== current) return;
    renderPoster(canvas, c, state.format);
    canvas.setAttribute('aria-label', 'Backdrop for ' + c.name + ', ' + c.school + ': ' + plural(c.joined, 'member') + ' joined of ' + num(c.active) + ' actives' + (c.reachedOn ? ', 80% reached ' + dayLabel(c.reachedOn) : '') + '.');
  }
  function step(by) {
    if (!current || !list.length) return;
    var i = list.indexOf(current);
    openViewer(list[(i + by + list.length) % list.length].id);
  }
  $('prev').addEventListener('click', function () { step(-1); });
  $('next').addEventListener('click', function () { step(1); });
  $('close').addEventListener('click', function () { $('viewer').close(); });
  $('viewer').addEventListener('close', function () {
    current = null;
    history.replaceState(null, '', location.pathname + location.search);
  });
  $('viewer').addEventListener('keydown', function (e) {
    if (e.target.closest('input, select, textarea, summary')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });
  $('save').addEventListener('click', function () {
    if (!current) return;
    var slug = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
    var c = current, note = $('save-note'), name = ['fomo-campus', slug(c.name), slug(c.short || c.school), state.format].join('-') + '.png';
    $('poster').toBlob(async function (blob) {
      if (!blob) { note.textContent = 'The image couldn’t be made. Try again.'; return; }
      var file = new File([blob], name, { type: 'image/png' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: c.name }); note.textContent = ''; return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
      var url = URL.createObjectURL(blob), a = el('a');
      a.href = url; a.download = name;
      document.body.append(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      note.textContent = 'Saved ' + name;
    }, 'image/png');
  });

  function route() {
    var m = /^#chapter=(.+)$/.exec(location.hash);
    if (m) openViewer(decodeURIComponent(m[1]));
  }
  addEventListener('hashchange', function () { if (data) route(); });
})();
