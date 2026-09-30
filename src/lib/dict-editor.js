/**
 * ユーザー辞書（ミュートワード）の編集UI部品。
 *
 * 拡張では専用ページ（src/dict.html）、ユーザースクリプトでは
 * 別ウィンドウ（about:blank）に同じUIを描画する。DOM は渡された
 * document に対して生成し、保存は渡された chrome.storage 互換APIを使う。
 * これにより popup の狭さから解放され、追加/削除がしやすい。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).dictEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CSS =
    '.jofd{--a:#e4572e;font:14px/1.6 system-ui,-apple-system,"Hiragino Kaku Gothic ProN",Meiryo,sans-serif;' +
    'color:#eee;background:#17171b;padding:14px;min-height:100vh;box-sizing:border-box}' +
    '.jofd *{box-sizing:border-box}' +
    '.jofd h1{font-size:16px;margin:0 0 4px;color:#ffb59b}' +
    '.jofd .sub{color:#9a9aa5;font-size:11px;margin:0 0 12px}' +
    '.jofd label.sw{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-weight:700;color:#ffb59b}' +
    '.jofd .add{display:flex;gap:6px;margin-bottom:10px}' +
    '.jofd input[type=text]{flex:1;min-width:0;background:#101014;color:#eee;border:1px solid #33343c;' +
    'border-radius:8px;padding:7px 9px;font:inherit}' +
    '.jofd button{padding:6px 12px;border:1px solid #33343c;border-radius:999px;background:transparent;' +
    'color:inherit;cursor:pointer;font:inherit}' +
    '.jofd button.primary{border-color:var(--a);color:#ffb59b}' +
    '.jofd button:hover{border-color:var(--a)}' +
    '.jofd ul{list-style:none;margin:0;padding:0}' +
    '.jofd li{display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid #2c2c33;' +
    'border-radius:8px;margin-bottom:5px;background:#101014}' +
    '.jofd li span{flex:1;word-break:break-all}' +
    '.jofd li button{padding:2px 8px;font-size:12px}' +
    '.jofd .empty{color:#9a9aa5;font-size:12px;padding:8px 0}' +
    '.jofd .foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;color:#9a9aa5;font-size:12px}' +
    '.jofd .hint{color:#9a9aa5;font-size:11px;margin:8px 0 0}';

  /**
   * @param {Document} doc 描画先
   * @param {Object} [chromeApi] chrome.storage 互換（既定: globalThis.chrome）
   * @returns {{render:function, focus:function}}
   */
  function createEditor(doc, chromeApi) {
    var JOF = globalThis.JOF || {};
    var config = JOF.config;
    var userdict = JOF.userdict;
    var i18n = JOF.i18n;
    var t = i18n ? i18n.t : function (k) {
      return k;
    };
    var storage = chromeApi || globalThis.chrome;

    var settings = null;

    function injectCSS() {
      var head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
      if (!head || (doc.getElementById && doc.getElementById('jof-dict-style'))) return;
      var s = doc.createElement('style');
      s.id = 'jof-dict-style';
      s.textContent = CSS;
      head.appendChild(s);
    }

    function save(done) {
      storage.storage.local.get([config.PERSIST_KEY], function (res) {
        var s = config.normalizeSettings(res[config.PERSIST_KEY] || {});
        s.userWords = settings.userWords;
        s.userWordsEnabled = settings.userWordsEnabled;
        var patch = {};
        patch[config.PERSIST_KEY] = s;
        storage.storage.local.set(patch, function () {
          if (done) done();
        });
      });
    }

    function h(tag, cls, text) {
      var e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    function addWord(value) {
      var list = userdict.parseList(String(value || ''));
      if (!list.length) return;
      var w = list[0];
      var have = settings.userWords.some(function (x) {
        return userdict.normWord(x) === userdict.normWord(w);
      });
      if (!have) settings.userWords.push(w);
      save(render);
    }

    function removeWord(w) {
      settings.userWords = settings.userWords.filter(function (x) {
        return x !== w;
      });
      save(render);
    }

    function render() {
      if (!settings) return;
      injectCSS();
      var root = (doc.getElementById && doc.getElementById('jof-dict-root')) || doc.body;
      root.className = 'jofd';
      root.textContent = '';

      root.appendChild(h('h1', null, t('userDict')));
      root.appendChild(h('p', 'sub', t('userDictHint')));

      var sw = h('label', 'sw');
      var cb = doc.createElement('input');
      cb.type = 'checkbox';
      cb.checked = settings.userWordsEnabled !== false;
      cb.addEventListener('change', function () {
        settings.userWordsEnabled = cb.checked;
        save();
      });
      sw.appendChild(cb);
      sw.appendChild(doc.createTextNode(t('userDictEnabled')));
      root.appendChild(sw);

      var add = h('div', 'add');
      var input = doc.createElement('input');
      input.type = 'text';
      input.placeholder = t('userDictPlaceholder');
      add.appendChild(input);
      var addBtn = h('button', 'primary', t('userDictAdd'));
      addBtn.type = 'button';
      addBtn.addEventListener('click', function () {
        addWord(input.value);
        input.value = '';
        input.focus();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addWord(input.value);
          input.value = '';
        }
      });
      add.appendChild(addBtn);
      root.appendChild(add);

      var list = h('ul');
      if (!settings.userWords.length) {
        root.appendChild(h('div', 'empty', t('userDictEmpty')));
      } else {
        settings.userWords.forEach(function (w) {
          var li = h('li');
          li.appendChild(h('span', null, w));
          var del = h('button', null, '✕');
          del.type = 'button';
          del.title = t('userDictDelete');
          del.addEventListener('click', function () {
            removeWord(w);
          });
          li.appendChild(del);
          list.appendChild(li);
        });
        root.appendChild(list);
      }

      var foot = h('div', 'foot');
      foot.appendChild(h('span', null, t('userDictCount', [settings.userWords.length])));
      var all = h('button', null, t('userDictAll'));
      all.type = 'button';
      all.addEventListener('click', function () {
        settings.userWords = [];
        save(render);
      });
      foot.appendChild(all);
      root.appendChild(foot);

      root.appendChild(h('p', 'hint', t('userDictNote')));
      if (input && typeof input.focus === 'function') input.focus();
    }

    function load() {
      storage.storage.local.get([config.PERSIST_KEY], function (res) {
        settings = config.normalizeSettings(res[config.PERSIST_KEY] || {});
        if (!settings.userWords) settings.userWords = [];
        var loc = i18n && i18n.localeFor ? i18n.localeFor(settings.language) : null;
        var p = i18n && i18n.load ? i18n.load(loc) : Promise.resolve();
        p.then(render);
      });
    }

    return { render: render, load: load };
  }

  return { createEditor: createEditor, CSS: CSS };
});
