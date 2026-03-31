import mongoose from "mongoose";
import { CHARACTER_IDS } from "../utils/characterConfig.js";

const PersonaProfileSchema = new mongoose.Schema({
  ownerKey: { type: String, required: true, index: true },
  character: { type: String, enum: CHARACTER_IDS, required: true },
  agentName: { type: String, required: true, trim: true, maxlength: 40 },
  age: { type: Number, min: 18, max: 60, default: 22 },
  presetKey: { type: String, required: true },
  temperament: { type: String, required: true },
  interactionMode: { type: String, required: true },
  selectedTraits: [{ type: String }],
  responseStyle: { type: String, enum: ["minimal", "balanced", "expressive"], default: "balanced" },
  emotionalIntensity: { type: Number, min: 1, max: 5, default: 3 },
  customBackstory: { type: String, default: "", maxlength: 280 },
  customInstructions: { type: String, default: "", maxlength: 500 },
}, {
  timestamps: true,
  versionKey: false,
});

PersonaProfileSchema.index({ ownerKey: 1, character: 1 }, { unique: true });

export default mongoose.model("PersonaProfile", PersonaProfileSchema);
