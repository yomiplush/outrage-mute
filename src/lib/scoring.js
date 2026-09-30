/**
 * 義憤スコアの算出（多言語対応）。
 *
 * 言語パック（src/lib/lang/*）が照合方式・否定・引用・文型を持ち、
 * ここは共通のエンジンとして動く。
 *
 *   1. 辞書の一致（substring=最長一致 / word=単語境界のフレーズ一致）
 *   2. 否定で減衰（ja=語尾 / en・ru・uk=前置 / zh・ko=前置）
 *   3. 引用・伝聞で減衰
 *   4. 文型パターンを加算
 *   5. 書式の誇張（!?の連続, wwww, 全大文字）を加算
 *   6. 合計を 0..1 に飽和変換（1 - exp(-raw / 2.4)）
 *
 * 設計の出発点は thisandagain/sentiment（MIT）の
 * 「トークン→値→comparative」と per-language な scoringStrategy。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./normalize.js'),
      require('./categories.js'),
      require('./lang/index.js'),
      require('./lang/build.js'),
      require('./lang/style.js'),
      require('./lang/disaster.js'),
      require('./lang/selfmock.js'),
      require('./lang/aitopic.js')
    );
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.scoring = factory(JOF.normalize, JOF.categories, JOF.lang, JOF.langBuild, JOF.style, JOF.disaster, JOF.selfmock, JOF.aitopic);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (normalize, categories, lang, build, style, disaster, selfmock, aitopic) {
  'use strict';

  var SATURATION = 2.4;
  var PATTERN_MAX = 3;
  var CAT = categories.CATEGORY_LABELS;

  function startsWithAny(s, list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] && s.indexOf(list[i]) === 0) return list[i];
    }
    return null;
  }

  function endsWithAny(s, list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m && s.length >= m.length && s.slice(s.length - m.length) === m) return m;
    }
    return null;
  }

  function insideQuote(text, index, qc) {
    if (!qc) return false;
    var open = -1;
    var from = Math.max(0, index - 80);
    for (var k = index - 1; k >= from; k--) {
      if (qc.open.indexOf(text.charAt(k)) >= 0) {
        open = k;
        break;
      }
    }
    if (open < 0) return false;
    for (var m = open + 1; m < index; m++) {
      if (qc.close.indexOf(text.charAt(m)) >= 0) return false;
    }
    return true;
  }

  function makeCatFilter(cs) {
    if (!cs) return null;
    if (cs instanceof Set) return cs;
    if (Array.isArray(cs)) return new Set(cs);
    return null;
  }

  function isNegToken(tok, neg) {
    if (!tok || !neg) return false;
    if (neg.markers && neg.markers.indexOf(tok) >= 0) return true;
    if (neg.suffix && tok.length > neg.suffix.length && tok.slice(-neg.suffix.length) === neg.suffix) return true;
    return false;
  }

  function analyze(input, opts) {
    opts = opts || {};
    var catFilter = makeCatFilter(opts.categories);

    var rawText = String(input == null ? '' : input);
    var pack = lang.resolve(opts.lang, rawText);
    var text = normalize.normalize(rawText);
    var fmt = normalize.formatFeatures(rawText);

    var terms = [];
    var byCat = {};
    var rawScore = 0;

    function add(cat, w, entry) {
      if (catFilter && !catFilter.has(cat)) return;
      rawScore += w;
      byCat[cat] = (byCat[cat] || 0) + w;
      if (entry) terms.push(entry);
    }
    function emit(hit, w, kind, start, end) {
      var cat = hit.cat;
      // 災害系は world_affairs から disaster へ移し替える（見る/隠すを独立制御するため）
      if (cat === 'world_affairs' && disaster && disaster.isTerm(hit.n, pack.id)) cat = 'disaster';
      // AI の技術・界隈の話題は ai_dispute から ai_topic へ移し替える
      if (cat === 'ai_dispute' && aitopic && aitopic.isTerm(hit.n, pack.id)) cat = 'ai_topic';
      // 自虐（自己卑下そのもの／一人称＋否定語）は selfmock へ移し替える
      if (cat !== 'selfmock' && selfmock) {
        if (
          selfmock.isSelfTerm(hit.n, pack.id) ||
          (typeof start === 'number' &&
            selfmock.isSelfContext(text, start, typeof end === 'number' ? end : start, pack.id))
        ) {
          cat = 'selfmock';
        }
      }
      add(cat, w, {
        term: hit.term,
        cat: cat,
        label: CAT[cat] || cat,
        weight: Math.round(w * 1000) / 1000,
        kind: kind,
        source: hit.source || ''
      });
    }
    // カテゴリの絞り込みは add() で行う（world_affairs→disaster の再分類があるため）
    function ok() {
      return true;
    }

    // ---- 1-3. 辞書の一致 ----
    if (pack.match === 'word') {
      scanWord(pack, text, emit, ok);
    } else {
      scanSubstring(pack, text, emit, ok);
    }

    // ---- 辞書に無い災害・緊急情報の語（地震速報/避難指示 等）----
    if (disaster) {
      var ex = disaster.extraIndex(pack);
      if (ex && ex.index) scanExtra(ex.match, ex.index, text, emit);
    }
    // ---- 辞書に無い自虐表現（どうせ俺/自分なんて 等）----
    if (selfmock) {
      var exs = selfmock.extraIndex(pack);
      if (exs && exs.index) scanExtra(exs.match, exs.index, text, emit);
    }
    // ---- 辞書に無い AI 技術・界隈の語（機械学習/プロンプト 等）----
    if (aitopic) {
      var exa = aitopic.extraIndex(pack);
      if (exa && exa.index) scanExtra(exa.match, exa.index, text, emit);
    }

    // ---- 4. 文型パターン ----
    (pack.patterns || []).forEach(function (pat) {
      pat.re.lastIndex = 0;
      var count = 0;
      var m;
      while ((m = pat.re.exec(text)) !== null) {
        count++;
        if (pat.re.lastIndex === m.index) pat.re.lastIndex++;
        if (count >= PATTERN_MAX) break;
      }
      if (count > 0) {
        var w = pat.w * count;
        add(pat.cat, w, {
          term: pat.label,
          cat: pat.cat,
          label: CAT[pat.cat] || pat.cat,
          weight: Math.round(w * 1000) / 1000,
          kind: 'pattern',
          count: count
        });
      }
    });

    // ---- 4.5 文体・口調（語彙に依存しない）----
    var styleInfo = null;
    if (style && ok('tone')) {
      styleInfo = style.analyze(rawText, pack.id);
      if (styleInfo.tone > 0) {
        add('tone', styleInfo.tone, {
          term: 'tone',
          cat: 'tone',
          label: CAT.tone,
          weight: Math.round(styleInfo.tone * 1000) / 1000,
          kind: 'style'
        });
      }
    }

    // ---- 5. 書式の誇張 ----
    var em = pack.emphasis || {};
    var fmtScore =
      Math.min(fmt.exclaim, 6) * 0.12 +
      (fmt.exclaimRun >= 3 ? 0.3 : 0) +
      Math.min(fmt.question, 4) * 0.06 +
      Math.max(0, Math.min(fmt.wRun - 1, 5)) * 0.12;
    if (em.caps) fmtScore += Math.min(fmt.caps, 4) * 0.12;
    if (fmtScore > 0) {
      add('amplifier', fmtScore, {
        term: 'amplifier',
        cat: 'amplifier',
        label: CAT.amplifier,
        weight: Math.round(fmtScore * 1000) / 1000,
        kind: 'format'
      });
    }

    // ---- 6. 正規化 ----
    var score = 1 - Math.exp(-rawScore / SATURATION);
    if (score < 0) score = 0;
    if (score > 1) score = 1;

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
      length: text.length,
      lang: pack.id,
      style: styleInfo
    };
  }

  // ---- substring（CJK など） ----
  function scanSubstring(pack, text, emit, ok) {
    var neg = pack.negation || {};
    var report = pack.report || [];
    var i = 0;
    while (i < text.length) {
      var list = pack.BY_FIRST.get(text.charAt(i));
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

      var excluded = false;
      var exList = pack.EXCLUDE_AFTER[hit.term];
      if (exList) {
        for (var e = 0; e < exList.length; e++) {
          if (after.indexOf(exList[e]) === 0) {
            excluded = true;
            break;
          }
        }
      }

      if (!excluded && ok(hit.cat)) {
        var w = hit.w;
        var kind = 'normal';
        if (!hit.noNeg && neg.markers) {
          var isNeg = false;
          if (neg.position === 'after') isNeg = !!startsWithAny(after, neg.markers);
          else if (neg.position === 'before') {
            var before = text.slice(Math.max(0, i - 6), i);
            isNeg = !!endsWithAny(before, neg.markers);
          }
          if (isNeg) {
            w *= 0.2;
            kind = 'negated';
          }
        }
        if (startsWithAny(after, report)) {
          w *= 0.6;
          if (kind === 'normal') kind = 'reported';
        }
        if (insideQuote(text, i, pack.quoteChars)) {
          w *= 0.5;
          if (kind === 'normal') kind = 'quoted';
        }
        emit(hit, w, kind, i, end);
      }
      i = end;
    }
  }

  // ---- word（英語・ロシア語など） ----
  function scanWord(pack, text, emit, ok) {
    var toks = build.tokenizeWithPositions(text);
    var neg = pack.negation || {};
    var report = pack.report || [];
    var i = 0;
    while (i < toks.length) {
      var list = pack.BY_WORD.get(toks[i].w);
      var hit = null;
      var n = 0;
      if (list) {
        for (var t = 0; t < list.length; t++) {
          var e = list[t];
          var len = e.tokens.length;
          if (i + len > toks.length) continue;
          var match = true;
          for (var k = 0; k < len; k++) {
            if (toks[i + k].w !== e.tokens[k]) {
              match = false;
              break;
            }
          }
          if (match) {
            hit = e;
            n = len;
            break;
          }
        }
      }
      if (!hit) {
        i++;
        continue;
      }

      if (ok(hit.cat)) {
        var w = hit.w;
        var kind = 'normal';
        if (!hit.noNeg && neg.position === 'before') {
          var isNeg = false;
          for (var d = 1; d <= 3 && i - d >= 0; d++) {
            if (isNegToken(toks[i - d].w, neg)) {
              isNeg = true;
              break;
            }
          }
          if (isNeg) {
            w *= 0.2;
            kind = 'negated';
          }
        }
        if (report.length && i + n < toks.length && report.indexOf(toks[i + n].w) >= 0) {
          w *= 0.6;
          if (kind === 'normal') kind = 'reported';
        }
        if (insideQuote(text, toks[i].start, pack.quoteChars)) {
          w *= 0.5;
          if (kind === 'normal') kind = 'quoted';
        }
        emit(hit, w, kind, toks[i].start, toks[i + n - 1].end);
      }
      i += n;
    }
  }

  // ---- 追加の災害語スキャン（否定・引用の補正なしの単純一致）----
  function scanExtra(match, index, text, emit) {
    if (match === 'word') {
      var toks = build.tokenizeWithPositions(text);
      var i = 0;
      while (i < toks.length) {
        var list = index.BY_WORD.get(toks[i].w);
        var hit = null;
        var n = 0;
        if (list) {
          for (var t = 0; t < list.length; t++) {
            var e = list[t];
            var len = e.tokens.length;
            if (i + len > toks.length) continue;
            var m = true;
            for (var k = 0; k < len; k++) {
              if (toks[i + k].w !== e.tokens[k]) {
                m = false;
                break;
              }
            }
            if (m) {
              hit = e;
              n = len;
              break;
            }
          }
        }
        if (!hit) {
          i++;
          continue;
        }
        emit(hit, hit.w, 'disaster', toks[i].start, toks[i + n - 1].end);
        i += n;
      }
    } else {
      var j = 0;
      while (j < text.length) {
        var list2 = index.BY_FIRST.get(text.charAt(j));
        var hit2 = null;
        if (list2) {
          for (var q = 0; q < list2.length; q++) {
            if (text.indexOf(list2[q].n, j) === j) {
              hit2 = list2[q];
              break;
            }
          }
        }
        if (!hit2) {
          j++;
          continue;
        }
        emit(hit2, hit2.w, 'disaster', j, j + hit2.n.length);
        j += hit2.n.length;
      }
    }
  }

  return { analyze: analyze, SATURATION: SATURATION };
});
