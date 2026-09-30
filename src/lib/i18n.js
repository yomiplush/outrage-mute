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
    focusModeHint: 'まとめて隠すプリセット。やさしめ=義憤系のみ(0.6)／ふつう=話題系も隠すが災害情報は残す(0.5)／きびしめ=災害も含め全部隠す(0.4)。「なし」で個別設定に戻ります。',
    presetOff: 'なし（個別設定）',
    presetSoft: 'やさしめ（誤爆少なめ）',
    presetNormal: 'ふつう（災害情報は残す）',
    presetHard: 'きびしめ（全部隠す）',
    quiet: '通知を静かにする',
    hideNotifications: '通知バッジを隠す',
    hideNotificationTab: '通知タブごと隠す',
    hideDm: 'DMバッジを隠す',
    quietHint: 'X上のバッジ／タブを非表示にします（通知そのものは止まりません）。',
    excludeSelf: '自分の投稿はフィルターから除外',
    remute: 'ミュート',
    remuteTitle: 'この投稿を再度ミュートする',
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
    cat_world_affairs: '世界情勢・戦争',
    cat_tone: '文体・口調',
    cat_selfmock: '自虐・自己卑下',
    cat_disaster: '災害・緊急情報',
    cat_ai_topic: 'AI技術・界隈',
    cat_nsfw: 'NSFW・性的表現',
    presetOff: 'なし（個別設定）',
    presetSoft: 'やさしめ（誤爆少なめ）',
    presetNormal: 'ふつう（災害情報は残す）',
    presetHard: 'きびしめ（全部隠す）',
    hideNotificationTab: '通知タブごと隠す',
    reasonLong: '長文を非表示',
    reasonReply: 'リプライを非表示',
    focusMaxLength: '集中モードで隠す長さ（文字）',
    focusMaxLengthHint: '集中モード中、これより長い投稿は隠します（0で無効）。',
    focusHideReplies: '集中モードでリプライも隠す'
  };

  var DEFAULT_LOCALE = 'en';

  // 判定言語 → UIロケール（_locales のディレクトリ名）
  var LOCALE = {
    ja: 'ja', en: 'en', zh: 'zh_CN', zh_hant: 'zh_TW', ko: 'ko', ru: 'ru', uk: 'uk',
    de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt', nl: 'nl', pl: 'pl', cs: 'cs', hu: 'hu',
    fi: 'fi', sv: 'sv', da: 'da', no: 'no', tr: 'tr', ar: 'ar', fa: 'fa', hi: 'hi', th: 'th',
    fil: 'fil', vi: 'vi', id: 'id', ms: 'ms', bn: 'bn', ur: 'ur', ta: 'ta', te: 'te', he: 'he',
    el: 'el', ro: 'ro', bg: 'bg', sr: 'sr', hr: 'hr', sk: 'sk', lt: 'lt', lv: 'lv', et: 'et',
    ca: 'ca', sw: 'sw', mk: 'mk', mn: 'mn', ne: 'ne', si: 'si'
  };

  var tables = {}; // locale -> {key: message}
  var loading = {};
  var uiLang = null; // ユーザーが選んだUIロケール（null=ブラウザに従う）

  /** 判定言語からUIロケールを求める（'auto'・統合パックは null＝ブラウザ任せ） */
  function localeFor(language) {
    if (!language || language === 'auto') return null;
    return LOCALE[language] || null;
  }

  function setUILanguage(locale) {
    uiLang = locale || null;
  }

  function getURL(path) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
      }
    } catch (e) {
      /* noop */
    }
    return null;
  }

  function fetchTable(locale) {
    if (Object.prototype.hasOwnProperty.call(tables, locale)) return Promise.resolve(tables[locale]);
    if (loading[locale]) return loading[locale];
    // 同梱ロケール（ユーザースクリプト等、fetch できない環境向け）
    var inline = null;
    try {
      if (typeof globalThis !== 'undefined' && globalThis.JOF && globalThis.JOF.locales) {
        inline = globalThis.JOF.locales[locale];
      }
    } catch (e) {
      /* noop */
    }
    if (inline) {
      var t0 = {};
      Object.keys(inline).forEach(function (k) {
        var v = inline[k];
        if (typeof v === 'string') t0[k] = v;
        else if (v && v.message) t0[k] = v.message;
      });
      tables[locale] = t0;
      return Promise.resolve(t0);
    }
    var url = getURL('_locales/' + locale + '/messages.json');
    if (!url || typeof fetch !== 'function') {
      tables[locale] = {};
      return Promise.resolve(tables[locale]);
    }
    loading[locale] = fetch(url)
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (json) {
        var out = {};
        if (json) {
          Object.keys(json).forEach(function (k) {
            if (json[k] && json[k].message) out[k] = json[k].message;
          });
        }
        tables[locale] = out;
        return out;
      })
      .catch(function () {
        tables[locale] = {};
        return {};
      });
    return loading[locale];
  }

  /** 選択言語にUIを追従させる。locale=null ならブラウザのロケールを使う。 */
  function load(locale) {
    uiLang = locale || null;
    if (!uiLang) return Promise.resolve();
    var jobs = [fetchTable(uiLang)];
    if (uiLang !== DEFAULT_LOCALE) jobs.push(fetchTable(DEFAULT_LOCALE));
    return Promise.all(jobs);
  }

  function t(key, subs) {
    var msg = null;
    if (uiLang) {
      // 選択言語 → 既定(en) の順で引く
      if (tables[uiLang] && tables[uiLang][key]) msg = tables[uiLang][key];
      if (!msg && tables[DEFAULT_LOCALE] && tables[DEFAULT_LOCALE][key]) msg = tables[DEFAULT_LOCALE][key];
    } else {
      // 'auto' はブラウザのロケール（chrome.i18n）
      try {
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
          msg = chrome.i18n.getMessage(key, subs);
        }
      } catch (e) {
        /* noop */
      }
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
      document.documentElement.setAttribute('lang', uiLang || (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : 'ja'));
    }
  }

  return { t: t, apply: apply, load: load, setUILanguage: setUILanguage, localeFor: localeFor, FALLBACK: FALLBACK };
});
