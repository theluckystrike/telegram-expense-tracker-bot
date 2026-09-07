import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import { Env as KitEnv, PRO_STARS, ProSpec, displayName, isPrivate, makeFetch, now, preparedShare, proButton, sendInvoice } from "./kit.ts";
import { GuestReply, queryText, wireGuest, wireInline } from "./guest.ts";
import { Store } from "./db.ts";
import { CATEGORY_EMOJI, Category, categorize, matchesKeyword } from "./categories.ts";
import {
  EntryRow, bar, budgetAlert, buildGuestReply, csvRow, inRange, isProActive, isRealSender, isSourcePayload, money,
  monthBounds, overFreeCap, parseBudget, parseCategoryName, parseCurrency, parseEntry, parseTz, pickLast,
  categoryPercents, shareWeekText, sumCents, todayRows, totalsByCategory, weekRows,
} from "./logic.ts";
import type { BudgetThreshold } from "./logic.ts";
import { resolveLang, t } from "./i18n.ts";
import { APP_HTML, buildShareText, handleAction, handleProLink, initDataFailure, initDataStartParam, isExcludedAppUser, validateInitData } from "./webapp.ts";
import type { ProLinkBody } from "./webapp.ts";
import type { ProPlan } from "./webapp-i18n.ts";
import { BOT, publicLink } from "./botname.ts";
export { Store };

const FREE_ENTRIES = 30;
const SUB_STARS = 100;
const SUB_PERIOD_SEC = 2_592_000; // 30 days, per Telegram's subscription_period unit
const SUMMARY_HOUR = 9; // local hour BudgetBot's Monday weekly summary fires at
const EXPORT_CAP = 5000; // /export row cap; over this the CSV is the most recent EXPORT_CAP entries, flagged as truncated

interface Env extends KitEnv { STORE: DurableObjectNamespace<Store>; }
const store = (env: Env) => env.STORE.get(env.STORE.idFromName("main"));

const MORE_TEXT = "More free tools by the same maker:\n🔒 @WhisperLockBot — locked messages only one person can open\n⏰ @NudgeRemindBot — reminders that arrive on time\n📮 @AnonInboxProBot — anonymous inbox via your link\n🧾 @SplitTabsBot — split group expenses\n🔥 @HabitStreakProBot — habit streaks with daily check-ins\n💰 @BudgetBot — personal expense tracker";
const SHARE_TEXT = "Track your spending in seconds, right inside Telegram.";
const shareUrl = (text: string, param: string) => `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${BOT}?start=${param}`)}&text=${encodeURIComponent(text)}`;

const PRO: ProSpec = {
  title: "BudgetBot Pro",
  description: "Unlimited entries, CSV export, and custom categories. One-time payment.",
  payload: "budget-pro",
  thanks: "✅ Pro unlocked: unlimited entries, CSV export, custom categories.\n\n/more — more free tools",
};
const PRO_SUB = { title: "BudgetBot Pro (monthly)", description: "Unlimited entries, CSV export, and custom categories. Renews monthly.", payload: "budget-sub" };

/** Mints the same invoice link for the /pro "Monthly" button (chat flow) and the Mini
 * App's POST /api/pro-link, so successful_payment handling can never drift between them. */
function proLink(api: Bot["api"], plan: ProPlan): Promise<string> {
  if (plan === "monthly") {
    return api.createInvoiceLink(PRO_SUB.title, PRO_SUB.description, PRO_SUB.payload, "", "XTR",
      [{ label: PRO_SUB.title, amount: SUB_STARS }], { subscription_period: SUB_PERIOD_SEC });
  }
  return api.createInvoiceLink(PRO.title, PRO.description, PRO.payload, "", "XTR",
    [{ label: PRO.title, amount: PRO_STARS }]);
}

async function sendGroupOnly(ctx: Context, text: string): Promise<void> {
  const lang = resolveLang(ctx.from?.language_code);
  await ctx.reply(text, { reply_markup: new InlineKeyboard().url(t(lang, "btn_openInPrivate"), `https://t.me/${BOT}?start=pro`) });
}
async function sendProInGroup(ctx: Context): Promise<void> {
  await sendGroupOnly(ctx, "Pro purchases happen in a private chat.");
}

function proMenu(lang: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "btn_oneTime", { stars: PRO_STARS }), "pro:onetime")
    .text(t(lang, "btn_monthly", { stars: SUB_STARS }), "pro:sub");
}

