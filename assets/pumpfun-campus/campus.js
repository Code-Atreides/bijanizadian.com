(() => {
  'use strict';
  // Program terms. Change them here; the FAQ and copy in pumpfuncampus.html repeat them.
  const RATES = { social: 6.25, professional: 3.125, club: 2.08 };
  const DB = 'https://bijanizadian-84e48-default-rtdb.firebaseio.com/pumpfun_onboard';

  const money = value => {
    const cents = Math.round(value * 100) / 100;
    return '$' + cents.toLocaleString('en-US', { minimumFractionDigits: cents % 1 ? 2 : 0, maximumFractionDigits: 2 });
  };
  const rate = value => '$' + String(value);

  // Calculator
  const slider = document.getElementById('members');
  const out = document.getElementById('members-out');
  const payout = document.getElementById('payout');
  const calc = document.getElementById('calculation');
  const typeOf = () => document.querySelector('input[name="calc-type"]:checked')?.value || 'social';
  const update = () => {
    const n = Number(slider.value);
    const r = RATES[typeOf()];
    out.value = out.textContent = String(n);
    payout.textContent = money(n * r);
    calc.textContent = `${n} member${n === 1 ? '' : 's'} × ${rate(r)}`;
    slider.style.setProperty('--fill', `${(n / Number(slider.max)) * 100}%`);
    slider.setAttribute('aria-valuetext', `${n} members, ${money(n * r)}`);
  };
  if (slider) {
    slider.addEventListener('input', update);
    document.querySelectorAll('input[name="calc-type"]').forEach(input => input.addEventListener('change', update));
    update();
  }

  // What to send: tabs
  const tablist = document.querySelector('.send-tabs');
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const select = tab => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
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

  // Copy the group-chat message
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    const source = document.getElementById(button.dataset.copyTarget);
    if (!source || !navigator.clipboard?.writeText) return;
    button.hidden = false;
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(source.textContent.trim()).then(() => {
        button.textContent = 'Copied ✓';
        setTimeout(() => { button.textContent = 'Copy message'; }, 1600);
      }, () => {});
    });
  });

  // Form: register a chapter or refer someone
  const form = document.getElementById('onboard-form');
  if (!form) return;
  const modeSeg = document.querySelector('.mode-tabs');
  const submit = form.querySelector('[data-submit]');
  const status = form.querySelector('[data-status]');
  const groups = [...form.querySelectorAll('[data-mode-fields]')];
  const mode = () => document.querySelector('input[name="mode"]:checked')?.value || 'register';
  const say = (text, kind) => { status.textContent = text; status.className = 'form-status' + (kind ? ` is-${kind}` : ''); };
  const setMode = value => {
    const radio = document.querySelector(`input[name="mode"][value="${value}"]`);
    if (radio) radio.checked = true;
    groups.forEach(group => {
      const on = group.dataset.modeFields === value;
      group.hidden = !on;
      group.querySelectorAll('input, select').forEach(field => { field.disabled = !on; });
    });
    submit.textContent = value === 'refer' ? 'Send my referral ↗' : "Get my chapter's link ↗";
    say('');
  };
  modeSeg.hidden = false;
  modeSeg.addEventListener('change', () => setMode(mode()));
  document.querySelectorAll('[data-mode-link]').forEach(link => link.addEventListener('click', () => setMode(link.dataset.modeLink)));
  document.querySelectorAll('a[href="#onboard"]:not([data-mode-link])').forEach(link => link.addEventListener('click', () => setMode('register')));
  setMode('register');

  // ?ref=username: show who referred them and prefill the field
  const ref = (new URLSearchParams(location.search).get('ref') || '').trim().replace(/^@/, '');
  if (/^[A-Za-z0-9_.-]{2,40}$/.test(ref)) {
    const banner = document.querySelector('[data-ref-banner]');
    banner.querySelector('[data-ref-name]').textContent = '@' + ref;
    banner.hidden = false;
    form.querySelector('#f-ref').value = ref;
  }

  form.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = [...form.querySelectorAll('input:not(:disabled), select:not(:disabled)')];
    let first = null;
    fields.forEach(field => {
      field.value = field.type === 'checkbox' ? field.value : field.value.trim();
      const bad = !field.checkValidity();
      if (bad) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      if (bad && !first) first = field;
    });
    if (first) {
      say(first.type === 'checkbox' ? 'Confirm you are 18 or older.' : 'Check the highlighted fields.', 'error');
      first.focus();
      return;
    }
    const data = { kind: mode(), submitted_at: Date.now(), page: 'pumpfuncampus' };
    fields.forEach(field => {
      if (field.type === 'checkbox') data[field.name] = field.checked;
      else if (field.type === 'number') data[field.name] = Number(field.value);
      else if (field.value) data[field.name] = field.value;
    });
    if (data.kind === 'register') data.rate = RATES[data.org_type];
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    submit.disabled = true;
    say('Sending…');
    try {
      const response = await fetch(`${DB}/${key}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!response.ok) throw Object.assign(new Error('save failed'), { status: response.status });
      form.reset();
      setMode(data.kind);
      say(data.kind === 'refer'
        ? "Got it. We'll reach out to them, and you're paid when their chapter onboards."
        : "You're in. We'll email your chapter tracker link. Send it with your pump.fun referral link.", 'ok');
    } catch (error) {
      say(error.status === 401 || error.status === 403
        ? "Sign-ups aren't open yet. Nothing was sent. Please check back soon."
        : "Couldn't send that. Check your connection and try again.", 'error');
    } finally {
      submit.disabled = false;
    }
  });
})();
