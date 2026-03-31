import { useEffect, useCallback, useState } from "react";
import Sidebar    from "./components/Sidebar";
import TopBar     from "./components/TopBar";
import AuthScreen from "./components/AuthScreen";
import PersonaSettingsModal from "./components/PersonaSettingsModal";
import ProfileSettingsModal from "./components/ProfileSettingsModal";
import ChatWindow from "./features/chat/ChatWindow";
import { authService } from "./services/authService";
import { personaService } from "./services/personaService";
import { useAuthStore } from "./store/authStore";
import { useChatStore }   from "./store/chatStore";
import { useChatHistory } from "./hooks/useChatHistory";
import { useChatStream }  from "./hooks/useChatStream";
import { saveGlobalMemory } from "./utils/memory";
import { loadStoredAvatar, saveStoredAvatar } from "./utils/profileState";
import {
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
} from "./utils/workspaceState";

const CHARACTER_LABELS = {
  girlfriend: "Girlfriend",
  bestfriend: "Best Friend",
  motivator: "Motivator",
};

const TEXT_ATTACHMENT_LIMIT = 6000;
const TEXT_FILE_EXTENSIONS = [
  "txt", "md", "js", "jsx", "ts", "tsx", "json", "html", "css", "scss",
  "py", "java", "c", "cpp", "h", "hpp", "csv", "xml", "yml", "yaml",
];

