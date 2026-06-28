// Phase-0 sweep helper: crop a region out of a PNG (e.g. the diagram off a rasterised slide).
// Usage: npx tsx _crop.ts <in.png> <out.png> <x> <y> <w> <h>
import { createCanvas, loadImage } from '@napi-rs/canvas';
import * as fs from 'fs';

const [inP, outP, x, y, w, h] = process.argv.slice(2);
(async () => {
  const img = await loadImage(inP!);
  const cw = Number(w), ch = Number(h);
  const canvas = createCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, Number(x), Number(y), cw, ch, 0, 0, cw, ch);
  fs.writeFileSync(outP!, canvas.toBuffer('image/png'));
  console.log(`cropped → ${outP} (${cw}x${ch})`);
})();
