// The campus CRM shell, shared by its four pages: the light/dark switch (set before
// the first paint, so this script isn't deferred), sections within a page
// (a [data-sections] tab row shows the [data-in] blocks for the picked tab and
// keeps it in the URL hash), and the moment the first data lands.
(function () {
  'use strict';
  var KEY = 'campus-crm-theme', root = document.documentElement;
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  root.dataset.theme = saved() === 'dark' ? 'dark' : 'light';

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('theme-toggle');
    function label() {
      var dark = root.dataset.theme === 'dark';
      toggle.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
      toggle.title = toggle.getAttribute('aria-label');
    }
    if (toggle) {
      label();
      toggle.addEventListener('click', function () {
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(KEY, root.dataset.theme); } catch (e) {}
        label();
      });
    }

    // figures keep their skeleton until the page's "Loading…" line is replaced
    var summary = document.querySelector('.queue-head p[id$="summary"]');
    function landed() { root.classList.add('crm-loaded'); }
    if (summary) {
      var watch = new MutationObserver(function () {
        if (summary.textContent.indexOf('Loading') === -1) { watch.disconnect(); landed(); }
      });
      watch.observe(summary, { childList: true, characterData: true, subtree: true });
    } else landed();

    var bar = document.querySelector('[data-sections]');
    if (!bar) return;
    var tabs = [].slice.call(bar.querySelectorAll('button')), blocks = [].slice.call(document.querySelectorAll('[data-in]'));
    var heading = document.querySelector('.queue-head h1'), first = heading ? heading.textContent : '';
    function pick(name, push) {
      var tab = tabs.filter(function (t) { return t.dataset.section === name; })[0] || tabs[0];
      tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
      blocks.forEach(function (block) {
        var on = block.dataset.in === tab.dataset.section;
        block.hidden = !on;
        if (on) { block.classList.remove('settle-one'); void block.offsetWidth; block.classList.add('settle-one'); }
      });
      // the heading says what the tab shows
      if (heading) heading.textContent = tab === tabs[0] ? first : tab.textContent;
      if (push) history.replaceState(null, '', tab === tabs[0] ? location.pathname : '#' + tab.dataset.section);
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { pick(tab.dataset.section, true); });
      tab.addEventListener('keydown', function (event) {
        var step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        var next = tabs[(i + step + tabs.length) % tabs.length];
        pick(next.dataset.section, true); next.focus();
      });
    });
    window.addEventListener('hashchange', function () { pick(location.hash.slice(1), false); });
    pick(location.hash.slice(1), false);
  });
})();
