// server/src/models/Conversation.js
// Mongoose schema for a chat conversation (session + messages).

import mongoose from "mongoose";

// ── Message sub-document ─────────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema(
  {
    role: {
      type:     String,
      enum:     ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type:     String,
      required: true,
      maxlength: 32_000,
    },
    // token usage (populated after assistant reply)
    tokens: {
      prompt:     { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
    },
  },
  { _id: true, timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// ── Conversation document ────────────────────────────────────────────────────
const ConversationSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      default:   "New Chat",
      maxlength: 120,
      trim:      true,
    },

    model: {
      type:    String,
      default: "meta-llama/llama-3.1-8b-instruct:free",
    },

    messages: {
      type:    [MessageSchema],
      default: [],
    },

    // quick stats (kept in sync via pre-save hook)
    messageCount: { type: Number, default: 0 },
    totalTokens:  { type: Number, default: 0 },

    // future: tie to a user
    userId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
    },

    // soft-delete flag
    archived: { type: Boolean, default: false },
  },
  {
    timestamps: true,         // createdAt + updatedAt
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
ConversationSchema.index({ userId: 1, updatedAt: -1 });
ConversationSchema.index({ archived: 1 });

// ── Pre-save: keep messageCount / totalTokens in sync ────────────────────────
ConversationSchema.pre("save", function (next) {
  this.messageCount = this.messages.length;
  this.totalTokens  = this.messages.reduce(
    (sum, m) => sum + (m.tokens?.prompt || 0) + (m.tokens?.completion || 0),
    0
  );
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

/** Append a message and save */
ConversationSchema.methods.addMessage = async function (role, content, tokens = {}) {
  this.messages.push({ role, content, tokens });
  return this.save();
};

/** Auto-generate a title from the first user message */
ConversationSchema.methods.autoTitle = function () {
  const first = this.messages.find((m) => m.role === "user");
  if (!first) return;
  this.title = first.content.slice(0, 60) + (first.content.length > 60 ? "…" : "");
};

// ── Static helpers ────────────────────────────────────────────────────────────

/** Get recent conversations (no messages, just metadata) */
ConversationSchema.statics.getRecent = function (userId = null, limit = 50) {
  const query = userId ? { userId, archived: false } : { archived: false };
  return this.find(query)
    .select("title model messageCount totalTokens createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
};

export default mongoose.model("Conversation", ConversationSchema);