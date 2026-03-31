function getAvatarKey(userId) {
  return `profile-avatar:${userId}`;
}

export function loadStoredAvatar(userId) {
  if (!userId || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(getAvatarKey(userId)) || "";
  } catch {
    return "";
  }
}

export function saveStoredAvatar(userId, avatarDataUrl) {
  if (!userId || typeof window === "undefined") return;
  try {
    if (avatarDataUrl) {
      window.localStorage.setItem(getAvatarKey(userId), avatarDataUrl);
    } else {
      window.localStorage.removeItem(getAvatarKey(userId));
    }
  } catch {
    // ignore storage failures
  }
}
