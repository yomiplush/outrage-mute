/**
 * 言語レジストリ。
 * - 専用パック（ja/en/zh/ko/ru/uk）を登録
 * - LDNOOBW にあるその他の言語は、罵倒語(badwords)だけの汎用パックを自動登録
 * - 投稿ごとに言語を自動判定（detect）してパックを選ぶ
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./ja.js'),
      require('./en.js'),
      require('./zh.js'),
      require('./ko.js'),
      require('./ru.js'),
      require('./uk.js'),
      require('./build.js'),
      require('./data/ldnoobw.js')
    );
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.lang = factory(
      JOF.langJa,
      JOF.langEn,
      JOF.langZh,
      JOF.langKo,
      JOF.langRu,
      JOF.langUk,
      JOF.langBuild,
      JOF.ldnoobw
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ja, en, zh, ko, ru, uk, build, ldnoobw) {
  'use strict';

  var PACKS = {};
  [ja, en, zh, ko, ru, uk].forEach(function (p) {
    if (p && p.id) PACKS[p.id] = p;
  });

  var LANG_NAMES = {
    ar: 'العربية', cs: 'Čeština', da: 'Dansk', de: 'Deutsch', en: 'English',
    es: 'Español', fa: 'فارسی', fi: 'Suomi', fil: 'Filipino', fr: 'Français',
    hi: 'हिन्दी', hu: 'Magyar', it: 'Italiano', ja: '日本語', ko: '한국어',
    nl: 'Nederlands', no: 'Norsk', pl: 'Polski', pt: 'Português', ru: 'Русский',
    sv: 'Svenska', th: 'ไทย', tr: 'Türkçe', zh: '中文'
  };

  var SUBSTRING_LANGS = { zh: 1, ja: 1, ko: 1, th: 1 };
  var GENERIC_NEGATION = ['not', 'no', 'never', 'не', 'nicht', 'no', 'não', 'non', 'não'];

  // LDNOOBW にしか無い言語は、badwords だけの汎用パックにする
  Object.keys(ldnoobw || {}).forEach(function (code) {
    if (PACKS[code]) return;
    var words = ldnoobw[code] || [];
    if (!words.length) return;
    var match = SUBSTRING_LANGS[code] ? 'substring' : 'word';
    var terms = words.map(function (w) {
      return [w, 2.4, 'badwords'];
    });
    var lex = build.build(terms, { match: match });
    PACKS[code] = {
      id: code,
      name: LANG_NAMES[code] || code,
      match: match,
      generic: true,
      TERMS: lex.TERMS,
      BY_FIRST: lex.BY_FIRST,
      BY_WORD: lex.BY_WORD,
      EXCLUDE_AFTER: {},
      patterns: [],
      negation: match === 'word' ? { position: 'before', unit: 'token', markers: GENERIC_NEGATION } : { position: 'none' },
      report: [],
      quoteChars: { open: '「『“"', close: '」』”"' },
      emphasis: { caps: match === 'word' }
    };
  });

  var DEFAULT_LANG = 'ja';

  function detect(text) {
    var s = String(text == null ? '' : text);
    var n = Math.min(s.length, 2000);
    var hira = 0, kata = 0, han = 0, hangul = 0, cyr = 0, latin = 0, ukc = 0, thai = 0, arab = 0, devan = 0;
    for (var i = 0; i < n; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0x3040 && c <= 0x309f) hira++;
      else if (c >= 0x30a0 && c <= 0x30ff) kata++;
      else if (c >= 0x4e00 && c <= 0x9fff) han++;
      else if (c >= 0xac00 && c <= 0xd7a3) hangul++;
      else if (c >= 0x0400 && c <= 0x04ff) {
        cyr++;
        if ('іїєґІЇЄҐ'.indexOf(s.charAt(i)) >= 0) ukc++;
      } else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) latin++;
      else if (c >= 0x0e00 && c <= 0x0e7f) thai++;
      else if (c >= 0x0600 && c <= 0x06ff) arab++;
      else if (c >= 0x0900 && c <= 0x097f) devan++;
    }
    if (hangul > 0) return 'ko';
    if (hira + kata > 0) return 'ja';
    if (han > 0) return 'zh';
    if (thai > 0) return 'th';
    if (arab > 0) return 'ar';
    if (devan > 0) return 'hi';
    if (cyr > 0 && cyr >= latin) return ukc > 0 ? 'uk' : 'ru';
    if (latin > 0) return 'en';
    return null;
  }

  function resolve(requested, text) {
    if (requested && requested !== 'auto' && PACKS[requested]) return PACKS[requested];
    var d = detect(text);
    if (d && PACKS[d]) return PACKS[d];
    return PACKS[DEFAULT_LANG] || PACKS.en;
  }

  function get(id) {
    return PACKS[id] || null;
  }

  function list() {
    return Object.keys(PACKS)
      .map(function (id) {
        return { id: id, name: PACKS[id].name, generic: !!PACKS[id].generic };
      })
      .sort(function (a, b) {
        return a.id < b.id ? -1 : 1;
      });
  }

  return {
    PACKS: PACKS,
    DEFAULT_LANG: DEFAULT_LANG,
    detect: detect,
    resolve: resolve,
    get: get,
    list: list
  };
});
