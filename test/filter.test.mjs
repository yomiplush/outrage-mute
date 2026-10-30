import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const config = require('../src/lib/config.js');
const filter = require('../src/lib/filter.js');
const settings = (overrides = {}) => config.normalizeSettings(overrides);

test('score preview applies preset categories over individual categories', () => {
  const text = '首相が増税を決めた';
  assert.equal(filter.score(text, settings({ categories: [] })).muted, false);
  assert.equal(filter.score(text, settings({ preset: 'normal', categories: [] })).muted, true);
  assert.equal(filter.score(text, settings({ preset: 'soft', categories: ['politics'] })).muted, false);
});

test('score preview uses the effective preset threshold, including equality', () => {
  const text = 'あいつは本当に無能だ';
  const result = filter.score(text, settings({ threshold: 0.9, preset: 'hard' }));
  assert.ok(result.result.score >= 0.4 && result.result.score < 0.9);
  assert.equal(result.muted, true);
  const exact = filter.score(text, settings({ threshold: result.result.score }));
  assert.equal(exact.muted, true);
});

test('language mute precedes self/reply/short exclusions and forces complete hiding', () => {
  const decision = filter.evaluate('こんにちは', settings({ muteLang: 'ja', minLength: 100, excludeReplies: true }), {
    isOwn() { throw new Error('self lookup should be skipped'); },
    isReply() { throw new Error('reply lookup should be skipped'); }
  });
  assert.equal(decision.state, 'masked');
  assert.equal(decision.result.reason, 'lang');
  assert.equal(decision.forceHide, true);
});

test('disabled filtering bypasses all rules', () => {
  assert.equal(filter.evaluate('死ね', settings({ enabled: false, muteLang: 'ja' })).state, 'clear');
});

test('self and reply exclusions precede focus mode and dictionary', () => {
  const s = settings({ preset: 'hard', focusMaxLength: 1, excludeReplies: true, userWords: ['死ね'] });
  assert.equal(filter.evaluate('死ね', s, { isOwn: () => true }).state, 'self');
  assert.equal(filter.evaluate('死ね', s, { isReply: () => true }).state, 'reply-skip');
  assert.equal(filter.evaluate('死ね', settings({ ...s, excludeSelf: false }), { isOwn: () => true }).result.reason, 'long');
});

test('empty and short text bypasses focus mode and dictionary', () => {
  assert.equal(filter.evaluate('', settings()).state, 'short');
  assert.equal(filter.evaluate('死ね', settings({ minLength: 3, preset: 'hard', focusMaxLength: 1, userWords: ['死ね'] })).state, 'short');
});

test('focus length uses combined text and strictly greater than the limit', () => {
  const s = settings({ preset: 'normal', focusMaxLength: 5 });
  assert.equal(filter.evaluate('abcde', s).state, 'clear');
  const decision = filter.evaluate('ab\ncde', s);
  assert.equal(decision.result.reason, 'long');
  assert.equal(decision.result.length, 6);
  assert.equal(filter.evaluate('abcdef', settings({ focusMaxLength: 5 })).state, 'clear');
});

test('focus reply hiding is optional and checks reply metadata only once', () => {
  let calls = 0;
  const context = { isReply: () => { calls++; return false; } };
  filter.evaluate('hello', settings({ preset: 'normal', excludeReplies: true }), context);
  assert.equal(calls, 1);
  assert.equal(filter.evaluate('hello', settings({ preset: 'normal' }), { isReply: () => true }).result.reason, 'reply');
  assert.equal(filter.evaluate('hello', settings({ preset: 'normal', focusHideReplies: false }), { isReply: () => true }).state, 'clear');
});

test('dictionary matches normalized text before scoring and respects its toggle', () => {
  const decision = filter.evaluate('ＣＡＴ', settings({ userWords: ['cat'] }));
  assert.equal(decision.result.reason, 'user');
  assert.equal(decision.result.word, 'cat');
  assert.equal(filter.evaluate('ＣＡＴ', settings({ userWords: ['cat'], userWordsEnabled: false })).state, 'clear');
});

test('score rules preserve detailed results for masking and clear neutral text', () => {
  const decision = filter.evaluate('死ね', settings());
  assert.equal(decision.state, 'masked');
  assert.ok(decision.result.score > 0.7);
  assert.ok(decision.result.terms.length > 0);
  assert.equal(filter.evaluate('今日はいい天気', settings()).state, 'clear');
});
