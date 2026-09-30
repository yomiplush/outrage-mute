/**
 * ユーザー辞書（自分のミュートワード）ヘルパー。
 *
 * - parseList(): テキストエリア等の入力（改行/カンマ/読点区切り）を整形・重複排除
 * - find():      投稿本文に含まれる最初のユーザー語を返す（正規化して部分一致）
 *
 * 正規化は本文と同じ normalize.js を使うので、全角/半角・大文字小文字の差を吸収でき、
 * URL やメンションは除外された状態で照合される。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./normalize.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.userdict = factory(JOF.normalize);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (normalize) {
  'use strict';

  var MAX_WORDS = 500;
  var MAX_LEN = 100;

  function normWord(w) {
    var s = String(w == null ? '' : w);
    try {
      s = s.normalize('NFKC');
    } catch (e) {
      /* noop */
    }
    return s.toLowerCase().trim();
  }

  /** 入力テキスト→語の配列（整形・重複排除・上限） */
  function parseList(text) {
    var out = [];
    var seen = new Set();
    String(text == null ? '' : text)
      .split(/[\n,、；;]+/)
      .forEach(function (raw) {
        var w = String(raw).trim();
        if (!w) return;
        if (w.length > MAX_LEN) w = w.slice(0, MAX_LEN);
        var n = normWord(w);
        if (!n || seen.has(n)) return;
        seen.add(n);
        out.push(w);
      });
    return out.slice(0, MAX_WORDS);
  }

  /** 投稿本文に含まれる最初のユーザー語を返す（無ければ null） */
  function find(rawText, words) {
    if (!words || !words.length) return null;
    var hay = normalize.normalize(rawText);
    if (!hay) return null;
    for (var i = 0; i < words.length; i++) {
      var n = normWord(words[i]);
      if (n && hay.indexOf(n) >= 0) return words[i];
    }
    return null;
  }

  return { parseList: parseList, find: find, normWord: normWord, MAX_WORDS: MAX_WORDS };
});
