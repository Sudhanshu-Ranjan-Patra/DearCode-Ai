// services/chatService.js
// All HTTP calls to the Express backend.
// Uses fetch (native) with SSE for streaming and JSON for REST operations.
import { getDeviceId } from "../utils/memory";
import {
  CHAT_API_BASE,
  CONVERSATION_API_BASE,
  HEALTH_API_BASE,
} from "./apiBase";

// ── Chat CRUD 

export const chatService = {
  /** GET /chats — returns array of chat summaries */
  getChats: (character, deviceId) => 
    fetch(`${CONVERSATION_API_BASE}?character=${encodeURIComponent(character)}&deviceId=${encodeURIComponent(deviceId)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data.conversations ?? data;
      }),

  /** GET /chats/:id/messages */
  getChatMessages: (chatId, deviceId = getDeviceId()) =>
    fetch(`${CONVERSATION_API_BASE}/${chatId}/messages?deviceId=${encodeURIComponent(deviceId)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data.messages ?? data;
      }),

  /** POST /chats — body: { title, character, deviceId } */
  createChat: (body) =>
    fetch(`${CONVERSATION_API_BASE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data.conversation ?? data;
      }),

  /** PATCH /chats/:id */
  updateChat: (chatId, body, deviceId = getDeviceId()) =>
    fetch(`${CONVERSATION_API_BASE}/${chatId}?deviceId=${encodeURIComponent(deviceId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data.conversation ?? data;
      }),

  /** DELETE /chats/:id */
  deleteChat: (chatId, deviceId = getDeviceId()) =>
    fetch(`${CONVERSATION_API_BASE}/${chatId}?deviceId=${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
      credentials: "include",
    }).then(async (res) => {
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      return null;
    }),

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
    const res = await fetch(`${CHAT_API_BASE}/stream`, {
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
  ping: async () => {
    const res = await fetch(HEALTH_API_BASE, { credentials: "include" });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
  },
};
