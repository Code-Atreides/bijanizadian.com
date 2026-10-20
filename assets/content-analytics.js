// Campus media analytics at /campus/analytics: how posted videos perform.
// Each post in RTDB content_posts has a link, a platform, who made it (typed in,
// or taken from the content_submissions entry it came from) and dated snapshots
// of its views, likes, comments and shares; latest mirrors the newest snapshot.
// Between snapshots a post's views are interpolated in a straight line from
// (posted, 0), which is what "views gained" in a range and the chart are built on.
// Each post can also carry the state it's for (the map, via content-geo.js),
// the time it went up and the hashtags it used, which /campus/studio learns from.
// Everything typed in is untrusted: it goes into the page as text, and a post
// link becomes an <a> only if it is https. Sign-in comes from content-auth.js.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var db = window.contentAuth.db;
  var DAY = 86400000;
  var PLATFORMS = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', x: 'X', other: 'Other' };
  var SVG = 'http://www.w3.org/2000/svg';
  var GEO = window.contentGeo;
  // one blue, light to dark: checked as an ordinal ramp (monotone, visible steps, light end >= 2:1)
  var RAMP = ['#9eacf9', '#7c8df5', '#5c6fed', '#4252d6', '#2b33a8'];

  var posts = [], submissions = {}, range = 30, platform = 'all', loading = false, loadedAt = 0;
  var editing = null, numbersFor = null, chart = null;

  // ---------- formatting ----------

  var compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  var whole = new Intl.NumberFormat('en');
  function fmt(n) { n = Math.round(n || 0); return Math.abs(n) >= 1000 ? compact.format(n) : whole.format(n); }
  function full(n) { return whole.format(Math.round(n || 0)); }
  function pct(n) { return isFinite(n) ? (n * 100).toFixed(1) + '%' : '—'; }
  function shortDay(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function longDay(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function ago(t) {
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 7 * 86400) return Math.floor(s / 86400) + 'd ago';
    return shortDay(t);
  }
  function startOfDay(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function dateInput(t) { var d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fromDateInput(value) { var t = new Date(value + 'T00:00').getTime(); return isFinite(t) ? t : NaN; }
  function count(v) { v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : 0; }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function svg(tag, attrs) {
    var node = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }
  function safeLink(value) {
    try { var url = new URL(String(value || '')); return url.protocol === 'https:' ? url : null; } catch (e) { return null; }
  }
  function cleanLink(value) {
    value = String(value || '').trim();
    if (value && !/^[a-z][a-z0-9+.-]*:/i.test(value)) value = 'https://' + value;
    var url = safeLink(value);
    return url && /\./.test(url.hostname) ? url.href : '';
  }
  function detectPlatform(link) {
    var host = (safeLink(cleanLink(link)) || { hostname: '' }).hostname.replace(/^www\./, '');
    if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
    if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
    if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'youtube';
    if (/(^|\.)(x\.com|twitter\.com)$/.test(host)) return 'x';
    return '';
  }
  function randomId(n) {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789', bytes = new Uint8Array(n), out = '';
    crypto.getRandomValues(bytes);
    for (var i = 0; i < n; i++) out += chars[bytes[i] % chars.length];
    return out;
  }
  function newId() { return Date.now().toString(36) + '-' + randomId(6); }
  function cleanTags(value) {
    var seen = {};
    return String(value || '').split(/[\s,]+/).map(function (t) { return t.replace(/^#+/, '').toLowerCase().replace(/[^\p{L}\p{N}_]/gu, ''); })
      .filter(function (t) { if (!t || seen[t]) return false; seen[t] = 1; return true; }).slice(0, 30).map(function (t) { return '#' + t; }).join(' ');
  }
  function inkFor(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return (1.05) / (lum + 0.05) > (lum + 0.05) / (0.0036 + 0.05) ? '#ffffff' : '#0b091f';
  }

  // ---------- the data ----------

  function normalize(id, data) {
    var snaps = Object.keys(data.snapshots || {}).map(function (key) {
      var s = data.snapshots[key] || {};
      return { id: key, at: Number(s.at) || 0, views: count(s.views), likes: count(s.likes), comments: count(s.comments), shares: count(s.shares) };
    }).sort(function (a, b) { return a.at - b.at; });
    var sub = data.submission ? submissions[data.submission] : null;
    var creator = (sub && sub.name) || data.creator || '';
    var posted = Number(data.posted_at) || (snaps[0] ? snaps[0].at : 0);
    return {
      id: id, data: data, snaps: snaps, posted: posted,
      latest: snaps.length ? snaps[snaps.length - 1] : { views: 0, likes: 0, comments: 0, shares: 0, at: posted },
      creator: creator, handle: (sub && sub.handle) || '',
      creatorKey: ((sub && sub.email) || creator).toLowerCase(),
      school: (sub && sub.school) || data.school || '',
      state: GEO.STATES[data.state] ? data.state : '',
      tags: data.hashtags || ''
    };
  }

  // views at moment t: 0 before posting, straight lines between snapshots, flat after the last
  function viewsAt(post, t) {
    if (t < post.posted) return 0;
    var prevT = post.posted, prevV = 0;
    for (var i = 0; i < post.snaps.length; i++) {
      var s = post.snaps[i];
      if (s.at >= t) return s.at <= prevT ? s.views : prevV + (s.views - prevV) * (t - prevT) / (s.at - prevT);
      if (s.at > prevT) { prevT = s.at; prevV = s.views; } else prevV = s.views;
    }
    return prevV;
  }
  function engagement(snap) { return snap.likes + snap.comments + snap.shares; }

  async function load() {
    if (loading) return;
    loading = true; $('board').classList.add('refetching'); $('refresh').disabled = true;
    try {
      var results = await Promise.all([db('GET', '/content_posts'), db('GET', '/content_submissions')]);
      submissions = results[1] || {};
      var raw = results[0] || {};
      posts = Object.keys(raw).map(function (id) { return normalize(id, raw[id] || {}); });
      loadedAt = Date.now();
      $('an-error').hidden = true;
      fillLists(); render();
    } catch (error) { failed(error); }
    finally { loading = false; $('board').classList.remove('refetching'); $('refresh').disabled = false; }
  }

  function failed(error) {
    if (window.contentAuth.handle(error)) return;
    $('an-error').textContent = 'Analytics couldn\'t update. Check your connection and refresh.';
    $('an-error').hidden = false;
  }

  // ---------- the dashboard ----------

  function visible() { return posts.filter(function (post) { return platform === 'all' || post.data.platform === platform; }); }

  function render() {
    var now = Date.now(), list = visible(), start = range ? now - range * DAY : -Infinity;
    var label = range ? 'last ' + range + ' days' : 'all time';
    var views = 0, engaged = 0, gained = 0, gainers = 0, postedIn = 0, lastUpdate = 0;
    list.forEach(function (post) {
      views += post.latest.views; engaged += engagement(post.latest);
      post.gained = viewsAt(post, now) - (range ? viewsAt(post, start) : 0);
      gained += post.gained; if (post.gained > 0) gainers++;
      if (post.posted >= start) postedIn++;
      lastUpdate = Math.max(lastUpdate, post.latest.at || 0);
    });

    $('k-gained-label').textContent = range ? 'Views gained · ' + label : 'Views · all time';
    $('k-gained').textContent = fmt(gained); $('k-gained').title = full(gained);
    $('k-gained-sub').textContent = list.length ? 'across ' + gainers + (gainers === 1 ? ' post' : ' posts') : ' ';
    $('k-views').textContent = fmt(views); $('k-views').title = full(views);
    $('k-posts').textContent = list.length;
    $('k-posts-sub').textContent = range ? postedIn + ' posted in the ' + label : ' ';
    $('k-avg').textContent = list.length ? fmt(views / list.length) : '0';
    $('k-eng').textContent = views ? pct(engaged / views) : '—';
    $('an-summary').textContent = posts.length
      ? posts.length + (posts.length === 1 ? ' post' : ' posts') + ' tracked · last update ' + ago(lastUpdate)
      : 'No posts logged yet.';
    var short = range ? 'Gained · ' + range + 'd' : 'Gained';
    ['creators-gained-head', 'schools-gained-head', 'posts-gained-head'].forEach(function (id) { $(id).textContent = short; });

    renderChart(list, now, label);
    renderPlatforms(list);
    renderMap(list);
    renderGroup('creator-rows', list, function (post) { return post.creatorKey || ''; }, function (post) { return { name: post.creator || 'Unattributed', sub: post.handle }; });
    renderGroup('school-rows', list, function (post) { return post.school.trim().toLowerCase(); }, function (post) { return { name: post.school || 'No school' }; });
    renderPosts(list);
  }

  // ---------- views over time: one series, so no legend; the title names it ----------

  function series(list, now) {
    if (!list.length) return [];
    var first = range ? now - range * DAY : Math.min.apply(null, list.map(function (post) { return post.posted || now; }));
    var from = startOfDay(first), days = Math.max(1, Math.ceil((now - from) / DAY)), step = days > 120 ? 7 : 1, points = [];
    for (var d = 0; d <= days; d += step) {
      var t = Math.min(from + (d + 1) * DAY - 1, now);
      points.push({ t: t, v: list.reduce(function (sum, post) { return sum + viewsAt(post, t); }, 0) });
      if (t >= now) break;
    }
    if (points[points.length - 1].t < now) points.push({ t: now, v: list.reduce(function (sum, post) { return sum + viewsAt(post, now); }, 0) });
    return points;
  }
  function niceMax(v) {
    if (v <= 0) return 10;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }

  function renderChart(list, now, label) {
    var box = $('time-chart'), points = series(list, now);
    box.textContent = '';
    renderTimeTable(points);
    if (!points.length) {
      box.appendChild(el('div', 'chart-empty', posts.length ? 'No posts on this platform yet.' : 'Log a post to start the chart.'));
      chart = null; return;
    }
    var w = Math.max(280, box.clientWidth || 600), h = 230, m = { l: 44, r: 58, t: 14, b: 26 };
    var pw = w - m.l - m.r, ph = h - m.t - m.b, t0 = points[0].t, t1 = points[points.length - 1].t;
    var max = niceMax(Math.max.apply(null, points.map(function (p) { return p.v; })) * 1.08);
    var x = function (t) { return m.l + (t1 === t0 ? pw / 2 : (t - t0) / (t1 - t0) * pw); };
    var y = function (v) { return m.t + ph - v / max * ph; };

    var root = svg('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', tabindex: '0',
      'aria-label': 'Total views, ' + label + ': from ' + full(points[0].v) + ' to ' + full(points[points.length - 1].v) + '. Use the arrow keys to read each day.' });
    var grid = svg('g', { class: 'grid' });
    for (var i = 0; i <= 4; i++) {
      var gv = max / 4 * i, gy = y(gv);
      grid.appendChild(svg('line', { x1: m.l, x2: m.l + pw, y1: gy, y2: gy }));
      var tick = svg('text', { class: 'tick', x: m.l - 8, y: gy + 4, 'text-anchor': 'end' });
      tick.textContent = fmt(gv); grid.appendChild(tick);
    }
    [0, Math.floor((points.length - 1) / 2), points.length - 1].filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(function (index, i, all) {
      var label = svg('text', { class: 'tick', x: x(points[index].t), y: h - 6, 'text-anchor': all.length > 1 && i === 0 ? 'start' : i === all.length - 1 && all.length > 1 ? 'end' : 'middle' });
      label.textContent = shortDay(points[index].t); grid.appendChild(label);
    });
    root.appendChild(grid);

    var line = points.map(function (p, i) { return (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
    root.appendChild(svg('path', { class: 'area', d: line + ' L' + x(t1).toFixed(1) + ' ' + y(0) + ' L' + x(t0).toFixed(1) + ' ' + y(0) + ' Z' }));
    root.appendChild(svg('path', { class: 'line', d: line }));
    var last = points[points.length - 1];
    root.appendChild(svg('circle', { class: 'end', cx: x(last.t), cy: y(last.v), r: 4 }));
    var endLabel = svg('text', { class: 'end-label', x: x(last.t) + 9, y: y(last.v) + 4 });
    endLabel.textContent = fmt(last.v); root.appendChild(endLabel);

    // the crosshair snaps to the nearest day; the hit area is the whole plot
    var cross = svg('g', { visibility: 'hidden' });
    var crossLine = svg('line', { class: 'cross', y1: m.t, y2: m.t + ph });
    var crossDot = svg('circle', { class: 'cross-dot', r: 4 });
    cross.appendChild(crossLine); cross.appendChild(crossDot); root.appendChild(cross);
    var hit = svg('rect', { x: m.l, y: 0, width: pw, height: h, fill: 'transparent' });
    root.appendChild(hit);
    box.appendChild(root);
    var tip = el('div', 'tip'); tip.hidden = true;
    var tipValue = el('strong'), tipDate = el('span');
    tip.appendChild(tipValue); tip.appendChild(tipDate); box.appendChild(tip);

    chart = { points: points, index: points.length - 1 };
    function show(index) {
      chart.index = Math.max(0, Math.min(points.length - 1, index));
      var p = points[chart.index], px = x(p.t), py = y(p.v);
      crossLine.setAttribute('x1', px); crossLine.setAttribute('x2', px);
      crossDot.setAttribute('cx', px); crossDot.setAttribute('cy', py);
      cross.setAttribute('visibility', 'visible');
      tipValue.textContent = full(p.v) + ' views';
      tipDate.textContent = longDay(p.t);
      tip.hidden = false;
      tip.style.left = Math.max(70, Math.min(w - 70, px)) + 'px';
      tip.style.top = Math.max(0, py - 62) + 'px';
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; }
    hit.addEventListener('pointermove', function (event) {
      var rect = root.getBoundingClientRect(), px = (event.clientX - rect.left) * (w / rect.width), best = 0;
      points.forEach(function (p, i) { if (Math.abs(x(p.t) - px) < Math.abs(x(points[best].t) - px)) best = i; });
      show(best);
    });
    hit.addEventListener('pointerleave', hide);
    root.addEventListener('focus', function () { show(chart.index); });
    root.addEventListener('blur', hide);
    root.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); show(chart.index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
  }

  // the chart's table twin
  function renderTimeTable(points) {
    var wrap = $('time-table-wrap');
    wrap.textContent = '';
    var table = el('table', 'table'), head = el('thead'), row = el('tr'), body = el('tbody');
    row.appendChild(el('th', '', 'Day')); var th = el('th', 'num', 'Total views'); row.appendChild(th);
    head.appendChild(row); table.appendChild(head);
    points.slice().reverse().forEach(function (p) {
      var tr = el('tr'); tr.appendChild(el('td', '', longDay(p.t))); tr.appendChild(el('td', 'num', full(p.v))); body.appendChild(tr);
    });
    table.appendChild(body); wrap.appendChild(table);
    if (!points.length) wrap.appendChild(el('p', 'muted', 'No data yet.'));
  }

  // ---------- views by platform: one hue for every bar, the value at its tip ----------

  function renderPlatforms(list) {
    var ul = $('platform-bars'), totals = {};
    ul.textContent = '';
    list.forEach(function (post) {
      var key = PLATFORMS[post.data.platform] ? post.data.platform : 'other';
      totals[key] = totals[key] || { views: 0, posts: 0 };
      totals[key].views += post.latest.views; totals[key].posts++;
    });
    var keys = Object.keys(totals).sort(function (a, b) { return totals[b].views - totals[a].views; });
    if (!keys.length) { ul.appendChild(el('li', 'muted', 'No posts yet.')); return; }
    var max = Math.max.apply(null, keys.map(function (k) { return totals[k].views; })) || 1;
    keys.forEach(function (key) {
      var li = el('li'), track = el('span', 'track'), bar = el('span', 'bar'), val = el('span', 'val', fmt(totals[key].views));
      li.appendChild(el('span', 'name', PLATFORMS[key]));
      bar.style.width = 'calc((100% - 74px) * ' + (totals[key].views / max).toFixed(4) + ')';
      val.title = full(totals[key].views) + ' views';
      val.appendChild(el('span', 'sub', totals[key].posts + (totals[key].posts === 1 ? ' post' : ' posts')));
      track.appendChild(bar); track.appendChild(val); li.appendChild(track);
      li.setAttribute('aria-label', PLATFORMS[key] + ': ' + full(totals[key].views) + ' views from ' + totals[key].posts + ' posts');
      ul.appendChild(li);
    });
  }

  // ---------- where it's posted ----------

  function twoFigures(v) { if (v < 10) return Math.round(v); var p = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; }
  // five steps on a log scale between the smallest and largest state, rounded to two figures
  function thresholds(min, max) {
    var out = [];
    if (max > min) for (var i = 1; i < 5; i++) out.push(twoFigures(min * Math.pow(max / min, i / 5)));
    return out.filter(function (v, i, a) { return v > min && v <= max && a.indexOf(v) === i; });
  }

  function renderMap(list) {
    var byState = {}, byRegion = {}, unmapped = 0;
    list.forEach(function (post) {
      if (!post.state) { unmapped++; return; }
      var s = byState[post.state] = byState[post.state] || { posts: 0, views: 0, gained: 0 };
      s.posts++; s.views += post.latest.views; s.gained += post.gained;
      var region = GEO.STATES[post.state].region;
      var r = byRegion[region] = byRegion[region] || { posts: 0, views: 0 };
      r.posts++; r.views += post.latest.views;
    });
    var totals = Object.keys(byState).map(function (k) { return byState[k].views; });
    var max = Math.max.apply(null, [0].concat(totals)), min = Math.min.apply(null, totals.length ? totals : [0]);
    var cuts = thresholds(min, max);
    var step = function (v) { var i = 0; while (i < cuts.length && v >= cuts[i]) i++; return Math.min(i + (RAMP.length - 1 - cuts.length), RAMP.length - 1); };

    var tiles = $('tiles'), wrap = $('map');
    tiles.textContent = '';
    var old = wrap.querySelector('.tip'); if (old) old.remove();
    var tip = el('div', 'tip'); tip.hidden = true;
    var tipValue = el('strong'), tipSub = el('span');
    tip.appendChild(tipValue); tip.appendChild(tipSub); wrap.appendChild(tip);
    Object.keys(GEO.STATES).forEach(function (abbr) {
      var g = GEO.STATES[abbr], s = byState[abbr], tile = el('div', 'tile' + (s ? ' has' : ''));
      tile.style.gridRow = g.row; tile.style.gridColumn = g.col;
      tile.setAttribute('role', 'listitem');
      tile.appendChild(el('b', '', abbr));
      if (s) {
        var fill = RAMP[step(s.views)];
        tile.style.background = fill; tile.style.color = inkFor(fill);
        tile.appendChild(el('small', '', fmt(s.views)));
        tile.tabIndex = 0;
      }
      var label = g.name + ': ' + (s ? full(s.views) + ' views from ' + s.posts + (s.posts === 1 ? ' post' : ' posts') : 'no posts');
      tile.setAttribute('aria-label', label);
      var show = function () {
        tipValue.textContent = s ? full(s.views) + ' views' : 'No posts yet';
        tipSub.textContent = g.name + ' · ' + g.region + (s ? ' · ' + s.posts + (s.posts === 1 ? ' post' : ' posts') : '');
        tip.hidden = false;
        var box = wrap.getBoundingClientRect(), t = tile.getBoundingClientRect();
        tip.style.left = Math.max(80, Math.min(box.width - 80, t.left - box.left + wrap.scrollLeft + t.width / 2)) + 'px';
        tip.style.top = Math.max(0, t.top - box.top - 58) + 'px';
      };
      tile.addEventListener('pointerenter', show); tile.addEventListener('focus', show);
      tile.addEventListener('pointerleave', function () { tip.hidden = true; }); tile.addEventListener('blur', function () { tip.hidden = true; });
      tiles.appendChild(tile);
    });

    // legend: one row per step in use, then the empty state
    var legend = $('map-legend'), bounds = [min].concat(cuts);
    legend.textContent = '';
    if (max > 0) {
      bounds.forEach(function (lo, i) {
        var hi = i + 1 < bounds.length ? bounds[i + 1] : null, li = el('li'), sw = el('i');
        sw.style.background = RAMP[Math.min(i + (RAMP.length - 1 - cuts.length), RAMP.length - 1)];
        li.appendChild(sw); li.appendChild(document.createTextNode(hi ? fmt(lo) + '–' + fmt(hi - 1) : fmt(lo) + '+'));
        legend.insertBefore(li, legend.firstChild);
      });
    }
    var none = el('li'); none.appendChild(el('i', 'none')); none.appendChild(document.createTextNode('No posts')); legend.appendChild(none);

    // regions: one hue for every bar
    var bars = $('region-bars'), rmax = Math.max.apply(null, [1].concat(GEO.REGIONS.map(function (r) { return byRegion[r] ? byRegion[r].views : 0; })));
    bars.textContent = '';
    GEO.REGIONS.slice().sort(function (a, b) { return (byRegion[b] ? byRegion[b].views : 0) - (byRegion[a] ? byRegion[a].views : 0); }).forEach(function (region) {
      var r = byRegion[region] || { posts: 0, views: 0 }, li = el('li'), track = el('span', 'track'), bar = el('span', 'bar'), val = el('span', 'val', fmt(r.views));
      li.appendChild(el('span', 'name', region));
      bar.style.width = 'calc((100% - 52px) * ' + (r.views / rmax).toFixed(4) + ')';
      if (!r.views) bar.style.minWidth = '0';
      val.title = full(r.views) + ' views from ' + r.posts + ' posts';
      track.appendChild(bar); track.appendChild(val); li.appendChild(track); bars.appendChild(li);
    });
    $('unmapped').hidden = !unmapped;
    $('unmapped').textContent = unmapped + (unmapped === 1 ? ' post has' : ' posts have') + ' no state yet. Edit ' + (unmapped === 1 ? 'it' : 'them') + ' to put ' + (unmapped === 1 ? 'it' : 'them') + ' on the map.';

    // the table twin
    var tw = $('map-table-wrap'), table = el('table', 'table'), head = el('tr'), body = el('tbody');
    tw.textContent = '';
    ['State', 'Region', 'Posts', 'Views', $('posts-gained-head').textContent].forEach(function (h, i) { head.appendChild(el('th', i > 1 ? 'num' : '', h)); });
    var thead = el('thead'); thead.appendChild(head); table.appendChild(thead);
    Object.keys(byState).sort(function (a, b) { return byState[b].views - byState[a].views; }).forEach(function (abbr) {
      var s = byState[abbr], tr = el('tr');
      tr.appendChild(el('td', '', GEO.STATES[abbr].name)); tr.appendChild(el('td', '', GEO.STATES[abbr].region));
      tr.appendChild(el('td', 'num', s.posts)); tr.appendChild(el('td', 'num', full(s.views))); tr.appendChild(el('td', 'num', (s.gained > 0 ? '+' : '') + full(s.gained)));
      body.appendChild(tr);
    });
    table.appendChild(body); tw.appendChild(table);
    if (!Object.keys(byState).length) tw.appendChild(el('p', 'muted', 'No posts with a state yet.'));
  }

  // ---------- top creators and schools ----------

  function renderGroup(id, list, keyOf, describe) {
    var body = $(id), groups = {};
    body.textContent = '';
    list.forEach(function (post) {
      var key = keyOf(post) || '—';
      if (!groups[key]) groups[key] = { label: describe(post), posts: 0, views: 0, gained: 0 };
      groups[key].posts++; groups[key].views += post.latest.views; groups[key].gained += post.gained;
    });
    var rows = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.views - a.views; }).slice(0, 8);
    if (!rows.length) {
      var tr = el('tr'), td = el('td', 'muted', 'Nothing yet.'); td.colSpan = 4; tr.appendChild(td); body.appendChild(tr); return;
    }
    rows.forEach(function (g) {
      var tr = el('tr'), who = el('td');
      who.appendChild(el('strong', '', g.label.name));
      if (g.label.sub) who.appendChild(el('span', 'muted', g.label.sub));
      tr.appendChild(who);
      tr.appendChild(el('td', 'num', g.posts));
      var v = el('td', 'num', fmt(g.views)); v.title = full(g.views); tr.appendChild(v);
      var gn = el('td', 'num' + (g.gained > 0 ? ' up' : ''), (g.gained > 0 ? '+' : '') + fmt(g.gained)); gn.title = full(g.gained); tr.appendChild(gn);
      body.appendChild(tr);
    });
  }

  // ---------- posts ----------

  function renderPosts(list) {
    var body = $('post-rows'), query = $('search').value.trim().toLowerCase(), sort = $('sort').value;
    body.textContent = '';
    var rows = list.filter(function (post) {
      return !query || [post.data.title, post.creator, post.handle, post.school, post.data.url, PLATFORMS[post.data.platform]].join(' ').toLowerCase().indexOf(query) > -1;
    });
    var rate = function (post) { return post.latest.views ? engagement(post.latest) / post.latest.views : -1; };
    rows.sort(function (a, b) {
      if (sort === 'gained') return b.gained - a.gained;
      if (sort === 'engagement') return rate(b) - rate(a);
      if (sort === 'newest') return b.posted - a.posted;
      return b.latest.views - a.latest.views;
    });
    $('posts-table').hidden = !rows.length;
    $('posts-empty').hidden = rows.length > 0;
    $('posts-empty-title').textContent = posts.length ? 'No matching posts.' : 'No posts logged yet.';
    $('posts-empty-text').textContent = posts.length ? 'Try another search or platform.' : 'Log a posted video with its link and today\'s numbers. Each update after that adds a dated point.';
    $('log-first').hidden = posts.length > 0;
    rows.forEach(function (post) { body.appendChild(postRow(post)); });
  }

  function cell(tr, className, label, text, title) {
    var td = el('td', className, text);
    if (label) td.dataset.label = label;
    if (title) td.title = title;
    tr.appendChild(td);
    return td;
  }

  function postRow(post) {
    var tr = el('tr'), what = el('td'), url = safeLink(post.data.url), title = el('strong');
    if (url) { var a = el('a', '', post.data.title || 'Untitled'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; title.appendChild(a); }
    else title.textContent = post.data.title || 'Untitled';
    what.appendChild(title);
    var meta = el('span', 'muted');
    meta.appendChild(el('span', 'pill', PLATFORMS[post.data.platform] || 'Other'));
    meta.appendChild(document.createTextNode('Posted ' + (post.posted ? shortDay(post.posted) : '—')));
    what.appendChild(meta);
    tr.appendChild(what);

    var who = el('td');
    who.appendChild(el('strong', '', post.creator || 'Unattributed'));
    if (post.school || post.handle) who.appendChild(el('span', 'muted', [post.handle, post.school].filter(Boolean).join(' · ')));
    tr.appendChild(who);

    cell(tr, 'num', 'Views', fmt(post.latest.views), full(post.latest.views));
    cell(tr, 'num' + (post.gained > 0 ? ' up' : ''), $('posts-gained-head').textContent, (post.gained > 0 ? '+' : '') + fmt(post.gained), full(post.gained));
    cell(tr, 'num', 'Engagement', post.latest.views ? pct(engagement(post.latest) / post.latest.views) : '—',
      full(post.latest.likes) + ' likes · ' + full(post.latest.comments) + ' comments · ' + full(post.latest.shares) + ' shares');
    cell(tr, 'num', 'Updated', post.latest.at ? ago(post.latest.at) : '—', post.latest.at ? new Date(post.latest.at).toLocaleString() : '');

    var actions = el('td', 'actions');
    [['Update numbers', 'text-button', function () { openNumbers(post); }],
     ['Edit', 'text-button', function () { openPost(post); }],
     ['Delete', 'text-button danger', function () { removePost(post); }]].forEach(function (spec) {
      var button = el('button', spec[1], spec[0]); button.type = 'button';
      button.setAttribute('aria-label', spec[0] + ': ' + (post.data.title || 'post'));
      button.addEventListener('click', spec[2]); actions.appendChild(button);
    });
    tr.appendChild(actions);
    return tr;
  }

  // ---------- log or edit a post ----------

  (function fillStates() {
    var select = $('f-state');
    GEO.sorted().forEach(function (s) { select.appendChild(new Option(s.name, s.abbr)); });
  })();
  function timeInput(t) { var d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  // a school logged before already knows its state
  function stateForSchool(school) {
    school = String(school || '').trim().toLowerCase();
    var hit = school && posts.filter(function (p) { return p.state && p.school.trim().toLowerCase() === school; })[0];
    return hit ? hit.state : '';
  }

  function fillLists() {
    var creators = {}, schools = {};
    Object.keys(submissions).forEach(function (id) { var s = submissions[id] || {}; if (s.name) creators[s.name] = 1; if (s.school) schools[s.school] = 1; });
    posts.forEach(function (post) { if (post.creator) creators[post.creator] = 1; if (post.school) schools[post.school] = 1; });
    [['creator-list', creators], ['school-list', schools]].forEach(function (pair) {
      var list = $(pair[0]); list.textContent = '';
      Object.keys(pair[1]).sort().forEach(function (value) { var o = el('option'); o.value = value; list.appendChild(o); });
    });
    var select = $('f-submission');
    select.textContent = '';
    select.appendChild(new Option('None', ''));
    Object.keys(submissions).map(function (id) { return { id: id, s: submissions[id] || {} }; })
      .sort(function (a, b) { return (b.s.submitted_at || 0) - (a.s.submitted_at || 0); })
      .forEach(function (item) { select.appendChild(new Option((item.s.title || 'Untitled') + ' · ' + (item.s.name || 'unknown'), item.id)); });
  }

  function setError(id, message) { $(id).textContent = message || ''; }

  function openPost(post) {
    editing = post || null;
    $('post-dialog-title').textContent = post ? 'Edit post' : 'Log a post';
    $('post-dialog-lede').textContent = post ? 'Change the details. Numbers are updated separately.' : 'Paste the link to the posted video, then today\'s numbers.';
    $('f-numbers').hidden = !!post;
    $('post-save').textContent = post ? 'Save changes' : 'Save post';
    var d = post ? post.data : {};
    $('f-submission').value = d.submission && submissions[d.submission] ? d.submission : '';
    $('f-url').value = d.url || '';
    $('f-platform').value = d.platform || 'tiktok';
    $('f-posted').value = dateInput(post ? post.posted : Date.now());
    $('f-posted').max = dateInput(Date.now());
    $('f-time').value = timeInput(post ? post.posted : Date.now());
    $('f-state').value = post ? post.state : '';
    $('f-tags').value = post ? post.tags : '';
    $('f-title').value = d.title || '';
    $('f-creator').value = d.creator || '';
    $('f-school').value = d.school || '';
    ['f-views', 'f-likes', 'f-comments', 'f-shares'].forEach(function (id) { $(id).value = ''; });
    document.querySelectorAll('#post-form [aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); });
    setError('post-error');
    $('post-dialog').showModal();
    (post ? $('f-title') : $('f-url')).focus();
  }

  $('f-url').addEventListener('input', function () { var p = detectPlatform(this.value); if (p) $('f-platform').value = p; });
  $('f-submission').addEventListener('change', function () {
    var s = submissions[this.value];
    if (!s) return;
    if (!$('f-title').value.trim()) $('f-title').value = s.title || '';
    $('f-creator').value = s.name || '';
    $('f-school').value = s.school || '';
    if (!$('f-state').value) $('f-state').value = stateForSchool(s.school);
  });
  $('f-school').addEventListener('change', function () { if (!$('f-state').value) $('f-state').value = stateForSchool(this.value); });

  function numbersFrom(prefix, required) {
    var out = {}, names = ['views', 'likes', 'comments', 'shares'];
    for (var i = 0; i < names.length; i++) {
      var input = $(prefix + names[i]), raw = input.value.trim();
      if (!raw) { if (names[i] === 'views' && required) return { error: 'Add the view count.', input: input }; out[names[i]] = 0; continue; }
      var n = Number(raw);
      if (!isFinite(n) || n < 0 || n % 1 || n > 1e11) return { error: 'Numbers are whole and 0 or more.', input: input };
      out[names[i]] = n;
    }
    return { values: out };
  }

  $('post-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var fail = function (input, message) { input.setAttribute('aria-invalid', 'true'); input.focus(); setError('post-error', message); };
    document.querySelectorAll('#post-form [aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); });
    var url = cleanLink($('f-url').value), title = $('f-title').value.trim().replace(/\s+/g, ' ');
    var posted = fromDateInput($('f-posted').value), time = /^(\d{2}):(\d{2})$/.exec($('f-time').value || '12:00');
    if (time) posted += (Number(time[1]) * 60 + Number(time[2])) * 60000;
    if (!url) return fail($('f-url'), 'Paste the full link to the post.');
    if (!isFinite(posted)) return fail($('f-posted'), 'Pick the day it went up.');
    if (posted > Date.now() + 5 * 60000) return fail($('f-time'), 'That time hasn\'t happened yet.');
    if (!title) return fail($('f-title'), 'Give the post a title.');
    var details = {
      url: url, platform: $('f-platform').value, title: title, posted_at: posted,
      creator: $('f-creator').value.trim().replace(/\s+/g, ' ') || null,
      school: $('f-school').value.trim().replace(/\s+/g, ' ') || null,
      submission: $('f-submission').value || null,
      state: $('f-state').value || null,
      hashtags: cleanTags($('f-tags').value) || null
    };
    var save = $('post-save'); save.disabled = true;
    try {
      if (editing) {
        var first = editing.snaps[0];
        if (first && first.at < posted) return fail($('f-posted'), 'This post has numbers from before then.');
        await db('PATCH', '/content_posts/' + editing.id, details);
      } else {
        var numbers = numbersFrom('f-', true);
        if (numbers.error) return fail(numbers.input, numbers.error);
        var snap = Object.assign({ at: Date.now() }, numbers.values), body = { created_at: { '.sv': 'timestamp' }, latest: snap, snapshots: {} };
        body.snapshots[newId()] = snap;
        Object.keys(details).forEach(function (key) { if (details[key] !== null) body[key] = details[key]; });
        await db('PUT', '/content_posts/' + newId(), body);
      }
      $('post-dialog').close();
      await load();
    } catch (error) {
      if (!window.contentAuth.handle(error)) setError('post-error', 'That didn\'t save. Check your connection and try again.');
    } finally { save.disabled = false; }
  });

  // ---------- update numbers: one more dated snapshot ----------

  function newest(snaps) { return snaps.reduce(function (best, s) { return !best || s.at > best.at ? s : best; }, null); }
  function plain(snap) { return { views: snap.views, likes: snap.likes, comments: snap.comments, shares: snap.shares, at: snap.at }; }

  function openNumbers(post) {
    numbersFor = post;
    $('numbers-lede').textContent = (post.data.title || 'Untitled') + ' · ' + (PLATFORMS[post.data.platform] || 'Other');
    $('n-date').value = dateInput(Date.now());
    $('n-date').max = dateInput(Date.now());
    $('n-date').min = dateInput(post.posted || 0);
    $('n-views').value = post.latest.views; $('n-likes').value = post.latest.likes;
    $('n-comments').value = post.latest.comments; $('n-shares').value = post.latest.shares;
    document.querySelectorAll('#numbers-form [aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); });
    setError('numbers-error');
    renderHistory(post);
    $('numbers-dialog').showModal();
    $('n-views').select();
  }

  function renderHistory(post) {
    var ul = $('history');
    ul.textContent = '';
    post.snaps.slice().reverse().forEach(function (snap) {
      var li = el('li'), text = el('span');
      text.appendChild(el('b', '', longDay(snap.at)));
      text.appendChild(document.createTextNode(' · ' + full(snap.views) + ' views · ' + full(snap.likes) + ' likes · ' + full(snap.comments) + ' comments · ' + full(snap.shares) + ' shares'));
      li.appendChild(text); li.appendChild(el('span'));
      var del = el('button', 'text-button danger', 'Remove'); del.type = 'button';
      del.setAttribute('aria-label', 'Remove the numbers from ' + longDay(snap.at));
      del.disabled = post.snaps.length < 2;
      del.title = post.snaps.length < 2 ? 'A post keeps at least one set of numbers' : '';
      del.addEventListener('click', function () { removeSnapshot(post, snap); });
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  $('numbers-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var post = numbersFor, fail = function (input, message) { input.setAttribute('aria-invalid', 'true'); input.focus(); setError('numbers-error', message); };
    var day = fromDateInput($('n-date').value), today = startOfDay(Date.now());
    if (!isFinite(day)) return fail($('n-date'), 'Pick the day these numbers are from.');
    if (day > today) return fail($('n-date'), 'That day hasn\'t happened yet.');
    var at = day === today ? Date.now() : day + 12 * 3600000;
    if (at < post.posted) return fail($('n-date'), 'That\'s before the post went up.');
    var numbers = numbersFrom('n-', true);
    if (numbers.error) return fail(numbers.input, numbers.error);
    var snap = Object.assign({ at: at }, numbers.values), update = {};
    update['snapshots/' + newId()] = snap;
    update.latest = plain(newest(post.snaps.concat([snap])));
    var save = $('numbers-save'); save.disabled = true;
    try {
      await db('PATCH', '/content_posts/' + post.id, update);
      $('numbers-dialog').close();
      await load();
    } catch (error) {
      if (!window.contentAuth.handle(error)) setError('numbers-error', 'That didn\'t save. Check your connection and try again.');
    } finally { save.disabled = false; }
  });

  async function removeSnapshot(post, snap) {
    if (post.snaps.length < 2 || !confirm('Remove the numbers from ' + longDay(snap.at) + '?')) return;
    var update = {};
    update['snapshots/' + snap.id] = null;
    update.latest = plain(newest(post.snaps.filter(function (s) { return s !== snap; })));
    try {
      await db('PATCH', '/content_posts/' + post.id, update);
      await load();
      var fresh = posts.filter(function (p) { return p.id === post.id; })[0];
      if (fresh && $('numbers-dialog').open) { numbersFor = fresh; renderHistory(fresh); }
    } catch (error) {
      if (!window.contentAuth.handle(error)) setError('numbers-error', 'That didn\'t save. Check your connection and try again.');
    }
  }

  async function removePost(post) {
    if (!confirm('Delete "' + (post.data.title || 'this post') + '" and all its numbers? This can\'t be undone.')) return;
    try { await db('DELETE', '/content_posts/' + post.id); await load(); }
    catch (error) { failed(error); }
  }

  // ---------- CSV: one row per snapshot, so the history goes with it ----------

  function csvCell(value) {
    var text = value === undefined || value === null ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function exportCsv() {
    var lines = [['post_id', 'title', 'platform', 'url', 'creator', 'school', 'state', 'region', 'posted_at', 'hashtags', 'numbers_at', 'views', 'likes', 'comments', 'shares'].join(',')];
    posts.forEach(function (post) {
      post.snaps.forEach(function (snap) {
        lines.push([post.id, post.data.title, PLATFORMS[post.data.platform] || 'Other', post.data.url, post.creator, post.school,
          post.state, post.state ? GEO.STATES[post.state].region : '', post.posted ? new Date(post.posted).toISOString() : '', post.tags,
          new Date(snap.at).toISOString(), snap.views, snap.likes, snap.comments, snap.shares].map(csvCell).join(','));
      });
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'campus-media-analytics-' + dateInput(Date.now()) + '.csv';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  // ---------- controls ----------

  document.querySelectorAll('#ranges button').forEach(function (button) {
    button.addEventListener('click', function () {
      range = Number(button.dataset.range);
      document.querySelectorAll('#ranges button').forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      render();
    });
  });
  $('platform').addEventListener('change', function () { platform = this.value; render(); });
  $('search').addEventListener('input', function () { renderPosts(visible()); });
  $('sort').addEventListener('change', function () { renderPosts(visible()); });
  $('log-post').addEventListener('click', function () { openPost(null); });
  $('log-first').addEventListener('click', function () { openPost(null); });
  $('export').addEventListener('click', exportCsv);
  $('refresh').addEventListener('click', load);
  $('map-toggle').addEventListener('click', function () {
    var table = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', String(table));
    this.textContent = table ? 'Show as map' : 'Show as table';
    $('map-view').hidden = table; $('map-table-wrap').hidden = !table;
  });
  $('time-toggle').addEventListener('click', function () {
    var table = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', String(table));
    this.textContent = table ? 'Show as chart' : 'Show as table';
    $('time-chart').hidden = table; $('time-table-wrap').hidden = !table;
  });
  document.querySelectorAll('dialog [data-close]').forEach(function (button) {
    button.addEventListener('click', function () { button.closest('dialog').close(); });
  });
  if ('ResizeObserver' in window) {
    var frame = 0;
    new ResizeObserver(function () {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () { if (posts.length || chart) renderChart(visible(), Date.now(), range ? 'last ' + range + ' days' : 'all time'); });
    }).observe($('time-chart'));
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && window.contentAuth.signedIn() && Date.now() - loadedAt > 60000) load();
  });

  window.contentAuth.init({
    main: 'analytics', onOpen: load, onSignOut: function () { posts = []; },
    denied: 'This email can\'t open media analytics.'
  });
})();
