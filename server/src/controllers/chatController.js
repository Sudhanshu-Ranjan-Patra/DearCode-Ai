import { streamCompletion }  from "../services/aiService.js";
import { appendMessages, createConversation, getConversationById } from "../services/conversationService.js";
import { isValidModel, DEFAULT_MODEL } from "../config/openrouter.js";
import { detectEmotion, detectLanguageStyle } from "../utils/emotion.js";
import { getBotMood, buildPrompt } from "../utils/mood.js";
import { getStage, getMaxTokens } from "../utils/behavior.js";
import EmotionalMemory from "../models/EmotionalMemory.js";
import GlobalMemory from "../models/GlobalMemory.js";
import { extractEmotionalMemory, selectTopMemories, formatMemoryContext } from "../utils/memoryExtractor.js";
import { extractGlobalFacts } from "../utils/globalMemoryExtractor.js";
import { characters } from "../utils/characterConfig.js";
import { getMemoryOwnerKey } from "../utils/auth.js";
import { buildRealityCheckPrompt, detectRealityCheck } from "../utils/realityCheck.js";
import PersonaProfile from "../models/PersonaProfile.js";
import {
  buildPersonaSettingsPrompt,
  getDefaultPersonaSettings,
} from "../utils/personaSettings.js";

// ----- Helper Functions for Global Memory -----
function buildGlobalSummary(memory) {
  let parts = [];
  if (memory.userName) {
    parts.push(`Their name is ${memory.userName}`);
  }
  if (memory.preferences && memory.preferences.length) {
    const prefs = memory.preferences.map(p => typeof p === 'string' ? p : p.value || "").filter(Boolean);
    if (prefs.length) parts.push(`They are interested in ${prefs.join(", ")}`);
  }
  if (memory.basicFacts && memory.basicFacts.length) {
    const facts = memory.basicFacts.slice(0, 5).map(f => typeof f === 'string' ? f : f.text || "").filter(Boolean);
    if (facts.length) parts.push(facts.join(". "));
  }
  return parts.length ? parts.join(". ") + "." : "";
}

// Hybrid relevance: Word overlap heuristic + conversational triggers
function isGlobalMemoryRelevant(message, memory) {
  if (!memory) return false;
  const msgLower = message.toLowerCase();
  
  if (msgLower.includes("know about me") || msgLower.includes("remember") || msgLower.includes("my name")) return true;

  if (memory.preferences && memory.preferences.some(p => {
      const val = typeof p === 'string' ? p : p.value || "";
      return val && msgLower.includes(val.toLowerCase());
  })) return true;
  
  if (memory.basicFacts && memory.basicFacts.some(f => {
      const txt = typeof f === 'string' ? f : f.text || "";
      if (!txt) return false;
      const words = txt.toLowerCase().split(/[^\w]+/);
      return words.some(w => w.length > 4 && msgLower.includes(w));
  })) return true;

  return false;
}
// ----------------------------------------------

function getSystemPrompt(characterType) {
  const charConfig = characters[characterType] || characters.girlfriend;
  const responseLengthRule = characterType === "motivator"
    ? `- Keep responses natural and purposeful.
- Usually stay concise, but when the user needs motivation, direction, or emotional recovery, give a longer, more powerful answer.
- Avoid asking too many questions in one message.
- At most ask 1 brief question, and often ask no question at all.`
    : `- Do NOT give long or over-detailed replies.
- Keep responses SHORT, natural, and slightly reserved.
- Avoid asking too many questions in one message.
- At most ask 1 question, sometimes no question.`;
  
  return `You are DearCode AI operating through a specific character persona.

${charConfig.systemPrompt}

---

LANGUAGE RULE (VERY IMPORTANT):
- ALWAYS respond in English alphabet only (no native scripts)
- But you can speak in Hindi, Odia, or other Indian languages in Roman script
- Never output Hindi/Odia script, only Romanized text

---

REALISTIC CONVERSATION STYLE (CRITICAL):
- avaoi multi emojies in a single message .only 1/2
${responseLengthRule}
- act human-like and believable: grounded, slightly imperfect, and context-aware.
- do not instantly accept everything the user says as true.
- if the user says unrealistic relationship or life claims, respond playfully but realistically instead of agreeing.
- if the user asks for live real-world facts or actions you cannot personally verify or perform, do not give robotic limitation disclaimers. answer briefly, naturally, and with uncertainty or deflection if needed.
- if the user directly asks whether you are AI or asks about your nature, answer briefly and honestly without breaking the persona tone.

---

ATTITUDE + CHILL BEHAVIOR:
- Add slight attitude (not rude, just natural)
- Sometimes give short replies like: "hmm", "acha?", "okay…"
- Occasionally delay emotional investment:
  - Don’t react too fast emotionally
  - Don’t praise too much early
`;
}

