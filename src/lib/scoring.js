/**
 * 義憤スコアの算出。
 *
 * 手順:
 *   1. 正規化したテキストを辞書の最長一致でスキャンし、語ごとに重みを加算
 *   2. 否定語尾（〜ない/〜ではない）で減衰（noNeg 語は除外）
 *   3. 引用（「」内）や伝聞（〜という/〜らしい）で減衰
 *   4. 文型パターン（〜すべき/〜しろ 等）を加算
 *   5. 書式の誇張（!? の連続, wwww）を加算
 *   6. 合計を 0..1 に飽和変換（1 - exp(-raw / SATURATION)）
 *
 * これは thisandagain/sentiment（MIT）の「トークン→値→comparative」と
 * per-language な scoringStrategy の考え方を、日本語の義憤向けに作り直したもの。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./normalize.js'), require('./lexicon.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.scoring = factory(JOF.normalize, JOF.lexicon);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (normalize, lexicon) {
  'use strict';

  var SATURATION = 2.4;

  // 直後に来たら「否定」とみなす語尾（長い順）
  var NEG_AFTER = [
    'ではありません',
    'じゃありません',
    'わけではない',
    'とは限らない',
    'なんかじゃない',
    'ではない',
    'じゃない',
    'では無い',
    'じゃねえ',
    'じゃねぇ',
    'なかった',
    'ませんでした',
    'ません',
    'ない',
    'ねえ',
    'ねぇ',
    'ぬ'
  ];

  // 直後に来たら「伝聞・引用」とみなす語尾
  var REPORT_AFTER = ['という', 'と言う', 'とか', 'らしい', 'みたい', 'って', 'との', 'だと', 'そうだ', 'だって'];

  var QUOTE_OPEN = '「『“"';
  var QUOTE_CLOSE = '」』”"';

  var PATTERN_MAX = 3; // 同一パターンの最大加算回数

  function startsWithAny(s, list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] && s.indexOf(list[i]) === 0) return list[i];
    }
    return null;
  }

  /** index が「」や“”の内側かどうか（直近の開き括弧が閉じられていないか）。 */
  function isInsideQuote(text, index) {
    var from = Math.max(0, index - 60);
    var open = -1;
    for (var k = index - 1; k >= from; k--) {
      if (QUOTE_OPEN.indexOf(text.charAt(k)) >= 0) {
        open = k;
        break;
      }
    }
    if (open < 0) return false;
    for (var m = open + 1; m < index; m++) {
      if (QUOTE_CLOSE.indexOf(text.charAt(m)) >= 0) return false;
    }
    return true;
  }

  function makeCatFilter(categories) {
    if (!categories) return null;
    if (categories instanceof Set) return categories;
    if (Array.isArray(categories)) return new Set(categories);
    return null;
  }

  /**
   * テキストを解析してスコアを返す。
   * @param {string} input
   * @param {{categories?: Set<string>|string[]}} [opts]
   */
  function analyze(input, opts) {
    opts = opts || {};
    var catFilter = makeCatFilter(opts.categories);

    var rawText = String(input == null ? '' : input);
    var text = normalize.normalize(rawText);
    var fmt = normalize.formatFeatures(rawText);

    var terms = [];
    var byCat = {};
    var rawScore = 0;

    function add(cat, weight, entry) {
      if (catFilter && !catFilter.has(cat)) return;
      rawScore += weight;
      byCat[cat] = (byCat[cat] || 0) + weight;
      if (entry) terms.push(entry);
    }

    // --- 1-3. 辞書スキャン（最長一致） ---
    var i = 0;
    while (i < text.length) {
      var list = lexicon.BY_FIRST.get(text.charAt(i));
      var hit = null;
      if (list) {
        for (var t = 0; t < list.length; t++) {
          if (text.indexOf(list[t].n, i) === i) {
            hit = list[t];
            break;
          }
        }
      }
      if (!hit) {
        i++;
        continue;
      }

      var end = i + hit.n.length;
      var after = text.slice(end, end + 8);

      // 部分一致の誤検知対策（例: カス+タ = カスタム）
      var exList = lexicon.EXCLUDE_AFTER[hit.term];
      var excluded = false;
      if (exList) {
        for (var e = 0; e < exList.length; e++) {
          if (after.indexOf(exList[e]) === 0) {
            excluded = true;
            break;
          }
        }
      }
      if (!excluded) {
        var w = hit.w;
        var kind = 'normal';
        if (!hit.noNeg) {
          var neg = startsWithAny(after, NEG_AFTER);
          if (neg) {
            w *= 0.2;
            kind = 'negated';
          }
        }
        if (startsWithAny(after, REPORT_AFTER)) {
          w *= 0.6;
          if (kind === 'normal') kind = 'reported';
        }
        if (isInsideQuote(text, i)) {
          w *= 0.5;
          if (kind === 'normal') kind = 'quoted';
        }
        add(hit.cat, w, {
          term: hit.term,
          cat: hit.cat,
          label: lexicon.CATEGORY_LABELS[hit.cat] || hit.cat,
          weight: Math.round(w * 1000) / 1000,
          kind: kind
        });
      }
      i = end;
    }

    // --- 4. 文型パターン ---
    for (var p = 0; p < lexicon.PATTERNS.length; p++) {
      var pat = lexicon.PATTERNS[p];
      pat.re.lastIndex = 0;
      var count = 0;
      var m;
      while ((m = pat.re.exec(text)) !== null) {
        count++;
        if (pat.re.lastIndex === m.index) pat.re.lastIndex++;
        if (count >= PATTERN_MAX) break;
      }
      if (count > 0) {
        var addW = pat.w * count;
        add(pat.cat, addW, {
          term: pat.label,
          cat: pat.cat,
          label: lexicon.CATEGORY_LABELS[pat.cat] || pat.cat,
          weight: Math.round(addW * 1000) / 1000,
          kind: 'pattern',
          count: count
        });
      }
    }

    // --- 5. 書式の誇張 ---
    var fmtScore =
      Math.min(fmt.exclaim, 6) * 0.12 +
      (fmt.exclaimRun >= 3 ? 0.3 : 0) +
      Math.min(fmt.question, 4) * 0.06 +
      Math.max(0, Math.min(fmt.wRun - 1, 5)) * 0.12;
    if (fmtScore > 0) {
      add('amplifier', fmtScore, {
        term: '誇張表現',
        cat: 'amplifier',
        label: lexicon.CATEGORY_LABELS.amplifier,
        weight: Math.round(fmtScore * 1000) / 1000,
        kind: 'format'
      });
    }

    var score = 1 - Math.exp(-rawScore / SATURATION);
    if (score < 0) score = 0;
    if (score > 1) score = 1;

    // カテゴリを強い順に
    var cats = Object.keys(byCat).sort(function (a, b) {
      return byCat[b] - byCat[a];
    });

    return {
      score: score,
      raw: Math.round(rawScore * 100) / 100,
      terms: terms,
      byCat: byCat,
      categories: cats,
      format: fmt,
      length: text.length
    };
  }

  return { analyze: analyze, SATURATION: SATURATION };
});
