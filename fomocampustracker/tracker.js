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
  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var weekdayOf = function (d) { return new Date(utc(d)).getUTCDay(); };
  var weekdayShort = function (d) { return WEEKDAYS[weekdayOf(d)].slice(0, 3); };

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
  // day: a day picked on the network chart, which filters the chapter grid
  var state = { range: '7', mode: 'daily', metric: 'm', day: null, type: 'all', sort: 'members', query: '', format: 'post' };
  // Backdrops open wide (16:9) on computers; phones keep the 4:5 post.
  if (matchMedia('(min-width: 901px)').matches) {
    state.format = 'web';
    document.querySelectorAll('#format button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.format === 'web')); });
  }

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
      ch.days = ch.days.filter(function (x) { return x[1] > 0; }); // only days with joins
      var target = ch.active ? Math.ceil(ch.active * 0.8) : 0, total = 0, reachedOn = null, week = 0, best = null;
      ch.days.forEach(function (x) {
        total += x[1];
        if (!reachedOn && target && total >= target) reachedOn = x[0];
        if (x[0] >= weekStart) week += x[1];
        if (!best || x[1] > best[1]) best = x;
      });
      return Object.assign({}, ch, { target: target, reachedOn: reachedOn, week: week, best: best, byDay: new Map(ch.days), search: (ch.name + ' ' + ch.letters + ' ' + ch.school + ' ' + ch.short).toLowerCase() });
    });

    $('lock-view').hidden = true;
    $('app').hidden = false;
    $('header-meta').hidden = false;
    $('updated').textContent = 'Updated ' + new Date(data.updatedAt).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET';
    renderGrowth();
    renderGrid();
    new ResizeObserver(function () { drawCharts(); }).observe($('chart-network'));
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
  segmented('metric', 'metric', renderGrowth);
  // The chart sections start closed; Show opens one and draws it at its real size.
  document.querySelectorAll('[data-reveal]').forEach(function (b) {
    b.addEventListener('click', function () {
      var body = $(b.getAttribute('aria-controls')), open = body.hidden;
      body.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      if (open) drawCharts();
    });
  });
  $('day-filter-clear').addEventListener('click', function () { state.day = null; shown = PAGE; renderGrid(); });
  segmented('type', 'type', function () { shown = PAGE; renderGrid(); });
  segmented('format', 'format', function () { drawBackdrop(); });
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
    drawCharts();
    renderTable(rows);
    renderWeekly(rows);
  }

  // ---------- weekly rhythm ----------
  // One line per calendar week (Monday to Sunday, New York days), overlaid so
  // the strong weekdays line up. Weeks are ordered in time, so they share one
  // blue ramp: older weeks lighter, the current week darkest. Every week that
  // touches the selected range is shown, from the same day series as above.
  var weekly = null;
  var weekStart = function (d) { return addDays(d, -((weekdayOf(d) + 6) % 7)); };
  var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  function weekColor(t) {
    var a = [158, 172, 249], b = [43, 51, 168]; // #9eacf9 → #2b33a8, validated ordinal
    return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')';
  }
  function renderWeekly(rows) {
    var byDay = new Map(series.map(function (r) { return [r.d, r.m]; }));
    var weeks = [];
    for (var ws = weekStart(rows[0].d); ws <= today; ws = addDays(ws, 7)) {
      var vals = [0, 1, 2, 3, 4, 5, 6].map(function (k) { var d = addDays(ws, k); return d <= today && byDay.has(d) ? byDay.get(d) : null; });
      weeks.push({ start: ws, vals: vals, current: addDays(ws, 7) > today });
    }
    weeks.forEach(function (w, i) { w.color = weekColor(weeks.length === 1 ? 1 : i / (weeks.length - 1)); w.label = w.current ? 'This week' : 'Week of ' + dayLabel(w.start); });
    var sums = new Array(7).fill(0), seen = new Array(7).fill(0), all = 0;
    weeks.forEach(function (w) { w.vals.forEach(function (v, k) { if (v != null) { sums[k] += v; seen[k]++; all += v; } }); });
    var share = function (n) { return all ? (n / all * 100).toFixed(1).replace(/\.0$/, '') + '%' : '0%'; };
    var busy = sums.indexOf(Math.max.apply(null, sums));
    var quiet = sums.reduce(function (q, v, k) { return seen[k] && (q < 0 || v < sums[q]) ? k : q; }, -1);
    var firstDay = series.find(function (r) { return r.d >= weeks[0].start; }).d;
    var tiles = [
      ['Busiest weekday', all ? WEEKDAYS[DAY_ORDER[busy]] : '—', all ? num(sums[busy]) + ' joins · ' + share(sums[busy]) + ' of joins' : 'No joins yet', true],
      ['Quietest weekday', all && quiet >= 0 ? WEEKDAYS[DAY_ORDER[quiet]] : '—', all && quiet >= 0 ? num(sums[quiet]) + ' joins · ' + share(sums[quiet]) + ' of joins' : ''],
      ['Weekend share', share(sums[5] + sums[6]), 'Two days of seven would be 29%'],
      ['Member joins', num(all), plural(weeks.length, 'week') + ' · ' + dayLabel(firstDay) + ' to ' + dayLabel(today)]
    ];
    var stats = $('weekly-stats');
    stats.replaceChildren.apply(stats, tiles.map(function (t) {
      var tile = el('div', 'stat' + (t[3] ? ' hero' : ''));
      tile.append(el('span', null, t[0]), el('strong', null, t[1]), el('small', null, t[2]));
      return tile;
    }));
    $('weekly-sub').textContent = plural(weeks.length, 'week') + ' overlaid, Monday to Sunday';
    weekly = { weeks: weeks, sums: sums, seen: seen, share: share, focus: -1 };

    // legend: one chip per week, newest first; hovering one picks out its line
    var legend = $('week-legend');
    legend.replaceChildren.apply(legend, weeks.slice().reverse().map(function (w) {
      var chip = el('span', 'wk-chip'), key = el('i');
      key.style.background = w.color;
      chip.append(key, document.createTextNode(w.current ? 'This week' : dayLabel(w.start)));
      chip.onpointerenter = function () { weekly.focus = weeks.indexOf(w); paintWeeks(); };
      chip.onpointerleave = function () { weekly.focus = -1; paintWeeks(); };
      return chip;
    }));
    drawWeekly();

    var table = $('weekly-table'), head = el('tr'), body = el('tbody');
    ['Week of'].concat(DAY_ORDER.map(function (wd) { return WEEKDAYS[wd].slice(0, 3); }), ['Total']).forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; head.append(th); });
    weeks.slice().reverse().forEach(function (w) {
      var tr = el('tr');
      tr.append(el('td', null, dayLabel(w.start, true) + (w.current ? ' (this week)' : '')));
      w.vals.forEach(function (v) { tr.append(el('td', null, v == null ? '—' : num(v))); });
      tr.append(el('td', null, num(w.vals.reduce(function (s, v) { return s + (v || 0); }, 0))));
      body.append(tr);
    });
    var foot = el('tr');
    foot.append(el('td', null, 'All weeks'));
    sums.forEach(function (v) { foot.append(el('td', null, num(v))); });
    foot.append(el('td', null, num(all)));
    body.append(foot);
    var thead = el('thead'); thead.append(head);
    table.replaceChildren(thead, body);
  }
  // Line emphasis: the focused week stands out, the others step back.
  function paintWeeks() {
    var svgEl = $('chart-weekly').querySelector('svg');
    if (!svgEl || !weekly) return;
    svgEl.classList.toggle('focusing', weekly.focus >= 0);
    svgEl.querySelectorAll('.wk-line').forEach(function (p) { p.classList.toggle('on', Number(p.dataset.i) === weekly.focus); });
    $('week-legend').querySelectorAll('.wk-chip').forEach(function (chip, j) { chip.classList.toggle('on', weekly.weeks.length - 1 - j === weekly.focus); });
  }
  function drawWeekly() {
    if (!weekly) return;
    var box = $('chart-weekly').querySelector('[data-chart]'), W = box.clientWidth, H = box.clientHeight;
    if (!W || !H) return;
    var weeks = weekly.weeks, m = { l: 38, r: 26, t: 22, b: 26 }, pw = W - m.l - m.r, ph = H - m.t - m.b, base = m.t + ph, inset = 24;
    var max = 1;
    weeks.forEach(function (w) { w.vals.forEach(function (v) { if (v > max) max = v; }); });
    var step = nice(max / 4), top = Math.ceil(max / step) * step;
    var x = function (k) { return m.l + inset + (pw - inset * 2) * k / 6; }, y = function (v) { return m.t + ph - v / top * ph; };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Member joins on each weekday, one line per week, Monday to Sunday. Values are in the table below.');
    for (var t = 0; t <= top + 1e-9; t += step) {
      if (t > 0) s.append(svg('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }));
      var tick = svg('text', { class: 'tick', x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end' });
      tick.textContent = compact(t);
      s.append(tick);
    }
    s.append(svg('line', { class: 'baseline', x1: m.l, x2: W - m.r, y1: base, y2: base }));
    weeks.forEach(function (w, i) {
      var d = '', pen = 'M';
      w.vals.forEach(function (v, k) { if (v == null) { pen = 'M'; return; } d += pen + x(k) + ',' + y(v); pen = 'L'; });
      if (!d) return;
      var p = svg('path', { class: 'wk-line' + (w.current ? ' current' : ''), d: d, stroke: w.color });
      p.dataset.i = i;
      s.append(p);
      if (w.current) {
        var k = w.vals.reduce(function (last, v, j) { return v == null ? last : j; }, -1);
        if (k >= 0) s.append(svg('circle', { class: 'dot', cx: x(k), cy: y(w.vals[k]), r: 4.5, fill: w.color, style: 'fill:' + w.color }));
      }
    });
    DAY_ORDER.forEach(function (wd, k) {
      var label = svg('text', { class: 'tick', x: x(k), y: H - 6, 'text-anchor': 'middle' });
      label.textContent = WEEKDAYS[wd].slice(0, 3);
      s.append(label);
    });
    var cross = svg('line', { class: 'cross', y1: m.t, y2: base, visibility: 'hidden' });
    s.append(cross);
    var hit = svg('rect', { class: 'hit', x: 0, y: m.t, width: W, height: ph });
    s.append(hit);
    box.replaceChildren(s);
    paintWeeks();

    // One readout per weekday listing every week; the line nearest the pointer leads.
    var active = -1, tip = $('chart-tooltip');
    function show(k, pointerY) {
      active = k;
      var withValue = weeks.map(function (w, i) { return { w: w, i: i, v: w.vals[k] }; }).filter(function (r) { return r.v != null; });
      if (pointerY != null && withValue.length) {
        weekly.focus = withValue.reduce(function (a, b) { return Math.abs(y(b.v) - pointerY) < Math.abs(y(a.v) - pointerY) ? b : a; }).i;
      }
      paintWeeks();
      cross.setAttribute('x1', x(k)); cross.setAttribute('x2', x(k)); cross.setAttribute('visibility', 'visible');
      var wd = DAY_ORDER[k], head = el('span', 'tt-head', WEEKDAYS[wd] + ' · ' + plural(weekly.sums[k], 'join') + (weekly.seen[k] > 1 ? ' · ' + num(Math.round(weekly.sums[k] / weekly.seen[k])) + ' a week on average' : ''));
      var lines = withValue.slice().reverse().map(function (r) {
        var row = el('span', 'tt-row' + (r.i === weekly.focus ? ' on' : '')), key = el('i');
        key.style.background = r.w.color;
        row.append(key, el('b', null, num(r.v)), el('em', null, r.w.label));
        return row;
      });
      tip.replaceChildren.apply(tip, [head].concat(lines.length ? lines : [el('span', 'tt-row', 'No days in range')]));
      tip.hidden = false;
      var rect = box.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      var left = rect.left + x(k) + 18;
      tip.style.left = (left + tw > innerWidth - 8 ? rect.left + x(k) - tw - 18 : left) + 'px';
      tip.style.top = Math.max(8, Math.min(innerHeight - th - 8, rect.top + m.t)) + 'px';
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; active = -1; weekly.focus = -1; paintWeeks(); }
    var index = function (e) { return Math.max(0, Math.min(6, Math.round((e.clientX - box.getBoundingClientRect().left - m.l - inset) / (pw - inset * 2) * 6))); };
    hit.addEventListener('pointermove', function (e) { show(index(e), e.clientY - box.getBoundingClientRect().top); });
    hit.addEventListener('pointerleave', hide);
    box.tabIndex = 0;
    box.onfocus = function () { weekly.focus = weeks.length - 1; show(0); };
    box.onblur = hide;
    box.onkeydown = function (e) {
      var k = active < 0 ? 0 : active;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show(Math.max(0, Math.min(6, k + (e.key === 'ArrowLeft' ? -1 : 1)))); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); weekly.focus = (Math.max(0, weekly.focus) + (e.key === 'ArrowUp' ? 1 : -1) + weeks.length) % weeks.length; show(k); }
    };
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
    drawNetwork(windowRows());
    drawWeekly();
  }
  function columnPath(x, y, w, base) {
    var r = Math.min(4, w / 2, base - y);
    if (base - y < 0.5) return '';
    return 'M' + x + ',' + base + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + base + 'Z';
  }
  // The network chart (eyes' "the network takes shape"): members or chapters,
  // added per day or as a running total, a weekday under every bar. Clicking
  // a day filters the chapter grid to that day.
  function drawNetwork(rows) {
    var box = $('chart-network').querySelector('[data-chart]');
    var W = box.clientWidth, H = box.clientHeight;
    if (!W || !H) return;
    var members = state.metric === 'm', growth = state.mode === 'total';
    var daily = state.metric, field = growth ? daily + 't' : daily, noun = members ? 'member' : 'chapter';
    var inView = rows.reduce(function (s, r) { return s + r[daily]; }, 0);
    $('network-total').textContent = num(growth ? rows[rows.length - 1][field] : inView);
    $('network-label').textContent = growth ? (members ? 'members in total' : 'chapters in total') : (members ? 'member signups in view' : 'chapter registrations in view');
    $('network-from').textContent = dayLabel(rows[0].d);
    $('network-to').textContent = rows[rows.length - 1].d === today ? 'Today' : dayLabel(rows[rows.length - 1].d);
    $('network-caption').textContent = (members ? 'Member signups' : 'Chapter registrations') + (growth ? ', running total' : ', per day') + ' · New York days';

    var m = { l: 40, r: 12, t: 22, b: 28 }, pw = W - m.l - m.r, ph = H - m.t - m.b, base = m.t + ph;
    var values = rows.map(function (r) { return r[field]; });
    var max = Math.max.apply(null, values.concat([1]));
    var step = nice(max / 4), top = Math.ceil(max / step) * step;
    var y = function (v) { return m.t + ph - v / top * ph; };
    var n = rows.length, slot = pw / n;
    var x = function (i) { return m.l + slot * (i + 0.5); };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', (members ? 'Member signups' : 'Chapter registrations') + (growth ? ', running total' : ' per day') + ', ' + dayLabel(rows[0].d) + ' to today. Values are in the table below.');
    for (var t = 0; t <= top + 1e-9; t += step) {
      if (t > 0) s.append(svg('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }));
      var tick = svg('text', { class: 'tick', x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end' });
      tick.textContent = compact(t);
      s.append(tick);
    }
    var bars = [], cross, dot;
    if (growth) {
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
      var bw = Math.max(1, Math.min(40, slot * 0.8, slot - 2));
      var peak = values.indexOf(max);
      rows.forEach(function (r, i) {
        var p = svg('path', { class: 'bar' + (r.d === today ? ' today' : '') + (state.day && state.day.d === r.d && state.day.metric === daily ? ' picked' : ''), d: columnPath(x(i) - bw / 2, y(r[field]), bw, base) });
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
    // a weekday under every day: the name when it fits, else its first letter
    var short = slot >= 30;
    if (slot >= 11) rows.forEach(function (r, i) {
      var wd = weekdayOf(r.d), label = svg('text', { class: 'tick weekday' + (wd === 0 || wd === 6 ? ' weekend' : ''), x: x(i), y: H - 8, 'text-anchor': 'middle' });
      label.textContent = short ? weekdayShort(r.d) : weekdayShort(r.d).charAt(0);
      s.append(label);
    });
    var hit = svg('rect', { class: 'hit pick', x: m.l, y: m.t, width: pw, height: ph + m.b });
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
      strong.append(key, document.createTextNode((growth ? num(r[field]) : '+' + num(r[daily])) + ' ' + noun + (growth || r[daily] !== 1 ? 's' : '')));
      var when = el('span', null, weekdayShort(r.d) + ', ' + dayLabel(r.d, true) + (r.d === today ? ' · today so far' : ''));
      var extra = el('span', null, growth ? '+' + num(r[daily]) + ' that day' : 'Running total ' + num(r[daily + 't']));
      var hint = el('span', 'tip-hint', r[daily] ? 'Click to see these chapters' : '');
      tip.replaceChildren(strong, when, extra, hint);
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
    hit.addEventListener('click', function (e) { var r = rows[index(e.clientX)]; if (r[daily]) { hide(); filterDay(r.d); } });
    box.tabIndex = 0;
    box.onfocus = function () { show(n - 1); };
    box.onblur = hide;
    box.onkeydown = function (e) {
      if (e.key === 'Enter' && active >= 0 && rows[active][daily]) { e.preventDefault(); filterDay(rows[active].d); return; }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      show(Math.max(0, Math.min(n - 1, (active < 0 ? n - 1 : active) + (e.key === 'ArrowLeft' ? -1 : 1))));
    };
  }
  // Show the chapters behind a day: registered that day, or with joins that day.
  function filterDay(d) {
    state.day = { d: d, metric: state.metric };
    shown = PAGE;
    renderGrid();
    drawCharts();
    $('chapters-title').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
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
    var day = state.day;
    var onDay = function (c) { return day.metric === 'c' ? c.registered === day.d : c.byDay.has(day.d); };
    list = chapters.filter(function (c) {
      if (state.type === 'other' ? c.type === 'Fraternity' || c.type === 'Sorority' : state.type !== 'all' && c.type !== state.type) return false;
      if (day && !onDay(c)) return false;
      return !state.query || c.search.indexOf(state.query) >= 0;
    }).sort(day && day.metric === 'm' ? function (a, b) { return b.byDay.get(day.d) - a.byDay.get(day.d) || SORTS[state.sort](a, b); } : SORTS[state.sort]);
    $('day-filter').hidden = !day;
    if (day) $('day-filter-text').textContent = (day.metric === 'c' ? 'Registered ' : 'Members joined ') + weekdayShort(day.d) + ', ' + dayLabel(day.d);
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
      img.src = '/fomocampustracker/logos/' + c.logo + '.webp?v=' + LOGO_V;
      img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      logo.append(img);
      top.append(logo);
    }
    b.append(top);
    var dayJoins = state.day && state.day.metric === 'm' ? c.byDay.get(state.day.d) : 0;
    if (dayJoins) b.append(el('span', 'badge', '+' + num(dayJoins) + ' on ' + dayLabel(state.day.d)));
    else if (c.reachedOn) b.append(el('span', 'badge', '80% reached'));
    b.append(meta);
    b.addEventListener('click', function () { openViewer(c.id); });
    li.append(b);
    return li;
  }

  // ---------- mesh ----------
  // fomo ink with a soft fomo blue spotlight (the brand gradient), plus the
  // school's colors as large diffuse glows. Each glow's strength is capped so
  // the blend over ink stays dark and calm under white type (luminance <= 0.1,
  // about 7:1 against white), and near-black or near-white school colors
  // become the deep indigo halo or a pale haze instead of a flat block.
  var LIMIT = 0.1;
  var INK = [11, 9, 31], BLUE = [81, 106, 246], ELECTRIC = [74, 54, 255], GLOW = [172, 184, 249], HALO = [34, 29, 75];
  var rgb = function (hex) { var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); return m ? [0, 2, 4].map(function (i) { return parseInt(m[1].slice(i, i + 2), 16); }) : null; };
  var lin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var lum = function (c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); };
  var mix = function (a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); };
  function cap(color, want) {
    if (lum(mix(INK, color, want)) <= LIMIT) return want;
    var lo = 0, hi = want;
    for (var i = 0; i < 18; i++) { var mid = (lo + hi) / 2; if (lum(mix(INK, color, mid)) <= LIMIT) lo = mid; else hi = mid; }
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
      { color: ELECTRIC, x: 0.9 + j(0.1), y: 0.06 + j(0.08), r: 0.5, a: 0.4 },
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
  // Fine grain keeps the large gradients from banding in the saved PNG.
  var grainURL;
  function grainTile() {
    if (grainURL) return grainURL;
    var tile = document.createElement('canvas');
    tile.width = tile.height = 180;
    var t = tile.getContext('2d'), img = t.createImageData(180, 180);
    for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 12; }
    t.putImageData(img, 0, 0);
    return (grainURL = tile.toDataURL('image/png'));
  }

  // ---------- backdrop ----------
  // One SVG per chapter (16:9 web, 4:5 post or 9:16 story). On screen it is
  // live, made for screen recordings: it animates in, and hovering the
  // timeline, the progress bar or the 80% mark shows the numbers. Save image
  // serializes the same SVG, with the fonts and the logo inlined, to a PNG.
  var LOGO_V = 2; // bump when the logo files change; images are cached a day
  var LAYOUT = {
    web: { W: 1920, H: 1080, m: 112, top: 92, bottom: 92, mark: 40, wide: true, col: 740, gutter: 96, letters: 210, name: 60, big: 140, pad: 44 },
    post: { W: 1080, H: 1350, m: 84, top: 84, bottom: 84, mark: 36, letters: 200, name: 56, big: 128, pad: 36 },
    story: { W: 1080, H: 1920, m: 84, top: 210, bottom: 230, mark: 36, letters: 250, name: 66, big: 156, pad: 40, facts: true }
  };
  var WHITE = '#ffffff', SOFT = 'rgba(234,237,255,.78)', FAINT = 'rgba(234,237,255,.6)';
  var FONT = 'Aeonik, "Schibsted Grotesk", Arial, sans-serif';
  var WORDMARK = Array.prototype.map.call(document.querySelectorAll('#wordmark path'), function (p) { return p.getAttribute('d'); });
  var measure = document.createElement('canvas').getContext('2d');
  function textWidth(text, weight, size, track) {
    measure.font = weight + ' ' + size + 'px ' + FONT;
    if ('letterSpacing' in measure) measure.letterSpacing = (track || 0) + 'px';
    return measure.measureText(text).width;
  }
  function ascent(text, weight, size) {
    measure.font = weight + ' ' + size + 'px ' + FONT;
    if ('letterSpacing' in measure) measure.letterSpacing = '0px';
    return measure.measureText(text).actualBoundingBoxAscent;
  }
  function fit(text, weight, size, maxW, min) {
    var s = size;
    while (s > min && textWidth(text, weight, s, -s * 0.03) > maxW) s -= 2;
    return s;
  }
  function wrap(text, weight, size, maxW, lines) {
    var out = [''];
    text.split(/\s+/).forEach(function (w) {
      var line = out[out.length - 1], next = line ? line + ' ' + w : w;
      if (!line || textWidth(next, weight, size) <= maxW) out[out.length - 1] = next;
      else out.push(w);
    });
    if (out.length > lines) {
      out = out.slice(0, lines);
      var last = out[lines - 1];
      while (last && textWidth(last + '…', weight, size) > maxW) last = last.slice(0, -1);
      out[lines - 1] = last.replace(/\s+$/, '') + '…';
    }
    return out;
  }
  function text(parent, x, y, value, size, weight, fill, opts) {
    opts = opts || {};
    var t = svg('text', { x: x, y: y, 'font-family': FONT, 'font-size': size, 'font-weight': weight, fill: fill });
    if (opts.anchor) t.setAttribute('text-anchor', opts.anchor);
    if (opts.track) t.setAttribute('letter-spacing', opts.track);
    if (opts.cls) t.setAttribute('class', opts.cls);
    if (opts.to != null) t.setAttribute('data-to', opts.to);
    t.textContent = value;
    parent.append(t);
    return t;
  }
  var rgbText = function (c) { return 'rgb(' + c.map(Math.round).join(',') + ')'; };
  var weekdayDay = function (d) { return new Date(utc(d)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }); };

  // Small tracked capitals in light blue label everything; values are white.
  var LIGHT = '#acb8f9';
  function clip(value, weight, size, track, maxW) {
    var t = value;
    if (textWidth(t, weight, size, track) <= maxW) return t;
    while (t && textWidth(t + '…', weight, size, track) > maxW) t = t.slice(0, -1);
    return t.replace(/[\s·-]+$/, '') + '…';
  }
  function eyebrow(parent, x, y, value, size, maxW, anchor) {
    return text(parent, x, y, clip(value.toUpperCase(), 500, size, size * 0.14, maxW), size, 500, LIGHT, { track: size * 0.14, anchor: anchor });
  }
  function glass(parent, x, y, w, h, r) {
    parent.append(svg('rect', { x: x, y: y, width: w, height: h, rx: r, fill: 'rgba(255,255,255,.045)', stroke: 'rgba(234,237,255,.14)', 'stroke-width': 1.5 }));
  }

  // logo: { href, w, h } or null. inline: { fonts } for the exported copy.
  function buildBackdrop(c, format, logo, inline) {
    var L = LAYOUT[format], W = L.W, H = L.H, M = L.m;
    var colW = L.wide ? L.col : W - M * 2, colR = M + colW; // the text column
    var root = svg('svg', { xmlns: SVG, viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, class: 'bd' });
    var defs = svg('defs', {});
    root.append(defs);
    if (inline) { var style = svg('style', {}); style.textContent = inline.fonts; defs.append(style); }

    // mesh, then grain
    root.append(svg('rect', { width: W, height: H, fill: rgbText(INK) }));
    var R = Math.max(W, H);
    mesh(c).forEach(function (b, i) {
      var g = svg('radialGradient', { id: 'bd-m' + i, gradientUnits: 'userSpaceOnUse', cx: b.x * W, cy: b.y * H, r: b.r * R });
      STOPS.forEach(function (s) { g.append(svg('stop', { offset: s[0], 'stop-color': rgbText(b.color), 'stop-opacity': (b.a * s[1]).toFixed(3) })); });
      defs.append(g);
      root.append(svg('rect', { width: W, height: H, fill: 'url(#bd-m' + i + ')' }));
    });
    var pattern = svg('pattern', { id: 'bd-grain', width: 180, height: 180, patternUnits: 'userSpaceOnUse' });
    var tile = svg('image', { width: 180, height: 180 });
    tile.setAttribute('href', grainTile());
    pattern.append(tile);
    defs.append(pattern);
    root.append(svg('rect', { width: W, height: H, fill: 'url(#bd-grain)' }));

    // header: lockup, and the season as a pill
    var markH = L.mark, s = markH / 113, top = L.top, headerBottom = top + markH;
    var mark = svg('g', { transform: 'translate(' + M + ' ' + top + ') scale(' + s + ')', fill: WHITE });
    WORDMARK.forEach(function (d) { mark.append(svg('path', { d: d })); });
    root.append(mark);
    text(root, M + 352 * s + 10, top + markH - 1, '/campus', markH + 2, 400, FAINT, { track: -1 });
    var season = 'GREEK WARS · FALL 2026', ss = L.wide ? 19 : 17, pillH = markH + 6;
    var pillW = textWidth(season, 500, ss, ss * 0.14) + 48, pillX = W - M - pillW;
    root.append(svg('rect', { x: pillX, y: top + markH / 2 - pillH / 2, width: pillW, height: pillH, rx: pillH / 2, fill: 'rgba(255,255,255,.06)', stroke: 'rgba(234,237,255,.22)', 'stroke-width': 1.5 }));
    text(root, pillX + 24, top + markH / 2 + ss * 0.36, season, ss, 500, SOFT, { track: ss * 0.14 });

    var foot = H - L.bottom, bodyTop = headerBottom + (L.wide ? 80 : 72), bodyBottom = foot - 56;
    var lastJoin = c.days.length ? c.days[c.days.length - 1][0] : null, lastLabelled = false;
    var factsH = L.wide || L.facts ? 132 : 0;

    // The column: school, letters with the logo, name, then the count and
    // progress. On web the letters shrink if a long name would crowd the facts.
    var nameLines = wrap(c.name, 500, L.name, colW, 2), bigCap = ascent('0', 700, L.big);
    var plan = function (ls) {
      var p = { eyebrow: bodyTop + 15 };
      p.letters = p.eyebrow + 46 + ascent(c.letters, 700, ls);
      p.name = p.letters + 36 + L.name * 0.72;
      p.big = p.name + (nameLines.length - 1) * L.name * 1.12 + 64 + bigCap;
      p.bar = p.big + 40;
      p.status = p.bar + 12 + 50;
      return p;
    };
    var logoW = logo ? Math.round(colW * 0.32) : 0;
    var ls = fit(c.letters, 700, L.letters, colW - (logo ? logoW + 48 : 0), 80), P = plan(ls);
    var factsY = L.wide ? bodyBottom - factsH : P.status + 56;
    while (L.wide && P.status > factsY - 48 && ls > 120) { ls -= 8; P = plan(ls); }

    eyebrow(root, M, P.eyebrow, c.school, L.wide ? 20 : 18, colW);
    text(root, M - ls * 0.03, P.letters, c.letters, ls, 700, WHITE, { track: -ls * 0.035 });
    if (logo) {
      var capH = ascent('H', 700, ls), k = Math.min(logoW / logo.w, capH * 1.35 / logo.h), lw = logo.w * k, lh = logo.h * k;
      var img = svg('image', { x: colR - lw, y: P.letters - capH / 2 - lh / 2, width: lw, height: lh, class: 'bd-logo' });
      img.setAttribute('href', logo.href);
      root.append(img);
    }
    nameLines.forEach(function (line, i) { text(root, M, P.name + i * L.name * 1.12, line, L.name, 500, WHITE, { track: -L.name * 0.025 }); });

    var bigW = textWidth(num(c.joined), 700, L.big, -L.big * 0.035);
    text(root, M - L.big * 0.02, P.big, num(c.joined), L.big, 700, WHITE, { track: -L.big * 0.035, cls: 'bd-count', to: c.joined });
    text(root, M + bigW + 28, P.big - bigCap * 0.52, c.joined === 1 ? 'member joined' : 'members joined', L.wide ? 34 : 32, 500, WHITE, { track: -0.5 });
    text(root, M + bigW + 28, P.big - 2, 'of ' + num(c.active) + ' actives', L.wide ? 30 : 28, 400, SOFT, { track: -0.3 });
    var barH = 12, pct = c.active ? Math.min(1, c.joined / c.active) : 0;
    root.append(svg('rect', { x: M, y: P.bar, width: colW, height: barH, rx: barH / 2, fill: 'rgba(234,237,255,.16)' }));
    if (pct > 0) root.append(svg('rect', { class: 'bd-fill', x: M, y: P.bar, width: Math.max(barH, colW * pct), height: barH, rx: barH / 2, fill: WHITE }));
    if (c.target) root.append(svg('rect', { class: 'bd-tick', x: M + colW * 0.8 - 1.5, y: P.bar - 9, width: 3, height: barH + 18, rx: 1.5, fill: c.joined >= c.target ? 'rgba(11,9,31,.6)' : 'rgba(234,237,255,.92)' }));
    var status = !c.target ? '' : c.reachedOn ? '80% reached ' + dayLabel(c.reachedOn) : num(c.target - c.joined) + ' to go to 80% (' + num(c.target) + ')';
    text(root, M, P.status, status, 28, 500, WHITE, { track: -0.3 });
    if (c.active) text(root, colR, P.status, Math.round(c.joined / c.active * 100) + '% of roster', 26, 400, SOFT, { anchor: 'end' });

    // facts card (web, story): three cells divided by hairlines
    if (factsH) {
      var facts = [
        ['Registered', dayLabel(c.registered)],
        ['Last join', !lastJoin ? '—' : lastJoin === today ? 'Today' : dayLabel(lastJoin)],
        ['Rank nationally', '#' + num(1 + chapters.filter(function (x) { return x.joined > c.joined; }).length) + ' of ' + num(chapters.length)]
      ];
      glass(root, M, factsY, colW, factsH, 24);
      facts.forEach(function (f, i) {
        var fx = M + i * colW / 3;
        if (i) root.append(svg('rect', { x: fx, y: factsY + 30, width: 1.5, height: factsH - 60, fill: 'rgba(234,237,255,.14)' }));
        eyebrow(root, fx + 32, factsY + 52, f[0], 16, colW / 3 - 48);
        text(root, fx + 32, factsY + 100, f[1], 36, 500, WHITE, { track: -0.6 });
      });
    }

    // timeline card, scaled to the active roster: the line's height is the
    // share of the roster that has joined (members beyond it raise the top)
    var cardX = L.wide ? colR + L.gutter : M, cardY = L.wide ? bodyTop - 15 : (factsH ? factsY + factsH : P.status) + 44;
    var cardW = W - M - cardX, cardH = bodyBottom - cardY, pad = L.pad;
    glass(root, cardX, cardY, cardW, cardH, 28);
    var cx = cardX + pad, cw = cardW - pad * 2, cr = cx + cw;
    var titleY = cardY + pad + 14, axisY = cardY + cardH - pad + 4;
    var chartTop = titleY + 52, chartBottom = axisY - 42, ch = chartBottom - chartTop;
    var first = c.days.length && c.days[0][0] < c.registered ? c.days[0][0] : c.registered;
    var byDay = new Map(c.days), pts = [{ i: 0, d: null, v: 0, add: 0 }], total = 0, n = 0;
    for (var d = first; d <= today; d = addDays(d, 1)) { var add = byDay.get(d) || 0; total += add; n++; pts.push({ i: n, d: d, v: total, add: add }); }
    var topV = Math.max(c.active || 0, total, 1);
    var X = function (i) { return cx + i / n * cw; }, Y = function (v) { return chartBottom - v / topV * ch; };
    eyebrow(root, cx, titleY, 'Members since registering', L.wide ? 18 : 16, cw * 0.48);
    // Roster and 80% lines, keyed in the title row so their labels never meet the data.
    var refs = [], keyX = cr;
    var reference = function (label, alpha, value) {
      var w = textWidth(label, 400, 22), ly = Math.round(Y(value));
      text(root, keyX, titleY, label, 22, 400, SOFT, { anchor: 'end' });
      root.append(svg('rect', { x: keyX - w - 40, y: titleY - 8, width: 26, height: 2, fill: 'rgba(234,237,255,' + alpha + ')' }));
      root.append(svg('rect', { x: cx, y: ly - 1, width: cw, height: 2, fill: 'rgba(234,237,255,' + alpha + ')' }));
      refs.push(ly);
      keyX -= w + 40 + 30;
    };
    if (c.active) reference('Roster · ' + num(c.active), 0.26, c.active);
    if (c.target) reference('80% · ' + num(c.target), 0.5, c.target);
    // A label sits above its point unless that crosses a line or leaves the chart.
    var labelY = function (v, cap) {
      var y = Y(v), top = y - 26 - cap;
      var blocked = top < chartTop - 6 || refs.some(function (r) { return r > top - 6 && r < y - 10; });
      return blocked ? y + 26 + cap : y - 26;
    };
    root.append(svg('rect', { x: cx, y: chartBottom, width: cw, height: 2, fill: 'rgba(234,237,255,.22)' }));
    if (!total) {
      text(root, cx + cw / 2, chartTop + ch / 2, 'First members coming soon', 28, 400, SOFT, { anchor: 'middle' });
    } else {
      var area = svg('linearGradient', { id: 'bd-area', x1: 0, y1: 0, x2: 0, y2: 1 });
      area.append(svg('stop', { offset: 0, 'stop-color': WHITE, 'stop-opacity': 0.24 }), svg('stop', { offset: 1, 'stop-color': WHITE, 'stop-opacity': 0 }));
      defs.append(area);
      var line = pts.map(function (p) { return X(p.i).toFixed(1) + ',' + Y(p.v).toFixed(1); }).join(' L');
      root.append(svg('path', { class: 'bd-area', d: 'M' + line + ' L' + X(n) + ',' + chartBottom + ' L' + X(0) + ',' + chartBottom + 'Z', fill: 'url(#bd-area)' }));
      root.append(svg('path', { class: 'bd-line', d: 'M' + line, fill: 'none', stroke: WHITE, 'stroke-width': 4.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      var marker = function (p) {
        var g = svg('g', { class: 'bd-end' });
        g.append(svg('circle', { cx: X(p.i), cy: Y(p.v), r: 10, fill: rgbText(INK) }), svg('circle', { cx: X(p.i), cy: Y(p.v), r: 6.5, fill: WHITE }));
        root.append(g);
      };
      var reached = c.reachedOn ? pts.find(function (p) { return p.d === c.reachedOn; }) : null;
      if (reached && reached.i < n) marker(reached);
      marker(pts[n]);
      text(root, X(n) - 2, labelY(total, 31), num(total), 44, 700, WHITE, { anchor: 'end', cls: 'bd-end', to: total, track: -1 });
      // The last join is marked on the line, labelled where it clears the total.
      var lastPt = lastJoin ? pts.find(function (p) { return p.d === lastJoin; }) : null;
      if (lastPt && lastPt.i < n) {
        if (lastPt !== reached) marker(lastPt);
        var label = 'Last join ' + dayLabel(lastJoin), lw2 = textWidth(label, 500, 24), lx = X(lastPt.i);
        var left = Math.max(cx, lx - lw2 / 2), clear = X(n) - textWidth(num(total), 700, 44) - 60;
        if (left + lw2 < clear) {
          text(root, left, labelY(lastPt.v, 18), label, 24, 500, WHITE, { cls: 'bd-end' });
          lastLabelled = true;
        }
      }
    }
    text(root, cx, axisY, 'Registered ' + dayLabel(c.registered), 22, 400, SOFT);
    var axisRight = lastJoin === today ? 'Last join today' : lastJoin && !lastLabelled ? 'Last join ' + dayLabel(lastJoin) : 'Today';
    text(root, cr, axisY, axisRight + (n > 1 ? ' · day ' + num(n) : ''), 22, 400, SOFT, { anchor: 'end' });

    // footer
    text(root, M, foot, 'fomocampus.com', 22, 400, FAINT, { track: 0.2 });
    text(root, W - M, foot, 'Updated ' + dayLabel(today, true), 22, 400, FAINT, { anchor: 'end', track: 0.2 });

    return {
      root: root, c: c, total: total, pts: pts, n: n, X: X, Y: Y,
      chart: { x: cx, y: chartTop, w: cw, h: ch, bottom: chartBottom },
      bar: { x: M, y: P.bar, w: colW, h: barH }
    };
  }

  // Hover and keyboard readouts on the live backdrop (never in the saved PNG).
  function interact(meta) {
    var root = meta.root, c = meta.c, tip = $('bd-tip');
    var lastJoin = c.days.length ? c.days[c.days.length - 1][0] : null;
    var toScreen = function (x, y) { var p = root.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(root.getScreenCTM()); };
    var toSvg = function (e) { var p = root.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(root.getScreenCTM().inverse()); };
    // side: beside the point (the timeline), otherwise above it
    function show(lines, x, y, side) {
      var head = el('span', 'tip-head', lines[0]), value = el('strong', null, lines[1]);
      tip.replaceChildren(head, value);
      lines.slice(2).forEach(function (l) { if (l) tip.append(el('span', null, l)); });
      tip.hidden = false;
      var w = tip.offsetWidth, h = tip.offsetHeight;
      if (side) { // beside the point, flipped so it stays on the backdrop
        var box = root.getBoundingClientRect();
        tip.style.left = (x + 24 + w > box.right - 12 ? x - w - 24 : x + 24) + 'px';
        tip.style.top = Math.max(box.top + 12, Math.min(box.bottom - h - 12, y - h / 2)) + 'px';
        return;
      }
      tip.style.left = Math.max(10, Math.min(innerWidth - w - 10, x - w / 2)) + 'px';
      tip.style.top = (y - h - 18 < 10 ? y + 22 : y - h - 18) + 'px';
    }
    function hide() { tip.hidden = true; hover.setAttribute('visibility', 'hidden'); root.classList.remove('bd-bar-hover', 'bd-tick-hover'); }
    var pctOf = function (v) { return c.active ? Math.round(v / c.active * 100) + '% of roster' : ''; };

    // timeline: a crosshair snaps to each day
    var hover = svg('g', { class: 'bd-hover', visibility: 'hidden' });
    var cross = svg('line', { y1: meta.chart.y - 8, y2: meta.chart.bottom, stroke: 'rgba(255,255,255,.45)', 'stroke-width': 1.5 });
    var halo = svg('circle', { r: 26, fill: WHITE, 'fill-opacity': 0.14 });
    var ring = svg('circle', { r: 12, fill: rgbText(INK), stroke: WHITE, 'stroke-width': 4 });
    hover.append(cross, halo, ring);
    root.append(hover);
    var active = meta.n;
    function showDay(i) {
      active = i;
      var p = meta.pts[i], x = meta.X(i), y = meta.Y(p.v);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x);
      ring.setAttribute('cx', x); ring.setAttribute('cy', y);
      halo.setAttribute('cx', x); halo.setAttribute('cy', y);
      hover.setAttribute('visibility', 'visible');
      var at = toScreen(x, y);
      show([weekdayDay(p.d) + (p.d === today ? ' · today so far' : ''), '+' + num(p.add) + ' joined',
        num(p.v) + ' total' + (c.active ? ' · ' + pctOf(p.v) : ''),
        p.d === c.reachedOn ? '80% mark reached' : '',
        p.d === lastJoin ? 'Last join' : lastJoin && p.d > lastJoin ? 'No joins since ' + dayLabel(lastJoin) : ''], at.x, at.y, true);
    }
    if (meta.total) {
      var chartHit = svg('rect', { class: 'bd-hit', x: meta.chart.x - 24, y: meta.chart.y - 24, width: meta.chart.w + 48, height: meta.chart.h + 48, tabindex: 0, role: 'img' });
      chartHit.setAttribute('aria-label', 'Members since registering. Use the left and right arrow keys to read each day.');
      root.append(chartHit);
      var dayAt = function (e) { return Math.max(1, Math.min(meta.n, Math.round((toSvg(e).x - meta.chart.x) / meta.chart.w * meta.n + 0.5))); };
      chartHit.addEventListener('pointermove', function (e) { showDay(dayAt(e)); });
      chartHit.addEventListener('pointerdown', function (e) { showDay(dayAt(e)); });
      chartHit.addEventListener('pointerleave', hide);
      chartHit.addEventListener('focus', function () { showDay(active); });
      chartHit.addEventListener('blur', hide);
      chartHit.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault(); e.stopPropagation();
        showDay(Math.max(1, Math.min(meta.n, active + (e.key === 'ArrowLeft' ? -1 : 1))));
      });
    }

    // progress bar and the 80% mark
    var b = meta.bar;
    var barHit = svg('rect', { class: 'bd-hit', x: b.x, y: b.y - 22, width: b.w, height: b.h + 44 });
    root.append(barHit);
    barHit.addEventListener('pointermove', function (e) {
      root.classList.add('bd-bar-hover');
      var at = toScreen(b.x + b.w * Math.min(1, c.active ? c.joined / c.active : 0), b.y);
      show(['Roster progress', num(c.joined) + ' of ' + num(c.active) + ' actives', pctOf(c.joined),
        !c.target ? '' : c.reachedOn ? '80% reached ' + dayLabel(c.reachedOn, true) : num(c.target - c.joined) + ' to go to the 80% mark'], at.x, at.y);
    });
    barHit.addEventListener('pointerleave', hide);
    if (c.target) {
      var tickHit = svg('rect', { class: 'bd-hit', x: b.x + b.w * 0.8 - 18, y: b.y - 26, width: 36, height: b.h + 52 });
      root.append(tickHit);
      tickHit.addEventListener('pointermove', function () {
        root.classList.add('bd-tick-hover');
        var at = toScreen(b.x + b.w * 0.8, b.y - 9);
        show(['80% mark', num(c.target) + ' members', c.reachedOn ? 'Reached ' + dayLabel(c.reachedOn, true) : num(c.target - c.joined) + ' to go'], at.x, at.y);
      });
      tickHit.addEventListener('pointerleave', hide);
    }
  }

  // Entrance: the bar fills, the line draws, the numbers count up.
  function animateIn(meta) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var root = meta.root, line = root.querySelector('.bd-line');
    if (line) line.style.setProperty('--len', Math.ceil(line.getTotalLength()));
    root.classList.add('bd-animate');
    var nodes = Array.prototype.slice.call(root.querySelectorAll('[data-to]')), start = performance.now();
    var tick = function (now) {
      var t = Math.min(1, (now - start) / 1200), e = 1 - Math.pow(1 - t, 3);
      nodes.forEach(function (node) { node.textContent = num(Math.round(Number(node.getAttribute('data-to')) * e)); });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // The backdrop draws the large cut-out (logos/lg). A missing logo leaves the space out.
  var logoCache = new Map();
  function logoInfo(slug) {
    if (!slug) return Promise.resolve(null);
    if (!logoCache.has(slug)) logoCache.set(slug, new Promise(function (resolve) {
      var img = new Image(), href = '/fomocampustracker/logos/lg/' + slug + '.webp?v=' + LOGO_V;
      img.onload = function () { resolve({ href: href, w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = function () { resolve(null); };
      img.src = href;
    }));
    return logoCache.get(slug);
  }

  // Saving: the same SVG with Aeonik and the logo inlined, drawn to a canvas.
  var fontCSS;
  function dataURL(blob) {
    return new Promise(function (resolve, reject) { var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = reject; r.readAsDataURL(blob); });
  }
  async function inlineFonts() {
    if (fontCSS) return fontCSS;
    var faces = await Promise.all([['400', 'Regular'], ['500', 'Medium'], ['700', 'Bold']].map(async function (f) {
      var blob = await (await fetch('/campus/fonts/Aeonik-' + f[1] + '.woff2')).blob();
      return '@font-face{font-family:Aeonik;font-weight:' + f[0] + ';src:url(' + await dataURL(blob) + ') format("woff2")}';
    }));
    return (fontCSS = faces.join(''));
  }
  async function exportPNG(c, format) {
    var logo = await logoInfo(c.logo);
    if (logo) logo = { w: logo.w, h: logo.h, href: await dataURL(await (await fetch(logo.href)).blob()) };
    var meta = buildBackdrop(c, format, logo, { fonts: await inlineFonts() });
    var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(meta.root)], { type: 'image/svg+xml' }));
    try {
      var img = new Image();
      img.src = url;
      await img.decode();
      await new Promise(function (r) { setTimeout(r, 150); }); // let the inlined fonts settle
      var canvas = document.createElement('canvas');
      canvas.width = LAYOUT[format].W; canvas.height = LAYOUT[format].H;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
    } finally { URL.revokeObjectURL(url); }
  }

  // ---------- viewer ----------
  var current = null;
  function openViewer(id) {
    var c = chapters.find(function (x) { return x.id === id; });
    if (!c) return;
    current = c;
    if (list.indexOf(c) < 0) { state.query = ''; $('search').value = ''; state.type = 'all'; state.day = null; renderGrid(); }
    var viewer = $('viewer');
    $('viewer-name').textContent = c.name;
    var school = $('viewer-school');
    school.replaceChildren(document.createTextNode(c.school + ' · ' + c.type));
    var i = list.indexOf(c);
    $('viewer-position').textContent = num(i + 1) + ' of ' + num(list.length);
    var rank = function (pool) { return 1 + pool.filter(function (x) { return x.joined > c.joined; }).length; };
    var mates = chapters.filter(function (x) { return x.school === c.school; });
    var schoolMembers = mates.reduce(function (s, x) { return s + x.joined; }, 0);
    var age = Math.max(1, Math.round((utc(today) - utc(c.registered)) / 864e5) + 1);
    var groups = [
      ['Progress', [
        ['Members joined', num(c.joined)],
        ['Active roster', num(c.active)],
        ['Roster joined', c.active ? Math.round(c.joined / c.active * 100) + '%' : '—'],
        ['80% mark', c.target ? num(c.target) : '—'],
        [c.reachedOn ? 'Reached 80%' : 'To go to 80%', c.reachedOn ? dayLabel(c.reachedOn) : c.target ? num(Math.max(0, c.target - c.joined)) : '—'],
        ['Rank nationally', '#' + num(rank(chapters)) + ' of ' + num(chapters.length)]
      ]],
      ['Timeline', [
        ['Registered', dayLabel(c.registered, true)],
        ['Days since registering', num(age)],
        ['First join', c.days.length ? dayLabel(c.days[0][0]) : '—'],
        ['Last join', lastJoinText(c)],
        ['Best day', c.best ? dayLabel(c.best[0]) + ' · ' + num(c.best[1]) : '—'],
        ['Days with joins', num(c.days.length)],
        ['Average a day', (c.joined / age).toFixed(1).replace(/\.0$/, '')],
        ['Last 7 days', '+' + num(c.week)]
      ]],
      [c.short || c.school, [
        ['Rank at school', '#' + num(rank(mates)) + ' of ' + num(mates.length)],
        ['Share of school', schoolMembers ? Math.round(c.joined / schoolMembers * 100) + '%' : '—'],
        ['School chapters', num(mates.length)],
        ['School members', num(schoolMembers)]
      ]]
    ];
    $('facts').replaceChildren.apply($('facts'), groups.map(function (g) {
      var group = el('section', 'fact-group'), list = el('dl', 'facts');
      g[1].forEach(function (f) { var d = el('div'); d.append(el('dt', null, f[0]), el('dd', null, f[1])); list.append(d); });
      group.append(el('h3', null, g[0]), list);
      return group;
    }));
    var table = $('chapter-days'), head = el('tr'), body = el('tbody'), running = 0;
    ['Day', 'Joined', 'Total'].forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; head.append(th); });
    var rows = c.days.map(function (x) { running += x[1]; return [x[0], x[1], running]; }).reverse();
    rows.forEach(function (r) { var tr = el('tr'); tr.append(el('td', null, dayLabel(r[0], true)), el('td', null, num(r[1])), el('td', null, num(r[2]))); body.append(tr); });
    if (!rows.length) { var tr = el('tr'), td = el('td', null, 'No members yet'); td.colSpan = 3; tr.append(td); body.append(tr); }
    var thead = el('thead'); thead.append(head);
    table.replaceChildren(thead, body);
    $('save-note').textContent = '';
    viewer.classList.toggle('panel-hidden', panelHidden);
    if (!viewer.open) viewer.showModal();
    history.replaceState(null, '', '#chapter=' + encodeURIComponent(c.id));
    drawBackdrop();
  }
  function lastJoinText(c) {
    if (!c.days.length) return '—';
    var d = c.days[c.days.length - 1][0], ago = Math.round((utc(today) - utc(d)) / 864e5);
    return ago === 0 ? 'Today' : dayLabel(d) + ' · ' + (ago === 1 ? 'yesterday' : ago + 'd ago');
  }
  var fontsReady, drawn = 0;
  async function drawBackdrop() {
    if (!current) return;
    var c = current, token = ++drawn;
    if (!fontsReady) fontsReady = Promise.all(['400', '500', '700'].map(function (w) { return document.fonts.load(w + ' 100px Aeonik'); })).catch(function () {});
    await fontsReady;
    var logo = await logoInfo(c.logo);
    if (token !== drawn || c !== current) return;
    var meta = buildBackdrop(c, state.format, logo, null);
    meta.root.setAttribute('role', 'group');
    meta.root.setAttribute('aria-label', 'Backdrop for ' + c.name + ', ' + c.school + ': ' + plural(c.joined, 'member') + ' joined of ' + num(c.active) + ' actives' + (c.reachedOn ? ', 80% reached ' + dayLabel(c.reachedOn) : '') + '.');
    var stage = $('backdrop');
    stage.style.setProperty('--ratio', LAYOUT[state.format].W / LAYOUT[state.format].H);
    $('bd-tip').hidden = true;
    stage.replaceChildren(meta.root);
    interact(meta);
    animateIn(meta);
  }
  function step(by) {
    if (!current || !list.length) return;
    var i = list.indexOf(current);
    openViewer(list[(i + by + list.length) % list.length].id);
  }
  $('prev').addEventListener('click', function () { step(-1); });
  $('next').addEventListener('click', function () { step(1); });
  $('close').addEventListener('click', function () { $('viewer').close(); });
  $('close-float').addEventListener('click', function () { $('viewer').close(); });
  // The details panel can be hidden (button or H) so the backdrop has the
  // whole screen for recordings; the choice is remembered on this browser.
  var panelHidden = false;
  try { panelHidden = localStorage.getItem('tracker-panel-hidden') === '1'; } catch (e) {}
  function setPanel(hidden) {
    panelHidden = hidden;
    $('viewer').classList.toggle('panel-hidden', hidden);
    try { localStorage.setItem('tracker-panel-hidden', hidden ? '1' : '0'); } catch (e) {}
    if (document.activeElement && document.activeElement.offsetParent === null) $(hidden ? 'show-panel' : 'hide-panel').focus({ preventScroll: true });
  }
  $('hide-panel').addEventListener('click', function () { setPanel(true); });
  $('show-panel').addEventListener('click', function () { setPanel(false); });
  $('viewer').addEventListener('close', function () {
    current = null;
    history.replaceState(null, '', location.pathname + location.search);
  });
  $('replay').addEventListener('click', function () { drawBackdrop(); });
  $('viewer').addEventListener('keydown', function (e) {
    if (e.target.closest('input, select, textarea, summary, .bd-hit')) return;
    if ((e.key === 'h' || e.key === 'H') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setPanel(!panelHidden); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });
  $('save').addEventListener('click', async function () {
    if (!current) return;
    var slug = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
    var c = current, note = $('save-note'), button = this, name = ['fomo-campus', slug(c.name), slug(c.short || c.school), state.format].join('-') + '.png';
    button.disabled = true; note.textContent = 'Making the image…';
    var blob = null;
    try { blob = await exportPNG(c, state.format); } catch (e) { blob = null; }
    button.disabled = false;
    if (!blob) { note.textContent = 'The image couldn’t be made here. Try Chrome or Edge.'; return; }
    var file = new File([blob], name, { type: 'image/png' });
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: c.name }); note.textContent = ''; return; }
      catch (e) { if (e.name === 'AbortError') { note.textContent = ''; return; } }
    }
    var url = URL.createObjectURL(blob), a = el('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    note.textContent = 'Saved ' + name;
  });

  function route() {
    var m = /^#chapter=(.+)$/.exec(location.hash);
    if (m) openViewer(decodeURIComponent(m[1]));
  }
  addEventListener('hashchange', function () { if (data) route(); });
})();
