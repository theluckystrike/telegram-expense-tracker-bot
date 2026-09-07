/** Keyword -> category map for auto-categorizing a logged expense's free-text note.
 * Covers en, ru, es, pt, id, de so a note in any of those languages gets a sensible
 * bucket. Matching is whole-word/whole-phrase (never a bare substring), longest
 * keyword first regardless of category, so e.g. "credit card" (bills) beats "car"
 * (transport); nothing matches -> "other". No keyword may appear in more than one
 * category's list — a duplicate would make one category permanently unreachable for
 * that word. */

export const CATEGORIES = ["food", "transport", "home", "health", "fun", "shopping", "bills", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

type Bucket = Exclude<Category, "other">;

const KEYWORDS: Record<Bucket, string[]> = {
  food: [
    // en
    "coffee", "cafe", "café", "restaurant", "lunch", "dinner", "breakfast", "brunch", "grocery", "groceries",
    "supermarket", "pizza", "burger", "sushi", "snack", "snacks", "food", "meal", "drink", "drinks", "beer",
    "wine", "bar", "bakery", "market", "eat", "eating", "kfc", "mcdonalds", "starbucks", "takeout", "delivery",
    "noodles", "sandwich", "juice", "tea",
    // ru
    "кофе", "кафе", "ресторан", "обед", "ужин", "завтрак", "продукты", "супермаркет", "пицца", "еда", "закуска",
    // es
    "café", "comida", "restaurante", "almuerzo", "cena", "desayuno", "supermercado", "mercado", "cerveza",
    // pt
    "restaurante", "almoço", "jantar", "supermercado",
    // id
    "kopi", "makan", "restoran", "sarapan", "makan siang", "makan malam", "warung", "pasar", "jajan",
    // de
    "kaffee", "essen", "restaurant", "mittagessen", "abendessen", "frühstück", "supermarkt", "imbiss", "bäckerei",
  ],
  transport: [
    // en
    "taxi", "uber", "lyft", "bus", "train", "metro", "subway", "gas", "gasoline", "fuel", "parking", "toll",
    "flight", "airline", "airfare", "car", "bike", "bicycle", "scooter", "transport", "transit", "ticket", "fare",
    // ru
    "такси", "автобус", "метро", "бензин", "парковка", "поезд", "билет",
    // es
    "taxi", "autobús", "metro", "gasolina", "estacionamiento", "tren", "boleto",
    // pt
    "táxi", "ônibus", "metrô", "gasolina", "estacionamento", "trem", "passagem",
    // id
    "taksi", "bus", "kereta", "bensin", "parkir", "ojek", "gojek", "grab", "tiket",
    // de
    "taxi", "bus", "bahn", "benzin", "parkplatz", "zug", "fahrkarte",
  ],
  home: [
    // en
    "rent", "mortgage", "furniture", "ikea", "repair", "plumber", "electrician", "utilities", "cleaning",
    "home", "apartment", "decor", "landlord",
    // ru
    "аренда", "квартира", "мебель", "ремонт", "коммунальные", "хозяйство",
    // es
    "alquiler", "hipoteca", "muebles", "reparación", "apartamento",
    // pt
    "aluguel", "hipoteca", "móveis", "reparo", "apartamento",
    // id
    "sewa", "rumah", "perabotan", "perbaikan",
    // de
    "miete", "möbel", "reparatur", "wohnung",
  ],
  health: [
    // en
    "doctor", "pharmacy", "medicine", "dentist", "hospital", "clinic", "insurance", "gym", "fitness",
    "therapy", "drugs", "vitamins", "checkup",
    // ru
    "врач", "аптека", "лекарство", "стоматолог", "больница", "спортзал", "витамины",
    // es
    "médico", "farmacia", "medicina", "dentista", "hospital", "gimnasio",
    // pt
    "médico", "farmácia", "remédio", "dentista", "hospital", "academia",
    // id
    "dokter", "apotek", "obat", "rumah sakit", "gym",
    // de
    "arzt", "apotheke", "medizin", "zahnarzt", "krankenhaus", "fitnessstudio",
  ],
  fun: [
    // en
    "movie", "cinema", "netflix", "spotify", "concert", "game", "gaming", "party", "club", "hobby",
    "travel", "vacation", "trip", "entertainment", "theater", "museum",
    // ru
    "кино", "концерт", "игра", "вечеринка", "путешествие", "отпуск",
    // es
    "cine", "concierto", "juego", "fiesta", "viaje", "vacaciones",
    // pt
    "cinema", "show", "jogo", "festa", "viagem", "férias",
    // id
    "bioskop", "konser", "game", "pesta", "liburan", "wisata",
    // de
    "kino", "konzert", "spiel", "party", "reise", "urlaub",
  ],
  shopping: [
    // en
    "clothes", "clothing", "shoes", "amazon", "mall", "store", "shopping", "gift", "electronics", "gadget",
    // ru
    "одежда", "обувь", "магазин", "подарок",
    // es
    "ropa", "zapatos", "tienda", "regalo",
    // pt
    "roupa", "sapato", "loja", "presente",
    // id
    "baju", "sepatu", "toko", "hadiah",
    // de
    "kleidung", "schuhe", "geschenk", "laden",
  ],
  bills: [
    // en
    "bill", "electricity", "water", "internet", "phone", "subscription", "tax", "loan", "credit card", "utility",
    // ru
    "счет", "электричество", "интернет", "телефон", "подписка", "налог",
    // es
    "factura", "electricidad", "internet", "teléfono", "impuesto",
    // pt
    "conta", "eletricidade", "internet", "telefone", "imposto",
    // id
    "tagihan", "listrik", "internet", "telepon", "pajak",
    // de
    "rechnung", "strom", "internet", "telefon", "steuer",
  ],
};

const ORDER: Bucket[] = ["food", "transport", "home", "health", "fun", "shopping", "bills"];

/** Unicode-aware word tokenizer: splits on anything that isn't a letter or digit, so
 * "credit card" -> ["credit", "card"] and "barber" -> ["barber"] (never a substring hit
 * for the "bar" keyword). Works for non-Latin scripts (Cyrillic etc.) where the regex
 * `\b` boundary is unreliable. */
function tokenize(note: string): string[] {
  return note.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** \x01-delimited token stream, e.g. ["credit","card"] -> "\x01credit\x01card\x01", so a
 * keyword/phrase can be located only at real token boundaries (never as a substring
 * spanning part of one token, per `containsPhrase`). */
function tokenStream(tokens: string[]): string {
  return "\x01" + tokens.join("\x01") + "\x01";
}

/** Whole-word (and whole-phrase, for a multi-word keyword) match: true iff every word
 * of `phrase`, in order, appears as a contiguous run of tokens in `stream`. */
function containsPhrase(stream: string, phrase: string): boolean {
  return stream.includes("\x01" + phrase.trim().split(/\s+/).join("\x01") + "\x01");
}

/** All (category, keyword) pairs flattened and sorted longest-keyword-first, so a
 * multi-word or longer keyword (e.g. "credit card") is tried before a shorter one that
 * could otherwise shadow it (e.g. "car") regardless of category order. */
const ALL_KEYWORDS: { cat: Bucket; kw: string }[] = ORDER
  .flatMap((cat) => KEYWORDS[cat].map((kw) => ({ cat, kw })))
  .sort((a, b) => b.kw.length - a.kw.length);

/** Auto-assigns a category from a free-text note by whole-word/whole-phrase keyword
 * match — never a bare substring, so "barber" doesn't hit "bar" and "carrot" doesn't
 * hit "car". Longest keyword wins first (see `ALL_KEYWORDS`), so a multi-word keyword
 * like "credit card" beats a shorter one like "car" regardless of category order.
 * Falls back to "other". Bounded by the fixed keyword list above (no unbounded loop). */
export function categorize(note: string): Category {
  const tokens = tokenize(note);
  if (!tokens.length) return "other";
  const stream = tokenStream(tokens);
  for (const { cat, kw } of ALL_KEYWORDS) {
    if (containsPhrase(stream, kw)) return cat;
  }
  return "other";
}

/** Whole-word/whole-phrase match of a single keyword (built-in or custom) against a
 * free-text note — the same boundary-aware routine `categorize` uses, exported so
 * custom categories (a Pro feature, matched in index.ts) get identical semantics,
 * including multi-word names like "dog food" (see `parseCategoryName`). */
export function matchesKeyword(note: string, keyword: string): boolean {
  const tokens = tokenize(note);
  return tokens.length > 0 && containsPhrase(tokenStream(tokens), keyword);
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  food: "🍔", transport: "🚕", home: "🏠", health: "💊", fun: "🎉", shopping: "🛍", bills: "🧾", other: "📦",
};
