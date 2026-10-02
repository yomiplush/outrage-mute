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
const i18n = require('../src/lib/i18n.js');

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

test('自虐(selfmock): 独立トグルで見る/隠すを選べる', () => {
  const CORE = categories.CATEGORY_ORDER.filter((id) => !config.OPTIONAL_CATEGORIES.includes(id));
  const NO_SELF = CORE.filter((id) => id !== 'selfmock');
  // 既定はON（今どおり隠す）
  assert.ok(!config.OPTIONAL_CATEGORIES.includes('selfmock'));
  for (const t of ['俺は本当にクズだな。何もできない。', 'どうせ俺なんて生きる価値ないし', 'もう消えたい。死にたい。']) {
    const r = analyze(t, { categories: CORE });
    assert.ok(r.score >= 0.5, `${t} -> ${r.score}`);
    assert.ok(r.categories.includes('selfmock'), `${t} selfmock`);
    // OFFにすると見える
    assert.ok(analyze(t, { categories: NO_SELF }).score < 0.5, `off: ${t}`);
  }
  // 他者への攻撃は selfmock OFF でも隠れる
  const other = analyze('お前は本当にクズだな。消えろ。', { categories: NO_SELF });
  assert.ok(other.score >= 0.5, `other=${other.score}`);
  assert.ok(!other.categories.includes('selfmock'));
  // 英語も（一人称＋否定）
  assert.ok(analyze("i hate myself, i'm worthless", { categories: CORE }).categories.includes('selfmock'));
  assert.ok(!analyze('i hate you, you are worthless', { categories: CORE }).categories.includes('selfmock'));
});

test('AI技術・界隈(ai_topic): 論争と分けて独立トグル', () => {
  const CORE = categories.CATEGORY_ORDER.filter((id) => !config.OPTIONAL_CATEGORIES.includes(id));
  const DISPUTE = CORE.concat('ai_dispute');
  const TOPIC = CORE.concat('ai_topic');
  const tech = 'LLMのプロンプト設計とファインチューニングを試した';
  const techEn = 'Fine-tuning ChatGPT with PyTorch and prompt engineering';
  const dispute = 'AI失業が心配だ。AI規制が必要。';
  const disputeEn = 'ai will replace all our jobs';

  assert.ok(config.OPTIONAL_CATEGORIES.includes('ai_topic'));
  // 技術話題は ai_topic で隠せる
  assert.ok(analyze(tech, { categories: TOPIC }).score >= 0.5);
  assert.ok(analyze(tech, { categories: TOPIC }).categories.includes('ai_topic'));
  assert.ok(analyze(techEn, { categories: TOPIC }).categories.includes('ai_topic'));
  // 技術話題は ai_dispute では隠れない
  assert.ok(analyze(tech, { categories: DISPUTE }).score < 0.5, 'tech via dispute');
  // 論争は ai_dispute で隠れる／ai_topic では隠れない
  assert.ok(analyze(dispute, { categories: DISPUTE }).score >= 0.5);
  assert.ok(analyze(dispute, { categories: DISPUTE }).categories.includes('ai_dispute'));
  assert.ok(analyze(disputeEn, { categories: DISPUTE }).categories.includes('ai_dispute'));
  assert.ok(analyze(disputeEn, { categories: TOPIC }).score < 0.5, 'dispute via topic');
  // 既定では両方とも見える
  assert.ok(analyze(tech, { categories: CORE }).score < 0.5);
});

