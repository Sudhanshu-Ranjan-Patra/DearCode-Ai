import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Conversation from "../src/models/Conversation.js";
import {
  appendMessages,
  getAllConversations,
} from "../src/services/conversationService.js";

let mongoServer;
let originalFetch;
const runDbTests = process.env.RUN_DB_TESTS === "1";

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.OPENROUTER_API_KEY = "test-key";

  if (runDbTests) {
    mongoServer = await MongoMemoryServer.create({
      instance: { ip: "127.0.0.1", port: 27019 },
    });
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "dearcode-persistence-tests",
    });
  }

  originalFetch = global.fetch;
  global.fetch = async () => Response.json({
    choices: [{ message: { content: "Generated title" } }],
  });
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

const persistenceTest = runDbTests ? test : test.skip;

persistenceTest("conversation listing stays isolated by persona for the same device", async () => {
  await Conversation.create({
    title: "GF chat",
    deviceId: "device-1",
    character: "girlfriend",
  });
  await Conversation.create({
    title: "Motivator chat",
    deviceId: "device-1",
    character: "motivator",
  });

  const girlfriendConversations = await getAllConversations("device-1", "girlfriend");
  const motivatorConversations = await getAllConversations("device-1", "motivator");

  assert.equal(girlfriendConversations.length, 1);
  assert.equal(girlfriendConversations[0].title, "GF chat");
  assert.equal(motivatorConversations.length, 1);
  assert.equal(motivatorConversations[0].title, "Motivator chat");
});

persistenceTest("conversation persistence keeps authenticated users isolated from each other", async () => {
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  await Conversation.create({
    title: "User A chat",
    userId: userA,
    character: "girlfriend",
  });
  await Conversation.create({
    title: "User B chat",
    userId: userB,
    character: "girlfriend",
  });

  const userAConversations = await getAllConversations(null, "girlfriend", userA);
  const userBConversations = await getAllConversations(null, "girlfriend", userB);

  assert.equal(userAConversations.length, 1);
  assert.equal(userAConversations[0].title, "User A chat");
  assert.equal(userBConversations.length, 1);
  assert.equal(userBConversations[0].title, "User B chat");
});

persistenceTest("appendMessages persists user and assistant messages atomically", async () => {
  const conversation = await Conversation.create({
    title: "New Chat",
    deviceId: "device-append",
    character: "girlfriend",
  });

  await appendMessages(conversation._id, {
    userContent: "hello there",
    assistantContent: "hi back",
    usage: { prompt_tokens: 3, completion_tokens: 4 },
  });

  const saved = await Conversation.findById(conversation._id).lean();
  assert.equal(saved.title, "Generated title");
  assert.equal(saved.messages.length, 2);
  assert.equal(saved.messageCount, 2);
  assert.equal(saved.totalTokens, 7);
});
