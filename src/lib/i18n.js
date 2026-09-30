/**
 * UI 文言の多言語化ヘルパー。
 * 拡張では chrome.i18n（_locales/*）を使い、無い環境（プレビュー等）では
 * 日本語のフォールバックを使う。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).i18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var FALLBACK = {
    extName: '義憤ミュート',
    title: '義憤ミュート',
    enabled: '有効',
    note: 'Xの投稿を端末内だけで判定します（外部送信なし）。しきい値以上でぼかし／非表示にします。あなたが穏やかな気持ちでいられますように。',
    threshold: 'しきい値',
    thresholdHint: '低いほど多く隠します（誤判定も増えます）。',
    mode: '隠し方',
    modeBlur: 'ぼかす（クリックで表示）',
    modeHide: '完全に隠す',
    showOverlay: '理由バッジを表示する',
    minLength: '最短文字数',
    language: '言語',
    languageAuto: '自動判定',
    categories: '検出カテゴリ',
    categoriesHint: '上の7つは「言い方の攻撃性」。下の「政治・陰謀論・AI論争・世界情勢・下品語（任意）」は話題そのものを隠します（既定OFF）。',
    optionalSuffix: '（任意）',
    tryScore: 'スコアを試す',
    samplePlaceholder: '投稿文をここに入力（例: 絶対に許せない。けしからん。）',
    focusMode: 'アート集中モード',
    focusModeHint: '攻撃的な投稿と、政治・陰謀論・AI論争・AI技術・世界情勢・災害・下品語をまとめて隠し、穏やかなタイムラインにします。OFFで元の設定に戻ります。',
    quiet: '通知を静かにする',
    hideNotifications: '通知バッジを隠す',
    hideDm: 'DMバッジを隠す',
    quietHint: 'X上のバッジを非表示にします（通知そのものは止まりません）。',
    statToday: 'きょう隠した数',
    statTotal: '累計',
    reset: '設定をリセット',
    maskedBadge: '義憤ミュート $1%',
    show: '表示',
    hide: '隠す',
    pause: '停止',
    resume: '再開',
    barLabel: '義憤ミュート: $1',
    cat_attack: '攻撃・侮蔑',
    cat_hostility: '憎悪・敵意',
    cat_incitement: '煽り・呼びかけ',
    cat_absolute: '断定・絶対化',
    cat_othering: '二項対立・レッテル',
    cat_cynicism: '冷笑・皮肉',
    cat_urgency: '危機煽り',
    cat_profanity: '差別・蔑称語',
    cat_badwords: '下品・罵倒語',
    cat_amplifier: '感情誇張',
    cat_politics: '政治',
    cat_conspiracy: '陰謀論',
    cat_ai_dispute: 'AI論争',
    cat_world_affairs: '世界情勢・戦争'
  };

  function t(key, subs) {
    var msg = null;
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
        msg = chrome.i18n.getMessage(key, subs);
      }
    } catch (e) {
      /* noop */
    }
    if (!msg) msg = FALLBACK[key];
    if (msg == null) return key;
    if (subs && subs.length) {
      for (var i = 0; i < subs.length; i++) {
        msg = msg.split('$' + (i + 1)).join(String(subs[i]));
      }
    }
    return msg;
  }

  /** data-i18n / data-i18n-placeholder を反映する。 */
  function apply(rootEl) {
    var scope = rootEl || (typeof document !== 'undefined' ? document : null);
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('lang', (chrome && chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : 'ja'));
    }
  }

  return { t: t, apply: apply, FALLBACK: FALLBACK };
});