async function sendProMenu(ctx: Context): Promise<void> {
  if (!isPrivate(ctx)) { await sendProInGroup(ctx); return; }
  const lang = resolveLang(ctx.from?.language_code);
  await ctx.reply(t(lang, "proPitchMenu"), { reply_markup: proMenu(lang) });
}

async function sendSubLink(ctx: Context): Promise<void> {
  if (!isPrivate(ctx)) { await sendProInGroup(ctx); return; }
  const lang = resolveLang(ctx.from?.language_code);
  const link = await proLink(ctx.api, "monthly");
  await ctx.reply(t(lang, "tapToSubscribe"), { reply_markup: new InlineKeyboard().url(t(lang, "btn_subscribe", { stars: SUB_STARS }), link) });
}

async function onSuccessfulPayment(ctx: Context, env: Env): Promise<void> {
  const sp = ctx.message!.successful_payment!;
  const isRenewal = sp.is_recurring === true && sp.is_first_recurring !== true;
  if (sp.invoice_payload.endsWith("-sub")) {
    const until = sp.subscription_expiration_date ?? now() + SUB_PERIOD_SEC;
    await store(env).setProSubscription(ctx.from!.id, sp.telegram_payment_charge_id, until);
  } else {
    await store(env).setProLifetime(ctx.from!.id, sp.telegram_payment_charge_id);
  }
  await store(env).track(ctx.from!.id, "paid");
  const lang = resolveLang(ctx.from?.language_code);
  await ctx.reply(isRenewal ? "🔄 Pro renewed. Thank you." : t(lang, "proThanks"));
}

/** Fetches a bounded window of the user's entries wide enough to cover /today, /week
 * and /month for any tz offset (up to 14h either side of UTC). */
async function windowRows(env: Env, userId: number): Promise<EntryRow[]> {
  return store(env).recentEntries(userId, now() - 33 * 86_400);
}

function emojiFor(cat: string): string {
  return CATEGORY_EMOJI[cat as Category] ?? "🏷";
}

function summaryLines(rows: EntryRow[], currency: string): string[] {
  const totals = totalsByCategory(rows);
  const max = Math.max(0, ...Object.values(totals));
  return Object.entries(totals).sort((a, b) => b[1] - a[1])
    .map(([cat, cents]) => `${emojiFor(cat)} ${cat} ${bar(cents, max)} ${money(cents, currency)}`);
}

async function showSummary(ctx: Context, env: Env, period: "today" | "week" | "month"): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const lang = resolveLang(from.language_code);
  if (!isPrivate(ctx)) { await sendGroupOnly(ctx, "Your spending totals are only shown in a private chat."); return; } // personal totals are never posted into a group
  const u = await store(env).touchUserFull(from.id, from.username, displayName(from));
  const rows = await windowRows(env, u.id);
  const nowSec = now();
  const periodRows = period === "today" ? todayRows(rows, nowSec, u.tz_min)
    : period === "week" ? weekRows(rows, nowSec, u.tz_min)
    : inRange(rows, monthBounds(nowSec, u.tz_min).start, monthBounds(nowSec, u.tz_min).end);
  const title = period === "today" ? "📅 Today" : period === "week" ? "🗓 This week" : "📆 This month";
  const lines = summaryLines(periodRows, u.currency);
  const body = lines.length ? lines.join("\n") : t(lang, "noEntries");
  await ctx.reply(`${title}: ${money(sumCents(periodRows), u.currency)}\n\n${body}`);
}

interface EntryResult {
  ok: boolean;
  limit?: number;
  cents?: number;
  note?: string;
  category?: string;
  currency?: string;
  alerts?: BudgetThreshold[];
  budgetCents?: number;
}

/** Parses and logs one entry for `userId` — free-cap check, categorize, `addEntry`,
 * `track(u.id,"action")`, budget-threshold check — shared by the chat `/entry` (or plain
 * DM text) path and the Mini App's POST /api/entry, so both surfaces write the exact same
 * `action` step and can never drift (mirrors split's `logExpenseIn`). */
