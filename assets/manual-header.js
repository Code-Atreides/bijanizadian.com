// The native disclosure works without JavaScript; enhance dismissal and focus.
(() => {
  const menu = document.querySelector('.manual-explore');
  if (!menu) return;
  const trigger = menu.querySelector('summary');
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) menu.open = false;
  });
  for (const type of ['pointerdown', 'focusin']) {
    document.addEventListener(type, event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;
    event.preventDefault();
    menu.open = false;
    trigger.focus({ preventScroll: true });
  });
})();
