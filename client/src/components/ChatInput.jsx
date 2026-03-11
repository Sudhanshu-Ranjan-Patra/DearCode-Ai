// components/ChatInput.jsx
// Handles user text input, auto-resize, send on Enter, stop streaming

import { useRef, useEffect } from "react";

export default function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
}) {
  const taRef = useRef(null);

  // auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [value]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) onSend();
    }
  };

  return (
    <div className="chat-input-wrapper">
      <div className={`chat-input-box ${isStreaming ? "streaming" : ""}`}>
        {/* Attach icon */}
        <button className="input-icon-btn" title="Attach file" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={taRef}
          rows={1}
          value={value}
          placeholder="Ask anything about your codebase…"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          className="chat-textarea"
        />

        {/* character hint */}
        {value.length > 200 && (
          <span className="char-count">{value.length}</span>
        )}

        {/* Send / Stop */}
        {isStreaming ? (
          <button className="action-btn stop-btn" onClick={onStop} title="Stop generation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            className="action-btn send-btn"
            onClick={onSend}
            disabled={!value.trim() || disabled}
            title="Send message"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        )}
      </div>

      <p className="input-hint">
        <kbd>Enter</kbd> send · <kbd>Shift+Enter</kbd> newline · <kbd>↑</kbd> edit last
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .chat-input-wrapper {
          padding: 10px 20px 18px;
          background: linear-gradient(to top, #09090f 65%, transparent);
          font-family: 'Syne', sans-serif;
        }

        .chat-input-box {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: #0f0f18;
          border: 1px solid #1e1e2e;
          border-radius: 16px;
          padding: 10px 10px 10px 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .chat-input-box:focus-within,
        .chat-input-box.streaming {
          border-color: rgba(124,106,247,.5);
          box-shadow: 0 0 0 3px rgba(124,106,247,.07), 0 0 24px rgba(124,106,247,.2);
        }

        .input-icon-btn {
          width: 32px; height: 32px;
          background: none; border: none;
          color: #5a5a7a; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px;
          transition: color .2s, background .2s;
          flex-shrink: 0;
        }
        .input-icon-btn:hover { color: #e2e2f0; background: rgba(255,255,255,.05); }

        .chat-textarea {
          flex: 1;
          background: none; border: none; outline: none;
          color: #e2e2f0;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          line-height: 1.65;
          resize: none;
          max-height: 180px;
          min-height: 24px;
        }
        .chat-textarea::placeholder { color: #3a3a5a; }
        .chat-textarea:disabled { opacity: .5; }

        .char-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: #5a5a7a;
          align-self: flex-end; padding-bottom: 6px;
          flex-shrink: 0;
        }

        .action-btn {
          width: 36px; height: 36px;
          border-radius: 10px; border: none;
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all .2s;
        }

        .send-btn {
          background: linear-gradient(135deg, #7c6af7, #5b4ee0);
          color: #fff;
          box-shadow: 0 2px 10px rgba(124,106,247,.4);
        }
        .send-btn:hover:not(:disabled) {
          transform: scale(1.06);
          box-shadow: 0 4px 18px rgba(124,106,247,.55);
        }
        .send-btn:disabled { opacity: .3; cursor: not-allowed; transform: none; }

        .stop-btn {
          background: rgba(239,68,68,.12);
          border: 1px solid rgba(239,68,68,.3);
          color: #ef4444;
        }
        .stop-btn:hover { background: rgba(239,68,68,.22); }

        .input-hint {
          font-size: 10px; color: #3a3a5a;
          font-family: 'JetBrains Mono', monospace;
          text-align: center;
          margin-top: 7px;
          letter-spacing: .02em;
        }
        .input-hint kbd {
          background: #1e1e2e; border: 1px solid #2a2a3e;
          border-radius: 4px; padding: 1px 5px;
          font-size: 9px; color: #7c6af7;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}