async function performEntry(env: Env, userId: number, username: string | undefined, display: string, text: string): Promise<EntryResult> {
  const p = parseEntry(text);
  if (!p) return { ok: false };
  const u = await store(env).touchUserFull(userId, username, display);
  const nowSec = now();
  const { start, end } = monthBounds(nowSec, u.tz_min);
  const monthCount = await store(env).countMonthEntries(u.id, start, end);
  const pro = isProActive(u.pro, u.pro_until, nowSec);
  if (overFreeCap(monthCount, pro, FREE_ENTRIES)) {
    await store(env).track(u.id, "pro_prompt");
    return { ok: false, limit: FREE_ENTRIES };
  }
  const customs = await store(env).customCategories(u.id);
  const category = customs.find((c) => matchesKeyword(p.note, c)) ?? categorize(p.note);
  const beforeSum = await store(env).sumMonthEntries(u.id, start, end);
  await store(env).addEntry(u.id, p.cents, p.note, category);
  await store(env).track(u.id, "action");
  const budgetCents = await store(env).budget(u.id);
  const alerts = budgetCents ? budgetAlert(beforeSum, beforeSum + p.cents, budgetCents) : [];
  return { ok: true, cents: p.cents, note: p.note, category, currency: u.currency, alerts, budgetCents: budgetCents ?? undefined };
}

async function onEntry(ctx: Context, env: Env, text: string): Promise<void> {
  const from = ctx.from;
  if (!from || !isPrivate(ctx)) return;
  const lang = resolveLang(from.language_code);
  // Any text starting with "/" is a command, registered or not — never log it as an
  // expense (an unregistered/mistyped command like "/toady 12" would otherwise be
  // silently booked as a 12.00 "expense" named "/toady"). Unknown commands get help.
  if (text.startsWith("/")) { await ctx.reply(t(lang, "usage")); return; }
  const r = await performEntry(env, from.id, from.username, displayName(from), text);
  if (!r.ok) {
    if (r.limit) { await ctx.reply(t(lang, "limitReached", { free: FREE_ENTRIES, stars: PRO_STARS, sub: SUB_STARS }), { reply_markup: proButton() }); return; }
    await ctx.reply(t(lang, "usage"));
    return;
  }
  await ctx.reply(t(lang, "logged", { emoji: emojiFor(r.category!), amount: money(r.cents!, r.currency), note: r.note!, category: r.category! }));
  for (const alert of r.alerts ?? []) {
    await ctx.reply(t(lang, alert === "80" ? "alert80" : "alert100", { amount: money(r.budgetCents!, r.currency) }));
  }
}

/** Acknowledging a tap is cosmetic; the action behind it is not. A stale, expired or
 * already-answered callback id makes answerCallbackQuery throw, and an unguarded throw
 * would abort the handler before it does the work the tap asked for. */
async function ack(ctx: Context): Promise<void> {
  try { await ctx.answerCallbackQuery(); } catch { /* stale or invalid query id */ }
}

/** Asks for an expense in the one state a phone user can answer without knowing the
 * command syntax: a force_reply prompt. The very next message is already handled by the
 * unconditional `m.on("message:text")` -> onEntry below, so no pending flag is needed. */
async function askEntry(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const lang = resolveLang(from.language_code);
  await store(env).touchUserFull(from.id, from.username, displayName(from));
  await ctx.reply(t(lang, "askEntry"), { reply_markup: { force_reply: true, input_field_placeholder: t(lang, "entryPlaceholder") } });
}

async function onUndo(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const lang = resolveLang(from.language_code);
  const u = await store(env).touchUserFull(from.id, from.username, displayName(from));
  const last = pickLast(await store(env).lastEntries(u.id, 5));
  if (!last) { await ctx.reply(t(lang, "undoEmpty")); return; }
  await store(env).deleteEntry(last.id);
  await ctx.reply(t(lang, "undoDone", { amount: money(last.cents, u.currency), note: last.note }));
}

async function onBudget(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const lang = resolveLang(from.language_code);
  const cents = parseBudget(String(ctx.match ?? ""));
  if (cents === null) { await ctx.reply(t(lang, "budgetUsage")); return; }
  const u = await store(env).touchUserFull(from.id, from.username, displayName(from));
  await store(env).setBudget(u.id, cents);
  await ctx.reply(t(lang, "budgetSet", { amount: money(cents, u.currency) }));
}

async function onCurrency(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const lang = resolveLang(from.language_code);
  const c = parseCurrency(String(ctx.match ?? ""));
  if (!c) { await ctx.reply(t(lang, "currencyUsage")); return; }
  await store(env).touchUserFull(from.id, from.username, displayName(from));
  await store(env).setCurrency(from.id, c);
  await ctx.reply(t(lang, "currencySet", { currency: c }));
}

