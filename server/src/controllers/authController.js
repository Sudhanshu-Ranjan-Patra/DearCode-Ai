import crypto from "crypto";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import GlobalMemory from "../models/GlobalMemory.js";
import {
  buildPasswordResetUrl,
  canSendEmail,
  sendPasswordResetEmail,
} from "../services/emailService.js";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
  getMemoryOwnerKey,
} from "../utils/auth.js";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i;
const MAX_AVATAR_DATA_URL_LENGTH = 3_000_000;

function sanitizeUser(user) {
  return user.toPublic ? user.toPublic() : user;
}

export function sanitizeProfileUpdatePayload(payload = {}) {
  const nextName = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : undefined;
  const nextEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : undefined;
  const nextMood = typeof payload.mood === "string" ? payload.mood.trim().slice(0, 60) : undefined;
  const nextBio = typeof payload.bio === "string" ? payload.bio.trim().slice(0, 280) : undefined;
  const nextLearningFocus = typeof payload.learningFocus === "string"
    ? payload.learningFocus.trim().slice(0, 120)
    : undefined;
  const nextAvatarDataUrl = typeof payload.avatarDataUrl === "string"
    ? payload.avatarDataUrl.trim()
    : undefined;

  if (nextName !== undefined && !nextName) {
    return { error: "Name is required" };
  }

  if (nextEmail !== undefined && (!nextEmail || !EMAIL_RE.test(nextEmail))) {
    return { error: "A valid email is required" };
  }

  if (nextAvatarDataUrl !== undefined && nextAvatarDataUrl !== "") {
    if (!IMAGE_DATA_URL_RE.test(nextAvatarDataUrl)) {
      return { error: "Profile photo must be a valid PNG, JPG, WEBP, or GIF image" };
    }
    if (nextAvatarDataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
      return { error: "Profile photo is too large" };
    }
  }

  return {
    value: {
      ...(nextName !== undefined ? { name: nextName } : {}),
      ...(nextEmail !== undefined ? { email: nextEmail } : {}),
      ...(nextMood !== undefined ? { mood: nextMood } : {}),
      ...(nextBio !== undefined ? { bio: nextBio } : {}),
      ...(nextLearningFocus !== undefined ? { learningFocus: nextLearningFocus } : {}),
      ...(nextAvatarDataUrl !== undefined ? { avatarDataUrl: nextAvatarDataUrl } : {}),
    },
  };
}

function setSessionCookie(res, user) {
  res.cookie(
    getSessionCookieName(),
    createSessionToken(user),
    getSessionCookieOptions()
  );
}

async function attachGuestConversationsToUser(userId, deviceId) {
  if (!deviceId) return;

  await Conversation.updateMany(
    { deviceId, userId: null },
    { $set: { userId } }
  );
}

function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(24).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return {
    rawToken,
    hashedToken,
    expiresAt: new Date(Date.now() + 1000 * 60 * 30),
  };
}

function isUserLocked(user) {
  return Boolean(user?.lockUntil && user.lockUntil.getTime() > Date.now());
}

function getLockoutMessage(user) {
  const lockMs = Math.max(0, user.lockUntil.getTime() - Date.now());
  const lockMinutes = Math.max(1, Math.ceil(lockMs / (60 * 1000)));
  return `Too many failed login attempts. Try again in ${lockMinutes} minute${lockMinutes === 1 ? "" : "s"}.`;
}

async function registerFailedLoginAttempt(user) {
  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const updates = {
    failedLoginAttempts: failedAttempts,
  };

  if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    updates.lockUntil = new Date(Date.now() + LOGIN_LOCK_WINDOW_MS);
    updates.failedLoginAttempts = 0;
  }

  await User.updateOne({ _id: user._id }, { $set: updates });
}

async function clearLoginSecurityState(user) {
  if (!user) return;

  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockUntil: null } }
  );
}

