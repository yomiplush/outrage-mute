/**
 * Chrome Web Store 提出前チェック（外部依存なし）。
 *
 *   npm run lint:store
 *   node scripts/check-store.mjs
 *
 * 見ているもの:
 *   - マニフェスト: MV3 / 権限の最小性 / CSP / ページに公開する資産の有無
 *   - ソース: リモートコード（eval 等）・外部通信・storage.sync の痕跡
 *   - HTML: インラインスクリプト / インラインハンドラ / 外部読み込み
 *   - ロケール: __MSG_ の解決・文字数上限（name 75 / description 132）
 *   - アイコン: 宣言したサイズと PNG の実寸
 *   - 配布 ZIP: manifest がルート直下か・開発用ファイルが混ざっていないか
 *
 * エラーが 1 件でもあれば終了コード 1。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

const fail = (text) => errors.push(text);
const warn = (text) => warnings.push(text);

// ---------------------------------------------------------------- helpers
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function pngSize(path) {
  const buf = readFileSync(path);
  const signature = buf.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** 行ベースでコメントを落とす（判定用の簡易版）。 */
function codeLines(source) {
  const out = [];
  let block = false;
  for (const line of source.split('\n')) {
    let text = line;
    if (block) {
      const end = text.indexOf('*/');
      if (end < 0) continue;
      text = text.slice(end + 2);
      block = false;
    }
    let cleaned = '';
    let i = 0;
    while (i < text.length) {
      if (text.startsWith('/*', i)) {
        const end = text.indexOf('*/', i + 2);
        if (end < 0) {
          block = true;
          break;
        }
        i = end + 2;
        continue;
      }
      if (text.startsWith('//', i)) break;
      cleaned += text[i];
      i++;
    }
    out.push(cleaned);
  }
  return out;
}

function localeTable(code) {
  const path = join(root, '_locales', code, 'messages.json');
  if (!existsSync(path)) return null;
  const json = readJson(path);
  const out = {};
  for (const key of Object.keys(json)) {
    if (json[key] && typeof json[key].message === 'string') out[key] = json[key].message;
  }
  return out;
}

/** __MSG_key__ を（既定ロケールへフォールバックして）解決する。 */
function resolveMessage(value, table, fallback) {
  if (typeof value !== 'string') return '';
  return value.replace(/__MSG_([A-Za-z0-9_@]+)__/g, (_, key) => table[key] || fallback[key] || '');
}

// ---------------------------------------------------------------- manifest
const manifestPath = join(root, 'manifest.json');
const manifest = readJson(manifestPath);

if (manifest.manifest_version !== 3) fail('manifest_version が 3 ではない');
if (!manifest.default_locale) fail('default_locale が無い（多言語マニフェストに必須）');
if (!manifest.name || !manifest.description) fail('name / description が無い');

const defaultTable = localeTable(manifest.default_locale || 'en') || {};
if (!defaultTable.extName) fail(`_locales/${manifest.default_locale}/messages.json に extName が無い`);
if (!defaultTable.extDesc) fail(`_locales/${manifest.default_locale}/messages.json に extDesc が無い`);

// 権限は storage だけ（読み書きは chrome.storage.local のみ）
const ALLOWED_PERMISSIONS = new Set(['storage']);
const extraPermissions = (manifest.permissions || []).filter((p) => !ALLOWED_PERMISSIONS.has(p));
if (extraPermissions.length) fail(`想定外の permissions: ${extraPermissions.join(', ')}`);

for (const key of ['host_permissions', 'optional_host_permissions', 'optional_permissions']) {
  if (manifest[key] && manifest[key].length) fail(`${key} は使わない（${JSON.stringify(manifest[key])}）`);
}
if (manifest.web_accessible_resources) {
  fail('web_accessible_resources は使わない（ページに拡張資産を公開しない）');
}
if (manifest.externally_connectable) fail('externally_connectable は使わない');
if (manifest.browser_action || manifest.page_action) fail('MV2 の browser_action / page_action が残っている');
if (manifest.background && manifest.background.page) fail('MV2 の background.page が残っている');

const csp = manifest.content_security_policy && manifest.content_security_policy.extension_pages;
if (csp && /unsafe-eval|unsafe-inline/.test(csp)) fail(`CSP に unsafe-* が含まれる: ${csp}`);
if (manifest.content_security_policy && manifest.content_security_policy.sandbox) {
  warn('sandbox CSP を宣言している（不要なら削除）');
}

