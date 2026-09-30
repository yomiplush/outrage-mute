/**
 * ユーザースクリプト向け chrome.* シム。
 *
 * 拡張の content.js は chrome.storage / chrome.runtime を使うため、
 * Userscripts（iOS Safari）等のユーザースクリプト環境では
 * localStorage ベースの同等実装を差し込む。これにより content.js を
 * そのまま流用できる（拡張とユーザースクリプトで判定ロジックが二重化しない）。
 */
(function () {
  'use strict';
  if (typeof globalThis.chrome !== 'undefined' && globalThis.chrome.storage) return;

  var STORE_KEY = 'jof:store';
  var listeners = [];

  function readAll() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(obj) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    } catch (e) {
      /* noop */
    }
  }

  function get(keys, cb) {
    var list = Array.isArray(keys) ? keys : [keys];
    var store = readAll();
    var out = {};
    list.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(store, k)) out[k] = store[k];
    });
    setTimeout(function () {
      cb(out);
    }, 0);
  }

  function set(obj, cb) {
    var store = readAll();
    var changes = {};
    Object.keys(obj).forEach(function (k) {
      changes[k] = { oldValue: store[k], newValue: obj[k] };
      store[k] = obj[k];
    });
    writeAll(store);
    setTimeout(function () {
      listeners.forEach(function (fn) {
        try {
          fn(changes, 'local');
        } catch (e) {
          /* noop */
        }
      });
      if (cb) cb();
    }, 0);
  }

  function uiLocale() {
    var lang = (navigator.language || 'ja').replace('-', '_');
    var L = globalThis.JOF && globalThis.JOF.locales;
    if (L) {
      if (L[lang]) return lang;
      var base = lang.split('_')[0];
      if (L[base]) return base;
      if (L.en) return 'en';
    }
    return 'ja';
  }

  globalThis.chrome = {
    storage: {
      local: { get: get, set: set },
      onChanged: {
        addListener: function (fn) {
          listeners.push(fn);
        }
      }
    },
    runtime: {
      lastError: null,
      getURL: function () {
        return null;
      },
      sendMessage: function (msg, cb) {
        // background.js 相当（統計の加算）
        if (msg && msg.type === 'jof:masked') {
          var store = readAll();
          var s = store.jofStats || { masked: 0, today: 0, date: '' };
          var today = new Date().toISOString().slice(0, 10);
          if (s.date !== today) {
            s.date = today;
            s.today = 0;
          }
          s.masked = (s.masked || 0) + 1;
          s.today = (s.today || 0) + 1;
          var patch = {};
          patch.jofStats = s;
          set(patch, null);
        }
        if (cb) setTimeout(cb, 0);
      }
    },
    i18n: {
      // ブラウザの言語で同梱ロケールを引く（fetch できないため）
      getMessage: function (key) {
        var L = globalThis.JOF && globalThis.JOF.locales;
        if (L) {
          var t = L[uiLocale()];
          if (t && t[key]) return t[key];
          if (L.en && L.en[key]) return L.en[key];
        }
        return '';
      },
      getUILanguage: function () {
        return navigator.language || 'ja';
      }
    }
  };
})();
