# Outrage Mute

A Chrome extension that scores posts on X (x.com / twitter.com) using a **Japanese "outrage" score** and blurs or hides them with CSS. All scoring happens entirely on your device — **there is no external communication whatsoever**.

- Target: X (`x.com`, `twitter.com`)
- Approach: local dictionary + heuristics (no machine learning, no API keys, free)
- Unit: hides **per post**
- Display: toggle between blur (click to reveal) and complete hiding

> "Driven by outrage" = a post that is aggressive, declarative, and inflammatory, with anger or hostility front and center.
> It does not judge the opinion itself — it evaluates the **aggressiveness of how it is said** (false positives do occur).

---

## What it does

- Detects posts on X and scores the body text plus quoted text locally (0.00–1.00)
- When the score is at or above the threshold, blurs the post cell (with a reason badge and a "Show" button) or hides it completely
- Toggle "Show all / Hide" and "Pause" from the control bar in the bottom right
- Configure the threshold, hiding style, and detected categories in the popup, and **try the score right there**
- Option to hide **politics, conspiracy theories, AI disputes, world affairs (war/terrorism), and vulgar language** all at once (default OFF)
- **Disaster and emergency information (earthquake early warnings / tsunami warnings / evacuation orders) has its own independent toggle** (default "show"). Even if you hide world affairs, you can keep just disaster information
- **Style / tone (`tone`) layer**: detects **ways of speaking** like "What? Are you kidding me!!" or "😡😡😡" even when they are not in the vocabulary (default ON). Arousal is only used as a multiplier when hostility is present
- **Self-mockery (`selfmock`) has its own independent toggle** (default ON). Turn it OFF to see only self-deprecating jokes (everything else stays hidden)
- **AI disputes (`ai_dispute`) and AI technology/community (`ai_topic`) are separated**. Technical discussions and AI-community topics can be turned on/off independently of disputes
- **Multilingual support (52 packs)**: Japanese / English / Chinese (Simplified and Traditional) / Korean / Russian / Ukrainian, plus major languages of Europe, the Middle East, South Asia, and Southeast Asia (German, French, Spanish, Italian, Portuguese, Dutch, Polish, Czech, Hungarian, Finnish, Swedish, Danish, Norwegian, Turkish, Greek / Arabic, Persian / Hindi, Bengali, Urdu, Tamil, Telugu / Thai, Vietnamese, Indonesian, Malay, Hebrew, Filipino, and more). **Automatically determined by writing system** (also distinguishes Simplified/Traditional and Mongolian)
- The UI is also localized (`_locales`, following Chrome's display language)
- **Language mute**: lets you **hide posts in one chosen language all at once** (e.g. remove your native language from the timeline). Determined automatically by writing system; selectable options include Japanese / Korean / Chinese (Simplified and Traditional) / Thai, Hebrew, Greek, Hindi, Arabic scripts and more / Cyrillic (Russian, Ukrainian, all of them) / Latin (all of them). It is **always completely hidden** regardless of score or other conditions (short posts, your own posts, replies), making it useful for "I don't read that language" (default OFF)
- **NSFW (sexual expression) has its own independent toggle** (default OFF). Sexual terms have been separated out of the profanity list (`badwords`), so they can be hidden independently of profanity
- **User dictionary**: register your own mute words to hide posts (add, delete, delete all). Managed in a **separate-window editor** (the "Manage words" button in the popup), matched by substring (default ON)
- **Art focus mode (presets)**: choose how strongly to hide things all at once — **Gentle** (outrage categories only, 0.6) / **Normal** (also hides topical categories but keeps disaster information, 0.5) / **Strict** (everything including disasters, 0.4). "None" returns you to your individual settings. While focus mode is on, it also avoids **long posts** (default: over 160 characters, 0 disables) and **reply posts** (default ON, including posts from people you follow)
- **Quiet notifications**: a toggle that hides the **notification badge, DM badge, and notifications tab** on X (for mental-health considerations)
- Blur (click to reveal, with a reason badge) / complete hiding. **A post you revealed can be hidden again with the "Mute" button in its top-right corner**
- **Your own posts are excluded from filtering** (default ON, changeable via toggle)
- **"Do not filter replies" toggle** (default OFF = replies are also targeted. Turning it ON keeps conversations. It takes priority over the reply hiding in focus mode)
- **PC shortcut `Shift+1`**: instantly toggles enabled/disabled (disabled while typing to prevent accidental triggers). **Disabled on iOS/Android** to prioritize touch input. The popup header also shows `Shift+1 ✅Enabled`
- **Behavior when turned off globally**: turning everything OFF via `Shift+1` or the header toggle also **stops all dependent features such as hiding the notification badge / notifications tab / DM badge, language mute, and category selection** (the corresponding items in the popup are grayed out and cannot be operated). Your settings are preserved and return to normal when turned back ON
- **The threshold slider looks like a seek bar**: a thick track and a larger knob make it easy to drag left and right with a finger (even larger on mobile, with `touch-action` tuned to prioritize horizontal dragging)
- Badge display of how many posts were hidden today (statistics)

## Install (unpackaged)

1. Open `chrome://extensions` in Chrome
2. Turn ON "Developer mode" in the top right
3. Click "Load unpacked" and select this `outrage-mute` folder
4. It becomes active when you open X (click the icon for the popup)

## Using it on iOS / Safari (userscript version)

Separately from the Chrome extension, a **userscript that runs in Safari** (`outrage-mute.user.js`) is included in Releases. The scoring engine is identical to the extension; it adds a shim that replaces `chrome.*` with localStorage and an in-page ⚙ settings panel.

1. Install **Userscripts** (https://apps.apple.com/jp/app/userscripts/id1463298887) from the App Store
2. In Safari's "Settings → Extensions", enable Userscripts and grant it a save folder
3. Opening the **raw direct link** is the reliable route: `https://raw.githubusercontent.com/yomiplush/outrage-mute/main/outrage-mute.user.js` (Tampermonkey/Userscripts will show an install screen)
4. Load it into Userscripts; the targets are `https://x.com/*` / `https://twitter.com/*`
5. When you open x.com, a **⚙ button** appears in the bottom left. Click it to configure (threshold, presets, categories, language, notification muting, etc.)

Notes:
- Userscripts has no popup, so settings are made in the in-page panel and saved to **localStorage** (managed separately from the extension's `chrome.storage`)
- The UI language can be chosen from the bundled locales (Japanese, English, Chinese Simplified/Traditional, Korean, Russian, Ukrainian)
- Features are equivalent to the extension version (blur/complete hiding, re-mute, excluding your own posts, hiding notification badges, etc.)
- Build: `npm run build:userscript`

## Using it on Android (Tampermonkey version)

Android has no Safari, so combine **a browser that runs Tampermonkey** (Firefox for Android / Cromite / Mises, etc. Chrome for Android cannot run extensions). A dedicated script adjusted for Android with a **tap-friendly UI** is provided.

1. Add **Tampermonkey** (Play Store) to your browser
2. Opening the following **raw direct links** shows an install screen
   - Android/Tampermonkey version: `https://raw.githubusercontent.com/yomiplush/outrage-mute/main/outrage-mute.tampermonkey.user.js`
   - Generic version: `https://raw.githubusercontent.com/yomiplush/outrage-mute/main/outrage-mute.user.js`
3. When you open x.com, a **⚙** appears in the bottom left (larger for mobile). Tap it to configure

Notes:
- Because `@downloadURL/@updateURL` point at raw, **Tampermonkey's automatic updates** work
- The scoring engine, storage (localStorage), and settings are equivalent to the extension version
- Since it uses `@grant none` (no GM APIs), it works with either Tampermonkey or Violentmonkey

## Usage

- The lower the **threshold** in the popup (default 0.50), the more is hidden.
- Choosing one language under **Language mute** completely hides posts in that language regardless of other conditions ("None" clears it. For details, see [Multilingual support](#language-mute-hiding-an-entire-selected-language)).
- Choose the **hiding style** from "Blur" or "Hide completely".
- Under **Detected categories**, turn attack words / discriminatory terms / hatred / incitement… on or off individually.
- Entering a sentence in "Try the score" shows the judgment and reason right there.

---

## How the outrage score works

`src/lib/scoring.js` is the core. It accumulates the score in five stages and saturates it into 0..1 via `1 - exp(-raw/2.4)`.

1. **Longest-match dictionary** — Japanese has no word spacing, so instead of using a morphological analyzer, it matches by substring starting from the longest surface form (`クソ野郎` takes priority over `アホ`).
2. **Negation correction** — Attenuated by an immediately following `〜ない / 〜ではない / 〜じゃねえ`, etc. However, **words that are themselves outrage** such as `許さない` or `あり得ない` are protected by `noNeg`.
3. **Quotation / hearsay correction** — Attenuated inside `「」` or after `〜という / 〜らしい` (so that news reporting and victim reports are not wrongly punished).
4. **Sentence-pattern** — Adds points via regex for `〜すべき / 〜しろ / 〜するな`, etc.
5. **Formatting exaggeration** — Adds points for runs of `！！！` `？？？` `wwww`.

### Style / tone layer (`tone`)

`src/lib/lang/style.js` evaluates "ways of speaking" that the vocabulary dictionary cannot catch (**default ON**).

- **Arousal**: runs of exclamation/question marks, prolonged sounds/repetition (`ぅぅぅ`), all-caps, rapid-fire short messages, `www`
- **Hostility patterns**: second person (お前 / you), commands and prohibitions (しろ / やめろ / shut up), interrogation (ふざけんな / 何言ってんの), sarcasm (はいはい / （笑）), interjections (うわ / はい？), angry or contemptuous emoji (😡🤬🙄😒)
- **Important**: arousal alone does not add points. **It is only applied as a multiplier when hostility signals exceed a certain level**, so positive exclamations like "Amazing!!!! Great!!!!" do not trigger a false positive (measured 0.35).
- Symbols, repetition, and emoji are **language-independent**, while second-person, command, and sarcasm patterns are per-language (ja / en are included).

### Categories

| id | Label | Examples |
|---|---|---|
| `attack` | Attack / contempt | 無能 (incompetent) / クズ (scum) / 消えろ (disappear) |
| `profanity` | Discrimination / slurs | Slang dictionary (from the OSS below) |
| `hostility` | Hatred / hostility | 許さない (won't forgive) / 激怒 (furious) / 言語道断 (outrageous) |
| `incitement` | Incitement / calls to action | 晒せ (expose them) / 抗議しろ (protest) / すべき (should) |
| `othering` | Binary opposition / labeling | 非国民 (unpatriotic) / 信者 (believer) / 工作員 (agent) |
| `absolute` | Assertion / absolutization | 絶対 (absolutely) / ありえない (impossible) / 論外 (out of the question) |
| `urgency` | Crisis-mongering | 日本が終わる (Japan is finished) / 取り返しのつかない (irreversible) |
| `cynicism` | Cynicism / sarcasm | ざまあみろ (serves you right) / どうせ (anyway) |
| `tone` | Style / tone | は？ふざけんな / お前…しろよ / 😡 / はいはい |
| `selfmock` | Self-mockery / self-deprecation | 死にたい (I want to die) / 自分なんて / どうせ俺 / 俺はクズ |
| `amplifier` | Emotional exaggeration | `!!!` `????` `wwww` |
| `politics` | Politics (optional) | 首相 (prime minister) / 選挙 (election) / 増税 (tax hike) / 政府 (government) |
| `conspiracy` | Conspiracy theories (optional) | ケミカルトレイル (chemtrails) / グレートリセット (Great Reset) |
| `ai_dispute` | AI disputes (optional) | AI脅威 (AI threat) / AI失業 (AI unemployment) / AI規制 (AI regulation) / AI暴走 (AI runaway) |
| `ai_topic` | AI technology / community (optional) | LLM / プロンプト (prompt) / ファインチューニング (fine-tuning) / ChatGPT |
| `world_affairs` | World affairs / war (optional) | 侵攻 (invasion) / 空爆 (airstrike) / テロ (terrorism) / クーデター (coup) |
| `disaster` | Disaster / emergency information (optional) | 緊急地震速報 (earthquake early warning) / 津波警報 (tsunami warning) / 大津波 (major tsunami) / 避難指示 (evacuation order) |
| `nsfw` | NSFW / sexual expression (optional) | Sexual expression and explicit terms (sexual terms split out of `badwords`) |
| `badwords` | Vulgar / abusive language (optional) | LDNOOBW profanity (24 languages) |

> The eight **(optional)** categories are **OFF by default**. They activate when enabled with the popup toggles.
> While the ten above (including `tone` and `selfmock`) look at "ways of speaking", the seven below detect **topics and the words themselves**,
> so they are given a weight that exceeds the threshold with a single word hit (`1 - exp(-2.2/2.4) ≒ 0.60`).
> Because these are divisive topics and subject matter some people do not want to see, they are opt-in so as not to be imposed on anyone.
> `badwords` is the profanity from LDNOOBW (CC-BY-4.0). Sexual expression has been split into `nsfw` and can be toggled independently of profanity.
> `disaster` is **safety-related information**, so it is OFF by default (= show). Only turn it ON if you want to hide earthquake warnings and the like. Even if you hide world affairs (`world_affairs`), disaster information remains independently.

### Substring false-positive countermeasures

`EXCLUDE_AFTER` in `lexicon.js` ignores a match when what immediately follows is another harmless word.

Examples: `カス` + `タ` = `カスタム`, `糖質` + `制限` = `糖質制限`, `アスペ` + `クト` = `アスペクト`, `バカ` + `ンス` = `バカンス`, `ハゲ` + `タカ` = `ハゲタカ`.

---

## Multilingual support

| Language | Matching | Negation | Dictionary |
|---|---|---|---|
| Japanese `ja` | Substring | Suffix (〜ない) | Custom + MosasoM(MIT) + topic words |
| English `en` | Word boundary | Prefix (not / don't) | Custom + LDNOOBW(CC-BY-4.0) |
| Chinese (Simplified) `zh` | Substring | Prefix (不 / 没) | Custom + LDNOOBW |
| Chinese (Traditional) `zh_hant` | Substring | Prefix (不 / 沒) | Custom |
| Korean `ko` | Substring | Prefix (못 / 아니) | Custom + LDNOOBW |
| Russian `ru` | Word boundary | Prefix (не / ни) | Custom + LDNOOBW |
| Ukrainian `uk` | Word boundary | Prefix (не / ні) | Custom |
| `de` `fr` `es` `it` `pt` `nl` `pl` `cs` `hu` `fi` `sv` `da` `no` `tr` `ar` `fa` `hi` `th` `fil` | Word boundary/Substring | Prefix | Custom + LDNOOBW |
| `vi` `id` `ms` `bn` `ur` `ta` `te` `he` `el` `ro` `bg` `sr` `hr` `sk` `lt` `lv` `et` `ca` `sw` `mk` `mn` `ne` `si` | Word boundary/Substring | Prefix | Custom |
| Combined `latin` / `cyrillic` / `arabic` | Word boundary | Prefix | The sum of the above |
| Others (LDNOOBW only) | － | － | `badwords` only |

- **Auto-detection is based on writing system per post** (kana/kanji → ja, Hangul → ko, Cyrillic → ru/uk, Hebrew → he, Greek → el, Devanagari → hi, Thai → th …). Languages sharing a script are detected together as **combined packs** (`latin` / `cyrillic` / `arabic`), so German posts are never mistakenly matched against the English dictionary. **Chinese is distinguished between Simplified and Traditional** (e.g. `战争` vs `戰爭`). You can also pin the language in the popup.
- Languages with word spacing, such as English, are matched by **word boundary**, so `ass` inside `class` is not picked up.
- For a new language, just add words to `src/lib/lang/curated.js`, or write one file `src/lib/lang/<code>.js` (languages present in LDNOOBW are registered automatically from the data alone).
- **Switching the "Language" in the popup also switches the UI display language** (it loads `_locales/<locale>/messages.json` at runtime; untranslated keys fall back to English, then Japanese). Choosing "Auto-detect" follows the browser language.

### Language mute (hiding an entire selected language)

While "Language" selects the **dictionary used for scoring**, **"Language mute" hides posts in the chosen language entirely, regardless of score or other conditions**. It is intended for uses such as removing your native language from the timeline (default "None").

- The policy is **to hide thoroughly, no matter what**. Posts in the chosen language are evaluated with priority over other conditions such as the **minimum character count, your own posts, reply filtering, and score**, and are **always completely hidden** (`display:none`) **regardless of the "hiding style (blur / hide completely)" setting**. No blur reason badge or "Show" button appears.
- They only disappear from the timeline and can be temporarily restored with X's "Show all" button (the bar in the bottom right).

| Options | Writing system used for detection | Examples |
|---|---|---|
| Japanese `ja` | Hiragana, Katakana | 今日はいい天気だね |
| Korean `ko` | Hangul | 오늘 날씨 좋네요 |
| Chinese (Simplified) `zh` / (Traditional) `zh_hant` | Han characters (Simplified/Traditional distinction) | 今天天气不错 / 今天天氣不錯 |
| Thai `th` / Hebrew `he` / Greek `el` / Hindi `hi` / Bengali `bn` / Tamil `ta` / Telugu `te` / Arabic `ar` / Mongolian `mn` / Khmer `km` / Lao `lo` / Sinhala `si` | Their respective scripts | สวัสดี / שלום / Γεια σου / नमस्ते |
| Russian `ru` / Ukrainian `uk` | Estimation within Cyrillic (і/ї/є/ґ indicates Ukrainian) | Сегодня… / Сьогодні… |
| Cyrillic (all) `cyrillic` | Cyrillic in general | Any of the above |
| Latin (all) `latin` | Latin in general | Hello / Bonjour / Guten Tag |

- Detection looks only at **which characters are used in the post**. Because Latin and Cyrillic cannot be strictly separated by language, they are hidden together under the **"(all)"** options rather than individual languages (e.g. `en`).
- **Japanese in kanji only** (posts without kana) may be detected as Chinese. Conversely, Chinese posts are never detected as Japanese (because kana/katakana are required).
- The detected language appears in the reason badge during blurring, e.g. `Hiding Japanese posts` (language mute is always completely hidden, so no badge appears).

---

## Dictionary data and third-party licenses

This extension's vocabulary is built on OSS data with clear licensing.

- **MosasoM/inappropriate-words-ja** — MIT License, Copyright (c) 2020 K Hashimoto
  - Imported: `Offensive.txt` (list of offensive and discriminatory expressions, provisional version)
  - The original is bundled in `vendor/inappropriate-words-ja/` (`Offensive.txt` and `LICENSE`)
  - The form used by the extension (weighted) is `src/lib/lexicon.vendor.js`
  - Words added by this extension (EXTRA) are not derived from MosasoM but are the author's own judgment
- **LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words** — **CC-BY-4.0**
  - A multilingual profanity list (24 languages). Used for the `badwords` category (default OFF)
  - The original is bundled in `vendor/ldnoobw/`; the extension version is `src/lib/lang/data/ldnoobw.js` (generated)
  - Build: `node scripts/build-lang-data.mjs`
- Reference ideas (no code was reused):
  - **thisandagain/sentiment** (MIT): token → value → comparative, per-language scoringStrategy
  - **ikegami-yukino/oseti** (MIT): Japanese dictionary-based sentiment analysis. Because the extracted **polarity** is "positive/negative" and differs from the "outrage" this extension targets, its dictionary was not used as a base.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for details. This extension itself is [MIT](LICENSE).

> **Note**: `lexicon.vendor.js` / `lexicon.curated.js` contain discriminatory and abusive words (for filtering purposes). Please handle with care.

---

## Structure

```
outrage-mute/
├── manifest.json                 # MV3 (default_locale: ja)
├── _locales/  # UI localization (49 locales total; untranslated keys fall back to en)
├── icons/                        # 16/32/48/128 (generated)
├── src/
│   ├── background.js             # Default settings, badge, statistics
│   ├── content.js                # X post detection and CSS muting
│   ├── content.css               # Blur/hide styles
│   ├── popup.html/.css/.js       # Settings and live score checking
│   ├── dict.html/.js             # User dictionary editor (separate window)
│   └── lib/
│       ├── normalize.js          # Normalization and formatting features
│       ├── categories.js         # Category definitions (single source of truth)
│       ├── config.js             # Defaults and settings normalization
│       ├── lexicon.*.js          # Japanese dictionary (curated/vendor/topics)
│       ├── lang/
│       │   ├── build.js          # Index builder (substring / word)
│       │   ├── term-layer.js     # Shared factory for term layers (reclassification + additional scanning)
│       │   ├── ja.js en.js zh.js zh_hant.js ko.js ru.js uk.js  # Language packs
│       │   ├── curated.js        # Non-Japanese outrage and topic words (author-created)
│       │   ├── style.js          # Style/tone (an emotion layer independent of vocabulary)
│       │   ├── disaster.js       # Disaster/emergency information (independent toggle)
│       │   ├── selfmock.js       # Self-mockery/self-deprecation (independent toggle)
│       │   ├── aitopic.js        # AI technology/community (split from ai_dispute)
│       │   ├── nsfw.js           # NSFW/sexual expression (split from badwords)
│       │   ├── index.js          # Registry + language auto-detection + language mute
│       │   ├── selfpost.js       # Own-post detection (handle matching)
│       │   ├── reply.js          # Reply detection (multilingual)
│       │   ├── userdict.js       # User dictionary (your own mute words)
│       │   ├── dict-editor.js    # Dictionary editor UI (shared by extension/userscript)
│       │   └── data/ldnoobw.js   # Multilingual profanity (generated)
│       ├── i18n.js               # UI string helpers
│       └── scoring.js            # Scoring core (multilingual engine)
├── vendor/                       # Originals and licenses (MosasoM / LDNOOBW)
├── scripts/build-icons.mjs       # Icon generation (no dependencies)
├── scripts/build-lang-data.mjs   # LDNOOBW import and generation
├── scripts/package.mjs           # Distribution ZIP + SHA256SUMS
├── docs/demo.html                # Scoring playground
└── test/scoring.test.mjs         # node --test
```

## Development

```bash
npm test              # Scoring tests (no external dependencies)
npm run build:icons   # Regenerate icons
npm run package       # Generate dist/outrage-mute-<version>.zip and SHA256SUMS
```

### Distribution (Release)

`npm run package` creates a ZIP with `manifest.json` at its root. It can be used directly
with "Load unpacked". The GitHub Releases attach the ZIP and `SHA256SUMS`.

Adding a dictionary entry: add one line `['語', 重み, 'カテゴリ', 'noNeg'?]` to `lexicon.curated.js` → `npm test`.

## Privacy

- Post bodies and account information are **never sent externally** (`host_permissions` covers only X domains; there is no networking code).
- Only settings and statistics are stored in `chrome.storage.local`.
- See [`PRIVACY.md`](PRIVACY.md) for details.

## Known limitations

- Because it is dictionary-based, euphemisms and sarcasm not in the vocabulary may be missed.
- Posts that are merely "opinions you dislike" will in principle not raise the score unless they contain attack words (they can still be misjudged due to assertions and exaggeration).
- Changes to X's DOM structure may shift the detection selectors (`TWEET_SEL` / `CELL_SEL` in `content.js`).
- **Language mute** is writing-system-based, so kanji-only Japanese may be detected as Chinese. It also cannot distinguish individual Latin and Cyrillic languages (such as English and German) (they are hidden together under "(all)").
- The scoring does not judge the correctness of a post or the character of its author.
