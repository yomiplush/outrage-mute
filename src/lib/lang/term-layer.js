/**
 * 用語レイヤーの共通ファクトリ。
 *
 * disaster / selfmock / aitopic は「言語ごとの語群を持ち、
 * 正規化済み語がその語か判定し、辞書に無い語だけを追加スキャンする」
 * という同じ構造をしている。その重複をここに集約する。
 *
 * 生成物: { category, groupOf, isTerm, extraIndex }
 *   - isTerm(normTerm, langId) … 既存辞書の語を別カテゴリへ再分類するのに使う
 *   - extraIndex(pack)        … パック辞書に無い語だけの索引（追加スキャン用）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.termLayer = factory(JOF.langBuild);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build) {
  'use strict';

  /**
   * @param {{category:string, weight:number,
   *          langGroups:Object<string,string>, fallbackGroup?:string|null,
   *          groups:Object<string,{match:string, terms:Array}>}} spec
   */
  function createTermLayer(spec) {
    var category = spec.category;
    var langGroups = spec.langGroups || {};
    var fallbackGroup = spec.fallbackGroup || null;
    var built = {};

    function groupOf(id) {
      if (Object.prototype.hasOwnProperty.call(langGroups, id)) return langGroups[id];
      return fallbackGroup;
    }

    function buildGroup(group) {
      if (!group) return null;
      if (Object.prototype.hasOwnProperty.call(built, group)) return built[group];
      var g = spec.groups[group];
      if (!g) {
        built[group] = null;
        return null;
      }
      var rows = g.terms.map(function (t) {
        return [t, spec.weight, category];
      });
      var lex = build.build(rows, { match: g.match });
      var set = new Set();
      lex.TERMS.forEach(function (e) {
        set.add(e.n);
      });
      built[group] = { match: g.match, lex: lex, set: set };
      return built[group];
    }

    /** 正規化済み語がこのレイヤーの語か */
    function isTerm(normTerm, langId) {
      var b = buildGroup(groupOf(langId));
      return !!(b && b.set.has(normTerm));
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
    /** 言語パックに無い語だけの索引（追加スキャン用。無ければ index:null） */
    function extraIndex(pack) {
      var cached = EXTRA_CACHE.get(pack);
      if (cached) return cached;
      var b = buildGroup(groupOf(pack.id));
      var res = { match: null, index: null };
      if (b) {
        var known = packTermSet(pack);
        var rows = b.lex.TERMS.filter(function (e) {
          return !known.has(e.n);
        }).map(function (e) {
          return [e.term, e.w, category];
        });
        res.match = b.match;
        res.index = rows.length ? build.build(rows, { match: b.match }) : null;
      }
      EXTRA_CACHE.set(pack, res);
      return res;
    }

    return { category: category, groupOf: groupOf, isTerm: isTerm, extraIndex: extraIndex };
  }

  return { createTermLayer: createTermLayer };
});
