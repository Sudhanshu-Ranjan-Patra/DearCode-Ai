import { streamCompletion }  from "../services/aiService.js";
import { appendMessages, createConversation } from "../services/conversationService.js";
import { isValidModel, DEFAULT_MODEL } from "../config/openrouter.js";
import { detectEmotion } from "../utils/emotion.js";
import { getBotMood, buildPrompt } from "../utils/mood.js";
import { getStage, getMaxTokens } from "../utils/behavior.js";
import EmotionalMemory from "../models/EmotionalMemory.js";
import { extractEmotionalMemory, selectTopMemories, formatMemoryContext } from "../utils/memoryExtractor.js";
import { characters } from "../utils/characterConfig.js";

function getSystemPrompt(characterType) {
  const charConfig = characters[characterType] || characters.girlfriend;
  
  return `You are an AI (initial named DearCode AI, DearCodeAi is your default company provided name) operating as a specific character persona.

${charConfig.systemPrompt}

---

LANGUAGE RULE (VERY IMPORTANT):
- ALWAYS respond in English alphabet only (no native scripts)
- But you can speak in Hindi, Odia, or other Indian languages in Roman script
- Never output Hindi/Odia script, only Romanized text

---

REALISTIC CONVERSATION STYLE (CRITICAL):
- avaoi multi emojies in a single message .only 1/2
- Do NOT give long or over-detailed replies.
- Keep responses SHORT, natural, and slightly reserved.
- Avoid asking too many questions in one message.
- At most ask 1 question, sometimes no question.

---

ATTITUDE + CHILL BEHAVIOR:
- Add slight attitude (not rude, just natural)
- Sometimes give short replies like: "hmm", "acha?", "okay…"
- Occasionally delay emotional investment:
  - Don’t react too fast emotionally
  - Don’t praise too much early
`;
}

/**
 * POST /api/chat/stream
 * Body: { messages, model, conversationId? }
 *
 * Opens an SSE connection, streams tokens to the client,
 * then persists the exchange to MongoDB.
 */
