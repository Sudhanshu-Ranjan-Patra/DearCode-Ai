// server/src/middleware/errorHandler.js
// Centralised Express error handler — must be registered LAST via app.use().

export function errorHandler(err, req, res, _next) {
  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Validation failed", details: messages });
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // JSON parse error
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  // Generic
  const status  = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === "production" && status === 500
    ? "Internal server error"
    : err.message || "Something went wrong";

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ERROR ${status}:`, err);
  }

  res.status(status).json({ error: message });
}