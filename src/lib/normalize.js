/**
 * 日本語テキストの正規化と、書式（誇張）特徴の抽出。
 *
 * - normalize(): 判定に使う正規化済みテキストを作る（URL・メンション除去、NFKC、小文字化）
 * - formatFeatures(): 元テキストから「!」「?」「w」の連続などの誇張表現を数える
 *
 * ブラウザ（content script / popup）と Node（テスト）の両方で動くようにしてある。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).normalize = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var URL_RE = /https?:\/\/[^\s\u3000]+/gi;
  var BARE_WWW_RE = /www\.[^\s\u3000]+/gi;
  var MENTION_RE = /@[A-Za-z0-9_]{1,30}/g;
  var ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;

  /**
   * 判定用テキストへ正規化する。
   * URL やメンションを消してから NFKC（全角→半角、互換文字の統一）と小文字化を行う。
   */
  function normalize(text) {
    var s = String(text == null ? '' : text);
    s = s.replace(ZERO_WIDTH_RE, '');
    s = s.replace(URL_RE, ' ').replace(BARE_WWW_RE, ' ');
    s = s.replace(MENTION_RE, ' ');
    try {
      s = s.normalize('NFKC');
    } catch (e) {
      /* 古い環境では正規化なしで続行 */
    }
    s = s.toLowerCase();
    s = s.replace(/[\t\r\n\u2028\u2029]+/g, ' ');
    s = s.replace(/\u3000+/g, ' ');
    s = s.replace(/ {2,}/g, ' ');
    return s.trim();
  }

  /** 誇張の書式特徴を数える（元テキストに対して）。 */
  function formatFeatures(raw) {
    var s = String(raw == null ? '' : raw);
    var exclaim = (s.match(/[!！]/g) || []).length;
    var question = (s.match(/[?？]/g) || []).length;
    var exclaimRun = 0;
    var runs = s.match(/[!！]{2,}/g) || [];
    for (var i = 0; i < runs.length; i++) exclaimRun = Math.max(exclaimRun, runs[i].length);
    var wRun = 0;
    var wruns = s.match(/[wWｗＷ]+/g) || [];
    for (var j = 0; j < wruns.length; j++) wRun = Math.max(wRun, wruns[j].length);
    // 全大文字の語（英語圏の強調。3文字以上）
    var caps = 0;
    var words = s.match(/[A-Za-zА-Яа-яЁёЇїЄєІіҐґ]{3,}/g) || [];
    for (var k = 0; k < words.length; k++) {
      if (words[k] === words[k].toUpperCase() && /[A-Z]/.test(words[k])) caps++;
    }
    return { exclaim: exclaim, question: question, exclaimRun: exclaimRun, wRun: wRun, caps: caps };
  }

  return { normalize: normalize, formatFeatures: formatFeatures };
});
