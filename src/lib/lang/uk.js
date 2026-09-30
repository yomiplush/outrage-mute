/**
 * ウクライナ語パック。
 * LDNOOBW に uk が無いため、義憤・話題語は作者作成（MIT）。
 * - 照合は単語境界 / 否定は前置（не / ні / немає ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langUk = factory(JOF.langBuild);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build) {
  'use strict';

  var CURATED = [
    // attack
    ['дурень', 1.8, 'attack'], ['ідіот', 2.0, 'attack'], ['дебіл', 2.4, 'attack'],
    ['кретин', 2.2, 'attack'], ['тупий', 1.8, 'attack'], ['придурок', 2.2, 'attack'],
    ['мудак', 2.6, 'attack'], ['козел', 2.2, 'attack'], ['виродок', 2.6, 'attack'],
    ['покидьок', 2.6, 'attack'], ['мразь', 2.8, 'attack'], ['гнида', 2.8, 'attack'],
    ['тварюка', 2.6, 'attack'], ['свиня', 1.8, 'attack'], ['щур', 2.0, 'attack'],
    ['паразит', 2.0, 'attack'], ['нікчема', 2.2, 'attack'], ['лох', 1.8, 'attack'],
    ['чмо', 2.6, 'attack'], ['мерзотник', 2.2, 'attack'],
    // hostility
    ['ненавиджу', 2.0, 'hostility'], ['ненависть', 2.0, 'hostility'], ['огида', 1.8, 'hostility'],
    ['огидно', 2.0, 'hostility'], ['мерзота', 2.0, 'hostility'], ['гидно', 1.8, 'hostility'],
    ['дратує', 1.6, 'hostility'], ['лють', 1.6, 'hostility'], ['гнів', 1.6, 'hostility'],
    ['обурення', 1.6, 'hostility'], ['обурливо', 1.8, 'hostility'], ['ганьба', 1.6, 'hostility'],
    ['неприйнятно', 1.6, 'hostility'], ['непрощенно', 2.2, 'hostility', 'noNeg'],
    // incitement
    ['заткнись', 2.4, 'incitement'], ['іди геть', 2.4, 'incitement'], ['здохни', 3.0, 'incitement'],
    ['убей', 2.8, 'incitement'], ['бойкот', 1.6, 'incitement'], ['цькування', 2.2, 'incitement'],
    ['викрий', 2.0, 'incitement'], ['покарай', 1.8, 'incitement'],
    // absolute
    ['абсолютно', 0.9, 'absolute'], ["обов'язково", 0.6, 'absolute'], ['безумовно', 0.7, 'absolute'],
    ['очевидно', 0.5, 'absolute'], ['ніколи', 0.6, 'absolute'], ['завжди', 0.5, 'absolute'],
    // othering
    ['зрадник', 2.4, 'othering'], ['ватник', 2.2, 'othering'], ['рашист', 2.4, 'othering'],
    ['москаль', 2.4, 'othering'], ['сепаратист', 2.2, 'othering'], ['кацап', 2.6, 'othering'],
    ['запроданці', 2.2, 'othering'], ['порохобот', 2.0, 'othering'], ['зелебобік', 2.0, 'othering'],
    // cynicism
    ['так тобі й треба', 2.0, 'cynicism'], ['піділом', 1.8, 'cynicism'], ['ну-ну', 1.2, 'cynicism'],
    // urgency
    ['терміново', 1.0, 'urgency'], ['поширити', 1.0, 'urgency'], ['кінець світу', 1.8, 'urgency'],
    ['криза', 1.2, 'urgency'], ['обвал', 1.4, 'urgency'],
    // politics
    ['вибори', 2.2, 'politics'], ['голосування', 2.0, 'politics'], ['уряд', 2.2, 'politics'],
    ['президент', 2.2, 'politics'], ['парламент', 2.2, 'politics'], ['політика', 2.2, 'politics'],
    ['податки', 2.0, 'politics'], ['імміграція', 2.0, 'politics'], ['депутат', 2.0, 'politics'],
    // conspiracy
    ['змова', 2.4, 'conspiracy'], ['теорія змови', 2.6, 'conspiracy'], ['глибинна держава', 2.6, 'conspiracy'],
    ['світовий уряд', 2.6, 'conspiracy'], ['масони', 2.6, 'conspiracy'], ['ілюмінати', 2.6, 'conspiracy'],
    ['новий світовий порядок', 2.6, 'conspiracy'], ['чіпування', 2.4, 'conspiracy'], ['фейк', 2.0, 'conspiracy'],
    // ai_dispute
    ['штучний інтелект', 2.2, 'ai_dispute'], ['нейромережа', 2.0, 'ai_dispute'],
    ['сингулярність', 2.4, 'ai_dispute'], ['чатгпт', 2.2, 'ai_dispute'], ['openai', 2.2, 'ai_dispute'],
    ['діпфейк', 2.2, 'ai_dispute'], ['ші загроза', 2.6, 'ai_dispute'], ['ші замінить', 2.6, 'ai_dispute'],
    // world_affairs
    ['війна', 2.2, 'world_affairs'], ['вторгнення', 2.4, 'world_affairs'], ['авіаудар', 2.6, 'world_affairs'],
    ['бомбардування', 2.6, 'world_affairs'], ['ракета', 2.2, 'world_affairs'], ['ядерна війна', 2.8, 'world_affairs'],
    ['геноцид', 2.6, 'world_affairs'], ['різанина', 2.6, 'world_affairs'], ['теракт', 2.4, 'world_affairs'],
    ['стрілянина', 2.4, 'world_affairs'], ['вбивство', 2.4, 'world_affairs'], ['труп', 2.2, 'world_affairs'],
    ['землетрус', 2.0, 'world_affairs'], ['цунамі', 2.4, 'world_affairs'], ['пандемія', 2.2, 'world_affairs'],
    ['переворот', 2.6, 'world_affairs'], ['воєнний стан', 2.6, 'world_affairs'], ['біженці', 2.0, 'world_affairs']
  ];

  // LDNOOBW に uk が無いので、ru の罵倒語は使わず（別言語）作者作成の badwords のみ少数
  var BAD = [
    ['хуй', 2.8, 'badwords'], ['пізда', 2.8, 'badwords'], ['блядь', 2.6, 'badwords'],
    ['сука', 2.6, 'badwords'], ['їбав', 2.6, 'badwords'], ['дупа', 1.8, 'badwords'],
    ['лайно', 2.0, 'badwords'], ['срака', 2.0, 'badwords'], ['пиздець', 2.6, 'badwords']
  ];

  var lex = build.build(CURATED.concat(BAD), { match: 'word' });

  return {
    id: 'uk',
    name: 'Українська',
    match: 'word',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'token',
      markers: ['не', 'ні', 'немає', 'без', 'не можна', 'ніколи', 'ніхто', 'ніщо']
    },
    report: ['сказав', 'сказала', 'повідомив', 'за словами', 'нібито', 'передає'],
    quoteChars: { open: '«“"', close: '»”"' },
    emphasis: { caps: true }
  };
});
