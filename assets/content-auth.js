// Sign-in for the media data pages at /mediadata. The team shares one account, campus team,
// so the page only asks for its password. Saved Instagram passwords (content_account_logins)
// take a second account, admin: the Accounts page asks for its password when someone first
// tries to see one, and that session stays in memory only, so it ends with the page. Both
// passwords live hashed in Firebase and never in this file or the repo. The team session is
// kept in localStorage and shared by the pages. The database rules decide what each account
// may read, so a stranger is turned away by the database itself.
// Each page has the same #signin markup and calls contentAuth.init() once.
(function () {
  'use strict';

  var API_KEY = 'AIzaSyCEVPrJm9r_zP3pWBQV0XrCz6_68cnjySw';
  var DB = 'https://bijanizadian-84e48-default-rtdb.firebaseio.com';
  var SESSION = 'campus-crm-session-v2';
  var TEAM_EMAIL = 'team@crm.bijanizadian.com', TEAM_NAME = 'Campus team', ADMIN_EMAIL = 'admin@crm.bijanizadian.com';

  var saved = {
    get: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set: function (key, value) { try { localStorage.setItem(key, value); } catch (e) {} },
    remove: function (key) { try { localStorage.removeItem(key); } catch (e) {} }
  };
  var $ = function (id) { return document.getElementById(id); };

  var auth = null, admin = null, app = null;
  try { auth = JSON.parse(saved.get(SESSION) || 'null'); } catch (e) { auth = null; }
  if (!auth || !auth.refreshToken) auth = null;

  async function passwordSignIn(email, password) {
    var response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, returnSecureToken: true }), signal: AbortSignal.timeout(15000)
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

  function showSignIn(message, isError) {
    $(app.main).hidden = true; $('account').hidden = true; $('signin').hidden = false;
    $('signin-password').value = '';
    notice(message, isError);
  }

  function open() {
    $('signin').hidden = true; $(app.main).hidden = false; $('account').hidden = false;
    $('account-email').textContent = auth.name || auth.email || '';
    app.onOpen();
  }

  function signOut(message, isError) {
    auth = null; admin = null; saved.remove(SESSION);
    if (app.onSignOut) app.onSignOut();
    showSignIn(message, isError);
    $('signin-title').focus();
  }

  async function request(access, method, path, body, query) {
    var response = await fetch(DB + path + '.json?auth=' + encodeURIComponent(access) + (query ? '&' + query : ''), {
      method: method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    if (response.status === 401 || response.status === 403) throw Error('no-access');
    if (!response.ok) throw Error('offline');
    return response.json();
  }
  async function db(method, path, body, query) { return request(await token(), method, path, body, query); }

  // ---------- the admin unlock, for saved Instagram passwords only ----------
  function adminUnlocked() { return !!admin && admin.expiresAt > Date.now() + 60000; }
  async function unlockAdmin(password) {
    var result = await passwordSignIn(ADMIN_EMAIL, password);
    admin = { idToken: result.idToken, expiresAt: Date.now() + Number(result.expiresIn) * 1000 };
  }
  function adminDb(method, path, body) {
    if (!adminUnlocked()) throw Error('locked');
    return request(admin.idToken, method, path, body);
  }

  // a lost session or a refused account ends in the sign-in card; anything else is the page's to show
  function handle(error) {
    if (error.message === 'signed-out') { signOut('Your session ended. Sign in again.', true); return true; }
    if (error.message === 'no-access') { signOut(app.denied || 'This account doesn\'t have access.', true); return true; }
    return false;
  }

  function init(options) {
    app = options;
    $('signin-user').value = TEAM_EMAIL;
    $('signin-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      var password = $('signin-password').value, button = $('signin-send');
      if (!password) { $('signin-password').focus(); return notice('Type the password.', true); }
      button.disabled = true; notice('Signing in…');
      try {
        var result = await passwordSignIn(TEAM_EMAIL, password);
        auth = { uid: result.localId, email: result.email, name: TEAM_NAME, idToken: result.idToken, refreshToken: result.refreshToken, expiresAt: Date.now() + Number(result.expiresIn) * 1000 };
        saved.set(SESSION, JSON.stringify(auth));
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

  window.contentAuth = { init: init, db: db, handle: handle, idToken: token, signedIn: function () { return !!auth; }, isTeam: function () { return !!auth && auth.name === TEAM_NAME; }, adminUnlocked: adminUnlocked, unlockAdmin: unlockAdmin, adminDb: adminDb };
})();
