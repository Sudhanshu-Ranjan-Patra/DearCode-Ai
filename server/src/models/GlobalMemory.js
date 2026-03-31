import mongoose from "mongoose";

const GlobalMemorySchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  userName: { type: String, default: "" },
  preferences: [{ 
    value: String,
    lastUsed: Date 
  }],
  personalityTraits: [{ type: String }],
  importantMoments: [{ type: String }],
  relationshipStage: {
    type: String,
    enum: ["early", "mid", "close", "romantic"],
    default: "early",
  },
  interactionCount: { type: Number, default: 0 },
  basicFacts: [{ 
    text: String,
    lastUsed: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model("GlobalMemory", GlobalMemorySchema);
