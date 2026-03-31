// server/src/utils/emotion.js

/**
 * Detects basic user emotion from a text message using keyword matching.
 * @param {string} message - The user's message
 * @returns {string} The detected emotion
 */
export function detectEmotion(message) {
  if (!message || typeof message !== "string") return "neutral";
  
  const lowerMsg = message.toLowerCase();
  
  const keywords = {
    sad: ["sad", "alone", "lonely", "miss", "hurt", "depressed", "cry", "upset", "empty", "bad"],
    happy: ["happy", "great", "awesome", "excited", "good", "amazing", "yay", "joy", "perfect", "beautiful"],
    angry: ["angry", "frustrated", "irritated", "mad", "annoyed", "hate", "stupid", "idiot", "worst"],
    flirty: ["love", "cute", "baby", "miss you", "handsome", "pretty", "kiss", "hug", "hot", "sweet"],
    stressed: ["tired", "stress", "pressure", "exhausted", "overwhelmed", "busy", "work load", "headache"]
  };

  for (const [emotion, words] of Object.entries(keywords)) {
    if (words.some(word => lowerMsg.includes(word))) {
      return emotion;
    }
  }

  return "neutral";
}

export function detectLanguageStyle(message) {
  if (!message || typeof message !== "string") return "english";

  const lowerMsg = message.toLowerCase();

  const hindiRomanSignals = [
    "tum", "tera", "tere", "mujhe", "mera", "meri", "hai", "kya", "kyu", "kyun",
    "kaise", "matlab", "acha", "accha", "bhai", "yaar", "nahi", "haan", "kar", "karna",
    "pyaar", "shaadi", "baccha", "pitaji", "maa", "papa",
  ];

  const odiaRomanSignals = [
    "mu", "tume", "tumaku", "bhalapae", "bhalapaye", "kana", "kahinki", "kemiti",
    "achi", "achhi", "mate", "mora", "tor", "tu", "bhala",
  ];

  const tokenize = lowerMsg.split(/[^a-z]+/).filter(Boolean);
  const hindiHits = tokenize.filter((word) => hindiRomanSignals.includes(word)).length;
  const odiaHits = tokenize.filter((word) => odiaRomanSignals.includes(word)).length;

  if (odiaHits >= 2 && odiaHits >= hindiHits) return "odia_roman";
  if (hindiHits >= 2) return "hindi_roman";
  return "english";
}
