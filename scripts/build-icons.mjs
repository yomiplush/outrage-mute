/**
 * アイコンを生成する（外部依存なし）。
 * 赤い円 + 白い斜線 = ミュート記号。4倍スーパーサンプリングでアンチエイリアス。
 *
 *   node scripts/build-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function render(size) {
  const SS = 4;
  const W = size * SS;
  const acc = new Float64Array(size * size * 4);
  const cx = (W - 1) / 2;
  const cy = (W - 1) / 2;
  const r = W * 0.46;
  const accent = [228, 87, 46];
  const white = [255, 255, 255];
  const k = r * 0.74;
  const x1 = cx - k;
  const y1 = cy - k;
  const x2 = cx + k;
  const y2 = cy + k;
  const thick = W * 0.115;

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (Math.hypot(dx, dy) > r) continue;
      const color = distToSegment(x, y, x1, y1, x2, y2) <= thick / 2 ? white : accent;
      const ox = (x / SS) | 0;
      const oy = (y / SS) | 0;
      const oi = (oy * size + ox) * 4;
      acc[oi] += color[0];
      acc[oi + 1] += color[1];
      acc[oi + 2] += color[2];
      acc[oi + 3] += 255;
    }
  }

  const rgba = new Uint8Array(size * size * 4);
  const n = SS * SS;
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = Math.round(acc[i * 4] / n);
    rgba[i * 4 + 1] = Math.round(acc[i * 4 + 1] / n);
    rgba[i * 4 + 2] = Math.round(acc[i * 4 + 2] / n);
    rgba[i * 4 + 3] = Math.round(acc[i * 4 + 3] / n);
  }
  return rgba;
}

for (const size of [16, 32, 48, 128]) {
  const png = encodePNG(size, size, render(size));
  writeFileSync(join(outDir, `icon${size}.png`), png);
  console.log(`icons/icon${size}.png (${png.length} bytes)`);
}
