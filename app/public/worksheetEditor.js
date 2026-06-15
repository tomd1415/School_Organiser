// Block (WYSIWYG-style) worksheet/slides editor. Server seeds window.__WSBLOCKS__ (parsed Markdown),
// __WSRES__ (resource id), __WSCSRF__, __WSKIND__. We edit blocks in place, then POST the block list
// back — the server serialises to Markdown (one impl, tested) so auto-marking field keys are kept.
// Vanilla JS, no framework. User content is set via .value/.textContent (never innerHTML) — XSS-safe.
(function () {
  var blocks = Array.isArray(window.__WSBLOCKS__) ? window.__WSBLOCKS__ : [];
  var RES = window.__WSRES__;
  var CSRF = window.__WSCSRF__ || '';
  var list = document.getElementById('ws-ed-list');
  var preview = document.getElementById('ws-ed-preview');
  var status = document.getElementById('ws-ed-status');
  if (!list) return;
  var activeLevel = 'all';
  var dirty = false;

  function setStatus(msg) { if (status) status.textContent = msg; }
  function markDirty() { dirty = true; setStatus('unsaved changes'); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ── level of each block (for the focus filter): a "## 🟢/🟡/🔴" heading divides the doc ──────────
  function dividerLevel(b) {
    if (b.type !== 'heading') return null;
    var t = (b.text || '').toLowerCase();
    if (/🟢|\bsupport\b/.test(t)) return 'support';
    if (/🟡|\bcore\b/.test(t)) return 'core';
    if (/🔴|\bchallenge\b/.test(t)) return 'challenge';
    return null;
  }
  function levelOfIndex(i) {
    var cur = 'shared';
    for (var j = 0; j <= i; j++) { var d = dividerLevel(blocks[j]); if (d) cur = (j === i) ? d : d; }
    return cur;
  }

  var TYPE_LABEL = { heading: 'Heading', text: 'Instructions', qtable: 'Questions', rawtable: 'Table', checklist: 'Checklist', note: 'Note', image: 'Image', placeholder: 'Image to add', raw: 'Code / raw' };

  function autosize(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 600) + 'px'; }

  function textareaFor(getVal, setVal) {
    var ta = el('textarea', 'ws-ed-ta');
    ta.value = getVal() || '';
    ta.addEventListener('input', function () { setVal(ta.value); autosize(ta); markDirty(); });
    setTimeout(function () { autosize(ta); }, 0);
    return ta;
  }
  function inputFor(getVal, setVal, placeholder) {
    var inp = el('input', 'ws-ed-input');
    inp.type = 'text';
    inp.value = getVal() || '';
    if (placeholder) inp.placeholder = placeholder;
    inp.addEventListener('input', function () { setVal(inp.value); markDirty(); });
    return inp;
  }

  function bodyFor(b, i) {
    var body = el('div', 'ws-ed-body ws-ed-' + b.type);
    if (b.type === 'heading') {
      var row = el('div', 'ws-ed-headrow');
      var depth = el('select', 'ws-ed-depth');
      [['# Title', 1], ['## Section', 2], ['### Step', 3]].forEach(function (o) {
        var op = document.createElement('option'); op.value = String(o[1]); op.textContent = o[0]; if ((b.depth || 2) === o[1]) op.selected = true; depth.appendChild(op);
      });
      depth.addEventListener('change', function () { b.depth = parseInt(depth.value, 10) || 2; markDirty(); recomputeLevels(); });
      row.appendChild(depth);
      row.appendChild(inputFor(function () { return b.text; }, function (v) { b.text = v; }, 'Heading text (e.g. 🟢 Support)'));
      body.appendChild(row);
    } else if (b.type === 'text' || b.type === 'note' || b.type === 'raw' || b.type === 'rawtable') {
      var key = b.type === 'text' || b.type === 'note' ? 'text' : 'md';
      var ta = textareaFor(function () { return b[key]; }, function (v) { b[key] = v; });
      body.appendChild(ta);
      if (b.type === 'text') {
        // "make blank": turn the selected word into a fill-in gap [[ ]] (the answer goes in the answers doc).
        var tb = el('div', 'ws-ed-rowbar');
        var mk = el('button', 'btn-soft', '␣ make blank'); mk.type = 'button';
        mk.title = 'Turn the selected word into a fill-in gap [[ ]] — put the answer in the answers doc';
        mk.addEventListener('click', function () {
          var s = ta.selectionStart || 0, e = ta.selectionEnd || 0, val = ta.value;
          ta.value = val.slice(0, s) + '[[ ]]' + val.slice(e);
          b.text = ta.value; markDirty(); autosize(ta);
          ta.focus(); var pos = s + 5; ta.setSelectionRange(pos, pos);
        });
        tb.appendChild(mk);
        body.appendChild(tb);
      }
    } else if (b.type === 'placeholder') {
      body.appendChild(el('p', 'ws-ed-ph', '🖼️ ' + (b.desc || 'image to add')));
      body.appendChild(dropZone(i, 'Add this image (drop / paste / click)'));
    } else if (b.type === 'image') {
      var img = el('img', 'ws-ed-img'); img.src = b.url; img.alt = b.alt || ''; body.appendChild(img);
      body.appendChild(inputFor(function () { return b.alt; }, function (v) { b.alt = v; }, 'describe the image (alt text)'));
      body.appendChild(dropZone(i, 'Replace image (drop / paste / click)'));
    } else if (b.type === 'checklist') {
      var ul = el('div', 'ws-ed-items');
      (b.items || []).forEach(function (it, k) { ul.appendChild(itemRow(b, k)); });
      body.appendChild(ul);
      var add = el('button', 'btn-soft ws-ed-additem', '+ tick item'); add.type = 'button';
      add.addEventListener('click', function () { b.items.push(''); render(); markDirty(); });
      body.appendChild(add);
    } else if (b.type === 'qtable') {
      var qs = el('div', 'ws-ed-rows');
      (b.rows || []).forEach(function (r, k) { qs.appendChild(qRow(b, k)); });
      body.appendChild(qs);
      var aq = el('button', 'btn-soft', '+ question'); aq.type = 'button';
      aq.addEventListener('click', function () { b.rows.push({ q: '', kind: 'text' }); render(); markDirty(); });
      var ac = el('button', 'btn-soft', '+ multiple choice'); ac.type = 'button';
      ac.addEventListener('click', function () { b.rows.push({ q: '', kind: 'choice', options: ['', ''] }); render(); markDirty(); });
      var as = el('button', 'btn-soft', '+ screenshot task'); as.type = 'button';
      as.addEventListener('click', function () { b.rows.push({ q: '', kind: 'screenshot' }); render(); markDirty(); });
      var bar = el('div', 'ws-ed-rowbar'); bar.appendChild(aq); bar.appendChild(ac); bar.appendChild(as);
      // When ≥2 rows are multiple-choice, offer to give them ALL the same options — that turns the
      // table into a drag-and-drop matching question (the pupil pairs each item to one shared answer).
      if ((b.rows || []).filter(function (r) { return r.kind === 'choice'; }).length >= 2) {
        var sync = el('button', 'btn-soft', '⇅ same options (matching)'); sync.type = 'button';
        sync.title = "Copy the first choice row's options to every choice row — makes a matching question";
        sync.addEventListener('click', function () {
          var base = ((b.rows.filter(function (r) { return r.kind === 'choice'; })[0] || {}).options || []).slice();
          b.rows.forEach(function (r) { if (r.kind === 'choice') r.options = base.slice(); });
          render(); markDirty();
        });
        bar.appendChild(sync);
      }
      body.appendChild(bar);
    }
    return body;
  }

  function itemRow(b, k) {
    var row = el('div', 'ws-ed-itemrow');
    var box = el('span', '', '☐ ');
    row.appendChild(box);
    row.appendChild(inputFor(function () { return b.items[k]; }, function (v) { b.items[k] = v; }, 'success criterion'));
    var rm = el('button', 'link ws-ed-rm', '✕'); rm.type = 'button';
    rm.addEventListener('click', function () { b.items.splice(k, 1); render(); markDirty(); });
    row.appendChild(rm);
    return row;
  }

  function qRow(b, k) {
    var row = el('div', 'ws-ed-qrow');
    var top = el('div', 'ws-ed-qtop');
    top.appendChild(inputFor(function () { return b.rows[k].q; }, function (v) { b.rows[k].q = v; }, 'question / instruction for the answer'));
    // kind selector: a typed answer, a paste-a-screenshot answer, or multiple-choice options.
    var kindSel = el('select', 'ws-ed-kind');
    [['✍️ typed', 'text'], ['◉ multiple choice', 'choice'], ['📷 screenshot', 'screenshot']].forEach(function (o) {
      var op = document.createElement('option'); op.value = o[1]; op.textContent = o[0]; if (b.rows[k].kind === o[1]) op.selected = true; kindSel.appendChild(op);
    });
    kindSel.title = 'How the pupil answers this question';
    kindSel.addEventListener('change', function () {
      b.rows[k].kind = kindSel.value;
      if (b.rows[k].kind === 'choice') { if (!(b.rows[k].options && b.rows[k].options.length)) b.rows[k].options = ['', '']; }
      else { delete b.rows[k].options; }
      render(); markDirty();
    });
    top.appendChild(kindSel);
    var rm = el('button', 'link ws-ed-rm', '✕'); rm.type = 'button';
    rm.addEventListener('click', function () { b.rows.splice(k, 1); render(); markDirty(); });
    top.appendChild(rm);
    row.appendChild(top);
    // Multiple-choice: an option list the pupil picks ONE of. The correct answer goes in the answers
    // doc, not here — so there is no "mark correct" control on the pupil-facing worksheet.
    if (b.rows[k].kind === 'choice') {
      var opts = el('div', 'ws-ed-opts');
      (b.rows[k].options || []).forEach(function (o, oi) {
        var orow = el('div', 'ws-ed-optrow');
        orow.appendChild(el('span', 'ws-ed-optmark', '○'));
        orow.appendChild(inputFor(function () { return b.rows[k].options[oi]; }, function (v) { b.rows[k].options[oi] = v; }, 'option ' + (oi + 1)));
        var orm = el('button', 'link ws-ed-rm', '✕'); orm.type = 'button';
        orm.addEventListener('click', function () { b.rows[k].options.splice(oi, 1); render(); markDirty(); });
        orow.appendChild(orm);
        opts.appendChild(orow);
      });
      var addOpt = el('button', 'btn-soft ws-ed-addopt', '+ option'); addOpt.type = 'button';
      addOpt.addEventListener('click', function () { b.rows[k].options.push(''); render(); markDirty(); });
      opts.appendChild(addOpt);
      var tf = el('button', 'btn-soft', 'True / False'); tf.type = 'button'; tf.title = 'Set the options to True and False';
      tf.addEventListener('click', function () { b.rows[k].options = ['True', 'False']; render(); markDirty(); });
      opts.appendChild(tf);
      row.appendChild(opts);
    }
    return row;
  }

  function dropZone(i, label) {
    var z = el('div', 'ws-ed-drop', label);
    z.tabIndex = 0;
    z.addEventListener('click', function () { pickImage(i); });
    z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('is-drop'); });
    z.addEventListener('dragleave', function () { z.classList.remove('is-drop'); });
    z.addEventListener('drop', function (e) { e.preventDefault(); z.classList.remove('is-drop'); var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) uploadInto(i, f); });
    z.addEventListener('paste', function (e) { var it = (e.clipboardData && e.clipboardData.items) || []; for (var j = 0; j < it.length; j++) { if (it[j].type.indexOf('image/') === 0) { e.preventDefault(); uploadInto(i, it[j].getAsFile()); break; } } });
    return z;
  }
  function pickImage(i) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
    inp.addEventListener('change', function () { if (inp.files && inp.files[0]) uploadInto(i, inp.files[0]); });
    inp.click();
  }
  function uploadInto(i, file) {
    if (!file || !/^image\//.test(file.type)) return;
    setStatus('uploading image…');
    var fd = new FormData(); fd.append('file', file, file.name || 'image.png');
    fetch('/resources/' + RES + '/image', { method: 'POST', headers: { 'x-csrf-token': CSRF }, body: fd, credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        // A placeholder/image block becomes (or updates to) this image; otherwise insert a new image block.
        if (blocks[i] && (blocks[i].type === 'placeholder' || blocks[i].type === 'image')) blocks[i] = { type: 'image', alt: d.alt || '', url: d.url };
        else blocks.splice(i + 1, 0, { type: 'image', alt: d.alt || '', url: d.url });
        render(); markDirty(); setStatus('image added ✓');
      })
      .catch(function () { setStatus('could not upload that image'); });
  }

  function card(b, i) {
    var c = el('div', 'ws-ed-card ws-ed-card-' + b.type);
    c.setAttribute('data-lvl', levelOfIndex(i));
    var head = el('div', 'ws-ed-cardhead');
    head.appendChild(el('span', 'ws-ed-type', TYPE_LABEL[b.type] || b.type));
    var ctrl = el('span', 'ws-ed-ctrls');
    function btn(txt, title, fn) { var x = el('button', 'ws-ed-ctrl', txt); x.type = 'button'; x.title = title; x.addEventListener('click', fn); return x; }
    ctrl.appendChild(btn('▲', 'Move up', function () { if (i > 0) { var t = blocks[i - 1]; blocks[i - 1] = blocks[i]; blocks[i] = t; render(); markDirty(); } }));
    ctrl.appendChild(btn('▼', 'Move down', function () { if (i < blocks.length - 1) { var t = blocks[i + 1]; blocks[i + 1] = blocks[i]; blocks[i] = t; render(); markDirty(); } }));
    // text↔note conversion (the colour/role toggle the teacher can use)
    if (b.type === 'text' || b.type === 'note') ctrl.appendChild(btn(b.type === 'note' ? '↩ instruction' : '★ make note', 'Switch between an instruction panel and a highlighted note', function () { b.type = b.type === 'note' ? 'text' : 'note'; render(); markDirty(); }));
    ctrl.appendChild(btn('🗑', 'Delete this block', function () { if (confirm('Delete this block?')) { blocks.splice(i, 1); render(); markDirty(); } }));
    head.appendChild(ctrl);
    c.appendChild(head);
    c.appendChild(bodyFor(b, i));
    return c;
  }

  function recomputeLevels() {
    Array.prototype.forEach.call(list.querySelectorAll('.ws-ed-card'), function (c, i) { c.setAttribute('data-lvl', levelOfIndex(i)); });
    applyFilter();
  }
  function applyFilter() {
    Array.prototype.forEach.call(list.querySelectorAll('.ws-ed-card'), function (c) {
      var lvl = c.getAttribute('data-lvl');
      c.style.display = activeLevel === 'all' || lvl === 'shared' || lvl === activeLevel ? '' : 'none';
    });
  }

  function render() {
    list.textContent = '';
    if (blocks.length === 0) list.appendChild(el('p', 'muted', 'Empty worksheet — add a block below.'));
    blocks.forEach(function (b, i) { list.appendChild(card(b, i)); });
    applyFilter();
  }

  // ── add-block bar ───────────────────────────────────────────────────────────────────────────
  function addBlock(b) { blocks.push(b); render(); markDirty(); var cards = list.querySelectorAll('.ws-ed-card'); if (cards.length) cards[cards.length - 1].scrollIntoView({ block: 'nearest' }); }
  var addBar = el('div', 'ws-ed-add');
  [
    ['+ Instructions', function () { addBlock({ type: 'text', text: '' }); }],
    ['+ Question', function () { addBlock({ type: 'qtable', rows: [{ q: '', kind: 'text' }] }); }],
    ['+ Multiple choice', function () { addBlock({ type: 'qtable', rows: [{ q: '', kind: 'choice', options: ['', '', ''] }] }); }],
    ['+ True / False', function () { addBlock({ type: 'qtable', rows: [{ q: '', kind: 'choice', options: ['True', 'False'] }] }); }],
    ['+ Fill the blanks', function () { addBlock({ type: 'text', text: 'The [[ ]] does calculations.' }); }],
    ['+ Matching', function () { addBlock({ type: 'qtable', rows: [
      { q: 'Item 1', kind: 'choice', options: ['Answer A', 'Answer B', 'Answer C'] },
      { q: 'Item 2', kind: 'choice', options: ['Answer A', 'Answer B', 'Answer C'] },
      { q: 'Item 3', kind: 'choice', options: ['Answer A', 'Answer B', 'Answer C'] },
    ] }); }],
    ['+ Screenshot task', function () { addBlock({ type: 'qtable', rows: [{ q: '', kind: 'screenshot' }] }); }],
    ['+ Checklist', function () { addBlock({ type: 'checklist', items: [''] }); }],
    ['+ Heading', function () { addBlock({ type: 'heading', depth: 2, text: '' }); }],
    ['+ Note', function () { addBlock({ type: 'note', text: '' }); }],
    ['+ Image', function () { blocks.push({ type: 'image', alt: '', url: '' }); render(); markDirty(); pickImage(blocks.length - 1); }],
  ].forEach(function (o) { var x = el('button', 'btn-soft', o[0]); x.type = 'button'; x.addEventListener('click', o[1]); addBar.appendChild(x); });
  list.parentNode.insertBefore(addBar, list.nextSibling);

  // ── level focus, save, preview ────────────────────────────────────────────────────────────────
  Array.prototype.forEach.call(document.querySelectorAll('.ws-ed-lvl'), function (b) {
    b.addEventListener('click', function () {
      activeLevel = b.getAttribute('data-lvl');
      document.querySelectorAll('.ws-ed-lvl').forEach(function (x) { x.classList.toggle('on', x === b); });
      applyFilter();
    });
  });

  var saveBtn = document.getElementById('ws-ed-save');
  if (saveBtn) saveBtn.addEventListener('click', function () {
    setStatus('saving…');
    fetch('/resources/' + RES + '/edit-blocks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': CSRF }, body: JSON.stringify({ blocks: blocks }), credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) { dirty = false; setStatus('saved ✓ — now v' + d.version); })
      .catch(function () { setStatus('could not save — try again'); });
  });

  var pvBtn = document.getElementById('ws-ed-preview-toggle');
  if (pvBtn && preview) pvBtn.addEventListener('click', function () {
    if (!preview.hidden) { preview.hidden = true; pvBtn.classList.remove('on'); return; }
    preview.hidden = false; pvBtn.classList.add('on'); preview.textContent = 'Loading preview…';
    var lvl = activeLevel === 'all' ? undefined : activeLevel;
    fetch('/resources/' + RES + '/preview-blocks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': CSRF }, body: JSON.stringify({ blocks: blocks, level: lvl }), credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (html) { preview.innerHTML = html; })
      .catch(function () { preview.textContent = 'Preview unavailable.'; });
  });

  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  render();
})();
