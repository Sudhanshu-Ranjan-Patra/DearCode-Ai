import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPersonaSettingsPrompt,
  getDefaultPersonaSettings,
  sanitizePersonaSettings,
} from "../src/utils/personaSettings.js";

test("persona settings sanitize character-specific values", () => {
  const result = sanitizePersonaSettings("girlfriend", {
    agentName: "Baby",
    age: 16,
    presetKey: "sanskari",
    temperament: "naughty",
    interactionMode: "expressive",
    selectedTraits: ["affectionate", "flirty", "affectionate", "invalid"],
    responseStyle: "expressive",
    emotionalIntensity: 9,
    customBackstory: "Polite, elegant, and softly teasing.",
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.agentName, "Baby");
  assert.equal(result.value.age, 18);
  assert.equal(result.value.presetKey, "sanskari");
  assert.equal(result.value.temperament, "naughty");
  assert.deepEqual(result.value.selectedTraits, ["affectionate", "flirty"]);
  assert.equal(result.value.emotionalIntensity, 5);
});

test("persona settings reject unknown character ids", () => {
  const result = sanitizePersonaSettings("stranger", { agentName: "Ghost" });
  assert.equal(result.error, "Invalid character type");
});

test("persona prompt includes configured identity and adult guardrails", () => {
  const settings = {
    ...getDefaultPersonaSettings("bestfriend"),
    agentName: "Rahul",
    age: 24,
    selectedTraits: ["funny", "loyal", "honest"],
    customInstructions: "Use my nickname naturally.",
  };

  const prompt = buildPersonaSettingsPrompt(settings, "bestfriend");

  assert.ok(prompt.includes("Your preferred name is Rahul."));
  assert.ok(prompt.includes("Never imply you are under 18."));
  assert.ok(prompt.includes("funny, loyal, honest"));
  assert.ok(prompt.includes("Use my nickname naturally."));
});