const HOSTS = new Set(['x.com', 'twitter.com']);
for (const cs of manifest.content_scripts || []) {
  for (const match of cs.matches || []) {
    if (!match.startsWith('https://')) fail(`content_scripts.matches が https ではない: ${match}`);
    const host = match.replace(/^https:\/\//, '').split('/')[0];
    if (!HOSTS.has(host)) fail(`content_scripts.matches に想定外のホスト: ${match}`);
  }
  if (cs.all_frames) warn('content_scripts.all_frames が true（iframe 内にも注入される）');
  if (!cs.js || !cs.js.length) fail('content_scripts.js が空');
  for (const file of [...(cs.js || []), ...(cs.css || [])]) {
    if (!existsSync(join(root, file))) fail(`content_scripts のファイルが無い: ${file}`);
  }
}

const worker = manifest.background && manifest.background.service_worker;
if (!worker) fail('background.service_worker が無い');
else if (!existsSync(join(root, worker))) fail(`service worker のファイルが無い: ${worker}`);
else if (manifest.background.type !== 'module') {
  const source = readFileSync(join(root, worker), 'utf8');
  for (const line of codeLines(source)) {
    const m = line.match(/importScripts\(([^)]*)\)/);
    if (!m) continue;
    if (/https?:/.test(m[1])) fail(`service worker がリモートスクリプトを読み込んでいる: ${m[1]}`);
    const files = m[1].match(/'([^']+)'/g) || [];
    for (const quoted of files) {
      const file = quoted.slice(1, -1);
      if (!existsSync(join(root, dirname(worker), file))) fail(`importScripts のファイルが無い: ${file}`);
    }
  }
}

if (!manifest.icons || !manifest.icons['128']) fail('icons.128 が無い（ストア掲載に必須）');
const iconPaths = new Map();
for (const source of [manifest.icons || {}, (manifest.action && manifest.action.default_icon) || {}]) {
  for (const [size, file] of Object.entries(source)) {
    iconPaths.set(file, Number(size));
  }
}
for (const [file, declared] of iconPaths) {
  const full = join(root, file);
  if (!existsSync(full)) {
    fail(`アイコンが無い: ${file}`);
    continue;
  }
  const size = pngSize(full);
  if (!size) fail(`アイコンが PNG ではない: ${file}`);
  else if (size.width !== declared || size.height !== declared) {
    fail(`アイコンの実寸が宣言と違う: ${file} (${size.width}x${size.height} != ${declared})`);
  }
}

// アクション（ポップアップ）
if (!manifest.action || !manifest.action.default_popup) warn('action.default_popup が無い');
else if (!existsSync(join(root, manifest.action.default_popup))) {
  fail(`default_popup のファイルが無い: ${manifest.action.default_popup}`);
}

// ---------------------------------------------------------------- ロケール
const locales = readdirSync(join(root, '_locales')).sort();
const NAME_MAX = 75;
const DESC_MAX = 132;
const untranslated = { extName: [], extDesc: [] };
for (const code of locales) {
  const table = localeTable(code);
  if (!table) {
    fail(`_locales/${code} に messages.json が無い`);
    continue;
  }
  // 未翻訳キーは既定ロケール（en）で表示されるので、警告にまとめる
  if (!table.extName) untranslated.extName.push(code);
  if (!table.extDesc) untranslated.extDesc.push(code);

  const name = resolveMessage(manifest.name, table, defaultTable);
  const desc = resolveMessage(manifest.description, table, defaultTable);
  if (!name) fail(`_locales/${code}: 表示名が空`);
  if (!desc) fail(`_locales/${code}: 説明が空`);
  if (name.length > NAME_MAX) fail(`_locales/${code}: 表示名が ${NAME_MAX} 文字を超える (${name.length})`);
  if (desc.length > DESC_MAX) fail(`_locales/${code}: 説明が ${DESC_MAX} 文字を超える (${desc.length})`);
}
for (const [key, codes] of Object.entries(untranslated)) {
  if (codes.length) {
    warn(`${key} が未翻訳: ${codes.length} ロケール（既定ロケールで表示される）: ${codes.join(', ')}`);
  }
}

// ---------------------------------------------------------------- ソース
const JS_FILES = [...walk(join(root, 'src')), ...(worker ? [join(root, worker)] : [])].filter((f) => f.endsWith('.js'));
const FETCH_ALLOWED = new Set([join(root, 'src', 'lib', 'i18n.js'), join(root, 'src', 'background.js')]);

