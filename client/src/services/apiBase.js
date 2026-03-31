const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/chat";

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function getApiRoot() {
  const normalized = stripTrailingSlash(RAW_API_URL);
  if (normalized.endsWith("/api/chat")) return normalized.slice(0, -5);
  if (normalized.endsWith("/api")) return normalized;
  return `${normalized}/api`;
}

export const API_ROOT = getApiRoot();
export const CHAT_API_BASE = `${API_ROOT}/chat`;
export const AUTH_API_BASE = `${API_ROOT}/auth`;
export const CONVERSATION_API_BASE = `${API_ROOT}/conversations`;
export const HEALTH_API_BASE = `${API_ROOT}/health`;
export const PERSONA_API_BASE = `${API_ROOT}/personas`;