test('アート集中モード/通知設定: 既定値・プリセット・正規化', () => {
  assert.equal(config.DEFAULTS.preset, 'off');
  assert.equal(config.DEFAULTS.hideNotifications, false);
  assert.equal(config.DEFAULTS.hideNotificationTab, false);
  assert.equal(config.DEFAULTS.hideDm, false);

  const s = config.normalizeSettings({ preset: 'hard', hideNotifications: 1, hideNotificationTab: true, hideDm: 'yes' });
  assert.equal(s.preset, 'hard');
  assert.equal(s.hideNotifications, false); // true のみ許可
  assert.equal(s.hideNotificationTab, true);
  assert.equal(s.hideDm, false);
  // 旧 focusMode:true は 'normal' として引き継ぐ／不正値は off
  assert.equal(config.normalizeSettings({ focusMode: true }).preset, 'normal');
  assert.equal(config.normalizeSettings({ preset: 'x' }).preset, 'off');

  // プリセットのカテゴリ構成
  const order = categories.CATEGORY_ORDER;
  const optional = config.OPTIONAL_CATEGORIES;
  const core = config.presetCategories('soft', order, optional);
  assert.ok(!core.includes('politics') && !core.includes('disaster'));
  const normal = config.presetCategories('normal', order, optional);
  assert.ok(normal.includes('politics') && !normal.includes('disaster'), 'normal keeps disaster');
  const hard = config.presetCategories('hard', order, optional);
  assert.ok(hard.includes('disaster'), 'hard hides disaster');
  assert.equal(config.presetCategories('off', order, optional), null);

  // しきい値
  assert.equal(config.presetThreshold('soft', 0.5), 0.6);
  assert.equal(config.presetThreshold('hard', 0.5), 0.4);
  assert.equal(config.presetThreshold('off', 0.5), 0.5);

  // ふつうプリセット: 政治は隠れ、災害は残る
  const war = 'ミサイル攻撃で多数の死傷者';
  const quake = '【緊急地震速報】震度5強の地震。避難指示。';
  assert.ok(analyze(war, { categories: normal }).score >= 0.5, 'normal hides war');
  assert.ok(analyze(quake, { categories: normal }).score < 0.5, 'normal keeps quake');
  assert.ok(analyze(quake, { categories: hard }).score >= 0.5, 'hard hides quake');
  assert.ok(analyze('首相が増税を決めた', { categories: core }).score < 0.5, 'soft keeps politics');
});

test('自分の投稿の除外: ハンドル解析と設定', () => {
  const sp = require('../src/lib/selfpost.js');
  assert.equal(sp.parseHandle('@yomiplush ・ 2時間'), 'yomiplush');
  assert.equal(sp.parseHandle('表示名 @My_Handle 123'), 'my_handle');
  assert.equal(sp.parseHandle('ハンドルなし'), null);
  assert.ok(sp.isOwn('yomiplush', '@YomiPlush · 2h'));
  assert.ok(!sp.isOwn('yomiplush', '@someone_else'));
  assert.ok(!sp.isOwn(null, '@anyone'));
  // 既定は除外する（true）
  assert.equal(config.DEFAULTS.excludeSelf, true);
  assert.equal(config.normalizeSettings({}).excludeSelf, true);
  assert.equal(config.normalizeSettings({ excludeSelf: false }).excludeSelf, false);
  // リプライは既定でフィルターする（excludeReplies は既定 false）
  assert.equal(config.DEFAULTS.excludeReplies, false);
  assert.equal(config.normalizeSettings({}).excludeReplies, false);
  assert.equal(config.normalizeSettings({ excludeReplies: true }).excludeReplies, true);
  assert.equal(config.normalizeSettings({ excludeReplies: 1 }).excludeReplies, false);
});

