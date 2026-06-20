(function () {
  'use strict';

  // In-memory list of captured thoughts
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
  
  const scaffoldDot = document.getElementById('scaffold-dot');
  const scaffoldMeta = document.getElementById('scaffold-meta');
  const scaffoldTitle = document.getElementById('scaffold-title');

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
  // Switch phases dynamically
  // ----------------------------------------------------
  phaseButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetPhase = this.getAttribute('data-phase-target');
      body.setAttribute('data-active-screen', targetPhase);

      phaseButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');

      updatePhaseContext(targetPhase);
    });
  });

  function updatePhaseContext(phase) {
    if (phase === 'now-before') {
      simulatedClock.textContent = '08:00';
      scaffoldDot.className = 'live-dot';
      scaffoldDot.style.background = 'var(--green)';
      scaffoldDot.style.boxShadow = '0 0 6px var(--green)';
      scaffoldMeta.textContent = 'Before School';
      scaffoldTitle.textContent = 'Morning briefing starts in 35 mins';
      
      agendaSlots.forEach((slot, idx) => {
        slot.className = 'timeline-slot';
        if (idx === 0) slot.classList.add('active');
      });
      announce('Console phase switched to Before School. Briefing alerts active.');
    } 
    else if (phase === 'now-between') {
      simulatedClock.textContent = '11:15';
      scaffoldDot.className = 'live-dot';
      scaffoldDot.style.background = 'var(--amber)';
      scaffoldDot.style.boxShadow = '0 0 6px var(--amber)';
      scaffoldMeta.textContent = 'Period 3';
      scaffoldTitle.textContent = 'Y9 CS starts in 10 mins (Room IT2)';
      
      agendaSlots.forEach((slot, idx) => {
        slot.className = 'timeline-slot';
        if (idx < 3) slot.classList.add('done');
        if (idx === 3) slot.classList.add('active');
      });
      announce('Console phase switched to Between Lessons transition. Active break timer ready.');
    } 
    else if (phase === 'now-after') {
      simulatedClock.textContent = '15:30';
      scaffoldDot.className = 'live-dot';
      scaffoldDot.style.background = 'var(--blue)';
      scaffoldDot.style.boxShadow = '0 0 6px var(--blue)';
      scaffoldMeta.textContent = 'After School';
      scaffoldTitle.textContent = 'Coding Club starts in 10 mins';
      
      agendaSlots.forEach((slot, idx) => {
        slot.className = 'timeline-slot done';
      });
      announce('Console phase switched to After School prep mode.');
    }
  }

  // ----------------------------------------------------
  // Option 3 Drawer collapsing
  // ----------------------------------------------------
  const ribbonDrawerToggle = document.getElementById('ribbon-drawer-toggle');
  const ribbonDrawer = document.getElementById('ribbon-drawer');

  if (ribbonDrawerToggle && ribbonDrawer) {
    ribbonDrawerToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = ribbonDrawer.classList.toggle('open');
      announce(open ? 'Collapsible advanced menu drawer expanded.' : 'Collapsible advanced menu drawer collapsed.');
    });
  }

  // ----------------------------------------------------
  // Quick Capture & Dictation
  // ----------------------------------------------------
  tagButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const tag = this.getAttribute('data-tag-text');
      activeTag = tag;
      tagButtons.forEach(b => b.style.borderColor = 'var(--line)');
      this.style.borderColor = 'var(--violet)';
      announce('Tagged mind notes as: ' + tag);
    });
  });

  if (captureForm) {
    captureForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = captureInput.value.trim();
      if (!text) return;

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
      
      captureInput.value = '';
      activeTag = 'General';
      tagButtons.forEach(b => b.style.borderColor = 'var(--line)');
      announce('Captured thought saved to processing queue.');
    });
  }

  if (dictateBtn) {
    dictateBtn.addEventListener('click', function () {
      this.classList.toggle('speaking');
      if (this.classList.contains('speaking')) {
        this.innerHTML = '⏹️ Stop';
        this.style.background = 'var(--red-soft)';
        this.style.borderColor = 'var(--red)';
        
        let counter = 0;
        const textSnippets = [
          "Confirm IT2 chargers are working.",
          " Check loop bounds for lesson tomorrow."
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
            announce('Voice input completed.');
          }
        }, 1200);
      } else {
        clearInterval(this.dictationInterval);
        this.innerHTML = '🎤 Dictate';
        this.style.background = 'transparent';
        this.style.borderColor = 'var(--line-strong)';
        announce('Dictation stopped.');
      }
    });
  }

  function renderInboxItems() {
    inboxContainer.innerHTML = '';
    inboxCountBadge.textContent = `${inboxItems.length} item${inboxItems.length !== 1 ? 's' : ''}`;

    if (inboxItems.length === 0) {
      inboxContainer.innerHTML = '<p class="quiet" style="text-align: center; padding: 1.5rem 0;">🎉 All notes processed!</p>';
      return;
    }

    inboxItems.forEach(item => {
      const row = document.createElement('div');
      row.className = `inbox-item-row ${item.isNew ? 'new-inbox-item' : ''}`;
      row.setAttribute('data-item-id', item.id);

      const badgeClass = item.tag === 'Pupil Info' ? 'warn' : item.tag === 'Supply Alert' ? 'ai' : 'red';

      row.innerHTML = `<div class="inbox-item-meta">
                        <span class="badge ${badgeClass}">${item.tag}</span>
                        <span class="time-ago">${item.time}</span>
                      </div>
                      <p class="inbox-item-text">${escapeHtml(item.text)}</p>
                      <div class="inbox-item-actions">
                        <button class="button small ghost" type="button" data-action="process" data-id="${item.id}">Process</button>
                        <button class="button small ghost danger" type="button" data-action="delete" data-id="${item.id}">×</button>
                      </div>`;
      
      inboxContainer.appendChild(row);
      
      if (item.isNew) {
        setTimeout(() => {
          row.classList.remove('new-inbox-item');
          delete item.isNew;
        }, 500);
      }
    });

    bindInboxActions();
  }

  function bindInboxActions() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', function () {
        const action = this.getAttribute('data-action');
        const id = parseInt(this.getAttribute('data-id'), 10);
        
        if (action === 'delete') {
          inboxItems = inboxItems.filter(item => item.id !== id);
          renderInboxItems();
          announce('Removed note.');
        } else if (action === 'process') {
          openProcessDialog(id);
        }
      });
    });
  }

  function openProcessDialog(id) {
    activeProcessingId = id;
    const item = inboxItems.find(item => item.id === id);
    if (!item) return;

    dialogNoteText.textContent = item.text;
    dialogNoteBadge.textContent = item.tag;
    dialogNoteBadge.className = `badge ${item.tag === 'Pupil Info' ? 'warn' : item.tag === 'Supply Alert' ? 'ai' : 'red'}`;

    processActionSelect.value = 'todo';
    processTodoGroup.style.display = 'flex';
    processPupilGroup.style.display = 'none';

    processDialog.showModal();
    announce('Opened processing dialog.');
  }

  function closeProcessDialog() {
    processDialog.close();
    activeProcessingId = null;
  }

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
      } else {
        alert(`Observation scheduled on calendar agenda:\n"${originalItem.text}"`);
      }

      inboxItems = inboxItems.filter(item => item.id !== activeProcessingId);
      renderInboxItems();
      closeProcessDialog();
      announce('Note filed successfully.');
    });
  }

  function addCheckedTask(listName, text) {
    let checklistContainer = null;
    if (listName === 'before') {
      checklistContainer = document.querySelector('.phase-before-card .checklist-items');
    } else if (listName === 'between') {
      checklistContainer = document.querySelector('.phase-between-card .checklist-items');
    } else if (listName === 'after') {
      checklistContainer = document.querySelector('.phase-after-card .checklist-items');
    }

    if (checklistContainer) {
      const li = document.createElement('li');
      li.innerHTML = `<label class="check-item">
                        <input type="checkbox" class="task-check" data-section="${listName}">
                        <span class="lbl-txt">${escapeHtml(text)}</span>
                      </label>`;
      checklistContainer.appendChild(li);
      
      li.querySelector('.task-check').addEventListener('change', function () {
        const isChecked = this.checked;
        announce((isChecked ? 'Checked: ' : 'Unchecked: ') + text);
      });
      announce('Added checklist item.');
    }
  }

  dialogCloseBtn.addEventListener('click', closeProcessDialog);
  dialogCancelBtn.addEventListener('click', closeProcessDialog);

  // ----------------------------------------------------
  // Global Actions simulations
  // ----------------------------------------------------
  const startTimerBtn = document.getElementById('start-timer-btn');
  if (startTimerBtn) {
    startTimerBtn.addEventListener('click', function () {
      this.textContent = '⏱️ Running (06:59)';
      this.style.background = 'var(--red-soft)';
      this.style.borderColor = 'var(--red)';
      this.style.color = 'var(--red)';
      announce('Transition break countdown timer started.');
    });
  }

  // ----------------------------------------------------
  // Accessibility & Orientation
  // ----------------------------------------------------
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

  // Orientation Toggle
  const orientationBtn = document.querySelector('[data-orientation-toggle]');
  if (orientationBtn) {
    orientationBtn.addEventListener('click', function () {
      const current = body.getAttribute('data-orientation') || 'landscape';
      const next = current === 'landscape' ? 'portrait' : 'landscape';
      body.setAttribute('data-orientation', next);
      
      if (next === 'portrait') {
        this.innerHTML = '📱 Portrait View';
        announce('Switched to Portrait Screen layout.');
      } else {
        this.innerHTML = '🖥️ Landscape View';
        announce('Switched to Landscape Desk layout.');
      }
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  // Initialize
  updatePhaseContext('now-before');
  renderInboxItems();

})();
