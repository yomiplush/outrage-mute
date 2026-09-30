/**
 * ユーザースクリプトを生成する（汎用 / Tampermonkey(Android) の2種）。
 *
 *   node scripts/build-userscript.mjs
 *   -> dist/outrage-mute.user.js                    （汎用・iOS Userscripts など）
 *   -> dist/outrage-mute.tampermonkey.user.js       （Tampermonkey / Android 向け）
 *   -> ./outrage-mute.user.js                       （raw インストール/自動更新用）
 *   -> ./outrage-mute.tampermonkey.user.js          （同上）
 *   -> dist/SHA256SUMS に追記
 *
 * 判定エンジン（src/lib/**）と content.js をそのまま同梱し、
 * chrome.* を localStorage に差し替えるシム（userscript/shim.js）と
 * 設定パネル（userscript/ui.js）を足す。読み込み順は manifest.json の
 * content_scripts を単一の情報源として使うので、拡張とズレない。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
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

const RAW = 'https://raw.githubusercontent.com/yomiplush/outrage-mute/main';
const ICON = `${RAW}/icons/icon128.png`;

const VARIANTS = [
  {
    file: 'outrage-mute.user.js',
    name: '義憤ミュート (Outrage Mute)',
    nameEn: 'Outrage Mute',
    namespace: 'https://github.com/yomiplush/outrage-mute',
    mobile: false,
    extra: []
  },
  {
    file: 'outrage-mute.tampermonkey.user.js',
    name: '義憤ミュート (Outrage Mute) - Tampermonkey/Android',
    nameEn: 'Outrage Mute (Tampermonkey/Android)',
    namespace: 'https://github.com/yomiplush/outrage-mute#tampermonkey',
    mobile: true,
    extra: ['// @antifeature none']
  }
];

function header(v) {
  const lines = [
    '// ==UserScript==',
    '// @name         ' + v.name,
    '// @name:en      ' + v.nameEn,
    '// @namespace    ' + v.namespace,
    '// @version      ' + version,
    '// @description  X の投稿を義憤スコアで判定し、CSS でぼかし/非表示にします（ローカル完結・外部送信なし・多言語対応）',
    '// @description:en  Score X posts for outrage and blur/hide them with CSS. Fully local (no external requests), multilingual.',
    '// @author       yomiplush',
    '// @homepageURL  https://github.com/yomiplush/outrage-mute',
    '// @supportURL   https://github.com/yomiplush/outrage-mute/issues',
    '// @icon         ' + ICON,
    '// @downloadURL  ' + RAW + '/' + v.file,
    '// @updateURL    ' + RAW + '/' + v.file,
    '// @match        https://x.com/*',
    '// @match        https://twitter.com/*',
    '// @run-at       document-idle',
    '// @grant        none',
    '// @noframes'
  ];
  return lines.concat(v.extra).join('\n') + '\n// ==/UserScript==\n';
}

function build(v) {
  const parts = [];
  parts.push(header(v));
  parts.push('/* ===== chrome.* shim (localStorage) ===== */');
  parts.push(readFileSync(join(root, 'userscript', 'shim.js'), 'utf8'));
  parts.push('/* ===== bundled locales / css ===== */');
  parts.push('window.JOF = window.JOF || {};');
  parts.push('window.JOF.locales = ' + JSON.stringify(locales) + ';');
  parts.push('window.JOF.css = ' + JSON.stringify(css) + ';');
  parts.push('window.JOF.mobile = ' + (v.mobile ? 'true' : 'false') + ';');
  for (const f of libFiles) {
    parts.push('/* ===== ' + f + ' ===== */');
    parts.push(readFileSync(join(root, f), 'utf8'));
  }
  parts.push('/* ===== userscript/ui.js ===== */');
  parts.push(readFileSync(join(root, 'userscript', 'ui.js'), 'utf8'));
  return parts.join('\n\n') + '\n';
}

const sumsPath = join(distDir, 'SHA256SUMS');
let lines = [];
if (existsSync(sumsPath)) {
  lines = readFileSync(sumsPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim());
}

for (const v of VARIANTS) {
  const out = build(v);
  // リリース用（dist）と raw インストール用（リポジトリ直下）の両方に書く
  const distPath = join(distDir, v.file);
  writeFileSync(distPath, out);
  writeFileSync(join(root, v.file), out);
  const hash = createHash('sha256').update(readFileSync(distPath)).digest('hex');
  lines = lines.filter((l) => !l.trim().endsWith(v.file));
  lines.push(`${hash}  ${v.file}`);
  console.log(`dist/${v.file}  (v${version}${v.mobile ? ', mobile' : ''}, ${out.length} bytes)  sha256 ${hash}`);
}
writeFileSync(sumsPath, lines.join('\n') + '\n');
