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

## Related projects

Part of the same small family of single-purpose Telegram bots — each one does one thing, open source (MIT), built with grammY on Cloudflare Workers:

| Bot | What it does |
|---|---|
| [AnonSayProBot](https://github.com/theluckystrike/telegram-anonymous-group-post-bot) | Post to a group anonymously |
| [AnonInboxProBot](https://github.com/theluckystrike/telegram-anonymous-inbox-bot) | A personal link for anonymous messages |
| [BirthdayReminderProBot](https://github.com/theluckystrike/telegram-birthday-reminder-bot) | Tracks a group's birthdays, posts on the day |
| [CountdownDaysBot](https://github.com/theluckystrike/telegram-countdown-bot) | Live countdown card for a date that matters |
| [GroupPulseProBot](https://github.com/theluckystrike/telegram-group-activity-stats-bot) | Group activity stats, no message content stored |
| [HabitStreakProBot](https://github.com/theluckystrike/telegram-habit-tracker-bot) | Daily habit tracking with streaks |
| [IcebreakerDailyBot](https://github.com/theluckystrike/telegram-icebreaker-question-bot) | Daily conversation-starter question for a group |
| [WhisperLockBot](https://github.com/theluckystrike/telegram-locked-message-bot) | Drop a locked message into any chat, reveal on tap |
| [PartyPackProBot](https://github.com/theluckystrike/telegram-party-games-bot) | Truth, Dare, Would You Rather prompts |
| [FocusTimerProBot](https://github.com/theluckystrike/telegram-pomodoro-bot) | Pomodoro focus timers, solo or shared |
| [NudgeRemindBot](https://github.com/theluckystrike/telegram-reminder-bot) | Reminders inside Telegram, no separate app |
| [EventRSVPProBot](https://github.com/theluckystrike/telegram-rsvp-event-bot) | Event cards with live Going / Maybe / Can't counts |
| [SantaDrawProBot](https://github.com/theluckystrike/telegram-secret-santa-bot) | Secret Santa draw and exchange for a group |
| [SplitTabsBot](https://github.com/theluckystrike/telegram-split-bill-bot) | Running expense ledger for group bills |
| [AsyncStandupBot](https://github.com/theluckystrike/telegram-standup-bot) | Async daily standup for a team, no meeting |
| [TimeSheetProBot](https://github.com/theluckystrike/telegram-time-tracking-bot) | Freelance time tracking by client |
| [WhenIsItBot](https://github.com/theluckystrike/telegram-time-zone-bot) | Converts a time across a group's timezones |
| [TriviaDailyProBot](https://github.com/theluckystrike/telegram-trivia-bot) | Daily trivia quiz with leaderboard and streaks |
| [WordADayLearnBot](https://github.com/theluckystrike/telegram-vocabulary-bot) | Daily vocabulary with spaced repetition |

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
