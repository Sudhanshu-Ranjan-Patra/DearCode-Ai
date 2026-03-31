// server/src/services/conversationService.js
// Business logic layer for conversation CRUD — sits between controllers and Mongoose.

import Conversation from "../models/Conversation.js";
import { generateTitle } from "./aiService.js";

export function buildOwnerQuery({ id, userId = null, deviceId = null } = {}) {
  const query = {};
  if (id) query._id = id;

  if (userId) {
    query.userId = userId;
  } else {
    query.userId = null;
    query.deviceId = deviceId;
  }

  return query;
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createConversation({ title, model, userId, deviceId, character } = {}) {
  return Conversation.create({
    title:  title || "New Chat",
    model:  model || "meta-llama/llama-3.1-8b-instruct:free",
    userId: userId || null,
    deviceId: deviceId || null,
    character: character || "girlfriend",
  });
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAllConversations(deviceId, character, userId = null) {
  return Conversation.getRecent(deviceId, character, userId);
}

export async function getConversationById(id, owner = {}) {
  const conv = await Conversation.findOne(buildOwnerQuery({ id, ...owner })).lean();
  if (!conv) throw new Error("Conversation not found");
  return conv;
}

export async function getMessages(conversationId, owner = {}) {
  const conv = await Conversation.findOne(buildOwnerQuery({ id: conversationId, ...owner }))
    .select("messages")
    .lean();
  if (!conv) throw new Error("Conversation not found");
  return conv.messages;
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateConversation(id, updates, owner = {}) {
  const allowed = ["title", "model", "archived"];
  const safe    = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  const conv = await Conversation.findOneAndUpdate(buildOwnerQuery({ id, ...owner }), safe, {
    new:              true,
    runValidators:    true,
  }).select("title model updatedAt");
  if (!conv) throw new Error("Conversation not found");
  return conv;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteConversation(id, owner = {}) {
  const conv = await Conversation.findOneAndDelete(buildOwnerQuery({ id, ...owner }));
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
