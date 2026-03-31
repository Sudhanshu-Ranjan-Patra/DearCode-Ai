import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { attachCurrentUser } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import conversationRoutes from "./routes/conversations.js";
import healthRoutes from "./routes/health.js";
import personaRoutes from "./routes/personas.js";

export function createApp() {
  const app = express();

  const allowedOrigins = new Set([
    ...(process.env.CLIENT_URL || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ]);

  if (process.env.TRUST_PROXY === "1") {
    app.set("trust proxy", 1);
  }

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "img-src": ["'self'", "data:", "blob:"],
      },
    },
  }));
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.has(origin) ||
        (process.env.NODE_ENV !== "production" && origin?.startsWith("http://localhost"))
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  app.options("*", cors());
  app.use(express.json({ limit: "5mb" }));
  app.use(morgan("dev"));
  app.use(attachCurrentUser);

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/chat", rateLimiter, chatRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/chats", conversationRoutes);
  app.use("/api/personas", personaRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });

  app.use(errorHandler);

  return app;
}

export default createApp();
