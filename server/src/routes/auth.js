import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getMemory,
  getMe,
  login,
  logout,
  register,
  resetPassword,
  syncMemory,
  updateMe,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import {
  authRateLimiter,
  passwordResetRateLimiter,
} from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);
router.post("/forgot-password", passwordResetRateLimiter, forgotPassword);
router.post("/reset-password", passwordResetRateLimiter, resetPassword);
router.post("/sync-memory", requireAuth, syncMemory);
router.post("/change-password", requireAuth, authRateLimiter, changePassword);
router.get("/memory", requireAuth, getMemory);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);

export default router;