function formatBytes(size) {
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextFile(file) {
  if (file.type?.startsWith("text/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return TEXT_FILE_EXTENSIONS.includes(ext);
}

async function buildAttachment(file) {
  const sizeLabel = formatBytes(file.size);
  const base = {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    sizeLabel,
  };

  if (isTextFile(file)) {
    const rawText = await file.text();
    const text = rawText.slice(0, TEXT_ATTACHMENT_LIMIT);
    const truncated = rawText.length > TEXT_ATTACHMENT_LIMIT;
    return {
      ...base,
      kind: "text",
      promptChunk: [
        `Attached file: ${file.name} (${sizeLabel})`,
        "```",
        text,
        truncated ? "\n[Truncated for length]" : "",
        "```",
      ].join("\n"),
    };
  }

  return {
    ...base,
    kind: "binary",
    promptChunk: `Attached file: ${file.name} (${file.type || "binary"}, ${sizeLabel}). The file content is not directly readable in this chat, but treat it as referenced context from the user.`,
  };
}

function getCurrentPathState() {
  if (typeof window === "undefined") {
    return { pathname: "/", resetToken: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    pathname: window.location.pathname || "/",
    resetToken: params.get("resetToken") || params.get("token") || "",
  };
}

function replaceAppPath(pathname, resetToken = "") {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.pathname = pathname;
  url.search = "";
  if (resetToken) {
    url.searchParams.set("resetToken", resetToken);
  }
  window.history.replaceState({}, "", url.toString());
}

export default function App() {
  const {
    status,
    user,
    setStatus,
    setUser,
    clearUser,
    sessionNotice,
    clearSessionNotice,
  } = useAuthStore();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [pathState, setPathState] = useState(() => getCurrentPathState());

  useEffect(() => {
    const onPopState = () => {
      setPathState(getCurrentPathState());
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const navigate = useCallback((pathname, resetToken = "") => {
    replaceAppPath(pathname, resetToken);
    setPathState(getCurrentPathState());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      setStatus("loading");
      try {
        const response = await authService.me();
        if (!cancelled) {
          const mergedUser = {
            ...response.user,
            avatarDataUrl: response.user?.avatarDataUrl || loadStoredAvatar(response.user?._id),
          };
          setUser(mergedUser);
          const memoryResponse = await authService.getMemory();
          const ownerKey = `user:${response.user._id}`;
          saveGlobalMemory(memoryResponse.memory, ownerKey);
          useAuthStore.getState().setGlobalMemory(memoryResponse.memory);
          useChatStore.getState().applyWorkspaceSnapshot(loadWorkspaceSnapshot(ownerKey));
        }
      } catch {
        if (!cancelled) {
          clearUser();
          useChatStore.getState().applyWorkspaceSnapshot(loadWorkspaceSnapshot("guest"));
        }
      } finally {
        if (!cancelled) {
          setBootstrapped(true);
        }
      }
    }

    bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, [setStatus, setUser, clearUser]);

  useEffect(() => {
    if (user && pathState.pathname === "/reset-password") {
      navigate("/");
    }
  }, [user, pathState.pathname, navigate]);

  useEffect(() => {
    if (!sessionNotice) return undefined;

    const timer = window.setTimeout(() => {
      clearSessionNotice();
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [sessionNotice, clearSessionNotice]);

  if (!bootstrapped || status === "loading") {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <AuthScreen
        initialView={pathState.pathname === "/reset-password" ? "reset" : "login"}
        initialResetToken={pathState.resetToken}
        onNavigate={navigate}
        sessionNotice={sessionNotice}
        onDismissSessionNotice={clearSessionNotice}
      />
    );
  }

  return (
    <ChatWorkspace
      user={user}
      onLoggedOut={clearUser}
      sessionNotice={sessionNotice}
      onDismissSessionNotice={clearSessionNotice}
    />
  );
}

function ChatWorkspace({ user, onLoggedOut, sessionNotice, onDismissSessionNotice }) {
  // ── Global store ───────
  const {
    sidebarOpen, toggleSidebar,
    activeChatId, setActiveChatId,
    inputValue, setInputValue, clearInput,
    selectedCharacter, setSelectedCharacter,
    globalError, clearError,
    resetForNewChat,
    resetChatState,
    getWorkspaceSnapshot,
    theme,
    lastActiveChats,
  } = useChatStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isRecallingLast, setIsRecallingLast] = useState(false);
  const [lastSubmittedText, setLastSubmittedText] = useState("");
  const [personaProfiles, setPersonaProfiles] = useState({});
  const [personaCatalog, setPersonaCatalog] = useState({});
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [personaSaving, setPersonaSaving] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ── Chat history (REST) 
  const {
    chats,
    selectChat, createChat, deleteChat, touchChat,
  } = useChatHistory();

  // ── Chat streaming ─────
  const {
    messages, streamText, isStreaming, error: streamError,
    sendMessage, stopStream, clearMessages, setMessages,
  } = useChatStream();

  // Bubble stream error into global store
  useEffect(() => {
    if (streamError) useChatStore.getState().setError(streamError);
  }, [streamError]);

  useEffect(() => {
    const ownerKey = user?._id ? `user:${user._id}` : "guest";
    saveWorkspaceSnapshot({
      sidebarOpen,
      theme,
      selectedCharacter,
      lastActiveChats,
    }, ownerKey);
  }, [user?._id, sidebarOpen, theme, selectedCharacter, lastActiveChats]);

  useEffect(() => {
    let cancelled = false;

    async function loadPersonaProfiles() {
      try {
        const response = await personaService.listProfiles();
        if (cancelled) return;
        setPersonaProfiles(response.profiles || {});
        setPersonaCatalog(response.catalog || {});
      } catch (err) {
        if (!cancelled) {
          useChatStore.getState().setError(err.message || "Failed to load persona settings");
        }
      }
    }

    loadPersonaProfiles();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

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
    setAttachments([]);
    setIsRecallingLast(false);
    setLastSubmittedText("");
  }, [selectChat, setMessages, clearInput]);

  /** Create and switch to a brand-new chat */
  const handleNewChat = useCallback(async () => {
    resetForNewChat();
    clearMessages();
    setAttachments([]);
    setIsRecallingLast(false);
    setLastSubmittedText("");
    // Chat record is created lazily when the first message is sent
  }, [resetForNewChat, clearMessages]);

  const handleCharacterChange = useCallback((charId) => {
    setSelectedCharacter(charId);
    
    // Use fresh state directly to avoid closure stale state
    const currentLastChats = useChatStore.getState().lastActiveChats || {};
    const lastId = currentLastChats[charId];

    if (lastId) {
      handleSelectChat(lastId);
    } else {
      handleNewChat(); // Ensure UI cleans slate if no history
    }
  }, [setSelectedCharacter, handleSelectChat, handleNewChat]);

  /** Send a message (or use chip text directly) */
  const handleSend = useCallback(async (overrideText) => {
    const rawText = (typeof overrideText === "string" ? overrideText : inputValue).trim();
    if (!rawText && !attachments.length) return;
    const text = rawText || "Please use the attached file context.";
    const attachmentContext = attachments.length
      ? `\n\nAttached file context:\n${attachments.map((attachment) => attachment.promptChunk).join("\n\n")}`
      : "";
    const outboundText = `${text}${attachmentContext}`;

    // Create a DB chat session on first message in a new session
    let chatId = activeChatId;
    if (!chatId) {
      chatId = await createChat(text);
      setActiveChatId(chatId);
    }

    setLastSubmittedText(rawText);
    setIsRecallingLast(false);
    clearInput();
    setAttachments([]);
    await sendMessage(outboundText, chatId);

    // Keep sidebar title fresh
    touchChat(chatId, {
      title:        text.slice(0, 42) + (text.length > 42 ? "…" : ""),
      messageCount: (messages.length + 2),
    });
  }, [inputValue, attachments, activeChatId, createChat, setActiveChatId,
      clearInput, sendMessage, touchChat, messages.length]);

  const handleAttachFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    try {
      const built = await Promise.all(files.map(buildAttachment));
      setAttachments((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...built.filter((item) => !seen.has(item.id))];
      });
    } catch (err) {
      useChatStore.getState().setError(err.message || "Failed to attach file");
    }
  }, []);

  const handleRemoveAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const handleRecallLast = useCallback(() => {
    if (!lastSubmittedText || inputValue.trim()) return;
    setInputValue(lastSubmittedText);
    setAttachments([]);
    setIsRecallingLast(true);
  }, [inputValue, lastSubmittedText, setInputValue]);

  const handleInputChange = useCallback((nextValue) => {
    setInputValue(nextValue);
    if (!nextValue.trim()) return;
    setIsRecallingLast(false);
  }, [setInputValue]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      saveWorkspaceSnapshot(getWorkspaceSnapshot(), `user:${user._id}`);
      await authService.logout();
    } catch (err) {
      useChatStore.getState().setError(err.message || "Failed to log out");
      setLoggingOut(false);
      return;
    }

    resetChatState();
    clearMessages();
    setAttachments([]);
    setIsRecallingLast(false);
    setLastSubmittedText("");
    useChatStore.getState().applyWorkspaceSnapshot(loadWorkspaceSnapshot("guest"));
    useAuthStore.getState().setSessionNotice({
      tone: "info",
      message: "You’re logged out. Your guest workspace is ready whenever you want to return.",
    });
    onLoggedOut();
    setLoggingOut(false);
  }, [clearMessages, onLoggedOut, resetChatState, user, getWorkspaceSnapshot]);

  const handleSavePersonaProfile = useCallback(async (character, payload) => {
    setPersonaSaving(true);
    try {
      const response = await personaService.saveProfile(character, payload);
      setPersonaProfiles((prev) => ({
        ...prev,
        [character]: response.profile,
      }));
      useAuthStore.getState().setSessionNotice({
        tone: "success",
        message: `${response.profile.agentName} is updated for your ${CHARACTER_LABELS[character]?.toLowerCase() || "persona"} chats.`,
      });
      setPersonaModalOpen(false);
    } catch (err) {
      useChatStore.getState().setError(err.message || "Failed to save persona settings");
    } finally {
      setPersonaSaving(false);
    }
  }, []);

  const handleSaveProfile = useCallback(async (payload) => {
    setProfileSaving(true);
    try {
      const response = await authService.updateProfile(payload);
      const mergedUser = {
        ...response.user,
        avatarDataUrl: response.user?.avatarDataUrl ?? payload.avatarDataUrl ?? "",
      };
      saveStoredAvatar(mergedUser._id, mergedUser.avatarDataUrl);
      useAuthStore.getState().setUser(mergedUser);
      useAuthStore.getState().setSessionNotice({
        tone: "success",
        message: "Your profile has been updated.",
      });
      setProfileModalOpen(false);
    } catch (err) {
      useChatStore.getState().setError(err.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  }, []);

  const handleChangePassword = useCallback(async ({ currentPassword, newPassword }) => {
    setPasswordSaving(true);
    try {
      const response = await authService.changePassword({ currentPassword, newPassword });
      if (response?.user) {
        useAuthStore.getState().setUser(response.user);
      }
      useAuthStore.getState().setSessionNotice({
        tone: "success",
        message: response?.message || "Password updated successfully.",
      });
      setProfileModalOpen(false);
    } catch (err) {
      useChatStore.getState().setError(err.message || "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  }, []);

  const assistantLabel = personaProfiles[selectedCharacter]?.agentName
    || CHARACTER_LABELS[selectedCharacter]
    || "DearCode AI";

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
          isOpen={sidebarOpen}
          user={user}
          sessionNotice={sessionNotice}
        />

        <div className="app-main">
          {/* Mobile backdrop for sidebar */}
          {sidebarOpen && (
            <div className="sidebar-backdrop" onClick={toggleSidebar} />
          )}
          <TopBar
            chatTitle={activeChat?.title || "New Chat"}
            isStreaming={isStreaming}
            selectedCharacter={selectedCharacter}
            onCharacterChange={handleCharacterChange}
            onToggleSidebar={toggleSidebar}
            onNewChat={handleNewChat}
            user={user}
            onLogout={handleLogout}
            loggingOut={loggingOut}
            sessionNotice={sessionNotice}
            onDismissSessionNotice={onDismissSessionNotice}
            personaProfiles={personaProfiles}
            onOpenPersonaSettings={() => setPersonaModalOpen(true)}
            onOpenProfileSettings={() => setProfileModalOpen(true)}
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
            assistantLabel={assistantLabel}
            selectedCharacter={selectedCharacter}
            onInputChange={handleInputChange}
            onSend={handleSend}
            onStop={stopStream}
            onChipClick={handleSend}
            onAttachFiles={handleAttachFiles}
            attachments={attachments}
            onRemoveAttachment={handleRemoveAttachment}
            canRecallLast={Boolean(lastSubmittedText)}
            onRecallLast={handleRecallLast}
            isRecallingLast={isRecallingLast}
            onCancelRecall={() => {
              setIsRecallingLast(false);
              clearInput();
            }}
            canSend={Boolean(inputValue.trim() || attachments.length)}
          />
        </div>
      </div>

      {personaModalOpen && (
        <PersonaSettingsModal
          open={personaModalOpen}
          initialCharacter={selectedCharacter}
          profiles={personaProfiles}
          catalog={personaCatalog}
          saving={personaSaving}
          onClose={() => setPersonaModalOpen(false)}
          onSave={handleSavePersonaProfile}
        />
      )}

      {profileModalOpen && (
        <ProfileSettingsModal
          open={profileModalOpen}
          user={user}
          saving={profileSaving}
          passwordSaving={passwordSaving}
          loggingOut={loggingOut}
          onClose={() => setProfileModalOpen(false)}
          onSaveProfile={handleSaveProfile}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
        />
      )}

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

function LoadingScreen() {
  return (
    <>
      <div className="app-loading-screen">
        <div className="app-loading-panel">
          <div className="app-loading-orb" />
          <h1>Restoring your session</h1>
          <p>Checking account access and loading the chat workspace.</p>
        </div>
      </div>

      <style>{`
        .app-loading-screen {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at top, rgba(124,106,247,.16), transparent 28%),
            linear-gradient(180deg, #09090f 0%, #12121a 100%);
          padding: 24px;
        }

        .app-loading-panel {
          width: min(440px, 100%);
          padding: 34px 28px;
          border-radius: 24px;
          border: 1px solid #272733;
          background: rgba(17,17,26,.86);
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,.35);
        }

        .app-loading-orb {
          width: 54px;
          height: 54px;
          margin: 0 auto 20px;
          border-radius: 999px;
          background: conic-gradient(from 180deg, #38e8c6, #7c6af7, #38e8c6);
          animation: spin 1.1s linear infinite;
        }

        .app-loading-panel h1 {
          font-size: 1.5rem;
          color: #f4f4f5;
        }

        .app-loading-panel p {
          margin-top: 8px;
          color: #a1a1aa;
        }
      `}</style>
    </>
  );
}
