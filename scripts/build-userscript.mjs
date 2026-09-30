/**
 * Safari / iOS の Userscripts 向けに、1ファイルの .user.js を生成する。
 *
 *   node scripts/build-userscript.mjs
 *   -> dist/outrage-mute-<version>.user.js
 *
 * 判定エンジン（src/lib/**）と content.js をそのまま同梱し、
 * chrome.* を localStorage に差し替えるシム（userscript/shim.js）と
 * 設定パネル（userscript/ui.js）を足す。読み込み順は manifest.json の
 * content_scripts を単一の情報源として使うので、拡張とズレない。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
mkdirSync(distDir, { recursive: true });

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const version = manifest.version;
const libFiles = manifest.content_scripts[0].js; // 拡張と同じ読み込み順

// 完全翻訳済みロケールを同梱（fetch できない環境向け）
const LOCALES = ['ja', 'en', 'zh_CN', 'zh_TW', 'ko', 'ru', 'uk'];
const locales = {};
for (const code of LOCALES) {
  const m = JSON.parse(readFileSync(join(root, '_locales', code, 'messages.json'), 'utf8'));
  const flat = {};
  for (const k of Object.keys(m)) {
    if (m[k] && m[k].message) flat[k] = m[k].message;
  }
  locales[code] = flat;
}

const css = readFileSync(join(root, 'src', 'content.css'), 'utf8');

const header = `// ==UserScript==
// @name         義憤ミュート (Outrage Mute)
// @name:en      Outrage Mute
// @namespace    https://github.com/yomiplush/outrage-mute
// @version      ${version}
// @description  X の投稿を義憤スコアで判定し、CSS でぼかし/非表示にします（ローカル完結・外部送信なし・多言語対応）
// @description:en  Score X posts for outrage and blur/hide them with CSS. Fully local (no external requests), multilingual.
// @author       yomiplush
// @homepageURL  https://github.com/yomiplush/outrage-mute
// @downloadURL  https://github.com/yomiplush/outrage-mute/releases/latest/download/outrage-mute.user.js
// @updateURL    https://github.com/yomiplush/outrage-mute/releases/latest/download/outrage-mute.user.js
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==
`;

const parts = [];
parts.push(header);
parts.push('/* ===== chrome.* shim (localStorage) ===== */');
parts.push(readFileSync(join(root, 'userscript', 'shim.js'), 'utf8'));
parts.push('/* ===== bundled locales / css ===== */');
parts.push('window.JOF = window.JOF || {};');
parts.push('window.JOF.locales = ' + JSON.stringify(locales) + ';');
parts.push('window.JOF.css = ' + JSON.stringify(css) + ';');

for (const f of libFiles) {
  parts.push('/* ===== ' + f + ' ===== */');
  parts.push(readFileSync(join(root, f), 'utf8'));
}

parts.push('/* ===== userscript/ui.js ===== */');
parts.push(readFileSync(join(root, 'userscript', 'ui.js'), 'utf8'));

const out = parts.join('\n\n') + '\n';
// 固定名にする（releases/latest/download/outrage-mute.user.js で自動更新できる）
const name = 'outrage-mute.user.js';
const outPath = join(distDir, name);
writeFileSync(outPath, out);
console.log(`dist/${name} (v${version}, ${libFiles.length} libs, ${out.length} bytes)`);

// SHA256SUMS に追記（ZIP 分は package.mjs が書いている）。古い同名行は置き換える。
const sumsPath = join(distDir, 'SHA256SUMS');
const hash = createHash('sha256').update(readFileSync(outPath)).digest('hex');
let lines = [];
if (existsSync(sumsPath)) {
  lines = readFileSync(sumsPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().endsWith(name));
}
lines.push(`${hash}  ${name}`);
writeFileSync(sumsPath, lines.join('\n') + '\n');
console.log(`sha256 ${hash}`);
