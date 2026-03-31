// server/src/server.js
// Express app entry point — boots DB, mounts routes, starts HTTP server.
import "./config/env.js";
import dotenv       from "dotenv";
import { connectDB }       from "./config/db.js";
import app from "./app.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

// ── Start ────────────────────────────────────────────────────────────────────
await connectDB();

app.listen(PORT, () => {
  console.log(`\n🚀  Server running on http://localhost:${PORT}`);
  console.log(`📡  ENV: ${process.env.NODE_ENV || "development"}\n`);
});

export default app;
