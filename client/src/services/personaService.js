import { getDeviceId } from "../utils/memory";
import { PERSONA_API_BASE } from "./apiBase";

async function personaRequest(path = "", options = {}) {
  const res = await fetch(`${PERSONA_API_BASE}${path}`, {
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

  return res.json();
}

export const personaService = {
  listProfiles: ({ deviceId = getDeviceId() } = {}) =>
    personaRequest(`?deviceId=${encodeURIComponent(deviceId)}`),

  saveProfile: (character, payload, { deviceId = getDeviceId() } = {}) =>
    personaRequest(`/${character}`, {
      method: "PUT",
      body: JSON.stringify({ ...payload, deviceId }),
    }),
};
