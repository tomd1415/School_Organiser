// A small, dependency-free Markdown renderer for previewing generated resources in the browser.
// Covers the subset our prompts emit (and teachers write): headings, paragraphs, bold/italic/
// inline code, links, bullet + numbered lists, task checkboxes, tables, fenced code, blockquotes,
// horizontal rules. All text is escaped FIRST and tags are added by us — raw HTML in a document
// can never reach the page, which is exactly right for AI-generated content.
import { esc } from './html';

function inline(text: string): string {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<img class="md-img" src="$2" alt="$1">');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

const H = /^(#{1,4})\s+(.*)$/;
const UL = /^\s*[-*]\s+(.*)$/;
const OL = /^\s*\d+[.)]\s+(.*)$/;
const TASK = /^\[( |x|X)\]\s+(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEP = /^\s*\|?[\s:|-]+\|?\s*$/;
const QUOTE = /^>\s?(.*)$/;
const HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE = /^(?:```|~~~)/; // both code-fence styles, matching worksheetForm.segment()

function cells(row: string): string[] {
  return row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

export function renderMarkdown(src: string): string {
  const lines = (src ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i]!;

    if (FENCE.test(line)) {
      closeList();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i]!)) {
        buf.push(lines[i]!);
        i++;
      }
      i++; // closing fence
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]!)) {
      closeList();
      const head = cells(line).map((c) => `<th>${inline(c)}</th>`).join('');
      i += 2;
      const body: string[] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i]!)) {
        body.push(`<tr>${cells(lines[i]!).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
        i++;
      }
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${body.join('')}</tbody></table>`);
      continue;
    }

    const h = line.match(H);
    if (h) {
      closeList();
      const lvl = h[1]!.length;
      out.push(`<h${lvl}>${inline(h[2]!)}</h${lvl}>`);
      i++;
      continue;
    }

    if (HR.test(line)) {
      closeList();
      out.push('<hr>');
      i++;
      continue;
    }

    const q = line.match(QUOTE);
    if (q) {
      closeList();
      const buf = [q[1]!];
      i++;
      while (i < lines.length && QUOTE.test(lines[i]!)) {
        buf.push(lines[i]!.match(QUOTE)![1]!);
        i++;
      }
      out.push(`<blockquote>${buf.map((b) => `<p>${inline(b)}</p>`).join('')}</blockquote>`);
      continue;
    }

    const ul = line.match(UL);
    const ol = ul ? null : line.match(OL);
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      const item = (ul ? ul[1] : ol![1])!;
      const task = item.match(TASK);
      if (task) {
        out.push(`<li class="md-task"><input type="checkbox" disabled${task[1]!.toLowerCase() === 'x' ? ' checked' : ''}> ${inline(task[2]!)}</li>`);
      } else {
        out.push(`<li>${inline(item)}</li>`);
      }
      i++;
      continue;
    }

    if (line.trim() === '') {
      closeList();
      i++;
      continue;
    }

    // a line that is only emoji becomes the slide/page visual (large)
    const bare = line.trim();
    if (/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}#*0-9]{1,8}$/u.test(bare) && /\p{Extended_Pictographic}/u.test(bare)) {
      closeList();
      out.push(`<p class="md-visual">${esc(bare)}</p>`);
      i++;
      continue;
    }

    // paragraph: gather consecutive plain lines
    closeList();
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !H.test(lines[i]!) && !UL.test(lines[i]!) && !OL.test(lines[i]!) &&
      !FENCE.test(lines[i]!) && !HR.test(lines[i]!) && !QUOTE.test(lines[i]!) && !TABLE_ROW.test(lines[i]!)
    ) {
      buf.push(lines[i]!);
      i++;
    }
    out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
  }
  closeList();
  return out.join('\n');
}
