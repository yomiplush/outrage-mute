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
    ['ミサイル攻撃で多数の死傷者', 'world_affairs']
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
  assert.equal(lang.detect('Hello, have a nice day'), 'latin');
  assert.equal(lang.detect('今天天气不错'), 'zh');
  assert.equal(lang.detect('오늘 날씨 좋네요'), 'ko');
  assert.equal(lang.detect('Сегодня хорошая погода'), 'cyrillic_ru');
  assert.equal(lang.detect('Сьогодні гарна погода'), 'cyrillic_uk');
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

test('完全対応: 主要言語（独仏西伊葡など）を統合パックで判定する', () => {
  const cases = [
    ['de', 'Du bist so ein Idiot, ich hasse dich!'],
    ['fr', 'Tu es un idiot, je te déteste!'],
    ['es', 'Eres un idiota, te odio!'],
    ['it', 'Sei un idiota, ti odio!'],
    ['pt', 'Você é um idiota, eu te odeio!'],
    ['nl', 'Je bent een idioot, ik haat je!'],
    ['tr', 'Sen bir aptalsın, senden nefret ediyorum!'],
    ['fil', 'Ang tanga mo, galit ako sa iyo!']
  ];
  for (const [code, text] of cases) {
    const auto = analyze(text, {});
    assert.equal(auto.lang, 'latin', `${code} auto`);
    assert.ok(auto.score > 0.55, `${code} auto=${auto.score}`);
    const fixed = analyze(text, { lang: code });
    assert.equal(fixed.lang, code, `${code} fixed`);
    assert.ok(fixed.score > 0.55, `${code} fixed=${fixed.score}`);
  }
  // 中立文は無反応
  assert.equal(analyze('Heute ist ein schöner Tag', {}).score, 0);
  assert.ok(analyze('Bonjour, comment allez-vous ?', {}).score < 0.15);
});

test('文字体系ベースで言語を判定する', () => {
  assert.equal(lang.detect('Guten Tag, wie geht es dir'), 'latin');
  assert.equal(lang.detect('Bonjour tout le monde'), 'latin');
  assert.equal(lang.detect('Я тебя ненавижу'), 'cyrillic_ru');
  assert.equal(lang.detect('Сьогодні гарно'), 'cyrillic_uk');
  assert.equal(lang.detect('مرحبا بالعالم'), 'ar');
  assert.equal(lang.detect('שלום עולם'), 'he');
  assert.equal(lang.detect('Γεια σου κόσμε'), 'el');
  assert.equal(lang.detect('नमस्ते दुनिया'), 'hi');
  assert.equal(lang.detect('নমস্কার'), 'bn');
  assert.equal(lang.detect('வணக்கம்'), 'ta');
  assert.equal(lang.detect('నమస్కారం'), 'te');
  assert.equal(lang.detect('สวัสดีชาวโลก'), 'th');
});

test('アラビア文字は arabic 統合パックで判定する', () => {
  const r = analyze('انت غبي، أكرهك!', {});
  assert.equal(r.lang, 'arabic');
  assert.ok(r.score > 0.5, `score=${r.score}`);
});

