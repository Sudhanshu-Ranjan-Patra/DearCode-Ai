import { singleCompletion } from "../services/aiService.js";
import { DEFAULT_MODEL } from "../config/openrouter.js";

/**
 * Extracts neutral facts and preferences from the user's message.
 * Strictly ignores emotions, short-term feelings, and relationship states.
 * 
 * @param {string} userMessage - The user's most recent message
 * @param {object} existingMemory - { userName: string, preferences: string[], basicFacts: string[] }
 * @returns {Promise<{ hasNewData: boolean, extracted: { userName?: string, preferences?: string[], basicFacts?: string[] } }>}
 */
export async function extractGlobalFacts(userMessage, existingMemory = {}) {
  if (!userMessage || userMessage.trim().length < 4) return { hasNewData: false };

  const existingFactsStr = [
    existingMemory.userName ? `Name: ${existingMemory.userName}` : "",
    ...(existingMemory.preferences || []).map(p => `Preference/Interest: ${typeof p === 'string' ? p : p.value}`),
    ...(existingMemory.basicFacts || []).map(f => `Fact: ${typeof f === 'string' ? f : f.text}`)
  ].filter(Boolean).join("\n") || "None";

  const prompt = `You are a strict, neutral fact extraction engine.
Analyze the user's message to find permanent, reusable, long-term useful facts about them.

Rules:
1. ONLY extract facts that are reusable AND neutral (e.g., job, location, age, pets, fixed routines).
2. ONLY extract interests/preferences (e.g., likes coding, loves coffee, plays guitar).
3. If they state their name explicitly, extract it.
4. DO NOT extract temporary emotions (e.g., "I am sad", "I feel angry").
5. DO NOT extract temporary states or random sentences (e.g., "I am going to the store now", "It's raining").
6. DO NOT extract relationship status with the AI.
7. Check the "Existing Facts" below and DO NOT extract anything that is logically a duplicate or highly similar.

Existing Facts:
${existingFactsStr}

Message to analyze: "${userMessage}"

Respond ONLY with a valid JSON object matching this structure:
{
  "hasNewData": boolean,
  "extracted": {
    "userName": "string or null",
    "preferences": ["string array of new interests/preferences only, or empty"],
    "basicFacts": ["string array of new neutral facts only, or empty"]
  }
}
If there are no new facts/preferences, set hasNewData to false and leave arrays empty. Do NOT return markdown formatting around JSON.`;

  try {
    const responseText = await singleCompletion([
      { role: "system", content: prompt }
    ], DEFAULT_MODEL);

    const match = responseText.match(/\{[\s\S]*\}/);
    if (!match) return { hasNewData: false };
    
    const data = JSON.parse(match[0]);
    
    if (data && data.hasNewData && data.extracted) {
      // Clean up empty arrays/nulls just in case
      return {
        hasNewData: true,
        extracted: {
          userName: data.extracted.userName || undefined,
          preferences: Array.isArray(data.extracted.preferences) ? data.extracted.preferences : [],
          basicFacts: Array.isArray(data.extracted.basicFacts) ? data.extracted.basicFacts : []
        }
      };
    }
  } catch (error) {
    console.error("[globalMemoryExtractor] Parse error:", error.message);
  }
  
  return { hasNewData: false };
}
