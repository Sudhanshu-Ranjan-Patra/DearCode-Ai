import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_MODEL, OPENROUTER_CONFIG } from "../src/config/openrouter.js";

const runContractTests = process.env.RUN_OPENROUTER_CONTRACT_TESTS === "1";
const contractTest = runContractTests ? test : test.skip;

contractTest("OpenRouter streaming contract returns SSE data events", async () => {
  assert.ok(process.env.OPENROUTER_API_KEY, "OPENROUTER_API_KEY must be set");

  const response = await fetch(OPENROUTER_CONFIG.endpoint, {
    method: "POST",
    headers: OPENROUTER_CONFIG.getHeaders(),
    body: JSON.stringify({
      model: process.env.OPENROUTER_CONTRACT_MODEL || DEFAULT_MODEL,
      stream: true,
      max_tokens: 32,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: "Reply with exactly two short words.",
        },
      ],
    }),
  });

  assert.equal(response.ok, true, `OpenRouter ${response.status}: ${await response.text()}`);
  assert.ok(response.body, "Expected a response body for streaming");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDataEvent = false;

  while (!sawDataEvent) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((entry) => entry.startsWith("data: "));
      if (!line) continue;

      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;

      const parsed = JSON.parse(payload);
      const token = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? "";
      if (token || parsed?.choices || parsed?.usage) {
        sawDataEvent = true;
        break;
      }
    }
  }

  await reader.cancel();
  assert.equal(sawDataEvent, true);
});
