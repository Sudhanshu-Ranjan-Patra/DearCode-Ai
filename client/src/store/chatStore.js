import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

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
      setActiveChatId: (id) => set({ activeChatId: id }),
      
      selectedCharacter: "girlfriend",
      setSelectedCharacter: (char) => set({ selectedCharacter: char }),

      // ── Input ─────────────────────────────────────────────────────────────
      inputValue: "",
      setInputValue: (v) => set({ inputValue: v }),
      clearInput: () => set({ inputValue: "" }),

      // ── Model ─────────────────────────────────────────────────────────────
      model: DEFAULT_MODEL,
      setModel: (m) => set({ model: m }),

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
    }),
    {
      name: "codeai-chat-store",       // persisted in localStorage
      partialize: (s) => ({            // only persist non-sensitive fields
        sidebarOpen: s.sidebarOpen,
        model:       s.model,
        theme:       s.theme,
        selectedCharacter: s.selectedCharacter,
      }),
    }
  )
);