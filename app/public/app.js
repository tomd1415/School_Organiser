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
  // Any subsequent successful request means we're back — clear the banner.
  document.body.addEventListener('htmx:afterRequest', function (e) { if (e.detail && e.detail.successful) clearToast(); });

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
      '<li><kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> — search</li>' +
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

  // idea 6 — mark the current page in the nav (a link on the bar, or one inside the Setup menu).
  (function () {
    var path = location.pathname;
    var best = null;
    var links = document.querySelectorAll('.nav a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      var match = href === '/' ? path === '/' : path === href || path.indexOf(href + '/') === 0;
      if (match && (!best || href.length > best.getAttribute('href').length)) best = links[i];
    }
    if (best) {
      best.classList.add('active');
      var det = best.closest('.nav-more');
      if (det) { var sum = det.querySelector('summary'); if (sum) sum.classList.add('active-within'); }
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
