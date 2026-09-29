/**
 * 拡張全体で共有する設定の既定値と保存キー。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).config = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PERSIST_KEY = 'jofSettings';
  var STATS_KEY = 'jofStats';

  var DEFAULTS = {
    enabled: true,
    threshold: 0.5, // この値以上でミュート
    mode: 'blur', // 'blur' | 'hide'
    showOverlay: true,
    minLength: 0, // これ未満の短い投稿は判定しない
    categories: null // null = 全カテゴリ有効。配列なら有効なカテゴリ id のみ
  };

  var SCORE_VERSION = '1.0.0';

  function normalizeSettings(value) {
    value = value || {};
    var out = {
      enabled: value.enabled !== false,
      threshold: clampNumber(value.threshold, 0.3, 0.9, DEFAULTS.threshold),
      mode: value.mode === 'hide' ? 'hide' : 'blur',
      showOverlay: value.showOverlay !== false,
      minLength: clampNumber(value.minLength, 0, 500, DEFAULTS.minLength),
      categories: Array.isArray(value.categories) ? value.categories.slice() : null
    };
    return out;
  }

  function clampNumber(v, lo, hi, fallback) {
    var n = Number(v);
    if (!isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }

  return {
    PERSIST_KEY: PERSIST_KEY,
    STATS_KEY: STATS_KEY,
    DEFAULTS: DEFAULTS,
    SCORE_VERSION: SCORE_VERSION,
    normalizeSettings: normalizeSettings
  };
});
