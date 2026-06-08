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
      var areas = e.target.querySelectorAll('textarea');
      var last = areas[areas.length - 1];
      if (last) last.focus();
    }
  });
})();
