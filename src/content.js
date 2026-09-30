/**
 * content script: X の投稿を検出し、義憤スコアで CSS ミュートする（多言語対応）。
 *
 * 流れ:
 *   article[data-testid="tweet"] を検出
 *     -> 本文 + 引用本文を取り出す
 *     -> 言語を自動判定（または設定言語）してスコア算出
 *     -> しきい値以上ならセルにクラスを付け、ぼかし or 非表示
 *
 * すべてローカルで完結（外部通信なし）。
 */
(function () {
  'use strict';

  var JOF = globalThis.JOF;
  if (!JOF || !JOF.scoring || !JOF.config || !JOF.categories || !JOF.i18n) return;

  var scoring = JOF.scoring;
  var config = JOF.config;
  var cats = JOF.categories;
  var i18n = JOF.i18n;
  var selfpost = JOF.selfpost;
  var reply = JOF.reply;
  var userdict = JOF.userdict;

  var TWEET_SEL = 'article[data-testid="tweet"]';
  var CELL_SEL = '[data-testid="cellInnerDiv"]';

  var settings = Object.assign({}, config.DEFAULTS);
  var observer = null;
  var bar = null;
  var scanTimer = null;

  function catLabel(id) {
    return i18n.t('cat_' + id) || cats.CATEGORY_LABELS[id] || id;
  }

  /**
   * 有効カテゴリを解決する。
   * 設定が未指定(null)なら「トピック系(任意)を除く全部」を使う。
   */
  function coreCategories() {
    return cats.CATEGORY_ORDER.filter(function (id) {
      return config.OPTIONAL_CATEGORIES.indexOf(id) < 0;
    });
  }

  /**
   * 集中プリセット。
   *   soft(やさしめ)  … 義憤系のみ・しきい値0.6（誤爆少なめ）
   *   normal(ふつう)  … ざわつく話題も隠す・災害情報は残す・0.5
   *   hard(きびしめ)  … 災害も含め全部隠す・0.4
   *   off             … ユーザーの個別設定
   */
  function effectiveCategories() {
    var p = config.presetCategories(settings.preset, cats.CATEGORY_ORDER, config.OPTIONAL_CATEGORIES);
    if (p) return p;
    if (Array.isArray(settings.categories)) return settings.categories;
    return coreCategories();
  }

  function effectiveThreshold() {
    return config.presetThreshold(settings.preset, settings.threshold);
  }

  // ---------------------------------------------------------------- 静音（通知/DMバッジ）
  var QUIET_ROOT = '[data-testid="AppTabBar_Notifications_Link"],[data-testid="AppTabBar_DirectMessage_Link"],[data-testid="DMDrawer"]';

  function hideQuiet(el) {
    if (!el || el.dataset.jofQuiet === '1') return;
    el.dataset.jofQuiet = '1';
    el.style.setProperty('display', 'none', 'important');
  }

  function restoreQuiet() {
    var hidden = document.querySelectorAll('[data-jof-quiet]');
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].style.removeProperty('display');
      delete hidden[i].dataset.jofQuiet;
    }
  }

  function applyQuiet() {
    if (!settings.hideNotifications && !settings.hideDm && !settings.hideNotificationTab) {
      restoreQuiet();
      return;
    }
    // 通知タブごと隠す
    if (settings.hideNotificationTab) {
      var tabs = document.querySelectorAll('[data-testid="AppTabBar_Notifications_Link"]');
      for (var t = 0; t < tabs.length; t++) hideQuiet(tabs[t]);
    }
    if (!settings.hideNotifications && !settings.hideDm) return;
    var sel = [];
    if (settings.hideNotifications) {
      sel.push('[data-testid="AppTabBar_Notifications_Link"]', '[data-testid="DMDrawer"]');
    }
    if (settings.hideDm) {
      sel.push('[data-testid="AppTabBar_DirectMessage_Link"]', '[data-testid="DMDrawer"]');
    }
    var roots = document.querySelectorAll(sel.join(','));
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      // 数字だけのバッジ（未読件数）
      var all = root.querySelectorAll('div,span');
      for (var j = 0; j < all.length; j++) {
        var el = all[j];
        if (el.children.length === 0) {
          var t = (el.textContent || '').trim();
          if (/^[0-9]{1,3}\+?$/.test(t)) hideQuiet(el);
        }
      }
      // 「未読」を示す要素
      var labeled = root.querySelectorAll('[aria-label]');
      for (var k = 0; k < labeled.length; k++) {
        var al = labeled[k].getAttribute('aria-label') || '';
        if (/unread|new posts|new items|未読/i.test(al)) hideQuiet(labeled[k]);
      }
    }
  }

  // ---------------------------------------------------------------- settings
  function loadSettings() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get([config.PERSIST_KEY], function (res) {
          settings = config.normalizeSettings((res && res[config.PERSIST_KEY]) || {});
          resolve(settings);
        });
      } catch (e) {
        resolve(settings);
      }
    });
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || !changes[config.PERSIST_KEY]) return;
    var prevLang = settings.language;
    settings = config.normalizeSettings(changes[config.PERSIST_KEY].newValue || {});
    document.body.classList.toggle('jof-reveal-all', !settings.enabled);
    var go = function () {
      resetAll();
      if (bar) {
        bar.remove();
        bar = null;
      }
      scheduleScan();
      updateBar();
    };
    // 言語が変わったらUI文言も読み直す（オーバーレイ/バーの表示を更新）
    if (settings.language !== prevLang) i18n.load(i18n.localeFor(settings.language)).then(go);
    else go();
  });

  // ---------------------------------------------------------------- helpers
  function textOf(el) {
    var s = el.innerText || el.textContent || '';
    return s.replace(/\s+/g, ' ').trim();
  }

  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function getTweetContent(article) {
    var nodes = article.querySelectorAll('[data-testid="tweetText"]');
    if (!nodes.length) return null;
    var text = textOf(nodes[0]);
    var quote = '';
    for (var i = 1; i < nodes.length; i++) quote += ' ' + textOf(nodes[i]);
    return { text: text, quote: quote.trim() };
  }

  function cellOf(article) {
    return article.closest(CELL_SEL) || article;
  }

  // ---------------------------------------------------------------- masking
  function clearMask(cell) {
    cell.classList.remove('jof-masked', 'jof-blur', 'jof-gone', 'jof-relative');
    var ov = cell.querySelector(':scope > .jof-overlay');
    if (ov) ov.remove();
    var rb = cell.querySelector(':scope > .jof-remute');
    if (rb) rb.remove();
  }

  /** 表示した投稿の右上に「再度ミュート」ボタンを付ける */
  function addRemuteButton(cell, result) {
    if (settings.mode === 'hide') return; // 完全非表示は個別に戻せない
    if (cell.querySelector(':scope > .jof-remute')) return;
    cell.classList.add('jof-relative');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'jof-remute';
    b.textContent = i18n.t('remute');
    b.title = i18n.t('remuteTitle');
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      b.remove();
      cell.classList.remove('jof-relative');
      mask(cell, result);
    });
    cell.appendChild(b);
  }

  // ---- 自分のハンドル検出（自分の投稿は除外できるように）----
  var ownHandle = null;
  function detectOwnHandle() {
    if (ownHandle) return ownHandle;
    if (!selfpost) return null;
    var btn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (btn) ownHandle = selfpost.parseHandle(btn.textContent || '');
    if (!ownHandle) {
      var a = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
      var href = a ? a.getAttribute('href') || '' : '';
      var m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (m) ownHandle = m[1].toLowerCase();
    }
    return ownHandle;
  }

  function isOwnArticle(article) {
    if (!settings.excludeSelf) return false;
    var own = detectOwnHandle();
    if (!own) return false;
    var un = article.querySelector('[data-testid="User-Name"]');
    return !!(un && selfpost.isOwn(own, un.textContent));
  }

  // ---- リプライ判定（集中モードでリプライを隠すのに使う）----
  // 「返信先」行は多言語なので、ヘッダ部分（本文を除く）のテキストで判定する
  function replyHeadText(article) {
    var un = article.querySelector('[data-testid="User-Name"]');
    if (!un) return '';
    var tt = article.querySelector('[data-testid="tweetText"]');
    var el = un;
    while (el.parentElement && el.parentElement !== article && (!tt || !el.parentElement.contains(tt))) {
      el = el.parentElement;
    }
    var container = el.parentElement && el.parentElement !== article ? el.parentElement : el;
    var full = container.textContent || '';
    if (tt) {
      var t = tt.textContent || '';
      if (t) {
        var idx = full.indexOf(t);
        if (idx > 0) full = full.slice(0, idx);
      }
    }
    return full.slice(0, 300);
  }

  function isReplyArticle(article) {
    return !!(reply && reply.isReplyText(replyHeadText(article)));
  }

  function mask(cell, result) {
    cell.classList.add('jof-masked');
    cell.dataset.jofState = 'masked';
    if (settings.mode === 'hide') {
      cell.classList.add('jof-gone');
    } else {
      cell.classList.add('jof-blur');
      if (settings.showOverlay !== false) cell.appendChild(buildOverlay(result, cell));
    }
    updateBar();
    report(result);
  }

  function buildOverlay(result, cell) {
    var el = document.createElement('div');
    el.className = 'jof-overlay';

    var badge = document.createElement('div');
    badge.className = 'jof-badge';
    badge.textContent =
      result && result.reason === 'long'
        ? i18n.t('reasonLong', [result.length])
        : result && result.reason === 'reply'
          ? i18n.t('reasonReply')
          : result && result.reason === 'user'
            ? i18n.t('reasonUser', [result.word || ''])
            : i18n.t('maskedBadge', [Math.round((result.score || 0) * 100)]);

    var catEl = document.createElement('div');
    catEl.className = 'jof-cats';
    var names = (result && result.categories ? result.categories : [])
      .slice(0, 3)
      .map(function (c) {
        return catLabel(c);
      });
    catEl.textContent = result && result.reason ? '' : names.length ? names.join(' / ') : '';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jof-show-btn';
    btn.textContent = i18n.t('show');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearMask(cell);
      cell.dataset.jofState = 'shown';
      addRemuteButton(cell, result);
      updateBar();
    });

    el.append(badge, catEl, btn);
    return el;
  }

  // ---------------------------------------------------------------- evaluate
  function evaluateArticle(article) {
    var cell = cellOf(article);
    var tw = getTweetContent(article);
    if (!tw) return;

    var sig = hash(tw.text + '\u0000' + tw.quote);
    var state = cell.dataset.jofState || '';

    if (cell.dataset.jofSig === sig && state) {
      if (
        state === 'masked' &&
        settings.mode !== 'hide' &&
        settings.showOverlay !== false &&
        !cell.querySelector(':scope > .jof-overlay')
      ) {
        try {
          cell.appendChild(buildOverlay(JSON.parse(cell.dataset.jofResult || '{}'), cell));
        } catch (e) {
          /* noop */
        }
      }
      return;
    }

    clearMask(cell);
    cell.dataset.jofSig = sig;

    if (!settings.enabled) {
      cell.dataset.jofState = 'off';
      return;
    }

    // 自分の投稿は除外（トグル）
    if (isOwnArticle(article)) {
      cell.dataset.jofState = 'self';
      return;
    }

    var combined = tw.quote ? tw.text + '\n' + tw.quote : tw.text;
    if (!combined || combined.length < (settings.minLength || 0)) {
      cell.dataset.jofState = 'short';
      return;
    }

    // 集中モードでは長文を避ける（アート中心のタイムラインに）
    var maxLen = config.effectiveMaxLength(settings.preset, settings.focusMaxLength);
    if (maxLen > 0 && combined.length > maxLen) {
      var longResult = {
        score: 1,
        raw: 0,
        categories: [],
        byCat: {},
        terms: [],
        reason: 'long',
        length: combined.length
      };
      cell.dataset.jofResult = JSON.stringify(longResult);
      cell.dataset.jofScore = '1';
      mask(cell, longResult);
      return;
    }

    // 集中モードではリプライ投稿も避ける
    if (config.effectiveReplyHide(settings.preset, settings.focusHideReplies) && isReplyArticle(article)) {
      var replyResult = { score: 1, raw: 0, categories: [], byCat: {}, terms: [], reason: 'reply' };
      cell.dataset.jofResult = JSON.stringify(replyResult);
      cell.dataset.jofScore = '1';
      mask(cell, replyResult);
      return;
    }

    // ユーザー辞書（自分で登録したミュートワード）
    if (settings.userWordsEnabled !== false && userdict && settings.userWords && settings.userWords.length) {
      var uw = userdict.find(combined, settings.userWords);
      if (uw) {
        var userResult = {
          score: 1,
          raw: 0,
          categories: [],
          byCat: {},
          terms: [],
          reason: 'user',
          word: uw
        };
        cell.dataset.jofResult = JSON.stringify(userResult);
        cell.dataset.jofScore = '1';
        mask(cell, userResult);
        return;
      }
    }

    var result = scoring.analyze(combined, {
      lang: settings.language,
      categories: effectiveCategories()
    });
    cell.dataset.jofResult = JSON.stringify({
      score: result.score,
      categories: result.categories,
      byCat: result.byCat,
      terms: result.terms.slice(0, 8)
    });
    cell.dataset.jofScore = result.score.toFixed(3);

    if (result.score >= effectiveThreshold()) {
      mask(cell, result);
    } else {
      cell.dataset.jofState = 'clear';
    }
  }

  // ---------------------------------------------------------------- scanning
  function scan() {
    applyQuiet();
    var articles = document.querySelectorAll(TWEET_SEL);
    for (var i = 0; i < articles.length; i++) {
      if (articles[i].parentElement && articles[i].parentElement.closest(TWEET_SEL)) continue;
      try {
        evaluateArticle(articles[i]);
      } catch (e) {
        if (settings && settings.debug) console.debug('[outrage-mute]', e);
      }
    }
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      scan();
    }, 250);
  }

  function resetAll() {
    var cells = document.querySelectorAll(CELL_SEL + '[data-jof-state]');
    for (var i = 0; i < cells.length; i++) {
      clearMask(cells[i]);
      delete cells[i].dataset.jofState;
    }
    restoreQuiet();
  }

  // ---------------------------------------------------------------- floating bar
  function hiddenCount() {
    return document.querySelectorAll('.jof-masked').length;
  }

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'jof-bar';

    var label = document.createElement('span');
    label.className = 'jof-bar-label';

    var reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'jof-bar-reveal';
    reveal.addEventListener('click', function () {
      toggleRevealAll();
    });

    var pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'jof-bar-pause';
    pause.addEventListener('click', function () {
      var next = config.normalizeSettings(Object.assign({}, settings, { enabled: !settings.enabled }));
      var patch = {};
      patch[config.PERSIST_KEY] = next;
      chrome.storage.local.set(patch);
    });

    bar.append(label, reveal, pause);
    (document.body || document.documentElement).appendChild(bar);
    return bar;
  }

  function updateBar() {
    var count = hiddenCount();
    var revealAll = document.body.classList.contains('jof-reveal-all');
    if (!count && !revealAll && !bar) return;
    if (!count && !revealAll) {
      if (bar) {
        bar.remove();
        bar = null;
      }
      return;
    }
    var b = ensureBar();
    b.querySelector('.jof-bar-label').textContent = i18n.t('barLabel', [count]);
    b.querySelector('.jof-bar-reveal').textContent = revealAll ? i18n.t('hide') : i18n.t('show');
    b.querySelector('.jof-bar-pause').textContent = settings.enabled ? i18n.t('pause') : i18n.t('resume');
  }

  function toggleRevealAll(force) {
    var on = typeof force === 'boolean' ? force : !document.body.classList.contains('jof-reveal-all');
    document.body.classList.toggle('jof-reveal-all', on);
    updateBar();
  }

  // ---------------------------------------------------------------- stats
  function report(result) {
    try {
      chrome.runtime.sendMessage({ type: 'jof:masked', score: result.score }, function () {
        void chrome.runtime.lastError;
      });
    } catch (e) {
      /* noop */
    }
  }

  // ---------------------------------------------------------------- init
  function init() {
    loadSettings()
      .then(function () {
        return i18n.load(i18n.localeFor(settings.language));
      })
      .then(function () {
        document.body.classList.toggle('jof-reveal-all', !settings.enabled);
        scan();
        observer = new MutationObserver(function () {
          scheduleScan();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        updateBar();
      });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
