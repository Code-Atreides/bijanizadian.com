(() => {
  'use strict';
  // Roles an ambassador unlocks after the five starter tasks. Campus President
  // is reached by building a team, so it is not a tab.
  const roles = {
    growth: { title: 'growth.', description: 'Get students at your school signed up and using fomo.', tasks: ['Refer friends and classmates', 'Table and do outreach on campus', 'Help new students get started'] },
    content: { title: 'content.', description: 'Tell fomo’s story at your school, in your own voice.', tasks: ['Film campus videos and posts', 'Cover fomo events', 'Clearly label paid posts'] },
    culture: { title: 'culture & events.', description: 'Plan and run fomo events at your school.', tasks: ['Plan trading nights and sponsored dinners', 'Help run larger campus events', 'Handle invites, RSVPs, and recaps'] },
    partnerships: { title: 'partnerships.', description: 'Bring clubs, Greek chapters, and student groups on board with fomo.', tasks: ['Reach out to org leaders and exec boards', 'Set up joint events or campaigns', 'Handle the details and follow through'] }
  };
  const buttons = Array.from(document.querySelectorAll('[data-role]'));
  const preview = document.getElementById('role-preview');
  const options = document.querySelector('.role-options');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!buttons.length || !preview) return;

  function revealRole(button, animate = true) {
    if (!options || options.scrollWidth <= options.clientWidth) return;
    const rail = options.getBoundingClientRect();
    const tab = button.getBoundingClientRect();
    options.scrollTo({
      left: options.scrollLeft + tab.left - rail.left - (options.clientWidth - tab.width) / 2,
      behavior: animate && !reducedMotion.matches ? 'smooth' : 'auto'
    });
  }

  function renderRole(target, key) {
    const role = roles[key];
    target.querySelector('h3').textContent = role.title;
    target.querySelector('p').textContent = role.description;
    target.querySelector('.role-tasks').replaceChildren(...role.tasks.map(task => {
      const item = document.createElement('li');
      item.textContent = task;
      return item;
    }));
  }

  // Reserve the tallest role at this exact width so changing roles never moves
  // the controls or any of the sections that follow the finder.
  let measuredWidth = 0;
  function stabilizePreview(force = false) {
    const width = preview.getBoundingClientRect().width;
    if (!width || (!force && Math.abs(width - measuredWidth) < .5)) return;
    measuredWidth = width;
    const measurement = preview.cloneNode(true);
    measurement.removeAttribute('id');
    measurement.removeAttribute('aria-live');
    measurement.removeAttribute('aria-atomic');
    measurement.setAttribute('aria-hidden', 'true');
    measurement.setAttribute('inert', '');
    measurement.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    measurement.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;min-height:0;height:auto;width:' + width + 'px;';
    preview.after(measurement);
    let height = 0;
    try {
      Object.keys(roles).forEach(key => {
        renderRole(measurement, key);
        height = Math.max(height, measurement.getBoundingClientRect().height);
      });
    } finally {
      measurement.remove();
    }
    preview.style.minHeight = Math.ceil(height) + 'px';
    const activeButton = buttons.find(button => button.getAttribute('aria-selected') === 'true');
    if (activeButton) revealRole(activeButton, false);
  }

  function selectRole(key) {
    if (!roles[key]) return;
    buttons.forEach(option => {
      const selected = option.dataset.role === key;
      option.setAttribute('aria-selected', String(selected));
      option.tabIndex = selected ? 0 : -1;
    });
    const activeButton = buttons.find(button => button.dataset.role === key);
    preview.setAttribute('aria-labelledby', activeButton.id);
    renderRole(preview, key);
    revealRole(activeButton);
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => selectRole(button.dataset.role));
    button.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      selectRole(buttons[next].dataset.role);
      buttons[next].focus({ preventScroll: true });
    });
  });
  stabilizePreview();
  if (document.fonts) document.fonts.ready.then(() => stabilizePreview(true));
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => stabilizePreview()).observe(preview);
  } else {
    window.addEventListener('resize', () => stabilizePreview());
  }
})();
