/**
 * Realistic Chat Behavior System
 */

export function getStage(messageCount) {
  if (messageCount <= 20) return "early";
  if (messageCount <= 70) return "mid";
  return "late";
}

export function getMaxTokens(stage) {
  if (stage === "early") return 40;
  if (stage === "mid") return 80;
  return 120; // late
}

export function calculateTypingDelay(text) {
  // Constant delay as requested
  return 1500;
}

export async function simulateTyping(text) {
  const delay = calculateTypingDelay(text);
  return new Promise(resolve => setTimeout(resolve, delay));
}
