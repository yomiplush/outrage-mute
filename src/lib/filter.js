/**
 * 投稿の判定ルール。DOM や表示操作に依存せず、正規化済み設定を受け取る。
 * score() は UI のスコア確認にも使用する（投稿の除外ルールは適用しない）。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./config.js'), require('./categories.js'), require('./scoring.js'), require('./lang/index.js'), require('./userdict.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.filter = factory(JOF.config, JOF.categories, JOF.scoring, JOF.lang, JOF.userdict);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (config, categories, scoring, lang, userdict) {
  'use strict';

  function score(text, settings) {
    var selected = config.presetCategories(settings.preset, categories.CATEGORY_ORDER, config.OPTIONAL_CATEGORIES);
    if (!selected) {
      selected = Array.isArray(settings.categories) ? settings.categories : categories.CATEGORY_ORDER.filter(function (id) {
        return config.OPTIONAL_CATEGORIES.indexOf(id) < 0;
      });
    }
    var result = scoring.analyze(text, { lang: settings.language, categories: selected });
    return { result: result, muted: result.score >= config.presetThreshold(settings.preset, settings.threshold) };
  }

  function skip(state) {
    return { state: state, result: null, forceHide: false };
  }

  function matched(reason, details, forceHide) {
    return {
      state: 'masked',
      result: Object.assign({ score: 1, raw: 0, categories: [], byCat: {}, terms: [], reason: reason }, details),
      forceHide: forceHide === true
    };
  }

  /**
   * context.isOwn / isReply は必要になるまで呼ばない DOM メタデータの取得関数。
   * 言語ミュートを最優先にし、除外→短文→集中→辞書→スコアの順を維持する。
   */
  function evaluate(text, settings, context) {
    context = context || {};
    if (!settings.enabled) return skip('clear');
    if (lang && lang.isMutedLang(settings.muteLang, text)) {
      return matched('lang', { langName: lang.muteName(settings.muteLang) }, true);
    }
    if (settings.excludeSelf && context.isOwn && context.isOwn()) return skip('self');
    var replyChecked = false;
    var replyValue = false;
    function isReply() {
      if (!replyChecked) {
        replyValue = !!(context.isReply && context.isReply());
        replyChecked = true;
      }
      return replyValue;
    }
    if (settings.excludeReplies && isReply()) return skip('reply-skip');
    if (!text || text.length < (settings.minLength || 0)) return skip('short');
    var maxLength = config.effectiveMaxLength(settings.preset, settings.focusMaxLength);
    if (maxLength > 0 && text.length > maxLength) return matched('long', { length: text.length });
    if (config.effectiveReplyHide(settings.preset, settings.focusHideReplies) && isReply()) return matched('reply');
    if (settings.userWordsEnabled !== false && userdict && settings.userWords && settings.userWords.length) {
      var word = userdict.find(text, settings.userWords);
      if (word) return matched('user', { word: word });
    }
    var scored = score(text, settings);
    return scored.muted ? { state: 'masked', result: scored.result, forceHide: false } : skip('clear');
  }

  return { score: score, evaluate: evaluate };
});
