// server/src/services/aiService.js
// Core AI logic: sends messages to OpenRouter, handles SSE streaming,
// parses delta tokens, and returns usage metadata.

import { OPENROUTER_CONFIG, DEFAULT_MODEL, DEFAULT_MAX_TOKENS, isValidModel } from "../config/openrouter.js";

/**
 * streamCompletion
 * Opens a streaming request to OpenRouter and pipes SSE tokens
 * into the Express response object.
 *
 * @param {object}   opts
 * @param {Array}    opts.messages       - [{role, content}, …]
 * @param {string}   opts.model          - OpenRouter model ID
 * @param {number}   opts.maxTokens
 * @param {string}   opts.systemPrompt   - optional system message
 * @param {object}   res                 - Express response (SSE)
 * @returns {Promise<{ content: string, usage: object }>}
 */
export async function streamCompletion({ messages, model, maxTokens, systemPrompt }, res) {
  const safeModel     = isValidModel(model) ? model : DEFAULT_MODEL;
  const safeMaxTokens = maxTokens || DEFAULT_MAX_TOKENS;

  // Prepend system prompt if provided
  const fullMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  // ── Open SSE headers ────────────────────────────────────────────────────────
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");   // disable Nginx buffering
  res.flushHeaders();

  // ── Call OpenRouter ─────────────────────────────────────────────────────────
  const orRes = await fetch(OPENROUTER_CONFIG.endpoint, {
    method:  "POST",
    headers: OPENROUTER_CONFIG.getHeaders(),
    body: JSON.stringify({
      model:      safeModel,
      messages:   fullMessages,
      max_tokens: safeMaxTokens,
      stream:     true,
      temperature: 0.7,
    }),
  });

  if (!orRes.ok) {
    const errText = await orRes.text();
    res.write(`data: ${JSON.stringify({ error: `OpenRouter ${orRes.status}: ${errText}` })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
    throw new Error(`OpenRouter error ${orRes.status}: ${errText}`);
  }

  if (!orRes.body) {
    res.write(`data: ${JSON.stringify({ error: "OpenRouter returned an empty stream" })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
    throw new Error("OpenRouter returned an empty stream");
  }

  // ── Parse upstream SSE and forward tokens immediately ─────────────────────
  const reader = orRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let usage = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const dataLines = event
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => line.slice(6).trim());

        for (const data of dataLines) {
          if (!data) continue;
          if (data === "[DONE]") {
            res.write("data: [DONE]\n\n");
            res.end();
            return { content: fullContent, usage };
          }

          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }

          if (parsed.error) {
            const message =
              typeof parsed.error === "string"
                ? parsed.error
                : JSON.stringify(parsed.error);
            res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
            throw new Error(message);
          }

          const token =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.choices?.[0]?.message?.content ??
            parsed?.token ??
            "";

          if (token) {
            fullContent += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }

          if (parsed?.usage) {
            usage = parsed.usage;
          }
        }
      }
    }

    if (buffer.trim()) {
      const trailingData = buffer
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6).trim());

      for (const data of trailingData) {
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const token =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.choices?.[0]?.message?.content ??
            parsed?.token ??
            "";
          if (token) {
            fullContent += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
          if (parsed?.usage) usage = parsed.usage;
        } catch {
          // ignore trailing malformed payloads
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
    return { content: fullContent, usage };
  } catch (err) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message || "Streaming failed" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
    throw err;
  }
}

/**
 * singleCompletion (non-streaming)
 * Used for title generation, summarisation, etc.
 *
 * @param {Array}  messages
 * @param {string} model
 * @returns {Promise<string>}
 */
export async function singleCompletion(messages, model = DEFAULT_MODEL) {
  const res = await fetch(OPENROUTER_CONFIG.endpoint, {
    method:  "POST",
    headers: OPENROUTER_CONFIG.getHeaders(),
    body: JSON.stringify({
      model,
      messages,
      max_tokens:  256,
      temperature: 0.5,
      stream:      false,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * generateTitle
 * Ask the model to create a short title from the first user message.
 */
export async function generateTitle(firstUserMessage) {
  return singleCompletion([
    {
      role:    "system",
      content: "Generate a concise chat title (max 6 words) for the following user message. Reply with the title only, no quotes.",
    },
    { role: "user", content: firstUserMessage },
  ]);
}
