// ==UserScript==
// @name         義憤ミュート (Outrage Mute)
// @name:en      Outrage Mute
// @namespace    https://github.com/yomiplush/outrage-mute
// @version      0.22.2
// @description  X の投稿を義憤スコアで判定し、CSS でぼかし/非表示にします（ローカル完結・外部送信なし・多言語対応）
// @description:en  Score X posts for outrage and blur/hide them with CSS. Fully local (no external requests), multilingual.
// @author       yomiplush
// @homepageURL  https://github.com/yomiplush/outrage-mute
// @supportURL   https://github.com/yomiplush/outrage-mute/issues
// @icon         https://raw.githubusercontent.com/yomiplush/outrage-mute/main/icons/icon128.png
// @downloadURL  https://raw.githubusercontent.com/yomiplush/outrage-mute/main/outrage-mute.user.js
// @updateURL    https://raw.githubusercontent.com/yomiplush/outrage-mute/main/outrage-mute.user.js
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==


/* ===== chrome.* shim (localStorage) ===== */

/**
 * ユーザースクリプト向け chrome.* シム。
 *
 * 拡張の content.js は chrome.storage / chrome.runtime を使うため、
 * Userscripts（iOS Safari）等のユーザースクリプト環境では
 * localStorage ベースの同等実装を差し込む。これにより content.js を
 * そのまま流用できる（拡張とユーザースクリプトで判定ロジックが二重化しない）。
 */
(function () {
  'use strict';
  if (typeof globalThis.chrome !== 'undefined' && globalThis.chrome.storage) return;

  var STORE_KEY = 'jof:store';
  var listeners = [];

  function readAll() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(obj) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    } catch (e) {
      /* noop */
    }
  }

  function get(keys, cb) {
    var list = Array.isArray(keys) ? keys : [keys];
    var store = readAll();
    var out = {};
    list.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(store, k)) out[k] = store[k];
    });
    setTimeout(function () {
      cb(out);
    }, 0);
  }

  function set(obj, cb) {
    var store = readAll();
    var changes = {};
    Object.keys(obj).forEach(function (k) {
      changes[k] = { oldValue: store[k], newValue: obj[k] };
      store[k] = obj[k];
    });
    writeAll(store);
    setTimeout(function () {
      listeners.forEach(function (fn) {
        try {
          fn(changes, 'local');
        } catch (e) {
          /* noop */
        }
      });
      if (cb) cb();
    }, 0);
  }

  function uiLocale() {
    var lang = (navigator.language || 'ja').replace('-', '_');
    var L = globalThis.JOF && globalThis.JOF.locales;
    if (L) {
      if (L[lang]) return lang;
      var base = lang.split('_')[0];
      if (L[base]) return base;
      if (L.en) return 'en';
    }
    return 'ja';
  }

  globalThis.chrome = {
    storage: {
      local: { get: get, set: set },
      onChanged: {
        addListener: function (fn) {
          listeners.push(fn);
        }
      }
    },
    runtime: {
      lastError: null,
      getURL: function () {
        return null;
      },
      sendMessage: function (msg, cb) {
        // background.js 相当（統計の加算）
        if (msg && msg.type === 'jof:masked') {
          var store = readAll();
          var s = store.jofStats || { masked: 0, today: 0, date: '' };
          var today = new Date().toISOString().slice(0, 10);
          if (s.date !== today) {
            s.date = today;
            s.today = 0;
          }
          s.masked = (s.masked || 0) + 1;
          s.today = (s.today || 0) + 1;
          var patch = {};
          patch.jofStats = s;
          set(patch, null);
        }
        if (cb) setTimeout(cb, 0);
      }
    },
    i18n: {
      // ブラウザの言語で同梱ロケールを引く（fetch できないため）
      getMessage: function (key) {
        var L = globalThis.JOF && globalThis.JOF.locales;
        if (L) {
          var t = L[uiLocale()];
          if (t && t[key]) return t[key];
          if (L.en && L.en[key]) return L.en[key];
        }
        return '';
      },
      getUILanguage: function () {
        return navigator.language || 'ja';
      }
    }
  };
})();


/* ===== bundled locales / css ===== */

window.JOF = window.JOF || {};

window.JOF.locales = {"ja":{"extName":"義憤ミュート","extDesc":"Xの投稿を義憤スコアで判定し、CSSでぼかし/非表示にするローカル完結の拡張機能（外部送信なし・多言語対応）","title":"義憤ミュート","enabled":"有効","note":"Xの投稿を端末内だけで判定します（外部送信なし）。しきい値以上でぼかし／非表示にします。あなたが穏やかな気持ちでいられますように。","threshold":"しきい値","thresholdHint":"低いほど多く隠します（誤判定も増えます）。","mode":"隠し方","modeBlur":"ぼかす（クリックで表示）","modeHide":"完全に隠す","showOverlay":"理由バッジを表示する","minLength":"最短文字数","language":"言語","languageAuto":"自動判定","categories":"検出カテゴリ","categoriesHint":"上の7つは「言い方の攻撃性」。下の「政治・陰謀論・AI論争・世界情勢・下品語（任意）」は話題そのものを隠します（既定OFF）。","optionalSuffix":"（任意）","tryScore":"スコアを試す","samplePlaceholder":"投稿文をここに入力（例: 絶対に許せない。けしからん。）","statToday":"きょう隠した数","statTotal":"累計","reset":"設定をリセット","maskedBadge":"義憤ミュート $1%","show":"表示","hide":"隠す","pause":"停止","resume":"再開","barLabel":"義憤ミュート: $1","cat_attack":"攻撃・侮蔑","cat_hostility":"憎悪・敵意","cat_incitement":"煽り・呼びかけ","cat_absolute":"断定・絶対化","cat_othering":"二項対立・レッテル","cat_cynicism":"冷笑・皮肉","cat_tone":"文体・口調","cat_urgency":"危機煽り","cat_profanity":"差別・蔑称語","cat_badwords":"下品・罵倒語","cat_amplifier":"感情誇張","cat_politics":"政治","cat_conspiracy":"陰謀論","cat_ai_dispute":"AI論争","cat_world_affairs":"世界情勢・戦争","cat_disaster":"災害・緊急情報","cat_selfmock":"自虐・自己卑下","cat_ai_topic":"AI技術・界隈","cat_nsfw":"NSFW・性的表現","reasonLong":"長文を非表示","reasonReply":"リプライを非表示","focusHideReplies":"集中モードでリプライも隠す","userDict":"ユーザー辞書","userDictEnabled":"ユーザー辞書を使う","userDictManage":"単語を管理","userDictHint":"自分で登録した語を含む投稿を隠します（部分一致・大文字小文字と全角/半角は無視）。","userDictPlaceholder":"ミュートしたい語を入力（例: 案件、副業）","userDictAdd":"追加","userDictAll":"すべて削除","userDictEmpty":"まだ登録されていません","userDictDelete":"削除","userDictCount":"$1 語","userDictNote":"※ 部分一致のため、短い語は誤って多くを隠すことがあります。","reasonUser":"ユーザー辞書: $1","enabledOn":"✅ 有効","enabledOff":"無効","toggledOn":"義憤ミュート: 有効","toggledOff":"義憤ミュート: 無効","focusMaxLength":"集中モードで隠す長さ（文字）","focusMaxLengthHint":"集中モード中、これより長い投稿は隠します（0で無効）。","focusMode":"アート集中モード","focusModeHint":"まとめて隠すプリセット。やさしめ=義憤系のみ(0.6)／ふつう=話題系も隠すが災害情報は残す(0.5)／きびしめ=災害も含め全部隠す(0.4)。「なし」で個別設定に戻ります。","presetOff":"なし（個別設定）","presetSoft":"やさしめ（誤爆少なめ）","presetNormal":"ふつう（災害情報は残す）","presetHard":"きびしめ（全部隠す）","quiet":"通知を静かにする","hideNotifications":"通知バッジを隠す","hideNotificationTab":"通知タブごと隠す","hideDm":"DMバッジを隠す","quietHint":"X上のバッジ／タブを非表示にします（通知そのものは止まりません）。","excludeSelf":"自分の投稿はフィルターから除外","excludeReplies":"リプライはフィルターしない","remute":"ミュート","remuteTitle":"この投稿を再度ミュートする"},"en":{"extName":"Outrage Mute","extDesc":"Scores X posts for outrage and blurs/hides them with CSS. Fully local (no external requests), multilingual.","title":"Outrage Mute","enabled":"On","note":"Everything is scored on your device (nothing is sent out). Posts at or above the threshold are blurred or hidden. May you stay calm.","threshold":"Threshold","thresholdHint":"Lower hides more (and raises false positives).","mode":"How to hide","modeBlur":"Blur (click to reveal)","modeHide":"Hide completely","showOverlay":"Show a reason badge","minLength":"Min length","language":"Language","languageAuto":"Auto detect","categories":"Categories","categoriesHint":"The top seven judge tone (attack, hate, incitement...). The optional ones (politics, conspiracy, AI, world affairs, profanity) hide the topic itself and are off by default.","optionalSuffix":" (optional)","tryScore":"Try a score","samplePlaceholder":"Type a post here (e.g. I will never forgive them.)","statToday":"Hidden today","statTotal":"Total","reset":"Reset settings","maskedBadge":"Muted $1%","show":"Show","hide":"Hide","pause":"Pause","resume":"Resume","barLabel":"Muted: $1","cat_attack":"Attack / insult","cat_hostility":"Hate / hostility","cat_incitement":"Incitement","cat_absolute":"Absolutism","cat_othering":"Othering","cat_cynicism":"Cynicism","cat_tone":"Tone / style","cat_urgency":"Fear-mongering","cat_profanity":"Slurs","cat_badwords":"Profanity","cat_amplifier":"Shouting","cat_politics":"Politics","cat_conspiracy":"Conspiracy","cat_ai_dispute":"AI debate","cat_world_affairs":"World affairs / war","cat_disaster":"Disasters / emergency","cat_selfmock":"Self-deprecation","cat_ai_topic":"AI tech / community","cat_nsfw":"NSFW / explicit","reasonLong":"Long post hidden","reasonReply":"Reply hidden","focusHideReplies":"Also hide replies in focus mode","userDict":"User dictionary","userDictEnabled":"Use my dictionary","userDictManage":"Manage words","userDictHint":"Hides posts that contain your words (substring match; case and width are ignored).","userDictPlaceholder":"Type a word to mute (e.g. crypto, giveaway)","userDictAdd":"Add","userDictAll":"Delete all","userDictEmpty":"No words yet","userDictDelete":"Delete","userDictCount":"$1 words","userDictNote":"Note: matching is substring-based, so short words may hide too much.","reasonUser":"User word: $1","enabledOn":"✅ On","enabledOff":"Off","toggledOn":"Outrage Mute: On","toggledOff":"Outrage Mute: Off","focusMaxLength":"Max length in focus mode","focusMaxLengthHint":"In focus mode, posts longer than this are hidden (0 disables).","focusMode":"Art focus mode","focusModeHint":"A hiding preset. Gentle = outrage only (0.6) / Normal = hide topics but keep disaster alerts (0.5) / Strict = hide everything incl. disasters (0.4). Choose Off to use your own settings.","presetOff":"Off (custom)","presetSoft":"Gentle (fewer false positives)","presetNormal":"Normal (keep disaster alerts)","presetHard":"Strict (hide everything)","quiet":"Quiet notifications","hideNotifications":"Hide notification badge","hideNotificationTab":"Hide the notifications tab","hideDm":"Hide DM badge","quietHint":"Hides badges/tabs on X (it does not stop notifications themselves).","excludeSelf":"Don't filter my own posts","excludeReplies":"Don't filter replies","remute":"Mute","remuteTitle":"Mute this post again"},"zh_CN":{"extName":"义愤屏蔽","extDesc":"为 X 的帖子计算义愤评分，用 CSS 模糊或隐藏。完全本地运行（不发送数据），支持多语言。","title":"义愤屏蔽","enabled":"启用","note":"一切在你的设备上判定（不发送任何数据）。达到阈值的帖子会被模糊或隐藏。愿你保持平静。","threshold":"阈值","thresholdHint":"越低隐藏得越多（误判也会增加）。","mode":"隐藏方式","modeBlur":"模糊（点击显示）","modeHide":"完全隐藏","showOverlay":"显示理由标签","minLength":"最短字数","language":"语言","languageAuto":"自动判定","categories":"检测类别","categoriesHint":"前七项判断“语气是否攻击性”。后面（政治、阴谋论、AI争论、世界局势、粗俗语）为话题类，默认关闭。","optionalSuffix":"（可选）","tryScore":"测试评分","samplePlaceholder":"在此输入帖子内容（如：绝对不可原谅。）","statToday":"今日已隐藏","statTotal":"累计","reset":"重置设置","maskedBadge":"已屏蔽 $1%","show":"显示","hide":"隐藏","pause":"暂停","resume":"继续","barLabel":"已屏蔽: $1","cat_attack":"攻击·侮辱","cat_hostility":"憎恨·敌意","cat_incitement":"煽动·号召","cat_absolute":"断言·绝对化","cat_othering":"对立·标签","cat_cynicism":"冷笑·讽刺","cat_urgency":"危机煽动","cat_profanity":"歧视·蔑称","cat_badwords":"粗俗·骂语","cat_amplifier":"情绪夸张","cat_politics":"政治","cat_conspiracy":"阴谋论","cat_ai_dispute":"AI 争论","cat_world_affairs":"世界局势·战争"},"zh_TW":{"extName":"義憤靜音","extDesc":"為 X 的貼文計算義憤分數，用 CSS 模糊或隱藏。完全本機執行（不傳送資料），支援多語言。","title":"義憤靜音","enabled":"啟用","note":"一切都在你的裝置上判定（不傳送任何資料）。達到門檻的貼文會被模糊或隱藏。願你保持平靜。","threshold":"門檻","thresholdHint":"越低隱藏得越多（誤判也會增加）。","mode":"隱藏方式","modeBlur":"模糊（點擊顯示）","modeHide":"完全隱藏","showOverlay":"顯示理由標籤","minLength":"最短字數","language":"語言","languageAuto":"自動判定","categories":"偵測類別","categoriesHint":"前七項判斷「語氣是否具攻擊性」。後面（政治、陰謀論、AI 爭論、世界局勢、粗俗語）為話題類，預設關閉。","optionalSuffix":"（選用）","tryScore":"測試分數","samplePlaceholder":"在此輸入貼文（例如：絕對不可原諒。）","statToday":"今日已隱藏","statTotal":"累計","reset":"重設設定","maskedBadge":"已靜音 $1%","show":"顯示","hide":"隱藏","pause":"暫停","resume":"繼續","barLabel":"已靜音: $1","cat_attack":"攻擊·侮辱","cat_hostility":"憎恨·敵意","cat_incitement":"煽動·號召","cat_absolute":"斷言·絕對化","cat_othering":"對立·標籤","cat_cynicism":"冷笑·諷刺","cat_urgency":"危機煽動","cat_profanity":"歧視·蔑稱","cat_badwords":"粗俗·罵語","cat_amplifier":"情緒誇張","cat_politics":"政治","cat_conspiracy":"陰謀論","cat_ai_dispute":"AI 爭論","cat_world_affairs":"世界局勢·戰爭"},"ko":{"extName":"분노 뮤트","extDesc":"X 게시물을 분노 점수로 판정해 CSS로 흐리게/숨김. 완전 로컬(외부 전송 없음), 다국어 지원.","title":"분노 뮤트","enabled":"사용","note":"모든 판정은 기기 안에서만 이루어집니다(외부 전송 없음). 임계값 이상이면 흐리게/숨김 처리합니다. 마음이 편안하시길 바랍니다.","threshold":"임계값","thresholdHint":"낮을수록 더 많이 숨깁니다(오탐도 늘어납니다).","mode":"숨김 방식","modeBlur":"흐리게 (클릭하면 표시)","modeHide":"완전히 숨김","showOverlay":"이유 배지 표시","minLength":"최소 글자 수","language":"언어","languageAuto":"자동 판정","categories":"탐지 카테고리","categoriesHint":"위 7개는 말투의 공격성입니다. 아래(정치·음모론·AI 논쟁·세계 정세·비속어)는 주제 자체를 숨기며 기본은 꺼짐입니다.","optionalSuffix":" (선택)","tryScore":"점수 테스트","samplePlaceholder":"게시물을 입력하세요 (예: 절대 용서할 수 없다.)","statToday":"오늘 숨김","statTotal":"누적","reset":"설정 초기화","maskedBadge":"뮤트 $1%","show":"표시","hide":"숨기기","pause":"정지","resume":"재개","barLabel":"뮤트: $1","cat_attack":"공격·모욕","cat_hostility":"증오·적대","cat_incitement":"선동·호소","cat_absolute":"단정·절대화","cat_othering":"대립·낙인","cat_cynicism":"냉소·비꼼","cat_urgency":"위기 선동","cat_profanity":"차별·멸칭","cat_badwords":"비속어·욕설","cat_amplifier":"감정 과장","cat_politics":"정치","cat_conspiracy":"음모론","cat_ai_dispute":"AI 논쟁","cat_world_affairs":"세계 정세·전쟁"},"ru":{"extName":"Outrage Mute","extDesc":"Оценивает посты X на негодование и размывает/скрывает их через CSS. Полностью локально (без отправки данных), многоязычно.","title":"Outrage Mute","enabled":"Вкл","note":"Всё оценивается на вашем устройстве (ничего не отправляется). Посты выше порога размываются или скрываются. Пусть вам будет спокойнее.","threshold":"Порог","thresholdHint":"Ниже — скрывает больше (и больше ошибок).","mode":"Способ скрытия","modeBlur":"Размытие (клик — показать)","modeHide":"Скрыть полностью","showOverlay":"Показывать причину","minLength":"Мин. длина","language":"Язык","languageAuto":"Автоопределение","categories":"Категории","categoriesHint":"Верхние семь — это агрессивность речи. Нижние (политика, теории заговора, споры об ИИ, мировые события, мат) скрывают саму тему и по умолчанию выключены.","optionalSuffix":" (опц.)","tryScore":"Проверить оценку","samplePlaceholder":"Введите пост (напр.: Я никогда их не прощу.)","statToday":"Скрыто сегодня","statTotal":"Всего","reset":"Сбросить настройки","maskedBadge":"Скрыто $1%","show":"Показать","hide":"Скрыть","pause":"Пауза","resume":"Продолжить","barLabel":"Скрыто: $1","cat_attack":"Оскорбления","cat_hostility":"Ненависть","cat_incitement":"Призывы","cat_absolute":"Категоричность","cat_othering":"Ярлыки","cat_cynicism":"Цинизм","cat_urgency":"Паникёрство","cat_profanity":"Сленг-оскорбления","cat_badwords":"Мат","cat_amplifier":"Крик","cat_politics":"Политика","cat_conspiracy":"Теории заговора","cat_ai_dispute":"Споры об ИИ","cat_world_affairs":"Мировые события / война"},"uk":{"extName":"Outrage Mute","extDesc":"Оцінює дописи X на обурення та розмиває/ховає їх через CSS. Повністю локально (без надсилань), багатомовно.","title":"Outrage Mute","enabled":"Увімк.","note":"Усе оцінюється на вашому пристрої (нічого не надсилається). Дописи вище порогу розмиваються або ховаються. Нехай вам буде спокійніше.","threshold":"Поріг","thresholdHint":"Нижче — ховає більше (і більше помилок).","mode":"Спосіб приховування","modeBlur":"Розмиття (клік — показати)","modeHide":"Сховати повністю","showOverlay":"Показувати причину","minLength":"Мін. довжина","language":"Мова","languageAuto":"Автовизначення","categories":"Категорії","categoriesHint":"Верхні сім — агресивність мовлення. Нижні (політика, теорії змов, суперечки про ШІ, світові події, лайка) ховають саму тему і типово вимкнені.","optionalSuffix":" (опц.)","tryScore":"Перевірити оцінку","samplePlaceholder":"Введіть допис (напр.: Я ніколи їх не прощу.)","statToday":"Сховано сьогодні","statTotal":"Усього","reset":"Скинути налаштування","maskedBadge":"Приховано $1%","show":"Показати","hide":"Сховати","pause":"Пауза","resume":"Продовжити","barLabel":"Приховано: $1","cat_attack":"Образи","cat_hostility":"Ненависть","cat_incitement":"Заклики","cat_absolute":"Категоричність","cat_othering":"Ярлики","cat_cynicism":"Цинізм","cat_urgency":"Панікерство","cat_profanity":"Сленг-образи","cat_badwords":"Лайка","cat_amplifier":"Крик","cat_politics":"Політика","cat_conspiracy":"Теорії змов","cat_ai_dispute":"Суперечки про ШІ","cat_world_affairs":"Світові події / війна"}};

window.JOF.css = "/* 義憤ミュート: 非表示・ぼかしの見た目 */\n\n/* セルを基準にしてオーバーレイを重ねる */\n.jof-blur {\n  position: relative !important;\n}\n\n/* 中身（オーバーレイ以外）をぼかして操作不能にする */\n.jof-blur > *:not(.jof-overlay) {\n  filter: blur(7px) !important;\n  opacity: 0.35 !important;\n  pointer-events: none !important;\n  user-select: none !important;\n}\n\n/* 完全非表示モード */\n.jof-gone {\n  display: none !important;\n}\n\n/* オーバーレイ */\n.jof-blur > .jof-overlay {\n  position: absolute !important;\n  inset: 0 !important;\n  z-index: 5 !important;\n  display: flex !important;\n  flex-direction: column !important;\n  align-items: center !important;\n  justify-content: center !important;\n  gap: 6px !important;\n  padding: 10px !important;\n  box-sizing: border-box !important;\n  border: 1px dashed rgba(228, 87, 46, 0.7) !important;\n  border-radius: 12px !important;\n  background: rgba(20, 20, 24, 0.55) !important;\n  color: #fff !important;\n  font-size: 13px !important;\n  font-family: system-ui, -apple-system, \"Segoe UI\", \"Hiragino Kaku Gothic ProN\", Meiryo, sans-serif !important;\n  line-height: 1.3 !important;\n  text-align: center !important;\n  pointer-events: auto !important;\n}\n\n.jof-overlay .jof-badge {\n  font-weight: 700 !important;\n  color: #ffb59b !important;\n}\n\n.jof-overlay .jof-cats {\n  font-size: 11px !important;\n  opacity: 0.85 !important;\n}\n\n.jof-overlay .jof-show-btn {\n  margin-top: 2px !important;\n  padding: 4px 14px !important;\n  border: 1px solid rgba(255, 255, 255, 0.5) !important;\n  border-radius: 999px !important;\n  background: rgba(255, 255, 255, 0.12) !important;\n  color: #fff !important;\n  font-size: 12px !important;\n  cursor: pointer !important;\n}\n\n.jof-overlay .jof-show-btn:hover {\n  background: rgba(255, 255, 255, 0.25) !important;\n}\n\n/* 全表示トグル中は隠さない */\nbody.jof-reveal-all .jof-blur > *:not(.jof-overlay) {\n  filter: none !important;\n  opacity: 1 !important;\n  pointer-events: auto !important;\n  user-select: auto !important;\n}\n\nbody.jof-reveal-all .jof-overlay {\n  display: none !important;\n}\n\nbody.jof-reveal-all .jof-gone {\n  display: block !important;\n}\n\n/* 表示した投稿の右上に出る「再度ミュート」ボタン */\n.jof-relative {\n  position: relative !important;\n}\n\n.jof-remute {\n  position: absolute !important;\n  top: 6px !important;\n  right: 8px !important;\n  z-index: 6 !important;\n  padding: 3px 10px !important;\n  border: 1px solid rgba(228, 87, 46, 0.8) !important;\n  border-radius: 999px !important;\n  background: rgba(20, 20, 24, 0.85) !important;\n  color: #ffb59b !important;\n  font-size: 11px !important;\n  font-family: system-ui, -apple-system, \"Segoe UI\", \"Hiragino Kaku Gothic ProN\", Meiryo, sans-serif !important;\n  cursor: pointer !important;\n}\n\n.jof-remute:hover {\n  background: rgba(228, 87, 46, 0.9) !important;\n  color: #fff !important;\n}\n\n/* 有効/無効のトースト */\n.jof-toast {\n  position: fixed !important;\n  left: 50% !important;\n  bottom: 70px !important;\n  transform: translateX(-50%) !important;\n  z-index: 2147483647 !important;\n  padding: 8px 16px !important;\n  border-radius: 999px !important;\n  background: rgba(20, 20, 24, 0.94) !important;\n  color: #ffb59b !important;\n  font-size: 13px !important;\n  font-family: system-ui, -apple-system, \"Segoe UI\", \"Hiragino Kaku Gothic ProN\", Meiryo, sans-serif !important;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;\n  opacity: 0 !important;\n  pointer-events: none !important;\n  transition: opacity 0.25s ease !important;\n}\n\n.jof-toast.jof-toast-on {\n  opacity: 1 !important;\n}\n\n/* 右下の操作バー */\n.jof-bar {\n  position: fixed !important;\n  right: 16px !important;\n  bottom: 16px !important;\n  z-index: 2147483646 !important;\n  display: flex !important;\n  align-items: center !important;\n  gap: 8px !important;\n  padding: 8px 10px !important;\n  border-radius: 999px !important;\n  background: rgba(20, 20, 24, 0.9) !important;\n  color: #fff !important;\n  font-size: 12px !important;\n  font-family: system-ui, -apple-system, \"Segoe UI\", \"Hiragino Kaku Gothic ProN\", Meiryo, sans-serif !important;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35) !important;\n}\n\n.jof-bar-label {\n  font-weight: 600 !important;\n  color: #ffb59b !important;\n}\n\n.jof-bar button {\n  padding: 3px 10px !important;\n  border: 1px solid rgba(255, 255, 255, 0.4) !important;\n  border-radius: 999px !important;\n  background: rgba(255, 255, 255, 0.1) !important;\n  color: #fff !important;\n  font-size: 12px !important;\n  cursor: pointer !important;\n}\n\n.jof-bar button:hover {\n  background: rgba(255, 255, 255, 0.22) !important;\n}\n";

window.JOF.mobile = false;

/* ===== src/lib/normalize.js ===== */

/**
 * 日本語テキストの正規化と、書式（誇張）特徴の抽出。
 *
 * - normalize(): 判定に使う正規化済みテキストを作る（URL・メンション除去、NFKC、小文字化）
 * - formatFeatures(): 元テキストから「!」「?」「w」の連続などの誇張表現を数える
 *
 * ブラウザ（content script / popup）と Node（テスト）の両方で動くようにしてある。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).normalize = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var URL_RE = /https?:\/\/[^\s\u3000]+/gi;
  var BARE_WWW_RE = /www\.[^\s\u3000]+/gi;
  var MENTION_RE = /@[A-Za-z0-9_]{1,30}/g;
  var ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;

  /**
   * 判定用テキストへ正規化する。
   * URL やメンションを消してから NFKC（全角→半角、互換文字の統一）と小文字化を行う。
   */
  function normalize(text) {
    var s = String(text == null ? '' : text);
    s = s.replace(ZERO_WIDTH_RE, '');
    s = s.replace(URL_RE, ' ').replace(BARE_WWW_RE, ' ');
    s = s.replace(MENTION_RE, ' ');
    try {
      s = s.normalize('NFKC');
    } catch (e) {
      /* 古い環境では正規化なしで続行 */
    }
    s = s.toLowerCase();
    s = s.replace(/[\t\r\n\u2028\u2029]+/g, ' ');
    s = s.replace(/\u3000+/g, ' ');
    s = s.replace(/ {2,}/g, ' ');
    return s.trim();
  }

  /** 誇張の書式特徴を数える（元テキストに対して）。 */
  function formatFeatures(raw) {
    var s = String(raw == null ? '' : raw);
    var exclaim = (s.match(/[!！]/g) || []).length;
    var question = (s.match(/[?？]/g) || []).length;
    var exclaimRun = 0;
    var runs = s.match(/[!！]{2,}/g) || [];
    for (var i = 0; i < runs.length; i++) exclaimRun = Math.max(exclaimRun, runs[i].length);
    var wRun = 0;
    var wruns = s.match(/[wWｗＷ]+/g) || [];
    for (var j = 0; j < wruns.length; j++) wRun = Math.max(wRun, wruns[j].length);
    // 全大文字の語（英語圏の強調。3文字以上）
    var caps = 0;
    var words = s.match(/[A-Za-zА-Яа-яЁёЇїЄєІіҐґ]{3,}/g) || [];
    for (var k = 0; k < words.length; k++) {
      if (words[k] === words[k].toUpperCase() && /[A-Z]/.test(words[k])) caps++;
    }
    return { exclaim: exclaim, question: question, exclaimRun: exclaimRun, wRun: wRun, caps: caps };
  }

  return { normalize: normalize, formatFeatures: formatFeatures };
});


/* ===== src/lib/categories.js ===== */

/**
 * カテゴリの単一の定義元。
 * id -> 既定ラベル（日本語）。UI では i18n の cat_<id> があればそちらを使う。
 *
 * カテゴリは「言語をまたいで共通」で、各言語パックが同じ id に語を割り当てる。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).categories = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CATEGORY_LABELS = {
    attack: '攻撃・侮蔑',
    hostility: '憎悪・敵意',
    incitement: '煽り・呼びかけ',
    absolute: '断定・絶対化',
    othering: '二項対立・レッテル',
    cynicism: '冷笑・皮肉',
    urgency: '危機煽り',
    tone: '文体・口調',
    selfmock: '自虐・自己卑下',
    profanity: '差別・蔑称語',
    badwords: '下品・罵倒語',
    amplifier: '感情誇張',
    politics: '政治',
    conspiracy: '陰謀論',
    ai_dispute: 'AI論争',
    ai_topic: 'AI技術・界隈',
    world_affairs: '世界情勢・戦争',
    disaster: '災害・緊急情報',
    nsfw: 'NSFW・性的表現'
  };

  var CATEGORY_ORDER = [
    'attack',
    'profanity',
    'hostility',
    'incitement',
    'othering',
    'absolute',
    'urgency',
    'cynicism',
    'tone',
    'selfmock',
    'amplifier',
    'politics',
    'conspiracy',
    'ai_dispute',
    'ai_topic',
    'world_affairs',
    'disaster',
    'nsfw',
    'badwords'
  ];

  return { CATEGORY_LABELS: CATEGORY_LABELS, CATEGORY_ORDER: CATEGORY_ORDER };
});


/* ===== src/lib/config.js ===== */

/**
 * 拡張全体で共有する設定の既定値と保存キー。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).config = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PERSIST_KEY = 'jofSettings';
  var STATS_KEY = 'jofStats';

  // 既定では無効で、ユーザーが明示的に有効化するトピック系カテゴリ
  // （政治・陰謀論・AI論争。好みが分かれるため opt-in）
  var OPTIONAL_CATEGORIES = [
    'politics',
    'conspiracy',
    'ai_dispute',
    'ai_topic',
    'world_affairs',
    'disaster',
    'nsfw',
    'badwords'
  ];

  var PRESET_KEYS = ['off', 'soft', 'normal', 'hard'];

  var DEFAULTS = {
    enabled: true,
    threshold: 0.5, // この値以上でミュート
    mode: 'blur', // 'blur' | 'hide'
    showOverlay: true,
    minLength: 0, // これ未満の短い投稿は判定しない
    language: 'auto', // 'auto' | 'ja' | 'en' | 'zh' | 'ko' | 'ru' | 'uk' | ...
    categories: null, // null = 既定のカテゴリ構成（OPTIONAL_CATEGORIES を除く全部）
    // 集中プリセット: 'off' | 'soft'（やさしめ） | 'normal'（ふつう） | 'hard'（きびしめ）
    preset: 'off',
    focusMaxLength: 160, // 集中モード時、これより長い投稿は隠す（0で無効）
    focusHideReplies: true, // 集中モード時、リプライ投稿も隠す
    userWordsEnabled: true, // ユーザー辞書（自分のミュートワード）を使う
    userWords: [], // 自分で追加したミュートワード
    hideNotifications: false, // X上の通知バッジを隠す
    hideNotificationTab: false, // 通知タブ自体を隠す
    hideDm: false, // X上のDMバッジを隠す
    excludeSelf: true, // 自分の投稿はフィルターから除外する
    excludeReplies: false, // リプライ投稿はフィルターしない（既定OFF＝フィルターする）
  };

  var SCORE_VERSION = '1.0.0';

  function normalizeSettings(value) {
    value = value || {};
    var out = {
      enabled: value.enabled !== false,
      threshold: clampNumber(value.threshold, 0.3, 0.9, DEFAULTS.threshold),
      mode: value.mode === 'hide' ? 'hide' : 'blur',
      showOverlay: value.showOverlay !== false,
      minLength: clampNumber(value.minLength, 0, 500, DEFAULTS.minLength),
      language: typeof value.language === 'string' && value.language ? value.language : DEFAULTS.language,
      categories: Array.isArray(value.categories) ? value.categories.slice() : null,
      // 旧 focusMode(true) は 'normal' として引き継ぐ
      preset: PRESET_KEYS.indexOf(value.preset) >= 0 ? value.preset : value.focusMode === true ? 'normal' : DEFAULTS.preset,
      focusMaxLength: clampNumber(value.focusMaxLength, 0, 1000, DEFAULTS.focusMaxLength),
      focusHideReplies: value.focusHideReplies !== false,
      userWordsEnabled: value.userWordsEnabled !== false,
      userWords: Array.isArray(value.userWords)
        ? value.userWords
            .filter(function (w) {
              return typeof w === 'string' && w.trim();
            })
            .map(function (w) {
              return w.trim().slice(0, 100);
            })
            .slice(0, 500)
        : [],
      hideNotifications: value.hideNotifications === true,
      hideNotificationTab: value.hideNotificationTab === true,
      hideDm: value.hideDm === true,
      excludeSelf: value.excludeSelf !== false,
      excludeReplies: value.excludeReplies === true
    };
    return out;
  }

  function clampNumber(v, lo, hi, fallback) {
    var n = Number(v);
    if (!isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }

  /**
   * 集中プリセットのカテゴリ構成。
   *   soft   … 義憤系のみ
   *   normal … ざわつく話題も隠すが disaster（災害情報）は残す
   *   hard   … 全部（災害も含む）
   *   off    … null（ユーザーの個別設定を使う）
   */
  function presetCategories(preset, order, optional) {
    var core = order.filter(function (id) {
      return optional.indexOf(id) < 0;
    });
    if (preset === 'soft') return core;
    if (preset === 'normal') {
      return order.filter(function (id) {
        return id !== 'disaster';
      });
    }
    if (preset === 'hard') return order.slice();
    return null;
  }

  function presetThreshold(preset, base) {
    if (preset === 'soft') return Math.max(base, 0.6);
    if (preset === 'hard') return Math.min(base, 0.4);
    return base;
  }

  /** 集中モード時に長文を隠す閾値（プリセットOFFなら0＝無効） */
  function effectiveMaxLength(preset, value) {
    if (!preset || preset === 'off') return 0;
    var n = Number(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /** 集中モード時にリプライを隠すか（プリセットOFFなら false） */
  function effectiveReplyHide(preset, value) {
    if (!preset || preset === 'off') return false;
    return value !== false;
  }

  /** 有効/無効を反転した設定を返す（ショートカット等で使用） */
  function toggleEnabled(value) {
    var v = value || {};
    return normalizeSettings(
      Object.assign({}, v, {
        enabled: v.enabled === false
      })
    );
  }

  return {
    PERSIST_KEY: PERSIST_KEY,
    STATS_KEY: STATS_KEY,
    DEFAULTS: DEFAULTS,
    OPTIONAL_CATEGORIES: OPTIONAL_CATEGORIES,
    PRESET_KEYS: PRESET_KEYS,
    SCORE_VERSION: SCORE_VERSION,
    normalizeSettings: normalizeSettings,
    presetCategories: presetCategories,
    presetThreshold: presetThreshold,
    effectiveMaxLength: effectiveMaxLength,
    effectiveReplyHide: effectiveReplyHide,
    toggleEnabled: toggleEnabled
  };
});


/* ===== src/lib/lexicon.curated.js ===== */

/**
 * 義憤（righteous indignation / outrage）検出用の手作り辞書。
 *
 * 形式: [ 表層形, 重み, カテゴリ, フラグ ]
 *   フラグ 'noNeg' : 直後に否定語尾（〜ない/〜ではない）が来ても減衰させない
 *                    （「許さない」「あり得ない」自体が強い義憤表現のため）
 *
 * 重みの目安: 1.0 弱い / 1.6 明確 / 2.2 強い罵倒 / 3.0 最強（殺害・差別スラング等）
 * カテゴリ: attack / hostility / incitement / absolute / othering / cynicism / urgency
 *
 * 部分一致の誤検知対策は lexicon.js の EXCLUDE_AFTER を参照。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).lexiconCurated = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return [
    // ---- attack: 攻撃・侮蔑 ----
    ['死ね', 3.2, 'attack'],
    ['氏ね', 3.2, 'attack'],
    ['殺す', 2.8, 'attack'],
    ['殺せ', 3.0, 'attack'],
    ['殺害しろ', 3.0, 'attack'],
    ['消えろ', 2.6, 'attack'],
    ['消え失せろ', 3.0, 'attack'],
    ['失せろ', 2.6, 'attack'],
    ['失せな', 2.2, 'attack'],
    ['いなくなれ', 2.2, 'attack'],
    ['どっか行け', 2.2, 'attack'],
    ['クズ', 2.4, 'attack'],
    ['ゴミ', 2.0, 'attack'],
    ['カス', 2.2, 'attack'],
    ['バカ', 1.6, 'attack'],
    ['馬鹿', 1.6, 'attack'],
    ['アホ', 1.5, 'attack'],
    ['間抜け', 1.5, 'attack'],
    ['まぬけ', 1.4, 'attack'],
    ['無能', 1.8, 'attack'],
    ['役立たず', 1.8, 'attack'],
    ['害悪', 2.0, 'attack'],
    ['害虫', 2.2, 'attack'],
    ['ウジ虫', 2.6, 'attack'],
    ['クソ', 2.0, 'attack'],
    ['くそ野郎', 2.6, 'attack'],
    ['野郎', 1.2, 'attack'],
    ['てめえ', 1.6, 'attack'],
    ['てめぇ', 1.6, 'attack'],
    ['貴様', 2.0, 'attack'],
    ['きさま', 1.8, 'attack'],
    ['お前ら', 0.8, 'attack'],
    ['おまえら', 0.8, 'attack'],
    ['キチガイ', 2.8, 'attack'],
    ['基地外', 2.6, 'attack'],
    ['低能', 2.4, 'attack'],
    ['ボンクラ', 1.8, 'attack'],
    ['ポンコツ', 1.5, 'attack'],
    ['マヌケ', 1.6, 'attack'],
    ['老害', 2.2, 'attack'],
    ['負け犬', 1.8, 'attack'],
    ['雑魚', 1.8, 'attack'],
    ['カス共', 2.6, 'attack'],
    ['ボケ', 0.8, 'attack'],
    ['クソ野郎', 2.8, 'attack'],
    ['カス野郎', 2.8, 'attack'],
    ['バカ野郎', 2.4, 'attack'],
    ['ゴミ野郎', 2.6, 'attack'],
    ['税金泥棒', 2.0, 'attack'],
    ['詐欺師', 1.6, 'attack'],
    ['嘘つき', 1.3, 'attack'],
    ['ホラ吹き', 1.5, 'attack'],
    ['ペテン師', 1.8, 'attack'],
    ['エセ', 1.2, 'attack'],
    ['頭おかしい', 2.0, 'attack'],
    ['頭がおかしい', 2.0, 'attack'],
    ['正気か', 1.4, 'attack'],
    ['狂ってる', 1.8, 'attack'],
    ['狂人', 2.2, 'attack'],
    ['異常者', 2.2, 'attack'],
    ['変態', 1.6, 'attack'],
    ['クソ人間', 2.8, 'attack'],
    ['人間のクズ', 3.0, 'attack'],
    ['社会のゴミ', 2.8, 'attack'],
    ['死んだほうが', 3.0, 'attack'],
    ['死んだ方が', 3.0, 'attack'],
    ['ゴミカス', 2.6, 'attack'],
    ['クズカス', 2.6, 'attack'],
    ['カスゴミ', 2.6, 'attack'],

    // ---- hostility: 憎悪・敵意 ----
    ['許せない', 2.0, 'hostility', 'noNeg'],
    ['許さない', 1.8, 'hostility', 'noNeg'],
    ['絶対に許さない', 2.6, 'hostility', 'noNeg'],
    ['絶対許さない', 2.6, 'hostility', 'noNeg'],
    ['許しがたい', 2.2, 'hostility'],
    ['許し難い', 2.2, 'hostility'],
    ['憎い', 2.0, 'hostility'],
    ['憎む', 1.8, 'hostility'],
    ['憎しみ', 1.8, 'hostility'],
    ['大嫌い', 1.8, 'hostility'],
    ['嫌い', 0.7, 'hostility'],
    ['嫌悪', 1.6, 'hostility'],
    ['ムカつく', 1.6, 'hostility'],
    ['むかつく', 1.6, 'hostility'],
    ['腹立つ', 1.5, 'hostility'],
    ['腹が立つ', 1.6, 'hostility'],
    ['頭にくる', 1.5, 'hostility'],
    ['頭に来る', 1.5, 'hostility'],
    ['殺意', 3.0, 'hostility'],
    ['ぶっ飛ばす', 2.4, 'hostility'],
    ['ぶん殴る', 2.6, 'hostility'],
    ['殴りたい', 2.2, 'hostility'],
    ['地獄に落ちろ', 2.8, 'hostility'],
    ['死んでほしい', 2.8, 'hostility'],
    ['消えてほしい', 2.4, 'hostility'],
    ['怒り', 1.4, 'hostility'],
    ['激怒', 1.8, 'hostility'],
    ['憤慨', 1.8, 'hostility'],
    ['義憤', 1.6, 'hostility'],
    ['怒り心頭', 2.2, 'hostility'],
    ['煮えくり返る', 2.2, 'hostility'],
    ['言語道断', 2.0, 'hostility'],
    ['けしからん', 1.8, 'hostility'],
    ['不愉快', 1.4, 'hostility'],
    ['不快', 1.2, 'hostility'],
    ['胸糞', 2.2, 'hostility'],
    ['胸クソ', 2.2, 'hostility'],
    ['胸くそ', 2.2, 'hostility'],
    ['気持ち悪い', 1.4, 'hostility'],
    ['キモい', 1.8, 'hostility'],
    ['きもい', 1.6, 'hostility'],
    ['悍ましい', 2.2, 'hostility'],
    ['おぞましい', 2.0, 'hostility'],
    ['戦慄', 1.6, 'hostility'],
    ['呆れる', 1.4, 'hostility'],
    ['呆れた', 1.4, 'hostility'],
    ['あきれる', 1.4, 'hostility'],
    ['唖然', 1.4, 'hostility'],
    ['ありえない', 1.8, 'hostility', 'noNeg'],
    ['あり得ない', 1.8, 'hostility', 'noNeg'],
    ['信じられない', 1.6, 'hostility', 'noNeg'],
    ['絶望', 1.5, 'hostility'],
    ['もう終わり', 1.3, 'hostility'],
    ['終わってる', 1.3, 'hostility'],
    ['終わっている', 1.3, 'hostility'],

    // ---- incitement: 煽り・呼びかけ ----
    ['叩け', 2.0, 'incitement'],
    ['叩くべき', 1.8, 'incitement'],
    ['晒せ', 2.6, 'incitement'],
    ['晒すべき', 2.0, 'incitement'],
    ['晒し上げ', 2.2, 'incitement'],
    ['吊るせ', 2.8, 'incitement'],
    ['制裁', 1.8, 'incitement'],
    ['制裁しろ', 2.2, 'incitement'],
    ['断罪', 2.2, 'incitement'],
    ['糾弾', 2.2, 'incitement'],
    ['糾弾しろ', 2.6, 'incitement'],
    ['追い出せ', 2.2, 'incitement'],
    ['追放しろ', 2.4, 'incitement'],
    ['出て行け', 2.4, 'incitement'],
    ['出ていけ', 2.4, 'incitement'],
    ['ボイコット', 1.6, 'incitement'],
    ['不買', 1.4, 'incitement'],
    ['拡散希望', 1.2, 'incitement'],
    ['拡散しろ', 1.8, 'incitement'],
    ['声を上げろ', 1.6, 'incitement'],
    ['立ち上がれ', 1.4, 'incitement'],
    ['抗議しろ', 1.8, 'incitement'],
    ['謝罪しろ', 2.0, 'incitement'],
    ['土下座しろ', 2.2, 'incitement'],
    ['責任取れ', 2.0, 'incitement'],
    ['辞めろ', 1.8, 'incitement'],
    ['辞任しろ', 1.8, 'incitement'],
    ['降りろ', 1.6, 'incitement'],
    ['黙れ', 2.2, 'incitement'],
    ['黙ってろ', 2.4, 'incitement'],
    ['引っ込め', 2.0, 'incitement'],
    ['袋叩き', 2.4, 'incitement'],
    ['殺到しろ', 2.2, 'incitement'],
    ['突撃しろ', 2.2, 'incitement'],
    ['電凸', 1.8, 'incitement'],

    // ---- absolute: 断定・絶対化 ----
    ['絶対', 0.7, 'absolute'],
    ['絶対に', 1.0, 'absolute'],
    ['必ず', 0.4, 'absolute'],
    ['論外', 1.6, 'absolute'],
    ['完全に', 0.6, 'absolute'],
    ['二度と', 0.8, 'absolute'],
    ['確定', 0.5, 'absolute'],
    ['間違いない', 1.0, 'absolute'],
    ['明らか', 0.3, 'absolute'],
    ['100%', 0.7, 'absolute'],
    ['百パー', 0.7, 'absolute'],
    ['ありえん', 1.4, 'absolute'],
    ['あり得ん', 1.4, 'absolute'],
    ['そんなわけない', 1.2, 'absolute'],
    ['絶対ありえない', 2.0, 'absolute', 'noNeg'],

    // ---- othering: 二項対立・レッテル ----
    ['信者', 1.4, 'othering'],
    ['工作員', 2.0, 'othering'],
    ['ネトウヨ', 2.2, 'othering'],
    ['パヨク', 2.2, 'othering'],
    ['左翼', 1.0, 'othering'],
    ['右翼', 1.0, 'othering'],
    ['反日', 1.8, 'othering'],
    ['売国', 2.2, 'othering'],
    ['売国奴', 2.6, 'othering'],
    ['非国民', 2.4, 'othering'],
    ['国賊', 2.4, 'othering'],
    ['分際', 2.0, 'othering'],
    ['ごとき', 1.2, 'othering'],
    ['如き', 1.2, 'othering'],
    ['自称', 0.8, 'othering'],
    ['どこぞの', 1.2, 'othering'],
    ['カルト', 1.2, 'othering'],
    ['洗脳', 1.6, 'othering'],
    ['マインドコントロール', 1.4, 'othering'],
    ['手先', 1.2, 'othering'],
    ['犬コロ', 1.4, 'othering'],
    ['傀儡', 1.6, 'othering'],
    ['外敵', 1.4, 'othering'],
    ['敵国', 1.6, 'othering'],
    ['スパイ', 1.4, 'othering'],

    // ---- cynicism: 冷笑・皮肉 ----
    ['どうせ', 1.0, 'cynicism'],
    ['はいはい', 1.2, 'cynicism'],
    ['だから何', 1.4, 'cynicism'],
    ['知らんがな', 1.4, 'cynicism'],
    ['知らんけど', 0.8, 'cynicism'],
    ['草', 0.5, 'cynicism'],
    ['www', 0.8, 'cynicism'],
    ['笑笑', 1.2, 'cynicism'],
    ['ざまあ', 1.8, 'cynicism'],
    ['ざまあみろ', 2.2, 'cynicism'],
    ['いい気味', 2.0, 'cynicism'],
    ['自業自得', 1.4, 'cynicism'],
    ['知ったか', 1.2, 'cynicism'],
    ['ドヤ顔', 1.0, 'cynicism'],
    ['マウント', 1.0, 'cynicism'],

    // ---- urgency: 危機煽り ----
    ['緊急', 1.0, 'urgency'],
    ['今すぐ', 0.8, 'urgency'],
    ['危険', 0.8, 'urgency'],
    ['終わりの始まり', 1.8, 'urgency'],
    ['日本が終わる', 2.0, 'urgency'],
    ['日本終了', 2.0, 'urgency'],
    ['日本終わった', 2.0, 'urgency'],
    ['滅びる', 1.6, 'urgency'],
    ['崩壊', 1.2, 'urgency'],
    ['破滅', 1.6, 'urgency'],
    ['滅亡', 1.6, 'urgency'],
    ['亡国', 1.8, 'urgency'],
    ['取り返しのつかない', 1.8, 'urgency'],
    ['とんでもない', 1.0, 'urgency'],
    ['前代未聞', 1.4, 'urgency'],
    ['史上最悪', 1.8, 'urgency'],
    ['最悪', 1.0, 'urgency'],
    ['最悪だ', 1.4, 'urgency'],
    ['ひどい', 0.8, 'urgency'],
    ['酷い', 0.8, 'urgency'],
    ['酷すぎる', 1.6, 'urgency'],
    ['大問題', 1.0, 'urgency'],
    ['深刻', 0.8, 'urgency'],
    ['危機', 1.0, 'urgency'],
    ['警鐘', 1.0, 'urgency'],
    ['このままでは', 0.8, 'urgency'],
    ['滅び', 1.4, 'urgency'],

    // ---- 口調・言い回し（文体レイヤーと補完）----
    ['うるさい', 1.6, 'attack'],
    ['許さん', 1.8, 'hostility', 'noNeg'],
    ['ふざけんな', 2.4, 'hostility', 'noNeg'],
    ['ふざけるな', 2.4, 'hostility', 'noNeg'],
    ['なめてんのか', 2.4, 'hostility'],
    ['なめんな', 2.2, 'hostility'],
    ['何言ってんの', 1.8, 'hostility'],
    ['いい加減にしろ', 2.0, 'incitement'],
    ['よく考えろ', 1.6, 'incitement'],
    ['反省しろ', 1.8, 'incitement']
  ];
});


/* ===== src/lib/lexicon.vendor.js ===== */

/**
 * OSS 由来の辞書データ（vendored）と、その補足。
 *
 * ■ 原本（収録・改変なし）
 *   出典: MosasoM/inappropriate-words-ja
 *     https://github.com/MosasoM/inappropriate-words-ja
 *   ライセンス: MIT License, Copyright (c) 2020 K Hashimoto
 *   ファイル: Offensive.txt（攻撃的・差別的な表現リスト, 暫定版）
 *   原本の説明: 「単語それ自体が不適切だと断定できるもの」を人手で収集したもの。
 *   原本ファイルは vendor/inappropriate-words-ja/Offensive.txt に同梱。
 *
 * ■ 補足語（EXTRA）
 *   上記原本には含まれないが、日本語圏で広く差別・侮蔑に用いられる語。
 *   本体の作者が判断して追加したもので、MosasoM 由来ではない。
 *
 * ※ 重みは語の強さに応じて人手で調整している（原本の並びは保持）。
 * ※ 部分一致の誤検知対策は lexicon.js の EXCLUDE_AFTER を参照。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).lexiconVendor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // MosasoM Offensive.txt の語
  var OFFICIAL = [
    'いざり',
    'かたわ',
    'きちがい',
    'ぎっちょ',
    'つんぼ',
    'でべそ',
    'びっこ',
    'めくら',
    'アスペ',
    'アホ',
    'カス',
    'ガイジ',
    'キチガイ',
    'クソ',
    'クソくらえ',
    'クソアマ',
    'クソガキ',
    'クソゴミ',
    'ジジイ',
    'ステハゲ',
    'デブ',
    'ナマポ',
    'ネトウヨ',
    'ハゲ',
    'バカ',
    'バカヤロウ',
    'バカヤロー',
    'ババア',
    'パヨク',
    'ピネガキ',
    'ブス',
    'ボケ',
    'ポリ公',
    'マヌケ',
    '唖',
    '土方',
    '尻軽',
    '支那',
    '支那人',
    '池沼',
    '畜生',
    '白痴',
    '糖質',
    '糞くらえ',
    '糞食らえ',
    '統失',
    '豚野郎',
    '非国民',
    '馬鹿野郎'
  ];

  // 補足語（本拡張の作者による追加）
  var EXTRA = ['土人', 'チョン', 'シナ人', '日本鬼子', 'メンヘラ', '知恵遅れ', 'ブサイク'];

  // 語 -> 重み（未指定は 2.0）
  var WEIGHT = {
    いざり: 2.6, かたわ: 2.8, きちがい: 2.8, ぎっちょ: 2.4, つんぼ: 2.8, でべそ: 1.4, びっこ: 2.4,
    めくら: 2.8, アスペ: 2.2, アホ: 1.5, カス: 2.2, ガイジ: 2.6, キチガイ: 2.8, クソ: 2.0,
    クソくらえ: 2.6, クソアマ: 2.4, クソガキ: 2.4, クソゴミ: 2.6, ジジイ: 1.8, ステハゲ: 1.6,
    デブ: 1.8, ナマポ: 2.0, ネトウヨ: 2.2, ハゲ: 1.6, バカ: 1.6, バカヤロウ: 2.4, バカヤロー: 2.4,
    ババア: 1.8, パヨク: 2.2, ピネガキ: 2.2, ブス: 1.8, ボケ: 0.9, ポリ公: 2.0, マヌケ: 1.6,
    唖: 2.6, 土方: 1.4, 尻軽: 1.6, 支那: 2.2, 支那人: 2.8, 池沼: 2.6, 畜生: 1.6, 白痴: 2.6,
    糖質: 1.8, 糞くらえ: 2.6, 糞食らえ: 2.6, 統失: 2.2, 豚野郎: 2.6, 非国民: 2.4, 馬鹿野郎: 2.4,
    土人: 2.8, チョン: 2.8, シナ人: 2.8, 日本鬼子: 2.8, メンヘラ: 1.6, 知恵遅れ: 2.6, ブサイク: 1.8
  };

  function rows(words) {
    return words.map(function (w) {
      return [w, WEIGHT[w] || 2.0, 'profanity'];
    });
  }

  return rows(OFFICIAL).concat(rows(EXTRA));
});


/* ===== src/lib/lexicon.topics.js ===== */

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
    ['aiが嘘', 2.4, 'ai_dispute'],

    // ---- world_affairs: 世界情勢・戦争（Triggerになりやすい題材） ----
    ['世界情勢', 2.0, 'world_affairs'],
    ['国際情勢', 2.0, 'world_affairs'],
    ['中東情勢', 2.4, 'world_affairs'],
    ['地政学', 1.8, 'world_affairs'],
    ['戦争', 2.4, 'world_affairs'],
    ['開戦', 2.6, 'world_affairs'],
    ['宣戦布告', 2.6, 'world_affairs'],
    ['世界大戦', 2.4, 'world_affairs'],
    ['第三次世界大戦', 2.8, 'world_affairs'],
    ['ww3', 2.6, 'world_affairs'],
    ['侵攻', 2.4, 'world_affairs'],
    ['軍事侵攻', 2.6, 'world_affairs'],
    ['ウクライナ侵攻', 2.6, 'world_affairs'],
    ['ガザ侵攻', 2.6, 'world_affairs'],
    ['戦闘', 2.2, 'world_affairs'],
    ['紛争', 2.2, 'world_affairs'],
    ['武力衝突', 2.4, 'world_affairs'],
    ['衝突', 1.6, 'world_affairs'],
    ['戦況', 2.2, 'world_affairs'],
    ['停戦', 2.2, 'world_affairs'],
    ['和平交渉', 2.2, 'world_affairs'],
    ['有事', 2.2, 'world_affairs'],
    ['台湾有事', 2.6, 'world_affairs'],
    ['緊迫', 2.0, 'world_affairs'],
    ['空爆', 2.6, 'world_affairs'],
    ['爆撃', 2.6, 'world_affairs'],
    ['空襲', 2.6, 'world_affairs'],
    ['砲撃', 2.4, 'world_affairs'],
    ['ミサイル', 2.2, 'world_affairs'],
    ['ミサイル発射', 2.6, 'world_affairs'],
    ['弾道ミサイル', 2.6, 'world_affairs'],
    ['ドローン攻撃', 2.4, 'world_affairs'],
    ['核兵器', 2.6, 'world_affairs'],
    ['核戦争', 2.8, 'world_affairs'],
    ['核爆発', 2.8, 'world_affairs'],
    ['核実験', 2.6, 'world_affairs'],
    ['原爆', 2.6, 'world_affairs'],
    ['大量破壊兵器', 2.6, 'world_affairs'],
    ['化学兵器', 2.6, 'world_affairs'],
    ['生物兵器', 2.6, 'world_affairs'],
    ['クーデター', 2.6, 'world_affairs'],
    ['戒厳令', 2.6, 'world_affairs'],
    ['テロ', 2.4, 'world_affairs'],
    ['テロリスト', 2.4, 'world_affairs'],
    ['自爆テロ', 2.6, 'world_affairs'],
    ['襲撃', 2.2, 'world_affairs'],
    ['銃撃', 2.4, 'world_affairs'],
    ['銃乱射', 2.6, 'world_affairs'],
    ['発砲', 2.2, 'world_affairs'],
    ['殺人', 2.4, 'world_affairs'],
    ['殺害', 2.4, 'world_affairs'],
    ['惨殺', 2.6, 'world_affairs'],
    ['虐殺', 2.6, 'world_affairs'],
    ['ジェノサイド', 2.6, 'world_affairs'],
    ['民族浄化', 2.6, 'world_affairs'],
    ['拷問', 2.6, 'world_affairs'],
    ['拉致', 2.4, 'world_affairs'],
    ['誘拐', 2.4, 'world_affairs'],
    ['強姦', 2.6, 'world_affairs'],
    ['レイプ', 2.6, 'world_affairs'],
    ['性暴力', 2.4, 'world_affairs'],
    ['人身売買', 2.4, 'world_affairs'],
    ['死傷者', 2.2, 'world_affairs'],
    ['犠牲者', 2.0, 'world_affairs'],
    ['遺体', 2.4, 'world_affairs'],
    ['心肺停止', 2.0, 'world_affairs'],
    ['死亡', 1.8, 'world_affairs'],
    ['重体', 1.8, 'world_affairs'],
    ['重傷', 1.8, 'world_affairs'],
    ['人道危機', 2.4, 'world_affairs'],
    ['難民キャンプ', 2.2, 'world_affairs'],
    ['飢餓', 2.0, 'world_affairs'],
    ['大地震', 2.2, 'world_affairs'],
    ['巨大地震', 2.2, 'world_affairs'],
    ['震災', 2.2, 'world_affairs'],
    ['津波', 2.4, 'world_affairs'],
    ['大津波', 2.6, 'world_affairs'],
    ['大規模火災', 2.4, 'world_affairs'],
    ['パンデミック', 2.2, 'world_affairs'],
    ['感染爆発', 2.2, 'world_affairs'],
    ['世界恐慌', 2.4, 'world_affairs'],
    ['経済崩壊', 2.2, 'world_affairs'],
    ['大暴落', 2.2, 'world_affairs'],
    ['株価暴落', 2.2, 'world_affairs'],
    ['ロシア軍', 2.4, 'world_affairs'],
    ['中国軍', 2.4, 'world_affairs'],
    ['イスラエル軍', 2.4, 'world_affairs'],
    ['人民解放軍', 2.4, 'world_affairs'],
    ['北朝鮮ミサイル', 2.6, 'world_affairs'],
    ['尖閣', 2.2, 'world_affairs'],
    ['北方領土', 2.2, 'world_affairs']
  ];
});


/* ===== src/lib/lexicon.js ===== */

/**
 * 義憤辞書の結合・索引化・パターン定義。
 *
 * - 手作り辞書 (lexicon.curated.js) と
 *   OSS 由来辞書 (lexicon.vendor.js, MosasoM/inappropriate-words-ja: MIT) を統合
 * - 表層形の長い順に並べ、先頭文字ごとの索引を作る（辞書最長一致スキャン用）
 * - 「べき」「〜しろ」等の文型パターンも定義
 *
 * 部分一致の誤検知対策として EXCLUDE_AFTER を持つ
 * （例: 「カス」の直後が「タ」なら「カスタム」なので無視する）。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./lexicon.curated.js'), require('./lexicon.vendor.js'), require('./lexicon.topics.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.lexicon = factory(JOF.lexiconCurated, JOF.lexiconVendor, JOF.lexiconTopics);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (curated, vendor, topics) {
  'use strict';

  var CATEGORY_LABELS = {
    attack: '攻撃・侮蔑',
    hostility: '憎悪・敵意',
    incitement: '煽り・呼びかけ',
    absolute: '断定・絶対化',
    othering: '二項対立・レッテル',
    cynicism: '冷笑・皮肉',
    urgency: '危機煽り',
    profanity: '差別・侮蔑語',
    amplifier: '感情誇張',
    politics: '政治',
    conspiracy: '陰謀論',
    ai_dispute: 'AI論争',
    world_affairs: '世界情勢・戦争'
  };

  var CATEGORY_ORDER = [
    'attack',
    'profanity',
    'hostility',
    'incitement',
    'othering',
    'absolute',
    'urgency',
    'cynicism',
    'amplifier',
    'politics',
    'conspiracy',
    'ai_dispute',
    'world_affairs'
  ];

  // 直後にこれらが続く場合は、別の無害な語の一部とみなして無視する
  var EXCLUDE_AFTER = {
    カス: ['タ', 'ケ', 'テ', 'ト', 'ミ'],
    バカ: ['ンス', 'ラ', 'ス'],
    アホ: ['ウ', '毛'],
    アスペ: ['クト', 'ル'],
    ハゲ: ['タカ', 'る'],
    ボケ: ['ッ', 'ット'],
    デブ: ['る'],
    ブス: ['ッ'],
    糖質: ['制限', 'オフ', '質'],
    支那: ['そば', 'ちょう', '街'],
    いざり: ['び'],
    草: ['食', '木', '花', 'むら', '加', '庵', '間'],
    www: ['w']
  };

  // 文型パターン（正規化済みテキストに対して走査）
  var PATTERNS = [
    { id: 'subeki', label: 'すべき', cat: 'incitement', w: 1.0, re: /すべき/g },
    { id: 'beki', label: 'べき論', cat: 'incitement', w: 0.8, re: /(?<!す)べき(だ|です)?/g },
    { id: 'shiroyo', label: '命令', cat: 'incitement', w: 1.3, re: /しろよ/g },
    {
      id: 'shiro',
      label: '命令',
      cat: 'incitement',
      w: 1.1,
      re: /(?<=[ぁ-んァ-ヶ一-龠々])しろ(?=[!！。、\s]|$)/g
    },
    { id: 'seyo', label: '命令', cat: 'incitement', w: 1.0, re: /(?<=[ぁ-んァ-ヶ一-龠々])せよ(?=[!！。、\s]|$)/g },
    { id: 'suruna', label: '禁止命令', cat: 'incitement', w: 0.9, re: /するな(?=[!！。、\s]|$)/g },
    { id: 'kimatteru', label: '断定', cat: 'absolute', w: 0.9, re: /決まってる|決まっている/g },
    { id: 'igai', label: '排他断定', cat: 'absolute', w: 1.1, re: /以外ありえない|以外あり得ない/g }
  ];

  function normalizeTerm(t) {
    try {
      return String(t).normalize('NFKC').toLowerCase();
    } catch (e) {
      return String(t).toLowerCase();
    }
  }

  function makeEntry(raw) {
    if (!raw || !raw.length) return null;
    var term = normalizeTerm(raw[0]);
    if (!term) return null;
    var flags = raw[3] || '';
    return {
      term: raw[0],
      n: term,
      w: Number(raw[1]) || 1,
      cat: raw[2] || 'attack',
      noNeg: String(flags).indexOf('noNeg') >= 0,
      source: raw[4] || 'curated'
    };
  }

  // 表層形 -> entry（カスタム辞書を優先して上書き）
  var map = new Map();
  var vendorList = vendor || [];
  for (var i = 0; i < vendorList.length; i++) {
    var ve = makeEntry(vendorList[i].concat(['profanity']));
    ve.source = 'vendor:inappropriate-words-ja';
    if (ve && !map.has(ve.n)) map.set(ve.n, ve);
  }
  var topicList = topics || [];
  for (var ti = 0; ti < topicList.length; ti++) {
    var te = makeEntry(topicList[ti]);
    if (te && !map.has(te.n)) {
      te.source = 'topics';
      map.set(te.n, te);
    }
  }
  var curatedList = curated || [];
  for (var j = 0; j < curatedList.length; j++) {
    var ce = makeEntry(curatedList[j]);
    if (ce) map.set(ce.n, ce); // curated が勝つ
  }

  var TERMS = Array.from(map.values());
  // 長い表層形を優先（最長一致）
  TERMS.sort(function (a, b) {
    return b.n.length - a.n.length || (a.n < b.n ? -1 : 1);
  });

  var BY_FIRST = new Map();
  for (var k = 0; k < TERMS.length; k++) {
    var c = TERMS[k].n.charAt(0);
    if (!BY_FIRST.has(c)) BY_FIRST.set(c, []);
    BY_FIRST.get(c).push(TERMS[k]);
  }

  return {
    CATEGORY_LABELS: CATEGORY_LABELS,
    CATEGORY_ORDER: CATEGORY_ORDER,
    EXCLUDE_AFTER: EXCLUDE_AFTER,
    PATTERNS: PATTERNS,
    TERMS: TERMS,
    BY_FIRST: BY_FIRST,
    normalizeTerm: normalizeTerm
  };
});


/* ===== src/lib/lang/build.js ===== */

/**
 * 言語パックの共通ビルダー。
 *
 * 言語ごとに「照合方式」が異なる:
 *   - 'substring' : 日本語・中国語・韓国語・タイ語など（分かち書きしない）→ 最長一致の部分一致
 *   - 'word'      : 英語・ロシア語・ウクライナ語など（空白区切り）→ 単語境界でのフレーズ一致
 *
 * 索引を作り、scoring.js から使えるようにする。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.JOF = root.JOF || {}).langBuild = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var WORD_SRC = "[\\p{L}\\p{N}]+(?:['\u2019][\\p{L}]+)*";

  function normalizeTerm(t) {
    try {
      return String(t).normalize('NFKC').toLowerCase();
    } catch (e) {
      return String(t).toLowerCase();
    }
  }

  function tokenizeWords(s) {
    var re = new RegExp(WORD_SRC, 'gu');
    var out = [];
    var m;
    while ((m = re.exec(s)) !== null) out.push(m[0]);
    return out;
  }

  /** 位置付きトークン（word 照合で使う）。 */
  function tokenizeWithPositions(s) {
    var re = new RegExp(WORD_SRC, 'gu');
    var out = [];
    var m;
    while ((m = re.exec(s)) !== null) out.push({ w: m[0], start: m.index, end: m.index + m[0].length });
    return out;
  }

  /** [term, w, cat, flags, source] もしくは "term" を正規化エントリに変換。 */
  function toEntries(rawList, defaultCat, defaultWeight) {
    var out = [];
    (rawList || []).forEach(function (r) {
      var term, w, cat, flags, source;
      if (Array.isArray(r)) {
        term = r[0];
        w = Number(r[1]) || defaultWeight;
        cat = r[2] || defaultCat;
        flags = r[3] || '';
        source = r[4] || '';
      } else {
        term = r;
        w = defaultWeight;
        cat = defaultCat;
        flags = '';
        source = '';
      }
      if (!term) return;
      out.push({
        term: term,
        n: normalizeTerm(term),
        w: w,
        cat: cat,
        noNeg: String(flags).indexOf('noNeg') >= 0,
        source: source
      });
    });
    return out;
  }

  /**
   * パックの索引を構築する。
   * @param {Array} rawTerms [term, w, cat, flags?, source?] もしくは "term"
   * @param {{match?:string, defaultCategory?:string, defaultWeight?:number, exclusions?:object}} opts
   */
  function build(rawTerms, opts) {
    opts = opts || {};
    var match = opts.match === 'word' ? 'word' : 'substring';
    var map = new Map();
    toEntries(rawTerms, opts.defaultCategory || 'attack', opts.defaultWeight || 2.0).forEach(function (e) {
      if (!e.n) return;
      map.set(e.n, e); // 後勝ち（curated を最後に置く）
    });

    var TERMS = Array.from(map.values());
    if (match === 'word') {
      TERMS.forEach(function (e) {
        e.tokens = tokenizeWords(e.n);
      });
      TERMS = TERMS.filter(function (e) {
        return e.tokens.length > 0;
      });
      TERMS.sort(function (a, b) {
        return b.tokens.length - a.tokens.length || b.n.length - a.n.length;
      });
    } else {
      TERMS = TERMS.filter(function (e) {
        return e.n.length > 0;
      });
      TERMS.sort(function (a, b) {
        return b.n.length - a.n.length || (a.n < b.n ? -1 : 1);
      });
    }

    var BY_FIRST = new Map();
    var BY_WORD = new Map();
    TERMS.forEach(function (e) {
      if (match === 'word') {
        var key = e.tokens[0];
        if (!BY_WORD.has(key)) BY_WORD.set(key, []);
        BY_WORD.get(key).push(e);
      } else {
        var c = e.n.charAt(0);
        if (!BY_FIRST.has(c)) BY_FIRST.set(c, []);
        BY_FIRST.get(c).push(e);
      }
    });

    return {
      match: match,
      TERMS: TERMS,
      BY_FIRST: BY_FIRST,
      BY_WORD: BY_WORD,
      EXCLUDE_AFTER: opts.exclusions || {}
    };
  }

  return {
    build: build,
    toEntries: toEntries,
    normalizeTerm: normalizeTerm,
    tokenizeWords: tokenizeWords,
    tokenizeWithPositions: tokenizeWithPositions
  };
});


/* ===== src/lib/lang/term-layer.js ===== */

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


/* ===== src/lib/lang/data/ldnoobw.js ===== */

/**
 * 多言語の罵倒語リスト（vendored, 生成ファイル）。
 *
 * 出典: LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
 *   https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
 *   ライセンス: Creative Commons Attribution 4.0 International (CC-BY-4.0)
 *   原本: vendor/ldnoobw/ に同梱（LICENSE 含む）
 *
 * 生成: node scripts/build-lang-data.mjs   ※手で編集しないこと
 *
 * これらの語は「下品・罵倒語(badwords)」カテゴリ（既定OFF）として使われる。
 * 性的表現などを含むため、既定では無効にしてある。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).ldnoobw = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {"ar":["سكس","طيز","شرج","لعق","لحس","مص","تمص","بيضان","ثدي","بز","بزاز","حلمة","مفلقسة","بظر","كس","فرج","شهوة","شاذ","مبادل","عاهرة","جماع","قضيب","زب","لوطي","لواط","سحاق","سحاقية","اغتصاب","خنثي","احتلام","نيك","متناك","متناكة","شرموطة","عرص","خول","قحبة","لبوة"],"cs":["bordel","buzna","čumět","čurák","debil","do piče","do prdele","dršťka","držka","flundra","hajzl","hovno","chcanky","chuj","jebat","kokot","kokotina","koňomrd","kunda","kurva","mamrd","mrdat","mrdka","mrdník","oslošoust","piča","píčus","píchat","pizda","prcat","prdel","prdelka","sračka","srát","šoustat","šulin","vypíčenec","zkurvit","zkurvysyn","zmrd","žrát"],"da":["anus","bøsserøv","cock","fisse","fissehår","fuck","hestepik","kussekryller","lort","luder","pik","pikhår","pikslugeri","piksutteri","pis","røv","røvhul","røvskæg","røvspræke","shit"],"de":["analritter","arsch","arschficker","arschlecker","arschloch","bimbo","bratze","bumsen","bonze","dödel","fick","ficken","flittchen","fotze","fratze","hackfresse","hure","hurensohn","ische","kackbratze","kacke","kacken","kackwurst","kampflesbe","kanake","kimme","lümmel","MILF","möpse","morgenlatte","möse","mufti","muschi","nackt","neger","nigger","nippel","nutte","onanieren","orgasmus","penis","pimmel","pimpern","pinkeln","pissen","pisser","popel","poppen","porno","reudig","rosette","schabracke","schlampe","scheiße","scheisser","schiesser","schnackeln","schwanzlutscher","schwuchtel","tittchen","titten","vögeln","vollpfosten","wichse","wichsen","wichser"],"en":["2g1c","2 girls 1 cup","acrotomophilia","alabama hot pocket","alaskan pipeline","anal","anilingus","anus","apeshit","arsehole","ass","asshole","assmunch","auto erotic","autoerotic","babeland","baby batter","baby juice","ball gag","ball gravy","ball kicking","ball licking","ball sack","ball sucking","bangbros","bangbus","bareback","barely legal","barenaked","bastard","bastardo","bastinado","bbw","bdsm","beaner","beaners","beaver cleaver","beaver lips","beastiality","bestiality","big black","big breasts","big knockers","big tits","bimbos","birdlock","bitch","bitches","black cock","blonde action","blonde on blonde action","blowjob","blow job","blow your load","blue waffle","blumpkin","bollocks","bondage","boner","boob","boobs","booty call","brown showers","brunette action","bukkake","bulldyke","bullet vibe","bullshit","bung hole","bunghole","busty","butt","buttcheeks","butthole","camel toe","camgirl","camslut","camwhore","carpet muncher","carpetmuncher","chocolate rosebuds","cialis","circlejerk","cleveland steamer","clit","clitoris","clover clamps","clusterfuck","cock","cocks","coprolagnia","coprophilia","cornhole","coon","coons","creampie","cum","cumming","cumshot","cumshots","cunnilingus","cunt","darkie","date rape","daterape","deep throat","deepthroat","dendrophilia","dick","dildo","dingleberry","dingleberries","dirty pillows","dirty sanchez","doggie style","doggiestyle","doggy style","doggystyle","dog style","dolcett","domination","dominatrix","dommes","donkey punch","double dong","double penetration","dp action","dry hump","dvda","eat my ass","ecchi","ejaculation","erotic","erotism","escort","eunuch","fag","faggot","fecal","felch","fellatio","feltch","female squirting","femdom","figging","fingerbang","fingering","fisting","foot fetish","footjob","frotting","fuck","fuck buttons","fuckin","fucking","fucktards","fudge packer","fudgepacker","futanari","gangbang","gang bang","gay sex","genitals","giant cock","girl on","girl on top","girls gone wild","goatcx","goatse","god damn","gokkun","golden shower","goodpoop","goo girl","goregasm","grope","group sex","g-spot","guro","hand job","handjob","hard core","hardcore","hentai","homoerotic","honkey","hooker","horny","hot carl","hot chick","how to kill","how to murder","huge fat","humping","incest","intercourse","jack off","jail bait","jailbait","jelly donut","jerk off","jigaboo","jiggaboo","jiggerboo","jizz","juggs","kike","kinbaku","kinkster","kinky","knobbing","leather restraint","leather straight jacket","lemon party","livesex","lolita","lovemaking","make me come","male squirting","masturbate","masturbating","masturbation","menage a trois","milf","missionary position","mong","motherfucker","mound of venus","mr hands","muff diver","muffdiving","nambla","nawashi","negro","neonazi","nigga","nigger","nig nog","nimphomania","nipple","nipples","nsfw","nsfw images","nude","nudity","nutten","nympho","nymphomania","octopussy","omorashi","one cup two girls","one guy one jar","orgasm","orgy","paedophile","paki","panties","panty","pedobear","pedophile","pegging","penis","phone sex","piece of shit","pikey","pissing","piss pig","pisspig","playboy","pleasure chest","pole smoker","ponyplay","poof","poon","poontang","punany","poop chute","poopchute","porn","porno","pornography","prince albert piercing","pthc","pubes","pussy","queaf","queef","quim","raghead","raging boner","rape","raping","rapist","rectum","reverse cowgirl","rimjob","rimming","rosy palm","rosy palm and her 5 sisters","rusty trombone","sadism","santorum","scat","schlong","scissoring","semen","sex","sexcam","sexo","sexy","sexual","sexually","sexuality","shaved beaver","shaved pussy","shemale","shibari","shit","shitblimp","shitty","shota","shrimping","skeet","slanteye","slut","s&m","smut","snatch","snowballing","sodomize","sodomy","spastic","spic","splooge","splooge moose","spooge","spread legs","spunk","strap on","strapon","strappado","strip club","style doggy","suck","sucks","suicide girls","sultry women","swastika","swinger","tainted love","taste my","tea bagging","threesome","throating","thumbzilla","tied up","tight white","tit","tits","titties","titty","tongue in a","topless","tosser","towelhead","tranny","tribadism","tub girl","tubgirl","tushy","twat","twink","twinkie","two girls one cup","undressing","upskirt","urethra play","urophilia","vagina","venus mound","viagra","vibrator","violet wand","vorarephilia","voyeur","voyeurweb","voyuer","vulva","wank","wetback","wet dream","white power","whore","worldsex","wrapping men","wrinkled starfish","xx","xxx","yaoi","yellow showers","yiffy","zoophilia","🖕"],"es":["Asesinato","asno","bastardo","Bollera","Cabrón","Caca","Chupada","Chupapollas","Chupetón","concha","Concha de tu madre","Coño","Coprofagía","Culo","Drogas","Esperma","Fiesta de salchichas","Follador","Follar","Gilipichis","Gilipollas","Hacer una paja","Haciendo el amor","Heroína","Hija de puta","Hijaputa","Hijo de puta","Hijoputa","Idiota","Imbécil","infierno","Jilipollas","Kapullo","Lameculos","Maciza","Macizorra","maldito","Mamada","Marica","Maricón","Mariconazo","martillo","Mierda","Nazi","Orina","Pedo","Pendejo","Pervertido","Pezón","Pinche","Pis","Prostituta","Puta","Racista","Ramera","Sádico","Semen","Sexo","Sexo oral","Soplagaitas","Soplapollas","Tetas grandes","Tía buena","Travesti","Trio","Verga","vete a la mierda","Vulva"],"fa":["آب کیر","ارگاسم","برهنه","پورن","پورنو","تجاوز","تخمی","جق","جقی","جلق","جنده","چوچول","حشر","حشری","داف","دودول","ساک زدن","سکس","سکس کردن","سکسی","سوپر","شق کردن","شهوت","شهوتی","شونبول","فیلم سوپر","کس","کس دادن","کس کردن","کسکش","کوس","کون","کون دادن","کون کردن","کونکش","کونی","کیر","کیری","لاپا","لاپایی","لاشی","لخت","لش","منی","هرزه"],"fi":["alfred nussi","bylsiä","haahka","haista paska","haista vittu","hatullinen","helvetisti","hevonkuusi","hevonpaska","hevonperse","hevonvittu","hevonvitunperse","hitosti","hitto","huorata","hässiä","juosten kustu","jutku","jutsku","jätkä","kananpaska","koiranpaska","kuin esterin perseestä","kulli","kullinluikaus","kuppainen","kusaista","kuseksia","kusettaa","kusi","kusipää","kusta","kyrpiintynyt","kyrpiintyä","kyrpiä","kyrpä","kyrpänaama","kyrvitys","lahtari","lutka","molo","molopää","mulkero","mulkku","mulkvisti","muna","munapää","munaton","mutakuono","mutiainen","naida","nainti","narttu","neekeri","nekru","nuolla persettä","nussia","nussija","nussinta","paljaalla","palli","pallit","paneskella","panettaa","panna","pano","pantava","paska","paskainen","paskamainen","paskanmarjat","paskantaa","paskapuhe","paskapää","paskattaa","paskiainen","paskoa","pehko","pentele","perkele","perkeleesti","persaukinen","perse","perseennuolija","perseet olalla","persereikä","perseääliö","persläpi","perspano","persvako","pilkunnussija","pillu","pillut","pipari","piru","pistää","pyllyvako","reikä","reva","ripsipiirakka","runkata","runkkari","runkkaus","runkku","ryssä","rättipää","saatanasti","suklaaosasto","tavara","toosa","tuhkaluukku","tumputtaa","turpasauna","tussu","tussukka","tussut","vakipano","vetää käteen","viiksi","vittu","vittuilla","vittuilu","vittumainen","vittuuntua","vittuuntunut","vitun","vitusti","vituttaa","vitutus","äpärä"],"fil":["puta ka","putang ina","tang ina","tangina","burat","bayag","bobo","nognog","tanga","ulol","kantot","anak ka ng puta","jakol"],"fr":["baiser","bander","bigornette","bite","bitte","bloblos","bordel","bourré","bourrée","brackmard","branlage","branler","branlette","branleur","branleuse","brouter le cresson","caca","chatte","chiasse","chier","chiottes","clito","clitoris","con","connard","connasse","conne","couilles","cramouille","cul","déconne","déconner","emmerdant","emmerder","emmerdeur","emmerdeuse","enculé","enculée","enculeur","enculeurs","enfoiré","enfoirée","étron","fille de pute","fils de pute","folle","foutre","gerbe","gerber","gouine","grande folle","grogniasse","gueule","jouir","la putain de ta mère","MALPT","ménage à trois","merde","merdeuse","merdeux","meuf","nègre","negro","nique ta mère","nique ta race","palucher","pédale","pédé","péter","pipi","pisser","pouffiasse","pousse-crotte","putain","pute","ramoner","sac à foutre","sac à merde","salaud","salope","suce","tapette","tanche","teuch","tringler","trique","troncher","trou du cul","turlute","zigounette","zizi"],"hi":["aand","aandu","balatkar","balatkari","behen chod","beti chod","bhadva","bhadve","bhandve","bhangi","bhootni ke","bhosad","bhosadi ke","boobe","chakke","chinaal","chinki","chod","chodu","chodu bhagat","chooche","choochi","choope","choot","choot ke baal","chootia","chootiya","chuche","chuchi","chudaap","chudai khanaa","chudam chudai","chude","chut","chut ka chuha","chut ka churan","chut ka mail","chut ke baal","chut ke dhakkan","chut maarli","chutad","chutadd","chutan","chutia","chutiya","gaand","gaandfat","gaandmasti","gaandufad","gandfattu","gandu","gashti","gasti","ghassa","ghasti","gucchi","gucchu","harami","haramzade","hawas","hawas ke pujari","hijda","hijra","jhant","jhant chaatu","jhant ka keeda","jhant ke baal","jhant ke pissu","jhantu","kamine","kaminey","kanjar","kutta","kutta kamina","kutte ki aulad","kutte ki jat","kuttiya","loda","lodu","lund","lund choos","lund ka bakkal","lund khajoor","lundtopi","lundure","maa ki chut","maal","madar chod","madarchod","madhavchod","mooh mein le","mutth","mutthal","najayaz","najayaz aulaad","najayaz paidaish","paki","pataka","patakha","raand","randaap","randi","randi rona","saala","saala kutta","saali kutti","saali randi","suar","suar ke lund","suar ki aulad","tatte","tatti","teri maa ka bhosada","teri maa ka boba chusu","teri maa ki behenchod","teri maa ki chut","tharak","tharki","tu chuda"],"hu":["balfasz","balfaszok","balfaszokat","balfaszt","barmok","barmokat","barmot","barom","baszik","bazmeg","buksza","bukszák","bukszákat","bukszát","búr","búrok","csöcs","csöcsök","csöcsöket","csöcsöt","fasz","faszfej","faszfejek","faszfejeket","faszfejet","faszok","faszokat","faszt","fing","fingok","fingokat","fingot","franc","francok","francokat","francot","geci","gecibb","gecik","geciket","gecit","kibaszott","kibaszottabb","kúr","kurafi","kurafik","kurafikat","kurafit","kurva","kurvák","kurvákat","kurvát","leggecibb","legkibaszottabb","legszarabb","marha","marhák","marhákat","marhát","megdöglik","pele","pelék","picsa","picsákat","picsát","pina","pinák","pinákat","pinát","pofa","pofákat","pofát","pöcs","pöcsök","pöcsöket","pöcsöt","punci","puncik","segg","seggek","seggeket","segget","seggfej","seggfejek","seggfejeket","seggfejet","szajha","szajhák","szajhákat","szajhát","szar","szarabb","szarik","szarok","szarokat","szart"],"it":["allupato","ammucchiata","anale","arrapato","arrusa","arruso","assatanato","bagascia","bagassa","bagnarsi","baldracca","balle","battere","battona","belino","biga","bocchinara","bocchino","bofilo","boiata","bordello","brinca","bucaiolo","budiùlo","busone","cacca","caciocappella","cadavere","cagare","cagata","cagna","casci","cazzata","cazzimma","cazzo","cesso","cazzone","checca","chiappa","chiavare","chiavata","ciospo","ciucciami il cazzo","coglione","coglioni","cornuto","cozza","culattina","culattone","culo","ditalino","fava","femminuccia","fica","figa","figlio di buona donna","figlio di puttana","figone","finocchio","fottere","fottersi","fracicone","fregna","frocio","froscio","goldone","guardone","imbecille","incazzarsi","incoglionirsi","ingoio","leccaculo","lecchino","lofare","loffa","loffare","mannaggia","merda","merdata","merdoso","mignotta","minchia","minchione","mona","monta","montare","mussa","nave scuola","nerchia","padulo","palle","palloso","patacca","patonza","pecorina","pesce","picio","pincare","pippa","pinnolone","pipì","pippone","pirla","pisciare","piscio","pisello","pistolotto","pomiciare","pompa","pompino","porca","porca madonna","porca miseria","porca puttana","porco","porco due","porco zio","potta","puppami","puttana","quaglia","recchione","regina","rincoglionire","rizzarsi","rompiballe","rompipalle","ruffiano","sbattere","sbattersi","sborra","sborrata","sborrone","sbrodolata","scopare","scopata","scorreggiare","sega","slinguare","slinguata","smandrappata","soccia","socmel","sorca","spagnola","spompinare","sticchio","stronza","stronzata","stronzo","succhiami","succhione","sveltina","sverginare","tarzanello","terrone","testa di cazzo","tette","tirare","topa","troia","trombare","vacca","vaffanculo","vangare","zinne","zio cantante","zoccola"],"ja":["3p","g スポット","s ＆ m","sm","sm女王","xx","アジアのかわいい女の子","アスホール","アナリングス","アナル","いたずら","イラマチオ","エクスタシー","エスコート","エッチ","エロティズム","エロティック","オーガズム","オカマ","おしっこ","おしり","オシリ","おしりのあな","おっぱい","オッパイ","オナニー","オマンコ","おもらし","お尻","カーマスートラ","カント","クリトリス","グループ・セックス","グロ","クンニリングス","ゲイ・セックス","ゲイボーイ","ゴールデンシャワー","コカイン","ゴックン","サディズム","しばり","スウィンガー","スカートの中","スカトロ","ストラップオン","ストリップ劇場","スラット","スリット","セクシーな","セクシーな 10 代","セックス","ソドミー","ちんこ","ディープ・スロート","ディック","ディルド","デートレイプ","デブ","テレフォンセックス","ドッグスタイル","トップレス","なめ","ニガー","ヌード","ネオ・ナチ","ハードコア","パイパン","バイブレーター","バック・スタイル","パンティー","ビッチ","ファック","ファンタジー","フィスト","フェティッシュ","フェラチオ","ふたなり","ぶっかけ","フック","プリンス アルバート ピアス","プレイボーイ","ベアバック","ペニス","ペニスバンド","ボーイズラブ","ボールギャグ","ぽっちゃり","ホモ","ポルノ","ポルノグラフィー","ボンテージ","マザー・ファッカー","マスターベーション","まんこ","やおい","やりまん","ラティーナ","ラバー","ランジェリー","レイプ","レズビアン","ローター","ロリータ","淫乱","陰毛","革抑制","騎上位","巨根","巨乳","強姦犯","玉なめ","玉舐め","緊縛","近親相姦","嫌い","後背位","合意の性交","拷問","殺し方","殺人事件","殺人方法","支配","児童性虐待","自己愛性","射精","手コキ","獣姦","女の子","女王様","女子高生","女装","新しいポルノ","人妻","人種","性交","正常位","生殖器","精液","挿入","足フェチ","足を広げる","大陰唇","脱衣","茶色のシャワー","中出し","潮吹き女","潮吹き男性","直腸","剃毛","貞操帯","奴隷","二穴","乳首","尿道プレイ","覗き","売春婦","縛り","噴出","糞","糞尿愛好症","糞便","平手打ち","変態","勃起する","夢精","毛深い","誘惑","幼児性愛者","裸","裸の女性","乱交","両性","両性具有","両刀","輪姦","卍","宦官","肛門","膣"],"ko":["강간","개새끼","개자식","개좆","개차반","거유","계집년","고자","근친","노모","니기미","뒤질래","딸딸이","때씹","또라이","뙤놈","로리타","망가","몰카","미친","미친새끼","바바리맨","변태","병신","보지","불알","빠구리","사까시","섹스","스와핑","쌍놈","씨발","씨발놈","씨팔","씹","씹물","씹빨","씹새끼","씹알","씹창","씹팔","암캐","애자","야동","야사","야애니","엄창","에로","염병","옘병","유모","육갑","은꼴","자위","자지","잡년","종간나","좆","좆만","죽일년","쥐좆","직촬","짱깨","쪽바리","창녀","포르노","하드코어","호로","화냥년","후레아들","후장","희쭈그리"],"nl":["aardappels afgieten","achter het raam zitten","afberen","aflebberen","afrossen","afrukken","aftrekken","afwerkplaats","afzeiken","afzuigen","een halve man en een paardekop","anita","asbak","aso","bagger schijten","balen","bedonderen","befborstel","beffen","bekken","belazeren","besodemieterd zijn","besodemieteren","beurt","boemelen","boerelul","boerenpummel","bokkelul","botergeil","broekhoesten","brugpieper","buffelen","buiten de pot piesen","da's kloten van de bok","de ballen","de hoer spelen","de hond uitlaten","de koffer induiken","del","de pijp uitgaan","dombo","draaikont","driehoog achter wonen","drol","drooggeiler","droogkloot","een beurt geven","een nummertje maken","een wip maken","eikel","engerd","flamoes","flikken","flikker","gadverdamme","galbak","gat","gedoogzone","geilneef","gesodemieter","godverdomme","graftak","gras maaien","gratenkut","greppeldel","griet","hoempert","hoer","hoerenbuurt","hoerenloper","hoerig","hol","hufter","huisdealer","johny","kanen","kettingzeug","klaarkomen","klerebeer","klojo","klooien","klootjesvolk","klootoog","klootzak","kloten","knor","kont","kontneuken","krentekakker","kut","kuttelikkertje","kwakkie","liefdesgrot","lul","lul-de-behanger","lulhannes","lummel","mafketel","matennaaier","matje","mof","muts","naaien","naakt","neuken","neukstier","nicht","oetlul","opgeilen","opkankeren","oprotten","opsodemieteren","op z'n hondjes","op z'n sodemieter geven","opzouten","ouwehoer","ouwehoeren","ouwe rukker","paal","paardelul","palen","penoze","piesen","pijpbekkieg","pijpen","pik","pleurislaaier","poep","poepen","poot","portiekslet","pot","potverdorie","publiciteitsgeil","raaskallen","reet","reetridder","reet trappen, voor zijn","remsporen","reutelen","rothoer","rotzak","rukhond","rukken","schatje","schijt","schijten","schoft","schuinsmarcheerder","shit","slempen","slet","sletterig","slik mijn zaad","snol","spuiten","standje","standje-69","stoephoer","stootje","stront","sufferd","tapijtnek","teef","temeier","teringlijer","toeter","tongzoeng","triootjeg","trottoir prostituée","trottoirteef","vergallen","verkloten","verneuken","viespeuk","vingeren","vleesroos","voor jan lul","voor jan-met-de-korte-achternaam","watje","welzijnsmafia","wijf","wippen","wuftje","zaadje","zakkenwasser","zeiken","zeiker","zuigen","zuiplap"],"no":["asshole","dritt","drittsekk","faen","faen i helvete","fan","fanken","fitte","forbanna","forbannet","forjævlig","fuck","fy faen","føkk","føkka","føkkings","jævla","jævlig","helvete","helvetet","kuk","kukene","kuker","morraknuller","morrapuler","nigger","pakkis","pikk","pokker","ræva","ræven","satan","shit","sinnsykt","skitt","sotrør","ståpikk","ståpikkene","ståpikker","svartheiteste"],"pl":["burdel","burdelmama","chuj","chujnia","ciota","cipa","cyc","debil","dmuchać","do kurwy nędzy","dupa","dupek","duperele","dziwka","fiut","gówno","gówno prawda","huj","huj ci w dupę","jajco","jajko","ja pierdolę","jebać","jebany","kurwa","kurwy","kutafon","kutas","lizać pałę","obciągać chuja","obciągać fiuta","obciągać loda","pieprzyć","pierdolec","pierdolić","pierdolnąć","pierdolnięty","pierdoła","pierdzieć","pizda","pojeb","pojebany","popierdolony","robic loda","robić loda","ruchać","rzygać","skurwysyn","sraczka","srać","suka","syf","wkurwiać","zajebisty"],"pt":["aborto","amador","ânus","aranha","ariano","balalao","bastardo","bicha","biscate","bissexual","boceta","boob","bosta","braulio de borracha","bumbum","burro","cabrao","cacete","cagar","camisinha","caralho","cerveja","chochota","chupar","clitoris","cocaína","coito","colhoes","comer","cona","consolo","corno","cu","dar o rabo","dum raio","esporra","fecal","filho da puta","foda","foda-se","foder","frango assado","gozar","grelho","heroína","heterosexual","homem gay","homoerótico","homosexual","inferno","lésbica","lolita","mama","merda","paneleiro","passar um cheque","pau","peidar","pênis","pinto","porra","puta","puta que pariu","puta que te pariu","queca","sacanagem","saco","torneira","transar","vadia","vai-te foder","vai tomar no cu","veado","vibrador","xana","xochota"],"ru":["bychara","byk","chernozhopyi","dolboy'eb","ebalnik","ebalo","ebalom sch'elkat","gol","mudack","opizdenet","osto'eblo","ostokhuitel'no","ot'ebis","otmudohat","otpizdit","otsosi","padlo","pedik","perdet","petuh","pidar gnoinyj","pizda","pizdato","pizdatyi","piz'det","pizdetc","pizdoi nakryt'sja","pizd'uk","piz`dyulina","podi ku'evo","poeben","po'imat' na konchik","po'iti posrat","po khuy","poluchit pizdy","pososi moyu konfetku","prissat","proebat","promudobl'adsksya pizdopro'ebina","propezdoloch","prosrat","raspeezdeyi","raspizdatyi","raz'yebuy","raz'yoba","s'ebat'sya","shalava","styervo","sukin syn","svodit posrat","svoloch","trakhat'sya","trimandoblydskiy pizdoproyob","ubl'yudok","uboy","u'ebitsche","vafl'a","vafli lovit","v pizdu","vyperdysh","vzdrochennyi","yeb vas","za'ebat","zaebis","zalupa","zalupat","zasranetc","zassat","zlo'ebuchy","бздёнок","блядки","блядовать","блядство","блядь","бугор","во пизду","встать раком","выёбываться","гандон","говно","говнюк","голый","дать пизды","дерьмо","дрочить","другой дразнится","ёбарь","ебать","ебать-копать","ебло","ебнуть","ёб твою мать","жопа","жополиз","играть на кожаной флейте","измудохать","каждый дрочит как он хочет","какая разница","как два пальца обоссать","курите мою трубку","лысого в кулаке гонять","малофья","манда","мандавошка","мент","муда","мудило","мудозвон","наебать","наебениться","наебнуться","на фиг","на хуй","на хую вертеть","на хуя","нахуячиться","невебенный","не ебет","ни за хуй собачу","ни хуя","обнаженный","обоссаться можно","один ебётся","опесдол","офигеть","охуеть","охуительно","половое сношение","секс","сиськи","спиздить","срать","ссать","траxать","ты мне ваньку не валяй","фига","хапать","хер с ней","хер с ним","хохол","хрен","хуёво","хуёвый","хуем груши околачивать","хуеплет","хуило","хуиней страдать","хуиня","хуй","хуйнуть","хуй пинать"],"sv":["arsle","brutta","discofitta","dra åt helvete","fan","fitta","fittig","för helvete","helvete","hård","jävlar","knulla","kuk","kuksås","kötthuvud","köttnacke","moona","moonade","moonar","moonat","mutta","nigger","neger","olla","pippa","pitt","prutt","pök","runka","röv","rövhål","rövknulla","satan","skita","skit ner dig","skäggbiff","snedfitta","snefitta","stake","subba","sås","sätta på","tusan"],"th":["กระดอ","กระเด้า","กระหรี่","กะปิ","กู","ขี้","ควย","จิ๋ม","จู๋","เจ๊ก","เจี๊ยว","ดอกทอง","ตอแหล","ตูด","น้ําแตก","มึง","แม่ง","เย็ด","รูตูด","ล้างตู้เย็น","ส้นตีน","สัด","เสือก","หญิงชาติชั่ว","หลั่ง","ห่า","หํา","หี","เหี้ย","อมนกเขา","ไอ้ควาย"],"tr":["am","amcığa","amcığı","amcığın","amcık","amcıklar","amcıklara","amcıklarda","amcıklardan","amcıkları","amcıkların","amcıkta","amcıktan","amı","amlar","çingene","Çingenede","Çingeneden","Çingeneler","Çingenelerde","Çingenelerden","Çingenelere","Çingeneleri","Çingenelerin","Çingenenin","Çingeneye","Çingeneyi","göt","göte","götler","götlerde","götlerden","götlere","götleri","götlerin","götte","götten","götü","götün","götveren","götverende","götverenden","götverene","götvereni","götverenin","götverenler","götverenlerde","götverenlerden","götverenlere","götverenleri","götverenlerin","kaltağa","kaltağı","kaltağın","kaltak","kaltaklar","kaltaklara","kaltaklarda","kaltaklardan","kaltakları","kaltakların","kaltakta","kaltaktan","orospu","orospuda","orospudan","orospular","orospulara","orospularda","orospulardan","orospuları","orospuların","orospunun","orospuya","orospuyu","otuz birci","otuz bircide","otuz birciden","otuz birciler","otuz bircilerde","otuz bircilerden","otuz bircilere","otuz bircileri","otuz bircilerin","otuz bircinin","otuz birciye","otuz birciyi","saksocu","saksocuda","saksocudan","saksocular","saksoculara","saksocularda","saksoculardan","saksocuları","saksocuların","saksocunun","saksocuya","saksocuyu","sıçmak","sik","sike","siker sikmez","siki","sikilir sikilmez","sikin","sikler","siklerde","siklerden","siklere","sikleri","siklerin","sikmek","sikmemek","sikte","sikten","siktir","siktirir siktirmez","taşağa","taşağı","taşağın","taşak","taşaklar","taşaklara","taşaklarda","taşaklardan","taşakları","taşakların","taşakta","taşaktan","yarağa","yarağı","yarağın","yarak","yaraklar","yaraklara","yaraklarda","yaraklardan","yarakları","yarakların","yarakta","yaraktan"],"zh":["13.","13点","三级片","下三烂","下贱","个老子的","九游","乳","乳交","乳头","乳房","乳波臀浪","交配","仆街","他奶奶","他奶奶的","他奶娘的","他妈","他妈ㄉ王八蛋","他妈地","他妈的","他娘","他马的","你个傻比","你他马的","你全家","你奶奶的","你她马的","你妈","你妈的","你娘","你娘卡好","你娘咧","你它妈的","你它马的","你是鸡","你是鸭","你马的","做爱","傻比","傻逼","册那","军妓","几八","几叭","几巴","几芭","刚度","刚瘪三","包皮","十三点","卖B","卖比","卖淫","卵","卵子","双峰微颤","口交","口肯","叫床","吃屎","后庭","吹箫","塞你公","塞你娘","塞你母","塞你爸","塞你老师","塞你老母","处女","外阴","大卵子","大卵泡","大鸡巴","奶","奶奶的熊","奶子","奸","奸你","她妈地","她妈的","她马的","妈B","妈个B","妈个比","妈个老比","妈妈的","妈比","妈的","妈的B","妈逼","妓","妓女","妓院","妳她妈的","妳妈的","妳娘的","妳老母的","妳马的","姘头","姣西","姦","娘个比","娘的","婊子","婊子养的","嫖娼","嫖客","它妈地","它妈的","密洞","射你","射精","小乳头","小卵子","小卵泡","小瘪三","小肉粒","小骚比","小骚货","小鸡巴","小鸡鸡","屁眼","屁股","屄","屌","巨乳","干x娘","干七八","干你","干你妈","干你娘","干你老母","干你良","干妳妈","干妳娘","干妳老母","干妳马","干您娘","干机掰","干死CS","干死GM","干死你","干死客服","幹","强奸","强奸你","性","性交","性器","性无能","性爱","情色","想上你","懆您妈","懆您娘","懒8","懒八","懒叫","懒教","成人","我操你祖宗十八代","扒光","打炮","打飞机","抽插","招妓","插你","插死你","撒尿","操你","操你全家","操你奶奶","操你妈","操你娘","操你祖宗","操你老妈","操你老母","操妳","操妳全家","操妳妈","操妳娘","操妳祖宗","操机掰","操比","操逼","放荡","日他娘","日你","日你妈","日你老娘","日你老母","日批","月经","机八","机巴","机机歪歪","杂种","浪叫","淫","淫乱","淫妇","淫棍","淫水","淫秽","淫荡","淫西","湿透的内裤","激情","灨你娘","烂货","烂逼","爛","狗屁","狗日","狗狼养的","玉杵","王八蛋","瓜娃子","瓜婆娘","瓜批","瘪三","白烂","白痴","白癡","祖宗","私服","笨蛋","精子","老二","老味","老母","老瘪三","老骚比","老骚货","肉壁","肉棍子","肉棒","肉缝","肏","肛交","肥西","色情","花柳","荡妇","賤","贝肉","贱B","贱人","贱货","贼你妈","赛你老母","赛妳阿母","赣您娘","轮奸","迷药","逼","逼样","野鸡","阳具","阳萎","阴唇","阴户","阴核","阴毛","阴茎","阴道","阴部","雞巴","靠北","靠母","靠爸","靠背","靠腰","驶你公","驶你娘","驶你母","驶你爸","驶你老师","驶你老母","骚比","骚货","骚逼","鬼公","鸡8","鸡八","鸡叭","鸡吧","鸡奸","鸡巴","鸡芭","鸡鸡","龟儿子","龟头","𨳒","陰莖","㞗","尻","𨳊","鳩","𡳞","𨶙","撚","𨳍","柒","閪","咸家鏟","冚家鏟","咸家伶","冚家拎","笨實","粉腸","屎忽","躝癱","你老闆","你老味","你老母","硬膠"]};
});


/* ===== src/lib/lang/curated.js ===== */

/**
 * 日本語以外の言語の手作り辞書（義憤＋話題語）。作者作成（MIT）。
 *
 * 形式: [ 表層形, 重み, カテゴリ, 'noNeg'? ]
 * カテゴリ: attack / hostility / incitement / absolute / othering / cynicism /
 *           urgency / politics / conspiracy / ai_dispute / world_affairs
 *
 * 罵倒語（profanity/badwords）はここには書かず、LDNOOBW（別ファイル）を使う。
 * 日本語は lexicon.curated.js 側にあり、こちらには含めない。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).curatedLex = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return {
    // ================================================================ German
    de: [
      ['idiot', 1.8, 'attack'], ['trottel', 2.0, 'attack'], ['dummkopf', 2.0, 'attack'],
      ['depp', 2.0, 'attack'], ['versager', 1.8, 'attack'], ['hirnlos', 2.0, 'attack'],
      ['dumm', 1.4, 'attack'], ['blöd', 1.4, 'attack'], ['idiotisch', 1.8, 'attack'],
      ['drecksack', 2.4, 'attack'], ['mistkerl', 2.2, 'attack'], ['hurensohn', 2.8, 'attack'],
      ['hass', 1.8, 'hostility'], ['hasse', 2.0, 'hostility'], ['ekelhaft', 2.0, 'hostility'],
      ['widerlich', 2.0, 'hostility'], ['abscheulich', 2.2, 'hostility'], ['unerträglich', 1.8, 'hostility'],
      ['empörend', 1.8, 'hostility'], ['skandalös', 1.8, 'hostility'], ['unverschämt', 1.6, 'hostility'],
      ['halt die fresse', 2.4, 'incitement'], ['halt die klappe', 2.2, 'incitement'],
      ['verpiss dich', 2.4, 'incitement'], ['hau ab', 2.2, 'incitement'], ['verschwinde', 2.2, 'incitement'],
      ['boykott', 1.6, 'incitement'], ['fertig machen', 2.0, 'incitement'],
      ['absolut', 0.9, 'absolute'], ['auf jeden fall', 0.7, 'absolute'], ['niemals', 0.6, 'absolute'],
      ['offensichtlich', 0.5, 'absolute'],
      ['verräter', 2.4, 'othering'], ['volksverräter', 2.6, 'othering'], ['lügenpresse', 2.4, 'othering'],
      ['gutmensch', 1.8, 'othering'], ['kanake', 2.8, 'othering'], ['nazi', 2.2, 'othering'],
      ['wahl', 2.2, 'politics'], ['wählen', 2.0, 'politics'], ['regierung', 2.2, 'politics'],
      ['kanzler', 2.2, 'politics'], ['parlament', 2.2, 'politics'], ['politik', 2.2, 'politics'],
      ['partei', 2.2, 'politics'], ['steuern', 2.0, 'politics'], ['migration', 2.0, 'politics'],
      ['verschwörung', 2.4, 'conspiracy'], ['verschwörungstheorie', 2.6, 'conspiracy'],
      ['neue weltordnung', 2.6, 'conspiracy'], ['chemtrails', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'],
      ['künstliche intelligenz', 2.2, 'ai_dispute'], ['generative ki', 2.2, 'ai_dispute'],
      ['chatgpt', 2.2, 'ai_dispute'], ['deepfake', 2.2, 'ai_dispute'], ['singularität', 2.4, 'ai_dispute'],
      ['krieg', 2.2, 'world_affairs'], ['invasion', 2.4, 'world_affairs'], ['luftangriff', 2.6, 'world_affairs'],
      ['rakete', 2.2, 'world_affairs'], ['atomkrieg', 2.8, 'world_affairs'], ['völkermord', 2.6, 'world_affairs'],
      ['terroranschlag', 2.6, 'world_affairs'], ['amoklauf', 2.4, 'world_affairs'], ['mord', 2.4, 'world_affairs'],
      ['erdbeben', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemie', 2.2, 'world_affairs'],
      ['putsch', 2.6, 'world_affairs'], ['flüchtlinge', 2.0, 'world_affairs']
    ],

    // ================================================================ French
    fr: [
      ['idiot', 1.8, 'attack'], ['imbécile', 2.0, 'attack'], ['crétin', 2.2, 'attack'],
      ['abruti', 2.2, 'attack'], ['débile', 2.0, 'attack'], ['nul', 1.4, 'attack'],
      ['stupide', 1.6, 'attack'], ['con', 2.0, 'attack'], ['connard', 2.6, 'attack'],
      ['enculé', 2.8, 'attack'], ['salopard', 2.4, 'attack'], ['ordure', 2.4, 'attack'],
      ['haine', 1.8, 'hostility'], ['déteste', 2.0, 'hostility'], ['dégoûtant', 2.0, 'hostility'],
      ['répugnant', 2.0, 'hostility'], ['immondice', 2.0, 'hostility'], ['insupportable', 1.8, 'hostility'],
      ['scandaleux', 1.8, 'hostility'], ['inacceptable', 1.6, 'hostility', 'noNeg'], ['impardonnable', 2.2, 'hostility', 'noNeg'],
      ['tais-toi', 2.4, 'incitement'], ['ferme la', 2.4, 'incitement'], ['casse-toi', 2.4, 'incitement'],
      ['dégage', 2.4, 'incitement'], ['boycott', 1.6, 'incitement'], ['lynchez', 2.6, 'incitement'],
      ['absolument', 0.9, 'absolute'], ['évidemment', 0.5, 'absolute'], ['jamais', 0.6, 'absolute'],
      ['toujours', 0.4, 'absolute'],
      ['traître', 2.4, 'othering'], ['collabo', 2.2, 'othering'], ['bobos', 1.4, 'othering'],
      ['fachos', 2.0, 'othering'], ['lfiens', 1.8, 'othering'],
      ['élection', 2.2, 'politics'], ['vote', 2.0, 'politics'], ['gouvernement', 2.2, 'politics'],
      ['président', 2.2, 'politics'], ['parlement', 2.2, 'politics'], ['politique', 2.2, 'politics'],
      ['impôts', 2.0, 'politics'], ['immigration', 2.0, 'politics'],
      ['complot', 2.4, 'conspiracy'], ['théorie du complot', 2.6, 'conspiracy'],
      ['nouvel ordre mondial', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['fausses nouvelles', 2.0, 'conspiracy'],
      ['intelligence artificielle', 2.2, 'ai_dispute'], ['ia générative', 2.2, 'ai_dispute'],
      ['chatgpt', 2.2, 'ai_dispute'], ['deepfake', 2.2, 'ai_dispute'], ['singularité', 2.4, 'ai_dispute'],
      ['guerre', 2.2, 'world_affairs'], ['invasion', 2.4, 'world_affairs'], ['bombardement', 2.6, 'world_affairs'],
      ['missile', 2.2, 'world_affairs'], ['guerre nucléaire', 2.8, 'world_affairs'], ['génocide', 2.6, 'world_affairs'],
      ['attentat', 2.6, 'world_affairs'], ['meurtre', 2.4, 'world_affairs'], ['tuerie', 2.6, 'world_affairs'],
      ['séisme', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandémie', 2.2, 'world_affairs'],
      ['coup d’état', 2.6, 'world_affairs'], ['réfugiés', 2.0, 'world_affairs']
    ],

    // ================================================================ Spanish
    es: [
      ['idiota', 1.8, 'attack'], ['imbécil', 2.0, 'attack'], ['estúpido', 1.6, 'attack'],
      ['tonto', 1.6, 'attack'], ['inútil', 1.6, 'attack'], ['basura', 2.0, 'attack'],
      ['escoria', 2.6, 'attack'], ['cabrón', 2.6, 'attack'], ['gilipollas', 2.6, 'attack'],
      ['pendejo', 2.6, 'attack'], ['mierda', 2.4, 'attack'], ['malparido', 2.8, 'attack'],
      ['odio', 1.8, 'hostility'], ['odiar', 1.8, 'hostility'], ['asco', 2.0, 'hostility'],
      ['asqueroso', 2.0, 'hostility'], ['repugnante', 2.0, 'hostility'], ['indignante', 1.8, 'hostility'],
      ['inaceptable', 1.6, 'hostility', 'noNeg'], ['imperdonable', 2.2, 'hostility', 'noNeg'],
      ['cállate', 2.4, 'incitement'], ['vete a la mierda', 2.6, 'incitement'], ['lárgate', 2.4, 'incitement'],
      ['boicot', 1.6, 'incitement'], ['linchad', 2.6, 'incitement'],
      ['absolutamente', 0.9, 'absolute'], ['obviamente', 0.5, 'absolute'], ['nunca', 0.6, 'absolute'],
      ['siempre', 0.4, 'absolute'],
      ['traidor', 2.4, 'othering'], ['vendepatria', 2.6, 'othering'], ['facha', 2.2, 'othering'],
      ['progre', 1.8, 'othering'], ['chavista', 2.0, 'othering'],
      ['elecciones', 2.2, 'politics'], ['voto', 2.0, 'politics'], ['gobierno', 2.2, 'politics'],
      ['presidente', 2.2, 'politics'], ['parlamento', 2.2, 'politics'], ['política', 2.2, 'politics'],
      ['impuestos', 2.0, 'politics'], ['inmigración', 2.0, 'politics'],
      ['conspiración', 2.4, 'conspiracy'], ['teoría conspirativa', 2.6, 'conspiracy'],
      ['nuevo orden mundial', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['noticias falsas', 2.0, 'conspiracy'],
      ['inteligencia artificial', 2.2, 'ai_dispute'], ['ia generativa', 2.2, 'ai_dispute'],
      ['chatgpt', 2.2, 'ai_dispute'], ['deepfake', 2.2, 'ai_dispute'], ['singularidad', 2.4, 'ai_dispute'],
      ['guerra', 2.2, 'world_affairs'], ['invasión', 2.4, 'world_affairs'], ['bombardeo', 2.6, 'world_affairs'],
      ['misil', 2.2, 'world_affairs'], ['guerra nuclear', 2.8, 'world_affairs'], ['genocidio', 2.6, 'world_affairs'],
      ['atentado', 2.6, 'world_affairs'], ['asesinato', 2.4, 'world_affairs'], ['masacre', 2.6, 'world_affairs'],
      ['terremoto', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemia', 2.2, 'world_affairs'],
      ['golpe de estado', 2.6, 'world_affairs'], ['refugiados', 2.0, 'world_affairs']
    ],

    // ================================================================ Italian
    it: [
      ['idiota', 1.8, 'attack'], ['imbecille', 2.0, 'attack'], ['stupido', 1.6, 'attack'],
      ['cretino', 2.2, 'attack'], ['scemo', 1.8, 'attack'], ['inutile', 1.6, 'attack'],
      ['schifo', 2.0, 'attack'], ['stronzo', 2.6, 'attack'], ['coglione', 2.6, 'attack'],
      ['bastardo', 2.4, 'attack'], ['merda', 2.6, 'attack'], ['idiota', 1.8, 'attack'],
      ['odio', 1.8, 'hostility'], ['odioso', 2.0, 'hostility'], ['disgustoso', 2.0, 'hostility'],
      ['ributtante', 2.0, 'hostility'], ['indignante', 1.8, 'hostility'], ['inaccettabile', 1.6, 'hostility', 'noNeg'],
      ['imperdonabile', 2.2, 'hostility', 'noNeg'], ['vergognoso', 1.8, 'hostility'],
      ['stai zitto', 2.4, 'incitement'], ['vattene', 2.4, 'incitement'], ['vaffanculo', 2.8, 'incitement'],
      ['boicotta', 1.6, 'incitement'], ['linciate', 2.6, 'incitement'],
      ['assolutamente', 0.9, 'absolute'], ['ovviamente', 0.5, 'absolute'], ['mai', 0.6, 'absolute'],
      ['sempre', 0.4, 'absolute'],
      ['traditore', 2.4, 'othering'], ['venduto', 2.2, 'othering'], ['fascista', 2.2, 'othering'],
      ['comunista', 2.0, 'othering'], ['terrone', 2.6, 'othering'],
      ['elezioni', 2.2, 'politics'], ['voto', 2.0, 'politics'], ['governo', 2.2, 'politics'],
      ['presidente', 2.2, 'politics'], ['parlamento', 2.2, 'politics'], ['politica', 2.2, 'politics'],
      ['tasse', 2.0, 'politics'], ['immigrazione', 2.0, 'politics'],
      ['complottismo', 2.4, 'conspiracy'], ['teoria del complotto', 2.6, 'conspiracy'],
      ['nuovo ordine mondiale', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['fake news', 2.0, 'conspiracy'],
      ['intelligenza artificiale', 2.2, 'ai_dispute'], ['ia generativa', 2.2, 'ai_dispute'],
      ['chatgpt', 2.2, 'ai_dispute'], ['deepfake', 2.2, 'ai_dispute'], ['singolarità', 2.4, 'ai_dispute'],
      ['guerra', 2.2, 'world_affairs'], ['invasione', 2.4, 'world_affairs'], ['bombardamento', 2.6, 'world_affairs'],
      ['missile', 2.2, 'world_affairs'], ['guerra nucleare', 2.8, 'world_affairs'], ['genocidio', 2.6, 'world_affairs'],
      ['attentato', 2.6, 'world_affairs'], ['omicidio', 2.4, 'world_affairs'], ['strage', 2.6, 'world_affairs'],
      ['terremoto', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemia', 2.2, 'world_affairs'],
      ['colpo di stato', 2.6, 'world_affairs'], ['profughi', 2.0, 'world_affairs']
    ],

    // ================================================================ Portuguese
    pt: [
      ['idiota', 1.8, 'attack'], ['imbecil', 2.0, 'attack'], ['estúpido', 1.6, 'attack'],
      ['otário', 2.0, 'attack'], ['inútil', 1.6, 'attack'], ['lixo', 2.0, 'attack'],
      ['escória', 2.6, 'attack'], ['babaca', 2.2, 'attack'], ['viado', 2.6, 'attack'],
      ['filho da puta', 2.8, 'attack'], ['merda', 2.6, 'attack'], ['bosta', 2.4, 'attack'],
      ['ódio', 1.8, 'hostility'], ['odeio', 2.0, 'hostility'], ['nojento', 2.0, 'hostility'],
      ['repugnante', 2.0, 'hostility'], ['indignante', 1.8, 'hostility'], ['inaceitável', 1.6, 'hostility', 'noNeg'],
      ['imperdoável', 2.2, 'hostility', 'noNeg'], ['vergonhoso', 1.8, 'hostility'],
      ['cala a boca', 2.4, 'incitement'], ['vai à merda', 2.6, 'incitement'], ['some daqui', 2.4, 'incitement'],
      ['boicote', 1.6, 'incitement'], ['linchamento', 2.4, 'incitement'],
      ['absolutamente', 0.9, 'absolute'], ['obviamente', 0.5, 'absolute'], ['nunca', 0.6, 'absolute'],
      ['sempre', 0.4, 'absolute'],
      ['traidor', 2.4, 'othering'], ['vendido', 2.2, 'othering'], ['petista', 1.8, 'othering'],
      ['bolsonarista', 1.8, 'othering'], ['comunista', 2.0, 'othering'],
      ['eleição', 2.2, 'politics'], ['voto', 2.0, 'politics'], ['governo', 2.2, 'politics'],
      ['presidente', 2.2, 'politics'], ['parlamento', 2.2, 'politics'], ['política', 2.2, 'politics'],
      ['impostos', 2.0, 'politics'], ['imigração', 2.0, 'politics'],
      ['conspiração', 2.4, 'conspiracy'], ['teoria da conspiração', 2.6, 'conspiracy'],
      ['nova ordem mundial', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['notícias falsas', 2.0, 'conspiracy'],
      ['inteligência artificial', 2.2, 'ai_dispute'], ['ia generativa', 2.2, 'ai_dispute'],
      ['chatgpt', 2.2, 'ai_dispute'], ['deepfake', 2.2, 'ai_dispute'], ['singularidade', 2.4, 'ai_dispute'],
      ['guerra', 2.2, 'world_affairs'], ['invasão', 2.4, 'world_affairs'], ['bombardeio', 2.6, 'world_affairs'],
      ['míssil', 2.2, 'world_affairs'], ['guerra nuclear', 2.8, 'world_affairs'], ['genocídio', 2.6, 'world_affairs'],
      ['atentado', 2.6, 'world_affairs'], ['assassinato', 2.4, 'world_affairs'], ['massacre', 2.6, 'world_affairs'],
      ['terremoto', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemia', 2.2, 'world_affairs'],
      ['golpe de estado', 2.6, 'world_affairs'], ['refugiados', 2.0, 'world_affairs']
    ],

    // ================================================================ Dutch
    nl: [
      ['idioot', 1.8, 'attack'], ['imbeciel', 2.0, 'attack'], ['dom', 1.4, 'attack'],
      ['sukkel', 1.8, 'attack'], ['waardeloos', 1.8, 'attack'], ['afval', 2.0, 'attack'],
      ['kut', 2.6, 'attack'], ['klootzak', 2.6, 'attack'], ['eikel', 2.4, 'attack'],
      ['tyfus', 2.4, 'attack'], ['kanker', 2.8, 'attack'], ['hufter', 2.4, 'attack'],
      ['haat', 1.8, 'hostility'], ['haat je', 2.0, 'hostility'], ['walgelijk', 2.0, 'hostility'],
      ['weerzinwekkend', 2.0, 'hostility'], ['schandalig', 1.8, 'hostility'], ['onacceptabel', 1.6, 'hostility', 'noNeg'],
      ['onvergeeflijk', 2.2, 'hostility', 'noNeg'], ['beschamend', 1.8, 'hostility'],
      ['hou je bek', 2.4, 'incitement'], ['donder op', 2.4, 'incitement'], ['oprotten', 2.2, 'incitement'],
      ['boycot', 1.6, 'incitement'], ['lynchen', 2.6, 'incitement'],
      ['absoluut', 0.9, 'absolute'], ['uiteraard', 0.5, 'absolute'], ['nooit', 0.6, 'absolute'],
      ['altijd', 0.4, 'absolute'],
      ['verrader', 2.4, 'othering'], ['landverrader', 2.6, 'othering'], ['linkse', 1.8, 'othering'],
      ['rechtse', 1.8, 'othering'], ['nazi', 2.2, 'othering'],
      ['verkiezing', 2.2, 'politics'], ['stem', 2.0, 'politics'], ['regering', 2.2, 'politics'],
      ['president', 2.2, 'politics'], ['parlement', 2.2, 'politics'], ['politiek', 2.2, 'politics'],
      ['belastingen', 2.0, 'politics'], ['immigratie', 2.0, 'politics'],
      ['complot', 2.4, 'conspiracy'], ['complottheorie', 2.6, 'conspiracy'],
      ['nieuwe wereldorde', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['nepnieuws', 2.0, 'conspiracy'],
      ['kunstmatige intelligentie', 2.2, 'ai_dispute'], ['generatieve ai', 2.2, 'ai_dispute'],
      ['chatgpt', 2.2, 'ai_dispute'], ['deepfake', 2.2, 'ai_dispute'], ['singulariteit', 2.4, 'ai_dispute'],
      ['oorlog', 2.2, 'world_affairs'], ['invasie', 2.4, 'world_affairs'], ['bombardement', 2.6, 'world_affairs'],
      ['raket', 2.2, 'world_affairs'], ['kernoorlog', 2.8, 'world_affairs'], ['genocide', 2.6, 'world_affairs'],
      ['aanslag', 2.6, 'world_affairs'], ['moord', 2.4, 'world_affairs'], ['bloedbad', 2.6, 'world_affairs'],
      ['aardbeving', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemie', 2.2, 'world_affairs'],
      ['staatsgreep', 2.6, 'world_affairs'], ['vluchtelingen', 2.0, 'world_affairs']
    ],

    // ================================================================ Polish
    pl: [
      ['idiota', 1.8, 'attack'], ['głupi', 1.6, 'attack'], ['tępak', 2.0, 'attack'],
      ['kretyn', 2.4, 'attack'], ['debil', 2.4, 'attack'], ['bezużyteczny', 1.8, 'attack'],
      ['śmieć', 2.0, 'attack'], ['skurwysyn', 2.8, 'attack'], ['chuj', 2.6, 'attack'],
      ['kurwa', 2.6, 'attack'], ['gówniarz', 2.2, 'attack'], ['ciota', 2.4, 'attack'],
      ['nienawiść', 2.0, 'hostility'], ['nienawidzę', 2.0, 'hostility'], ['obrzydliwe', 2.0, 'hostility'],
      ['wstrętny', 2.0, 'hostility'], ['skandaliczny', 1.8, 'hostility'], ['niedopuszczalne', 1.6, 'hostility', 'noNeg'],
      ['niewybaczalne', 2.2, 'hostility', 'noNeg'], ['żenujące', 1.8, 'hostility'],
      ['zamknij się', 2.4, 'incitement'], ['wypierdalaj', 2.8, 'incitement'], ['wynocha', 2.4, 'incitement'],
      ['bojkot', 1.6, 'incitement'], ['lincz', 2.6, 'incitement'],
      ['absolutnie', 0.9, 'absolute'], ['oczywiście', 0.5, 'absolute'], ['nigdy', 0.6, 'absolute'],
      ['zawsze', 0.4, 'absolute'],
      ['zdrajca', 2.4, 'othering'], ['sprzedawczyk', 2.4, 'othering'], ['lewak', 2.0, 'othering'],
      ['faszysta', 2.2, 'othering'], ['pisowiec', 1.8, 'othering'],
      ['wybory', 2.2, 'politics'], ['głosowanie', 2.0, 'politics'], ['rząd', 2.2, 'politics'],
      ['prezydent', 2.2, 'politics'], ['parlament', 2.2, 'politics'], ['polityka', 2.2, 'politics'],
      ['podatki', 2.0, 'politics'], ['imigracja', 2.0, 'politics'],
      ['spisek', 2.4, 'conspiracy'], ['teoria spiskowa', 2.6, 'conspiracy'],
      ['nowy porządek świata', 2.6, 'conspiracy'], ['iluminaci', 2.6, 'conspiracy'], ['fake news', 2.0, 'conspiracy'],
      ['sztuczna inteligencja', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['osobliwość', 2.4, 'ai_dispute'],
      ['wojna', 2.2, 'world_affairs'], ['inwazja', 2.4, 'world_affairs'], ['bombardowanie', 2.6, 'world_affairs'],
      ['rakieta', 2.2, 'world_affairs'], ['wojna nuklearna', 2.8, 'world_affairs'], ['ludobójstwo', 2.6, 'world_affairs'],
      ['zamach', 2.6, 'world_affairs'], ['morderstwo', 2.4, 'world_affairs'], ['masakra', 2.6, 'world_affairs'],
      ['trzęsienie ziemi', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemia', 2.2, 'world_affairs'],
      ['zamach stanu', 2.6, 'world_affairs'], ['uchodźcy', 2.0, 'world_affairs']
    ],

    // ================================================================ Czech
    cs: [
      ['idiot', 1.8, 'attack'], ['hlupák', 1.8, 'attack'], ['blbec', 2.0, 'attack'],
      ['kretén', 2.4, 'attack'], ['debil', 2.4, 'attack'], ['nepoužitelný', 1.8, 'attack'],
      ['sráč', 2.6, 'attack'], ['kurva', 2.6, 'attack'], ['vůl', 2.0, 'attack'],
      ['svině', 2.6, 'attack'], ['prasák', 2.2, 'attack'], ['zmrd', 2.6, 'attack'],
      ['nenávist', 2.0, 'hostility'], ['nenávidím', 2.0, 'hostility'], ['odporné', 2.0, 'hostility'],
      ['nechutný', 2.0, 'hostility'], ['skandální', 1.8, 'hostility'], ['nepřijatelné', 1.6, 'hostility', 'noNeg'],
      ['neodpustitelné', 2.2, 'hostility', 'noNeg'], ['trapné', 1.6, 'hostility'],
      ['sklapni', 2.4, 'incitement'], ['vypadni', 2.4, 'incitement'], ['do prdele', 2.6, 'incitement'],
      ['bojkot', 1.6, 'incitement'], ['lynč', 2.6, 'incitement'],
      ['absolutně', 0.9, 'absolute'], ['samozřejmě', 0.5, 'absolute'], ['nikdy', 0.6, 'absolute'],
      ['vždy', 0.4, 'absolute'],
      ['zrádce', 2.4, 'othering'], ['vlastizrádce', 2.6, 'othering'], ['kavárenský', 1.4, 'othering'],
      ['fašista', 2.2, 'othering'], ['komouš', 2.2, 'othering'],
      ['volby', 2.2, 'politics'], ['hlasování', 2.0, 'politics'], ['vláda', 2.2, 'politics'],
      ['prezident', 2.2, 'politics'], ['parlament', 2.2, 'politics'], ['politika', 2.2, 'politics'],
      ['daně', 2.0, 'politics'], ['imigrace', 2.0, 'politics'],
      ['spiknutí', 2.4, 'conspiracy'], ['konspirace', 2.6, 'conspiracy'],
      ['nový světový řád', 2.6, 'conspiracy'], ['ilumináti', 2.6, 'conspiracy'], ['fake news', 2.0, 'conspiracy'],
      ['umělá inteligence', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['singularita', 2.4, 'ai_dispute'],
      ['válka', 2.2, 'world_affairs'], ['invaze', 2.4, 'world_affairs'], ['bombardování', 2.6, 'world_affairs'],
      ['raketa', 2.2, 'world_affairs'], ['jaderná válka', 2.8, 'world_affairs'], ['genocida', 2.6, 'world_affairs'],
      ['terorismus', 2.4, 'world_affairs'], ['vražda', 2.4, 'world_affairs'], ['masakr', 2.6, 'world_affairs'],
      ['zemětřesení', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemie', 2.2, 'world_affairs'],
      ['převrat', 2.6, 'world_affairs'], ['uprchlíci', 2.0, 'world_affairs']
    ],

    // ================================================================ Hungarian
    hu: [
      ['idióta', 1.8, 'attack'], ['hülye', 1.8, 'attack'], ['buta', 1.6, 'attack'],
      ['barom', 2.0, 'attack'], ['hülyegyerek', 2.0, 'attack'], ['használhatatlan', 1.8, 'attack'],
      ['szemét', 2.2, 'attack'], ['kurva', 2.6, 'attack'], ['fasz', 2.6, 'attack'],
      ['geci', 2.6, 'attack'], ['bunkó', 2.2, 'attack'], ['gyökér', 2.2, 'attack'],
      ['gyűlölet', 2.0, 'hostility'], ['utálom', 2.0, 'hostility'], ['undorító', 2.0, 'hostility'],
      ['gusztustalan', 2.0, 'hostility'], ['felháborító', 1.8, 'hostility'], ['elfogadhatatlan', 1.6, 'hostility', 'noNeg'],
      ['megbocsáthatatlan', 2.2, 'hostility', 'noNeg'], ['szégyen', 1.6, 'hostility'],
      ['fogd be', 2.4, 'incitement'], ['takarodj', 2.4, 'incitement'], ['menj a pokolba', 2.6, 'incitement'],
      ['bojkott', 1.6, 'incitement'], ['gyűlöletkeltés', 2.4, 'incitement'],
      ['abszolút', 0.9, 'absolute'], ['természetesen', 0.5, 'absolute'], ['soha', 0.6, 'absolute'],
      ['mindig', 0.4, 'absolute'],
      ['áruló', 2.4, 'othering'], ['hazaáruló', 2.6, 'othering'], ['libernyák', 2.0, 'othering'],
      ['fasiszta', 2.2, 'othering'], ['komcsi', 2.2, 'othering'],
      ['választás', 2.2, 'politics'], ['szavazás', 2.0, 'politics'], ['kormány', 2.2, 'politics'],
      ['elnök', 2.2, 'politics'], ['parlament', 2.2, 'politics'], ['politika', 2.2, 'politics'],
      ['adók', 2.0, 'politics'], ['bevándorlás', 2.0, 'politics'],
      ['összeesküvés', 2.4, 'conspiracy'], ['összeesküvés-elmélet', 2.6, 'conspiracy'],
      ['új világrend', 2.6, 'conspiracy'], ['illuminátusok', 2.6, 'conspiracy'], ['álhírek', 2.0, 'conspiracy'],
      ['mesterséges intelligencia', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['szingularitás', 2.4, 'ai_dispute'],
      ['háború', 2.2, 'world_affairs'], ['invázió', 2.4, 'world_affairs'], ['bombázás', 2.6, 'world_affairs'],
      ['rakéta', 2.2, 'world_affairs'], ['atomháború', 2.8, 'world_affairs'], ['népirtás', 2.6, 'world_affairs'],
      ['terrortámadás', 2.6, 'world_affairs'], ['gyilkosság', 2.4, 'world_affairs'], ['mészárlás', 2.6, 'world_affairs'],
      ['földrengés', 2.0, 'world_affairs'], ['cunami', 2.4, 'world_affairs'], ['világjárvány', 2.2, 'world_affairs'],
      ['puccs', 2.6, 'world_affairs'], ['menekültek', 2.0, 'world_affairs']
    ],

    // ================================================================ Finnish
    fi: [
      ['idiootti', 1.8, 'attack'], ['tyhmä', 1.6, 'attack'], ['hölmö', 1.8, 'attack'],
      ['älväri', 2.0, 'attack'], ['surkea', 1.8, 'attack'], ['roska', 2.0, 'attack'],
      ['kusipää', 2.6, 'attack'], ['vittu', 2.6, 'attack'], ['paska', 2.4, 'attack'],
      ['huora', 2.6, 'attack'], ['pelle', 1.8, 'attack'], ['luuseri', 1.8, 'attack'],
      ['viha', 2.0, 'hostility'], ['vihaan', 2.0, 'hostility'], ['ällöttävä', 2.0, 'hostility'],
      ['inhottava', 2.0, 'hostility'], ['skandaali', 1.8, 'hostility'], ['sietämätön', 1.8, 'hostility'],
      ['anteeksiantamaton', 2.2, 'hostility', 'noNeg'], ['häpeällinen', 1.8, 'hostility'],
      ['turpa kiinni', 2.4, 'incitement'], ['painu helvettiin', 2.6, 'incitement'], ['häivy', 2.4, 'incitement'],
      ['boikotti', 1.6, 'incitement'], ['lynkkaus', 2.6, 'incitement'],
      ['ehdottomasti', 0.9, 'absolute'], ['tietenkin', 0.5, 'absolute'], ['koskaan', 0.6, 'absolute'],
      ['aina', 0.4, 'absolute'],
      ['petturi', 2.4, 'othering'], ['maanpetturi', 2.6, 'othering'], ['vihervassari', 2.0, 'othering'],
      ['natsi', 2.2, 'othering'], ['kommari', 2.2, 'othering'],
      ['vaalit', 2.2, 'politics'], ['äänestys', 2.0, 'politics'], ['hallitus', 2.2, 'politics'],
      ['presidentti', 2.2, 'politics'], ['parlamentti', 2.2, 'politics'], ['politiikka', 2.2, 'politics'],
      ['verot', 2.0, 'politics'], ['maahanmuutto', 2.0, 'politics'],
      ['salaliitto', 2.4, 'conspiracy'], ['salaliittoteoria', 2.6, 'conspiracy'],
      ['uusi maailmanjärjestys', 2.6, 'conspiracy'], ['illuminaatti', 2.6, 'conspiracy'], ['valeuutiset', 2.0, 'conspiracy'],
      ['tekoäly', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['singulariteetti', 2.4, 'ai_dispute'],
      ['sota', 2.2, 'world_affairs'], ['hyökkäys', 2.4, 'world_affairs'], ['pommitus', 2.6, 'world_affairs'],
      ['ohjus', 2.2, 'world_affairs'], ['ydinsota', 2.8, 'world_affairs'], ['kansanmurha', 2.6, 'world_affairs'],
      ['terrori-isku', 2.6, 'world_affairs'], ['murha', 2.4, 'world_affairs'], ['verilöyly', 2.6, 'world_affairs'],
      ['maanjäristys', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemia', 2.2, 'world_affairs'],
      ['vallankaappaus', 2.6, 'world_affairs'], ['pakolaiset', 2.0, 'world_affairs']
    ],

    // ================================================================ Swedish
    sv: [
      ['idiot', 1.8, 'attack'], ['dum', 1.4, 'attack'], ['korkad', 1.8, 'attack'],
      ['idiot', 1.8, 'attack'], ['värdelös', 1.8, 'attack'], ['skräp', 2.0, 'attack'],
      ['skitstövel', 2.6, 'attack'], ['jävla', 2.4, 'attack'], ['fitta', 2.8, 'attack'],
      ['hora', 2.6, 'attack'], ['clown', 1.4, 'attack'], ['förlorare', 1.8, 'attack'],
      ['hat', 1.8, 'hostility'], ['hatar', 2.0, 'hostility'], ['äckligt', 2.0, 'hostility'],
      ['vidrig', 2.0, 'hostility'], ['skandalöst', 1.8, 'hostility'], ['oacceptabelt', 1.6, 'hostility', 'noNeg'],
      ['oförlåtligt', 2.2, 'hostility', 'noNeg'], ['skamligt', 1.8, 'hostility'],
      ['håll käften', 2.4, 'incitement'], ['dra åt helvete', 2.6, 'incitement'], ['försvinn', 2.2, 'incitement'],
      ['bojkott', 1.6, 'incitement'], ['luncha', 2.6, 'incitement'],
      ['absolut', 0.9, 'absolute'], ['självklart', 0.5, 'absolute'], ['aldrig', 0.6, 'absolute'],
      ['alltid', 0.4, 'absolute'],
      ['förrädare', 2.4, 'othering'], ['landsförrädare', 2.6, 'othering'], ['vänsterextrem', 2.0, 'othering'],
      ['nazist', 2.2, 'othering'], ['kommunist', 2.0, 'othering'],
      ['val', 2.2, 'politics'], ['rösta', 2.0, 'politics'], ['regering', 2.2, 'politics'],
      ['president', 2.2, 'politics'], ['parlament', 2.2, 'politics'], ['politik', 2.2, 'politics'],
      ['skatter', 2.0, 'politics'], ['invandring', 2.0, 'politics'],
      ['konspiration', 2.4, 'conspiracy'], ['konspirationsteori', 2.6, 'conspiracy'],
      ['ny världsordning', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['fake news', 2.0, 'conspiracy'],
      ['artificiell intelligens', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['singularitet', 2.4, 'ai_dispute'],
      ['krig', 2.2, 'world_affairs'], ['invasion', 2.4, 'world_affairs'], ['bombning', 2.6, 'world_affairs'],
      ['robot', 2.2, 'world_affairs'], ['kärnvapenkrig', 2.8, 'world_affairs'], ['folkmord', 2.6, 'world_affairs'],
      ['terrorattack', 2.6, 'world_affairs'], ['mord', 2.4, 'world_affairs'], ['massaker', 2.6, 'world_affairs'],
      ['jordbävning', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemi', 2.2, 'world_affairs'],
      ['statskupp', 2.6, 'world_affairs'], ['flyktingar', 2.0, 'world_affairs']
    ],

    // ================================================================ Danish
    da: [
      ['idiot', 1.8, 'attack'], ['dum', 1.4, 'attack'], ['tåbe', 1.8, 'attack'],
      ['uduelig', 1.8, 'attack'], ['skrald', 2.0, 'attack'], ['lort', 2.4, 'attack'],
      ['røvhul', 2.6, 'attack'], ['fandens', 2.2, 'attack'], ['kælling', 2.6, 'attack'],
      ['had', 1.8, 'hostility'], ['hader', 2.0, 'hostility'], ['ulækkert', 2.0, 'hostility'],
      ['afskyeligt', 2.0, 'hostility'], ['skandaløst', 1.8, 'hostility'], ['uacceptabelt', 1.6, 'hostility', 'noNeg'],
      ['utilgiveligt', 2.2, 'hostility', 'noNeg'], ['skammeligt', 1.8, 'hostility'],
      ['hold kæft', 2.4, 'incitement'], ['skrid', 2.4, 'incitement'], ['gå ad helvede til', 2.6, 'incitement'],
      ['boykot', 1.6, 'incitement'], ['lynch', 2.6, 'incitement'],
      ['absolut', 0.9, 'absolute'], ['selvfølgelig', 0.5, 'absolute'], ['aldrig', 0.6, 'absolute'],
      ['altid', 0.4, 'absolute'],
      ['forræder', 2.4, 'othering'], ['landsforræder', 2.6, 'othering'], ['nazist', 2.2, 'othering'],
      ['kommunist', 2.0, 'othering'], ['woke', 1.6, 'othering'],
      ['valg', 2.2, 'politics'], ['stemme', 2.0, 'politics'], ['regering', 2.2, 'politics'],
      ['statsminister', 2.2, 'politics'], ['folketinget', 2.2, 'politics'], ['politik', 2.2, 'politics'],
      ['skat', 2.0, 'politics'], ['indvandring', 2.0, 'politics'],
      ['konspiration', 2.4, 'conspiracy'], ['konspirationsteori', 2.6, 'conspiracy'],
      ['ny verdensorden', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['fake news', 2.0, 'conspiracy'],
      ['kunstig intelligens', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['singularitet', 2.4, 'ai_dispute'],
      ['krig', 2.2, 'world_affairs'], ['invasion', 2.4, 'world_affairs'], ['bombardement', 2.6, 'world_affairs'],
      ['missil', 2.2, 'world_affairs'], ['atomkrig', 2.8, 'world_affairs'], ['folkemord', 2.6, 'world_affairs'],
      ['terrorangreb', 2.6, 'world_affairs'], ['mord', 2.4, 'world_affairs'], ['massakre', 2.6, 'world_affairs'],
      ['jordskælv', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemi', 2.2, 'world_affairs'],
      ['statskup', 2.6, 'world_affairs'], ['flygtninge', 2.0, 'world_affairs']
    ],

    // ================================================================ Norwegian
    no: [
      ['idiot', 1.8, 'attack'], ['dum', 1.4, 'attack'], ['tulling', 1.8, 'attack'],
      ['ubrukelig', 1.8, 'attack'], ['søppel', 2.0, 'attack'], ['drittsekk', 2.6, 'attack'],
      ['faen', 2.4, 'attack'], ['jævla', 2.4, 'attack'], ['hore', 2.6, 'attack'],
      ['hat', 1.8, 'hostility'], ['hater', 2.0, 'hostility'], ['ekkelt', 2.0, 'hostility'],
      ['avskyelig', 2.0, 'hostility'], ['skandaløst', 1.8, 'hostility'], ['uakseptabelt', 1.6, 'hostility', 'noNeg'],
      ['utilgivelig', 2.2, 'hostility', 'noNeg'], ['skammelig', 1.8, 'hostility'],
      ['hold kjeft', 2.4, 'incitement'], ['stikk av', 2.2, 'incitement'], ['dra til helvete', 2.6, 'incitement'],
      ['boikott', 1.6, 'incitement'], ['lyn sj', 2.6, 'incitement'],
      ['absolutt', 0.9, 'absolute'], ['selvfølgelig', 0.5, 'absolute'], ['aldri', 0.6, 'absolute'],
      ['alltid', 0.4, 'absolute'],
      ['forræder', 2.4, 'othering'], ['landsforræder', 2.6, 'othering'], ['nazist', 2.2, 'othering'],
      ['kommunist', 2.0, 'othering'], ['woke', 1.6, 'othering'],
      ['valg', 2.2, 'politics'], ['stemme', 2.0, 'politics'], ['regjering', 2.2, 'politics'],
      ['statsminister', 2.2, 'politics'], ['stortinget', 2.2, 'politics'], ['politikk', 2.2, 'politics'],
      ['skatt', 2.0, 'politics'], ['innvandring', 2.0, 'politics'],
      ['konspirasjon', 2.4, 'conspiracy'], ['konspirasjonsteori', 2.6, 'conspiracy'],
      ['ny verdensorden', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['fake news', 2.0, 'conspiracy'],
      ['kunstig intelligens', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['singularitet', 2.4, 'ai_dispute'],
      ['krig', 2.2, 'world_affairs'], ['invasjon', 2.4, 'world_affairs'], ['bombing', 2.6, 'world_affairs'],
      ['missil', 2.2, 'world_affairs'], ['atomkrig', 2.8, 'world_affairs'], ['folkemord', 2.6, 'world_affairs'],
      ['terrorangrep', 2.6, 'world_affairs'], ['mord', 2.4, 'world_affairs'], ['massakre', 2.6, 'world_affairs'],
      ['jordskjelv', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemi', 2.2, 'world_affairs'],
      ['statskupp', 2.6, 'world_affairs'], ['flyktninger', 2.0, 'world_affairs']
    ],

    // ================================================================ Turkish
    tr: [
      ['aptal', 1.8, 'attack'], ['salak', 1.8, 'attack'], ['gerizekalı', 2.4, 'attack'],
      ['ahmak', 1.8, 'attack'], ['işe yaramaz', 1.6, 'attack'], ['çöp', 2.0, 'attack'],
      ['şerefsiz', 2.6, 'attack'], ['orospu', 2.8, 'attack'], ['siktir', 2.8, 'attack'],
      ['kahpe', 2.6, 'attack'], ['hain', 2.4, 'attack'], ['rezil', 2.2, 'attack'],
      ['nefret', 2.0, 'hostility'], ['nefret ediyorum', 2.0, 'hostility'], ['iğrenç', 2.0, 'hostility'],
      ['mide bulandırıcı', 2.0, 'hostility'], ['skandal', 1.8, 'hostility'], ['kabul edilemez', 1.6, 'hostility', 'noNeg'],
      ['affedilemez', 2.2, 'hostility', 'noNeg'], ['utanç verici', 1.8, 'hostility'],
      ['sus', 2.2, 'incitement'], ['defol', 2.4, 'incitement'], ['cehenneme git', 2.6, 'incitement'],
      ['boykot', 1.6, 'incitement'], ['yuhalayın', 2.0, 'incitement'],
      ['kesinlikle', 0.9, 'absolute'], ['tabii ki', 0.5, 'absolute'], ['asla', 0.6, 'absolute'],
      ['her zaman', 0.4, 'absolute'],
      ['hain', 2.4, 'othering'], ['vatan haini', 2.6, 'othering'], ['fetöcü', 2.4, 'othering'],
      ['chpli', 1.8, 'othering'], ['akpli', 1.8, 'othering'],
      ['seçim', 2.2, 'politics'], ['oy', 2.0, 'politics'], ['hükümet', 2.2, 'politics'],
      ['cumhurbaşkanı', 2.2, 'politics'], ['meclis', 2.2, 'politics'], ['siyaset', 2.2, 'politics'],
      ['vergi', 2.0, 'politics'], ['göçmenlik', 2.0, 'politics'],
      ['komplo', 2.4, 'conspiracy'], ['komplo teorisi', 2.6, 'conspiracy'],
      ['yeni dünya düzeni', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['sahte haber', 2.0, 'conspiracy'],
      ['yapay zeka', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['tekillik', 2.4, 'ai_dispute'],
      ['savaş', 2.2, 'world_affairs'], ['işgal', 2.4, 'world_affairs'], ['bombardıman', 2.6, 'world_affairs'],
      ['füze', 2.2, 'world_affairs'], ['nükleer savaş', 2.8, 'world_affairs'], ['soykırım', 2.6, 'world_affairs'],
      ['terör saldırısı', 2.6, 'world_affairs'], ['cinayet', 2.4, 'world_affairs'], ['katliam', 2.6, 'world_affairs'],
      ['deprem', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemi', 2.2, 'world_affairs'],
      ['darbe', 2.6, 'world_affairs'], ['mülteciler', 2.0, 'world_affairs']
    ],

    // ================================================================ Arabic
    ar: [
      ['غبي', 1.8, 'attack'], ['أحمق', 2.0, 'attack'], ['حمار', 2.0, 'attack'],
      ['فاشل', 2.0, 'attack'], ['تافه', 1.8, 'attack'], ['حقير', 2.4, 'attack'],
      ['قذر', 2.0, 'attack'], ['كلب', 2.2, 'attack'], ['خنزير', 2.4, 'attack'],
      ['زبالة', 2.0, 'attack'], ['خسيس', 2.4, 'attack'], ['وسخ', 1.8, 'attack'],
      ['أكره', 2.0, 'hostility'], ['كراهية', 2.0, 'hostility'], ['مقزز', 2.0, 'hostility'],
      ['اشمئزاز', 1.8, 'hostility'], ['مثير للغضب', 1.8, 'hostility'], ['غير مقبول', 1.6, 'hostility', 'noNeg'],
      ['لا يغتفر', 2.2, 'hostility', 'noNeg'], ['عار', 1.6, 'hostility'],
      ['اخرس', 2.2, 'incitement'], ['انقلع', 2.4, 'incitement'], ['اذهب إلى الجحيم', 2.6, 'incitement'],
      ['مقاطعة', 1.6, 'incitement'], ['موت', 2.6, 'incitement'],
      ['مطلقا', 0.9, 'absolute'], ['بالتأكيد', 0.6, 'absolute'], ['أبدا', 0.6, 'absolute'],
      ['دائما', 0.4, 'absolute'],
      ['خائن', 2.4, 'othering'], ['عميل', 2.2, 'othering'], ['إرهابي', 2.4, 'othering'],
      ['متخلف', 2.0, 'othering'], ['جهلة', 2.0, 'othering'],
      ['انتخابات', 2.2, 'politics'], ['حكومة', 2.2, 'politics'], ['رئيس', 2.2, 'politics'],
      ['برلمان', 2.2, 'politics'], ['سياسة', 2.2, 'politics'], ['ضرائب', 2.0, 'politics'],
      ['مؤامرة', 2.4, 'conspiracy'], ['نظرية مؤامرة', 2.6, 'conspiracy'],
      ['النظام العالمي الجديد', 2.6, 'conspiracy'], ['المتنورون', 2.6, 'conspiracy'], ['أخبار كاذبة', 2.0, 'conspiracy'],
      ['الذكاء الاصطناعي', 2.2, 'ai_dispute'], ['شات جي بي تي', 2.2, 'ai_dispute'],
      ['التزييف العميق', 2.2, 'ai_dispute'], ['الذكاء الاصطناعي العام', 2.4, 'ai_dispute'],
      ['حرب', 2.2, 'world_affairs'], ['غزو', 2.4, 'world_affairs'], ['قصف', 2.6, 'world_affairs'],
      ['صاروخ', 2.2, 'world_affairs'], ['حرب نووية', 2.8, 'world_affairs'], ['إبادة جماعية', 2.6, 'world_affairs'],
      ['عملية إرهابية', 2.6, 'world_affairs'], ['جريمة قتل', 2.4, 'world_affairs'], ['مجزرة', 2.6, 'world_affairs'],
      ['زلزال', 2.0, 'world_affairs'], ['تسونامي', 2.4, 'world_affairs'], ['وباء', 2.2, 'world_affairs'],
      ['انقلاب', 2.6, 'world_affairs'], ['لاجئون', 2.0, 'world_affairs']
    ],

    // ================================================================ Persian
    fa: [
      ['احمق', 1.8, 'attack'], ['خنگ', 1.8, 'attack'], ['نادان', 1.8, 'attack'],
      ['بیعرضه', 2.0, 'attack'], ['آشغال', 2.0, 'attack'], ['کثافت', 2.4, 'attack'],
      ['حرومزاده', 2.6, 'attack'], ['جنده', 2.8, 'attack'], ['گه', 2.4, 'attack'],
      ['خائن', 2.4, 'attack'], ['پست', 2.2, 'attack'], ['کثیف', 2.0, 'attack'],
      ['نفرت', 2.0, 'hostility'], ['متنفرم', 2.0, 'hostility'], ['چندشآور', 2.0, 'hostility'],
      ['منزجرکننده', 2.0, 'hostility'], ['تاسفبار', 1.8, 'hostility'], ['غیرقابل قبول', 1.6, 'hostility', 'noNeg'],
      ['بخششناپذیر', 2.2, 'hostility', 'noNeg'], ['مایه ننگ', 1.8, 'hostility'],
      ['خفه شو', 2.4, 'incitement'], ['گمشو', 2.4, 'incitement'], ['برو به جهنم', 2.6, 'incitement'],
      ['تحریم', 1.6, 'incitement'], ['مرگ بر', 2.6, 'incitement'],
      ['قطعا', 0.9, 'absolute'], ['البته', 0.5, 'absolute'], ['هرگز', 0.6, 'absolute'],
      ['همیشه', 0.4, 'absolute'],
      ['خائن', 2.4, 'othering'], ['وطنفروش', 2.6, 'othering'], ['ضدانقلاب', 2.2, 'othering'],
      ['اصلاحطلب', 1.6, 'othering'], ['اصولگرا', 1.6, 'othering'],
      ['انتخابات', 2.2, 'politics'], ['دولت', 2.2, 'politics'], ['رئیسجمهور', 2.2, 'politics'],
      ['مجلس', 2.2, 'politics'], ['سیاست', 2.2, 'politics'], ['مالیات', 2.0, 'politics'],
      ['توطئه', 2.4, 'conspiracy'], ['نظریه توطئه', 2.6, 'conspiracy'],
      ['نظم نوین جهانی', 2.6, 'conspiracy'], ['فراماسون', 2.6, 'conspiracy'], ['اخبار جعلی', 2.0, 'conspiracy'],
      ['هوش مصنوعی', 2.2, 'ai_dispute'], ['چتجیپیتی', 2.2, 'ai_dispute'],
      ['دیپفیک', 2.2, 'ai_dispute'], ['تکینگی', 2.4, 'ai_dispute'],
      ['جنگ', 2.2, 'world_affairs'], ['تهاجم', 2.4, 'world_affairs'], ['بمباران', 2.6, 'world_affairs'],
      ['موشک', 2.2, 'world_affairs'], ['جنگ هستهای', 2.8, 'world_affairs'], ['نسلکشی', 2.6, 'world_affairs'],
      ['حمله تروریستی', 2.6, 'world_affairs'], ['قتل', 2.4, 'world_affairs'], ['کشتار', 2.6, 'world_affairs'],
      ['زمینلرزه', 2.0, 'world_affairs'], ['سونامی', 2.4, 'world_affairs'], ['همهگیری', 2.2, 'world_affairs'],
      ['کودتا', 2.6, 'world_affairs'], ['پناهندگان', 2.0, 'world_affairs']
    ],

    // ================================================================ Hindi
    hi: [
      ['बेवकूफ', 1.8, 'attack'], ['मूर्ख', 1.8, 'attack'], ['गधा', 2.0, 'attack'],
      ['निकम्मा', 1.8, 'attack'], ['कचरा', 2.0, 'attack'], ['कमीना', 2.4, 'attack'],
      ['हरामी', 2.6, 'attack'], ['भड़वा', 2.6, 'attack'], ['साला', 2.2, 'attack'],
      ['गंदा', 2.0, 'attack'], ['नीच', 2.2, 'attack'], ['बदमाश', 2.2, 'attack'],
      ['नफरत', 2.0, 'hostility'], ['घृणा', 2.0, 'hostility'], ['घिनौना', 2.0, 'hostility'],
      ['असहनीय', 1.8, 'hostility'], ['शर्मनाक', 1.8, 'hostility'], ['अस्वीकार्य', 1.6, 'hostility', 'noNeg'],
      ['अक्षम्य', 2.2, 'hostility', 'noNeg'], ['क्रोधित', 1.6, 'hostility'],
      ['चुप रहो', 2.4, 'incitement'], ['भाग जा', 2.4, 'incitement'], ['मर जा', 2.8, 'incitement'],
      ['बहिष्कार', 1.6, 'incitement'], ['गोली मारो', 2.8, 'incitement'],
      ['बिल्कुल', 0.9, 'absolute'], ['जरूर', 0.6, 'absolute'], ['कभी नहीं', 0.6, 'absolute'],
      ['हमेशा', 0.4, 'absolute'],
      ['गद्दार', 2.4, 'othering'], ['देशद्रोही', 2.6, 'othering'], ['आतंकवादी', 2.4, 'othering'],
      ['संघी', 1.8, 'othering'], ['कांग्रेसी', 1.8, 'othering'],
      ['चुनाव', 2.2, 'politics'], ['सरकार', 2.2, 'politics'], ['प्रधानमंत्री', 2.2, 'politics'],
      ['संसद', 2.2, 'politics'], ['राजनीति', 2.2, 'politics'], ['टैक्स', 2.0, 'politics'],
      ['साजिश', 2.4, 'conspiracy'], ['साजिश का सिद्धांत', 2.6, 'conspiracy'],
      ['नया विश्व व्यवस्था', 2.6, 'conspiracy'], ['इलुमिनाटी', 2.6, 'conspiracy'], ['फर्जी खबर', 2.0, 'conspiracy'],
      ['कृत्रिम बुद्धिमत्ता', 2.2, 'ai_dispute'], ['चैटजीपीटी', 2.2, 'ai_dispute'],
      ['डीपफेक', 2.2, 'ai_dispute'], ['सिंगुलैरिटी', 2.4, 'ai_dispute'],
      ['युद्ध', 2.2, 'world_affairs'], ['आक्रमण', 2.4, 'world_affairs'], ['बमबारी', 2.6, 'world_affairs'],
      ['मिसाइल', 2.2, 'world_affairs'], ['परमाणु युद्ध', 2.8, 'world_affairs'], ['नरसंहार', 2.6, 'world_affairs'],
      ['आतंकी हमला', 2.6, 'world_affairs'], ['हत्या', 2.4, 'world_affairs'], ['कत्लेआम', 2.6, 'world_affairs'],
      ['भूकंप', 2.0, 'world_affairs'], ['सुनामी', 2.4, 'world_affairs'], ['महामारी', 2.2, 'world_affairs'],
      ['तख्तापलट', 2.6, 'world_affairs'], ['शरणार्थी', 2.0, 'world_affairs']
    ],

    // ================================================================ Thai
    th: [
      ['โง่', 1.8, 'attack'], ['ห่วย', 1.8, 'attack'], ['ไอ้โง่', 2.2, 'attack'],
      ['ไร้ค่า', 1.8, 'attack'], ['ขยะ', 2.0, 'attack'], ['ไอ้เวร', 2.4, 'attack'],
      ['เหี้ย', 2.6, 'attack'], ['สัส', 2.6, 'attack'], ['ควาย', 2.4, 'attack'],
      ['สัตว์', 2.2, 'attack'], ['ชั่ว', 2.2, 'attack'], ['หน้าด้าน', 1.8, 'attack'],
      ['เกลียด', 2.0, 'hostility'], ['ความเกลียดชัง', 2.0, 'hostility'], ['น่ารังเกียจ', 2.0, 'hostility'],
      ['น่าขยะแขยง', 2.0, 'hostility'], ['น่าอับอาย', 1.8, 'hostility'], ['ยอมรับไม่ได้', 1.6, 'hostility', 'noNeg'],
      ['ให้อภัยไม่ได้', 2.2, 'hostility', 'noNeg'], ['โกรธ', 1.6, 'hostility'],
      ['หุบปาก', 2.4, 'incitement'], ['ไปตายซะ', 3.0, 'incitement'], ['ไสหัวไป', 2.4, 'incitement'],
      ['คว่ำบาตร', 1.6, 'incitement'], ['รุมประณาม', 2.2, 'incitement'],
      ['แน่นอน', 0.6, 'absolute'], ['ไม่มีทาง', 0.8, 'absolute'], ['เสมอ', 0.4, 'absolute'],
      ['ตลอดไป', 0.5, 'absolute'],
      ['ทรยศ', 2.4, 'othering'], ['ขายชาติ', 2.6, 'othering'], ['ไอ้พวก', 1.8, 'othering'],
      ['แดง', 1.6, 'othering'], ['เหลือง', 1.6, 'othering'],
      ['เลือกตั้ง', 2.2, 'politics'], ['รัฐบาล', 2.2, 'politics'], ['นายก', 2.2, 'politics'],
      ['รัฐสภา', 2.2, 'politics'], ['การเมือง', 2.2, 'politics'], ['ภาษี', 2.0, 'politics'],
      ['สมคบคิด', 2.4, 'conspiracy'], ['ทฤษฎีสมคบคิด', 2.6, 'conspiracy'],
      ['ระเบียบโลกใหม่', 2.6, 'conspiracy'], ['ข่าวปลอม', 2.0, 'conspiracy'], ['อิลลูมินาติ', 2.6, 'conspiracy'],
      ['ปัญญาประดิษฐ์', 2.2, 'ai_dispute'], ['แชทจีพีที', 2.2, 'ai_dispute'],
      ['ดีพเฟก', 2.2, 'ai_dispute'], ['จุดเอกภาวะ', 2.4, 'ai_dispute'],
      ['สงคราม', 2.2, 'world_affairs'], ['บุก', 2.4, 'world_affairs'], ['ทิ้งระเบิด', 2.6, 'world_affairs'],
      ['ขีปนาวุธ', 2.2, 'world_affairs'], ['สงครามนิวเคลียร์', 2.8, 'world_affairs'], ['ฆ่าล้างเผ่าพันธุ์', 2.6, 'world_affairs'],
      ['ก่อการร้าย', 2.4, 'world_affairs'], ['ฆาตกรรม', 2.4, 'world_affairs'], ['สังหารหมู่', 2.6, 'world_affairs'],
      ['แผ่นดินไหว', 2.0, 'world_affairs'], ['สึนามิ', 2.4, 'world_affairs'], ['โรคระบาด', 2.2, 'world_affairs'],
      ['รัฐประหาร', 2.6, 'world_affairs'], ['ผู้ลี้ภัย', 2.0, 'world_affairs']
    ],

    // ================================================================ Filipino
    fil: [
      ['tanga', 2.0, 'attack'], ['bobo', 2.0, 'attack'], ['gago', 2.6, 'attack'],
      ['tangina', 2.8, 'attack'], ['hayop', 2.2, 'attack'], ['lintik', 2.2, 'attack'],
      ['walang kwenta', 1.8, 'attack'], ['basura', 2.0, 'attack'], ['ulol', 2.4, 'attack'],
      ['pakyu', 2.8, 'attack'], ['siraulo', 2.4, 'attack'], ['traydor', 2.4, 'attack'],
      ['galit', 1.6, 'hostility'], ['pagkagalit', 1.6, 'hostility'], ['kasuklam-suklam', 2.0, 'hostility'],
      ['nakakadiri', 2.0, 'hostility'], ['nakakahiya', 1.8, 'hostility'], ['hindi katanggap-tanggap', 1.6, 'hostility', 'noNeg'],
      ['hindi mapapatawad', 2.2, 'hostility', 'noNeg'], ['kadiri', 2.0, 'hostility'],
      ['tumahimik ka', 2.4, 'incitement'], ['umalis ka', 2.2, 'incitement'], ['mamatay ka na', 3.0, 'incitement'],
      ['boykot', 1.6, 'incitement'], ['i-pattern', 1.4, 'incitement'],
      ['talaga', 0.6, 'absolute'], ['sigurado', 0.6, 'absolute'], ['hinding-hindi', 0.8, 'absolute'],
      ['palagi', 0.4, 'absolute'],
      ['traydor', 2.4, 'othering'], ['mga dilawan', 1.8, 'othering'], ['mga duterte', 1.8, 'othering'],
      ['npa', 1.8, 'othering'], ['komunista', 2.0, 'othering'],
      ['eleksyon', 2.2, 'politics'], ['boto', 2.0, 'politics'], ['gobyerno', 2.2, 'politics'],
      ['pangulo', 2.2, 'politics'], ['kongreso', 2.2, 'politics'], ['pulitika', 2.2, 'politics'],
      ['buwis', 2.0, 'politics'], ['imigrasyon', 2.0, 'politics'],
      ['konspirasyon', 2.4, 'conspiracy'], ['teorya ng konspirasyon', 2.6, 'conspiracy'],
      ['bagong kaayusan ng mundo', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'], ['fake news', 2.0, 'conspiracy'],
      ['artificial intelligence', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['deepfake', 2.2, 'ai_dispute'], ['singularidad', 2.4, 'ai_dispute'],
      ['digmaan', 2.2, 'world_affairs'], ['pagsalakay', 2.4, 'world_affairs'], ['pambobomba', 2.6, 'world_affairs'],
      ['misil', 2.2, 'world_affairs'], ['digmaang nuklear', 2.8, 'world_affairs'], ['henosidyo', 2.6, 'world_affairs'],
      ['pag-atake ng terorista', 2.6, 'world_affairs'], ['pagpatay', 2.4, 'world_affairs'], ['masaker', 2.6, 'world_affairs'],
      ['lindol', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'], ['pandemya', 2.2, 'world_affairs'],
      ['kudeta', 2.6, 'world_affairs'], ['mga refugee', 2.0, 'world_affairs']
    ],

    // ================================================================ Vietnamese
    vi: [
      ['ngu', 1.8, 'attack'], ['đồ ngu', 2.2, 'attack'], ['óc chó', 2.6, 'attack'],
      ['thằng khốn', 2.4, 'attack'], ['khốn nạn', 2.2, 'attack'], ['súc vật', 2.6, 'attack'],
      ['rác rưởi', 2.0, 'attack'], ['đần độn', 1.8, 'attack'],
      ['ghét', 1.8, 'hostility'], ['căm thù', 2.2, 'hostility'], ['kinh tởm', 2.0, 'hostility'], ['đáng ghét', 1.8, 'hostility'],
      ['câm mồm', 2.4, 'incitement'], ['im đi', 2.2, 'incitement'], ['biến đi', 2.4, 'incitement'], ['chết đi', 3.0, 'incitement'],
      ['phản quốc', 2.4, 'othering'], ['bán nước', 2.6, 'othering'], ['giặc', 2.0, 'othering'],
      ['bầu cử', 2.2, 'politics'], ['chính phủ', 2.2, 'politics'], ['tổng thống', 2.2, 'politics'],
      ['chính trị', 2.2, 'politics'], ['thuế', 2.0, 'politics'],
      ['âm mưu', 2.4, 'conspiracy'], ['thuyết âm mưu', 2.6, 'conspiracy'], ['tin giả', 2.0, 'conspiracy'],
      ['trí tuệ nhân tạo', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['chiến tranh', 2.2, 'world_affairs'], ['xâm lược', 2.4, 'world_affairs'], ['ném bom', 2.6, 'world_affairs'],
      ['tên lửa', 2.2, 'world_affairs'], ['chiến tranh hạt nhân', 2.8, 'world_affairs'], ['diệt chủng', 2.6, 'world_affairs'],
      ['khủng bố', 2.4, 'world_affairs'], ['giết người', 2.4, 'world_affairs'], ['sóng thần', 2.4, 'world_affairs'],
      ['đại dịch', 2.2, 'world_affairs'], ['đảo chính', 2.6, 'world_affairs'], ['tị nạn', 2.0, 'world_affairs']
    ],

    // ================================================================ Indonesian
    id: [
      ['bodoh', 1.8, 'attack'], ['goblok', 2.2, 'attack'], ['tolol', 2.0, 'attack'],
      ['idiot', 1.8, 'attack'], ['sampah', 2.0, 'attack'], ['brengsek', 2.4, 'attack'],
      ['keparat', 2.4, 'attack'], ['bajingan', 2.4, 'attack'],
      ['benci', 2.0, 'hostility'], ['kebencian', 2.0, 'hostility'], ['menjijikkan', 2.0, 'hostility'], ['muak', 1.6, 'hostility'],
      ['diam', 1.8, 'incitement'], ['pergi', 1.6, 'incitement'], ['mati', 2.6, 'incitement'], ['boikot', 1.6, 'incitement'],
      ['pengkhianat', 2.4, 'othering'], ['komunis', 2.0, 'othering'],
      ['pemilu', 2.2, 'politics'], ['pemerintah', 2.2, 'politics'], ['presiden', 2.2, 'politics'],
      ['politik', 2.2, 'politics'], ['pajak', 2.0, 'politics'],
      ['konspirasi', 2.4, 'conspiracy'], ['teori konspirasi', 2.6, 'conspiracy'], ['berita bohong', 2.0, 'conspiracy'],
      ['kecerdasan buatan', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['perang', 2.2, 'world_affairs'], ['invasi', 2.4, 'world_affairs'], ['pengeboman', 2.6, 'world_affairs'],
      ['rudal', 2.2, 'world_affairs'], ['perang nuklir', 2.8, 'world_affairs'], ['genosida', 2.6, 'world_affairs'],
      ['teror', 2.4, 'world_affairs'], ['pembunuhan', 2.4, 'world_affairs'], ['gempa', 2.0, 'world_affairs'],
      ['tsunami', 2.4, 'world_affairs'], ['pandemi', 2.2, 'world_affairs'], ['kudeta', 2.6, 'world_affairs'],
      ['pengungsi', 2.0, 'world_affairs']
    ],

    // ================================================================ Malay
    ms: [
      ['bodoh', 1.8, 'attack'], ['goblok', 2.2, 'attack'], ['tolol', 2.0, 'attack'],
      ['sial', 1.6, 'attack'], ['sampah', 2.0, 'attack'], ['bangsat', 2.4, 'attack'], ['jahanam', 2.4, 'attack'],
      ['benci', 2.0, 'hostility'], ['kebencian', 2.0, 'hostility'], ['menjijikkan', 2.0, 'hostility'],
      ['diam', 1.8, 'incitement'], ['pergi', 1.6, 'incitement'], ['mati', 2.6, 'incitement'], ['boikot', 1.6, 'incitement'],
      ['pengkhianat', 2.4, 'othering'], ['komunis', 2.0, 'othering'],
      ['pilihan raya', 2.2, 'politics'], ['kerajaan', 2.2, 'politics'], ['presiden', 2.2, 'politics'],
      ['politik', 2.2, 'politics'], ['cukai', 2.0, 'politics'],
      ['konspirasi', 2.4, 'conspiracy'], ['teori konspirasi', 2.6, 'conspiracy'], ['berita palsu', 2.0, 'conspiracy'],
      ['kecerdasan buatan', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['perang', 2.2, 'world_affairs'], ['serangan', 2.4, 'world_affairs'], ['pengeboman', 2.6, 'world_affairs'],
      ['peluru berpandu', 2.2, 'world_affairs'], ['perang nuklear', 2.8, 'world_affairs'], ['pembunuhan beramai-ramai', 2.6, 'world_affairs'],
      ['keganasan', 2.4, 'world_affairs'], ['pembunuhan', 2.4, 'world_affairs'], ['gempa bumi', 2.0, 'world_affairs'],
      ['tsunami', 2.4, 'world_affairs'], ['pandemik', 2.2, 'world_affairs'], ['rampasan kuasa', 2.6, 'world_affairs']
    ],

    // ================================================================ Bengali
    bn: [
      ['বোকা', 1.8, 'attack'], ['মূর্খ', 1.8, 'attack'], ['গাধা', 2.0, 'attack'],
      ['নিকম্মা', 1.8, 'attack'], ['জঘন্য', 2.0, 'attack'], ['কুত্তার বাচ্চা', 2.8, 'attack'],
      ['ঘৃণা', 2.0, 'hostility'], ['অপছন্দ', 1.6, 'hostility'], ['বিরক্তিকর', 1.8, 'hostility'],
      ['চুপ কর', 2.4, 'incitement'], ['পালাও', 2.4, 'incitement'], ['মরে যাও', 3.0, 'incitement'],
      ['বিশ্বাসঘাতক', 2.4, 'othering'], ['দেশদ্রোহী', 2.6, 'othering'], ['সন্ত্রাসী', 2.4, 'othering'],
      ['নির্বাচন', 2.2, 'politics'], ['সরকার', 2.2, 'politics'], ['প্রধানমন্ত্রী', 2.2, 'politics'],
      ['রাজনীতি', 2.2, 'politics'],
      ['ষড়যন্ত্র', 2.4, 'conspiracy'], ['ষড়যন্ত্র তত্ত্ব', 2.6, 'conspiracy'], ['ভুয়া খবর', 2.0, 'conspiracy'],
      ['কৃত্রিম বুদ্ধিমত্তা', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['যুদ্ধ', 2.2, 'world_affairs'], ['আক্রমণ', 2.4, 'world_affairs'], ['বোমাবর্ষণ', 2.6, 'world_affairs'],
      ['ক্ষেপণাস্ত্র', 2.2, 'world_affairs'], ['পারমাণবিক যুদ্ধ', 2.8, 'world_affairs'], ['গণহত্যা', 2.6, 'world_affairs'],
      ['সন্ত্রাস', 2.4, 'world_affairs'], ['খুন', 2.4, 'world_affairs'], ['ভূমিকম্প', 2.0, 'world_affairs'],
      ['সুনামি', 2.4, 'world_affairs'], ['মহামারি', 2.2, 'world_affairs'], ['অভ্যুত্থান', 2.6, 'world_affairs']
    ],

    // ================================================================ Urdu
    ur: [
      ['بیوقوف', 1.8, 'attack'], ['احمق', 1.8, 'attack'], ['گدھا', 2.0, 'attack'],
      ['ناکارہ', 1.8, 'attack'], ['کمینہ', 2.2, 'attack'], ['حرامی', 2.6, 'attack'],
      ['نفرت', 2.0, 'hostility'], ['مکروہ', 2.0, 'hostility'], ['گھن', 1.8, 'hostility'],
      ['چپ رہو', 2.4, 'incitement'], ['بھاگ جا', 2.4, 'incitement'], ['مر جا', 2.8, 'incitement'],
      ['غدار', 2.4, 'othering'], ['دہشت گرد', 2.4, 'othering'],
      ['الیکشن', 2.2, 'politics'], ['حکومت', 2.2, 'politics'], ['صدر', 2.2, 'politics'],
      ['سیاست', 2.2, 'politics'], ['ٹیکس', 2.0, 'politics'],
      ['سازش', 2.4, 'conspiracy'], ['سازشی نظریہ', 2.6, 'conspiracy'], ['جعلی خبر', 2.0, 'conspiracy'],
      ['مصنوعی ذہانت', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['جنگ', 2.2, 'world_affairs'], ['حملہ', 2.4, 'world_affairs'], ['بمباری', 2.6, 'world_affairs'],
      ['میزائل', 2.2, 'world_affairs'], ['ایٹمی جنگ', 2.8, 'world_affairs'], ['نسل کشی', 2.6, 'world_affairs'],
      ['دہشت گردی', 2.4, 'world_affairs'], ['قتل', 2.4, 'world_affairs'], ['زلزلہ', 2.0, 'world_affairs'],
      ['سونامی', 2.4, 'world_affairs'], ['وبا', 2.2, 'world_affairs'], ['بغاوت', 2.6, 'world_affairs']
    ],

    // ================================================================ Tamil
    ta: [
      ['முட்டாள்', 1.8, 'attack'], ['அசடு', 1.8, 'attack'], ['கழுதை', 2.0, 'attack'],
      ['அற்பன்', 1.8, 'attack'], ['கேவலம்', 2.0, 'attack'],
      ['வெறுப்பு', 2.0, 'hostility'], ['அருவருப்பு', 2.0, 'hostility'], ['எரிச்சல்', 1.6, 'hostility'],
      ['வாயை மூடு', 2.4, 'incitement'], ['ஓடிப்போ', 2.4, 'incitement'], ['செத்துப்போ', 3.0, 'incitement'],
      ['துரோகி', 2.4, 'othering'], ['தேசத் துரோகி', 2.6, 'othering'],
      ['தேர்தல்', 2.2, 'politics'], ['அரசு', 2.2, 'politics'], ['ஜனாதிபதி', 2.2, 'politics'],
      ['அரசியல்', 2.2, 'politics'], ['வரி', 2.0, 'politics'],
      ['சதி', 2.4, 'conspiracy'], ['சதிக் கோட்பாடு', 2.6, 'conspiracy'], ['பொய் செய்தி', 2.0, 'conspiracy'],
      ['செயற்கை நுண்ணறிவு', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['போர்', 2.2, 'world_affairs'], ['படையெடுப்பு', 2.4, 'world_affairs'], ['குண்டுவீச்சு', 2.6, 'world_affairs'],
      ['ஏவுகணை', 2.2, 'world_affairs'], ['அணுப்போர்', 2.8, 'world_affairs'], ['இனப்படுகொலை', 2.6, 'world_affairs'],
      ['பயங்கரவாதம்', 2.4, 'world_affairs'], ['கொலை', 2.4, 'world_affairs'], ['பூகம்பம்', 2.0, 'world_affairs'],
      ['சுனாமி', 2.4, 'world_affairs'], ['தொற்றுநோய்', 2.2, 'world_affairs'], ['ஆட்சிக் கவிழ்ப்பு', 2.6, 'world_affairs']
    ],

    // ================================================================ Telugu
    te: [
      ['మూర్ఖుడు', 1.8, 'attack'], ['గాడిద', 2.0, 'attack'], ['నీచుడు', 2.0, 'attack'],
      ['పనికిరాని', 1.8, 'attack'], ['దిక్కులేని', 1.8, 'attack'],
      ['ద్వేషం', 2.0, 'hostility'], ['అసహ్యం', 2.0, 'hostility'], ['చిరాకు', 1.6, 'hostility'],
      ['నోరు మూసుకో', 2.4, 'incitement'], ['పో', 2.0, 'incitement'], ['చావు', 2.8, 'incitement'],
      ['ద్రోహి', 2.4, 'othering'], ['దేశద్రోహి', 2.6, 'othering'],
      ['ఎన్నికలు', 2.2, 'politics'], ['ప్రభుత్వం', 2.2, 'politics'], ['అధ్యక్షుడు', 2.2, 'politics'],
      ['రాజకీయాలు', 2.2, 'politics'], ['పన్ను', 2.0, 'politics'],
      ['కుట్ర', 2.4, 'conspiracy'], ['కుట్ర సిద్ధాంతం', 2.6, 'conspiracy'], ['తప్పుడు వార్త', 2.0, 'conspiracy'],
      ['కృత్రిమ మేధస్సు', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['యుద్ధం', 2.2, 'world_affairs'], ['దాడి', 2.4, 'world_affairs'], ['బాంబు దాడి', 2.6, 'world_affairs'],
      ['క్షిపణి', 2.2, 'world_affairs'], ['అణు యుద్ధం', 2.8, 'world_affairs'], ['హత్యాకాండ', 2.6, 'world_affairs'],
      ['ఉగ్రవాదం', 2.4, 'world_affairs'], ['హత్య', 2.4, 'world_affairs'], ['భూకంపం', 2.0, 'world_affairs'],
      ['సునామీ', 2.4, 'world_affairs'], ['మహమ్మారి', 2.2, 'world_affairs'], ['తిరుగుబాటు', 2.6, 'world_affairs']
    ],

    // ================================================================ Hebrew
    he: [
      ['מטומטם', 1.8, 'attack'], ['אידיוט', 1.8, 'attack'], ['טיפש', 1.8, 'attack'],
      ['אפס', 1.8, 'attack'], ['חלאה', 2.4, 'attack'], ['בן זונה', 2.8, 'attack'],
      ['שנאה', 2.0, 'hostility'], ['שונא', 1.8, 'hostility'], ['מגעיל', 2.0, 'hostility'], ['דוחה', 2.0, 'hostility'],
      ['תשתוק', 2.4, 'incitement'], ['תסתלק', 2.4, 'incitement'], ['לך לעזאזל', 2.6, 'incitement'], ['תמות', 3.0, 'incitement'],
      ['בוגד', 2.4, 'othering'], ['שמאלני', 1.8, 'othering'], ['פאשיסט', 2.2, 'othering'],
      ['בחירות', 2.2, 'politics'], ['ממשלה', 2.2, 'politics'], ['ראש הממשלה', 2.2, 'politics'],
      ['פוליטיקה', 2.2, 'politics'], ['מיסים', 2.0, 'politics'],
      ['קונספירציה', 2.4, 'conspiracy'], ['תיאוריית קונספירציה', 2.6, 'conspiracy'], ['חדשות כזב', 2.0, 'conspiracy'],
      ['בינה מלאכותית', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['מלחמה', 2.2, 'world_affairs'], ['פלישה', 2.4, 'world_affairs'], ['הפצצה', 2.6, 'world_affairs'],
      ['טיל', 2.2, 'world_affairs'], ['מלחמה גרעינית', 2.8, 'world_affairs'], ['רצח עם', 2.6, 'world_affairs'],
      ['פיגוע', 2.6, 'world_affairs'], ['רצח', 2.4, 'world_affairs'], ['רעידת אדמה', 2.0, 'world_affairs'],
      ['צונאמי', 2.4, 'world_affairs'], ['מגפה', 2.2, 'world_affairs'], ['הפיכה', 2.6, 'world_affairs']
    ],

    // ================================================================ Greek
    el: [
      ['ηλίθιος', 1.8, 'attack'], ['βλάκας', 1.8, 'attack'], ['μαλάκας', 2.6, 'attack'],
      ['γαϊδούρι', 2.0, 'attack'], ['άχρηστος', 1.8, 'attack'], ['σκατά', 2.4, 'attack'],
      ['μίσος', 2.0, 'hostility'], ['μισώ', 2.0, 'hostility'], ['αηδιαστικός', 2.0, 'hostility'], ['σιχαμένος', 2.0, 'hostility'],
      ['σκάσε', 2.4, 'incitement'], ['φύγε', 2.2, 'incitement'], ['άντε γαμήσου', 2.8, 'incitement'], ['πεθάνε', 3.0, 'incitement'],
      ['προδότης', 2.4, 'othering'], ['φασίστας', 2.2, 'othering'], ['κομμουνιστής', 2.0, 'othering'],
      ['εκλογές', 2.2, 'politics'], ['κυβέρνηση', 2.2, 'politics'], ['πρωθυπουργός', 2.2, 'politics'],
      ['πολιτική', 2.2, 'politics'], ['φόροι', 2.0, 'politics'],
      ['συνωμοσία', 2.4, 'conspiracy'], ['θεωρία συνωμοσίας', 2.6, 'conspiracy'], ['ψεύτικες ειδήσεις', 2.0, 'conspiracy'],
      ['τεχνητή νοημοσύνη', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['πόλεμος', 2.2, 'world_affairs'], ['εισβολή', 2.4, 'world_affairs'], ['βομβαρδισμός', 2.6, 'world_affairs'],
      ['πύραυλος', 2.2, 'world_affairs'], ['πυρηνικός πόλεμος', 2.8, 'world_affairs'], ['γενοκτονία', 2.6, 'world_affairs'],
      ['τρομοκρατία', 2.4, 'world_affairs'], ['δολοφονία', 2.4, 'world_affairs'], ['σεισμός', 2.0, 'world_affairs'],
      ['τσουνάμι', 2.4, 'world_affairs'], ['πανδημία', 2.2, 'world_affairs'], ['πραξικόπημα', 2.6, 'world_affairs']
    ],

    // ================================================================ Romanian
    ro: [
      ['idiot', 1.8, 'attack'], ['prost', 1.6, 'attack'], ['tâmpit', 2.0, 'attack'],
      ['imbecil', 2.0, 'attack'], ['gunoi', 2.0, 'attack'], ['nemernic', 2.4, 'attack'],
      ['javră', 2.6, 'attack'], ['nenorocit', 2.2, 'attack'],
      ['ură', 2.0, 'hostility'], ['urăsc', 2.0, 'hostility'], ['dezgustător', 2.0, 'hostility'], ['scârbos', 2.0, 'hostility'],
      ['taci', 2.4, 'incitement'], ['pleacă', 2.2, 'incitement'], ['du-te dracului', 2.6, 'incitement'], ['mori', 3.0, 'incitement'],
      ['trădător', 2.4, 'othering'], ['comunist', 2.0, 'othering'], ['fascist', 2.2, 'othering'],
      ['alegeri', 2.2, 'politics'], ['guvern', 2.2, 'politics'], ['președinte', 2.2, 'politics'],
      ['politică', 2.2, 'politics'], ['taxe', 2.0, 'politics'],
      ['conspirație', 2.4, 'conspiracy'], ['teoria conspirației', 2.6, 'conspiracy'], ['știri false', 2.0, 'conspiracy'],
      ['inteligență artificială', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['război', 2.2, 'world_affairs'], ['invazie', 2.4, 'world_affairs'], ['bombardament', 2.6, 'world_affairs'],
      ['rachetă', 2.2, 'world_affairs'], ['război nuclear', 2.8, 'world_affairs'], ['genocid', 2.6, 'world_affairs'],
      ['terorism', 2.4, 'world_affairs'], ['crimă', 2.4, 'world_affairs'], ['cutremur', 2.0, 'world_affairs'],
      ['tsunami', 2.4, 'world_affairs'], ['pandemie', 2.2, 'world_affairs'], ['lovitură de stat', 2.6, 'world_affairs']
    ],

    // ================================================================ Bulgarian
    bg: [
      ['идиот', 1.8, 'attack'], ['глупак', 1.8, 'attack'], ['тъпак', 2.0, 'attack'],
      ['малоумен', 2.0, 'attack'], ['боклук', 2.0, 'attack'], ['негодник', 2.2, 'attack'], ['копеле', 2.6, 'attack'],
      ['омраза', 2.0, 'hostility'], ['мразя', 2.0, 'hostility'], ['отвратително', 2.0, 'hostility'], ['гнусно', 2.0, 'hostility'],
      ['млъкни', 2.4, 'incitement'], ['махай се', 2.4, 'incitement'], ['върви по дяволите', 2.6, 'incitement'], ['умри', 3.0, 'incitement'],
      ['предател', 2.4, 'othering'], ['комунист', 2.0, 'othering'], ['фашист', 2.2, 'othering'],
      ['избори', 2.2, 'politics'], ['правителство', 2.2, 'politics'], ['президент', 2.2, 'politics'],
      ['политика', 2.2, 'politics'], ['данъци', 2.0, 'politics'],
      ['конспирация', 2.4, 'conspiracy'], ['теория на конспирацията', 2.6, 'conspiracy'], ['фалшиви новини', 2.0, 'conspiracy'],
      ['изкуствен интелект', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['война', 2.2, 'world_affairs'], ['нашествие', 2.4, 'world_affairs'], ['бомбардировка', 2.6, 'world_affairs'],
      ['ракета', 2.2, 'world_affairs'], ['ядрена война', 2.8, 'world_affairs'], ['геноцид', 2.6, 'world_affairs'],
      ['тероризъм', 2.4, 'world_affairs'], ['убийство', 2.4, 'world_affairs'], ['земетресение', 2.0, 'world_affairs'],
      ['цунами', 2.4, 'world_affairs'], ['пандемия', 2.2, 'world_affairs'], ['преврат', 2.6, 'world_affairs']
    ],

    // ================================================================ Serbian
    sr: [
      ['идиот', 1.8, 'attack'], ['глупан', 1.8, 'attack'], ['будала', 1.8, 'attack'],
      ['кретен', 2.2, 'attack'], ['смеће', 2.0, 'attack'], ['гњида', 2.6, 'attack'], ['копиле', 2.6, 'attack'],
      ['мржња', 2.0, 'hostility'], ['мрзим', 2.0, 'hostility'], ['одвратно', 2.0, 'hostility'], ['гадно', 1.8, 'hostility'],
      ['ћути', 2.4, 'incitement'], ['бежи', 2.4, 'incitement'], ['иди дођавола', 2.6, 'incitement'],
      ['издајник', 2.4, 'othering'], ['комуниста', 2.0, 'othering'], ['фашиста', 2.2, 'othering'],
      ['избори', 2.2, 'politics'], ['влада', 2.2, 'politics'], ['председник', 2.2, 'politics'],
      ['политика', 2.2, 'politics'], ['порези', 2.0, 'politics'],
      ['завера', 2.4, 'conspiracy'], ['теорија завере', 2.6, 'conspiracy'], ['лажне вести', 2.0, 'conspiracy'],
      ['вештачка интелигенција', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['рат', 2.2, 'world_affairs'], ['инвазија', 2.4, 'world_affairs'], ['бомбардовање', 2.6, 'world_affairs'],
      ['ракета', 2.2, 'world_affairs'], ['нуклеарни рат', 2.8, 'world_affairs'], ['геноцид', 2.6, 'world_affairs'],
      ['тероризам', 2.4, 'world_affairs'], ['убиство', 2.4, 'world_affairs'], ['земљотрес', 2.0, 'world_affairs'],
      ['цунами', 2.4, 'world_affairs'], ['пандемија', 2.2, 'world_affairs'], ['пуч', 2.6, 'world_affairs']
    ],

    // ================================================================ Croatian
    hr: [
      ['idiot', 1.8, 'attack'], ['glupan', 1.8, 'attack'], ['budala', 1.8, 'attack'],
      ['kreten', 2.2, 'attack'], ['smeće', 2.0, 'attack'], ['gnjida', 2.6, 'attack'],
      ['mržnja', 2.0, 'hostility'], ['mrzim', 2.0, 'hostility'], ['odvratno', 2.0, 'hostility'], ['gadno', 1.8, 'hostility'],
      ['šuti', 2.4, 'incitement'], ['bježi', 2.4, 'incitement'], ['idi do đavola', 2.6, 'incitement'],
      ['izdajnik', 2.4, 'othering'], ['komunist', 2.0, 'othering'], ['fašist', 2.2, 'othering'],
      ['izbori', 2.2, 'politics'], ['vlada', 2.2, 'politics'], ['predsjednik', 2.2, 'politics'],
      ['politika', 2.2, 'politics'], ['porezi', 2.0, 'politics'],
      ['zavjera', 2.4, 'conspiracy'], ['teorija zavjere', 2.6, 'conspiracy'], ['lažne vijesti', 2.0, 'conspiracy'],
      ['umjetna inteligencija', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['rat', 2.2, 'world_affairs'], ['invazija', 2.4, 'world_affairs'], ['bombardiranje', 2.6, 'world_affairs'],
      ['raketa', 2.2, 'world_affairs'], ['nuklearni rat', 2.8, 'world_affairs'], ['genocid', 2.6, 'world_affairs'],
      ['terorizam', 2.4, 'world_affairs'], ['ubojstvo', 2.4, 'world_affairs'], ['potres', 2.0, 'world_affairs'],
      ['tsunami', 2.4, 'world_affairs'], ['pandemija', 2.2, 'world_affairs'], ['državni udar', 2.6, 'world_affairs']
    ],

    // ================================================================ Slovak
    sk: [
      ['idiot', 1.8, 'attack'], ['hlupák', 1.8, 'attack'], ['blbec', 2.0, 'attack'],
      ['kretén', 2.2, 'attack'], ['odpad', 2.0, 'attack'], ['sviňa', 2.4, 'attack'],
      ['nenávisť', 2.0, 'hostility'], ['nenávidím', 2.0, 'hostility'], ['odporný', 2.0, 'hostility'], ['hnusný', 2.0, 'hostility'],
      ['drž hubu', 2.4, 'incitement'], ['vypadni', 2.4, 'incitement'], ['choď do pekla', 2.6, 'incitement'],
      ['zradca', 2.4, 'othering'], ['komunista', 2.0, 'othering'], ['fašista', 2.2, 'othering'],
      ['voľby', 2.2, 'politics'], ['vláda', 2.2, 'politics'], ['prezident', 2.2, 'politics'],
      ['politika', 2.2, 'politics'], ['dane', 2.0, 'politics'],
      ['sprisahanie', 2.4, 'conspiracy'], ['konšpiračná teória', 2.6, 'conspiracy'], ['falošné správy', 2.0, 'conspiracy'],
      ['umelá inteligencia', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['vojna', 2.2, 'world_affairs'], ['invázia', 2.4, 'world_affairs'], ['bombardovanie', 2.6, 'world_affairs'],
      ['raketa', 2.2, 'world_affairs'], ['jadrová vojna', 2.8, 'world_affairs'], ['genocída', 2.6, 'world_affairs'],
      ['terorizmus', 2.4, 'world_affairs'], ['vražda', 2.4, 'world_affairs'], ['zemetrasenie', 2.0, 'world_affairs'],
      ['cunami', 2.4, 'world_affairs'], ['pandémia', 2.2, 'world_affairs'], ['prevrat', 2.6, 'world_affairs']
    ],

    // ================================================================ Lithuanian
    lt: [
      ['idiotas', 1.8, 'attack'], ['kvailys', 1.8, 'attack'], ['durnius', 2.0, 'attack'],
      ['šiukšlė', 2.0, 'attack'], ['parazitas', 2.0, 'attack'],
      ['neapykanta', 2.0, 'hostility'], ['nekenčiu', 2.0, 'hostility'], ['bjauru', 2.0, 'hostility'],
      ['tylek', 2.4, 'incitement'], ['dingk', 2.4, 'incitement'], ['eik po velnių', 2.6, 'incitement'], ['mirk', 3.0, 'incitement'],
      ['išdavikas', 2.4, 'othering'], ['komunistas', 2.0, 'othering'], ['fašistas', 2.2, 'othering'],
      ['rinkimai', 2.2, 'politics'], ['vyriausybė', 2.2, 'politics'], ['prezidentas', 2.2, 'politics'],
      ['politika', 2.2, 'politics'], ['mokesčiai', 2.0, 'politics'],
      ['sąmokslas', 2.4, 'conspiracy'], ['sąmokslo teorija', 2.6, 'conspiracy'], ['melagingos naujienos', 2.0, 'conspiracy'],
      ['dirbtinis intelektas', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['karas', 2.2, 'world_affairs'], ['invazija', 2.4, 'world_affairs'], ['bombardavimas', 2.6, 'world_affairs'],
      ['raketa', 2.2, 'world_affairs'], ['branduolinis karas', 2.8, 'world_affairs'], ['genocidas', 2.6, 'world_affairs'],
      ['terorizmas', 2.4, 'world_affairs'], ['žmogžudystė', 2.4, 'world_affairs'], ['žemės drebėjimas', 2.0, 'world_affairs'],
      ['cunamis', 2.4, 'world_affairs'], ['pandemija', 2.2, 'world_affairs'], ['perversmas', 2.6, 'world_affairs']
    ],

    // ================================================================ Latvian
    lv: [
      ['idiots', 1.8, 'attack'], ['muļķis', 1.8, 'attack'], ['stulbenis', 2.0, 'attack'],
      ['atkritumi', 2.0, 'attack'], ['parazīts', 2.0, 'attack'],
      ['naids', 2.0, 'hostility'], ['ienīstu', 2.0, 'hostility'], ['pretīgi', 2.0, 'hostility'],
      ['klusē', 2.4, 'incitement'], ['pazūdi', 2.4, 'incitement'], ['ej ellē', 2.6, 'incitement'], ['mirsti', 3.0, 'incitement'],
      ['nodevējs', 2.4, 'othering'], ['komunists', 2.0, 'othering'], ['fašists', 2.2, 'othering'],
      ['vēlēšanas', 2.2, 'politics'], ['valdība', 2.2, 'politics'], ['prezidents', 2.2, 'politics'],
      ['politika', 2.2, 'politics'], ['nodokļi', 2.0, 'politics'],
      ['sazvērestība', 2.4, 'conspiracy'], ['sazvērestības teorija', 2.6, 'conspiracy'], ['viltus ziņas', 2.0, 'conspiracy'],
      ['mākslīgais intelekts', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['karš', 2.2, 'world_affairs'], ['iebrukums', 2.4, 'world_affairs'], ['bombardēšana', 2.6, 'world_affairs'],
      ['raķete', 2.2, 'world_affairs'], ['kodolkarš', 2.8, 'world_affairs'], ['genocīds', 2.6, 'world_affairs'],
      ['terorisms', 2.4, 'world_affairs'], ['slepkavība', 2.4, 'world_affairs'], ['zemestrīce', 2.0, 'world_affairs'],
      ['cunami', 2.4, 'world_affairs'], ['pandēmija', 2.2, 'world_affairs'], ['valsts apvērsums', 2.6, 'world_affairs']
    ],

    // ================================================================ Estonian
    et: [
      ['idioot', 1.8, 'attack'], ['loll', 1.6, 'attack'], ['rumal', 1.6, 'attack'],
      ['prügi', 2.0, 'attack'], ['parasiit', 2.0, 'attack'],
      ['vihkamine', 2.0, 'hostility'], ['vihkan', 2.0, 'hostility'], ['vastik', 2.0, 'hostility'],
      ['ole vait', 2.4, 'incitement'], ['kao', 2.4, 'incitement'], ['mine põrgusse', 2.6, 'incitement'], ['sure', 3.0, 'incitement'],
      ['reetur', 2.4, 'othering'], ['kommunist', 2.0, 'othering'], ['fašist', 2.2, 'othering'],
      ['valimised', 2.2, 'politics'], ['valitsus', 2.2, 'politics'], ['president', 2.2, 'politics'],
      ['poliitika', 2.2, 'politics'], ['maksud', 2.0, 'politics'],
      ['vandenõu', 2.4, 'conspiracy'], ['vandenõuteooria', 2.6, 'conspiracy'], ['valeuudised', 2.0, 'conspiracy'],
      ['tehisintellekt', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['sõda', 2.2, 'world_affairs'], ['invasioon', 2.4, 'world_affairs'], ['pommitamine', 2.6, 'world_affairs'],
      ['rakett', 2.2, 'world_affairs'], ['tuumasõda', 2.8, 'world_affairs'], ['genotsiid', 2.6, 'world_affairs'],
      ['terrorism', 2.4, 'world_affairs'], ['mõrv', 2.4, 'world_affairs'], ['maavärin', 2.0, 'world_affairs'],
      ['tsunami', 2.4, 'world_affairs'], ['pandeemia', 2.2, 'world_affairs'], ['riigipööre', 2.6, 'world_affairs']
    ],

    // ================================================================ Catalan
    ca: [
      ['idiota', 1.8, 'attack'], ['imbècil', 2.0, 'attack'], ['estúpid', 1.6, 'attack'],
      ['cretí', 2.2, 'attack'], ['escombraries', 2.0, 'attack'], ['cabró', 2.6, 'attack'],
      ['odi', 1.8, 'hostility'], ['odio', 1.8, 'hostility'], ['fastigós', 2.0, 'hostility'], ['repugnant', 2.0, 'hostility'],
      ['calla', 2.4, 'incitement'], ["ves-te'n", 2.4, 'incitement'], ["vés a l'infern", 2.6, 'incitement'],
      ['traïdor', 2.4, 'othering'], ['comunista', 2.0, 'othering'], ['feixista', 2.2, 'othering'],
      ['eleccions', 2.2, 'politics'], ['govern', 2.2, 'politics'], ['president', 2.2, 'politics'],
      ['política', 2.2, 'politics'], ['impostos', 2.0, 'politics'],
      ['conspiració', 2.4, 'conspiracy'], ['teoria de la conspiració', 2.6, 'conspiracy'], ['notícies falses', 2.0, 'conspiracy'],
      ['intel·ligència artificial', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['guerra', 2.2, 'world_affairs'], ['invasió', 2.4, 'world_affairs'], ['bombardeig', 2.6, 'world_affairs'],
      ['míssil', 2.2, 'world_affairs'], ['guerra nuclear', 2.8, 'world_affairs'], ['genocidi', 2.6, 'world_affairs'],
      ['terrorisme', 2.4, 'world_affairs'], ['assassinat', 2.4, 'world_affairs'], ['terratrèmol', 2.0, 'world_affairs'],
      ['tsunami', 2.4, 'world_affairs'], ['pandèmia', 2.2, 'world_affairs'], ["cop d'estat", 2.6, 'world_affairs']
    ],

    // ================================================================ Swahili
    sw: [
      ['mjinga', 1.8, 'attack'], ['punguani', 2.2, 'attack'], ['mpuuzi', 2.0, 'attack'],
      ['takataka', 2.0, 'attack'], ['malaya', 2.6, 'attack'],
      ['chuki', 2.0, 'hostility'], ['nachukia', 2.0, 'hostility'], ['karaha', 1.8, 'hostility'],
      ['nyamaza', 2.4, 'incitement'], ['ondoka', 2.2, 'incitement'], ['nenda jehanamu', 2.6, 'incitement'], ['kufa', 2.8, 'incitement'],
      ['msaliti', 2.4, 'othering'], ['mkomunisti', 2.0, 'othering'],
      ['uchaguzi', 2.2, 'politics'], ['serikali', 2.2, 'politics'], ['rais', 2.2, 'politics'],
      ['siasa', 2.2, 'politics'], ['kodi', 2.0, 'politics'],
      ['njama', 2.4, 'conspiracy'], ['nadharia ya njama', 2.6, 'conspiracy'], ['habari za uongo', 2.0, 'conspiracy'],
      ['akili bandia', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['vita', 2.2, 'world_affairs'], ['uvamizi', 2.4, 'world_affairs'], ['mashambulizi ya mabomu', 2.6, 'world_affairs'],
      ['kombora', 2.2, 'world_affairs'], ['vita vya nyuklia', 2.8, 'world_affairs'], ['mauaji ya halaiki', 2.6, 'world_affairs'],
      ['ugaidi', 2.4, 'world_affairs'], ['mauaji', 2.4, 'world_affairs'], ['tetemeko la ardhi', 2.0, 'world_affairs'],
      ['tsunami', 2.4, 'world_affairs'], ['janga', 2.2, 'world_affairs'], ['mapinduzi', 2.6, 'world_affairs']
    ],

    // ================================================================ Macedonian
    mk: [
      ['идиот', 1.8, 'attack'], ['глупак', 1.8, 'attack'], ['будала', 1.8, 'attack'],
      ['кретен', 2.2, 'attack'], ['ѓубре', 2.0, 'attack'],
      ['омраза', 2.0, 'hostility'], ['мразам', 2.0, 'hostility'], ['одвратно', 2.0, 'hostility'],
      ['молчи', 2.4, 'incitement'], ['бегај', 2.4, 'incitement'], ['оди по ѓаволите', 2.6, 'incitement'],
      ['предавник', 2.4, 'othering'], ['комунист', 2.0, 'othering'], ['фашист', 2.2, 'othering'],
      ['избори', 2.2, 'politics'], ['влада', 2.2, 'politics'], ['претседател', 2.2, 'politics'],
      ['политика', 2.2, 'politics'], ['даноци', 2.0, 'politics'],
      ['завера', 2.4, 'conspiracy'], ['теорија на завера', 2.6, 'conspiracy'], ['лажни вести', 2.0, 'conspiracy'],
      ['вештачка интелигенција', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['војна', 2.2, 'world_affairs'], ['инвазија', 2.4, 'world_affairs'], ['бомбардирање', 2.6, 'world_affairs'],
      ['ракета', 2.2, 'world_affairs'], ['нуклеарна војна', 2.8, 'world_affairs'], ['геноцид', 2.6, 'world_affairs'],
      ['тероризам', 2.4, 'world_affairs'], ['убиство', 2.4, 'world_affairs'], ['земјотрес', 2.0, 'world_affairs'],
      ['цунами', 2.4, 'world_affairs'], ['пандемија', 2.2, 'world_affairs'], ['преврат', 2.6, 'world_affairs']
    ],

    // ================================================================ Mongolian
    mn: [
      ['тэнэг', 1.8, 'attack'], ['мунхаг', 1.8, 'attack'], ['новш', 2.0, 'attack'], ['хог', 2.0, 'attack'],
      ['хорсол', 2.0, 'hostility'], ['үзэн ядаж', 2.0, 'hostility'], ['жигшүүрт', 2.0, 'hostility'],
      ['чимээгүй', 2.2, 'incitement'], ['зайл', 2.4, 'incitement'], ['там руу яв', 2.6, 'incitement'], ['үх', 2.8, 'incitement'],
      ['урвагч', 2.4, 'othering'], ['коммунист', 2.0, 'othering'], ['фашист', 2.2, 'othering'],
      ['сонгууль', 2.2, 'politics'], ['засгийн газар', 2.2, 'politics'], ['ерөнхийлөгч', 2.2, 'politics'],
      ['улс төр', 2.2, 'politics'], ['татвар', 2.0, 'politics'],
      ['хуйвалдаан', 2.4, 'conspiracy'], ['хуйвалдааны онол', 2.6, 'conspiracy'], ['хуурамч мэдээ', 2.0, 'conspiracy'],
      ['хиймэл оюун ухаан', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['дайн', 2.2, 'world_affairs'], ['довтолгоо', 2.4, 'world_affairs'], ['бөмбөгдөлт', 2.6, 'world_affairs'],
      ['пуужин', 2.2, 'world_affairs'], ['цөмийн дайн', 2.8, 'world_affairs'], ['геноцид', 2.6, 'world_affairs'],
      ['терроризм', 2.4, 'world_affairs'], ['аллага', 2.4, 'world_affairs'], ['газар хөдлөлт', 2.0, 'world_affairs'],
      ['цунами', 2.4, 'world_affairs'], ['халдвар', 2.2, 'world_affairs'], ['төрийн эргэлт', 2.6, 'world_affairs']
    ],

    // ================================================================ Nepali
    ne: [
      ['मूर्ख', 1.8, 'attack'], ['बेवकूफ', 1.8, 'attack'], ['गधा', 2.0, 'attack'],
      ['निकम्मा', 1.8, 'attack'], ['फोहोर', 2.0, 'attack'],
      ['घृणा', 2.0, 'hostility'], ['घिन', 1.8, 'hostility'], ['नराम्रो', 1.6, 'hostility'],
      ['चुप लाग', 2.4, 'incitement'], ['भाग', 2.2, 'incitement'], ['मर', 2.8, 'incitement'],
      ['गद्दार', 2.4, 'othering'], ['देशद्रोही', 2.6, 'othering'], ['आतंकवादी', 2.4, 'othering'],
      ['चुनाव', 2.2, 'politics'], ['सरकार', 2.2, 'politics'], ['प्रधानमन्त्री', 2.2, 'politics'],
      ['राजनीति', 2.2, 'politics'],
      ['षड्यन्त्र', 2.4, 'conspiracy'], ['षड्यन्त्र सिद्धान्त', 2.6, 'conspiracy'], ['झुटो समाचार', 2.0, 'conspiracy'],
      ['कृत्रिम बुद्धिमत्ता', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['युद्ध', 2.2, 'world_affairs'], ['आक्रमण', 2.4, 'world_affairs'], ['बमबारी', 2.6, 'world_affairs'],
      ['मिसाइल', 2.2, 'world_affairs'], ['आणविक युद्ध', 2.8, 'world_affairs'], ['नरसंहार', 2.6, 'world_affairs'],
      ['आतंकवाद', 2.4, 'world_affairs'], ['हत्या', 2.4, 'world_affairs'], ['भूकम्प', 2.0, 'world_affairs'],
      ['सुनामी', 2.4, 'world_affairs'], ['महामारी', 2.2, 'world_affairs'], ['विद्रोह', 2.6, 'world_affairs']
    ],

    // ================================================================ Sinhala
    si: [
      ['මෝඩයා', 1.8, 'attack'], ['ගොනා', 2.0, 'attack'], ['නිවට', 1.8, 'attack'], ['කුණු', 2.0, 'attack'],
      ['වෛරය', 2.0, 'hostility'], ['පිළිකුල', 2.0, 'hostility'], ['දුක', 1.2, 'hostility'],
      ['හිටපන්', 2.4, 'incitement'], ['යන්න', 2.0, 'incitement'], ['මැරෙන්න', 2.8, 'incitement'],
      ['ද්‍රෝහියා', 2.4, 'othering'], ['ත්‍රස්තවාදී', 2.4, 'othering'],
      ['මැතිවරණය', 2.2, 'politics'], ['රජය', 2.2, 'politics'], ['ජනාධිපති', 2.2, 'politics'],
      ['දේශපාලනය', 2.2, 'politics'], ['බදු', 2.0, 'politics'],
      ['කුමන්ත්‍රණය', 2.4, 'conspiracy'], ['කුමන්ත්‍රණ න්‍යාය', 2.6, 'conspiracy'], ['බොරු ප්‍රවෘත්ති', 2.0, 'conspiracy'],
      ['කෘත්‍රිම බුද්ධිය', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
      ['යුද්ධය', 2.2, 'world_affairs'], ['ආක්‍රමණය', 2.4, 'world_affairs'], ['බෝම්බ', 2.6, 'world_affairs'],
      ['මිසයිල', 2.2, 'world_affairs'], ['න්‍යෂ්ටික යුද්ධය', 2.8, 'world_affairs'], ['සමූලඝාතනය', 2.6, 'world_affairs'],
      ['ත්‍රස්තවාදය', 2.4, 'world_affairs'], ['ඝාතනය', 2.4, 'world_affairs'], ['භූමිකම්පාව', 2.0, 'world_affairs'],
      ['සුනාමි', 2.4, 'world_affairs'], ['වසංගතය', 2.2, 'world_affairs'], ['කැරලි', 2.6, 'world_affairs']
    ]
  };
});


/* ===== src/lib/lang/ja.js ===== */

/**
 * 日本語パック（既定言語）。
 * 辞書本体は既存の lexicon.js（curated + MosasoM/ MIT + topics）を使う。
 * 否定は語尾（〜ない）、引用は「」、文型は日本語の正規表現。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../lexicon.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langJa = factory(JOF.lexicon);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (lexicon) {
  'use strict';

  return {
    id: 'ja',
    name: '日本語',
    match: 'substring',
    TERMS: lexicon.TERMS,
    BY_FIRST: lexicon.BY_FIRST,
    BY_WORD: new Map(),
    EXCLUDE_AFTER: lexicon.EXCLUDE_AFTER,
    patterns: lexicon.PATTERNS,
    negation: {
      position: 'after',
      unit: 'char',
      markers: [
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
      ]
    },
    report: ['という', 'と言う', 'とか', 'らしい', 'みたい', 'って', 'との', 'だと', 'そうだ', 'だって'],
    quoteChars: { open: '「『“"', close: '」』”"' },
    emphasis: { caps: false }
  };
});


/* ===== src/lib/lang/en.js ===== */

/**
 * 英語パック。
 * - 罵倒語の大量リスト: LDNOOBW en（CC-BY-4.0）→ カテゴリ badwords（既定OFF）
 * - 義憤・話題の語: 本拡張の作者が作成（MIT）
 * - 照合は「単語境界」（class の中の ass を拾わない）
 * - 否定は前置（not / don't / never ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'), require('./data/ldnoobw.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langEn = factory(JOF.langBuild, JOF.ldnoobw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build, ldnoobw) {
  'use strict';

  var CURATED = [
    // attack
    ['idiot', 1.8, 'attack'], ['moron', 2.0, 'attack'], ['imbecile', 2.2, 'attack'],
    ['dumbass', 2.2, 'attack'], ['jackass', 2.2, 'attack'], ['asshole', 2.4, 'attack'],
    ['bastard', 2.2, 'attack'], ['scumbag', 2.6, 'attack'], ['piece of shit', 2.8, 'attack'],
    ['loser', 1.6, 'attack'], ['worthless', 1.8, 'attack'], ['pathetic', 1.8, 'attack'],
    ['useless', 1.6, 'attack'], ['garbage', 2.0, 'attack'], ['trash', 2.0, 'attack'],
    ['scum', 2.4, 'attack'], ['vermin', 2.4, 'attack'], ['cockroach', 2.2, 'attack'],
    ['clown', 1.2, 'attack'], ['buffoon', 1.6, 'attack'], ['fool', 1.4, 'attack'],
    ['douchebag', 2.4, 'attack'], ['dirtbag', 2.2, 'attack'], ['lowlife', 2.0, 'attack'],
    ['freak', 1.6, 'attack'], ['creep', 1.6, 'attack'], ['coward', 1.8, 'attack'],
    ['traitor', 2.4, 'attack'], ['hypocrite', 1.8, 'attack'], ['liar', 1.6, 'attack'],
    ['fraud', 1.6, 'attack'], ['charlatan', 1.8, 'attack'], ['incompetent', 1.8, 'attack'],
    ['brainless', 2.0, 'attack'], ['brain-dead', 2.2, 'attack'], ['subhuman', 2.8, 'attack'],
    ['savage', 1.6, 'attack'], ['retard', 2.6, 'attack'], ['moronic', 2.0, 'attack'],
    ['dumb', 1.4, 'attack'], ['stupid', 1.6, 'attack'], ['idiotic', 1.8, 'attack'],
    ['halfwit', 1.8, 'attack'], ['dimwit', 1.8, 'attack'], ['simpleton', 1.6, 'attack'],
    ['you are an idiot', 2.4, 'attack'],
    // hostility
    ['hate', 1.6, 'hostility'], ['hatred', 1.8, 'hostility'], ['despise', 1.8, 'hostility'],
    ['disgust', 1.8, 'hostility'], ['disgusting', 2.0, 'hostility'], ['revolting', 2.0, 'hostility'],
    ['repulsive', 2.0, 'hostility'], ['loathe', 1.8, 'hostility'], ['detest', 1.8, 'hostility'],
    ['abhor', 1.8, 'hostility'], ['contempt', 1.6, 'hostility'], ['despicable', 2.2, 'hostility'],
    ['vile', 2.2, 'hostility'], ['unforgivable', 2.2, 'hostility', 'noNeg'], ['inexcusable', 2.0, 'hostility'],
    ['outrageous', 1.6, 'hostility'], ['appalling', 1.8, 'hostility'], ['atrocious', 2.0, 'hostility'],
    ['sickening', 2.0, 'hostility'], ['hateful', 2.0, 'hostility'], ['evil', 1.8, 'hostility'],
    ['wicked', 1.8, 'hostility'], ['disgraceful', 1.8, 'hostility'], ['shameful', 1.8, 'hostility'],
    ['shameless', 1.8, 'hostility'], ['unacceptable', 1.6, 'hostility'], ['i hate', 2.0, 'hostility'],
    ['sick of', 1.8, 'hostility'],
    // incitement
    ['shut up', 2.2, 'incitement'], ['get lost', 2.0, 'incitement'], ['go away', 1.6, 'incitement'],
    ['boycott', 1.6, 'incitement'], ['expose them', 2.0, 'incitement'], ['dox', 2.4, 'incitement'],
    ['destroy them', 2.2, 'incitement'], ['lock them up', 1.8, 'incitement'], ['deport them', 2.0, 'incitement'],
    ['shame them', 2.0, 'incitement'], ['call them out', 1.4, 'incitement'], ['cancel them', 1.6, 'incitement'],
    // absolute
    ['absolutely', 0.8, 'absolute'], ['definitely', 0.5, 'absolute'], ['everyone', 0.3, 'absolute'],
    ['nobody', 0.3, 'absolute'], ['100%', 0.7, 'absolute'], ['obviously', 0.4, 'absolute'],
    ['no doubt', 0.8, 'absolute'], ['without question', 0.8, 'absolute'], ['undeniably', 0.8, 'absolute'],
    ['impossible', 1.0, 'absolute'], ['i will never', 1.2, 'absolute'], ['never forgive', 2.0, 'absolute', 'noNeg'],
    // othering
    ['cult', 1.2, 'othering'], ['sheeple', 2.0, 'othering'], ['brainwashed', 1.8, 'othering'],
    ['puppet', 1.4, 'othering'], ['shill', 1.8, 'othering'], ['unpatriotic', 1.8, 'othering'],
    ['enemy of the people', 2.6, 'othering'], ['fake news', 2.0, 'othering'], ['globalist', 2.2, 'othering'],
    ['elitist', 1.6, 'othering'], ['sheep', 1.2, 'othering'], ['npc', 1.4, 'othering'],
    ['you people', 1.4, 'othering'],
    // cynicism
    ['whatever', 1.0, 'cynicism'], ['cry more', 2.0, 'cynicism'], ['cope', 1.6, 'cynicism'],
    ['seethe', 1.8, 'cynicism'], ['triggered', 1.4, 'cynicism'], ['snowflake', 1.8, 'cynicism'],
    ['ok boomer', 1.6, 'cynicism'], ['yeah right', 1.4, 'cynicism'], ['serves you right', 2.0, 'cynicism'],
    // urgency
    ['breaking', 0.8, 'urgency'], ['urgent', 1.0, 'urgency'], ['wake up', 1.4, 'urgency'],
    ['share this', 1.0, 'urgency'], ['spread the word', 1.2, 'urgency'],
    ["they don't want you to know", 2.4, 'urgency'], ["before it's too late", 1.8, 'urgency'],
    ['end of the world', 1.8, 'urgency'], ['total collapse', 1.6, 'urgency'],
    // politics
    ['election', 2.2, 'politics'], ['vote', 2.0, 'politics'], ['voters', 2.0, 'politics'],
    ['president', 2.2, 'politics'], ['prime minister', 2.2, 'politics'], ['parliament', 2.2, 'politics'],
    ['congress', 2.2, 'politics'], ['senate', 2.2, 'politics'], ['government', 2.2, 'politics'],
    ['politician', 2.2, 'politics'], ['political', 2.2, 'politics'], ['democrat', 2.2, 'politics'],
    ['republican', 2.2, 'politics'], ['liberal', 2.0, 'politics'], ['conservative', 2.0, 'politics'],
    ['leftist', 2.0, 'politics'], ['right-wing', 2.0, 'politics'], ['left-wing', 2.0, 'politics'],
    ['taxes', 2.0, 'politics'], ['immigration', 2.0, 'politics'], ['brexit', 2.2, 'politics'],
    // conspiracy
    ['conspiracy', 2.4, 'conspiracy'], ['conspiracy theory', 2.6, 'conspiracy'], ['deep state', 2.6, 'conspiracy'],
    ['new world order', 2.6, 'conspiracy'], ['great reset', 2.6, 'conspiracy'], ['false flag', 2.6, 'conspiracy'],
    ['plandemic', 2.6, 'conspiracy'], ['chemtrails', 2.6, 'conspiracy'], ['illuminati', 2.6, 'conspiracy'],
    ['population control', 2.6, 'conspiracy'], ["they're hiding", 2.4, 'conspiracy'],
    ['do your research', 2.0, 'conspiracy'], ['crisis actor', 2.6, 'conspiracy'], ['agenda 2030', 2.6, 'conspiracy'],
    // ai_dispute
    ['artificial intelligence', 2.2, 'ai_dispute'], ['generative ai', 2.2, 'ai_dispute'],
    ['chatgpt', 2.2, 'ai_dispute'], ['openai', 2.2, 'ai_dispute'], ['deepfake', 2.2, 'ai_dispute'],
    ['ai regulation', 2.2, 'ai_dispute'], ['ai censorship', 2.2, 'ai_dispute'], ['anti-ai', 2.2, 'ai_dispute'],
    ['large language model', 2.2, 'ai_dispute'], ['singularity', 2.4, 'ai_dispute'],
    ['ai takeover', 2.6, 'ai_dispute'], ['ai apocalypse', 2.6, 'ai_dispute'], ['ai bubble', 2.4, 'ai_dispute'],
    ['ai will replace', 2.6, 'ai_dispute'], ['agi', 2.2, 'ai_dispute'],
    // world_affairs
    ['war', 2.2, 'world_affairs'], ['invasion', 2.4, 'world_affairs'], ['missile', 2.2, 'world_affairs'],
    ['airstrike', 2.6, 'world_affairs'], ['bombing', 2.6, 'world_affairs'], ['bombardment', 2.6, 'world_affairs'],
    ['genocide', 2.6, 'world_affairs'], ['massacre', 2.6, 'world_affairs'], ['terrorist', 2.4, 'world_affairs'],
    ['terror attack', 2.6, 'world_affairs'], ['mass shooting', 2.6, 'world_affairs'], ['murder', 2.4, 'world_affairs'],
    ['death toll', 2.2, 'world_affairs'], ['casualties', 2.2, 'world_affairs'], ['corpse', 2.4, 'world_affairs'],
    ['nuclear war', 2.8, 'world_affairs'], ['world war 3', 2.8, 'world_affairs'], ['ww3', 2.6, 'world_affairs'],
    ['coup', 2.6, 'world_affairs'], ['martial law', 2.6, 'world_affairs'], ['refugee', 2.0, 'world_affairs'],
    ['famine', 2.0, 'world_affairs'], ['earthquake', 2.0, 'world_affairs'], ['tsunami', 2.4, 'world_affairs'],
    ['pandemic', 2.2, 'world_affairs'], ['market crash', 2.2, 'world_affairs']
  ];

  var BAD = (ldnoobw.en || []).map(function (w) {
    return [w, 2.4, 'badwords'];
  });

  var lex = build.build(BAD.concat(CURATED), { match: 'word' });

  var PATTERNS = [
    { id: 'shutup', label: 'shut up', cat: 'incitement', w: 1.4, re: /\b(shut up|fuck off|go to hell|get lost|screw you|piss off)\b/g },
    { id: 'mustbestopped', label: 'should be stopped', cat: 'incitement', w: 1.6, re: /\b(should|must|has to|have to) be (stopped|banned|arrested|jailed|deported|destroyed|removed)\b/g },
    { id: 'wakeup', label: 'wake up', cat: 'urgency', w: 1.2, re: /\b(wake up|do your research|spread the word)\b/g },
    { id: 'allofthem', label: 'all of them', cat: 'absolute', w: 0.8, re: /\b(all of them|every single|none of them|all of you)\b/g },
    { id: 'youpeople', label: 'you people', cat: 'othering', w: 1.2, re: /\b(you people|these people|those people|people like you)\b/g }
  ];

  return {
    id: 'en',
    name: 'English',
    match: 'word',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: PATTERNS,
    negation: {
      position: 'before',
      unit: 'token',
      markers: [
        'not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nor', 'without',
        'hardly', 'barely', "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't",
        "weren't", "can't", 'cannot', "won't", "wouldn't", "shouldn't", "couldn't", "ain't"
      ],
      suffix: "n't"
    },
    report: ['said', 'says', 'reported', 'allegedly', 'according', 'claimed'],
    quoteChars: { open: '\u201c"', close: '\u201d"' },
    emphasis: { caps: true }
  };
});


/* ===== src/lib/lang/zh.js ===== */

/**
 * 中国語（簡体）パック。
 * - 罵倒語: LDNOOBW zh（CC-BY-4.0）→ badwords（既定OFF）
 * - 義憤・話題: 作者作成（MIT）
 * - 照合は部分一致（分かち書きしない）
 * - 否定は前置（不 / 没 / 别 / 无 ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'), require('./data/ldnoobw.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langZh = factory(JOF.langBuild, JOF.ldnoobw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build, ldnoobw) {
  'use strict';

  var CURATED = [
    // attack
    ['白痴', 2.4, 'attack'], ['脑残', 2.6, 'attack'], ['脑瘫', 2.6, 'attack'],
    ['智障', 2.6, 'attack'], ['弱智', 2.4, 'attack'], ['傻逼', 2.8, 'attack'],
    ['蠢货', 2.2, 'attack'], ['废物', 2.2, 'attack'], ['垃圾', 2.0, 'attack'],
    ['人渣', 2.6, 'attack'], ['渣滓', 2.4, 'attack'], ['畜生', 2.4, 'attack'],
    ['混蛋', 2.2, 'attack'], ['王八蛋', 2.2, 'attack'], ['贱人', 2.4, 'attack'],
    ['贱货', 2.6, 'attack'], ['杂种', 2.6, 'attack'], ['傻狗', 2.6, 'attack'],
    ['二货', 1.8, 'attack'], ['二百五', 1.8, 'attack'], ['没脑子', 1.8, 'attack'],
    ['无耻', 1.8, 'attack'], ['不要脸', 2.0, 'attack'], ['无知', 1.4, 'attack'],
    // hostility
    ['恶心', 1.8, 'hostility'], ['厌恶', 1.6, 'hostility'], ['憎恨', 2.0, 'hostility'],
    ['仇恨', 2.2, 'hostility'], ['可恨', 2.0, 'hostility'], ['该死', 2.4, 'hostility'],
    ['可恶', 1.8, 'hostility'], ['气愤', 1.6, 'hostility'], ['愤怒', 1.6, 'hostility'],
    ['不可原谅', 2.2, 'hostility', 'noNeg'], ['无法原谅', 2.2, 'hostility', 'noNeg'],
    ['令人作呕', 2.2, 'hostility'], ['令人发指', 2.2, 'hostility'], ['忍无可忍', 2.0, 'hostility'],
    // incitement
    ['闭嘴', 2.2, 'incitement'], ['滚出去', 2.4, 'incitement'], ['去死', 3.0, 'incitement'],
    ['打死', 2.8, 'incitement'], ['封杀', 2.0, 'incitement'], ['抵制', 1.6, 'incitement'],
    ['曝光', 2.0, 'incitement'], ['人肉', 2.4, 'incitement'], ['网暴', 2.4, 'incitement'],
    ['打倒', 2.2, 'incitement'], ['举报他', 1.8, 'incitement'],
    // absolute
    ['绝对', 0.9, 'absolute'], ['必须', 0.7, 'absolute'], ['肯定', 0.5, 'absolute'],
    ['百分百', 0.7, 'absolute'], ['毫无疑问', 0.8, 'absolute'], ['显然', 0.5, 'absolute'],
    ['完全', 0.6, 'absolute'], ['绝不', 1.0, 'absolute'], ['从来不', 0.8, 'absolute'],
    // othering
    ['洋奴', 2.4, 'othering'], ['汉奸', 2.6, 'othering'], ['卖国贼', 2.6, 'othering'],
    ['走狗', 2.4, 'othering'], ['舔狗', 2.0, 'othering'], ['水军', 2.0, 'othering'],
    ['五毛', 2.0, 'othering'], ['美分', 2.0, 'othering'], ['圣母', 1.6, 'othering'],
    ['键盘侠', 1.6, 'othering'], ['小粉红', 2.0, 'othering'], ['战狼', 1.6, 'othering'],
    // cynicism
    ['呵呵', 1.2, 'cynicism'], ['笑死', 1.0, 'cynicism'], ['活该', 2.0, 'cynicism'],
    ['自作自受', 1.6, 'cynicism'], ['报应', 1.6, 'cynicism'], ['就这', 1.2, 'cynicism'],
    // urgency
    ['紧急', 1.0, 'urgency'], ['速转', 1.0, 'urgency'], ['扩散', 1.0, 'urgency'],
    ['世界末日', 1.8, 'urgency'], ['崩盘', 1.4, 'urgency'], ['经济危机', 1.6, 'urgency'],
    ['来不及了', 1.6, 'urgency'],
    // politics
    ['选举', 2.2, 'politics'], ['投票', 2.0, 'politics'], ['政府', 2.2, 'politics'],
    ['总统', 2.2, 'politics'], ['议会', 2.2, 'politics'], ['执政党', 2.2, 'politics'],
    ['在野党', 2.2, 'politics'], ['官员', 2.0, 'politics'], ['税收', 2.0, 'politics'],
    ['政治', 2.2, 'politics'], ['政党', 2.2, 'politics'],
    // conspiracy
    ['阴谋', 2.4, 'conspiracy'], ['阴谋论', 2.6, 'conspiracy'], ['深层政府', 2.6, 'conspiracy'],
    ['新世界秩序', 2.6, 'conspiracy'], ['共济会', 2.6, 'conspiracy'], ['光明会', 2.6, 'conspiracy'],
    ['罗斯柴尔德', 2.6, 'conspiracy'], ['人口减少', 2.6, 'conspiracy'], ['幕后黑手', 2.4, 'conspiracy'],
    ['信息操控', 2.2, 'conspiracy'], ['假新闻', 2.0, 'conspiracy'],
    // ai_dispute
    ['人工智能', 2.2, 'ai_dispute'], ['生成式ai', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
    ['openai', 2.2, 'ai_dispute'], ['深度伪造', 2.2, 'ai_dispute'], ['通用人工智能', 2.4, 'ai_dispute'],
    ['奇点', 2.4, 'ai_dispute'], ['ai威胁', 2.6, 'ai_dispute'], ['ai失业', 2.6, 'ai_dispute'],
    ['ai取代', 2.6, 'ai_dispute'],
    // world_affairs
    ['战争', 2.4, 'world_affairs'], ['开战', 2.6, 'world_affairs'], ['入侵', 2.4, 'world_affairs'],
    ['空袭', 2.6, 'world_affairs'], ['轰炸', 2.6, 'world_affairs'], ['导弹', 2.2, 'world_affairs'],
    ['核战争', 2.8, 'world_affairs'], ['种族灭绝', 2.6, 'world_affairs'], ['屠杀', 2.6, 'world_affairs'],
    ['恐怖袭击', 2.6, 'world_affairs'], ['恐怖分子', 2.4, 'world_affairs'], ['枪击', 2.4, 'world_affairs'],
    ['地震', 2.0, 'world_affairs'], ['海啸', 2.4, 'world_affairs'], ['疫情', 2.0, 'world_affairs'],
    ['政变', 2.6, 'world_affairs'], ['戒严', 2.6, 'world_affairs'], ['难民', 2.0, 'world_affairs']
  ];

  var BAD = (ldnoobw.zh || []).map(function (w) {
    return [w, 2.4, 'badwords'];
  });

  var lex = build.build(BAD.concat(CURATED), { match: 'substring' });

  return {
    id: 'zh',
    name: '中文（简体）',
    match: 'substring',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'char',
      markers: ['不', '没', '没有', '别', '无', '未', '非', '莫', '甭', '不是']
    },
    report: ['说', '表示', '报道', '称', '据说', '据称'],
    quoteChars: { open: '「『“"', close: '」』”"' },
    emphasis: { caps: false }
  };
});


/* ===== src/lib/lang/zh_hant.js ===== */

/**
 * 中国語（繁体字 / 繁體）パック。
 * 簡体字とは文字が異なるため専用の語彙が必要（例: 战争→戰爭, 说吧→說吧）。
 * LDNOOBW には繁体字リストが無いため、罵倒語(badwords)も作者作成。
 * - 照合は部分一致 / 否定は前置（不 / 沒 / 別 ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langZhHant = factory(JOF.langBuild);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build) {
  'use strict';

  var CURATED = [
    // attack
    ['白癡', 2.4, 'attack'], ['腦殘', 2.6, 'attack'], ['腦癱', 2.6, 'attack'],
    ['智障', 2.6, 'attack'], ['弱智', 2.4, 'attack'], ['傻逼', 2.8, 'attack'],
    ['蠢貨', 2.2, 'attack'], ['廢物', 2.2, 'attack'], ['垃圾', 2.0, 'attack'],
    ['人渣', 2.6, 'attack'], ['渣滓', 2.4, 'attack'], ['畜生', 2.4, 'attack'],
    ['混蛋', 2.2, 'attack'], ['王八蛋', 2.2, 'attack'], ['賤人', 2.4, 'attack'],
    ['賤貨', 2.6, 'attack'], ['雜種', 2.6, 'attack'], ['傻狗', 2.6, 'attack'],
    ['二貨', 1.8, 'attack'], ['二百五', 1.8, 'attack'], ['沒腦子', 1.8, 'attack'],
    ['無恥', 1.8, 'attack'], ['不要臉', 2.0, 'attack'], ['無知', 1.4, 'attack'],
    // hostility
    ['噁心', 1.8, 'hostility'], ['厭惡', 1.6, 'hostility'], ['憎恨', 2.0, 'hostility'],
    ['仇恨', 2.2, 'hostility'], ['可恨', 2.0, 'hostility'], ['該死', 2.4, 'hostility'],
    ['可惡', 1.8, 'hostility'], ['氣憤', 1.6, 'hostility'], ['憤怒', 1.6, 'hostility'],
    ['不可原諒', 2.2, 'hostility', 'noNeg'], ['無法原諒', 2.2, 'hostility', 'noNeg'],
    ['令人作嘔', 2.2, 'hostility'], ['令人髮指', 2.2, 'hostility'], ['忍無可忍', 2.0, 'hostility'],
    // incitement
    ['閉嘴', 2.2, 'incitement'], ['滾出去', 2.4, 'incitement'], ['去死', 3.0, 'incitement'],
    ['打死', 2.8, 'incitement'], ['封殺', 2.0, 'incitement'], ['抵制', 1.6, 'incitement'],
    ['曝光', 2.0, 'incitement'], ['人肉', 2.4, 'incitement'], ['網暴', 2.4, 'incitement'],
    ['打倒', 2.2, 'incitement'], ['舉報他', 1.8, 'incitement'],
    // absolute
    ['絕對', 0.9, 'absolute'], ['必須', 0.7, 'absolute'], ['肯定', 0.5, 'absolute'],
    ['百分百', 0.7, 'absolute'], ['毫無疑問', 0.8, 'absolute'], ['顯然', 0.5, 'absolute'],
    ['完全', 0.6, 'absolute'], ['絕不', 1.0, 'absolute'], ['從來不', 0.8, 'absolute'],
    // othering
    ['洋奴', 2.4, 'othering'], ['漢奸', 2.6, 'othering'], ['賣國賊', 2.6, 'othering'],
    ['走狗', 2.4, 'othering'], ['舔狗', 2.0, 'othering'], ['水軍', 2.0, 'othering'],
    ['五毛', 2.0, 'othering'], ['美分', 2.0, 'othering'], ['聖母', 1.6, 'othering'],
    ['鍵盤俠', 1.6, 'othering'], ['小粉紅', 2.0, 'othering'], ['戰狼', 1.6, 'othering'],
    // cynicism
    ['呵呵', 1.2, 'cynicism'], ['笑死', 1.0, 'cynicism'], ['活該', 2.0, 'cynicism'],
    ['自作自受', 1.6, 'cynicism'], ['報應', 1.6, 'cynicism'], ['就這', 1.2, 'cynicism'],
    // urgency
    ['緊急', 1.0, 'urgency'], ['速轉', 1.0, 'urgency'], ['擴散', 1.0, 'urgency'],
    ['世界末日', 1.8, 'urgency'], ['崩盤', 1.4, 'urgency'], ['經濟危機', 1.6, 'urgency'],
    ['來不及了', 1.6, 'urgency'],
    // politics
    ['選舉', 2.2, 'politics'], ['投票', 2.0, 'politics'], ['政府', 2.2, 'politics'],
    ['總統', 2.2, 'politics'], ['議會', 2.2, 'politics'], ['執政黨', 2.2, 'politics'],
    ['在野黨', 2.2, 'politics'], ['官員', 2.0, 'politics'], ['稅收', 2.0, 'politics'],
    ['政治', 2.2, 'politics'], ['政黨', 2.2, 'politics'],
    // conspiracy
    ['陰謀', 2.4, 'conspiracy'], ['陰謀論', 2.6, 'conspiracy'], ['深層政府', 2.6, 'conspiracy'],
    ['新世界秩序', 2.6, 'conspiracy'], ['共濟會', 2.6, 'conspiracy'], ['光明會', 2.6, 'conspiracy'],
    ['羅斯柴爾德', 2.6, 'conspiracy'], ['人口減少', 2.6, 'conspiracy'], ['幕後黑手', 2.4, 'conspiracy'],
    ['信息操控', 2.2, 'conspiracy'], ['假新聞', 2.0, 'conspiracy'],
    // ai_dispute
    ['人工智能', 2.2, 'ai_dispute'], ['生成式ai', 2.2, 'ai_dispute'], ['chatgpt', 2.2, 'ai_dispute'],
    ['openai', 2.2, 'ai_dispute'], ['深度偽造', 2.2, 'ai_dispute'], ['通用人工智能', 2.4, 'ai_dispute'],
    ['奇點', 2.4, 'ai_dispute'], ['ai威脅', 2.6, 'ai_dispute'], ['ai失業', 2.6, 'ai_dispute'],
    ['ai取代', 2.6, 'ai_dispute'],
    // world_affairs
    ['戰爭', 2.4, 'world_affairs'], ['開戰', 2.6, 'world_affairs'], ['入侵', 2.4, 'world_affairs'],
    ['空襲', 2.6, 'world_affairs'], ['轟炸', 2.6, 'world_affairs'], ['導彈', 2.2, 'world_affairs'],
    ['核戰爭', 2.8, 'world_affairs'], ['種族滅絕', 2.6, 'world_affairs'], ['屠殺', 2.6, 'world_affairs'],
    ['恐怖襲擊', 2.6, 'world_affairs'], ['恐怖分子', 2.4, 'world_affairs'], ['槍擊', 2.4, 'world_affairs'],
    ['地震', 2.0, 'world_affairs'], ['海嘯', 2.4, 'world_affairs'], ['疫情', 2.0, 'world_affairs'],
    ['政變', 2.6, 'world_affairs'], ['戒嚴', 2.6, 'world_affairs'], ['難民', 2.0, 'world_affairs']
  ];

  // 繁体字の罵倒語（作者作成, MIT）
  var BAD = [
    ['幹你娘', 2.8, 'badwords'], ['操你媽', 2.8, 'badwords'], ['他媽的', 2.4, 'badwords'],
    ['傻屄', 2.8, 'badwords'], ['婊子', 2.6, 'badwords'], ['妓女', 2.4, 'badwords'],
    ['雜種', 2.6, 'badwords'], ['廢物', 2.2, 'badwords'], ['白癡', 2.4, 'badwords'],
    ['智障', 2.6, 'badwords'], ['腦殘', 2.6, 'badwords'], ['混蛋', 2.2, 'badwords'],
    ['靠北', 2.0, 'badwords'], ['雞巴', 2.6, 'badwords'], ['屌', 1.8, 'badwords'],
    ['屄', 2.6, 'badwords'], ['幹', 1.8, 'badwords'], ['肏', 2.8, 'badwords'],
    ['三小', 1.8, 'badwords'], ['白爛', 1.8, 'badwords'], ['死開', 2.4, 'badwords'],
    ['滾', 2.0, 'badwords'], ['王八蛋', 2.2, 'badwords'], ['賤貨', 2.6, 'badwords'],
    ['狗東西', 2.4, 'badwords'], ['畜生', 2.4, 'badwords']
  ];

  var lex = build.build(CURATED.concat(BAD), { match: 'substring' });

  return {
    id: 'zh_hant',
    name: '中文（繁體）',
    match: 'substring',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'char',
      markers: ['不', '沒', '沒有', '別', '無', '未', '非', '莫', '甭', '不是']
    },
    report: ['說', '表示', '報導', '稱', '據說', '據稱'],
    quoteChars: { open: '「『“"', close: '」』”"' },
    emphasis: { caps: false }
  };
});


/* ===== src/lib/lang/ko.js ===== */

/**
 * 韓国語パック。
 * - 罵倒語: LDNOOBW ko（CC-BY-4.0）→ badwords（既定OFF）
 * - 義憤・話題: 作者作成（MIT）
 * - 照合は部分一致（ハングルは分かち書きが曖昧）
 * - 否定は前置（못 / 아니 / 없 ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'), require('./data/ldnoobw.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langKo = factory(JOF.langBuild, JOF.ldnoobw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build, ldnoobw) {
  'use strict';

  var CURATED = [
    // attack
    ['병신', 2.8, 'attack'], ['개새끼', 2.8, 'attack'], ['멍청이', 2.0, 'attack'],
    ['바보', 1.6, 'attack'], ['머저리', 2.0, 'attack'], ['쓰레기', 2.2, 'attack'],
    ['인간쓰레기', 2.8, 'attack'], ['한심하다', 1.8, 'attack'], ['무능', 1.8, 'attack'],
    ['쓸모없다', 1.8, 'attack'], ['저능아', 2.6, 'attack'], ['정신병자', 2.4, 'attack'],
    ['미친놈', 2.4, 'attack'], ['돌아이', 2.2, 'attack'], ['벌레', 2.0, 'attack'],
    ['기생충', 2.2, 'attack'], ['사기꾼', 2.0, 'attack'], ['거짓말쟁이', 1.6, 'attack'],
    // hostility
    ['혐오', 2.0, 'hostility'], ['증오', 2.2, 'hostility'], ['분노', 1.6, 'hostility'],
    ['짜증', 1.4, 'hostility'], ['역겹다', 2.0, 'hostility'], ['구역질', 2.0, 'hostility'],
    ['용서할 수 없다', 2.2, 'hostility', 'noNeg'], ['용서 못해', 2.2, 'hostility', 'noNeg'],
    ['화난다', 1.4, 'hostility'],
    // incitement
    ['닥쳐', 2.4, 'incitement'], ['꺼져', 2.4, 'incitement'], ['죽어', 3.0, 'incitement'],
    ['신고해', 1.6, 'incitement'], ['고발', 1.8, 'incitement'], ['차단', 1.6, 'incitement'],
    ['불매', 1.6, 'incitement'], ['사과해', 1.8, 'incitement'], ['사퇴해', 1.8, 'incitement'],
    // absolute
    ['절대', 0.9, 'absolute'], ['반드시', 0.6, 'absolute'], ['무조건', 0.7, 'absolute'],
    ['절대로', 0.9, 'absolute'], ['전혀', 0.6, 'absolute'],
    // othering
    ['빨갱이', 2.4, 'othering'], ['매국노', 2.6, 'othering'], ['토착왜구', 2.6, 'othering'],
    ['일베', 1.8, 'othering'], ['한남', 1.8, 'othering'], ['김치녀', 2.2, 'othering'],
    ['틀딱', 1.8, 'othering'], ['페미', 1.6, 'othering'],
    // cynicism
    ['꼴좋다', 2.0, 'cynicism'], ['자업자득', 1.6, 'cynicism'], ['인과응보', 1.6, 'cynicism'],
    // urgency
    ['긴급', 1.0, 'urgency'], ['속보', 0.8, 'urgency'], ['확산', 1.0, 'urgency'],
    ['공유해', 1.0, 'urgency'], ['세계 종말', 1.8, 'urgency'], ['망한다', 1.4, 'urgency'],
    // politics
    ['선거', 2.2, 'politics'], ['투표', 2.0, 'politics'], ['정부', 2.2, 'politics'],
    ['대통령', 2.2, 'politics'], ['국회', 2.2, 'politics'], ['정치', 2.2, 'politics'],
    ['정당', 2.2, 'politics'], ['여당', 2.2, 'politics'], ['야당', 2.2, 'politics'],
    ['세금', 2.0, 'politics'], ['이민', 2.0, 'politics'],
    // conspiracy
    ['음모', 2.4, 'conspiracy'], ['음모론', 2.6, 'conspiracy'], ['딥스테이트', 2.6, 'conspiracy'],
    ['세계정부', 2.6, 'conspiracy'], ['프리메이슨', 2.6, 'conspiracy'], ['일루미나티', 2.6, 'conspiracy'],
    ['신세계질서', 2.6, 'conspiracy'], ['가짜뉴스', 2.0, 'conspiracy'],
    // ai_dispute
    ['인공지능', 2.2, 'ai_dispute'], ['생성ai', 2.2, 'ai_dispute'], ['챗gpt', 2.2, 'ai_dispute'],
    ['오픈ai', 2.2, 'ai_dispute'], ['특이점', 2.4, 'ai_dispute'], ['ai위협', 2.6, 'ai_dispute'],
    ['ai실업', 2.6, 'ai_dispute'],
    // world_affairs
    ['전쟁', 2.4, 'world_affairs'], ['침공', 2.4, 'world_affairs'], ['공습', 2.6, 'world_affairs'],
    ['폭격', 2.6, 'world_affairs'], ['미사일', 2.2, 'world_affairs'], ['핵전쟁', 2.8, 'world_affairs'],
    ['학살', 2.6, 'world_affairs'], ['테러', 2.4, 'world_affairs'], ['지진', 2.0, 'world_affairs'],
    ['쓰나미', 2.4, 'world_affairs'], ['팬데믹', 2.2, 'world_affairs'], ['쿠데타', 2.6, 'world_affairs'],
    ['계엄', 2.6, 'world_affairs'], ['난민', 2.0, 'world_affairs']
  ];

  var BAD = (ldnoobw.ko || []).map(function (w) {
    return [w, 2.4, 'badwords'];
  });

  var lex = build.build(BAD.concat(CURATED), { match: 'substring' });

  return {
    id: 'ko',
    name: '한국어',
    match: 'substring',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'char',
      markers: ['못', '아니', '아닌', '없', '말라', '말아', '하지마', '하지 마']
    },
    report: ['라고', '라는', '말했다', '전했다', '보도', '라며'],
    quoteChars: { open: '「『“"', close: '」』”"' },
    emphasis: { caps: false }
  };
});


/* ===== src/lib/lang/ru.js ===== */

/**
 * ロシア語パック。
 * - 罵倒語: LDNOOBW ru（CC-BY-4.0）→ badwords（既定OFF）
 * - 義憤・話題: 作者作成（MIT）
 * - 照合は単語境界 / 否定は前置（не / ни / нет ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'), require('./data/ldnoobw.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langRu = factory(JOF.langBuild, JOF.ldnoobw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build, ldnoobw) {
  'use strict';

  var CURATED = [
    // attack
    ['дурак', 1.8, 'attack'], ['идиот', 2.0, 'attack'], ['дебил', 2.4, 'attack'],
    ['кретин', 2.2, 'attack'], ['тупой', 1.8, 'attack'], ['тупица', 2.0, 'attack'],
    ['придурок', 2.2, 'attack'], ['мудак', 2.6, 'attack'], ['козёл', 2.2, 'attack'],
    ['ублюдок', 2.6, 'attack'], ['сволочь', 2.4, 'attack'], ['подонок', 2.6, 'attack'],
    ['мразь', 2.8, 'attack'], ['гнида', 2.8, 'attack'], ['тварь', 2.6, 'attack'],
    ['скотина', 2.2, 'attack'], ['крыса', 2.0, 'attack'], ['паразит', 2.0, 'attack'],
    ['ничтожество', 2.2, 'attack'], ['безмозглый', 2.0, 'attack'], ['чмо', 2.6, 'attack'],
    ['лох', 1.8, 'attack'], ['мерзавец', 2.4, 'attack'],
    // hostility
    ['ненавижу', 2.0, 'hostility'], ['ненависть', 2.0, 'hostility'], ['отвращение', 1.8, 'hostility'],
    ['мерзость', 2.0, 'hostility'], ['омерзительно', 2.2, 'hostility'], ['бесит', 1.8, 'hostility'],
    ['ярость', 1.6, 'hostility'], ['гнев', 1.6, 'hostility'], ['возмущение', 1.6, 'hostility'],
    ['возмутительно', 1.8, 'hostility'], ['неприемлемо', 1.6, 'hostility'], ['позор', 1.6, 'hostility'],
    ['непростительно', 2.2, 'hostility', 'noNeg'],
    // incitement
    ['заткнись', 2.4, 'incitement'], ['убирайся', 2.4, 'incitement'], ['пошёл вон', 2.4, 'incitement'],
    ['сдохни', 3.0, 'incitement'], ['убей', 2.8, 'incitement'], ['бойкот', 1.6, 'incitement'],
    ['травить', 2.2, 'incitement'], ['разоблачи', 2.0, 'incitement'], ['накажи', 1.8, 'incitement'],
    // absolute
    ['абсолютно', 0.9, 'absolute'], ['обязательно', 0.6, 'absolute'], ['безусловно', 0.7, 'absolute'],
    ['очевидно', 0.5, 'absolute'], ['никогда', 0.6, 'absolute'], ['всегда', 0.5, 'absolute'],
    // othering
    ['предатель', 2.4, 'othering'], ['изменник', 2.4, 'othering'], ['ватник', 2.2, 'othering'],
    ['либераст', 2.4, 'othering'], ['рашист', 2.4, 'othering'], ['укроп', 2.6, 'othering'],
    ['хохол', 2.6, 'othering'], ['москаль', 2.4, 'othering'],
    // cynicism
    ['так тебе и надо', 2.0, 'cynicism'], ['поделом', 1.8, 'cynicism'], ['ну-ну', 1.2, 'cynicism'],
    // urgency
    ['срочно', 1.0, 'urgency'], ['распространить', 1.0, 'urgency'], ['конец света', 1.8, 'urgency'],
    ['кризис', 1.2, 'urgency'], ['обвал', 1.4, 'urgency'],
    // politics
    ['выборы', 2.2, 'politics'], ['голосование', 2.0, 'politics'], ['правительство', 2.2, 'politics'],
    ['президент', 2.2, 'politics'], ['парламент', 2.2, 'politics'], ['политика', 2.2, 'politics'],
    ['налоги', 2.0, 'politics'], ['иммиграция', 2.0, 'politics'], ['депутат', 2.0, 'politics'],
    // conspiracy
    ['заговор', 2.4, 'conspiracy'], ['теория заговора', 2.6, 'conspiracy'], ['глубинное государство', 2.6, 'conspiracy'],
    ['мировое правительство', 2.6, 'conspiracy'], ['масоны', 2.6, 'conspiracy'], ['иллюминаты', 2.6, 'conspiracy'],
    ['новый мировой порядок', 2.6, 'conspiracy'], ['чипирование', 2.4, 'conspiracy'], ['фейк', 2.0, 'conspiracy'],
    // ai_dispute
    ['искусственный интеллект', 2.2, 'ai_dispute'], ['нейросеть', 2.0, 'ai_dispute'],
    ['сингулярность', 2.4, 'ai_dispute'], ['чатгпт', 2.2, 'ai_dispute'], ['openai', 2.2, 'ai_dispute'],
    ['дипфейк', 2.2, 'ai_dispute'], ['ии угроза', 2.6, 'ai_dispute'], ['ии заменит', 2.6, 'ai_dispute'],
    // world_affairs
    ['война', 2.2, 'world_affairs'], ['вторжение', 2.4, 'world_affairs'], ['авиаудар', 2.6, 'world_affairs'],
    ['бомбардировка', 2.6, 'world_affairs'], ['ракета', 2.2, 'world_affairs'], ['ядерная война', 2.8, 'world_affairs'],
    ['геноцид', 2.6, 'world_affairs'], ['резня', 2.6, 'world_affairs'], ['теракт', 2.4, 'world_affairs'],
    ['стрельба', 2.4, 'world_affairs'], ['убийство', 2.4, 'world_affairs'], ['труп', 2.2, 'world_affairs'],
    ['землетрясение', 2.0, 'world_affairs'], ['цунами', 2.4, 'world_affairs'], ['пандемия', 2.2, 'world_affairs'],
    ['переворот', 2.6, 'world_affairs'], ['военное положение', 2.6, 'world_affairs'], ['беженцы', 2.0, 'world_affairs']
  ];

  var BAD = (ldnoobw.ru || []).map(function (w) {
    return [w, 2.4, 'badwords'];
  });

  var lex = build.build(BAD.concat(CURATED), { match: 'word' });

  return {
    id: 'ru',
    name: 'Русский',
    match: 'word',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'token',
      markers: ['не', 'ни', 'нет', 'без', 'нельзя', 'никогда', 'никто', 'ничто']
    },
    report: ['сказал', 'сказала', 'сообщил', 'по словам', 'якобы', 'передаёт'],
    quoteChars: { open: '«“"', close: '»”"' },
    emphasis: { caps: true }
  };
});


/* ===== src/lib/lang/uk.js ===== */

/**
 * ウクライナ語パック。
 * LDNOOBW に uk が無いため、義憤・話題語は作者作成（MIT）。
 * - 照合は単語境界 / 否定は前置（не / ні / немає ...）
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./build.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.langUk = factory(JOF.langBuild);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (build) {
  'use strict';

  var CURATED = [
    // attack
    ['дурень', 1.8, 'attack'], ['ідіот', 2.0, 'attack'], ['дебіл', 2.4, 'attack'],
    ['кретин', 2.2, 'attack'], ['тупий', 1.8, 'attack'], ['придурок', 2.2, 'attack'],
    ['мудак', 2.6, 'attack'], ['козел', 2.2, 'attack'], ['виродок', 2.6, 'attack'],
    ['покидьок', 2.6, 'attack'], ['мразь', 2.8, 'attack'], ['гнида', 2.8, 'attack'],
    ['тварюка', 2.6, 'attack'], ['свиня', 1.8, 'attack'], ['щур', 2.0, 'attack'],
    ['паразит', 2.0, 'attack'], ['нікчема', 2.2, 'attack'], ['лох', 1.8, 'attack'],
    ['чмо', 2.6, 'attack'], ['мерзотник', 2.2, 'attack'],
    // hostility
    ['ненавиджу', 2.0, 'hostility'], ['ненависть', 2.0, 'hostility'], ['огида', 1.8, 'hostility'],
    ['огидно', 2.0, 'hostility'], ['мерзота', 2.0, 'hostility'], ['гидно', 1.8, 'hostility'],
    ['дратує', 1.6, 'hostility'], ['лють', 1.6, 'hostility'], ['гнів', 1.6, 'hostility'],
    ['обурення', 1.6, 'hostility'], ['обурливо', 1.8, 'hostility'], ['ганьба', 1.6, 'hostility'],
    ['неприйнятно', 1.6, 'hostility'], ['непрощенно', 2.2, 'hostility', 'noNeg'],
    // incitement
    ['заткнись', 2.4, 'incitement'], ['іди геть', 2.4, 'incitement'], ['здохни', 3.0, 'incitement'],
    ['убей', 2.8, 'incitement'], ['бойкот', 1.6, 'incitement'], ['цькування', 2.2, 'incitement'],
    ['викрий', 2.0, 'incitement'], ['покарай', 1.8, 'incitement'],
    // absolute
    ['абсолютно', 0.9, 'absolute'], ["обов'язково", 0.6, 'absolute'], ['безумовно', 0.7, 'absolute'],
    ['очевидно', 0.5, 'absolute'], ['ніколи', 0.6, 'absolute'], ['завжди', 0.5, 'absolute'],
    // othering
    ['зрадник', 2.4, 'othering'], ['ватник', 2.2, 'othering'], ['рашист', 2.4, 'othering'],
    ['москаль', 2.4, 'othering'], ['сепаратист', 2.2, 'othering'], ['кацап', 2.6, 'othering'],
    ['запроданці', 2.2, 'othering'], ['порохобот', 2.0, 'othering'], ['зелебобік', 2.0, 'othering'],
    // cynicism
    ['так тобі й треба', 2.0, 'cynicism'], ['піділом', 1.8, 'cynicism'], ['ну-ну', 1.2, 'cynicism'],
    // urgency
    ['терміново', 1.0, 'urgency'], ['поширити', 1.0, 'urgency'], ['кінець світу', 1.8, 'urgency'],
    ['криза', 1.2, 'urgency'], ['обвал', 1.4, 'urgency'],
    // politics
    ['вибори', 2.2, 'politics'], ['голосування', 2.0, 'politics'], ['уряд', 2.2, 'politics'],
    ['президент', 2.2, 'politics'], ['парламент', 2.2, 'politics'], ['політика', 2.2, 'politics'],
    ['податки', 2.0, 'politics'], ['імміграція', 2.0, 'politics'], ['депутат', 2.0, 'politics'],
    // conspiracy
    ['змова', 2.4, 'conspiracy'], ['теорія змови', 2.6, 'conspiracy'], ['глибинна держава', 2.6, 'conspiracy'],
    ['світовий уряд', 2.6, 'conspiracy'], ['масони', 2.6, 'conspiracy'], ['ілюмінати', 2.6, 'conspiracy'],
    ['новий світовий порядок', 2.6, 'conspiracy'], ['чіпування', 2.4, 'conspiracy'], ['фейк', 2.0, 'conspiracy'],
    // ai_dispute
    ['штучний інтелект', 2.2, 'ai_dispute'], ['нейромережа', 2.0, 'ai_dispute'],
    ['сингулярність', 2.4, 'ai_dispute'], ['чатгпт', 2.2, 'ai_dispute'], ['openai', 2.2, 'ai_dispute'],
    ['діпфейк', 2.2, 'ai_dispute'], ['ші загроза', 2.6, 'ai_dispute'], ['ші замінить', 2.6, 'ai_dispute'],
    // world_affairs
    ['війна', 2.2, 'world_affairs'], ['вторгнення', 2.4, 'world_affairs'], ['авіаудар', 2.6, 'world_affairs'],
    ['бомбардування', 2.6, 'world_affairs'], ['ракета', 2.2, 'world_affairs'], ['ядерна війна', 2.8, 'world_affairs'],
    ['геноцид', 2.6, 'world_affairs'], ['різанина', 2.6, 'world_affairs'], ['теракт', 2.4, 'world_affairs'],
    ['стрілянина', 2.4, 'world_affairs'], ['вбивство', 2.4, 'world_affairs'], ['труп', 2.2, 'world_affairs'],
    ['землетрус', 2.0, 'world_affairs'], ['цунамі', 2.4, 'world_affairs'], ['пандемія', 2.2, 'world_affairs'],
    ['переворот', 2.6, 'world_affairs'], ['воєнний стан', 2.6, 'world_affairs'], ['біженці', 2.0, 'world_affairs']
  ];

  // LDNOOBW に uk が無いので、ru の罵倒語は使わず（別言語）作者作成の badwords のみ少数
  var BAD = [
    ['хуй', 2.8, 'badwords'], ['пізда', 2.8, 'badwords'], ['блядь', 2.6, 'badwords'],
    ['сука', 2.6, 'badwords'], ['їбав', 2.6, 'badwords'], ['дупа', 1.8, 'badwords'],
    ['лайно', 2.0, 'badwords'], ['срака', 2.0, 'badwords'], ['пиздець', 2.6, 'badwords']
  ];

  var lex = build.build(CURATED.concat(BAD), { match: 'word' });

  return {
    id: 'uk',
    name: 'Українська',
    match: 'word',
    TERMS: lex.TERMS,
    BY_FIRST: lex.BY_FIRST,
    BY_WORD: lex.BY_WORD,
    EXCLUDE_AFTER: {},
    patterns: [],
    negation: {
      position: 'before',
      unit: 'token',
      markers: ['не', 'ні', 'немає', 'без', 'не можна', 'ніколи', 'ніхто', 'ніщо']
    },
    report: ['сказав', 'сказала', 'повідомив', 'за словами', 'нібито', 'передає'],
    quoteChars: { open: '«“"', close: '»”"' },
    emphasis: { caps: true }
  };
});


/* ===== src/lib/lang/index.js ===== */

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

  return {
    PACKS: PACKS,
    DEFAULT_LANG: DEFAULT_LANG,
    SCRIPT: SCRIPT,
    detect: detect,
    resolve: resolve,
    get: get,
    list: list
  };
});


/* ===== src/lib/lang/style.js ===== */

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


/* ===== src/lib/lang/disaster.js ===== */

/**
 * 災害・緊急情報の判定レイヤー（カテゴリ `disaster`）。
 *
 * 地震速報・津波警報・避難指示などは「見たい」情報。戦争/事件と同じ
 * world_affairs に入っていると、世界情勢を隠したい人が災害情報まで
 * 失ってしまう。そこで disaster を独立カテゴリにし、
 *   - disaster 有効（＝隠す）  … 地震速報などを隠す
 *   - disaster 無効（既定）    … 見る
 * を選べるようにする。
 *
 * 実装: 既存辞書の world_affairs 語のうち災害系のものを disaster に「移し替え」、
 *       追加の警報フレーズ（地震速報/避難指示 等）をスキャンする。
 *       すべての言語に効くよう、言語パックを編集せず後段で再分類する。
 *
 * ロジックは term-layer.js に共通化してある。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./term-layer.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.disaster = factory(JOF.termLayer);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (termLayer) {
  'use strict';

  var W = 2.2; // 1語で既定しきい値(0.5)を超える重み（≒0.60）

  var LANG_GROUPS = {
    ja: 'cjk', zh: 'cjk', zh_hant: 'cjk',
    ko: 'hangul',
    ru: 'cyrillic', uk: 'cyrillic', bg: 'cyrillic', sr: 'cyrillic', mk: 'cyrillic', mn: 'cyrillic', be: 'cyrillic',
    ar: 'arabic', fa: 'arabic', ur: 'arabic',
    en: 'latin', de: 'latin', fr: 'latin', es: 'latin', pt: 'latin', it: 'latin', nl: 'latin',
    pl: 'latin', cs: 'latin', sk: 'latin', hu: 'latin', fi: 'latin', sv: 'latin', da: 'latin',
    no: 'latin', tr: 'latin', fil: 'latin', id: 'latin', ms: 'latin', vi: 'latin', ro: 'latin',
    hr: 'latin', sl: 'latin', lt: 'latin', lv: 'latin', et: 'latin', ca: 'latin', sw: 'latin',
    latin: 'latin'
  };

  // 災害・緊急情報の語（既存辞書と重なってよい。重複は再分類で処理）
  var TERMS = {
    cjk: [
      '地震', '大地震', '巨大地震', '震度', '余震', 'マグニチュード', '震源', '本震',
      '津波', '大津波', '津波警報', '津波注意報', '津波到達', '高潮',
      '緊急地震速報', '地震速報', '特別警報', '大雨特別警報', '暴風警報', '洪水警報',
      '避難指示', '避難勧告', '避難所', '避難', '警戒レベル', '高齢者等避難',
      '台風', '線状降水帯', '集中豪雨', '大雨', '氾濫', '浸水', '土砂災害', '土石流', '崖崩れ',
      '噴火', '火山', '降灰', '火砕流',
      '震災', '被災', '被災地', '救助', '安否確認', '行方不明', '帰宅困難', '停電', '断水', 'ライフライン',
      '大規模火災', '山火事', '熱中症', 'パンデミック', '感染爆発',
      '海啸', '海嘯', '震级', '餘震', '余震', '疏散', '避难', '避難', '預警', '预警', '警报', '警報',
      '台风', '颱風', '洪灾', '災情', '受灾', '受災', '救援', '地震速報'
    ],
    hangul: [
      '지진', '여진', '진도', '규모', '쓰나미', '해일', '태풍', '홍수', '산사태', '폭우',
      '대피', '피난', '긴급재난문자', '재난문자', '경보', '특보', '이재민', '구조', '정전', '단수'
    ],
    cyrillic: [
      'землетрясение', 'землетрус', 'цунами', 'наводнение', 'эвакуация', 'евакуація',
      'оползень', 'пожар', 'ураган', 'тайфун', 'предупреждение', 'попередження'
    ],
    arabic: [
      'زلزال', 'زلزله', 'زلزلہ', 'تسونامي', 'سونامی', 'إخلاء', 'تخلیه', 'فیض', 'سیلاب'
    ],
    latin: [
      'earthquake', 'tsunami', 'typhoon', 'hurricane', 'tornado', 'evacuation', 'evacuate',
      'emergency alert', 'earthquake warning', 'aftershock', 'magnitude', 'epicenter',
      'wildfire', 'flood', 'flooding', 'landslide', 'mudslide', 'volcano', 'eruption',
      'terremoto', 'sismo', 'seísmo', 'tsunami', 'evacuación', 'inundación', 'erupción',
      'séisme', 'tremblement de terre', 'évacuation', 'inondation', 'éruption',
      'erdbeben', 'evakuierung', 'überschwemmung', 'überflutung', 'vulkanausbruch',
      'terremoto', 'evacuazione', 'alluvione', 'allagamento',
      'sismo', 'evacuação', 'enchente', 'inundação',
      'aardbeving', 'evacuatie', 'overstroming',
      'trzęsienie ziemi', 'ewakuacja', 'powódź',
      'deprem', 'tahliye', 'sel',
      'gempa', 'gempa bumi', 'evakuasi', 'banjir',
      'động đất', 'sóng thần', 'sơ tán', 'lũ lụt',
      'lindol', 'paglikas', 'baha',
      'cutremur', 'evacuare', 'inundație',
      'potres', 'evakuacija', 'poplava',
      'žemės drebėjimas', 'evakuacija', 'potvynis',
      'zemestrīce', 'evakuācija', 'plūdi',
      'maavärin', 'evakuatsioon', 'üleujutus',
      'terratrèmol', 'evacuació', 'inundació',
      'tetemeko la ardhi', 'tsunami', 'mafuriko'
    ]
  };

  var layer = termLayer.createTermLayer({
    category: 'disaster',
    weight: W,
    langGroups: LANG_GROUPS,
    fallbackGroup: 'latin',
    groups: {
      cjk: { match: 'substring', terms: TERMS.cjk },
      hangul: { match: 'substring', terms: TERMS.hangul },
      cyrillic: { match: 'word', terms: TERMS.cyrillic },
      arabic: { match: 'word', terms: TERMS.arabic },
      latin: { match: 'word', terms: TERMS.latin }
    }
  });
  layer.WEIGHT = W;
  return layer;
});


/* ===== src/lib/lang/selfmock.js ===== */

/**
 * 自虐・自己卑下（self-mockery）の判定レイヤー（カテゴリ `selfmock`）。
 *
 * 自虐は「自分に向けた否定」なので、他人への攻撃語（バカ/クズ等）と
 * 同じ語でも文脈で意味が変わる。そこで:
 *   - 自己卑下そのものの言い回し（死にたい/自分なんて/どうせ俺/自虐 等）
 *   - 「一人称 + 否定語」の組み合わせ（俺はクズ / 私なんて無能）
 * を検出し、該当箇所を selfmock カテゴリへ移し替える。
 *
 * カテゴリを独立させてあるので、自虐ネタが好きな人は
 * ポップアップで selfmock をOFFにすれば見られる（＝他は隠したまま）。
 *
 * 用語索引は term-layer.js、文脈判定はこのファイル末尾。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./term-layer.js'), require('./build.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.selfmock = factory(JOF.termLayer, JOF.langBuild);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (termLayer, build) {
  'use strict';

  var W = 2.2;

  // 「自虐」そのものの言い回し（これだけで自虐と判定）
  var JA = [
    '死にたい', '消えたい', 'いなくなりたい', '生きる価値', '死んだほうが', '死んだ方が',
    '自分なんて', '私なんて', '僕なんて', '俺なんて', 'どうせ俺', 'どうせ私', 'どうせ自分',
    '自虐', '自己卑下', '自己嫌悪', '卑屈', 'ぼっち', '陰キャ', 'コミュ障', '底辺',
    '負け組', '社会不適合者', '人生終わった', '生まれてきてごめん', '何もできない',
    'クズでごめん', '価値がない', 'いてもいなくても', 'ハズレ人間'
  ];
  var EN = [
    'i hate myself', "i'm worthless", 'im worthless', "i'm a loser", 'im a loser',
    'i want to die', 'kill myself', 'self-loathing', 'self deprecating', "i'm useless",
    'im useless', 'nobody likes me', 'i deserve this'
  ];

  // 一人称・二人称（文脈判定用）
  var P1 = ['俺', 'おれ', '私', 'わたし', '僕', 'ぼく', '自分', 'わし', 'うち', 'あたし', '我'];
  var P2 = ['お前', 'おまえ', 'てめえ', 'てめぇ', 'あんた', '貴様', 'きさま', 'あなた', '君'];
  var EN_P1 = ['i', "i'm", 'im', 'me', 'my', 'myself', "i've", 'ive'];
  var EN_P2 = ['you', 'your', 'yours', "you're", 'youre'];

  var LATIN = ['en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'cs', 'sk', 'hu', 'fi', 'sv', 'da',
    'no', 'tr', 'fil', 'id', 'ms', 'vi', 'ro', 'hr', 'sl', 'lt', 'lv', 'et', 'ca', 'sw', 'latin'];

  var LANG_GROUPS = { ja: 'ja' };
  LATIN.forEach(function (id) {
    LANG_GROUPS[id] = 'latin';
  });

  var layer = termLayer.createTermLayer({
    category: 'selfmock',
    weight: W,
    langGroups: LANG_GROUPS,
    fallbackGroup: null,
    groups: {
      ja: { match: 'substring', terms: JA },
      latin: { match: 'word', terms: EN }
    }
  });

  /**
   * 否定語の前後に人称があるとき、最も近いのが一人称なら自虐とみなす。
   * @param {number} start 一致開始
   * @param {number} end 一致終了
   */
  function isSelfContext(text, start, end, langId) {
    var g = layer.groupOf(langId);
    if (g === 'ja') {
      var from = Math.max(0, start - 14);
      for (var i = start - 1; i >= from; i--) {
        for (var k = 0; k < P2.length; k++) {
          if (text.startsWith(P2[k], i)) return false;
        }
        for (var j = 0; j < P1.length; j++) {
          if (text.startsWith(P1[j], i)) return true;
        }
      }
      return false;
    }
    if (g === 'latin') {
      var before = build.tokenizeWords(text.slice(Math.max(0, start - 24), start));
      for (var b = before.length - 1; b >= 0 && b >= before.length - 3; b--) {
        if (EN_P2.indexOf(before[b]) >= 0) return false;
        if (EN_P1.indexOf(before[b]) >= 0) return true;
      }
      var after = build.tokenizeWords(text.slice(end, end + 24));
      for (var a = 0; a < after.length && a < 3; a++) {
        if (EN_P2.indexOf(after[a]) >= 0) return false;
        if (EN_P1.indexOf(after[a]) >= 0) return true;
      }
      return false;
    }
    return false;
  }

  layer.isSelfContext = isSelfContext;
  layer.isSelfTerm = layer.isTerm; // 旧名の別名（互換）
  layer.WEIGHT = W;
  return layer;
});


/* ===== src/lib/lang/aitopic.js ===== */

/**
 * AI の「技術・界隈の話題」を AI論争(ai_dispute) から切り出すレイヤー（カテゴリ `ai_topic`）。
 *
 * ai_dispute は「AI脅威・失業・暴走・規制」など論争・不安の文脈。
 * 技術者視点の話題（モデル名・手法・ツール）や AIクラスタの話題は
 * 見たい人も多いので、独立トグルで オン/オフ できるようにする。
 *
 * 既存辞書の ai_dispute 語のうち技術・製品系を ai_topic へ「移し替え」、
 * 追加の技術語（機械学習/プロンプト/AIエージェント 等）をスキャンする。
 *
 * ロジックは term-layer.js に共通化してある。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./term-layer.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.aitopic = factory(JOF.termLayer);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (termLayer) {
  'use strict';

  var W = 2.2;

  var CJK = [
    '人工知能', '人工智能', '生成ai', '生成式ai', '大規模言語モデル', '大语言模型',
    '機械学習', '机器学习', '深層学習', '深度学习', 'ディープラーニング',
    'ニューラルネット', 'プロンプト', 'ファインチューニング', '微调',
    'aiエージェント', 'マルチモーダル', '多模态', '画像生成', '图像生成',
    '動画生成', '视频生成', '音声合成', '语音合成', '拡散モデル', '扩散模型',
    'aiモデル', 'ai模型', 'ai開発', 'ai开发', 'aiクラスタ', 'ai界隈', 'ai研究者',
    'aiエンジニア', '汎用人工知能', '通用人工智能', 'ディープフェイク', '深度伪造', '深度偽造'
  ];
  var HANGUL = [
    '인공지능', '생성형ai', '챗gpt', '오픈ai', '대규모 언어 모델', '머신러닝', '딥러닝',
    '프롬프트', '파인튜닝', '멀티모달', '이미지 생성', '확산 모델'
  ];
  var LATIN = [
    'chatgpt', 'gpt-4', 'gpt4', 'gpt-5', 'gpt5', 'openai', 'gemini', 'claude', 'copilot',
    'llm', 'llms', 'stable diffusion', 'midjourney', 'machine learning', 'deep learning',
    'neural network', 'neural networks', 'prompt engineering', 'fine-tuning', 'finetuning',
    'fine tuning', 'multimodal', 'ai agent', 'ai agents', 'ai model', 'ai models',
    'diffusion model', 'hugging face', 'huggingface', 'pytorch', 'tensorflow', 'llama',
    'mistral', 'langchain', 'embeddings', 'text-to-speech', 'image generation'
  ];

  var LATIN_LANGS = ['en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'cs', 'sk', 'hu', 'fi', 'sv',
    'da', 'no', 'tr', 'fil', 'id', 'ms', 'vi', 'ro', 'hr', 'sl', 'lt', 'lv', 'et', 'ca', 'sw', 'latin'];

  var LANG_GROUPS = { ja: 'cjk', zh: 'cjk', zh_hant: 'cjk', ko: 'hangul' };
  LATIN_LANGS.forEach(function (id) {
    LANG_GROUPS[id] = 'latin';
  });

  var layer = termLayer.createTermLayer({
    category: 'ai_topic',
    weight: W,
    langGroups: LANG_GROUPS,
    fallbackGroup: null,
    groups: {
      cjk: { match: 'substring', terms: CJK },
      hangul: { match: 'substring', terms: HANGUL },
      latin: { match: 'word', terms: LATIN }
    }
  });
  layer.WEIGHT = W;
  return layer;
});


/* ===== src/lib/lang/nsfw.js ===== */

/**
 * NSFW・性的表現の判定レイヤー（カテゴリ `nsfw`）。
 *
 * LDNOOBW の罵倒語(badwords)には性的な語が多く含まれる。それらを
 * `nsfw` として独立トグルで扱えるようにする:
 *   - nsfw 有効（＝隠す）  … 性的表現を隠す
 *   - nsfw 無効（既定）    … 表示
 * badwords の性的語は nsfw へ「移し替え」るため、
 *   badwords 単独ON → 性的語は非表示にならない（罵倒・差別のみ隠す）
 *   badwords+n s f w ON → 性的語は nsfw として隠れる（二重計上しない）
 * という切り分けになる。
 *
 * ロジックは term-layer.js に共通化してある。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./term-layer.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.nsfw = factory(JOF.termLayer);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (termLayer) {
  'use strict';

  var W = 2.2;

  var LANG_GROUPS = {
    ja: 'cjk', zh: 'cjk', zh_hant: 'cjk',
    ko: 'hangul',
    ru: 'cyrillic', uk: 'cyrillic', bg: 'cyrillic', sr: 'cyrillic',
    ar: 'arabic', fa: 'arabic', ur: 'arabic',
    en: 'latin', de: 'latin', fr: 'latin', es: 'latin', pt: 'latin', it: 'latin', nl: 'latin',
    pl: 'latin', cs: 'latin', sk: 'latin', hu: 'latin', fi: 'latin', sv: 'latin', da: 'latin',
    no: 'latin', tr: 'latin', fil: 'latin', id: 'latin', ms: 'latin', vi: 'latin', ro: 'latin',
    hr: 'latin', sl: 'latin', lt: 'latin', lv: 'latin', et: 'latin', ca: 'latin', sw: 'latin',
    latin: 'latin'
  };

  var TERMS = {
    cjk: [
      'エロ', 'えろ', 'エッチ', 'えっち', '下ネタ', 'ヌード', '全裸', '裸体',
      'おっぱい', '巨乳', '貧乳', 'セックス', '風俗', 'ソープ', '援助交際', 'パパ活',
      '出会い系', 'オナニー', 'おなにー', 'マンコ', 'ちんこ', 'ちんぽ', 'ペニス',
      'ヴァギナ', '性器', '射精', '中出し', '痴漢', '盗撮', 'わいせつ', '猥褻',
      'ポルノ', 'アダルト', '18禁', 'r18', '性行為',
      '色情', '情色', '性爱', '做爱', '自慰', '裸照', '露点', '淫秽', '黄片', '脱衣', '成人视频'
    ],
    hangul: [
      '야동', '야스', '섹스', '자위', '음란', '성인물', '노출', '야한', '포르노', '변태'
    ],
    cyrillic: [
      'порно', 'секс', 'эротика', 'голая', 'голый', 'интим', 'минет', 'оргазм',
      'онанизм', 'мастурбация', 'сексуальный'
    ],
    arabic: [
      'سكس', 'إباحي', 'عاري', 'جنس', 'شهواني', 'مثير'
    ],
    latin: [
      'sex', 'sexy', 'porn', 'porno', 'pornography', 'pornhub', 'xxx', 'nsfw', 'rule34', 'r34',
      'nude', 'nudes', 'naked', 'boobs', 'tits', 'pussy', 'dick', 'cock', 'cum', 'cumming',
      'orgasm', 'masturbation', 'masturbate', 'blowjob', 'handjob', 'anal', 'anus', 'bdsm',
      'hentai', 'ecchi', 'erotic', 'erotica', 'fetish', 'onlyfans', 'escort', 'hookup',
      'dildo', 'vibrator', 'nipple', 'nipples', 'clit', 'clitoris', 'sperm', 'semen',
      'penetration', 'intercourse', 'horny', 'kinky', 'hardcore', 'creampie', 'threesome',
      'milf', 'bbw'
    ]
  };

  var layer = termLayer.createTermLayer({
    category: 'nsfw',
    weight: W,
    langGroups: LANG_GROUPS,
    fallbackGroup: 'latin',
    groups: {
      cjk: { match: 'substring', terms: TERMS.cjk },
      hangul: { match: 'substring', terms: TERMS.hangul },
      cyrillic: { match: 'word', terms: TERMS.cyrillic },
      arabic: { match: 'word', terms: TERMS.arabic },
      latin: { match: 'word', terms: TERMS.latin }
    }
  });
  layer.WEIGHT = W;
  return layer;
});


/* ===== src/lib/selfpost.js ===== */

/**
 * 「自分の投稿」判定のユーティリティ。
 *
 * X の自分のハンドル（@name）と、投稿の投稿者ハンドルを比較する。
 * DOM 依存の処理は content.js 側に置き、ここは純関数だけにしてテスト可能にする。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).selfpost = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** テキストから最初の @handle を取り出す（小文字化）。無ければ null。 */
  function parseHandle(text) {
    var m = String(text == null ? '' : text).match(/@([A-Za-z0-9_]{1,15})/);
    return m ? m[1].toLowerCase() : null;
  }

  /** 自分のハンドルかどうか（大文字小文字は無視）。 */
  function isOwn(ownHandle, text) {
    if (!ownHandle) return false;
    var h = parseHandle(text);
    return !!h && h === String(ownHandle).toLowerCase();
  }

  return { parseHandle: parseHandle, isOwn: isOwn };
});


/* ===== src/lib/reply.js ===== */

/**
 * リプライ投稿の判定ヘルパー。
 *
 * X は「返信先」を示す行を多言語で描画する。ロケールに依存しないよう
 * 各言語の代表的な表記をまとめて判定する（純関数なのでテスト可能）。
 *
 * DOM からの「ヘッダ部分のテキスト」抽出は content.js 側で行い、
 * ここでは文字列だけを見る。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).reply = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 「〜への返信」を示す表現（主要ロケール）
  var REPLY_RE = new RegExp(
    [
      'Replying to',
      '返信先',
      'Antwort an',
      'En réponse à',
      'Respondiendo a',
      'In risposta a',
      'Respondendo a',
      'Antwoord aan',
      'Odpowiadanie do',
      'W odpowiedzi do',
      'Yanıtlanan',
      'الرد على',
      'ردًا على',
      'در پاسخ به',
      'जवाब',
      '回复',
      '回覆',
      '답글',
      'Ответ',
      'Відповідь',
      'ตอบกลับ',
      'Trả lời',
      'Membalas',
      'Bilang tugon',
      'Svar till',
      'Svar til',
      'Vastaus',
      'Odpověď',
      'Odpoveď',
      'Válasz',
      'Răspuns',
      'Απάντηση',
      'מגיב'
    ].join('|')
  );

  function isReplyText(text) {
    return REPLY_RE.test(String(text == null ? '' : text));
  }

  return { isReplyText: isReplyText, REPLY_RE: REPLY_RE };
});


/* ===== src/lib/userdict.js ===== */

/**
 * ユーザー辞書（自分のミュートワード）ヘルパー。
 *
 * - parseList(): テキストエリア等の入力（改行/カンマ/読点区切り）を整形・重複排除
 * - find():      投稿本文に含まれる最初のユーザー語を返す（正規化して部分一致）
 *
 * 正規化は本文と同じ normalize.js を使うので、全角/半角・大文字小文字の差を吸収でき、
 * URL やメンションは除外された状態で照合される。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./normalize.js'));
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.userdict = factory(JOF.normalize);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (normalize) {
  'use strict';

  var MAX_WORDS = 500;
  var MAX_LEN = 100;

  function normWord(w) {
    var s = String(w == null ? '' : w);
    try {
      s = s.normalize('NFKC');
    } catch (e) {
      /* noop */
    }
    return s.toLowerCase().trim();
  }

  /** 入力テキスト→語の配列（整形・重複排除・上限） */
  function parseList(text) {
    var out = [];
    var seen = new Set();
    String(text == null ? '' : text)
      .split(/[\n,、；;]+/)
      .forEach(function (raw) {
        var w = String(raw).trim();
        if (!w) return;
        if (w.length > MAX_LEN) w = w.slice(0, MAX_LEN);
        var n = normWord(w);
        if (!n || seen.has(n)) return;
        seen.add(n);
        out.push(w);
      });
    return out.slice(0, MAX_WORDS);
  }

  /** 投稿本文に含まれる最初のユーザー語を返す（無ければ null） */
  function find(rawText, words) {
    if (!words || !words.length) return null;
    var hay = normalize.normalize(rawText);
    if (!hay) return null;
    for (var i = 0; i < words.length; i++) {
      var n = normWord(words[i]);
      if (n && hay.indexOf(n) >= 0) return words[i];
    }
    return null;
  }

  return { parseList: parseList, find: find, normWord: normWord, MAX_WORDS: MAX_WORDS };
});


/* ===== src/lib/dict-editor.js ===== */

/**
 * ユーザー辞書（ミュートワード）の編集UI部品。
 *
 * 拡張では専用ページ（src/dict.html）、ユーザースクリプトでは
 * 別ウィンドウ（about:blank）に同じUIを描画する。DOM は渡された
 * document に対して生成し、保存は渡された chrome.storage 互換APIを使う。
 * これにより popup の狭さから解放され、追加/削除がしやすい。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).dictEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CSS =
    '.jofd{--a:#e4572e;font:14px/1.6 system-ui,-apple-system,"Hiragino Kaku Gothic ProN",Meiryo,sans-serif;' +
    'color:#eee;background:#17171b;padding:14px;min-height:100vh;box-sizing:border-box}' +
    '.jofd *{box-sizing:border-box}' +
    '.jofd h1{font-size:16px;margin:0 0 4px;color:#ffb59b}' +
    '.jofd .sub{color:#9a9aa5;font-size:11px;margin:0 0 12px}' +
    '.jofd label.sw{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-weight:700;color:#ffb59b}' +
    '.jofd .add{display:flex;gap:6px;margin-bottom:10px}' +
    '.jofd input[type=text]{flex:1;min-width:0;background:#101014;color:#eee;border:1px solid #33343c;' +
    'border-radius:8px;padding:7px 9px;font:inherit}' +
    '.jofd button{padding:6px 12px;border:1px solid #33343c;border-radius:999px;background:transparent;' +
    'color:inherit;cursor:pointer;font:inherit}' +
    '.jofd button.primary{border-color:var(--a);color:#ffb59b}' +
    '.jofd button:hover{border-color:var(--a)}' +
    '.jofd ul{list-style:none;margin:0;padding:0}' +
    '.jofd li{display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid #2c2c33;' +
    'border-radius:8px;margin-bottom:5px;background:#101014}' +
    '.jofd li span{flex:1;word-break:break-all}' +
    '.jofd li button{padding:2px 8px;font-size:12px}' +
    '.jofd .empty{color:#9a9aa5;font-size:12px;padding:8px 0}' +
    '.jofd .foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;color:#9a9aa5;font-size:12px}' +
    '.jofd .hint{color:#9a9aa5;font-size:11px;margin:8px 0 0}';

  /**
   * @param {Document} doc 描画先
   * @param {Object} [chromeApi] chrome.storage 互換（既定: globalThis.chrome）
   * @returns {{render:function, focus:function}}
   */
  function createEditor(doc, chromeApi) {
    var JOF = globalThis.JOF || {};
    var config = JOF.config;
    var userdict = JOF.userdict;
    var i18n = JOF.i18n;
    var t = i18n ? i18n.t : function (k) {
      return k;
    };
    var storage = chromeApi || globalThis.chrome;

    var settings = null;

    function injectCSS() {
      var head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
      if (!head || (doc.getElementById && doc.getElementById('jof-dict-style'))) return;
      var s = doc.createElement('style');
      s.id = 'jof-dict-style';
      s.textContent = CSS;
      head.appendChild(s);
    }

    function save(done) {
      storage.storage.local.get([config.PERSIST_KEY], function (res) {
        var s = config.normalizeSettings(res[config.PERSIST_KEY] || {});
        s.userWords = settings.userWords;
        s.userWordsEnabled = settings.userWordsEnabled;
        var patch = {};
        patch[config.PERSIST_KEY] = s;
        storage.storage.local.set(patch, function () {
          if (done) done();
        });
      });
    }

    function h(tag, cls, text) {
      var e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    function addWord(value) {
      var list = userdict.parseList(String(value || ''));
      if (!list.length) return;
      var w = list[0];
      var have = settings.userWords.some(function (x) {
        return userdict.normWord(x) === userdict.normWord(w);
      });
      if (!have) settings.userWords.push(w);
      save(render);
    }

    function removeWord(w) {
      settings.userWords = settings.userWords.filter(function (x) {
        return x !== w;
      });
      save(render);
    }

    function render() {
      if (!settings) return;
      injectCSS();
      var root = (doc.getElementById && doc.getElementById('jof-dict-root')) || doc.body;
      root.className = 'jofd';
      root.textContent = '';

      root.appendChild(h('h1', null, t('userDict')));
      root.appendChild(h('p', 'sub', t('userDictHint')));

      var sw = h('label', 'sw');
      var cb = doc.createElement('input');
      cb.type = 'checkbox';
      cb.checked = settings.userWordsEnabled !== false;
      cb.addEventListener('change', function () {
        settings.userWordsEnabled = cb.checked;
        save();
      });
      sw.appendChild(cb);
      sw.appendChild(doc.createTextNode(t('userDictEnabled')));
      root.appendChild(sw);

      var add = h('div', 'add');
      var input = doc.createElement('input');
      input.type = 'text';
      input.placeholder = t('userDictPlaceholder');
      add.appendChild(input);
      var addBtn = h('button', 'primary', t('userDictAdd'));
      addBtn.type = 'button';
      addBtn.addEventListener('click', function () {
        addWord(input.value);
        input.value = '';
        input.focus();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addWord(input.value);
          input.value = '';
        }
      });
      add.appendChild(addBtn);
      root.appendChild(add);

      var list = h('ul');
      if (!settings.userWords.length) {
        root.appendChild(h('div', 'empty', t('userDictEmpty')));
      } else {
        settings.userWords.forEach(function (w) {
          var li = h('li');
          li.appendChild(h('span', null, w));
          var del = h('button', null, '✕');
          del.type = 'button';
          del.title = t('userDictDelete');
          del.addEventListener('click', function () {
            removeWord(w);
          });
          li.appendChild(del);
          list.appendChild(li);
        });
        root.appendChild(list);
      }

      var foot = h('div', 'foot');
      foot.appendChild(h('span', null, t('userDictCount', [settings.userWords.length])));
      var all = h('button', null, t('userDictAll'));
      all.type = 'button';
      all.addEventListener('click', function () {
        settings.userWords = [];
        save(render);
      });
      foot.appendChild(all);
      root.appendChild(foot);

      root.appendChild(h('p', 'hint', t('userDictNote')));
      if (input && typeof input.focus === 'function') input.focus();
    }

    function load() {
      storage.storage.local.get([config.PERSIST_KEY], function (res) {
        settings = config.normalizeSettings(res[config.PERSIST_KEY] || {});
        if (!settings.userWords) settings.userWords = [];
        var loc = i18n && i18n.localeFor ? i18n.localeFor(settings.language) : null;
        var p = i18n && i18n.load ? i18n.load(loc) : Promise.resolve();
        p.then(render);
      });
    }

    return { render: render, load: load };
  }

  return { createEditor: createEditor, CSS: CSS };
});


/* ===== src/lib/i18n.js ===== */

/**
 * UI 文言の多言語化ヘルパー。
 * 拡張では chrome.i18n（_locales/*）を使い、無い環境（プレビュー等）では
 * 日本語のフォールバックを使う。
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JOF = root.JOF || {}).i18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var FALLBACK = {
    extName: '義憤ミュート',
    title: '義憤ミュート',
    enabled: '有効',
    note: 'Xの投稿を端末内だけで判定します（外部送信なし）。しきい値以上でぼかし／非表示にします。あなたが穏やかな気持ちでいられますように。',
    threshold: 'しきい値',
    thresholdHint: '低いほど多く隠します（誤判定も増えます）。',
    mode: '隠し方',
    modeBlur: 'ぼかす（クリックで表示）',
    modeHide: '完全に隠す',
    showOverlay: '理由バッジを表示する',
    minLength: '最短文字数',
    language: '言語',
    languageAuto: '自動判定',
    categories: '検出カテゴリ',
    categoriesHint: '上の7つは「言い方の攻撃性」。下の「政治・陰謀論・AI論争・世界情勢・下品語（任意）」は話題そのものを隠します（既定OFF）。',
    optionalSuffix: '（任意）',
    tryScore: 'スコアを試す',
    samplePlaceholder: '投稿文をここに入力（例: 絶対に許せない。けしからん。）',
    focusMode: 'アート集中モード',
    focusModeHint: 'まとめて隠すプリセット。やさしめ=義憤系のみ(0.6)／ふつう=話題系も隠すが災害情報は残す(0.5)／きびしめ=災害も含め全部隠す(0.4)。「なし」で個別設定に戻ります。',
    presetOff: 'なし（個別設定）',
    presetSoft: 'やさしめ（誤爆少なめ）',
    presetNormal: 'ふつう（災害情報は残す）',
    presetHard: 'きびしめ（全部隠す）',
    quiet: '通知を静かにする',
    hideNotifications: '通知バッジを隠す',
    hideNotificationTab: '通知タブごと隠す',
    hideDm: 'DMバッジを隠す',
    quietHint: 'X上のバッジ／タブを非表示にします（通知そのものは止まりません）。',
    excludeSelf: '自分の投稿はフィルターから除外',
    excludeReplies: 'リプライはフィルターしない',
    remute: 'ミュート',
    remuteTitle: 'この投稿を再度ミュートする',
    statToday: 'きょう隠した数',
    statTotal: '累計',
    reset: '設定をリセット',
    maskedBadge: '義憤ミュート $1%',
    show: '表示',
    hide: '隠す',
    pause: '停止',
    resume: '再開',
    barLabel: '義憤ミュート: $1',
    cat_attack: '攻撃・侮蔑',
    cat_hostility: '憎悪・敵意',
    cat_incitement: '煽り・呼びかけ',
    cat_absolute: '断定・絶対化',
    cat_othering: '二項対立・レッテル',
    cat_cynicism: '冷笑・皮肉',
    cat_urgency: '危機煽り',
    cat_profanity: '差別・蔑称語',
    cat_badwords: '下品・罵倒語',
    cat_amplifier: '感情誇張',
    cat_politics: '政治',
    cat_conspiracy: '陰謀論',
    cat_ai_dispute: 'AI論争',
    cat_world_affairs: '世界情勢・戦争',
    cat_tone: '文体・口調',
    cat_selfmock: '自虐・自己卑下',
    cat_disaster: '災害・緊急情報',
    cat_ai_topic: 'AI技術・界隈',
    cat_nsfw: 'NSFW・性的表現',
    presetOff: 'なし（個別設定）',
    presetSoft: 'やさしめ（誤爆少なめ）',
    presetNormal: 'ふつう（災害情報は残す）',
    presetHard: 'きびしめ（全部隠す）',
    hideNotificationTab: '通知タブごと隠す',
    reasonLong: '長文を非表示',
    reasonReply: 'リプライを非表示',
    focusMaxLength: '集中モードで隠す長さ（文字）',
    focusMaxLengthHint: '集中モード中、これより長い投稿は隠します（0で無効）。',
    focusHideReplies: '集中モードでリプライも隠す',
    userDict: 'ユーザー辞書',
    userDictEnabled: 'ユーザー辞書を使う',
    userDictManage: '単語を管理',
    userDictHint: '自分で登録した語を含む投稿を隠します（部分一致・大文字小文字と全角/半角は無視）。',
    userDictPlaceholder: 'ミュートしたい語を入力（例: 案件、副業）',
    userDictAdd: '追加',
    userDictAll: 'すべて削除',
    userDictEmpty: 'まだ登録されていません',
    userDictDelete: '削除',
    userDictCount: '$1 語',
    userDictNote: '※ 部分一致のため、短い語は誤って多くを隠すことがあります。',
    reasonUser: 'ユーザー辞書: $1',
    enabledOn: '✅ 有効',
    enabledOff: '無効',
    toggledOn: '義憤ミュート: 有効',
    toggledOff: '義憤ミュート: 無効'
  };

  var DEFAULT_LOCALE = 'en';

  // 判定言語 → UIロケール（_locales のディレクトリ名）
  var LOCALE = {
    ja: 'ja', en: 'en', zh: 'zh_CN', zh_hant: 'zh_TW', ko: 'ko', ru: 'ru', uk: 'uk',
    de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt', nl: 'nl', pl: 'pl', cs: 'cs', hu: 'hu',
    fi: 'fi', sv: 'sv', da: 'da', no: 'no', tr: 'tr', ar: 'ar', fa: 'fa', hi: 'hi', th: 'th',
    fil: 'fil', vi: 'vi', id: 'id', ms: 'ms', bn: 'bn', ur: 'ur', ta: 'ta', te: 'te', he: 'he',
    el: 'el', ro: 'ro', bg: 'bg', sr: 'sr', hr: 'hr', sk: 'sk', lt: 'lt', lv: 'lv', et: 'et',
    ca: 'ca', sw: 'sw', mk: 'mk', mn: 'mn', ne: 'ne', si: 'si'
  };

  var tables = {}; // locale -> {key: message}
  var loading = {};
  var uiLang = null; // ユーザーが選んだUIロケール（null=ブラウザに従う）

  /** 判定言語からUIロケールを求める（'auto'・統合パックは null＝ブラウザ任せ） */
  function localeFor(language) {
    if (!language || language === 'auto') return null;
    return LOCALE[language] || null;
  }

  function setUILanguage(locale) {
    uiLang = locale || null;
  }

  function getURL(path) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
      }
    } catch (e) {
      /* noop */
    }
    return null;
  }

  function fetchTable(locale) {
    if (Object.prototype.hasOwnProperty.call(tables, locale)) return Promise.resolve(tables[locale]);
    if (loading[locale]) return loading[locale];
    // 同梱ロケール（ユーザースクリプト等、fetch できない環境向け）
    var inline = null;
    try {
      if (typeof globalThis !== 'undefined' && globalThis.JOF && globalThis.JOF.locales) {
        inline = globalThis.JOF.locales[locale];
      }
    } catch (e) {
      /* noop */
    }
    if (inline) {
      var t0 = {};
      Object.keys(inline).forEach(function (k) {
        var v = inline[k];
        if (typeof v === 'string') t0[k] = v;
        else if (v && v.message) t0[k] = v.message;
      });
      tables[locale] = t0;
      return Promise.resolve(t0);
    }
    var url = getURL('_locales/' + locale + '/messages.json');
    if (!url || typeof fetch !== 'function') {
      tables[locale] = {};
      return Promise.resolve(tables[locale]);
    }
    loading[locale] = fetch(url)
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (json) {
        var out = {};
        if (json) {
          Object.keys(json).forEach(function (k) {
            if (json[k] && json[k].message) out[k] = json[k].message;
          });
        }
        tables[locale] = out;
        return out;
      })
      .catch(function () {
        tables[locale] = {};
        return {};
      });
    return loading[locale];
  }

  /** 選択言語にUIを追従させる。locale=null ならブラウザのロケールを使う。 */
  function load(locale) {
    uiLang = locale || null;
    if (!uiLang) return Promise.resolve();
    var jobs = [fetchTable(uiLang)];
    if (uiLang !== DEFAULT_LOCALE) jobs.push(fetchTable(DEFAULT_LOCALE));
    return Promise.all(jobs);
  }

  function t(key, subs) {
    var msg = null;
    if (uiLang) {
      // 選択言語 → 既定(en) の順で引く
      if (tables[uiLang] && tables[uiLang][key]) msg = tables[uiLang][key];
      if (!msg && tables[DEFAULT_LOCALE] && tables[DEFAULT_LOCALE][key]) msg = tables[DEFAULT_LOCALE][key];
    } else {
      // 'auto' はブラウザのロケール（chrome.i18n）
      try {
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
          msg = chrome.i18n.getMessage(key, subs);
        }
      } catch (e) {
        /* noop */
      }
    }
    if (!msg) msg = FALLBACK[key];
    if (msg == null) return key;
    if (subs && subs.length) {
      for (var i = 0; i < subs.length; i++) {
        msg = msg.split('$' + (i + 1)).join(String(subs[i]));
      }
    }
    return msg;
  }

  /** data-i18n / data-i18n-placeholder を反映する。 */
  function apply(rootEl) {
    var scope = rootEl || (typeof document !== 'undefined' ? document : null);
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('lang', uiLang || (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : 'ja'));
    }
  }

  return { t: t, apply: apply, load: load, setUILanguage: setUILanguage, localeFor: localeFor, FALLBACK: FALLBACK };
});


/* ===== src/lib/scoring.js ===== */

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
      require('./lang/aitopic.js'),
      require('./lang/nsfw.js')
    );
  } else {
    var JOF = root.JOF = root.JOF || {};
    JOF.scoring = factory(JOF.normalize, JOF.categories, JOF.lang, JOF.langBuild, JOF.style, JOF.disaster, JOF.selfmock, JOF.aitopic, JOF.nsfw);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (normalize, categories, lang, build, style, disaster, selfmock, aitopic, nsfw) {
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
    // 用語レイヤー（辞書の語を「独立トグルできるカテゴリ」へ移し替える）
    //   from が null のレイヤーは全カテゴリに対して判定する（selfmock）
    var LAYERS = [];
    if (disaster) LAYERS.push({ id: 'disaster', api: disaster, from: 'world_affairs', context: false });
    if (selfmock) LAYERS.push({ id: 'selfmock', api: selfmock, from: null, context: true });
    if (aitopic) LAYERS.push({ id: 'ai_topic', api: aitopic, from: 'ai_dispute', context: false });
    if (nsfw) LAYERS.push({ id: 'nsfw', api: nsfw, from: 'badwords', context: false });

    function emit(hit, w, kind, start, end) {
      var cat = hit.cat;
      for (var li = 0; li < LAYERS.length; li++) {
        var L = LAYERS[li];
        if (L.from && cat !== L.from) continue;
        var isLayerTerm = L.api.isTerm(hit.n, pack.id);
        var inContext =
          L.context &&
          typeof start === 'number' &&
          L.api.isSelfContext(text, start, typeof end === 'number' ? end : start, pack.id);
        if (isLayerTerm || inContext) cat = L.id;
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

    // ---- 1-3. 辞書の一致 ----
    if (pack.match === 'word') {
      scanWord(pack, text, emit);
    } else {
      scanSubstring(pack, text, emit);
    }

    // ---- 辞書に無い追加語（災害・自虐・AI技術）----
    for (var ei = 0; ei < LAYERS.length; ei++) {
      var ex = LAYERS[ei].api.extraIndex(pack);
      if (ex && ex.index) scanExtra(ex.match, ex.index, text, emit);
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
    if (style) {
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
  function scanSubstring(pack, text, emit) {
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

      if (!excluded) {
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
  function scanWord(pack, text, emit) {
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

      {
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


/* ===== src/content.js ===== */

/**
 * content script: X の投稿を検出し、義憤スコアで CSS ミュートする（多言語対応）。
 *
 * 流れ:
 *   article[data-testid="tweet"] を検出
 *     -> 本文 + 引用本文を取り出す
 *     -> 言語を自動判定（または設定言語）してスコア算出
 *     -> しきい値以上ならセルにクラスを付け、ぼかし or 非表示
 *
 * すべてローカルで完結（外部通信なし）。
 */
(function () {
  'use strict';

  var JOF = globalThis.JOF;
  if (!JOF || !JOF.scoring || !JOF.config || !JOF.categories || !JOF.i18n) return;

  var scoring = JOF.scoring;
  var config = JOF.config;
  var cats = JOF.categories;
  var i18n = JOF.i18n;
  var selfpost = JOF.selfpost;
  var reply = JOF.reply;
  var userdict = JOF.userdict;

  var TWEET_SEL = 'article[data-testid="tweet"]';
  var CELL_SEL = '[data-testid="cellInnerDiv"]';

  var settings = Object.assign({}, config.DEFAULTS);
  var observer = null;
  var bar = null;
  var scanTimer = null;

  function catLabel(id) {
    return i18n.t('cat_' + id) || cats.CATEGORY_LABELS[id] || id;
  }

  /**
   * 有効カテゴリを解決する。
   * 設定が未指定(null)なら「トピック系(任意)を除く全部」を使う。
   */
  function coreCategories() {
    return cats.CATEGORY_ORDER.filter(function (id) {
      return config.OPTIONAL_CATEGORIES.indexOf(id) < 0;
    });
  }

  /**
   * 集中プリセット。
   *   soft(やさしめ)  … 義憤系のみ・しきい値0.6（誤爆少なめ）
   *   normal(ふつう)  … ざわつく話題も隠す・災害情報は残す・0.5
   *   hard(きびしめ)  … 災害も含め全部隠す・0.4
   *   off             … ユーザーの個別設定
   */
  function effectiveCategories() {
    var p = config.presetCategories(settings.preset, cats.CATEGORY_ORDER, config.OPTIONAL_CATEGORIES);
    if (p) return p;
    if (Array.isArray(settings.categories)) return settings.categories;
    return coreCategories();
  }

  function effectiveThreshold() {
    return config.presetThreshold(settings.preset, settings.threshold);
  }

  // ---------------------------------------------------------------- 静音（通知/DMバッジ）
  var QUIET_ROOT = '[data-testid="AppTabBar_Notifications_Link"],[data-testid="AppTabBar_DirectMessage_Link"],[data-testid="DMDrawer"]';

  function hideQuiet(el) {
    if (!el || el.dataset.jofQuiet === '1') return;
    el.dataset.jofQuiet = '1';
    el.style.setProperty('display', 'none', 'important');
  }

  function restoreQuiet() {
    var hidden = document.querySelectorAll('[data-jof-quiet]');
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].style.removeProperty('display');
      delete hidden[i].dataset.jofQuiet;
    }
  }

  function applyQuiet() {
    if (!settings.hideNotifications && !settings.hideDm && !settings.hideNotificationTab) {
      restoreQuiet();
      return;
    }
    // 通知タブごと隠す
    if (settings.hideNotificationTab) {
      var tabs = document.querySelectorAll('[data-testid="AppTabBar_Notifications_Link"]');
      for (var t = 0; t < tabs.length; t++) hideQuiet(tabs[t]);
    }
    if (!settings.hideNotifications && !settings.hideDm) return;
    var sel = [];
    if (settings.hideNotifications) {
      sel.push('[data-testid="AppTabBar_Notifications_Link"]', '[data-testid="DMDrawer"]');
    }
    if (settings.hideDm) {
      sel.push('[data-testid="AppTabBar_DirectMessage_Link"]', '[data-testid="DMDrawer"]');
    }
    var roots = document.querySelectorAll(sel.join(','));
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      // 数字だけのバッジ（未読件数）
      var all = root.querySelectorAll('div,span');
      for (var j = 0; j < all.length; j++) {
        var el = all[j];
        if (el.children.length === 0) {
          var t = (el.textContent || '').trim();
          if (/^[0-9]{1,3}\+?$/.test(t)) hideQuiet(el);
        }
      }
      // 「未読」を示す要素
      var labeled = root.querySelectorAll('[aria-label]');
      for (var k = 0; k < labeled.length; k++) {
        var al = labeled[k].getAttribute('aria-label') || '';
        if (/unread|new posts|new items|未読/i.test(al)) hideQuiet(labeled[k]);
      }
    }
  }

  // ---------------------------------------------------------------- settings
  function loadSettings() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get([config.PERSIST_KEY], function (res) {
          settings = config.normalizeSettings((res && res[config.PERSIST_KEY]) || {});
          resolve(settings);
        });
      } catch (e) {
        resolve(settings);
      }
    });
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || !changes[config.PERSIST_KEY]) return;
    var prevLang = settings.language;
    settings = config.normalizeSettings(changes[config.PERSIST_KEY].newValue || {});
    document.body.classList.toggle('jof-reveal-all', !settings.enabled);
    var go = function () {
      resetAll();
      if (bar) {
        bar.remove();
        bar = null;
      }
      scheduleScan();
      updateBar();
    };
    // 言語が変わったらUI文言も読み直す（オーバーレイ/バーの表示を更新）
    if (settings.language !== prevLang) i18n.load(i18n.localeFor(settings.language)).then(go);
    else go();
  });

  // ---------------------------------------------------------------- helpers
  function textOf(el) {
    var s = el.innerText || el.textContent || '';
    return s.replace(/\s+/g, ' ').trim();
  }

  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function getTweetContent(article) {
    var nodes = article.querySelectorAll('[data-testid="tweetText"]');
    if (!nodes.length) return null;
    var text = textOf(nodes[0]);
    var quote = '';
    for (var i = 1; i < nodes.length; i++) quote += ' ' + textOf(nodes[i]);
    return { text: text, quote: quote.trim() };
  }

  function cellOf(article) {
    return article.closest(CELL_SEL) || article;
  }

  // ---------------------------------------------------------------- masking
  function clearMask(cell) {
    cell.classList.remove('jof-masked', 'jof-blur', 'jof-gone', 'jof-relative');
    var ov = cell.querySelector(':scope > .jof-overlay');
    if (ov) ov.remove();
    var rb = cell.querySelector(':scope > .jof-remute');
    if (rb) rb.remove();
  }

  /** 表示した投稿の右上に「再度ミュート」ボタンを付ける */
  function addRemuteButton(cell, result) {
    if (settings.mode === 'hide') return; // 完全非表示は個別に戻せない
    if (cell.querySelector(':scope > .jof-remute')) return;
    cell.classList.add('jof-relative');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'jof-remute';
    b.textContent = i18n.t('remute');
    b.title = i18n.t('remuteTitle');
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      b.remove();
      cell.classList.remove('jof-relative');
      mask(cell, result);
    });
    cell.appendChild(b);
  }

  // ---- 自分のハンドル検出（自分の投稿は除外できるように）----
  var ownHandle = null;
  function detectOwnHandle() {
    if (ownHandle) return ownHandle;
    if (!selfpost) return null;
    var btn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (btn) ownHandle = selfpost.parseHandle(btn.textContent || '');
    if (!ownHandle) {
      var a = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
      var href = a ? a.getAttribute('href') || '' : '';
      var m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (m) ownHandle = m[1].toLowerCase();
    }
    return ownHandle;
  }

  function isOwnArticle(article) {
    if (!settings.excludeSelf) return false;
    var own = detectOwnHandle();
    if (!own) return false;
    var un = article.querySelector('[data-testid="User-Name"]');
    return !!(un && selfpost.isOwn(own, un.textContent));
  }

  // ---- リプライ判定（集中モードでリプライを隠すのに使う）----
  // 「返信先」行は多言語なので、ヘッダ部分（本文を除く）のテキストで判定する
  function replyHeadText(article) {
    var un = article.querySelector('[data-testid="User-Name"]');
    if (!un) return '';
    var tt = article.querySelector('[data-testid="tweetText"]');
    var el = un;
    while (el.parentElement && el.parentElement !== article && (!tt || !el.parentElement.contains(tt))) {
      el = el.parentElement;
    }
    var container = el.parentElement && el.parentElement !== article ? el.parentElement : el;
    var full = container.textContent || '';
    if (tt) {
      var t = tt.textContent || '';
      if (t) {
        var idx = full.indexOf(t);
        if (idx > 0) full = full.slice(0, idx);
      }
    }
    return full.slice(0, 300);
  }

  function isReplyArticle(article) {
    return !!(reply && reply.isReplyText(replyHeadText(article)));
  }

  function mask(cell, result) {
    cell.classList.add('jof-masked');
    cell.dataset.jofState = 'masked';
    if (settings.mode === 'hide') {
      cell.classList.add('jof-gone');
    } else {
      cell.classList.add('jof-blur');
      if (settings.showOverlay !== false) cell.appendChild(buildOverlay(result, cell));
    }
    updateBar();
    report(result);
  }

  function buildOverlay(result, cell) {
    var el = document.createElement('div');
    el.className = 'jof-overlay';

    var badge = document.createElement('div');
    badge.className = 'jof-badge';
    badge.textContent =
      result && result.reason === 'long'
        ? i18n.t('reasonLong', [result.length])
        : result && result.reason === 'reply'
          ? i18n.t('reasonReply')
          : result && result.reason === 'user'
            ? i18n.t('reasonUser', [result.word || ''])
            : i18n.t('maskedBadge', [Math.round((result.score || 0) * 100)]);

    var catEl = document.createElement('div');
    catEl.className = 'jof-cats';
    var names = (result && result.categories ? result.categories : [])
      .slice(0, 3)
      .map(function (c) {
        return catLabel(c);
      });
    catEl.textContent = result && result.reason ? '' : names.length ? names.join(' / ') : '';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jof-show-btn';
    btn.textContent = i18n.t('show');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearMask(cell);
      cell.dataset.jofState = 'shown';
      addRemuteButton(cell, result);
      updateBar();
    });

    el.append(badge, catEl, btn);
    return el;
  }

  // ---------------------------------------------------------------- evaluate
  function evaluateArticle(article) {
    var cell = cellOf(article);
    var tw = getTweetContent(article);
    if (!tw) return;

    var sig = hash(tw.text + '\u0000' + tw.quote);
    var state = cell.dataset.jofState || '';

    if (cell.dataset.jofSig === sig && state) {
      if (
        state === 'masked' &&
        settings.mode !== 'hide' &&
        settings.showOverlay !== false &&
        !cell.querySelector(':scope > .jof-overlay')
      ) {
        try {
          cell.appendChild(buildOverlay(JSON.parse(cell.dataset.jofResult || '{}'), cell));
        } catch (e) {
          /* noop */
        }
      }
      return;
    }

    clearMask(cell);
    cell.dataset.jofSig = sig;

    if (!settings.enabled) {
      cell.dataset.jofState = 'off';
      return;
    }

    // 自分の投稿は除外（トグル）
    if (isOwnArticle(article)) {
      cell.dataset.jofState = 'self';
      return;
    }

    // リプライはフィルターしない（トグル・既定OFF）
    if (settings.excludeReplies && isReplyArticle(article)) {
      cell.dataset.jofState = 'reply-skip';
      return;
    }

    var combined = tw.quote ? tw.text + '\n' + tw.quote : tw.text;
    if (!combined || combined.length < (settings.minLength || 0)) {
      cell.dataset.jofState = 'short';
      return;
    }

    // 集中モードでは長文を避ける（アート中心のタイムラインに）
    var maxLen = config.effectiveMaxLength(settings.preset, settings.focusMaxLength);
    if (maxLen > 0 && combined.length > maxLen) {
      var longResult = {
        score: 1,
        raw: 0,
        categories: [],
        byCat: {},
        terms: [],
        reason: 'long',
        length: combined.length
      };
      cell.dataset.jofResult = JSON.stringify(longResult);
      cell.dataset.jofScore = '1';
      mask(cell, longResult);
      return;
    }

    // 集中モードではリプライ投稿も避ける
    if (config.effectiveReplyHide(settings.preset, settings.focusHideReplies) && isReplyArticle(article)) {
      var replyResult = { score: 1, raw: 0, categories: [], byCat: {}, terms: [], reason: 'reply' };
      cell.dataset.jofResult = JSON.stringify(replyResult);
      cell.dataset.jofScore = '1';
      mask(cell, replyResult);
      return;
    }

    // ユーザー辞書（自分で登録したミュートワード）
    if (settings.userWordsEnabled !== false && userdict && settings.userWords && settings.userWords.length) {
      var uw = userdict.find(combined, settings.userWords);
      if (uw) {
        var userResult = {
          score: 1,
          raw: 0,
          categories: [],
          byCat: {},
          terms: [],
          reason: 'user',
          word: uw
        };
        cell.dataset.jofResult = JSON.stringify(userResult);
        cell.dataset.jofScore = '1';
        mask(cell, userResult);
        return;
      }
    }

    var result = scoring.analyze(combined, {
      lang: settings.language,
      categories: effectiveCategories()
    });
    cell.dataset.jofResult = JSON.stringify({
      score: result.score,
      categories: result.categories,
      byCat: result.byCat,
      terms: result.terms.slice(0, 8)
    });
    cell.dataset.jofScore = result.score.toFixed(3);

    if (result.score >= effectiveThreshold()) {
      mask(cell, result);
    } else {
      cell.dataset.jofState = 'clear';
    }
  }

  // ---------------------------------------------------------------- scanning
  function scan() {
    applyQuiet();
    var articles = document.querySelectorAll(TWEET_SEL);
    for (var i = 0; i < articles.length; i++) {
      if (articles[i].parentElement && articles[i].parentElement.closest(TWEET_SEL)) continue;
      try {
        evaluateArticle(articles[i]);
      } catch (e) {
        if (settings && settings.debug) console.debug('[outrage-mute]', e);
      }
    }
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      scan();
    }, 250);
  }

  function resetAll() {
    var cells = document.querySelectorAll(CELL_SEL + '[data-jof-state]');
    for (var i = 0; i < cells.length; i++) {
      clearMask(cells[i]);
      delete cells[i].dataset.jofState;
    }
    restoreQuiet();
  }

  // ---------------------------------------------------------------- floating bar
  function hiddenCount() {
    return document.querySelectorAll('.jof-masked').length;
  }

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'jof-bar';

    var label = document.createElement('span');
    label.className = 'jof-bar-label';

    var reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'jof-bar-reveal';
    reveal.addEventListener('click', function () {
      toggleRevealAll();
    });

    var pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'jof-bar-pause';
    pause.addEventListener('click', function () {
      var next = config.normalizeSettings(Object.assign({}, settings, { enabled: !settings.enabled }));
      var patch = {};
      patch[config.PERSIST_KEY] = next;
      chrome.storage.local.set(patch);
    });

    bar.append(label, reveal, pause);
    (document.body || document.documentElement).appendChild(bar);
    return bar;
  }

  function updateBar() {
    var count = hiddenCount();
    var revealAll = document.body.classList.contains('jof-reveal-all');
    if (!count && !revealAll && !bar) return;
    if (!count && !revealAll) {
      if (bar) {
        bar.remove();
        bar = null;
      }
      return;
    }
    var b = ensureBar();
    b.querySelector('.jof-bar-label').textContent = i18n.t('barLabel', [count]);
    b.querySelector('.jof-bar-reveal').textContent = revealAll ? i18n.t('hide') : i18n.t('show');
    b.querySelector('.jof-bar-pause').textContent = settings.enabled ? i18n.t('pause') : i18n.t('resume');
  }

  function toggleRevealAll(force) {
    var on = typeof force === 'boolean' ? force : !document.body.classList.contains('jof-reveal-all');
    document.body.classList.toggle('jof-reveal-all', on);
    updateBar();
  }

  // ---- 有効/無効のトースト表示 ----
  var toastEl = null;
  var toastTimer = null;
  function showToast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'jof-toast';
      (document.body || document.documentElement).appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('jof-toast-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('jof-toast-on');
    }, 1600);
  }

  // ---- ショートカット: Shift+1 で有効/無効を切替（PC）----
  function onShortcut(e) {
    if (!e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    // 配列差を吸収（US/JIS いずれも Shift+1 はコード Digit1）
    if (e.code !== 'Digit1' && e.key !== '!') return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    var next = config.toggleEnabled(settings);
    var patch = {};
    patch[config.PERSIST_KEY] = next;
    chrome.storage.local.set(patch);
    showToast(next.enabled ? i18n.t('toggledOn') : i18n.t('toggledOff'));
  }

  // ---------------------------------------------------------------- stats
  function report(result) {
    try {
      chrome.runtime.sendMessage({ type: 'jof:masked', score: result.score }, function () {
        void chrome.runtime.lastError;
      });
    } catch (e) {
      /* noop */
    }
  }

  // ---------------------------------------------------------------- init
  function init() {
    loadSettings()
      .then(function () {
        return i18n.load(i18n.localeFor(settings.language));
      })
      .then(function () {
        document.body.classList.toggle('jof-reveal-all', !settings.enabled);
        scan();
        observer = new MutationObserver(function () {
          scheduleScan();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        updateBar();
        document.addEventListener('keydown', onShortcut, true);
      });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();


/* ===== userscript/ui.js ===== */

/**
 * ユーザースクリプト用の設定パネル（拡張のポップアップ相当）。
 *
 * Userscripts（iOS Safari）には popup が無いので、ページ内に
 * フローティングの⚙ボタンと設定パネルを用意する。
 * 判定ロジック・保存（chrome.storage シム）は拡張と共通。
 */
(function () {
  'use strict';
  var JOF = globalThis.JOF;
  if (!JOF || !JOF.config || !JOF.categories || !JOF.i18n || !JOF.scoring) return;

  var config = JOF.config;
  var cats = JOF.categories;
  var lang = JOF.lang;
  var i18n = JOF.i18n;
  var scoring = JOF.scoring;
  var t = i18n.t;

  var settings = config.normalizeSettings({});
  var stats = { masked: 0, today: 0, date: '' };

  var CSS =
    '.jof-ui-fab{position:fixed;left:14px;bottom:14px;z-index:2147483647;width:34px;height:34px;border-radius:999px;' +
    'border:1px solid rgba(255,255,255,.25);background:rgba(20,20,24,.92);color:#ffb59b;font-size:16px;cursor:pointer;' +
    'box-shadow:0 4px 14px rgba(0,0,0,.4)}' +
    '.jof-ui-panel{position:fixed;left:14px;bottom:58px;z-index:2147483647;width:300px;max-height:78vh;overflow:auto;' +
    'background:rgba(20,20,24,.97);color:#eee;border:1px solid #33343c;border-radius:12px;padding:12px;' +
    'font:13px/1.5 system-ui,-apple-system,"Hiragino Kaku Gothic ProN",Meiryo,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)}' +
    '.jof-ui-panel h2{font-size:14px;margin:0 0 8px;color:#ffb59b}' +
    '.jof-ui-panel .s{margin:10px 0;padding-top:8px;border-top:1px solid #2c2c33}' +
    '.jof-ui-panel label{display:flex;align-items:center;gap:6px;margin:3px 0}' +
    '.jof-ui-panel .grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px}' +
    '.jof-ui-panel .hint{color:#9a9aa5;font-size:11px;margin:4px 0 0}' +
    '.jof-ui-panel select,.jof-ui-panel input[type=number],.jof-ui-panel textarea{background:#101014;color:#eee;' +
    'border:1px solid #33343c;border-radius:6px;padding:3px 6px;font:inherit}' +
    '.jof-ui-panel textarea{width:100%;min-height:48px;resize:vertical}' +
    '.jof-ui-panel .row{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
    '.jof-ui-panel .res{margin-top:6px;padding:6px 8px;border-radius:6px;background:rgba(228,87,46,.12);font-size:12px}' +
    '.jof-ui-panel button{padding:4px 12px;border:1px solid #33343c;border-radius:999px;background:transparent;color:inherit;cursor:pointer}' +
    '.jof-ui-panel .opt{color:#e4572e}' +
    '.jof-ui-panel .kbd{display:inline-block;padding:1px 6px;border:1px solid #33343c;border-radius:5px;' +
    'font-size:10px;color:#9a9aa5;white-space:nowrap}' +
    '.jof-ui-panel h2 .on{color:#6bd08a}' +
    '.jof-ui-panel h2 .off{color:#9a9aa5}';

  // Tampermonkey/Android 向け（タップしやすく・画面幅に追従）
  var MOBILE_CSS =
    '.jof-ui-fab{width:46px;height:46px;font-size:20px;left:12px;bottom:12px}' +
    '.jof-ui-panel{width:min(360px,94vw);max-height:74vh;bottom:70px;font-size:15px;-webkit-overflow-scrolling:touch}' +
    '.jof-ui-panel button{padding:9px 16px;font-size:14px}' +
    '.jof-ui-panel label{margin:6px 0}' +
    '.jof-ui-panel input[type=checkbox]{width:18px;height:18px}' +
    '.jof-ui-panel select,.jof-ui-panel input[type=number]{padding:7px 9px;font-size:15px}';

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function catLabel(id) {
    return t('cat_' + id) || cats.CATEGORY_LABELS[id] || id;
  }

  function coreCats() {
    return cats.CATEGORY_ORDER.filter(function (id) {
      return config.OPTIONAL_CATEGORIES.indexOf(id) < 0;
    });
  }

  function effectiveCategories() {
    var p = config.presetCategories(settings.preset, cats.CATEGORY_ORDER, config.OPTIONAL_CATEGORIES);
    if (p) return p;
    return Array.isArray(settings.categories) ? settings.categories : coreCats();
  }

  function injectCSS() {
    var s = document.createElement('style');
    s.id = 'jof-style';
    s.textContent = (JOF.css || '') + CSS + (JOF.mobile ? MOBILE_CSS : '');
    (document.head || document.documentElement).appendChild(s);
  }

  // ---- コントロール ----
  function check(key, label, checked, extra) {
    var l = h('label');
    var c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = !!checked;
    c.dataset.key = key;
    if (extra) c.dataset.extra = extra;
    l.appendChild(c);
    l.appendChild(document.createTextNode(label));
    return l;
  }

  function selectRow(key, label, options, value) {
    var row = h('div', 'row');
    row.appendChild(h('span', null, label));
    var s = document.createElement('select');
    s.dataset.key = key;
    options.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0];
      op.textContent = o[1];
      s.appendChild(op);
    });
    s.value = value;
    row.appendChild(s);
    return row;
  }

  function rangeRow(key, label, value) {    var wrap = h('div');
    var row = h('div', 'row');
    row.appendChild(h('span', null, label));
    var out = h('output', null, Number(value).toFixed(2));
    row.appendChild(out);
    wrap.appendChild(row);
    var r = document.createElement('input');
    r.type = 'range';
    r.min = '0.3';
    r.max = '0.9';
    r.step = '0.05';
    r.value = String(value);
    r.style.width = '100%';
    r.dataset.key = key;
    r.addEventListener('input', function () {
      out.textContent = Number(r.value).toFixed(2);
    });
    wrap.appendChild(r);
    return wrap;
  }

  function numberRow(key, label, value, min, max) {
    var row = h('div', 'row');
    row.appendChild(h('span', null, label));
    var i = document.createElement('input');
    i.type = 'number';
    i.min = String(min);
    i.max = String(max);
    i.step = '10';
    i.value = String(value);
    i.dataset.key = key;
    i.style.width = '72px';
    row.appendChild(i);
    return row;
  }

  function radioRow(key, label, options, value) {
    var wrap = h('div');
    wrap.appendChild(h('div', 'hint', label));
    options.forEach(function (o) {
      var l = h('label');
      var r = document.createElement('input');
      r.type = 'radio';
      r.name = 'jof-' + key;
      r.value = o[0];
      r.checked = o[0] === value;
      r.dataset.key = key;
      l.appendChild(r);
      l.appendChild(document.createTextNode(o[1]));
      wrap.appendChild(l);
    });
    return wrap;
  }

  function heading(text) {
    return h('div', 's', text);
  }

  function hint(text) {
    return h('p', 'hint', text);
  }

  // ---- パネル ----
  var fab, panel, body;

  function buildShell() {
    fab = h('button', 'jof-ui-fab', '⚙');
    fab.title = t('title');
    fab.addEventListener('click', function () {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    panel = h('div', 'jof-ui-panel');
    panel.style.display = 'none';
    body = h('div', 'jof-panel-body');
    panel.appendChild(body);
    panel.addEventListener('change', onControlChange);
    panel.addEventListener('input', onControlChange);
    document.documentElement.appendChild(fab);
    document.documentElement.appendChild(panel);
  }

  function onControlChange(e) {
    var el = e.target;
    var key = el.dataset && el.dataset.key;
    if (!key) return;
    if (key === 'categories') {
      var ids = [];
      body.querySelectorAll('input[data-key="categories"]').forEach(function (c) {
        if (c.checked) ids.push(c.dataset.extra);
      });
      settings.categories = ids;
    } else if (key === 'mode') {
      settings.mode = el.value;
    } else if (key === 'preset') {
      settings.preset = el.value;
    } else if (key === 'language') {
      settings.language = el.value;
    } else if (key === 'threshold') {
      settings.threshold = parseFloat(el.value);
    } else if (key === 'focusMaxLength') {
      settings.focusMaxLength = parseInt(el.value, 10) || 0;
    } else if (key === 'minLength') {
      settings.minLength = parseInt(el.value, 10) || 0;
    } else {
      settings[key] = el.type === 'checkbox' ? el.checked : el.value;
    }
    settings = config.normalizeSettings(settings);
    var patch = {};
    patch[config.PERSIST_KEY] = settings;
    chrome.storage.local.set(patch);
    var wasLang = el.dataset.key === 'language';
    if (wasLang) {
      i18n.load(i18n.localeFor(settings.language)).then(render);
    } else {
      updateTest();
    }
  }

  // ユーザー辞書は別ウィンドウで編集（拡張の dict.html 相当をその場で生成）
  function openDictWindow() {
    var w = window.open('', 'jof-dict', 'width=420,height=580,menubar=no,toolbar=no,location=no,status=no');
    if (!w) return;
    try {
      var d = w.document;
      d.open();
      d.write(
        '<!DOCTYPE html><html lang="' +
          (navigator.language || 'ja') +
          '"><head><meta charset="utf-8"><title>' +
          (t('userDict') || 'User dictionary') +
          '</title></head><body><div id="jof-dict-root"></div></body></html>'
      );
      d.close();
      if (JOF.dictEditor) JOF.dictEditor.createEditor(d, chrome).load();
    } catch (e) {
      /* noop */
    }
    w.focus();
  }

  function render() {
    body.textContent = '';
    var hd = h('h2');
    hd.appendChild(document.createTextNode(t('title') + '　'));
    hd.appendChild(h('span', 'kbd', 'Shift+1'));
    var onOff = h('span', settings.enabled ? 'on' : 'off', '　' + (settings.enabled ? t('enabledOn') : t('enabledOff')));
    hd.appendChild(onOff);
    body.appendChild(hd);
    body.appendChild(check('enabled', t('enabled'), settings.enabled));
    body.appendChild(heading(t('focusMode')));
    var presetOpts = config.PRESET_KEYS.map(function (k) {
      return [k, t('preset' + k.charAt(0).toUpperCase() + k.slice(1))];
    });
    body.appendChild(selectRow('preset', t('focusMode'), presetOpts, settings.preset));
    body.appendChild(numberRow('focusMaxLength', t('focusMaxLength'), settings.focusMaxLength, 0, 1000));
    body.appendChild(check('focusHideReplies', t('focusHideReplies'), settings.focusHideReplies));
    body.appendChild(hint(t('focusMaxLengthHint')));
    body.appendChild(hint(t('focusModeHint')));
    body.appendChild(rangeRow('threshold', t('threshold'), settings.threshold));
    body.appendChild(radioRow('mode', t('mode'), [['blur', t('modeBlur')], ['hide', t('modeHide')]], settings.mode));
    body.appendChild(check('showOverlay', t('showOverlay'), settings.showOverlay));
    body.appendChild(check('excludeSelf', t('excludeSelf'), settings.excludeSelf));
    body.appendChild(check('excludeReplies', t('excludeReplies'), settings.excludeReplies));
    var langOpts = [['auto', t('languageAuto')]].concat(
      lang.list().map(function (p) {
        return [p.id, p.name];
      })
    );
    body.appendChild(selectRow('language', t('language'), langOpts, settings.language));
    body.appendChild(heading(t('quiet')));
    body.appendChild(check('hideNotifications', t('hideNotifications'), settings.hideNotifications));
    body.appendChild(check('hideNotificationTab', t('hideNotificationTab'), settings.hideNotificationTab));
    body.appendChild(check('hideDm', t('hideDm'), settings.hideDm));
    body.appendChild(hint(t('quietHint')));
    body.appendChild(heading(t('userDict')));
    body.appendChild(check('userWordsEnabled', t('userDictEnabled'), settings.userWordsEnabled));
    var drow = h('div', 'row');
    drow.appendChild(h('span', 'hint', t('userDictCount', [(settings.userWords || []).length])));
    var dbtn = h('button', null, t('userDictManage'));
    dbtn.type = 'button';
    dbtn.addEventListener('click', openDictWindow);
    drow.appendChild(dbtn);
    body.appendChild(drow);
    body.appendChild(hint(t('userDictHint')));
    body.appendChild(heading(t('categories')));
    var grid = h('div', 'grid');
    var enabled = Array.isArray(settings.categories) ? settings.categories : coreCats();
    cats.CATEGORY_ORDER.filter(function (id) {
      return id !== 'amplifier';
    }).forEach(function (id) {
      var optional = config.OPTIONAL_CATEGORIES.indexOf(id) >= 0;
      var l = check('categories', catLabel(id) + (optional ? t('optionalSuffix') : ''), enabled.indexOf(id) >= 0, id);
      if (optional) l.className = 'opt';
      grid.appendChild(l);
    });
    body.appendChild(grid);
    body.appendChild(hint(t('categoriesHint')));
    body.appendChild(heading(t('tryScore')));
    var ta = document.createElement('textarea');
    ta.dataset.key = 'sample';
    ta.placeholder = t('samplePlaceholder');
    ta.addEventListener('input', updateTest);
    body.appendChild(ta);
    var res = h('div', 'res');
    res.id = 'jof-ui-test';
    body.appendChild(res);
    body.appendChild(heading(t('statTotal') + ' / ' + t('statToday')));
    var st = h('div', 'row');
    st.appendChild(h('span', null, String(stats.masked || 0) + ' / ' + todayCount()));
    body.appendChild(st);
    var reset = h('button', null, t('reset'));
    reset.type = 'button';
    reset.addEventListener('click', function () {
      settings = config.normalizeSettings({});
      stats = { masked: 0, today: 0, date: '' };
      var patch = {};
      patch[config.PERSIST_KEY] = settings;
      patch[config.STATS_KEY] = stats;
      chrome.storage.local.set(patch);
      i18n.load(i18n.localeFor(settings.language)).then(render);
    });
    body.appendChild(reset);
    updateTest();
    document.documentElement.setAttribute('lang', i18n.localeFor(settings.language) || (navigator.language || 'ja'));
  }

  function todayCount() {
    var today = new Date().toISOString().slice(0, 10);
    return stats.date === today ? stats.today || 0 : 0;
  }

  function updateTest() {
    var ta = body.querySelector('textarea[data-key="sample"]');
    var res = document.getElementById('jof-ui-test');
    if (!ta || !res) return;
    var text = ta.value.trim();
    if (!text) {
      res.textContent = '—';
      return;
    }
    var r = scoring.analyze(text, { lang: settings.language, categories: effectiveCategories() });
    var threshold = config.presetThreshold(settings.preset, settings.threshold);
    var names = (r.categories || []).map(catLabel).join(' / ');
    res.textContent = r.score.toFixed(2) + '  ' + (r.score >= threshold ? '→ ' + t('hide') : '→ ' + t('show')) + '  [' + r.lang + ']' + (names ? '\n' + names : '');
  }

  function load() {
    chrome.storage.local.get([config.PERSIST_KEY, config.STATS_KEY], function (res) {
      settings = config.normalizeSettings(res[config.PERSIST_KEY] || {});
      stats = res[config.STATS_KEY] || stats;
      i18n.load(i18n.localeFor(settings.language)).then(function () {
        injectCSS();
        buildShell();
        render();
        // ショートカット(Shift+1)や他画面での変更を反映（トグル処理は content.js 側）
        try {
          chrome.storage.onChanged.addListener(function (changes, area) {
            if (area === 'local' && changes[config.PERSIST_KEY]) {
              settings = config.normalizeSettings(changes[config.PERSIST_KEY].newValue || {});
              render();
            }
          });
        } catch (e) {
          /* noop */
        }
      });
    });
  }

  if (document.body) load();
  else document.addEventListener('DOMContentLoaded', load, { once: true });
})();

