(() => {
  'use strict';
  const colorways = {
    purple: { name: 'Purple', description: 'Campus purple field · white type, mark, and details · pale lavender label and CTA' },
    lavender: { name: 'Lavender', description: 'Pale lavender field · ink type, mark, and details' },
    ink: { name: 'Ink', description: 'Ink field · white type, mark, and details · pale lavender label and CTA' },
    white: { name: 'White', description: 'White field · campus purple display type and mark · ink details' }
  };
  const controls = document.querySelector('#social .colorway-controls');
  if (controls) {
    controls.addEventListener('change', event => {
      if (!event.target.matches('input[name="colorway"]')) return;
      const key = event.target.value;
      const theme = colorways[key];
      if (!theme) return;
      for (const format of ['grid', 'story']) {
        const file = `/assets/campus-brandkit/downloads/campus-${format}-${key}`;
        const preview = document.getElementById(`${format}-preview`);
        preview.src = `${file}.png?v=5`;
        preview.alt = `${theme.name} ${format === 'grid' ? 'grid post' : 'story'} with the campus logo and your campus your people headline`;
        for (const extension of ['svg', 'png']) {
          const link = document.getElementById(`${format}-${extension}`);
          link.href = `${file}.${extension}?v=5`;
          link.setAttribute('aria-label', `Download ${theme.name.toLowerCase()} ${format} ${extension.toUpperCase()}`);
        }
      }
      document.querySelectorAll('[data-colorway-name]').forEach(node => { node.textContent = theme.name; });
      document.getElementById('pairing-name').textContent = `${theme.name} / both formats`;
      document.getElementById('pairing-description').textContent = theme.description;
    });
    controls.hidden = false;
  }

  const campaignColorways = {
    purple: 'fomo brand gradient with electric depth · white type, mark, and emphasis',
    lavender: 'Lavender field with a white glow · ink type and mark · purple emphasis',
    ink: 'fomo technical gradient · white type and mark · light blue highlight',
    white: 'White field with a lavender halo · ink type · purple mark and emphasis'
  };
  const campaignSection = document.getElementById('campaigns');
  const campaignInputs = campaignSection ? campaignSection.querySelectorAll('.campaign-colorways, .campaign-format-controls') : [];
  if (campaignInputs.length) {
    const state = { colorway: 'purple', format: 'story' };
    const updateCampaigns = () => {
      const { colorway, format } = state;
      const colorwayName = colorways[colorway].name;
      const formatName = format === 'story' ? 'story' : 'grid';
      campaignSection.querySelectorAll('[data-campaign-recipe]').forEach(card => {
        const recipe = card.dataset.campaignRecipe;
        const name = card.dataset.campaignName;
        const preview = card.querySelector('[data-campaign-preview]');
        preview.src = `/assets/campus-brandkit/previews/campaign-${format}-${recipe}-${colorway}.webp?v=5`;
        preview.height = format === 'story' ? 960 : 675;
        preview.alt = `${name} ${formatName} template, ${colorwayName.toLowerCase()} colorway, with editable placeholders`;
        const open = card.querySelector('[data-campaign-open]');
        open.href = `/assets/campus-brandkit/downloads/campus-${format}-${recipe}-${colorway}.png?v=5`;
        open.setAttribute('aria-label', `Open ${colorwayName.toLowerCase()} ${name.toLowerCase()} ${formatName} artwork`);
        card.querySelectorAll('[data-campaign-file]').forEach(link => {
          const [fileFormat, extension] = link.dataset.campaignFile.split('-');
          link.href = `/assets/campus-brandkit/downloads/campus-${fileFormat}-${recipe}-${colorway}.${extension}?v=5`;
          link.setAttribute('aria-label', `Download ${colorwayName.toLowerCase()} ${name.toLowerCase()} ${fileFormat} ${extension.toUpperCase()}`);
        });
      });
      campaignSection.querySelectorAll('[data-campaign-format]').forEach(label => {
        label.textContent = format === 'story' ? 'Story / 9:16' : 'Grid / 4:5';
      });
      campaignSection.querySelectorAll('[data-campaign-colorway-name]').forEach(label => { label.textContent = colorwayName; });
      campaignSection.querySelector('[data-campaign-pairing]').textContent = campaignColorways[colorway];
    };
    campaignSection.addEventListener('change', event => {
      if (event.target.matches('input[name="campaign-colorway"]') && campaignColorways[event.target.value]) state.colorway = event.target.value;
      else if (event.target.matches('input[name="campaign-format"]') && ['grid', 'story'].includes(event.target.value)) state.format = event.target.value;
      else return;
      updateCampaigns();
    });
    campaignInputs.forEach(fieldset => { fieldset.hidden = false; });
  }

  const motion = document.querySelector('[data-motion]');
  if (motion) {
    const toggle = motion.querySelector('.motion-toggle');
    toggle.addEventListener('click', () => {
      const paused = motion.classList.toggle('is-paused');
      toggle.textContent = paused ? 'Play' : 'Pause';
    });
    // Off-screen, the loop stops with everything still in step.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => motion.classList.toggle('is-offscreen', !entry.isIntersecting)).observe(motion);
    }
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
