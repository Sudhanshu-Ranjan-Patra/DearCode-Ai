// client/src/utils/memory.js
// Handles Cross-Chat Persistent Global Memory via localStorage

const defaultMemory = {
  userName: "",
  botName: "",
  preferences: [],
  personalityTraits: [],
  importantMoments: [],
  basicFacts: [],
  relationshipStage: "early",
  interactionCount: 0
};

function getMemoryKey(ownerKey = "guest") {
  return `globalMemory:${ownerKey}`;
}

export function getDefaultMemory() {
  return { ...defaultMemory };
}

export function loadGlobalMemory(ownerKey = "guest") {
  try {
    const saved = localStorage.getItem(getMemoryKey(ownerKey));
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load global memory", e);
  }
  return getDefaultMemory();
}

export function saveGlobalMemory(memory, ownerKey = "guest") {
  try {
    localStorage.setItem(getMemoryKey(ownerKey), JSON.stringify(memory));
  } catch (e) {
    console.error("Failed to save global memory", e);
  }
}

function mergeUniqueItems(...groups) {
  const seen = new Set();
  const merged = [];

  groups.flat().forEach((value) => {
    const normalized = `${value || ""}`.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(normalized);
  });

  return merged;
}

export function clearGlobalMemory(ownerKey = "guest") {
  try {
    localStorage.removeItem(getMemoryKey(ownerKey));
  } catch (e) {
    console.error("Failed to clear global memory", e);
  }
}

export function updateMemoryFromMessage(message, currentMemory) {
  const newMem = { ...currentMemory };
  // Ensure arrays exist
  newMem.preferences = newMem.preferences || [];
  newMem.personalityTraits = newMem.personalityTraits || [];
  newMem.importantMoments = newMem.importantMoments || [];
  newMem.basicFacts = newMem.basicFacts || [];

  const lower = message.toLowerCase();

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
  if (c > 100) newMem.relationshipStage = "romantic";
  else if (c > 50) newMem.relationshipStage = "close";
  else if (c > 20) newMem.relationshipStage = "mid";
  else newMem.relationshipStage = "early";

  return newMem;
}

export function getMemoryOwnerKey(user = null) {
  if (user?._id) return `user:${user._id}`;
  return "guest";
}

export function migrateGuestArtifactsToUser(user, serverMemory = null, options = {}) {
  const { clearGuest = true } = options;
  const userOwnerKey = getMemoryOwnerKey(user);
  const guestMemory = loadGlobalMemory("guest");
  const existingUserMemory = loadGlobalMemory(userOwnerKey);
  const sourceMemory = serverMemory || {};

  const mergedMemory = {
    ...getDefaultMemory(),
    ...existingUserMemory,
    ...guestMemory,
    ...sourceMemory,
    userName: sourceMemory.userName || user?.name || existingUserMemory.userName || guestMemory.userName || "",
    preferences: mergeUniqueItems(
      existingUserMemory.preferences,
      guestMemory.preferences,
      sourceMemory.preferences
    ),
    personalityTraits: mergeUniqueItems(
      existingUserMemory.personalityTraits,
      guestMemory.personalityTraits,
      sourceMemory.personalityTraits
    ),
    importantMoments: mergeUniqueItems(
      existingUserMemory.importantMoments,
      guestMemory.importantMoments,
      sourceMemory.importantMoments
    ).slice(-10),
    basicFacts: mergeUniqueItems(
      existingUserMemory.basicFacts,
      guestMemory.basicFacts,
      sourceMemory.basicFacts
    ),
    interactionCount: Math.max(
      existingUserMemory.interactionCount || 0,
      guestMemory.interactionCount || 0,
      sourceMemory.interactionCount || 0
    ),
    relationshipStage:
      sourceMemory.relationshipStage ||
      existingUserMemory.relationshipStage ||
      guestMemory.relationshipStage ||
      "early",
  };

  saveGlobalMemory(mergedMemory, userOwnerKey);
  if (clearGuest) {
    clearGlobalMemory("guest");
  }
  return mergedMemory;
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = "device_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("deviceId", id);
    }
    return id;
  } catch {
    return "anonymous_device";
  }
}
