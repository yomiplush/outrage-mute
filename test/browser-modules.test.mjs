import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

// Execute the actual browser entry-point dependencies without CommonJS globals.
for (const entry of ['content', 'popup']) {
  test(`${entry} script order exposes working shared filter rules`, () => {
    const paths = entry === 'content'
      ? JSON.parse(read('manifest.json')).content_scripts[0].js.filter((p) => p !== 'src/content.js')
      : [...read('src/popup.html').matchAll(/<script src="([^"]+)"><\/script>/g)]
          .map((m) => 'src/' + m[1]).filter((p) => p !== 'src/popup.js');
    const browser = vm.createContext({});
    for (const path of paths) vm.runInContext(read(path), browser, { filename: path });
    const result = vm.runInContext(`(() => {
      const s = JOF.config.normalizeSettings({preset: 'normal', categories: []});
      const preview = JOF.filter.score('首相が増税を決めた', s);
      return {muted: preview.muted, score: preview.result.score};
    })()`, browser);
    assert.equal(result.muted, true);
    assert.ok(result.score >= 0.5);
    if (entry === 'content') {
      assert.equal(vm.runInContext(`JOF.filter.evaluate('ＣＡＴ', JOF.config.normalizeSettings({userWords: ['cat']})).result.reason`, browser), 'user');
    }
  });
}