test('言語パック数と主要言語の存在', () => {
  assert.ok(lang.list().length >= 28, `packs=${lang.list().length}`);
  for (const id of ['de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'cs', 'hu', 'fi', 'sv', 'da', 'no', 'tr', 'ar', 'fa', 'hi', 'th', 'fil']) {
    assert.ok(lang.get(id), `pack: ${id}`);
    assert.ok(!lang.get(id).generic, `curated: ${id}`);
  }
});

test('文体・口調(tone): 語彙が無くても義憤を検出し、ポジティブは誤爆しない', () => {
  for (const t of ['は？ふざけんなよ！！', 'はぁ？何言ってんの？？', 'はいはい、そうですね（笑）', '😡😡😡 許さん']) {
    const r = analyze(t, {});
    assert.ok(r.score >= 0.5, `${t} -> ${r.score}`);
    assert.ok(r.categories.includes('tone'), `${t} tone`);
  }
  // ポジティブな叫び・感謝は誤爆しない
  assert.ok(analyze('すごい！！！！最高！！！！', {}).score < 0.5, 'positive shout');
  assert.ok(analyze('😊👍 ありがとう！', {}).score < 0.5, 'thanks');
  assert.equal(analyze('そうですね、承知しました。', {}).score, 0);
  // tone は既定ON（任意カテゴリではない）／OFFにすると効かない
  assert.ok(!config.OPTIONAL_CATEGORIES.includes('tone'));
  const core = categories.CATEGORY_ORDER.filter((id) => !config.OPTIONAL_CATEGORIES.includes(id) && id !== 'tone');
  assert.equal(analyze('😡😡😡', { categories: core }).score, 0);
  assert.ok(analyze('😡😡😡', {}).score > 0.5);
  assert.ok(categories.CATEGORY_LABELS.tone, 'tone label');
});

test('災害・緊急情報(disaster): 独立トグルで見る/隠すを選べる', () => {
  const CORE = categories.CATEGORY_ORDER.filter((id) => !config.OPTIONAL_CATEGORIES.includes(id));
  const WA = CORE.concat('world_affairs');
  const WA_D = WA.concat('disaster');
  const quake = '【緊急地震速報】震度5強の地震が発生しました。津波注意報。';
  const war = 'ミサイル攻撃で多数の死傷者。侵攻は激化。';

  // disaster は既定OFF（＝見る）
  assert.ok(config.OPTIONAL_CATEGORIES.includes('disaster'));
  assert.ok(analyze(quake, { categories: CORE }).score < config.DEFAULTS.threshold);
  // 世界情勢を隠しても災害情報は残る（要点）
  assert.ok(analyze(war, { categories: WA }).score >= config.DEFAULTS.threshold, 'war muted');
  assert.ok(analyze(quake, { categories: WA }).score < config.DEFAULTS.threshold, 'quake visible');
  // 災害トグルを入れると隠れる
  assert.ok(analyze(quake, { categories: WA_D }).score >= config.DEFAULTS.threshold, 'quake muted');
  // 災害語は disaster へ再分類される
  const r = analyze('大きい地震があった。余震に注意。', { categories: WA_D });
  assert.ok(r.categories.includes('disaster'), JSON.stringify(r.categories));
  assert.ok(!r.categories.includes('world_affairs'));
  // 英語の災害警報も
  assert.ok(
    analyze('Earthquake warning: tsunami advisory, evacuate immediately.', { categories: WA_D }).score >= 0.5
  );
});

test('追加言語（パックが無かったもの）を判定できる', () => {
  const cases = [
    ['vi', 'Mày là đồ ngu, tao ghét mày!'],
    ['id', 'Kamu bodoh, aku benci kamu!'],
    ['ms', 'Kau bodoh, aku benci kau!'],
    ['he', 'אתה מטומטם, אני שונא אותך!'],
    ['el', 'Είσαι ηλίθιος, σε μισώ!'],
    ['sw', 'Wewe ni mjinga, ninakuchukia!'],
    ['ne', 'तिमी मूर्ख छौ, म घृणा गर्छु!'],
    ['bn', 'তুমি বোকা, আমি ঘৃণা করি!']
  ];
  for (const [code, text] of cases) {
    const r = analyze(text, { lang: code });
    assert.equal(r.lang, code, `${code} lang`);
    assert.ok(r.score > 0.5, `${code}: ${r.score}`);
  }
  // 文字体系の判別（モンゴル語はキリル文字の中でも特有の字で判別）
  assert.equal(lang.detect('Чи тэнэг, би чамайг үзэн ядаж байна!'), 'mn');
  assert.equal(lang.detect('ඔබ මෝඩයෙක්'), 'si');
  assert.ok(lang.list().length >= 50, `packs=${lang.list().length}`);
});
