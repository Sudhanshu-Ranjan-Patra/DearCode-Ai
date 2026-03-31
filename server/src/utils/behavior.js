/**
 * Realistic Chat Behavior System
 */

export function getStage(messageCount) {
  if (messageCount <= 20) return "early";
  if (messageCount <= 50) return "mid";
  if (messageCount <= 100) return "close";
  return "romantic";
}

export function getMaxTokens(stage) {
  if (stage === "early") return 40;
  if (stage === "mid") return 80;
  if (stage === "close") return 120;
  return 140; // romantic
}
