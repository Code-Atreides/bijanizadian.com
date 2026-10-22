// Caption archive at /campus/captions: every caption the campus program has posted
// with, in one place to search and copy from. Captions live on the posts in RTDB
// content_posts/<id>/caption: the content backend (functions-content) saves each
// tracked creator's caption as their posts come in, and the team adds or fixes one
// here, or pastes it when logging a post on /campus/analytics. Each caption shows
// its post's newest likes, comments and views (Instagram hides views, so those
// show only once the team logs them).
// Everything typed in is untrusted: it goes into the page as text, and a post link
// becomes an <a> only if it is https. Sign-in comes from content-auth.js.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var db = window.contentAuth.db;
  var PLATFORMS = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', x: 'X', other: 'Other' };
  // each app's caption limit; the archive stores up to the longest
  var LIMITS = { instagram: 2200, tiktok: 4000 }, MAX = 4000;
  // hashtags and @handles (dots inside a handle, not at the end of a sentence)
  var TAG = /([#@][\p{L}\p{N}_]+(?:\.[\p{L}\p{N}_]+)*)/u;

  var posts = [], creators = {}, view = 'captions', platform = 'all', tag = '', loading = false, loadedAt = 0, editing = null;

  // ---------- helpers ----------

  var compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  var whole = new Intl.NumberFormat('en');
  function fmt(n) { n = Math.round(n || 0); return Math.abs(n) >= 1000 ? compact.format(n) : whole.format(n); }
  function full(n) { return whole.format(Math.round(n || 0)); }
  function shortDay(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); }
  function known(v) { if (v === null || v === undefined || v === '') return null; v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : null; }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function safeLink(value) {
    try { var url = new URL(String(value || '')); return url.protocol === 'https:' ? url : null; } catch (e) { return null; }
  }
  function tagsIn(text) {
    var seen = {};
    return (String(text || '').match(/#[\p{L}\p{N}_]+/gu) || []).map(function (t) { return t.toLowerCase(); })
      .filter(function (t) { if (seen[t]) return false; seen[t] = 1; return true; });
  }

  // ---------- the data ----------

  function normalize(id, data) {
    var c = data.creator_id ? creators[data.creator_id] : null, latest = data.latest || {};
    var caption = typeof data.caption === 'string' ? data.caption.trim() : '';
    return {
      id: id, data: data, caption: caption, tags: tagsIn(caption),
      creator: data.creator || (c && c.name) || '', school: data.school || (c && c.school) || '',
      posted: Number(data.posted_at) || 0,
      likes: known(latest.likes), comments: known(latest.comments), views: known(latest.views)
    };
  }

  async function load() {
    if (loading) return;
    loading = true; $('board').classList.add('refetching'); $('refresh').disabled = true;
    try {
      var results = await Promise.all([db('GET', '/content_posts'), db('GET', '/content_creators')]);
      creators = results[1] || {};
      var raw = results[0] || {};
      posts = Object.keys(raw).map(function (id) { return normalize(id, raw[id] || {}); });
      loadedAt = Date.now();
      $('cap-error').hidden = true;
      render();
    } catch (error) { failed(error); }
    finally { loading = false; $('board').classList.remove('refetching'); $('refresh').disabled = false; }
  }

  function failed(error) {
    if (window.contentAuth.handle(error)) return;
    $('cap-error').textContent = 'The archive couldn\'t update. Check your connection and refresh.';
    $('cap-error').hidden = false;
  }

  // ---------- the archive ----------

  function onPlatform() { return posts.filter(function (p) { return platform === 'all' || p.data.platform === platform; }); }

  function render() {
    var list = onPlatform(), withCaption = list.filter(function (p) { return p.caption; }), missing = list.length - withCaption.length;
    if (tag && !withCaption.some(function (p) { return p.tags.indexOf(tag) > -1; })) tag = '';
    $('cap-summary').textContent = posts.length
      ? withCaption.length + (withCaption.length === 1 ? ' caption' : ' captions') + (missing ? ' · ' + missing + (missing === 1 ? ' post' : ' posts') + ' without one' : '')
      : 'No posts logged yet.';
    $('n-captions').textContent = withCaption.length;
    $('n-missing').textContent = missing;
    renderTags(withCaption);
    $('tag-row').hidden = view !== 'captions' || !$('tags').children.length;
    $('sort').disabled = view !== 'captions';
    if (view === 'captions') renderCaptions(withCaption); else renderMissing(list.filter(function (p) { return !p.caption; }));
  }

  // the hashtags captions use most, as filters
  function renderTags(list) {
    var counts = {}, box = $('tags');
    list.forEach(function (p) { p.tags.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); }).slice(0, 12);
    box.textContent = '';
    top.forEach(function (t) {
      var chip = el('button', 'chip');
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(t === tag));
      chip.appendChild(document.createTextNode(t));
      chip.appendChild(el('b', '', counts[t]));
      chip.addEventListener('click', function () { tag = tag === t ? '' : t; render(); });
      box.appendChild(chip);
    });
  }

  function matches(p) {
    var query = $('search').value.trim().toLowerCase();
    return !query || [p.caption, p.data.title, p.creator, p.school, PLATFORMS[p.data.platform]].join(' ').toLowerCase().indexOf(query) > -1;
  }

  function renderCaptions(list) {
    var box = $('caption-list'), sort = $('sort').value;
    var rows = list.filter(function (p) { return matches(p) && (!tag || p.tags.indexOf(tag) > -1); });
    var score = function (p, m) { return p[m] === null ? -1 : p[m]; };
    rows.sort(function (a, b) {
      if (sort === 'likes') return score(b, 'likes') - score(a, 'likes') || b.posted - a.posted;
      if (sort === 'views') return score(b, 'views') - score(a, 'views') || b.posted - a.posted;
      return b.posted - a.posted;
    });
    box.textContent = ''; $('missing-list').textContent = '';
    box.hidden = !rows.length; $('missing-list').hidden = true;
    empty(!rows.length, posts.some(function (p) { return p.caption; })
      ? ['No matching captions.', 'Try another search, hashtag or platform.']
      : ['No captions yet.', 'Captions land here when tracked creators post, or when you add one to a post.']);
    rows.forEach(function (p) { box.appendChild(card(p)); });
    // "Show more" only where the caption is clamped
    requestAnimationFrame(function () {
      box.querySelectorAll('.cap-text').forEach(function (text) {
        var more = text.nextElementSibling;
        if (more && more.classList.contains('more')) more.hidden = text.scrollHeight <= text.clientHeight + 2;
      });
    });
  }

  function empty(show, copy) {
    $('cap-empty').hidden = !show;
    $('cap-empty-title').textContent = copy[0];
    $('cap-empty-text').textContent = copy[1];
  }

  function meta(p) {
    var line = el('div', 'cap-meta');
    line.appendChild(el('span', 'pill', PLATFORMS[p.data.platform] || 'Other'));
    if (p.data.source === 'brightdata') { var auto = el('span', 'pill', 'Auto'); auto.title = 'Saved automatically from the creator\'s profile'; line.appendChild(auto); }
    line.appendChild(el('strong', '', p.creator || 'Unattributed'));
    line.appendChild(el('span', 'muted', [p.school, p.posted ? shortDay(p.posted) : ''].filter(Boolean).join(' · ')));
    return line;
  }

  // the caption as text, with hashtags and @mentions picked out
  function captionText(caption) {
    var p = el('p', 'cap-text');
    caption.split(TAG).forEach(function (part, i) {
      if (!part) return;
      p.appendChild(i % 2 ? el('span', 'tag', part) : document.createTextNode(part));
    });
    return p;
  }

  function numbers(p) {
    var bits = [];
    if (p.likes !== null) bits.push(full(p.likes) + (p.likes === 1 ? ' like' : ' likes'));
    if (p.comments !== null) bits.push(full(p.comments) + (p.comments === 1 ? ' comment' : ' comments'));
    if (p.views !== null) bits.push(fmt(p.views) + ' views');
    else if (p.data.platform === 'instagram') bits.push('views hidden');
    return bits.join(' · ');
  }

  function card(p) {
    var art = el('article', 'cap');
    art.appendChild(meta(p));
    art.appendChild(captionText(p.caption));
    var more = el('button', 'more', 'Show more'); more.type = 'button'; more.hidden = true;
    more.addEventListener('click', function () {
      var open = art.classList.toggle('is-open');
      more.textContent = open ? 'Show less' : 'Show more';
    });
    art.appendChild(more);
    var foot = el('div', 'cap-foot');
    foot.appendChild(el('span', 'cap-nums', numbers(p)));
    var actions = el('span', 'cap-actions');
    var copyButton = el('button', 'text-button', 'Copy'); copyButton.type = 'button';
    copyButton.setAttribute('aria-label', 'Copy the caption: ' + (p.data.title || 'post'));
    copyButton.addEventListener('click', function () { copy(p.caption, copyButton); });
    actions.appendChild(copyButton);
    var url = safeLink(p.data.url);
    if (url) { var open = el('a', 'text-button', 'Open post'); open.href = url.href; open.target = '_blank'; open.rel = 'noopener noreferrer'; actions.appendChild(open); }
    var edit = el('button', 'text-button', 'Edit'); edit.type = 'button';
    edit.setAttribute('aria-label', 'Edit the caption: ' + (p.data.title || 'post'));
    edit.addEventListener('click', function () { openCaption(p); });
    actions.appendChild(edit);
    foot.appendChild(actions);
    art.appendChild(foot);
    return art;
  }

  function renderMissing(list) {
    var box = $('missing-list');
    var rows = list.filter(matches).sort(function (a, b) { return b.posted - a.posted; });
    box.textContent = ''; $('caption-list').textContent = '';
    box.hidden = !rows.length; $('caption-list').hidden = true;
    empty(!rows.length, posts.length ? ['Every post has its caption.', 'Posts logged without one show up here.'] : ['No posts logged yet.', 'Log posts on Analytics, or track creators there.']);
    rows.forEach(function (p) {
      var li = el('li', 'miss'), what = el('div'), url = safeLink(p.data.url), title = el('strong');
      if (url) { var a = el('a', '', p.data.title || 'Untitled'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; title.appendChild(a); }
      else title.textContent = p.data.title || 'Untitled';
      what.appendChild(title);
      what.appendChild(meta(p));
      li.appendChild(what);
      var add = el('button', 'option', 'Add caption'); add.type = 'button';
      add.setAttribute('aria-label', 'Add the caption: ' + (p.data.title || 'post'));
      add.addEventListener('click', function () { openCaption(p); });
      li.appendChild(add);
      box.appendChild(li);
    });
  }

  async function copy(text, button) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      var area = el('textarea'); area.value = text; area.setAttribute('readonly', ''); area.className = 'offscreen';
      document.body.appendChild(area); area.select();
      try { document.execCommand('copy'); } catch (err) { /* nothing more to try */ }
      area.remove();
    }
    button.textContent = 'Copied';
    setTimeout(function () { button.textContent = 'Copy'; }, 1600);
  }

  // ---------- add or edit a caption ----------

  function counter() {
    var n = $('c-text').value.length, limit = editing && LIMITS[editing.data.platform];
    $('c-count').textContent = full(n) + (limit ? ' / ' + full(limit) + ' · ' + PLATFORMS[editing.data.platform] + '\'s limit' : ' characters');
    $('c-count').classList.toggle('over', !!limit && n > limit);
  }

  function openCaption(p) {
    editing = p;
    $('caption-title').textContent = p.caption ? 'Edit caption' : 'Add caption';
    $('caption-lede').textContent = (p.data.title || 'Untitled') + ' · ' + (PLATFORMS[p.data.platform] || 'Other') + (p.creator ? ' · ' + p.creator : '');
    $('c-text').value = p.caption;
    $('caption-error').textContent = '';
    counter();
    $('caption-dialog').showModal();
    $('c-text').focus();
  }
  $('c-text').addEventListener('input', counter);

  $('caption-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var text = $('c-text').value.replace(/\r\n/g, '\n').trim(), save = $('caption-save');
    if (text.length > MAX) { $('caption-error').textContent = 'Captions are ' + full(MAX) + ' characters at most.'; return; }
    var update = { caption: text || null }, tags = tagsIn(text).join(' ');
    if (tags) update.hashtags = tags.slice(0, 500);
    save.disabled = true;
    try {
      await db('PATCH', '/content_posts/' + editing.id, update);
      $('caption-dialog').close();
      await load();
    } catch (error) {
      if (!window.contentAuth.handle(error)) $('caption-error').textContent = 'That didn\'t save. Check your connection and try again.';
    } finally { save.disabled = false; }
  });

  // ---------- CSV ----------

  function csvCell(value) {
    var text = value === undefined || value === null ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function exportCsv() {
    var lines = [['post_id', 'platform', 'posted_at', 'creator', 'school', 'title', 'url', 'likes', 'comments', 'views', 'caption'].join(',')];
    posts.filter(function (p) { return p.caption; }).sort(function (a, b) { return b.posted - a.posted; }).forEach(function (p) {
      lines.push([p.id, PLATFORMS[p.data.platform] || 'Other', p.posted ? new Date(p.posted).toISOString() : '', p.creator, p.school, p.data.title, p.data.url,
        p.likes, p.comments, p.views, p.caption].map(csvCell).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'campus-captions-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  // ---------- controls ----------

  document.querySelectorAll('#views button').forEach(function (button) {
    button.addEventListener('click', function () {
      view = button.dataset.view;
      document.querySelectorAll('#views button').forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      render();
    });
  });
  $('platform').addEventListener('change', function () { platform = this.value; render(); });
  $('search').addEventListener('input', render);
  $('sort').addEventListener('change', render);
  $('export').addEventListener('click', exportCsv);
  $('refresh').addEventListener('click', load);
  document.querySelectorAll('dialog [data-close]').forEach(function (button) {
    button.addEventListener('click', function () { button.closest('dialog').close(); });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && window.contentAuth.signedIn() && Date.now() - loadedAt > 60000) load();
  });

  window.contentAuth.init({
    main: 'captions', onOpen: load, onSignOut: function () { posts = []; creators = {}; },
    denied: 'This email can\'t open the caption archive.'
  });
})();
