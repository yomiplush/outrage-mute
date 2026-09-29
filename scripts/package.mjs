/**
 * 配布用 ZIP と SHA256SUMS を生成する（外部依存なし）。
 *
 *   node scripts/package.mjs
 *   -> dist/outrage-mute-<version>.zip
 *   -> dist/SHA256SUMS
 *
 * ZIP 内は manifest.json がルート直下に来る構成（Chrome の
 * 「パッケージ化されていない拡張機能を読み込む」でそのまま使える）。
 */
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;

// ZIP に含めるもの（開発用ファイルは除外）
const INCLUDE_DIRS = ['src', 'icons', 'vendor'];
const INCLUDE_FILES = ['manifest.json', 'LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md'];

// ---------------------------------------------------------------- CRC32
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

// ---------------------------------------------------------------- collect
function walk(dir, out) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

function collect() {
  const files = INCLUDE_FILES.map((f) => join(root, f));
  for (const d of INCLUDE_DIRS) walk(join(root, d), files);
  return files
    .map((full) => ({ full, name: relative(root, full).split(/[\\/]/).join(posix.sep) }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

// ---------------------------------------------------------------- zip
// 決定論的ビルドのため、日時は固定（2026-01-01 00:00:00）
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const e of entries) {
    const data = readFileSync(e.full);
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const nameBuf = Buffer.from(e.name, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt32LE(0, 36);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

// ---------------------------------------------------------------- main
const entries = collect();
const zip = makeZip(entries);
const zipName = `outrage-mute-${version}.zip`;

mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, zipName), zip);

const sha = createHash('sha256').update(zip).digest('hex');
writeFileSync(join(distDir, 'SHA256SUMS'), `${sha}  ${zipName}\n`);

console.log(`${zipName} (${entries.length} files, ${zip.length} bytes)`);
console.log(`sha256 ${sha}`);
