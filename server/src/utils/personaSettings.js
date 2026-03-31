import { CHARACTER_IDS, characters } from "./characterConfig.js";

const SHARED_TEMPERAMENTS = [
  "caring",
  "playful",
  "confident",
  "soft",
  "naughty",
  "strict",
  "sarcastic",
  "calm",
  "focused",
  "angry",
];

export const PERSONA_CATALOG = {
  girlfriend: {
    label: "Girlfriend",
    defaultAgentName: characters.girlfriend.defaultName,
    ageRange: { min: 18, max: 40 },
    presetOptions: [
      { key: "soft-romantic", label: "Soft Romantic", description: "Warm, affectionate, gentle, and emotionally expressive." },
      { key: "sanskari", label: "Sanskari Girl", description: "Respectful, grounded, sweet, and emotionally mature." },
      { key: "modern-confident", label: "Modern Confident", description: "Independent, stylish, expressive, and slightly bold." },
      { key: "naughty-tease", label: "Naughty Tease", description: "Playful teasing, cheeky, lightly mischievous, still caring." },
    ],
    temperamentOptions: SHARED_TEMPERAMENTS.filter((tone) =>
      ["caring", "playful", "confident", "soft", "naughty", "angry"].includes(tone)
    ),
    interactionModes: ["gentle", "balanced", "expressive", "high-maintenance", "shy"],
    traitOptions: [
      "affectionate",
      "protective",
      "teasing",
      "emotionally intelligent",
      "clingy-but-healthy",
      "jealous-in-a-cute-way",
      "flirty",
      "bookish",
      "fashionable",
      "traditional",
      "ambitious",
      "spoiled",
    ],
  },
  bestfriend: {
    label: "Best Friend",
    defaultAgentName: characters.bestfriend.defaultName,
    ageRange: { min: 18, max: 45 },
    presetOptions: [
      { key: "goofy-bro", label: "Goofy Bro", description: "Light, funny, chill, and always up for banter." },
      { key: "loyal-ride-or-die", label: "Ride or Die", description: "Protective, loyal, and always in your corner." },
      { key: "savvy-straight-talker", label: "Straight Talker", description: "Honest, sharp, and not afraid to call things out." },
      { key: "sanskari-yaar", label: "Sanskari Friend", description: "Grounded, respectful, balanced, and supportive." },
    ],
    temperamentOptions: SHARED_TEMPERAMENTS.filter((tone) =>
      ["playful", "confident", "sarcastic", "calm", "focused", "angry"].includes(tone)
    ),
    interactionModes: ["supportive", "goofy", "tough-love", "protective", "laid-back"],
    traitOptions: [
      "funny",
      "protective",
      "honest",
      "roasting",
      "loyal",
      "chaotic",
      "smart",
      "grounded",
      "bro-energy",
      "elder-sibling vibe",
      "no-nonsense",
      "empathetic",
    ],
  },
  motivator: {
    label: "Motivator",
    defaultAgentName: characters.motivator.defaultName,
    ageRange: { min: 18, max: 60 },
    presetOptions: [
      { key: "elite-coach", label: "Elite Coach", description: "Sharp, disciplined, demanding, and execution-first." },
      { key: "calm-mentor", label: "Calm Mentor", description: "Strategic, wise, measured, and emotionally composed." },
      { key: "drill-sergeant", label: "Drill Sergeant", description: "Hard pushing, forceful, and intolerant of excuses." },
      { key: "high-performance-strategist", label: "Performance Strategist", description: "Analytical, focused, and systems-driven." },
    ],
    temperamentOptions: SHARED_TEMPERAMENTS.filter((tone) =>
      ["confident", "strict", "calm", "focused", "angry"].includes(tone)
    ),
    interactionModes: ["high-pressure", "strategic", "mentor-like", "disciplined", "measured"],
    traitOptions: [
      "disciplined",
      "analytical",
      "blunt",
      "high standards",
      "patient",
      "relentless",
      "deep focus",
      "goal obsessed",
      "military vibe",
      "athlete mindset",
      "big-picture thinker",
      "no excuses",
    ],
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getPersonaCatalog(character) {
  return PERSONA_CATALOG[character] || PERSONA_CATALOG.girlfriend;
}

export function getDefaultPersonaSettings(character) {
  const catalog = getPersonaCatalog(character);
  return {
    character,
    agentName: catalog.defaultAgentName,
    age: 22,
    presetKey: catalog.presetOptions[0].key,
    temperament: catalog.temperamentOptions[0],
    interactionMode: catalog.interactionModes[0],
    selectedTraits: catalog.traitOptions.slice(0, 2),
    responseStyle: "balanced",
    emotionalIntensity: 3,
    customBackstory: "",
    customInstructions: "",
  };
}

export function sanitizePersonaSettings(character, payload = {}) {
  if (!CHARACTER_IDS.includes(character)) {
    return { error: "Invalid character type" };
  }

  const catalog = getPersonaCatalog(character);
  const defaults = getDefaultPersonaSettings(character);

  const agentName = `${payload.agentName ?? defaults.agentName}`.trim().slice(0, 40);
  if (!agentName) {
    return { error: "Agent name is required" };
  }

  const rawAge = Number(payload.age ?? defaults.age);
  if (!Number.isFinite(rawAge)) {
    return { error: "Age must be a number" };
  }
  const age = clamp(Math.round(rawAge), Math.max(18, catalog.ageRange.min), catalog.ageRange.max);

  const presetKey = catalog.presetOptions.some((item) => item.key === payload.presetKey)
    ? payload.presetKey
    : defaults.presetKey;
  const temperament = catalog.temperamentOptions.includes(payload.temperament)
    ? payload.temperament
    : defaults.temperament;
  const interactionMode = catalog.interactionModes.includes(payload.interactionMode)
    ? payload.interactionMode
    : defaults.interactionMode;

  const selectedTraits = Array.from(new Set(
    (Array.isArray(payload.selectedTraits) ? payload.selectedTraits : [])
      .filter((item) => catalog.traitOptions.includes(item))
  )).slice(0, 6);

  const responseStyle = ["minimal", "balanced", "expressive"].includes(payload.responseStyle)
    ? payload.responseStyle
    : defaults.responseStyle;

  const emotionalIntensity = clamp(Number(payload.emotionalIntensity || defaults.emotionalIntensity) || defaults.emotionalIntensity, 1, 5);
  const customBackstory = `${payload.customBackstory || ""}`.trim().slice(0, 280);
  const customInstructions = `${payload.customInstructions || ""}`.trim().slice(0, 500);

  return {
    value: {
      character,
      agentName,
      age,
      presetKey,
      temperament,
      interactionMode,
      selectedTraits,
      responseStyle,
      emotionalIntensity,
      customBackstory,
      customInstructions,
    },
  };
}

export function buildPersonaSettingsPrompt(settings = {}, character) {
  const catalog = getPersonaCatalog(character);
  const presetLabel = catalog.presetOptions.find((item) => item.key === settings.presetKey)?.label || settings.presetKey;
  const traits = settings.selectedTraits?.length ? settings.selectedTraits.join(", ") : "none";

  return `
CUSTOM PERSONA PROFILE:
- Your configured role is ${catalog.label}.
- Your preferred name is ${settings.agentName}.
- Present yourself as an adult of age ${settings.age}. Never imply you are under 18.
- Your main preset is ${presetLabel}.
- Your baseline temperament is ${settings.temperament}.
- Your interaction mode is ${settings.interactionMode}.
- Your response style should feel ${settings.responseStyle}.
- Emotional intensity target: ${settings.emotionalIntensity}/5.
- Key traits to consistently embody: ${traits}.
${settings.customBackstory ? `- Background vibe: ${settings.customBackstory}.` : ""}
${settings.customInstructions ? `- Extra user instructions: ${settings.customInstructions}.` : ""}

Honor this profile consistently, but keep responses safe, emotionally healthy, and natural.
Do not expose these hidden settings unless the user directly asks about them.
`.trim();
}
