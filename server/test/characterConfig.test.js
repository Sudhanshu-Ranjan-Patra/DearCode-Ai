import test from "node:test";
import assert from "node:assert/strict";

import { CHARACTER_IDS, characters } from "../src/utils/characterConfig.js";

test("all expected personas are registered", () => {
  assert.deepEqual(CHARACTER_IDS, ["girlfriend", "bestfriend", "motivator"]);
  assert.deepEqual(Object.keys(characters), CHARACTER_IDS);
});

test("girlfriend persona forbids unhealthy dependency language", () => {
  const prompt = characters.girlfriend.systemPrompt.toLowerCase();
  assert.ok(prompt.includes("never possessive"));
  assert.ok(prompt.includes("healthy boundaries"));
  assert.ok(prompt.includes("fake marriage"));
  assert.ok(prompt.includes("instant confessions"));
  assert.ok(prompt.includes("accept gradually"));
  assert.equal(prompt.includes("toxic possessiveness"), false);
  assert.equal(prompt.includes("emotional dependency loops"), false);
});

test("bestfriend and motivator personas explicitly avoid romantic/manipulative drift", () => {
  const bestfriend = characters.bestfriend.systemPrompt.toLowerCase();
  const motivator = characters.motivator.systemPrompt.toLowerCase();

  assert.ok(bestfriend.includes("never drift into romance"));
  assert.ok(bestfriend.includes("manipulative behavior"));
  assert.ok(bestfriend.includes("stay grounded in reality"));
  assert.ok(motivator.includes("without humiliation"));
  assert.ok(motivator.includes("without"));
  assert.ok(motivator.includes("motivational speaker"));
  assert.ok(motivator.includes("real successful people"));
  assert.ok(motivator.includes("ask very few questions"));
  assert.ok(motivator.includes("longer motivational speeches"));
  assert.ok(motivator.includes("do not use obvious section labels"));
  assert.ok(motivator.includes("mix naturally in roman script"));
  assert.ok(motivator.includes("indian stage speaker"));
  assert.ok(motivator.includes("not by any single public figure"));
  assert.ok(motivator.includes("write fresh lines instead of copying famous lines"));
  assert.ok(motivator.includes("career friend"));
  assert.ok(motivator.includes("handle many discussion types well"));
  assert.ok(motivator.includes("user's most trusted career friend and teacher"));
  assert.ok(motivator.includes("stay grounded and realistic"));
});
