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
        (k === 'motion' && root.getAttribute('data-motion') === 'reduce') ||
        (k === 'theme' && root.getAttribute('data-theme') === 'dark');
      b.classList.toggle('on', !!on);
      if (k === 'speak' || k === 'font' || k === 'contrast' || k === 'motion' || k === 'theme') b.setAttribute('aria-pressed', on ? 'true' : 'false');
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
      case 'theme': toggleAttr('data-theme', 'a11y.theme', 'dark'); break;
    }
  });
  syncButtons();

  // ── Slide deck (left pane of the two-pane workspace): one slide at a time, Prev/Next per deck ───
  function deckGo(deck, dir) {
    var slides = deck.querySelectorAll('.pslide');
    if (!slides.length) return;
    var idx = 0;
    slides.forEach(function (s, i) { if (s.classList.contains('on')) idx = i; });
    var next = Math.max(0, Math.min(slides.length - 1, idx + dir));
    slides.forEach(function (s, i) { s.classList.toggle('on', i === next); });
    var n = deck.querySelector('.pslide-n'); if (n) n.textContent = String(next + 1);
    var prev = deck.querySelector('.pslide-prev'); if (prev) prev.disabled = next === 0;
    var nx = deck.querySelector('.pslide-next'); if (nx) nx.disabled = next === slides.length - 1;
  }
  if (main) {
    main.addEventListener('click', function (e) {
      var prev = e.target.closest('.pslide-prev');
      var nx = e.target.closest('.pslide-next');
      if (!prev && !nx) return;
      var deck = e.target.closest('.pupil-slides');
      if (deck) deckGo(deck, prev ? -1 : 1);
    });
    document.querySelectorAll('.pupil-slides').forEach(function (deck) {
      var p = deck.querySelector('.pslide-prev'); if (p) p.disabled = true;
      var slides = deck.querySelectorAll('.pslide'), nx = deck.querySelector('.pslide-next');
      if (nx && slides.length <= 1) nx.disabled = true;
    });
  }

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
      var choices = card.querySelectorAll('.ws-choice-form');
      var total = texts.length + checks.length + choices.length;
      if (total === 0) { chip.textContent = ''; return; }
      var done = 0;
      texts.forEach(function (t) { if ((t.value || '').trim()) done++; });
      checks.forEach(function (c) { if (c.checked) done++; });
      choices.forEach(function (f) { if (f.querySelector('input[type=radio]:checked')) done++; });
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

  // ── 10.14 picture PIN: tapping an emoji key types its digit into the PIN box (login surface) ────
  document.addEventListener('click', function (e) {
    var key = e.target.closest('[data-digit], [data-pin-back]');
    if (!key) return;
    var pin = document.querySelector('.pupil-pin');
    if (!pin) return;
    e.preventDefault();
    if (key.hasAttribute('data-pin-back')) pin.value = pin.value.slice(0, -1);
    else if (pin.value.length < 12) pin.value += key.getAttribute('data-digit');
  });

  // ── 10.14 word banks: a "Word bank: a, b, c" line becomes tappable chips that insert into the
  // last answer box you touched — a scaffold for pupils who find typing hard. No answers revealed
  // (the teacher chooses the words); pure client-side, fires the autosave like normal typing.
  if (main) {
    var lastField = null;
    main.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('ws-input')) lastField = e.target; });
    main.querySelectorAll('.pupil-work-card p').forEach(function (p) {
      var m = /^\s*word bank\s*:\s*(.+)$/i.exec(p.textContent || '');
      if (!m) return;
      var words = m[1].split(/[,;]/).map(function (w) { return w.trim(); }).filter(Boolean);
      if (words.length === 0) return;
      var bank = document.createElement('div');
      bank.className = 'word-bank';
      words.forEach(function (w) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'word-chip';
        b.textContent = w; // textContent keeps the word verbatim (R&D, <tag>) and is XSS-safe
        bank.appendChild(b);
      });
      bank.addEventListener('click', function (e) {
        var chip = e.target.closest('.word-chip');
        if (!chip) return;
        var f = lastField || main.querySelector('.ws-input');
        if (!f) return;
        f.value = (f.value && !/\s$/.test(f.value) ? f.value + ' ' : f.value) + chip.textContent;
        f.focus();
        f.dispatchEvent(new Event('input', { bubbles: true })); // trigger the autosave
      });
      p.insertAdjacentElement('afterend', bank);
    });
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

  // ── 💡 Paste-help modal + practice box (how to screenshot & paste — SEND-friendly) ─────────────
  var pasteHelp = document.getElementById('paste-help');
  function openPasteHelp() {
    if (!pasteHelp) return;
    pasteHelp.hidden = false;
    var f = pasteHelp.querySelector('.paste-help-x');
    if (f) f.focus();
  }
  function closePasteHelp() {
    if (!pasteHelp) return;
    pasteHelp.hidden = true;
    var prac = pasteHelp.querySelector('.paste-practice');
    if (prac) prac.textContent = 'Click here, then press Ctrl/⌘ + V to try it.'; // reset
  }
  if (pasteHelp) {
    pasteHelp.addEventListener('click', function (e) {
      if (e.target === pasteHelp || e.target.closest('.paste-help-x') || e.target.closest('.paste-help-done')) closePasteHelp();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pasteHelp.hidden) closePasteHelp(); });
    var prac = pasteHelp.querySelector('.paste-practice');
    if (prac) prac.addEventListener('paste', function (e) {
      var items = (e.clipboardData && e.clipboardData.items) || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          e.preventDefault();
          var rd = new FileReader();
          rd.onload = function (ev) { prac.textContent = ''; var im = document.createElement('img'); im.src = ev.target.result; im.alt = 'your practice screenshot'; im.style.maxHeight = '120px'; prac.appendChild(im); var ok = document.createElement('div'); ok.textContent = '✓ It worked! You can paste like this on your worksheet.'; ok.style.color = '#2e7d32'; prac.appendChild(ok); };
          rd.readAsDataURL(items[i].getAsFile());
          return;
        }
      }
      e.preventDefault();
      var txt = e.clipboardData ? e.clipboardData.getData('text') : '';
      prac.textContent = txt ? '✓ Pasted text: ' + txt.slice(0, 80) : 'That had no image — take a screenshot first, then paste.';
    });
  }

  // ── Screenshot paste: paste / drop / pick an image into a `.ws-paste` zone → upload as the answer.
  function csrfToken() {
    try { return (JSON.parse((main && main.getAttribute('hx-headers')) || '{}'))['x-csrf-token'] || ''; } catch (e) { return ''; }
  }
  function uploadShot(zone, file) {
    if (!file || !/^image\//.test(file.type) || zone.classList.contains('ws-paste-preview')) return;
    var saved = zone.querySelector('.ws-saved');
    if (saved) { saved.textContent = 'uploading…'; saved.classList.add('show'); }
    var fd = new FormData();
    fd.append('file', file, file.name || 'screenshot.png');
    fetch(zone.getAttribute('data-paste-url'), { method: 'POST', headers: { 'x-csrf-token': csrfToken() }, body: fd, credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (html) {
        var shot = zone.querySelector('.ws-paste-shot');
        if (shot) shot.innerHTML = html;
        zone.classList.add('has-shot');
        if (saved) saved.textContent = 'saved ✓';
        dirty = false;
      })
      .catch(function () { if (saved) saved.textContent = 'could not save — try again'; document.body.dispatchEvent(new Event('app:save-failed')); });
  }
  function pickFile(zone) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
    inp.addEventListener('change', function () { if (inp.files && inp.files[0]) uploadShot(zone, inp.files[0]); });
    inp.click();
  }
  if (main) {
    main.addEventListener('click', function (e) {
      if (e.target.closest('[data-paste-help]')) { openPasteHelp(); return; } // the "❓ how?" link
      var zone = e.target.closest('.ws-paste');
      if (!zone || zone.classList.contains('ws-paste-preview') || e.target.closest('.ws-shot')) return;
      pickFile(zone); // also a fallback for anyone who can't paste/drag
    });
    main.addEventListener('dragover', function (e) { var z = e.target.closest('.ws-paste'); if (z && !z.classList.contains('ws-paste-preview')) { e.preventDefault(); z.classList.add('is-drop'); } });
    main.addEventListener('dragleave', function (e) { var z = e.target.closest('.ws-paste'); if (z) z.classList.remove('is-drop'); });
    main.addEventListener('drop', function (e) {
      var z = e.target.closest('.ws-paste');
      if (!z) return;
      e.preventDefault();
      z.classList.remove('is-drop');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) uploadShot(z, f);
    });
    document.addEventListener('paste', function (e) {
      var items = (e.clipboardData && e.clipboardData.items) || [];
      var file = null;
      for (var i = 0; i < items.length; i++) { if (items[i].type && items[i].type.indexOf('image/') === 0) { file = items[i].getAsFile(); break; } }
      if (!file) return;
      var zone = (document.activeElement && document.activeElement.closest && document.activeElement.closest('.ws-paste')) || null;
      if (!zone) { var zones = document.querySelectorAll('.ws-paste:not(.ws-paste-preview)'); if (zones.length === 1) zone = zones[0]; }
      if (!zone) return;
      e.preventDefault();
      uploadShot(zone, file);
    });
  }
})();
