import test from "node:test";
import assert from "node:assert/strict";

import {
  getSessionCookieName,
  getSessionCookieOptions,
  validateAuthConfiguration,
  verifySessionToken,
} from "../src/utils/auth.js";

test("production auth configuration requires a strong session secret and client url", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.AUTH_SESSION_SECRET;
  const originalClientUrl = process.env.CLIENT_URL;
  const originalResendKey = process.env.RESEND_API_KEY;
  const originalResendFrom = process.env.RESEND_FROM_EMAIL;
  const originalGmailUser = process.env.GMAIL_USER;
  const originalGmailPassword = process.env.GMAIL_APP_PASSWORD;

  process.env.NODE_ENV = "production";
  process.env.AUTH_SESSION_SECRET = "short-secret";
  delete process.env.CLIENT_URL;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;

  const issues = validateAuthConfiguration();
  assert.ok(issues.includes("AUTH_SESSION_SECRET must be at least 32 characters in production"));
  assert.ok(issues.includes("CLIENT_URL must be set in production"));
  assert.ok(issues.includes("Configure either Resend (RESEND_API_KEY + RESEND_FROM_EMAIL) or Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) in production"));

  process.env.NODE_ENV = originalNodeEnv;
  process.env.AUTH_SESSION_SECRET = originalSecret;
  process.env.CLIENT_URL = originalClientUrl;
  process.env.RESEND_API_KEY = originalResendKey;
  process.env.RESEND_FROM_EMAIL = originalResendFrom;
  process.env.GMAIL_USER = originalGmailUser;
  process.env.GMAIL_APP_PASSWORD = originalGmailPassword;
});

test("production cookies use a host-prefixed cookie name when no domain is configured", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDomain = process.env.AUTH_COOKIE_DOMAIN;
  const originalSameSite = process.env.AUTH_COOKIE_SAME_SITE;

  process.env.NODE_ENV = "production";
  delete process.env.AUTH_COOKIE_DOMAIN;
  delete process.env.AUTH_COOKIE_SAME_SITE;

  assert.equal(getSessionCookieName(), "__Host-dearcode_session");

  const options = getSessionCookieOptions();
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "none");
  assert.equal("domain" in options, false);

  process.env.NODE_ENV = originalNodeEnv;
  process.env.AUTH_COOKIE_DOMAIN = originalDomain;
  process.env.AUTH_COOKIE_SAME_SITE = originalSameSite;
});

test("tampered session tokens are rejected", () => {
  const token = "eyJzdWIiOiJ1c2VyLTEiLCJpYXQiOjEsImV4cCI6OTk5OTk5OTk5OTl9.invalid-signature";
  assert.equal(verifySessionToken(token), null);
});
