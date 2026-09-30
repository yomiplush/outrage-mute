/**
 * 中国語（繁体字 / 繁體）パック。
 * 簡体字とは文字が異なるため専用の語彙が必要（例: 战争→戰爭, 说吧→說吧）。
 * LDNOOBW には繁体字リストが無いため、罵倒語(badwords)も作者作成。
 * - 照合は部分一致 / 否定は前置（不 / 沒 / 別 ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langZhHant = factory(JOF.langBuild);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build) {
  'use strict';

  var CURATED = [
    // attack
    ['白癡', 2.4, 'attack'], ['腦殘', 2.6, 'attack'], ['腦癱', 2.6, 'attack'],
    ['智障', 2.6, 'attack'], ['弱智', 2.4, 'attack'], ['傻逼', 2.8, 'attack'],
    ['蠢貨', 2.2, 'attack'], ['廢物', 2.2, 'attack'], ['垃圾', 2.0, 'attack'],
    ['人渣', 2.6, 'attack'], ['渣滓', 2.4, 'attack'], ['畜生', 2.4, 'attack'],
    ['混蛋', 2.2, 'attack'], ['王八蛋', 2.2, 'attack'], ['賤人', 2.4, 'attack'],
    ['賤貨', 2.6, 'attack'], ['雜種', 2.6, 'attack'], ['傻狗', 2.6, 'attack'],
    ['二貨', 1.8, 'attack'], ['二百五', 1.8, 'attack'], ['沒腦子', 1.8, 'attack'],
    ['無恥', 1.8, 'attack'], ['不要臉', 2.0, 'attack'], ['無知', 1.4, 'attack'],
    // hostility
    ['噁心', 1.8, 'hostility'], ['厭惡', 1.6, 'hostility'], ['憎恨', 2.0, 'hostility'],
    ['仇恨', 2.2, 'hostility'], ['可恨', 2.0, 'hostility'], ['該死', 2.4, 'hostility'],
    ['可惡', 1.8, 'hostility'], ['氣憤', 1.6, 'hostility'], ['憤怒', 1.6, 'hostility'],
    ['不可原諒', 2.2, 'hostility', 'noNeg'], ['無法原諒', 2.2, 'hostility', 'noNeg'],
    ['令人作嘔', 2.2, 'hostility'], ['令人髮指', 2.2, 'hostility'], ['忍無可忍', 2.0, 'hostility'],
    // incitement
    ['閉嘴', 2.2, 'incitement'], ['滾出去', 2.4, 'incitement'], ['去死', 3.0, 'incitement'],
    ['打死', 2.8, 'incitement'], ['封殺', 2.0, 'incitement'], ['抵制', 1.6, 'incitement'],
    ['曝光', 2.0, 'incitement'], ['人肉', 2.4, 'incitement'], ['網暴', 2.4, 'incitement'],
    ['打倒', 2.2, 'incitement'], ['舉報他', 1.8, 'incitement'],
    // absolute
    ['絕對', 0.9, 'absolute'], ['必須', 0.7, 'absolute'], ['肯定', 0.5, 'absolute'],
    ['百分百', 0.7, 'absolute'], ['毫無疑問', 0.8, 'absolute'], ['顯然', 0.5, 'absolute'],
    ['完全', 0.6, 'absolute'], ['絕不', 1.0, 'absolute'], ['從來不', 0.8, 'absolute'],
    // othering
    ['洋奴', 2.4, 'othering'], ['漢奸', 2.6, 'othering'], ['賣國賊', 2.6, 'othering'],
    ['走狗', 2.4, 'othering'], ['舔狗', 2.0, 'othering'], ['水軍', 2.0, 'othering'],
    ['五毛', 2.0, 'othering'], ['美分', 2.0, 'othering'], ['聖母', 1.6, 'othering'],
    ['鍵盤俠', 1.6, 'othering'], ['小粉紅', 2.0, 'othering'], ['戰狼', 1.6, 'othering'],
    // cynicism
    ['呵呵', 1.2, 'cynicism'], ['笑死', 1.0, 'cynicism'], ['活該', 2.0, 'cynicism'],
    ['自作自受', 1.6, 'cynicism'], ['報應', 1.6, 'cynicism'], ['就這', 1.2, 'cynicism'],
    // urgency
    ['緊急', 1.0, 'urgency'], ['速轉', 1.0, 'urgency'], ['擴散', 1.0, 'urgency'],
    ['世界末日', 1.8, 'urgency'], ['崩盤', 1.4, 'urgency'], ['經濟危機', 1.6, 'urgency'],
    ['來不及了', 1.6, 'urgency'],
    // politics
    ['選舉', 2.2, 'politics'], ['投票', 2.0, 'politics'], ['政府', 2.2, 'politics'],
    ['總統', 2.2, 'politics'], ['議會', 2.2, 'politics'], ['執政黨', 2.2, 'politics'],
    ['在野黨', 2.2, 'politics'], ['官員', 2.0, 'politics'], ['稅收', 2.0, 'politics'],
    ['政治', 2.2, 'politics'], ['政黨', 2.2, 'politics'],
    // conspiracy
    ['陰謀', 2.4, 'conspiracy'], ['陰謀論', 2.6, 'conspiracy'], ['深層政府', 2.6, 'conspiracy'],
    ['新世界秩序', 2.6, 'conspiracy'], ['共濟會', 2.6, 'conspiracy'], ['光明會', 2.6, 'conspiracy'],
    ['羅斯柴爾德', 2.6, 'conspiracy'], ['人口減少', 2.6, 'conspiracy'], ['幕後黑手', 2.4, 'conspiracy'],
    ['信息操控', 2.2, 'conspiracy'], ['假新聞', 2.0, 'conspiracy'],
    // ai_dispute
    ['人工智能', 2.2, 'ai_dispute'], ['生成式ai', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
    ['openai', 2.2, 'ai_dispute'], ['深度偽造', 2.2, 'ai_dispute'], ['通用人工智能', 2.4, 'ai_dispute'],
    ['奇點', 2.4, 'ai_dispute'], ['ai威脅', 2.6, 'ai_dispute'], ['ai失業', 2.6, 'ai_dispute'],
    ['ai取代', 2.6, 'ai_dispute'],
    // world_affairs
    ['戰爭', 2.4, 'world_affairs'], ['開戰', 2.6, 'world_affairs'], ['入侵', 2.4, 'world_affairs'],
    ['空襲', 2.6, 'world_affairs'], ['轟炸', 2.6, 'world_affairs'], ['導彈', 2.2, 'world_affairs'],
    ['核戰爭', 2.8, 'world_affairs'], ['種族滅絕', 2.6, 'world_affairs'], ['屠殺', 2.6, 'world_affairs'],
    ['恐怖襲擊', 2.6, 'world_affairs'], ['恐怖分子', 2.4, 'world_affairs'], ['槍擊', 2.4, 'world_affairs'],
    ['地震', 2.0, 'world_affairs'], ['海嘯', 2.4, 'world_affairs'], ['疫情', 2.0, 'world_affairs'],
    ['政變', 2.6, 'world_affairs'], ['戒嚴', 2.6, 'world_affairs'], ['難民', 2.0, 'world_affairs']
  ];

  // 繁体字の罵倒語（作者作成, MIT）
  var BAD = [
    ['幹你娘', 2.8, 'badwords'], ['操你媽', 2.8, 'badwords'], ['他媽的', 2.4, 'badwords'],
    ['傻屄', 2.8, 'badwords'], ['婊子', 2.6, 'badwords'], ['妓女', 2.4, 'badwords'],
    ['雜種', 2.6, 'badwords'], ['廢物', 2.2, 'badwords'], ['白癡', 2.4, 'badwords'],
    ['智障', 2.6, 'badwords'], ['腦殘', 2.6, 'badwords'], ['混蛋', 2.2, 'badwords'],
    ['靠北', 2.0, 'badwords'], ['雞巴', 2.6, 'badwords'], ['屌', 1.8, 'badwords'],
    ['屄', 2.6, 'badwords'], ['幹', 1.8, 'badwords'], ['肏', 2.8, 'badwords'],
    ['三小', 1.8, 'badwords'], ['白爛', 1.8, 'badwords'], ['死開', 2.4, 'badwords'],
    ['滾', 2.0, 'badwords'], ['王八蛋', 2.2, 'badwords'], ['賤貨', 2.6, 'badwords'],
    ['狗東西', 2.4, 'badwords'], ['畜生', 2.4, 'badwords']
  ];

  var lex = build.build(CURATED.concat(BAD), { match: 'substring' });

  return {
    id: 'zh_hant',
    name: '中文（繁體）',
    match: 'substring',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'char',
      markers: ['不', '沒', '沒有', '別', '無', '未', '非', '莫', '甭', '不是']
    },
    report: ['說', '表示', '報導', '稱', '據說', '據稱'],
    quoteChars: { open: '「『“"', close: '」』”"' },
    emphasis: { caps: false }
  };
});
