// features/chat/ChatWindow.jsx
// Orchestrates the full chat view: message list + input + empty state

import { useRef, useEffect, useState } from "react";
import MessageBubble from "../../components/MessageBubble";
import ChatInput from "../../components/ChatInput";

const PROMPT_CHIPS = [
  "How do I set up SSE streaming with Express?",
  "Write a Mongoose schema for chat history",
  "OpenRouter API integration example",
  "Zustand store for multi-chat state",
  "Rate limiting middleware with express-rate-limit",
  "React custom hook for streaming responses",
];

/**
 * Props:
 *  messages      Array<{ id, role, content, timestamp }>
 *  streamText    string   (current streaming token buffer)
 *  isStreaming   boolean
 *  inputValue    string
 *  model         string
 *  onInputChange (val) => void
 *  onSend        () => void
 *  onStop        () => void
 *  onChipClick   (text: string) => void
 */
export default function ChatWindow({
  messages = [],
  streamText = "",
  isStreaming = false,
  inputValue = "",
  model = "Gemini 2.0 Flash",
  onInputChange,
  onSend,
  onStop,
  onChipClick,
}) {
  const bottomRef = useRef(null);

  // auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="chat-window">
      {/* ── Messages or empty state ── */}
      {isEmpty ? (
        <EmptyState onChipClick={onChipClick} />
      ) : (
        <div className="messages-list">
          <div className="messages-inner">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id ?? i}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                model={model}
                isStreaming={false}
              />
            ))}

            {/* Live streaming bubble or Typing indicator */}
            {isStreaming && (
              streamText ? (
                <MessageBubble
                  role="assistant"
                  content={streamText}
                  model={model}
                  isStreaming
                />
              ) : (
                <div className="typing-indicator-container">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} style={{ height: 1 }} />
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div className="input-area">
        <div className="input-inner">
          <ChatInput
            value={inputValue}
            onChange={onInputChange}
            onSend={onSend}
            onStop={onStop}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');

        .chat-window {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          background: #18181b;
        }

        .messages-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px 0 8px;
          display: flex; flex-direction: column;
          position: relative; z-index: 1;
        }
        
        .messages-inner {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          display: flex; flex-direction: column; gap: 24px;
        }
        
        .input-area {
          flex-shrink: 0;
          background: linear-gradient(to top, #18181b 80%, transparent);
          padding-bottom: 12px;
        }
        
        .input-inner {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Typing Indicator */
        .typing-indicator-container {
          display: flex; gap: 5px; padding: 14px 20px;
          background: transparent; border: none;
          width: fit-content;
          margin: 10px 10px 10px 38px;
          align-items: center;
        }
        .typing-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #a1a1aa; opacity: 0.4;
          animation: typingPulse 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes typingPulse {
          0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ── Empty / Welcome state ────────────────────────────────────────────────────
function EmptyState({ onChipClick }) {
  const [stage, setStage] = useState("typing");

  useEffect(() => {
    // Simulate natural human delay
    const timer = setTimeout(() => setStage("ready"), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="messages-list">
      <div className="messages-inner">
        {stage === "typing" ? (
          <div className="typing-indicator-container">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        ) : (
          <div className="human-welcome-fade">
            <MessageBubble
              role="assistant"
              content="hey… tum aa gaye? 👀"
              isStreaming={false}
            />
            
            <div className="human-chips">
              <button className="h-chip" onClick={() => onChipClick?.("kya kar rahe ho?")}>kya kar rahe ho?</button>
              <button className="h-chip" onClick={() => onChipClick?.("bore ho rahe ho kya?")}>bore ho rahe ho kya?</button>
              <button className="h-chip" onClick={() => onChipClick?.("baat karein?")}>baat karein?</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .human-welcome-fade {
          animation: hFadeIn .4s ease forwards;
        }
        @keyframes hFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }

        .human-chips {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-top: 12px; margin-left: 48px;
        }
        .h-chip {
          padding: 8px 16px; border-radius: 20px;
          background: #27272a; border: 1px solid #3f3f46;
          color: #d4d4d8; font-size: 13.5px;
          cursor: pointer; transition: all .2s;
          font-family: inherit;
        }
        .h-chip:hover {
          background: #3f3f46; border-color: #525252;
          color: #f4f4f5; transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}