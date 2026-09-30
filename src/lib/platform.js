/**
 * 実行環境（タッチ端末かどうか）の判定。
 *
 * iOS / Android ではキーボードショートカットを無効にしてタッチ操作を優先する。
 * UA 依存の純関数にしてテスト可能にしてある。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).platform = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * @param {string} ua navigator.userAgent
   * @param {number} maxTouchPoints navigator.maxTouchPoints
   * @param {boolean} forceMobile ユーザースクリプトのモバイルビルド等
   */
  function isTouch(ua, maxTouchPoints, forceMobile) {
    var s = String(ua == null ? '' : ua);
    if (/Android|iPhone|iPad|iPod/i.test(s)) return true;
    // iPadOS は Macintosh UA + 複数タッチで判定
    if (/Macintosh/i.test(s) && Number(maxTouchPoints) > 1) return true;
    if (forceMobile === true) return true;
    return false;
  }

  function detect() {
    try {
      var mobile = !!(globalThis.JOF && globalThis.JOF.mobile);
      return isTouch(navigator.userAgent, navigator.maxTouchPoints, mobile);
    } catch (e) {
      return false;
    }
  }

  return { isTouch: isTouch, detect: detect };
});
