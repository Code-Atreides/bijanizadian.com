// A shareable, progressive enhancement of three ordinary linked sections.
(() => {
  const hub = document.querySelector('.invite-hub');
  if (!hub) return;
  const chooser = hub.querySelector('.invite-choices');
  const choices = [...hub.querySelectorAll('[data-invite-choice]')];
  const panels = [...hub.querySelectorAll('[data-invite-panel]')];
  const status = hub.querySelector('.invite-status');
  const fallback = hub.querySelector('.invite-copy-fallback');
  const fallbackInput = fallback.querySelector('input');
  const shares = [...hub.querySelectorAll('.invite-share')];
  const panelId = choice => choice.hash.slice(1);
  const selectedFromURL = () => panels.find(panel => '#' + panel.id === location.hash)?.id || panels[0].id;

  function activate(id, focus = false) {
    for (const panel of panels) {
      panel.hidden = panel.id !== id;
      if (!panel.hidden) panel.querySelector('img').loading = 'eager';
    }
    for (const choice of choices) {
      const selected = panelId(choice) === id;
      choice.setAttribute('aria-selected', String(selected));
      choice.tabIndex = selected ? 0 : -1;
      choice.classList.toggle('is-active', selected);
      if (selected && focus) choice.focus();
    }
    status.textContent = '';
    fallback.hidden = true;
  }

  function choose(id, focus = false) {
    if (selectedFromURL() !== id) history.pushState(null, '', '#' + id);
    activate(id, focus);
  }

  chooser.setAttribute('role', 'tablist');
  choices.forEach(choice => {
    choice.setAttribute('role', 'tab');
    choice.setAttribute('aria-controls', panelId(choice));
    choice.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      choose(panelId(choice));
    });
    choice.addEventListener('keydown', event => {
      const current = choices.indexOf(choice);
      let next;
      if (event.key === 'ArrowRight') next = (current + 1) % choices.length;
      if (event.key === 'ArrowLeft') next = (current - 1 + choices.length) % choices.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = choices.length - 1;
      if (event.key === ' ') next = current;
      if (next === undefined) return;
      event.preventDefault();
      choose(panelId(choices[next]), true);
    });
  });
  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + panel.id);
    panel.tabIndex = 0;
  });
  hub.classList.add('is-enhanced');
  activate(selectedFromURL());
  addEventListener('popstate', () => activate(selectedFromURL()));
  addEventListener('hashchange', () => activate(selectedFromURL()));

  shares.forEach(button => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const panel = button.closest('[data-invite-panel]');
      const url = new URL(document.querySelector('link[rel="canonical"]').href);
      if (panel.id !== panels[0].id) url.hash = panel.id;
      const data = { title: panel.dataset.shareTitle, text: panel.querySelector('.invite-summary').textContent.trim(), url: url.href };
      button.disabled = true;
      status.textContent = '';
      fallback.hidden = true;
      try {
        if (typeof navigator.share === 'function') {
          try {
            await navigator.share(data);
            return;
          } catch (error) {
            if (error.name === 'AbortError') return;
          }
        }
        try {
          await navigator.clipboard.writeText(url.href);
          status.textContent = 'Invite link copied.';
        } catch {
          fallbackInput.value = url.href;
          fallback.hidden = false;
          status.textContent = 'Select and copy the link below.';
          fallbackInput.focus();
          fallbackInput.select();
        }
      } finally {
        button.disabled = false;
      }
    });
  });
})();
