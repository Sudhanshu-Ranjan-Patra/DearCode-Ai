// server/src/services/conversationService.js
// Business logic layer for conversation CRUD — sits between controllers and Mongoose.

import Conversation from "../models/Conversation.js";
import { generateTitle } from "./aiService.js";

// ── Create ────────────────────────────────────────────────────────────────────

export async function createConversation({ title, model, userId } = {}) {
  return Conversation.create({
    title:  title || "New Chat",
    model:  model || "meta-llama/llama-3.1-8b-instruct:free",
    userId: userId || null,
  });
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAllConversations(userId = null) {
  return Conversation.getRecent(userId);
}

export async function getConversationById(id) {
  const conv = await Conversation.findById(id).lean();
  if (!conv) throw new Error("Conversation not found");
  return conv;
}

export async function getMessages(conversationId) {
  const conv = await Conversation.findById(conversationId)
    .select("messages")
    .lean();
  if (!conv) throw new Error("Conversation not found");
  return conv.messages;
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateConversation(id, updates) {
  const allowed = ["title", "model", "archived"];
  const safe    = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  const conv = await Conversation.findByIdAndUpdate(id, safe, {
    new:              true,
    runValidators:    true,
  }).select("title model updatedAt");
  if (!conv) throw new Error("Conversation not found");
  return conv;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteConversation(id) {
  const conv = await Conversation.findByIdAndDelete(id);
  if (!conv) throw new Error("Conversation not found");
  return { deleted: true };
}

// ── Messages ──────────────────────────────────────────────────────────────────

/**
 * appendMessages — adds user + assistant messages atomically,
 * auto-generates a title on the first exchange.
 */
export async function appendMessages(conversationId, { userContent, assistantContent, usage = {} }) {
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new Error("Conversation not found");

  // Auto-generate title from first user message
  if (conv.messages.length === 0) {
    try {
      conv.title = await generateTitle(userContent);
    } catch {
      conv.title = userContent.slice(0, 60) + (userContent.length > 60 ? "…" : "");
    }
  }

  conv.messages.push({ role: "user",      content: userContent });
  conv.messages.push({
    role:    "assistant",
    content: assistantContent,
    tokens:  {
      prompt:     usage?.prompt_tokens     || 0,
      completion: usage?.completion_tokens || 0,
    },
  });

  return conv.save();
}

// ── Soft archive ──────────────────────────────────────────────────────────────

export async function archiveConversation(id) {
  return updateConversation(id, { archived: true });
}