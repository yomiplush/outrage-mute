/**
 * 自虐・自己卑下（self-mockery）の判定レイヤー（カテゴリ `selfmock`）。
 *
 * 自虐は「自分に向けた否定」なので、他人への攻撃語（バカ/クズ等）と
 * 同じ語でも文脈で意味が変わる。そこで:
 *   - 自己卑下そのものの言い回し（死にたい/自分なんて/どうせ俺/自虐 等）
 *   - 「一人称 + 否定語」の組み合わせ（俺はクズ / 私なんて無能）
 * を検出し、該当箇所を selfmock カテゴリへ移し替える。
 *
 * カテゴリを独立させてあるので、自虐ネタが好きな人は
 * ポップアップで selfmock をOFFにすれば見られる（＝他は隠したまま）。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.selfmock = factory(JOF.langBuild);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build) {
  'use strict';

  var W = 2.2;

  // 「自虐」そのものの言い回し（これだけで自虐と判定）
  var JA = [
    '死にたい', '消えたい', 'いなくなりたい', '生きる価値', '死んだほうが', '死んだ方が',
    '自分なんて', '私なんて', '僕なんて', '俺なんて', 'どうせ俺', 'どうせ私', 'どうせ自分',
    '自虐', '自己卑下', '自己嫌悪', '卑屈', 'ぼっち', '陰キャ', 'コミュ障', '底辺',
    '負け組', '社会不適合者', '人生終わった', '生まれてきてごめん', '何もできない',
    'クズでごめん', '価値がない', 'いてもいなくても', 'ハズレ人間'
  ];
  var EN = [
    'i hate myself', "i'm worthless", 'im worthless', "i'm a loser", 'im a loser',
    'i want to die', 'kill myself', 'self-loathing', 'self deprecating', "i'm useless",
    'im useless', 'nobody likes me', 'i deserve this'
  ];

  // 一人称・二人称（文脈判定用）
  var P1 = ['俺', 'おれ', '私', 'わたし', '僕', 'ぼく', '自分', 'わし', 'うち', 'あたし', '我'];
  var P2 = ['お前', 'おまえ', 'てめえ', 'てめぇ', 'あんた', '貴様', 'きさま', 'あなた', '君'];
  var EN_P1 = ['i', "i'm", 'im', 'me', 'my', 'myself', "i've", 'ive'];
  var EN_P2 = ['you', 'your', 'yours', "you're", 'youre'];

  var LATIN = ['en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'cs', 'sk', 'hu', 'fi', 'sv', 'da',
    'no', 'tr', 'fil', 'id', 'ms', 'vi', 'ro', 'hr', 'sl', 'lt', 'lv', 'et', 'ca', 'sw'];

  function groupOf(id) {
    if (id === 'ja') return 'ja';
    if (id === 'latin' || LATIN.indexOf(id) >= 0) return 'latin';
    return null;
  }

  var BUILT = {};
  function buildGroup(group) {
    if (group in BUILT) return BUILT[group];
    var rows = (group === 'ja' ? JA : EN).map(function (t) {
      return [t, W, 'selfmock'];
    });
    var match = group === 'ja' ? 'substring' : 'word';
    var lex = build.build(rows, { match: match });
    var set = new Set();
    lex.TERMS.forEach(function (e) {
      set.add(e.n);
    });
    BUILT[group] = { match: match, lex: lex, set: set };
    return BUILT[group];
  }

  /** 自己卑下そのものの語か */
  function isSelfTerm(normTerm, langId) {
    var g = groupOf(langId);
    return g ? buildGroup(g).set.has(normTerm) : false;
  }

  /**
   * 否定語の前後に人称があるとき、最も近いのが一人称なら自虐とみなす。
   * @param {number} start 一致開始
   * @param {number} end 一致終了
   */
  function isSelfContext(text, start, end, langId) {
    var g = groupOf(langId);
    if (g === 'ja') {
      var from = Math.max(0, start - 14);
      for (var i = start - 1; i >= from; i--) {
        for (var k = 0; k < P2.length; k++) {
          if (text.startsWith(P2[k], i)) return false;
        }
        for (var j = 0; j < P1.length; j++) {
          if (text.startsWith(P1[j], i)) return true;
        }
      }
      return false;
    }
    if (g === 'latin') {
      var before = build.tokenizeWords(text.slice(Math.max(0, start - 24), start));
      for (var b = before.length - 1; b >= 0 && b >= before.length - 3; b--) {
        if (EN_P2.indexOf(before[b]) >= 0) return false;
        if (EN_P1.indexOf(before[b]) >= 0) return true;
      }
      var after = build.tokenizeWords(text.slice(end, end + 24));
      for (var a = 0; a < after.length && a < 3; a++) {
        if (EN_P2.indexOf(after[a]) >= 0) return false;
        if (EN_P1.indexOf(after[a]) >= 0) return true;
      }
      return false;
    }
    return false;
  }

  var PACK_SET_CACHE = new WeakMap();
  function packTermSet(pack) {
    var s = PACK_SET_CACHE.get(pack);
    if (s) return s;
    s = new Set();
    (pack.TERMS || []).forEach(function (e) {
      s.add(e.n);
    });
    PACK_SET_CACHE.set(pack, s);
    return s;
  }

  var EXTRA_CACHE = new WeakMap();
  function extraIndex(pack) {
    var cached = EXTRA_CACHE.get(pack);
    if (cached) return cached;
    var g = groupOf(pack.id);
    var res = { match: null, index: null };
    if (g) {
      var built = buildGroup(g);
      var known = packTermSet(pack);
      var rows = built.lex.TERMS.filter(function (e) {
        return !known.has(e.n);
      }).map(function (e) {
        return [e.term, e.w, 'selfmock'];
      });
      res.match = built.match;
      res.index = rows.length ? build.build(rows, { match: built.match }) : null;
    }
    EXTRA_CACHE.set(pack, res);
    return res;
  }

  return {
    groupOf: groupOf,
    isSelfTerm: isSelfTerm,
    isSelfContext: isSelfContext,
    extraIndex: extraIndex,
    WEIGHT: W
  };
});
