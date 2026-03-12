// server/src/middleware/validateRequest.js
// Lightweight request validators (no heavy schema lib needed).

import mongoose from "mongoose";

// ── Validate chat stream body ─────────────────────────────────────────────────
export function validateChatBody(req, res, next) {
  const { messages, model } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }

  if (messages.length > 100) {
    return res.status(400).json({ error: "messages array exceeds maximum length of 100" });
  }

  for (const [i, msg] of messages.entries()) {
    if (!["user", "assistant", "system"].includes(msg?.role)) {
      return res.status(400).json({ error: `messages[${i}].role must be user | assistant | system` });
    }
    if (typeof msg.content !== "string" || msg.content === "") {
      return res.status(400).json({ error: `messages[${i}].content must be a non-empty string` });
    }
    if (msg.content.length > 32_000) {
      return res.status(400).json({ error: `messages[${i}].content exceeds 32,000 character limit` });
    }
  }

  // model is optional — validated in the service layer
  if (model !== undefined && typeof model !== "string") {
    return res.status(400).json({ error: "model must be a string" });
  }

  next();
}

// ── Validate MongoDB ObjectId param ──────────────────────────────────────────
export function validateMongoId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  next();
}