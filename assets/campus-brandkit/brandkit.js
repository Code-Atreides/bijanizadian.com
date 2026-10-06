(() => {
  'use strict';
  const colorways = {
    purple: { name: 'Purple', description: 'Purple field · white display type and mark · near-black details and CTA' },
    electric: { name: 'Electric', description: 'Electric field · white display type, details, mark and CTA' },
    cyan: { name: 'Cyan', description: 'Cyan field · ink display type, details, mark and CTA' },
    lavender: { name: 'Lavender', description: 'Lavender field · ink display type and mark · dark purple accents' },
    ink: { name: 'Ink', description: 'Ink field · white display type and mark · light blue details' },
    white: { name: 'White', description: 'White field · purple display type and mark · ink details' }
  };
  const controls = document.querySelector('.colorway-controls');
  if (controls) {
    controls.addEventListener('change', event => {
      if (!event.target.matches('input[name="colorway"]')) return;
      const key = event.target.value;
      const theme = colorways[key];
      if (!theme) return;
      for (const format of ['grid', 'story']) {
        const file = `/assets/campus-brandkit/downloads/campus-${format}-${key}`;
        const preview = document.getElementById(`${format}-preview`);
        preview.src = `${file}.png`;
        preview.alt = `${theme.name} ${format === 'grid' ? 'grid post' : 'story'} with the campus logo and your campus your people headline`;
        for (const extension of ['svg', 'png']) {
          const link = document.getElementById(`${format}-${extension}`);
          link.href = `${file}.${extension}`;
          link.setAttribute('aria-label', `Download ${theme.name.toLowerCase()} ${format} ${extension.toUpperCase()}`);
        }
      }
      document.querySelectorAll('[data-colorway-name]').forEach(node => { node.textContent = theme.name; });
      document.getElementById('pairing-name').textContent = `${theme.name} / both formats`;
      document.getElementById('pairing-description').textContent = theme.description;
    });
    controls.hidden = false;
  }

  const status = document.getElementById('copy-status');
  let toastTimeout;
  function showStatus(message) {
    status.textContent = message;
    status.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => status.classList.remove('visible'), 2600);
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(value);
        showStatus(`${value} copied`);
      } catch {
        showStatus(`Copy this color: ${value}`);
      }
    });
  });

  const links = [...document.querySelectorAll('.index nav a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const active = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!active) return;
      links.forEach(link => {
        if (link.hash === `#${active.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
    links.forEach(link => {
      const section = document.querySelector(link.hash);
      if (section) observer.observe(section);
    });
  }
})();
