// server/src/server.js
// Express app entry point — boots DB, mounts routes, starts HTTP server.
import "./config/env.js";
import express      from "express";
import cors         from "cors";
import helmet       from "helmet";
import morgan       from "morgan";
import dotenv       from "dotenv";
import { connectDB }       from "./config/db.js";
import { errorHandler }    from "./middleware/errorHandler.js";
import { rateLimiter }     from "./middleware/rateLimiter.js";
import chatRoutes          from "./routes/chat.js";
import conversationRoutes  from "./routes/conversations.js";
import healthRoutes        from "./routes/health.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connect MongoDB ──────────────────────────────────────────────────────────
await connectDB();

// ── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());

// CORS — allow configured origin + any localhost port in development
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:5173",  // Vite default
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== "production" && origin?.startsWith("http://localhost"))
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials:      true,
  methods:          ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders:   ["Content-Type", "Authorization"],
}));

// Explicitly handle preflight OPTIONS for all routes
app.options("*", cors());

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/health",        healthRoutes);
app.use("/api/chat",          rateLimiter, chatRoutes);
app.use("/api/conversations", conversationRoutes);

// Alias: frontend calls /api/chats — redirect to /api/conversations
app.use("/api/chats",         conversationRoutes);

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Server running on http://localhost:${PORT}`);
  console.log(`📡  ENV: ${process.env.NODE_ENV || "development"}\n`);
});

export default app;