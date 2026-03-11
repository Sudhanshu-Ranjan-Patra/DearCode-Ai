// server/src/config/db.js
// Mongoose connection with retry logic and connection event logging.

import mongoose from "mongoose";

const MAX_RETRIES  = 5;
const RETRY_DELAY  = 3000; // ms

export async function connectDB(retries = MAX_RETRIES) {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/llm-chatbot";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    if (retries > 0) {
      console.warn(`⚠️  MongoDB connection failed. Retrying in ${RETRY_DELAY / 1000}s… (${retries} left)`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      return connectDB(retries - 1);
    }
    console.error("❌  MongoDB connection failed after all retries:", err.message);
    process.exit(1);
  }

  // Connection events
  mongoose.connection.on("disconnected", () =>
    console.warn("⚠️  MongoDB disconnected")
  );
  mongoose.connection.on("reconnected", () =>
    console.log("✅  MongoDB reconnected")
  );
  mongoose.connection.on("error", (err) =>
    console.error("❌  MongoDB error:", err.message)
  );

  // Graceful shutdown
  process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

async function gracefulShutdown(signal) {
  console.log(`\n🛑  ${signal} received. Closing MongoDB connection…`);
  await mongoose.connection.close();
  console.log("✅  MongoDB connection closed.");
  process.exit(0);
}