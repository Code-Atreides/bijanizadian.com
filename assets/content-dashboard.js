// The campus CRM's dashboard at /campus/dashboard: one screen for how the network is
// doing and what needs doing next. It only reads what the other team pages write:
// content_posts and content_creators (analytics), content_submissions and
// content_status (the queue), content_accounts (accounts). It never asks for
// passwords. Likes lead because Instagram hides views. Between two daily checks a
// post's likes are drawn as a straight line from (posted, 0), as on analytics.
// Everything typed in or scraped goes in as text; a post link becomes an <a> only
// if it is https.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DAY = 86400000;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var whole = new Intl.NumberFormat('en-US'), compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  var range = 30, posts = [], creators = {}, accounts = [], submissions = {}, statuses = {}, first = true, loading = false, loadedAt = 0, chart = null, drawn = false;

  function fmt(n) { n = Math.round(n || 0); return Math.abs(n) >= 10000 ? compact.format(n) : whole.format(n); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function svg(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }
  function day(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function startOfDay(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function ago(t) {
    var mins = Math.round((Date.now() - t) / 60000);
    if (mins < 60) return Math.max(mins, 1) + 'm ago';
    if (mins < 1440) return Math.round(mins / 60) + 'h ago';
    if (mins < 10080) return Math.round(mins / 1440) + 'd ago';
    return day(t);
  }
  function known(v) { if (v === null || v === undefined || v === '') return null; v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : null; }
  function safeLink(value) {
    try { var url = new URL(String(value)); return url.protocol === 'https:' ? url : null; } catch (e) { return null; }
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }
  function names(list) {
    var shown = list.slice(0, 2).join(', ');
    return list.length > 2 ? shown + ' and ' + (list.length - 2) + ' more' : shown;
  }

  // ---------- the data ----------

  function normalize(id, data) {
    var snaps = Object.keys(data.snapshots || {}).map(function (key) {
      var s = data.snapshots[key] || {};
      return { at: Number(s.at) || 0, likes: known(s.likes), comments: known(s.comments) };
    }).filter(function (s) { return s.likes !== null; }).sort(function (a, b) { return a.at - b.at; });
    var tracked = data.creator_id && creators[data.creator_id];
    var match = tracked && String(tracked.instagram || '').match(/instagram\.com\/([^/]+)/);
    return {
      id: id, data: data, snaps: snaps, posted: Number(data.posted_at) || (snaps[0] ? snaps[0].at : 0),
      handle: match ? match[1].toLowerCase() : '', who: match ? '@' + match[1].toLowerCase() : data.creator || 'Unattributed'
    };
  }
  // likes at moment t: 0 before posting, straight lines between checks, flat after the last
  function likesAt(post, t) {
    if (t < post.posted) return 0;
    var prevT = post.posted, prevV = 0;
    for (var i = 0; i < post.snaps.length; i++) {
      var s = post.snaps[i];
      if (s.at >= t) return s.at <= prevT ? s.likes : prevV + (s.likes - prevV) * (t - prevT) / (s.at - prevT);
      if (s.at > prevT) { prevT = s.at; prevV = s.likes; } else prevV = s.likes;
    }
    return prevV;
  }
  function totalAt(t) { return posts.reduce(function (sum, post) { return sum + likesAt(post, t); }, 0); }

  function dayTime(key) { return new Date(key + 'T12:00').getTime(); }
  // a tracked account's newest follower count and its change since the range began
  function followerStats(c, start) {
    var result = { count: null, change: null };
    ['instagram', 'tiktok'].forEach(function (p) {
      var latest = c && c.followers && c.followers[p], now = latest ? known(latest.count) : null;
      if (now === null) return;
      result.count = (result.count || 0) + now;
      var log = (c.followers_log && c.followers_log[p]) || {};
      var days = Object.keys(log).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d) && known(log[d]) !== null; }).sort(), base = null;
      days.forEach(function (d) { if (dayTime(d) <= start) base = d; });
      if (!base) base = days[0];
      if (base && startOfDay(dayTime(base)) < startOfDay(Date.now())) result.change = (result.change || 0) + now - known(log[base]);
    });
    return result;
  }
  function trackedByHandle() {
    var out = {};
    Object.keys(creators).forEach(function (id) {
      var match = String((creators[id] || {}).instagram || '').match(/instagram\.com\/([^/]+)/);
      if (match) out[match[1].toLowerCase()] = creators[id];
    });
    return out;
  }

  // ---------- greeting ----------

  function greet() {
    var hour = new Date().getHours(), part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    var name = window.contentAuth.name();
    $('dash-title').textContent = 'Good ' + part + (name ? ', ' + name : '');
  }

  // ---------- load ----------

  async function load() {
    if (loading) return;
    loading = true; $('dash-retry').hidden = true;
    if (!first) $('dash-board').classList.add('refetching');
    try {
      var db = window.contentAuth.db;
      var results = await Promise.all([db('GET', '/content_posts'), db('GET', '/content_creators'), db('GET', '/content_accounts'), db('GET', '/content_submissions'), db('GET', '/content_status')]);
      creators = results[1] || {};
      var raw = results[0] || {};
      posts = Object.keys(raw).map(function (id) { return normalize(id, raw[id] || {}); });
      var list = results[2] || {};
      accounts = Object.keys(list).map(function (id) { var a = list[id] || {}; a.id = id; return a; });
      submissions = results[3] || {}; statuses = results[4] || {};
      loadedAt = Date.now();
      $('dash-error').hidden = true;
      render();
      first = false;
    } catch (error) {
      if (window.contentAuth.handle(error)) return;
      $('dash-error').textContent = 'The dashboard couldn\'t load. Check your connection and try again.';
      $('dash-error').hidden = false;
      $('dash-retry').hidden = false;
      if (first) $('dash-summary').textContent = 'Not loaded.';
    } finally {
      loading = false; $('dash-board').classList.remove('refetching');
    }
  }

  function render() {
    var now = Date.now(), earliest = posts.length ? Math.min.apply(null, posts.map(function (p) { return p.posted || now; })) : now;
    var start = range ? now - range * DAY : startOfDay(earliest), before = start - (now - start);
    greet();
    renderFigures(now, start, before);
    renderNeeds(now);
    renderChart(now, start, before);
    renderTop(now, start);
    renderAccounts(start);
    renderLatest();
    var latest = posts.reduce(function (t, p) { return p.snaps.length ? Math.max(t, p.snaps[p.snaps.length - 1].at) : t; }, 0);
    $('dash-summary').textContent = plural(posts.length, 'post') + ' tracked' + (latest ? ' · last update ' + ago(latest) : '');
  }

  // digits count up once, the first time data lands; a zero simply appears
  function setFigure(node, value, text) {
    if (!first || reduced || !value) { node.textContent = text; return; }
    var began = performance.now();
    (function tick(time) {
      var p = Math.min(1, (time - began) / 640), eased = 1 - Math.pow(1 - p, 4);
      node.textContent = p < 1 ? whole.format(Math.round(value * eased)) : text;
      if (p < 1) requestAnimationFrame(tick);
    })(began);
  }

  function renderFigures(now, start, before) {
    var gained = totalAt(now) - totalAt(start), prior = range ? totalAt(start) - totalAt(before) : 0;
    $('f-likes-label').textContent = range ? 'Likes, last ' + range + ' days' : 'Likes, all time';
    setFigure($('f-likes'), Math.round(gained), fmt(gained));
    var sub = $('f-likes-sub');
    sub.className = '';
    if (!range) sub.textContent = 'across ' + plural(posts.length, 'post');
    else if (prior >= 1) {
      var change = Math.round((gained - prior) / prior * 100);
      sub.textContent = (change >= 0 ? '↗ +' : '↘ −') + Math.abs(change) + '% on the ' + range + ' days before';
      if (change < 0) sub.className = 'fall';
    } else sub.textContent = 'nothing to compare yet';

    var byHandle = trackedByHandle(), followers = 0, change2 = 0, grew = false;
    accounts.forEach(function (a) {
      if (!a.handle) return;
      var tracked = byHandle[a.handle], f = tracked ? followerStats(tracked, start) : null;
      followers += f && f.count !== null ? f.count : known(a.followers) || 0;
      if (f && f.change !== null) { change2 += f.change; grew = true; }
    });
    setFigure($('f-followers'), followers, fmt(followers));
    $('f-followers-sub').textContent = grew ? (change2 < 0 ? '−' : '+') + fmt(Math.abs(change2)) + ' on ' + Object.keys(byHandle).length + ' tracked daily' : 'across every account';
    $('f-followers-sub').className = grew && change2 < 0 ? 'fall' : '';

    var postedIn = posts.filter(function (p) { return p.posted >= start; }).length;
    $('f-posts-label').textContent = range ? 'Posts, last ' + range + ' days' : 'Posts, all time';
    setFigure($('f-posts'), postedIn, whole.format(postedIn));
    $('f-posts-sub').textContent = 'from ' + plural(Object.keys(byHandle).length, 'tracked account');

    var live = accounts.filter(function (a) { return a.handle; }), own = live.filter(function (a) { return a.status === 'own'; }).length;
    setFigure($('f-accounts'), live.length, whole.format(live.length));
    $('f-accounts-sub').textContent = own + ' we own, ' + (live.length - own) + ' we have';
  }

  // ---------- what needs doing: the page's one inverted card ----------

  function renderNeeds(now) {
    var rows = [], fresh = Object.keys(submissions).filter(function (id) {
      var s = statuses[id];
      return !s || !s.status || s.status === 'new';
    });
    if (fresh.length) {
      var oldest = Math.min.apply(null, fresh.map(function (id) { return Number((submissions[id] || {}).submitted_at) || now; }));
      rows.push({ text: 'Review ' + plural(fresh.length, 'new video'), sub: 'Oldest turned in ' + ago(oldest), n: fresh.length, href: '/campus/submissions' });
    }
    var unlinked = accounts.filter(function (a) { return !a.handle; });
    if (unlinked.length) rows.push({ text: 'Set up ' + plural(unlinked.length, 'login') , sub: names(unlinked.map(function (a) { return a.school || a.login_email; }).sort()) + ' have no page yet', n: unlinked.length, href: '/campus/accounts#unlinked' });
    var newest = {};
    posts.forEach(function (p) { if (p.handle) newest[p.handle] = Math.max(newest[p.handle] || 0, p.posted); });
    var lastOf = function (a) { return Math.max(Number(a.last_post_at) || 0, newest[a.handle] || 0); };
    var live = accounts.filter(function (a) { return a.handle; });
    var empty = live.filter(function (a) { return !lastOf(a) && !known(a.posts); });
    if (empty.length) rows.push({ text: 'Get first posts on ' + plural(empty.length, 'account'), sub: names(empty.map(function (a) { return '@' + a.handle; })), n: empty.length, href: '/campus/accounts' });
    var quiet = live.filter(function (a) { return lastOf(a) && now - lastOf(a) > 7 * DAY; }).sort(function (a, b) { return lastOf(a) - lastOf(b); });
    if (quiet.length) rows.push({ text: 'Wake ' + plural(quiet.length, 'quiet account'), sub: '@' + quiet[0].handle + ' last posted ' + day(lastOf(quiet[0])), n: quiet.length, href: '/campus/accounts' });
    var uncaptioned = posts.filter(function (p) { return !p.data.caption; }).length;
    if (uncaptioned) rows.push({ text: 'Add ' + plural(uncaptioned, 'missing caption'), sub: 'Posts with no caption saved', n: uncaptioned, href: '/campus/captions' });

    var total = rows.reduce(function (sum, r) { return sum + r.n; }, 0);
    setFigure($('needs-total'), total, whole.format(total));
    var list = $('needs-list');
    list.textContent = '';
    if (!rows.length) { list.appendChild(el('li', 'needs-clear', 'All clear.')); return; }
    rows.forEach(function (r) {
      var li = el('li'), a = el('a'), text = el('span');
      a.href = r.href;
      text.appendChild(el('strong', '', r.text));
      text.appendChild(el('small', '', r.sub));
      a.appendChild(text);
      a.appendChild(el('b', '', whole.format(r.n)));
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  // ---------- likes over time: this period against the one before it, on one axis ----------

  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 8 ? 8 : 10) * p;
  }
  function chartPoints(now, start, before) {
    var span = now - start, days = Math.max(1, Math.round(span / DAY)), step = days > 120 ? 7 : 1, points = [], base = totalAt(start), baseBefore = range ? totalAt(before) : 0;
    for (var i = 0; i <= days; i += step) {
      var t = Math.min(now, start + i * DAY);
      points.push({ t: t, v: totalAt(t) - base, prevT: range ? t - span : null, prev: range ? totalAt(t - span) - baseBefore : null });
    }
    if (points[points.length - 1].t < now) points.push({ t: now, v: totalAt(now) - base, prevT: range ? start : null, prev: range ? totalAt(start) - baseBefore : null });
    return points;
  }
  function renderChart(now, start, before) {
    var root = $('dash-chart'), points = chartPoints(now, start, before), comparing = !!range;
    root.textContent = '';
    $('chart-legend').hidden = !comparing;
    $('chart-title').textContent = range ? 'Likes gained' : 'Total likes';
    renderChartTable(points, comparing);
    if (!posts.length) { root.appendChild(el('div', 'chart-empty', 'No posts yet. Likes show up here once a post is tracked.')); return; }
    var w = root.clientWidth || 640, h = Math.max(240, root.clientHeight || 304), m = { t: 12, r: 44, b: 24, l: 32 };
    var pw = w - m.l - m.r, ph = h - m.t - m.b;
    var top = niceMax(Math.max.apply(null, points.map(function (p) { return Math.max(p.v, p.prev || 0); })) || 1);
    var x = function (i) { return m.l + (points.length > 1 ? i / (points.length - 1) * pw : pw / 2); };
    var y = function (v) { return m.t + ph - v / top * ph; };
    var box = svg('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', tabindex: '0', 'aria-label': (comparing ? 'Likes gained this period against the one before. ' : 'Total likes over time. ') + fmt(points[points.length - 1].v) + ' at the end. Use the arrow keys to read each day.' });
    box.style.height = h + 'px';
    for (var g = 0; g <= 4; g++) {
      var val = top * g / 4;
      box.appendChild(svg('line', { class: 'grid', x1: m.l, x2: w - m.r, y1: y(val), y2: y(val) }));
      var tick = svg('text', { class: 'tick', x: m.l - 8, y: y(val) + 4, 'text-anchor': 'end' });
      tick.textContent = fmt(val); box.appendChild(tick);
    }
    var count = w < 480 ? 3 : 5;
    for (var d = 0; d < count; d++) {
      var at = Math.round(d / (count - 1) * (points.length - 1)), label = svg('text', { class: 'tick', x: x(at), y: h - 4, 'text-anchor': d === 0 ? 'start' : d === count - 1 ? 'end' : 'middle' });
      label.textContent = day(points[at].t); box.appendChild(label);
    }
    var path = function (key) { return points.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[key]).toFixed(1); }).join(' '); };
    var line = path('v');
    box.appendChild(svg('path', { class: 'area', d: line + ' L' + x(points.length - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0).toFixed(1) + ' ' + y(0) + ' Z' }));
    if (comparing) box.appendChild(svg('path', { class: 'line-prev', d: path('prev') }));
    var main = svg('path', { class: 'line', d: line, pathLength: '1' });
    if (!drawn && !reduced) main.classList.add('draw');
    drawn = true;
    box.appendChild(main);
    var last = points[points.length - 1];
    box.appendChild(svg('circle', { class: 'end', cx: x(points.length - 1), cy: y(last.v), r: 4 }));
    var endLabel = svg('text', { class: 'end-label', x: x(points.length - 1) + 8, y: y(last.v) + 4 });
    endLabel.textContent = fmt(last.v); box.appendChild(endLabel);
    var cross = svg('line', { class: 'cross', y1: m.t, y2: m.t + ph, visibility: 'hidden' }), dot = svg('circle', { class: 'cross-dot', r: 4, visibility: 'hidden' });
    box.appendChild(cross); box.appendChild(dot);
    var hit = svg('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' });
    box.appendChild(hit);
    root.appendChild(box);
    var tip = el('div', 'tip'); tip.hidden = true; root.appendChild(tip);
    function show(i) {
      var p = points[i];
      chart.index = i;
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.v)); dot.setAttribute('visibility', 'visible');
      tip.textContent = '';
      tip.appendChild(el('strong', '', fmt(p.v) + ' likes'));
      tip.appendChild(el('span', '', day(p.t)));
      if (comparing) tip.appendChild(el('span', 'tip-prev', fmt(p.prev) + ' by ' + day(p.prevT)));
      tip.hidden = false;
      tip.style.left = Math.min(w - tip.offsetWidth - 4, Math.max(4, x(i) + 12)) + 'px';
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.hidden = true; }
    chart = { index: points.length - 1 };
    hit.addEventListener('pointermove', function (event) {
      var rect = box.getBoundingClientRect(), px = (event.clientX - rect.left) / rect.width * w;
      show(Math.max(0, Math.min(points.length - 1, Math.round((px - m.l) / pw * (points.length - 1)))));
    });
    hit.addEventListener('pointerleave', hide);
    box.addEventListener('focus', function () { show(chart.index); });
    box.addEventListener('blur', hide);
    box.addEventListener('keydown', function (event) {
      var move = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!move) return;
      event.preventDefault();
      show(Math.max(0, Math.min(points.length - 1, chart.index + move)));
    });
  }
  function renderChartTable(points, comparing) {
    var wrap = $('chart-table'), table = el('table', 'mini-table'), head = el('tr');
    wrap.textContent = '';
    ['Day', 'Likes'].concat(comparing ? ['Period before'] : []).forEach(function (label, i) { var th = el('th', i ? 'num' : '', label); th.scope = 'col'; head.appendChild(th); });
    var thead = el('thead'), body = el('tbody');
    thead.appendChild(head); table.appendChild(thead);
    points.slice().reverse().forEach(function (p) {
      var tr = el('tr');
      tr.appendChild(el('td', '', day(p.t)));
      tr.appendChild(el('td', 'num', whole.format(Math.round(p.v))));
      if (comparing) tr.appendChild(el('td', 'num', whole.format(Math.round(p.prev))));
      body.appendChild(tr);
    });
    table.appendChild(body); wrap.appendChild(table);
  }

  // ---------- the three cards underneath ----------

  function row(list, title, sub, value, href) {
    var li = el('li'), text = el('span', 'row-text'), head = el('strong');
    if (href) { var a = el('a', '', title); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; head.appendChild(a); } else head.textContent = title;
    text.appendChild(head);
    if (sub) text.appendChild(el('small', '', sub));
    li.appendChild(text);
    li.appendChild(value);
    list.appendChild(li);
  }

  function renderTop(now, start) {
    var list = $('top-list');
    list.textContent = '';
    var ranked = posts.map(function (p) { return { post: p, gained: likesAt(p, now) - (range ? likesAt(p, start) : 0) }; })
      .sort(function (a, b) { return b.gained - a.gained || b.post.posted - a.post.posted; }).slice(0, 5);
    if (!ranked.length) { list.appendChild(el('li', 'list-empty', 'No posts yet.')); return; }
    ranked.forEach(function (r) {
      var url = safeLink(r.post.data.url);
      row(list, r.post.data.title || 'Untitled', r.post.who + (r.post.posted ? ' · ' + day(r.post.posted) : ''), el('b', '', (range && r.gained > 0 ? '+' : '') + fmt(r.gained)), url ? url.href : '');
    });
  }

  function renderAccounts(start) {
    var live = accounts.filter(function (a) { return a.handle; }), own = live.filter(function (a) { return a.status === 'own'; }).length;
    var parts = [['We own', own, 'own'], ['We have', live.length - own, 'have'], ['Not linked', accounts.length - live.length, 'unlinked']];
    var bar = $('split-bar'), legend = $('split-legend');
    bar.textContent = ''; legend.textContent = '';
    parts.forEach(function (part) {
      if (part[1]) { var seg = el('span', 'seg seg-' + part[2]); seg.style.flexGrow = part[1]; seg.title = part[0] + ': ' + part[1]; bar.appendChild(seg); }
      var li = el('li');
      li.appendChild(el('i', 'seg-' + part[2]));
      li.appendChild(document.createTextNode(part[0] + ' '));
      li.appendChild(el('b', '', String(part[1])));
      legend.appendChild(li);
    });
    bar.setAttribute('aria-label', parts.map(function (p) { return p[0] + ' ' + p[1]; }).join(', '));
    var byHandle = trackedByHandle(), list = $('acc-list');
    list.textContent = '';
    var ranked = live.map(function (a) {
      var tracked = byHandle[a.handle], f = tracked ? followerStats(tracked, start) : null;
      return { a: a, count: f && f.count !== null ? f.count : known(a.followers) || 0, change: f ? f.change : null };
    }).sort(function (x, y) { return y.count - x.count; }).slice(0, 4);
    if (!ranked.length) { list.appendChild(el('li', 'list-empty', 'No accounts yet.')); return; }
    ranked.forEach(function (r) {
      var value = el('b', '', fmt(r.count));
      if (r.change) value.appendChild(el('span', r.change < 0 ? 'fall' : 'sub', ' ' + (r.change < 0 ? '−' : '+') + fmt(Math.abs(r.change))));
      row(list, '@' + r.a.handle, r.a.school || '', value, 'https://www.instagram.com/' + r.a.handle + '/');
    });
  }

  function renderLatest() {
    var list = $('latest-list'), events = [];
    list.textContent = '';
    posts.forEach(function (p) { if (p.posted) events.push({ at: p.posted, title: p.who + ' posted', sub: p.data.title || '' }); });
    Object.keys(submissions).forEach(function (id) {
      var s = submissions[id] || {};
      if (s.submitted_at) events.push({ at: Number(s.submitted_at), title: (s.name || 'Someone') + ' turned in a video', sub: s.title && s.title !== 'Video' ? s.title : s.school || '' });
    });
    events.sort(function (a, b) { return b.at - a.at; });
    if (!events.length) { list.appendChild(el('li', 'list-empty', 'Nothing yet.')); return; }
    events.slice(0, 5).forEach(function (e) { row(list, e.title, e.sub, el('span', 'when', ago(e.at))); });
  }

  // ---------- controls ----------

  document.querySelectorAll('#dash-ranges button').forEach(function (button) {
    button.addEventListener('click', function () {
      range = Number(button.dataset.range);
      document.querySelectorAll('#dash-ranges button').forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      render();
    });
  });
  $('dash-retry').addEventListener('click', load);
  $('chart-toggle').addEventListener('click', function () {
    var table = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', String(table));
    this.textContent = table ? 'Show as chart' : 'Show as table';
    $('dash-chart').hidden = table; $('chart-table').hidden = !table;
  });
  if ('ResizeObserver' in window) {
    var frame = 0, width = 0;
    new ResizeObserver(function (entries) {
      var next = Math.round(entries[0].contentRect.width);
      if (next === width || !next) return;
      width = next;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () { if (loadedAt) { var now = Date.now(), start = range ? now - range * DAY : startOfDay(Math.min.apply(null, posts.map(function (p) { return p.posted || now; }).concat(now))); renderChart(now, start, start - (now - start)); } });
    }).observe($('dash-chart'));
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && window.contentAuth.signedIn() && Date.now() - loadedAt > 60000) load();
  });

  window.contentAuth.init({
    main: 'dashboard', onOpen: load,
    onSignOut: function () { posts = []; creators = {}; accounts = []; submissions = {}; statuses = {}; first = true; drawn = false; },
    denied: 'This account can\'t open the dashboard.'
  });
})();