test('タッチ端末判定（iOS/Android はショートカット無効）', () => {
  const p = require('../src/lib/platform.js');
  assert.equal(p.isTouch('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', 5), true);
  assert.equal(p.isTouch('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 5), true);
  assert.equal(p.isTouch('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5), true);
  // iPadOS は Macintosh UA + 複数タッチで判定
  assert.equal(p.isTouch('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), true);
  // 通常のMac（タッチなし）は false
  assert.equal(p.isTouch('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0), false);
  // Windows はタッチ対応でもキーボード前提 → ショートカット有効
  assert.equal(p.isTouch('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 10), false);
  // モバイルビルド指定
  assert.equal(p.isTouch('Mozilla/5.0 (X11; Linux x86_64)', 0, true), true);
});

test('有効/無効トグル（ショートカット用）', () => {
  assert.equal(config.toggleEnabled({ enabled: true }).enabled, false);
  assert.equal(config.toggleEnabled({ enabled: false }).enabled, true);
  assert.equal(config.toggleEnabled({}).enabled, false); // 既定trueの反転
  // 他設定は保持される
  const s = config.toggleEnabled({ enabled: true, threshold: 0.7, userWords: ['x'] });
  assert.equal(s.threshold, 0.7);
  assert.deepEqual(s.userWords, ['x']);
  // i18n キーが存在する
  assert.ok(i18n.FALLBACK.enabledOn && i18n.FALLBACK.enabledOff);
  assert.ok(i18n.FALLBACK.toggledOn && i18n.FALLBACK.toggledOff);
});

test('全体OFFでも従属設定の値は保持される（通知バッジ/言語ミュートなど）', () => {
  // 全体OFFは「値のリセット」ではなく「無効化」。保存値はそのまま残す。
  const off = config.normalizeSettings({
    enabled: false,
    hideNotifications: true,
    hideNotificationTab: true,
    hideDm: true,
    muteLang: 'en',
    threshold: 0.7,
    preset: 'hard'
  });
  assert.equal(off.enabled, false);
  assert.equal(off.hideNotifications, true);
  assert.equal(off.hideNotificationTab, true);
  assert.equal(off.hideDm, true);
  assert.equal(off.muteLang, 'en');
  assert.equal(off.threshold, 0.7);
  assert.equal(off.preset, 'hard');

  // 再ONで同じ値が復帰する
  const on = config.toggleEnabled(off);
  assert.equal(on.enabled, true);
  assert.equal(on.hideNotifications, true);
  assert.equal(on.muteLang, 'en');
});

test('UI言語: 判定言語からロケールを引く', () => {
  // 'auto' は null（ブラウザ任せ）
  assert.equal(i18n.localeFor('auto'), null);
  assert.equal(i18n.localeFor('ja'), 'ja');
  assert.equal(i18n.localeFor('zh'), 'zh_CN');
  assert.equal(i18n.localeFor('zh_hant'), 'zh_TW');
  assert.equal(i18n.localeFor('de'), 'de');
  assert.equal(i18n.localeFor('latin'), null); // 統合パックはUI言語を持たない
});

test('NSFW: 独立トグル（badwords から性的語を分離）', () => {
  const CORE = categories.CATEGORY_ORDER.filter((id) => !config.OPTIONAL_CATEGORIES.includes(id));
  assert.ok(config.OPTIONAL_CATEGORIES.includes('nsfw'));
  // 既定（nsfw/badwords ともOFF）では表示
  assert.ok(analyze('nsfw porn video', { lang: 'en', categories: CORE }).score < 0.5);
  // nsfw ON で隠れる
  const on = analyze('nsfw porn video', { lang: 'en', categories: CORE.concat('nsfw') });
  assert.ok(on.score >= 0.5, `on=${on.score}`);
  assert.ok(on.categories.includes('nsfw'));
  // badwords 単独では性的語は隠れない（nsfw へ移し替え）
  assert.ok(analyze('nsfw porn video', { lang: 'en', categories: CORE.concat('badwords') }).score < 0.5);
  // 日本語
  const ja = analyze('全裸の写真', { categories: CORE.concat('nsfw') });
  assert.ok(ja.score >= 0.5, `ja=${ja.score}`);
  assert.ok(ja.categories.includes('nsfw'));
});

test('ユーザー辞書: 解析と照合', () => {
  const ud = require('../src/lib/userdict.js');
  assert.deepEqual(ud.parseList('a, b\nc\n\nb\n'), ['a', 'b', 'c']);
  assert.deepEqual(ud.parseList('案件、副業'), ['案件', '副業']);
  assert.equal(ud.find('今日は雨です', ['雨']), '雨');
  assert.equal(ud.find('Hello World', ['world']), 'world');
  assert.equal(ud.find('カスタム設定', ['カスタム']), 'カスタム');
  assert.equal(ud.find('全角ＡＢＣ', ['abc']), 'abc'); // NFKC で吸収
  assert.equal(ud.find('今日は晴れ', ['雨']), null);
  assert.equal(ud.find('なんでも', []), null);
  assert.equal(ud.find('https://example.com/nyan', ['nyan']), null); // URL は除外
  // 設定
  assert.equal(config.DEFAULTS.userWordsEnabled, true);
  assert.deepEqual(config.DEFAULTS.userWords, []);
  const s = config.normalizeSettings({ userWords: ['a', '', 1, 'b'], userWordsEnabled: false });
  assert.deepEqual(s.userWords, ['a', 'b']);
  assert.equal(s.userWordsEnabled, false);
});

test('集中モード: リプライ非表示の判定と設定', () => {
  const reply = require('../src/lib/reply.js');
  // 多言語の「返信先」を判定
  assert.ok(reply.isReplyText('Replying to @someone'));
  assert.ok(reply.isReplyText('返信先: @someone さん'));
  assert.ok(reply.isReplyText('Antwort an @wer'));
  assert.ok(reply.isReplyText('@user 님에게 답글'));
  assert.ok(reply.isReplyText('Ответ @user'));
  assert.ok(!reply.isReplyText('今日はいい天気だね'));
  assert.ok(!reply.isReplyText('Hello world, nice day'));
  // 設定
  assert.equal(config.DEFAULTS.focusHideReplies, true);
  assert.equal(config.effectiveReplyHide('off', true), false); // プリセットOFFなら無効
  assert.equal(config.effectiveReplyHide('normal', true), true);
  assert.equal(config.effectiveReplyHide('normal', false), false);
  assert.equal(config.normalizeSettings({ focusHideReplies: false }).focusHideReplies, false);
});

test('集中モードの長文ルール', () => {
  assert.equal(config.DEFAULTS.focusMaxLength, 160);
  assert.equal(config.effectiveMaxLength('off', 160), 0); // プリセットOFFなら無効
  assert.equal(config.effectiveMaxLength('normal', 160), 160);
  assert.equal(config.effectiveMaxLength('normal', 0), 0);
  assert.equal(config.normalizeSettings({ focusMaxLength: 9999 }).focusMaxLength, 1000);
  assert.equal(config.normalizeSettings({ focusMaxLength: -5 }).focusMaxLength, 0);
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

test('言語ミュート: 選んだ言語の投稿だけを隠す', () => {
  // 既定は無効
  assert.equal(config.DEFAULTS.muteLang, 'off');
  assert.equal(config.normalizeSettings({}).muteLang, 'off');
  assert.equal(config.normalizeSettings({ muteLang: 'ja' }).muteLang, 'ja');
  assert.equal(lang.isMutedLang('off', '今日はいい天気だね'), false);
  assert.equal(lang.isMutedLang('', '今日はいい天気だね'), false);
  assert.equal(lang.isMutedLang('nope', '今日はいい天気だね'), false);

  // 日本語だけを選ぶと日本語は隠れ、他言語は残る
  assert.equal(lang.isMutedLang('ja', '今日はいい天気だね'), true);
  assert.equal(lang.isMutedLang('ja', 'Hello, have a nice day'), false);
  assert.equal(lang.isMutedLang('ja', '오늘 날씨 좋네요'), false);
  assert.equal(lang.isMutedLang('ja', '今天天气不错'), false);
  assert.equal(lang.isMutedLang('ja', ''), false);

  // 簡体字と繁体字は別々に選べる
  assert.equal(lang.isMutedLang('zh', '今天天气不错'), true);
  assert.equal(lang.isMutedLang('zh', '今天天氣不錯'), false);
  assert.equal(lang.isMutedLang('zh_hant', '今天天氣不錯'), true);
  assert.equal(lang.isMutedLang('zh_hant', '今天天气不错'), false);

  // キリル文字: ロシア語 / ウクライナ語 / 統合
  assert.equal(lang.isMutedLang('ru', 'Сегодня хорошая погода'), true);
  assert.equal(lang.isMutedLang('ru', 'Сьогодні гарна погода'), false);
  assert.equal(lang.isMutedLang('uk', 'Сьогодні гарна погода'), true);
  assert.equal(lang.isMutedLang('cyrillic', 'Сьогодні гарна погода'), true);
  assert.equal(lang.isMutedLang('cyrillic', 'Сегодня хорошая погода'), true);
  assert.equal(lang.isMutedLang('ru', 'Hello, have a nice day'), false);

  // ラテン文字は話者言語を判別できないため「すべて」だけ
  assert.equal(lang.isMutedLang('latin', 'Hello, have a nice day'), true);
  assert.equal(lang.isMutedLang('latin', '今日はいい天気だね'), false);
  assert.equal(lang.isMutedLang('latin', 'Bonjour tout le monde'), true);
});

test('言語ミュートの選択肢と表示名', () => {
  const ids = lang.muteList().map((x) => x.id);
  for (const id of ['ja', 'ko', 'zh', 'zh_hant', 'th', 'he', 'el', 'hi', 'ar', 'ru', 'uk', 'cyrillic', 'latin']) {
    assert.ok(ids.includes(id), `mute option: ${id}`);
  }
  const names = new Map(lang.muteList().map((x) => [x.id, x.name]));
  assert.equal(names.get('ja'), '日本語');
  assert.equal(names.get('cyrillic'), 'Cyrillic (all)');
  assert.equal(lang.muteName('cyrillic'), 'Cyrillic (all)');
  assert.equal(lang.muteName('zzz'), 'zzz');
});
