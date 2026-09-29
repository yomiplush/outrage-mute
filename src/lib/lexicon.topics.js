/**
 * トピック系カテゴリの辞書（オプション・既定OFF）。
 *
 * 義憤系（lexicon.curated.js）が「言い方の攻撃性」を見るのに対し、
 * こちらは「話題そのもの」を検出する。ポップアップのトグルで
 * 有効にしたときだけ働く（既定は無効）。
 *
 * 重みは「1語ヒットで既定しきい値 0.5 を超える」ように 2.2 前後にしている
 * （1 - exp(-2.2/2.4) ≒ 0.60）。明示的な陰謀論・対立フレーズは 2.4〜2.6。
 *
 * 形式: [ 表層形, 重み, カテゴリ ]
 * ラテン文字は正規化で小文字化されるため、ChatGPT などはそのまま書いてよい。
 * 部分一致の誤検知対策は lexicon.js の EXCLUDE_AFTER を参照。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).lexiconTopics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return [
    // ---- politics: 政治 ----
    ['政治', 2.2, 'politics'],
    ['政府', 2.2, 'politics'],
    ['政治資金', 2.4, 'politics'],
    ['政治家', 2.2, 'politics'],
    ['政権', 2.2, 'politics'],
    ['与党', 2.2, 'politics'],
    ['野党', 2.2, 'politics'],
    ['政党', 2.2, 'politics'],
    ['党首', 2.2, 'politics'],
    ['自民党', 2.4, 'politics'],
    ['立憲民主党', 2.4, 'politics'],
    ['公明党', 2.4, 'politics'],
    ['共産党', 2.4, 'politics'],
    ['維新の会', 2.4, 'politics'],
    ['国民民主党', 2.4, 'politics'],
    ['れいわ新選組', 2.4, 'politics'],
    ['首相', 2.2, 'politics'],
    ['総理', 2.2, 'politics'],
    ['官邸', 2.2, 'politics'],
    ['内閣', 2.2, 'politics'],
    ['国会', 2.2, 'politics'],
    ['国会議員', 2.4, 'politics'],
    ['議員', 2.0, 'politics'],
    ['大臣', 2.0, 'politics'],
    ['知事', 1.8, 'politics'],
    ['都知事', 2.2, 'politics'],
    ['選挙', 2.2, 'politics'],
    ['選挙区', 2.2, 'politics'],
    ['投票', 2.0, 'politics'],
    ['改憲', 2.4, 'politics'],
    ['護憲', 2.4, 'politics'],
    ['憲法', 2.2, 'politics'],
    ['九条', 1.8, 'politics'],
    ['外交', 2.0, 'politics'],
    ['安保', 2.2, 'politics'],
    ['防衛費', 2.2, 'politics'],
    ['軍拡', 2.4, 'politics'],
    ['増税', 2.2, 'politics'],
    ['減税', 2.0, 'politics'],
    ['消費税', 2.2, 'politics'],
    ['裏金', 2.4, 'politics'],
    ['献金', 2.2, 'politics'],
    ['汚職', 2.2, 'politics'],
    ['移民政策', 2.4, 'politics'],
    ['外国人政策', 2.2, 'politics'],
    ['難民', 2.0, 'politics'],
    ['大統領', 2.2, 'politics'],
    ['大統領選', 2.4, 'politics'],
    ['トランプ', 2.0, 'politics'],
    ['バイデン', 2.0, 'politics'],
    ['プーチン', 2.0, 'politics'],
    ['ゼレンスキー', 2.0, 'politics'],
    ['習近平', 2.0, 'politics'],
    ['抗議デモ', 2.0, 'politics'],
    ['デモ隊', 2.0, 'politics'],

    // ---- conspiracy: 陰謀論 ----
    ['陰謀', 2.4, 'conspiracy'],
    ['陰謀論', 2.6, 'conspiracy'],
    ['ディープステート', 2.6, 'conspiracy'],
    ['新世界秩序', 2.6, 'conspiracy'],
    ['ニューワールドオーダー', 2.6, 'conspiracy'],
    ['グレートリセット', 2.6, 'conspiracy'],
    ['世界経済フォーラム', 2.2, 'conspiracy'],
    ['グローバリスト', 2.6, 'conspiracy'],
    ['支配層', 2.4, 'conspiracy'],
    ['黒幕', 2.0, 'conspiracy'],
    ['裏で操る', 2.4, 'conspiracy'],
    ['イルミナティ', 2.6, 'conspiracy'],
    ['フリーメイソン', 2.6, 'conspiracy'],
    ['ロスチャイルド', 2.6, 'conspiracy'],
    ['ユダヤ陰謀', 2.8, 'conspiracy'],
    ['レプティリアン', 2.6, 'conspiracy'],
    ['爬虫類人', 2.6, 'conspiracy'],
    ['qアノン', 2.6, 'conspiracy'],
    ['人口削減', 2.6, 'conspiracy'],
    ['人口削減計画', 2.6, 'conspiracy'],
    ['ケミカルトレイル', 2.6, 'conspiracy'],
    ['地球温暖化は嘘', 2.6, 'conspiracy'],
    ['温暖化詐欺', 2.6, 'conspiracy'],
    ['気候変動詐欺', 2.6, 'conspiracy'],
    ['気候変動は嘘', 2.6, 'conspiracy'],
    ['ワクチン陰謀', 2.6, 'conspiracy'],
    ['ワクチン人体実験', 2.6, 'conspiracy'],
    ['mrna危険', 2.4, 'conspiracy'],
    ['マイクロチップ', 2.2, 'conspiracy'],
    ['電磁波攻撃', 2.4, 'conspiracy'],
    ['5g陰謀', 2.6, 'conspiracy'],
    ['フラットアース', 2.6, 'conspiracy'],
    ['地球平面説', 2.6, 'conspiracy'],
    ['月面着陸は嘘', 2.6, 'conspiracy'],
    ['自作自演', 2.2, 'conspiracy'],
    ['マスゴミ', 2.2, 'conspiracy'],
    ['情報操作', 2.0, 'conspiracy'],
    ['フェイクニュース', 2.0, 'conspiracy'],
    ['メディアは真実を隠', 2.6, 'conspiracy'],
    ['真実を隠して', 2.2, 'conspiracy'],

    // ---- ai_dispute: AI論争・AI話題 ----
    ['ai論争', 2.6, 'ai_dispute'],
    ['ai脅威', 2.6, 'ai_dispute'],
    ['ai脅威論', 2.6, 'ai_dispute'],
    ['ai失業', 2.6, 'ai_dispute'],
    ['aiが仕事を奪う', 2.6, 'ai_dispute'],
    ['aiに仕事を奪われる', 2.6, 'ai_dispute'],
    ['aiが人類', 2.6, 'ai_dispute'],
    ['aiで人類滅亡', 2.6, 'ai_dispute'],
    ['aiによる人類滅亡', 2.6, 'ai_dispute'],
    ['aiの暴走', 2.6, 'ai_dispute'],
    ['ai暴走', 2.6, 'ai_dispute'],
    ['aiが支配', 2.6, 'ai_dispute'],
    ['aiに支配される', 2.6, 'ai_dispute'],
    ['aiバブル', 2.4, 'ai_dispute'],
    ['ai投資バブル', 2.4, 'ai_dispute'],
    ['シンギュラリティ', 2.4, 'ai_dispute'],
    ['汎用人工知能', 2.4, 'ai_dispute'],
    ['人工知能', 2.2, 'ai_dispute'],
    ['ai規制', 2.2, 'ai_dispute'],
    ['ai検閲', 2.2, 'ai_dispute'],
    ['反ai', 2.2, 'ai_dispute'],
    ['生成ai', 2.2, 'ai_dispute'],
    ['大規模言語モデル', 2.2, 'ai_dispute'],
    ['ディープフェイク', 2.2, 'ai_dispute'],
    ['deepfake', 2.2, 'ai_dispute'],
    ['chatgpt', 2.2, 'ai_dispute'],
    ['openai', 2.2, 'ai_dispute'],
    ['gemini', 2.0, 'ai_dispute'],
    ['claude', 2.0, 'ai_dispute'],
    ['aiは嘘', 2.4, 'ai_dispute'],
    ['aiが嘘', 2.4, 'ai_dispute']
  ];
});
