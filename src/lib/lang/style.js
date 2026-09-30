/**
 * 文体・口調から感情（特に義憤・敵意）を推定するレイヤー。
 *
 * 語彙辞書では拾えない「言い方」を評価する:
 *   - 覚醒度(arousal): 感嘆符の連続、疑問符の連打、長音・繰り返し、全大文字、短文連打、笑い
 *   - 敵意の型(hostility style): 二人称、命令・禁止、詰問・反語、皮肉、感嘆詞、怒り/侮蔑の絵文字
 *
 * 重要: 覚醒度は単独では加点しない（「すごい！！！！」を誤爆させないため）。
 *       敵意シグナルが一定以上あるときだけ、覚醒度を“倍率”として掛ける。
 *
 * 絵文字・記号・繰り返しは言語非依存。二人称・命令・皮肉の型は言語別テーブル。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).style = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---- 絵文字（感情価）。サロゲートペアを正しく扱うため配列に変換 ----
  var EMOJI = {
    anger: Array.from('😡🤬😠💢👿'),
    disgust: Array.from('🤮😒🙄😏🖕🤢😤'),
    sad: Array.from('😢😭💔😞😔'),
    joy: Array.from('😊😍🥰😂🤣🎉👍❤✨🙏😆')
  };

  var HOSTILITY_FLOOR = 0.9; // これ未満は「敵意なし」とみなす（二人称だけでは発火しない）

  // ---- 言語別の文体テーブル ----
  var LANG = {
    ja: {
      secondPerson: ['お前', 'おまえ', 'てめえ', 'てめぇ', 'あんた', '貴様', 'きさま', '君'],
      imperative: /(しろよ|しろ|するな|やめろ|止めろ|黙れ|消えろ|失せろ|来い|行け|やれ|考えろ|反省しろ|謝れ)(?=[!?。、\s]|$)/,
      rhetorical: /(ふざけ|なめて|なめんな|何言って|どういうつもり|いい加減に|よく考えろ|だと？|って言うの)/,
      sarcasm: /(はいはい|ざまあ|いい気味|お気の毒|さすがですね)/,
      interjection: ['はぁ', 'はあ', 'うわ', 'おい', 'あー', 'ああ', 'ちっ', 'ふん', 'はん', 'おっと']
    },
    en: {
      secondPerson: ['you', 'your', 'yours'],
      imperative: /\b(shut up|go away|get out|stop it|grow up|calm down|piss off|screw you)\b/,
      rhetorical: /\b(what did you say|are you serious|how dare|what the hell|are you kidding|who do you think|are you insane)\b/,
      sarcasm: /\b(yeah right|sure you did|good luck with that|cry more|ok boomer|as if)\b/,
      interjection: ['ugh', 'wow', 'seriously', 'ffs', 'jesus']
    }
  };

  var W = {
    secondPerson: 0.5,
    imperative: 1.2,
    rhetorical: 1.2,
    sarcasm: 1.8,
    interjection: 0.6,
    emojiAnger: 1.5,
    emojiDisgust: 1.5,
    emojiSad: 0.4
  };
  var CAP = { secondPerson: 2, imperative: 2, rhetorical: 2, sarcasm: 2, interjection: 2, emojiAnger: 2, emojiDisgust: 2, emojiSad: 1 };

  function clean(raw) {
    var s = String(raw == null ? '' : raw);
    return s
      .replace(/https?:\/\/[^\s\u3000]+/gi, ' ')
      .replace(/www\.[^\s\u3000]+/gi, ' ')
      .replace(/@[A-Za-z0-9_]{1,30}/g, ' ')
      .replace(/！/g, '!')
      .replace(/？/g, '?');
  }

  function countEmoji(s, set) {
    var n = 0;
    for (var i = 0; i < s.length; ) {
      var cp = s.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      i += ch.length;
      if (set.indexOf(ch) >= 0) n++;
    }
    return n;
  }

  function countOccur(s, ch) {
    var n = 0;
    for (var i = 0; i < s.length; i++) if (s.charAt(i) === ch) n++;
    return n;
  }

  function maxRun(s, re) {
    var m;
    var max = 0;
    var r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
    while ((m = r.exec(s)) !== null) {
      if (m[0].length > max) max = m[0].length;
      if (r.lastIndex === m.index) r.lastIndex++;
    }
    return max;
  }

  function countMatches(s, re) {
    var r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
    var n = 0;
    var m;
    while ((m = r.exec(s)) !== null) {
      n++;
      if (r.lastIndex === m.index) r.lastIndex++;
    }
    return n;
  }

  function countAny(s, list, cap) {
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      var idx = s.indexOf(list[i]);
      while (idx >= 0) {
        n++;
        idx = s.indexOf(list[i], idx + list[i].length);
      }
      if (n >= cap) break;
    }
    return Math.min(n, cap);
  }

  /**
   * @param {string} raw 生テキスト（句読点・絵文字を保持）
   * @param {string} langId 言語パック id
   */
  function analyze(raw, langId) {
    var s = clean(raw);
    var hits = [];
    var table = LANG[langId] || null;

    // ---- 敵意の型 ----
    var hostility = 0;

    if (table) {
      var sp = countAny(s, table.secondPerson, CAP.secondPerson);
      if (sp) {
        hostility += sp * W.secondPerson;
        hits.push({ kind: 'secondPerson', weight: sp * W.secondPerson });
      }
      var impRaw = countMatches(s, table.imperative);
      var imp = Math.min(impRaw, CAP.imperative);
      if (imp) {
        hostility += imp * W.imperative;
        hits.push({ kind: 'imperative', weight: imp * W.imperative });
      }
      var rht = Math.min(countMatches(s, table.rhetorical), CAP.rhetorical);
      if (rht) {
        hostility += rht * W.rhetorical;
        hits.push({ kind: 'rhetorical', weight: rht * W.rhetorical });
      }
      var sar = Math.min(countMatches(s, table.sarcasm), CAP.sarcasm);
      if (sar) {
        hostility += sar * W.sarcasm;
        hits.push({ kind: 'sarcasm', weight: sar * W.sarcasm });
      }
      var intj = countAny(s, table.interjection, CAP.interjection);
      if (intj) {
        hostility += intj * W.interjection;
        hits.push({ kind: 'interjection', weight: intj * W.interjection });
      }
    }

    // 絵文字（言語非依存）
    var anger = Math.min(countEmoji(s, EMOJI.anger), CAP.emojiAnger);
    var disgust = Math.min(countEmoji(s, EMOJI.disgust), CAP.emojiDisgust);
    var sad = Math.min(countEmoji(s, EMOJI.sad), CAP.emojiSad);
    var joy = countEmoji(s, EMOJI.joy);
    if (anger) {
      hostility += anger * W.emojiAnger;
      hits.push({ kind: 'emoji', label: 'anger', weight: anger * W.emojiAnger });
    }
    if (disgust) {
      hostility += disgust * W.emojiDisgust;
      hits.push({ kind: 'emoji', label: 'disgust', weight: disgust * W.emojiDisgust });
    }
    if (sad) {
      hostility += sad * W.emojiSad;
      hits.push({ kind: 'emoji', label: 'sad', weight: sad * W.emojiSad });
    }

    // ---- 覚醒度（単独では加点しない）----
    var exclaim = countOccur(s, '!');
    var question = countOccur(s, '?');
    var exclaimRun = maxRun(s, /!{2,}/g);
    var questionRun = maxRun(s, /\?{2,}/g);
    var repeat = Math.min(countMatches(s, /(.)\1{2,}/gu), 2);
    var laugh =
      Math.min(countMatches(s, /笑/g) + countMatches(s, /[wWｗＷ]{3,}/g), 1) * 0.3;
    var lines = s.split(/\n+/).filter(function (x) {
      return x.trim().length;
    });
    var shortBurst = lines.length >= 4 && s.length / lines.length < 14 ? 0.3 : 0;

    var arousal =
      Math.min(exclaim, 6) * 0.1 +
      Math.max(0, Math.min(exclaimRun - 1, 5)) * 0.12 +
      Math.min(question, 4) * 0.05 +
      Math.max(0, Math.min(questionRun - 1, 3)) * 0.1 +
      repeat * 0.25 +
      laugh +
      shortBurst;

    // ---- 統合 ----
    var tone = 0;
    if (hostility >= HOSTILITY_FLOOR) {
      tone = hostility * (1 + arousal * 0.5);
      // ポジティブ絵文字が優勢なら減衰（祝福・称賛を誤爆させない）
      if (joy > 0 && anger === 0 && disgust === 0) tone *= 0.2;
    }

    if (tone > 0) {
      hits.push({ kind: 'arousal', weight: Math.round(arousal * 1000) / 1000 });
    }

    return {
      tone: Math.round(tone * 1000) / 1000,
      hostility: Math.round(hostility * 1000) / 1000,
      arousal: Math.round(arousal * 1000) / 1000,
      emoji: { anger: anger, disgust: disgust, sad: sad, joy: joy },
      hits: hits
    };
  }

  return { analyze: analyze, EMOJI: EMOJI, HOSTILITY_FLOOR: HOSTILITY_FLOOR };
});
