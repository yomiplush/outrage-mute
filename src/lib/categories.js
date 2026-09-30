/**
 * カテゴリの単一の定義元。
 * id -> 既定ラベル（日本語）。UI では i18n の cat_<id> があればそちらを使う。
 *
 * カテゴリは「言語をまたいで共通」で、各言語パックが同じ id に語を割り当てる。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).categories = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CATEGORY_LABELS = {
    attack: '攻撃・侮蔑',
    hostility: '憎悪・敵意',
    incitement: '煽り・呼びかけ',
    absolute: '断定・絶対化',
    othering: '二項対立・レッテル',
    cynicism: '冷笑・皮肉',
    urgency: '危機煽り',
    tone: '文体・口調',
    selfmock: '自虐・自己卑下',
    profanity: '差別・蔑称語',
    badwords: '下品・罵倒語',
    amplifier: '感情誇張',
    politics: '政治',
    conspiracy: '陰謀論',
    ai_dispute: 'AI論争',
    ai_topic: 'AI技術・界隈',
    world_affairs: '世界情勢・戦争',
    disaster: '災害・緊急情報'
  };

  var CATEGORY_ORDER = [
    'attack',
    'profanity',
    'hostility',
    'incitement',
    'othering',
    'absolute',
    'urgency',
    'cynicism',
    'tone',
    'selfmock',
    'amplifier',
    'politics',
    'conspiracy',
    'ai_dispute',
    'ai_topic',
    'world_affairs',
    'disaster',
    'badwords'
  ];

  return { CATEGORY_LABELS: CATEGORY_LABELS, CATEGORY_ORDER: CATEGORY_ORDER };
});
