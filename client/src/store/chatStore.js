import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useChatStore = create(
  persist(
    (set, get) => ({
      get,
      // ── UI state ──────────────────────────────────────────────────────────
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),

      // ── Active chat & Character ─────────────────────────────────────────────
      activeChatId: null,
      setActiveChatId: (id) => set((s) => ({
        activeChatId: id,
        lastActiveChats: { ...s.lastActiveChats, [s.selectedCharacter]: id }
      })),
      
      selectedCharacter: "girlfriend",
      setSelectedCharacter: (char) => set({ selectedCharacter: char }),

      // ── Chat Memory Caches ──────────────────────────────────────────────────
      chatsByCharacter: { girlfriend: [], bestfriend: [], motivator: [] },
      lastActiveChats: { girlfriend: null, bestfriend: null, motivator: null },
      setChatsForCharacter: (char, chats) => set((s) => ({
        chatsByCharacter: { ...s.chatsByCharacter, [char]: chats }
      })),
      getWorkspaceSnapshot: () => {
        const state = get();
        return {
          sidebarOpen: state.sidebarOpen,
          theme: state.theme,
          selectedCharacter: state.selectedCharacter,
          lastActiveChats: state.lastActiveChats,
        };
      },
      applyWorkspaceSnapshot: (snapshot = {}) => set((s) => ({
        sidebarOpen: snapshot.sidebarOpen ?? s.sidebarOpen,
        theme: snapshot.theme ?? s.theme,
        selectedCharacter: snapshot.selectedCharacter ?? s.selectedCharacter,
        lastActiveChats: snapshot.lastActiveChats
          ? { ...s.lastActiveChats, ...snapshot.lastActiveChats }
          : s.lastActiveChats,
      })),

      // ── Input ─────────────────────────────────────────────────────────────
      inputValue: "",
      setInputValue: (v) => set({ inputValue: v }),
      clearInput: () => set({ inputValue: "" }),

      // ── Error banner ──────────────────────────────────────────────────────
      globalError: null,
      setError: (msg) => set({ globalError: msg }),
      clearError: () => set({ globalError: null }),

      // ── Theme (future) ────────────────────────────────────────────────────
      theme: "dark",
      setTheme: (t) => set({ theme: t }),

      // ── Convenience: reset for new chat ───────────────────────────────────
      resetForNewChat: () =>
        set({ activeChatId: null, inputValue: "", globalError: null }),

      resetChatState: () =>
        set({
          activeChatId: null,
          inputValue: "",
          globalError: null,
          chatsByCharacter: { girlfriend: [], bestfriend: [], motivator: [] },
          lastActiveChats: { girlfriend: null, bestfriend: null, motivator: null },
          selectedCharacter: "girlfriend",
        }),
    }),
    {
      name: "codeai-chat-store",       // persisted in localStorage
      partialize: (s) => ({            // only persist non-sensitive fields
        sidebarOpen: s.sidebarOpen,
        theme:       s.theme,
        selectedCharacter: s.selectedCharacter,
      }),
    }
  )
);
