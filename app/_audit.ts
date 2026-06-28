// Sweep audit: scan EVERY converted bundle for lessons that teach an inherently-VISUAL concept but have
// no embedded image of it (the acute "read/recognise a diagram that isn't there" gap). Heuristic, ranked.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = 'seed-content/lessons';
// Concept words that normally REQUIRE a diagram to teach; if the lesson text uses one but the lesson has
// no/low images, it's a candidate acute gap.
const VISUAL = /\b(huffman tree|binary tree|logic gate|truth table|gate symbol|flow ?chart|topolog|circuit diagram|network diagram|trace table|place value|layer stack|osi model|tcp\/ip model|fetch[- ]decode|the symbol|read the (tree|graph|diagram|chart)|label the (diagram|stack|grid|parts)|draw the (gate|diagram|symbol|tree))\b/gi;
// Strong objective signals: "read a tree", "recognise the X gate", "label the …".
const OBJ_SIGNAL = /\bI can (read|recognise|label|draw|identify)\b.*\b(tree|graph|diagram|chart|symbol|gate|topolog|grid|flow|circuit|stack|layer|cycle|parts?)\b/i;

const dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== '_notes').map((d) => d.name);
const hits: Array<{ bundle: string; lesson: string; imgs: number; words: string; objHit: boolean }> = [];

for (const slug of dirs) {
  const dir = path.join(ROOT, slug);
  let manifest: any;
  try { manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); } catch { continue; }
  for (const l of manifest.lessons ?? []) {
    const imgs = (l.resources ?? []).filter((r: any) => r.kind === 'image');
    const text = (l.resources ?? [])
      .filter((r: any) => r.mimeType === 'text/markdown')
      .map((r: any) => { try { return fs.readFileSync(path.join(dir, r.file), 'utf8'); } catch { return ''; } })
      .join('\n') + '\n' + (l.objectives ?? '') + '\n' + (l.outline ?? '');
    const objHit = OBJ_SIGNAL.test(l.objectives ?? '');
    const found = [...new Set((text.match(VISUAL) ?? []).map((s) => s.toLowerCase()))];
    // Flag if a visual concept word appears AND the lesson has few images, OR an objective signal with 0 imgs.
    if ((found.length && imgs.length <= 1) || (objHit && imgs.length === 0)) {
      hits.push({ bundle: slug, lesson: l.title, imgs: imgs.length, words: found.join(', '), objHit });
    }
  }
}

hits.sort((a, b) => (a.imgs - b.imgs) || (Number(b.objHit) - Number(a.objHit)));
console.log(`Candidate acute-gap lessons: ${hits.length}\n`);
for (const h of hits) {
  console.log(`[imgs:${h.imgs}]${h.objHit ? ' OBJ!' : '     '} ${h.bundle}  ::  ${h.lesson}  ::  ${h.words}`);
}
