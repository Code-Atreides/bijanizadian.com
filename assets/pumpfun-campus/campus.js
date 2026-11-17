(() => {
  'use strict';
  // Program terms. The page copy and FAQ repeat these numbers; change both together.
  const RATE = 6.25;
  const RATES = { fraternity: 6.25, sorority: 6.25, coed: 6.25, professional: 3.125, club: 2.08 };
  const DB = 'https://bijanizadian-84e48-default-rtdb.firebaseio.com/pumpfun_onboard';

  const money = value => {
    const cents = Math.round(value * 100) / 100;
    return '$' + cents.toLocaleString('en-US', { minimumFractionDigits: cents % 1 ? 2 : 0, maximumFractionDigits: 2 });
  };

  // Referral: ?ref=<name> shows who referred them and travels to the register page.
  const ref = (new URLSearchParams(location.search).get('ref') || '').trim().replace(/^@/, '');
  if (/^[\p{L}\p{N} .'_-]{2,60}$/u.test(ref)) {
    const banner = document.querySelector('[data-ref-banner]');
    if (banner) {
      banner.querySelector('[data-ref-name]').textContent = ref;
      banner.hidden = false;
    }
    document.querySelectorAll('[data-carry-ref]').forEach(link => {
      const url = new URL(link.href, location.href);
      url.searchParams.set('ref', ref);
      link.href = url.pathname + url.search;
    });
    const field = document.getElementById('f-ref');
    if (field) field.value = ref;
  }

  // Calculator
  const slider = document.getElementById('members');
  if (slider) {
    const out = document.getElementById('members-out');
    const payout = document.getElementById('payout');
    const calc = document.getElementById('calculation');
    const update = () => {
      const n = Number(slider.value);
      out.value = out.textContent = String(n);
      payout.textContent = money(n * RATE);
      calc.textContent = `${n} member${n === 1 ? '' : 's'} × $${RATE}`;
      slider.style.setProperty('--fill', `${(n / Number(slider.max)) * 100}%`);
      slider.setAttribute('aria-valuetext', `${n} members, ${money(n * RATE)}`);
    };
    slider.addEventListener('input', update);
    update();
  }

  // What to send: tabs
  const tablist = document.querySelector('.send-tabs');
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const select = tab => tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
    tablist.hidden = false;
    select(tabs[0]);
  }

  // Copy buttons
  const copy = (text, button, label) => {
    if (!navigator.clipboard?.writeText) return Promise.reject();
    return navigator.clipboard.writeText(text).then(() => {
      button.textContent = 'Copied ✓';
      setTimeout(() => { button.textContent = label; }, 1600);
    });
  };
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    const source = document.getElementById(button.dataset.copyTarget);
    if (!source || !navigator.clipboard?.writeText) return;
    button.hidden = false;
    button.addEventListener('click', () => copy(source.textContent.trim(), button, 'Copy message').catch(() => {}));
  });

  const validate = (form, say) => {
    let first = null;
    form.querySelectorAll('input:not([type="hidden"]), select').forEach(field => {
      if (field.type !== 'checkbox') field.value = field.value.trim();
      const bad = !field.checkValidity();
      if (bad) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      if (bad && !first) first = field;
    });
    if (first) {
      say(first.type === 'checkbox' ? 'Confirm you are 18 or older.' : 'Check the highlighted fields.', 'error');
      first.focus();
    }
    return !first;
  };

  // Register form
  const form = document.getElementById('onboard-form');
  if (form) {
    const submit = form.querySelector('[data-submit]');
    const status = form.querySelector('[data-status]');
    const say = (text, kind) => { status.textContent = text; status.className = 'form-status' + (kind ? ` is-${kind}` : ''); };
    form.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!validate(form, say)) return;
      const data = { kind: 'register', submitted_at: Date.now(), page: 'pumpfuncampus' };
      form.querySelectorAll('input, select').forEach(field => {
        if (field.type === 'checkbox') data[field.name] = field.checked;
        else if (field.type === 'number') data[field.name] = Number(field.value);
        else if (field.value) data[field.name] = field.value;
      });
      data.rate = RATES[data.org_type];
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      submit.disabled = true;
      say('Sending…');
      try {
        const response = await fetch(`${DB}/${key}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!response.ok) throw Object.assign(new Error('save failed'), { status: response.status });
        form.reset();
        say("Your chapter is in. We'll email your chapter tracker link. Send it with your pump.fun referral link.", 'ok');
      } catch (error) {
        say(error.status === 401 || error.status === 403
          ? "Registration isn't open yet. Nothing was sent. Please check back soon."
          : "Couldn't send that. Check your connection and try again.", 'error');
      } finally {
        submit.disabled = false;
      }
    });
  }

  // Refer form: build a link with the referrer's name in it
  const referForm = document.getElementById('referral-form');
  if (referForm) {
    const name = document.getElementById('referral-name');
    const result = document.getElementById('referral-result');
    const linkField = document.getElementById('referral-link');
    const copyButton = document.getElementById('copy-referral');
    const copyStatus = document.getElementById('copy-status');
    referForm.addEventListener('input', () => name.removeAttribute('aria-invalid'));
    referForm.addEventListener('submit', event => {
      event.preventDefault();
      const value = name.value.trim().replace(/\s+/g, ' ');
      if (!/^[\p{L}\p{N} .'_-]{2,60}$/u.test(value)) {
        name.setAttribute('aria-invalid', 'true');
        name.focus();
        return;
      }
      linkField.value = `${location.origin}/pumpfuncampus?ref=${encodeURIComponent(value)}`;
      result.hidden = false;
      linkField.focus();
      linkField.select();
    });
    copyButton.addEventListener('click', () => {
      copy(linkField.value, copyButton, 'Copy link').then(() => { copyStatus.textContent = 'Copied.'; }, () => {
        linkField.select();
        copyStatus.textContent = 'Press Ctrl+C or ⌘C to copy.';
      });
    });
  }
})();
