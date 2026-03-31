import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeProfileUpdatePayload } from "../src/controllers/authController.js";
import {
  createSessionToken,
  getMemoryOwnerKey,
  verifySessionToken,
} from "../src/utils/auth.js";

test("getMemoryOwnerKey prefers authenticated user over device", () => {
  const ownerKey = getMemoryOwnerKey({
    userId: "abc123",
    deviceId: "device-1",
    fallbackId: "fallback",
  });

  assert.equal(ownerKey, "user:abc123");
});

test("getMemoryOwnerKey falls back to device then guest", () => {
  assert.equal(
    getMemoryOwnerKey({ deviceId: "device-1", fallbackId: "fallback" }),
    "device:device-1"
  );

  assert.equal(
    getMemoryOwnerKey({ fallbackId: "fallback" }),
    "guest:fallback"
  );
});

test("session tokens round-trip correctly", () => {
  const token = createSessionToken({
    _id: { toString: () => "user-42" },
    email: "test@example.com",
    name: "Test User",
  });

  const payload = verifySessionToken(token);
  assert.equal(payload?.sub, "user-42");
  assert.equal(payload?.email, "test@example.com");
  assert.equal(payload?.name, "Test User");
});

test("profile updates sanitize supported fields", () => {
  const result = sanitizeProfileUpdatePayload({
    name: "  Sudhanshu  ",
    email: " Sudhanshu@Example.com ",
    mood: " focused but calm ",
    bio: " Building steadily. ",
    learningFocus: " MERN and AI apps ",
    avatarDataUrl: "data:image/png;base64,aGVsbG8=",
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.name, "Sudhanshu");
  assert.equal(result.value.email, "sudhanshu@example.com");
  assert.equal(result.value.mood, "focused but calm");
  assert.equal(result.value.bio, "Building steadily.");
  assert.equal(result.value.learningFocus, "MERN and AI apps");
  assert.equal(result.value.avatarDataUrl, "data:image/png;base64,aGVsbG8=");
});

test("profile updates reject invalid email and avatar format", () => {
  assert.equal(
    sanitizeProfileUpdatePayload({ email: "bad-email" }).error,
    "A valid email is required"
  );
  assert.equal(
    sanitizeProfileUpdatePayload({ avatarDataUrl: "https://example.com/image.png" }).error,
    "Profile photo must be a valid PNG, JPG, WEBP, or GIF image"
  );
});
