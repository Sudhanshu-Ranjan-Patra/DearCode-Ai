import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

function createBaseState(overrides = {}) {
  return {
    authenticated: false,
    user: null,
    memory: {
      userName: "",
      preferences: [],
      personalityTraits: [],
      importantMoments: [],
      relationshipStage: "early",
      interactionCount: 0,
      basicFacts: [],
    },
    conversationsByCharacter: {
      girlfriend: [],
      bestfriend: [],
      motivator: [],
    },
    messagesByChatId: {},
    lastStreamPayload: null,
    ...overrides,
  };
}

async function setupApiMocks(page, state) {
  await page.route("**/api/auth/me", async (route) => {
    if (!state.authenticated) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not authenticated" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: state.user }),
    });
  });

  await page.route("**/api/auth/register", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    state.authenticated = true;
    state.user = {
      _id: "user-e2e-1",
      name: payload.name,
      email: payload.email,
    };
    state.memory.userName = payload.name;

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ user: state.user }),
    });
  });

  await page.route("**/api/auth/login", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    state.authenticated = true;
    state.user = {
      _id: "user-login-1",
      name: "Aman",
      email: payload.email,
    };
    state.memory.userName = "Aman";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: state.user }),
    });
  });

  await page.route("**/api/auth/logout", async (route) => {
    state.authenticated = false;
    state.user = null;
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/auth/forgot-password", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: `Check ${payload.email} for a password reset link.`,
      }),
    });
  });

  await page.route("**/api/auth/reset-password", async (route) => {
    state.authenticated = true;
    state.user = {
      _id: "user-reset-1",
      name: "Aman",
      email: "aman@example.com",
    };
    state.memory.userName = "Aman";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: state.user }),
    });
  });

  await page.route("**/api/auth/memory", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ memory: state.memory }),
    });
  });

  await page.route("**/api/auth/sync-memory", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    state.memory = {
      ...state.memory,
      ...payload.globalMemory,
      userName: state.user?.name || state.memory.userName,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ memory: state.memory }),
    });
  });

  await page.route(/.*\/api\/conversations(\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const character = url.searchParams.get("character") || "girlfriend";

    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ conversations: state.conversationsByCharacter[character] || [] }),
      });
      return;
    }

    if (route.request().method() === "POST") {
      const payload = JSON.parse(route.request().postData() || "{}");
      const conversation = {
        _id: `conv-${payload.character}-${Date.now()}`,
        title: payload.title,
        character: payload.character,
        messageCount: 0,
        updatedAt: new Date().toISOString(),
      };
      state.conversationsByCharacter[payload.character] = [
        conversation,
        ...(state.conversationsByCharacter[payload.character] || []),
      ];
      state.messagesByChatId[conversation._id] = [];

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ conversation }),
      });
    }
  });

  await page.route("**/api/conversations/*/messages**", async (route) => {
    const chatId = route.request().url().split("/api/conversations/")[1].split("/messages")[0];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ messages: state.messagesByChatId[chatId] || [] }),
    });
  });

  await page.route("**/api/chat/stream", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    state.lastStreamPayload = payload;
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: [
        `data: ${JSON.stringify({ token: "hello " })}\n\n`,
        `data: ${JSON.stringify({ token: "from persona" })}\n\n`,
        "data: [DONE]\n\n",
      ].join(""),
    });
  });
}

test("signup, chat, and logout flow works end-to-end in the UI", async ({ page }) => {
  const state = createBaseState();
  await setupApiMocks(page, state);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /private companion chats/i })).toBeVisible();

  await page.getByRole("button", { name: "Sign Up" }).click();
  await page.getByLabel("Name").fill("Aman");
  await page.getByLabel("Email").fill("aman@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page.getByText("Messages")).toBeVisible();
  await expect(page.getByRole("banner").getByText("aman@example.com")).toBeVisible();

  await page.getByPlaceholder("Ask anything about your codebase…").fill("Hello there");
  await page.getByTitle("Send message").click();

  await expect(page.getByText("hello from persona")).toBeVisible();
  await expect(page.getByText("Hello there")).toBeVisible();

  await page.getByTitle("Log out").click();
  await expect(page.getByRole("heading", { name: /private companion chats/i })).toBeVisible();
});

