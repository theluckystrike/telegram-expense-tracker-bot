import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGuestReply } from "../src/logic.ts";

test("a parseable expense becomes a categorized preview, not the pitch", () => {
  const r = buildGuestReply("12.50 coffee", "en", 20);
  assert.match(r.title, /12\.50/);
  assert.match(r.description ?? "", /coffee/);
  assert.doesNotMatch(r.title, /track spending in seconds/);
});

test("garbage or an empty query falls back to the localized start pitch", () => {
  for (const q of ["", "not an expense", "/help"]) {
    const r = buildGuestReply(q, "en", 20);
    assert.equal(r.title, "💰 BudgetBot — track spending in seconds");
    assert.equal(r.description, "Try: @BudgetBot 12.50 coffee");
  }
});

test("both replies are plain text, Markdown stripped", () => {
  for (const q of ["", "12.50 coffee"]) {
    const r = buildGuestReply(q, "en", 20);
    assert.equal(r.text.includes("*"), false);
    assert.equal(r.text.includes("`"), false);
  }
});
