(function () {
  'use strict';

  // In-memory list of captured mind-dump thoughts to process
  let inboxItems = [
    { id: 1, tag: "Pupil Info", text: "Alex Morgan explained rates of reaction perfectly. Needs extend worksheets next week.", time: "Today, 09:45" },
    { id: 2, tag: "Supply Alert", text: "Room IT2 is out of green dry-erase markers. Grab a box from stationery cupboard.", time: "Yesterday, 15:10" },
    { id: 3, tag: "Task", text: "Prepare slides for Year 10 carbon chemistry lesson on Tuesday.", time: "Yesterday, 16:30" }
  ];

  let nextItemId = 4;
  let activeTag = "General";
  let activeProcessingId = null;

  // DOM Elements
  const body = document.body;
  const phaseButtons = document.querySelectorAll('[data-phase-target]');
  const simulatedClock = document.getElementById('simulated-clock');
  const agendaSlots = document.querySelectorAll('.agenda-timeline .timeline-slot');

  const captureForm = document.getElementById('now-capture-form');
  const captureInput = document.getElementById('now-capture-input');
  const tagButtons = document.querySelectorAll('.tag-btn');
  const dictateBtn = document.getElementById('now-dictate-btn');
  const inboxContainer = document.getElementById('inbox-items-container');
  const inboxCountBadge = document.getElementById('inbox-count-badge');

  const processDialog = document.getElementById('process-dialog');
  const dialogCloseBtn = document.getElementById('dialog-close-btn');
  const dialogCancelBtn = document.getElementById('dialog-cancel-btn');
  const dialogNoteBadge = document.getElementById('dialog-note-badge');
  const dialogNoteText = document.getElementById('dialog-note-text');
  const dialogProcessForm = document.getElementById('dialog-process-form');
  const processActionSelect = document.getElementById('process-action-select');
  const processTodoGroup = document.getElementById('process-details-todo');
  const processPupilGroup = document.getElementById('process-details-pupil');

  const statusAnnounce = document.getElementById('prototype-status');

  function announce(message) {
    if (!statusAnnounce) return;
    statusAnnounce.textContent = '';
    setTimeout(function() {
      statusAnnounce.textContent = message;
    }, 20);
  }

  // ----------------------------------------------------
  // Time-of-Day Phase Toggling & Clock Simulation
  // ----------------------------------------------------
  phaseButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetPhase = this.getAttribute('data-phase-target');
      body.setAttribute('data-active-screen', targetPhase);

      phaseButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');

      // Update clock and agenda highlights based on selected phase
      updatePhaseContext(targetPhase);
    });
  });

  function updatePhaseContext(phase) {
    if (phase === 'now-before') {
      simulatedClock.textContent = '08:00';
      
      // Update Agenda highlights
      agendaSlots.forEach((slot, idx) => {
        slot.className = 'timeline-slot';
        if (idx === 0) slot.classList.add('active'); // Tutor registration is active
      });
      announce('Simulator switched to Before School (08:00). tutor group registration is active.');
    } 
    else if (phase === 'now-between') {
      simulatedClock.textContent = '11:15';
      
      // Break duty and Y9 CS are next
      agendaSlots.forEach((slot, idx) => {
        slot.className = 'timeline-slot';
        if (idx < 3) slot.classList.add('done'); // tutor, p1, p2 are done
        if (idx === 3) slot.classList.add('active'); // Break duty is active
      });
      announce('Simulator switched to Between Lessons (11:15 Break). Morning break duty corridor is active.');
    } 
    else if (phase === 'now-after') {
      simulatedClock.textContent = '15:30';
      
      // All lessons completed
      agendaSlots.forEach((slot, idx) => {
        slot.className = 'timeline-slot done'; // All lessons checked off
      });
      announce('Simulator switched to After School (15:30). Coding club session is active.');
    }

    // Refresh checklist counts
    updateChecklistBadge('before');
    updateChecklistBadge('between');
    updateChecklistBadge('after');
  }

  // ----------------------------------------------------
  // Task Checklist counters
  // ----------------------------------------------------
  document.querySelectorAll('.task-check').forEach(check => {
    check.addEventListener('change', function () {
      const section = this.getAttribute('data-section');
      updateChecklistBadge(section);
      
      const isChecked = this.checked;
      const text = this.closest('label').querySelector('.lbl-txt').textContent;
      announce((isChecked ? 'Checked off task: ' : 'Unchecked task: ') + text);
    });
  });

  function updateChecklistBadge(section) {
    const selector = `.task-check[data-section="${section}"]`;
    const checks = document.querySelectorAll(selector);
    if (!checks.length) return;

    const checked = document.querySelectorAll(`${selector}:checked`).length;
    const badgeId = section === 'before' ? 'before-checklist-count' : 
                    section === 'after' ? 'after-checklist-count' : null;

    if (badgeId) {
      const badge = document.getElementById(badgeId);
      if (badge) {
        badge.textContent = `${checked} / ${checks.length} done`;
        if (checked === checks.length) {
          badge.className = 'badge good';
        } else {
          badge.className = 'badge';
        }
      }
    }
  }

  // ----------------------------------------------------
  // Quick Capture Inbox & Dictation Simulation
  // ----------------------------------------------------
  
  // Tag buttons toggle
  tagButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const tag = this.getAttribute('data-tag-text');
      activeTag = tag;
      
      tagButtons.forEach(b => b.style.borderColor = 'var(--line)');
      this.style.borderColor = 'var(--violet)';
      announce('Observation category tagged as: ' + tag);
    });
  });

  // Capture submission
  if (captureForm) {
    captureForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = captureInput.value.trim();
      if (!text) {
        alert('Please type a note first before capturing!');
        captureInput.focus();
        return;
      }

      // Add to list
      const now = new Date();
      const timeStr = "Today, " + now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

      const newItem = {
        id: nextItemId++,
        tag: activeTag === 'General' ? 'Task' : activeTag,
        text: text,
        time: timeStr,
        isNew: true
      };

      inboxItems.unshift(newItem);
      renderInboxItems();
      
      // Reset input
      captureInput.value = '';
      activeTag = 'General';
      tagButtons.forEach(b => b.style.borderColor = 'var(--line)');
      
      announce('Note captured to Inbox! Unloaded from working memory.');
    });
  }

  // Dictate voice notes simulation
  if (dictateBtn) {
    dictateBtn.addEventListener('click', function () {
      this.classList.toggle('speaking');
      if (this.classList.contains('speaking')) {
        this.innerHTML = '⏹️ Stop';
        this.style.background = 'var(--red-soft)';
        this.style.borderColor = 'var(--red)';
        
        let counter = 0;
        const textSnippets = [
          "Daniel Reed struggled with loop range stop bounds today.",
          " Remember to check corridor lockers.",
          " Check Y7 folders."
        ];
        
        this.dictationInterval = setInterval(() => {
          if (counter < textSnippets.length) {
            captureInput.value += textSnippets[counter];
            counter++;
            announce('Simulating voice input...');
          } else {
            clearInterval(this.dictationInterval);
            this.classList.remove('speaking');
            this.innerHTML = '🎤 Dictate';
            this.style.background = 'transparent';
            this.style.borderColor = 'var(--line-strong)';
            announce('Voice dictation completed.');
          }
        }, 1300);
      } else {
        clearInterval(this.dictationInterval);
        this.innerHTML = '🎤 Dictate';
        this.style.background = 'transparent';
        this.style.borderColor = 'var(--line-strong)';
        announce('Dictation stopped.');
      }
    });
  }

  // Render the inbox items inside the card
  function renderInboxItems() {
    inboxContainer.innerHTML = '';
    inboxCountBadge.textContent = `${inboxItems.length} item${inboxItems.length !== 1 ? 's' : ''}`;

    if (inboxItems.length === 0) {
      inboxContainer.innerHTML = '<p class="quiet" style="text-align: center; padding: 2rem 0;">🎉 Inbox empty! All captured thoughts processed.</p>';
      return;
    }

    inboxItems.forEach(item => {
      const row = document.createElement('div');
      row.className = `inbox-item-row ${item.isNew ? 'new-inbox-item' : ''}`;
      row.setAttribute('data-item-id', item.id);

      const badgeClass = item.tag === 'Pupil Info' ? 'warn' : item.tag === 'Supply Alert' ? 'ai' : item.tag === 'Reminder' ? 'good' : 'red';

      row.innerHTML = `<div class="inbox-item-meta">
                        <span class="badge ${badgeClass}">${item.tag}</span>
                        <span class="time-ago">${item.time}</span>
                      </div>
                      <p class="inbox-item-text">${escapeHtml(item.text)}</p>
                      <div class="inbox-item-actions">
                        <button class="button small ghost" type="button" data-action="process" data-id="${item.id}">Process Now</button>
                        <button class="button small ghost" type="button" data-action="tomorrow" data-id="${item.id}">Tomorrow</button>
                        <button class="button small ghost danger" type="button" data-action="delete" data-id="${item.id}">×</button>
                      </div>`;
      
      inboxContainer.appendChild(row);
      
      // Remove visual highlight animation tag after render
      if (item.isNew) {
        setTimeout(() => {
          row.classList.remove('new-inbox-item');
          delete item.isNew;
        }, 500);
      }
    });

    // Rebind action click listeners
    bindInboxActions();
  }

  // Bind click listeners for processed items
  function bindInboxActions() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', function () {
        const action = this.getAttribute('data-action');
        const id = parseInt(this.getAttribute('data-id'), 10);
        
        if (action === 'delete') {
          deleteInboxItem(id);
        } else if (action === 'tomorrow') {
          scheduleInboxItem(id);
        } else if (action === 'process') {
          openProcessDialog(id);
        }
      });
    });
  }

  // Delete observation item
  function deleteInboxItem(id) {
    inboxItems = inboxItems.filter(item => item.id !== id);
    renderInboxItems();
    announce('Deleted inbox item.');
  }

  // Defer observation item
  function scheduleInboxItem(id) {
    const item = inboxItems.find(item => item.id === id);
    if (item) {
      item.time = "Tomorrow, 08:00";
      item.tag = "Reminder";
      renderInboxItems();
      announce('Rescheduled item for tomorrow morning.');
    }
  }

  // ----------------------------------------------------
  // Process Dialog Modal & Categorization logic
  // ----------------------------------------------------
  function openProcessDialog(id) {
    activeProcessingId = id;
    const item = inboxItems.find(item => item.id === id);
    if (!item) return;

    dialogNoteText.textContent = item.text;
    dialogNoteBadge.textContent = item.tag;
    dialogNoteBadge.className = `badge ${item.tag === 'Pupil Info' ? 'warn' : item.tag === 'Supply Alert' ? 'ai' : item.tag === 'Reminder' ? 'good' : 'red'}`;

    processActionSelect.value = 'todo';
    processTodoGroup.style.display = 'flex';
    processPupilGroup.style.display = 'none';

    processDialog.showModal();
    announce('Opened processing wizard for note.');
  }

  function closeProcessDialog() {
    processDialog.close();
    activeProcessingId = null;
    announce('Closed processing wizard.');
  }

  // Switch form context based on type selection
  processActionSelect.addEventListener('change', function () {
    const val = this.value;
    if (val === 'todo') {
      processTodoGroup.style.display = 'flex';
      processPupilGroup.style.display = 'none';
    } else if (val === 'pupil') {
      processTodoGroup.style.display = 'none';
      processPupilGroup.style.display = 'flex';
    } else {
      processTodoGroup.style.display = 'none';
      processPupilGroup.style.display = 'none';
    }
  });

  // Handle dialog processing submit
  if (dialogProcessForm) {
    dialogProcessForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const actionType = processActionSelect.value;
      const originalItem = inboxItems.find(item => item.id === activeProcessingId);
      if (!originalItem) return;

      if (actionType === 'todo') {
        const targetList = document.getElementById('process-target-checklist').value;
        addCheckedTask(targetList, originalItem.text);
      } else if (actionType === 'pupil') {
        const pupilName = document.getElementById('process-target-pupil').value;
        alert(`Linked observation note to student profile: ${pupilName}\n"${originalItem.text}"`);
      } else if (actionType === 'calendar') {
        alert(`Observation scheduled on calendar agenda:\n"${originalItem.text}"`);
      } else if (actionType === 'alert') {
        alert(`Observation pushed as a persistent Duty Alert notification.`);
      }

      // Remove from inbox queue
      inboxItems = inboxItems.filter(item => item.id !== activeProcessingId);
      renderInboxItems();
      closeProcessDialog();
      announce('Captured note processed and filed successfully.');
    });
  }

  // Helper to add processed task to the lists
  function addCheckedTask(listName, text) {
    let checklistContainer = null;
    if (listName === 'before') {
      checklistContainer = document.querySelector('.phase-before-content .checklist-items');
    } else if (listName === 'between') {
      checklistContainer = document.querySelector('.phase-between-content .checklist-items');
    } else if (listName === 'after') {
      checklistContainer = document.querySelector('.phase-after-content .checklist-items');
    }

    if (checklistContainer) {
      const li = document.createElement('li');
      li.innerHTML = `<label class="check-item">
                        <input type="checkbox" class="task-check" data-section="${listName}">
                        <span class="lbl-txt">${escapeHtml(text)}</span>
                      </label>`;
      checklistContainer.appendChild(li);
      
      // Bind checkbox change event to the new element
      li.querySelector('.task-check').addEventListener('change', function () {
        updateChecklistBadge(listName);
        const isChecked = this.checked;
        announce((isChecked ? 'Checked off task: ' : 'Unchecked task: ') + text);
      });

      updateChecklistBadge(listName);
    }
  }

  // Dialog actions mapping
  dialogCloseBtn.addEventListener('click', closeProcessDialog);
  dialogCancelBtn.addEventListener('click', closeProcessDialog);

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  // Accessibility Toggles
  document.querySelectorAll('[data-contrast-toggle]').forEach(button => {
    button.addEventListener('click', function () {
      const high = document.documentElement.dataset.contrast !== 'high';
      document.documentElement.dataset.contrast = high ? 'high' : 'standard';
      button.setAttribute('aria-pressed', String(high));
      announce(high ? 'High contrast enabled' : 'Standard contrast enabled');
    });
  });

  document.querySelectorAll('[data-density-toggle]').forEach(button => {
    button.addEventListener('click', function () {
      const compact = document.documentElement.dataset.density !== 'compact';
      document.documentElement.dataset.density = compact ? 'compact' : 'comfortable';
      button.setAttribute('aria-pressed', String(compact));
      announce(compact ? 'Compact layout enabled' : 'Comfortable layout enabled');
    });
  });

  // Initialize
  updatePhaseContext('now-before');
  renderInboxItems();

})();
