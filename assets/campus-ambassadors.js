(() => {
  'use strict';
  const roles = {
    growth: { kicker: '01 / 05 · the recruiter', title: 'growth.', name: 'Growth', description: 'Get students excited about fomo, help them join, and make their first experience on the app a good one.', tasks: ['Introduce students to fomo', 'Help new members sign up and get started', 'Share what’s helping your campus grow'] },
    content: { kicker: '02 / 05 · the storyteller', title: 'content.', name: 'Content', description: 'Turn campus life into content people want to watch. Capture the events, spotlight the people, and show fomo from your point of view.', tasks: ['Create content with a campus point of view', 'Capture the moments people want to share', 'Learn from what connects with your audience'] },
    culture: { kicker: '03 / 05 · the host', title: 'culture.', name: 'Culture', description: 'You’re the one who turns “we should do something” into an actual plan. Bring people together in real life.', tasks: ['Help organize dinners and campus gatherings', 'Create a welcoming experience for new people', 'Connect the right people around the table'] },
    partnerships: { kicker: '04 / 05 · the collaborator', title: 'partnerships.', name: 'Partnerships', description: 'Work with student clubs, organizations, and creators to bring fomo into the things they already do on campus.', tasks: ['Find campus groups to collaborate with', 'Plan shared events and content with partners', 'Keep those partnerships moving forward'] },
    president: { kicker: '05 / 05 · the team builder', title: 'campus president.', name: 'Campus President', description: 'You see the bigger picture and help everyone find their place in it. Bring the campus team together around a shared plan.', tasks: ['Coordinate your campus team', 'Turn ideas into clear next steps', 'Keep the team connected with fomo'] }
  };
  const buttons = Array.from(document.querySelectorAll('[data-role]'));
  const preview = document.getElementById('role-preview');
  if (!buttons.length || !preview) return;

  function renderRole(target, key) {
    const role = roles[key];
    target.querySelector('.role-kicker').textContent = role.kicker;
    target.querySelector('h3').textContent = role.title;
    target.querySelector('p:not(.role-kicker)').textContent = role.description;
    target.querySelector('.role-tasks').replaceChildren(...role.tasks.map(task => {
      const item = document.createElement('li');
      item.textContent = task;
      return item;
    }));
    const link = target.querySelector('.role-apply');
    link.href = '/campus/ambassadors/apply?role=' + key;
    link.textContent = 'Apply for ' + role.name + ' ';
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    link.append(arrow);
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
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.role;
    if (!roles[key]) return;
    buttons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    renderRole(preview, key);
  }));

  stabilizePreview();
  if (document.fonts) document.fonts.ready.then(() => stabilizePreview(true));
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => stabilizePreview()).observe(preview);
  } else {
    window.addEventListener('resize', () => stabilizePreview());
  }
})();
