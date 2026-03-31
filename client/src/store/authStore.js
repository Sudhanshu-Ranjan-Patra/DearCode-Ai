import { create } from "zustand";

export const useAuthStore = create((set) => ({
  status: "loading",
  user: null,
  globalMemory: null,
  authError: null,
  sessionNotice: null,
  setStatus: (status) => set({ status }),
  setUser: (user) => set({ user, status: user ? "authenticated" : "anonymous", authError: null }),
  setGlobalMemory: (globalMemory) => set({ globalMemory }),
  clearUser: () => set({ user: null, globalMemory: null, status: "anonymous" }),
  setAuthError: (authError) => set({ authError }),
  clearAuthError: () => set({ authError: null }),
  setSessionNotice: (sessionNotice) => set({ sessionNotice }),
  clearSessionNotice: () => set({ sessionNotice: null }),
}));
