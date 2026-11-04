// The accounts list at /campus/accounts: every Instagram account in the campus
// network, whether we own it (we hold the login) or just have it (someone else runs
// it), and the logins set up for accounts that aren't linked to a page yet.
// Accounts live in RTDB content_accounts, readable by the team. Passwords live
// apart in content_account_logins, which the database lets only the admin email
// read or write, so a teammate never receives them. The page asks for keys alone
// (shallow) to learn whether this person is the admin, and fetches one password
// only when it's revealed or copied. Followers, posts and last post come from the
// import unless the account is tracked daily (content_creators), when followers
// come from there. Everything goes in as text; profile links are built from a
// checked handle. No account data or password belongs in this file or the repo.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var db = function (method, path, body) { return window.contentAuth.db(method, path, body); };
  var whole = new Intl.NumberFormat('en-US');
  var accounts = {}, tracked = {}, loginIds = {}, isAdmin = false, tab = 'all', loading = false, first = true, editing = null, hideTimer = 0, shown = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function handleOf(value) {
    var text = String(value || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').toLowerCase();
    return /^[a-z0-9._]{1,30}$/.test(text) ? text : '';
  }
  function kind(a) { return !a.handle ? 'unlinked' : a.status === 'own' ? 'own' : 'have'; }
  var KIND = { own: 'We own', have: 'We have', unlinked: 'Not linked' };
  function day(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function followersOf(a) {
    var live = a.handle && tracked[a.handle];
    return live && live.count !== null ? live.count : typeof a.followers === 'number' ? a.followers : null;
  }

  function skeleton() {
    var body = $('acc-rows');
    body.textContent = '';
    for (var i = 0; i < 8; i++) {
      var tr = el('tr');
      for (var c = 0; c < 7; c++) { var td = el('td'); td.appendChild(el('span', 'skeleton')); tr.appendChild(td); }
      body.appendChild(tr);
    }
  }

  async function load() {
    if (loading) return;
    loading = true; $('refresh').disabled = true;
    if (first) skeleton(); else $('acc-board').classList.add('refetching');
    try {
      var results = await Promise.all([db('GET', '/content_accounts'), db('GET', '/content_creators')]);
      accounts = results[0] || {};
      tracked = {};
      var creators = results[1] || {};
      Object.keys(creators).forEach(function (id) {
        var match = String((creators[id] || {}).instagram || '').match(/instagram\.com\/([^/]+)/);
        var f = creators[id] && creators[id].followers && creators[id].followers.instagram;
        if (match) tracked[match[1].toLowerCase()] = { count: f && typeof f.count === 'number' ? f.count : null };
      });
      // only the admin may ask for this; anyone else is refused and sees no passwords
      try { loginIds = (await window.contentAuth.db('GET', '/content_account_logins', undefined, 'shallow=true')) || {}; isAdmin = true; }
      catch (error) { if (error.message !== 'no-access') throw error; loginIds = {}; isAdmin = false; }
      $('acc-error').hidden = true;
      render();
      if (first) { first = false; $('acc-stats').classList.add('settle'); $('acc-rows').classList.add('settle'); }
      else $('acc-rows').classList.remove('settle');
    } catch (error) {
      if (window.contentAuth.handle(error)) return;
      $('acc-error').textContent = 'Accounts couldn\'t load. Check your connection and refresh to try again.';
      $('acc-error').hidden = false;
      if (first) { $('acc-rows').textContent = ''; $('acc-summary').textContent = 'Not loaded.'; }
    } finally {
      loading = false; $('acc-board').classList.remove('refetching'); $('refresh').disabled = false;
    }
  }

  function list() {
    return Object.keys(accounts).map(function (id) { var a = accounts[id] || {}; a.id = id; return a; });
  }

  function render() {
    hidePassword();
    var all = list(), counts = { all: all.length, own: 0, have: 0, unlinked: 0 };
    all.forEach(function (a) { counts[kind(a)]++; });
    ['all', 'own', 'have', 'unlinked'].forEach(function (key) { $('n-' + key).textContent = counts[key]; });
    var live = counts.own + counts.have, followers = 0;
    all.forEach(function (a) { followers += followersOf(a) || 0; });
    $('s-live').textContent = live; $('s-own').textContent = counts.own; $('s-have').textContent = counts.have;
    $('s-unlinked').textContent = counts.unlinked; $('s-followers').textContent = whole.format(followers);
    var checked = all.map(function (a) { return a.checked_at || 0; }).reduce(function (x, y) { return Math.max(x, y); }, 0);
    $('acc-summary').textContent = all.length ? live + ' on Instagram, ' + counts.unlinked + ' logins not linked' + (checked ? ' · numbers from ' + day(checked) : '') : 'No accounts yet.';

    document.querySelectorAll('.col-password').forEach(function (th) { th.hidden = !isAdmin; });
    var query = $('search').value.trim().toLowerCase(), body = $('acc-rows');
    var rows = all.filter(function (a) { return tab === 'all' || kind(a) === tab; }).filter(function (a) {
      return !query || [a.handle, a.school, a.name, a.login_email, a.note].join(' ').toLowerCase().indexOf(query) > -1;
    });
    var order = { own: 0, have: 1, unlinked: 2 };
    rows.sort(function (a, b) {
      return order[kind(a)] - order[kind(b)] || (followersOf(b) || 0) - (followersOf(a) || 0) || String(a.school || a.login_email).localeCompare(String(b.school || b.login_email));
    });
    body.textContent = '';
    $('acc-table').hidden = !rows.length;
    $('acc-empty').hidden = rows.length > 0;
    $('acc-empty-title').textContent = all.length ? 'No matching accounts.' : 'No accounts yet.';
    $('acc-empty-text').textContent = all.length ? 'Try another search or tab.' : 'Add the first one with its Instagram link.';
    rows.forEach(function (a) { body.appendChild(row(a)); });
  }

  function cell(tr, className, label, text) {
    var td = el('td', className, text);
    if (label) td.dataset.label = label;
    tr.appendChild(td);
    return td;
  }

  function row(a) {
    var tr = el('tr'), who = el('td', 'acc-who'), title = el('strong');
    if (a.handle) {
      var link = el('a', '', '@' + a.handle);
      link.href = 'https://www.instagram.com/' + a.handle + '/'; link.target = '_blank'; link.rel = 'noopener noreferrer';
      title.appendChild(link);
    } else title.textContent = a.school || a.login_email || 'Unnamed';
    who.appendChild(title);
    var detail = [a.handle ? a.school : '', a.note].filter(Boolean).join(' · ');
    if (detail) who.appendChild(el('span', 'muted acc-detail', detail));
    tr.appendChild(who);

    var kindCell = el('td'), k = kind(a);
    kindCell.dataset.label = 'Status';
    kindCell.appendChild(el('span', 'pill' + (k === 'own' ? ' pill-own' : ''), KIND[k]));
    if (a.handle && tracked[a.handle]) kindCell.appendChild(el('span', 'pill', 'Daily'));
    tr.appendChild(kindCell);

    var f = followersOf(a);
    cell(tr, 'num', 'Followers', f === null ? '—' : whole.format(f));
    cell(tr, 'num', 'Posts', typeof a.posts === 'number' ? whole.format(a.posts) : '—');
    cell(tr, 'num', 'Last post', a.last_post_at ? day(a.last_post_at) : a.handle && a.checked_at ? 'None' : '—');
    cell(tr, 'acc-email', 'Login', a.login_email || '—');

    if (isAdmin) {
      var pw = el('td', 'acc-password');
      pw.dataset.label = 'Password';
      if (loginIds[a.id]) {
        var value = el('span', 'pw-value', '••••••••••');
        var show = el('button', 'text-button', 'Show'), copy = el('button', 'text-button', 'Copy');
        show.type = copy.type = 'button';
        var name = a.handle || a.login_email || 'this account';
        show.setAttribute('aria-label', 'Show the password for ' + name);
        copy.setAttribute('aria-label', 'Copy the password for ' + name);
        show.addEventListener('click', function () { togglePassword(a, value, show); });
        copy.addEventListener('click', function () { copyPassword(a, copy); });
        pw.appendChild(value); pw.appendChild(show); pw.appendChild(copy);
      } else pw.textContent = '—';
      tr.appendChild(pw);
    }

    var actions = el('td', 'actions'), edit = el('button', 'text-button', 'Edit');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Edit ' + (a.handle || a.login_email || 'account'));
    edit.addEventListener('click', function () { openDialog(a); });
    actions.appendChild(edit);
    tr.appendChild(actions);
    return tr;
  }

  // ---------- passwords: fetched for the moment they're needed, and not kept ----------
  function hidePassword() {
    clearTimeout(hideTimer);
    if (shown) { shown.value.textContent = '••••••••••'; shown.value.classList.remove('is-shown'); shown.button.textContent = 'Show'; shown = null; }
  }
  function refused(error) {
    if (error.message === 'no-access') { isAdmin = false; render(); return; }
    if (window.contentAuth.handle(error)) return;
    $('acc-error').textContent = 'That password couldn\'t load. Try again.';
    $('acc-error').hidden = false;
  }
  async function togglePassword(a, value, button) {
    if (shown && shown.value === value) return hidePassword();
    hidePassword();
    button.disabled = true;
    try {
      var password = await db('GET', '/content_account_logins/' + a.id + '/password');
      value.textContent = password || '(none)';
      value.classList.add('is-shown');
      button.textContent = 'Hide';
      shown = { value: value, button: button };
      hideTimer = setTimeout(hidePassword, 30000);
    } catch (error) { refused(error); }
    finally { button.disabled = false; }
  }
  async function copyPassword(a, button) {
    button.disabled = true;
    try {
      var password = await db('GET', '/content_account_logins/' + a.id + '/password');
      await navigator.clipboard.writeText(password || '');
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = 'Copy'; }, 1600);
    } catch (error) {
      if (error.name === 'NotAllowedError') { $('acc-error').textContent = 'The browser blocked copying. Use Show instead.'; $('acc-error').hidden = false; }
      else refused(error);
    } finally { button.disabled = false; }
  }

  // ---------- add and edit ----------
  function openDialog(a) {
    editing = a;
    $('acc-dialog-title').textContent = a ? 'Edit account' : 'Add an account';
    $('a-handle').value = a && a.handle ? a.handle : '';
    $('a-school').value = a ? a.school || '' : '';
    $('a-status').value = a && a.status === 'have' ? 'have' : 'own';
    $('a-email').value = a ? a.login_email || '' : '';
    $('a-note').value = a ? a.note || '' : '';
    $('a-password').value = '';
    $('a-password-field').hidden = !isAdmin;
    $('a-remove').hidden = !a;
    $('a-error').textContent = '';
    $('acc-dialog').showModal();
  }
  function slug(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }

  async function save(event) {
    event.preventDefault();
    var raw = $('a-handle').value.trim(), handle = raw ? handleOf(raw) : '';
    var email = $('a-email').value.trim().toLowerCase(), school = $('a-school').value.trim(), note = $('a-note').value.trim(), password = $('a-password').value;
    if (raw && !handle) { $('a-error').textContent = 'Enter an Instagram handle or profile link.'; return; }
    if (!handle && !email) { $('a-error').textContent = 'Add an Instagram handle or a login email.'; return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('a-error').textContent = 'Enter a valid login email.'; return; }
    var button = $('a-save');
    button.disabled = true; $('a-error').textContent = '';
    var id = editing ? editing.id : slug(handle || email.split('@')[0]);
    if (!editing && accounts[id]) id = (id + '-' + Date.now().toString(36)).slice(0, 60);
    var changes = { handle: handle || null, school: school || null, status: $('a-status').value, login_email: email || null, note: note || null };
    if (!editing) changes.created_at = { '.sv': 'timestamp' };
    // a different account's numbers no longer apply
    if (editing && (editing.handle || '') !== handle) { changes.followers = null; changes.posts = null; changes.last_post_at = null; changes.checked_at = null; changes.name = null; }
    try {
      await db('PATCH', '/content_accounts/' + id, changes);
      if (password && isAdmin) await db('PUT', '/content_account_logins/' + id, { password: password });
      $('acc-dialog').close();
      await load();
    } catch (error) {
      if (window.contentAuth.handle(error)) return;
      $('a-error').textContent = 'That didn\'t save. Check your connection and try again.';
    } finally { button.disabled = false; $('a-password').value = ''; }
  }

  async function remove() {
    if (!editing) return;
    var name = editing.handle || editing.login_email || 'this account';
    if (!window.confirm('Remove ' + name + ' from the list' + (isAdmin ? ', along with its saved password?' : '?'))) return;
    try {
      if (isAdmin) await db('DELETE', '/content_account_logins/' + editing.id);
      await db('DELETE', '/content_accounts/' + editing.id);
      $('acc-dialog').close();
      await load();
    } catch (error) {
      if (window.contentAuth.handle(error)) return;
      $('a-error').textContent = 'That didn\'t remove. Check your connection and try again.';
    }
  }

  // ---------- controls ----------
  function pickTab(name) {
    tab = name;
    document.querySelectorAll('#acc-tabs button').forEach(function (other) { other.setAttribute('aria-pressed', String(other.dataset.tab === name)); });
  }
  document.querySelectorAll('#acc-tabs button').forEach(function (button) {
    button.addEventListener('click', function () { pickTab(button.dataset.tab); render(); });
  });
  if (document.querySelector('#acc-tabs [data-tab="' + location.hash.slice(1).replace(/[^a-z]/g, '') + '"]')) pickTab(location.hash.slice(1));
  var searchWait = 0;
  $('search').addEventListener('input', function () { clearTimeout(searchWait); searchWait = setTimeout(render, 220); });
  $('refresh').addEventListener('click', load);
  $('add-account').addEventListener('click', function () { openDialog(null); });
  $('acc-form').addEventListener('submit', save);
  $('a-remove').addEventListener('click', remove);
  document.querySelectorAll('dialog [data-close]').forEach(function (button) {
    button.addEventListener('click', function () { button.closest('dialog').close(); });
  });

  window.contentAuth.init({
    main: 'accounts', onOpen: load,
    onSignOut: function () { hidePassword(); accounts = {}; loginIds = {}; isAdmin = false; first = true; },
    denied: 'This email can\'t open the accounts list.'
  });
})();
