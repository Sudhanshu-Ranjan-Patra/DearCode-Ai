

import { useState, useEffect, useCallback } from "react";
import { chatService } from "../services/chatService";
import { useChatStore } from "../store/chatStore";
import { getDeviceId } from "../utils/memory";

export function useChatHistory() {
  const selectedCharacter = useChatStore(s => s.selectedCharacter);
  const chatsByCharacter = useChatStore(s => s.chatsByCharacter);
  const setChatsForCharacter = useChatStore(s => s.setChatsForCharacter);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const chats = chatsByCharacter[selectedCharacter] || [];

  // ── Load all chats on mount ──────────────────────────────────────────────
  const refreshChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chatService.getChats(selectedCharacter, getDeviceId());
      setChatsForCharacter(selectedCharacter, data);
    } catch (err) {
      console.error("[useChatHistory] fetch error:", err);
      setError("Failed to load chat history.");
    } finally {
      setLoading(false);
    }
  }, [selectedCharacter, setChatsForCharacter]);

  useEffect(() => {
    refreshChats();
  }, [selectedCharacter, refreshChats]);

  // ── Select / load a chat 
  const selectChat = useCallback(async (id) => {
    try {
      const messages = await chatService.getChatMessages(id, getDeviceId());
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

      const newChat = await chatService.createChat({ 
        title, 
        character: selectedCharacter, 
        deviceId: getDeviceId() 
      });
      const currentChats = chatsByCharacter[selectedCharacter] || [];
      setChatsForCharacter(selectedCharacter, [newChat, ...currentChats]);
      return newChat._id;
    } catch (err) {
      console.error("[useChatHistory] create error:", err);
      setError("Failed to create chat.");
      return null;
    }
  }, [selectedCharacter, chatsByCharacter, setChatsForCharacter]);

  // ── Delete a chat ────────────────────────────────────────────────────────
  const deleteChat = useCallback(async (id) => {
      try {
        await chatService.deleteChat(id, getDeviceId());
        const currentChats = chatsByCharacter[selectedCharacter] || [];
        setChatsForCharacter(selectedCharacter, currentChats.filter(c => c._id !== id));
      } catch (err) {
        if (err.message.includes("404")) {
          const currentChats = chatsByCharacter[selectedCharacter] || [];
          setChatsForCharacter(selectedCharacter, currentChats.filter(c => c._id !== id));
          return;
        }
        console.error("[useChatHistory] delete error:", err);
        setError("Failed to delete chat.");
      }
    },
    [selectedCharacter, chatsByCharacter, setChatsForCharacter],
  );

  // ── Rename a chat ────────────────────────────────────────────────────────
  const renameChat = useCallback(async (id, title) => {
    try {
      await chatService.updateChat(id, { title }, getDeviceId());
      const currentChats = chatsByCharacter[selectedCharacter] || [];
      setChatsForCharacter(selectedCharacter, currentChats.map((c) => (c._id === id ? { ...c, title } : c)));
    } catch (err) {
      console.error("[useChatHistory] rename error:", err);
    }
  }, [selectedCharacter, chatsByCharacter, setChatsForCharacter]);

  // ── Update updatedAt / messageCount optimistically ───────────────────────
  const touchChat = useCallback((id, delta = {}) => {
    const currentChats = chatsByCharacter[selectedCharacter] || [];
    const updatedChats = currentChats
        .map((c) =>
          c._id === id
            ? { ...c, updatedAt: new Date().toISOString(), ...delta }
            : c,
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    setChatsForCharacter(selectedCharacter, updatedChats);
  }, [selectedCharacter, chatsByCharacter, setChatsForCharacter]);

  return {
    chats,
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
