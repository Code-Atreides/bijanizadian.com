(() => {
  'use strict';

  document.querySelectorAll('[data-roadmap]').forEach((roadmap) => {
    const steps = [...roadmap.querySelectorAll('[data-roadmap-step]')];
    const scenes = [...roadmap.querySelectorAll('[data-roadmap-scene]')];
    const progress = [...roadmap.querySelectorAll('[data-roadmap-progress]')];
    const toggle = roadmap.querySelector('[data-roadmap-toggle]');
    const toggleLabel = roadmap.querySelector('[data-roadmap-toggle-label]');
    if (steps.length !== 4 || scenes.length !== steps.length || !toggle || !toggleLabel) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = 0;
    let visible = false;
    let wantsPlayback = !reducedMotion.matches;
    let timer = null;

    const render = (index) => {
      active = index;
      steps.forEach((step, item) => step.setAttribute('aria-pressed', String(item === active)));
      scenes.forEach((scene, item) => scene.classList.toggle('is-active', item === active));
      progress.forEach((segment, item) => segment.classList.toggle('is-active', item <= active));
    };

    const updatePlayback = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      const playing = wantsPlayback && !reducedMotion.matches;
      toggle.dataset.playing = String(playing);
      toggleLabel.textContent = playing ? 'Pause' : 'Play';
      toggle.setAttribute('aria-label', playing ? 'Pause roadmap animation' : 'Play roadmap animation');
      toggle.hidden = reducedMotion.matches;
      if (playing && visible && !document.hidden) {
        timer = window.setInterval(() => render((active + 1) % steps.length), 4800);
      }
    };

    steps.forEach((step, index) => {
      step.addEventListener('click', () => {
        wantsPlayback = false;
        render(index);
        updatePlayback();
      });
    });

    toggle.addEventListener('click', () => {
      wantsPlayback = !wantsPlayback;
      updatePlayback();
    });

    document.addEventListener('visibilitychange', updatePlayback);
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) wantsPlayback = false;
      updatePlayback();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.3;
        updatePlayback();
      }, { threshold: 0.3 }).observe(roadmap.querySelector('.roadmap-panel'));
    }

    render(0);
    updatePlayback();
  });
})();
