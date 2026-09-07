import { test } from "node:test";
import assert from "node:assert/strict";
import {
  budgetAlert, csvEscape, csvRow, isMondayDay, isProActive, isSourcePayload, monthBounds, overFreeCap,
  parseBudget, parseCurrency, parseEntry, parseTz, pickLast, todayRows, weekRows,
} from "../src/logic.ts";
import type { EntryRow } from "../src/logic.ts";
import { categorize, matchesKeyword } from "../src/categories.ts";

test("parseEntry: amount-first, amount-last, sign, commas, currency symbols", () => {
  assert.deepEqual(parseEntry("12.50 coffee"), { cents: 1250, note: "coffee" });
  assert.deepEqual(parseEntry("coffee 12.50"), { cents: 1250, note: "coffee" });
  assert.deepEqual(parseEntry("-40 groceries"), { cents: 4000, note: "groceries" });
  assert.deepEqual(parseEntry("$12 coffee"), { cents: 1200, note: "coffee" });
  assert.deepEqual(parseEntry("12,50 kaffee"), { cents: 1250, note: "kaffee" });
  assert.deepEqual(parseEntry("taxi 8,00"), { cents: 800, note: "taxi" });
  assert.deepEqual(parseEntry("15"), { cents: 1500, note: "expense" });
  assert.equal(parseEntry("just words"), null);
  assert.equal(parseEntry("0 free"), null);
  assert.equal(parseEntry(""), null);
});

test("category mapping across languages: en, ru, es", () => {
  assert.equal(categorize("coffee at starbucks"), "food");
  assert.equal(categorize("такси домой"), "transport");
  assert.equal(categorize("cena en restaurante"), "food");
  assert.equal(categorize("gimnasio mensual"), "health");
  assert.equal(categorize("random unmatched note"), "other");
});

test("budgetAlert: fires exactly once per threshold crossing", () => {
  // budget = 10000 cents; before entries total 7000, entry pushes to 8100 -> crosses 80%
  assert.deepEqual(budgetAlert(7000, 8100, 10000), ["80"]);
  // already past 80% before this entry -> no repeat alert
  assert.deepEqual(budgetAlert(8500, 9500, 10000), []);
  // crosses 100%
  assert.deepEqual(budgetAlert(9000, 10500, 10000), ["100"]);
  // no budget set
  assert.deepEqual(budgetAlert(0, 100, 0), []);
  // a single entry crossing both thresholds at once fires both, in order
  assert.deepEqual(budgetAlert(0, 10500, 10000), ["80", "100"]);
});

test("monthBounds: local calendar month for a positive and a large negative tz offset", () => {
  const marchFirstUtc = Date.UTC(2026, 2, 1, 0, 30) / 1000; // 2026-03-01 00:30 UTC
  // UTC+2: local wall-clock is 02:30 on Mar 1, so the local month is March; the UTC
  // instant of local midnight Mar 1 is Feb 28 22:00 UTC (2h earlier).
  const b1 = monthBounds(marchFirstUtc, 120);
  assert.equal(new Date(b1.start * 1000).toISOString(), "2026-02-28T22:00:00.000Z");
  assert.equal(new Date(b1.end * 1000).toISOString(), "2026-03-31T22:00:00.000Z");
  // Same instant but UTC-3: local wall-clock is 2026-02-28 21:30, still February.
  const b2 = monthBounds(marchFirstUtc, -180);
  assert.equal(new Date(b2.start * 1000).toISOString().slice(0, 10), "2026-02-01");
  assert.equal(new Date(b2.end * 1000).toISOString().slice(0, 10), "2026-03-01");
  // The reference instant always falls inside its own bounds.
  assert.ok(marchFirstUtc >= b1.start && marchFirstUtc < b1.end);
  assert.ok(marchFirstUtc >= b2.start && marchFirstUtc < b2.end);
});