const FORBIDDEN = [
  [/\beval\s*\(/, 'eval()'],
  [/\bnew\s+Function\s*\(/, 'new Function()'],
  [/document\.write\s*\(/, 'document.write()'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
  [/\bWebSocket\b/, 'WebSocket'],
  [/navigator\.sendBeacon/, 'navigator.sendBeacon'],
  [/chrome\.tabs\.(executeScript|insertCSS)/, 'chrome.tabs.executeScript（MV2）'],
  [/chrome\.scripting\./, 'chrome.scripting（権限追加が必要）'],
  [/chrome\.storage\.sync/, 'chrome.storage.sync（ローカル保存の方針に反する）'],
  [/fetch\s*\(\s*['"`]https?:/, 'リモート URL への fetch']
];

for (const full of JS_FILES) {
  const name = relative(root, full);
  const lines = codeLines(readFileSync(full, 'utf8'));
  lines.forEach((line, index) => {
    for (const [re, label] of FORBIDDEN) {
      if (re.test(line)) fail(`${name}:${index + 1}: ${label} を検出`);
    }
    if (line.includes('fetch(') && !FETCH_ALLOWED.has(full)) {
      warn(`${name}:${index + 1}: fetch() の利用（想定外なら確認）`);
    }
    if (/https?:\/\//.test(line)) warn(`${name}:${index + 1}: ソース内に URL リテラル`);
  });
}

const HTML_FILES = walk(join(root, 'src')).filter((f) => f.endsWith('.html'));
for (const full of HTML_FILES) {
  const name = relative(root, full);
  const html = readFileSync(full, 'utf8');
  const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>/i;
  if (inlineScript.test(html)) fail(`${name}: インライン <script> がある（CSP で動かない）`);
  const handler = /\son[a-z]+\s*=/i;
  if (handler.test(html)) fail(`${name}: インラインハンドラ（on*=）がある（CSP で動かない）`);
  const remote = /(?:src|href)\s*=\s*["']https?:/i;
  if (remote.test(html)) fail(`${name}: 外部リソースを読み込んでいる`);
  if (/<iframe/i.test(html)) warn(`${name}: <iframe> がある`);
}

// ---------------------------------------------------------------- プライバシー
const privacy = join(root, 'PRIVACY.md');
if (!existsSync(privacy)) {
  fail('PRIVACY.md が無い（ストアのプライバシーポリシー URL に必要）');
} else {
  const text = readFileSync(privacy, 'utf8');
  for (const phrase of ['storage.local', 'network', 'third']) {
    if (!text.toLowerCase().includes(phrase)) warn(`PRIVACY.md に "${phrase}" の記載が無い`);
  }
}

// ---------------------------------------------------------------- 配布 ZIP
const version = readJson(join(root, 'package.json')).version;
if (manifest.version !== version) {
  fail(`manifest.json (${manifest.version}) と package.json (${version}) のバージョンが違う`);
}
const zipPath = join(root, 'dist', `outrage-mute-${version}.zip`);
if (!existsSync(zipPath)) {
  warn(`配布 ZIP がまだ無い（npm run package で生成）: dist/outrage-mute-${version}.zip`);
} else {
  try {
    const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    if (!listing.includes('manifest.json')) fail('ZIP のルートに manifest.json が無い');
    const DEV = [/^test\//, /^scripts\//, /^docs\//, /^node_modules\//, /^dist\//, /^\.git/, /\.patch$/, /^outrage-mute.*\.js$/];
    for (const entry of listing) {
      if (DEV.some((re) => re.test(entry))) fail(`ZIP に開発用ファイルが混ざっている: ${entry}`);
    }
    const zippedManifest = JSON.parse(
      execFileSync('unzip', ['-p', zipPath, 'manifest.json'], { encoding: 'utf8' })
    );
    if (zippedManifest.version !== manifest.version) {
      fail('ZIP 内の manifest のバージョンが古い（npm run package をやり直す）');
    }
  } catch (e) {
    warn(`ZIP を検証できなかった（unzip が無い？）: ${e.message}`);
  }
}

// ---------------------------------------------------------------- 出力
const NAME = 'outrage-mute';
console.log(`${NAME} — Chrome Web Store 提出前チェック\n`);
console.log(`  manifest_version : ${manifest.manifest_version}`);
console.log(`  version          : ${manifest.version}`);
console.log(`  permissions      : ${JSON.stringify(manifest.permissions || [])}`);
console.log(`  host_permissions : ${JSON.stringify(manifest.host_permissions || [])}`);
console.log(`  web_accessible   : ${JSON.stringify(manifest.web_accessible_resources || [])}`);
console.log(`  content matches  : ${JSON.stringify((manifest.content_scripts || []).flatMap((c) => c.matches || []))}`);
console.log(`  locales          : ${locales.length}`);
console.log('');

if (warnings.length) {
  console.log(`警告 ${warnings.length} 件:`);
  for (const w of warnings) console.log(`  ! ${w}`);
  console.log('');
}
if (errors.length) {
  console.log(`エラー ${errors.length} 件:`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log('');
  process.exit(1);
}
console.log('エラーなし。ストア提出前の機械チェックは通過。');
