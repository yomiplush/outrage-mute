/**
 * ユーザー辞書ページ（別ウィンドウ）のブートストラップ。
 * 実体は dict-editor.js（ユーザースクリプトと共通）。
 */
(function () {
  'use strict';
  var JOF = globalThis.JOF;
  if (!JOF || !JOF.dictEditor) return;

  var editor = JOF.dictEditor.createEditor(document, chrome);
  editor.load();

  // ポップアップ等で設定が変わったら追従
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local' && changes[JOF.config.PERSIST_KEY]) editor.load();
    });
  } catch (e) {
    /* noop */
  }
})();
