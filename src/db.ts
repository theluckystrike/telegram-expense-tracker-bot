import { BaseStore, FleetStats, UserRow, now } from "./kit.ts";
import { EntryRow } from "./logic.ts";

export interface UserRowFull extends UserRow { pro_until: number | null; currency: string; lang: string; }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, cents INTEGER NOT NULL,
  note TEXT NOT NULL, category TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS entries_user ON entries(user_id, created);
CREATE TABLE IF NOT EXISTS budgets (user_id INTEGER PRIMARY KEY, cents INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS prefs (user_id INTEGER PRIMARY KEY, currency TEXT NOT NULL DEFAULT 'USD', lang TEXT NOT NULL DEFAULT 'en', last_summary_day INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS custom_cats (user_id INTEGER NOT NULL, name TEXT NOT NULL, PRIMARY KEY (user_id, name));
CREATE TABLE IF NOT EXISTS sources (user_id INTEGER PRIMARY KEY, src TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS exports (user_id INTEGER NOT NULL, ts INTEGER NOT NULL);`;

export class Store extends BaseStore {
  /** Extends BaseStore.forgetUser with this bot's own per-user tables: `sources`, `entries`
   * (the user's own expense log), `budgets`, `prefs`, `custom_cats`, and `exports`. */
  forgetUser(id: number): number {
    return super.forgetUser(id) + this.forgetTables(id, [
      ["sources", "user_id"], ["entries", "user_id"], ["budgets", "user_id"],
      ["prefs", "user_id"], ["custom_cats", "user_id"], ["exports", "user_id"],
    ]);
  }

  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env, SCHEMA);
    // kit.ts's users table (shared, not ours to edit) predates this column.
    ctx.blockConcurrencyWhile(async () => {
      try { ctx.storage.sql.exec("ALTER TABLE users ADD COLUMN pro_until INTEGER"); } catch { /* already present */ }
    });
  }

  /** touchUser plus pro_until/currency/lang, which BaseStore's UserRow doesn't carry. */
  async touchUserFull(id: number, username: string | undefined, name: string): Promise<UserRowFull> {
    const u = await this.touchUser(id, username, name);
    const row = this.one<{ pro_until: number | null }>("SELECT pro_until FROM users WHERE id = ?1", id);
    this.run("INSERT OR IGNORE INTO prefs (user_id) VALUES (?1)", id);
    const p = this.one<{ currency: string; lang: string }>("SELECT currency, lang FROM prefs WHERE user_id = ?1", id) ?? { currency: "USD", lang: "en" };
    return { ...u, pro_until: row?.pro_until ?? null, currency: p.currency, lang: p.lang };
  }
  /** Monthly Pro purchase or renewal: sets/extends the expiry from Telegram's subscription date. */
  async setProSubscription(id: number, charge: string, until: number): Promise<void> {
    this.run(`INSERT INTO users (id, pro, paid_charge, pro_until, first_seen, last_seen) VALUES (?1, 1, ?2, ?3, ?4, ?4)
              ON CONFLICT(id) DO UPDATE SET pro = 1, paid_charge = ?2, pro_until = ?3`, id, charge, until, now());
  }
  /** One-time Pro purchase: permanent, and clears any stale subscription expiry.
   * Always use this (or setProSubscription) for BudgetBot, never kit.ts's inherited
   * `setPro` — that base method sets pro=1 without clearing pro_until, so a lapsed
   * subscriber granted Pro through it would stay expired. */
  async setProLifetime(id: number, charge: string): Promise<void> {
    this.run(`INSERT INTO users (id, pro, paid_charge, pro_until, first_seen, last_seen) VALUES (?1, 1, ?2, NULL, ?3, ?3)
              ON CONFLICT(id) DO UPDATE SET pro = 1, paid_charge = ?2, pro_until = NULL`, id, charge, now());
  }

  async setLang(userId: number, lang: string): Promise<void> {
    this.run("INSERT INTO prefs (user_id, lang) VALUES (?1, ?2) ON CONFLICT(user_id) DO UPDATE SET lang = ?2", userId, lang);
  }
  async setCurrency(userId: number, currency: string): Promise<void> {
    this.run("INSERT INTO prefs (user_id, currency) VALUES (?1, ?2) ON CONFLICT(user_id) DO UPDATE SET currency = ?2", userId, currency);
  }

  /** Entries in the last `days` days (bounded window covering any /today, /week or
   * /month computation the caller does client-side with the pure logic helpers). */
  async recentEntries(userId: number, sinceSec: number): Promise<EntryRow[]> {
    return this.all<EntryRow>("SELECT id, cents, note, category, created FROM entries WHERE user_id = ?1 AND created >= ?2 ORDER BY id DESC LIMIT 3000", userId, sinceSec);
  }
  /** Up to `cap` most-recent entries for `/export`, oldest-first (chronological CSV
   * order). `truncated` is true when the user has more than `cap` entries, so the
   * caller can tell them the export isn't complete instead of silently dropping rows. */
  async exportEntries(userId: number, cap: number): Promise<{ rows: EntryRow[]; truncated: boolean }> {
    const rows = this.all<EntryRow>("SELECT id, cents, note, category, created FROM entries WHERE user_id = ?1 ORDER BY id DESC LIMIT ?2", userId, cap + 1);
    const truncated = rows.length > cap;
    return { rows: (truncated ? rows.slice(0, cap) : rows).reverse(), truncated };
  }
  async addEntry(userId: number, cents: number, note: string, category: string): Promise<number> {
    this.run("INSERT INTO entries (user_id, cents, note, category, created) VALUES (?1, ?2, ?3, ?4, ?5)", userId, cents, note, category, now());
    return this.lastId();
  }
  async deleteEntry(id: number): Promise<void> { this.run("DELETE FROM entries WHERE id = ?1", id); }
  async lastEntries(userId: number, n = 5): Promise<EntryRow[]> {
    return this.all<EntryRow>("SELECT id, cents, note, category, created FROM entries WHERE user_id = ?1 ORDER BY id DESC LIMIT ?2", userId, n);
  }
  async countMonthEntries(userId: number, start: number, end: number): Promise<number> {
    return (this.one<{ n: number }>("SELECT COUNT(*) AS n FROM entries WHERE user_id = ?1 AND created >= ?2 AND created < ?3", userId, start, end) ?? { n: 0 }).n;
  }
  async sumMonthEntries(userId: number, start: number, end: number): Promise<number> {
    return (this.one<{ s: number | null }>("SELECT SUM(cents) AS s FROM entries WHERE user_id = ?1 AND created >= ?2 AND created < ?3", userId, start, end) ?? { s: 0 }).s ?? 0;
  }

  async setBudget(userId: number, cents: number): Promise<void> {
    this.run("INSERT INTO budgets (user_id, cents, updated) VALUES (?1, ?2, ?3) ON CONFLICT(user_id) DO UPDATE SET cents = ?2, updated = ?3", userId, cents, now());
  }
  async budget(userId: number): Promise<number | null> {
    return this.one<{ cents: number }>("SELECT cents FROM budgets WHERE user_id = ?1", userId)?.cents ?? null;
  }

  static readonly CUSTOM_CAT_CAP = 50;

  /** Inserts a custom category, capped at CUSTOM_CAT_CAP per user (matching the LIMIT
   * on `customCategories` below, so no row is ever silently invisible dead storage).
   * Returns false — reject, don't insert — once the user is at the cap. */
  async addCustomCategory(userId: number, name: string): Promise<boolean> {
    const n = (this.one<{ n: number }>("SELECT COUNT(*) AS n FROM custom_cats WHERE user_id = ?1", userId) ?? { n: 0 }).n;
    if (n >= Store.CUSTOM_CAT_CAP) return false;
    this.run("INSERT OR IGNORE INTO custom_cats (user_id, name) VALUES (?1, ?2)", userId, name);
    return true;
  }
  async customCategories(userId: number): Promise<string[]> {
    return this.all<{ name: string }>("SELECT name FROM custom_cats WHERE user_id = ?1 ORDER BY name LIMIT 50", userId).map((r) => r.name);
  }

  async logExport(userId: number): Promise<void> { this.run("INSERT INTO exports (user_id, ts) VALUES (?1, ?2)", userId, now()); }

  /** First-touch attribution for a deep-link source payload (e.g. ?start=site). */
  async addSource(userId: number, src: string): Promise<void> {
    this.run("INSERT OR IGNORE INTO sources (user_id, src, ts) VALUES (?1, ?2, ?3)", userId, src, now());
  }

  /** Users due for the Monday weekly summary: their local day is Monday, their local
   * hour is at or past `checkHour` (>=, not ==, so a user missed at exactly checkHour —
   * e.g. because the candidate set overflowed `limit` — is caught by a later hourly
   * tick the same Monday instead of being skipped for the whole week), they've logged
   * an entry in the trailing 7 days (an entry from months ago doesn't justify a DM
   * forever), and they haven't been sent this local day's summary yet. The Monday/hour/
   * not-yet-sent filter runs in SQL (not a blind pre-filter LIMIT) so the candidate set
   * is naturally small — only users actually due this hour — and results are ordered by
   * `last_summary_day` then `id` so the longest-waiting users are served first if the
   * hour's cohort ever exceeds `limit` (self-rotating: once served, a user's
   * last_summary_day advances past everyone still waiting). */
  async dueWeeklySummaries(nowSec: number, checkHour: number, limit = 2000): Promise<{ id: number; tz_min: number; currency: string; lang: string; localDay: number }[]> {
    return this.all<{ id: number; tz_min: number; currency: string; lang: string; localDay: number }>(
      `SELECT u.id, u.tz_min, p.currency, p.lang,
              CAST((?1 + u.tz_min * 60) / 86400 AS INTEGER) AS localDay
       FROM users u JOIN prefs p ON p.user_id = u.id
       WHERE EXISTS (SELECT 1 FROM entries e WHERE e.user_id = u.id AND e.created >= ?1 - 604800)
         AND CAST((?1 + u.tz_min * 60) / 86400 AS INTEGER) % 7 = 4
         AND CAST(((?1 + u.tz_min * 60) % 86400) / 3600 AS INTEGER) >= ?2
         AND p.last_summary_day <> CAST((?1 + u.tz_min * 60) / 86400 AS INTEGER)
       ORDER BY p.last_summary_day ASC, u.id ASC
       LIMIT ?3`, nowSec, checkHour, limit);
  }
  /** Marks this local day's summary sent — call only after a successful send (a
   * transient send failure must not advance last_summary_day, or that user silently
   * loses the week's summary with no retry). */
  async markSummarySent(userId: number, localDay: number): Promise<void> {
    this.run("UPDATE prefs SET last_summary_day = ?2 WHERE user_id = ?1", userId, localDay);
  }

  async stats(): Promise<FleetStats> {
    const e = this.one<{ n: number }>(`SELECT COUNT(*) AS n FROM entries WHERE ${this.notTestUser("user_id")}`);
    const b = this.one<{ n: number }>(`SELECT COUNT(*) AS n FROM budgets WHERE ${this.notTestUser("user_id")}`);
    const x = this.one<{ n: number }>(`SELECT COUNT(*) AS n FROM exports WHERE ${this.notTestUser("user_id")}`);
    const sr = this.all<{ src: string; n: number }>(`SELECT src, COUNT(*) AS n FROM sources WHERE ${this.notTestUser("user_id")} GROUP BY src`);
    const s: Record<string, number> = {};
    for (const r of sr) s["src_" + r.src] = r.n;
    const sub = this.one<{ n: number }>(`SELECT COUNT(*) AS n FROM users WHERE pro_until IS NOT NULL AND pro_until > ?1 AND ${this.notTestUser("id")}`, now());
    return { ...this.userStats(), ...s, events: e?.n ?? 0, budgets_set: b?.n ?? 0, exports: x?.n ?? 0, subs_active: sub?.n ?? 0 };
  }
}
