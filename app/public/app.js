// Small progressive enhancements. HTMX does the network work; this adds the
// keyboard-fast bits the spec asks for.
(function () {
  function isTyping(el) {
    // SELECT included so the two-stroke `g` jump doesn't hijack keyboard navigation of a focused dropdown.
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
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

  // Setup's structural edits (＋ period, ＋ lesson, model day, …) re-render the whole <section> via
  // hx-swap=outerHTML, which can jump the scroll to the bottom. Preserve the scroll position across
  // those swaps so you stay on the period/row you were editing.
  (function () {
    var savedY = null;
    document.body.addEventListener('htmx:beforeSwap', function (e) {
      var t = e.detail && e.detail.target;
      if (t && t.matches && t.matches('section.card.setup')) savedY = window.scrollY;
    });
    document.body.addEventListener('htmx:afterSettle', function () {
      if (savedY != null) { window.scrollTo(0, savedY); savedY = null; }
    });
  })();

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
  // Decrement on ONE terminal event only. htmx fires `htmx:afterRequest` for every finished request —
  // success, error, timeout AND abort — so listening to `htmx:sendAbort` as well double-counted an
  // aborted request and could clear the busy bar while another request was still in flight (BUG-034).
  document.body.addEventListener('htmx:afterRequest', requestDone);

  // 10.8 / BUG-013 / BUG-033 — never lose work silently, and never LIE about whether it saved. Autosaves
  // use hx-swap="none", so a failed save would otherwise show nothing; we surface a persistent banner and
  // the typed text stays on screen (hx-swap="none" doesn't touch the field). Two subtleties the old code
  // got wrong:
  //   • A server crash on a background autosave is swallowed into a 200 fragment, so HTMX sees SUCCESS and
  //     used to clear the banner the route had just raised. The route fires an `app:save-failed` HX-Trigger,
  //     and we now treat the matching "successful" request as the failure it really was (BUG-013).
  //   • An UNRELATED success (another field, a 30s background poll) must NOT wipe the warning while a save
  //     is still unsaved. We track unsaved work PER OPERATION and clear only when that same operation later
  //     succeeds — the banner counts how many fields are outstanding (BUG-033).
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
  var unsavedOps = {};          // opKey -> true, one entry per field/operation still unsaved
  var swallowedFailure = false; // set by app:save-failed (a 200 that was really a server error)

  function refreshToast() {
    var n = 0, k;
    for (k in unsavedOps) if (Object.prototype.hasOwnProperty.call(unsavedOps, k)) n++;
    if (n === 0) { clearToast(); return; }
    saveToast(n === 1 ? LOST : '⚠ ' + n + ' changes not saved — your text is still on screen. Check the connection and try again.');
  }
  // A stable per-element key so a RETRY of the same field clears its OWN failure and an unrelated request
  // never does. Falls back to a stamped id when the element has no name/id of its own.
  var opSeq = 0;
  function opKey(elt) {
    if (!elt || !elt.getAttribute) return null;
    if (!elt.__saveKey) elt.__saveKey = elt.getAttribute('data-save-id') || elt.getAttribute('name') || elt.id || ('op-' + ++opSeq);
    return elt.__saveKey;
  }
  function markUnsaved(elt) { var k = opKey(elt); if (k) unsavedOps[k] = true; refreshToast(); }
  function markSaved(elt) { var k = opKey(elt); if (k && unsavedOps[k]) delete unsavedOps[k]; refreshToast(); }
  function isWrite(detail) {
    var v = ((detail && detail.requestConfig && detail.requestConfig.verb) || '').toLowerCase();
    return v === 'post' || v === 'put' || v === 'patch' || v === 'delete';
  }

  // The route swallowed a server crash into a 200 fragment — flag it so the MATCHING afterRequest treats
  // the "successful" 2xx as the failure it really was.
  document.body.addEventListener('app:save-failed', function () { swallowedFailure = true; });

  // ONE terminal handler decides saved-vs-failed. htmx:afterRequest fires for success, error, timeout AND
  // abort, so it's the single source of truth (no separate sendError/responseError/timeout listeners that
  // raced the clear).
  document.body.addEventListener('htmx:afterRequest', function (e) {
    var d = e.detail || {};
    var elt = d.elt || e.target;
    if (swallowedFailure) { swallowedFailure = false; markUnsaved(elt); return; } // 200 that was really an error
    if (d.successful) { markSaved(elt); return; }                                 // a genuine success clears its op
    if (isWrite(d)) markUnsaved(elt);                                             // a failed WRITE is unsaved work
    // a failed READ (a search, a background poll) is not "unsaved work" — leave the banner state alone.
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
    // Resolve a pending `g` FIRST, so `g g` (→ Safeguarding) works — otherwise the second g just
    // re-armed the prefix and the jump never fired.
    if (pendingG) { pendingG = false; clearTimeout(gTimer); var dest = NAV[e.key]; if (dest) { e.preventDefault(); location.href = dest; } return; }
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) { pendingG = true; clearTimeout(gTimer); gTimer = setTimeout(function () { pendingG = false; }, 1200); return; }
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
    // Include the rail footer (the ⚙ Settings gear) so power pages hidden from the everyday rail still
    // light up their footer entry.
    var links = document.querySelectorAll('.rail a[href], .rail-foot a[href]');
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

  // C3 curriculum-map drag-to-shift: pick up a future lesson row and drop it on another week to move
  // it (the two swap, or it fills an empty week). History rows aren't draggable; the server re-checks.
  (function () {
    var table = document.querySelector('.map-table[data-map-slot]');
    if (!table) return;
    var slot = table.getAttribute('data-map-slot');
    var csrf = table.getAttribute('data-map-csrf');
    var fromDate = null;
    function clearOver() { table.querySelectorAll('.map-drop-over').forEach(function (r) { r.classList.remove('map-drop-over'); }); }
    table.addEventListener('dragstart', function (e) {
      var tr = e.target.closest('tr[draggable="true"]');
      if (!tr) return;
      fromDate = tr.getAttribute('data-date');
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', fromDate); } catch (x) {} }
      tr.classList.add('map-dragging');
    });
    table.addEventListener('dragend', function (e) {
      var tr = e.target.closest('tr'); if (tr) tr.classList.remove('map-dragging');
      clearOver(); fromDate = null;
    });
    table.addEventListener('dragover', function (e) {
      var tr = e.target.closest('tr[data-date]'); if (!tr || !fromDate) return;
      e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      clearOver(); if (tr.getAttribute('data-date') !== fromDate) tr.classList.add('map-drop-over');
    });
    table.addEventListener('drop', function (e) {
      var tr = e.target.closest('tr[data-date]'); if (!tr || !fromDate) return;
      e.preventDefault();
      var toDate = tr.getAttribute('data-date');
      if (!toDate || toDate === fromDate) { clearOver(); return; }
      fetch('/map/move', {
        method: 'POST',
        headers: { 'x-csrf-token': csrf, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'slot=' + encodeURIComponent(slot) + '&from=' + encodeURIComponent(fromDate) + '&to=' + encodeURIComponent(toDate),
        credentials: 'same-origin',
      })
        .then(function (r) { if (r.ok) location.href = '/map?slot=' + encodeURIComponent(slot); })
        .catch(function () {});
    });
  })();
})();
