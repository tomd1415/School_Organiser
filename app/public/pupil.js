// The pupil surface's progressive enhancement (Track C — SEND accessibility + 10.8 resilience).
// HTMX does the network work; this adds read-aloud, display preferences, an encouraging progress
// chip, and the "your work is safe" reassurance. Nothing here talks to the network or any AI.
(function () {
  var root = document.documentElement;
  var main = document.querySelector('.pupil-main');

  // ── 10.12 display preferences (persisted in localStorage; applied as data-* on <html>) ─────────
  // The <head> applies saved prefs before paint (no flash); here we wire the toolbar + keep in sync.
  function syncButtons() {
    document.querySelectorAll('[data-a11y]').forEach(function (b) {
      var k = b.getAttribute('data-a11y');
      var on =
        (k === 'speak' && root.getAttribute('data-speak') === 'on') ||
        (k === 'font' && root.getAttribute('data-font') === 'dyslexic') ||
        (k === 'contrast' && root.getAttribute('data-contrast') === 'high') ||
        (k === 'motion' && root.getAttribute('data-motion') === 'reduce');
      b.classList.toggle('on', !!on);
      if (k === 'speak' || k === 'font' || k === 'contrast' || k === 'motion') b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function setAttr(attr, key, val) {
    if (val) { root.setAttribute(attr, val); try { localStorage.setItem(key, val); } catch (e) {} }
    else { root.removeAttribute(attr); try { localStorage.removeItem(key); } catch (e) {} }
    syncButtons();
  }
  function toggleAttr(attr, key, onVal) {
    setAttr(attr, key, root.getAttribute(attr) === onVal ? '' : onVal);
  }
  function bumpText(dir) {
    var cur = parseInt(root.getAttribute('data-textscale') || '0', 10) || 0;
    var next = Math.max(0, Math.min(3, cur + dir));
    setAttr('data-textscale', 'a11y.textscale', next ? String(next) : '');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a11y]');
    if (!b) return;
    e.preventDefault();
    switch (b.getAttribute('data-a11y')) {
      case 'text-up': bumpText(1); break;
      case 'text-down': bumpText(-1); break;
      case 'speak': toggleAttr('data-speak', 'a11y.speak', 'on'); break;
      case 'font': toggleAttr('data-font', 'a11y.font', 'dyslexic'); break;
      case 'contrast': toggleAttr('data-contrast', 'a11y.contrast', 'high'); break;
      case 'motion': toggleAttr('data-motion', 'a11y.motion', 'reduce'); break;
    }
  });
  syncButtons();

  // ── 10.11 read-aloud (Web Speech API; click any words to hear them when it's on) ───────────────
  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9; // a touch slower — kinder for SEND / EAL listeners
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  if (main) {
    main.addEventListener('click', function (e) {
      if (root.getAttribute('data-speak') !== 'on') return;
      // Let controls work normally — only read non-interactive text.
      if (e.target.closest('button, a, input, textarea, select, label')) return;
      var el = e.target.closest('h1, h2, h3, p, li, td, .rc-fb, .rc-comment');
      if (!el) return;
      var t = (el.innerText || el.textContent || '').trim();
      if (!t) return;
      speak(t);
      el.classList.add('speak-flash');
      setTimeout(function () { el.classList.remove('speak-flash'); }, 700);
    });
  }

  // ── 10.13 encouraging progress chip (client-side, instant — no server round-trip) ──────────────
  function updateProgress() {
    document.querySelectorAll('.pupil-work-card').forEach(function (card) {
      var chip = card.querySelector('.ws-progress');
      if (!chip) return;
      var texts = card.querySelectorAll('.ws-input');
      var checks = card.querySelectorAll('.ws-check input[type=checkbox]');
      var total = texts.length + checks.length;
      if (total === 0) { chip.textContent = ''; return; }
      var done = 0;
      texts.forEach(function (t) { if ((t.value || '').trim()) done++; });
      checks.forEach(function (c) { if (c.checked) done++; });
      chip.textContent = done >= total ? 'All done — great work! (' + done + ' of ' + total + ') ✓' : "You've done " + done + ' of ' + total + ' — keep going!';
      chip.classList.toggle('ws-progress-done', done >= total);
    });
  }
  if (main) {
    main.addEventListener('input', updateProgress);
    main.addEventListener('change', updateProgress);
    document.body.addEventListener('htmx:afterSwap', updateProgress); // results/worksheet re-renders
    updateProgress();
  }

  // ── 10.8 never lose typed work silently (calm banner + unsaved-on-close guard) ─────────────────
  function toast(m) {
    var t = document.getElementById('hx-toast');
    if (!t) { t = document.createElement('div'); t.id = 'hx-toast'; t.className = 'hx-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m;
    t.classList.add('show');
  }
  function clearToast() { var t = document.getElementById('hx-toast'); if (t) t.classList.remove('show'); }
  var LOST = '⚠ Not saved yet — your work is still on the screen. Tell your teacher.';
  ['htmx:sendError', 'htmx:responseError', 'htmx:timeout', 'app:save-failed'].forEach(function (ev) {
    document.body.addEventListener(ev, function () { toast(LOST); });
  });
  var dirty = false;
  document.body.addEventListener('input', function (e) { if (e.target && e.target.classList && e.target.classList.contains('ws-input')) dirty = true; });
  document.body.addEventListener('htmx:afterRequest', function (e) { if (e.detail && e.detail.successful) { dirty = false; clearToast(); } });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
})();
