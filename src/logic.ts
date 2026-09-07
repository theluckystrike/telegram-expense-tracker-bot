import { CATEGORY_EMOJI, categorize } from "./categories.ts";
import { t } from "./i18n.ts";
import type { GuestReply } from "./guest.ts";

const DAY = 86_400;
export const dayIndex = (sec: number, tzMin: number): number => Math.floor((sec + tzMin * 60) / DAY);

/** Bare numeric token: digits with optionally-embedded "." and "," separators
 * (never a leading/trailing separator). Matches "12", "12.50", "1,000.50",
 * "1.000,50", "12,000,000" — but not a lone trailing separator. */
const AMOUNT_TOKEN = "\\d(?:[\\d.,]*\\d)?";

/** Normalizes a bare numeric token (digits + "." and "," only, no sign/currency) into
 * a float, handling both thousands-separator conventions ("1,000.50" and "1.000,50")
 * and plain decimals ("12.50" / "12,50"). Returns null — reject, never guess — for any
 * ambiguous or malformed token, e.g. a single separator followed by exactly 3 digits
 * (could be a 3-decimal amount or a thousands group) or mismatched group sizes. */
function parseAmountToken(raw: string): number | null {
  const seps = raw.match(/[.,]/g);
  if (!seps) return /^\d+$/.test(raw) ? Number(raw) : null;
  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");
  if (hasDot && hasComma) {
    // Whichever separator appears last is the decimal point; the other is grouping.
    const decIdx = Math.max(raw.lastIndexOf("."), raw.lastIndexOf(","));
    const decChar = raw[decIdx];
    const groupChar = decChar === "." ? "," : ".";
    const intPart = raw.slice(0, decIdx);
    const fracPart = raw.slice(decIdx + 1);
    if (!/^\d{1,2}$/.test(fracPart)) return null;
    if (intPart.includes(decChar)) return null; // decimal separator must appear once
    const groups = intPart.split(groupChar);
    if (!/^\d{1,3}$/.test(groups[0])) return null;
    for (let i = 1; i < groups.length; i++) if (!/^\d{3}$/.test(groups[i])) return null;
    return Number(groups.join("") + "." + fracPart);
  }
  const ch = seps[0];
  const parts = raw.split(ch);
  if (parts.length === 2) {
    // A single separator is ambiguous between "decimal" and "thousands group" only
    // when exactly 3 digits follow it (e.g. "12.345") — reject rather than guess.
    const [intPart, fracPart] = parts;
    if (!/^\d+$/.test(intPart) || !/^\d+$/.test(fracPart)) return null;
    if (fracPart.length === 1 || fracPart.length === 2) return Number(intPart + "." + fracPart);
    return null;
  }
  // Multiple occurrences of the same separator: valid only as thousands grouping
  // (first group 1-3 digits, every later group exactly 3), never a decimal.
  if (!/^\d{1,3}$/.test(parts[0])) return null;
  for (let i = 1; i < parts.length; i++) if (!/^\d{3}$/.test(parts[i])) return null;
  return Number(parts.join(""));
}

/** Turns a bare numeric token into integer cents. Rejects non-positive amounts,
 * ambiguous separators (see `parseAmountToken`), and anything above a sane cap
 * (1,000,000.00 units), matching the fleet's money-parsing convention (see
 * split/src/parse.ts). */
