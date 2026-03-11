// server/src/routes/health.js
// Simple health + readiness check endpoint.

import { Router }   from "express";
import mongoose     from "mongoose";
import { MODELS }   from "../config/openrouter.js";

const router = Router();

// GET /api/health
router.get("/", (req, res) => {
  const dbState = ["disconnected", "connected", "connecting", "disconnecting"];

  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    db:        dbState[mongoose.connection.readyState] ?? "unknown",
    models:    Object.keys(MODELS).length,
    env:       process.env.NODE_ENV || "development",
  });
});

export default router;