(function () {
  'use strict';

  var root = document.documentElement;
  var status = document.getElementById('prototype-status');

  function announce(message) {
    if (!status) return;
    status.textContent = '';
    window.setTimeout(function () { status.textContent = message; }, 20);
  }

  document.querySelectorAll('[data-contrast-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var high = root.dataset.contrast !== 'high';
      root.dataset.contrast = high ? 'high' : 'standard';
      button.setAttribute('aria-pressed', String(high));
      announce(high ? 'High contrast enabled' : 'Standard dark contrast enabled');
    });
  });

  document.querySelectorAll('[data-density-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var compact = root.dataset.density !== 'compact';
      root.dataset.density = compact ? 'compact' : 'comfortable';
      button.setAttribute('aria-pressed', String(compact));
      announce(compact ? 'Compact layout enabled' : 'Comfortable layout enabled');
    });
  });

  document.querySelectorAll('[data-dialog-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      var dialog = document.getElementById(button.getAttribute('data-dialog-open'));
      if (!dialog || typeof dialog.showModal !== 'function') return;
      dialog.showModal();
      var focusTarget = dialog.querySelector('[autofocus], button, input, select, textarea');
      if (focusTarget) focusTarget.focus();
      announce(button.getAttribute('data-open-message') || 'Dialog opened');
    });
  });

  document.querySelectorAll('[data-dialog-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      var dialog = button.closest('dialog');
      if (dialog) dialog.close();
    });
  });

  document.querySelectorAll('dialog').forEach(function (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  document.querySelectorAll('[data-demo-action]').forEach(function (button) {
    button.addEventListener('click', function () {
      announce(button.getAttribute('data-demo-action') || 'Prototype action selected');
    });
  });

  document.querySelectorAll('[data-slide-thumb]').forEach(function (button) {
    button.addEventListener('click', function () {
      var title = button.getAttribute('data-title') || '';
      var label = button.getAttribute('data-label') || 'Lesson slide';
      var points = (button.getAttribute('data-points') || '').split('|').filter(Boolean);
      document.querySelectorAll('[data-slide-thumb]').forEach(function (thumb) {
        thumb.setAttribute('aria-current', String(thumb === button));
      });
      var preview = document.querySelector('[data-slide-preview]');
      if (preview) {
        preview.querySelector('[data-slide-label]').textContent = label;
        preview.querySelector('[data-slide-title]').textContent = title;
        var list = preview.querySelector('[data-slide-points]');
        list.innerHTML = points.map(function (point) { return '<li>' + escapeHtml(point) + '</li>'; }).join('');
      }
      var position = document.querySelector('[data-slide-position]');
      if (position) position.textContent = button.getAttribute('data-position') || '';
      announce('Showing ' + label + ': ' + title);
    });
  });

  document.querySelectorAll('[data-note-type]').forEach(function (button) {
    button.addEventListener('click', function () {
      document.querySelectorAll('[data-note-type]').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      var hint = document.querySelector('[data-note-hint]');
      if (hint) {
        hint.textContent = button.dataset.noteType === 'Safeguarding'
          ? 'Private: routes to the safeguarding review workflow.'
          : 'Saved to this lesson. Add pupil links only if needed.';
      }
      announce(button.dataset.noteType + ' note selected');
    });
  });

  document.querySelectorAll('[data-save-note]').forEach(function (button) {
    button.addEventListener('click', function () {
      var form = button.closest('.note-form') || document;
      var field = form.querySelector('textarea');
      if (!field || !field.value.trim()) {
        announce('Type a note before saving');
        if (field) field.focus();
        return;
      }
      var active = document.querySelector('[data-note-type][aria-pressed="true"]');
      var kind = active ? active.dataset.noteType : 'Learning';
      var list = document.querySelector('[data-recent-notes]');
      if (list) {
        var item = document.createElement('li');
        item.innerHTML = '<span class="badge">' + escapeHtml(kind) + '</span><span>' + escapeHtml(field.value.trim()) + '</span><time>now</time>';
        list.prepend(item);
      }
      field.value = '';
      announce(kind + ' note saved to this lesson');
    });
  });

  var startButton = document.querySelector('[data-start-work]');
  if (startButton) {
    startButton.addEventListener('click', function () {
      var editButton = document.querySelector('[data-edit-groups]');
      var state = document.querySelector('[data-group-state]');
      startButton.disabled = true;
      startButton.textContent = 'Work started';
      if (editButton) {
        editButton.disabled = true;
        editButton.removeAttribute('data-dialog-open');
      }
      if (state) state.textContent = 'Independent work started · groups locked for this activity';
      announce('Independent work started. Activity groups are now locked.');
    });
  }

  var groupSave = document.querySelector('[data-save-groups]');
  if (groupSave) {
    groupSave.addEventListener('click', function () {
      var dialog = groupSave.closest('dialog');
      if (dialog) dialog.close();
      announce('Activity groups updated. Changes apply before pupils open their work.');
    });
  }

  document.querySelectorAll('[data-mark-choice]').forEach(function (button) {
    button.addEventListener('click', function () {
      var group = button.closest('.mark-buttons');
      group.querySelectorAll('[data-mark-choice]').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      var question = button.closest('.mark-question');
      if (question) question.classList.add('checked');
      announce(button.getAttribute('data-mark-choice') + ' selected');
    });
  });

  document.querySelectorAll('[data-confirm-all]').forEach(function (button) {
    button.addEventListener('click', function () {
      var dialog = button.closest('dialog');
      if (!dialog) return;
      dialog.querySelectorAll('.mark-question').forEach(function (question) { question.classList.add('checked'); });
      dialog.querySelectorAll('.badge.ai, .badge.warn').forEach(function (badge) {
        badge.className = 'badge good';
        badge.textContent = 'Checked';
      });
      var checked = dialog.querySelector('[data-checked-count]');
      if (checked) checked.textContent = '4/4 checked';
      announce('All suggested marks for Alex confirmed');
    });
  });

  document.querySelectorAll('[data-next-pupil]').forEach(function (button) {
    button.addEventListener('click', function () {
      var dialog = button.closest('dialog');
      var name = dialog && dialog.querySelector('[data-pupil-name]');
      var position = dialog && dialog.querySelector('[data-pupil-position]');
      if (name) name.textContent = 'Bethany Cole';
      if (position) position.textContent = 'Pupil 2 of 28';
      announce('Showing Bethany Cole, pupil 2 of 28');
      if (dialog) dialog.scrollTop = 0;
    });
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }
})();