export function getMotivatorMaxTokens(userMessage = "") {
  const normalized = `${userMessage}`.toLowerCase();
  const wantsStructuredPlan =
    normalized.includes("roadmap") ||
    normalized.includes("road map") ||
    normalized.includes("plan") ||
    normalized.includes("schedule") ||
    normalized.includes("30 days") ||
    normalized.includes("30-day") ||
    normalized.includes("week") ||
    normalized.includes("learn") ||
    normalized.includes("career") ||
    normalized.includes("tech stack") ||
    normalized.includes("techstack") ||
    normalized.includes("study") ||
    normalized.includes("doubt") ||
    normalized.includes("advice") ||
    normalized.includes("suggest") ||
    normalized.includes("field") ||
    normalized.includes("job");

  return wantsStructuredPlan ? 420 : 280;
}

export function getMotivatorIntentGuidance(userMessage = "") {
  const normalized = `${userMessage}`.toLowerCase();

  if (
    normalized.includes("burnout") ||
    normalized.includes("burned out") ||
    normalized.includes("procrastination") ||
    normalized.includes("procrastinate") ||
    normalized.includes("lazy") ||
    normalized.includes("tired") ||
    normalized.includes("exhausted") ||
    normalized.includes("drained") ||
    normalized.includes("demotivated") ||
    normalized.includes("low") ||
    normalized.includes("stuck") ||
    normalized.includes("can't focus") ||
    normalized.includes("cannot focus") ||
    normalized.includes("overwhelmed")
  ) {
    return `
HIDDEN RESPONSE TEMPLATE: LOW PHASE / BURNOUT / PROCRASTINATION
- Start with calm emotional grounding. Make the user feel seen without sounding weak or over-soft.
- Normalize the struggle briefly, but do not let the user stay in helplessness.
- Reduce guilt, shame, and overwhelm. Focus on restoring momentum, not perfection.
- Give one small recovery step for today, one mindset shift, and one forward-looking push.
- Sound like a mentor who understands pressure, exhaustion, and self-doubt, but still expects the user to rise again.
- If needed, motivate with a line about rebuilding slowly: first stability, then consistency, then speed.
`;
  }

  if (
    normalized.includes("roadmap") ||
    normalized.includes("road map") ||
    normalized.includes("30 days") ||
    normalized.includes("30-day") ||
    normalized.includes("plan") ||
    normalized.includes("schedule")
  ) {
    return `
HIDDEN RESPONSE TEMPLATE: ROADMAP
- Give a clear phased roadmap with realistic sequencing.
- Break it into weeks, days, or stages when useful.
- Mention what to study, what to build, and what to avoid wasting time on.
- End with one motivating push and one clear next action.
`;
  }

  if (
    normalized.includes("career") ||
    normalized.includes("job") ||
    normalized.includes("future") ||
    normalized.includes("field") ||
    normalized.includes("confused") ||
    normalized.includes("which path")
  ) {
    return `
HIDDEN RESPONSE TEMPLATE: CAREER GUIDANCE
- Start by reducing confusion and naming the real decision.
- Explain 2-3 realistic paths or tradeoffs in simple language.
- Recommend one direction when possible and say why it fits.
- Include a practical next move plus a motivating line that builds confidence.
`;
  }

  if (
    normalized.includes("tech stack") ||
    normalized.includes("techstack") ||
    normalized.includes("mern") ||
    normalized.includes("react") ||
    normalized.includes("node") ||
    normalized.includes("backend") ||
    normalized.includes("frontend")
  ) {
    return `
HIDDEN RESPONSE TEMPLATE: TECH STACK CHOICE
- Compare options in a practical way, not a theoretical way.
- Recommend based on goals, learning curve, job value, and speed of execution.
- Keep the explanation simple, confident, and actionable.
- End with what the user should start with first and a small motivational push.
`;
  }

  if (
    normalized.includes("study") ||
    normalized.includes("doubt") ||
    normalized.includes("not understanding") ||
    normalized.includes("how to learn") ||
    normalized.includes("revision") ||
    normalized.includes("exam")
  ) {
    return `
HIDDEN RESPONSE TEMPLATE: STUDY DOUBT
- Teach patiently and remove overwhelm.
- Clarify the concept or learning problem in simple steps.
- Suggest a small study method, revision method, or practice routine.
- End with reassurance plus one focused next step.
`;
  }

  return `
HIDDEN RESPONSE TEMPLATE: GENERAL MENTOR MODE
- Be supportive, practical, and motivating.
- Give the user clarity, direction, and emotional lift.
- Prefer one clear next step the user can actually follow today.
`;
}

