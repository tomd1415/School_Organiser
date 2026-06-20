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
    // ── A3 narrow-screen pane toggle: tap "Slides" / "My worksheet" to switch the visible pane (the
    // two-pane CSS only acts on data-pane below 960px; on a wide screen both panes show regardless).
    main.addEventListener('click', function (e) {
      var tab = e.target.closest('.pane-tab'); if (!tab) return;
      var pane = e.target.closest('.pupil-twopane'); if (!pane) return;
      pane.setAttribute('data-pane', tab.getAttribute('data-pane-btn'));
      pane.querySelectorAll('.pane-tab').forEach(function (t) {
        var on = t === tab; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    });
    // Worksheet tabs: a lesson with several worksheets — tap a tab to show that worksheet's panel.
    main.addEventListener('click', function (e) {
      var tab = e.target.closest('.ws-tab'); if (!tab) return;
      var i = tab.getAttribute('data-ws-tab');
      var scope = tab.closest('.pupil-work-card') || document;
      scope.querySelectorAll('.ws-tab').forEach(function (t) { var on = t.getAttribute('data-ws-tab') === i; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      scope.querySelectorAll('.ws-panel').forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-ws-panel') === i); });
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
    // A4: an inline 🔊 reads THIS question/instruction in one tap — no need to switch the global
    // tap-anywhere mode on first. Always available; works even when data-speak is off.
    main.addEventListener('click', function (e) {
      var btn = e.target.closest('.ws-speak');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      speak(btn.getAttribute('data-speak-text') || '');
    });
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
      var blanks = card.querySelectorAll('.ws-blank');
      var slots = card.querySelectorAll('.ws-match-slot[data-key]');
      var parsons = card.querySelectorAll('.ws-parsons-wrap[data-save-url]');
      var total = texts.length + checks.length + choices.length + blanks.length + slots.length + parsons.length;
      if (total === 0) { chip.textContent = ''; return; }
      var done = 0;
      texts.forEach(function (t) { if ((t.value || '').trim()) done++; });
      checks.forEach(function (c) { if (c.checked) done++; });
      choices.forEach(function (f) { if (f.querySelector('input[type=radio]:checked')) done++; });
      blanks.forEach(function (b) { if ((b.value || '').trim()) done++; });
      slots.forEach(function (s) { if (s.querySelector('.ws-match-placed')) done++; });
      parsons.forEach(function (p) { if (p.classList.contains('is-ordered')) done++; });
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

  // ── A5 first-run micro-tour: a calm one-time "how this page works" on the worksheet surface, shown
  // once per device (localStorage), built with textContent only (never innerHTML). Dismiss with the
  // button, a backdrop tap, or Escape. Skips the login page (no worksheet there).
  function maybeTour() {
    if (!main || (!main.querySelector('.ws-doc') && !main.querySelector('.pupil-twopane'))) return;
    try { if (localStorage.getItem('pupil.toured') === '1') return; } catch (e) { return; }
    var ov = document.createElement('div');
    ov.className = 'pupil-tour';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'How this page works');
    var card = document.createElement('div');
    card.className = 'pupil-tour-card';
    var h = document.createElement('h2');
    h.textContent = '👋 Welcome!';
    card.appendChild(h);
    var ul = document.createElement('ul');
    ul.className = 'pupil-tour-steps';
    [['📊', 'The slides are on the left — follow along with the board.'],
     ['✍️', 'Type your answers on the right. It saves on its own — you’ll see “saved ✓”.'],
     ['🔊', 'Tap a speaker button to hear a question read out to you.'],
     ['✅', 'Tap “I’m done” when you’ve finished.']].forEach(function (s) {
      var li = document.createElement('li');
      var em = document.createElement('span'); em.className = 'pupil-tour-emoji'; em.textContent = s[0];
      var tx = document.createElement('span'); tx.textContent = s[1];
      li.appendChild(em); li.appendChild(tx); ul.appendChild(li);
    });
    card.appendChild(ul);
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pupil-go'; btn.textContent = 'Got it!';
    function close() { try { localStorage.setItem('pupil.toured', '1'); } catch (e) {} ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    btn.addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    card.appendChild(btn);
    ov.appendChild(card);
    document.body.appendChild(ov);
    btn.focus();
  }
  maybeTour();

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

  // ── A2: a live "saving… → saved ✓" so the autosave never feels like a dead pause. The triggering
  // field owns a `.ws-saved` span; we flip it to "saving…" the moment the request starts, and the
  // server's OOB swap replaces it with "saved ✓" on success (an error message stays put on failure).
  function savedSpanFor(elt) {
    if (!elt || !elt.closest) return null;
    if (elt.classList && elt.classList.contains('ws-choice-form')) return elt.querySelector('.ws-saved');
    if (elt.matches && elt.matches('.ws-check input')) { var li = elt.closest('li'); return li ? li.querySelector('.ws-saved') : null; }
    var sib = elt.nextElementSibling;
    return sib && sib.classList && sib.classList.contains('ws-saved') ? sib : null;
  }
  document.body.addEventListener('htmx:beforeRequest', function (e) {
    var span = savedSpanFor(e.target);
    if (span) { span.textContent = 'saving…'; span.classList.add('show'); }
  });
  document.body.addEventListener('htmx:afterRequest', function (e) {
    if (e.detail && e.detail.successful) { dirty = false; clearToast(); return; }
    var span = savedSpanFor(e.target);
    if (span) { span.textContent = 'could not save — try again'; span.classList.add('show'); }
  });
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

  // ── Matching: drag a tile into a box, OR tap/keyboard "pick an answer, then a box" (the accessible
  // baseline that also serves touch). Each box autosaves its placed answer to its choice field.
  if (main) {
    var picked = null; // the "picked up" tile (tap/keyboard mode)
    function widgetOf(elt) { return elt && elt.closest ? elt.closest('.ws-match') : null; }
    function announce(w, msg) { var lr = w && w.querySelector('[data-match-live]'); if (lr) lr.textContent = msg; }
    function setPicked(tile) {
      if (picked) { picked.classList.remove('is-picked'); picked.setAttribute('aria-pressed', 'false'); }
      picked = tile || null;
      if (picked) { picked.classList.add('is-picked'); picked.setAttribute('aria-pressed', 'true'); announce(widgetOf(picked), 'Picked up ' + picked.getAttribute('data-label') + '. Now tap a box.'); }
    }
    function refreshTray(w) {
      var used = {};
      w.querySelectorAll('.ws-match-slot .ws-match-placed').forEach(function (p) { used[p.textContent] = true; });
      w.querySelectorAll('.ws-match-tile').forEach(function (t) { t.classList.toggle('is-used', !!used[t.getAttribute('data-label')]); });
    }
    // Re-flash a "saved ✓" tick in place (restart the fade animation each save, unlike the HTMX OOB
    // ticks which are swapped fresh every time).
    function flashSaved(el, msg) { if (!el) return; el.textContent = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    function saveSlot(slot, value) {
      var url = slot.getAttribute('data-save-url'); if (!url) return;
      var tick = (widgetOf(slot) || {}).querySelector ? widgetOf(slot).querySelector('.ws-match-saved') : null;
      flashSaved(tick, 'saving…');
      fetch(url, { method: 'POST', headers: { 'x-csrf-token': csrfToken(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'value=' + encodeURIComponent(value), credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw r.status; dirty = false; flashSaved(tick, 'saved ✓'); })
        .catch(function () { flashSaved(tick, 'could not save — try again'); document.body.dispatchEvent(new Event('app:save-failed')); });
    }
    function place(slot, label) {
      slot.innerHTML = '<span class="ws-match-placed"></span><button type="button" class="ws-match-clear" aria-label="clear this answer">✕</button>';
      slot.querySelector('.ws-match-placed').textContent = label; // textContent → never HTML
      saveSlot(slot, label);
      var w = widgetOf(slot); refreshTray(w); announce(w, label + ' placed.'); updateProgress();
    }
    function clearSlot(slot) {
      slot.innerHTML = '<span class="ws-match-empty">drop an answer here</span>';
      saveSlot(slot, '');
      var w = widgetOf(slot); refreshTray(w); announce(w, 'Box cleared.'); updateProgress();
    }
    main.addEventListener('click', function (e) {
      var clr = e.target.closest('.ws-match-clear');
      if (clr) { e.preventDefault(); clearSlot(clr.closest('.ws-match-slot')); setPicked(null); return; }
      var tile = e.target.closest('.ws-match-tile');
      if (tile && !tile.hasAttribute('aria-disabled')) { setPicked(picked === tile ? null : tile); return; }
      var slot = e.target.closest('.ws-match-slot');
      if (slot && slot.hasAttribute('data-key') && picked) { place(slot, picked.getAttribute('data-label')); setPicked(null); }
    });
    main.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      var t = e.target;
      if (t.classList && (t.classList.contains('ws-match-tile') || t.classList.contains('ws-match-slot') || t.classList.contains('ws-match-clear'))) { e.preventDefault(); t.click(); }
    });
    main.addEventListener('dragstart', function (e) { var t = e.target.closest && e.target.closest('.ws-match-tile'); if (t) { e.dataTransfer.setData('text/plain', t.getAttribute('data-label')); e.dataTransfer.effectAllowed = 'copy'; } });
    main.addEventListener('dragover', function (e) { var s = e.target.closest && e.target.closest('.ws-match-slot'); if (s && s.hasAttribute('data-key')) { e.preventDefault(); s.classList.add('is-drop'); } });
    main.addEventListener('dragleave', function (e) { var s = e.target.closest && e.target.closest('.ws-match-slot'); if (s) s.classList.remove('is-drop'); });
    main.addEventListener('drop', function (e) {
      var s = e.target.closest && e.target.closest('.ws-match-slot'); if (!s || !s.hasAttribute('data-key')) return;
      e.preventDefault(); s.classList.remove('is-drop');
      var label = e.dataTransfer.getData('text/plain'); if (label) { place(s, label); setPicked(null); }
    });
    document.querySelectorAll('.ws-match').forEach(refreshTray);
    document.body.addEventListener('htmx:afterSwap', function () { document.querySelectorAll('.ws-match').forEach(refreshTray); });
  }

  // ── Parson's Problems: drag (or ▲▼ / Alt+arrows) the code lines into order; autosave the order as
  // the lines joined by "\n". Same csrf + saved-flash pattern as matching. ────────────────────────
  if (main) {
    function pWrap(el) { return el && el.closest ? el.closest('.ws-parsons-wrap') : null; }
    function pSave(wrap) {
      if (!wrap) return;
      var url = wrap.getAttribute('data-save-url'); if (!url) return;
      var lines = [];
      wrap.querySelectorAll('.ws-parsons-line').forEach(function (li) { lines.push(li.getAttribute('data-line') || ''); });
      var span = wrap.querySelector('.ws-saved');
      if (span) { span.textContent = 'saving…'; span.classList.add('show'); }
      wrap.classList.add('is-ordered');
      fetch(url, { method: 'POST', headers: { 'x-csrf-token': csrfToken(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'value=' + encodeURIComponent(lines.join('\n')), credentials: 'same-origin' })
        .then(function (r) { if (span) { span.textContent = r.ok ? 'saved ✓' : 'could not save — try again'; span.classList.add('show'); } })
        .catch(function () { if (span) { span.textContent = 'could not save — try again'; span.classList.add('show'); } });
    }
    function pMove(li, dir) {
      if (!li) return;
      var ol = li.parentNode;
      if (dir < 0 && li.previousElementSibling) ol.insertBefore(li, li.previousElementSibling);
      else if (dir > 0 && li.nextElementSibling) ol.insertBefore(li.nextElementSibling, li);
      pSave(pWrap(li));
    }
    main.addEventListener('click', function (e) {
      var up = e.target.closest('.ws-parsons-up'); if (up) { e.preventDefault(); pMove(up.closest('.ws-parsons-line'), -1); return; }
      var dn = e.target.closest('.ws-parsons-down'); if (dn) { e.preventDefault(); pMove(dn.closest('.ws-parsons-line'), 1); return; }
    });
    main.addEventListener('keydown', function (e) {
      var li = e.target.closest && e.target.closest('.ws-parsons-line'); if (!li) return;
      if (e.key === 'ArrowUp' && (e.altKey || e.ctrlKey)) { e.preventDefault(); pMove(li, -1); li.focus(); }
      else if (e.key === 'ArrowDown' && (e.altKey || e.ctrlKey)) { e.preventDefault(); pMove(li, 1); li.focus(); }
    });
    var pDrag = null;
    main.addEventListener('dragstart', function (e) { var li = e.target.closest && e.target.closest('.ws-parsons-line'); if (li) { pDrag = li; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (x) {} li.classList.add('is-dragging'); } });
    main.addEventListener('dragend', function () { if (pDrag) pDrag.classList.remove('is-dragging'); pDrag = null; });
    main.addEventListener('dragover', function (e) {
      var li = e.target.closest && e.target.closest('.ws-parsons-line');
      if (li && pDrag && pWrap(li) === pWrap(pDrag) && li !== pDrag) {
        e.preventDefault();
        var rect = li.getBoundingClientRect();
        var after = (e.clientY - rect.top) > rect.height / 2;
        li.parentNode.insertBefore(pDrag, after ? li.nextElementSibling : li);
      }
    });
    main.addEventListener('drop', function (e) { if (pDrag) { e.preventDefault(); pSave(pWrap(pDrag)); } });
  }
})();