async function onTz(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const lang = resolveLang(from.language_code);
  const mins = parseTz(String(ctx.match ?? ""));
  if (mins === null) { await ctx.reply(t(lang, "tzUsage")); return; }
  await store(env).touchUserFull(from.id, from.username, displayName(from));
  await store(env).setTz(from.id, mins);
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const label = `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  await ctx.reply(t(lang, "tzSet", { offset: label }));
}

async function onExport(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const lang = resolveLang(from.language_code);
  const u = await store(env).touchUserFull(from.id, from.username, displayName(from));
  const pro = isProActive(u.pro, u.pro_until, now());
  if (!pro) { await ctx.reply(t(lang, "exportProOnly"), { reply_markup: proButton() }); return; }
  const { rows, truncated } = await store(env).exportEntries(u.id, EXPORT_CAP);
  const csv = "id,date,amount,category,note\n" + rows.map((r) =>
    csvRow([r.id, new Date(r.created * 1000).toISOString().slice(0, 10), money(r.cents, u.currency), r.category, r.note])).join("\n");
  await store(env).logExport(u.id);
  await ctx.replyWithDocument(new InputFile(new TextEncoder().encode(csv), "budget.csv"),
    truncated ? { caption: t(lang, "exportTruncated", { cap: EXPORT_CAP }) } : undefined);
}

async function onCat(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const lang = resolveLang(from.language_code);
  const u = await store(env).touchUserFull(from.id, from.username, displayName(from));
  const pro = isProActive(u.pro, u.pro_until, now());
  if (!pro) { await ctx.reply(t(lang, "catProOnly"), { reply_markup: proButton() }); return; }
  const arg = String(ctx.match ?? "").trim();
  const m = arg.match(/^add\s+(.+)$/i);
  const name = m ? parseCategoryName(m[1]) : null;
  if (!name) { await ctx.reply(t(lang, "catUsage")); return; }
  const added = await store(env).addCustomCategory(u.id, name);
  if (!added) { await ctx.reply(t(lang, "catCapReached", { cap: 50 })); return; }
  await ctx.reply(t(lang, "catAdded", { name }));
}

async function onGuest(ctx: Context): Promise<GuestReply> {
  const lang = resolveLang(ctx.from?.language_code);
  const q = queryText(ctx, BOT);
  return buildGuestReply(q, lang, FREE_ENTRIES);
}

function buildBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);
  // /start, /help and /pro are registered on the RAW bot (before the isRealSender
  // filter below) so a group's anonymous admin (pseudo-sender id GROUP_ANON_ID) gets a
  // reply instead of silence — each guards its own store writes with isPrivate so a
  // pseudo-sender never gets a spurious users/funnel row.
  bot.command("start", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const payload = String(ctx.match ?? "");
    if (!isPrivate(ctx)) {
      if (payload === "pro") { await sendProMenu(ctx); return; }
      await ctx.reply(t(resolveLang(from.language_code), "startInGroup"));
      return;
    }
    await store(env).touchUserFull(from.id, from.username, displayName(from));
    await store(env).track(from.id, "start");
    if (payload === "pro") { await sendProMenu(ctx); return; }
    if (isSourcePayload(payload)) await store(env).addSource(from.id, payload);
    const lang = resolveLang(from.language_code);
    const kb = new InlineKeyboard().text(t(lang, "btn_logExpense"), "logdemo").row().url("📣 Share this bot", shareUrl(SHARE_TEXT, "share"));
    await ctx.reply(t(lang, "start", { free: FREE_ENTRIES }), { parse_mode: "Markdown", reply_markup: kb });
  });
  bot.command("help", (ctx) => ctx.reply(t(resolveLang(ctx.from?.language_code), "help", { free: FREE_ENTRIES, stars: PRO_STARS, sub: SUB_STARS }), { parse_mode: "Markdown" }));
  bot.command("pro", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    if (!isPrivate(ctx)) { await sendProInGroup(ctx); return; }
    const u = await store(env).touchUserFull(from.id, from.username, displayName(from));
    if (isProActive(u.pro, u.pro_until, now())) { await ctx.reply(t(resolveLang(from.language_code), "alreadyPro")); return; }
    await sendProMenu(ctx);
  });
  const m = bot.on("message").filter((ctx) => isRealSender(ctx.from?.id, ctx.message.via_bot));
  m.use(async (ctx, next) => { if (ctx.from) await store(env).setLang(ctx.from.id, resolveLang(ctx.from.language_code)); await next(); });
  m.command("more", (ctx) => ctx.reply(MORE_TEXT));
  m.command("today", (ctx) => showSummary(ctx, env, "today"));
  m.command("week", (ctx) => showSummary(ctx, env, "week"));
  m.command("month", (ctx) => showSummary(ctx, env, "month"));
  m.command("budget", (ctx) => onBudget(ctx, env));
  m.command("undo", (ctx) => onUndo(ctx, env));
  m.command("currency", (ctx) => onCurrency(ctx, env));
  m.command("tz", (ctx) => onTz(ctx, env));
  m.command("export", (ctx) => onExport(ctx, env));
  m.command("cat", (ctx) => onCat(ctx, env));
  bot.callbackQuery("pro", async (ctx) => { await ctx.answerCallbackQuery(); await sendProMenu(ctx); });
  // First-screen primary action: force_reply prompt for a real first entry (the answer is
  // just plain DM text, which the unconditional message:text handler below already logs
  // for real — ACTIVATION-SPEC.md §1a; this used to be a no-op preview).
  bot.callbackQuery("logdemo", async (ctx) => {
    await ack(ctx);
    if (!ctx.from || !isPrivate(ctx)) return;
    await askEntry(ctx, env);
  });
  bot.callbackQuery("pro:onetime", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!isPrivate(ctx)) { await sendProInGroup(ctx); return; }
    await store(env).track(ctx.from.id, "invoice");
    await sendInvoice(ctx, PRO, PRO.payload);
  });
  bot.callbackQuery("pro:sub", async (ctx) => { await ctx.answerCallbackQuery(); await store(env).track(ctx.from.id, "invoice"); await sendSubLink(ctx); });
  bot.on("pre_checkout_query", (ctx) => ctx.answerPreCheckoutQuery(true));
  bot.on("message:successful_payment", (ctx) => onSuccessfulPayment(ctx, env));
  m.on("message:text", (ctx) => onEntry(ctx, env, ctx.message.text));
  wireGuest(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx),
    // `guest` is NOT written to `sources` here (REVIEW-GUEST F3): a summoner is not an
    // installer. src_guest is earned later, through the ?start=guest deep link in the
    // buttons below. recordGuest self-limits; `flood` downgrades us to the cheap pitch.
    record: async (uid, chatType, chatId) => {
      const r = await store(env).recordGuest(uid, chatType, chatId);
      if (r.recorded) await store(env).track(uid, "guest");
      return !r.flood;
    },
  });
  // Classic inline mode: the SAME reply builder, answered as an inline result. A user types
  // "@Bot query" in any chat on any client and posts the card with `via @Bot` attribution —
  // no admin, no membership, no Guest Chat Mode toggle. The destination chat is unknown, so
  // the card carries private-style buttons only. Counted under `inline_queries`; `sources` is
  // never written here (an inline user is not an installer, same rule as the guest path).
  wireInline(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx),
    record: async (uid) => !(await store(env).recordInline(uid)).flood,
    chosen: (uid) => store(env).recordInlineChosen(uid),
  });
  return bot;
}

/** Weekly summary: fires from the hourly cron for users whose local day is Monday and
 * local hour is at or past SUMMARY_HOUR (dueWeeklySummaries self-rotates and
 * self-catches-up — see its doc comment), once per local day. `markSummarySent` runs
 * only after a successful send, except for a permanent-looking failure (Telegram's
 * "403" for a user who blocked the bot), which is marked too so a blocked user isn't
 * retried every hour forever. */
async function weeklySummary(env: Env): Promise<number> {
  const bot = new Bot(env.BOT_TOKEN);
  const due = await store(env).dueWeeklySummaries(now(), SUMMARY_HOUR);
  let sent = 0;
  for (const s of due) {
    const rows = weekRows(await store(env).recentEntries(s.id, now() - 8 * 86_400), now(), s.tz_min);
    const totals = totalsByCategory(rows);
    const lines = summaryLines(rows, s.currency);
    const body = lines.length ? lines.join("\n") : t(s.lang, "noEntries");
    const text = `${t(s.lang, "weeklySummaryTitle")}\n\nTotal: ${money(sumCents(rows), s.currency)}\n\n${body}`;
    const kb = new InlineKeyboard().url(t(s.lang, "btn_shareWeek"), shareUrl(shareWeekText(categoryPercents(totals)), "recap"));
    try {
      await bot.api.sendMessage(s.id, text, { reply_markup: kb });
      sent += 1;
      await store(env).markSummarySent(s.id, s.localDay);
    } catch (e) {
      const msg = String(e);
      console.log("summary failed", s.id, msg.slice(0, 100));
      if (msg.includes("403")) await store(env).markSummarySent(s.id, s.localDay);
    }
  }
  return sent;
}

async function apiMonth(req: Request, env: Env): Promise<Response> {
  try {
    const body = (await req.json().catch(() => ({}))) as { initData?: string };
    const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((x): x is string => !!x));
    if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
  if (!isExcludedAppUser(user.id, Number(env.OWNER_ID) || 0)) {
    await store(env).track(user.id, "app_open");
    const startParam = initDataStartParam(body.initData ?? "");
    if (isSourcePayload(startParam)) await store(env).addSource(user.id, startParam);
  }
    const u = await store(env).touchUserFull(user.id, user.username, user.username ? "@" + user.username : user.first_name);
    const nowSec = now();
    const { start, end } = monthBounds(nowSec, u.tz_min);
    const rows = inRange(await store(env).recentEntries(u.id, start), start, end);
    const totals = totalsByCategory(rows);
    const spentCents = sumCents(rows);
    const budgetCents = (await store(env).budget(u.id)) ?? 0;
    const pro = isProActive(u.pro, u.pro_until, nowSec);
    const max = Math.max(0, ...Object.values(totals));
    const totalsOut = Object.entries(totals).sort((a, b) => b[1] - a[1])
      .map(([category, cents]) => ({ category, emoji: emojiFor(category), cents, bar: bar(cents, max) }));
    return Response.json({ totals: totalsOut, spentCents, budgetCents, currency: u.currency, pro, capped: overFreeCap(rows.length, pro, FREE_ENTRIES), proStars: PRO_STARS, subStars: SUB_STARS });
  } catch (e) {
    console.log("apiMonth failed", String(e).slice(0, 200));
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/** POST /api/entry: the Mini App's own "log an entry" write — same parser, same free cap
 * and the same `action` funnel step as the chat path (ACTIVATION-SPEC.md §1c), via the
 * shared `performEntry`. A QA fixture id gets 200 + {qa:true} and writes nothing (handleAction). */
async function apiEntry(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string; text?: string };
  return handleAction(body, {
    tokens: [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((x): x is string => !!x),
    botLink: publicLink(),
    run: async (user) => {
      const r = await performEntry(env, user.id, user.username, user.username ? "@" + user.username : user.first_name, String(body.text ?? ""));
      return { ok: r.ok, limit: r.limit ?? 0 };
    },
  });
}

async function apiShare(req: Request, env: Env): Promise<Response> {
  try {
    const body = (await req.json().catch(() => ({}))) as { initData?: string };
    const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((x): x is string => !!x));
    if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
    const share = await preparedShare(env, user.id, buildShareText(SHARE_TEXT, BOT, "shared"), `https://t.me/${BOT}`);
    await store(env).recordShare(user.id, "chat");
    return Response.json(share);
  } catch (e) {
    console.log("apiShare failed", String(e).slice(0, 200));
    return Response.json({ error: "Share unavailable." }, { status: 502 });
  }
}

