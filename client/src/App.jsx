// App.jsx
// Root component — wires together Sidebar, TopBar, ChatWindow, hooks & store.

import { useEffect, useCallback } from "react";
import Sidebar    from "./components/Sidebar";
import TopBar     from "./components/TopBar";
import ChatWindow from "./features/chat/ChatWindow";
import { useChatStore }   from "./store/chatStore";
import { useChatHistory } from "./hooks/useChatHistory";
import { useChatStream }  from "./hooks/useChatStream";

export default function App() {
  // ── Global store ───────
  const {
    sidebarOpen, toggleSidebar,
    activeChatId, setActiveChatId,
    inputValue, setInputValue, clearInput,
    model, setModel,
    selectedCharacter, setSelectedCharacter,
    globalError, clearError,
    resetForNewChat,
  } = useChatStore();

  // ── Chat history (REST) 
  const {
    chats,
    selectChat, createChat, deleteChat, touchChat,
  } = useChatHistory();

  // ── Chat streaming ─────
  const {
    messages, streamText, isStreaming, error: streamError,
    sendMessage, stopStream, clearMessages, setMessages,
  } = useChatStream(model);

  // Bubble stream error into global store
  useEffect(() => {
    if (streamError) useChatStore.getState().setError(streamError);
  }, [streamError]);

  // ── Handlers ───────────

  /** Select an existing chat from sidebar */
  const handleSelectChat = useCallback(async (id) => {
    const msgs = await selectChat(id);
    setMessages(msgs.map((m) => ({
      id:        m._id,
      role:      m.role,
      content:   m.content,
      timestamp: m.createdAt,
    })));
    clearInput();
  }, [selectChat, setMessages, clearInput]);

  /** Create and switch to a brand-new chat */
  const handleNewChat = useCallback(async () => {
    resetForNewChat();
    clearMessages();
    // Chat record is created lazily when the first message is sent
  }, [resetForNewChat, clearMessages]);

  const handleCharacterChange = useCallback((charId) => {
    setSelectedCharacter(charId);
    handleNewChat(); // Ensure UI cleans slate when character brain swaps
  }, [setSelectedCharacter, handleNewChat]);

  /** Send a message (or use chip text directly) */
  const handleSend = useCallback(async (overrideText) => {
    const text = (typeof overrideText === "string" ? overrideText : inputValue).trim();
    if (!text) return;

    // Create a DB chat session on first message in a new session
    let chatId = activeChatId;
    if (!chatId) {
      chatId = await createChat(text);
      setActiveChatId(chatId);
    }

    clearInput();
    await sendMessage(text, chatId);

    // Keep sidebar title fresh
    touchChat(chatId, {
      title:        text.slice(0, 42) + (text.length > 42 ? "…" : ""),
      messageCount: (messages.length + 2),
    });
  }, [inputValue, activeChatId, createChat, setActiveChatId,
      clearInput, sendMessage, touchChat, messages.length]);

  // ── Render ─────────────
  const activeChat = chats.find((c) => c._id === activeChatId);

  return (
    <>
      <div className="app-layout">
        <Sidebar
          chats={chats.map((c) => ({ ...c, id: c._id?.toString() }))}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={deleteChat}
          model={model.split("/").pop()}
          isOpen={sidebarOpen}
        />

        <div className="app-main">
          {/* Mobile backdrop for sidebar */}
          {sidebarOpen && (
            <div className="sidebar-backdrop" onClick={toggleSidebar} />
          )}
          <TopBar
            chatTitle={activeChat?.title || "New Chat"}
            isStreaming={isStreaming}
            model={model}
            selectedCharacter={selectedCharacter}
            onCharacterChange={handleCharacterChange}
            onModelChange={setModel}
            onToggleSidebar={toggleSidebar}
            onNewChat={handleNewChat}
          />

          {/* Global error banner */}
          {globalError && (
            <div className="error-banner">
              ⚠ {globalError}
              <button onClick={clearError}>✕</button>
            </div>
          )}

          <ChatWindow
            messages={messages}
            streamText={streamText}
            isStreaming={isStreaming}
            inputValue={inputValue}
            model={model.split("/").pop()}
            onInputChange={setInputValue}
            onSend={handleSend}
            onStop={stopStream}
            onChipClick={handleSend}
          />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; }

        .app-layout {
          display: flex;
          height: 100dvh; width: 100vw;
          background: #09090f;
          font-family: 'Syne', sans-serif;
          color: #e2e2f0;
          overflow: hidden;
        }

        .sidebar-backdrop { display: none; }
        @media (max-width: 768px) {
          .sidebar-backdrop {
            display: block; position: fixed; inset: 0;
            background: rgba(0,0,0,0.6); z-index: 5;
            backdrop-filter: blur(2px);
            animation: fadeIn .2s;
          }
        }

        .app-main {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden; min-width: 0;
        }

        .error-banner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 20px;
          background: rgba(239,68,68,.1);
          border-bottom: 1px solid rgba(239,68,68,.25);
          font-size: 13px; color: #fca5a5;
          font-family: 'JetBrains Mono', monospace;
          animation: slideDown .2s ease;
          flex-shrink: 0;
        }
        @keyframes slideDown { from{transform:translateY(-100%);opacity:0} to{transform:none;opacity:1} }
        .error-banner button {
          background: none; border: none; color: #fca5a5;
          cursor: pointer; font-size: 14px; padding: 0 4px;
          opacity: .7; transition: opacity .15s;
        }
        .error-banner button:hover { opacity: 1; }

        /* scrollbars globally */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 99px; }
      `}</style>
    </>
  );
}