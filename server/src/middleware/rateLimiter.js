// server/src/middleware/rateLimiter.js
// Per-IP rate limiting for the /api/chat/* endpoints using express-rate-limit.

import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs:         60 * 1000,    // 1 minute window
  max:              30,            // max 30 requests per window per IP
  standardHeaders:  true,          // Return rate limit info in RateLimit-* headers
  legacyHeaders:    false,
  skipSuccessfulRequests: false,

  handler: (req, res) => {
    res.status(429).json({
      error:     "Too many requests. Please slow down.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },

  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === "test",
});

// Stricter limiter for expensive streaming requests
export const streamRateLimiter = rateLimit({
  windowMs:  60 * 1000,
  max:       15,
  handler: (req, res) => {
    res.status(429).json({
      error: "Streaming rate limit reached. Wait a moment before sending more messages.",
    });
  },
  skip: () => process.env.NODE_ENV === "test",
});