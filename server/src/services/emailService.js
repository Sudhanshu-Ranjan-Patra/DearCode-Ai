import { URL } from "node:url";
import nodemailer from "nodemailer";

function getResendApiKey() {
  return process.env.RESEND_API_KEY || "";
}

function getEmailFromAddress() {
  return (
    process.env.GMAIL_FROM_EMAIL ||
    process.env.GMAIL_USER ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.AUTH_EMAIL_FROM ||
    ""
  ).trim();
}

function getGmailUser() {
  return (process.env.GMAIL_USER || "").trim();
}

function getGmailAppPassword() {
  return (process.env.GMAIL_APP_PASSWORD || "").trim();
}

function getAppName() {
  return process.env.APP_NAME || "DearCode AI";
}

function escapeHtml(value = "") {
  return `${value}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function canSendEmail() {
  return hasGmailConfig() || hasResendConfig();
}

function hasResendConfig() {
  return Boolean(getResendApiKey() && (
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.AUTH_EMAIL_FROM
  ));
}

function hasGmailConfig() {
  return Boolean(getGmailUser() && getGmailAppPassword());
}

export function buildPasswordResetUrl(rawToken) {
  const baseUrl = (process.env.CLIENT_URL || "").split(",")[0]?.trim();
  if (!baseUrl) {
    throw new Error("CLIENT_URL is required to build password reset links");
  }

  const url = new URL(baseUrl);
  url.pathname = "/reset-password";
  url.search = "";
  url.searchParams.set("resetToken", rawToken);
  return url.toString();
}

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresAt }) {
  const from = getEmailFromAddress();

  if (!from) {
    throw new Error("No email sender is configured");
  }

  const expiryLabel = new Date(expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const appName = getAppName();
  const safeName = name?.trim() || "there";
  const subject = `Reset your ${appName} password`;
  const previewText = `Reset your ${appName} password before the link expires.`;
  const escapedAppName = escapeHtml(appName);
  const escapedName = escapeHtml(safeName);
  const escapedExpiry = escapeHtml(expiryLabel);
  const escapedResetUrl = escapeHtml(resetUrl);
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapedAppName} Password Reset</title>
      </head>
      <body style="margin:0;padding:0;background:#09090f;font-family:Arial,sans-serif;color:#f4f4f5;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(previewText)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09090f;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:linear-gradient(180deg,#10101a 0%,#141424 100%);border:1px solid #26263a;border-radius:28px;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,.4);">
                <tr>
                  <td style="padding:24px 28px 10px;">
                    <div style="display:inline-block;padding:8px 14px;border-radius:999px;border:1px solid rgba(124,106,247,.35);background:rgba(124,106,247,.12);color:#d8d1ff;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;">
                      ${escapedAppName}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 0;">
                    <h1 style="margin:0;font-size:34px;line-height:1.02;color:#fafafa;font-weight:800;">
                      Reset your password
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 0;color:#b8b8cb;font-size:16px;line-height:1.7;">
                    <p style="margin:0 0 14px;">Hi ${escapedName},</p>
                    <p style="margin:0 0 14px;">
                      We received a request to reset your password for ${escapedAppName}. If that was you, use the button below to choose a new one.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius:16px;background:linear-gradient(135deg,#7c6af7 0%,#4f46e5 100%);">
                          <a
                            href="${escapedResetUrl}"
                            style="display:inline-block;padding:15px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;"
                          >
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 22px;">
                    <div style="padding:18px 18px;border-radius:18px;background:#0b0b14;border:1px solid #242438;">
                      <p style="margin:0 0 8px;color:#fafafa;font-size:14px;font-weight:700;">Security note</p>
                      <p style="margin:0;color:#a8a8bd;font-size:14px;line-height:1.6;">
                        This reset link expires on ${escapedExpiry}. If you did not request a password reset, you can safely ignore this email.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 28px;color:#8d8da3;font-size:13px;line-height:1.7;">
                    <p style="margin:0 0 8px;">If the button does not work, copy and paste this link into your browser:</p>
                    <p style="margin:0;word-break:break-all;">
                      <a href="${escapedResetUrl}" style="color:#9adfff;text-decoration:none;">${escapedResetUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();

  const text = [
    `Hi ${safeName},`,
    "",
    `We received a request to reset your password for ${appName}.`,
    `Open this link to reset it: ${resetUrl}`,
    `This link expires on ${expiryLabel}.`,
    "",
    "If you did not request this, you can safely ignore this email.",
  ].join("\n");

  if (hasGmailConfig()) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: getGmailUser(),
        pass: getGmailAppPassword(),
      },
    });

    return transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
  }

  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error("No email provider is configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend ${response.status}: ${errorText}`);
  }

  return response.json();
}
