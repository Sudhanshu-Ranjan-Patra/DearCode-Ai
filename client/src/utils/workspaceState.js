import { getMemoryOwnerKey } from "./memory";

const DEFAULT_WORKSPACE_SNAPSHOT = {
  sidebarOpen: true,
  theme: "dark",
  selectedCharacter: "girlfriend",
  lastActiveChats: {
    girlfriend: null,
    bestfriend: null,
    motivator: null,
  },
};

function getWorkspaceKey(ownerKey = "guest") {
  return `workspaceState:${ownerKey}`;
}

export function getDefaultWorkspaceSnapshot() {
  return {
    ...DEFAULT_WORKSPACE_SNAPSHOT,
    lastActiveChats: { ...DEFAULT_WORKSPACE_SNAPSHOT.lastActiveChats },
  };
}

export function loadWorkspaceSnapshot(ownerKey = "guest") {
  try {
    const raw = localStorage.getItem(getWorkspaceKey(ownerKey));
    if (!raw) return getDefaultWorkspaceSnapshot();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultWorkspaceSnapshot(),
      ...parsed,
      lastActiveChats: {
        ...DEFAULT_WORKSPACE_SNAPSHOT.lastActiveChats,
        ...(parsed?.lastActiveChats || {}),
      },
    };
  } catch {
    return getDefaultWorkspaceSnapshot();
  }
}

export function saveWorkspaceSnapshot(snapshot, ownerKey = "guest") {
  try {
    localStorage.setItem(
      getWorkspaceKey(ownerKey),
      JSON.stringify({
        ...getDefaultWorkspaceSnapshot(),
        ...snapshot,
        lastActiveChats: {
          ...DEFAULT_WORKSPACE_SNAPSHOT.lastActiveChats,
          ...(snapshot?.lastActiveChats || {}),
        },
      })
    );
  } catch {
    // ignore storage failures
  }
}

export function clearWorkspaceSnapshot(ownerKey = "guest") {
  try {
    localStorage.removeItem(getWorkspaceKey(ownerKey));
  } catch {
    // ignore storage failures
  }
}

export function migrateGuestWorkspaceToUser(user, currentSnapshot = {}) {
  const userOwnerKey = getMemoryOwnerKey(user);
  const guestSnapshot = loadWorkspaceSnapshot("guest");
  const userSnapshot = loadWorkspaceSnapshot(userOwnerKey);

  const merged = {
    ...getDefaultWorkspaceSnapshot(),
    ...guestSnapshot,
    ...userSnapshot,
    ...currentSnapshot,
    lastActiveChats: {
      ...DEFAULT_WORKSPACE_SNAPSHOT.lastActiveChats,
      ...(guestSnapshot.lastActiveChats || {}),
      ...(userSnapshot.lastActiveChats || {}),
      ...(currentSnapshot.lastActiveChats || {}),
    },
  };

  saveWorkspaceSnapshot(merged, userOwnerKey);
  clearWorkspaceSnapshot("guest");
  return merged;
}
