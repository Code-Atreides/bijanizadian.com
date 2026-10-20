// The campus media CRM at /campus/submissions: an emailed sign-in link (as on
// /agencykit), then every entry in RTDB content_submissions (turned in from
// /campus/media or /campus/submit) with its status from content_status, plus
// a creators view rolled up by email and a CSV export. Only the team's verified email can read either node,
// so a signed-in stranger gets "no access" from the database itself.
// Submitted values are untrusted: they go into the page as text, and a file
// link becomes an <a> only if it is https.
(function () {
  'use strict';

  var API_KEY = 'AIzaSyCEVPrJm9r_zP3pWBQV0XrCz6_68cnjySw';
  var DB = 'https://bijanizadian-84e48-default-rtdb.firebaseio.com';
  var FORM_URL = 'https://bijanizadian.com/campus/media#turn-in';
  var SESSION = 'content-inbox-session-v1', EMAIL = 'content-inbox-email';
  var STATUSES = ['new', 'editing', 'done'];
  var LABELS = { 'new': 'New', editing: 'Editing', done: 'Done' };

  var saved = {
    get: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set: function (key, value) { try { localStorage.setItem(key, value); } catch (e) {} },
    remove: function (key) { try { localStorage.removeItem(key); } catch (e) {} }
  };
  var $ = function (id) { return document.getElementById(id); };

  var auth = null, items = [], filter = 'new', mode = 'queue', loadedAt = 0, loading = false;
  try { auth = JSON.parse(saved.get(SESSION) || 'null'); } catch (e) { auth = null; }
  if (!auth || !auth.refreshToken) auth = null;

  // ---------- sign-in ----------

  function emailLinkCode(href) {
    try {
      var url = new URL(href);
      for (var i = 0; i < 4; i++) {
        if (url.searchParams.get('mode') === 'signIn' && url.searchParams.get('oobCode')) return url.searchParams.get('oobCode');
        var nested = url.searchParams.get('link') || url.searchParams.get('deep_link_id');
        if (!nested) break;
        url = new URL(nested);
      }
    } catch (e) {}
    return '';
  }
  var code = emailLinkCode(location.href);

  function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }

  async function identity(action, body) {
    var response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:' + action + '?key=' + API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    var result = await response.json();
    if (!response.ok) {
      var reason = (result.error && result.error.message) || '';
      if (/EXPIRED_OOB_CODE|INVALID_OOB_CODE/.test(reason)) throw Error('This sign-in link has expired or was already used. Request a new one.');
      if (/TOO_MANY|QUOTA/.test(reason)) throw Error('Too many attempts. Try again later.');
      throw Error('Sign-in could not finish. Check the email address and try a new link.');
    }
    return result;
  }

  async function token() {
    if (!auth) throw Error('signed-out');
    if (auth.expiresAt > Date.now() + 60000) return auth.idToken;
    var response = await fetch('https://securetoken.googleapis.com/v1/token?key=' + API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: auth.refreshToken }), signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw Error('signed-out');
    var data = await response.json();
    auth.idToken = data.id_token; auth.refreshToken = data.refresh_token;
    auth.expiresAt = Date.now() + Number(data.expires_in) * 1000;
    saved.set(SESSION, JSON.stringify(auth));
    return auth.idToken;
  }

  function continueUrl() {
    // the link must come back to an authorised domain; local previews use the live page
    return /(^|\.)bijanizadian\.com$|\.web\.app$|\.firebaseapp\.com$/.test(location.hostname)
      ? location.origin + location.pathname : 'https://bijanizadian.com/campus/submissions';
  }

  function notice(message, isError) {
    $('signin-notice').textContent = message || '';
    $('signin-notice').classList.toggle('is-error', !!isError);
  }

  function showSignIn(message, isError) {
    $('queue').hidden = true; $('account').hidden = true; $('signin').hidden = false;
    $('link-form').hidden = !!code; $('finish-form').hidden = !code;
    if (code) $('finish-email').value = saved.get(EMAIL) || '';
    notice(message, isError);
  }

  $('link-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var email = cleanEmail($('link-email').value), button = $('link-send');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return notice('Enter a valid email address.', true);
    button.disabled = true; notice('Sending…');
    try {
      await identity('sendOobCode', { requestType: 'EMAIL_SIGNIN', email: email, continueUrl: continueUrl(), canHandleCodeInApp: true });
      saved.set(EMAIL, email);
      notice('Check your email and open the sign-in link on this device.');
    } catch (error) { notice(error.message, true); }
    finally { button.disabled = false; }
  });

  $('finish-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var button = $('finish-send');
    button.disabled = true; notice('Signing in…');
    try {
      var result = await identity('signInWithEmailLink', { email: cleanEmail($('finish-email').value), oobCode: code });
      auth = { uid: result.localId, email: result.email, idToken: result.idToken, refreshToken: result.refreshToken, expiresAt: Date.now() + Number(result.expiresIn) * 1000 };
      saved.set(SESSION, JSON.stringify(auth));
      code = ''; history.replaceState(null, '', location.pathname);
      notice('');
      openQueue();
    } catch (error) { notice(error.message, true); }
    finally { button.disabled = false; }
  });

  function signOut(message, isError) {
    auth = null; items = []; saved.remove(SESSION);
    showSignIn(message, isError);
    $('signin-title').focus();
  }
  $('sign-out').addEventListener('click', function () { signOut('Signed out.'); });

  // ---------- the database ----------

  async function db(method, path, body) {
    var access = await token();
    var response = await fetch(DB + path + '.json?auth=' + encodeURIComponent(access), {
      method: method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    if (response.status === 401 || response.status === 403) throw Error('no-access');
    if (!response.ok) throw Error('offline');
    return response.json();
  }

  function failed(error) {
    if (error.message === 'signed-out') return signOut('Your session ended. Sign in again.', true);
    if (error.message === 'no-access') return signOut('This email can\'t open the media CRM.', true);
    $('queue-error').textContent = 'The queue couldn\'t update. Check your connection and refresh.';
    $('queue-error').hidden = false;
  }

  async function load() {
    if (loading) return;
    loading = true; $('refresh').disabled = true;
    try {
      var results = await Promise.all([db('GET', '/content_submissions'), db('GET', '/content_status')]);
      var entries = results[0] || {}, statuses = results[1] || {};
      items = Object.keys(entries).map(function (id) {
        var entry = entries[id] || {};
        var status = statuses[id] && STATUSES.indexOf(statuses[id].status) > 0 ? statuses[id].status : 'new';
        return { id: id, entry: entry, status: status };
      }).sort(function (a, b) { return (b.entry.submitted_at || 0) - (a.entry.submitted_at || 0); });
      loadedAt = Date.now();
      $('queue-error').hidden = true;
      render();
    } catch (error) { failed(error); }
    finally { loading = false; $('refresh').disabled = false; }
  }

  async function setStatus(item, status) {
    var before = item.status;
    if (before === status) return;
    item.status = status; render();
    try {
      if (status === 'new') await db('DELETE', '/content_status/' + item.id);
      else await db('PUT', '/content_status/' + item.id, { status: status, updated_at: { '.sv': 'timestamp' } });
    } catch (error) { item.status = before; render(); failed(error); }
  }

  async function remove(item) {
    var label = (item.entry.title || 'this submission') + (item.entry.name ? ' from ' + item.entry.name : '');
    if (!confirm('Delete "' + label + '"? This can\'t be undone.')) return;
    var update = {};
    update['content_submissions/' + item.id] = null;
    update['content_status/' + item.id] = null;
    try {
      await db('PATCH', '/', update);
      items = items.filter(function (other) { return other !== item; });
      render();
    } catch (error) { failed(error); }
  }

  // ---------- the list ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function safeLink(value) {
    try { var url = new URL(String(value || '')); return url.protocol === 'https:' ? url : null; } catch (e) { return null; }
  }

  function ago(time) {
    var seconds = Math.max(0, (Date.now() - time) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 7 * 86400) return Math.floor(seconds / 86400) + 'd ago';
    return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function matches(item, query) {
    if (!query) return true;
    var entry = item.entry;
    return [entry.title, entry.name, entry.school, entry.handle, entry.email, entry.notes].join(' ').toLowerCase().indexOf(query) > -1;
  }

  function icon(paths, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    paths.forEach(function (d) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d); svg.appendChild(path);
    });
    return svg;
  }

  function row(item) {
    var entry = item.entry, li = el('li', 'item');
    li.dataset.id = item.id;

    var what = el('div', 'what');
    what.appendChild(el('h2', '', entry.title || 'Untitled'));
    if (entry.notes) {
      var notes = el('p', 'notes', entry.notes);
      what.appendChild(notes);
      if (entry.notes.length > 140 || entry.notes.indexOf('\n') > -1) {
        var more = el('button', 'more', 'Show all notes');
        more.type = 'button';
        more.addEventListener('click', function () {
          var open = notes.classList.toggle('is-open');
          more.textContent = open ? 'Show less' : 'Show all notes';
        });
        what.appendChild(more);
      }
    }
    li.appendChild(what);

    var who = el('div', 'who');
    who.appendChild(el('strong', '', entry.name || 'No name'));
    var line = el('span', '', [entry.school, entry.handle].filter(Boolean).join(' · '));
    who.appendChild(line);
    if (entry.email) {
      who.appendChild(document.createElement('br'));
      var mail = el('a', '', entry.email);
      mail.href = 'mailto:' + entry.email;
      who.appendChild(mail);
    }
    var inline = el('span', 'when-inline', entry.submitted_at ? ' · ' + ago(entry.submitted_at) : '');
    line.appendChild(inline);
    li.appendChild(who);

    var when = el('div', 'when', entry.submitted_at ? ago(entry.submitted_at) : '');
    if (entry.submitted_at) when.title = new Date(entry.submitted_at).toLocaleString();
    li.appendChild(when);

    var actions = el('div', 'actions');
    var url = safeLink(entry.link);
    if (url) {
      var open = el('a', 'option open');
      open.href = url.href; open.target = '_blank'; open.rel = 'noopener noreferrer';
      open.appendChild(el('span', '', 'Open'));
      open.appendChild(el('small', '', url.hostname.replace(/^www\./, '')));
      open.appendChild(icon(['M7 7h10v10', 'M7 17 17 7'], 14));
      actions.appendChild(open);
    } else {
      actions.appendChild(el('span', 'option missing', 'No usable link'));
    }

    var status = el('div', 'status');
    status.setAttribute('role', 'group');
    status.setAttribute('aria-label', 'Status of ' + (entry.title || 'this submission'));
    STATUSES.forEach(function (value) {
      var button = el('button', '', LABELS[value]);
      button.type = 'button'; button.dataset.status = value;
      button.setAttribute('aria-pressed', String(item.status === value));
      button.addEventListener('click', function () { setStatus(item, value); });
      status.appendChild(button);
    });
    actions.appendChild(status);

    var trash = el('button', 'remove');
    trash.type = 'button';
    trash.setAttribute('aria-label', 'Delete ' + (entry.title || 'this submission'));
    trash.title = 'Delete';
    trash.appendChild(icon(['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6'], 16));
    trash.addEventListener('click', function () { remove(item); });
    actions.appendChild(trash);

    li.appendChild(actions);
    return li;
  }

  // ---------- creators: everyone who has turned something in, by email ----------

  function creators() {
    var byEmail = {};
    // items are newest first, so the first entry per email holds their latest details
    items.forEach(function (item) {
      var entry = item.entry, key = String(entry.email || '').toLowerCase() || 'no-email:' + item.id;
      var person = byEmail[key];
      if (!person) person = byEmail[key] = { email: entry.email || '', name: entry.name || '', school: entry.school || '', handle: '', last: entry.submitted_at || 0, total: 0, 'new': 0, editing: 0, done: 0 };
      if (!person.handle && entry.handle) person.handle = entry.handle;
      person.total++; person[item.status]++;
    });
    return Object.keys(byEmail).map(function (key) { return byEmail[key]; });
  }

  function personRow(person) {
    var tr = document.createElement('tr');
    var who = document.createElement('td');
    who.appendChild(el('strong', '', person.name || 'No name'));
    if (person.handle) who.appendChild(el('span', '', person.handle));
    tr.appendChild(who);
    tr.appendChild(el('td', '', person.school));
    var contact = document.createElement('td');
    if (person.email) { var mail = el('a', '', person.email); mail.href = 'mailto:' + person.email; contact.appendChild(mail); }
    tr.appendChild(contact);
    var count = document.createElement('td');
    count.appendChild(el('span', 'num', person.total));
    var split = [];
    STATUSES.forEach(function (status) { if (person[status]) split.push(person[status] + ' ' + LABELS[status].toLowerCase()); });
    count.appendChild(el('span', 'split', split.join(' · ')));
    tr.appendChild(count);
    var last = el('td', '', person.last ? ago(person.last) : '');
    if (person.last) last.title = new Date(person.last).toLocaleString();
    tr.appendChild(last);
    var action = document.createElement('td');
    var view = el('button', 'text-button', 'View submissions');
    view.type = 'button';
    view.addEventListener('click', function () {
      $('search').value = person.email || person.name;
      setFilter('all'); setMode('queue');
    });
    action.appendChild(view);
    tr.appendChild(action);
    return tr;
  }

  function personMatches(person, query) {
    if (!query) return true;
    return [person.name, person.school, person.handle, person.email].join(' ').toLowerCase().indexOf(query) > -1;
  }

  function render() {
    var counts = { 'new': 0, editing: 0, done: 0, all: items.length };
    items.forEach(function (item) { counts[item.status]++; });
    Object.keys(counts).forEach(function (key) { $('count-' + key).textContent = counts[key]; });
    $('queue-summary').textContent = items.length
      ? counts['new'] + ' new · ' + counts.editing + ' editing · ' + counts.done + ' done'
      : 'No submissions yet.';

    var people = creators(), weekAgo = Date.now() - 7 * 86400000, schools = {};
    items.forEach(function (item) { if (item.entry.school) schools[item.entry.school.trim().toLowerCase()] = true; });
    $('stat-total').textContent = items.length;
    $('stat-creators').textContent = people.length;
    $('stat-schools').textContent = Object.keys(schools).length;
    $('stat-week').textContent = items.filter(function (item) { return (item.entry.submitted_at || 0) > weekAgo; }).length;

    var query = $('search').value.trim().toLowerCase();
    var list = $('list'), rows = $('people-rows');
    list.textContent = ''; rows.textContent = '';
    var creatorsMode = mode === 'creators';
    $('tabs').hidden = creatorsMode; $('people-count').hidden = !creatorsMode;
    list.hidden = creatorsMode; $('people').hidden = !creatorsMode;

    var count;
    if (creatorsMode) {
      var found = people.filter(function (person) { return personMatches(person, query); });
      found.forEach(function (person) { rows.appendChild(personRow(person)); });
      $('people-count').textContent = people.length + (people.length === 1 ? ' creator' : ' creators') + ' · newest first';
      $('people').hidden = !found.length;
      count = found.length;
    } else {
      var shown = items.filter(function (item) { return (filter === 'all' || item.status === filter) && matches(item, query); });
      shown.forEach(function (item) { list.appendChild(row(item)); });
      count = shown.length;
    }

    $('empty').hidden = count > 0;
    if (!count) {
      $('empty-title').textContent = query ? 'No matches.' : creatorsMode || filter === 'all' ? 'No submissions yet.' : 'Nothing ' + LABELS[filter].toLowerCase() + '.';
      $('empty-text').textContent = query ? 'Try another name, school or email.' : 'Anything turned in from /campus/media or /campus/submit shows up here.';
    }
  }

  function setFilter(value) {
    filter = value;
    document.querySelectorAll('.tabs button').forEach(function (other) { other.setAttribute('aria-pressed', String(other.dataset.filter === value)); });
  }
  function setMode(value) {
    mode = value;
    document.querySelectorAll('.modes button').forEach(function (other) { other.setAttribute('aria-pressed', String(other.dataset.mode === value)); });
    render();
  }

  // ---------- CSV export: every submission, whatever the filter ----------

  function csvCell(value) {
    var text = value === undefined || value === null ? '' : String(value);
    // a cell that starts with = + - @ would run as a formula in a spreadsheet
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function exportCsv() {
    var header = ['submitted_at', 'status', 'title', 'name', 'email', 'school', 'handle', 'link', 'notes'];
    var lines = [header.join(',')].concat(items.map(function (item) {
      var entry = item.entry;
      return [entry.submitted_at ? new Date(entry.submitted_at).toISOString() : '', item.status, entry.title, entry.name, entry.email, entry.school, entry.handle, entry.link, entry.notes].map(csvCell).join(',');
    }));
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'campus-media-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  document.querySelectorAll('.tabs button').forEach(function (button) {
    button.addEventListener('click', function () { setFilter(button.dataset.filter); render(); });
  });
  document.querySelectorAll('.modes button').forEach(function (button) {
    button.addEventListener('click', function () { setMode(button.dataset.mode); });
  });
  $('export').addEventListener('click', exportCsv);
  $('search').addEventListener('input', function () { render(); });
  $('refresh').addEventListener('click', load);
  $('copy-form').addEventListener('click', function () {
    var label = $('copy-form').querySelector('.copy-label');
    navigator.clipboard.writeText(FORM_URL).then(function () {
      label.textContent = 'Copied'; setTimeout(function () { label.textContent = 'Copy turn-in link'; }, 1600);
    }, function () { prompt('Turn-in link', FORM_URL); });
  });
  // coming back to the tab shows anything sent in the meantime
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && auth && Date.now() - loadedAt > 30000) load();
  });

  function openQueue() {
    $('signin').hidden = true; $('queue').hidden = false; $('account').hidden = false;
    $('account-email').textContent = auth.email || '';
    load();
  }

  if (code) showSignIn('Confirm your email to finish signing in.');
  else if (auth) openQueue();
  else showSignIn('');
})();
