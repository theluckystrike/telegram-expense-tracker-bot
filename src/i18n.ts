// Static-text localization for BudgetBot. Only user-facing static copy lives here —
// dynamic content (amounts, notes, category names) stays in index.ts and is left as-is
// so numbers/user text read the same regardless of the reader's language.

export const LANGS = ["en", "ru", "es", "pt", "id", "de", "tr", "uk", "fa", "ar", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export type Key =
  | "help"
  | "start"
  | "logged"
  | "usage"
  | "noEntries"
  | "limitReached"
  | "proPitchMenu"
  | "proThanks"
  | "exportProOnly"
  | "catProOnly"
  | "catAdded"
  | "catUsage"
  | "undoDone"
  | "undoEmpty"
  | "budgetSet"
  | "budgetUsage"
  | "currencySet"
  | "currencyUsage"
  | "alert80"
  | "alert100"
  | "weeklySummaryTitle"
  | "tzUsage"
  | "tzSet"
  | "exportTruncated"
  | "catCapReached"
  | "btn_openInPrivate"
  | "btn_oneTime"
  | "btn_monthly"
  | "tapToSubscribe"
  | "btn_subscribe"
  | "btn_shareWeek"
  | "alreadyPro"
  | "startInGroup"
  | "btn_logExpense"
  | "askEntry"
  | "entryPlaceholder"
  | "guestPreview"
  | "app_title"
  | "app_loading"
  | "app_moreApps"
  | "app_shareChat"
  | "app_shareStory"
  | "app_storyText"
  | "app_shareFail"
  | "app_errNoInit"
  | "app_errExpired"
  | "app_errBadSig"
  | "app_unlockPro"
  | "app_proOneTime"
  | "app_proMonthly"
  | "app_payDone"
  | "app_payCancelled"
  | "app_payFailed"
  | "app_noBudget"
  | "app_ofBudget"
  | "app_loadFailed"
  | "app_addPlaceholder"
  | "app_addBtn"
  | "app_addFail";

/** The 11 language codes this bot ships, in table order. */
export const APP_LANGS: Lang[] = [...LANGS];

/** Every `app_*` key, for every language, as a plain object — the Mini App's embedded
 * `APP_I18N` dictionary. English fills any gap so a client lookup can never miss.
 * Both loops are bounded by the static table (11 languages x the app_* key set). */
export function appDict(): Record<string, Record<string, string>> {
  const keys = (Object.keys(TABLE) as Key[]).filter((k) => k.startsWith("app_"));
  const out: Record<string, Record<string, string>> = {};
  for (const l of LANGS) {
    const m: Record<string, string> = {};
    for (const k of keys) m[k] = TABLE[k][l] ?? TABLE[k].en;
    out[l] = m;
  }
  return out;
}

/** ctx.from.language_code -> first two letters -> known table language, else "en". */
export function resolveLang(code?: string): Lang {
  const c = (code ?? "").slice(0, 2).toLowerCase();
  return (LANGS as readonly string[]).includes(c) ? (c as Lang) : "en";
}

/** Look up `key` for `lang` (falling back to English), substituting `{name}` tokens from `vars`. */
export function t(lang: string | undefined, key: Key, vars?: Record<string, string | number>): string {
  const l: Lang = (LANGS as readonly string[]).includes(lang ?? "") ? (lang as Lang) : "en";
  let s = TABLE[key][l] ?? TABLE[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

const TABLE: Record<Key, Record<Lang, string>> = {
  help: {
    en: "💰 *BudgetBot* tracks your personal spending.\n\nJust send an amount to log it:\n`12.50 coffee` or `coffee 12.50` or `-40 groceries`\n\n`/today` `/week` `/month` — totals by category\n`/budget 1500` — monthly budget with 80%/100% alerts\n`/undo` — remove the last entry\n`/currency EUR` — set your currency\n`/export` — CSV (Pro)\n`/cat add pets` — custom category (Pro)\n\nFree: {free} entries/month. Pro: unlimited + export + custom categories, one-time {stars} ⭐ or {sub} ⭐/mo — /pro",
    ru: "💰 *BudgetBot* отслеживает ваши личные расходы.\n\nПросто отправьте сумму, чтобы записать расход:\n`12.50 coffee` или `coffee 12.50` или `-40 groceries`\n\n`/today` `/week` `/month` — итоги по категориям\n`/budget 1500` — месячный бюджет с оповещением на 80%/100%\n`/undo` — удалить последнюю запись\n`/currency EUR` — установить валюту\n`/export` — CSV (Pro)\n`/cat add pets` — своя категория (Pro)\n\nБесплатно: {free} записей/месяц. Pro: без ограничений + экспорт + свои категории, разово {stars} ⭐ или {sub} ⭐/мес — /pro",
    es: "💰 *BudgetBot* rastrea tus gastos personales.\n\nEnvía un monto para registrarlo:\n`12.50 coffee` o `coffee 12.50` o `-40 groceries`\n\n`/today` `/week` `/month` — totales por categoría\n`/budget 1500` — presupuesto mensual con alertas al 80%/100%\n`/undo` — quitar el último registro\n`/currency EUR` — fijar tu moneda\n`/export` — CSV (Pro)\n`/cat add pets` — categoría personalizada (Pro)\n\nGratis: {free} registros/mes. Pro: ilimitado + exportar + categorías propias, pago único {stars} ⭐ o {sub} ⭐/mes — /pro",
    pt: "💰 *BudgetBot* acompanha seus gastos pessoais.\n\nEnvie um valor para registrar:\n`12.50 coffee` ou `coffee 12.50` ou `-40 groceries`\n\n`/today` `/week` `/month` — totais por categoria\n`/budget 1500` — orçamento mensal com alertas em 80%/100%\n`/undo` — remover o último registro\n`/currency EUR` — definir sua moeda\n`/export` — CSV (Pro)\n`/cat add pets` — categoria personalizada (Pro)\n\nGrátis: {free} registros/mês. Pro: ilimitado + exportar + categorias próprias, pagamento único {stars} ⭐ ou {sub} ⭐/mês — /pro",
    id: "💰 *BudgetBot* melacak pengeluaran pribadimu.\n\nKirim jumlahnya untuk mencatat:\n`12.50 coffee` atau `coffee 12.50` atau `-40 groceries`\n\n`/today` `/week` `/month` — total per kategori\n`/budget 1500` — anggaran bulanan dengan peringatan di 80%/100%\n`/undo` — hapus catatan terakhir\n`/currency EUR` — atur mata uangmu\n`/export` — CSV (Pro)\n`/cat add pets` — kategori kustom (Pro)\n\nGratis: {free} catatan/bulan. Pro: tanpa batas + ekspor + kategori sendiri, sekali bayar {stars} ⭐ atau {sub} ⭐/bln — /pro",
    de: "💰 *BudgetBot* verfolgt deine persönlichen Ausgaben.\n\nSchick einfach einen Betrag, um ihn zu erfassen:\n`12.50 coffee` oder `coffee 12.50` oder `-40 groceries`\n\n`/today` `/week` `/month` — Summen nach Kategorie\n`/budget 1500` — Monatsbudget mit Warnung bei 80%/100%\n`/undo` — letzten Eintrag entfernen\n`/currency EUR` — Währung festlegen\n`/export` — CSV (Pro)\n`/cat add pets` — eigene Kategorie (Pro)\n\nKostenlos: {free} Einträge/Monat. Pro: unbegrenzt + Export + eigene Kategorien, einmalig {stars} ⭐ oder {sub} ⭐/Monat — /pro",
    tr: "💰 *BudgetBot* kişisel harcamalarını takip eder.\n\nKaydetmek için bir tutar gönder:\n`12.50 coffee` ya da `coffee 12.50` ya da `-40 groceries`\n\n`/today` `/week` `/month` — kategoriye göre toplamlar\n`/budget 1500` — %80/%100 uyarılı aylık bütçe\n`/undo` — son kaydı kaldır\n`/currency EUR` — para birimini ayarla\n`/export` — CSV (Pro)\n`/cat add pets` — özel kategori (Pro)\n\nÜcretsiz: ayda {free} kayıt. Pro: sınırsız + dışa aktarma + özel kategoriler, tek seferlik {stars} ⭐ ya da aylık {sub} ⭐ — /pro",
    uk: "💰 *BudgetBot* відстежує ваші особисті витрати.\n\nПросто надішліть суму, щоб записати:\n`12.50 coffee` або `coffee 12.50` або `-40 groceries`\n\n`/today` `/week` `/month` — підсумки за категоріями\n`/budget 1500` — місячний бюджет зі сповіщенням на 80%/100%\n`/undo` — прибрати останній запис\n`/currency EUR` — встановити валюту\n`/export` — CSV (Pro)\n`/cat add pets` — власна категорія (Pro)\n\nБезкоштовно: {free} записів/міс. Pro: без обмежень + експорт + власні категорії, разово {stars} ⭐ або {sub} ⭐/міс — /pro",
    fa: "💰 *BudgetBot* هزینه‌های شخصی شما را پیگیری می‌کند.\n\nفقط مبلغ را ارسال کنید تا ثبت شود:\n`12.50 coffee` یا `coffee 12.50` یا `-40 groceries`\n\n`/today` `/week` `/month` — جمع بر اساس دسته\n`/budget 1500` — بودجه ماهانه با هشدار در 80%/100%\n`/undo` — حذف آخرین رکورد\n`/currency EUR` — تنظیم واحد پول\n`/export` — CSV (Pro)\n`/cat add pets` — دسته سفارشی (Pro)\n\nرایگان: {free} رکورد در ماه. Pro: نامحدود + خروجی + دسته‌های سفارشی، یک‌باره {stars} ⭐ یا {sub} ⭐ ماهانه — /pro",
    ar: "💰 *BudgetBot* يتتبع مصاريفك الشخصية.\n\nأرسل مبلغًا فقط لتسجيله:\n`12.50 coffee` أو `coffee 12.50` أو `-40 groceries`\n\n`/today` `/week` `/month` — إجماليات حسب الفئة\n`/budget 1500` — ميزانية شهرية بتنبيه عند 80%/100%\n`/undo` — إزالة آخر سجل\n`/currency EUR` — تعيين عملتك\n`/export` — CSV (Pro)\n`/cat add pets` — فئة مخصصة (Pro)\n\nمجانًا: {free} سجلًا شهريًا. Pro: غير محدود + تصدير + فئات مخصصة، دفعة واحدة {stars} ⭐ أو {sub} ⭐ شهريًا — /pro",
    hi: "💰 *BudgetBot* आपके निजी खर्चों को ट्रैक करता है।\n\nदर्ज करने के लिए बस राशि भेजें:\n`12.50 coffee` या `coffee 12.50` या `-40 groceries`\n\n`/today` `/week` `/month` — श्रेणी अनुसार कुल\n`/budget 1500` — 80%/100% अलर्ट के साथ मासिक बजट\n`/undo` — आख़िरी एंट्री हटाएं\n`/currency EUR` — अपनी मुद्रा सेट करें\n`/export` — CSV (Pro)\n`/cat add pets` — कस्टम श्रेणी (Pro)\n\nमुफ़्त: {free} एंट्री/माह। Pro: असीमित + एक्सपोर्ट + कस्टम श्रेणियां, एकमुश्त {stars} ⭐ या {sub} ⭐/माह — /pro",
  },
  start: {
    en: "💰 Text me what you spent. That's the whole app.\nTry it now: `12.50 coffee`\nI categorise it and total it up — /today, /week, /month.\nFree: {free} entries/month · /help",
    ru: "💰 Просто пишите мне, что вы потратили. Это и есть всё приложение.\nПопробуйте прямо сейчас: `12.50 coffee`\nЯ разложу по категориям и посчитаю итог — /today, /week, /month.\nБесплатно: {free} записей/месяц · /help",
    es: "💰 Escríbeme lo que gastaste. Y esa es toda la app.\nPruébalo ahora: `12.50 coffee`\nLo clasifico y sumo el total — /today, /week, /month.\nGratis: {free} registros/mes · /help",
    pt: "💰 Me mande o que você gastou. É o app inteiro.\nExperimente agora: `12.50 coffee`\nEu categorizo e somo o total — /today, /week, /month.\nGrátis: {free} registros/mês · /help",
    id: "💰 Kirim saja apa yang kamu belanjakan. Itulah seluruh aplikasinya.\nCoba sekarang: `12.50 coffee`\nAku kategorikan dan totalkan — /today, /week, /month.\nGratis: {free} catatan/bulan · /help",
    de: "💰 Schreib mir einfach, was du ausgegeben hast. Das ist die ganze App.\nProbier's jetzt: `12.50 coffee`\nIch kategorisiere und summiere es — /today, /week, /month.\nKostenlos: {free} Einträge/Monat · /help",
    tr: "💰 Ne harcadığını bana yaz. Uygulamanın tamamı bu.\nHemen dene: `12.50 coffee`\nKategorilere ayırıp toplarım — /today, /week, /month.\nÜcretsiz: ayda {free} kayıt · /help",
    uk: "💰 Просто напишіть мені, що ви витратили. Це весь застосунок.\nСпробуйте зараз: `12.50 coffee`\nЯ розкладу за категоріями і порахую підсумок — /today, /week, /month.\nБезкоштовно: {free} записів/міс · /help",
    fa: "💰 فقط بنویسید چه خرج کردید. کل اپلیکیشن همین است.\nهمین حالا امتحان کنید: `12.50 coffee`\nمن دسته‌بندی می‌کنم و جمع می‌زنم — /today، /week، /month.\nرایگان: {free} رکورد در ماه · /help",
    ar: "💰 اكتب لي ما أنفقته. هذا هو التطبيق بالكامل.\nجرّب الآن: `12.50 coffee`\nأصنّفه وأجمعه لك — /today و /week و /month.\nمجانًا: {free} سجلًا شهريًا · /help",
    hi: "💰 बस मुझे बताएं आपने क्या खर्च किया। यही पूरा ऐप है।\nअभी आज़माएं: `12.50 coffee`\nमैं श्रेणी में डालकर कुल जोड़ता हूं — /today, /week, /month।\nमुफ़्त: {free} एंट्री/माह · /help",
  },
  logged: {
    en: "{emoji} Logged {amount} for {note} ({category})",
    ru: "{emoji} Записано {amount} на {note} ({category})",
    es: "{emoji} Registrado {amount} para {note} ({category})",
    pt: "{emoji} Registrado {amount} para {note} ({category})",
    id: "{emoji} Tercatat {amount} untuk {note} ({category})",
    de: "{emoji} Erfasst: {amount} für {note} ({category})",
    tr: "{emoji} {amount} tutarında {note} kaydedildi ({category})",
    uk: "{emoji} Записано {amount} на {note} ({category})",
    fa: "{emoji} {amount} برای {note} ثبت شد ({category})",
    ar: "{emoji} تم تسجيل {amount} لـ {note} ({category})",
    hi: "{emoji} {note} के लिए {amount} दर्ज किया गया ({category})",
  },
  usage: {
    en: "Send an amount to log an expense, e.g. `12.50 coffee` or `coffee 12.50`.",
    ru: "Отправьте сумму, чтобы записать расход, напр. `12.50 coffee` или `coffee 12.50`.",
    es: "Envía un monto para registrar un gasto, ej. `12.50 coffee` o `coffee 12.50`.",
    pt: "Envie um valor para registrar um gasto, ex. `12.50 coffee` ou `coffee 12.50`.",
    id: "Kirim jumlah untuk mencatat pengeluaran, mis. `12.50 coffee` atau `coffee 12.50`.",
    de: "Schick einen Betrag, um eine Ausgabe zu erfassen, z. B. `12.50 coffee` oder `coffee 12.50`.",
    tr: "Bir harcamayı kaydetmek için tutar gönder, örn. `12.50 coffee` ya da `coffee 12.50`.",
    uk: "Надішліть суму, щоб записати витрату, напр. `12.50 coffee` або `coffee 12.50`.",
    fa: "برای ثبت هزینه مبلغی بفرستید، مثلاً `12.50 coffee` یا `coffee 12.50`.",
    ar: "أرسل مبلغًا لتسجيل مصروف، مثل `12.50 coffee` أو `coffee 12.50`.",
    hi: "खर्च दर्ज करने के लिए राशि भेजें, जैसे `12.50 coffee` या `coffee 12.50`।",
  },
  noEntries: {
    en: "No entries yet. Send an amount, e.g. `12.50 coffee`.",
    ru: "Пока нет записей. Отправьте сумму, напр. `12.50 coffee`.",
    es: "Aún no hay registros. Envía un monto, ej. `12.50 coffee`.",
    pt: "Ainda sem registros. Envie um valor, ex. `12.50 coffee`.",
    id: "Belum ada catatan. Kirim jumlah, mis. `12.50 coffee`.",
    de: "Noch keine Einträge. Schick einen Betrag, z. B. `12.50 coffee`.",
    tr: "Henüz kayıt yok. Bir tutar gönder, örn. `12.50 coffee`.",
    uk: "Ще немає записів. Надішліть суму, напр. `12.50 coffee`.",
    fa: "هنوز رکوردی نیست. مبلغی بفرستید، مثلاً `12.50 coffee`.",
    ar: "لا توجد سجلات بعد. أرسل مبلغًا، مثل `12.50 coffee`.",
    hi: "अभी कोई एंट्री नहीं। राशि भेजें, जैसे `12.50 coffee`।",
  },
  limitReached: {
    en: "You reached the free limit of {free} entries this month. Pro is unlimited (one-time {stars} ⭐ or {sub} ⭐/mo).",
    ru: "Вы достигли бесплатного лимита в {free} записей за месяц. Pro без ограничений (разово {stars} ⭐ или {sub} ⭐/мес).",
    es: "Alcanzaste el límite gratuito de {free} registros este mes. Pro es ilimitado (pago único {stars} ⭐ o {sub} ⭐/mes).",
    pt: "Você atingiu o limite grátis de {free} registros neste mês. Pro é ilimitado (pagamento único {stars} ⭐ ou {sub} ⭐/mês).",
    id: "Kamu mencapai batas gratis {free} catatan bulan ini. Pro tanpa batas (sekali bayar {stars} ⭐ atau {sub} ⭐/bln).",
    de: "Du hast das kostenlose Limit von {free} Einträgen diesen Monat erreicht. Pro ist unbegrenzt (einmalig {stars} ⭐ oder {sub} ⭐/Monat).",
    tr: "Bu ay ücretsiz {free} kayıt sınırına ulaştın. Pro sınırsızdır (tek seferlik {stars} ⭐ ya da aylık {sub} ⭐).",
    uk: "Ви досягли безкоштовного ліміту {free} записів цього місяця. Pro без обмежень (разово {stars} ⭐ або {sub} ⭐/міс).",
    fa: "شما به محدودیت رایگان {free} رکورد این ماه رسیدید. Pro نامحدود است (یک‌باره {stars} ⭐ یا {sub} ⭐ ماهانه).",
    ar: "وصلت إلى الحد المجاني وهو {free} سجلًا هذا الشهر. Pro غير محدود (دفعة واحدة {stars} ⭐ أو {sub} ⭐ شهريًا).",
    hi: "आपने इस माह {free} एंट्री की मुफ़्त सीमा पूरी कर ली है। Pro असीमित है (एकमुश्त {stars} ⭐ या {sub} ⭐/माह)।",
  },
  proPitchMenu: {
    en: "Unlock Pro: unlimited entries, CSV export, custom categories.",
    ru: "Откройте Pro: неограниченные записи, экспорт CSV, свои категории.",
    es: "Desbloquea Pro: registros ilimitados, exportación CSV, categorías propias.",
    pt: "Desbloqueie o Pro: registros ilimitados, exportação CSV, categorias próprias.",
    id: "Buka Pro: catatan tanpa batas, ekspor CSV, kategori sendiri.",
    de: "Pro freischalten: unbegrenzte Einträge, CSV-Export, eigene Kategorien.",
    tr: "Pro'yu aç: sınırsız kayıt, CSV dışa aktarma, özel kategoriler.",
    uk: "Відкрий Pro: необмежені записи, експорт CSV, власні категорії.",
    fa: "Pro را باز کنید: رکورد نامحدود، خروجی CSV، دسته‌های سفارشی.",
    ar: "افتح Pro: سجلات غير محدودة، تصدير CSV، فئات مخصصة.",
    hi: "Pro खोलें: असीमित एंट्री, CSV एक्सपोर्ट, कस्टम श्रेणियां।",
  },
  proThanks: {
    en: "✅ Pro unlocked: unlimited entries, CSV export, custom categories.\n\n/more — more free tools",
    ru: "✅ Pro активирован: неограниченные записи, экспорт CSV, свои категории.\n\n/more — другие бесплатные инструменты",
    es: "✅ Pro activado: registros ilimitados, exportación CSV, categorías propias.\n\n/more — más herramientas gratis",
    pt: "✅ Pro ativado: registros ilimitados, exportação CSV, categorias próprias.\n\n/more — mais ferramentas grátis",
    id: "✅ Pro aktif: catatan tanpa batas, ekspor CSV, kategori sendiri.\n\n/more — alat gratis lainnya",
    de: "✅ Pro freigeschaltet: unbegrenzte Einträge, CSV-Export, eigene Kategorien.\n\n/more — weitere kostenlose Tools",
    tr: "✅ Pro açıldı: sınırsız kayıt, CSV dışa aktarma, özel kategoriler.\n\n/more — daha fazla ücretsiz araç",
    uk: "✅ Pro активовано: необмежені записи, експорт CSV, власні категорії.\n\n/more — інші безкоштовні інструменти",
    fa: "✅ Pro فعال شد: رکورد نامحدود، خروجی CSV، دسته‌های سفارشی.\n\n/more — ابزارهای رایگان بیشتر",
    ar: "✅ تم تفعيل Pro: سجلات غير محدودة، تصدير CSV، فئات مخصصة.\n\n/more — أدوات مجانية أخرى",
    hi: "✅ Pro सक्रिय: असीमित एंट्री, CSV एक्सपोर्ट, कस्टम श्रेणियां।\n\n/more — और मुफ़्त टूल्स",
  },
  exportProOnly: {
    en: "CSV export is a Pro feature.",
    ru: "Экспорт в CSV — функция Pro.",
    es: "La exportación a CSV es una función Pro.",
    pt: "A exportação CSV é um recurso Pro.",
    id: "Ekspor CSV adalah fitur Pro.",
    de: "CSV-Export ist eine Pro-Funktion.",
    tr: "CSV dışa aktarma bir Pro özelliğidir.",
    uk: "Експорт у CSV — функція Pro.",
    fa: "خروجی CSV یک ویژگی Pro است.",
    ar: "تصدير CSV ميزة Pro.",
    hi: "CSV एक्सपोर्ट एक Pro सुविधा है।",
  },
  catProOnly: {
    en: "Custom categories are a Pro feature.",
    ru: "Свои категории — функция Pro.",
    es: "Las categorías personalizadas son una función Pro.",
    pt: "Categorias personalizadas são um recurso Pro.",
    id: "Kategori kustom adalah fitur Pro.",
    de: "Eigene Kategorien sind eine Pro-Funktion.",
    tr: "Özel kategoriler bir Pro özelliğidir.",
    uk: "Власні категорії — функція Pro.",
    fa: "دسته‌های سفارشی یک ویژگی Pro هستند.",
    ar: "الفئات المخصصة ميزة Pro.",
    hi: "कस्टम श्रेणियां एक Pro सुविधा हैं।",
  },
  catAdded: {
    en: "✅ Category \"{name}\" added.",
    ru: "✅ Категория «{name}» добавлена.",
    es: "✅ Categoría «{name}» añadida.",
    pt: "✅ Categoria \"{name}\" adicionada.",
    id: "✅ Kategori \"{name}\" ditambahkan.",
    de: "✅ Kategorie „{name}“ hinzugefügt.",
    tr: "✅ \"{name}\" kategorisi eklendi.",
    uk: "✅ Категорію «{name}» додано.",
    fa: "✅ دسته «{name}» اضافه شد.",
    ar: "✅ تمت إضافة الفئة «{name}».",
    hi: "✅ श्रेणी \"{name}\" जोड़ी गई।",
  },
  catUsage: {
    en: "Usage: /cat add pets",
    ru: "Использование: /cat add pets",
    es: "Uso: /cat add pets",
    pt: "Uso: /cat add pets",
    id: "Cara pakai: /cat add pets",
    de: "Verwendung: /cat add pets",
    tr: "Kullanım: /cat add pets",
    uk: "Використання: /cat add pets",
    fa: "طرز استفاده: /cat add pets",
    ar: "الاستخدام: /cat add pets",
    hi: "उपयोग: /cat add pets",
  },
  undoDone: {
    en: "🗑 Removed: {amount} for {note}.",
    ru: "🗑 Удалено: {amount} на {note}.",
    es: "🗑 Eliminado: {amount} para {note}.",
    pt: "🗑 Removido: {amount} para {note}.",
    id: "🗑 Dihapus: {amount} untuk {note}.",
    de: "🗑 Entfernt: {amount} für {note}.",
    tr: "🗑 Kaldırıldı: {note} için {amount}.",
    uk: "🗑 Видалено: {amount} на {note}.",
    fa: "🗑 حذف شد: {amount} برای {note}.",
    ar: "🗑 تمت الإزالة: {amount} لـ {note}.",
    hi: "🗑 हटाया गया: {note} के लिए {amount}।",
  },
  undoEmpty: {
    en: "Nothing to undo.",
    ru: "Нечего отменять.",
    es: "Nada que deshacer.",
    pt: "Nada para desfazer.",
    id: "Tidak ada yang bisa dibatalkan.",
    de: "Nichts rückgängig zu machen.",
    tr: "Geri alınacak bir şey yok.",
    uk: "Нічого скасовувати.",
    fa: "چیزی برای واگرد نیست.",
    ar: "لا يوجد ما يمكن التراجع عنه.",
    hi: "पूर्ववत करने के लिए कुछ नहीं।",
  },
  budgetSet: {
    en: "✅ Monthly budget set to {amount}.",
    ru: "✅ Месячный бюджет установлен: {amount}.",
    es: "✅ Presupuesto mensual establecido en {amount}.",
    pt: "✅ Orçamento mensal definido para {amount}.",
    id: "✅ Anggaran bulanan diatur ke {amount}.",
    de: "✅ Monatsbudget auf {amount} gesetzt.",
    tr: "✅ Aylık bütçe {amount} olarak ayarlandı.",
    uk: "✅ Місячний бюджет встановлено: {amount}.",
    fa: "✅ بودجه ماهانه روی {amount} تنظیم شد.",
    ar: "✅ تم تعيين الميزانية الشهرية إلى {amount}.",
    hi: "✅ मासिक बजट {amount} पर सेट किया गया।",
  },
  budgetUsage: {
    en: "Usage: /budget 1500",
    ru: "Использование: /budget 1500",
    es: "Uso: /budget 1500",
    pt: "Uso: /budget 1500",
    id: "Cara pakai: /budget 1500",
    de: "Verwendung: /budget 1500",
    tr: "Kullanım: /budget 1500",
    uk: "Використання: /budget 1500",
    fa: "طرز استفاده: /budget 1500",
    ar: "الاستخدام: /budget 1500",
    hi: "उपयोग: /budget 1500",
  },
  currencySet: {
    en: "✅ Currency set to {currency}.",
    ru: "✅ Валюта установлена: {currency}.",
    es: "✅ Moneda establecida en {currency}.",
    pt: "✅ Moeda definida para {currency}.",
    id: "✅ Mata uang diatur ke {currency}.",
    de: "✅ Währung auf {currency} gesetzt.",
    tr: "✅ Para birimi {currency} olarak ayarlandı.",
    uk: "✅ Валюту встановлено: {currency}.",
    fa: "✅ واحد پول روی {currency} تنظیم شد.",
    ar: "✅ تم تعيين العملة إلى {currency}.",
    hi: "✅ मुद्रा {currency} पर सेट की गई।",
  },
  currencyUsage: {
    en: "Usage: /currency EUR",
    ru: "Использование: /currency EUR",
    es: "Uso: /currency EUR",
    pt: "Uso: /currency EUR",
    id: "Cara pakai: /currency EUR",
    de: "Verwendung: /currency EUR",
    tr: "Kullanım: /currency EUR",
    uk: "Використання: /currency EUR",
    fa: "طرز استفاده: /currency EUR",
    ar: "الاستخدام: /currency EUR",
    hi: "उपयोग: /currency EUR",
  },
  alert80: {
    en: "⚠️ You've spent 80% of your {amount} monthly budget.",
    ru: "⚠️ Вы потратили 80% месячного бюджета {amount}.",
    es: "⚠️ Has gastado el 80% de tu presupuesto mensual de {amount}.",
    pt: "⚠️ Você gastou 80% do seu orçamento mensal de {amount}.",
    id: "⚠️ Kamu sudah menghabiskan 80% dari anggaran bulanan {amount}.",
    de: "⚠️ Du hast 80% deines Monatsbudgets von {amount} ausgegeben.",
    tr: "⚠️ Aylık {amount} bütçenin %80'ini harcadın.",
    uk: "⚠️ Ви витратили 80% місячного бюджету {amount}.",
    fa: "⚠️ شما 80٪ از بودجه ماهانه {amount} خود را خرج کرده‌اید.",
    ar: "⚠️ لقد أنفقت 80% من ميزانيتك الشهرية البالغة {amount}.",
    hi: "⚠️ आपने अपने {amount} मासिक बजट का 80% खर्च कर लिया है।",
  },
  alert100: {
    en: "🚨 You've reached 100% of your {amount} monthly budget.",
    ru: "🚨 Вы достигли 100% месячного бюджета {amount}.",
    es: "🚨 Alcanzaste el 100% de tu presupuesto mensual de {amount}.",
    pt: "🚨 Você atingiu 100% do seu orçamento mensal de {amount}.",
    id: "🚨 Kamu sudah mencapai 100% dari anggaran bulanan {amount}.",
    de: "🚨 Du hast 100% deines Monatsbudgets von {amount} erreicht.",
    tr: "🚨 Aylık {amount} bütçenin %100'üne ulaştın.",
    uk: "🚨 Ви досягли 100% місячного бюджету {amount}.",
    fa: "🚨 شما به 100٪ از بودجه ماهانه {amount} خود رسیده‌اید.",
    ar: "🚨 لقد وصلت إلى 100% من ميزانيتك الشهرية البالغة {amount}.",
    hi: "🚨 आपने अपने {amount} मासिक बजट का 100% पूरा कर लिया है।",
  },
  weeklySummaryTitle: {
    en: "📊 Weekly summary",
    ru: "📊 Недельная сводка",
    es: "📊 Resumen semanal",
    pt: "📊 Resumo semanal",
    id: "📊 Ringkasan mingguan",
    de: "📊 Wochenübersicht",
    tr: "📊 Haftalık özet",
    uk: "📊 Тижневий підсумок",
    fa: "📊 خلاصه هفتگی",
    ar: "📊 ملخص أسبوعي",
    hi: "📊 साप्ताहिक सारांश",
  },
  tzUsage: {
    en: "Usage: /tz +2 or /tz -5:30 — sets your local timezone offset from UTC.",
    ru: "Использование: /tz +2 или /tz -5:30 — установить часовой пояс (смещение от UTC).",
    es: "Uso: /tz +2 o /tz -5:30 — establece tu huso horario (desfase desde UTC).",
    pt: "Uso: /tz +2 ou /tz -5:30 — define seu fuso horário (deslocamento de UTC).",
    id: "Cara pakai: /tz +2 atau /tz -5:30 — atur zona waktumu (selisih dari UTC).",
    de: "Verwendung: /tz +2 oder /tz -5:30 — legt deine Zeitzone (Abweichung von UTC) fest.",
    tr: "Kullanım: /tz +2 ya da /tz -5:30 — UTC'ye göre saat diliminizi ayarlar.",
    uk: "Використання: /tz +2 або /tz -5:30 — встановити часовий пояс (зсув від UTC).",
    fa: "طرز استفاده: /tz +2 یا /tz -5:30 — منطقه زمانی خود را (اختلاف از UTC) تنظیم می‌کند.",
    ar: "الاستخدام: /tz +2 أو /tz -5:30 — لتعيين منطقتك الزمنية (الفرق عن UTC).",
    hi: "उपयोग: /tz +2 या /tz -5:30 — अपना समय क्षेत्र (UTC से अंतर) सेट करें।",
  },
  tzSet: {
    en: "✅ Timezone set to UTC{offset}. /today, /week, /month and your Monday summary now use your local time.",
    ru: "✅ Часовой пояс установлен: UTC{offset}. /today, /week, /month и недельная сводка теперь используют ваше местное время.",
    es: "✅ Huso horario establecido en UTC{offset}. /today, /week, /month y tu resumen semanal ahora usan tu hora local.",
    pt: "✅ Fuso horário definido para UTC{offset}. /today, /week, /month e seu resumo semanal agora usam seu horário local.",
    id: "✅ Zona waktu diatur ke UTC{offset}. /today, /week, /month dan ringkasan mingguanmu kini memakai waktu lokalmu.",
    de: "✅ Zeitzone auf UTC{offset} gesetzt. /today, /week, /month und deine Wochenübersicht nutzen jetzt deine Ortszeit.",
    tr: "✅ Saat dilimi UTC{offset} olarak ayarlandı. /today, /week, /month ve haftalık özetin artık yerel saatini kullanıyor.",
    uk: "✅ Часовий пояс встановлено: UTC{offset}. /today, /week, /month і тижневий підсумок тепер використовують ваш місцевий час.",
    fa: "✅ منطقه زمانی روی UTC{offset} تنظیم شد. /today، /week، /month و خلاصه هفتگی شما اکنون از زمان محلی شما استفاده می‌کنند.",
    ar: "✅ تم تعيين المنطقة الزمنية إلى UTC{offset}. تستخدم الآن /today و/week و/month وملخصك الأسبوعي توقيتك المحلي.",
    hi: "✅ समय क्षेत्र UTC{offset} पर सेट किया गया। /today, /week, /month और आपका साप्ताहिक सारांश अब आपके स्थानीय समय का उपयोग करते हैं।",
  },
  exportTruncated: {
    en: "Showing your most recent {cap} entries — you have more than that; export again after deleting older ones for the full history.",
    ru: "Показаны последние {cap} записей — у вас их больше; для полной истории удалите старые записи и экспортируйте снова.",
    es: "Se muestran tus {cap} registros más recientes — tienes más; para el historial completo, borra los antiguos y exporta de nuevo.",
    pt: "Mostrando seus {cap} registros mais recentes — você tem mais que isso; para o histórico completo, apague os antigos e exporte novamente.",
    id: "Menampilkan {cap} catatan terbarumu — kamu punya lebih banyak; untuk riwayat lengkap, hapus yang lama lalu ekspor lagi.",
    de: "Zeigt deine {cap} neuesten Einträge — du hast mehr als das; lösche ältere Einträge für die vollständige Historie und exportiere erneut.",
    tr: "En son {cap} kaydın gösteriliyor — bundan fazlası var; tam geçmiş için eski kayıtları silip tekrar dışa aktar.",
    uk: "Показано останні {cap} записів — у вас їх більше; для повної історії видаліть старі записи й експортуйте знову.",
    fa: "آخرین {cap} رکورد شما نمایش داده می‌شود — بیش از این تعداد دارید؛ برای تاریخچه کامل، رکوردهای قدیمی را حذف و دوباره خروجی بگیرید.",
    ar: "يعرض أحدث {cap} سجل لديك — لديك أكثر من ذلك؛ للحصول على السجل الكامل، احذف السجلات القديمة وصدّر مرة أخرى.",
    hi: "आपकी सबसे हालिया {cap} प्रविष्टियां दिखाई जा रही हैं — आपके पास इससे अधिक हैं; पूर्ण इतिहास के लिए पुरानी प्रविष्टियां हटाकर फिर से एक्सपोर्ट करें।",
  },
  catCapReached: {
    en: "You've reached the {cap}-category limit. Remove one before adding another.",
    ru: "Достигнут лимит в {cap} категорий. Удалите одну, прежде чем добавлять новую.",
    es: "Has alcanzado el límite de {cap} categorías. Elimina una antes de añadir otra.",
    pt: "Você atingiu o limite de {cap} categorias. Remova uma antes de adicionar outra.",
    id: "Kamu sudah mencapai batas {cap} kategori. Hapus satu sebelum menambah yang baru.",
    de: "Du hast das Limit von {cap} Kategorien erreicht. Entferne eine, bevor du eine neue hinzufügst.",
    tr: "{cap} kategori sınırına ulaştın. Yenisini eklemeden önce birini kaldır.",
    uk: "Досягнуто ліміту в {cap} категорій. Видаліть одну, перш ніж додавати нову.",
    fa: "شما به محدودیت {cap} دسته رسیده‌اید. قبل از افزودن دسته دیگر، یکی را حذف کنید.",
    ar: "لقد وصلت إلى حد {cap} فئة. أزل واحدة قبل إضافة أخرى.",
    hi: "आप {cap}-श्रेणी की सीमा तक पहुँच गए हैं। नई जोड़ने से पहले एक हटाएं।",
  },
  btn_openInPrivate: {
    en: "Open in private",
    ru: "Открыть в ЛС",
    es: "Abrir en privado",
    pt: "Abrir em privado",
    id: "Buka di chat pribadi",
    de: "Privat öffnen",
    tr: "Özelden aç",
    uk: "Відкрити приватно",
    fa: "باز کردن در خصوصی",
    ar: "افتح في الخاص",
    hi: "निजी में खोलें",
  },
  btn_oneTime: {
    en: "One-time {stars} ⭐",
    ru: "Разово {stars} ⭐",
    es: "Pago único {stars} ⭐",
    pt: "Pagamento único {stars} ⭐",
    id: "Sekali bayar {stars} ⭐",
    de: "Einmalig {stars} ⭐",
    tr: "Tek seferlik {stars} ⭐",
    uk: "Одноразово {stars} ⭐",
    fa: "یک‌باره {stars} ⭐",
    ar: "مرة واحدة {stars} ⭐",
    hi: "एकमुश्त {stars} ⭐",
  },
  btn_monthly: {
    en: "Monthly {stars} ⭐",
    ru: "Ежемесячно {stars} ⭐",
    es: "Mensual {stars} ⭐",
    pt: "Mensal {stars} ⭐",
    id: "Bulanan {stars} ⭐",
    de: "Monatlich {stars} ⭐",
    tr: "Aylık {stars} ⭐",
    uk: "Щомісячно {stars} ⭐",
    fa: "ماهانه {stars} ⭐",
    ar: "شهريًا {stars} ⭐",
    hi: "मासिक {stars} ⭐",
  },
  tapToSubscribe: {
    en: "Tap to subscribe:",
    ru: "Нажмите, чтобы подписаться:",
    es: "Toca para suscribirte:",
    pt: "Toque para assinar:",
    id: "Ketuk untuk berlangganan:",
    de: "Tippe zum Abonnieren:",
    tr: "Abone olmak için dokun:",
    uk: "Натисніть, щоб підписатися:",
    fa: "برای اشتراک ضربه بزنید:",
    ar: "اضغط للاشتراك:",
    hi: "सदस्यता लेने के लिए टैप करें:",
  },
  btn_subscribe: {
    en: "Subscribe {stars} ⭐/month",
    ru: "Подписка {stars} ⭐/мес",
    es: "Suscribirse {stars} ⭐/mes",
    pt: "Assinar {stars} ⭐/mês",
    id: "Berlangganan {stars} ⭐/bln",
    de: "Abo {stars} ⭐/Monat",
    tr: "Abone ol {stars} ⭐/ay",
    uk: "Підписка {stars} ⭐/міс",
    fa: "اشتراک {stars} ⭐/ماه",
    ar: "اشترك {stars} ⭐/شهر",
    hi: "सदस्यता {stars} ⭐/माह",
  },
  btn_shareWeek: {
    en: "📤 Share my week",
    ru: "📤 Поделиться неделей",
    es: "📤 Compartir mi semana",
    pt: "📤 Compartilhar semana",
    id: "📤 Bagikan mingguku",
    de: "📤 Meine Woche teilen",
    tr: "📤 Haftamı paylaş",
    uk: "📤 Поділитися тижнем",
    fa: "📤 اشتراک‌گذاری هفته‌ام",
    ar: "📤 مشاركة أسبوعي",
    hi: "📤 मेरा सप्ताह साझा करें",
  },
  alreadyPro: {
    en: "You already have Pro. Thank you.",
    ru: "У вас уже есть Pro. Спасибо.",
    es: "Ya tienes Pro. Gracias.",
    pt: "Você já tem o Pro. Obrigado.",
    id: "Kamu sudah punya Pro. Terima kasih.",
    de: "Du hast bereits Pro. Danke.",
    tr: "Zaten Pro'ya sahipsin. Teşekkürler.",
    uk: "У вас уже є Pro. Дякуємо.",
    fa: "شما قبلاً Pro دارید. متشکریم.",
    ar: "لديك بالفعل Pro. شكرًا لك.",
    hi: "आपके पास पहले से Pro है। धन्यवाद।",
  },
  startInGroup: {
    en: "💰 DM me to track your spending — /start in private.",
    ru: "💰 Напишите мне в личку, чтобы вести учёт трат — /start в личке.",
    es: "💰 Escríbeme en privado para registrar tus gastos — /start en privado.",
    pt: "💰 Me chame no privado para registrar seus gastos — /start no privado.",
    id: "💰 Chat pribadi denganku untuk mencatat pengeluaranmu — /start di chat pribadi.",
    de: "💰 Schreib mir privat, um deine Ausgaben zu verfolgen — /start im Privatchat.",
    tr: "💰 Harcamalarını takip etmek için bana özelden yaz — özelde /start.",
    uk: "💰 Напишіть мені в приват, щоб вести облік витрат — /start у приваті.",
    fa: "💰 برای پیگیری هزینه‌هایتان در خصوصی به من پیام دهید — /start در خصوصی.",
    ar: "💰 راسلني في الخاص لتتبع مصاريفك — /start في الخاص.",
    hi: "💰 अपने खर्च ट्रैक करने के लिए मुझे निजी में मैसेज करें — निजी में /start करें।",
  },
  btn_logExpense: {
    en: "💸 Log an expense",
    ru: "💸 Записать расход",
    es: "💸 Registrar un gasto",
    pt: "💸 Registrar um gasto",
    id: "💸 Catat pengeluaran",
    de: "💸 Ausgabe erfassen",
    tr: "💸 Harcama kaydet",
    uk: "💸 Записати витрату",
    fa: "💸 ثبت یک هزینه",
    ar: "💸 تسجيل مصروف",
    hi: "💸 एक खर्च दर्ज करें",
  },
  askEntry: {
    en: "What did you spend? e.g. `12.50 coffee`",
    ru: "Что вы потратили? напр. `12.50 coffee`",
    es: "¿En qué gastaste? ej. `12.50 coffee`",
    pt: "Em que você gastou? ex. `12.50 coffee`",
    id: "Kamu belanja apa? mis. `12.50 coffee`",
    de: "Wofür hast du Geld ausgegeben? z. B. `12.50 coffee`",
    tr: "Ne için harcadın? örn. `12.50 coffee`",
    uk: "На що ви витратили? напр. `12.50 coffee`",
    fa: "چه چیزی خریدید؟ مثلاً `12.50 coffee`",
    ar: "على ماذا أنفقت؟ مثل `12.50 coffee`",
    hi: "आपने क्या खर्च किया? जैसे `12.50 coffee`",
  },
  entryPlaceholder: {
    en: "12.50 coffee",
    ru: "12.50 coffee",
    es: "12.50 coffee",
    pt: "12.50 coffee",
    id: "12.50 coffee",
    de: "12.50 coffee",
    tr: "12.50 coffee",
    uk: "12.50 coffee",
    fa: "12.50 coffee",
    ar: "12.50 coffee",
    hi: "12.50 coffee",
  },
  guestPreview: {
    en: "{emoji} I'd log this as {amount} for {note} ({category}).\n\nOpen the bot to actually save it and track your spending.",
    ru: "{emoji} Я бы записал это как {amount} на {note} ({category}).\n\nОткройте бота, чтобы реально сохранить и отслеживать расходы.",
    es: "{emoji} Registraría esto como {amount} para {note} ({category}).\n\nAbre el bot para guardarlo de verdad y rastrear tus gastos.",
    pt: "{emoji} Eu registraria isso como {amount} para {note} ({category}).\n\nAbra o bot para salvar de verdade e acompanhar seus gastos.",
    id: "{emoji} Ini akan kucatat sebagai {amount} untuk {note} ({category}).\n\nBuka bot untuk benar-benar menyimpannya dan melacak pengeluaranmu.",
    de: "{emoji} Ich würde das als {amount} für {note} ({category}) erfassen.\n\nÖffne den Bot, um es wirklich zu speichern und deine Ausgaben zu verfolgen.",
    tr: "{emoji} Bunu {note} için {amount} ({category}) olarak kaydederdim.\n\nGerçekten kaydetmek ve harcamalarını takip etmek için botu aç.",
    uk: "{emoji} Я б записав це як {amount} на {note} ({category}).\n\nВідкрийте бота, щоб справді зберегти й відстежувати витрати.",
    fa: "{emoji} این را به‌عنوان {amount} برای {note} ({category}) ثبت می‌کردم.\n\nبرای ذخیره واقعی و پیگیری هزینه‌هایتان ربات را باز کنید.",
    ar: "{emoji} كنت سأسجل هذا كـ {amount} لـ {note} ({category}).\n\nافتح البوت لحفظه فعليًا وتتبع مصاريفك.",
    hi: "{emoji} मैं इसे {note} ({category}) के लिए {amount} के रूप में दर्ज करता।\n\nवास्तव में सेव करने और अपने खर्च ट्रैक करने के लिए बॉट खोलें।",
  },
  app_title: {
    en: "💰 This month", ru: "💰 Этот месяц", es: "💰 Este mes", pt: "💰 Este mês", id: "💰 Bulan ini",
    de: "💰 Dieser Monat", tr: "💰 Bu ay", uk: "💰 Цей місяць", fa: "💰 این ماه", ar: "💰 هذا الشهر", hi: "💰 इस महीने",
  },
  app_loading: {
    en: "Loading…", ru: "Загрузка…", es: "Cargando…", pt: "Carregando…", id: "Memuat…",
    de: "Wird geladen…", tr: "Yükleniyor…", uk: "Завантаження…", fa: "در حال بارگذاری…", ar: "جارٍ التحميل…", hi: "लोड हो रहा है…",
  },
  app_moreApps: {
    en: "More apps", ru: "Другие приложения", es: "Más apps", pt: "Mais apps", id: "Aplikasi lain",
    de: "Mehr Apps", tr: "Diğer uygulamalar", uk: "Інші застосунки", fa: "برنامه‌های بیشتر", ar: "تطبيقات أخرى", hi: "और ऐप्स",
  },
  app_shareChat: {
    en: "💬 Share to a chat", ru: "💬 Отправить в чат", es: "💬 Compartir en chat", pt: "💬 Enviar no chat", id: "💬 Bagikan ke chat",
    de: "💬 In Chat teilen", tr: "💬 Sohbette paylaş", uk: "💬 Надіслати в чат", fa: "💬 ارسال به گفتگو", ar: "💬 مشاركة في محادثة", hi: "💬 चैट में भेजें",
  },
  app_shareStory: {
    en: "📣 Share to story", ru: "📣 В историю", es: "📣 A tu historia", pt: "📣 Nos stories", id: "📣 Bagikan ke story",
    de: "📣 Als Story teilen", tr: "📣 Hikâyede paylaş", uk: "📣 В історію", fa: "📣 اشتراک در استوری", ar: "📣 مشاركة في قصة", hi: "📣 स्टोरी में साझा करें",
  },
  app_storyText: {
    en: "Track your spending in seconds, right inside Telegram.",
    ru: "Отслеживайте расходы за секунды — прямо в Telegram.",
    es: "Registra tus gastos en segundos, dentro de Telegram.",
    pt: "Registre seus gastos em segundos, dentro do Telegram.",
    id: "Lacak pengeluaranmu dalam hitungan detik, langsung di Telegram.",
    de: "Verfolge deine Ausgaben in Sekunden — direkt in Telegram.",
    tr: "Harcamalarını saniyeler içinde takip et, doğrudan Telegram'da.",
    uk: "Відстежуйте витрати за секунди — прямо в Telegram.",
    fa: "هزینه‌هایتان را در چند ثانیه، همین‌جا در تلگرام پیگیری کنید.",
    ar: "تتبع مصاريفك في ثوانٍ، مباشرة داخل تيليجرام.",
    hi: "अपने खर्च को सेकंडों में ट्रैक करें, सीधे Telegram में।",
  },
  app_shareFail: {
    en: "Sharing is unavailable right now.", ru: "Поделиться сейчас не получилось.", es: "Ahora mismo no se puede compartir.",
    pt: "Não foi possível compartilhar agora.", id: "Berbagi sedang tidak tersedia.", de: "Teilen ist gerade nicht möglich.",
    tr: "Şu anda paylaşılamıyor.", uk: "Поділитися зараз не вдалося.", fa: "در حال حاضر اشتراک‌گذاری ممکن نیست.",
    ar: "المشاركة غير متاحة الآن.", hi: "अभी साझा नहीं किया जा सकता।",
  },
  app_errNoInit: {
    en: "Open this app from the bot — tap the menu button.", ru: "Откройте это приложение из бота — кнопка меню.",
    es: "Abre esta app desde el bot — toca el botón de menú.", pt: "Abra este app pelo bot — toque no botão de menu.",
    id: "Buka aplikasi ini dari bot — ketuk tombol menu.", de: "Öffne diese App über den Bot — tippe auf den Menü-Button.",
    tr: "Bu uygulamayı bottan aç — menü düğmesine dokun.", uk: "Відкрийте застосунок із бота — кнопка меню.",
    fa: "این برنامه را از داخل ربات باز کنید — دکمه منو.", ar: "افتح هذا التطبيق من داخل البوت — زر القائمة.",
    hi: "यह ऐप बॉट से खोलें — मेनू बटन दबाएँ।",
  },
  app_errExpired: {
    en: "This session expired. Close and reopen the app.", ru: "Сессия истекла. Закройте и откройте приложение снова.",
    es: "La sesión caducó. Cierra y vuelve a abrir la app.", pt: "A sessão expirou. Feche e abra o app de novo.",
    id: "Sesi berakhir. Tutup lalu buka lagi aplikasinya.", de: "Sitzung abgelaufen. App schließen und neu öffnen.",
    tr: "Oturum doldu. Uygulamayı kapatıp yeniden aç.", uk: "Сесія завершилася. Закрийте й відкрийте застосунок.",
    fa: "نشست منقضی شد. برنامه را ببندید و دوباره باز کنید.", ar: "انتهت الجلسة. أغلق التطبيق وأعد فتحه.",
    hi: "सेशन खत्म हो गया। ऐप बंद करके फिर खोलें।",
  },
  app_errBadSig: {
    en: "This link is not valid. Reopen the app from the bot.", ru: "Ссылка недействительна. Откройте приложение из бота.",
    es: "Este enlace no es válido. Abre la app desde el bot.", pt: "Este link não é válido. Abra o app pelo bot.",
    id: "Tautan ini tidak valid. Buka aplikasi dari bot.", de: "Dieser Link ist ungültig. Öffne die App über den Bot.",
    tr: "Bu bağlantı geçersiz. Uygulamayı bottan aç.", uk: "Посилання недійсне. Відкрийте застосунок із бота.",
    fa: "این پیوند معتبر نیست. برنامه را از ربات باز کنید.", ar: "هذا الرابط غير صالح. أعد فتح التطبيق من البوت.",
    hi: "यह लिंक मान्य नहीं है। ऐप बॉट से खोलें।",
  },
  app_unlockPro: {
    en: "🔓 Unlock Pro", ru: "🔓 Открыть Pro", es: "🔓 Desbloquear Pro", pt: "🔓 Desbloquear Pro", id: "🔓 Buka Pro",
    de: "🔓 Pro freischalten", tr: "🔓 Pro'yu aç", uk: "🔓 Відкрити Pro", fa: "🔓 فعال‌سازی Pro", ar: "🔓 تفعيل Pro", hi: "🔓 Pro अनलॉक करें",
  },
  app_proOneTime: {
    en: "One-time {n} ⭐", ru: "Разово {n} ⭐", es: "Pago único {n} ⭐", pt: "Único {n} ⭐", id: "Sekali bayar {n} ⭐",
    de: "Einmalig {n} ⭐", tr: "Tek seferlik {n} ⭐", uk: "Разово {n} ⭐", fa: "یک‌باره {n} ⭐", ar: "مرة واحدة {n} ⭐", hi: "एकमुश्त {n} ⭐",
  },
  app_proMonthly: {
    en: "Monthly {n} ⭐/mo", ru: "Ежемесячно {n} ⭐", es: "Mensual {n} ⭐/mes", pt: "Mensal {n} ⭐/mês", id: "Bulanan {n} ⭐/bln",
    de: "Monatlich {n} ⭐", tr: "Aylık {n} ⭐/ay", uk: "Щомісяця {n} ⭐", fa: "ماهانه {n} ⭐", ar: "شهريًا {n} ⭐", hi: "मासिक {n} ⭐",
  },
  app_payDone: {
    en: "✅ Pro unlocked. Thank you.", ru: "✅ Pro активирован. Спасибо.", es: "✅ Pro activado. Gracias.", pt: "✅ Pro ativado. Obrigado.",
    id: "✅ Pro aktif. Terima kasih.", de: "✅ Pro aktiviert. Danke.", tr: "✅ Pro açıldı. Teşekkürler.", uk: "✅ Pro активовано. Дякуємо.",
    fa: "✅ Pro فعال شد. سپاسگزاریم.", ar: "✅ تم تفعيل Pro. شكرًا لك.", hi: "✅ Pro चालू हो गया। धन्यवाद।",
  },
  app_payCancelled: {
    en: "Payment cancelled.", ru: "Оплата отменена.", es: "Pago cancelado.", pt: "Pagamento cancelado.", id: "Pembayaran dibatalkan.",
    de: "Zahlung abgebrochen.", tr: "Ödeme iptal edildi.", uk: "Оплату скасовано.", fa: "پرداخت لغو شد.", ar: "أُلغيت عملية الدفع.", hi: "भुगतान रद्द हुआ।",
  },
  app_payFailed: {
    en: "Payment failed. Please try again.", ru: "Оплата не прошла. Попробуйте ещё раз.", es: "El pago falló. Inténtalo de nuevo.",
    pt: "O pagamento falhou. Tente de novo.", id: "Pembayaran gagal. Coba lagi.", de: "Zahlung fehlgeschlagen. Bitte erneut versuchen.",
    tr: "Ödeme başarısız. Tekrar dene.", uk: "Оплата не пройшла. Спробуйте ще раз.", fa: "پرداخت ناموفق بود. دوباره تلاش کنید.",
    ar: "فشل الدفع. حاول مرة أخرى.", hi: "भुगतान विफल। फिर कोशिश करें।",
  },
  app_noBudget: {
    en: "no budget set — {cmd}", ru: "бюджет не задан — {cmd}", es: "sin presupuesto — {cmd}", pt: "sem orçamento definido — {cmd}",
    id: "anggaran belum diatur — {cmd}", de: "kein Budget festgelegt — {cmd}", tr: "bütçe belirlenmedi — {cmd}", uk: "бюджет не задано — {cmd}",
    fa: "بودجه‌ای تنظیم نشده — {cmd}", ar: "لا توجد ميزانية محددة — {cmd}", hi: "कोई बजट सेट नहीं है — {cmd}",
  },
  app_ofBudget: {
    en: "of {total} budget", ru: "из бюджета {total}", es: "de {total} de presupuesto", pt: "de {total} de orçamento",
    id: "dari anggaran {total}", de: "von {total} Budget", tr: "{total} bütçeden", uk: "з бюджету {total}",
    fa: "از بودجهٔ {total}", ar: "من ميزانية {total}", hi: "{total} बजट में से",
  },
  app_loadFailed: {
    en: "Could not load your data. Please reopen this app.", ru: "Не удалось загрузить данные. Откройте приложение снова.",
    es: "No se pudieron cargar tus datos. Vuelve a abrir esta app.", pt: "Não foi possível carregar seus dados. Reabra este app.",
    id: "Gagal memuat data kamu. Buka kembali aplikasi ini.", de: "Deine Daten konnten nicht geladen werden. App bitte neu öffnen.",
    tr: "Verilerin yüklenemedi. Lütfen uygulamayı yeniden aç.", uk: "Не вдалося завантажити дані. Відкрийте застосунок знову.",
    fa: "بارگذاری داده‌ها ممکن نشد. لطفاً برنامه را دوباره باز کنید.", ar: "تعذّر تحميل بياناتك. يرجى إعادة فتح التطبيق.",
    hi: "आपका डेटा लोड नहीं हो सका। कृपया ऐप फिर से खोलें।",
  },
  app_addPlaceholder: {
    en: "12.50 coffee", ru: "12.50 coffee", es: "12.50 coffee", pt: "12.50 coffee", id: "12.50 coffee",
    de: "12.50 coffee", tr: "12.50 coffee", uk: "12.50 coffee", fa: "12.50 coffee", ar: "12.50 coffee", hi: "12.50 coffee",
  },
  app_addBtn: {
    en: "Log", ru: "Записать", es: "Registrar", pt: "Registrar", id: "Catat",
    de: "Erfassen", tr: "Kaydet", uk: "Записати", fa: "ثبت", ar: "تسجيل", hi: "दर्ज करें",
  },
  app_addFail: {
    en: "Could not log that. Try again.", ru: "Не удалось записать. Попробуйте снова.",
    es: "No se pudo registrar. Inténtalo de nuevo.", pt: "Não foi possível registrar. Tente novamente.",
    id: "Gagal mencatat. Coba lagi.", de: "Konnte nicht erfasst werden. Bitte erneut versuchen.",
    tr: "Kaydedilemedi. Tekrar dene.", uk: "Не вдалося записати. Спробуйте ще раз.",
    fa: "ثبت نشد. دوباره تلاش کنید.", ar: "تعذّر التسجيل. حاول مرة أخرى.", hi: "दर्ज नहीं हो सका। फिर कोशिश करें।",
  },
};
