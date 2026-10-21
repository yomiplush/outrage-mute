# Privacy Policy — Outrage Mute (義憤ミュート)

**Effective date:** 2026-10-15
**Last updated:** 2026-10-21
**Applies to:** the Chrome extension "Outrage Mute" (Chrome Web Store) and the
optional userscript builds of the same project.

## Summary

**Outrage Mute does not collect, transmit, sell, or share any personal data.**

Everything the extension does happens on your device, inside your browser. The
extension contains no analytics, no advertising, no tracking, no account
system, and **no networking code at all** — it never contacts a server.

## What the extension does

Outrage Mute reads the text of posts that X (x.com / twitter.com) has already
rendered in your browser, scores that text locally with a bundled dictionary and
a set of heuristics, and blurs or hides posts whose score is at or above the
threshold you chose. Optionally it also hides notification/DM badges on X.

- Scoring runs **entirely on your device**. No machine learning service, no API
  key, no account.
- Post text is used for that moment's decision only. It is **not stored** and
  **not sent anywhere**.
- The extension does not read your X password, cookies, DMs, or your timeline
  beyond the post elements it needs to score on the page you are viewing.

## Data stored on your device

The extension uses `chrome.storage.local` (local-only storage; **not**
`storage.sync`, so nothing is uploaded to your Google account) for:

| Key | Contents |
| --- | --- |
| `jofSettings` | Your settings: threshold, hiding mode, category toggles, UI language, language-mute choice, and your own mute-word list |
| `jofStats` | A local counter of how many posts have been hidden (today / total) shown on the extension badge |

This data never leaves your device. We cannot access it. You can clear it at any
time with **"Reset settings"** in the popup, or by removing the extension —
uninstalling deletes the extension's local storage.

## Permissions and why they are needed

| Permission / access | Why |
| --- | --- |
| `storage` | Save the settings and the local hidden-post counter described above. |
| Site access to `x.com` and `twitter.com` (content script) | Inject the local scoring/masking code into X pages so posts can be scored and blurred. This is the extension's single purpose. |

The extension requests **no other permissions**: no `tabs`, no `scripting`, no
`webRequest`, no host permissions for background requests, no access to any
other site. No extension file is exposed to web pages
(no `web_accessible_resources`).

## What we do NOT do

- No collection of personal information (name, email, address, account, age,
  health, financial, authentication, location, or browsing history).
- No transmission of page content, post text, or settings to any server.
- No sale, sharing, or transfer of user data to third parties.
- No use of data for advertising, profiling, creditworthiness, or lending.
- No remotely hosted code: all JavaScript ships inside the extension package,
  and no `eval`-style dynamic code is used.
- No third-party trackers, analytics, or crash reporting.

This is consistent with the **Chrome Web Store User Data Policy**, including the
**Limited Use** requirements: data is used only to provide the extension's
single, user-facing purpose and is not transferred for unrelated purposes.

## Third-party components

The extension bundles open-source word lists (LDNOOBW, CC BY 4.0, and
MosasoM/inappropriate-words-ja, MIT) as static data files. These are
dictionaries, not services: they do not run, observe, or transmit anything. See
`THIRD_PARTY_NOTICES.md` for details.

## Children's privacy

The extension collects no data from anyone, including children.

## Changes to this policy

If this policy changes, the updated version will be published at this location
with a new "Last updated" date. Material changes will also be noted in the
release notes.

## Contact

- Issues / questions: <https://github.com/yomiplush/outrage-mute/issues>
- Author: <https://ko-fi.com/yomiplush>

---

## 日本語の要点

- この拡張機能は**個人情報を一切収集・送信・販売・共有しません**。通信コードを持たず、
  すべての判定は端末内（ブラウザ内）で完結します。
- 投稿本文はその場の判定にだけ使い、**保存も送信もしません**。
- 端末内に保存するのは設定（`jofSettings`）と、隠した件数のローカルなカウンタ
  （`jofStats`）だけです（`chrome.storage.local`。同期されません）。
  ポップアップの「設定をリセット」または拡張機能の削除で消えます。
- 権限は `storage` と、X（x.com / twitter.com）上での投稿の判定・非表示のための
  サイトアクセスだけです。他のサイトへのアクセスやタブ操作の権限は要求しません。
- 外部サーバーへの送信、アクセス解析、広告、トラッカー、リモートコードの読み込みは
  ありません（Chrome ウェブストアのユーザーデータポリシー／Limited Use に準拠）。
