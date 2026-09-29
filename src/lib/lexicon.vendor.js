/**
 * OSS 由来の辞書データ（vendored）と、その補足。
 *
 * ■ 原本（収録・改変なし）
 *   出典: MosasoM/inappropriate-words-ja
 *     https://github.com/MosasoM/inappropriate-words-ja
 *   ライセンス: MIT License, Copyright (c) 2020 K Hashimoto
 *   ファイル: Offensive.txt（攻撃的・差別的な表現リスト, 暫定版）
 *   原本の説明: 「単語それ自体が不適切だと断定できるもの」を人手で収集したもの。
 *   原本ファイルは vendor/inappropriate-words-ja/Offensive.txt に同梱。
 *
 * ■ 補足語（EXTRA）
 *   上記原本には含まれないが、日本語圏で広く差別・侮蔑に用いられる語。
 *   本体の作者が判断して追加したもので、MosasoM 由来ではない。
 *
 * ※ 重みは語の強さに応じて人手で調整している（原本の並びは保持）。
 * ※ 部分一致の誤検知対策は lexicon.js の EXCLUDE_AFTER を参照。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).lexiconVendor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // MosasoM Offensive.txt の語
  var OFFICIAL = [
    'いざり',
    'かたわ',
    'きちがい',
    'ぎっちょ',
    'つんぼ',
    'でべそ',
    'びっこ',
    'めくら',
    'アスペ',
    'アホ',
    'カス',
    'ガイジ',
    'キチガイ',
    'クソ',
    'クソくらえ',
    'クソアマ',
    'クソガキ',
    'クソゴミ',
    'ジジイ',
    'ステハゲ',
    'デブ',
    'ナマポ',
    'ネトウヨ',
    'ハゲ',
    'バカ',
    'バカヤロウ',
    'バカヤロー',
    'ババア',
    'パヨク',
    'ピネガキ',
    'ブス',
    'ボケ',
    'ポリ公',
    'マヌケ',
    '唖',
    '土方',
    '尻軽',
    '支那',
    '支那人',
    '池沼',
    '畜生',
    '白痴',
    '糖質',
    '糞くらえ',
    '糞食らえ',
    '統失',
    '豚野郎',
    '非国民',
    '馬鹿野郎'
  ];

  // 補足語（本拡張の作者による追加）
  var EXTRA = ['土人', 'チョン', 'シナ人', '日本鬼子', 'メンヘラ', '知恵遅れ', 'ブサイク'];

  // 語 -> 重み（未指定は 2.0）
  var WEIGHT = {
    いざり: 2.6, かたわ: 2.8, きちがい: 2.8, ぎっちょ: 2.4, つんぼ: 2.8, でべそ: 1.4, びっこ: 2.4,
    めくら: 2.8, アスペ: 2.2, アホ: 1.5, カス: 2.2, ガイジ: 2.6, キチガイ: 2.8, クソ: 2.0,
    クソくらえ: 2.6, クソアマ: 2.4, クソガキ: 2.4, クソゴミ: 2.6, ジジイ: 1.8, ステハゲ: 1.6,
    デブ: 1.8, ナマポ: 2.0, ネトウヨ: 2.2, ハゲ: 1.6, バカ: 1.6, バカヤロウ: 2.4, バカヤロー: 2.4,
    ババア: 1.8, パヨク: 2.2, ピネガキ: 2.2, ブス: 1.8, ボケ: 0.9, ポリ公: 2.0, マヌケ: 1.6,
    唖: 2.6, 土方: 1.4, 尻軽: 1.6, 支那: 2.2, 支那人: 2.8, 池沼: 2.6, 畜生: 1.6, 白痴: 2.6,
    糖質: 1.8, 糞くらえ: 2.6, 糞食らえ: 2.6, 統失: 2.2, 豚野郎: 2.6, 非国民: 2.4, 馬鹿野郎: 2.4,
    土人: 2.8, チョン: 2.8, シナ人: 2.8, 日本鬼子: 2.8, メンヘラ: 1.6, 知恵遅れ: 2.6, ブサイク: 1.8
  };

  function rows(words) {
    return words.map(function (w) {
      return [w, WEIGHT[w] || 2.0, 'profanity'];
    });
  }

  return rows(OFFICIAL).concat(rows(EXTRA));
});