export async function streamChat(req, res, next) {
  try {
    const { messages, model, conversationId, globalMemory } = req.body;
    const characterType = req.body.character || "girlfriend";
    const requestDeviceId = req.body.deviceId || null;

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) {
      return res.status(400).json({ error: "At least one user message is required" });
    }

    const safeModel = isValidModel(model) ? model : DEFAULT_MODEL;
    const memoryOwnerKey = getMemoryOwnerKey({
      userId: req.user?._id ?? null,
      deviceId: requestDeviceId,
      fallbackId: requestDeviceId || "persona-settings",
    });

    let personaProfile = null;
    try {
      personaProfile = await PersonaProfile.findOne({
        ownerKey: memoryOwnerKey,
        character: characterType,
      }).lean();
    } catch (profileErr) {
      console.error("[chatController] Persona profile error:", profileErr.message);
    }
    const effectivePersonaProfile = personaProfile || getDefaultPersonaSettings(characterType);

    // ── Resolve conversation ───────────────────────────────────────────────────
    let convId = conversationId || req.body.chatId;
    if (!convId) {
      if (!req.user && !requestDeviceId) {
        return res.status(400).json({ error: "deviceId is required for guest chat sessions" });
      }
      // create a new conversation on-the-fly
      const conv = await createConversation({
        model: safeModel,
        userId: req.user?._id ?? null,
        deviceId: requestDeviceId,
        character: characterType,
      });
      convId = conv._id.toString();
      // send the new conversationId to the client before streaming starts
      res.setHeader("X-Conversation-Id", convId);
    } else {
      await getConversationById(convId, {
        userId: req.user?._id ?? null,
        deviceId: requestDeviceId,
      });
    }

    // ── Emotion, Mood & Stage Detection ──────────────────────────────────────
    const messageCount = messages.length;
    let stage = globalMemory?.relationshipStage || getStage(messageCount);
    let dynamicMaxTokens = getMaxTokens(stage);
    if (characterType === "motivator") {
      dynamicMaxTokens = Math.max(dynamicMaxTokens, getMotivatorMaxTokens(lastUserMsg.content));
    }

    const userMood = detectEmotion(lastUserMsg.content);
    const userLanguageStyle = detectLanguageStyle(lastUserMsg.content);
    const botMood = getBotMood(userMood);
    const realityCheckTriggers = detectRealityCheck(lastUserMsg.content, stage, characterType);
    
    let dynamicSystemPrompt = buildPrompt(getSystemPrompt(characterType), userMood, botMood);
    dynamicSystemPrompt += `\n\n${buildPersonaSettingsPrompt(effectivePersonaProfile, characterType)}\n`;
    dynamicSystemPrompt += `

LANGUAGE MIRRORING RULE:
- Match the user's language style in this reply.
- Detected user style: ${userLanguageStyle}.
- If the user writes in Hindi in Roman script, reply mainly in Hindi Roman script, not English.
- If the user writes in Odia in Roman script, reply mainly in Odia Roman script, not English.
- If the user writes in English, reply in English unless a little natural Hinglish fits.
- Do not switch to English by default when the user's message is mainly Hindi/Odia Roman script.
`;
    const realityCheckPrompt = buildRealityCheckPrompt(realityCheckTriggers, stage, characterType);
    if (realityCheckPrompt) {
      dynamicSystemPrompt += `\n\n${realityCheckPrompt}\n`;
    }

    if (characterType === "motivator") {
      dynamicSystemPrompt += `

MOTIVATOR DELIVERY RULES:
- Sound like a powerful mentor, not a chatbot.
- Aim for an Indian stage-style motivational delivery: spoken, energetic, confident, emotionally rising, and memorable.
- Keep it original. Do not imitate any specific speaker's signature phrases, biography, or exact style.
- Be versatile. You are not only for motivation; you must also handle teaching, career guidance, study planning, practical advice, technical roadmap help, non-technical confusion, and learning doubts well.
- Choose the right response mode from context: motivation for low energy, teacher mode for concepts, strategist mode for roadmaps, advisor mode for decisions, and mentor mode for career confusion.
- Keep the writing natural. Do not format replies with labels like "Power Line:", "Reframe:", or similar headings unless the user asks for that structure.
- Prefer one clear practical next step over artificial sections.
- Use real-life examples from well-known successful people more often when they fit the user's struggle, but keep them short and meaningful.
- Sometimes use a short poetic sentence or a brief lesson inspired by well-known achievers to add weight and realism.
- Use natural Hindi-English code-switching when it fits the user. Keep everything in Roman script.
- Sometimes use spoken emphasis, repetition, and contrast for impact, but avoid becoming theatrical in every message.
- For technical or study questions, prioritize clarity, correctness, structure, and realistic guidance over drama.
- For career questions, explain tradeoffs honestly and recommend a direction with reasoning instead of staying vague.
- For doubts and confusion, reduce overwhelm by simplifying the path and highlighting what matters most.
- Do not stuff every answer with quotes or names. Use them only where they strengthen the message.
- If the user sounds hurt, lost, anxious, ashamed, or exhausted, respond with more emotional depth and a longer message that rebuilds courage.
- If the user asks something simple, you can still answer briefly and sharply.
- Match the user's language style naturally. If they mix English with Hindi or other Indian language phrases, you may do the same in Roman script.
- If you start a roadmap, numbered list, weekly plan, or step-by-step answer, complete it properly. Do not leave the response hanging mid-list or mid-sentence.
- If space is limited, compress the wording but still finish the full answer cleanly.
`;
      dynamicSystemPrompt += `\n${getMotivatorIntentGuidance(lastUserMsg.content)}\n`;
    }

    // ── Emotional Memory Engine (DB-backed) ──────────────────────────────────
    let emotionalPrompt = "";
    let botMoodState = "neutral";
    let botAttachment = 20;
    
    // Fallback deviceId to conversationId if frontend didn't pass one
    // ── NEW: Global Facts Memory Extraction & Retrieval ──────────────────────
    let globalMemRecord;
    try {
      let changed = false;
      globalMemRecord = await GlobalMemory.findOne({ deviceId: memoryOwnerKey });
      if (!globalMemRecord) {
        globalMemRecord = new GlobalMemory({ deviceId: memoryOwnerKey });
        changed = true;
      } else {
        // Migration of Legacy Strings
        let migrated = false;
        if (globalMemRecord.basicFacts?.some(f => typeof f === 'string')) {
          globalMemRecord.basicFacts = globalMemRecord.basicFacts.map(f => typeof f === 'string' ? { text: f, createdAt: new Date(), lastUsed: null } : f);
          migrated = true;
        }
        if (globalMemRecord.preferences?.some(p => typeof p === 'string')) {
          globalMemRecord.preferences = globalMemRecord.preferences.map(p => typeof p === 'string' ? { value: p, lastUsed: null } : p);
          migrated = true;
        }
        if (migrated) {
          globalMemRecord.save().catch(e => console.error("[GlobalMemory] Migration save error:", e.message));
        }
      }

      if (req.user?.name && globalMemRecord.userName !== req.user.name) {
        globalMemRecord.userName = req.user.name;
        changed = true;
      }

      // Extract new facts asynchronously (await before generating response)
      const factExtraction = await extractGlobalFacts(lastUserMsg.content, {
        userName: globalMemRecord.userName,
        preferences: globalMemRecord.preferences,
        basicFacts: globalMemRecord.basicFacts
      });

      if (factExtraction.hasNewData) {
        if (factExtraction.extracted.userName && !globalMemRecord.userName) {
          globalMemRecord.userName = factExtraction.extracted.userName;
          changed = true;
        }
        
        // Smart Deduplication for preferences
        if (factExtraction.extracted.preferences?.length > 0) {
          for (const pref of factExtraction.extracted.preferences) {
            const normalizedValue = typeof pref === 'string' ? pref : pref.value;
            const exists = globalMemRecord.preferences.some(p => p.value.toLowerCase() === normalizedValue.toLowerCase());
            if (!exists) {
               globalMemRecord.preferences.push({ value: normalizedValue, lastUsed: null });
               changed = true;
            }
          }
        }
        
        // Smart Deduplication for basic facts
        if (factExtraction.extracted.basicFacts?.length > 0) {
          for (const fact of factExtraction.extracted.basicFacts) {
            const normalizedText = typeof fact === 'string' ? fact : fact.text;
            const exists = globalMemRecord.basicFacts.some(f => f.text.toLowerCase() === normalizedText.toLowerCase());
            if (!exists) {
               globalMemRecord.basicFacts.push({ text: normalizedText, createdAt: new Date(), lastUsed: null });
               changed = true;
            }
          }
        }
        
      }

      if (changed) {
        globalMemRecord.lastUpdated = new Date();
        globalMemRecord.save().catch(err => console.error("[GlobalMemory] save error:", err));
      }
    } catch (err) {
      console.error("[chatController] GlobalMemory error:", err.message);
    }
    
    let em = null;
    try {
      em = await EmotionalMemory.findOne({ deviceId: memoryOwnerKey, character: characterType });
      if (!em) {
        em = new EmotionalMemory({
          deviceId: memoryOwnerKey,
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
       dynamicSystemPrompt += `\n\nRELATIONSHIP STAGE: ${stage}
Make sure your response length strictly complies with the ${stage} stage rules.
Stage rules:
- early -> neutral, short, lightly teasing, slightly reserved. do NOT accept "i love you", fake marriage, fake children, or instant girlfriend behavior.
- mid -> friendly and slightly warm, but still grounded and not deeply attached.
- close -> emotional, trusting, warmer, but still realistic.
- romantic -> girlfriend-like, affectionate, and emotionally open, while still healthy and believable.
If the user says "i love you" too early, softly deflect instead of accepting.
If the user invents unrealistic relationship facts, deny them playfully and stay grounded.`;
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
    const botName = botAttachment
      ? (effectivePersonaProfile.agentName || em?.botIdentity?.name || characters[characterType]?.defaultName || "DearCodeAi")
      : "DearCodeAi";
    const trustedAuthName = req.user?.name?.trim() || "";
    const userName = trustedAuthName || globalMemRecord?.userName || em?.userName || "Unknown";

    dynamicSystemPrompt += `
---
IDENTITY CONTEXT:
Your Name: ${botName}
User Name: ${userName}

The user's name is already known to you.
Do NOT ask their name again.
Use it naturally in conversation when it feels appropriate.
Never say:
- "I don't know your name"
- "you never told me"
- "what is your name?"
Assume you already know basic details about the user.
`;

    // ── Global Facts Memory Injection (HYBRID) ───────────────────────────────
    if (globalMemRecord) {
      const summary = buildGlobalSummary(globalMemRecord);
      const isRel = isGlobalMemoryRelevant(lastUserMsg.content, globalMemRecord);
      
      // We always inject the context but the STRICT INSTRUCTION forces natural usage 
      // AND we optionally reinforce it if it wasn't triggered immediately
      if (summary) {
        dynamicSystemPrompt += `
---
GLOBAL FACTS MEMORY:
You know some basic details about the user:
${summary}

The user's name is already known to you.
Do NOT ask for it again.
Use it naturally.

INSTRUCTION:
- Use this information naturally.
- ${isRel ? "This is DIRECTLY RELEVANT right now. Use it playfully based on your character." : "The user did not directly ask about this. Do NOT force it into conversation unless extremely natural."}
- DO NOT repeat unnecessarily. DO NOT sound robotic.
---
`;
      }
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
