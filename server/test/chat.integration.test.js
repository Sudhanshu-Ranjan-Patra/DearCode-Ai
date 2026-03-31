import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

import app from "../src/app.js";
import Conversation from "../src/models/Conversation.js";
import GlobalMemory from "../src/models/GlobalMemory.js";

let mongoServer;
let originalFetch;
const runDbTests = process.env.RUN_DB_TESTS === "1";

function collectTextResponse(res, callback) {
  let data = "";
  res.setEncoding("utf8");
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => callback(null, data));
}

async function waitFor(assertion, { timeoutMs = 4_000, intervalMs = 50 } = {}) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await assertion();
    } catch (error) {
      lastError = error;
      await delay(intervalMs);
    }
  }

  throw lastError;
}

function createStreamResponse(events) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      events.forEach((event) => {
        controller.enqueue(encoder.encode(event));
      });
      controller.close();
    },
  }), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.AUTH_SESSION_SECRET = "test-secret";

  if (runDbTests) {
    mongoServer = await MongoMemoryServer.create({
      instance: { ip: "127.0.0.1", port: 27018 },
    });
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "dearcode-tests",
    });
  }

  originalFetch = global.fetch;
  global.fetch = async (_url, options = {}) => {
    const body = JSON.parse(options.body || "{}");
    const [firstMessage] = body.messages || [];
    const systemPrompt = firstMessage?.content || "";

    if (body.stream) {
      return createStreamResponse([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "hello " } }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: { content: "from stream" } }], usage: { prompt_tokens: 12, completion_tokens: 4 } })}\n\n`,
        "data: [DONE]\n\n",
      ]);
    }

    if (systemPrompt.includes("Generate a concise chat title")) {
      return Response.json({
        choices: [{ message: { content: "Coffee chat" } }],
      });
    }

    if (systemPrompt.includes("strict, neutral fact extraction")) {
      return Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              hasNewData: true,
              extracted: {
                userName: "Aman",
                preferences: ["coffee"],
                basicFacts: ["Works on coding projects"],
              },
            }),
          },
        }],
      });
    }

    if (systemPrompt.includes("human-like emotional memory extractor")) {
      return Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              shouldStore: false,
              type: "",
              emotion: "",
              summary: "",
              impact: "low",
            }),
          },
        }],
      });
    }

    return Response.json({
      choices: [{ message: { content: "ok" } }],
    });
  };
});

afterEach(async () => {
  if (runDbTests && mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});

after(async () => {
  global.fetch = originalFetch;
  if (runDbTests) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

const chatStreamTest = runDbTests ? test : test.skip;

chatStreamTest("POST /api/chat/stream streams SSE tokens and persists the exchange", async () => {
  const response = await request(app)
    .post("/api/chat/stream")
    .buffer(true)
    .parse(collectTextResponse)
    .send({
      messages: [{ role: "user", content: "my name is Aman and i like coffee" }],
      deviceId: "device-stream-1",
      character: "girlfriend",
    });

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/event-stream/);
  assert.match(response.body, /"token":"hello "/);
  assert.match(response.body, /"token":"from stream"/);
  assert.match(response.body, /\[DONE\]/);

  await waitFor(async () => {
    const conversations = await Conversation.find({ deviceId: "device-stream-1" }).lean();
    assert.equal(conversations.length, 1);
    assert.equal(conversations[0].messages.length, 2);
    assert.equal(conversations[0].messages[0].role, "user");
    assert.equal(conversations[0].messages[1].content, "hello from stream");

    const memory = await GlobalMemory.findOne({ deviceId: "device:device-stream-1" }).lean();
    assert.ok(memory);
    assert.equal(memory.userName, "Aman");
    assert.equal(memory.preferences[0].value, "coffee");
  });
});
