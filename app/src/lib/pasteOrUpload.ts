// Phase 17.6 — ONE reusable paste-or-upload surface, used everywhere a file/image/text comes in (email
// intake, worksheet screenshots, marking evidence, the reference-lesson import). A single drop zone that
// accepts: a clipboard PASTE (text or image), a drag-drop, or a file-pick — with one consistent affordance.
// Pure `data → HTML`; the shared client script (PASTE_OR_UPLOAD_SCRIPT) enhances any `.paste-or-upload`
// (paste image → the file input via DataTransfer; drag highlight; paste text → an optional text target).
// Vendored-HTMX friendly, no new deps. URLs are passed in by the caller (the component is route-agnostic).
import { esc } from './esc';

export interface PasteOrUploadOptions {
  name?: string; // the file input's name (default 'file')
  accept?: string; // accept filter, e.g. 'image/*' or '.zip,.docx'
  multiple?: boolean;
  label?: string; // the call-to-action label
  hint?: string; // a sub-line of guidance
  textName?: string; // when set, pasted TEXT lands in a <textarea name=textName> instead of being ignored
  textPlaceholder?: string;
  id?: string; // optional element id (for multiple on one page)
}

/** Render the drop zone. Drop it inside a <form> (multipart for uploads) — it contributes the file input
 *  (and, when `textName` is set, a textarea). The shared script wires paste/drag onto it. */
export function renderPasteOrUpload(opts: PasteOrUploadOptions = {}): string {
  const name = opts.name ?? 'file';
  const label = opts.label ?? 'Paste, drop, or choose a file';
  const idAttr = opts.id ? ` id="${esc(opts.id)}"` : '';
  const textArea = opts.textName
    ? `<textarea class="pou-text" name="${esc(opts.textName)}" placeholder="${esc(opts.textPlaceholder ?? '…or paste text here')}"></textarea>`
    : '';
  return `<div class="paste-or-upload"${idAttr} tabindex="0" role="button" aria-label="${esc(label)} — paste, drag a file in, or click to choose">
    <div class="pou-cta">📋 ${esc(label)}</div>
    ${opts.hint ? `<div class="pou-hint muted">${esc(opts.hint)}</div>` : ''}
    <input class="pou-file" type="file" name="${esc(name)}"${opts.accept ? ` accept="${esc(opts.accept)}"` : ''}${opts.multiple ? ' multiple' : ''}>
    ${textArea}
    <div class="pou-status" aria-live="polite"></div>
  </div>`;
}

// Enhances every `.paste-or-upload` on the page: click → open the picker; drag-over → highlight; drop /
// paste of a file → assign it to the hidden file input via a DataTransfer (so the form submits it);
// paste of plain text → fill the optional textarea. One code path, one set of guards.
export const PASTE_OR_UPLOAD_SCRIPT = `
(function(){
  function nearestForm(el){ return el.closest ? el.closest('form') : null; }
  function setFiles(input, files){
    try { var dt = new DataTransfer(); for (var i=0;i<files.length;i++) dt.items.add(files[i]); input.files = dt.files; } catch(e){}
  }
  function status(zone, msg){ var s = zone.querySelector('.pou-status'); if(s) s.textContent = msg; }
  document.querySelectorAll('.paste-or-upload').forEach(function(zone){
    var input = zone.querySelector('.pou-file');
    var text  = zone.querySelector('.pou-text');
    zone.addEventListener('click', function(e){ if(e.target === zone || e.target.classList.contains('pou-cta')) input && input.click(); });
    zone.addEventListener('keydown', function(e){ if((e.key==='Enter'||e.key===' ') && (e.target===zone)){ e.preventDefault(); input && input.click(); } });
    if(input) input.addEventListener('change', function(){ if(input.files && input.files.length) status(zone, input.files.length + ' file(s) ready'); });
    zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('pou-over'); });
    zone.addEventListener('dragleave', function(){ zone.classList.remove('pou-over'); });
    zone.addEventListener('drop', function(e){
      e.preventDefault(); zone.classList.remove('pou-over');
      if(input && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length){ setFiles(input, e.dataTransfer.files); status(zone, e.dataTransfer.files.length + ' file(s) dropped'); }
    });
    zone.addEventListener('paste', function(e){
      var items = (e.clipboardData && e.clipboardData.items) || [];
      var files = [];
      for(var i=0;i<items.length;i++){ if(items[i].kind === 'file'){ var f = items[i].getAsFile(); if(f) files.push(f); } }
      if(files.length && input){ e.preventDefault(); setFiles(input, files); status(zone, 'pasted an image'); return; }
      if(text){ var t = e.clipboardData && e.clipboardData.getData('text'); if(t){ /* let it land in the textarea naturally */ status(zone, 'pasted text'); } }
    });
  });
})();
`;
