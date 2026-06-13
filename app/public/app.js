// Small progressive enhancements. HTMX does the network work; this adds the
// keyboard-fast bits the spec asks for.
(function () {
  function isTyping(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  // `n` from anywhere opens a new note: click the page's [data-new-note] button
  // if present (lesson / Now / general notes), otherwise go to the notes page.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(document.activeElement)) {
      var btn = document.querySelector('[data-new-note]');
      if (btn) {
        e.preventDefault();
        btn.click();
      } else if (!location.pathname.startsWith('/notes')) {
        location.href = '/notes';
      }
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
})();
