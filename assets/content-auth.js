// Team sign-in for the campus media CRM pages (/campus/submissions and
// /campus/analytics): an emailed sign-in link, as on /agencykit, a session kept
// in localStorage and shared by both pages, and authenticated RTDB calls.
// The database rules let only the team's verified email read or write these
// nodes, so a signed-in stranger is turned away by the database itself.
// Each page has the same #signin markup and calls contentAuth.init() once.
(function () {
  'use strict';

  var API_KEY = 'AIzaSyCEVPrJm9r_zP3pWBQV0XrCz6_68cnjySw';
  var DB = 'https://bijanizadian-84e48-default-rtdb.firebaseio.com';
  var SESSION = 'content-inbox-session-v1', EMAIL = 'content-inbox-email';

  var saved = {
    get: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set: function (key, value) { try { localStorage.setItem(key, value); } catch (e) {} },
    remove: function (key) { try { localStorage.removeItem(key); } catch (e) {} }
  };
  var $ = function (id) { return document.getElementById(id); };

  var auth = null, app = null;
  try { auth = JSON.parse(saved.get(SESSION) || 'null'); } catch (e) { auth = null; }
  if (!auth || !auth.refreshToken) auth = null;

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
      ? location.origin + location.pathname : 'https://bijanizadian.com' + location.pathname;
  }

  function notice(message, isError) {
    $('signin-notice').textContent = message || '';
    $('signin-notice').classList.toggle('is-error', !!isError);
  }

  function showSignIn(message, isError) {
    $(app.main).hidden = true; $('account').hidden = true; $('signin').hidden = false;
    $('link-form').hidden = !!code; $('finish-form').hidden = !code;
    if (code) $('finish-email').value = saved.get(EMAIL) || '';
    notice(message, isError);
  }

  function open() {
    $('signin').hidden = true; $(app.main).hidden = false; $('account').hidden = false;
    $('account-email').textContent = auth.email || '';
    app.onOpen();
  }

  function signOut(message, isError) {
    auth = null; saved.remove(SESSION);
    if (app.onSignOut) app.onSignOut();
    showSignIn(message, isError);
    $('signin-title').focus();
  }

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

  // a lost session or a refused email ends in the sign-in card; anything else is the page's to show
  function handle(error) {
    if (error.message === 'signed-out') { signOut('Your session ended. Sign in again.', true); return true; }
    if (error.message === 'no-access') { signOut(app.denied || 'This email doesn\'t have access.', true); return true; }
    return false;
  }

  function init(options) {
    app = options;
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
        open();
      } catch (error) { notice(error.message, true); }
      finally { button.disabled = false; }
    });
    $('sign-out').addEventListener('click', function () { signOut('Signed out.'); });

    if (code) showSignIn('Confirm your email to finish signing in.');
    else if (auth) open();
    else showSignIn('');
  }

  window.contentAuth = { init: init, db: db, handle: handle, signedIn: function () { return !!auth; } };
})();
