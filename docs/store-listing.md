# Chrome Web Store — 提出用メモ

審査で見られる項目（単一目的・権限の正当性・プライバシー・リモートコード）を、
そのまま貼れる形でまとめたもの。提出前に `npm run check` を実行する。

- プライバシーポリシー: [`PRIVACY.md`](../PRIVACY.md)
- 事前チェック: `npm run lint:store`（`scripts/check-store.mjs`）
- 配布物: `npm run package` → `dist/outrage-mute-<version>.zip`

---

## 1. ストア掲載情報

| 項目 | 値 |
| --- | --- |
| 名前 | 義憤ミュート (Outrage Mute)（`_locales/*/messages.json` の `extName`） |
| カテゴリ | ソーシャル & コミュニケーション（Social & Communication） |
| 言語 | 日本語 / English（他は既定ロケールにフォールバック） |
| プライバシーポリシー URL | `https://github.com/yomiplush/outrage-mute/blob/main/PRIVACY.md` |
| ホームページ | `https://github.com/yomiplush/outrage-mute` |
| サポート | `https://github.com/yomiplush/outrage-mute/issues` |

### 短い説明（132文字以内）

- 日本語（約60字）:
  `Xの投稿を端末内だけで判定し、攻撃的・扇情的な投稿をぼかす／隠す拡張。通信なし・アカウント不要・権限は最小限。`
- English:
  `Scores X posts on your device and blurs or hides outrage-bait. No network requests, no account, minimal permissions.`

### 詳細説明（たたき台）

```
X（旧Twitter）のタイムラインを、端末内の辞書とヒューリスティックだけで判定し、
攻撃的・扇情的な投稿を「ぼかす」または「完全に隠す」拡張機能です。

・すべて端末内で完結（外部通信・アカウント・APIキー不要、解析なし）
・しきい値、隠し方（ぼかし／完全非表示）、カテゴリをポップアップで調整
・理由バッジ付きのぼかし。「表示」で確認、「ミュート」で戻す
・言語ミュート: 読まない言語の投稿をまとめて非表示
・アート集中モード（やさしめ／ふつう／きびしめ）で一括調整
・災害・緊急情報は独立トグル（既定は表示のまま）
・ユーザー辞書（自分のミュートワード）に対応
・52言語の辞書パック、UIは49ロケール
・Shift+1 で一時停止／再開（PCのみ）
・自分の投稿は除外、通知バッジを静かにするオプション

権限は「storage」とX上でのサイトアクセスだけです。
設定と「隠した件数」のローカルカウンタ以外は保存せず、どこにも送信しません。
```

---

## 2. 単一目的（Single purpose）の説明

> X（x.com / twitter.com）の投稿を端末内でスコア判定し、攻撃的・扇情的な投稿を
> CSS でぼかす／非表示にする。これが唯一の目的です。
>
> 判定はローカルの辞書とヒューリスティックのみで行い、投稿本文・設定・統計を
> 外部へ送信する機能はありません。通知バッジの非表示や言語ミュートは、
> 同じ「タイムラインを穏やかにする」目的の付随機能です。

英語で書く場合:

> The single purpose of this extension is to score posts on X locally and
> blur/hide posts that look aggressive or inflammatory. All related toggles
> (notification badges, language mute, focus presets) serve the same purpose.

---

## 3. 権限の正当性（Permission justification）

| 権限 | ダッシュボードに書く内容 |
| --- | --- |
| `storage` | 設定（しきい値・カテゴリ・言語・マイミュートワード）と、隠した件数のローカルカウンタを `chrome.storage.local` に保存するためだけに使用します。`storage.sync` は使わず、端末外へ出ることはありません。 |
| サイトアクセス `https://x.com/*`, `https://twitter.com/*` | 投稿本文を読み取り、端末内でスコアを計算して CSS クラスを付けるために content script を注入します。ページ内容の外部送信は行いません。 |
| リモートコード | 使用していません。すべての JS はパッケージ内に同梱し、`eval`／`new Function`／リモートスクリプト読み込みはありません（CSP: `script-src 'self'`）。 |
| `web_accessible_resources` | 使用していません（ページから拡張資産を読める状態にしていません）。 |

