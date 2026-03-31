import crypto from "crypto";

const SESSION_COOKIE = "dearcode_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PROD_MIN_SECRET_LENGTH = 32;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (isProduction()) {
    throw new Error("AUTH_SESSION_SECRET is required in production");
  }

  return "dev-only-session-secret";
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

export function createSessionToken(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };

  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64url(encodedPayload));
    if (!payload?.sub || !payload?.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(header = "") {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) return acc;
      const key = part.slice(0, eqIndex).trim();
      const value = decodeURIComponent(part.slice(eqIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

export function getSessionCookieName() {
  return shouldUseHostPrefixedCookie() ? `__Host-${SESSION_COOKIE}` : SESSION_COOKIE;
}

export function getSessionCookieOptions() {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE ||
    (isProduction() ? "none" : "lax");
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    sameSite,
    secure: isProduction(),
    maxAge: SESSION_TTL_MS,
    expires: new Date(Date.now() + SESSION_TTL_MS),
    path: "/",
    ...(shouldUseHostPrefixedCookie() ? {} : { domain: cookieDomain }),
  };
}

export function shouldUseHostPrefixedCookie() {
  return isProduction() && !process.env.AUTH_COOKIE_DOMAIN;
}

export function validateAuthConfiguration() {
  const issues = [];
  const secret = process.env.AUTH_SESSION_SECRET || process.env.JWT_SECRET;

  if (isProduction()) {
    if (!secret) {
      issues.push("AUTH_SESSION_SECRET must be set in production");
    } else if (secret.length < PROD_MIN_SECRET_LENGTH) {
      issues.push("AUTH_SESSION_SECRET must be at least 32 characters in production");
    }

    if (!process.env.CLIENT_URL) {
      issues.push("CLIENT_URL must be set in production");
    }

    const hasResendConfig = Boolean(
      process.env.RESEND_API_KEY &&
      (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || process.env.AUTH_EMAIL_FROM)
    );
    const hasGmailConfig = Boolean(
      process.env.GMAIL_USER &&
      process.env.GMAIL_APP_PASSWORD
    );

    if (!hasResendConfig && !hasGmailConfig) {
      issues.push("Configure either Resend (RESEND_API_KEY + RESEND_FROM_EMAIL) or Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) in production");
    }

    const sameSite = process.env.AUTH_COOKIE_SAME_SITE;
    if (sameSite && !["lax", "strict", "none"].includes(sameSite.toLowerCase())) {
      issues.push("AUTH_COOKIE_SAME_SITE must be one of: lax, strict, none");
    }
  }

  return issues;
}

export function getMemoryOwnerKey({ userId, deviceId, fallbackId }) {
  if (userId) return `user:${userId.toString()}`;
  if (deviceId) return `device:${deviceId}`;
  return `guest:${fallbackId}`;
}
