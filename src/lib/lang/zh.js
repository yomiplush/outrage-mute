/**
 * 中国語（簡体）パック。
 * - 罵倒語: LDNOOBW zh（CC-BY-4.0）→ badwords（既定OFF）
 * - 義憤・話題: 作者作成（MIT）
 * - 照合は部分一致（分かち書きしない）
 * - 否定は前置（不 / 没 / 别 / 无 ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'), require('./data/ldnoobw.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langZh = factory(JOF.langBuild, JOF.ldnoobw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build, ldnoobw) {
  'use strict';

  var CURATED = [
    // attack
    ['白痴', 2.4, 'attack'], ['脑残', 2.6, 'attack'], ['脑瘫', 2.6, 'attack'],
    ['智障', 2.6, 'attack'], ['弱智', 2.4, 'attack'], ['傻逼', 2.8, 'attack'],
    ['蠢货', 2.2, 'attack'], ['废物', 2.2, 'attack'], ['垃圾', 2.0, 'attack'],
    ['人渣', 2.6, 'attack'], ['渣滓', 2.4, 'attack'], ['畜生', 2.4, 'attack'],
    ['混蛋', 2.2, 'attack'], ['王八蛋', 2.2, 'attack'], ['贱人', 2.4, 'attack'],
    ['贱货', 2.6, 'attack'], ['杂种', 2.6, 'attack'], ['傻狗', 2.6, 'attack'],
    ['二货', 1.8, 'attack'], ['二百五', 1.8, 'attack'], ['没脑子', 1.8, 'attack'],
    ['无耻', 1.8, 'attack'], ['不要脸', 2.0, 'attack'], ['无知', 1.4, 'attack'],
    // hostility
    ['恶心', 1.8, 'hostility'], ['厌恶', 1.6, 'hostility'], ['憎恨', 2.0, 'hostility'],
    ['仇恨', 2.2, 'hostility'], ['可恨', 2.0, 'hostility'], ['该死', 2.4, 'hostility'],
    ['可恶', 1.8, 'hostility'], ['气愤', 1.6, 'hostility'], ['愤怒', 1.6, 'hostility'],
    ['不可原谅', 2.2, 'hostility', 'noNeg'], ['无法原谅', 2.2, 'hostility', 'noNeg'],
    ['令人作呕', 2.2, 'hostility'], ['令人发指', 2.2, 'hostility'], ['忍无可忍', 2.0, 'hostility'],
    // incitement
    ['闭嘴', 2.2, 'incitement'], ['滚出去', 2.4, 'incitement'], ['去死', 3.0, 'incitement'],
    ['打死', 2.8, 'incitement'], ['封杀', 2.0, 'incitement'], ['抵制', 1.6, 'incitement'],
    ['曝光', 2.0, 'incitement'], ['人肉', 2.4, 'incitement'], ['网暴', 2.4, 'incitement'],
    ['打倒', 2.2, 'incitement'], ['举报他', 1.8, 'incitement'],
    // absolute
    ['绝对', 0.9, 'absolute'], ['必须', 0.7, 'absolute'], ['肯定', 0.5, 'absolute'],
    ['百分百', 0.7, 'absolute'], ['毫无疑问', 0.8, 'absolute'], ['显然', 0.5, 'absolute'],
    ['完全', 0.6, 'absolute'], ['绝不', 1.0, 'absolute'], ['从来不', 0.8, 'absolute'],
    // othering
    ['洋奴', 2.4, 'othering'], ['汉奸', 2.6, 'othering'], ['卖国贼', 2.6, 'othering'],
    ['走狗', 2.4, 'othering'], ['舔狗', 2.0, 'othering'], ['水军', 2.0, 'othering'],
    ['五毛', 2.0, 'othering'], ['美分', 2.0, 'othering'], ['圣母', 1.6, 'othering'],
    ['键盘侠', 1.6, 'othering'], ['小粉红', 2.0, 'othering'], ['战狼', 1.6, 'othering'],
    // cynicism
    ['呵呵', 1.2, 'cynicism'], ['笑死', 1.0, 'cynicism'], ['活该', 2.0, 'cynicism'],
    ['自作自受', 1.6, 'cynicism'], ['报应', 1.6, 'cynicism'], ['就这', 1.2, 'cynicism'],
    // urgency
    ['紧急', 1.0, 'urgency'], ['速转', 1.0, 'urgency'], ['扩散', 1.0, 'urgency'],
    ['世界末日', 1.8, 'urgency'], ['崩盘', 1.4, 'urgency'], ['经济危机', 1.6, 'urgency'],
    ['来不及了', 1.6, 'urgency'],
    // politics
    ['选举', 2.2, 'politics'], ['投票', 2.0, 'politics'], ['政府', 2.2, 'politics'],
    ['总统', 2.2, 'politics'], ['议会', 2.2, 'politics'], ['执政党', 2.2, 'politics'],
    ['在野党', 2.2, 'politics'], ['官员', 2.0, 'politics'], ['税收', 2.0, 'politics'],
    ['政治', 2.2, 'politics'], ['政党', 2.2, 'politics'],
    // conspiracy
    ['阴谋', 2.4, 'conspiracy'], ['阴谋论', 2.6, 'conspiracy'], ['深层政府', 2.6, 'conspiracy'],
    ['新世界秩序', 2.6, 'conspiracy'], ['共济会', 2.6, 'conspiracy'], ['光明会', 2.6, 'conspiracy'],
    ['罗斯柴尔德', 2.6, 'conspiracy'], ['人口减少', 2.6, 'conspiracy'], ['幕后黑手', 2.4, 'conspiracy'],
    ['信息操控', 2.2, 'conspiracy'], ['假新闻', 2.0, 'conspiracy'],
    // ai_dispute
    ['人工智能', 2.2, 'ai_dispute'], ['生成式ai', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
    ['openai', 2.2, 'ai_dispute'], ['深度伪造', 2.2, 'ai_dispute'], ['通用人工智能', 2.4, 'ai_dispute'],
    ['奇点', 2.4, 'ai_dispute'], ['ai威胁', 2.6, 'ai_dispute'], ['ai失业', 2.6, 'ai_dispute'],
    ['ai取代', 2.6, 'ai_dispute'],
    // world_affairs
    ['战争', 2.4, 'world_affairs'], ['开战', 2.6, 'world_affairs'], ['入侵', 2.4, 'world_affairs'],
    ['空袭', 2.6, 'world_affairs'], ['轰炸', 2.6, 'world_affairs'], ['导弹', 2.2, 'world_affairs'],
    ['核战争', 2.8, 'world_affairs'], ['种族灭绝', 2.6, 'world_affairs'], ['屠杀', 2.6, 'world_affairs'],
    ['恐怖袭击', 2.6, 'world_affairs'], ['恐怖分子', 2.4, 'world_affairs'], ['枪击', 2.4, 'world_affairs'],
    ['地震', 2.0, 'world_affairs'], ['海啸', 2.4, 'world_affairs'], ['疫情', 2.0, 'world_affairs'],
    ['政变', 2.6, 'world_affairs'], ['戒严', 2.6, 'world_affairs'], ['难民', 2.0, 'world_affairs']
  ];

  var BAD = (ldnoobw.zh || []).map(function (w) {
    return [w, 2.4, 'badwords'];
  });

  var lex = build.build(BAD.concat(CURATED), { match: 'substring' });

  return {
    id: 'zh',
    name: '中文（简体）',
    match: 'substring',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'char',
      markers: ['不', '没', '没有', '别', '无', '未', '非', '莫', '甭', '不是']
    },
    report: ['说', '表示', '报道', '称', '据说', '据称'],
    quoteChars: { open: '「『“"', close: '」』”"' },
    emphasis: { caps: false }
  };
});
