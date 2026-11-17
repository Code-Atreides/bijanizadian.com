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

  // Social preview: one pattern, one colorway, grid + story together.
  const social = document.getElementById('social');
  const seg = social?.querySelector('[data-control="way"]');
  if (!social || !seg) return;
  const dir = '/assets/pumpfun-brandkit/downloads/pumpfun-campus';
  const cards = [...document.querySelectorAll('#campaigns [data-pattern]')];
  const inkOnly = new Set(cards.filter(card => card.hasAttribute('data-ink-only')).map(card => card.dataset.pattern));
  const names = Object.fromEntries(cards.map(card => [card.dataset.pattern, card.dataset.name]));
  const green = seg.querySelector('input[value="green"]');
  const now = social.querySelector('[data-now]');
  const inkNote = social.querySelector('[data-ink-note]');
  const state = { pattern: 'mic-check', way: 'green' };
  const file = (format, pattern, way) => `${dir}-${format}-${pattern}-${inkOnly.has(pattern) ? 'ink' : way}`;

  const render = () => {
    const { pattern, way } = state;
    const locked = inkOnly.has(pattern);
    const shown = locked ? 'ink' : way;
    green.disabled = locked;
    seg.querySelector(`input[value="${shown}"]`).checked = true;
    now.textContent = names[pattern] || pattern;
    inkNote.hidden = !locked;
    const colorway = shown === 'ink' ? 'ink' : 'campaign green';
    ['grid', 'story'].forEach(format => {
      const base = file(format, pattern, way);
      const img = social.querySelector(`[data-preview="${format}"]`);
      img.src = `${base}.png`;
      img.alt = `${names[pattern]} ${format === 'grid' ? 'grid post' : 'story'} in ${colorway}`;
      social.querySelector(`[data-open="${format}"]`).href = `${base}.png`;
      social.querySelectorAll(`[data-file="${format}"]`).forEach(link => { link.href = `${base}.${link.dataset.ext}`; });
    });
    cards.forEach(card => {
      const base = file('grid', card.dataset.pattern, way);
      card.querySelector('[data-thumb]').href = `${base}.png`;
      card.querySelector('[data-thumb] img').src = `${base}.png`;
      card.classList.toggle('is-active', card.dataset.pattern === pattern);
    });
  };

  seg.addEventListener('change', event => {
    if (!['green', 'ink'].includes(event.target.value)) return;
    state.way = event.target.value;
    render();
  });
  document.addEventListener('click', event => {
    const use = event.target.closest('[data-use]');
    if (!use) return;
    event.preventDefault();
    state.pattern = use.dataset.use;
    render();
    social.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    say(`${names[state.pattern]} loaded`);
  });
  seg.hidden = false;
  render();
})();
