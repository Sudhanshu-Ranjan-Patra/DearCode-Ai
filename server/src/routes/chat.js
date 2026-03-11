// server/src/routes/chat.js
// Routes for AI streaming and model listing.

import { Router } from "express";
import { streamChat, getModels } from "../controllers/chatController.js";
import { validateChatBody } from "../middleware/validateRequest.js";

const router = Router();

// POST /api/chat/stream  — main SSE streaming endpoint
router.post("/stream", validateChatBody, streamChat);

// GET  /api/chat/models  — available model list
router.get("/models", getModels);

export default router;