/** POST /api/share-story: records a "share to story" click. Telegram gives no server
 * callback for tg.shareToStory, so the client fires this right before calling it. */
async function apiShareStory(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
  await store(env).recordShare(user.id, "story");
  return Response.json({ ok: true });
}

/** POST /api/pro-link: the Mini App's own Stars checkout (tg.openInvoice). Same invoice
 * as the chat flow, so successful_payment and setProLifetime/setProSubscription are unchanged. */
async function apiProLink(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as ProLinkBody;
  return handleProLink(body, {
    tokens: [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((x): x is string => !!x),
    botLink: publicLink(),
    allowMonthly: true,
    mint: (plan) => proLink(new Bot(env.BOT_TOKEN).api, plan),
    track: (userId) => store(env).track(userId, "invoice"),
  });
}

const botFetch = makeFetch<Env>(buildBot, (env) => store(env).stats());

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path === "/app") return new Response(APP_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (path === "/api/share" && req.method === "POST") return apiShare(req, env);
    if (path === "/api/share-story" && req.method === "POST") return apiShareStory(req, env);
    if (path === "/api/month" && req.method === "POST") return apiMonth(req, env);
    if (path === "/api/entry" && req.method === "POST") return apiEntry(req, env);
    if (path === "/api/pro-link" && req.method === "POST") return apiProLink(req, env);
    return botFetch(req, env);
  },
  async scheduled(_ev: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> { ctx.waitUntil(weeklySummary(env)); },
};
