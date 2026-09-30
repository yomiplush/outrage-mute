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

  // 既定では無効で、ユーザーが明示的に有効化するトピック系カテゴリ
  // （政治・陰謀論・AI論争。好みが分かれるため opt-in）
  var OPTIONAL_CATEGORIES = [
    'politics',
    'conspiracy',
    'ai_dispute',
    'ai_topic',
    'world_affairs',
    'disaster',
    'nsfw',
    'badwords'
  ];

  var PRESET_KEYS = ['off', 'soft', 'normal', 'hard'];

  var DEFAULTS = {
    enabled: true,
    threshold: 0.5, // この値以上でミュート
    mode: 'blur', // 'blur' | 'hide'
    showOverlay: true,
    minLength: 0, // これ未満の短い投稿は判定しない
    language: 'auto', // 'auto' | 'ja' | 'en' | 'zh' | 'ko' | 'ru' | 'uk' | ...
    categories: null, // null = 既定のカテゴリ構成（OPTIONAL_CATEGORIES を除く全部）
    // 集中プリセット: 'off' | 'soft'（やさしめ） | 'normal'（ふつう） | 'hard'（きびしめ）
    preset: 'off',
    focusMaxLength: 160, // 集中モード時、これより長い投稿は隠す（0で無効）
    hideNotifications: false, // X上の通知バッジを隠す
    hideNotificationTab: false, // 通知タブ自体を隠す
    hideDm: false, // X上のDMバッジを隠す
    excludeSelf: true // 自分の投稿はフィルターから除外する
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
      language: typeof value.language === 'string' && value.language ? value.language : DEFAULTS.language,
      categories: Array.isArray(value.categories) ? value.categories.slice() : null,
      // 旧 focusMode(true) は 'normal' として引き継ぐ
      preset: PRESET_KEYS.indexOf(value.preset) >= 0 ? value.preset : value.focusMode === true ? 'normal' : DEFAULTS.preset,
      focusMaxLength: clampNumber(value.focusMaxLength, 0, 1000, DEFAULTS.focusMaxLength),
      hideNotifications: value.hideNotifications === true,
      hideNotificationTab: value.hideNotificationTab === true,
      hideDm: value.hideDm === true,
      excludeSelf: value.excludeSelf !== false
    };
    return out;
  }

  function clampNumber(v, lo, hi, fallback) {
    var n = Number(v);
    if (!isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }

  /**
   * 集中プリセットのカテゴリ構成。
   *   soft   … 義憤系のみ
   *   normal … ざわつく話題も隠すが disaster（災害情報）は残す
   *   hard   … 全部（災害も含む）
   *   off    … null（ユーザーの個別設定を使う）
   */
  function presetCategories(preset, order, optional) {
    var core = order.filter(function (id) {
      return optional.indexOf(id) < 0;
    });
    if (preset === 'soft') return core;
    if (preset === 'normal') {
      return order.filter(function (id) {
        return id !== 'disaster';
      });
    }
    if (preset === 'hard') return order.slice();
    return null;
  }

  function presetThreshold(preset, base) {
    if (preset === 'soft') return Math.max(base, 0.6);
    if (preset === 'hard') return Math.min(base, 0.4);
    return base;
  }

  /** 集中モード時に長文を隠す閾値（プリセットOFFなら0＝無効） */
  function effectiveMaxLength(preset, value) {
    if (!preset || preset === 'off') return 0;
    var n = Number(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  return {
    PERSIST_KEY: PERSIST_KEY,
    STATS_KEY: STATS_KEY,
    DEFAULTS: DEFAULTS,
    OPTIONAL_CATEGORIES: OPTIONAL_CATEGORIES,
    PRESET_KEYS: PRESET_KEYS,
    SCORE_VERSION: SCORE_VERSION,
    normalizeSettings: normalizeSettings,
    presetCategories: presetCategories,
    presetThreshold: presetThreshold,
    effectiveMaxLength: effectiveMaxLength
  };
});
