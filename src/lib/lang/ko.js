/**
 * 韓国語パック。
 * - 罵倒語: LDNOOBW ko（CC-BY-4.0）→ badwords（既定OFF）
 * - 義憤・話題: 作者作成（MIT）
 * - 照合は部分一致（ハングルは分かち書きが曖昧）
 * - 否定は前置（못 / 아니 / 없 ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'), require('./data/ldnoobw.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langKo = factory(JOF.langBuild, JOF.ldnoobw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build, ldnoobw) {
  'use strict';

  var CURATED = [
    // attack
    ['병신', 2.8, 'attack'], ['개새끼', 2.8, 'attack'], ['멍청이', 2.0, 'attack'],
    ['바보', 1.6, 'attack'], ['머저리', 2.0, 'attack'], ['쓰레기', 2.2, 'attack'],
    ['인간쓰레기', 2.8, 'attack'], ['한심하다', 1.8, 'attack'], ['무능', 1.8, 'attack'],
    ['쓸모없다', 1.8, 'attack'], ['저능아', 2.6, 'attack'], ['정신병자', 2.4, 'attack'],
    ['미친놈', 2.4, 'attack'], ['돌아이', 2.2, 'attack'], ['벌레', 2.0, 'attack'],
    ['기생충', 2.2, 'attack'], ['사기꾼', 2.0, 'attack'], ['거짓말쟁이', 1.6, 'attack'],
    // hostility
    ['혐오', 2.0, 'hostility'], ['증오', 2.2, 'hostility'], ['분노', 1.6, 'hostility'],
    ['짜증', 1.4, 'hostility'], ['역겹다', 2.0, 'hostility'], ['구역질', 2.0, 'hostility'],
    ['용서할 수 없다', 2.2, 'hostility', 'noNeg'], ['용서 못해', 2.2, 'hostility', 'noNeg'],
    ['화난다', 1.4, 'hostility'],
    // incitement
    ['닥쳐', 2.4, 'incitement'], ['꺼져', 2.4, 'incitement'], ['죽어', 3.0, 'incitement'],
    ['신고해', 1.6, 'incitement'], ['고발', 1.8, 'incitement'], ['차단', 1.6, 'incitement'],
    ['불매', 1.6, 'incitement'], ['사과해', 1.8, 'incitement'], ['사퇴해', 1.8, 'incitement'],
    // absolute
    ['절대', 0.9, 'absolute'], ['반드시', 0.6, 'absolute'], ['무조건', 0.7, 'absolute'],
    ['절대로', 0.9, 'absolute'], ['전혀', 0.6, 'absolute'],
    // othering
    ['빨갱이', 2.4, 'othering'], ['매국노', 2.6, 'othering'], ['토착왜구', 2.6, 'othering'],
    ['일베', 1.8, 'othering'], ['한남', 1.8, 'othering'], ['김치녀', 2.2, 'othering'],
    ['틀딱', 1.8, 'othering'], ['페미', 1.6, 'othering'],
    // cynicism
    ['꼴좋다', 2.0, 'cynicism'], ['자업자득', 1.6, 'cynicism'], ['인과응보', 1.6, 'cynicism'],
    // urgency
    ['긴급', 1.0, 'urgency'], ['속보', 0.8, 'urgency'], ['확산', 1.0, 'urgency'],
    ['공유해', 1.0, 'urgency'], ['세계 종말', 1.8, 'urgency'], ['망한다', 1.4, 'urgency'],
    // politics
    ['선거', 2.2, 'politics'], ['투표', 2.0, 'politics'], ['정부', 2.2, 'politics'],
    ['대통령', 2.2, 'politics'], ['국회', 2.2, 'politics'], ['정치', 2.2, 'politics'],
    ['정당', 2.2, 'politics'], ['여당', 2.2, 'politics'], ['야당', 2.2, 'politics'],
    ['세금', 2.0, 'politics'], ['이민', 2.0, 'politics'],
    // conspiracy
    ['음모', 2.4, 'conspiracy'], ['음모론', 2.6, 'conspiracy'], ['딥스테이트', 2.6, 'conspiracy'],
    ['세계정부', 2.6, 'conspiracy'], ['프리메이슨', 2.6, 'conspiracy'], ['일루미나티', 2.6, 'conspiracy'],
    ['신세계질서', 2.6, 'conspiracy'], ['가짜뉴스', 2.0, 'conspiracy'],
    // ai_dispute
    ['인공지능', 2.2, 'ai_dispute'], ['생성ai', 2.2, 'ai_dispute'], ['챗gpt', 2.2, 'ai_dispute'],
    ['오픈ai', 2.2, 'ai_dispute'], ['특이점', 2.4, 'ai_dispute'], ['ai위협', 2.6, 'ai_dispute'],
    ['ai실업', 2.6, 'ai_dispute'],
    // world_affairs
    ['전쟁', 2.4, 'world_affairs'], ['침공', 2.4, 'world_affairs'], ['공습', 2.6, 'world_affairs'],
    ['폭격', 2.6, 'world_affairs'], ['미사일', 2.2, 'world_affairs'], ['핵전쟁', 2.8, 'world_affairs'],
    ['학살', 2.6, 'world_affairs'], ['테러', 2.4, 'world_affairs'], ['지진', 2.0, 'world_affairs'],
    ['쓰나미', 2.4, 'world_affairs'], ['팬데믹', 2.2, 'world_affairs'], ['쿠데타', 2.6, 'world_affairs'],
    ['계엄', 2.6, 'world_affairs'], ['난민', 2.0, 'world_affairs']
  ];

  var BAD = (ldnoobw.ko || []).map(function (w) {
    return [w, 2.4, 'badwords'];
  });

  var lex = build.build(BAD.concat(CURATED), { match: 'substring' });

  return {
    id: 'ko',
    name: '한국어',
    match: 'substring',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'char',
      markers: ['못', '아니', '아닌', '없', '말라', '말아', '하지마', '하지 마']
    },
    report: ['라고', '라는', '말했다', '전했다', '보도', '라며'],
    quoteChars: { open: '「『“"', close: '」』”"' },
    emphasis: { caps: false }
  };
});
