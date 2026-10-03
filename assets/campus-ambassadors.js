(() => {
  'use strict';
  const roles = {
    growth: { kicker: '01 / 05 · the connector', title: 'growth.', name: 'Growth', description: 'You’re the person who knows someone in every group. Help more of your campus find their way to fomo.', tasks: ['Introduce fomo to your communities', 'Help new people get started on the app', 'Bring feedback from campus to the team'] },
    content: { kicker: '02 / 05 · the storyteller', title: 'content.', name: 'Content', description: 'You see the story in an ordinary night. Show what fomo looks like through the people and places on your campus.', tasks: ['Create content with a campus point of view', 'Capture the moments people want to share', 'Learn from what connects with your audience'] },
    culture: { kicker: '03 / 05 · the host', title: 'culture.', name: 'Culture', description: 'You’re the one who turns “we should do something” into an actual plan. Bring people together in real life.', tasks: ['Help organize dinners and campus gatherings', 'Create a welcoming experience for new people', 'Connect the right people around the table'] },
    partnerships: { kicker: '04 / 05 · the relationship builder', title: 'partnerships.', name: 'Partnerships', description: 'You know which people and groups should meet. Build connections with the communities that make your school yours.', tasks: ['Get to know student organizations and creators', 'Find opportunities to work together', 'Keep campus relationships moving forward'] },
    president: { kicker: '05 / 05 · the team builder', title: 'campus president.', name: 'Campus President', description: 'You see the bigger picture and help everyone find their place in it. Bring the campus team together around a shared plan.', tasks: ['Coordinate your campus team', 'Turn ideas into clear next steps', 'Keep the team connected with fomo'] }
  };
  const buttons = Array.from(document.querySelectorAll('[data-role]'));
  const title = document.getElementById('role-title');
  if (!buttons.length || !title) return;
  buttons.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.role;
    const role = roles[key];
    if (!role) return;
    buttons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    document.getElementById('role-kicker').textContent = role.kicker;
    title.textContent = role.title;
    document.getElementById('role-description').textContent = role.description;
    document.getElementById('role-tasks').replaceChildren(...role.tasks.map(task => {
      const item = document.createElement('li');
      item.textContent = task;
      return item;
    }));
    const link = document.getElementById('role-apply');
    link.href = '/campus/ambassadors/apply?role=' + key;
    link.textContent = 'Apply for ' + role.name + ' ';
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    link.append(arrow);
  }));
})();
