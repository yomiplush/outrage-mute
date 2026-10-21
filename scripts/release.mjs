/**
 * リリース（タグ付け + GitHub Release + 添付ファイル）をまとめて行う。
 *
 *   npm run release              # 事前チェックと実行内容の表示だけ（何も変更しない）
 *   npm run release -- --yes     # 実行（gh auth login 済みであること）
 *
 * オプション:
 *   --skip-check    npm run check を省略（速いが非推奨）
 *   --no-push       タグ/コミットを push しない（Release だけ作る）
 *
 * 前提:
 *   - manifest.json と package.json の version が同じで、そのタグが未作成
 *   - docs/releases/v<version>.md があり、先頭に
 *     `<!-- release-title: ... -->` で Release のタイトルが書かれている
 *   - `npm run package` 済み（dist/ に ZIP と SHA256SUMS、ルートにユーザースクリプト）
 *
 * 添付は既存リリースと同じ 4 点:
 *   outrage-mute-<version>.zip / outrage-mute.user.js /
 *   outrage-mute.tampermonkey.user.js / SHA256SUMS
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const yes = args.has('--yes');
const skipCheck = args.has('--skip-check');
const noPush = args.has('--no-push');

// 環境によっては GIT_CONFIG_COUNT だけ渡されて KEY が無いことがあり、git が
// 起動時に失敗する。その組み合わせだけ落として実行する。
const env = { ...process.env };
if (env.GIT_CONFIG_COUNT && !env.GIT_CONFIG_KEY_0) {
  delete env.GIT_CONFIG_COUNT;
  for (const key of Object.keys(env)) {
    if (/^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key)) delete env[key];
  }
}

const run = (cmd, cmdArgs, opts = {}) =>
  execFileSync(cmd, cmdArgs, { cwd: root, encoding: 'utf8', env, stdio: opts.capture ? 'pipe' : 'inherit', ...opts });

const capture = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { cwd: root, encoding: 'utf8', env }).trim();

function die(message) {
  console.error(`\nエラー: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- 前提の確認
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = manifest.version;
const tag = `v${version}`;

if (manifest.version !== pkg.version) die(`manifest.json (${manifest.version}) と package.json (${pkg.version}) の version が違う`);
if (manifest.manifest_version !== 3) die('manifest_version が 3 ではない');

const notesPath = join(root, 'docs', 'releases', `${tag}.md`);
if (!existsSync(notesPath)) die(`リリースノートが無い: docs/releases/${tag}.md`);
const notes = readFileSync(notesPath, 'utf8');
const titleLine = notes.match(/<!--\s*release-title:\s*(.+?)\s*-->/);
if (!titleLine) die(`docs/releases/${tag}.md の先頭に <!-- release-title: ... --> が無い`);
const title = titleLine[1];

const assets = [
  join('dist', `outrage-mute-${version}.zip`),
  join('dist', 'SHA256SUMS'),
  'outrage-mute.user.js',
  'outrage-mute.tampermonkey.user.js'
];
for (const asset of assets) {
  if (!existsSync(join(root, asset))) die(`添付ファイルが無い: ${asset}（npm run package を実行）`);
}

const dirty = capture('git', ['status', '--porcelain']);
if (yes && dirty) die('未コミットの変更がある。コミットしてから実行する');

let tagExists = false;
try {
  capture('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]);
  tagExists = true;
} catch (e) {
  tagExists = false;
}

console.log(`リリース内容\n`);
console.log(`  tag      : ${tag}${tagExists ? '（既に存在）' : ''}`);
console.log(`  title    : ${title}`);
console.log(`  notes    : docs/releases/${tag}.md`);
console.log(`  assets   : ${assets.join(', ')}`);
console.log(`  checks   : ${skipCheck ? 'スキップ' : 'npm run check'}`);
console.log('');

if (!yes) {
  console.log('このまま実行するには: npm run release -- --yes');
  process.exit(0);
}

// ---------------------------------------------------------------- 認証の確認
try {
  run('gh', ['auth', 'status'], { capture: true });
} catch (e) {
  console.error('\ngh が GitHub にログインしていません。先に次を実行してください:');
  console.error('  gh auth login -h github.com');
  process.exit(1);
}

// ---------------------------------------------------------------- 検証とビルド
if (!skipCheck) run('npm', ['run', 'check']);

// ---------------------------------------------------------------- タグと push
if (!tagExists) {
  run('git', ['tag', '-a', tag, '-m', title]);
  console.log(`tagged ${tag}`);
}
if (!noPush) {
  run('git', ['push', 'origin', 'HEAD']);
  if (!tagExists) run('git', ['push', 'origin', tag]);
}

// ---------------------------------------------------------------- Release
const createArgs = ['release', 'create', tag, '--title', title, '--notes-file', 'docs/releases/' + tag + '.md'];
createArgs.push(...assets.map((a) => join(root, a)));
run('gh', createArgs);

// ---------------------------------------------------------------- 確認
const view = JSON.parse(capture('gh', ['release', 'view', tag, '--json', 'assets,url']));
console.log(`\n${view.url}`);
for (const asset of view.assets) console.log(`  ${asset.name} (${asset.size} bytes)`);
