(function () {
  'use strict';

  var form = document.getElementById('ambassador-apply-form');
  if (!form) return;

  var fields = Array.prototype.slice.call(form.querySelectorAll('input, select, textarea'));
  var submit = document.getElementById('application-submit');
  var formError = document.getElementById('application-error');
  var status = document.getElementById('application-status');
  var success = document.getElementById('application-success');
  var pending = false;
  var complete = false;
  var connectionTimer = null;
  var database = null;
  var roles = ['president', 'growth', 'partnerships', 'content', 'culture', 'any'];
  var emailPattern = /^[a-z0-9_%+-]+(\.[a-z0-9_%+-]+)*@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,24}$/i;
  var emailTypos = {
    'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com',
    'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'hotmail.con': 'hotmail.com',
    'hotmial.com': 'hotmail.com', 'outlook.con': 'outlook.com', 'icloud.con': 'icloud.com'
  };

  var requestedRole = new URLSearchParams(window.location.search).get('role');
  if (roles.indexOf(requestedRole) !== -1) form.elements.role.value = requestedRole;

  function focusAndReveal(element, scrollTarget) {
    element.focus({ preventScroll: true });
    (scrollTarget || element).scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  function phoneDigits(value) {
    var digits = value.replace(/[^0-9]/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    return digits;
  }

  function instagramHandle(value) {
    var handle = value.trim();
    var profile = handle.match(/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)*instagram\.com\/([^/?#]+)/i);
    if (profile) handle = profile[1];
    else if (/instagram\.com/i.test(handle)) return null;
    handle = handle.replace(/^@+/, '').replace(/\/+$/, '');
    if (!/^[a-z0-9._]{1,30}$/i.test(handle) || handle.charAt(0) === '.' || handle.charAt(handle.length - 1) === '.' || handle.indexOf('..') !== -1) return null;
    return handle.toLowerCase();
  }

  function validationMessage(field) {
    var value = field.value.trim();
    if (!value) return field.tagName === 'SELECT' ? 'Choose a role, or select “Wherever I’m needed”.' : 'Please fill in this field.';
    if (field.name === 'email') {
      if (value.length >= 200 || !emailPattern.test(value)) return 'Enter a complete email address, like you@school.edu (under 200 characters).';
      var domain = value.split('@').pop().toLowerCase();
      if (emailTypos[domain]) return 'Check your email address. Did you mean @' + emailTypos[domain] + '?';
    }
    if (field.name === 'phone') {
      var digits = phoneDigits(value);
      if (!/^[+()0-9 .-]+$/.test(value) || !/^[2-9][0-9]{2}[2-9][0-9]{6}$/.test(digits)) return 'Enter a 10-digit US mobile number, like 212-555-0199. A +1 country code is okay.';
    }
    if (field.name === 'instagram' && !instagramHandle(value)) return 'Enter your Instagram handle, like @yourhandle, or a link to your profile.';
    if (field.name === 'role' && roles.indexOf(value) === -1) return 'Choose one of the listed roles.';
    if (field.name === 'why' && (value.length < 20 || value.length >= 4000)) return 'Write a few sentences, between 20 and 3,999 characters.';
    return '';
  }

  function validate(field, showError) {
    var message = validationMessage(field);
    field.setCustomValidity(message);
    if (showError) {
      var error = document.getElementById(field.id + '-error');
      error.textContent = message;
      error.hidden = !message;
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    return !message;
  }

  fields.forEach(function (field) {
    field.addEventListener('blur', function () { validate(field, true); });
    field.addEventListener('input', function () { validate(field, field.getAttribute('aria-invalid') === 'true'); });
    field.addEventListener('change', function () { validate(field, true); });
  });

  // Keep the browser's constraint validation and focus behavior, with matching
  // inline messages so errors remain available after a native tooltip closes.
  form.addEventListener('invalid', function (event) {
    if (fields.indexOf(event.target) === -1) return;
    validate(event.target, true);
  }, true);

  function fail(message) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
    pending = false;
    submit.disabled = false;
    submit.textContent = 'Submit application ↗';
    form.removeAttribute('aria-busy');
    status.textContent = '';
    formError.textContent = message;
    formError.hidden = false;
    focusAndReveal(formError);
  }

  function finish() {
    clearTimeout(connectionTimer);
    connectionTimer = null;
    complete = true;
    pending = false;
    form.removeAttribute('aria-busy');
    status.textContent = '';
    form.hidden = true;
    success.hidden = false;
    focusAndReveal(success);
  }

  // The existing campus application backend is write-only. Initialize it only
  // when a person explicitly submits a valid application; never read entries.
  function getDatabase() {
    if (database) return database;
    if (!window.firebase || !window.firebase.initializeApp) return null;
    var config = {
      apiKey: 'AIzaSyCEVPrJm9r_zP3pWBQV0XrCz6_68cnjySw',
      authDomain: 'bijanizadian-84e48.firebaseapp.com',
      databaseURL: 'https://bijanizadian-84e48-default-rtdb.firebaseio.com',
      projectId: 'bijanizadian-84e48'
    };
    database = window.firebase.initializeApp(config, 'campus-ambassadors').database();
    return database;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (pending || complete) return;
    formError.hidden = true;
    var firstInvalid = null;
    fields.forEach(function (field) {
      if (!validate(field, true) && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      focusAndReveal(firstInvalid, firstInvalid.closest('.field'));
      firstInvalid.reportValidity();
      return;
    }

    pending = true;
    submit.disabled = true;
    submit.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your application.';
    if (navigator.onLine === false) {
      fail('You appear to be offline. Reconnect and submit again. Your answers are still here.');
      return;
    }

    var data = {};
    fields.forEach(function (field) { data[field.name] = field.value.trim(); });
    data.instagram = instagramHandle(data.instagram);
    var digits = phoneDigits(data.phone);
    data.phone = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
    data.submitted_at = new Date().toISOString();
    data.page = window.location.pathname;
    data.ua = (navigator.userAgent || '').slice(0, 160);

    try {
      var db = getDatabase();
      if (!db) {
        fail('The application service could not load. Check your connection and try again, or email hello@fomo.family with your answers. Your answers are still here.');
        return;
      }
      var key = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      connectionTimer = setTimeout(function () {
        status.textContent = 'Still waiting for a connection. Keep this page open; your application will finish sending when it reconnects. If it stays stuck, contact hello@fomo.family.';
      }, 15000);
      db.ref('campus/' + key).set(data).then(finish).catch(function () {
        fail('Your application did not send. Check your connection and try again. Your answers are still here. If this keeps happening, email hello@fomo.family.');
      });
    } catch (error) {
      fail('The application service is unavailable. Try again, or email hello@fomo.family with your answers. Your answers are still here.');
    }
  });

  // Without this script, the disabled button and noscript message prevent a
  // browser navigation from sending personal answers as URL parameters.
  submit.disabled = false;
})();
