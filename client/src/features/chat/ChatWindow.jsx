// features/chat/ChatWindow.jsx
// Orchestrates the full chat view: message list + input + empty state

import { useRef, useEffect } from "react";
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

          {/* Live streaming bubble */}
          {isStreaming && streamText && (
            <MessageBubble
              role="assistant"
              content={streamText}
              model={model}
              isStreaming
            />
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      )}

      {/* ── Input ── */}
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');

        .chat-window {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          background: #09090f;
        }

        /* subtle dot-grid texture */
        .chat-window::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(124,106,247,.06) 1px, transparent 1px);
          background-size: 28px 28px;
          z-index: 0;
        }

        .messages-list {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0 8px;
          display: flex; flex-direction: column; gap: 2px;
          position: relative; z-index: 1;
        }
        .messages-list::-webkit-scrollbar { width: 3px; }
        .messages-list::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 99px; }
      `}</style>
    </div>
  );
}

// ── Empty / Welcome state ────────────────────────────────────────────────────
function EmptyState({ onChipClick }) {
  return (
    <div className="empty-state">
      <div className="es-glow-ring">
        <div className="es-logo">∆</div>
      </div>
      <h2 className="es-title">What can I help you build?</h2>
      <p className="es-sub">
        Ask about streaming, MongoDB schemas, OpenRouter setup,<br />
        Zustand patterns, or anything in your LLM chatbot stack.
      </p>

      <div className="es-chips">
        {PROMPT_CHIPS.map((chip) => (
          <button
            key={chip}
            className="es-chip"
            onClick={() => onChipClick?.(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="es-features">
        {[
          { icon: "⚡", label: "Real-Time Streaming" },
          { icon: "🗄️", label: "MongoDB Memory" },
          { icon: "🔀", label: "Multi-Model" },
        ].map((f) => (
          <div key={f.label} className="es-feature">
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');

        .empty-state {
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 40px 24px; gap: 18px;
          position: relative; z-index: 1;
          font-family: 'Syne', sans-serif;
        }

        .es-glow-ring {
          width: 90px; height: 90px; border-radius: 22px;
          background: linear-gradient(135deg, #7c6af7, #38e8c6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 50px rgba(124,106,247,.4), 0 0 100px rgba(56,232,198,.15);
          animation: esFloat 4s ease-in-out infinite;
        }
        @keyframes esFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .es-logo { font-size: 34px; font-weight: 900; color: #fff; }

        .es-title {
          font-size: 24px; font-weight: 800; color: #e2e2f0;
          text-align: center; margin: 0;
        }
        .es-sub {
          font-size: 13px; color: #5a5a7a; text-align: center;
          line-height: 1.7; margin: 0;
        }

        .es-chips {
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 8px; max-width: 560px;
        }
        .es-chip {
          padding: 8px 15px; border-radius: 99px;
          border: 1px solid #1e1e2e;
          background: #0f0f18;
          font-size: 12px; color: #7a7a9a;
          cursor: pointer; font-family: 'Syne', sans-serif;
          transition: all .18s; text-align: left;
        }
        .es-chip:hover {
          border-color: rgba(124,106,247,.5);
          color: #c4bbff;
          background: rgba(124,106,247,.07);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124,106,247,.15);
        }

        .es-features {
          display: flex; gap: 12px; flex-wrap: wrap;
          justify-content: center;
        }
        .es-feature {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 13px; border-radius: 99px;
          background: #0f0f18; border: 1px solid #1e1e2e;
          font-size: 11px; color: #5a5a7a;
        }
      `}</style>
    </div>
  );
}