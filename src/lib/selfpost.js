/**
 * 「自分の投稿」判定のユーティリティ。
 *
 * X の自分のハンドル（@name）と、投稿の投稿者ハンドルを比較する。
 * DOM 依存の処理は content.js 側に置き、ここは純関数だけにしてテスト可能にする。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).selfpost = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** テキストから最初の @handle を取り出す（小文字化）。無ければ null。 */
  function parseHandle(text) {
    var m = String(text == null ? '' : text).match(/@([A-Za-z0-9_]{1,15})/);
    return m ? m[1].toLowerCase() : null;
  }

  /** 自分のハンドルかどうか（大文字小文字は無視）。 */
  function isOwn(ownHandle, text) {
    if (!ownHandle) return false;
    var h = parseHandle(text);
    return !!h && h === String(ownHandle).toLowerCase();
  }

  return { parseHandle: parseHandle, isOwn: isOwn };
});
