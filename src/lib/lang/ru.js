/**
 * ロシア語パック。
 * - 罵倒語: LDNOOBW ru（CC-BY-4.0）→ badwords（既定OFF）
 * - 義憤・話題: 作者作成（MIT）
 * - 照合は単語境界 / 否定は前置（не / ни / нет ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'), require('./data/ldnoobw.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langRu = factory(JOF.langBuild, JOF.ldnoobw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build, ldnoobw) {
  'use strict';

  var CURATED = [
    // attack
    ['дурак', 1.8, 'attack'], ['идиот', 2.0, 'attack'], ['дебил', 2.4, 'attack'],
    ['кретин', 2.2, 'attack'], ['тупой', 1.8, 'attack'], ['тупица', 2.0, 'attack'],
    ['придурок', 2.2, 'attack'], ['мудак', 2.6, 'attack'], ['козёл', 2.2, 'attack'],
    ['ублюдок', 2.6, 'attack'], ['сволочь', 2.4, 'attack'], ['подонок', 2.6, 'attack'],
    ['мразь', 2.8, 'attack'], ['гнида', 2.8, 'attack'], ['тварь', 2.6, 'attack'],
    ['скотина', 2.2, 'attack'], ['крыса', 2.0, 'attack'], ['паразит', 2.0, 'attack'],
    ['ничтожество', 2.2, 'attack'], ['безмозглый', 2.0, 'attack'], ['чмо', 2.6, 'attack'],
    ['лох', 1.8, 'attack'], ['мерзавец', 2.4, 'attack'],
    // hostility
    ['ненавижу', 2.0, 'hostility'], ['ненависть', 2.0, 'hostility'], ['отвращение', 1.8, 'hostility'],
    ['мерзость', 2.0, 'hostility'], ['омерзительно', 2.2, 'hostility'], ['бесит', 1.8, 'hostility'],
    ['ярость', 1.6, 'hostility'], ['гнев', 1.6, 'hostility'], ['возмущение', 1.6, 'hostility'],
    ['возмутительно', 1.8, 'hostility'], ['неприемлемо', 1.6, 'hostility'], ['позор', 1.6, 'hostility'],
    ['непростительно', 2.2, 'hostility', 'noNeg'],
    // incitement
    ['заткнись', 2.4, 'incitement'], ['убирайся', 2.4, 'incitement'], ['пошёл вон', 2.4, 'incitement'],
    ['сдохни', 3.0, 'incitement'], ['убей', 2.8, 'incitement'], ['бойкот', 1.6, 'incitement'],
    ['травить', 2.2, 'incitement'], ['разоблачи', 2.0, 'incitement'], ['накажи', 1.8, 'incitement'],
    // absolute
    ['абсолютно', 0.9, 'absolute'], ['обязательно', 0.6, 'absolute'], ['безусловно', 0.7, 'absolute'],
    ['очевидно', 0.5, 'absolute'], ['никогда', 0.6, 'absolute'], ['всегда', 0.5, 'absolute'],
    // othering
    ['предатель', 2.4, 'othering'], ['изменник', 2.4, 'othering'], ['ватник', 2.2, 'othering'],
    ['либераст', 2.4, 'othering'], ['рашист', 2.4, 'othering'], ['укроп', 2.6, 'othering'],
    ['хохол', 2.6, 'othering'], ['москаль', 2.4, 'othering'],
    // cynicism
    ['так тебе и надо', 2.0, 'cynicism'], ['поделом', 1.8, 'cynicism'], ['ну-ну', 1.2, 'cynicism'],
    // urgency
    ['срочно', 1.0, 'urgency'], ['распространить', 1.0, 'urgency'], ['конец света', 1.8, 'urgency'],
    ['кризис', 1.2, 'urgency'], ['обвал', 1.4, 'urgency'],
    // politics
    ['выборы', 2.2, 'politics'], ['голосование', 2.0, 'politics'], ['правительство', 2.2, 'politics'],
    ['президент', 2.2, 'politics'], ['парламент', 2.2, 'politics'], ['политика', 2.2, 'politics'],
    ['налоги', 2.0, 'politics'], ['иммиграция', 2.0, 'politics'], ['депутат', 2.0, 'politics'],
    // conspiracy
    ['заговор', 2.4, 'conspiracy'], ['теория заговора', 2.6, 'conspiracy'], ['глубинное государство', 2.6, 'conspiracy'],
    ['мировое правительство', 2.6, 'conspiracy'], ['масоны', 2.6, 'conspiracy'], ['иллюминаты', 2.6, 'conspiracy'],
    ['новый мировой порядок', 2.6, 'conspiracy'], ['чипирование', 2.4, 'conspiracy'], ['фейк', 2.0, 'conspiracy'],
    // ai_dispute
    ['искусственный интеллект', 2.2, 'ai_dispute'], ['нейросеть', 2.0, 'ai_dispute'],
    ['сингулярность', 2.4, 'ai_dispute'], ['чатгпт', 2.2, 'ai_dispute'], ['openai', 2.2, 'ai_dispute'],
    ['дипфейк', 2.2, 'ai_dispute'], ['ии угроза', 2.6, 'ai_dispute'], ['ии заменит', 2.6, 'ai_dispute'],
    // world_affairs
    ['война', 2.2, 'world_affairs'], ['вторжение', 2.4, 'world_affairs'], ['авиаудар', 2.6, 'world_affairs'],
    ['бомбардировка', 2.6, 'world_affairs'], ['ракета', 2.2, 'world_affairs'], ['ядерная война', 2.8, 'world_affairs'],
    ['геноцид', 2.6, 'world_affairs'], ['резня', 2.6, 'world_affairs'], ['теракт', 2.4, 'world_affairs'],
    ['стрельба', 2.4, 'world_affairs'], ['убийство', 2.4, 'world_affairs'], ['труп', 2.2, 'world_affairs'],
    ['землетрясение', 2.0, 'world_affairs'], ['цунами', 2.4, 'world_affairs'], ['пандемия', 2.2, 'world_affairs'],
    ['переворот', 2.6, 'world_affairs'], ['военное положение', 2.6, 'world_affairs'], ['беженцы', 2.0, 'world_affairs']
  ];

  var BAD = (ldnoobw.ru || []).map(function (w) {
    return [w, 2.4, 'badwords'];
  });

  var lex = build.build(BAD.concat(CURATED), { match: 'word' });

  return {
    id: 'ru',
    name: 'Русский',
    match: 'word',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'token',
      markers: ['не', 'ни', 'нет', 'без', 'нельзя', 'никогда', 'никто', 'ничто']
    },
    report: ['сказал', 'сказала', 'сообщил', 'по словам', 'якобы', 'передаёт'],
    quoteChars: { open: '«“"', close: '»”"' },
    emphasis: { caps: true }
  };
});
