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
  },
  vi: {
    extName: 'Outrage Mute', enabled: 'Bật', threshold: 'Ngưỡng',
    note: 'Mọi thứ được đánh giá trên thiết bị của bạn (không gửi dữ liệu).',
    modeBlur: 'Làm mờ (bấm để hiện)', modeHide: 'Ẩn hoàn toàn',
    languageAuto: 'Tự động', reset: 'Đặt lại', show: 'Hiện', hide: 'Ẩn', maskedBadge: 'Đã ẩn $1%'
  },
  id: {
    extName: 'Outrage Mute', enabled: 'Aktif', threshold: 'Ambang',
    note: 'Semua dinilai di perangkat Anda (tidak ada yang dikirim).',
    modeBlur: 'Buramkan (klik untuk lihat)', modeHide: 'Sembunyikan sepenuhnya',
    languageAuto: 'Otomatis', reset: 'Atur ulang', show: 'Tampilkan', hide: 'Sembunyikan', maskedBadge: 'Dibisukan $1%'
  },
  ms: {
    extName: 'Outrage Mute', enabled: 'Aktif', threshold: 'Ambang',
    note: 'Semua dinilai pada peranti anda (tiada apa dihantar).',
    modeBlur: 'Kaburkan (klik untuk lihat)', modeHide: 'Sembunyikan sepenuhnya',
    languageAuto: 'Automatik', reset: 'Set semula', show: 'Tunjuk', hide: 'Sembunyi', maskedBadge: 'Dibisukan $1%'
  },
  bn: {
    extName: 'আউট্রেজ মিউট', enabled: 'চালু', threshold: 'সীমা',
    note: 'সবকিছু আপনার ডিভাইসে যাচাই হয় (কিছুই পাঠানো হয় না)।',
    modeBlur: 'ঝাপসা করুন (দেখতে ক্লিক)', modeHide: 'সম্পূর্ণ লুকান',
    languageAuto: 'স্বয়ংক্রিয়', reset: 'রিসেট', show: 'দেখান', hide: 'লুকান', maskedBadge: 'মিউট $1%'
  },
  ur: {
    extName: 'آؤٹریج میوٹ', enabled: 'فعال', threshold: 'حد',
    note: 'سب کچھ آپ کے ڈیوائس پر جانچا جاتا ہے (کچھ نہیں بھیجا جاتا)۔',
    modeBlur: 'دھندلا کریں (دیکھنے کے لیے کلک)', modeHide: 'مکمل چھپائیں',
    languageAuto: 'خودکار', reset: 'ری سیٹ', show: 'دکھائیں', hide: 'چھپائیں', maskedBadge: 'خاموش $1%'
  },
  ta: {
    extName: 'Outrage Mute', enabled: 'இயக்கு', threshold: 'வரம்பு',
    note: 'அனைத்தும் உங்கள் சாதனத்தில் மதிப்பிடப்படும் (எதுவும் அனுப்பப்படாது).',
    modeBlur: 'மங்கலாக்கு (காட்ட கிளிக்)', modeHide: 'முழுமையாக மறை',
    languageAuto: 'தானியங்கி', reset: 'மீட்டமை', show: 'காட்டு', hide: 'மறை', maskedBadge: 'முடக்கப்பட்டது $1%'
  },
  te: {
    extName: 'Outrage Mute', enabled: 'ఆన్', threshold: 'పరిమితి',
    note: 'అంతా మీ పరికరంలోనే (ఏమీ పంపబడదు).',
    modeBlur: 'మసక చేయి (చూపడానికి క్లిక్)', modeHide: 'పూర్తిగా దాచు',
    languageAuto: 'స్వయంచాలక', reset: 'రీసెట్', show: 'చూపించు', hide: 'దాచు', maskedBadge: 'మ్యూట్ $1%'
  },
  he: {
    extName: 'Outrage Mute', enabled: 'פעיל', threshold: 'סף',
    note: 'הכל נבדק במכשיר שלך (שום דבר לא נשלח).',
    modeBlur: 'טשטש (לחץ להצגה)', modeHide: 'הסתר לגמרי',
    languageAuto: 'אוטומטי', reset: 'איפוס', show: 'הצג', hide: 'הסתר', maskedBadge: 'הושתק $1%'
  },
  el: {
    extName: 'Outrage Mute', enabled: 'Ενεργό', threshold: 'Όριο',
    note: 'Όλα αξιολογούνται στη συσκευή σας (τίποτα δεν αποστέλλεται).',
    modeBlur: 'Θόλωμα (κλικ για εμφάνιση)', modeHide: 'Απόκρυψη εντελώς',
    languageAuto: 'Αυτόματο', reset: 'Επαναφορά', show: 'Εμφάνιση', hide: 'Απόκρυψη', maskedBadge: 'Σε σίγαση $1%'
  },
  ro: {
    extName: 'Outrage Mute', enabled: 'Activ', threshold: 'Prag',
    note: 'Totul este evaluat pe dispozitivul tău (nimic nu este trimis).',
    modeBlur: 'Estompează (clic pentru afișare)', modeHide: 'Ascunde complet',
    languageAuto: 'Automat', reset: 'Resetează', show: 'Arată', hide: 'Ascunde', maskedBadge: 'Silențios $1%'
  },
  bg: {
    extName: 'Outrage Mute', enabled: 'Вкл', threshold: 'Праг',
    note: 'Всичко се оценява на вашето устройство (нищо не се изпраща).',
    modeBlur: 'Замъгляване (клик за показване)', modeHide: 'Скрий напълно',
    languageAuto: 'Автоматично', reset: 'Нулиране', show: 'Покажи', hide: 'Скрий', maskedBadge: 'Заглушено $1%'
  },
  sr: {
    extName: 'Outrage Mute', enabled: 'Укљ', threshold: 'Праг',
    note: 'Све се оцењује на вашем уређају (ништа се не шаље).',
    modeBlur: 'Замућење (клик за приказ)', modeHide: 'Сакриј потпуно',
    languageAuto: 'Аутоматски', reset: 'Ресетуј', show: 'Прикажи', hide: 'Сакриј', maskedBadge: 'Утишано $1%'
  },
  hr: {
    extName: 'Outrage Mute', enabled: 'Uklj', threshold: 'Prag',
    note: 'Sve se ocjenjuje na tvom uređaju (ništa se ne šalje).',
    modeBlur: 'Zamućenje (klik za prikaz)', modeHide: 'Sakrij potpuno',
    languageAuto: 'Automatski', reset: 'Resetiraj', show: 'Prikaži', hide: 'Sakrij', maskedBadge: 'Utišano $1%'
  },
  sk: {
    extName: 'Outrage Mute', enabled: 'Zap', threshold: 'Prah',
    note: 'Všetko sa vyhodnocuje vo vašom zariadení (nič sa neposiela).',
    modeBlur: 'Rozmazať (kliknutím zobraziť)', modeHide: 'Úplne skryť',
    languageAuto: 'Automaticky', reset: 'Obnoviť', show: 'Zobraziť', hide: 'Skryť', maskedBadge: 'Stlmené $1%'
  },
  lt: {
    extName: 'Outrage Mute', enabled: 'Įj', threshold: 'Slenkstis',
    note: 'Viskas vertinama jūsų įrenginyje (nieko nesiunčiama).',
    modeBlur: 'Sulieti (spustelėkite, kad rodytų)', modeHide: 'Paslėpti visiškai',
    languageAuto: 'Automatiškai', reset: 'Atstatyti', show: 'Rodyti', hide: 'Slėpti', maskedBadge: 'Nutildyta $1%'
  },
  lv: {
    extName: 'Outrage Mute', enabled: 'Iesl', threshold: 'Slieksnis',
    note: 'Viss tiek novērtēts jūsu ierīcē (nekas netiek sūtīts).',
    modeBlur: 'Aizmiglot (klikšķis, lai rādītu)', modeHide: 'Paslēpt pilnībā',
    languageAuto: 'Automātiski', reset: 'Atiestatīt', show: 'Rādīt', hide: 'Slēpt', maskedBadge: 'Apklusināts $1%'
  },
  et: {
    extName: 'Outrage Mute', enabled: 'Sees', threshold: 'Lävi',
    note: 'Kõik hinnatakse sinu seadmes (midagi ei saadeta).',
    modeBlur: 'Hägusta (klõpsa näitamiseks)', modeHide: 'Peida täielikult',
    languageAuto: 'Automaatne', reset: 'Lähtesta', show: 'Näita', hide: 'Peida', maskedBadge: 'Vaigistatud $1%'
  },
  ca: {
    extName: 'Outrage Mute', enabled: 'Actiu', threshold: 'Llindar',
    note: 'Tot es valora al teu dispositiu (no s’envia res).',
    modeBlur: 'Difumina (clic per mostrar)', modeHide: 'Amaga del tot',
    languageAuto: 'Automàtic', reset: 'Restableix', show: 'Mostra', hide: 'Amaga', maskedBadge: 'Silenciat $1%'
  },
  sw: {
    extName: 'Outrage Mute', enabled: 'Imewashwa', threshold: 'Kiwango',
    note: 'Kila kitu hupimwa kwenye kifaa chako (hakuna kinachotumwa).',
    modeBlur: 'Fifisha (bofya kuonyesha)', modeHide: 'Ficha kabisa',
    languageAuto: 'Otomatiki', reset: 'Weka upya', show: 'Onyesha', hide: 'Ficha', maskedBadge: 'Imenyamazishwa $1%'
  },
  mk: {
    extName: 'Outrage Mute', enabled: 'Вкл', threshold: 'Праг',
    note: 'Сè се оценува на вашиот уред (ништо не се испраќа).',
    modeBlur: 'Заматено (клик за приказ)', modeHide: 'Скрий целосно',
    languageAuto: 'Автоматски', reset: 'Ресетирај', show: 'Прикажи', hide: 'Скрий', maskedBadge: 'Замолчено $1%'
  },
  mn: {
    extName: 'Outrage Mute', enabled: 'Ас', threshold: 'Босго',
    note: 'Бүгд таны төхөөрөмж дээр үнэлэгдэнэ (юу ч илгээгдэхгүй).',
    modeBlur: 'Бүдэгрүүлэх (харуулахын тулд дар)', modeHide: 'Бүрэн нуух',
    languageAuto: 'Автомат', reset: 'Дахин тохируулах', show: 'Харуулах', hide: 'Нуух', maskedBadge: 'Дуугүй $1%'
  },
  ne: {
    extName: 'आउटरेज म्युट', enabled: 'सक्रिय', threshold: 'सीमा',
    note: 'सबै तपाईंको यन्त्रमा जाँचिन्छ (केही पठाइँदैन)।',
    modeBlur: 'धुंध्याउनुहोस् (देखाउन क्लिक)', modeHide: 'पूर्ण रूपमा लुकाउनुहोस्',
    languageAuto: 'स्वतः', reset: 'रिसेट', show: 'देखाउनुहोस्', hide: 'लुकाउनुहोस्', maskedBadge: 'म्युट $1%'
  },
  si: {
    extName: 'Outrage Mute', enabled: 'ක්‍රියාත්මකයි', threshold: 'සීමාව',
    note: 'සියල්ල ඔබේ උපාංගයේ පරීක්ෂා වේ (කිසිවක් යවනු නොලැබේ).',
    modeBlur: 'මංජුල් කරන්න (පෙන්වීමට ක්ලික්)', modeHide: 'සම්පූර්ණයෙන් සඟවන්න',
    languageAuto: 'ස්වයංක්‍රීය', reset: 'නැවත සකසන්න', show: 'පෙන්වන්න', hide: 'සඟවන්න', maskedBadge: 'නිශ්ශබ්ද $1%'
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
