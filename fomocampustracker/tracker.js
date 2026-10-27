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
    var sub = state.mode === 'total' ? 'running total' : 'per day, New York time';
    document.querySelectorAll('[data-sub]').forEach(function (s) { s.textContent = sub; });
    drawCharts();
    renderTable(rows);
    renderWeekly(from, since);
  }

  // ---------- weekly rhythm ----------
  // Member joins summed by weekday and New York hour over the selected range
  // (the eyes "Weekly rhythm" lens): dot size and the one-hue ramp both show
  // the count, and each weekday's total sits at the end of its row.
  var RAMP = ['#9eacf9', '#7c8df5', '#5c6fed', '#4252d6', '#2b33a8'];
  var clock = function (h) { h %= 24; return (h % 12 || 12) + (h < 12 ? ' AM' : ' PM'); };
  var hourTick = function (h) { return (h % 12 || 12) + (h < 12 ? 'am' : 'pm'); };
  var rhythmCursor = null;
  function renderWeekly(from, since) {
    var grid = WEEKDAYS.map(function () { return new Array(24).fill(0); }), totals = new Array(7).fill(0), all = 0;
    (data.hours || []).forEach(function (h) {
      if (h[0] < from) return;
      var wd = weekdayOf(h[0]);
      h[1].forEach(function (n, hr) { grid[wd][hr] += n; totals[wd] += n; all += n; });
    });
    $('weekly-range').textContent = 'Follows the date range above.';
    var max = 0, hot = [0, 0];
    grid.forEach(function (row, wd) { row.forEach(function (n, hr) { if (n > max) { max = n; hot = [wd, hr]; } }); });
    var busiest = totals.indexOf(Math.max.apply(null, totals));
    var share = function (n) { return all ? (n / all * 100).toFixed(1).replace(/\.0$/, '') + '%' : '0%'; };
    var tiles = [
      ['Busiest weekday', all ? WEEKDAYS[busiest] : '—', all ? num(totals[busiest]) + ' joins · ' + share(totals[busiest]) + ' of the week' : 'No joins yet', true],
      ['Hottest hour', all ? WEEKDAYS[hot[0]].slice(0, 3) + ' ' + clock(hot[1]) : '—', all ? num(max) + ' joins · ' + share(max) + ' of all' : ''],
      ['Weekend share', share(totals[0] + totals[6]), 'Two days of seven would be 29%'],
      ['Member joins', num(all), since]
    ];
    var stats = $('weekly-stats');
    stats.replaceChildren.apply(stats, tiles.map(function (t) {
      var tile = el('div', 'stat' + (t[3] ? ' hero' : ''));
      tile.append(el('span', null, t[0]), el('strong', null, t[1]), el('small', null, t[2]));
      return tile;
    }));

    // grid: hour labels, then a row per weekday (Sunday first, like eyes)
    var box = $('rhythm'), cells = [];
    box.replaceChildren();
    box.append(el('span', 'rh-corner'));
    for (var hr = 0; hr < 24; hr++) box.append(el('span', 'rh-hour', hr % 3 ? '' : hourTick(hr)));
    box.append(el('span', 'rh-hour rh-total-head', 'Total'));
    var maxTotal = Math.max.apply(null, totals.concat([1]));
    grid.forEach(function (row, wd) {
      box.append(el('span', 'rh-day', WEEKDAYS[wd].slice(0, 3)));
      row.forEach(function (n, h) {
        var cell = el('span', 'rh-cell'), dot = el('i');
        var r = n ? Math.sqrt(n / max) : 0;
        dot.style.width = dot.style.height = (n ? 6 + 22 * r : 4) + 'px';
        dot.style.background = n ? RAMP[Math.min(4, Math.floor(n / max * 5))] : '#e3e6f1';
        cell.append(dot);
        cell.dataset.wd = wd; cell.dataset.h = h;
        cells.push(cell);
        box.append(cell);
      });
      var total = el('span', 'rh-total'), bar = el('b');
      bar.style.width = Math.max(2, totals[wd] / maxTotal * 64) + 'px';
      total.append(bar, el('span', null, num(totals[wd])));
      total.dataset.wd = wd;
      box.append(total);
    });

    var tip = $('chart-tooltip');
    function show(target, clientX, clientY) {
      var wd = Number(target.dataset.wd), isTotal = target.classList.contains('rh-total');
      cells.forEach(function (c) { c.classList.remove('on'); });
      var strong = el('strong'), key = el('i');
      if (isTotal) {
        strong.append(key, document.createTextNode(plural(totals[wd], 'join')));
        tip.replaceChildren(strong, el('span', null, WEEKDAYS[wd]), el('span', null, share(totals[wd]) + ' of joins in this range'));
      } else {
        var h = Number(target.dataset.h), n = grid[wd][h];
        target.classList.add('on');
        strong.append(key, document.createTextNode(plural(n, 'join')));
        tip.replaceChildren(strong, el('span', null, WEEKDAYS[wd] + ' · ' + clock(h) + '–' + clock(h + 1)), el('span', null, share(n) + ' of joins in this range'));
      }
      tip.hidden = false;
      var rect = target.getBoundingClientRect(), w = tip.offsetWidth, th = tip.offsetHeight;
      var x = clientX != null ? clientX : rect.left + rect.width / 2, y = clientY != null ? clientY : rect.top;
      tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + 'px';
      tip.style.top = Math.max(8, y - th - 14) + 'px';
    }
    function hide() { tip.hidden = true; cells.forEach(function (c) { c.classList.remove('on'); }); }
    box.onpointermove = function (e) {
      var t = e.target.closest('.rh-cell, .rh-total');
      if (t) show(t, e.clientX, e.clientY); else hide();
    };
    box.onpointerleave = hide;
    box.onblur = hide;
    box.onfocus = function () { rhythmCursor = rhythmCursor || [hot[0], hot[1]]; show(cells[rhythmCursor[0] * 24 + rhythmCursor[1]]); };
    box.onkeydown = function (e) {
      var moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }, m = moves[e.key];
      if (!m) return;
      e.preventDefault();
      rhythmCursor = rhythmCursor || [hot[0], hot[1]];
      rhythmCursor = [(rhythmCursor[0] + m[0] + 7) % 7, (rhythmCursor[1] + m[1] + 24) % 24];
      show(cells[rhythmCursor[0] * 24 + rhythmCursor[1]]);
    };

    // table view
    var table = $('rhythm-table'), head = el('tr'), body = el('tbody');
    ['Weekday'].concat(Array.from({ length: 24 }, function (_, i) { return hourTick(i); }), ['Total']).forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; head.append(th); });
    grid.forEach(function (row, wd) {
      var tr = el('tr');
      tr.append(el('td', null, WEEKDAYS[wd]));
      row.forEach(function (n) { tr.append(el('td', null, num(n))); });
      tr.append(el('td', null, num(totals[wd])));
      body.append(tr);
    });
    var thead = el('thead'); thead.append(head);
    table.replaceChildren(thead, body);
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
      label.textContent = rows[i].d === today ? 'Today' : labels === n && n <= 8 ? weekdayShort(rows[i].d) + ' ' + Number(rows[i].d.slice(8)) : dayLabel(rows[i].d);
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
      var when = el('span', null, weekdayShort(r.d) + ', ' + dayLabel(r.d, true) + (r.d === today ? ' · today so far' : ''));
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
      img.src = '/fomocampustracker/logos/' + c.logo + '.webp?v=' + LOGO_V;
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
  // One SVG per chapter (1080 wide, 4:5 post or 9:16 story). On screen it is
  // live, made for screen recordings: it animates in, and hovering the
  // timeline, the progress bar or the 80% mark shows the numbers. Save image
  // serializes the same SVG, with the fonts and the logo inlined, to a PNG.
  var LOGO_V = 2; // bump when the logo files change; images are cached a day
  var BW = 1080, PAD = 84, INNER = BW - PAD * 2;
  var LAYOUT = {
    post: { H: 1350, top: 84, bottom: 84, lead: 92, letters: 220, name: 58, school: 32, big: 132, gap: 70 },
    story: { H: 1920, top: 210, bottom: 230, lead: 130, letters: 270, name: 70, school: 38, big: 160, gap: 100 }
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
  function niceTop(v) {
    var raw = Math.max(5, v * 1.18), e = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / e;
    return (f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 6 ? 6 : f <= 8 ? 8 : 10) * e;
  }
  var weekdayDay = function (d) { return new Date(utc(d)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }); };

  // logo: { href, w, h } or null. inline: { fonts } for the exported copy.
  function buildBackdrop(c, format, logo, inline) {
    var L = LAYOUT[format], H = L.H;
    var root = svg('svg', { xmlns: SVG, viewBox: '0 0 ' + BW + ' ' + H, width: BW, height: H, class: 'bd' });
    var defs = svg('defs', {});
    root.append(defs);
    if (inline) { var style = svg('style', {}); style.textContent = inline.fonts; defs.append(style); }

    // mesh, then grain
    root.append(svg('rect', { width: BW, height: H, fill: rgbText(INK) }));
    var R = Math.max(BW, H);
    mesh(c).forEach(function (b, i) {
      var g = svg('radialGradient', { id: 'bd-m' + i, gradientUnits: 'userSpaceOnUse', cx: b.x * BW, cy: b.y * H, r: b.r * R });
      STOPS.forEach(function (s) { g.append(svg('stop', { offset: s[0], 'stop-color': rgbText(b.color), 'stop-opacity': (b.a * s[1]).toFixed(3) })); });
      defs.append(g);
      root.append(svg('rect', { width: BW, height: H, fill: 'url(#bd-m' + i + ')' }));
    });
    var pattern = svg('pattern', { id: 'bd-grain', width: 180, height: 180, patternUnits: 'userSpaceOnUse' });
    var tile = svg('image', { width: 180, height: 180 });
    tile.setAttribute('href', grainTile());
    pattern.append(tile);
    defs.append(pattern);
    root.append(svg('rect', { width: BW, height: H, fill: 'url(#bd-grain)' }));

    // lockup + season
    var markH = 36, s = markH / 113, top = L.top;
    var mark = svg('g', { transform: 'translate(' + PAD + ' ' + top + ') scale(' + s + ')', fill: WHITE });
    WORDMARK.forEach(function (d) { mark.append(svg('path', { d: d })); });
    root.append(mark);
    text(root, PAD + 352 * s + 10, top + markH - 1, '/campus', 38, 400, FAINT, { track: -1 });
    text(root, BW - PAD, top + markH - 4, 'Greek Wars · Fall 2026', 27, 500, SOFT, { anchor: 'end' });

    // letters with the school logo beside them
    var y = top + markH + L.lead;
    var logoW = logo ? Math.round(INNER * 0.34) : 0;
    var ls = fit(c.letters, 700, L.letters, INNER - (logo ? logoW + 44 : 0), 80);
    var capH = ascent('H', 700, ls);
    y += ascent(c.letters, 700, ls);
    text(root, PAD - ls * 0.03, y, c.letters, ls, 700, WHITE, { track: -ls * 0.03 });
    if (logo) {
      var k = Math.min(logoW / logo.w, capH * 1.4 / logo.h), lw = logo.w * k, lh = logo.h * k;
      var img = svg('image', { x: BW - PAD - lw, y: y - capH / 2 - lh / 2, width: lw, height: lh, class: 'bd-logo' });
      img.setAttribute('href', logo.href);
      root.append(img);
    }

    // name and school
    y += L.name * 0.72 + 42;
    wrap(c.name, 500, L.name, INNER, 2).forEach(function (line, i) {
      if (i) y += L.name * 1.12;
      text(root, PAD, y, line, L.name, 500, WHITE, { track: -1.5 });
    });
    y += L.school * 1.45;
    text(root, PAD, y, wrap(c.school, 400, L.school, INNER, 1)[0], L.school, 400, SOFT, { track: -0.4 });

    // progress
    y += L.gap + ascent('0', 700, L.big);
    var bigW = textWidth(num(c.joined), 700, L.big, -L.big * 0.03);
    text(root, PAD - L.big * 0.02, y, num(c.joined), L.big, 700, WHITE, { track: -L.big * 0.03, cls: 'bd-count', to: c.joined });
    text(root, PAD + bigW + 26, y - L.big * 0.36, c.joined === 1 ? 'member joined' : 'members joined', L.school + 2, 500, WHITE);
    text(root, PAD + bigW + 26, y - 2, 'of ' + num(c.active) + ' actives', L.school, 400, SOFT);
    y += 36;
    var barH = 14, pct = c.active ? Math.min(1, c.joined / c.active) : 0;
    var barY = y;
    root.append(svg('rect', { x: PAD, y: barY, width: INNER, height: barH, rx: barH / 2, fill: 'rgba(234,237,255,.2)' }));
    if (pct > 0) root.append(svg('rect', { class: 'bd-fill', x: PAD, y: barY, width: Math.max(barH, INNER * pct), height: barH, rx: barH / 2, fill: WHITE }));
    if (c.target) root.append(svg('rect', { class: 'bd-tick', x: PAD + INNER * 0.8 - 1.5, y: barY - 9, width: 3, height: barH + 18, rx: 1.5, fill: c.joined >= c.target ? 'rgba(11,9,31,.6)' : 'rgba(234,237,255,.92)' }));
    y += barH + 46;
    var status = !c.target ? '' : c.reachedOn ? '80% reached ' + dayLabel(c.reachedOn) : num(c.target - c.joined) + ' to go to 80% (' + num(c.target) + ')';
    text(root, PAD, y, status, 30, 500, WHITE);
    if (c.active) text(root, BW - PAD, y, Math.round(c.joined / c.active * 100) + '% of roster', 28, 400, SOFT, { anchor: 'end' });

    // timeline, scaled to the chapter's own numbers
    var foot = H - L.bottom, axisY = foot - 58;
    var chartTop = y + L.gap + 40, chartBottom = axisY - 40, ch = chartBottom - chartTop;
    var first = c.days.length && c.days[0][0] < c.registered ? c.days[0][0] : c.registered;
    var byDay = new Map(c.days), pts = [{ i: 0, d: null, v: 0, add: 0 }], total = 0, n = 0;
    for (var d = first; d <= today; d = addDays(d, 1)) { var add = byDay.get(d) || 0; total += add; n++; pts.push({ i: n, d: d, v: total, add: add }); }
    var topV = niceTop(Math.max(total, 1));
    var showTarget = c.target && c.target <= topV;
    var X = function (i) { return PAD + i / n * INNER; }, Y = function (v) { return chartBottom - v / topV * ch; };
    text(root, PAD, chartTop - 30, 'Members since registering', 26, 500, SOFT);
    if (showTarget) {
      var key = '80% mark · ' + num(c.target);
      text(root, BW - PAD, chartTop - 30, key, 25, 400, SOFT, { anchor: 'end' });
      root.append(svg('rect', { x: BW - PAD - textWidth(key, 400, 25) - 44, y: chartTop - 39, width: 30, height: 2, fill: 'rgba(234,237,255,.55)' }));
      root.append(svg('rect', { x: PAD, y: Math.round(Y(c.target)) - 1, width: INNER, height: 2, fill: 'rgba(234,237,255,.45)' }));
    }
    root.append(svg('rect', { x: PAD, y: chartBottom, width: INNER, height: 2, fill: 'rgba(234,237,255,.25)' }));
    if (!total) {
      text(root, BW / 2, chartTop + ch / 2, 'First members coming soon', 30, 400, SOFT, { anchor: 'middle' });
    } else {
      var area = svg('linearGradient', { id: 'bd-area', x1: 0, y1: 0, x2: 0, y2: 1 });
      area.append(svg('stop', { offset: 0, 'stop-color': WHITE, 'stop-opacity': 0.26 }), svg('stop', { offset: 1, 'stop-color': WHITE, 'stop-opacity': 0 }));
      defs.append(area);
      var line = pts.map(function (p) { return X(p.i).toFixed(1) + ',' + Y(p.v).toFixed(1); }).join(' L');
      root.append(svg('path', { class: 'bd-area', d: 'M' + line + ' L' + X(n) + ',' + chartBottom + ' L' + X(0) + ',' + chartBottom + 'Z', fill: 'url(#bd-area)' }));
      root.append(svg('path', { class: 'bd-line', d: 'M' + line, fill: 'none', stroke: WHITE, 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      var marker = function (p) {
        var g = svg('g', { class: 'bd-end' });
        g.append(svg('circle', { cx: X(p.i), cy: Y(p.v), r: 11, fill: rgbText(INK) }), svg('circle', { cx: X(p.i), cy: Y(p.v), r: 7, fill: WHITE }));
        root.append(g);
      };
      var reached = c.reachedOn ? pts.find(function (p) { return p.d === c.reachedOn; }) : null;
      if (reached && reached.i < n) marker(reached);
      marker(pts[n]);
      var gap = showTarget ? Y(total) - Y(c.target) : 0; // the 80% line's height above the end dot
      text(root, X(n) - 4, gap > 18 && gap < 64 ? Y(total) + 58 : Y(total) - 26, num(total), 40, 700, WHITE, { anchor: 'end', cls: 'bd-end', to: total });
    }
    text(root, PAD, axisY, 'Registered ' + dayLabel(c.registered), 26, 400, SOFT);
    text(root, BW - PAD, axisY, n > 1 ? 'Today · day ' + num(n) : 'Today', 26, 400, SOFT, { anchor: 'end' });

    // footer
    text(root, PAD, foot, 'fomocampus.com', 26, 400, FAINT);
    text(root, BW - PAD, foot, 'Updated ' + dayLabel(today, true), 26, 400, FAINT, { anchor: 'end' });

    return {
      root: root, c: c, total: total, pts: pts, n: n, X: X, Y: Y,
      chart: { x: PAD, y: chartTop, w: INNER, h: ch, bottom: chartBottom },
      bar: { x: PAD, y: barY, w: INNER, h: barH }
    };
  }

  // Hover and keyboard readouts on the live backdrop (never in the saved PNG).
  function interact(meta) {
    var root = meta.root, c = meta.c, tip = $('bd-tip');
    var toScreen = function (x, y) { var p = root.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(root.getScreenCTM()); };
    var toSvg = function (e) { var p = root.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(root.getScreenCTM().inverse()); };
    // side: beside the point (the timeline), otherwise above it
    function show(lines, x, y, side) {
      var head = el('span', 'tip-head', lines[0]), value = el('strong', null, lines[1]);
      tip.replaceChildren(head, value);
      lines.slice(2).forEach(function (l) { if (l) tip.append(el('span', null, l)); });
      tip.hidden = false;
      var w = tip.offsetWidth, h = tip.offsetHeight;
      if (side) {
        tip.style.left = (x + 24 + w > innerWidth - 10 ? x - w - 24 : x + 24) + 'px';
        tip.style.top = Math.max(10, Math.min(innerHeight - h - 10, y - h / 2)) + 'px';
        return;
      }
      tip.style.left = Math.max(10, Math.min(innerWidth - w - 10, x - w / 2)) + 'px';
      tip.style.top = (y - h - 18 < 10 ? y + 22 : y - h - 18) + 'px';
    }
    function hide() { tip.hidden = true; hover.setAttribute('visibility', 'hidden'); root.classList.remove('bd-bar-hover', 'bd-tick-hover'); }
    var pctOf = function (v) { return c.active ? Math.round(v / c.active * 100) + '% of roster' : ''; };

    // timeline: a crosshair snaps to each day
    var hover = svg('g', { class: 'bd-hover', visibility: 'hidden' });
    var cross = svg('line', { y1: meta.chart.y - 8, y2: meta.chart.bottom, stroke: 'rgba(255,255,255,.55)', 'stroke-width': 2 });
    var ring = svg('circle', { r: 15, fill: rgbText(INK), stroke: WHITE, 'stroke-width': 5 });
    hover.append(cross, ring);
    root.append(hover);
    var active = meta.n;
    function showDay(i) {
      active = i;
      var p = meta.pts[i], x = meta.X(i), y = meta.Y(p.v);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x);
      ring.setAttribute('cx', x); ring.setAttribute('cy', y);
      hover.setAttribute('visibility', 'visible');
      var at = toScreen(x, y);
      show([weekdayDay(p.d) + (p.d === today ? ' · today so far' : ''), '+' + num(p.add) + ' joined',
        num(p.v) + ' total' + (c.active ? ' · ' + pctOf(p.v) : ''),
        p.d === c.reachedOn ? '80% mark reached' : ''], at.x, at.y, true);
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
      canvas.width = BW; canvas.height = LAYOUT[format].H;
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
    $('save-note').textContent = SAVE_HINT;
    if (!viewer.open) viewer.showModal();
    history.replaceState(null, '', '#chapter=' + encodeURIComponent(c.id));
    drawBackdrop();
  }
  var SAVE_HINT = 'Hover the timeline, the bar or the 80% mark to see the numbers.';
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
    stage.style.setProperty('--ratio', BW / LAYOUT[state.format].H);
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
  $('viewer').addEventListener('close', function () {
    current = null;
    history.replaceState(null, '', location.pathname + location.search);
  });
  $('replay').addEventListener('click', function () { drawBackdrop(); });
  $('viewer').addEventListener('keydown', function (e) {
    if (e.target.closest('input, select, textarea, summary, .bd-hit')) return;
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
