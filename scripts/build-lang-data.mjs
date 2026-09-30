/**
 * 多言語の罵倒語データを取り込む（LDNOOBW, CC-BY-4.0）。
 *
 *   node scripts/build-lang-data.mjs
 *
 * - vendor/ldnoobw/<lang>.txt に原本を保存（初回のみダウンロード）
 * - src/lib/lang/data/ldnoobw.js を生成（拡張に同梱する形）
 *
 * 依存なし。オフラインでも vendor に原本があれば生成できる。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(root, 'vendor', 'ldnoobw');
const dataDir = join(root, 'src', 'lib', 'lang', 'data');

const LANGS = [
  'ar', 'cs', 'da', 'de', 'en', 'es', 'fa', 'fi', 'fil', 'fr', 'hi', 'hu',
  'it', 'ja', 'ko', 'nl', 'no', 'pl', 'pt', 'ru', 'sv', 'th', 'tr', 'zh'
];
const BASE =
  'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/';

mkdirSync(vendorDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

async function ensureFile(name, dest) {
  if (existsSync(dest)) return readFileSync(dest, 'utf8');
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`fetch ${name}: ${res.status}`);
  const text = await res.text();
  writeFileSync(dest, text);
  return text;
}

// ライセンス全文も同梱（CC-BY-4.0）
await ensureFile('LICENSE', join(vendorDir, 'LICENSE'));

const data = {};
for (const lang of LANGS) {
  const raw = await ensureFile(lang, join(vendorDir, `${lang}.txt`));
  const terms = Array.from(
    new Set(
      raw
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('#'))
    )
  );
  data[lang] = terms;
  console.log(`${lang}: ${terms.length}`);
}

const header = `/**
 * 多言語の罵倒語リスト（vendored, 生成ファイル）。
 *
 * 出典: LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
 *   https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
 *   ライセンス: Creative Commons Attribution 4.0 International (CC-BY-4.0)
 *   原本: vendor/ldnoobw/ に同梱（LICENSE 含む）
 *
 * 生成: node scripts/build-lang-data.mjs   ※手で編集しないこと
 *
 * これらの語は「下品・罵倒語(badwords)」カテゴリ（既定OFF）として使われる。
 * 性的表現などを含むため、既定では無効にしてある。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).ldnoobw = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return ${JSON.stringify(data, null, 0)};
});
`;

writeFileSync(join(dataDir, 'ldnoobw.js'), header);
console.log(`\nsrc/lib/lang/data/ldnoobw.js (${LANGS.length} languages)`);
