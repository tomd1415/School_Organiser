// Small progressive enhancements. HTMX does the network work; this adds the
// keyboard-fast bits the spec asks for.
(function () {
  function isTyping(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  // idea 12 — `n` (and the 📝 Note button) open the smart-capture modal anywhere: type a note and
  // the AI works out where it goes. Falls back to the notes page if the dialog isn't supported/present.
  function openNoteModal() {
    var d = document.getElementById('note-modal');
    if (!d || typeof d.showModal !== 'function') {
      location.href = '/notes';
      return;
    }
    var body = document.getElementById('note-modal-body');
    if (body) body.innerHTML = '';
    var form = document.getElementById('note-modal-form');
    if (form && typeof form.reset === 'function') form.reset();
    if (!d.open) d.showModal();
    var ta = d.querySelector('textarea[name="text"]');
    if (ta) ta.focus();
  }
  var noteBtn = document.getElementById('note-btn');
  if (noteBtn) noteBtn.addEventListener('click', openNoteModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(document.activeElement)) {
      e.preventDefault();
      openNoteModal();
    }
  });

  // When a new note is appended to a notes list, focus its textarea so you can
  // type immediately.
  document.body.addEventListener('htmx:afterSwap', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('notes-list')) {
      var areas = e.target.querySelectorAll('textarea, input[type="text"]');
      var last = areas[areas.length - 1];
      if (last) last.focus();
    }
  });

  // Visible feedback for slow requests (AI calls can take 20–60s): htmx already adds
  // .htmx-request to the busy element (button spinner via CSS); this adds a page-top activity
  // bar whenever anything has been in flight longer than a moment, so even a swapped-away
  // button leaves visible evidence that work is happening.
  var inflight = 0;
  var busyTimer = null;
  document.body.addEventListener('htmx:beforeRequest', function () {
    inflight++;
    if (!busyTimer) {
      busyTimer = setTimeout(function () {
        if (inflight > 0) document.body.classList.add('hx-busy');
      }, 400);
    }
  });
  function requestDone() {
    inflight = Math.max(0, inflight - 1);
    if (inflight === 0) {
      clearTimeout(busyTimer);
      busyTimer = null;
      document.body.classList.remove('hx-busy');
    }
  }
  document.body.addEventListener('htmx:afterRequest', requestDone);
  document.body.addEventListener('htmx:sendAbort', requestDone);

  // 10.8 — never lose work silently. Autosaves use hx-swap="none", so a failed save (connection
  // drop, server error, timeout) would otherwise show nothing. Surface a persistent banner; the
  // typed text stays on screen (hx-swap="none" doesn't touch the field), so nothing is lost.
  function saveToast(msg) {
    var t = document.getElementById('hx-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'hx-toast';
      t.className = 'hx-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
  }
  function clearToast() {
    var t = document.getElementById('hx-toast');
    if (t) t.classList.remove('show');
  }
  var LOST = '⚠ Not saved — your text is still on screen. Check the connection and try again.';
  document.body.addEventListener('htmx:sendError', function () { saveToast(LOST); });
  document.body.addEventListener('htmx:responseError', function () { saveToast(LOST); });
  document.body.addEventListener('htmx:timeout', function () { saveToast('⚠ Still trying to save — your text is safe on screen.'); });
  // A server crash on a background autosave returns a swallowed 200 fragment, so the route fires
  // this HX-Trigger event instead (see server.ts error handler).
  document.body.addEventListener('app:save-failed', function () { saveToast(LOST); });
  // Any subsequent successful request means we're back — clear the banner. But a background poll
  // (the 30s Now clock, the 45s Focus poll) succeeding does NOT mean the failed SAVE went through —
  // skip those, or the "Not saved" warning is wiped while the work is still unsaved.
  document.body.addEventListener('htmx:afterRequest', function (e) {
    if (!e.detail || !e.detail.successful) return;
    var t = e.target;
    if (t && t.closest && t.closest('[data-bg-poll]')) return;
    clearToast();
  });

  // 10.21 — keyboard-fast navigation: `/` or Ctrl/⌘-K jumps to search; `g` then a letter jumps to a
  // page; `?` shows the cheat-sheet; Esc closes things. The principle is "nothing requires the mouse".
  // The jump map + cheat-sheet both derive from window.__NAV__ (emitted by the server from
  // src/lib/nav.ts) so the keyboard shortcuts can never drift from the rendered nav.
  var NAV_ITEMS = Array.isArray(window.__NAV__) ? window.__NAV__ : [];
  var NAV = {};
  NAV_ITEMS.forEach(function (i) { if (i && i.key) NAV[i.key] = i.href; });
  function searchEl() { return document.getElementById('global-search'); }
  function focusSearch() { var s = searchEl(); if (s) { s.focus(); s.select(); } }
  function closeSearch() { var r = document.getElementById('search-results'); if (r) r.innerHTML = ''; }
  function closeCheat() { var c = document.getElementById('kbd-cheat'); if (c) c.remove(); }
  function toggleCheat() {
    if (document.getElementById('kbd-cheat')) { closeCheat(); return; }
    var c = document.createElement('div');
    c.id = 'kbd-cheat';
    c.className = 'kbd-cheat';
    var jumps = NAV_ITEMS.map(function (i) { return '<kbd>' + i.key + '</kbd> ' + i.label; }).join(' · ');
    c.innerHTML =
      '<div class="kbd-card"><h2>Keyboard shortcuts</h2><ul>' +
      '<li><kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> — search or jump to any page (↑↓ then ↵)</li>' +
      '<li><kbd>n</kbd> — new note</li>' +
      (jumps ? '<li><kbd>g</kbd> then: ' + jumps + '</li>' : '') +
      '<li><kbd>Esc</kbd> — close</li></ul><p class="muted">press ? to toggle</p></div>';
    c.addEventListener('click', closeCheat);
    document.body.appendChild(c);
  }
  var pendingG = false;
  var gTimer = null;
  document.addEventListener('keydown', function (e) {
    if (isTyping(document.activeElement)) {
      if (e.key === 'Escape') { closeSearch(); if (document.activeElement) document.activeElement.blur(); }
      return;
    }
    if (e.key === '/') { e.preventDefault(); focusSearch(); return; }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); focusSearch(); return; }
    if (e.key === '?') { e.preventDefault(); toggleCheat(); return; }
    if (e.key === 'Escape') { closeCheat(); closeSearch(); return; }
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) { pendingG = true; clearTimeout(gTimer); gTimer = setTimeout(function () { pendingG = false; }, 1200); return; }
    if (pendingG) { pendingG = false; clearTimeout(gTimer); var dest = NAV[e.key]; if (dest) { e.preventDefault(); location.href = dest; } return; }
  });
  // Click outside the search box closes its dropdown.
  document.addEventListener('click', function (e) { if (!e.target.closest('.search-box')) closeSearch(); });

  // Command palette: arrow-key + Enter navigation through the live "go to … / results" dropdown.
  (function () {
    function results() {
      var nodes = document.querySelectorAll('#search-results .search-hit');
      var arr = [];
      for (var i = 0; i < nodes.length; i++) arr.push(nodes[i]);
      return arr;
    }
    function activeIndex(list) { for (var i = 0; i < list.length; i++) if (list[i].classList.contains('kbd-active')) return i; return -1; }
    function clearActive(list) { for (var i = 0; i < list.length; i++) list[i].classList.remove('kbd-active'); }
    document.addEventListener('keydown', function (e) {
      var box = document.getElementById('global-search');
      if (!box || document.activeElement !== box) return;
      var list = results();
      if (!list.length) return;
      var idx = activeIndex(list);
      if (e.key === 'ArrowDown') { e.preventDefault(); clearActive(list); var n = list[(idx + 1) % list.length]; n.classList.add('kbd-active'); n.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); clearActive(list); var p = list[(idx - 1 + list.length) % list.length]; p.classList.add('kbd-active'); p.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { var t = idx >= 0 ? list[idx] : list[0]; if (t) { e.preventDefault(); window.location.href = t.getAttribute('href'); } }
    });
    document.body.addEventListener('htmx:afterSwap', function (e) { if (e.target && e.target.id === 'search-results') clearActive(results()); });
  })();

  // a11y toolbar: text-size / contrast / font preferences, persisted in localStorage and applied as
  // <html data-*> (the pre-paint script in <head> applies them on first load so there's no flash).
  (function () {
    var ATTR = { fontsize: 'data-fontsize', theme: 'data-theme', font: 'data-font' };
    function mark(kind) {
      var row = document.querySelector('.a11y-row[data-a11y="' + kind + '"]');
      if (!row) return;
      var cur = '';
      try { cur = localStorage.getItem('a11y-' + kind) || ''; } catch (e) {}
      var btns = row.querySelectorAll('button[data-val]');
      for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-val') === cur ? 'true' : 'false');
    }
    function apply(kind, val) {
      var attr = ATTR[kind];
      if (!attr) return;
      try {
        if (val) { document.documentElement.setAttribute(attr, val); localStorage.setItem('a11y-' + kind, val); }
        else { document.documentElement.removeAttribute(attr); localStorage.removeItem('a11y-' + kind); }
      } catch (e) {}
      mark(kind);
    }
    var rows = document.querySelectorAll('.a11y-row[data-a11y]');
    for (var i = 0; i < rows.length; i++) {
      (function (row) {
        var kind = row.getAttribute('data-a11y');
        row.addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('button[data-val]') : null;
          if (b) apply(kind, b.getAttribute('data-val'));
        });
        mark(kind);
      })(row);
    }
  })();

  // Mark the current page in the left rail (a Today link, or one inside a Plan/Advanced section).
  // Longest matching href wins so e.g. /settings beats / for /settings/ai-log.
  (function () {
    var path = location.pathname;
    var best = null;
    var links = document.querySelectorAll('.rail a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      var match = href === '/' ? path === '/' : path === href || path.indexOf(href + '/') === 0;
      if (match && (!best || href.length > best.getAttribute('href').length)) best = links[i];
    }
    if (best) {
      best.classList.add('active');
      best.setAttribute('aria-current', 'page');
      var det = best.closest('.rail-sec');
      if (det && det.tagName === 'DETAILS') { det.open = true; var sum = det.querySelector('summary'); if (sum) sum.classList.add('active-within'); }
    }
  })();

  // 10.25 — activity/starter countdown timer (Spec 5.16). Pure client-side; set N minutes, it counts
  // down on the lesson page and can go full-screen on the board; a gentle flash at zero.
  (function () {
    var bar = document.querySelector('[data-timer]');
    if (!bar) return;
    var display = bar.querySelector('[data-timer-display]');
    var endAt = 0;
    var tick = null;
    var full = null;
    function fmt(ms) {
      if (ms < 0) ms = 0;
      var s = Math.round(ms / 1000);
      return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
    }
    function paint() {
      var left = endAt - Date.now();
      var text = fmt(left);
      if (display) display.textContent = text;
      if (full) full.querySelector('.act-full-time').textContent = text;
      if (left <= 0) {
        clearInterval(tick); tick = null;
        bar.classList.add('act-done');
        if (full) full.classList.add('act-done');
      }
    }
    function start(mins) {
      endAt = Date.now() + mins * 60000;
      bar.classList.remove('act-done');
      if (full) full.classList.remove('act-done');
      clearInterval(tick);
      paint();
      tick = setInterval(paint, 1000);
    }
    function stop() { clearInterval(tick); tick = null; endAt = 0; bar.classList.remove('act-done'); if (display) display.textContent = '—:—'; closeFull(); }
    function openFull() {
      if (full) return;
      full = document.createElement('div');
      full.className = 'act-full';
      full.innerHTML = '<div class="act-full-time">' + (display ? display.textContent : '—:—') + '</div><p class="muted">tap to close</p>';
      full.addEventListener('click', closeFull);
      document.body.appendChild(full);
    }
    function closeFull() { if (full) { full.remove(); full = null; } }
    bar.addEventListener('click', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-timer-set')) start(parseInt(t.getAttribute('data-timer-set'), 10));
      else if (t.hasAttribute('data-timer-stop')) stop();
      else if (t.hasAttribute('data-timer-full')) openFull();
    });
  })();
})();
