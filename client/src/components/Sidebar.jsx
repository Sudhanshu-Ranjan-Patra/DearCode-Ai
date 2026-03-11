// components/Sidebar.jsx
// Multi-chat sidebar: new chat button, chat history list, model badge, user profile

/**
 * Props:
 *  chats        Array<{ id, title, updatedAt, messageCount }>
 *  activeChatId string | number
 *  onNewChat    () => void
 *  onSelectChat (id) => void
 *  onDeleteChat (id) => void
 *  model        string
 *  isOpen       boolean
 */

export default function Sidebar({
  chats = [],
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  model = "Gemini 2.0 Flash",
  isOpen = true,
}) {
  const grouped = groupByDate(chats);

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="brand-logo">∆</div>
        <div className="brand-text">
          <span className="brand-name">CodeAI</span>
          <span className="brand-tag">Assistant</span>
        </div>
      </div>

      {/* ── New Chat ── */}
      <button className="new-chat-btn" onClick={onNewChat}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New Chat
        <kbd className="shortcut">⌘N</kbd>
      </button>

      {/* ── Chat History ── */}
      <div className="history-scroll">
        {chats.length === 0 ? (
          <div className="empty-history">
            <div className="empty-history-icon">💬</div>
            <p>No conversations yet.<br />Start a new chat!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="history-group">
              <div className="group-label">{label}</div>
              {items.map((chat) => (
                <ChatHistoryItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  onSelect={() => onSelectChat(chat.id)}
                  onDelete={() => onDeleteChat?.(chat.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <ModelBadge model={model} />
        <div className="divider" />
        <UserProfile />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .sidebar {
          width: 260px; min-width: 260px;
          height: 100vh;
          display: flex; flex-direction: column;
          background: #0f0f18;
          border-right: 1px solid #1e1e2e;
          transition: transform .28s cubic-bezier(.4,0,.2,1), opacity .28s;
          overflow: hidden;
          font-family: 'Syne', sans-serif;
          position: relative;
          z-index: 10;
        }
        .sidebar.closed {
          transform: translateX(-100%);
          opacity: 0;
          pointer-events: none;
        }

        /* Brand */
        .sidebar-brand {
          display: flex; align-items: center; gap: 10px;
          padding: 18px 16px 14px;
          border-bottom: 1px solid #1e1e2e;
          flex-shrink: 0;
        }
        .brand-logo {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, #7c6af7, #38e8c6);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 900; color: #fff;
          box-shadow: 0 0 14px rgba(124,106,247,.4);
          flex-shrink: 0;
        }
        .brand-text { display: flex; flex-direction: column; }
        .brand-name { font-size: 14px; font-weight: 800; color: #e2e2f0; }
        .brand-tag  { font-size: 10px; color: #5a5a7a; font-family: 'JetBrains Mono', monospace; }

        /* New chat button */
        .new-chat-btn {
          margin: 12px;
          padding: 10px 14px;
          background: transparent;
          border: 1px dashed #2a2a3e;
          border-radius: 12px;
          color: #9d93f5; cursor: pointer;
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          transition: all .2s;
          flex-shrink: 0;
        }
        .new-chat-btn:hover {
          border-color: #7c6af7; border-style: solid;
          background: rgba(124,106,247,.08);
          color: #c4bbff;
          box-shadow: 0 0 14px rgba(124,106,247,.2);
        }
        .shortcut {
          margin-left: auto;
          background: #1a1a2e; border: 1px solid #2a2a3e;
          border-radius: 5px; padding: 2px 6px;
          font-size: 9px; font-family: 'JetBrains Mono', monospace;
          color: #5a5a7a;
        }

        /* History scroll */
        .history-scroll {
          flex: 1; overflow-y: auto; padding: 6px 8px;
        }
        .history-scroll::-webkit-scrollbar { width: 3px; }
        .history-scroll::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 99px; }

        .empty-history {
          display: flex; flex-direction: column; align-items: center;
          padding: 40px 20px; gap: 10px; text-align: center;
        }
        .empty-history-icon { font-size: 28px; opacity: .4; }
        .empty-history p {
          font-size: 12px; color: #3a3a5a; line-height: 1.6;
        }

        .history-group { margin-bottom: 4px; }
        .group-label {
          font-size: 9px; font-weight: 700;
          letter-spacing: .1em; text-transform: uppercase;
          color: #3a3a5a; padding: 8px 8px 4px;
        }

        /* Footer */
        .sidebar-footer { padding: 10px; flex-shrink: 0; }
        .divider { height: 1px; background: #1e1e2e; margin: 8px 0; }
      `}</style>
    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChatHistoryItem({ chat, isActive, onSelect, onDelete }) {
  return (
    <div className={`history-item ${isActive ? "active" : ""}`} onClick={onSelect}>
      <span className="item-dot" />
      <span className="item-title">{chat.title || "Untitled chat"}</span>
      {chat.messageCount > 0 && (
        <span className="item-count">{chat.messageCount}</span>
      )}
      <button
        className="item-delete"
        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        title="Delete chat"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <style>{`
        .history-item {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 9px; border-radius: 9px;
          cursor: pointer; font-size: 12.5px; color: #5a5a7a;
          transition: all .15s; position: relative;
          border: 1px solid transparent;
          overflow: hidden;
        }
        .history-item:hover { background: #13131e; color: #c4bbff; }
        .history-item:hover .item-delete { opacity: 1; }
        .history-item.active {
          background: rgba(124,106,247,.1);
          border-color: rgba(124,106,247,.2);
          color: #e2e2f0;
        }
        .item-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
          background: #2a2a3e; transition: all .15s;
        }
        .history-item.active .item-dot {
          background: #38e8c6;
          box-shadow: 0 0 6px #38e8c6;
        }
        .item-title {
          flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .item-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px; color: #3a3a5a;
          background: #13131e; border: 1px solid #1e1e2e;
          border-radius: 99px; padding: 1px 6px; flex-shrink: 0;
        }
        .item-delete {
          opacity: 0; flex-shrink: 0;
          background: none; border: none; cursor: pointer;
          color: #5a5a7a; padding: 2px;
          display: flex; align-items: center; justify-content: center;
          transition: opacity .15s, color .15s;
          border-radius: 4px;
        }
        .item-delete:hover { color: #ef4444; }
      `}</style>
    </div>
  );
}

function ModelBadge({ model }) {
  return (
    <div className="model-badge">
      <span className="model-pulse" />
      <div>
        <div className="model-name">{model}</div>
        <div className="model-via">via OpenRouter</div>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="#3a3a5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ marginLeft: "auto" }}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
      </svg>
      <style>{`
        .model-badge {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 10px; border-radius: 10px;
          background: #13131e; border: 1px solid #1e1e2e;
        }
        .model-pulse {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          background: #38e8c6; box-shadow: 0 0 8px #38e8c6;
          animation: mbPulse 2s ease-in-out infinite;
        }
        @keyframes mbPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .model-name { font-size: 11.5px; font-weight: 700; color: #c4bbff; }
        .model-via  { font-size: 9px; color: #3a3a5a; font-family: 'JetBrains Mono', monospace; }
      `}</style>
    </div>
  );
}

function UserProfile() {
  return (
    <div className="user-profile">
      <div className="user-avatar">D</div>
      <div>
        <div className="user-name">Developer</div>
        <div className="user-plan">Free Plan</div>
      </div>
      <button className="settings-btn" title="Settings">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
      <style>{`
        .user-profile {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border-radius: 10px;
          cursor: pointer; transition: background .15s;
        }
        .user-profile:hover { background: #13131e; }
        .user-avatar {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, #7c6af7, #5b4ee0);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #fff;
        }
        .user-name { font-size: 12px; font-weight: 700; color: #c4bbff; }
        .user-plan { font-size: 10px; color: #3a3a5a; font-family: 'JetBrains Mono', monospace; }
        .settings-btn {
          margin-left: auto; background: none; border: none;
          color: #3a3a5a; cursor: pointer; padding: 4px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px; transition: color .15s, background .15s;
        }
        .settings-btn:hover { color: #7c6af7; background: rgba(124,106,247,.1); }
      `}</style>
    </div>
  );
}

// ── Date grouping util ────────────────────────────────────────────────────────
function groupByDate(chats) {
  const now = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const lastWeek  = new Date(today); lastWeek.setDate(today.getDate() - 7);

  const groups = { Today: [], Yesterday: [], "Last 7 Days": [], Older: [] };

  chats.forEach((chat) => {
    const d = new Date(chat.updatedAt || Date.now());
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today)          groups["Today"].push(chat);
    else if (day >= yesterday) groups["Yesterday"].push(chat);
    else if (day >= lastWeek)  groups["Last 7 Days"].push(chat);
    else                       groups["Older"].push(chat);
  });

  // remove empty groups
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
}