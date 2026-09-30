/**
 * ユーザースクリプト用の設定パネル（拡張のポップアップ相当）。
 *
 * Userscripts（iOS Safari）には popup が無いので、ページ内に
 * フローティングの⚙ボタンと設定パネルを用意する。
 * 判定ロジック・保存（chrome.storage シム）は拡張と共通。
 */
(function () {
  'use strict';
  var JOF = globalThis.JOF;
  if (!JOF || !JOF.config || !JOF.categories || !JOF.i18n || !JOF.scoring) return;

  var config = JOF.config;
  var cats = JOF.categories;
  var lang = JOF.lang;
  var i18n = JOF.i18n;
  var scoring = JOF.scoring;
  var t = i18n.t;

  var settings = config.normalizeSettings({});
  var stats = { masked: 0, today: 0, date: '' };

  var CSS =
    '.jof-ui-fab{position:fixed;left:14px;bottom:14px;z-index:2147483647;width:34px;height:34px;border-radius:999px;' +
    'border:1px solid rgba(255,255,255,.25);background:rgba(20,20,24,.92);color:#ffb59b;font-size:16px;cursor:pointer;' +
    'box-shadow:0 4px 14px rgba(0,0,0,.4)}' +
    '.jof-ui-panel{position:fixed;left:14px;bottom:58px;z-index:2147483647;width:300px;max-height:78vh;overflow:auto;' +
    'background:rgba(20,20,24,.97);color:#eee;border:1px solid #33343c;border-radius:12px;padding:12px;' +
    'font:13px/1.5 system-ui,-apple-system,"Hiragino Kaku Gothic ProN",Meiryo,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)}' +
    '.jof-ui-panel h2{font-size:14px;margin:0 0 8px;color:#ffb59b}' +
    '.jof-ui-panel .s{margin:10px 0;padding-top:8px;border-top:1px solid #2c2c33}' +
    '.jof-ui-panel label{display:flex;align-items:center;gap:6px;margin:3px 0}' +
    '.jof-ui-panel .grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px}' +
    '.jof-ui-panel .hint{color:#9a9aa5;font-size:11px;margin:4px 0 0}' +
    '.jof-ui-panel select,.jof-ui-panel input[type=number],.jof-ui-panel textarea{background:#101014;color:#eee;' +
    'border:1px solid #33343c;border-radius:6px;padding:3px 6px;font:inherit}' +
    '.jof-ui-panel textarea{width:100%;min-height:48px;resize:vertical}' +
    '.jof-ui-panel .row{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
    '.jof-ui-panel .res{margin-top:6px;padding:6px 8px;border-radius:6px;background:rgba(228,87,46,.12);font-size:12px}' +
    '.jof-ui-panel button{padding:4px 12px;border:1px solid #33343c;border-radius:999px;background:transparent;color:inherit;cursor:pointer}' +
    '.jof-ui-panel .opt{color:#e4572e}' +
    '.jof-ui-panel .kbd{display:inline-block;padding:1px 6px;border:1px solid #33343c;border-radius:5px;' +
    'font-size:10px;color:#9a9aa5;white-space:nowrap}' +
    '.jof-ui-panel h2 .on{color:#6bd08a}' +
    '.jof-ui-panel h2 .off{color:#9a9aa5}';

  // Tampermonkey/Android 向け（タップしやすく・画面幅に追従）
  var MOBILE_CSS =
    '.jof-ui-fab{width:46px;height:46px;font-size:20px;left:12px;bottom:12px}' +
    '.jof-ui-panel{width:min(360px,94vw);max-height:74vh;bottom:70px;font-size:15px;-webkit-overflow-scrolling:touch}' +
    '.jof-ui-panel button{padding:9px 16px;font-size:14px}' +
    '.jof-ui-panel label{margin:6px 0}' +
    '.jof-ui-panel input[type=checkbox]{width:18px;height:18px}' +
    '.jof-ui-panel select,.jof-ui-panel input[type=number]{padding:7px 9px;font-size:15px}';

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function catLabel(id) {
    return t('cat_' + id) || cats.CATEGORY_LABELS[id] || id;
  }

  function coreCats() {
    return cats.CATEGORY_ORDER.filter(function (id) {
      return config.OPTIONAL_CATEGORIES.indexOf(id) < 0;
    });
  }

  function effectiveCategories() {
    var p = config.presetCategories(settings.preset, cats.CATEGORY_ORDER, config.OPTIONAL_CATEGORIES);
    if (p) return p;
    return Array.isArray(settings.categories) ? settings.categories : coreCats();
  }

  function injectCSS() {
    var s = document.createElement('style');
    s.id = 'jof-style';
    s.textContent = (JOF.css || '') + CSS + (JOF.mobile ? MOBILE_CSS : '');
    (document.head || document.documentElement).appendChild(s);
  }

  // ---- コントロール ----
  function check(key, label, checked, extra) {
    var l = h('label');
    var c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = !!checked;
    c.dataset.key = key;
    if (extra) c.dataset.extra = extra;
    l.appendChild(c);
    l.appendChild(document.createTextNode(label));
    return l;
  }

  function selectRow(key, label, options, value) {
    var row = h('div', 'row');
    row.appendChild(h('span', null, label));
    var s = document.createElement('select');
    s.dataset.key = key;
    options.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0];
      op.textContent = o[1];
      s.appendChild(op);
    });
    s.value = value;
    row.appendChild(s);
    return row;
  }

  function rangeRow(key, label, value) {    var wrap = h('div');
    var row = h('div', 'row');
    row.appendChild(h('span', null, label));
    var out = h('output', null, Number(value).toFixed(2));
    row.appendChild(out);
    wrap.appendChild(row);
    var r = document.createElement('input');
    r.type = 'range';
    r.min = '0.3';
    r.max = '0.9';
    r.step = '0.05';
    r.value = String(value);
    r.style.width = '100%';
    r.dataset.key = key;
    r.addEventListener('input', function () {
      out.textContent = Number(r.value).toFixed(2);
    });
    wrap.appendChild(r);
    return wrap;
  }

  function numberRow(key, label, value, min, max) {
    var row = h('div', 'row');
    row.appendChild(h('span', null, label));
    var i = document.createElement('input');
    i.type = 'number';
    i.min = String(min);
    i.max = String(max);
    i.step = '10';
    i.value = String(value);
    i.dataset.key = key;
    i.style.width = '72px';
    row.appendChild(i);
    return row;
  }

  function radioRow(key, label, options, value) {
    var wrap = h('div');
    wrap.appendChild(h('div', 'hint', label));
    options.forEach(function (o) {
      var l = h('label');
      var r = document.createElement('input');
      r.type = 'radio';
      r.name = 'jof-' + key;
      r.value = o[0];
      r.checked = o[0] === value;
      r.dataset.key = key;
      l.appendChild(r);
      l.appendChild(document.createTextNode(o[1]));
      wrap.appendChild(l);
    });
    return wrap;
  }

  function heading(text) {
    return h('div', 's', text);
  }

  function hint(text) {
    return h('p', 'hint', text);
  }

  // ---- パネル ----
  var fab, panel, body;

  function buildShell() {
    fab = h('button', 'jof-ui-fab', '⚙');
    fab.title = t('title');
    fab.addEventListener('click', function () {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    panel = h('div', 'jof-ui-panel');
    panel.style.display = 'none';
    body = h('div', 'jof-panel-body');
    panel.appendChild(body);
    panel.addEventListener('change', onControlChange);
    panel.addEventListener('input', onControlChange);
    document.documentElement.appendChild(fab);
    document.documentElement.appendChild(panel);
  }

  function onControlChange(e) {
    var el = e.target;
    var key = el.dataset && el.dataset.key;
    if (!key) return;
    if (key === 'categories') {
      var ids = [];
      body.querySelectorAll('input[data-key="categories"]').forEach(function (c) {
        if (c.checked) ids.push(c.dataset.extra);
      });
      settings.categories = ids;
    } else if (key === 'mode') {
      settings.mode = el.value;
    } else if (key === 'preset') {
      settings.preset = el.value;
    } else if (key === 'language') {
      settings.language = el.value;
    } else if (key === 'threshold') {
      settings.threshold = parseFloat(el.value);
    } else if (key === 'focusMaxLength') {
      settings.focusMaxLength = parseInt(el.value, 10) || 0;
    } else if (key === 'minLength') {
      settings.minLength = parseInt(el.value, 10) || 0;
    } else {
      settings[key] = el.type === 'checkbox' ? el.checked : el.value;
    }
    settings = config.normalizeSettings(settings);
    var patch = {};
    patch[config.PERSIST_KEY] = settings;
    chrome.storage.local.set(patch);
    var wasLang = el.dataset.key === 'language';
    if (wasLang) {
      i18n.load(i18n.localeFor(settings.language)).then(render);
    } else {
      updateTest();
    }
  }

  // ユーザー辞書は別ウィンドウで編集（拡張の dict.html 相当をその場で生成）
  function openDictWindow() {
    var w = window.open('', 'jof-dict', 'width=420,height=580,menubar=no,toolbar=no,location=no,status=no');
    if (!w) return;
    try {
      var d = w.document;
      d.open();
      d.write(
        '<!DOCTYPE html><html lang="' +
          (navigator.language || 'ja') +
          '"><head><meta charset="utf-8"><title>' +
          (t('userDict') || 'User dictionary') +
          '</title></head><body><div id="jof-dict-root"></div></body></html>'
      );
      d.close();
      if (JOF.dictEditor) JOF.dictEditor.createEditor(d, chrome).load();
    } catch (e) {
      /* noop */
    }
    w.focus();
  }

  function render() {
    body.textContent = '';
    var hd = h('h2');
    hd.appendChild(document.createTextNode(t('title') + '　'));
    hd.appendChild(h('span', 'kbd', 'Shift+1'));
    var onOff = h('span', settings.enabled ? 'on' : 'off', '　' + (settings.enabled ? t('enabledOn') : t('enabledOff')));
    hd.appendChild(onOff);
    body.appendChild(hd);
    body.appendChild(check('enabled', t('enabled'), settings.enabled));
    body.appendChild(heading(t('focusMode')));
    var presetOpts = config.PRESET_KEYS.map(function (k) {
      return [k, t('preset' + k.charAt(0).toUpperCase() + k.slice(1))];
    });
    body.appendChild(selectRow('preset', t('focusMode'), presetOpts, settings.preset));
    body.appendChild(numberRow('focusMaxLength', t('focusMaxLength'), settings.focusMaxLength, 0, 1000));
    body.appendChild(check('focusHideReplies', t('focusHideReplies'), settings.focusHideReplies));
    body.appendChild(hint(t('focusMaxLengthHint')));
    body.appendChild(hint(t('focusModeHint')));
    body.appendChild(rangeRow('threshold', t('threshold'), settings.threshold));
    body.appendChild(radioRow('mode', t('mode'), [['blur', t('modeBlur')], ['hide', t('modeHide')]], settings.mode));
    body.appendChild(check('showOverlay', t('showOverlay'), settings.showOverlay));
    body.appendChild(check('excludeSelf', t('excludeSelf'), settings.excludeSelf));
    body.appendChild(check('excludeReplies', t('excludeReplies'), settings.excludeReplies));
    var langOpts = [['auto', t('languageAuto')]].concat(
      lang.list().map(function (p) {
        return [p.id, p.name];
      })
    );
    body.appendChild(selectRow('language', t('language'), langOpts, settings.language));
    body.appendChild(heading(t('quiet')));
    body.appendChild(check('hideNotifications', t('hideNotifications'), settings.hideNotifications));
    body.appendChild(check('hideNotificationTab', t('hideNotificationTab'), settings.hideNotificationTab));
    body.appendChild(check('hideDm', t('hideDm'), settings.hideDm));
    body.appendChild(hint(t('quietHint')));
    body.appendChild(heading(t('userDict')));
    body.appendChild(check('userWordsEnabled', t('userDictEnabled'), settings.userWordsEnabled));
    var drow = h('div', 'row');
    drow.appendChild(h('span', 'hint', t('userDictCount', [(settings.userWords || []).length])));
    var dbtn = h('button', null, t('userDictManage'));
    dbtn.type = 'button';
    dbtn.addEventListener('click', openDictWindow);
    drow.appendChild(dbtn);
    body.appendChild(drow);
    body.appendChild(hint(t('userDictHint')));
    body.appendChild(heading(t('categories')));
    var grid = h('div', 'grid');
    var enabled = Array.isArray(settings.categories) ? settings.categories : coreCats();
    cats.CATEGORY_ORDER.filter(function (id) {
      return id !== 'amplifier';
    }).forEach(function (id) {
      var optional = config.OPTIONAL_CATEGORIES.indexOf(id) >= 0;
      var l = check('categories', catLabel(id) + (optional ? t('optionalSuffix') : ''), enabled.indexOf(id) >= 0, id);
      if (optional) l.className = 'opt';
      grid.appendChild(l);
    });
    body.appendChild(grid);
    body.appendChild(hint(t('categoriesHint')));
    body.appendChild(heading(t('tryScore')));
    var ta = document.createElement('textarea');
    ta.dataset.key = 'sample';
    ta.placeholder = t('samplePlaceholder');
    ta.addEventListener('input', updateTest);
    body.appendChild(ta);
    var res = h('div', 'res');
    res.id = 'jof-ui-test';
    body.appendChild(res);
    body.appendChild(heading(t('statTotal') + ' / ' + t('statToday')));
    var st = h('div', 'row');
    st.appendChild(h('span', null, String(stats.masked || 0) + ' / ' + todayCount()));
    body.appendChild(st);
    var reset = h('button', null, t('reset'));
    reset.type = 'button';
    reset.addEventListener('click', function () {
      settings = config.normalizeSettings({});
      stats = { masked: 0, today: 0, date: '' };
      var patch = {};
      patch[config.PERSIST_KEY] = settings;
      patch[config.STATS_KEY] = stats;
      chrome.storage.local.set(patch);
      i18n.load(i18n.localeFor(settings.language)).then(render);
    });
    body.appendChild(reset);
    updateTest();
    document.documentElement.setAttribute('lang', i18n.localeFor(settings.language) || (navigator.language || 'ja'));
  }

  function todayCount() {
    var today = new Date().toISOString().slice(0, 10);
    return stats.date === today ? stats.today || 0 : 0;
  }

  function updateTest() {
    var ta = body.querySelector('textarea[data-key="sample"]');
    var res = document.getElementById('jof-ui-test');
    if (!ta || !res) return;
    var text = ta.value.trim();
    if (!text) {
      res.textContent = '—';
      return;
    }
    var r = scoring.analyze(text, { lang: settings.language, categories: effectiveCategories() });
    var threshold = config.presetThreshold(settings.preset, settings.threshold);
    var names = (r.categories || []).map(catLabel).join(' / ');
    res.textContent = r.score.toFixed(2) + '  ' + (r.score >= threshold ? '→ ' + t('hide') : '→ ' + t('show')) + '  [' + r.lang + ']' + (names ? '\n' + names : '');
  }

  function load() {
    chrome.storage.local.get([config.PERSIST_KEY, config.STATS_KEY], function (res) {
      settings = config.normalizeSettings(res[config.PERSIST_KEY] || {});
      stats = res[config.STATS_KEY] || stats;
      i18n.load(i18n.localeFor(settings.language)).then(function () {
        injectCSS();
        buildShell();
        render();
        // ショートカット(Shift+1)や他画面での変更を反映（トグル処理は content.js 側）
        try {
          chrome.storage.onChanged.addListener(function (changes, area) {
            if (area === 'local' && changes[config.PERSIST_KEY]) {
              settings = config.normalizeSettings(changes[config.PERSIST_KEY].newValue || {});
              render();
            }
          });
        } catch (e) {
          /* noop */
        }
      });
    });
  }

  if (document.body) load();
  else document.addEventListener('DOMContentLoaded', load, { once: true });
})();
