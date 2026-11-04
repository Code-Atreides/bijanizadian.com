// Team sign-in for the campus CRM pages: pick your name, type the password. Each name
// is a real Firebase account, so the password lives hashed in Firebase and never in
// this file or the repo. The session is kept in localStorage and shared by the pages,
// and RTDB calls carry its token. The database rules decide what each account may read,
// so a stranger is turned away by the database itself, and only the Bijan account can
// read saved Instagram passwords (content_account_logins).
// Each page has the same #signin markup and calls contentAuth.init() once.
(function () {
  'use strict';

  var API_KEY = 'AIzaSyCEVPrJm9r_zP3pWBQV0XrCz6_68cnjySw';
  var DB = 'https://bijanizadian-84e48-default-rtdb.firebaseio.com';
  var SESSION = 'campus-crm-session-v1', LAST = 'campus-crm-last-person';
  var PEOPLE = { arya: 'Arya', bijan: 'Bijan', milo: 'Milo', jesse: 'Jesse' };
  function emailOf(person) { return person + '@crm.bijanizadian.com'; }

  var saved = {
    get: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set: function (key, value) { try { localStorage.setItem(key, value); } catch (e) {} },
    remove: function (key) { try { localStorage.removeItem(key); } catch (e) {} }
  };
  var $ = function (id) { return document.getElementById(id); };

  var auth = null, app = null;
  try { auth = JSON.parse(saved.get(SESSION) || 'null'); } catch (e) { auth = null; }
  if (!auth || !auth.refreshToken) auth = null;

  async function signIn(person, password) {
    var response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOf(person), password: password, returnSecureToken: true }), signal: AbortSignal.timeout(15000)
    });
    var result = await response.json();
    if (!response.ok) {
      var reason = (result.error && result.error.message) || '';
      if (/TOO_MANY|QUOTA/.test(reason)) throw Error('Too many attempts. Try again in a few minutes.');
      if (/INVALID|EMAIL_NOT_FOUND|USER_DISABLED/.test(reason)) throw Error('That password isn\'t right.');
      throw Error('Sign-in couldn\'t finish. Check your connection and try again.');
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

  function notice(message, isError) {
    $('signin-notice').textContent = message || '';
    $('signin-notice').classList.toggle('is-error', !!isError);
  }

  function chosen() {
    var pick = document.querySelector('input[name="signin-who"]:checked');
    return pick ? pick.value : '';
  }
  // the name shows the password field; a saved login in the browser fills it for that name
  function choose(person, focus) {
    $('signin-user').value = person ? emailOf(person) : '';
    $('signin-password-field').hidden = !person;
    if (person && focus) $('signin-password').focus();
  }

  function showSignIn(message, isError) {
    $(app.main).hidden = true; $('account').hidden = true; $('signin').hidden = false;
    $('signin-password').value = '';
    var last = saved.get(LAST), box = PEOPLE[last] && document.querySelector('input[name="signin-who"][value="' + last + '"]');
    if (box) { box.checked = true; choose(last, false); }
    notice(message, isError);
  }

  function open() {
    $('signin').hidden = true; $(app.main).hidden = false; $('account').hidden = false;
    $('account-email').textContent = auth.name || '';
    app.onOpen();
  }

  function signOut(message, isError) {
    auth = null; saved.remove(SESSION);
    if (app.onSignOut) app.onSignOut();
    showSignIn(message, isError);
    $('signin-title').focus();
  }

  async function db(method, path, body, query) {
    var access = await token();
    var response = await fetch(DB + path + '.json?auth=' + encodeURIComponent(access) + (query ? '&' + query : ''), {
      method: method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    if (response.status === 401 || response.status === 403) throw Error('no-access');
    if (!response.ok) throw Error('offline');
    return response.json();
  }

  // a lost session or a refused account ends in the sign-in card; anything else is the page's to show
  function handle(error) {
    if (error.message === 'signed-out') { signOut('Your session ended. Sign in again.', true); return true; }
    if (error.message === 'no-access') { signOut(app.denied || 'This account doesn\'t have access.', true); return true; }
    return false;
  }

  function init(options) {
    app = options;
    document.querySelectorAll('input[name="signin-who"]').forEach(function (box) {
      box.addEventListener('change', function () { notice(''); choose(box.value, true); });
    });
    $('signin-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      var person = chosen(), password = $('signin-password').value, button = $('signin-send');
      if (!PEOPLE[person]) return notice('Pick your name.', true);
      if (!password) { $('signin-password').focus(); return notice('Type the password.', true); }
      button.disabled = true; notice('Signing in…');
      try {
        var result = await signIn(person, password);
        auth = { uid: result.localId, email: result.email, name: PEOPLE[person], idToken: result.idToken, refreshToken: result.refreshToken, expiresAt: Date.now() + Number(result.expiresIn) * 1000 };
        saved.set(SESSION, JSON.stringify(auth));
        saved.set(LAST, person);
        $('signin-password').value = '';
        notice('');
        open();
      } catch (error) {
        notice(error.name === 'TimeoutError' ? 'Sign-in couldn\'t finish. Check your connection and try again.' : error.message, true);
        $('signin-password').select();
      } finally { button.disabled = false; }
    });
    $('sign-out').addEventListener('click', function () { signOut('Signed out.'); });

    if (auth) open();
    else showSignIn('');
  }

  window.contentAuth = { init: init, db: db, handle: handle, idToken: token, signedIn: function () { return !!auth; }, name: function () { return auth ? auth.name || '' : ''; } };
})();
