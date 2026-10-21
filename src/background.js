/**
 * service worker: 既定設定の初期化、統計カウント、バッジ表示、
 * UI 文言テーブルの配信。
 *
 * 判定そのものは content script 側で完結する（このファイルは外部と通信しない）。
 * `_locales/*` の読み出しだけをここで行うのは、content script に
 * web_accessible_resources を追加せずに済ませるため（最小権限）。
 */
importScripts('lib/config.js');

const CONFIG = self.JOF.config;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function initStorage() {
  chrome.storage.local.get([CONFIG.PERSIST_KEY, CONFIG.STATS_KEY], (res) => {
    const patch = {};
    if (!res[CONFIG.PERSIST_KEY]) patch[CONFIG.PERSIST_KEY] = CONFIG.DEFAULTS;
    if (!res[CONFIG.STATS_KEY]) {
      patch[CONFIG.STATS_KEY] = { masked: 0, today: 0, date: todayStr() };
    }
    if (Object.keys(patch).length) chrome.storage.local.set(patch);
    refreshBadge();
  });
}

function refreshBadge() {
  chrome.storage.local.get([CONFIG.STATS_KEY, CONFIG.PERSIST_KEY], (res) => {
    const stats = res[CONFIG.STATS_KEY] || { today: 0, date: todayStr() };
    const settings = res[CONFIG.PERSIST_KEY] || CONFIG.DEFAULTS;
    const today = stats.date === todayStr() ? stats.today || 0 : 0;
    if (!settings.enabled) {
      chrome.action.setBadgeText({ text: 'off' });
      chrome.action.setBadgeBackgroundColor({ color: '#888888' });
    } else {
      chrome.action.setBadgeText({ text: today ? String(Math.min(today, 999)) : '' });
      chrome.action.setBadgeBackgroundColor({ color: '#E4572E' });
    }
  });
}

// ---------------------------------------------------------------- 統計
function addMasked(count) {
  // content script は一定時間ぶんをまとめて送る（count）。単発なら 1 件。
  const n = Math.max(1, Number(count) || 1);
  chrome.storage.local.get([CONFIG.STATS_KEY], (res) => {
    const stats = res[CONFIG.STATS_KEY] || { masked: 0, today: 0, date: todayStr() };
    if (stats.date !== todayStr()) {
      stats.date = todayStr();
      stats.today = 0;
    }
    stats.masked = (stats.masked || 0) + n;
    stats.today = (stats.today || 0) + n;
    chrome.storage.local.set({ [CONFIG.STATS_KEY]: stats }, refreshBadge);
  });
}

// ---------------------------------------------------------------- UI 文言
// content script から `_locales/<locale>/messages.json` を直接 fetch すると
// web_accessible_resources に拡張資産を公開する必要がある。それはページ側から
// 拡張の存在・バージョンを推測できる入口になるので、拡張オリジン側で読んで
// メッセージで渡す（読み出しのみ・キャッシュあり）。
const LOCALE_RE = /^[A-Za-z][A-Za-z0-9_]{1,15}$/;
const localeCache = new Map();

function localeTable(locale) {
  const cached = localeCache.get(locale);
  if (cached) return cached;
  const job = (async () => {
    try {
      const res = await fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`));
      if (!res.ok) return {};
      const json = await res.json();
      const out = {};
      for (const key of Object.keys(json)) {
        if (json[key] && typeof json[key].message === 'string') out[key] = json[key].message;
      }
      return out;
    } catch (e) {
      return {};
    }
  })();
  localeCache.set(locale, job);
  return job;
}

function answerI18n(msg, sendResponse) {
  const asked = Array.isArray(msg.locales) ? msg.locales : [];
  const wanted = asked
    .filter((locale) => typeof locale === 'string' && LOCALE_RE.test(locale))
    .slice(0, 8);
  const tables = {};
  Promise.all(wanted.map(async (locale) => {
    tables[locale] = await localeTable(locale);
  })).then(() => sendResponse({ tables }));
}

chrome.runtime.onInstalled.addListener(initStorage);
chrome.runtime.onStartup.addListener(initStorage);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type === 'jof:i18n') {
    answerI18n(msg, sendResponse);
    return true; // 非同期で応答する
  }
  if (msg.type === 'jof:masked') {
    addMasked(msg.count);
  }
});
