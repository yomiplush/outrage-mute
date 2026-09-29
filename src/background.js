/**
 * service worker: 既定設定の初期化、統計カウント、バッジ表示。
 * 判定そのものは content script 側で完結する（このファイルは通信しない）。
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

chrome.runtime.onInstalled.addListener(initStorage);
chrome.runtime.onStartup.addListener(initStorage);

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'jof:masked') return;
  chrome.storage.local.get([CONFIG.STATS_KEY], (res) => {
    const stats = res[CONFIG.STATS_KEY] || { masked: 0, today: 0, date: todayStr() };
    if (stats.date !== todayStr()) {
      stats.date = todayStr();
      stats.today = 0;
    }
    stats.masked = (stats.masked || 0) + 1;
    stats.today = (stats.today || 0) + 1;
    chrome.storage.local.set({ [CONFIG.STATS_KEY]: stats }, refreshBadge);
  });
});