function mergeUniqueStrings(existing = [], incoming = []) {
  const seen = new Set();
  const merged = [];

  [...existing, ...incoming].forEach((value) => {
    const normalized = `${value || ""}`.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(normalized);
  });

  return merged;
}

function normalizePreferenceValues(values = []) {
  return values
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.value || "";
    })
    .filter(Boolean);
}

function normalizeFactValues(values = []) {
  return values
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.text || "";
    })
    .filter(Boolean);
}

function toPreferenceDocs(values = []) {
  return values.map((value) => ({ value, lastUsed: null }));
}

function toFactDocs(values = []) {
  return values.map((text) => ({ text, lastUsed: null, createdAt: new Date() }));
}

function serializeMemory(memory) {
  if (!memory) {
    return {
      userName: "",
      preferences: [],
      personalityTraits: [],
      importantMoments: [],
      relationshipStage: "early",
      interactionCount: 0,
      basicFacts: [],
    };
  }

  return {
    userName: memory.userName || "",
    preferences: normalizePreferenceValues(memory.preferences),
    personalityTraits: memory.personalityTraits || [],
    importantMoments: memory.importantMoments || [],
    relationshipStage: memory.relationshipStage || "early",
    interactionCount: memory.interactionCount || 0,
    basicFacts: normalizeFactValues(memory.basicFacts),
  };
}