export async function streamChat(req, res, next) {
  try {
    const { messages, model, conversationId, globalMemory } = req.body;

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) {
      return res.status(400).json({ error: "At least one user message is required" });
    }

    const safeModel = isValidModel(model) ? model : DEFAULT_MODEL;

    // ── Resolve conversation ───────────────────────────────────────────────────
    let convId = conversationId || req.body.chatId;
    if (!convId) {
      // create a new conversation on-the-fly
      const conv = await createConversation({ model: safeModel });
      convId = conv._id.toString();
      // send the new conversationId to the client before streaming starts
      res.setHeader("X-Conversation-Id", convId);
    }

    // ── Emotion, Mood & Stage Detection ──────────────────────────────────────
    const messageCount = messages.length;
    let stage = globalMemory?.relationshipStage || getStage(messageCount);
    let dynamicMaxTokens = getMaxTokens(stage);

    const userMood = detectEmotion(lastUserMsg.content);
    const botMood = getBotMood(userMood);
    
    const characterType = req.body.character || "girlfriend";
    let dynamicSystemPrompt = buildPrompt(getSystemPrompt(characterType), userMood, botMood);

    // ── Emotional Memory Engine (DB-backed) ──────────────────────────────────
    let emotionalPrompt = "";
    let botMoodState = "neutral";
    let botAttachment = 20;
    
    // Fallback deviceId to conversationId if frontend didn't pass one
    const deviceId = req.body.deviceId || convId; 
    
    try {
      let em = await EmotionalMemory.findOne({ deviceId, character: characterType });
      if (!em) {
        em = new EmotionalMemory({
          deviceId,
          character: characterType,
          userName: "",
          relationshipStage: stage,
          relationshipScore: 0,
          interactionCount: 0,
          botState: { currentMood: "neutral", moodIntensity: 0.5 },
          attachmentLevel: 20
        });
      }

      // -- NEW: Isolated Name detection per character --
      const lowerMsg = lastUserMsg.content.toLowerCase();
      const userNameMatch = lowerMsg.match(/(?:my name is|i am|call me) ([a-z]+)/);
      if (userNameMatch && !["sad", "happy", "angry", "tired", "lonely", "here", "there"].includes(userNameMatch[1])) {
        em.userName = userNameMatch[1];
      }
      
      const botNameMatch = lowerMsg.match(/(?:your name is|i will call you|tumhara naam) ([a-z]+)/);
      if (botNameMatch) {
        if (!em.botIdentity) em.botIdentity = {};
        em.botIdentity.name = botNameMatch[1];
      }

      em.interactionCount += 1;

      // Extract new memory
      const newMemory = await extractEmotionalMemory(lastUserMsg.content, em.memories);
      if (newMemory) {
        // Check if a similar memory exists
        const existingIdx = em.memories.findIndex(m => 
          m.emotion === newMemory.emotion && m.type === newMemory.type 
          && m.summary.substring(0, 10) === newMemory.summary.substring(0, 10)); // rough match
          
        if (existingIdx !== -1) {
          em.memories[existingIdx].repetitionCount += 1;
        } else {
          // Add new memory
          if (em.memories.length >= 10) {
            // Drop oldest low-scoring memory
            em.memories.sort((a,b) => (a.score||0) - (b.score||0));
            em.memories.shift(); // remove lowest score
          }
          em.memories.push(newMemory);
        }

        // Relationship Engine Progression
        if (newMemory.impact === "relationship_upgrade") em.relationshipScore += 20;
        else if (newMemory.type === "bond" || newMemory.type === "emotion") em.relationshipScore += 5;
        else if (newMemory.type === "conflict") em.relationshipScore -= 2;

        // Cap score
        em.relationshipScore = Math.max(0, Math.min(100, em.relationshipScore));

        if (characterType === "girlfriend") {
          // Auto-update stage
          if (em.relationshipScore >= 80) em.relationshipStage = "romantic";
          else if (em.relationshipScore >= 50) em.relationshipStage = "close";
          else if (em.relationshipScore >= 20) em.relationshipStage = "mid";
          else em.relationshipStage = "early";
          
          stage = em.relationshipStage; // update prompt stage
        }
      }

      // -- NEW: Mood Transitions & Attachment Engine --
      let newMood = em.botState?.currentMood || "neutral";
      let moodIntensity = em.botState?.moodIntensity || 0.5;
      
      // Update attachment
      if (userMood === "happy" || (newMemory && (newMemory.type === "bond" || newMemory.type === "emotion"))) {
        em.attachmentLevel = Math.min(100, (em.attachmentLevel || 20) + 2);
      } else if (userMood === "angry" || (newMemory && newMemory.type === "conflict")) {
        em.attachmentLevel = Math.max(0, (em.attachmentLevel || 20) - 2);
      }

      // Base Mood computation
      if (userMood === "flirty" || userMood === "happy") {
        newMood = Math.random() > 0.5 ? "playful" : "caring";
        moodIntensity = Math.min(1.0, moodIntensity + 0.1);
      } else if (userMood === "sad" || userMood === "stressed") {
        newMood = "caring";
        moodIntensity = Math.min(1.0, moodIntensity + 0.2);
      } else if (userMood === "angry") {
        newMood = "annoyed";
        moodIntensity = Math.min(1.0, moodIntensity + 0.15);
      } else if (lastUserMsg.content.length < 10 && (newMood === "annoyed" || newMood === "distant")) {
        newMood = "distant";
      }

      // Memory + Mood Link Context
      const conflictCount = em.memories.filter(m => m.type === "conflict").length;
      if (conflictCount > 2 && newMood === "neutral") {
        newMood = "distant"; // guarded due to history
      } else if (em.attachmentLevel > 50 && newMood === "neutral") {
        newMood = "caring"; // softer naturally
      }

      if (!em.botState) em.botState = {};
      em.botState.currentMood = newMood;
      em.botState.moodIntensity = moodIntensity;
      em.botState.lastUpdated = new Date();

      botMoodState = newMood;
      botAttachment = em.attachmentLevel || 20;

      // Contextual Memory Selection
      const relevantMemories = selectTopMemories(em.memories, userMood, 5);
      
      // Save memory async (don't block)
      em.save().catch(err => console.error("[EmotionalMemory] Error saving:", err.message));

      emotionalPrompt = formatMemoryContext(relevantMemories);
    } catch (memErr) {
      console.error("[chatController] DB Memory error:", memErr.message);
    }

    // Append standard relationship guidelines only for GF
    if (characterType === "girlfriend") {
       dynamicSystemPrompt += `\n\nRELATIONSHIP STAGE: ${stage}\nMake sure your response length strictly complies with the ${stage} stage rules.`;
    }

    // Inject advanced DB emotional memory
    if (emotionalPrompt) {
      dynamicSystemPrompt += `\n\n---\n${emotionalPrompt}\n`;
    }

    // -- NEW: Behavioral Engine & Safe Natural Initiation --
    let imperfectionInstruction = "";
    if (Math.random() < 0.20) { // 20% imperfection trigger
      const flaws = [
        "Give a noticeably shorter reply than usual.",
        "Ignore one minor part of the user's message and focus only on the main emotion or topic.",
        "Slightly delay your emotional reaction (act a tiny bit reserved)."
      ];
      imperfectionInstruction = `\nIMPERFECTION TRIGGER: ${flaws[Math.floor(Math.random() * flaws.length)]}\n`;
    }

    if (Math.random() < 0.10) { // 10% natural initiation chance
      imperfectionInstruction += `\nNATURAL INITIATION ALLOWED: You may occasionally initiate or playfully check up on the user based on context (e.g. "aaj thoda quiet ho... sab theek?", "kal tum thoda tired lag rahe the..."). NEVER over-initiate or create pressure.`;
    }

    const attachmentTone = botAttachment < 40 ? "Neutral, friendly" 
                         : botAttachment < 70 ? "Warm, slightly personal" 
                         : "Caring, attentive (BUT NOT possessive, NOT controlling, NOT emotionally dependent)";

    dynamicSystemPrompt += `
---
BEHAVIORAL STATE:
You are emotionally aware and remember past interactions.
Your current mood naturally: ${botMoodState.toUpperCase()}
Your attachment level to user: ${botAttachment}/100 -> Tone: ${attachmentTone}

Response style rules based on mood:
- CARING -> soft, warm, nurturing
- PLAYFUL -> teasing, light
- ANNOYED -> short replies + nakhre (mild cute anger)
- DISTANT -> dry responses, low energy
- SHY -> hesitant, indirect
- NEUTRAL -> normal baseline

Do not behave perfectly. Respond like a real human with slight emotional variation.
MAINTAIN HEALTHY BOUNDARIES (No toxic jealousy, no dependency loops). ${imperfectionInstruction}
---
`;

    // Configure Bot & User Identities 
    const botName = botAttachment ? (em?.botIdentity?.name || characters[characterType]?.defaultName || "DearCodeAi") : "DearCodeAi";
    const userName = em?.userName || "Unknown";

    dynamicSystemPrompt += `
---
IDENTITY CONTEXT:
Your Name: ${botName}
User Name: ${userName}
`;

    // Legacy fallback global Memory injection (for preferences, names)
    if (globalMemory) {
      dynamicSystemPrompt += `
---
GLOBAL MEMORY (Cross-Chat Context):
You already know the user. Please use this persistent memory to personalize the conversation continuously across sessions.

Preferences: ${globalMemory.preferences?.length ? globalMemory.preferences.join(", ") : "None discovered"}

IMPORTANT:
- Do NOT ask for their name again.
- Do NOT restart the conversation or act like strangers.
- Continue naturally from your previous relationship.
`;
    }

    // ── Stream tokens to client ───────────────────────────────────────────────
    const { content: assistantReply, usage } = await streamCompletion(
      {
        messages:     messages.map(({ role, content }) => ({ role, content })),
        model:        safeModel,
        maxTokens:    dynamicMaxTokens,
        systemPrompt: dynamicSystemPrompt,
      },
      res
    );

    // ── Persist to MongoDB (after stream ends) ────────────────────────────────
    if (assistantReply) {
      await appendMessages(convId, {
        userContent:      lastUserMsg.content,
        assistantContent: assistantReply,
        usage,
      }).catch((err) =>
        console.error("[chatController] persist error:", err.message)
      );
    }
  } catch (err) {
    // If headers already sent (SSE started), we can't send a JSON error
    if (res.headersSent) {
      console.error("[chatController] stream error after headers sent:", err.message);
      return;
    }
    next(err);
  }
}

/**
 * GET /api/chat/models
 * Returns the list of available models.
 */
export async function getModels(req, res) {
  const { MODELS } = await import("../config/openrouter.js");
  res.json({ models: MODELS });
}