test("todayRows / weekRows respect a tz offset", () => {
  const tzMin = -300; // UTC-5
  const nowSec = Date.UTC(2026, 5, 10, 3, 0) / 1000; // 2026-06-10 03:00 UTC = 2026-06-09 22:00 local
  const rows: EntryRow[] = [
    { id: 1, cents: 100, category: "food", note: "a", created: Date.UTC(2026, 5, 9, 15, 0) / 1000 }, // local Jun 9, 10:00 -> today
    { id: 2, cents: 200, category: "food", note: "b", created: Date.UTC(2026, 5, 3, 15, 0) / 1000 }, // local Jun 3 -> in week window (7d) but not today
    { id: 3, cents: 300, category: "food", note: "c", created: Date.UTC(2026, 4, 20, 15, 0) / 1000 }, // long ago -> excluded from both
  ];
  assert.deepEqual(todayRows(rows, nowSec, tzMin).map((r) => r.id), [1]);
  const week = weekRows(rows, nowSec, tzMin).map((r) => r.id).sort();
  assert.deepEqual(week, [1, 2]);
});

test("free cap: 30 free entries/month, Pro is never capped", () => {
  assert.equal(overFreeCap(29, false, 30), false);
  assert.equal(overFreeCap(30, false, 30), true);
  assert.equal(overFreeCap(999, true, 30), false);
});

test("undo: pickLast selects the highest-id row regardless of input order", () => {
  const rows = [{ id: 3 }, { id: 7 }, { id: 5 }];
  assert.equal(pickLast(rows)?.id, 7);
  assert.equal(pickLast([]), null);
});

test("CSV escaping: commas, quotes, and newlines are quoted per RFC4180", () => {
  assert.equal(csvEscape("plain"), "plain");
  assert.equal(csvEscape("a,b"), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape("line1\nline2"), '"line1\nline2"');
  assert.equal(csvRow([1, "coffee, tea", "food"]), '1,"coffee, tea",food');
});

test("SOURCE_RE / isSourcePayload: lowercase-letter deep-link payloads only", () => {
  assert.equal(isSourcePayload("site"), true);
  assert.equal(isSourcePayload("x"), false); // too short
  assert.equal(isSourcePayload("Site"), false); // uppercase
  assert.equal(isSourcePayload("pro"), true);
  assert.equal(isSourcePayload("a".repeat(13)), false); // too long
});

test("isProActive: one-time (proUntil null) vs an active/expired subscription", () => {
  assert.equal(isProActive(0, null, 1000), false);
  assert.equal(isProActive(1, null, 1000), true); // lifetime
  assert.equal(isProActive(1, 2000, 1000), true); // subscription not yet expired
  assert.equal(isProActive(1, 500, 1000), false); // subscription expired
});

test("parseBudget / parseCurrency", () => {
  assert.equal(parseBudget("1500"), 150000);
  assert.equal(parseBudget("1500,50"), 150050);
  assert.equal(parseBudget("abc"), null);
  assert.equal(parseCurrency("eur"), "EUR");
  assert.equal(parseCurrency("€"), "€");
  assert.equal(parseCurrency(""), null);
  assert.equal(parseCurrency("a b"), null);
  // M8: only a 3-letter code or a fixed symbol — never a formula-leading character
  // that could ride into every /export amount cell.
  assert.equal(parseCurrency("=1+1"), null);
  assert.equal(parseCurrency("-"), null);
  assert.equal(parseCurrency("@x"), null);
  assert.equal(parseCurrency("+"), null);
});

test("H1/M1: thousands separators, both conventions, never mis-split", () => {
  // US/UK convention: "," groups, "." decimal.
  assert.deepEqual(parseEntry("1,000.50 rent"), { cents: 100050, note: "rent" });
  assert.deepEqual(parseEntry("rent 1,000.50"), { cents: 100050, note: "rent" });
  // EU convention: "." groups, "," decimal.
  assert.deepEqual(parseEntry("1.000,50 miete"), { cents: 100050, note: "miete" });
  assert.deepEqual(parseEntry("miete 1.000,50"), { cents: 100050, note: "miete" });
  // Multi-group thousands, no decimal (at the amount cap, so still accepted).
  assert.deepEqual(parseEntry("1,000,000 max"), { cents: 100_000_000, note: "max" });
  // Plain decimals still work.
  assert.deepEqual(parseEntry("12.50 coffee"), { cents: 1250, note: "coffee" });
  assert.deepEqual(parseEntry("12,50 kaffee"), { cents: 1250, note: "kaffee" });
  // Ambiguous single-separator + 3-digit tail: reject, never mis-split into the note.
  assert.equal(parseEntry("12.345 x"), null);
  assert.equal(parseEntry("12,345 x"), null);
  // Currency symbol + thousands grouping together.
  assert.deepEqual(parseEntry("$1,000.50 rent"), { cents: 100050, note: "rent" });
  // parseBudget uses the same mis-split-proof parsing.
  assert.equal(parseBudget("1,000.50"), 100050);
  assert.equal(parseBudget("1.000,50"), 100050);
});

