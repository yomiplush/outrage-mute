/**
 * 義憤スコアのテスト。
 *   node --test test/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { analyze } = require('../src/lib/scoring.js');
const lexicon = require('../src/lib/lexicon.js');
const config = require('../src/lib/config.js');

test('中立な文はスコアが低い', () => {
  assert.ok(analyze('今日はいい天気だね。散歩してくる。').score < 0.2);
  assert.ok(analyze('おはようございます。今日もよろしくお願いします。').score < 0.2);
  assert.ok(analyze('新しいカフェに行ってきた。ケーキが美味しかった。').score < 0.2);
});

test('罵倒・攻撃語は高スコア', () => {
  assert.ok(analyze('死ね').score > 0.7, '死ね');
  assert.ok(analyze('あいつは本当に無能だ').score > 0.5, '無能');
  assert.ok(analyze('このクズ野郎').score > 0.7, 'クズ野郎');
});

test('義憤の複合表現はしきい値を超える', () => {
  const r = analyze('政府は絶対に間違っている。けしからん。みんなで抗議しろ！！');
  assert.ok(r.score > 0.8, `score=${r.score}`);
  assert.ok(r.categories.includes('incitement'));
  assert.ok(r.categories.includes('hostility'));
});

test('否定語尾で減衰する（noNeg 語は除く）', () => {
  assert.ok(analyze('バカじゃないの？').score < 0.3);
  assert.ok(analyze('あの人は無能ではない。むしろ有能だ。').score < 0.5);
  // 「許さない」は noNeg なので減衰しない
  assert.ok(analyze('絶対に許さない').score > 0.6);
});

test('部分一致の誤検知を除外する', () => {
  assert.equal(analyze('カスタム設定が反映されない').score, 0);
  assert.equal(analyze('カスケードスタイルシート').score, 0);
  assert.equal(analyze('糖質制限ダイエット中です').score, 0);
  assert.equal(analyze('アスペクト比を直したい').score, 0);
  assert.equal(analyze('バカンスで海外に行く').score, 0);
  assert.equal(analyze('ハゲタカのえじき').score, 0);
});

test('引用・伝聞は減衰する', () => {
  const quoted = analyze('「死ね」と言われた。つらい。').score;
  const direct = analyze('死ね').score;
  assert.ok(quoted < direct, `quoted=${quoted} direct=${direct}`);
  assert.ok(quoted < config.DEFAULTS.threshold, `quoted=${quoted} は既定しきい値未満のはず`);
});

test('書式の誇張（!! や wwww）が加点される', () => {
  const plain = analyze('ありえない').score;
  const loud = analyze('ありえない！！！！').score;
  assert.ok(loud > plain, `plain=${plain} loud=${loud}`);
});

test('カテゴリフィルタが効く', () => {
  const all = analyze('死ね').score;
  const noAttack = analyze('死ね', { categories: ['hostility'] }).score;
  assert.ok(all > 0.7);
  assert.equal(noAttack, 0);
});

test('辞書の基本整合性', () => {
  assert.ok(lexicon.TERMS.length > 150, `terms=${lexicon.TERMS.length}`);
  const seen = new Set();
  for (const t of lexicon.TERMS) {
    assert.equal(seen.has(t.n), false, `duplicate: ${t.n}`);
    seen.add(t.n);
    assert.ok(lexicon.CATEGORY_LABELS[t.cat], `unknown category: ${t.cat}`);
  }
  // MosasoM 由来の語が取り込まれている
  assert.ok(seen.has(lexicon.normalizeTerm('キチガイ')));
  assert.ok(seen.has(lexicon.normalizeTerm('非国民')));
});

test('設定の正規化（範囲クランプ）', () => {
  const s = config.normalizeSettings({ threshold: 99, mode: 'x', minLength: -5 });
  assert.equal(s.threshold, 0.9);
  assert.equal(s.mode, 'blur');
  assert.equal(s.minLength, 0);
});
