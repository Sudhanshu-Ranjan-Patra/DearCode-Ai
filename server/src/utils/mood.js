// server/src/utils/mood.js

/**
 * Maps the detected user emotion to the appropriate bot mood.
 * @param {string} userMood - The detected user emotion
 * @returns {string} The bot's mood
 */
export function getBotMood(userMood) {
  const moodMap = {
    sad: "caring",
    happy: "playful",
    angry: "calm",
    flirty: "shy_playful",
    stressed: "supportive",
    neutral: "friendly"
  };

  return moodMap[userMood] || "friendly";
}

/**
 * Appends the dynamic mood state to the base system prompt.
 * @param {string} basePrompt - The main system instructions
 * @param {string} userMood - Current user emotion
 * @param {string} botMood - Current bot mood
 * @returns {string} The final system prompt
 */
export function buildPrompt(basePrompt, userMood, botMood) {
  return `${basePrompt}

---
DYNAMIC MOOD STATE:
Current user emotion: ${userMood}
Your current mood: ${botMood}
`;
}