test("H2: csvEscape prefixes formula-leading cells so a note can't inject a spreadsheet formula", () => {
  assert.equal(csvEscape("=cmd|'/c calc'!A0"), "'=cmd|'/c calc'!A0");
  assert.equal(csvEscape("+1+1"), "'+1+1");
  assert.equal(csvEscape("-1+1"), "'-1+1");
  assert.equal(csvEscape("@x"), "'@x");
  // A formula-leading field that also needs quoting (contains a comma) gets both.
  assert.equal(csvEscape("=a,b"), '"\'=a,b"');
  // Plain text starting with a currency symbol or digit is untouched.
  assert.equal(csvEscape("$5 fine"), "$5 fine");
  assert.equal(csvRow([1, "food", "=cmd|'/c calc'!A0"]), "1,food,'=cmd|'/c calc'!A0");
});

test("H4: /toady and any other slash-prefixed text is never logged as an expense", () => {
  assert.equal(parseEntry("/toady 12"), null);
  assert.equal(parseEntry("/foo 50"), null);
  assert.equal(parseEntry("/budget 1500"), null);
});

test("M2: whole-word, longest-keyword-first category matching", () => {
  assert.equal(categorize("credit card"), "bills"); // beats "car" (transport)
  assert.equal(categorize("theater ticket"), "fun"); // "theater" (7) beats "ticket" (6)
  assert.equal(categorize("barber"), "other"); // no longer a false "bar" hit
  assert.equal(categorize("carrot cake"), "other"); // no longer a false "car" hit
  assert.equal(categorize("scarf"), "other"); // no longer a false "car" hit
  // M3: "магазин" (shop) now lives only in shopping, not also food.
  assert.equal(categorize("магазин"), "shopping");
});

test("M4: custom multi-word categories match via the same whole-phrase routine", () => {
  assert.equal(matchesKeyword("dog food for max", "dog food"), true);
  assert.equal(matchesKeyword("hot dog", "dog food"), false);
  assert.equal(matchesKeyword("petsmart run", "pet"), false); // whole word, not substring
  assert.equal(matchesKeyword("pet supplies", "pet"), true);
});

test("H3: parseTz and isMondayDay together gate the Monday-hour weekly summary by local time", () => {
  assert.equal(parseTz("+2"), 120);
  assert.equal(parseTz("-5"), -300);
  assert.equal(parseTz("+5:30"), 330);
  assert.equal(parseTz("+15"), null); // out of UTC range
  assert.equal(parseTz("2"), null); // sign required, not an amount
  assert.equal(parseTz("abc"), null);

  // A user at UTC+2 is at local Monday 09:00 (the default SUMMARY_HOUR) when nowSec is
  // Monday 07:00 UTC — the weekly summary is due for them.
  const mondayUtc = Date.UTC(2026, 8, 7, 7, 0) / 1000; // 2026-09-07 is a Monday
  const tzPlus2 = parseTz("+2")!;
  const localHour = (nowSec: number, tzMin: number) => Math.floor(((nowSec + tzMin * 60) % 86_400) / 3600);
  const localDay = (nowSec: number, tzMin: number) => Math.floor((nowSec + tzMin * 60) / 86_400);
  assert.equal(localHour(mondayUtc, tzPlus2), 9);
  assert.ok(isMondayDay(localDay(mondayUtc, tzPlus2)));

  // Near the UTC day boundary, two users' local calendar day disagrees: at
  // 2026-09-06 22:30 UTC (a Sunday), the UTC+2 user has already rolled into Monday
  // 00:30 local, but the UTC-5 user is still at Sunday 17:30 local.
  const nearMidnightUtc = Date.UTC(2026, 8, 6, 22, 30) / 1000;
  const tzMinus5 = parseTz("-5")!;
  assert.ok(isMondayDay(localDay(nearMidnightUtc, tzPlus2)));
  assert.ok(!isMondayDay(localDay(nearMidnightUtc, tzMinus5)));
});
