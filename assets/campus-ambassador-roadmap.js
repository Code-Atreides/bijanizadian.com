(() => {
  'use strict';

  document.querySelectorAll('[data-roadmap]').forEach((roadmap) => {
    const steps = [...roadmap.querySelectorAll('[data-roadmap-step]')];
    const scenes = [...roadmap.querySelectorAll('[data-roadmap-scene]')];
    const progress = [...roadmap.querySelectorAll('[data-roadmap-progress]')];
    const toggle = roadmap.querySelector('[data-roadmap-toggle]');
    const toggleLabel = roadmap.querySelector('[data-roadmap-toggle-label]');
    const stageLabel = roadmap.querySelector('[data-roadmap-stage-label]');
    const stageCount = roadmap.querySelector('[data-roadmap-stage-count]');
    const summaryTitle = roadmap.querySelector('[data-roadmap-summary-title]');
    const summaryDescription = roadmap.querySelector('[data-roadmap-summary-description]');
    const viewTabs = roadmap.querySelector('[data-roadmap-view-tabs]');
    const viewButtons = [...roadmap.querySelectorAll('[data-roadmap-view]')];
    const viewPanels = [...roadmap.querySelectorAll('[data-roadmap-view-panel]')];
    if (steps.length !== 4 || scenes.length !== steps.length || !toggle || !toggleLabel) return;

    stageLabel?.setAttribute('aria-live', 'off');
    stageCount?.setAttribute('aria-live', 'off');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = 0;
    let visible = false;
    let wantsPlayback = !reducedMotion.matches;
    let timer = null;
    let currentView = 'example';

    const render = (index) => {
      active = index;
      steps.forEach((step, item) => {
        step.setAttribute('aria-pressed', String(item === active));
        step.dataset.state = item === active ? 'current' : item < active ? 'complete' : 'upcoming';
      });
      scenes.forEach((scene, item) => scene.classList.toggle('is-active', item === active));
      progress.forEach((segment, item) => {
        segment.classList.toggle('is-active', item <= active);
        segment.classList.toggle('is-current', item === active);
        segment.classList.toggle('is-complete', item < active);
      });
      if (stageLabel) stageLabel.textContent = scenes[active].dataset.label || steps[active].querySelector('strong')?.textContent || '';
      if (stageCount) stageCount.textContent = `${String(active + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
      if (summaryTitle) summaryTitle.textContent = steps[active].querySelector('strong').textContent;
      if (summaryDescription) summaryDescription.textContent = steps[active].querySelector('.roadmap-step-description').textContent;
    };

    const updatePlayback = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      const playing = wantsPlayback && !reducedMotion.matches;
      toggle.dataset.playing = String(playing);
      toggleLabel.textContent = playing ? 'Pause' : 'Play';
      toggle.setAttribute('aria-label', playing ? 'Pause roadmap animation' : 'Play roadmap animation');
      toggle.hidden = reducedMotion.matches;
      const running = playing && currentView === 'example' && visible && !document.hidden;
      roadmap.dataset.playback = running ? 'running' : 'paused';
      if (running) {
        timer = window.setInterval(() => render((active + 1) % steps.length), 3800);
      }
    };

    const selectStep = (index) => {
      wantsPlayback = false;
      render(index);
      updatePlayback();
    };

    steps.forEach((step, index) => {
      step.addEventListener('click', () => selectStep(index));
      step.addEventListener('keydown', (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % steps.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + steps.length) % steps.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = steps.length - 1;
        else return;
        event.preventDefault();
        selectStep(next);
        steps[next].focus();
      });
    });

    toggle.addEventListener('click', () => {
      wantsPlayback = !wantsPlayback;
      updatePlayback();
    });

    const selectView = (view) => {
      currentView = view;
      viewTabs.dataset.selectedView = view;
      viewButtons.forEach((button) => {
        const selected = button.dataset.roadmapView === view;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      viewPanels.forEach((panel) => {
        const selected = panel.dataset.roadmapViewPanel === view;
        panel.setAttribute('aria-hidden', String(!selected));
        panel.inert = !selected;
        panel.tabIndex = selected ? 0 : -1;
      });
      updatePlayback();
    };

    if (viewTabs && viewButtons.length === 2 && viewPanels.length === 2) {
      viewButtons.forEach((button, index) => {
        button.addEventListener('click', () => selectView(button.dataset.roadmapView));
        button.addEventListener('keydown', (event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          let next;
          if (event.key === 'ArrowRight') next = (index + 1) % viewButtons.length;
          else if (event.key === 'ArrowLeft') next = (index - 1 + viewButtons.length) % viewButtons.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = viewButtons.length - 1;
          else return;
          event.preventDefault();
          selectView(viewButtons[next].dataset.roadmapView);
          viewButtons[next].focus({ preventScroll: true });
        });
      });
      roadmap.dataset.roadmapViewsReady = 'true';
      viewTabs.hidden = false;
      selectView('overview');
    }

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

    if (summaryTitle && summaryDescription) roadmap.dataset.roadmapEnhanced = 'true';
    render(0);
    updatePlayback();
  });
})();
