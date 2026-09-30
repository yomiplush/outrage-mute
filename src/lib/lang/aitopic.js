/**
 * AI の「技術・界隈の話題」を AI論争(ai_dispute) から切り出すレイヤー（カテゴリ `ai_topic`）。
 *
 * ai_dispute は「AI脅威・失業・暴走・規制」など論争・不安の文脈。
 * 技術者視点の話題（モデル名・手法・ツール）や AIクラスタの話題は
 * 見たい人も多いので、独立トグルで オン/オフ できるようにする。
 *
 * 既存辞書の ai_dispute 語のうち技術・製品系を ai_topic へ「移し替え」、
 * 追加の技術語（機械学習/プロンプト/AIエージェント 等）をスキャンする。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.aitopic = factory(JOF.langBuild);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build) {
  'use strict';

  var W = 2.2;

  var CJK = [
    '人工知能', '人工智能', '生成ai', '生成式ai', '大規模言語モデル', '大语言模型',
    '機械学習', '机器学习', '深層学習', '深度学习', 'ディープラーニング',
    'ニューラルネット', 'プロンプト', 'ファインチューニング', '微调',
    'aiエージェント', 'マルチモーダル', '多模态', '画像生成', '图像生成',
    '動画生成', '视频生成', '音声合成', '语音合成', '拡散モデル', '扩散模型',
    'aiモデル', 'ai模型', 'ai開発', 'ai开发', 'aiクラスタ', 'ai界隈', 'ai研究者',
    'aiエンジニア', '汎用人工知能', '通用人工智能', 'ディープフェイク', '深度伪造', '深度偽造'
  ];
  var HANGUL = [
    '인공지능', '생성형ai', '챗gpt', '오픈ai', '대규모 언어 모델', '머신러닝', '딥러닝',
    '프롬프트', '파인튜닝', '멀티모달', '이미지 생성', '확산 모델'
  ];
  var LATIN = [
    'chatgpt', 'gpt-4', 'gpt4', 'gpt-5', 'gpt5', 'openai', 'gemini', 'claude', 'copilot',
    'llm', 'llms', 'stable diffusion', 'midjourney', 'machine learning', 'deep learning',
    'neural network', 'neural networks', 'prompt engineering', 'fine-tuning', 'finetuning',
    'fine tuning', 'multimodal', 'ai agent', 'ai agents', 'ai model', 'ai models',
    'diffusion model', 'hugging face', 'huggingface', 'pytorch', 'tensorflow', 'llama',
    'mistral', 'langchain', 'embeddings', 'text-to-speech', 'image generation'
  ];

  var LATIN_LANGS = ['en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'cs', 'sk', 'hu', 'fi', 'sv',
    'da', 'no', 'tr', 'fil', 'id', 'ms', 'vi', 'ro', 'hr', 'sl', 'lt', 'lv', 'et', 'ca', 'sw', 'latin'];

  function groupOf(id) {
    if (id === 'ja' || id === 'zh' || id === 'zh_hant') return 'cjk';
    if (id === 'ko') return 'hangul';
    if (LATIN_LANGS.indexOf(id) >= 0) return 'latin';
    return null;
  }

  var BUILT = {};
  function buildGroup(group) {
    if (group in BUILT) return BUILT[group];
    var src = group === 'cjk' ? CJK : group === 'hangul' ? HANGUL : LATIN;
    var rows = src.map(function (t) {
      return [t, W, 'ai_topic'];
    });
    var match = group === 'latin' ? 'word' : 'substring';
    var lex = build.build(rows, { match: match });
    var set = new Set();
    lex.TERMS.forEach(function (e) {
      set.add(e.n);
    });
    BUILT[group] = { match: match, lex: lex, set: set };
    return BUILT[group];
  }

  function isTerm(normTerm, langId) {
    var g = groupOf(langId);
    return g ? buildGroup(g).set.has(normTerm) : false;
  }

  var PACK_SET_CACHE = new WeakMap();
  function packTermSet(pack) {
    var s = PACK_SET_CACHE.get(pack);
    if (s) return s;
    s = new Set();
    (pack.TERMS || []).forEach(function (e) {
      s.add(e.n);
    });
    PACK_SET_CACHE.set(pack, s);
    return s;
  }

  var EXTRA_CACHE = new WeakMap();
  function extraIndex(pack) {
    var cached = EXTRA_CACHE.get(pack);
    if (cached) return cached;
    var g = groupOf(pack.id);
    var res = { match: null, index: null };
    if (g) {
      var built = buildGroup(g);
      var known = packTermSet(pack);
      var rows = built.lex.TERMS.filter(function (e) {
        return !known.has(e.n);
      }).map(function (e) {
        return [e.term, e.w, 'ai_topic'];
      });
      res.match = built.match;
      res.index = rows.length ? build.build(rows, { match: built.match }) : null;
    }
    EXTRA_CACHE.set(pack, res);
    return res;
  }

  return { groupOf: groupOf, isTerm: isTerm, extraIndex: extraIndex, WEIGHT: W };
});
