/**
 * popup: 設定の読み書きと、スコアのライブ確認。
 */
(function () {
  'use strict';

  // 拡張外（popup.html を直接ブラウザで開いた時）でも動くように簡易シム
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    globalThis.chrome = {
      storage: {
        local: {
          get: function (keys, cb) {
            var list = Array.isArray(keys) ? keys : [keys];
            var out = {};
            list.forEach(function (k) {
              var v = localStorage.getItem('jof:' + k);
              if (v != null) {
                try {
                  out[k] = JSON.parse(v);
                } catch (e) {
                  /* noop */
                }
              }
            });
            setTimeout(function () {
              cb(out);
            }, 0);
          },
          set: function (obj, cb) {
            Object.keys(obj).forEach(function (k) {
              localStorage.setItem('jof:' + k, JSON.stringify(obj[k]));
            });
            if (cb) setTimeout(cb, 0);
          }
        }
      }
    };
  }

  var JOF = globalThis.JOF;
  var config = JOF.config;
  var scoring = JOF.scoring;
  var lexicon = JOF.lexicon;

  var el = function (id) {
    return document.getElementById(id);
  };

  var settings = config.normalizeSettings({});

  // ------------------------------------------------------------ categories
  function buildCategories(current) {
    var box = el('categories');
    box.textContent = '';
    var all = lexicon.CATEGORY_ORDER.filter(function (id) {
      return id !== 'amplifier';
    });
    var enabled = current.categories ? new Set(current.categories) : new Set(all);
    all.forEach(function (id) {
      var label = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = id;
      cb.checked = enabled.has(id);
      cb.addEventListener('change', readAndSave);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(lexicon.CATEGORY_LABELS[id] || id));
      box.appendChild(label);
    });
  }

  function readCategories() {
    var ids = [];
    var boxes = el('categories').querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) ids.push(boxes[i].value);
    if (ids.length === boxes.length) return null; // 全有効 = null
    return ids;
  }

  // ------------------------------------------------------------ UI <-> storage
  function reflect(s) {
    el('enabled').checked = s.enabled;
    el('threshold').value = String(s.threshold);
    el('thresholdValue').textContent = s.threshold.toFixed(2);
    el('showOverlay').checked = s.showOverlay;
    el('minLength').value = String(s.minLength);
    var modes = document.querySelectorAll('input[name="mode"]');
    for (var i = 0; i < modes.length; i++) modes[i].checked = modes[i].value === s.mode;
  }

  function readAndSave() {
    settings = config.normalizeSettings({
      enabled: el('enabled').checked,
      threshold: parseFloat(el('threshold').value),
      mode: (document.querySelector('input[name="mode"]:checked') || {}).value || 'blur',
      showOverlay: el('showOverlay').checked,
      minLength: parseInt(el('minLength').value, 10),
      categories: readCategories()
    });
    el('thresholdValue').textContent = settings.threshold.toFixed(2);
    var patch = {};
    patch[config.PERSIST_KEY] = settings;
    chrome.storage.local.set(patch);
    updateResult();
  }

  function load() {
    chrome.storage.local.get([config.PERSIST_KEY, config.STATS_KEY], function (res) {
      settings = config.normalizeSettings(res[config.PERSIST_KEY] || {});
      reflect(settings);
      buildCategories(settings);
      var stats = res[config.STATS_KEY] || {};
      var today = stats.date === new Date().toISOString().slice(0, 10) ? stats.today || 0 : 0;
      el('statToday').textContent = String(today);
      el('statMasked').textContent = String(stats.masked || 0);
      updateResult();
    });
  }

  // ------------------------------------------------------------ live test
  function updateResult() {
    var text = el('sample').value.trim();
    var out = el('result');
    if (!text) {
      out.textContent = '—';
      return;
    }
    var r = scoring.analyze(text, { categories: settings.categories });
    var verdict = r.score >= settings.threshold ? '→ ミュート対象' : '→ 表示';
    var cats = (r.categories || []).map(function (c) {
      return lexicon.CATEGORY_LABELS[c] || c;
    });
    out.textContent = '';
    var head = document.createElement('div');
    head.innerHTML = '';
    var scoreSpan = document.createElement('span');
    scoreSpan.className = 'score';
    scoreSpan.textContent = r.score.toFixed(2);
    head.appendChild(scoreSpan);
    head.appendChild(document.createTextNode('  ' + verdict));
    out.appendChild(head);
    var catLine = document.createElement('div');
    catLine.textContent = cats.length ? 'カテゴリ: ' + cats.join('・') : 'カテゴリ: —';
    out.appendChild(catLine);
    var terms = (r.terms || []).slice(0, 8).map(function (t) {
      return t.term + '(' + t.weight + ')';
    });
    var termLine = document.createElement('div');
    termLine.textContent = 'ヒット: ' + (terms.length ? terms.join(', ') : '—');
    out.appendChild(termLine);
  }

  // ------------------------------------------------------------ wire up
  ['enabled', 'threshold', 'showOverlay', 'minLength'].forEach(function (id) {
    el(id).addEventListener('input', readAndSave);
    el(id).addEventListener('change', readAndSave);
  });
  document.querySelectorAll('input[name="mode"]').forEach(function (radio) {
    radio.addEventListener('change', readAndSave);
  });
  el('sample').addEventListener('input', updateResult);
  el('reset').addEventListener('click', function () {
    settings = config.normalizeSettings({});
    var patch = {};
    patch[config.PERSIST_KEY] = settings;
    chrome.storage.local.set(patch, function () {
      reflect(settings);
      buildCategories(settings);
      updateResult();
    });
  });

  load();
})();
