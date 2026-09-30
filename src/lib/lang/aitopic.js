/**
 * AI の「技術・界隈の話題」を AI論争(ai_dispute) から切り出すレイヤー（カテゴリ `ai_topic`）。
 *
 * ai_dispute は「AI脅威・失業・暴走・規制」など論争・不安の文脈。
 * 技術者視点の話題（モデル名・手法・ツール）や AIクラスタの話題は
 * 見たい人も多いので、独立トグルで オン/オフ できるようにする。
 *
 * 既存辞書の ai_dispute 語のうち技術・製品系を ai_topic へ「移し替え」、
 * 追加の技術語（機械学習/プロンプト/AIエージェント 等）をスキャンする。
 *
 * ロジックは term-layer.js に共通化してある。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./term-layer.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.aitopic = factory(JOF.termLayer);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (termLayer) {
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

  var LANG_GROUPS = { ja: 'cjk', zh: 'cjk', zh_hant: 'cjk', ko: 'hangul' };
  LATIN_LANGS.forEach(function (id) {
    LANG_GROUPS[id] = 'latin';
  });

  var layer = termLayer.createTermLayer({
    category: 'ai_topic',
    weight: W,
    langGroups: LANG_GROUPS,
    fallbackGroup: null,
    groups: {
      cjk: { match: 'substring', terms: CJK },
      hangul: { match: 'substring', terms: HANGUL },
      latin: { match: 'word', terms: LATIN }
    }
  });
  layer.WEIGHT = W;
  return layer;
});
