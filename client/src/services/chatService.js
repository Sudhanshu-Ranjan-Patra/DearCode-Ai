// services/chatService.js
// All HTTP calls to the Express backend.
// Uses fetch (native) with SSE for streaming and JSON for REST operations.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/chat";

// ── Helpers ─

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",      
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Chat CRUD 

export const chatService = {
  /** GET /chats — returns array of chat summaries */
  getChats: () => request("/conversations").then(data => data.conversations ?? data),

  /** GET /chats/:id/messages */
  getChatMessages: (chatId) => request(`/conversations/${chatId}/messages`).then(data => data.messages ?? data),

  /** POST /chats — body: { title } */
  createChat: (body) =>
    request("/conversations", { method: "POST", body: JSON.stringify(body) })
      .then(data => data.conversation ?? data),

  /** PATCH /chats/:id */
  updateChat: (chatId, body) =>
    request(`/conversations/${chatId}`, { method: "PATCH", body: JSON.stringify(body) })
      .then(data => data.conversation ?? data),

  /** DELETE /chats/:id */
  deleteChat: (chatId) =>
    request(`/conversations/${chatId}`, { method: "DELETE" }),

  // ── Streaming ────────────────────────────────────────────────────────────
  /**
   * streamChat — opens an SSE connection to POST /chat/stream,
   * calls onToken(token) for each chunk until the stream closes.
   *
   * @param {{ messages, model, chatId }} payload
   * @param {(token: string) => void} onToken
   * @param {AbortSignal} signal
   */
  streamChat: async (payload, onToken, signal) => {
    const res = await fetch(`${BASE_URL}/chat/stream`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      signal,
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stream API ${res.status}: ${err}`);
    }

    // Parse Server-Sent Events line by line
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;

        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue; // ignore malformed JSON lines
        }

        if (parsed.error) {
          throw new Error(typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error));
        }

        const token =
          parsed?.choices?.[0]?.delta?.content ??
          parsed?.token ??
          "";
        if (token) onToken(token);
      }
    }
  },

  // ── Utility ──────────────────────────────────────────────────────────────
  /** Health check */
  ping: () => request("/health"),
};