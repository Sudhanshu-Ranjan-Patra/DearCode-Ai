import { singleCompletion } from "../services/aiService.js";
import { DEFAULT_MODEL } from "../config/openrouter.js";

// Weights
const IMPACT_WEIGHTS = {
  low: 1,
  medium: 3,
  high: 5,
  relationship_upgrade: 8
};

/**
 * Calculates current score for a memory based on impact, recency, and repetition.
 */
export function calculateScore(memory) {
  const impactScore = IMPACT_WEIGHTS[memory.impact] || 1;
  const repetitionScore = (memory.repetitionCount || 0) * 2;
  
  // Recency decay
  const hoursSince = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60);
  let recencyScore = 0;
  if (hoursSince < 24) {
    recencyScore = 2; // +2 for recent memories
  } else if (hoursSince < 72) {
    recencyScore = 1;
  } else if (hoursSince > 168) { // 1 week
    recencyScore = -1; // Decay older ones
  } else if (hoursSince > 336) { // 2 weeks
    recencyScore = -2;
  }
  
  return impactScore + recencyScore + repetitionScore;
}

/**
 * Extracts new emotional memory from user message if relevant.
 * Returns { shouldStore, type, emotion, summary, impact } or null.
 */
export async function extractEmotionalMemory(userMessage, currentMemories = []) {
  if (!userMessage || userMessage.trim().length < 4) return null;

  const prompt = `You are a human-like emotional memory extractor.
Analyze the following user message to check if it contains a significant emotional moment, personal detail, bonding, or conflict.
Be highly selective. ONLY store memories if they are genuinely meaningful (e.g., strong sadness, deep bonding, argument, significant happiness).

Current saved memories summaries (do not duplicate):
${currentMemories.map(m => m.summary).join("\n") || "None"}

Message to analyze: "${userMessage}"

Respond ONLY with a valid JSON object matching this structure:
{
  "shouldStore": boolean,
  "type": "emotion" | "event" | "bond" | "conflict",
  "emotion": "sad" | "happy" | "angry" | "lonely" | "neutral" | "affectionate",
  "summary": "1 line natural summary of the meaning",
  "impact": "low" | "medium" | "high" | "relationship_upgrade"
}
If shouldStore is false, you can leave other fields empty. Do NOT return markdown formatting around JSON.`;

  try {
    const responseText = await singleCompletion([
      { role: "system", content: prompt }
    ], DEFAULT_MODEL);

    // Try to parse JSON from response
    const match = responseText.match(/\{[\s\S]*\}/);
    if (!match) return null;
    
    const data = JSON.parse(match[0]);
    if (data && data.shouldStore) {
      // Validate impact
      const validImpact = ["low", "medium", "high", "relationship_upgrade"].includes(data.impact) 
        ? data.impact : "low";
        
      return {
        type: data.type || "emotion",
        emotion: data.emotion || "neutral",
        summary: data.summary,
        impact: validImpact
      };
    }
  } catch (error) {
    console.error("[memoryExtractor] Parse error:", error.message);
  }
  
  return null;
}

/**
 * Selects top memories, factoring in context (current emotion).
 */
export function selectTopMemories(memories, currentEmotion, limit = 5) {
  if (!memories || memories.length === 0) return [];

  // Update scores and filter out deeply decayed low-impact memories
  let scoredMemories = memories.map(m => ({
    ...m.toObject ? m.toObject() : m,
    score: calculateScore(m)
  })).filter(m => m.score >= 0); // Drop memories with negative score

  // Contextual relevance filter boost
  scoredMemories = scoredMemories.map(m => {
    let contextBoost = 0;
    if (currentEmotion && currentEmotion !== "neutral") {
      // Boost if emotions match (e.g., user is sad -> recall past sadness)
      if (m.emotion === currentEmotion) {
        contextBoost += 3;
      }
      // Avoid injecting contrasting happy memories if user is sad
      else if (currentEmotion === "sad" && m.emotion === "happy") {
        contextBoost -= 3;
      }
    }
    return { ...m, score: m.score + contextBoost };
  });

  // Sort by score (desc) and take top 5
  return scoredMemories.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Formats memories into a natural summary string for LLM injection.
 */
export function formatMemoryContext(memories) {
  if (!memories || memories.length === 0) return "";
  
  const summary = memories.map(m => `- ${m.summary}`).join("\n");
  
  return `You remember important things about the user.

${summary}

Use this memory naturally and subtly.
Do NOT explicitly list or repeat memories unless context strongly matches.`;
}
