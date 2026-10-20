// Viralify Studio at /campus/studio: for each region, when to post on TikTok and
// Instagram and which hashtags to use.
//
// When: windows are in the audience's local time (the region's main zones from
// content-geo.js), with the next one converted to the viewer's own time. They
// start from general guidance for college audiences. Once a region has 4+ timed
// posts on a platform with 3 days of numbers, the plan uses the team's own best
// slot instead (average views in the first 3 days, by weekday and time block).
// Hashtags: the team's proven tags for that region and platform, then brand,
// topic and local tags from the hashtag library (RTDB content_tags, falling back
// to starter sets), with school and state tags from posts already in the region.
// Everything typed in is untrusted and goes into the page as text.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var db = window.contentAuth.db;
  var GEO = window.contentGeo;
  var DAY = 86400000;
  var RAMP = ['#9eacf9', '#7c8df5', '#5c6fed', '#4252d6', '#2b33a8'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WEEK = [1, 2, 3, 4, 5, 6, 0];
  var PLATFORMS = { tiktok: { name: 'TikTok', count: 5, quota: { learned: 1, brand: 1, topic: 2, local: 1 } },
    instagram: { name: 'Instagram', count: 8, quota: { learned: 2, brand: 1, topic: 3, local: 2 } } };
  var TOPICS = [
    { id: 'greek-wars', name: 'Greek Wars', tags: '#greeklife #greekwars #frat #sorority' },
    { id: 'game-day', name: 'Game day', tags: '#gameday #collegefootball #tailgate #studentsection' },
    { id: 'street-questions', name: 'Street questions', tags: '#streetinterview #collegestudents #campus' },
    { id: 'skits', name: 'Skits', tags: '#collegehumor #skit #relatable' },
    { id: 'day-in-the-life', name: 'Day in the life', tags: '#dayinthelife #collegevlog #ditl' },
    { id: 'dinners', name: 'Dinners', tags: '#dinnerparty #collegefriends #friends' },
    { id: 'other', name: 'Anything else', tags: '' }
  ];
  var STARTER = { all: '#fomo #collegelife #college #campuslife', 'region-west': '#westcoast', 'region-midwest': '#midwest', 'region-south': '#southern', 'region-northeast': '#eastcoast' };
  TOPICS.forEach(function (t) { STARTER['topic-' + t.id] = t.tags; });
  // starting points, in the audience's local time: general guidance for college audiences, not measured
  var WINDOWS = {
    tiktok: [{ days: [2, 3, 4], from: 19, to: 21, at: [19, 30] }, { days: [0], from: 18, to: 20, at: [18, 30] }],
    instagram: [{ days: [1, 2, 3, 4], from: 18, to: 20, at: [18, 30] }, { days: [2, 3], from: 11, to: 13, at: [11, 30] }]
  };
  var GAME_DAY = [{ days: [6], from: 18, to: 21, at: [19, 0] }, { days: [0], from: 17, to: 20, at: [18, 0] }];
  var BLOCKS = [
    { name: 'Overnight', from: 0, to: 6 }, { name: 'Morning', from: 6, to: 11 }, { name: 'Midday', from: 11, to: 14 },
    { name: 'Afternoon', from: 14, to: 17 }, { name: 'Evening', from: 17, to: 21 }, { name: 'Late', from: 21, to: 24 }
  ];
  var LEARN_MIN = 4;
  var HERE = Intl.DateTimeFormat().resolvedOptions().timeZone;

  var posts = [], library = {}, topic = 'greek-wars', platforms = { tiktok: true, instagram: true }, regions = {}, loading = false, loadedAt = 0;
  GEO.REGIONS.forEach(function (r) { regions[r] = true; });

  // ---------- small helpers ----------

  var compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  var whole = new Intl.NumberFormat('en');
  function fmt(n) { n = Math.round(n || 0); return Math.abs(n) >= 1000 ? compact.format(n) : whole.format(n); }
  function full(n) { return whole.format(Math.round(n || 0)); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function cleanTags(value) {
    var seen = {};
    return String(value || '').split(/[\s,]+/).map(function (t) { return t.replace(/^#+/, '').toLowerCase().replace(/[^\p{L}\p{N}_]/gu, ''); })
      .filter(function (t) { if (!t || seen[t]) return false; seen[t] = 1; return true; }).slice(0, 30).map(function (t) { return '#' + t; });
  }
  function slugTag(text) { var t = String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); return t && t.length <= 30 ? '#' + t : ''; }
  function inkFor(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return 1.05 / (lum + 0.05) > (lum + 0.05) / 0.0536 ? '#ffffff' : '#0b091f';
  }
  function hour12(h, m) { var suffix = h >= 12 && h < 24 ? 'PM' : 'AM', hh = h % 12 || 12; return hh + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + suffix; }
  function hourRange(from, to) {
    var a = hour12(from, 0).split(' '), b = hour12(to % 24, 0).split(' ');
    return a[1] === b[1] ? a[0] + '–' + b[0] + ' ' + b[1] : a.join(' ') + '–' + b.join(' ');
  }
  function dayRange(days) {
    var order = days.slice().sort(function (a, b) { return WEEK.indexOf(a) - WEEK.indexOf(b); });
    var run = order.every(function (d, i) { return !i || WEEK.indexOf(d) === WEEK.indexOf(order[i - 1]) + 1; });
    if (order.length > 2 && run) return DAYS[order[0]] + '–' + DAYS[order[order.length - 1]];
    return order.map(function (d) { return DAYS[d]; }).join(order.length === 2 ? ' & ' : ', ');
  }

  // ---------- time zones ----------

  var partsCache = {};
  function zoned(t, tz) {
    var f = partsCache[tz] = partsCache[tz] || new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    var p = {};
    f.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = Number(x.value); });
    return { y: p.year, m: p.month, d: p.day, h: p.hour % 24, mi: p.minute, wd: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() };
  }
  // the instant that reads y-m-d h:mi on the clock in tz
  function instant(y, m, d, h, mi, tz) {
    var want = Date.UTC(y, m - 1, d, h, mi), t = want;
    for (var i = 0; i < 3; i++) { var p = zoned(t, tz); t += want - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi); }
    return t;
  }
  // the next time a window opens at its suggested minute, at least 15 minutes from now
  function nextSlot(win, tz) {
    var now = Date.now(), today = zoned(now, tz);
    for (var k = 0; k < 8; k++) {
      var day = new Date(Date.UTC(today.y, today.m - 1, today.d + k));
      if (win.days.indexOf(day.getUTCDay()) < 0) continue;
      var t = instant(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), win.at[0], win.at[1], tz);
      if (t > now + 15 * 60000) return t;
    }
    return null;
  }
  function clock(t, tz, withDay) {
    return new Intl.DateTimeFormat('en-US', withDay ? { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(t));
  }

  // ---------- the data ----------

  function count(v) { v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : 0; }
  function normalize(id, data) {
    var snaps = Object.keys(data.snapshots || {}).map(function (key) { var s = data.snapshots[key] || {}; return { at: Number(s.at) || 0, views: count(s.views) }; })
      .sort(function (a, b) { return a.at - b.at; });
    var state = GEO.STATES[data.state] ? data.state : '';
    return {
      id: id, platform: data.platform, posted: Number(data.posted_at) || 0, snaps: snaps,
      latest: snaps.length ? snaps[snaps.length - 1] : { at: 0, views: 0 },
      state: state, region: state ? GEO.STATES[state].region : '', school: String(data.school || '').trim(),
      tags: cleanTags(data.hashtags)
    };
  }
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
  // views in the first 3 days, only when the numbers reach past day 3
  function threeDay(post) { return post.posted && post.latest.at >= post.posted + 3 * DAY ? viewsAt(post, post.posted + 3 * DAY) : null; }

  async function load() {
    if (loading) return;
    loading = true; $('board').classList.add('refetching'); $('refresh').disabled = true;
    try {
      var results = await Promise.all([db('GET', '/content_posts'), db('GET', '/content_tags')]);
      var raw = results[0] || {};
      posts = Object.keys(raw).map(function (id) { return normalize(id, raw[id] || {}); });
      library = results[1] || {};
      loadedAt = Date.now();
      $('st-error').hidden = true;
      render();
    } catch (error) { failed(error); }
    finally { loading = false; $('board').classList.remove('refetching'); $('refresh').disabled = false; }
  }
  function failed(error) {
    if (window.contentAuth.handle(error)) return;
    $('st-error').textContent = 'The studio couldn\'t update. Check your connection and refresh.';
    $('st-error').hidden = false;
  }

  // ---------- learning from logged posts ----------

  function matching(region, platform) {
    return posts.filter(function (p) { return (!region || region === 'all' || p.region === region) && (!platform || platform === 'all' || p.platform === platform); });
  }
  function slotOf(post) {
    if (!post.state || !post.posted) return null;
    var z = zoned(post.posted, GEO.ZONES[GEO.STATES[post.state].zone].tz);
    for (var b = 0; b < BLOCKS.length; b++) if (z.h >= BLOCKS[b].from && z.h < BLOCKS[b].to) return { wd: z.wd, block: b };
    return null;
  }
  function slots(region, platform) {
    var cells = {}, used = 0;
    matching(region, platform).forEach(function (post) {
      var v = threeDay(post), s = slotOf(post);
      if (v === null || !s) return;
      used++;
      var key = s.wd + '-' + s.block, c = cells[key] = cells[key] || { wd: s.wd, block: s.block, n: 0, sum: 0 };
      c.n++; c.sum += v;
    });
    var list = Object.keys(cells).map(function (k) { var c = cells[k]; c.avg = c.sum / c.n; return c; }).sort(function (a, b) { return b.avg - a.avg; });
    return { used: used, list: list, cells: cells };
  }
  function tagStats(region, platform) {
    var stats = {};
    matching(region, platform).forEach(function (post) {
      var v = threeDay(post);
      post.tags.forEach(function (tag) {
        var s = stats[tag] = stats[tag] || { tag: tag, posts: 0, n3: 0, sum3: 0 };
        s.posts++;
        if (v !== null) { s.n3++; s.sum3 += v; }
      });
    });
    return Object.keys(stats).map(function (k) { var s = stats[k]; s.avg = s.n3 ? s.sum3 / s.n3 : null; return s; })
      .sort(function (a, b) { return (b.avg === null ? -1 : b.avg) - (a.avg === null ? -1 : a.avg) || b.posts - a.posts; });
  }

  // ---------- the plan ----------

  function libraryTags(scope) { return cleanTags(library[scope] !== undefined ? library[scope] : STARTER[scope] || ''); }

  function schedule(region, platform) {
    var learned = slots(region, platform), best = learned.list.filter(function (c) { return c.n >= 2; })[0];
    if (learned.used >= LEARN_MIN && best) {
      var block = BLOCKS[best.block], mid = Math.floor((block.from + block.to) / 2);
      return {
        windows: [{ days: [best.wd], from: block.from, to: block.to, at: [mid, block.to - block.from > 2 ? 0 : 30] }],
        learned: true, source: 'From your ' + learned.used + ' posts here',
        why: DAYS[best.wd] + ' ' + block.name.toLowerCase() + ' averaged ' + full(best.avg) + ' views in the first 3 days over ' + best.n + ' posts.'
      };
    }
    var top = learned.list[0];
    return {
      windows: topic === 'game-day' ? GAME_DAY : WINDOWS[platform], learned: false, source: 'Starting point',
      why: top ? 'Your best so far: ' + DAYS[top.wd] + ' ' + BLOCKS[top.block].name.toLowerCase() + ' (' + top.n + (top.n === 1 ? ' post' : ' posts') + '). Your own slot takes over at ' + LEARN_MIN + ' timed posts with 3 days of numbers.'
        : 'General guidance for college audiences, not measured on your posts yet.'
    };
  }

  function hashtags(region, platform) {
    var quota = PLATFORMS[platform].quota, out = [], seen = {};
    function add(list, n, reason, learned) {
      for (var i = 0; i < list.length && n > 0; i++) {
        var tag = typeof list[i] === 'string' ? list[i] : list[i].tag;
        if (!tag || seen[tag]) continue;
        seen[tag] = 1; n--;
        out.push({ tag: tag, reason: typeof reason === 'function' ? reason(list[i]) : reason, learned: !!learned });
      }
    }
    var proven = tagStats(region, platform).filter(function (s) { return s.n3 >= 2; });
    var inRegion = matching(region, null);
    var schoolCount = {}, stateCount = {};
    inRegion.forEach(function (p) { var t = slugTag(p.school); if (t) schoolCount[t] = (schoolCount[t] || 0) + 1; if (p.state) stateCount[p.state] = (stateCount[p.state] || 0) + 1; });
    var schools = Object.keys(schoolCount).sort(function (a, b) { return schoolCount[b] - schoolCount[a]; });
    var states = Object.keys(stateCount).sort(function (a, b) { return stateCount[b] - stateCount[a]; }).map(function (s) { return slugTag(GEO.STATES[s].name); });
    var brand = libraryTags('all'), topicTags = libraryTags('topic-' + topic), local = libraryTags('region-' + region.toLowerCase());
    var topicName = TOPICS.filter(function (t) { return t.id === topic; })[0].name;

    add(proven, quota.learned, function (s) { return 'Proven here: ' + full(s.avg) + ' avg views in 3 days over ' + s.n3 + ' posts'; }, true);
    add(brand, quota.brand, 'Brand');
    add(topicTags, quota.topic, 'Topic: ' + topicName);
    add(schools.concat(local, states), quota.local, function (t) { return schools.indexOf(t) > -1 ? 'A school you\'ve posted for here' : states.indexOf(t) > -1 ? 'A state you\'ve posted for here' : 'Local: ' + region; });
    // fill to the platform's size from whatever is left, in the same order
    var count = PLATFORMS[platform].count - out.length;
    add(proven, count, function (s) { return 'Proven here: ' + full(s.avg) + ' avg views in 3 days over ' + s.n3 + ' posts'; }, true); count = PLATFORMS[platform].count - out.length;
    add(topicTags, count, 'Topic: ' + topicName); count = PLATFORMS[platform].count - out.length;
    add(schools.concat(local, states), count, 'Local: ' + region); count = PLATFORMS[platform].count - out.length;
    add(brand, count, 'Broad reach');
    return out;
  }

  function planFor(region, platform) {
    var zones = GEO.REGION_ZONES[region], main = GEO.ZONES[zones[0]], plan = schedule(region, platform);
    plan.lines = plan.windows.map(function (win) {
      var next = nextSlot(win, main.tz);
      var others = zones.slice(1).map(function (z) { return next ? clock(next, GEO.ZONES[z].tz) + ' ' + GEO.ZONES[z].label : ''; }).filter(Boolean);
      return {
        when: dayRange(win.days) + ' · ' + hourRange(win.from, win.to) + ' ' + main.label,
        next: next, nextText: next ? clock(next, main.tz, true) + ' ' + main.label : '',
        others: others, mine: next ? (HERE === main.tz ? 'same as your time' : clock(next, HERE) + ' your time') : ''
      };
    });
    plan.tags = hashtags(region, platform);
    return plan;
  }

  function copyText(text, button, label) {
    var done = function () { var before = label.textContent; label.textContent = 'Copied'; setTimeout(function () { label.textContent = before; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt('Copy', text); });
    else prompt('Copy', text);
  }

  function renderPlans() {
    var box = $('plans'), chosen = GEO.REGIONS.filter(function (r) { return regions[r]; }), plats = Object.keys(PLATFORMS).filter(function (p) { return platforms[p]; });
    box.textContent = '';
    if (!chosen.length || !plats.length) {
      var empty = el('div', 'card empty plans-empty');
      empty.appendChild(el('strong', '', 'Pick at least one region and one platform.'));
      box.appendChild(empty); return;
    }
    chosen.forEach(function (region) {
      var card = el('article', 'card plan'), head = el('header'), inRegion = matching(region, null);
      head.appendChild(el('h2', '', region));
      head.appendChild(el('span', 'zones', GEO.REGION_ZONES[region].map(function (z) { return GEO.ZONES[z].label; }).join(' · ')));
      var views = inRegion.reduce(function (s, p) { return s + p.latest.views; }, 0);
      head.appendChild(el('span', 'so-far', inRegion.length ? inRegion.length + (inRegion.length === 1 ? ' post' : ' posts') + ' · ' + fmt(views) + ' views so far' : 'No posts here yet'));
      card.appendChild(head);
      plats.forEach(function (platform) {
        var plan = planFor(region, platform), block = el('section', 'pblock'), bh = el('div', 'pblock-head');
        bh.appendChild(el('span', 'pname', PLATFORMS[platform].name));
        bh.appendChild(el('span', 'source' + (plan.learned ? ' learned' : ''), plan.source));
        block.appendChild(bh);
        plan.lines.forEach(function (line, i) {
          var when = el('p', 'when');
          if (i) when.appendChild(el('span', 'or', 'or '));
          when.appendChild(document.createTextNode(line.when));
          block.appendChild(when);
          if (i === 0 && line.next) {
            var next = el('p', 'next');
            next.appendChild(document.createTextNode('Next: '));
            next.appendChild(el('b', '', line.nextText));
            if (line.others.length) next.appendChild(document.createTextNode(' (' + line.others.join(', ') + ')'));
            next.appendChild(document.createTextNode(' · ' + line.mine));
            block.appendChild(next);
          }
        });
        block.appendChild(el('p', 'hint', plan.why));
        var tags = el('ul', 'tags');
        tags.setAttribute('aria-label', PLATFORMS[platform].name + ' hashtags for the ' + region);
        plan.tags.forEach(function (t) { var li = el('li', 'tag' + (t.learned ? ' learned' : ''), t.tag); li.title = t.reason; tags.appendChild(li); });
        block.appendChild(tags);
        var row = el('div', 'copy-row'), copy = el('button', 'text-button'), label = el('span', '', 'Copy hashtags');
        copy.type = 'button'; copy.appendChild(label);
        copy.setAttribute('aria-label', 'Copy the ' + PLATFORMS[platform].name + ' hashtags for the ' + region);
        copy.addEventListener('click', function () { copyText(plan.tags.map(function (t) { return t.tag; }).join(' '), copy, label); });
        row.appendChild(el('small', '', plan.tags.length + ' tags · hover one to see why'));
        row.appendChild(copy);
        block.appendChild(row);
        card.appendChild(block);
      });
      box.appendChild(card);
    });
  }

  function planText() {
    var topicName = TOPICS.filter(function (t) { return t.id === topic; })[0].name, lines = ['Viralify plan · ' + topicName, ''];
    GEO.REGIONS.filter(function (r) { return regions[r]; }).forEach(function (region) {
      lines.push(region.toUpperCase());
      Object.keys(PLATFORMS).filter(function (p) { return platforms[p]; }).forEach(function (platform) {
        var plan = planFor(region, platform);
        lines.push(PLATFORMS[platform].name + ' (' + plan.source.toLowerCase() + ')');
        plan.lines.forEach(function (l, i) { lines.push('  ' + (i ? 'or ' : '') + l.when + (i === 0 && l.next ? ' · next ' + l.nextText + ' (' + l.mine + ')' : '')); });
        lines.push('  ' + plan.tags.map(function (t) { return t.tag; }).join(' '));
      });
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  // ---------- what's working ----------

  function renderLearn() {
    var region = $('learn-region').value, platform = $('learn-platform').value, data = slots(region, platform), wrap = $('heat-wrap');
    wrap.textContent = '';
    // five steps spread on a log scale between the weakest and strongest slot
    var values = data.list.map(function (c) { return c.avg; }).filter(function (v) { return v > 0; });
    var lo = Math.min.apply(null, values.concat([Infinity])), hi = Math.max.apply(null, values.concat([0])), cuts = [];
    if (hi > lo) for (var i = 1; i < 5; i++) cuts.push(lo * Math.pow(hi / lo, i / 5));
    var shade = function (v) { if (!cuts.length) return RAMP[2]; var i = 0; while (i < cuts.length && v >= cuts[i]) i++; return RAMP[i]; };
    var table = el('table', 'heat'), head = el('tr');
    head.appendChild(el('th', '', ''));
    BLOCKS.forEach(function (b) { var th = el('th', '', b.name); th.scope = 'col'; th.title = hourRange(b.from, b.to) + ' local time'; head.appendChild(th); });
    var thead = el('thead'); thead.appendChild(head); table.appendChild(thead);
    var body = el('tbody');
    WEEK.forEach(function (wd) {
      var tr = el('tr'), th = el('th', '', DAYS[wd]); th.scope = 'row'; tr.appendChild(th);
      BLOCKS.forEach(function (b, bi) {
        var c = data.cells[wd + '-' + bi], td = el('td', c ? 'has' : '', c ? fmt(c.avg) : '');
        if (c) { var fill = shade(c.avg); td.style.background = fill; td.style.color = inkFor(fill); }
        td.title = DAYS[wd] + ' ' + b.name.toLowerCase() + ': ' + (c ? full(c.avg) + ' avg views in 3 days over ' + c.n + (c.n === 1 ? ' post' : ' posts') : 'no posts yet');
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body); wrap.appendChild(table);
    var timed = matching(region, platform), waiting = timed.filter(function (p) { return threeDay(p) === null; }).length;
    $('heat-note').textContent = data.used
      ? 'From ' + data.used + (data.used === 1 ? ' post' : ' posts') + ', in each post\'s local time.' + (waiting ? ' ' + waiting + ' more need an update after their third day, or a state.' : '')
      : 'Fills in as posts are logged on Analytics with a state, a time and numbers from after their third day.';

    var rows = $('tag-rows'), stats = tagStats(region, platform).slice(0, 12);
    rows.textContent = '';
    if (!stats.length) { var tr = el('tr'), td = el('td', 'muted', 'No hashtags logged yet.'); td.colSpan = 3; tr.appendChild(td); rows.appendChild(tr); }
    stats.forEach(function (s) {
      var tr = el('tr');
      tr.appendChild(el('td', '', s.tag));
      tr.appendChild(el('td', 'num', s.posts));
      var v = el('td', 'num', s.avg === null ? '—' : fmt(s.avg)); v.title = s.avg === null ? 'No numbers from after day 3 yet' : full(s.avg) + ' over ' + s.n3 + ' posts'; tr.appendChild(v);
      rows.appendChild(tr);
    });
    $('tag-note').textContent = 'Hashtags come from the "Hashtags used" field on each post. Plans only lean on tags with 2+ posts of 3-day numbers.';
  }

  // ---------- the hashtag library ----------

  var SCOPES = [{ id: 'all', name: 'All regions: brand & broad' }]
    .concat(GEO.REGIONS.map(function (r) { return { id: 'region-' + r.toLowerCase(), name: 'Region: ' + r }; }))
    .concat(TOPICS.map(function (t) { return { id: 'topic-' + t.id, name: 'Topic: ' + t.name }; }));
  function renderLibrary() {
    var scope = $('lib-scope').value, mine = library[scope] !== undefined;
    $('lib-tags').value = libraryTags(scope).join(' ');
    $('lib-badge').textContent = mine ? 'Your list' : 'Starter set';
    $('lib-badge').classList.toggle('mine', mine);
    $('lib-reset').hidden = !mine;
    $('lib-status').textContent = '';
  }
  async function saveLibrary(reset) {
    var scope = $('lib-scope').value, tags = cleanTags($('lib-tags').value).join(' ');
    $('lib-save').disabled = true;
    try {
      if (reset) await db('DELETE', '/content_tags/' + scope);
      else await db('PUT', '/content_tags/' + scope, tags);
      if (reset) delete library[scope]; else library[scope] = tags;
      renderLibrary(); renderPlans();
      $('lib-status').textContent = reset ? 'Back to the starter set.' : 'Saved. The plans use it now.';
    } catch (error) {
      if (!window.contentAuth.handle(error)) $('lib-status').textContent = 'That didn\'t save. Check your connection and try again.';
    } finally { $('lib-save').disabled = false; }
  }

  // ---------- controls ----------

  function render() {
    var timed = posts.filter(function (p) { return p.state && p.posted; }).length;
    $('st-summary').textContent = posts.length
      ? 'Plans for TikTok and Instagram, region by region. ' + timed + ' of ' + posts.length + ' logged posts have a state to learn from.'
      : 'Plans for TikTok and Instagram, region by region. Log posts on Analytics and the studio learns from them.';
    renderPlans(); renderLearn(); renderLibrary();
  }

  TOPICS.forEach(function (t) { $('topic').appendChild(new Option(t.name, t.id)); });
  GEO.REGIONS.forEach(function (r) {
    var b = el('button', 'toggle', r); b.type = 'button'; b.dataset.region = r; b.setAttribute('aria-pressed', 'true');
    $('regions').appendChild(b);
    $('learn-region').appendChild(new Option(r, r));
  });
  SCOPES.forEach(function (s) { $('lib-scope').appendChild(new Option(s.name, s.id)); });
  $('topic').addEventListener('change', function () { topic = this.value; renderPlans(); });
  document.querySelectorAll('.toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      if (b.dataset.platform) platforms[b.dataset.platform] = on; else regions[b.dataset.region] = on;
      renderPlans();
    });
  });
  $('learn-platform').addEventListener('change', renderLearn);
  $('learn-region').addEventListener('change', renderLearn);
  $('lib-scope').addEventListener('change', renderLibrary);
  $('lib-save').addEventListener('click', function () { saveLibrary(false); });
  $('lib-reset').addEventListener('click', function () { saveLibrary(true); });
  $('copy-plan').addEventListener('click', function () { copyText(planText(), this, $('copy-plan-label')); });
  $('refresh').addEventListener('click', load);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && window.contentAuth.signedIn() && Date.now() - loadedAt > 60000) load();
  });

  window.contentAuth.init({
    main: 'studio', onOpen: load, onSignOut: function () { posts = []; library = {}; },
    denied: 'This email can\'t open Viralify Studio.'
  });
})();
