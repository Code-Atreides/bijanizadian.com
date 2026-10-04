(() => {
  'use strict';
  const roles = {
    president: { kicker: '01 / 05 · the team builder', title: 'campus president.', name: 'Campus President', description: 'Lead fomo at your school. Bring the team together, set priorities, and turn campus ideas into finished work.', tasks: ['Coordinate the campus team', 'Keep tasks and deadlines on track', 'Share progress with the fomo team'] },
    partnerships: { kicker: '02 / 05 · the collaborator', title: 'partnerships.', name: 'Partnerships', description: 'Build relationships with campus clubs and creators. Turn those connections into shared events, content, or campaigns with fomo.', tasks: ['Find the right campus partners', 'Plan a shared event or campaign', 'Coordinate details and follow through'] },
    culture: { kicker: '03 / 05 · the host', title: 'culture.', name: 'Culture', description: 'Plan gatherings that fit your campus. Bring people together around fomo and handle the details that make an event work.', tasks: ['Plan a campus gathering', 'Coordinate invitations and RSVPs', 'Host and share an event recap'] },
    content: { kicker: '04 / 05 · the storyteller', title: 'content.', name: 'Content', description: 'Create videos and posts about fomo in your own voice. We verify each post before payment, which varies with performance.', tasks: ['Film and edit original content', 'Clearly label paid posts', 'Submit the post link and insights'] },
    growth: { kicker: '05 / 05 · the recruiter', title: 'growth.', name: 'Growth', description: 'Help interested students get started on fomo. Explain the app, walk them through sign-up, and follow up with people who want to join.', tasks: ['Reach students through your network', 'Help interested students get started', 'Track verified signups'] }
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
