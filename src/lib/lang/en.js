/**
 * 英語パック。
 * - 罵倒語の大量リスト: LDNOOBW en（CC-BY-4.0）→ カテゴリ badwords（既定OFF）
 * - 義憤・話題の語: 本拡張の作者が作成（MIT）
 * - 照合は「単語境界」（class の中の ass を拾わない）
 * - 否定は前置（not / don't / never ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'), require('./data/ldnoobw.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langEn = factory(JOF.langBuild, JOF.ldnoobw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build, ldnoobw) {
  'use strict';

  var CURATED = [
    // attack
    ['idiot', 1.8, 'attack'], ['moron', 2.0, 'attack'], ['imbecile', 2.2, 'attack'],
    ['dumbass', 2.2, 'attack'], ['jackass', 2.2, 'attack'], ['asshole', 2.4, 'attack'],
    ['bastard', 2.2, 'attack'], ['scumbag', 2.6, 'attack'], ['piece of shit', 2.8, 'attack'],
    ['loser', 1.6, 'attack'], ['worthless', 1.8, 'attack'], ['pathetic', 1.8, 'attack'],
    ['useless', 1.6, 'attack'], ['garbage', 2.0, 'attack'], ['trash', 2.0, 'attack'],
    ['scum', 2.4, 'attack'], ['vermin', 2.4, 'attack'], ['cockroach', 2.2, 'attack'],
    ['clown', 1.2, 'attack'], ['buffoon', 1.6, 'attack'], ['fool', 1.4, 'attack'],
    ['douchebag', 2.4, 'attack'], ['dirtbag', 2.2, 'attack'], ['lowlife', 2.0, 'attack'],
    ['freak', 1.6, 'attack'], ['creep', 1.6, 'attack'], ['coward', 1.8, 'attack'],
    ['traitor', 2.4, 'attack'], ['hypocrite', 1.8, 'attack'], ['liar', 1.6, 'attack'],
    ['fraud', 1.6, 'attack'], ['charlatan', 1.8, 'attack'], ['incompetent', 1.8, 'attack'],
    ['brainless', 2.0, 'attack'], ['brain-dead', 2.2, 'attack'], ['subhuman', 2.8, 'attack'],
    ['savage', 1.6, 'attack'], ['retard', 2.6, 'attack'], ['moronic', 2.0, 'attack'],
    ['dumb', 1.4, 'attack'], ['stupid', 1.6, 'attack'], ['idiotic', 1.8, 'attack'],
    ['halfwit', 1.8, 'attack'], ['dimwit', 1.8, 'attack'], ['simpleton', 1.6, 'attack'],
    ['you are an idiot', 2.4, 'attack'],
    // hostility
    ['hate', 1.6, 'hostility'], ['hatred', 1.8, 'hostility'], ['despise', 1.8, 'hostility'],
    ['disgust', 1.8, 'hostility'], ['disgusting', 2.0, 'hostility'], ['revolting', 2.0, 'hostility'],
    ['repulsive', 2.0, 'hostility'], ['loathe', 1.8, 'hostility'], ['detest', 1.8, 'hostility'],
    ['abhor', 1.8, 'hostility'], ['contempt', 1.6, 'hostility'], ['despicable', 2.2, 'hostility'],
    ['vile', 2.2, 'hostility'], ['unforgivable', 2.2, 'hostility', 'noNeg'], ['inexcusable', 2.0, 'hostility'],
    ['outrageous', 1.6, 'hostility'], ['appalling', 1.8, 'hostility'], ['atrocious', 2.0, 'hostility'],
    ['sickening', 2.0, 'hostility'], ['hateful', 2.0, 'hostility'], ['evil', 1.8, 'hostility'],
    ['wicked', 1.8, 'hostility'], ['disgraceful', 1.8, 'hostility'], ['shameful', 1.8, 'hostility'],
    ['shameless', 1.8, 'hostility'], ['unacceptable', 1.6, 'hostility'], ['i hate', 2.0, 'hostility'],
    ['sick of', 1.8, 'hostility'],
    // incitement
    ['shut up', 2.2, 'incitement'], ['get lost', 2.0, 'incitement'], ['go away', 1.6, 'incitement'],
    ['boycott', 1.6, 'incitement'], ['expose them', 2.0, 'incitement'], ['dox', 2.4, 'incitement'],
    ['destroy them', 2.2, 'incitement'], ['lock them up', 1.8, 'incitement'], ['deport them', 2.0, 'incitement'],
    ['shame them', 2.0, 'incitement'], ['call them out', 1.4, 'incitement'], ['cancel them', 1.6, 'incitement'],
    // absolute
    ['absolutely', 0.8, 'absolute'], ['definitely', 0.5, 'absolute'], ['everyone', 0.3, 'absolute'],
    ['nobody', 0.3, 'absolute'], ['100%', 0.7, 'absolute'], ['obviously', 0.4, 'absolute'],
    ['no doubt', 0.8, 'absolute'], ['without question', 0.8, 'absolute'], ['undeniably', 0.8, 'absolute'],
    ['impossible', 1.0, 'absolute'], ['i will never', 1.2, 'absolute'], ['never forgive', 2.0, 'absolute', 'noNeg'],
    // othering
    ['cult', 1.2, 'othering'], ['sheeple', 2.0, 'othering'], ['brainwashed', 1.8, 'othering'],
    ['puppet', 1.4, 'othering'], ['shill', 1.8, 'othering'], ['unpatriotic', 1.8, 'othering'],
    ['enemy of the people', 2.6, 'othering'], ['fake news', 2.0, 'othering'], ['globalist', 2.2, 'othering'],
    ['elitist', 1.6, 'othering'], ['sheep', 1.2, 'othering'], ['npc', 1.4, 'othering'],
    ['you people', 1.4, 'othering'],
    // cynicism
    ['whatever', 1.0, 'cynicism'], ['cry more', 2.0, 'cynicism'], ['cope', 1.6, 'cynicism'],
    ['seethe', 1.8, 'cynicism'], ['triggered', 1.4, 'cynicism'], ['snowflake', 1.8, 'cynicism'],
    ['ok boomer', 1.6, 'cynicism'], ['yeah right', 1.4, 'cynicism'], ['serves you right', 2.0, 'cynicism'],
    // urgency
    ['breaking', 0.8, 'urgency'], ['urgent', 1.0, 'urgency'], ['wake up', 1.4, 'urgency'],
    ['share this', 1.0, 'urgency'], ['spread the word', 1.2, 'urgency'],
    ["they don't want you to know", 2.4, 'urgency'], ["before it's too late", 1.8, 'urgency'],
    ['end of the world', 1.8, 'urgency'], ['total collapse', 1.6, 'urgency'],
    // politics
    ['election', 2.2, 'politics'], ['vote', 2.0, 'politics'], ['voters', 2.0, 'politics'],
    ['president', 2.2, 'politics'], ['prime minister', 2.2, 'politics'], ['parliament', 2.2, 'politics'],
    ['congress', 2.2, 'politics'], ['senate', 2.2, 'politics'], ['government', 2.2, 'politics'],
    ['politician', 2.2, 'politics'], ['political', 2.2, 'politics'], ['democrat', 2.2, 'politics'],
    ['republican', 2.2, 'politics'], ['liberal', 2.0, 'politics'], ['conservative', 2.0, 'politics'],
    ['leftist', 2.0, 'politics'], ['right-wing', 2.0, 'politics'], ['left-wing', 2.0, 'politics'],
    ['taxes', 2.0, 'politics'], ['immigration', 2.0, 'politics'], ['brexit', 2.2, 'politics'],
    // conspiracy
    ['conspiracy', 2.4, 'conspiracy'], ['conspiracy theory', 2.6, 'conspiracy'], ['deep state', 2.6, 'conspiracy'],
    ['new world order', 2.6, 'conspiracy'], ['great reset', 2.6, 'conspiracy'], ['false flag', 2.6, 'conspiracy'],
    ['plandemic', 2.6, 'conspiracy'], ['chemtrails', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'],
    ['population control', 2.6, 'conspiracy'], ["they're hiding", 2.4, 'conspiracy'],
    ['do your research', 2.0, 'conspiracy'], ['crisis actor', 2.6, 'conspiracy'], ['agenda 2030', 2.6, 'conspiracy'],
    // ai_dispute
    ['artificial intelligence', 2.2, 'ai_dispute'], ['generative ai', 2.2, 'ai_dispute'],
    ['chatgpt', 2.2, 'ai_dispute'], ['openai', 2.2, 'ai_dispute'], ['deepfake', 2.2, 'ai_dispute'],
    ['ai regulation', 2.2, 'ai_dispute'], ['ai censorship', 2.2, 'ai_dispute'], ['anti-ai', 2.2, 'ai_dispute'],
    ['large language model', 2.2, 'ai_dispute'], ['singularity', 2.4, 'ai_dispute'],
    ['ai takeover', 2.6, 'ai_dispute'], ['ai apocalypse', 2.6, 'ai_dispute'], ['ai bubble', 2.4, 'ai_dispute'],
    ['ai will replace', 2.6, 'ai_dispute'], ['agi', 2.2, 'ai_dispute'],
    // world_affairs
    ['war', 2.2, 'world_affairs'], ['invasion', 2.4, 'world_affairs'], ['missile', 2.2, 'world_affairs'],
    ['airstrike', 2.6, 'world_affairs'], ['bombing', 2.6, 'world_affairs'], ['bombardment', 2.6, 'world_affairs'],
    ['genocide', 2.6, 'world_affairs'], ['massacre', 2.6, 'world_affairs'], ['terrorist', 2.4, 'world_affairs'],
    ['terror attack', 2.6, 'world_affairs'], ['mass shooting', 2.6, 'world_affairs'], ['murder', 2.4, 'world_affairs'],
    ['death toll', 2.2, 'world_affairs'], ['casualties', 2.2, 'world_affairs'], ['corpse', 2.4, 'world_affairs'],
    ['nuclear war', 2.8, 'world_affairs'], ['world war 3', 2.8, 'world_affairs'], ['ww3', 2.6, 'world_affairs'],
    ['coup', 2.6, 'world_affairs'], ['martial law', 2.6, 'world_affairs'], ['refugee', 2.0, 'world_affairs'],
    ['famine', 2.0, 'world_affairs'], ['earthquake', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'],
    ['pandemic', 2.2, 'world_affairs'], ['market crash', 2.2, 'world_affairs']
  ];

  var BAD = (ldnoobw.en || []).map(function (w) {
    return [w, 2.4, 'badwords'];
  });

  var lex = build.build(BAD.concat(CURATED), { match: 'word' });

  var PATTERNS = [
    { id: 'shutup', label: 'shut up', cat: 'incitement', w: 1.4, re: /\b(shut up|fuck off|go to hell|get lost|screw you|piss off)\b/g },
    { id: 'mustbestopped', label: 'should be stopped', cat: 'incitement', w: 1.6, re: /\b(should|must|has to|have to) be (stopped|banned|arrested|jailed|deported|destroyed|removed)\b/g },
    { id: 'wakeup', label: 'wake up', cat: 'urgency', w: 1.2, re: /\b(wake up|do your research|spread the word)\b/g },
    { id: 'allofthem', label: 'all of them', cat: 'absolute', w: 0.8, re: /\b(all of them|every single|none of them|all of you)\b/g },
    { id: 'youpeople', label: 'you people', cat: 'othering', w: 1.2, re: /\b(you people|these people|those people|people like you)\b/g }
  ];

  return {
    id: 'en',
    name: 'English',
    match: 'word',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: PATTERNS,
    negation: {
      position: 'before',
      unit: 'token',
      markers: [
        'not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nor', 'without',
        'hardly', 'barely', "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't",
        "weren't", "can't", 'cannot', "won't", "wouldn't", "shouldn't", "couldn't", "ain't"
      ],
      suffix: "n't"
    },
    report: ['said', 'says', 'reported', 'allegedly', 'according', 'claimed'],
    quoteChars: { open: '\u201c"', close: '\u201d"' },
    emphasis: { caps: true }
  };
});
