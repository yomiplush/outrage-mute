/**
 * 言語パックの共通ビルダー。
 *
 * 言語ごとに「照合方式」が異なる:
 *   - 'substring' : 日本語・中国語・韓国語・タイ語など（分かち書きしない）→ 最長一致の部分一致
 *   - 'word'      : 英語・ロシア語・ウクライナ語など（空白区切り）→ 単語境界でのフレーズ一致
 *
 * 索引を作り、scoring.js から使えるようにする。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.JOF = root.JOF || {}).langBuild = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var WORD_SRC = "[\\p{L}\\p{N}]+(?:['\u2019][\\p{L}]+)*";

  function normalizeTerm(t) {
    try {
      return String(t).normalize('NFKC').toLowerCase();
    } catch (e) {
      return String(t).toLowerCase();
    }
  }

  function tokenizeWords(s) {
    var re = new RegExp(WORD_SRC, 'gu');
    var out = [];
    var m;
    while ((m = re.exec(s)) !== null) out.push(m[0]);
    return out;
  }

  /** 位置付きトークン（word 照合で使う）。 */
  function tokenizeWithPositions(s) {
    var re = new RegExp(WORD_SRC, 'gu');
    var out = [];
    var m;
    while ((m = re.exec(s)) !== null) out.push({ w: m[0], start: m.index, end: m.index + m[0].length });
    return out;
  }

  /** [term, w, cat, flags, source] もしくは "term" を正規化エントリに変換。 */
  function toEntries(rawList, defaultCat, defaultWeight) {
    var out = [];
    (rawList || []).forEach(function (r) {
      var term, w, cat, flags, source;
      if (Array.isArray(r)) {
        term = r[0];
        w = Number(r[1]) || defaultWeight;
        cat = r[2] || defaultCat;
        flags = r[3] || '';
        source = r[4] || '';
      } else {
        term = r;
        w = defaultWeight;
        cat = defaultCat;
        flags = '';
        source = '';
      }
      if (!term) return;
      out.push({
        term: term,
        n: normalizeTerm(term),
        w: w,
        cat: cat,
        noNeg: String(flags).indexOf('noNeg') >= 0,
        source: source
      });
    });
    return out;
  }

  /**
   * パックの索引を構築する。
   * @param {Array} rawTerms [term, w, cat, flags?, source?] もしくは "term"
   * @param {{match?:string, defaultCategory?:string, defaultWeight?:number, exclusions?:object}} opts
   */
  function build(rawTerms, opts) {
    opts = opts || {};
    var match = opts.match === 'word' ? 'word' : 'substring';
    var map = new Map();
    toEntries(rawTerms, opts.defaultCategory || 'attack', opts.defaultWeight || 2.0).forEach(function (e) {
      if (!e.n) return;
      map.set(e.n, e); // 後勝ち（curated を最後に置く）
    });

    var TERMS = Array.from(map.values());
    if (match === 'word') {
      TERMS.forEach(function (e) {
        e.tokens = tokenizeWords(e.n);
      });
      TERMS = TERMS.filter(function (e) {
        return e.tokens.length > 0;
      });
      TERMS.sort(function (a, b) {
        return b.tokens.length - a.tokens.length || b.n.length - a.n.length;
      });
    } else {
      TERMS = TERMS.filter(function (e) {
        return e.n.length > 0;
      });
      TERMS.sort(function (a, b) {
        return b.n.length - a.n.length || (a.n < b.n ? -1 : 1);
      });
    }

    var BY_FIRST = new Map();
    var BY_WORD = new Map();
    TERMS.forEach(function (e) {
      if (match === 'word') {
        var key = e.tokens[0];
        if (!BY_WORD.has(key)) BY_WORD.set(key, []);
        BY_WORD.get(key).push(e);
      } else {
        var c = e.n.charAt(0);
        if (!BY_FIRST.has(c)) BY_FIRST.set(c, []);
        BY_FIRST.get(c).push(e);
      }
    });

    return {
      match: match,
      TERMS: TERMS,
      BY_FIRST: BY_FIRST,
      BY_WORD: BY_WORD,
      EXCLUDE_AFTER: opts.exclusions || {}
    };
  }

  return {
    build: build,
    toEntries: toEntries,
    normalizeTerm: normalizeTerm,
    tokenizeWords: tokenizeWords,
    tokenizeWithPositions: tokenizeWithPositions
  };
});
