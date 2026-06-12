// Markdown → .docx with zero dependencies, so pupils can open generated worksheets in Word and
// type their answers. A .docx is a ZIP of XML parts; we write STORED (uncompressed) entries with
// a hand-rolled CRC32, and a minimal WordprocessingML document covering what our resources use:
// headings, paragraphs, bold/italic, bullet + numbered lines, tables (the answer grids), task
// boxes, blockquotes and code. Word/LibreOffice open the result and pupils type into the cells.

// ── CRC32 + STORED zip ───────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'ascii');
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, e.data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // central directory header
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(e.data.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += 30 + name.length + e.data.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cdBuf, eocd]);
}

// ── WordprocessingML ─────────────────────────────────────────────────────────────────────────

function x(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Inline markdown → runs: **bold**, *italic*, `code`; everything else plain text. */
function runs(text: string, base = ''): string {
  const out: string[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g).filter((p) => p !== '');
  for (const p of parts) {
    let t = p;
    let pr = base;
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      t = p.slice(2, -2);
      pr += '<w:b/>';
    } else if (/^\*[^*\s][^*]*\*$/.test(p)) {
      t = p.slice(1, -1);
      pr += '<w:i/>';
    } else if (/^`[^`]+`$/.test(p)) {
      t = p.slice(1, -1);
      pr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
    }
    t = t.replace(/!?\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '$1'); // links/images → their text
    out.push(`<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${x(t)}</w:t></w:r>`);
  }
  return out.join('') || '<w:r><w:t xml:space="preserve"></w:t></w:r>';
}

function para(content: string, opts: { size?: number; bold?: boolean; indent?: boolean; bullet?: string } = {}): string {
  const rpr = `${opts.bold ? '<w:b/>' : ''}${opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : ''}`;
  const ppr = `${opts.indent ? '<w:ind w:left="425"/>' : ''}<w:spacing w:after="120"/>`;
  const lead = opts.bullet ? `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${x(opts.bullet)}</w:t></w:r>` : '';
  return `<w:p><w:pPr>${ppr}</w:pPr>${lead}${runs(content, rpr)}</w:p>`;
}

function tableXml(headCells: string[], rows: string[][]): string {
  const cols = Math.max(headCells.length, 1);
  const width = Math.floor(9360 / cols);
  const grid = `<w:tblGrid>${Array.from({ length: cols }, () => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>`;
  const cell = (c: string, bold = false): string =>
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="60"/></w:pPr>${runs(c, bold ? '<w:b/>' : '')}</w:p></w:tc>`;
  const head = `<w:tr>${headCells.map((c) => cell(c, true)).join('')}</w:tr>`;
  const body = rows.map((r) => `<w:tr>${Array.from({ length: cols }, (_, i) => cell(r[i] ?? '')).join('')}</w:tr>`).join('');
  const borders =
    '<w:tblBorders><w:top w:val="single" w:sz="6" w:color="999999"/><w:left w:val="single" w:sz="6" w:color="999999"/>' +
    '<w:bottom w:val="single" w:sz="6" w:color="999999"/><w:right w:val="single" w:sz="6" w:color="999999"/>' +
    '<w:insideH w:val="single" w:sz="6" w:color="999999"/><w:insideV w:val="single" w:sz="6" w:color="999999"/></w:tblBorders>';
  return `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/>${borders}</w:tblPr>${grid}${head}${body}</w:tbl><w:p/>`;
}

const MD_H = /^(#{1,4})\s+(.*)$/;
const MD_UL = /^\s*[-*]\s+(.*)$/;
const MD_OL = /^\s*(\d+)[.)]\s+(.*)$/;
const MD_TASK = /^\[( |x|X)\]\s+(.*)$/;
const MD_TROW = /^\s*\|(.+)\|\s*$/;
const MD_TSEP = /^\s*\|?[\s:|-]+\|?\s*$/;
const MD_QUOTE = /^>\s?(.*)$/;
const MD_HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

function cellsOf(row: string): string[] {
  return row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

export function markdownToDocx(md: string): Buffer {
  const sizes: Record<number, number> = { 1: 40, 2: 32, 3: 26, 4: 24 };
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const body: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      i++;
      const buf: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i]!)) {
        buf.push(lines[i]!);
        i++;
      }
      i++;
      for (const b of buf) body.push(`<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t xml:space="preserve">${x(b)}</w:t></w:r></w:p>`);
      continue;
    }
    if (MD_TROW.test(line) && i + 1 < lines.length && MD_TSEP.test(lines[i + 1]!)) {
      const head = cellsOf(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && MD_TROW.test(lines[i]!)) {
        rows.push(cellsOf(lines[i]!));
        i++;
      }
      body.push(tableXml(head, rows));
      continue;
    }
    const h = line.match(MD_H);
    if (h) {
      body.push(para(h[2]!, { bold: true, size: sizes[h[1]!.length] ?? 24 }));
      i++;
      continue;
    }
    if (MD_HR.test(line)) {
      body.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="999999"/></w:pBdr></w:pPr></w:p>');
      i++;
      continue;
    }
    const q = line.match(MD_QUOTE);
    if (q) {
      body.push(para(q[1]!, { indent: true }));
      i++;
      continue;
    }
    const ul = line.match(MD_UL);
    if (ul) {
      const task = ul[1]!.match(MD_TASK);
      if (task) body.push(para(task[2]!, { indent: true, bullet: task[1]!.toLowerCase() === 'x' ? '☑ ' : '☐ ' }));
      else body.push(para(ul[1]!, { indent: true, bullet: '• ' }));
      i++;
      continue;
    }
    const ol = line.match(MD_OL);
    if (ol) {
      body.push(para(ol[2]!, { indent: true, bullet: `${ol[1]!}. ` }));
      i++;
      continue;
    }
    body.push(para(line));
    i++;
  }

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
    body.join('') +
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>` +
    `</w:body></w:document>`;

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`;

  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;

  return zipStore([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(documentXml, 'utf8') },
  ]);
}
