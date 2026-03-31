// server/src/middleware/rateLimiter.js
// JSON rate limiters for chat and auth endpoints.

import rateLimit from "express-rate-limit";

function resolveRetryAfterSeconds(req) {
  const resetTime = req.rateLimit?.resetTime;
  if (!resetTime) return undefined;

  const resetMs = resetTime instanceof Date
    ? resetTime.getTime() - Date.now()
    : Number(resetTime) - Date.now();

  return Math.max(1, Math.ceil(resetMs / 1000));
}

function defaultKeyGenerator(req) {
  return req.ip || req.headers["x-forwarded-for"] || "unknown";
}

function createJsonLimiter({
  windowMs,
  max,
  message,
  skipSuccessfulRequests = false,
  keyGenerator = defaultKeyGenerator,
}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: resolveRetryAfterSeconds(req),
      });
    },
    skip: () => process.env.NODE_ENV === "test",
  });
}

export const rateLimiter = createJsonLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many requests. Please slow down.",
});

export const streamRateLimiter = createJsonLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Streaming rate limit reached. Wait a moment before sending more messages.",
});

export const authRateLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please try again later.",
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = `${req.body?.email || ""}`.trim().toLowerCase();
    return email ? `${defaultKeyGenerator(req)}:${email}` : defaultKeyGenerator(req);
  },
});

export const passwordResetRateLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please wait before trying again.",
  keyGenerator: (req) => {
    const email = `${req.body?.email || ""}`.trim().toLowerCase();
    return email ? `${defaultKeyGenerator(req)}:${email}` : defaultKeyGenerator(req);
  },
});
