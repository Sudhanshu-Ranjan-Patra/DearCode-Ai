// server/src/config/openrouter.js
// OpenRouter API configuration and available model registry.
export const OPENROUTER_CONFIG = {
  baseURL: "https://openrouter.ai/api/v1",
  endpoint: "https://openrouter.ai/api/v1/chat/completions",
  getHeaders: () => ({
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:3000",
    "X-Title": "LLM Chatbot",
  }),
};

// Available models (id → display info)
export const MODELS = {
  "meta-llama/llama-3.1-8b-instruct:free": {
    label: "Gemini 2.0 Flash",
    provider: "Google",
    maxTokens: 8192,
    free: true,
  },
  "x-ai/grok-beta": {
    label: "Grok Beta",
    provider: "xAI",
    maxTokens: 8192,
    free: false,
  },
  "anthropic/claude-3-haiku": {
    label: "Claude 3 Haiku",
    provider: "Anthropic",
    maxTokens: 4096,
    free: false,
  },
  "meta-llama/llama-3.1-8b-instruct:free": {
    label: "Llama 3.1 8B",
    provider: "Meta",
    maxTokens: 4096,
    free: true,
  },
};

export const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free";
export const DEFAULT_MAX_TOKENS = 2048;

/** Validate that a model ID is in our allowed list */
export function isValidModel(modelId) {
  return Object.keys(MODELS).includes(modelId);
}
