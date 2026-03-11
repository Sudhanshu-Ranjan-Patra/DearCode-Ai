import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
  userId: { type: String, default: "guest-user" },
  messages: [
    {
      role: { type: String, enum: ['user', 'model'], required: true },
      parts: [{ text: { type: String, required: true } }],
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

export default mongoose.model('Chat', ChatSchema);