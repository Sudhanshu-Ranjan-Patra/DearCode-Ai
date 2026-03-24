

import { useState, useEffect, useCallback } from "react";
import { chatService } from "../services/chatService";

export function useChatHistory() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Load all chats on mount ──────────────────────────────────────────────
  const refreshChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chatService.getChats();
      setChats(data);
    } catch (err) {
      console.error("[useChatHistory] fetch error:", err);
      setError("Failed to load chat history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  // ── Select / load a chat 
  const selectChat = useCallback(async (id) => {
    setActiveChatId(id);
    try {
      const messages = await chatService.getChatMessages(id);
      return Array.isArray(messages) ? messages : [];
    } catch (err) {
      console.error("[useChatHistory] load messages error:", err);
      setError("Failed to load messages.");
      return [];
    }
  }, []);

  // ── Create a new chat ────────────────────────────────────────────────────
  const createChat = useCallback(async (firstMessage = "New Chat") => {
    try {
      const title =
        firstMessage.length > 40
          ? firstMessage.slice(0, 40) + "…"
          : firstMessage;

      const newChat = await chatService.createChat({ title });
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat._id);
      return newChat._id;
    } catch (err) {
      console.error("[useChatHistory] create error:", err);
      setError("Failed to create chat.");
      return null;
    }
  }, []);

  // ── Delete a chat ────────────────────────────────────────────────────────
  const deleteChat = useCallback(
    async (id) => {
      try {
        await chatService.deleteChat(id);
        setChats((prev) => prev.filter((c) => c._id !== id));
        if (activeChatId === id) setActiveChatId(null);
      } catch (err) {
        // If it's already deleted (404), silently succeed to prevent zombie UI states on double-clicks
        if (err.message.includes("404")) {
          setChats((prev) => prev.filter((c) => c._id !== id));
          if (activeChatId === id) setActiveChatId(null);
          return;
        }
        console.error("[useChatHistory] delete error:", err);
        setError("Failed to delete chat.");
      }
    },
    [activeChatId],
  );

  // ── Rename a chat ────────────────────────────────────────────────────────
  const renameChat = useCallback(async (id, title) => {
    try {
      await chatService.updateChat(id, { title });
      setChats((prev) => prev.map((c) => (c._id === id ? { ...c, title } : c)));
    } catch (err) {
      console.error("[useChatHistory] rename error:", err);
    }
  }, []);

  // ── Update updatedAt / messageCount optimistically ───────────────────────
  const touchChat = useCallback((id, delta = {}) => {
    setChats((prev) =>
      prev
        .map((c) =>
          c._id === id
            ? { ...c, updatedAt: new Date().toISOString(), ...delta }
            : c,
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    );
  }, []);

  return {
    chats,
    activeChatId,
    loading,
    error,
    selectChat,
    createChat,
    deleteChat,
    renameChat,
    refreshChats,
    touchChat,
  };
}
