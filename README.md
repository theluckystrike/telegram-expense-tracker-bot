# BudgetLogBot — expense tracker for Telegram

**Try it:** [@BudgetLogBot](https://t.me/BudgetLogBot?start=github) · [tg.zovo.one/bots/budget/](https://tg.zovo.one/bots/budget/)

## What it does

BudgetLogBot is a private-chat expense tracker: send a message like `12.50 coffee`, `coffee 12.50`, `-40 groceries`, or `$12 taxi`, and it's logged and auto-categorized — no menus, no forms. The amount can come first or last, with an optional currency symbol and either `.` or `,` as the decimal separator; the rest of the message is auto-categorized by keyword (English, Russian, Spanish, Portuguese, Indonesian, and German) into one of 8 categories. `/today`, `/week`, and `/month` show totals by category with a text bar; `/budget 1500` sets a monthly budget with alerts at 80% and 100%; `/undo` removes the last entry. Every Monday, at your local hour, you get a weekly summary with a "📤 Share my week" button — the shared text carries only your category mix in percent, never a dollar figure. Free tier: 30 entries/month. Pro (150 ⭐ one-time, or 100 ⭐/month) adds unlimited entries, CSV export (`/export`), and custom categories (`/cat add`).

## Use it without adding the bot

Type `@BudgetLogBot 12.50 coffee` in **any** Telegram chat, even one the bot has never been added to. It parses the amount and shows the normalized entry and its category, then pitches saving it for real.

Both **Inline Mode** and **Guest Chat Mode** need to be turned on for the bot in [@BotFather](https://t.me/BotFather) (Bot Settings → Mode Settings) — turn Inline Mode on first, then Guest Chat Mode. Without both, only the classic `@Bot query` inline surface works.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler secret put OWNER_ID # optional
wrangler deploy
curl -G "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  --data-urlencode "url=https://<your-worker>.workers.dev/webhook" \
  --data-urlencode "secret_token=$WEBHOOK_SECRET" \
  --data-urlencode 'allowed_updates=["message","callback_query","guest_message","inline_query","chosen_inline_result"]'
```

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, an hourly Cron Trigger for the Monday weekly summary, a Telegram Mini App with a month overview, Pro upgrades billed with Telegram Stars (one-time or subscription).

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
