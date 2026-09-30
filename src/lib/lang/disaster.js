/**
 * 災害・緊急情報の判定レイヤー（カテゴリ `disaster`）。
 *
 * 地震速報・津波警報・避難指示などは「見たい」情報。戦争/事件と同じ
 * world_affairs に入っていると、世界情勢を隠したい人が災害情報まで
 * 失ってしまう。そこで disaster を独立カテゴリにし、
 *   - disaster 有効（＝隠す）  … 地震速報などを隠す
 *   - disaster 無効（既定）    … 見る
 * を選べるようにする。
 *
 * 実装: 既存辞書の world_affairs 語のうち災害系のものを disaster に「移し替え」、
 *       追加の警報フレーズ（地震速報/避難指示 等）をスキャンする。
 *       すべての言語に効くよう、言語パックを編集せず後段で再分類する。
 *
 * ロジックは term-layer.js に共通化してある。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./term-layer.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.disaster = factory(JOF.termLayer);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (termLayer) {
  'use strict';

  var W = 2.2; // 1語で既定しきい値(0.5)を超える重み（≒0.60）

  var LANG_GROUPS = {
    ja: 'cjk', zh: 'cjk', zh_hant: 'cjk',
    ko: 'hangul',
    ru: 'cyrillic', uk: 'cyrillic', bg: 'cyrillic', sr: 'cyrillic', mk: 'cyrillic', mn: 'cyrillic', be: 'cyrillic',
    ar: 'arabic', fa: 'arabic', ur: 'arabic',
    en: 'latin', de: 'latin', fr: 'latin', es: 'latin', pt: 'latin', it: 'latin', nl: 'latin',
    pl: 'latin', cs: 'latin', sk: 'latin', hu: 'latin', fi: 'latin', sv: 'latin', da: 'latin',
    no: 'latin', tr: 'latin', fil: 'latin', id: 'latin', ms: 'latin', vi: 'latin', ro: 'latin',
    hr: 'latin', sl: 'latin', lt: 'latin', lv: 'latin', et: 'latin', ca: 'latin', sw: 'latin',
    latin: 'latin'
  };

  // 災害・緊急情報の語（既存辞書と重なってよい。重複は再分類で処理）
  var TERMS = {
    cjk: [
      '地震', '大地震', '巨大地震', '震度', '余震', 'マグニチュード', '震源', '本震',
      '津波', '大津波', '津波警報', '津波注意報', '津波到達', '高潮',
      '緊急地震速報', '地震速報', '特別警報', '大雨特別警報', '暴風警報', '洪水警報',
      '避難指示', '避難勧告', '避難所', '避難', '警戒レベル', '高齢者等避難',
      '台風', '線状降水帯', '集中豪雨', '大雨', '氾濫', '浸水', '土砂災害', '土石流', '崖崩れ',
      '噴火', '火山', '降灰', '火砕流',
      '震災', '被災', '被災地', '救助', '安否確認', '行方不明', '帰宅困難', '停電', '断水', 'ライフライン',
      '大規模火災', '山火事', '熱中症', 'パンデミック', '感染爆発',
      '海啸', '海嘯', '震级', '餘震', '余震', '疏散', '避难', '避難', '預警', '预警', '警报', '警報',
      '台风', '颱風', '洪灾', '災情', '受灾', '受災', '救援', '地震速報'
    ],
    hangul: [
      '지진', '여진', '진도', '규모', '쓰나미', '해일', '태풍', '홍수', '산사태', '폭우',
      '대피', '피난', '긴급재난문자', '재난문자', '경보', '특보', '이재민', '구조', '정전', '단수'
    ],
    cyrillic: [
      'землетрясение', 'землетрус', 'цунами', 'наводнение', 'эвакуация', 'евакуація',
      'оползень', 'пожар', 'ураган', 'тайфун', 'предупреждение', 'попередження'
    ],
    arabic: [
      'زلزال', 'زلزله', 'زلزلہ', 'تسونامي', 'سونامی', 'إخلاء', 'تخلیه', 'فیض', 'سیلاب'
    ],
    latin: [
      'earthquake', 'tsunami', 'typhoon', 'hurricane', 'tornado', 'evacuation', 'evacuate',
      'emergency alert', 'earthquake warning', 'aftershock', 'magnitude', 'epicenter',
      'wildfire', 'flood', 'flooding', 'landslide', 'mudslide', 'volcano', 'eruption',
      'terremoto', 'sismo', 'seísmo', 'tsunami', 'evacuación', 'inundación', 'erupción',
      'séisme', 'tremblement de terre', 'évacuation', 'inondation', 'éruption',
      'erdbeben', 'evakuierung', 'überschwemmung', 'überflutung', 'vulkanausbruch',
      'terremoto', 'evacuazione', 'alluvione', 'allagamento',
      'sismo', 'evacuação', 'enchente', 'inundação',
      'aardbeving', 'evacuatie', 'overstroming',
      'trzęsienie ziemi', 'ewakuacja', 'powódź',
      'deprem', 'tahliye', 'sel',
      'gempa', 'gempa bumi', 'evakuasi', 'banjir',
      'động đất', 'sóng thần', 'sơ tán', 'lũ lụt',
      'lindol', 'paglikas', 'baha',
      'cutremur', 'evacuare', 'inundație',
      'potres', 'evakuacija', 'poplava',
      'žemės drebėjimas', 'evakuacija', 'potvynis',
      'zemestrīce', 'evakuācija', 'plūdi',
      'maavärin', 'evakuatsioon', 'üleujutus',
      'terratrèmol', 'evacuació', 'inundació',
      'tetemeko la ardhi', 'tsunami', 'mafuriko'
    ]
  };

  var layer = termLayer.createTermLayer({
    category: 'disaster',
    weight: W,
    langGroups: LANG_GROUPS,
    fallbackGroup: 'latin',
    groups: {
      cjk: { match: 'substring', terms: TERMS.cjk },
      hangul: { match: 'substring', terms: TERMS.hangul },
      cyrillic: { match: 'word', terms: TERMS.cyrillic },
      arabic: { match: 'word', terms: TERMS.arabic },
      latin: { match: 'word', terms: TERMS.latin }
    }
  });
  layer.WEIGHT = W;
  return layer;
});
