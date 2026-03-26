import mongoose from "mongoose";

const MemoryItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["emotion", "event", "bond", "conflict"],
    required: true
  },
  emotion: { type: String, default: "neutral" },
  summary: { type: String, required: true },
  impact: {
    type: String,
    enum: ["low", "medium", "high", "relationship_upgrade"],
    required: true
  },
  score: { type: Number, default: 0 },
  repetitionCount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const EmotionalMemorySchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  character: { type: String, default: "girlfriend" },
  userName: { type: String, default: "" },
  botIdentity: {
    name: { type: String, default: "" },
    personality: { type: String, default: "" }
  },
  relationshipStage: {
    type: String,
    default: "early",
    enum: ["early", "mid", "close", "romantic"]
  },
  relationshipScore: { type: Number, default: 0, min: 0, max: 100 },
  botState: {
    currentMood: {
      type: String,
      default: "neutral",
      enum: ["neutral", "happy", "caring", "playful", "annoyed", "distant", "shy"]
    },
    moodIntensity: { type: Number, default: 0.5 },
    lastInteractionType: { type: String, default: "normal" },
    lastUpdated: { type: Date, default: Date.now }
  },
  attachmentLevel: { type: Number, default: 20, min: 0, max: 100 },
  memories: [MemoryItemSchema],
  interactionCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  versionKey: false
});

EmotionalMemorySchema.index({ deviceId: 1, character: 1 }, { unique: true });

export default mongoose.model("EmotionalMemory", EmotionalMemorySchema);
