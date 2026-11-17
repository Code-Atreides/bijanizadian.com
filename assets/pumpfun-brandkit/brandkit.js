(() => {
  'use strict';
  const toast = document.querySelector('.toast');
  let timer;
  const say = message => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), 1600);
  };
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const value = button.dataset.copy;
    const done = () => say(`Copied ${value}`);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(done, () => say(value));
    else say(value);
  });

  const campaigns = document.getElementById('campaigns');
  const toggle = campaigns?.querySelector('.format-toggle');
  if (toggle) {
    const dir = '/assets/pumpfun-brandkit/downloads/pumpfun-campus';
    toggle.addEventListener('change', event => {
      const format = event.target.value;
      if (!['grid', 'story'].includes(format)) return;
      campaigns.querySelectorAll('[data-pattern]').forEach(card => {
        const file = `${dir}-${format}-${card.dataset.pattern}`;
        const img = card.querySelector('[data-preview]');
        img.src = `${file}.png`;
        img.height = format === 'story' ? 1920 : 1350;
        img.alt = img.alt.replace(/ (grid|story) template/, ` ${format} template`);
        card.querySelector('[data-open]').href = `${file}.png`;
        card.querySelectorAll('[data-file]').forEach(link => { link.href = `${file}.${link.dataset.file}`; });
      });
    });
    toggle.hidden = false;
  }
})();
