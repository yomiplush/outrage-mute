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
  var lang = JOF.lang;
  var selfpost = JOF.selfpost;
  var reply = JOF.reply;
  var userdict = JOF.userdict;

  var TWEET_SEL = 'article[data-testid="tweet"]';
  var CELL_SEL = '[data-testid="cellInnerDiv"]';

  var settings = Object.assign({}, config.DEFAULTS);
  var observer = null;
  var bar = null;

  // ---------------------------------------------------------------- 判定キュー
  // X は DOM を常時書き換える（タイマー・動画・仮想リスト）。全部を毎回走査すると
  // 投稿1件あたりの DOM 読み取りが積み上がるので、変更のあったセルだけを
  // 「小分け」で判定する。全件スキャンは初期化と設定変更のときだけ。
  var FLUSH_DELAY = 120; // 変更が落ち着くまで待つ（スクロール中の連続変更をまとめる）
  var CHUNK_MS = 6; // 1回あたりの判定予算。超えたら次のタイマーへ回して描画を妨げない
  var pendingArticles = new Set();
  var flushTimer = null;
  var cellCache = new WeakMap(); // cell -> { sig, state, result }（同じ内容の再判定を防ぐ）
  var maskedCount = 0; // いま隠しているセル数（バーの表示用。全件クエリをしない）

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
  var lastQuietAt = 0;
  var quietHidden = 0;

  function hideQuiet(el) {
    if (!el || el.dataset.jofQuiet === '1') return;
    el.dataset.jofQuiet = '1';
    quietHidden++;
    el.style.setProperty('display', 'none', 'important');
  }

  function restoreQuiet() {
    if (!quietHidden) return; // 隠したものが無ければ DOM を探さない
    quietHidden = 0;
    var hidden = document.querySelectorAll('[data-jof-quiet]');
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].style.removeProperty('display');
      delete hidden[i].dataset.jofQuiet;
    }
  }

  function applyQuiet(force) {
    // 全体OFFでは通知静音（バッジ／タブ非表示）も効かせない（値は保持したまま無効化）
    if (!settings.enabled || (!settings.hideNotifications && !settings.hideDm && !settings.hideNotificationTab)) {
      restoreQuiet();
      return;
    }
    // 変更のたびに通知タブ内を全探索すると重いので、間引いて実行する
    var now = Date.now();
    if (!force && now - lastQuietAt < 1500) return;
    // 通知タブ／DM がまだ描画されていなければ何もしない（1回のクエリで済ませる）
    if (!document.querySelector(QUIET_ROOT)) return;
    lastQuietAt = now;
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
      scan();
      updateBar();
    };
    // 言語が変わったらUI文言も読み直す（オーバーレイ/バーの表示を更新）
    if (settings.language !== prevLang) i18n.load(i18n.localeFor(settings.language)).then(go);
    else go();
  });

  // ---------------------------------------------------------------- helpers
  /**
   * 投稿の表示テキストを取り出す。
   * innerText はレイアウトを確定させる（= 強制リフロー）ので使わない。
   * 判定側は空白を潰して正規化するため textContent で十分。
   */
  function textOf(el) {
    var s = el.textContent || '';
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
  /** セルの判定結果をキャッシュする（同じ内容なら再判定しない）。 */
  function remember(cell, sig, state, result) {
    cell.dataset.jofState = state;
    cellCache.set(cell, { sig: sig, state: state, result: result || null });
  }

  /** 判定結果（スコア等）を残したまま表示状態だけ切り替える。 */
  function setState(cell, state, result) {
    cell.dataset.jofState = state;
    var st = cellCache.get(cell);
    if (st) {
      st.state = state;
      if (result !== undefined) st.result = result;
    } else {
      cellCache.set(cell, { sig: null, state: state, result: result === undefined ? null : result });
    }
  }

  function clearMask(cell) {
    if (cell.classList.contains('jof-masked')) {
      maskedCount = Math.max(0, maskedCount - 1);
      scheduleBar();
    }
    cell.classList.remove('jof-masked', 'jof-blur', 'jof-gone', 'jof-relative');
    var ov = cell.querySelector(':scope > .jof-overlay');
    if (ov) ov.remove();
    var rb = cell.querySelector(':scope > .jof-remute');
    if (rb) rb.remove();
  }

  /** x.com から外れた（仮想リストで消えた）セルのミュート数を差し引く。 */
  function dropRemovedMasks(node) {
    if (!maskedCount || node.nodeType !== 1) return;
    if (node.classList && node.classList.contains('jof-masked')) clearMask(node);
    var inner = node.querySelectorAll ? node.querySelectorAll('.jof-masked') : null;
    if (inner && inner.length) {
      for (var i = 0; i < inner.length; i++) clearMask(inner[i]);
    }
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
      var st = cellCache.get(cell) || { sig: null };
      clearMask(cell);
      mask(cell, result);
      remember(cell, st.sig, 'masked', result);
    });
    cell.appendChild(b);
  }

  // ---- 自分のハンドル検出（自分の投稿は除外できるように）----
  var ownHandle = null;
  var ownHandleAt = 0;
  var OWN_HANDLE_RETRY_MS = 5000;
  function detectOwnHandle() {
    if (ownHandle) return ownHandle;
    if (!selfpost) return null;
    // サイドバーがまだ描画されていない間は毎回失敗する。投稿ごとに
    // document 全体を探し直すと重いので、一定間隔でのみ再試行する。
    var now = Date.now();
    if (ownHandleAt && now - ownHandleAt < OWN_HANDLE_RETRY_MS) return null;
    ownHandleAt = now;
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

  function mask(cell, result, forceHide) {
    if (!cell.classList.contains('jof-masked')) {
      cell.classList.add('jof-masked');
      maskedCount++;
      scheduleBar();
    }
    if (forceHide || settings.mode === 'hide') {
      cell.classList.add('jof-gone');
    } else if (!cell.classList.contains('jof-blur')) {
      cell.classList.add('jof-blur');
      if (settings.showOverlay !== false) cell.appendChild(buildOverlay(result, cell));
    }
    report(result);
  }

  function buildOverlay(result, cell) {
    var el = document.createElement('div');
    el.className = 'jof-overlay';

    var badge = document.createElement('div');
    badge.className = 'jof-badge';
    if (result && result.reason === 'long') badge.textContent = i18n.t('reasonLong', [result.length]);
    else if (result && result.reason === 'reply') badge.textContent = i18n.t('reasonReply');
    else if (result && result.reason === 'user') badge.textContent = i18n.t('reasonUser', [result.word || '']);
    else if (result && result.reason === 'lang') badge.textContent = i18n.t('reasonLang', [result.langName || '']);
    else badge.textContent = i18n.t('maskedBadge', [Math.round((result.score || 0) * 100)]);

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
      setState(cell, 'shown', result);
      addRemuteButton(cell, result);
    });

    el.append(badge, catEl, btn);
    return el;
  }

  // ---------------------------------------------------------------- evaluate
  function evaluateArticle(article) {
    // 判定待ちの間に仮想リストから外れた投稿は触らない（数え上げがずれる）
    if (!article.isConnected) return;
    if (!settings.enabled) return;

    var cell = cellOf(article);
    var tw = getTweetContent(article);
    if (!tw) return;

    var sig = hash(tw.text + '\u0000' + tw.quote);
    var cache = cellCache.get(cell);

    // 同じ内容のセルは再判定しない（X の再描画・スクロールでの再走査が主因）
    if (cache && cache.sig === sig) {
      if (
        cache.state === 'masked' &&
        !cell.classList.contains('jof-gone') &&
        settings.showOverlay !== false &&
        cache.result &&
        cache.result.reason !== 'lang' && // 言語ミュートは常に完全非表示（理由バッジは出さない）
        !cell.querySelector(':scope > .jof-overlay')
      ) {
        cell.appendChild(buildOverlay(cache.result, cell));
      }
      return;
    }

    clearMask(cell);

    var combined = tw.quote ? tw.text + '\n' + tw.quote : tw.text;

    // 言語ミュート: 選んだ言語の投稿は他の条件（短文・自分の投稿・リプライ・スコア）に
    //               関わらず丸ごと隠す。隠し方の設定に関係なく完全非表示にする。
    if (lang && lang.isMutedLang(settings.muteLang, combined)) {
      var langResult = {
        score: 1,
        raw: 0,
        categories: [],
        byCat: {},
        terms: [],
        reason: 'lang',
        langName: lang.muteName(settings.muteLang)
      };
      mask(cell, langResult, true);
      remember(cell, sig, 'masked', langResult);
      return;
    }

    // 自分の投稿は除外（トグル）
    if (isOwnArticle(article)) {
      remember(cell, sig, 'self', null);
      return;
    }

    // リプライはフィルターしない（トグル・既定OFF）
    if (settings.excludeReplies && isReplyArticle(article)) {
      remember(cell, sig, 'reply-skip', null);
      return;
    }

    if (!combined || combined.length < (settings.minLength || 0)) {
      remember(cell, sig, 'short', null);
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
      mask(cell, longResult);
      remember(cell, sig, 'masked', longResult);
      return;
    }

    // 集中モードではリプライ投稿も避ける
    if (config.effectiveReplyHide(settings.preset, settings.focusHideReplies) && isReplyArticle(article)) {
      var replyResult = { score: 1, raw: 0, categories: [], byCat: {}, terms: [], reason: 'reply' };
      mask(cell, replyResult);
      remember(cell, sig, 'masked', replyResult);
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
        mask(cell, userResult);
        remember(cell, sig, 'masked', userResult);
        return;
      }
    }

    var result = scoring.analyze(combined, {
      lang: settings.language,
      categories: effectiveCategories()
    });

    if (result.score >= effectiveThreshold()) {
      mask(cell, result);
      remember(cell, sig, 'masked', result);
    } else {
      remember(cell, sig, 'clear', null);
    }
  }

  // ---------------------------------------------------------------- scanning
  /** 既知の投稿をすべて判定キューへ入れる（初期化・設定変更時のみ）。 */
  function scan() {
    applyQuiet(true);
    if (settings.enabled) {
      var articles = document.querySelectorAll(TWEET_SEL);
      for (var i = 0; i < articles.length; i++) {
        // 引用RT等で入れ子になった article は外側だけ見る
        if (articles[i].parentElement && articles[i].parentElement.closest(TWEET_SEL)) continue;
        pendingArticles.add(articles[i]);
      }
    }
    requestFlush(0);
  }

  function requestFlush(delay) {
    if (flushTimer !== null) return;
    flushTimer = setTimeout(function () {
      flushTimer = null;
      flushPending();
    }, delay);
  }

  /** キューを時間予算つきで処理する（1回で詰まらせず、残りは次のタイマーへ）。 */
  function flushPending() {
    if (!settings.enabled) {
      pendingArticles.clear();
      return;
    }
    var start = now();
    while (pendingArticles.size) {
      var next = pendingArticles.values().next();
      pendingArticles.delete(next.value);
      try {
        evaluateArticle(next.value);
      } catch (e) {
        if (settings && settings.debug) console.debug('[outrage-mute]', e);
      }
      if (now() - start > CHUNK_MS) break;
    }
    if (pendingArticles.size) requestFlush(16);
  }

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  // ---- DOM 変更の拾い上げ（変更のあったセルだけをキューへ）----
  function isOwnNode(node) {
    if (!node || node.nodeType !== 1 || !node.classList) return false;
    return (
      node.classList.contains('jof-overlay') ||
      node.classList.contains('jof-remute') ||
      node.classList.contains('jof-bar') ||
      node.classList.contains('jof-toast')
    );
  }

  function onMutations(records) {
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      var target = rec.target;

      // 自分の UI（オーバーレイ等）の中の変更は無視
      if (target.nodeType === 1 ? isOwnNode(target) : false) continue;
      if (target.nodeType === 1 && target.closest && target.closest('.jof-overlay,.jof-remute,.jof-bar,.jof-toast')) continue;

      if (rec.type === 'characterData') {
        var p = target.parentElement;
        var art = p && p.closest ? p.closest(TWEET_SEL) : null;
        if (art) pendingArticles.add(art);
        continue;
      }

      // 追加された要素が自分の UI だけなら、このレコードは無視してよい
      // （削除だけのレコードは、消えたセルの数え上げのために処理する）
      var onlyOwn = rec.addedNodes.length > 0;
      var n;
      for (n = 0; n < rec.addedNodes.length; n++) {
        if (!isOwnNode(rec.addedNodes[n])) {
          onlyOwn = false;
          break;
        }
      }
      if (onlyOwn) continue;

      // 変更された場所を含む投稿（本文の書き換えなど）
      var host = target.nodeType === 1 ? target : target.parentElement;
      var hostArt = host && host.closest ? host.closest(TWEET_SEL) : null;
      if (hostArt) pendingArticles.add(hostArt);

      // 追加された部分に投稿が含まれる（新しいセル／再描画）
      for (n = 0; n < rec.addedNodes.length; n++) {
        var node = rec.addedNodes[n];
        if (node.nodeType !== 1 || isOwnNode(node)) continue;
        if (node.matches && node.matches(TWEET_SEL)) {
          pendingArticles.add(node);
          continue;
        }
        if (node.querySelector) {
          var inner = node.querySelector(TWEET_SEL);
          if (inner) pendingArticles.add(inner);
        }
      }

      // 消えたセルはミュート数から差し引く
      for (n = 0; n < rec.removedNodes.length; n++) dropRemovedMasks(rec.removedNodes[n]);
    }
    if (pendingArticles.size) requestFlush(FLUSH_DELAY);
    // 通知バッジは後から描画されることがあるので、間引きつつ追従する
    applyQuiet();
  }

  function resetAll() {
    pendingArticles.clear();
    maskedCount = 0;
    var cells = document.querySelectorAll(CELL_SEL + '[data-jof-state]');
    for (var i = 0; i < cells.length; i++) {
      clearMask(cells[i]);
      delete cells[i].dataset.jofState;
    }
    // 言語・しきい値などの変更を反映させるため、判定キャッシュは捨てる
    cellCache = new WeakMap();
    restoreQuiet();
  }

  // ---------------------------------------------------------------- floating bar
  var barTimer = null;
  /** バー表示はまとめて更新する（ミュートのたびに全件クエリしない）。 */
  function scheduleBar() {
    if (barTimer) return;
    barTimer = setTimeout(function () {
      barTimer = null;
      updateBar();
    }, 80);
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
    var count = maskedCount;
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

  // ---- 有効/無効のトースト表示 ----
  var toastEl = null;
  var toastTimer = null;
  function showToast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'jof-toast';
      (document.body || document.documentElement).appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('jof-toast-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('jof-toast-on');
    }, 1600);
  }

  // ---- ショートカット: Shift+1 で有効/無効を切替（PCのみ・タッチ端末では無効）----
  function onShortcut(e) {
    if (!e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    // 配列差を吸収（US/JIS いずれも Shift+1 はコード Digit1）
    if (e.code !== 'Digit1' && e.key !== '!') return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    var next = config.toggleEnabled(settings);
    var patch = {};
    patch[config.PERSIST_KEY] = next;
    chrome.storage.local.set(patch);
    showToast(next.enabled ? i18n.t('toggledOn') : i18n.t('toggledOff'));
  }

  // ---------------------------------------------------------------- stats
  // service worker を1件ごとに起こすと重い（MV3 は毎回起動コストがかかる）ため、
  // 一定時間ぶんをまとめて1回で送る。
  var pendingReports = 0;
  var reportTimer = null;

  function flushReports() {
    reportTimer = null;
    if (!pendingReports) return;
    var count = pendingReports;
    pendingReports = 0;
    try {
      chrome.runtime.sendMessage({ type: 'jof:masked', count: count }, function () {
        void chrome.runtime.lastError;
      });
    } catch (e) {
      /* noop */
    }
  }

  function report(result) {
    if (!result) return;
    pendingReports++;
    if (!reportTimer) reportTimer = setTimeout(flushReports, 2000);
  }

  // ページを離れるときに未送信ぶんを流す（統計の取りこぼしを防ぐ）
  window.addEventListener('pagehide', flushReports, true);

  // ---------------------------------------------------------------- init
  function init() {
    loadSettings()
      .then(function () {
        return i18n.load(i18n.localeFor(settings.language));
      })
      .then(function () {
        document.body.classList.toggle('jof-reveal-all', !settings.enabled);
        scan();
        observer = new MutationObserver(onMutations);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        updateBar();
        // タッチ端末（iOS/Android）ではショートカットを登録しない（タッチ優先）
        if (!(JOF.platform && JOF.platform.detect())) {
          document.addEventListener('keydown', onShortcut, true);
        }
      });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