async function upsertTrustedIdentityMemory(user, deviceId = null) {
  const userOwnerKey = getMemoryOwnerKey({ userId: user._id });

  await GlobalMemory.findOneAndUpdate(
    { deviceId: userOwnerKey },
    {
      $set: {
        userName: user.name,
        relationshipStage: "early",
        interactionCount: 0,
        lastUpdated: new Date(),
      },
      $setOnInsert: {
        basicFacts: [],
        preferences: [],
        personalityTraits: [],
        importantMoments: [],
      },
    },
    { upsert: true, new: true }
  );

  if (deviceId) {
    const guestOwnerKey = getMemoryOwnerKey({ deviceId });
    await GlobalMemory.findOneAndUpdate(
      { deviceId: guestOwnerKey },
      {
        $set: {
          userName: user.name,
          relationshipStage: "early",
          interactionCount: 0,
          lastUpdated: new Date(),
        },
        $setOnInsert: {
          basicFacts: [],
          preferences: [],
          personalityTraits: [],
          importantMoments: [],
        },
      },
      { upsert: true, new: true }
    );
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, deviceId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    await attachGuestConversationsToUser(user._id, deviceId);
    await upsertTrustedIdentityMemory(user, deviceId);
    setSessionCookie(res, user);

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, deviceId } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select("+password +failedLoginAttempts +lockUntil");
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (isUserLocked(user)) {
      return res.status(423).json({ error: getLockoutMessage(user) });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await registerFailedLoginAttempt(user);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await clearLoginSecurityState(user);
    await attachGuestConversationsToUser(user._id, deviceId);
    await upsertTrustedIdentityMemory(user, deviceId);
    setSessionCookie(res, user);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req, res) {
  const { path, sameSite, secure, httpOnly } = getSessionCookieOptions();
  res.clearCookie(getSessionCookieName(), {
    path,
    sameSite,
    secure,
    httpOnly,
  });
  res.status(204).end();
}

export async function getMe(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json({ user: sanitizeUser(req.user) });
}

export async function updateMe(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { error, value } = sanitizeProfileUpdatePayload(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    if (value.email && value.email !== req.user.email) {
      const existing = await User.findOne({ email: value.email });
      if (existing && existing._id.toString() !== req.user._id.toString()) {
        return res.status(409).json({ error: "Email is already registered" });
      }
    }

    Object.assign(req.user, value);
    await req.user.save();
    await upsertTrustedIdentityMemory(req.user);
    setSessionCookie(res, req.user);

    res.json({ user: sanitizeUser(req.user) });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const currentPassword = `${req.body.currentPassword || ""}`;
    const nextPassword = `${req.body.newPassword || ""}`;

    if (!currentPassword || !nextPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (nextPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.password = nextPassword;
    await user.save();
    await clearLoginSecurityState(user);
    setSessionCookie(res, user);

    res.json({ user: sanitizeUser(user), message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
}

export async function getMemory(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userOwnerKey = getMemoryOwnerKey({ userId: req.user._id });
    const memory = await GlobalMemory.findOne({ deviceId: userOwnerKey });
    res.json({ memory: serializeMemory(memory) });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpires");
    if (!user || !user.isActive) {
      return res.json({
        message: "If that email exists, a password reset link has been prepared.",
      });
    }

    const { rawToken, hashedToken, expiresAt } = createPasswordResetToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    if (!canSendEmail()) {
      return res.status(503).json({
        error: "Password reset email delivery is not configured. Set either Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) or Resend sender settings.",
      });
    }

    const resetUrl = buildPasswordResetUrl(rawToken);
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresAt,
    });

    res.json({
      message: "If that email exists, a password reset link has been sent.",
      expiresAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token?.trim()) {
      return res.status(400).json({ error: "Reset token is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password +resetPasswordToken +resetPasswordExpires");

    if (!user || !user.isActive) {
      return res.status(400).json({ error: "Reset token is invalid or expired" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await clearLoginSecurityState(user);
    await upsertTrustedIdentityMemory(user);
    setSessionCookie(res, user);
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function syncMemory(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { deviceId, globalMemory } = req.body;
    const userOwnerKey = getMemoryOwnerKey({ userId: req.user._id });
    const guestOwnerKey = deviceId
      ? getMemoryOwnerKey({ deviceId })
      : null;

    const userMemory =
      (await GlobalMemory.findOne({ deviceId: userOwnerKey })) ||
      new GlobalMemory({ deviceId: userOwnerKey });

    const guestMemory = guestOwnerKey
      ? await GlobalMemory.findOne({ deviceId: guestOwnerKey })
      : null;

    const mergedUserName =
      req.user.name ||
      userMemory.userName ||
      globalMemory?.userName ||
      guestMemory?.userName ||
      "";

    const mergedPreferences = mergeUniqueStrings(
      normalizePreferenceValues(userMemory.preferences),
      [
        ...normalizePreferenceValues(guestMemory?.preferences),
        ...(globalMemory?.preferences || []),
      ]
    );

    const mergedTraits = mergeUniqueStrings(
      userMemory.personalityTraits || [],
      [
        ...(guestMemory?.personalityTraits || []),
        ...(globalMemory?.personalityTraits || []),
      ]
    );

    const mergedMoments = mergeUniqueStrings(
      userMemory.importantMoments || [],
      [
        ...(guestMemory?.importantMoments || []),
        ...(globalMemory?.importantMoments || []),
      ]
    ).slice(-10);

    const mergedFacts = mergeUniqueStrings(
      normalizeFactValues(userMemory.basicFacts),
      [
        ...normalizeFactValues(guestMemory?.basicFacts),
        ...(globalMemory?.basicFacts || []),
      ]
    );

    userMemory.userName = mergedUserName;
    userMemory.preferences = toPreferenceDocs(mergedPreferences);
    userMemory.personalityTraits = mergedTraits;
    userMemory.importantMoments = mergedMoments;
    userMemory.relationshipStage =
      globalMemory?.relationshipStage ||
      guestMemory?.relationshipStage ||
      userMemory.relationshipStage ||
      "early";
    userMemory.interactionCount = Math.max(
      userMemory.interactionCount || 0,
      guestMemory?.interactionCount || 0,
      globalMemory?.interactionCount || 0
    );
    userMemory.basicFacts = toFactDocs(mergedFacts);
    userMemory.lastUpdated = new Date();
    await userMemory.save();

    res.json({ memory: serializeMemory(userMemory) });
  } catch (err) {
    next(err);
  }
}
