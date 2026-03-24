// components/MessageBubble.jsx
// Renders a single chat message with markdown-like formatting, copy button, timestamps

import { useState } from "react";

/**
 * Props:
 *  role        'user' | 'assistant'
 *  content     string  (supports **bold**, `code`, ```fences```)
 *  timestamp   Date | string
 *  isStreaming boolean  (shows blinking cursor on last assistant bubble)
 *  model       string   (e.g. "Gemini 2.0 Flash")
 */
export default function MessageBubble({
  role = "assistant",
  content = "",
  timestamp,
  isStreaming = false,
  model = "",
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── minimal markdown parser ───────────────────────────────────────────────
  const renderContent = (text) => {
    const lines = text.split("\n");
    const output = [];
    let inCode = false;
    let codeLang = "";
    let codeLines = [];
    let key = 0;

    const flushCode = () => {
      output.push(
        <div className="code-block" key={key++}>
          {codeLang && <div className="code-lang">{codeLang}</div>}
          <pre><code>{codeLines.join("\n")}</code></pre>
          <CopyCodeBtn text={codeLines.join("\n")} />
        </div>
      );
      codeLines = [];
      codeLang = "";
    };

    lines.forEach((line) => {
      if (line.startsWith("```")) {
        if (inCode) { flushCode(); inCode = false; }
        else { inCode = true; codeLang = line.slice(3).trim(); }
        return;
      }
      if (inCode) { codeLines.push(line); return; }

      // inline bold + inline code
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      const rendered = parts.map((p, j) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={j}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`"))
          return <code className="inline-code" key={j}>{p.slice(1, -1)}</code>;
        return p;
      });

      output.push(
        <p className="msg-line" key={key++}>
          {rendered}
        </p>
      );
    });

    return output;
  };

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`bubble-row ${role}`}>
      {/* Avatar (Assistant Only) */}
      {role === "assistant" && (
        <div className="avatar assistant">
          ∆
        </div>
      )}

      {/* Bubble */}
      <div className={`bubble ${role}`}>
        {/* Header (assistant only) */}
        {role === "assistant" && (
          <div className="bubble-header">
            <span className="bubble-model">{model || "AI"}</span>
            {time && <span className="bubble-time">{time}</span>}
            <button
              className={`copy-btn ${copied ? "copied" : ""}`}
              onClick={copyToClipboard}
              title="Copy response"
            >
              {copied ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bubble-content">
          {renderContent(content)}
          {isStreaming && <span className="cursor" />}
        </div>

        {/* User timestamp */}
        {role === "user" && time && (
          <div className="user-time">{time}</div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

        .bubble-row {
          display: flex;
          align-items: flex-start;
          padding: 8px 16px;
          gap: 16px;
          animation: bubbleIn .22s ease;
          font-family: 'Syne', sans-serif;
          width: 100%;
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
        .bubble-row.user { 
          flex-direction: row-reverse; 
          padding: 8px 16px;
        }

        /* Avatar */
        .avatar {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800;
          flex-shrink: 0; margin-top: 4px;
        }
        .avatar.assistant {
          background: #3f3f46; /* zinc-700 */
          color: #fff;
        }

        /* Bubble */
        .bubble {
          font-size: 15px; line-height: 1.7;
          position: relative;
        }
        .bubble.assistant {
          flex: 1;
          min-width: 0; /* Prevent overflow */
          background: transparent;
          border: none;
          padding: 4px 0 12px;
          color: #d4d4d8;
        }
        .bubble.user {
          max-width: min(680px, 85%);
          background: #3f3f46; /* zinc-700 */
          border: none;
          border-radius: 20px;
          padding: 12px 18px;
          color: #f4f4f5;
        }

        /* Header row (assistant) */
        .bubble-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding-bottom: 7px;
          border-bottom: 1px solid #1e1e2e;
        }
        .bubble-model {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          color: #38e8c6;
          letter-spacing: .06em;
          font-weight: 500;
        }
        .bubble-time {
          font-size: 10px;
          color: #3a3a5a;
          font-family: 'JetBrains Mono', monospace;
          margin-left: auto;
        }

        .copy-btn {
          display: flex; align-items: center; gap: 4px;
          background: none; border: 1px solid #1e1e2e;
          border-radius: 6px; padding: 3px 7px;
          color: #5a5a7a; cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          transition: all .15s;
        }
        .copy-btn:hover { border-color: #7c6af7; color: #7c6af7; }
        .copy-btn.copied { border-color: #38e8c6; color: #38e8c6; }

        /* Content */
        .bubble-content { color: #d4d4e8; }
        .msg-line { margin: 3px 0; }
        .msg-line:empty { height: 6px; }

        .inline-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          background: rgba(124,106,247,.1);
          border: 1px solid rgba(124,106,247,.2);
          border-radius: 5px;
          padding: 1px 6px;
          color: #b8b0ff;
        }

        /* Code block */
        .code-block {
          position: relative;
          margin: 10px 0;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #1e1e2e;
        }
        .code-lang {
          background: #0a0a14;
          padding: 5px 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: #38e8c6;
          letter-spacing: .08em;
          border-bottom: 1px solid #1e1e2e;
        }
        .code-block pre {
          background: #06060d;
          padding: 14px; margin: 0;
          overflow-x: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; line-height: 1.65;
          color: #a6e3a1;
        }
        .code-block pre code { background: none; border: none; padding: 0; color: inherit; }

        /* User timestamp */
        .user-time {
          font-size: 10px; color: #3a3a5a;
          font-family: 'JetBrains Mono', monospace;
          text-align: right; margin-top: 6px;
        }

        /* Streaming cursor */
        .cursor {
          display: inline-block; width: 2px; height: 14px;
          background: #38e8c6; margin-left: 2px;
          vertical-align: middle;
          animation: blink .7s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// ── inline copy button for code blocks ──────────────────────────────────────
function CopyCodeBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button
      onClick={copy}
      style={{
        position: "absolute", top: 34, right: 10,
        background: done ? "rgba(56,232,198,.12)" : "rgba(255,255,255,.05)",
        border: `1px solid ${done ? "rgba(56,232,198,.3)" : "#2a2a3e"}`,
        borderRadius: 6, padding: "3px 8px",
        color: done ? "#38e8c6" : "#5a5a7a",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, cursor: "pointer",
        transition: "all .15s",
      }}
    >
      {done ? "✓ Copied" : "Copy"}
    </button>
  );
}