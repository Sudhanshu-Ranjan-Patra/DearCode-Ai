// components/TopBar.jsx
// App header: sidebar toggle, chat title, streaming indicator, model selector, theme toggle

import { useState } from "react";

const MODELS = [
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash", tag: "Free" },
  { id: "x-ai/grok-beta",                  label: "Grok Beta",         tag: "Fast" },
  { id: "anthropic/claude-3-haiku",         label: "Claude Haiku",      tag: "Smart" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B", tag: "Free" },
];

/**
 * Props:
 *  chatTitle    string
 *  isStreaming  boolean
 *  model        string  (model id)
 *  onModelChange (modelId: string) => void
 *  onToggleSidebar () => void
 *  onNewChat    () => void
 */
export default function TopBar({
  chatTitle = "New Chat",
  isStreaming = false,
  model = MODELS[0].id,
  onModelChange,
  onToggleSidebar,
  onNewChat,
}) {
  const [modelOpen, setModelOpen] = useState(false);
  const current = MODELS.find((m) => m.id === model) || MODELS[0];

  return (
    <header className="topbar">
      {/* Left: sidebar toggle */}
      <button className="topbar-btn" onClick={onToggleSidebar} title="Toggle sidebar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Title */}
      <h1 className="topbar-title">{chatTitle}</h1>

      {/* Streaming pill */}
      {isStreaming && (
        <div className="stream-pill">
          <span className="stream-dot" />
          Generating…
        </div>
      )}

      {/* Right: model picker + new chat */}
      <div className="topbar-right">
        {/* Model selector */}
        <div className="model-selector" onClick={() => setModelOpen((p) => !p)}>
          <span className="model-live-dot" />
          <span className="model-label">{current.label}</span>
          <span className="model-tag">{current.tag}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ marginLeft: 4, opacity: .5, transition: "transform .2s",
                     transform: modelOpen ? "rotate(180deg)" : "none" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>

          {modelOpen && (
            <div className="model-dropdown">
              {MODELS.map((m) => (
                <div
                  key={m.id}
                  className={`model-option ${m.id === model ? "selected" : ""}`}
                  onClick={(e) => { e.stopPropagation(); onModelChange?.(m.id); setModelOpen(false); }}
                >
                  <span className="opt-dot" />
                  <span className="opt-label">{m.label}</span>
                  <span className="opt-tag">{m.tag}</span>
                  {m.id === model && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="#38e8c6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New chat shortcut */}
        <button className="topbar-btn accent" onClick={onNewChat} title="New chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .topbar {
          height: 54px; display: flex; align-items: center; gap: 10px;
          padding: 0 14px;
          border-bottom: 1px solid #1e1e2e;
          background: rgba(9,9,15,.85);
          backdrop-filter: blur(14px);
          position: sticky; top: 0; z-index: 20;
          font-family: 'Syne', sans-serif;
          flex-shrink: 0;
        }

        .topbar-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: #13131e; border: 1px solid #1e1e2e;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #5a5a7a; flex-shrink: 0;
          transition: all .15s;
        }
        .topbar-btn:hover { border-color: #7c6af7; color: #7c6af7; }
        .topbar-btn.accent:hover {
          background: rgba(124,106,247,.1);
          border-color: #7c6af7; color: #c4bbff;
        }

        .topbar-title {
          font-size: 13.5px; font-weight: 700; color: #e2e2f0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          flex: 1;
        }

        .stream-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 11px; border-radius: 99px;
          background: rgba(56,232,198,.07);
          border: 1px solid rgba(56,232,198,.2);
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: #38e8c6; white-space: nowrap;
          animation: slideIn .25s ease;
        }
        @keyframes slideIn { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
        .stream-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #38e8c6; box-shadow: 0 0 6px #38e8c6;
          animation: sDot 1s ease-in-out infinite;
        }
        @keyframes sDot { 0%,100%{opacity:1} 50%{opacity:.3} }

        .topbar-right { display: flex; align-items: center; gap: 6px; margin-left: auto; }

        /* Model selector */
        .model-selector {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 11px; border-radius: 10px;
          background: #13131e; border: 1px solid #1e1e2e;
          cursor: pointer; position: relative;
          font-size: 12px; color: #c4bbff;
          transition: border-color .15s;
          user-select: none;
        }
        .model-selector:hover { border-color: #7c6af7; }

        .model-live-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
          background: #38e8c6; box-shadow: 0 0 6px #38e8c6;
          animation: sDot 2s ease-in-out infinite;
        }
        .model-label { font-weight: 600; }
        .model-tag {
          font-size: 9px; font-family: 'JetBrains Mono', monospace;
          background: rgba(124,106,247,.15); border: 1px solid rgba(124,106,247,.2);
          border-radius: 99px; padding: 1px 6px; color: #9d93f5;
        }

        /* Dropdown */
        .model-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0;
          background: #13131e; border: 1px solid #1e1e2e;
          border-radius: 12px; min-width: 210px;
          box-shadow: 0 16px 40px rgba(0,0,0,.6);
          overflow: hidden;
          animation: dropIn .18s ease;
          z-index: 99;
        }
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }

        .model-option {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; font-size: 12px; color: #9a9ab0;
          cursor: pointer; transition: background .1s;
        }
        .model-option:hover { background: rgba(124,106,247,.08); color: #e2e2f0; }
        .model-option.selected { color: #e2e2f0; background: rgba(56,232,198,.05); }

        .opt-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
          background: #2a2a3e;
        }
        .model-option.selected .opt-dot { background: #38e8c6; box-shadow: 0 0 5px #38e8c6; }
        .opt-label { flex: 1; font-weight: 600; }
        .opt-tag {
          font-size: 9px; font-family: 'JetBrains Mono', monospace;
          background: #0f0f18; border: 1px solid #1e1e2e;
          border-radius: 99px; padding: 1px 6px; color: #5a5a7a;
        }
      `}</style>
    </header>
  );
}