test("login-only flow signs the user into the workspace", async ({ page }) => {
  const state = createBaseState();
  await setupApiMocks(page, state);

  await page.goto("/");
  await page.getByLabel("Email").fill("aman@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.locator("form").getByRole("button", { name: "Log In" }).click();

  await expect(page.getByRole("banner").getByText("aman@example.com")).toBeVisible();
  await expect(page.getByText("Messages")).toBeVisible();
});

test("forgot-password flow returns the user to login and reset route unlocks the form", async ({ page }) => {
  const state = createBaseState();
  await setupApiMocks(page, state);

  await page.goto("/");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email").fill("aman@example.com");
  await page.getByRole("button", { name: "Send Reset Email" }).click();

  await expect(page.getByText(/check aman@example.com for a password reset link/i)).toBeVisible();
  await expect(page.locator("form").getByRole("button", { name: "Log In" })).toBeVisible();

  await page.goto("/reset-password?resetToken=email-reset-token");
  await expect(page.getByText(/your reset link is ready/i)).toBeVisible();
  await page.getByLabel("New Password").fill("password123");
  await page.getByLabel("Confirm Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Reset Password" }).click();

  await expect(page.getByRole("banner").getByText("aman@example.com")).toBeVisible();
});

test("attachment-only send includes file context in the outbound chat payload", async ({ page }) => {
  const state = createBaseState({
    authenticated: true,
    user: { _id: "user-attach-1", name: "Aman", email: "aman@example.com" },
  });
  await setupApiMocks(page, state);

  await page.goto("/");
  await expect(page.getByText("Messages")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("remember this test file"),
  });

  await expect(page.getByText("notes.txt")).toBeVisible();
  await page.getByTitle("Send message").click();

  await expect(page.getByText("Please use the attached file context.")).toBeVisible();
  expect(state.lastStreamPayload.messages[0].content).toContain("Attached file context:");
  expect(state.lastStreamPayload.messages[0].content).toContain("notes.txt");
  expect(state.lastStreamPayload.messages[0].content).toContain("remember this test file");
});

test("persona switching refreshes sidebar history and chat selection restores messages", async ({ page }) => {
  const state = createBaseState({
    authenticated: true,
    user: { _id: "user-history-1", name: "Aman", email: "aman@example.com" },
    conversationsByCharacter: {
      girlfriend: [
        {
          _id: "conv-gf-1",
          title: "GF chat",
          character: "girlfriend",
          messageCount: 2,
          updatedAt: new Date().toISOString(),
        },
      ],
      bestfriend: [],
      motivator: [
        {
          _id: "conv-mot-1",
          title: "Focus sprint",
          character: "motivator",
          messageCount: 2,
          updatedAt: new Date().toISOString(),
        },
      ],
    },
    messagesByChatId: {
      "conv-gf-1": [
        { _id: "m1", role: "user", content: "hey", createdAt: new Date().toISOString() },
        { _id: "m2", role: "assistant", content: "hi there", createdAt: new Date().toISOString() },
      ],
      "conv-mot-1": [
        { _id: "m3", role: "user", content: "push me", createdAt: new Date().toISOString() },
        { _id: "m4", role: "assistant", content: "let's focus", createdAt: new Date().toISOString() },
      ],
    },
  });
  await setupApiMocks(page, state);

  await page.goto("/");
  await expect(page.getByText("GF chat")).toBeVisible();

  await page.getByText("GF chat").click();
  await expect(page.getByText("hi there")).toBeVisible();

  await page.locator(".model-selector").click();
  await page.getByText("Motivator", { exact: true }).click();

  await expect(page.getByText("Focus sprint")).toBeVisible();
  await page.getByText("Focus sprint").click();
  await expect(page.getByText("let's focus")).toBeVisible();
});
