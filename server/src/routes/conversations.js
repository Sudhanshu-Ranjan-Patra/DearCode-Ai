// server/src/routes/conversations.js
// REST CRUD routes for conversations.

import { Router } from "express";
import {
  listConversations,
  createConversation,
  getConversation,
  getMessages,
  updateConversation,
  deleteConversation,
} from "../controllers/conversationController.js";
import { validateMongoId } from "../middleware/validateRequest.js";

const router = Router();

router.get(  "/",                               listConversations);
router.post( "/",                               createConversation);
router.get(  "/:id", validateMongoId,           getConversation);
router.get(  "/:id/messages", validateMongoId,  getMessages);
router.patch("/:id", validateMongoId,           updateConversation);
router.delete("/:id", validateMongoId,          deleteConversation);

export default router;