`host_permissions` は宣言していません（content script の `matches` のみ）。
タブ操作・スクリプト注入 API・Cookie・履歴などの権限は要求していません。

---

## 4. プライバシータブ（Privacy practices）の回答

| 質問 | 回答 |
| --- | --- |
| ユーザーデータを収集しますか | **いいえ**（全項目オフ） |
| データを第三者へ販売しますか | いいえ |
| データを承認されていない目的に使いますか | いいえ |
| 認証情報を扱いますか | いいえ |
| 財務・健康・通信内容などを扱いますか | いいえ（投稿本文は端末内の判定にのみ使用し、保存・送信しません） |
| リモートコードを使用しますか | いいえ |
| Limited Use への準拠 | はい |

> 判定対象の投稿本文は「ページ上に表示されている内容を、その場のスコア計算に
> 使うだけ」で、保存も送信もしません。端末内に残るのは設定と件数カウンタのみです。

---

## 5. 審査担当者へのメモ（Review notes）

```
この拡張はログイン不要・アカウント不要で動作を確認できます。

1. 拡張をインストールし、https://x.com/home を開く（未ログインでも表示のみ可能）
2. タイムライン上で、しきい値以上の投稿がぼかされ、右下に件数バーが出ます
3. ツールバーのアイコン → ポップアップの「スコアを試す」に
   例「こいつは本当に無能だ。絶対に許さない。」を入力すると、
   判定（スコア・カテゴリ・一致語）が確認できます
4. DevTools の Network タブを開いたまま操作しても、外部リクエストは発生しません
5. 権限は storage と x.com / twitter.com へのアクセスのみです

プライバシー: すべて端末内で処理し、収集・送信・販売はありません。
ポリシー: https://github.com/yomiplush/outrage-mute/blob/main/PRIVACY.md
```

スクリーンショットは「ぼかし＋理由バッジ」「ポップアップの設定画面」「判定プレビュー」の
3枚があると審査・掲載の両方で伝わりやすい（`docs/demo.html` はリポジトリ内の
プレイグラウンドで、配布 ZIP には含めていない）。

---

## 6. 審査で突かれやすい点と対策

| 指摘されがちな点 | この拡張での状態 |
| --- | --- |
| 権限が広すぎる | `storage` のみ。ホスト権限は宣言せず、content script の対象は x.com / twitter.com だけ |
| ページから読める拡張資産 | `web_accessible_resources` なし（ロケール表は service worker 経由で配信） |
| リモートコード | なし。CSP を明示し、`npm run lint:store` で `eval`・`new Function`・リモート fetch を機械的に禁止 |
| プライバシー記載と実装の不一致 | 通信コードなし。ポリシーに権限・保存内容・削除方法を明記 |
| 説明文と機能の不一致 | 掲載文は README の機能一覧から作成。既定値（災害情報は表示、通知バッジ非表示は OFF）も明記 |
| サイトの機能を壊す | DOM への追加は CSS クラスと拡張自身のオーバーレイのみ。X 側のデータを書き換えない |
| 商標・提携の誤認 | 「X（旧Twitter）向けの非公式拡張。X Corp. とは無関係」と説明文に明記する |
| 二重目的と見なされる | 「タイムラインを穏やかにする」単一目的の範囲に全機能を整理（上記 2.） |

---

## 7. 提出前チェックリスト

1. `npm run check`（テスト → ストア向け検査 → ZIP/ユーザースクリプト生成）が通る
2. `manifest.json` と `package.json` の `version` が同じ（`lint:store` が検査）
3. `dist/outrage-mute-<version>.zip` をアップロード（ZIP 内のルートに `manifest.json`）
4. ストア掲載情報（短い説明・詳細説明・スクリーンショット・カテゴリ）を更新
5. プライバシー URL が最新の `PRIVACY.md` を指している
6. 変更点を README / リリースノートに記載

`npm run lint:store` が見るもの: MV3 / 権限 / CSP / `web_accessible_resources` /
`__MSG_` の解決と文字数（name 75・description 132）/ アイコンの実寸 /
禁止 API・リモート fetch / インラインスクリプト / ZIP の中身。
