// hooks/useChatStream.js
// Custom hook that manages SSE streaming from the backend /api/chat endpoint.
// Appends tokens to streamText in real-time, then finalises into messages[].

import { useState, useRef, useCallback } from "react";
import { chatService } from "../services/chatService";
import { loadGlobalMemory, saveGlobalMemory, updateMemoryFromMessage, getDeviceId } from "../utils/memory";
import { useChatStore } from "../store/chatStore";

/**
 * Returns:
 *  messages      Array<{ id, role, content, timestamp }>
 *  streamText    string   (live token buffer while streaming)
 *  isStreaming   boolean
 *  error         string | null
 *  sendMessage   (text: string, chatId: string) => Promise<void>
 *  stopStream    () => void
 *  clearMessages () => void
 *  setMessages   setter
 */
export function useChatStream(model = "google/gemini-2.0-flash-001") {
  const [messages, setMessages]     = useState([]);
  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError]           = useState(null);

  const abortCtrlRef = useRef(null);
  const streamRef    = useRef("");   // mirror of streamText without re-render lag

  const stopStream = useCallback(() => {
    abortCtrlRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamText("");
    setError(null);
  }, []);

  /**
   * sendMessage – appends user message, opens SSE stream, collects tokens,
   * then commits the final assistant message.
   */
  const sendMessage = useCallback(
    async (text, chatId) => {
      if (!text.trim() || isStreaming) return;

      setError(null);

      // 1. Optimistically add user message
      const userMsg = {
        id:        `user-${Date.now()}`,
        role:      "user",
        content:   text.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // 2. Build conversation history for the API
      const history = [...messages, userMsg]
        .filter((m) => m.content && typeof m.content === "string" && m.content.trim() !== "")
        .map((m) => ({
          role:    m.role,
          content: m.content,
        }));

      // 3. Update global local storage memory
      const currentMemory = loadGlobalMemory();
      const updatedMemory = updateMemoryFromMessage(text, currentMemory);
      saveGlobalMemory(updatedMemory);
      
      const deviceId = getDeviceId();

      // 4. Start streaming
      setIsStreaming(true);
      streamRef.current = "";
      setStreamText("");

      abortCtrlRef.current = new AbortController();

      try {
        await chatService.streamChat(
          {
            messages: history,
            model,
            chatId,
            globalMemory: updatedMemory,
            deviceId,
            character: useChatStore.getState().selectedCharacter,
          },
          // onToken callback
          (token) => {
            streamRef.current += token;
            setStreamText(streamRef.current);
          },
          abortCtrlRef.current.signal
        );

        // 4. Commit streamed response as a final message
        const assistantMsg = {
          id:        `assistant-${Date.now()}`,
          role:      "assistant",
          content:   streamRef.current,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        if (err.name === "AbortError") {
          // User stopped — still commit whatever was streamed
          if (streamRef.current) {
            setMessages((prev) => [
              ...prev,
              {
                id:        `assistant-${Date.now()}`,
                role:      "assistant",
                content:   streamRef.current + " _(stopped)_",
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        } else {
          console.error("[useChatStream] Stream error:", err);
          setError(err.message || "Something went wrong. Please try again.");
        }
      } finally {
        setStreamText("");
        streamRef.current = "";
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, model]
  );

  return {
    messages,
    streamText,
    isStreaming,
    error,
    sendMessage,
    stopStream,
    clearMessages,
    setMessages,
  };
}