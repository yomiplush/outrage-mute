/**
 * 義憤辞書の結合・索引化・パターン定義。
 *
 * - 手作り辞書 (lexicon.curated.js) と
 *   OSS 由来辞書 (lexicon.vendor.js, MosasoM/inappropriate-words-ja: MIT) を統合
 * - 表層形の長い順に並べ、先頭文字ごとの索引を作る（辞書最長一致スキャン用）
 * - 「べき」「〜しろ」等の文型パターンも定義
 *
 * 部分一致の誤検知対策として EXCLUDE_AFTER を持つ
 * （例: 「カス」の直後が「タ」なら「カスタム」なので無視する）。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./lexicon.curated.js'), require('./lexicon.vendor.js'), require('./lexicon.topics.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.lexicon = factory(JOF.lexiconCurated, JOF.lexiconVendor, JOF.lexiconTopics);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (curated, vendor, topics) {
  'use strict';

  var CATEGORY_LABELS = {
    attack: '攻撃・侮蔑',
    hostility: '憎悪・敵意',
    incitement: '煽り・呼びかけ',
    absolute: '断定・絶対化',
    othering: '二項対立・レッテル',
    cynicism: '冷笑・皮肉',
    urgency: '危機煽り',
    profanity: '差別・侮蔑語',
    amplifier: '感情誇張',
    politics: '政治',
    conspiracy: '陰謀論',
    ai_dispute: 'AI論争'
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
    'amplifier',
    'politics',
    'conspiracy',
    'ai_dispute'
  ];

  // 直後にこれらが続く場合は、別の無害な語の一部とみなして無視する
  var EXCLUDE_AFTER = {
    カス: ['タ', 'ケ', 'テ', 'ト', 'ミ'],
    バカ: ['ンス', 'ラ', 'ス'],
    アホ: ['ウ', '毛'],
    アスペ: ['クト', 'ル'],
    ハゲ: ['タカ', 'る'],
    ボケ: ['ッ', 'ット'],
    デブ: ['る'],
    ブス: ['ッ'],
    糖質: ['制限', 'オフ', '質'],
    支那: ['そば', 'ちょう', '街'],
    いざり: ['び'],
    草: ['食', '木', '花', 'むら', '加', '庵', '間'],
    www: ['w']
  };

  // 文型パターン（正規化済みテキストに対して走査）
  var PATTERNS = [
    { id: 'subeki', label: 'すべき', cat: 'incitement', w: 1.0, re: /すべき/g },
    { id: 'beki', label: 'べき論', cat: 'incitement', w: 0.8, re: /(?<!す)べき(だ|です)?/g },
    { id: 'shiroyo', label: '命令', cat: 'incitement', w: 1.3, re: /しろよ/g },
    {
      id: 'shiro',
      label: '命令',
      cat: 'incitement',
      w: 1.1,
      re: /(?<=[ぁ-んァ-ヶ一-龠々])しろ(?=[!！。、\s]|$)/g
    },
    { id: 'seyo', label: '命令', cat: 'incitement', w: 1.0, re: /(?<=[ぁ-んァ-ヶ一-龠々])せよ(?=[!！。、\s]|$)/g },
    { id: 'suruna', label: '禁止命令', cat: 'incitement', w: 0.9, re: /するな(?=[!！。、\s]|$)/g },
    { id: 'kimatteru', label: '断定', cat: 'absolute', w: 0.9, re: /決まってる|決まっている/g },
    { id: 'igai', label: '排他断定', cat: 'absolute', w: 1.1, re: /以外ありえない|以外あり得ない/g }
  ];

  function normalizeTerm(t) {
    try {
      return String(t).normalize('NFKC').toLowerCase();
    } catch (e) {
      return String(t).toLowerCase();
    }
  }

  function makeEntry(raw) {
    if (!raw || !raw.length) return null;
    var term = normalizeTerm(raw[0]);
    if (!term) return null;
    var flags = raw[3] || '';
    return {
      term: raw[0],
      n: term,
      w: Number(raw[1]) || 1,
      cat: raw[2] || 'attack',
      noNeg: String(flags).indexOf('noNeg') >= 0,
      source: raw[4] || 'curated'
    };
  }

  // 表層形 -> entry（カスタム辞書を優先して上書き）
  var map = new Map();
  var vendorList = vendor || [];
  for (var i = 0; i < vendorList.length; i++) {
    var ve = makeEntry(vendorList[i].concat(['profanity']));
    ve.source = 'vendor:inappropriate-words-ja';
    if (ve && !map.has(ve.n)) map.set(ve.n, ve);
  }
  var topicList = topics || [];
  for (var ti = 0; ti < topicList.length; ti++) {
    var te = makeEntry(topicList[ti]);
    if (te && !map.has(te.n)) {
      te.source = 'topics';
      map.set(te.n, te);
    }
  }
  var curatedList = curated || [];
  for (var j = 0; j < curatedList.length; j++) {
    var ce = makeEntry(curatedList[j]);
    if (ce) map.set(ce.n, ce); // curated が勝つ
  }

  var TERMS = Array.from(map.values());
  // 長い表層形を優先（最長一致）
  TERMS.sort(function (a, b) {
    return b.n.length - a.n.length || (a.n < b.n ? -1 : 1);
  });

  var BY_FIRST = new Map();
  for (var k = 0; k < TERMS.length; k++) {
    var c = TERMS[k].n.charAt(0);
    if (!BY_FIRST.has(c)) BY_FIRST.set(c, []);
    BY_FIRST.get(c).push(TERMS[k]);
  }

  return {
    CATEGORY_LABELS: CATEGORY_LABELS,
    CATEGORY_ORDER: CATEGORY_ORDER,
    EXCLUDE_AFTER: EXCLUDE_AFTER,
    PATTERNS: PATTERNS,
    TERMS: TERMS,
    BY_FIRST: BY_FIRST,
    normalizeTerm: normalizeTerm
  };
});
