// server/src/controllers/conversationController.js
// REST handlers for conversation CRUD — mounted at /api/conversations.

import * as svc from "../services/conversationService.js";

// GET /api/conversations
export async function listConversations(req, res, next) {
  try {
    const userId = req.user?._id ?? null;          // null until auth added
    const convs  = await svc.getAllConversations(userId);
    res.json({ conversations: convs });
  } catch (err) { next(err); }
}

// POST /api/conversations
export async function createConversation(req, res, next) {
  try {
    const { title, model } = req.body;
    const conv = await svc.createConversation({
      title,
      model,
      userId: req.user?._id ?? null,
    });
    res.status(201).json({ conversation: conv });
  } catch (err) { next(err); }
}

// GET /api/conversations/:id
export async function getConversation(req, res, next) {
  try {
    const conv = await svc.getConversationById(req.params.id);
    res.json({ conversation: conv });
  } catch (err) {
    if (err.message === "Conversation not found") return res.status(404).json({ error: err.message });
    next(err);
  }
}

// GET /api/conversations/:id/messages
export async function getMessages(req, res, next) {
  try {
    const messages = await svc.getMessages(req.params.id);
    res.json({ messages });
  } catch (err) {
    if (err.message === "Conversation not found") return res.status(404).json({ error: err.message });
    next(err);
  }
}

// PATCH /api/conversations/:id
export async function updateConversation(req, res, next) {
  try {
    const conv = await svc.updateConversation(req.params.id, req.body);
    res.json({ conversation: conv });
  } catch (err) {
    if (err.message === "Conversation not found") return res.status(404).json({ error: err.message });
    next(err);
  }
}

// DELETE /api/conversations/:id
export async function deleteConversation(req, res, next) {
  try {
    await svc.deleteConversation(req.params.id);
    res.status(204).end();
  } catch (err) {
    if (err.message === "Conversation not found") return res.status(404).json({ error: err.message });
    next(err);
  }
}