// client/src/utils/memory.js
// Handles Cross-Chat Persistent Global Memory via localStorage

const defaultMemory = {
  userName: "",
  botName: "",
  preferences: [],
  personalityTraits: [],
  importantMoments: [],
  relationshipStage: "early",
  interactionCount: 0
};

export function loadGlobalMemory() {
  try {
    const saved = localStorage.getItem("globalMemory");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load global memory", e);
  }
  return defaultMemory;
}

export function saveGlobalMemory(memory) {
  try {
    localStorage.setItem("globalMemory", JSON.stringify(memory));
  } catch (e) {
    console.error("Failed to save global memory", e);
  }
}

export function updateMemoryFromMessage(message, currentMemory) {
  const newMem = { ...currentMemory };
  // Ensure arrays exist
  newMem.preferences = newMem.preferences || [];
  newMem.personalityTraits = newMem.personalityTraits || [];
  newMem.importantMoments = newMem.importantMoments || [];

  const lower = message.toLowerCase();

  // 1. Name detection
  const nameMatch = lower.match(/(?:my name is|i am|call me) ([a-z]+)/);
  if (nameMatch && !["sad", "happy", "angry", "tired", "lonely", "here", "there"].includes(nameMatch[1])) {
    newMem.userName = nameMatch[1];
  }
  
  // Bot name
  const botNameMatch = lower.match(/(?:your name is|i will call you|tumhara naam) ([a-z]+)/);
  if (botNameMatch) {
    newMem.botName = botNameMatch[1];
  }

  // 2. Preferences
  const prefMatch = lower.match(/(?:i like|i love|i enjoy|my favorite is) ([a-z0-9\s]+)/);
  if (prefMatch) {
    const pref = prefMatch[1].trim();
    if (pref.length < 40 && !newMem.preferences.includes(pref)) {
      newMem.preferences.push(pref);
      if (newMem.preferences.length > 10) newMem.preferences.shift(); // Keep max 10
    }
  }

  // 3. Important moments (Emotions & Life Events)
  const emotionMatch = lower.match(/(?:i feel|i am feeling|i m feeling|i am so) (sad|lonely|hurt|depressed|stress|alone|happy|excited)/);
  if (emotionMatch) {
    const moment = `User felt ${emotionMatch[1]} on ${new Date().toLocaleDateString()}`;
    // prevent exact duplicates
    if (!newMem.importantMoments.includes(moment)) {
      newMem.importantMoments.push(moment);
      if (newMem.importantMoments.length > 5) newMem.importantMoments.shift(); // Keep max 5
    }
  }

  // 4. Update stage based on cumulative global interaction count
  newMem.interactionCount = (newMem.interactionCount || 0) + 1;
  const c = newMem.interactionCount;
  if (c > 70) newMem.relationshipStage = "late";
  else if (c > 20) newMem.relationshipStage = "mid";
  else newMem.relationshipStage = "early";

  return newMem;
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = "device_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("deviceId", id);
    }
    return id;
  } catch (e) {
    return "anonymous_device";
  }
}
