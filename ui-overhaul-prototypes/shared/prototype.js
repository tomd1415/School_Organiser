(function () {
  'use strict';

  var root = document.documentElement;
  var menuButton = document.querySelector('[data-menu-toggle]');
  var menuCloseButtons = document.querySelectorAll('[data-menu-close]');
  var nav = document.querySelector('[data-navigation]');
  var backdrop = document.querySelector('[data-nav-backdrop]');
  var announcement = document.getElementById('prototype-status');

  function announce(message) {
    if (!announcement) return;
    announcement.textContent = '';
    window.setTimeout(function () { announcement.textContent = message; }, 20);
  }

  function setMenu(open) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    root.classList.toggle('nav-open', open);
    if (open) {
      var first = nav.querySelector('a, button');
      if (first) first.focus();
    } else {
      menuButton.focus();
    }
  }

  if (menuButton) {
    menuButton.addEventListener('click', function () {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
    });
  }
  menuCloseButtons.forEach(function (button) {
    button.addEventListener('click', function () { setMenu(false); });
  });
  if (backdrop) backdrop.addEventListener('click', function () { setMenu(false); });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menuButton && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
    }
  });

  document.querySelectorAll('[data-contrast-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var enabled = root.dataset.contrast !== 'high';
      root.dataset.contrast = enabled ? 'high' : 'standard';
      button.setAttribute('aria-pressed', String(enabled));
      announce(enabled ? 'High contrast enabled' : 'Standard contrast enabled');
    });
  });

  document.querySelectorAll('[data-density-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var compact = root.dataset.density !== 'compact';
      root.dataset.density = compact ? 'compact' : 'comfortable';
      button.setAttribute('aria-pressed', String(compact));
      announce(compact ? 'Compact density enabled' : 'Comfortable density enabled');
    });
  });

  document.querySelectorAll('[data-demo-action]').forEach(function (button) {
    button.addEventListener('click', function () {
      var message = button.getAttribute('data-demo-action') || 'Prototype action selected';
      announce(message);
      button.classList.add('was-pressed');
      window.setTimeout(function () { button.classList.remove('was-pressed'); }, 500);
    });
  });

  document.querySelectorAll('[data-tablist]').forEach(function (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { selectTab(tablist, tabs, tab); });
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        var direction = event.key === 'ArrowRight' ? 1 : -1;
        var next = tabs[(index + direction + tabs.length) % tabs.length];
        selectTab(tablist, tabs, next);
        next.focus();
      });
    });
  });

  function selectTab(tablist, tabs, selected) {
    tabs.forEach(function (tab) {
      var active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
    });
    announce(selected.textContent.trim() + ' view selected');
  }
})();
