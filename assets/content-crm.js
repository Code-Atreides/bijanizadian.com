// The campus CRM shell, shared by its four pages: the light/dark switch and the
// collapsed sidebar (both set before the first paint, so this script isn't
// deferred), sections within a page
// (a [data-sections] tab row shows the [data-in] blocks for the picked tab and
// keeps it in the URL hash), and the moment the first data lands.
(function () {
  'use strict';
  var KEY = 'campus-crm-theme', root = document.documentElement;
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  root.dataset.theme = saved() === 'dark' ? 'dark' : 'light';
  var NAV = 'campus-crm-nav';
  try { if (localStorage.getItem(NAV) === 'collapsed') root.dataset.nav = 'collapsed'; } catch (e) {}

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('theme-toggle');
    function label() {
      var dark = root.dataset.theme === 'dark';
      toggle.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
      toggle.title = toggle.getAttribute('aria-label');
      var chrome = document.querySelector('meta[name="theme-color"]');
      if (chrome) chrome.content = dark ? '#0b091f' : '#ffffff';
    }
    if (toggle) {
      label();
      toggle.addEventListener('click', function () {
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(KEY, root.dataset.theme); } catch (e) {}
        label();
      });
    }

    // the arrow on the sidebar's edge folds it down to its icons; the choice is remembered
    var header = document.querySelector('.site-header');
    if (header) {
      header.querySelectorAll('.pages a').forEach(function (link) { link.title = link.textContent.trim(); });
      var fold = document.createElement('button');
      fold.type = 'button';
      fold.className = 'nav-fold';
      fold.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
      var foldLabel = function () {
        var collapsed = root.dataset.nav === 'collapsed';
        fold.setAttribute('aria-label', collapsed ? 'Expand the sidebar' : 'Collapse the sidebar');
        fold.title = fold.getAttribute('aria-label');
        fold.setAttribute('aria-expanded', String(!collapsed));
      };
      foldLabel();
      fold.addEventListener('click', function () {
        if (root.dataset.nav === 'collapsed') delete root.dataset.nav; else root.dataset.nav = 'collapsed';
        try { localStorage.setItem(NAV, root.dataset.nav || 'open'); } catch (e) {}
        foldLabel();
      });
      header.appendChild(fold);
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
