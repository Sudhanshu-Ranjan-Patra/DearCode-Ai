// features/chat/ChatWindow.jsx
// Orchestrates the full chat view: message list + input + empty state

import { useRef, useEffect } from "react";
import MessageBubble from "../../components/MessageBubble";
import ChatInput from "../../components/ChatInput";

const EMPTY_STATE_COPY = {
  girlfriend: {
    eyebrow: "Companion Workspace",
    title: "Start a thoughtful conversation",
    description: "Talk naturally, ask for perspective, or pick a prompt to begin without the interface feeling scripted.",
    chips: [
      "How was your day?",
      "I need emotional clarity",
      "Can we talk something through?",
      "Give me your honest take",
    ],
  },
  bestfriend: {
    eyebrow: "Friend Chat",
    title: "Pick up the conversation",
    description: "Keep it casual, ask for advice, or use a starter that feels more like a real back-and-forth.",
    chips: [
      "Bro, I need advice",
      "Tell me the truth straight",
      "Help me decide this",
      "I need to vent for a minute",
    ],
  },
  motivator: {
    eyebrow: "Focus Desk",
    title: "Open a focused session",
    description: "Use this space for planning, accountability, or direct guidance on what to do next.",
    chips: [
      "Plan my next 3 hours",
      "Push me to focus",
      "Break this goal into steps",
      "What should I prioritize today?",
    ],
  },
};

/**
 * Props:
 *  messages      Array<{ id, role, content, timestamp }>
 *  streamText    string   (current streaming token buffer)
 *  isStreaming   boolean
 *  inputValue    string
 *  assistantLabel string
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
  assistantLabel = "DearCode AI",
  onInputChange,
  onSend,
  onStop,
  onChipClick,
  onAttachFiles,
  attachments = [],
  onRemoveAttachment,
  canRecallLast = false,
  onRecallLast,
  isRecallingLast = false,
  onCancelRecall,
  canSend = false,
  selectedCharacter = "girlfriend",
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
        <EmptyState
          assistantLabel={assistantLabel}
          selectedCharacter={selectedCharacter}
          onChipClick={onChipClick}
        />
      ) : (
        <div className="messages-list">
          <div className="messages-inner">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id ?? i}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                label={assistantLabel}
                isStreaming={false}
              />
            ))}

            {/* Live streaming bubble or Typing indicator */}
            {isStreaming && (
              streamText ? (
                <MessageBubble
                  role="assistant"
                  content={streamText}
                  label={assistantLabel}
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
            onAttachFiles={onAttachFiles}
            attachments={attachments}
            onRemoveAttachment={onRemoveAttachment}
            canRecallLast={canRecallLast}
            onRecallLast={onRecallLast}
            isRecallingLast={isRecallingLast}
            onCancelRecall={onCancelRecall}
            canSend={canSend}
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
function EmptyState({ selectedCharacter, onChipClick }) {
  const copy = EMPTY_STATE_COPY[selectedCharacter] || EMPTY_STATE_COPY.girlfriend;

  return (
    <div className="messages-list">
      <div className="messages-inner empty-state-shell">
        <div className="empty-state-board">
          <div className="empty-state-copy">
            <div className="empty-state-eyebrow">{copy.eyebrow}</div>
            <h2>{copy.title}</h2>
            <p>{copy.description}</p>
          </div>

          <div className="empty-state-tip">
            Start with a natural message, or use one of the quick prompts.
          </div>

          <div className="empty-state-chips">
            {copy.chips.map((chip) => (
              <button
                key={chip}
                className="empty-chip"
                onClick={() => onChipClick?.(chip)}
                type="button"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .empty-state-shell {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 28px 20px 12px;
        }
        .empty-state-board {
          width: min(760px, 100%);
          margin: 0 auto;
          padding: 8px 6px;
          animation: emptyFade .24s ease;
        }
        @keyframes emptyFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        .empty-state-copy {
          max-width: 620px;
        }
        .empty-state-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #7ff3de;
          font-family: 'Syne', sans-serif;
        }
        .empty-state-copy h2 {
          margin-top: 14px;
          font-size: clamp(1.45rem, 3vw, 1.95rem);
          color: #f5f5fa;
          line-height: 1.12;
          font-weight: 700;
        }
        .empty-state-copy p {
          margin-top: 12px;
          color: #a5a6b8;
          font-size: 14px;
          line-height: 1.65;
        }
        .empty-state-tip {
          margin-top: 18px;
          font-size: 13px;
          line-height: 1.6;
          color: #8f91a8;
        }
        .empty-state-chips {
          margin-top: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .empty-chip {
          padding: 11px 16px;
          border-radius: 999px;
          border: 1px solid #343548;
          background: rgba(20,20,29,.72);
          color: #d7d8e6;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: transform .16s ease, border-color .16s ease, background .16s ease;
          font-family: 'Syne', sans-serif;
        }
        .empty-chip:hover {
          transform: translateY(-1px);
          border-color: rgba(56,232,198,.38);
          background: rgba(56,232,198,.06);
          color: #f8fffe;
        }
        @media (max-width: 640px) {
          .empty-state-shell {
            padding-top: 18px;
          }
          .empty-state-copy h2 {
            font-size: 1.5rem;
          }
          .empty-state-chips {
            flex-direction: column;
          }
          .empty-chip {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
