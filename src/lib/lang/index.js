/**
 * 言語レジストリ（文字体系ベースの自動判定つき）。
 *
 * - 専用パック（ja/en/zh/zh_hant/ko/ru/uk）は各ファイルの規則を使う
 * - curated.js にある言語 ＋ LDNOOBW にある言語からパックを生成
 *   - curated があれば「完全対応」（義憤＋話題語）
 *   - LDNOOBW だけなら「badwords のみ」
 * - ラテン文字・キリル文字・アラビア文字は、話者言語を厳密に判別できないため
 *   同系統の言語を統合したパック（latin / cyrillic / arabic）で判定する
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./ja.js'),
      require('./en.js'),
      require('./zh.js'),
      require('./zh_hant.js'),
      require('./ko.js'),
      require('./ru.js'),
      require('./uk.js'),
      require('./build.js'),
      require('./data/ldnoobw.js'),
      require('./curated.js')
    );
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.lang = factory(
      JOF.langJa,
      JOF.langEn,
      JOF.langZh,
      JOF.langZhHant,
      JOF.langKo,
      JOF.langRu,
      JOF.langUk,
      JOF.langBuild,
      JOF.ldnoobw,
      JOF.curatedLex
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  ja, en, zh, zhHant, ko, ru, uk, build, ldnoobw, curated
) {
  'use strict';

  var LANG_NAMES = {
    ar: 'العربية', bn: 'বাংলা', ca: 'Català', cs: 'Čeština', da: 'Dansk', de: 'Deutsch',
    el: 'Ελληνικά', en: 'English', es: 'Español', et: 'Eesti', fa: 'فارسی', fi: 'Suomi',
    fil: 'Filipino', fr: 'Français', he: 'עברית', hi: 'हिन्दी', hr: 'Hrvatski', hu: 'Magyar',
    id: 'Bahasa Indonesia', it: 'Italiano', ja: '日本語', ka: 'ქართული', km: 'ខ្មែរ',
    ko: '한국어', lo: 'ລາວ', lt: 'Lietuvių', lv: 'Latviešu', mk: 'Македонски', mn: 'Монгол',
    ms: 'Bahasa Melayu', ne: 'नेपाली', nl: 'Nederlands', no: 'Norsk', pl: 'Polski',
    pt: 'Português', ro: 'Română', ru: 'Русский', si: 'සිංහල', sk: 'Slovenčina',
    sl: 'Slovenščina', sr: 'Српски', sv: 'Svenska', sw: 'Kiswahili', ta: 'தமிழ்',
    te: 'తెలుగు', th: 'ไทย', tr: 'Türkçe', uk: 'Українська', ur: 'اردو', vi: 'Tiếng Việt',
    zh: '中文（简体）', zh_hant: '中文（繁體）',
    latin: 'Latin (all)', cyrillic: 'Cyrillic (all)', arabic: 'Arabic script (all)'
  };

  // 分かち書きしない言語 → 部分一致
  var SUBSTRING_LANGS = { zh: 1, zh_hant: 1, ja: 1, ko: 1, th: 1, km: 1, lo: 1 };
  // 文字体系（大文字小文字・否定の既定に使う）
  var SCRIPT = {
    latin: ['en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'cs', 'sk', 'hu', 'fi', 'sv', 'da',
      'no', 'tr', 'fil', 'id', 'ms', 'vi', 'ro', 'hr', 'sl', 'lt', 'lv', 'et', 'ca', 'sw', 'tl'],
    cyrillic: ['ru', 'uk', 'bg', 'sr', 'mk', 'be', 'mn'],
    arabic: ['ar', 'fa', 'ur']
  };

  // 言語ごとの否定マーカー（照合位置の既定）
  var NEG = {
    de: ['nicht', 'kein', 'keine', 'keinen', 'niemals', 'nie', 'ohne'],
    fr: ['ne', 'pas', 'jamais', 'sans', 'aucun', 'aucune'],
    es: ['no', 'nunca', 'jamás', 'sin', 'ningún'],
    it: ['non', 'mai', 'senza', 'nessun'],
    pt: ['não', 'nunca', 'sem', 'nenhum'],
    nl: ['niet', 'geen', 'nooit', 'zonder'],
    pl: ['nie', 'nigdy', 'bez', 'żaden'],
    cs: ['ne', 'nikdy', 'bez'],
    sk: ['nie', 'nikdy', 'bez'],
    hu: ['nem', 'soha', 'nélkül'],
    fi: ['ei', 'koskaan', 'ilman'],
    sv: ['inte', 'aldrig', 'utan'],
    da: ['ikke', 'aldrig', 'uden'],
    no: ['ikke', 'aldri', 'uten'],
    tr: ['değil', 'asla', 'hiç', 'asla'],
    fil: ['hindi', 'wala', 'huwag'],
    id: ['tidak', 'bukan', 'jangan', 'tak'],
    ms: ['tidak', 'bukan', 'jangan', 'tak'],
    vi: ['không', 'chẳng', 'đừng'],
    ro: ['nu', 'niciodată', 'fără'],
    ru: ['не', 'ни', 'нет', 'без', 'нельзя', 'никогда'],
    uk: ['не', 'ні', 'немає', 'без', 'не можна', 'ніколи'],
    bg: ['не', 'ни', 'без', 'никога'],
    sr: ['не', 'ни', 'без', 'никад'],
    ar: ['لا', 'ليس', 'أبدا', 'بدون'],
    fa: ['نیست', 'هرگز', 'بدون', 'نه'],
    ur: ['نہیں', 'کبھی نہیں', 'بغیر'],
    hi: ['नहीं', 'कभी नहीं', 'बिना'],
    th: ['ไม่', 'ไม่เคย', 'อย่า'],
    en: ['not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nor', 'without', 'hardly', 'barely']
  };

  var NEG_SUFFIX = { en: "n't", de: null };

  var QUOTES = { open: '\u300c\u300e\u201c"\u00ab\u201e\u2039', close: '\u300d\u300f\u201d"\u00bb\u201a\u203a' };

  var DEFAULT_LANG = 'ja';

  function negationFor(code, match) {
    if (match === 'substring') {
      if (code === 'zh' || code === 'zh_hant') {
        return { position: 'before', unit: 'char', markers: ['不', '沒', '没', '沒有', '没有', '別', '别', '無', '无', '未', '非', '莫', '甭', '不是'] };
      }
      if (code === 'ko') return { position: 'before', unit: 'char', markers: ['못', '아니', '아닌', '없', '말라', '하지마', '하지 마'] };
      if (code === 'th') return { position: 'before', unit: 'char', markers: ['ไม่', 'ไม่เคย', 'อย่า'] };
      return { position: 'none' };
    }
    return { position: 'before', unit: 'token', markers: NEG[code] || ['not', 'no'], suffix: NEG_SUFFIX[code] || null };
  }

  function scriptOf(code) {
    if (SCRIPT.latin.indexOf(code) >= 0) return 'latin';
    if (SCRIPT.cyrillic.indexOf(code) >= 0) return 'cyrillic';
    if (SCRIPT.arabic.indexOf(code) >= 0) return 'arabic';
    return 'other';
  }

  // ---- 生データ（curated を優先し、LDNOOBW を badwords として足す）----
  var RAW = {};
  Object.keys(ldnoobw || {}).forEach(function (code) {
    RAW[code] = (ldnoobw[code] || []).map(function (w) {
      return [w, 2.4, 'badwords'];
    });
  });
  Object.keys(curated || {}).forEach(function (code) {
    // curated を後に置いて優先させる（badwords より義憤・話題語を優先）
    RAW[code] = (RAW[code] || []).concat(curated[code] || []);
  });

  var PACKS = {};
  var DEDICATED = { ja: ja, en: en, zh: zh, zh_hant: zhHant, ko: ko, ru: ru, uk: uk };

  // 専用パックを先に登録（zh_hant は LDNOOBW に無いので必須）
  Object.keys(DEDICATED).forEach(function (code) {
    if (DEDICATED[code]) PACKS[code] = DEDICATED[code];
  });

  function makePack(code) {
    if (DEDICATED[code]) return DEDICATED[code];
    var terms = RAW[code];
    if (!terms || !terms.length) return null;
    var match = SUBSTRING_LANGS[code] ? 'substring' : 'word';
    var lex = build.build(terms, { match: match });
    var script = scriptOf(code);
    return {
      id: code,
      name: LANG_NAMES[code] || code,
      match: match,
      generic: !(curated && curated[code]),
      TERMS: lex.TERMS,
      BY_FIRST: lex.BY_FIRST,
      BY_WORD: lex.BY_WORD,
      EXCLUDE_AFTER: {},
      patterns: [],
      negation: negationFor(code, match),
      report: [],
      quoteChars: QUOTES,
      emphasis: { caps: script === 'latin' || script === 'cyrillic' }
    };
  }

  Object.keys(RAW).forEach(function (code) {
    var p = makePack(code);
    if (p) PACKS[code] = p;
  });

  // ---- 統合パック（同系統の言語をまとめて判定）----
  function reindex(terms, match) {
    var TERMS = terms.filter(function (e) {
      return match === 'word' ? e.tokens && e.tokens.length : e.n;
    });
    TERMS = TERMS.slice().sort(function (a, b) {
      if (match === 'word') return b.tokens.length - a.tokens.length || b.n.length - a.n.length;
      return b.n.length - a.n.length || (a.n < b.n ? -1 : 1);
    });
    var BY_FIRST = new Map();
    var BY_WORD = new Map();
    var seen = new Set();
    TERMS = TERMS.filter(function (e) {
      var key = e.n;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    TERMS.forEach(function (e) {
      if (match === 'word') {
        var k = e.tokens[0];
        if (!BY_WORD.has(k)) BY_WORD.set(k, []);
        BY_WORD.get(k).push(e);
      } else {
        var c = e.n.charAt(0);
        if (!BY_FIRST.has(c)) BY_FIRST.set(c, []);
        BY_FIRST.get(c).push(e);
      }
    });
    return { TERMS: TERMS, BY_FIRST: BY_FIRST, BY_WORD: BY_WORD };
  }

  function buildMerged(id, codes) {
    var terms = [];
    codes.forEach(function (c) {
      var p = PACKS[c];
      if (p) terms = terms.concat(p.TERMS);
    });
    if (!terms.length) return null;
    var match = 'word';
    var idx = reindex(terms, match);
    return {
      id: id,
      name: LANG_NAMES[id] || id,
      match: match,
      merged: true,
      TERMS: idx.TERMS,
      BY_FIRST: idx.BY_FIRST,
      BY_WORD: idx.BY_WORD,
      EXCLUDE_AFTER: {},
      patterns: [],
      negation: { position: 'before', unit: 'token', markers: ['not', 'no', 'не', 'nicht', 'no', 'não', 'non', 'لا', 'не'] },
      report: [],
      quoteChars: QUOTES,
      emphasis: { caps: id !== 'arabic' }
    };
  }

  ['latin', 'cyrillic', 'arabic'].forEach(function (script) {
    var codes = SCRIPT[script].filter(function (c) {
      return PACKS[c];
    });
    var p = buildMerged(script, codes);
    if (p) PACKS[script] = p;
  });

  // ---- 判定 ----
  var HANS_CHARS =
    '这个说国战开关门时间话语实体发对后听写读买卖义议乐药医书画学绝废脑残瘫货贱杂种无耻脸厌恶该气愤仇恨闭嘴滚杀网举报须毫疑显从汉贼军圣键盘侠红狼应报紧转扩盘经济来及选举总统执党官员税阴谋济尔减幕后黑讯闻伪点胁导弹袭击枪啸变严难灭';
  var HANT_CHARS =
    '這個說道國戰開關門時間話語實體發對後聽寫讀買賣義議樂藥醫書畫學絕廢腦殘癱貨賤雜種無恥臉厭惡該氣憤仇恨閉嘴滾殺網舉報須毫疑顯從漢賊軍聖鍵盤俠紅狼應報緊轉擴盤經濟來及選舉總統執黨官員稅陰謀濟爾減幕後黑訊聞偽點脅導彈襲擊槍嘯變嚴難滅';

  function hanVariant(s) {
    var hans = 0;
    var hant = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (HANS_CHARS.indexOf(c) >= 0) hans++;
      else if (HANT_CHARS.indexOf(c) >= 0) hant++;
    }
    return hant > hans ? 'zh_hant' : 'zh';
  }

  function detect(text) {
    var s = String(text == null ? '' : text);
    var n = Math.min(s.length, 2000);
    var hira = 0, kata = 0, han = 0, hangul = 0, cyr = 0, latin = 0, ukc = 0, mnc = 0;
    var thai = 0, arab = 0, devan = 0, hebrew = 0, greek = 0, beng = 0, tamil = 0, telugu = 0, khmer = 0, lao = 0, sinhala = 0;
    for (var i = 0; i < n; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0x3040 && c <= 0x309f) hira++;
      else if (c >= 0x30a0 && c <= 0x30ff) kata++;
      else if (c >= 0x4e00 && c <= 0x9fff) han++;
      else if (c >= 0xac00 && c <= 0xd7a3) hangul++;
      else if (c >= 0x0400 && c <= 0x04ff) {
        cyr++;
        var ch = s.charAt(i);
        if ('іїєґІЇЄҐ'.indexOf(ch) >= 0) ukc++;
        else if ('үөһҮӨҺ'.indexOf(ch) >= 0) mnc++;
      } else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x17f)) latin++;
      else if (c >= 0x0e00 && c <= 0x0e7f) thai++;
      else if (c >= 0x0600 && c <= 0x06ff) arab++;
      else if (c >= 0x0900 && c <= 0x097f) devan++;
      else if (c >= 0x0590 && c <= 0x05ff) hebrew++;
      else if (c >= 0x0370 && c <= 0x03ff) greek++;
      else if (c >= 0x0980 && c <= 0x09ff) beng++;
      else if (c >= 0x0b80 && c <= 0x0bff) tamil++;
      else if (c >= 0x0c00 && c <= 0x0c7f) telugu++;
      else if (c >= 0x0d80 && c <= 0x0dff) sinhala++;
      else if (c >= 0x1780 && c <= 0x17ff) khmer++;
      else if (c >= 0x0e80 && c <= 0x0eff) lao++;
    }
    if (hangul > 0) return 'ko';
    if (hira + kata > 0) return 'ja';
    if (han > 0) return hanVariant(s);
    if (thai > 0) return 'th';
    if (khmer > 0) return 'km';
    if (lao > 0) return 'lo';
    if (sinhala > 0) return 'si';
    if (hebrew > 0) return 'he';
    if (greek > 0) return 'el';
    if (devan > 0) return 'hi';
    if (beng > 0) return 'bn';
    if (tamil > 0) return 'ta';
    if (telugu > 0) return 'te';
    if (arab > 0) return 'ar';
    if (cyr > 0 && cyr >= latin) {
      if (mnc > 0) return 'mn';
      return ukc > 0 ? 'cyrillic_uk' : 'cyrillic_ru';
    }
    if (latin > 0) return 'latin';
    return null;
  }

  var TAG_CHAIN = {
    ja: ['ja'],
    zh: ['zh'],
    zh_hant: ['zh_hant'],
    ko: ['ko'],
    th: ['th'],
    km: ['km'],
    lo: ['lo'],
    he: ['he'],
    el: ['el'],
    hi: ['hi'],
    bn: ['bn'],
    ta: ['ta'],
    te: ['te'],
    ar: ['arabic', 'ar'],
    mn: ['mn', 'cyrillic'],
    si: ['si'],
    cyrillic_uk: ['uk', 'cyrillic'],
    cyrillic_ru: ['cyrillic'],
    latin: ['latin', 'en']
  };

  function resolve(requested, text) {
    if (requested && requested !== 'auto' && PACKS[requested]) return PACKS[requested];
    var tag = detect(text);
    var chain = TAG_CHAIN[tag] || [];
    for (var i = 0; i < chain.length; i++) {
      if (PACKS[chain[i]]) return PACKS[chain[i]];
    }
    return PACKS[DEFAULT_LANG] || PACKS.en;
  }

  function get(id) {
    return PACKS[id] || null;
  }

  function list() {
    return Object.keys(PACKS)
      .map(function (id) {
        return { id: id, name: PACKS[id].name, generic: !!PACKS[id].generic, merged: !!PACKS[id].merged };
      })
      .sort(function (a, b) {
        return a.id < b.id ? -1 : 1;
      });
  }

  // ---- 言語ミュート（選んだ言語の投稿を丸ごと隠す）----
  // detect() が返すタグ単位で選ぶ。文字体系で話者言語を厳密に判別できないものは
  // 統合タグ（cyrillic / latin）も選べるようにしてある。
  // 例: 'ja' は「かな・カタカナを含む投稿」、'cyrillic' はキリル文字全般。
  var MUTE_LANGS = [
    { id: 'ja', name: LANG_NAMES.ja, tags: ['ja'] },
    { id: 'ko', name: LANG_NAMES.ko, tags: ['ko'] },
    { id: 'zh', name: LANG_NAMES.zh, tags: ['zh'] },
    { id: 'zh_hant', name: LANG_NAMES.zh_hant, tags: ['zh_hant'] },
    { id: 'th', name: LANG_NAMES.th, tags: ['th'] },
    { id: 'km', name: LANG_NAMES.km, tags: ['km'] },
    { id: 'lo', name: LANG_NAMES.lo, tags: ['lo'] },
    { id: 'si', name: LANG_NAMES.si, tags: ['si'] },
    { id: 'he', name: LANG_NAMES.he, tags: ['he'] },
    { id: 'el', name: LANG_NAMES.el, tags: ['el'] },
    { id: 'hi', name: LANG_NAMES.hi, tags: ['hi'] },
    { id: 'bn', name: LANG_NAMES.bn, tags: ['bn'] },
    { id: 'ta', name: LANG_NAMES.ta, tags: ['ta'] },
    { id: 'te', name: LANG_NAMES.te, tags: ['te'] },
    { id: 'ar', name: LANG_NAMES.ar, tags: ['ar'] },
    { id: 'mn', name: LANG_NAMES.mn, tags: ['mn'] },
    { id: 'ru', name: LANG_NAMES.ru, tags: ['cyrillic_ru'] },
    { id: 'uk', name: LANG_NAMES.uk, tags: ['cyrillic_uk'] },
    { id: 'cyrillic', name: LANG_NAMES.cyrillic, tags: ['cyrillic_ru', 'cyrillic_uk', 'mn'] },
    { id: 'latin', name: LANG_NAMES.latin, tags: ['latin'] }
  ];

  var MUTE_BY_ID = {};
  MUTE_LANGS.forEach(function (e) {
    MUTE_BY_ID[e.id] = e;
  });

  function muteList() {
    return MUTE_LANGS.map(function (e) {
      return { id: e.id, name: e.name };
    });
  }

  function muteName(id) {
    return MUTE_BY_ID[id] ? MUTE_BY_ID[id].name : String(id == null ? '' : id);
  }

  /** 選んだ言語ミュートに一致する投稿か（'off' と未知の id は常に false） */
  function isMutedLang(id, text) {
    if (!id || id === 'off') return false;
    var entry = MUTE_BY_ID[id];
    if (!entry) return false;
    var tag = detect(text);
    return !!tag && entry.tags.indexOf(tag) >= 0;
  }

  return {
    PACKS: PACKS,
    DEFAULT_LANG: DEFAULT_LANG,
    SCRIPT: SCRIPT,
    MUTE_LANGS: MUTE_LANGS,
    detect: detect,
    resolve: resolve,
    get: get,
    list: list,
    muteList: muteList,
    muteName: muteName,
    isMutedLang: isMutedLang
  };
});
