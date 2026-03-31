// components/TopBar.jsx
// App header: sidebar toggle, chat title, streaming indicator, character picker, account actions

import { useState } from "react";

const CHARACTERS = [
  { id: "girlfriend", icon: "", label: "Girlfriend" },
  { id: "bestfriend", icon: "", label: "Best Friend" },
  { id: "motivator", icon: "", label: "Mentor" },
];

const CHARACTER_AVATARS = {
  girlfriend: { accent: "linear-gradient(135deg, #ff8fb7, #ff5f9e)", badge: "G" },
  bestfriend: { accent: "linear-gradient(135deg, #5ea2ff, #38e8c6)", badge: "F" },
  motivator: { accent: "linear-gradient(135deg, #ffb347, #ff6b2c)", badge: "M" },
};

/**
 * Props:
 *  chatTitle    string
 *  isStreaming  boolean
 *  selectedCharacter string
 *  onCharacterChange (charId: string) => void
 *  onToggleSidebar () => void
 *  onNewChat    () => void
 */
export default function TopBar({
  chatTitle = "New Chat",
  isStreaming = false,
  selectedCharacter = "girlfriend",
  onCharacterChange,
  onToggleSidebar,
  onNewChat,
  user,
  onLogout,
  loggingOut = false,
  sessionNotice = null,
  onDismissSessionNotice = () => {},
  personaProfiles = {},
  onOpenPersonaSettings,
  onOpenProfileSettings,
}) {
  const [characterOpen, setCharacterOpen] = useState(false);
  const currentChar = CHARACTERS.find((c) => c.id === selectedCharacter) || CHARACTERS[0];
  const currentName = personaProfiles[selectedCharacter]?.agentName || currentChar.label;
  const currentAvatar = CHARACTER_AVATARS[selectedCharacter] || CHARACTER_AVATARS.girlfriend;

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
      <div className="topbar-title persona-header-chip" title={chatTitle}>
        <div
          className="persona-avatar"
          style={{ background: currentAvatar.accent }}
        >
          {currentAvatar.badge}
        </div>
        <div className="persona-header-copy">
          <span className="persona-header-name">{currentName}</span>
          <span className="persona-header-role">{currentChar.label}</span>
        </div>
      </div>

      {/* Streaming pill */}
      {isStreaming && (
        <div className="stream-pill">
          <span className="stream-dot" />
          Generating…
        </div>
      )}

      {sessionNotice?.message && !isStreaming && (
        <div className={`stream-pill auth-status-pill ${sessionNotice.tone || "info"}`}>
          <span className="stream-dot" />
          <span className="auth-status-copy">{sessionNotice.message}</span>
          <button
            type="button"
            className="auth-status-dismiss"
            onClick={onDismissSessionNotice}
            title="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Center: Currently empty */}
      <div className="topbar-center">
      </div>

      {/* Right: character picker + new chat + account */}
      <div className="topbar-right">
        {/* Character selector dropdown */}
        <div className="model-selector" onClick={() => setCharacterOpen((p) => !p)}>
          <span className="model-live-dot" />
          <span className="model-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{currentChar.icon}</span>
            <span>{currentChar.label}</span>
          </span>
          <span className="model-tag">{currentName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ marginLeft: 4, opacity: .5, transition: "transform .2s",
                     transform: characterOpen ? "rotate(180deg)" : "none" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>

          {characterOpen && (
            <div className="model-dropdown">
              {CHARACTERS.map((c) => (
                <div
                  key={c.id}
                  className={`model-option ${c.id === selectedCharacter ? "selected" : ""}`}
                  onClick={(e) => { e.stopPropagation(); onCharacterChange?.(c.id); setCharacterOpen(false); }}
                >
                  <span className="char-icon" style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{c.icon}</span>
                  <span className="opt-label">{c.label}</span>
                  <span className="opt-tag">{personaProfiles[c.id]?.agentName || c.label}</span>
                  {c.id === selectedCharacter && (
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

        <button
          className="topbar-btn"
          onClick={onOpenPersonaSettings}
          title="Persona settings"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.8 3.7 4.1.6-3 2.9.7 4.1-3.6-1.9-3.6 1.9.7-4.1-3-2.9 4.1-.6L12 3z" />
            <circle cx="12" cy="12" r="2.2" />
          </svg>
        </button>

        <div
          className="account-chip"
          title={user?.email || "Account"}
          onClick={onOpenProfileSettings}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenProfileSettings?.();
            }
          }}
        >
          <div className="account-avatar">
            {user?.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt={user?.name || "Account"} />
            ) : (
              (user?.name || "U").slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="account-copy">
            <span className="account-name">{user?.name || "Account"}</span>
            <span className="account-email">{user?.mood || user?.email || ""}</span>
          </div>
          <button
            type="button"
            className="account-logout"
            onClick={(event) => {
              event.stopPropagation();
              onLogout?.();
            }}
            disabled={loggingOut}
            title="Log out"
          >
            {loggingOut ? (
              <>
                <span className="logout-spinner" aria-hidden="true" />
                <span>Signing out</span>
              </>
            ) : "Log out"}
          </button>
        </div>
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
          flex: 1;
          min-width: 0;
        }
        .persona-header-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .persona-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(0,0,0,.22);
          flex-shrink: 0;
        }
        .persona-header-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .persona-header-name,
        .persona-header-role {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .persona-header-name {
          font-size: 14px;
          font-weight: 700;
          color: #e7e7f4;
        }
        .persona-header-role {
          font-size: 10px;
          color: #7f819f;
          font-family: 'JetBrains Mono', monospace;
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
        .auth-status-pill {
          max-width: 320px;
        }
        .auth-status-copy {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .auth-status-pill.success {
          background: rgba(56,232,198,.07);
          border-color: rgba(56,232,198,.2);
          color: #38e8c6;
        }
        .auth-status-pill.info {
          background: rgba(124,106,247,.1);
          border-color: rgba(124,106,247,.22);
          color: #cfc9ff;
        }
        .auth-status-dismiss {
          border: none;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          opacity: .72;
          padding: 0;
        }
        .auth-status-dismiss:hover {
          opacity: 1;
        }
        @keyframes slideIn { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
        .stream-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #38e8c6; box-shadow: 0 0 6px #38e8c6;
          animation: sDot 1s ease-in-out infinite;
        }
        @keyframes sDot { 0%,100%{opacity:1} 50%{opacity:.3} }

        .topbar-center {
          flex: 1; display: flex; justify-content: center;
        }
        
        .character-switch {
          display: flex; align-items: center; gap: 4px;
          background: #13131e; border: 1px solid #1e1e2e;
          padding: 4px; border-radius: 99px;
        }

        .char-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 99px;
          border: none; background: transparent; cursor: pointer;
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600;
          color: #5a5a7a; transition: all .2s;
        }
        
        .char-tab:hover { color: #9a9ab0; }
        
        .char-tab.active {
          background: rgba(124,106,247,.15); color: #c4bbff;
          box-shadow: inset 0 0 0 1px rgba(124,106,247,.3);
        }

        .char-icon { font-size: 14px; }
        @media (max-width: 768px) {
          .char-label { display: none; }
          .char-tab { padding: 6px 10px; }
        }

        .topbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

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

        .account-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 6px 5px 5px;
          border-radius: 12px;
          background: #13131e;
          border: 1px solid #1e1e2e;
          max-width: 280px;
          cursor: pointer;
        }
        .account-avatar {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: linear-gradient(135deg, #7c6af7, #38e8c6);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
          overflow: hidden;
        }
        .account-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .account-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .account-name,
        .account-email {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .account-name {
          font-size: 11px;
          color: #e2e2f0;
          font-weight: 700;
        }
        .account-email {
          font-size: 9px;
          color: #6d6d88;
          font-family: 'JetBrains Mono', monospace;
        }
        .account-logout {
          border: 1px solid #2a2a3e;
          background: #0f0f18;
          color: #b7b7c9;
          border-radius: 9px;
          padding: 7px 10px;
          font-size: 11px;
          cursor: pointer;
          transition: all .15s;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .account-logout:hover:not(:disabled) {
          color: #fff;
          border-color: #7c6af7;
        }
        .account-logout:disabled {
          opacity: .6;
          cursor: wait;
        }
        .logout-spinner {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          border: 2px solid rgba(228,228,231,.18);
          border-top-color: #e4e4e7;
          animation: spinOut .7s linear infinite;
        }
        @keyframes spinOut {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 860px) {
          .persona-header-role { display: none; }
          .account-copy { display: none; }
          .account-chip {
            max-width: none;
          }
        }
      `}</style>
    </header>
  );
}
