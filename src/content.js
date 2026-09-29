/**
 * content script: X の投稿を検出し、義憤スコアで CSS ミュートする。
 *
 * 流れ:
 *   article[data-testid="tweet"] を検出
 *     -> 本文 + 引用本文を取り出す
 *     -> JOF.scoring.analyze() でスコア算出
 *     -> しきい値以上ならセルにクラスを付け、ぼかし or 非表示
 *
 * すべてローカルで完結（外部通信なし）。
 */
(function () {
  'use strict';

  var JOF = globalThis.JOF;
  if (!JOF || !JOF.scoring || !JOF.config || !JOF.lexicon) return;

  var scoring = JOF.scoring;
  var config = JOF.config;
  var CATEGORY_LABELS = JOF.lexicon.CATEGORY_LABELS;

  var TWEET_SEL = 'article[data-testid="tweet"]';
  var CELL_SEL = '[data-testid="cellInnerDiv"]';

  /**
   * 有効カテゴリを解決する。
   * 設定が未指定(null)なら「トピック系(政治/陰謀論/AI論争)を除く全部」を使う。
   */
  function effectiveCategories() {
    if (Array.isArray(settings.categories)) return settings.categories;
    return JOF.lexicon.CATEGORY_ORDER.filter(function (id) {
      return config.OPTIONAL_CATEGORIES.indexOf(id) < 0;
    });
  }

  var settings = Object.assign({}, config.DEFAULTS);
  var observer = null;
  var bar = null;
  var scanTimer = null;

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
    if (area === 'local' && changes[config.PERSIST_KEY]) {
      settings = config.normalizeSettings(changes[config.PERSIST_KEY].newValue || {});
      document.body.classList.toggle('jof-reveal-all', !settings.enabled);
      resetAll();
      scheduleScan();
    }
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
    cell.classList.remove('jof-masked', 'jof-blur', 'jof-gone');
    var ov = cell.querySelector(':scope > .jof-overlay');
    if (ov) ov.remove();
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
    badge.textContent = '義憤ミュート ' + Math.round(result.score * 100) + '%';

    var cats = document.createElement('div');
    cats.className = 'jof-cats';
    var names = (result.categories || []).slice(0, 3).map(function (c) {
      return CATEGORY_LABELS[c] || c;
    });
    cats.textContent = names.length ? names.join('・') : '該当';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jof-show-btn';
    btn.textContent = '表示';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearMask(cell);
      cell.dataset.jofState = 'shown';
      updateBar();
    });

    el.append(badge, cats, btn);
    return el;
  }

  // ---------------------------------------------------------------- evaluate
  function evaluateArticle(article) {
    var cell = cellOf(article);
    var t = getTweetContent(article);
    if (!t) return;

    var sig = hash(t.text + '\u0000' + t.quote);
    var state = cell.dataset.jofState || '';

    // 処理済みで内容が同じならスキップ（オーバーレイだけ補修）
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

    // 内容が変わった（仮想スクロールのセル再利用など）→ リセットして再評価
    clearMask(cell);
    cell.dataset.jofSig = sig;

    if (!settings.enabled) {
      cell.dataset.jofState = 'off';
      return;
    }

    var combined = t.quote ? t.text + '\n' + t.quote : t.text;
    if (!combined || combined.length < (settings.minLength || 0)) {
      cell.dataset.jofState = 'short';
      return;
    }

    var result = scoring.analyze(combined, { categories: effectiveCategories() });
    cell.dataset.jofResult = JSON.stringify({
      score: result.score,
      categories: result.categories,
      byCat: result.byCat,
      terms: result.terms.slice(0, 8)
    });
    cell.dataset.jofScore = result.score.toFixed(3);

    if (result.score >= settings.threshold) {
      mask(cell, result);
    } else {
      cell.dataset.jofState = 'clear';
    }
  }

  // ---------------------------------------------------------------- scanning
  function scan() {
    var articles = document.querySelectorAll(TWEET_SEL);
    for (var i = 0; i < articles.length; i++) {
      // 引用ツイートの入れ子は親側で本文として扱うのでスキップ
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
    reveal.textContent = '表示';
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
    b.querySelector('.jof-bar-label').textContent = '義憤ミュート: ' + count;
    b.querySelector('.jof-bar-reveal').textContent = revealAll ? '隠す' : '表示';
    b.querySelector('.jof-bar-pause').textContent = settings.enabled ? '停止' : '再開';
  }

  function toggleRevealAll(force) {
    var on =
      typeof force === 'boolean' ? force : !document.body.classList.contains('jof-reveal-all');
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
    loadSettings().then(function () {
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
