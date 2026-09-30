/**
 * 日本語パック（既定言語）。
 * 辞書本体は既存の lexicon.js（curated + MosasoM/ MIT + topics）を使う。
 * 否定は語尾（〜ない）、引用は「」、文型は日本語の正規表現。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../lexicon.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langJa = factory(JOF.lexicon);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (lexicon) {
  'use strict';

  return {
    id: 'ja',
    name: '日本語',
    match: 'substring',
    TERMS: lexicon.TERMS,
    BY_FIRST: lexicon.BY_FIRST,
    BY_WORD: new Map(),
    EXCLUDE_AFTER: lexicon.EXCLUDE_AFTER,
    patterns: lexicon.PATTERNS,
    negation: {
      position: 'after',
      unit: 'char',
      markers: [
        'ではありません',
        'じゃありません',
        'わけではない',
        'とは限らない',
        'なんかじゃない',
        'ではない',
        'じゃない',
        'では無い',
        'じゃねえ',
        'じゃねぇ',
        'なかった',
        'ませんでした',
        'ません',
        'ない',
        'ねえ',
        'ねぇ',
        'ぬ'
      ]
    },
    report: ['という', 'と言う', 'とか', 'らしい', 'みたい', 'って', 'との', 'だと', 'そうだ', 'だって'],
    quoteChars: { open: '「『“"', close: '」』”"' },
    emphasis: { caps: false }
  };
});
