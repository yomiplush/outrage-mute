/**
 * NSFW・性的表現の判定レイヤー（カテゴリ `nsfw`）。
 *
 * LDNOOBW の罵倒語(badwords)には性的な語が多く含まれる。それらを
 * `nsfw` として独立トグルで扱えるようにする:
 *   - nsfw 有効（＝隠す）  … 性的表現を隠す
 *   - nsfw 無効（既定）    … 表示
 * badwords の性的語は nsfw へ「移し替え」るため、
 *   badwords 単独ON → 性的語は非表示にならない（罵倒・差別のみ隠す）
 *   badwords+n s f w ON → 性的語は nsfw として隠れる（二重計上しない）
 * という切り分けになる。
 *
 * ロジックは term-layer.js に共通化してある。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./term-layer.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.nsfw = factory(JOF.termLayer);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (termLayer) {
  'use strict';

  var W = 2.2;

  var LANG_GROUPS = {
    ja: 'cjk', zh: 'cjk', zh_hant: 'cjk',
    ko: 'hangul',
    ru: 'cyrillic', uk: 'cyrillic', bg: 'cyrillic', sr: 'cyrillic',
    ar: 'arabic', fa: 'arabic', ur: 'arabic',
    en: 'latin', de: 'latin', fr: 'latin', es: 'latin', pt: 'latin', it: 'latin', nl: 'latin',
    pl: 'latin', cs: 'latin', sk: 'latin', hu: 'latin', fi: 'latin', sv: 'latin', da: 'latin',
    no: 'latin', tr: 'latin', fil: 'latin', id: 'latin', ms: 'latin', vi: 'latin', ro: 'latin',
    hr: 'latin', sl: 'latin', lt: 'latin', lv: 'latin', et: 'latin', ca: 'latin', sw: 'latin',
    latin: 'latin'
  };

  var TERMS = {
    cjk: [
      'エロ', 'えろ', 'エッチ', 'えっち', '下ネタ', 'ヌード', '全裸', '裸体',
      'おっぱい', '巨乳', '貧乳', 'セックス', '風俗', 'ソープ', '援助交際', 'パパ活',
      '出会い系', 'オナニー', 'おなにー', 'マンコ', 'ちんこ', 'ちんぽ', 'ペニス',
      'ヴァギナ', '性器', '射精', '中出し', '痴漢', '盗撮', 'わいせつ', '猥褻',
      'ポルノ', 'アダルト', '18禁', 'r18', '性行為',
      '色情', '情色', '性爱', '做爱', '自慰', '裸照', '露点', '淫秽', '黄片', '脱衣', '成人视频'
    ],
    hangul: [
      '야동', '야스', '섹스', '자위', '음란', '성인물', '노출', '야한', '포르노', '변태'
    ],
    cyrillic: [
      'порно', 'секс', 'эротика', 'голая', 'голый', 'интим', 'минет', 'оргазм',
      'онанизм', 'мастурбация', 'сексуальный'
    ],
    arabic: [
      'سكس', 'إباحي', 'عاري', 'جنس', 'شهواني', 'مثير'
    ],
    latin: [
      'sex', 'sexy', 'porn', 'porno', 'pornography', 'pornhub', 'xxx', 'nsfw', 'rule34', 'r34',
      'nude', 'nudes', 'naked', 'boobs', 'tits', 'pussy', 'dick', 'cock', 'cum', 'cumming',
      'orgasm', 'masturbation', 'masturbate', 'blowjob', 'handjob', 'anal', 'anus', 'bdsm',
      'hentai', 'ecchi', 'erotic', 'erotica', 'fetish', 'onlyfans', 'escort', 'hookup',
      'dildo', 'vibrator', 'nipple', 'nipples', 'clit', 'clitoris', 'sperm', 'semen',
      'penetration', 'intercourse', 'horny', 'kinky', 'hardcore', 'creampie', 'threesome',
      'milf', 'bbw'
    ]
  };

  var layer = termLayer.createTermLayer({
    category: 'nsfw',
    weight: W,
    langGroups: LANG_GROUPS,
    fallbackGroup: 'latin',
    groups: {
      cjk: { match: 'substring', terms: TERMS.cjk },
      hangul: { match: 'substring', terms: TERMS.hangul },
      cyrillic: { match: 'word', terms: TERMS.cyrillic },
      arabic: { match: 'word', terms: TERMS.arabic },
      latin: { match: 'word', terms: TERMS.latin }
    }
  });
  layer.WEIGHT = W;
  return layer;
});
