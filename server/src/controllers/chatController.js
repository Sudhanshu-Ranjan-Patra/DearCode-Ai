// server/src/controllers/chatController.js
// Handles POST /api/chat/stream — validates input, opens SSE stream,
// persists messages to MongoDB after streaming completes.

import { streamCompletion }  from "../services/aiService.js";
import { appendMessages, createConversation } from "../services/conversationService.js";
import { isValidModel, DEFAULT_MODEL } from "../config/openrouter.js";

const SYSTEM_PROMPT = `You are CodeAI, an expert full-stack developer assistant.
You specialise in Node.js, React, MongoDB, Express, and LLM integrations.
Always respond with clean, production-quality code examples when relevant.
Be concise but thorough. Format code in fenced code blocks with the language tag.`;

/**
 * POST /api/chat/stream
 * Body: { messages, model, conversationId? }
 *
 * Opens an SSE connection, streams tokens to the client,
 * then persists the exchange to MongoDB.
 */
export async function streamChat(req, res, next) {
  try {
    const { messages, model, conversationId } = req.body;

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) {
      return res.status(400).json({ error: "At least one user message is required" });
    }

    const safeModel = isValidModel(model) ? model : DEFAULT_MODEL;

    // ── Resolve conversation ───────────────────────────────────────────────────
    let convId = conversationId;
    if (!convId) {
      // create a new conversation on-the-fly
      const conv = await createConversation({ model: safeModel });
      convId = conv._id.toString();
      // send the new conversationId to the client before streaming starts
      res.setHeader("X-Conversation-Id", convId);
    }

    // ── Stream tokens to client ───────────────────────────────────────────────
    const { content: assistantReply, usage } = await streamCompletion(
      {
        messages:     messages.map(({ role, content }) => ({ role, content })),
        model:        safeModel,
        systemPrompt: SYSTEM_PROMPT,
      },
      res
    );

    // ── Persist to MongoDB (after stream ends) ────────────────────────────────
    if (assistantReply) {
      await appendMessages(convId, {
        userContent:      lastUserMsg.content,
        assistantContent: assistantReply,
        usage,
      }).catch((err) =>
        console.error("[chatController] persist error:", err.message)
      );
    }
  } catch (err) {
    // If headers already sent (SSE started), we can't send a JSON error
    if (res.headersSent) {
      console.error("[chatController] stream error after headers sent:", err.message);
      return;
    }
    next(err);
  }
}

/**
 * GET /api/chat/models
 * Returns the list of available models.
 */
export async function getModels(req, res) {
  const { MODELS } = await import("../config/openrouter.js");
  res.json({ models: MODELS });
}