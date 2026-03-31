import test from "node:test";
import assert from "node:assert/strict";

import { buildOwnerQuery } from "../src/services/conversationService.js";

test("buildOwnerQuery scopes authenticated conversation access by user", () => {
  assert.deepEqual(
    buildOwnerQuery({ id: "conv-1", userId: "user-1", deviceId: "device-1" }),
    { _id: "conv-1", userId: "user-1" }
  );
});

test("buildOwnerQuery scopes guest conversation access by device", () => {
  assert.deepEqual(
    buildOwnerQuery({ id: "conv-1", deviceId: "device-1" }),
    { _id: "conv-1", userId: null, deviceId: "device-1" }
  );
});
