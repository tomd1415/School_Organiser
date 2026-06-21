// Overhaul UI Shell Javascript
// Extends classic app.js progressive enhancements with overhaul features:
// - Edge-hover navigation rail expansion
// - Client-side timezone-aware clock ticking
// - Absolute time-compared event countdowns
// - Focus Mode persistence and state switching

(function () {
  function isTyping(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  }

  // --- Overhaul: Focus Mode Toggling and Persistence ---
  function applyFocusMode(enabled) {
    if (enabled) {
      document.body.classList.add('focus-mode');
    } else {
      document.body.classList.remove('focus-mode');
    }
  }

  function toggleFocusMode() {
    var enabled = !document.body.classList.contains('focus-mode');
    applyFocusMode(enabled);
    try {
      localStorage.setItem('focus-mode', enabled ? 'true' : 'false');
    } catch (e) {}
  }

  // Apply saved focus mode immediately on script load (so it's pre-rendered)
  try {
    var savedFocus = localStorage.getItem('focus-mode') === 'true';
    applyFocusMode(savedFocus);
  } catch (e) {}

  // Event delegation for dynamically loaded Focus Mode button
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#focus-mode-btn');
    if (btn) {
      toggleFocusMode();
    }
  });

  // --- Overhaul: Collapsible Navigation Ribbon & Advanced Drawer ---
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('#ribbon-drawer-toggle');
    if (toggle) {
      var drawer = document.getElementById('ribbon-drawer');
      if (drawer) {
        e.stopPropagation();
        drawer.classList.toggle('open');
      }
    }
  });

  // --- Overhaul: Monospace Clock and Event Countdown ---
  function tickClock() {
    var clockEl = document.getElementById('monospace-clock');
    if (!clockEl) return;
    var tz = clockEl.getAttribute('data-tz') || 'Europe/London';
    var now = new Date();
    var clockStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).format(now);
    clockEl.textContent = clockStr;

    var dateEl = document.getElementById('monospace-date');
    if (dateEl) {
      var dateStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }).format(now);
      dateEl.textContent = dateStr;
    }
  }

  function tickCountdowns() {
    var elements = document.querySelectorAll('[data-epoch-ms]');
    var now = Date.now();
    elements.forEach(function (el) {
      var epoch = parseInt(el.getAttribute('data-epoch-ms'), 10);
      if (isNaN(epoch)) return;
      var diff = epoch - now;
      if (diff <= 0) {
        el.textContent = 'started';
      } else {
        var totalSec = Math.floor(diff / 1000);
        var mins = Math.floor(totalSec / 60);
        var secs = totalSec % 60;
        if (mins === 0) {
          el.textContent = 'starts in ' + secs + 's';
        } else if (secs === 0) {
          el.textContent = 'starts in ' + mins + ' mins';
        } else {
          el.textContent = 'starts in ' + mins + 'm ' + secs + 's';
        }
      }
    });
  }

  // Run immediately and every second
  tickClock();
  tickCountdowns();
  setInterval(tickClock, 1000);
  setInterval(tickCountdowns, 1000);

  // Re-run ticks when HTMX swaps content (e.g. loads the header)
  document.body.addEventListener('htmx:afterSwap', function () {
    tickClock();
    tickCountdowns();
  });

  // --- Classic app.js functionality preserved below ---

  // Note Modal Composer
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

  // Handle note button from both static elements and dynamic header delegation
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#note-btn');
    if (btn) openNoteModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(document.activeElement)) {
      e.preventDefault();
      openNoteModal();
    }
  });

  // Marking modal navigation via arrow keys
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var d = document.getElementById('mark-modal');
    if (!d || !d.open || isTyping(document.activeElement)) return;
    var btn = d.querySelector('[data-mark-nav="' + (e.key === 'ArrowRight' ? 'next' : 'prev') + '"]');
    if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
  });

  // Auto-focus note content after swap
  document.body.addEventListener('htmx:afterSwap', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('notes-list')) {
      var areas = e.target.querySelectorAll('textarea, input[type="text"]');
      var last = areas[areas.length - 1];
      if (last) last.focus();
    }
  });

  // Setup scroll preservation
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

  // Slow requests indicator
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

  // Autosave validation & toast notifications
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
  var unsavedOps = {};
  var swallowedFailure = false;

  function refreshToast() {
    var n = 0, k;
    for (k in unsavedOps) if (Object.prototype.hasOwnProperty.call(unsavedOps, k)) n++;
    if (n === 0) { clearToast(); return; }
    saveToast(n === 1 ? LOST : '⚠ ' + n + ' changes not saved — your text is still on screen. Check the connection and try again.');
  }

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

  document.body.addEventListener('app:save-failed', function () { swallowedFailure = true; });

  document.body.addEventListener('htmx:afterRequest', function (e) {
    var d = e.detail || {};
    var elt = d.elt || e.target;
    if (swallowedFailure) { swallowedFailure = false; markUnsaved(elt); return; }
    if (d.successful) { markSaved(elt); return; }
    if (isWrite(d)) markUnsaved(elt);
  });

  // Command palette & jump keys navigation
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
    if (pendingG) { pendingG = false; clearTimeout(gTimer); var dest = NAV[e.key]; if (dest) { e.preventDefault(); location.href = dest; } return; }
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) { pendingG = true; clearTimeout(gTimer); gTimer = setTimeout(function () { pendingG = false; }, 1200); return; }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search-box')) closeSearch(); });

  // Command palette search lists navigation
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

  // Accessibility Toolbar
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

  // Active page indicator inside the left rail
  (function () {
    var path = location.pathname;
    var best = null;
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

  // Pacing/Starter countdown timer
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

  // Curriculum Map Drag and Drop
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

  // --- Overhaul: Slide Deck Navigation ---
  function showSlide(index) {
    var thumbs = document.querySelectorAll('[data-slide-thumb]');
    var slides = document.querySelectorAll('.pslide');
    var notes = document.querySelectorAll('.pslide-note-item');
    var positionEls = document.querySelectorAll('[data-slide-position]');
    var eyebrow = document.getElementById('slide-notes-eyebrow');

    if (slides.length === 0) return;
    if (index < 0) index = 0;
    if (index >= slides.length) index = slides.length - 1;

    // Update slides
    slides.forEach(function (s) {
      if (parseInt(s.getAttribute('data-slide'), 10) === index) {
        s.classList.add('on');
      } else {
        s.classList.remove('on');
      }
    });

    // Update thumbs if present
    if (thumbs.length > 0) {
      thumbs.forEach(function (t) {
        var idx = parseInt(t.getAttribute('data-index'), 10);
        if (idx === index) {
          t.setAttribute('aria-current', 'true');
          // Update position text from thumb attribute
          var pos = t.getAttribute('data-position');
          positionEls.forEach(function (el) { el.textContent = pos; });
        } else {
          t.setAttribute('aria-current', 'false');
        }
      });
    } else {
      // No thumbs (board view)
      positionEls.forEach(function (el) {
        el.textContent = 'Slide ' + (index + 1) + ' of ' + slides.length;
      });
    }

    // Update notes if present
    notes.forEach(function (n) {
      if (parseInt(n.getAttribute('data-slide'), 10) === index) {
        n.classList.add('on');
      } else {
        n.classList.remove('on');
      }
    });

    // Update notes eyebrow if present
    if (eyebrow) {
      eyebrow.textContent = 'Private · slide ' + (index + 1);
    }
  }

  function getActiveSlideIndex() {
    var activeSlide = document.querySelector('.pslide.on');
    if (!activeSlide) return 0;
    return parseInt(activeSlide.getAttribute('data-slide'), 10) || 0;
  }

  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-slide-thumb]');
    if (thumb) {
      var index = parseInt(thumb.getAttribute('data-index'), 10);
      showSlide(index);
      return;
    }

    var prevBtn = e.target.closest('#slide-prev-btn');
    if (prevBtn) {
      showSlide(getActiveSlideIndex() - 1);
      return;
    }

    var nextBtn = e.target.closest('#slide-next-btn');
    if (nextBtn) {
      showSlide(getActiveSlideIndex() + 1);
      return;
    }
  });

  // --- Overhaul: Text-To-Speech (TTS) Slide Narration ---
  var currentUtterance = null;
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.ws-speak');
    if (btn) {
      var text = btn.getAttribute('data-speak-text') || '';
      if (!text) return;

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        // If we clicked the button to stop the current speech, just return
        if (currentUtterance && currentUtterance.text === text) {
          currentUtterance = null;
          return;
        }
      }

      currentUtterance = new SpeechSynthesisUtterance(text);
      currentUtterance.lang = 'en-GB';
      window.speechSynthesis.speak(currentUtterance);
    }
  });

  // --- Overhaul: Start Work / Group Lock Simulation ---
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#start-work-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Work locked';

      // Disable the edit groups button
      var editBtn = document.getElementById('edit-groups-btn');
      if (editBtn) editBtn.disabled = true;

      // Update the group-state badge and text
      var groupStateWrap = document.querySelector('.group-state');
      if (groupStateWrap) {
        var badge = groupStateWrap.querySelector('.badge');
        if (badge) {
          badge.className = 'badge danger';
          badge.textContent = 'Locked';
        }
        var stateText = groupStateWrap.querySelector('[data-group-state]');
        if (stateText) {
          stateText.textContent = 'Independent work in progress · changes locked';
        }
      }
    }
  });
})();
