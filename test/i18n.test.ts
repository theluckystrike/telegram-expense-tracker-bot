import { test } from "node:test";
import assert from "node:assert/strict";
import { LANGS, t } from "../src/i18n.ts";
import type { Key } from "../src/i18n.ts";

// Keys added for the button/reply localization fix — every locale must carry a real
// translation (no accidental fallback to a blank string), and every button label must
// stay short enough to render on a Telegram inline keyboard.
const BTN_KEYS: Key[] = [
  "btn_openInPrivate", "btn_oneTime", "btn_monthly", "btn_subscribe", "btn_shareWeek", "btn_logExpense",
];
const OTHER_NEW_KEYS: Key[] = ["tapToSubscribe", "alreadyPro", "startInGroup"];

test("every locale has a non-empty translation for every new key", () => {
  for (const key of [...BTN_KEYS, ...OTHER_NEW_KEYS]) {
    for (const lang of LANGS) {
      const s = t(lang, key);
      assert.ok(s.length > 0, `${key}/${lang} is empty`);
    }
  }
});

test("no btn_* label exceeds 32 chars in any locale", () => {
  for (const key of BTN_KEYS) {
    for (const lang of LANGS) {
      const s = t(lang, key);
      assert.ok(s.length <= 32, `${key}/${lang} is ${s.length} chars: "${s}"`);
    }
  }
});

test("startInGroup stays short — at most 4 lines", () => {
  for (const lang of LANGS) {
    const lines = t(lang, "startInGroup").split("\n");
    assert.ok(lines.length <= 4, `startInGroup/${lang} has ${lines.length} lines`);
  }
});

test("es demonstrative agreement fix: start no longer says \"Eso es toda la app.\"", () => {
  assert.ok(!t("es", "start").includes("Eso es toda la app."));
  assert.ok(t("es", "start").includes("Y esa es toda la app."));
});
