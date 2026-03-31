import test from "node:test";
import assert from "node:assert/strict";

import { getMaxTokens, getStage } from "../src/utils/behavior.js";
import {
  getMotivatorIntentGuidance,
  getMotivatorMaxTokens,
} from "../src/controllers/chatController.js";
import {
  buildRealityCheckPrompt,
  detectRealityCheck,
} from "../src/utils/realityCheck.js";
import { detectLanguageStyle } from "../src/utils/emotion.js";

test("relationship stages follow the unified progression", () => {
  assert.equal(getStage(1), "early");
  assert.equal(getStage(25), "mid");
  assert.equal(getStage(80), "close");
  assert.equal(getStage(140), "romantic");
});

test("max token budgets align to each stage", () => {
  assert.equal(getMaxTokens("early"), 40);
  assert.equal(getMaxTokens("mid"), 80);
  assert.equal(getMaxTokens("close"), 120);
  assert.equal(getMaxTokens("romantic"), 140);
});

test("motivator gets larger token budgets for roadmap-style requests", () => {
  assert.equal(getMotivatorMaxTokens("give me a roadmap to learn MERN in 30 days"), 420);
  assert.equal(getMotivatorMaxTokens("motivate me for today"), 280);
});

test("motivator hidden templates cover common guidance situations", () => {
  assert.match(getMotivatorIntentGuidance("give me a roadmap for web development"), /ROADMAP/);
  assert.match(getMotivatorIntentGuidance("i am confused about my career"), /CAREER GUIDANCE/);
  assert.match(getMotivatorIntentGuidance("which tech stack should i choose"), /TECH STACK CHOICE/);
  assert.match(getMotivatorIntentGuidance("i have a study doubt in javascript"), /STUDY DOUBT/);
  assert.match(getMotivatorIntentGuidance("i feel burned out and stuck in procrastination"), /LOW PHASE \/ BURNOUT \/ PROCRASTINATION/);
  assert.match(getMotivatorIntentGuidance("motivate me"), /GENERAL MENTOR MODE/);
});

test("reality check detector catches early romance and fantasy claims", () => {
  assert.deepEqual(
    detectRealityCheck("I love you", "early", "girlfriend"),
    ["EARLY_LOVE_CONFESSION"]
  );
  assert.deepEqual(
    detectRealityCheck("I love you bhai", "close", "bestfriend"),
    ["INAPPROPRIATE_ROMANTIC_PUSH"]
  );
  assert.deepEqual(
    detectRealityCheck("I love you coach", "close", "motivator"),
    ["INAPPROPRIATE_ROMANTIC_PUSH"]
  );
  assert.deepEqual(
    detectRealityCheck("hamari shaadi ho gayi hai", "mid", "girlfriend"),
    ["FAKE_MARRIAGE_CLAIM"]
  );
  assert.deepEqual(
    detectRealityCheck("hamara baccha kaisa hai", "romantic", "girlfriend"),
    ["FAKE_CHILD_CLAIM"]
  );
  assert.deepEqual(
    detectRealityCheck("matlab tere pitaji ke naam kya he", "close", "bestfriend"),
    ["PRIVATE_BIO_PROBE"]
  );
});

test("reality check prompt reinforces grounded deflection", () => {
  const prompt = buildRealityCheckPrompt(
    ["EARLY_LOVE_CONFESSION", "FAKE_MARRIAGE_CLAIM", "FORCED_RENAME"],
    "early",
    "girlfriend"
  );

  assert.match(prompt, /Do not accept it directly/);
  assert.match(prompt, /Deny it softly and playfully/);
  assert.match(prompt, /React gradually and naturally/);
  assert.match(prompt, /Do not behave like a fully committed girlfriend/);
});

test("reality check prompt adapts for bestfriend and motivator personas", () => {
  const bestfriendPrompt = buildRealityCheckPrompt(
    ["INAPPROPRIATE_ROMANTIC_PUSH", "FAKE_MARRIAGE_CLAIM"],
    "close",
    "bestfriend"
  );
  const motivatorPrompt = buildRealityCheckPrompt(
    ["INAPPROPRIATE_ROMANTIC_PUSH", "FAKE_CHILD_CLAIM"],
    "close",
    "motivator"
  );

  assert.match(bestfriendPrompt, /non-romantic friend vibe/);
  assert.match(bestfriendPrompt, /friend vibe clear/);
  assert.match(motivatorPrompt, /stay focused/);
  assert.match(motivatorPrompt, /keep the conversation grounded/);
});

test("reality check prompt handles private bio probes without AI disclaimers", () => {
  const prompt = buildRealityCheckPrompt(
    ["PRIVATE_BIO_PROBE"],
    "close",
    "bestfriend"
  );

  assert.match(prompt, /Do not mention being AI/);
  assert.match(prompt, /Deflect casually like a real friend/);
});

test("language style detector identifies roman hindi and odia", () => {
  assert.equal(detectLanguageStyle("tum kya kar rahe ho bhai"), "hindi_roman");
  assert.equal(detectLanguageStyle("mu tumaku bhalapae, tume kemiti acha"), "odia_roman");
  assert.equal(detectLanguageStyle("what are you doing today"), "english");
});
