/**
 * リプライ投稿の判定ヘルパー。
 *
 * X は「返信先」を示す行を多言語で描画する。ロケールに依存しないよう
 * 各言語の代表的な表記をまとめて判定する（純関数なのでテスト可能）。
 *
 * DOM からの「ヘッダ部分のテキスト」抽出は content.js 側で行い、
 * ここでは文字列だけを見る。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).reply = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 「〜への返信」を示す表現（主要ロケール）
  var REPLY_RE = new RegExp(
    [
      'Replying to',
      '返信先',
      'Antwort an',
      'En réponse à',
      'Respondiendo a',
      'In risposta a',
      'Respondendo a',
      'Antwoord aan',
      'Odpowiadanie do',
      'W odpowiedzi do',
      'Yanıtlanan',
      'الرد على',
      'ردًا على',
      'در پاسخ به',
      'जवाब',
      '回复',
      '回覆',
      '답글',
      'Ответ',
      'Відповідь',
      'ตอบกลับ',
      'Trả lời',
      'Membalas',
      'Bilang tugon',
      'Svar till',
      'Svar til',
      'Vastaus',
      'Odpověď',
      'Odpoveď',
      'Válasz',
      'Răspuns',
      'Απάντηση',
      'מגיב'
    ].join('|')
  );

  function isReplyText(text) {
    return REPLY_RE.test(String(text == null ? '' : text));
  }

  return { isReplyText: isReplyText, REPLY_RE: REPLY_RE };
});
