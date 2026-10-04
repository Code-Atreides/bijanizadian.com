(() => {
  'use strict';
  const roles = {
    president: { kicker: '01 / 05 · the team builder', title: 'campus president.', name: 'Campus President', description: 'Coordinate your campus team, keep tasks moving, and send progress updates to fomo.', tasks: ['Run team check-ins', 'Track tasks and follow up', 'Share completed work with fomo'] },
    partnerships: { kicker: '02 / 05 · the collaborator', title: 'partnerships.', name: 'Partnerships', description: 'Reach out to clubs and creators, set up collaborations, and turn introductions into shared events or content.', tasks: ['Contact campus clubs and creators', 'Coordinate a collaboration', 'Follow up on the next steps'] },
    culture: { kicker: '03 / 05 · the host', title: 'culture.', name: 'Culture', description: 'Help plan and run campus events. Handle the invites, coordinate the details, and capture how it went.', tasks: ['Help plan an event', 'Invite students and manage RSVPs', 'Help host and document turnout'] },
    content: { kicker: '04 / 05 · the storyteller', title: 'content.', name: 'Content', description: 'Create and publish content about fomo on your campus. We verify each post, then determine your payment based on its performance.', tasks: ['Film and edit campus videos', 'Submit post links for verification', 'Share post performance and results'] },
    growth: { kicker: '05 / 05 · the recruiter', title: 'growth.', name: 'Growth', description: 'Introduce students to fomo, help them sign up, and follow up so they know how to use it.', tasks: ['Introduce students to the app', 'Help new members sign up', 'Share signup progress with the team'] }
  };
  const buttons = Array.from(document.querySelectorAll('[data-role]'));
  const preview = document.getElementById('role-preview');
  const select = document.querySelector('[data-role-select]');
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

  function selectRole(key) {
    if (!roles[key]) return;
    buttons.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.role === key)));
    if (select) select.value = key;
    renderRole(preview, key);
  }
  buttons.forEach(button => button.addEventListener('click', () => selectRole(button.dataset.role)));
  if (select) {
    select.value = buttons.find(button => button.getAttribute('aria-pressed') === 'true')?.dataset.role || 'president';
    select.addEventListener('change', () => selectRole(select.value));
    select.closest('.role-finder').dataset.roleReady = 'true';
  }

  stabilizePreview();
  if (document.fonts) document.fonts.ready.then(() => stabilizePreview(true));
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => stabilizePreview()).observe(preview);
  } else {
    window.addEventListener('resize', () => stabilizePreview());
  }
})();
