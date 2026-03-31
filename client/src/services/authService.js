import { getDeviceId } from "../utils/memory";
import { AUTH_API_BASE } from "./apiBase";

async function authRequest(path, options = {}) {
  const res = await fetch(`${AUTH_API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    try {
      const parsed = JSON.parse(body);
      throw new Error(parsed.error || parsed.message || `API ${res.status}`);
    } catch {
      throw new Error(body || `API ${res.status}`);
    }
  }

  if (res.status === 204) return null;
  return res.json();
}

export const authService = {
  register: ({ name, email, password, deviceId = getDeviceId() }) =>
    authRequest("/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, deviceId }),
    }),

  login: ({ email, password, deviceId = getDeviceId() }) =>
    authRequest("/login", {
      method: "POST",
      body: JSON.stringify({ email, password, deviceId }),
    }),

  forgotPassword: ({ email }) =>
    authRequest("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: ({ token, password }) =>
    authRequest("/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  syncMemory: ({ deviceId = getDeviceId(), globalMemory }) =>
    authRequest("/sync-memory", {
      method: "POST",
      body: JSON.stringify({ deviceId, globalMemory }),
    }),

  getMemory: () =>
    authRequest("/memory"),

  updateProfile: (payload) =>
    authRequest("/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  changePassword: ({ currentPassword, newPassword }) =>
    authRequest("/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  logout: () =>
    authRequest("/logout", { method: "POST" }),

  me: () =>
    authRequest("/me"),
};