function toCents(raw: string): number | null {
  const n = parseAmountToken(raw);
  if (n === null || !Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return cents > 1_000_000_00 ? null : cents;
}

export interface ParsedEntry { cents: number; note: string; }

/** Parses a free-text expense message in either amount-first ("12.50 coffee", "-40
 * groceries", "$12 coffee", "1,000.50 rent") or amount-last ("coffee 12.50") form. A
 * bare amount with no note yields note "expense". Returns null when no unambiguous
 * amount can be found — including when a candidate number's separators are ambiguous
 * (see `parseAmountToken`), so a malformed amount is rejected rather than mis-split
 * between the cents value and the note — and always for text starting with "/": that's
 * a command (registered or not), never an expense, even one shaped like "/toady 12". */
export function parseEntry(text: string): ParsedEntry | null {
  const s = text.trim();
  if (!s || s.startsWith("/")) return null;
  const first = s.match(new RegExp(`^[-+]?[$€£]?\\s*(${AMOUNT_TOKEN})\\s*(.*)$`, "s"));
  if (first) {
    const cents = toCents(first[1]);
    if (cents !== null) return { cents, note: first[2].trim().slice(0, 80) || "expense" };
  }
  const last = s.match(new RegExp(`^(.+?)\\s+[-+]?[$€£]?\\s*(${AMOUNT_TOKEN})\\s*[$€£]?$`, "s"));
  if (last) {
    const cents = toCents(last[2]);
    if (cents !== null) return { cents, note: last[1].trim().slice(0, 80) || "expense" };
  }
  return null;
}

export const money = (cents: number, currency = ""): string => (cents / 100).toFixed(2) + (currency ? " " + currency : "");

/** Local calendar-month bounds, as [start, end) unix seconds in UTC, for the month that
 * contains `nowSec` in a tz offset by `tzMin` minutes from UTC. */
export function monthBounds(nowSec: number, tzMin: number): { start: number; end: number } {
  const local = new Date((nowSec + tzMin * 60) * 1000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const startLocal = Date.UTC(y, m, 1) / 1000;
  const endLocal = Date.UTC(y, m + 1, 1) / 1000;
  return { start: startLocal - tzMin * 60, end: endLocal - tzMin * 60 };
}

/** "YYYY-MM" label for the local calendar month containing `nowSec`. */
export function monthLabel(nowSec: number, tzMin: number): string {
  const local = new Date((nowSec + tzMin * 60) * 1000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface EntryRow { id: number; cents: number; category: string; note: string; created: number; }

/** Rows whose `created` falls in [start, end). Bounded by the caller's row list. */
export function inRange(rows: EntryRow[], start: number, end: number): EntryRow[] {
  return rows.filter((r) => r.created >= start && r.created < end);
}

/** Rows for `today` (single local day) by day-index equality. */
export function todayRows(rows: EntryRow[], nowSec: number, tzMin: number): EntryRow[] {
  const t = dayIndex(nowSec, tzMin);
  return rows.filter((r) => dayIndex(r.created, tzMin) === t);
}

/** Rows for the trailing 7 local days (inclusive of today). */
export function weekRows(rows: EntryRow[], nowSec: number, tzMin: number): EntryRow[] {
  const t = dayIndex(nowSec, tzMin);
  return rows.filter((r) => t - dayIndex(r.created, tzMin) < 7 && r.created <= nowSec);
}

export function sumCents(rows: EntryRow[]): number {
  return rows.reduce((s, r) => s + r.cents, 0);
}

/** Category -> total cents, insertion order = first-seen category. */
export function totalsByCategory(rows: EntryRow[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const r of rows) t[r.category] = (t[r.category] ?? 0) + r.cents;
  return t;
}

/** Simple `width`-block text bar for `amountCents` relative to `maxCents`. */
export function bar(amountCents: number, maxCents: number, width = 10): string {
  if (maxCents <= 0) return "";
  const filled = Math.max(0, Math.min(width, Math.round((amountCents / maxCents) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export type BudgetThreshold = "80" | "100";

/** Fires for every 80%/100% budget line this entry pushes month-to-date spend across
 * (never re-fires for a line that was already past before this entry). Checked on
 * every new entry with the totals from just before and just after it. Returns both
 * thresholds, in crossing order, when a single large entry crosses both at once. */
export function budgetAlert(beforeCents: number, afterCents: number, budgetCents: number): BudgetThreshold[] {
  if (budgetCents <= 0) return [];
  const before = beforeCents / budgetCents;
  const after = afterCents / budgetCents;
  const hits: BudgetThreshold[] = [];
  if (before < 0.8 && after >= 0.8) hits.push("80");
  if (before < 1 && after >= 1) hits.push("100");
  return hits;
}

/** True when a free user has hit the monthly entry cap; Pro users are never capped. */
export function overFreeCap(monthCount: number, pro: boolean, freeCap: number): boolean {
  return !pro && monthCount >= freeCap;
}

/** Picks the most-recently-added row (highest id) for /undo. Null for an empty list. */
export function pickLast<T extends { id: number }>(rows: T[]): T | null {
  return rows.length ? rows.reduce((a, b) => (b.id > a.id ? b : a)) : null;
}

export interface CatPercent { category: string; pct: number; }

/** Category totals reduced to whole-percent shares (no dollar amounts), for the
 * privacy-preserving "Share my week" text — highest share first. */
export function categoryPercents(totals: Record<string, number>): CatPercent[] {
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  if (sum <= 0) return [];
  return Object.entries(totals)
    .map(([category, cents]) => ({ category, pct: Math.round((cents / sum) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

/** Name/amount-free share text: category mix in percent only. */
export function shareWeekText(percents: CatPercent[]): string {
  if (!percents.length) return "📊 A quiet week — no expenses logged. Track yours with BudgetBot!";
  const top = percents.slice(0, 3).map((p) => `${p.category} ${p.pct}%`).join(", ");
  return `📊 My spending mix this week: ${top}.\nTrack yours with BudgetBot!`;
}

/** RFC4180-ish CSV field escaping, formula-injection-safe: a field starting with
 * `=`, `+`, `-` or `@` (the characters Excel/LibreOffice/Sheets treat as "this cell is
 * a formula") gets a leading single-quote so it opens as inert text, then the field is
 * quoted (doubling any inner quotes) whenever it contains a comma, quote, newline or
 * carriage return. Quoting alone is not enough — spreadsheet apps evaluate `"=..."` too. */
export function csvEscape(field: string): string {
  const guarded = /^[=+\-@]/.test(field) ? "'" + field : field;
  return /[",\n\r]/.test(guarded) ? '"' + guarded.replace(/"/g, '""') + '"' : guarded;
}

export function csvRow(fields: (string | number)[]): string {
  return fields.map((f) => csvEscape(String(f))).join(",");
}

/** Parses a monthly budget amount from `/budget 1500`-style text; same tolerant,
 * mis-split-proof numeric parsing as entry amounts (commas, dots, both thousands-
 * separator conventions, optional currency symbol). */
export function parseBudget(text: string): number | null {
  const m = text.trim().match(new RegExp(`^[$€£]?\\s*(${AMOUNT_TOKEN})\\s*$`));
  return m ? toCents(m[1]) : null;
}

/** Fixed set of recognized currency symbols for `/currency` — deliberately excludes
 * `=`, `+`, `-`, `@` and anything else that could smuggle a CSV formula into the
 * `amount` column of `/export` (see `csvEscape`). */
const CURRENCY_SYMBOLS = new Set([
  "$", "€", "£", "¥", "₹", "₽", "₩", "₺", "₫", "₴", "₦", "₱", "₪", "₡", "₲", "₵", "₸", "₼", "₾", "฿", "₭", "₮", "kr", "zł", "R$",
]);

/** Validate/normalize a `/currency` argument: an ISO-4217-style 3-letter code (e.g.
 * "eur") upper-cased, or a symbol from a fixed allowlist kept as typed. Anything else
 * — including a bare `=`/`+`/`-`/`@` that could otherwise ride into a CSV cell — is
 * rejected. */
export function parseCurrency(text: string): string | null {
  const v = text.trim();
  if (!v) return null;
  if (/^[A-Za-z]{3}$/.test(v)) return v.toUpperCase();
  return CURRENCY_SYMBOLS.has(v) ? v : null;
}

/** Parses a `/tz` argument like "+2", "-5", "+5:30" into minutes offset from UTC
 * (matching kit.ts's `users.tz_min`). Range: -14:00..+14:00 (the real-world UTC
 * offset span). Requires an explicit sign so it can't be confused with an amount. */
export function parseTz(text: string): number | null {
  const m = text.trim().match(/^([+-])(\d{1,2})(?::([0-5]\d))?$/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const h = Number(m[2]);
  const min = m[3] ? Number(m[3]) : 0;
  if (h > 14 || (h === 14 && min > 0)) return null;
  return sign * (h * 60 + min);
}

/** True if a user's Pro access is currently in effect: purchased (pro=1) and either a
 * one-time grant (proUntil null) or a still-unexpired subscription. */
export function isProActive(pro: number, proUntil: number | null, nowSec: number): boolean {
  return pro === 1 && (proUntil === null || proUntil > nowSec);
}

/** Deep-link `/start` payloads we attribute as an acquisition source, e.g. "site", "x". */
/** Epoch day 0 (1970-01-01) was a Thursday, so a local day index lands on Monday
 * when it's 4 mod 7. Used to gate the weekly summary inside the hourly cron. */
export const isMondayDay = (dayIdx: number): boolean => ((dayIdx % 7) + 7) % 7 === 4;

export const SOURCE_RE = /^[a-z]{2,12}$/;
export const isSourcePayload = (payload: string): boolean => SOURCE_RE.test(payload);

/** Telegram's pseudo-user id for "sent by a group's anonymous admin". */
export const GROUP_ANON_ID = 1087968824;
/** Other pseudo-senders: @Channel_Bot (posts on behalf of a linked channel) and 777000
 * (Telegram's own service notifications). */
const PSEUDO_IDS = new Set([GROUP_ANON_ID, 136817688, 777000]);

/** True for a message worth treating as a real person: not a pseudo-user, and not a
 * message relayed via another bot's inline result. */
export function isRealSender(fromId: number | undefined, viaBot: unknown): boolean {
  return fromId !== undefined && !PSEUDO_IDS.has(fromId) && !viaBot;
}

/** Validates a `/cat add <name>` custom-category name: 1-24 chars, no control/markup
 * characters that could break Markdown rendering or the Mini App's category list. */
export function parseCategoryName(text: string): string | null {
  const v = text.trim().toLowerCase();
  if (!v || v.length > 24) return null;
  return /^[^\s,"'<>&*_`[\]\\]+(?: [^\s,"'<>&*_`[\]\\]+)*$/.test(v) ? v : null;
}

/** Strips the Markdown an i18n string carries: guest text is posted with no parse_mode
 * (the query is user-supplied and may contain `_ * \` [`). */
const plain = (s: string): string => s.replaceAll("*", "").replaceAll("`", "");

/** Pure guest-reply builder: given the query text (already stripped of the @mention) and
 * the summoner's language, returns the guest result content — no ctx, no store, so it is
 * unit-testable under plain node. A parse becomes an honest preview (nothing is saved
 * from a chat this bot is not in, per Guest Mode's contract); a bad or empty query gets
 * the localized /start pitch. */
export function buildGuestReply(q: string, lang: string, freeEntries: number): GuestReply {
  const p = q ? parseEntry(q) : null;
  if (!p) {
    return { title: "💰 BudgetBot — track spending in seconds", description: "Try: @BudgetBot 12.50 coffee", text: plain(t(lang, "start", { free: freeEntries })) };
  }
  const category = categorize(p.note);
  const emoji = CATEGORY_EMOJI[category] ?? "🏷";
  const amount = money(p.cents, "USD");
  return {
    title: `${emoji} ${amount} — ${category}`,
    description: p.note,
    text: plain(t(lang, "guestPreview", { emoji, amount, note: p.note, category })),
  };
}
