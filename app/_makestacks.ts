import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/img/gen';
mkdirSync(OUT, { recursive: true });

// CRC32 (PNG)
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function png(width: number, height: number, rgb: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter none
    for (let x = 0; x < width; x++) { const [r, g, b] = rgb(x, y); raw[p++] = r; raw[p++] = g; raw[p++] = b; }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit, truecolor
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Calm, distinct, muted band colours (top → bottom)
function makeStack(file: string, colours: [number, number, number][]) {
  const W = 760, gap = 14, bandH = 78, pad = 14;
  const n = colours.length;
  const H = pad * 2 + n * bandH + (n - 1) * gap;
  const buf = png(W, H, (x, y) => {
    const bg: [number, number, number] = [248, 249, 251];
    if (x < pad || x >= W - pad || y < pad || y >= H - pad) return bg;
    const rel = y - pad;
    const cell = bandH + gap;
    const idx = Math.floor(rel / cell);
    const within = rel - idx * cell;
    if (idx >= n) return bg;
    if (within >= bandH) return bg; // the gap between bands
    if (x < pad + 4 || x >= W - pad - 4 || within < 4 || within >= bandH - 4) return [90, 99, 110]; // border
    return colours[idx];
  });
  writeFileSync(`${OUT}/${file}`, buf);
  console.log('wrote', file, `${W}x${H}`);
}

// TCP/IP — 4 layers (top: Application … bottom: Link)
makeStack('tcpip-stack.png', [
  [201, 224, 241], // application — soft blue
  [205, 233, 214], // transport — soft green
  [247, 230, 199], // internet — soft amber
  [231, 214, 240], // link — soft lilac
]);

// OSI — 7 layers (top: Application … bottom: Physical)
makeStack('osi-stack.png', [
  [201, 224, 241],
  [205, 233, 214],
  [247, 230, 199],
  [231, 214, 240],
  [241, 214, 218],
  [214, 236, 238],
  [226, 226, 226],
]);
console.log('done');
