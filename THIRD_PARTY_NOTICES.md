# 第三者ライセンス / Third-Party Notices

本プロジェクトは MIT License（[LICENSE](LICENSE)）です。以下は、本プロジェクトが利用・参考にしている第三者著作物です。

---

## 1. MosasoM/inappropriate-words-ja（辞書データを取り込み）

- 出典: https://github.com/MosasoM/inappropriate-words-ja
- ライセンス: **MIT License**
- 著作権: Copyright (c) 2020 K Hashimoto
- 利用内容:
  - `Offensive.txt`（攻撃的・差別的な表現リスト, 暫定版）を `vendor/inappropriate-words-ja/Offensive.txt` として同梱（改変なし）
  - 同リストの語を、重み・カテゴリを付けて `src/lib/lexicon.vendor.js` に収録
- MIT License 全文: [`vendor/inappropriate-words-ja/LICENSE`](vendor/inappropriate-words-ja/LICENSE)

## 2. thisandagain/sentiment（設計上の参考のみ）

- 出典: https://github.com/thisandagain/sentiment
- ライセンス: **MIT License**
- 利用内容: 「トークン→値の合算」および言語ごとの `scoringStrategy`（否定・強調の補正）という**考え方**を参考にしています。**ソースコードの流用はありません。**

## 3. ikegami-yukino/oseti（参考・不採用の記録）

- 出典: https://github.com/ikegami-yukino/oseti
- ライセンス: **MIT License**（Copyright (c) 2019 IKEGAMI Yukino）
- 利用内容: 日本語の辞書ベース感情分析の実装例として参照。
- 不採用の理由: 同ライブラリが用いる `日本語評価極性辞書` は「肯定/否定」の極性辞書であり、本プロジェクトが対象とする「義憤（攻撃性・煽動性）」とは評価軸が異なるため、**辞書データは取り込んでいません**。
- 参考: 同辞書の出典（Kobayashi et al. 2005 / Higashiyama et al. 2008）の権利は原著作者に帰属します。

---

## 本プロジェクトが独自に追加した語について

`src/lib/lexicon.vendor.js` の `EXTRA`、および `src/lib/lexicon.curated.js` の語は、本プロジェクトの作者が独自に選定・重み付けしたものであり、上記 OSS のデータではありません。同じく本プロジェクトの MIT License で提供されます。
