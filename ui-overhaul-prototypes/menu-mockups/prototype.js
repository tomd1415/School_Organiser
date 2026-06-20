(function () {
  'use strict';

  // DOM Elements
  const body = document.body;
  const systemButtons = document.querySelectorAll('[data-system-target]');
  const statusAnnounce = document.getElementById('prototype-status');

  function announce(message) {
    if (!statusAnnounce) return;
    statusAnnounce.textContent = '';
    setTimeout(function() {
      statusAnnounce.textContent = message;
    }, 20);
  }

  // ----------------------------------------------------
  // Switch Menu System Simulator
  // ----------------------------------------------------
  systemButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetSystem = this.getAttribute('data-system-target');
      body.setAttribute('data-active-system', targetSystem);

      systemButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');

      const label = this.querySelector('strong').textContent;
      announce('Activated menu simulator for: ' + label);
    });
  });

  // ----------------------------------------------------
  // Option 1: Time-Slice Header Interactive Logic
  // ----------------------------------------------------
  const phaseButtons = document.querySelectorAll('[data-phase-opt1]');
  const opt1AnchorTitle = document.getElementById('opt1-anchor-title');
  const opt1AnchorDesc = document.getElementById('opt1-anchor-desc');
  const adminDrawerToggle = document.getElementById('admin-drawer-toggle');
  const adminDropdownMenu = document.getElementById('admin-dropdown-menu');

  phaseButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const phase = this.getAttribute('data-phase-opt1');
      body.setAttribute('data-option1-phase', phase);

      phaseButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // Update anchor texts
      if (phase === 'before') {
        opt1AnchorTitle.textContent = 'Morning Briefing';
        opt1AnchorDesc.textContent = 'IT2 · Starts 08:35';
        announce('Header pins switched to Before School context.');
      } else if (phase === 'lesson') {
        opt1AnchorTitle.textContent = 'Year 9 Computer Science';
        opt1AnchorDesc.textContent = 'Room IT2 · Period 3';
        announce('Header pins switched to Active Teaching context.');
      } else if (phase === 'after') {
        opt1AnchorTitle.textContent = 'Python Coding Club';
        opt1AnchorDesc.textContent = 'Room IT2 · 15:40 - 16:30';
        announce('Header pins switched to After School context.');
      }
    });
  });

  // Toggle admin drawer dropdown
  if (adminDrawerToggle && adminDropdownMenu) {
    adminDrawerToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      adminDropdownMenu.classList.toggle('show');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function () {
      adminDropdownMenu.classList.remove('show');
    });
  }

  // ----------------------------------------------------
  // Option 2: Calm HUD & Keyboard Palette Interactive Logic
  // ----------------------------------------------------
  const paletteSimBtn = document.getElementById('palette-sim-btn');
  const commandPalette = document.getElementById('command-palette');
  const paletteCloseBtn = document.getElementById('palette-close-btn');
  const paletteSearchInput = document.getElementById('palette-search-input');
  const paletteItems = document.querySelectorAll('.palette-item');

  function openPalette() {
    if (!commandPalette) return;
    commandPalette.classList.add('show');
    if (paletteSearchInput) {
      paletteSearchInput.value = '';
      setTimeout(() => paletteSearchInput.focus(), 50);
    }
    announce('Command Palette overlay opened. Type a page or command.');
  }

  function closePalette() {
    if (!commandPalette) return;
    commandPalette.classList.remove('show');
    announce('Command Palette closed.');
  }

  if (paletteSimBtn) {
    paletteSimBtn.addEventListener('click', openPalette);
  }

  if (paletteCloseBtn) {
    paletteCloseBtn.addEventListener('click', closePalette);
  }

  // Close palette on ESC key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closePalette();
    }
  });

  // Space Double-Press Trigger
  let lastSpaceTime = 0;
  document.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.code === 'Space') {
      // Don't trigger if typing in an input or textarea
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      if (now - lastSpaceTime < 300) {
        e.preventDefault();
        openPalette();
      }
      lastSpaceTime = now;
    }
  });

  // Filter palette items on typing
  if (paletteSearchInput) {
    paletteSearchInput.addEventListener('input', function () {
      const filter = this.value.toLowerCase().trim();
      paletteItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(filter)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  // Click on palette item triggers redirection mock alert
  paletteItems.forEach(item => {
    item.addEventListener('click', function () {
      const label = this.querySelector('strong').textContent;
      alert(`Redirecting teacher to page: ${label}`);
      closePalette();
    });
  });

  // ----------------------------------------------------
  // Option 3: Collapsible 3-Tier Tab Ribbon Interactive Logic
  // ----------------------------------------------------
  const ribbonDrawerToggle = document.getElementById('ribbon-drawer-toggle');
  const ribbonDrawer = document.getElementById('ribbon-drawer');

  if (ribbonDrawerToggle && ribbonDrawer) {
    ribbonDrawerToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = ribbonDrawer.classList.toggle('open');
      announce(open ? 'Advanced Ribbon Drawer expanded.' : 'Advanced Ribbon Drawer collapsed.');
    });
  }

  // ----------------------------------------------------
  // Global Accessibility Toggles
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

})();
