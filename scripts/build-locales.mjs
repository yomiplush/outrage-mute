/**
 * UI ロケール（_locales/<code>/messages.json）を一括生成する。
 *
 *   node scripts/build-locales.mjs
 *
 * ここに無いキーは default_locale（en）にフォールバックする。
 * 全キーを翻訳済みの言語は ja / en / zh_CN / zh_TW / ko / ru / uk（手書き）。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const locDir = join(root, '_locales');

const T = {
  de: {
    extName: 'Outrage Mute', enabled: 'An', threshold: 'Schwellenwert',
    note: 'Alles wird auf deinem Gerät bewertet (nichts wird gesendet). Beiträge ab dem Schwellenwert werden unscharf oder ausgeblendet.',
    modeBlur: 'Unscharf (klicken zum Anzeigen)', modeHide: 'Vollständig ausblenden', showOverlay: 'Grund anzeigen',
    language: 'Sprache', languageAuto: 'Automatisch', optionalSuffix: ' (optional)', tryScore: 'Bewertung testen',
    reset: 'Zurücksetzen', show: 'Anzeigen', hide: 'Ausblenden', maskedBadge: 'Stumm $1%'
  },
  fr: {
    extName: 'Outrage Mute', enabled: 'Actif', threshold: 'Seuil',
    note: 'Tout est évalué sur votre appareil (rien n’est envoyé). Les posts au-dessus du seuil sont floutés ou masqués.',
    modeBlur: 'Flou (cliquer pour afficher)', modeHide: 'Masquer complètement', showOverlay: 'Afficher la raison',
    language: 'Langue', languageAuto: 'Automatique', optionalSuffix: ' (option)', tryScore: 'Tester le score',
    reset: 'Réinitialiser', show: 'Afficher', hide: 'Masquer', maskedBadge: 'Masqué $1%'
  },
  es: {
    extName: 'Outrage Mute', enabled: 'Activo', threshold: 'Umbral',
    note: 'Todo se evalúa en tu dispositivo (no se envía nada). Las publicaciones por encima del umbral se difuminan u ocultan.',
    modeBlur: 'Desenfoque (clic para mostrar)', modeHide: 'Ocultar del todo', showOverlay: 'Mostrar el motivo',
    language: 'Idioma', languageAuto: 'Automático', optionalSuffix: ' (opcional)', tryScore: 'Probar puntuación',
    reset: 'Restablecer', show: 'Mostrar', hide: 'Ocultar', maskedBadge: 'Silenciado $1%'
  },
  it: {
    extName: 'Outrage Mute', enabled: 'Attivo', threshold: 'Soglia',
    note: 'Tutto viene valutato sul tuo dispositivo (nulla viene inviato). I post sopra la soglia vengono sfocati o nascosti.',
    modeBlur: 'Sfoca (clicca per mostrare)', modeHide: 'Nascondi del tutto', showOverlay: 'Mostra il motivo',
    language: 'Lingua', languageAuto: 'Automatico', optionalSuffix: ' (opzionale)', tryScore: 'Prova il punteggio',
    reset: 'Reimposta', show: 'Mostra', hide: 'Nascondi', maskedBadge: 'Silenziato $1%'
  },
  pt: {
    extName: 'Outrage Mute', enabled: 'Ativo', threshold: 'Limite',
    note: 'Tudo é avaliado no seu dispositivo (nada é enviado). Posts acima do limite são desfocados ou ocultados.',
    modeBlur: 'Desfocar (clique para mostrar)', modeHide: 'Ocultar totalmente', showOverlay: 'Mostrar o motivo',
    language: 'Idioma', languageAuto: 'Automático', optionalSuffix: ' (opcional)', tryScore: 'Testar pontuação',
    reset: 'Redefinir', show: 'Mostrar', hide: 'Ocultar', maskedBadge: 'Silenciado $1%'
  },
  nl: {
    extName: 'Outrage Mute', enabled: 'Aan', threshold: 'Drempel',
    note: 'Alles wordt op je apparaat beoordeeld (niets wordt verzonden). Berichten boven de drempel worden vervaagd of verborgen.',
    modeBlur: 'Vervagen (klik om te tonen)', modeHide: 'Volledig verbergen', showOverlay: 'Reden tonen',
    language: 'Taal', languageAuto: 'Automatisch', optionalSuffix: ' (optioneel)', tryScore: 'Score testen',
    reset: 'Resetten', show: 'Tonen', hide: 'Verbergen', maskedBadge: 'Gedempt $1%'
  },
  pl: {
    extName: 'Outrage Mute', enabled: 'Wł.', threshold: 'Próg',
    note: 'Wszystko jest oceniane na Twoim urządzeniu (nic nie jest wysyłane). Posty powyżej progu są rozmywane lub ukrywane.',
    modeBlur: 'Rozmycie (kliknij, aby pokazać)', modeHide: 'Ukryj całkowicie', showOverlay: 'Pokaż powód',
    language: 'Język', languageAuto: 'Automatycznie', optionalSuffix: ' (opcj.)', tryScore: 'Testuj ocenę',
    reset: 'Resetuj', show: 'Pokaż', hide: 'Ukryj', maskedBadge: 'Wyciszono $1%'
  },
  cs: {
    extName: 'Outrage Mute', enabled: 'Zap', threshold: 'Práh',
    note: 'Vše se vyhodnocuje ve vašem zařízení (nic se neodesílá). Příspěvky nad prahem se rozmazují nebo skrývají.',
    modeBlur: 'Rozmazat (kliknutím zobrazit)', modeHide: 'Úplně skrýt', showOverlay: 'Zobrazit důvod',
    language: 'Jazyk', languageAuto: 'Automaticky', optionalSuffix: ' (volitelné)', tryScore: 'Vyzkoušet skóre',
    reset: 'Obnovit', show: 'Zobrazit', hide: 'Skrýt', maskedBadge: 'Ztlumeno $1%'
  },
  hu: {
    extName: 'Outrage Mute', enabled: 'Be', threshold: 'Küszöb',
    note: 'Minden az eszközödön történik (semmi nem kerül elküldésre). A küszöb feletti bejegyzések elmosódnak vagy elrejtődnek.',
    modeBlur: 'Elmosás (kattints a megjelenítéshez)', modeHide: 'Teljes elrejtés', showOverlay: 'Ok megjelenítése',
    language: 'Nyelv', languageAuto: 'Automatikus', optionalSuffix: ' (opcionális)', tryScore: 'Pontszám teszt',
    reset: 'Visszaállítás', show: 'Megjelenítés', hide: 'Elrejtés', maskedBadge: 'Némítva $1%'
  },
  fi: {
    extName: 'Outrage Mute', enabled: 'Päällä', threshold: 'Kynnys',
    note: 'Kaikki arvioidaan laitteellasi (mitään ei lähetetä). Kynnyksen ylittävät julkaisut sumennetaan tai piilotetaan.',
    modeBlur: 'Sumenna (näytä napsauttamalla)', modeHide: 'Piilota kokonaan', showOverlay: 'Näytä syy',
    language: 'Kieli', languageAuto: 'Automaattinen', optionalSuffix: ' (valinnainen)', tryScore: 'Testaa pisteytys',
    reset: 'Palauta', show: 'Näytä', hide: 'Piilota', maskedBadge: 'Vaimennettu $1%'
  },
  sv: {
    extName: 'Outrage Mute', enabled: 'På', threshold: 'Tröskel',
    note: 'Allt bedöms på din enhet (inget skickas). Inlägg över tröskeln suddas ut eller döljs.',
    modeBlur: 'Suddig (klicka för att visa)', modeHide: 'Dölj helt', showOverlay: 'Visa orsak',
    language: 'Språk', languageAuto: 'Automatiskt', optionalSuffix: ' (valfritt)', tryScore: 'Testa poäng',
    reset: 'Återställ', show: 'Visa', hide: 'Dölj', maskedBadge: 'Tystad $1%'
  },
  da: {
    extName: 'Outrage Mute', enabled: 'Til', threshold: 'Tærskel',
    note: 'Alt vurderes på din enhed (intet sendes). Opslag over tærsklen sløres eller skjules.',
    modeBlur: 'Slør (klik for at vise)', modeHide: 'Skjul helt', showOverlay: 'Vis årsag',
    language: 'Sprog', languageAuto: 'Automatisk', optionalSuffix: ' (valgfrit)', tryScore: 'Test score',
    reset: 'Nulstil', show: 'Vis', hide: 'Skjul', maskedBadge: 'Dæmpet $1%'
  },
  no: {
    extName: 'Outrage Mute', enabled: 'På', threshold: 'Terskel',
    note: 'Alt vurderes på enheten din (ingenting sendes). Innlegg over terskelen sløres eller skjules.',
    modeBlur: 'Slør (klikk for å vise)', modeHide: 'Skjul helt', showOverlay: 'Vis årsak',
    language: 'Språk', languageAuto: 'Automatisk', optionalSuffix: ' (valgfritt)', tryScore: 'Test poengsum',
    reset: 'Tilbakestill', show: 'Vis', hide: 'Skjul', maskedBadge: 'Dempet $1%'
  },
  tr: {
    extName: 'Outrage Mute', enabled: 'Açık', threshold: 'Eşik',
    note: 'Her şey cihazında değerlendirilir (hiçbir şey gönderilmez). Eşiğin üzerindeki gönderiler bulanıklaştırılır veya gizlenir.',
    modeBlur: 'Bulanıklaştır (göstermek için tıkla)', modeHide: 'Tamamen gizle', showOverlay: 'Nedeni göster',
    language: 'Dil', languageAuto: 'Otomatik', optionalSuffix: ' (isteğe bağlı)', tryScore: 'Puanı dene',
    reset: 'Sıfırla', show: 'Göster', hide: 'Gizle', maskedBadge: 'Sessiz $1%'
  },
  ar: {
    extName: 'كتم الغضب', enabled: 'مفعّل', threshold: 'الحد',
    note: 'يتم التقييم على جهازك فقط (لا يُرسل شيء). تُطمس المنشورات التي تتجاوز الحد أو تُخفى.',
    modeBlur: 'طمس (انقر للعرض)', modeHide: 'إخفاء كامل', showOverlay: 'إظهار السبب',
    language: 'اللغة', languageAuto: 'تلقائي', optionalSuffix: ' (اختياري)', tryScore: 'تجربة التقييم',
    reset: 'إعادة تعيين', show: 'عرض', hide: 'إخفاء', maskedBadge: 'مكتوم $1%'
  },
  fa: {
    extName: 'بیصدا کردن خشم', enabled: 'روشن', threshold: 'آستانه',
    note: 'همهچیز روی دستگاه شما ارزیابی میشود (چیزی ارسال نمیشود). پستهای بالای آستانه تار یا پنهان میشوند.',
    modeBlur: 'تار کردن (برای نمایش کلیک کنید)', modeHide: 'پنهان کردن کامل', showOverlay: 'نمایش دلیل',
    language: 'زبان', languageAuto: 'خودکار', optionalSuffix: ' (اختیاری)', tryScore: 'آزمایش امتیاز',
    reset: 'بازنشانی', show: 'نمایش', hide: 'پنهان', maskedBadge: 'بیصدا $1%'
  },
  hi: {
    extName: 'आउटरेज म्यूट', enabled: 'चालू', threshold: 'सीमा',
    note: 'सब कुछ आपके डिवाइस पर जाँचा जाता है (कुछ भी भेजा नहीं जाता)। सीमा से ऊपर की पोस्ट धुंधली या छिपा दी जाती हैं।',
    modeBlur: 'धुंधला करें (दिखाने के लिए क्लिक)', modeHide: 'पूरी तरह छिपाएँ', showOverlay: 'कारण दिखाएँ',
    language: 'भाषा', languageAuto: 'स्वतः', optionalSuffix: ' (वैकल्पिक)', tryScore: 'स्कोर आज़माएँ',
    reset: 'रीसेट', show: 'दिखाएँ', hide: 'छिपाएँ', maskedBadge: 'म्यूट $1%'
  },
  th: {
    extName: 'ปิดเสียงความเดือด', enabled: 'เปิด', threshold: 'เกณฑ์',
    note: 'ประเมินบนอุปกรณ์ของคุณเท่านั้น (ไม่ส่งข้อมูลออก) โพสต์ที่เกินเกณฑ์จะถูกเบลอหรือซ่อน',
    modeBlur: 'เบลอ (คลิกเพื่อแสดง)', modeHide: 'ซ่อนทั้งหมด', showOverlay: 'แสดงเหตุผล',
    language: 'ภาษา', languageAuto: 'อัตโนมัติ', optionalSuffix: ' (ไม่บังคับ)', tryScore: 'ทดลองคะแนน',
    reset: 'รีเซ็ต', show: 'แสดง', hide: 'ซ่อน', maskedBadge: 'ปิดเสียง $1%'
  },
  fil: {
    extName: 'Outrage Mute', enabled: 'Bukas', threshold: 'Threshold',
    note: 'Lahat ay sinusuri sa iyong device (walang ipinapadala). Ang mga post na lagpas sa threshold ay binablur o itinatago.',
    modeBlur: 'I-blur (i-click upang ipakita)', modeHide: 'Itago nang tuluyan', showOverlay: 'Ipakita ang dahilan',
    language: 'Wika', languageAuto: 'Awtomatiko', optionalSuffix: ' (opsyonal)', tryScore: 'Subukan ang iskor',
    reset: 'I-reset', show: 'Ipakita', hide: 'Itago', maskedBadge: 'Nakamute $1%'
  }
};

for (const [code, table] of Object.entries(T)) {
  const msg = {};
  for (const [k, v] of Object.entries(table)) msg[k] = { message: v };
  const dir = join(locDir, code);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'messages.json'), JSON.stringify(msg, null, 2) + '\n');
  console.log(`_locales/${code}/messages.json (${Object.keys(msg).length} keys)`);
}
console.log(`\n${Object.keys(T).length} locales generated`);
