/**
 * popup: 設定の読み書きと、スコアのライブ確認（多言語対応）。
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
  var cats = JOF.categories;
  var lang = JOF.lang;
  var i18n = JOF.i18n;
  var t = i18n.t;

  var el = function (id) {
    return document.getElementById(id);
  };

  var settings = config.normalizeSettings({});

  function effectiveCategories() {
    if (Array.isArray(settings.categories)) return settings.categories;
    return cats.CATEGORY_ORDER.filter(function (id) {
      return config.OPTIONAL_CATEGORIES.indexOf(id) < 0;
    });
  }

  function catLabel(id) {
    return t('cat_' + id) || cats.CATEGORY_LABELS[id] || id;
  }

  // ------------------------------------------------------------ categories
  function buildCategories(current) {
    var box = el('categories');
    box.textContent = '';
    var all = cats.CATEGORY_ORDER.filter(function (id) {
      return id !== 'amplifier';
    });
    var defaultCore = all.filter(function (id) {
      return config.OPTIONAL_CATEGORIES.indexOf(id) < 0;
    });
    var enabled = Array.isArray(current.categories) ? new Set(current.categories) : new Set(defaultCore);
    all.forEach(function (id) {
      var optional = config.OPTIONAL_CATEGORIES.indexOf(id) >= 0;
      var label = document.createElement('label');
      if (optional) label.className = 'optional';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = id;
      cb.checked = enabled.has(id);
      cb.addEventListener('change', readAndSave);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(catLabel(id) + (optional ? t('optionalSuffix') : '')));
      box.appendChild(label);
    });
  }

  function readCategories() {
    var ids = [];
    var boxes = el('categories').querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) ids.push(boxes[i].value);
    return ids;
  }

  // ------------------------------------------------------------ language
  function buildLanguages(current) {
    var sel = el('language');
    sel.textContent = '';
    var auto = document.createElement('option');
    auto.value = 'auto';
    auto.textContent = t('languageAuto');
    sel.appendChild(auto);
    lang.list().forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      sel.appendChild(o);
    });
    sel.value = current.language || 'auto';
    sel.addEventListener('change', readAndSave);
  }

  // ------------------------------------------------------------ preset
  function buildPresets(current) {
    var sel = el('preset');
    if (!sel) return;
    sel.textContent = '';
    ['off', 'soft', 'normal', 'hard'].forEach(function (key) {
      var o = document.createElement('option');
      o.value = key;
      var label = t('preset' + key.charAt(0).toUpperCase() + key.slice(1));
      o.textContent = label === 'preset' + key.charAt(0).toUpperCase() + key.slice(1) ? key : label;
      sel.appendChild(o);
    });
    sel.value = current || 'off';
  }

  // ------------------------------------------------------------ UI <-> storage
  function reflect(s) {
    el('enabled').checked = s.enabled;
    el('threshold').value = String(s.threshold);
    el('thresholdValue').textContent = s.threshold.toFixed(2);
    el('showOverlay').checked = s.showOverlay;
    el('minLength').value = String(s.minLength);
    buildPresets(s.preset);
    el('focusMaxLength').value = String(s.focusMaxLength);
    el('hideNotifications').checked = s.hideNotifications;
    el('hideNotificationTab').checked = s.hideNotificationTab;
    el('hideDm').checked = s.hideDm;
    el('excludeSelf').checked = s.excludeSelf;
    var modes = document.querySelectorAll('input[name="mode"]');
    for (var i = 0; i < modes.length; i++) modes[i].checked = modes[i].value === s.mode;
    var sel = el('language');
    if (sel) sel.value = s.language || 'auto';
  }

  function readAndSave() {
    var prevLang = settings.language;
    settings = config.normalizeSettings({
      enabled: el('enabled').checked,
      threshold: parseFloat(el('threshold').value),
      mode: (document.querySelector('input[name="mode"]:checked') || {}).value || 'blur',
      showOverlay: el('showOverlay').checked,
      minLength: parseInt(el('minLength').value, 10),
      language: el('language') ? el('language').value : 'auto',
      categories: readCategories(),
      preset: el('preset') ? el('preset').value : 'off',
      focusMaxLength: parseInt(el('focusMaxLength').value, 10),
      hideNotifications: el('hideNotifications').checked,
      hideNotificationTab: el('hideNotificationTab').checked,
      hideDm: el('hideDm').checked,
      excludeSelf: el('excludeSelf').checked
    });
    el('thresholdValue').textContent = settings.threshold.toFixed(2);
    var patch = {};
    patch[config.PERSIST_KEY] = settings;
    chrome.storage.local.set(patch);
    updateResult();
    if (settings.language !== prevLang) reloadUI();
  }

  function load() {
    chrome.storage.local.get([config.PERSIST_KEY, config.STATS_KEY], function (res) {
      settings = config.normalizeSettings(res[config.PERSIST_KEY] || {});
      i18n.load(i18n.localeFor(settings.language)).then(function () {
        i18n.apply();
        reflect(settings);
        buildLanguages(settings);
        buildPresets(settings.preset);
        buildCategories(settings);
        var stats = res[config.STATS_KEY] || {};
        var today = stats.date === new Date().toISOString().slice(0, 10) ? stats.today || 0 : 0;
        el('statToday').textContent = String(today);
        el('statMasked').textContent = String(stats.masked || 0);
        updateResult();
      });
    });
  }

  // UI言語を選択言語に追従させて再描画する
  function reloadUI() {
    i18n.load(i18n.localeFor(settings.language)).then(function () {
      i18n.apply();
      buildLanguages(settings);
      buildPresets(settings.preset);
      buildCategories(settings);
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
    var r = scoring.analyze(text, { lang: settings.language, categories: effectiveCategories() });
    var muted = r.score >= settings.threshold;
    var detected = r.lang;

    out.textContent = '';
    var head = document.createElement('div');
    var scoreSpan = document.createElement('span');
    scoreSpan.className = 'score';
    scoreSpan.textContent = r.score.toFixed(2);
    head.appendChild(scoreSpan);
    head.appendChild(document.createTextNode('  ' + (muted ? t('hide') : t('show')) + '  [' + detected + ']'));
    out.appendChild(head);

    var names = (r.categories || []).map(catLabel);
    var catLine = document.createElement('div');
    catLine.textContent = names.length ? names.join(' / ') : '—';
    out.appendChild(catLine);

    var terms = (r.terms || []).slice(0, 8).map(function (x) {
      return x.term + '(' + x.weight + ')';
    });
    var termLine = document.createElement('div');
    termLine.textContent = terms.length ? terms.join(', ') : '—';
    out.appendChild(termLine);
  }

  // ------------------------------------------------------------ wire up
  ['enabled', 'threshold', 'showOverlay', 'minLength', 'focusMaxLength', 'hideNotifications', 'hideNotificationTab', 'hideDm', 'excludeSelf'].forEach(function (id) {
    el(id).addEventListener('input', readAndSave);
    el(id).addEventListener('change', readAndSave);
  });
  if (el('preset')) el('preset').addEventListener('change', readAndSave);
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
      buildLanguages(settings);
      buildCategories(settings);
      updateResult();
    });
  });

  i18n.apply();
  load();
})();
