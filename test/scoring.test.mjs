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
const lang = require('../src/lib/lang/index.js');
const categories = require('../src/lib/categories.js');

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

test('トピック系（政治・陰謀論・AI論争・世界情勢）は有効化すると単独でしきい値を超える', () => {
  const cases = [
    ['首相が増税を決めた', 'politics'],
    ['ケミカルトレイルは本当だった', 'conspiracy'],
    ['AI規制が必要だ', 'ai_dispute'],
    ['ウクライナ侵攻が激化している', 'world_affairs'],
    ['大津波の被害が広がっている', 'world_affairs']
  ];
  for (const [text, cat] of cases) {
    const r = analyze(text, { categories: [cat] });
    assert.ok(r.score >= config.DEFAULTS.threshold, `${cat}: ${text} -> ${r.score}`);
    assert.ok(r.categories.includes(cat), `${cat} がカテゴリに含まれる`);
  }
});

test('トピック系は既定のカテゴリ構成で除外される', () => {
  const core = lexicon.CATEGORY_ORDER.filter((id) => !config.OPTIONAL_CATEGORIES.includes(id));
  assert.equal(analyze('首相が増税を決めた', { categories: core }).score, 0);
  assert.equal(analyze('ケミカルトレイルは本当だった', { categories: core }).score, 0);
  assert.equal(analyze('AI規制が必要だ', { categories: core }).score, 0);
  assert.equal(analyze('ウクライナ侵攻が激化している', { categories: core }).score, 0);
  // 有効化すれば効く
  assert.ok(analyze('首相が増税を決めた', { categories: core.concat('politics') }).score >= 0.5);
  assert.ok(
    analyze('ウクライナ侵攻が激化している', { categories: core.concat('world_affairs') }).score >= 0.5
  );
});

test('トピック系カテゴリが辞書に登録されている', () => {
  for (const id of ['politics', 'conspiracy', 'ai_dispute', 'world_affairs']) {
    assert.ok(lexicon.CATEGORY_LABELS[id], `label: ${id}`);
    assert.ok(lexicon.CATEGORY_ORDER.includes(id), `order: ${id}`);
    assert.ok(config.OPTIONAL_CATEGORIES.includes(id), `optional: ${id}`);
    assert.ok(
      lexicon.TERMS.some((t) => t.cat === id),
      `term: ${id}`
    );
  }
});

// ---------------------------------------------------------------- 多言語

test('言語パックが多数登録されている', () => {
  const list = lang.list();
  assert.ok(list.length >= 20, `packs=${list.length}`);
  for (const id of ['ja', 'en', 'zh', 'ko', 'ru', 'uk']) {
    assert.ok(lang.get(id), `pack: ${id}`);
  }
});

test('言語を自動判定できる', () => {
  assert.equal(lang.detect('今日はいい天気だね'), 'ja');
  assert.equal(lang.detect('Hello, have a nice day'), 'en');
  assert.equal(lang.detect('今天天气不错'), 'zh');
  assert.equal(lang.detect('오늘 날씨 좋네요'), 'ko');
  assert.equal(lang.detect('Сегодня хорошая погода'), 'ru');
  assert.equal(lang.detect('Сьогодні гарна погода'), 'uk');
});

test('英語: 義憤は高スコア・中立は低スコア', () => {
  assert.ok(analyze('Have a nice day!', { lang: 'en' }).score < 0.3);
  assert.ok(analyze('You are such an idiot. I hate you.', { lang: 'en' }).score > 0.7);
  assert.ok(analyze('Shut up and go to hell!', { lang: 'en' }).score > 0.7);
});

test('英語: 単語境界で誤検知しない（ass in class/grass/bass）', () => {
  assert.equal(analyze('The class has grass and bass', { lang: 'en' }).score, 0);
});

test('英語: 前置の否定で減衰する', () => {
  const neg = analyze('This is not stupid at all.', { lang: 'en' }).score;
  const affirm = analyze('This is stupid.', { lang: 'en' }).score;
  assert.ok(neg < affirm, `neg=${neg} affirm=${affirm}`);
});

test('多言語: それぞれの言語で義憤を検出する', () => {
  const cases = [
    ['zh', '你这个傻逼，滚出去！'],
    ['ko', '이 병신 같은 새끼, 꺼져!'],
    ['ru', 'Ты идиот, я ненавижу тебя!'],
    ['uk', 'Ти ідіот, я ненавиджу тебе!']
  ];
  for (const [l, text] of cases) {
    const r = analyze(text, { lang: l });
    assert.ok(r.score > 0.7, `${l}: ${text} -> ${r.score}`);
    assert.equal(r.lang, l);
  }
  assert.equal(analyze('今天天气不错', { lang: 'zh' }).score, 0);
  assert.equal(analyze('오늘 날씨 좋네요', { lang: 'ko' }).score, 0);
});

test('badwords: 下品語カテゴリは既定で除外され、有効化で効く', () => {
  const core = categories.CATEGORY_ORDER.filter((id) => !config.OPTIONAL_CATEGORIES.includes(id));
  assert.ok(config.OPTIONAL_CATEGORIES.includes('badwords'));
  const on = analyze('what the fuck', { lang: 'en', categories: core.concat('badwords') }).score;
  const off = analyze('what the fuck', { lang: 'en', categories: core }).score;
  assert.ok(on > 0.5, `on=${on}`);
  assert.equal(off, 0);
});

test('bangla: 言語パックは同じカテゴリ id を使う', () => {
  for (const id of categories.CATEGORY_ORDER) {
    assert.ok(categories.CATEGORY_LABELS[id], `label: ${id}`);
  }
});

test('中国語: 簡体字と繁体字を区別して判定する', () => {
  assert.equal(lang.detect('你这个傻逼'), 'zh');
  assert.equal(lang.detect('你這個傻逼'), 'zh_hant');
  assert.ok(lang.get('zh_hant'), 'zh_hant pack');

  const hans = analyze('你这个傻逼，滚出去！', {});
  const hant = analyze('你這個傻逼，滾出去！', {});
  assert.equal(hans.lang, 'zh');
  assert.equal(hant.lang, 'zh_hant');
  assert.ok(hans.score > 0.7 && hant.score > 0.7, `hans=${hans.score} hant=${hant.score}`);

  // 繁体字の話題系
  assert.ok(analyze('戰爭爆發，平民遭屠殺', {}).score > 0.7);
  assert.equal(analyze('戰爭爆發，平民遭屠殺', {}).lang, 'zh_hant');

  // 簡体字パックは繁体字表記に当たらない（別字体なので別辞書が必要）
  assert.equal(analyze('戰爭', { lang: 'zh' }).score, 0);
  assert.ok(analyze('戰爭', { lang: 'zh_hant' }).score > 0.5);
  assert.equal(analyze('战争', { lang: 'zh_hant' }).score, 0);
});
