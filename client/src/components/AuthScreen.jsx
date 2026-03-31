import { useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import {
  getDeviceId,
  migrateGuestArtifactsToUser,
} from "../utils/memory";
import { migrateGuestWorkspaceToUser } from "../utils/workspaceState";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  resetToken: "",
};

function getValidationErrors(view, form) {
  const errors = {};

  if (view === "signup") {
    if (!form.name.trim()) errors.name = "Name is required.";
    else if (form.name.trim().length < 2) errors.name = "Use at least 2 characters.";
  }

  if (["login", "signup", "forgot"].includes(view)) {
    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address.";
  }

  if (["login", "signup", "reset"].includes(view)) {
    if (!form.password) errors.password = "Password is required.";
    else if (form.password.length < 8) errors.password = "Use at least 8 characters.";
  }

  if (["signup", "reset"].includes(view)) {
    if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  }

  if (view === "reset") {
    if (!form.resetToken.trim()) errors.resetToken = "Reset token is required.";
  }

  return errors;
}

function getMaskedEmail(email = "") {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) return email;
  const safeLocal = local.length <= 2
    ? `${local[0] || ""}*`
    : `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}`;
  return `${safeLocal}@${domain}`;
}

export default function AuthScreen({
  initialView = "login",
  initialResetToken = "",
  onNavigate = () => {},
  sessionNotice = null,
  onDismissSessionNotice = () => {},
}) {
  const [view, setView] = useState(initialView);
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    resetToken: initialResetToken || "",
  }));
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const setUser = useAuthStore((s) => s.setUser);
  const setGlobalMemory = useAuthStore((s) => s.setGlobalMemory);
  const setSessionNotice = useAuthStore((s) => s.setSessionNotice);
  const errors = useMemo(() => getValidationErrors(view, form), [form, view]);

  useEffect(() => {
    if (sessionNotice && !notice) {
      setNotice(sessionNotice);
    }
  }, [sessionNotice, notice]);

  useEffect(() => {
    if (initialView !== "reset") return;

    setView("reset");
    setForm((prev) => ({ ...prev, resetToken: initialResetToken || prev.resetToken }));
    setNotice(
      initialResetToken
        ? { type: "success", message: "Your reset link is ready. Choose a new password below." }
        : null
    );
  }, [initialView, initialResetToken]);

  const showError = (field) => touched[field] && errors[field];

  const switchView = (nextView) => {
    setView(nextView);
    setTouched({});
    setNotice(null);
    onDismissSessionNotice();
    onNavigate(nextView === "reset" ? "/reset-password" : "/");
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const syncGuestMemory = async (user) => {
    try {
      const mergedLocalMemory = migrateGuestArtifactsToUser(user, null, { clearGuest: false });
      const response = await authService.syncMemory({
        deviceId: getDeviceId(),
        globalMemory: mergedLocalMemory,
      });

      if (response?.memory) {
        const mergedMemory = migrateGuestArtifactsToUser(user, response.memory);
        setGlobalMemory(mergedMemory);
      }
    } catch (err) {
      console.error("[AuthScreen] memory sync failed:", err);
    }
  };

  const markVisibleFieldsTouched = () => {
    const nextTouched = {};
    if (view === "signup") nextTouched.name = true;
    if (["login", "signup", "forgot"].includes(view)) nextTouched.email = true;
    if (["login", "signup", "reset"].includes(view)) nextTouched.password = true;
    if (["signup", "reset"].includes(view)) nextTouched.confirmPassword = true;
    if (view === "reset") nextTouched.resetToken = true;
    setTouched((prev) => ({ ...prev, ...nextTouched }));
  };

  const completeAuth = async (response) => {
    setSessionNotice({
      tone: "info",
      message: "Signing you in and syncing your guest data…",
    });
    setUser(response.user);
    await syncGuestMemory(response.user);
    const workspaceSnapshot = migrateGuestWorkspaceToUser(
      response.user,
      useChatStore.getState().getWorkspaceSnapshot()
    );
    useChatStore.getState().applyWorkspaceSnapshot(workspaceSnapshot);
    setSessionNotice({
      tone: "success",
      message: "Signed in successfully. Your guest memory and workspace preferences came with you.",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice(null);
    markVisibleFieldsTouched();

    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    try {
      if (view === "signup") {
        const response = await authService.register(form);
        await completeAuth(response);
        return;
      }

      if (view === "login") {
        const response = await authService.login(form);
        await completeAuth(response);
        return;
      }

      if (view === "forgot") {
        const response = await authService.forgotPassword({ email: form.email });
        setView("login");
        setNotice({
          type: "success",
          message: response.message || `Check ${getMaskedEmail(form.email)} for a password reset link.`,
        });
        onNavigate("/");
        return;
      }

      if (view === "reset") {
        const response = await authService.resetPassword({
          token: form.resetToken,
          password: form.password,
        });
        setNotice({
          type: "success",
          message: "Password updated. Signing you in now…",
        });
        await completeAuth(response);
      }
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Authentication failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = submitting
    ? view === "forgot"
      ? "Sending reset email…"
      : view === "reset"
        ? "Resetting password…"
        : view === "signup"
          ? "Creating account…"
          : "Signing you in…"
    : view === "signup"
      ? "Create Account"
      : view === "forgot"
        ? "Send Reset Email"
        : view === "reset"
          ? "Reset Password"
      : "Log In";

  const dismissNotice = () => {
    setNotice(null);
    onDismissSessionNotice();
  };

  return (
    <div className="auth-shell">
      <div className="auth-ambient auth-ambient-a" />
      <div className="auth-ambient auth-ambient-b" />

      <section className="auth-panel">
        <div className="auth-copy">
          <span className="auth-badge">DearCode AI</span>
          <h1>Your private AI companions, now personalized for you.</h1>
          <p>
            Sign in to keep your conversations, memory, and companion context tied
            to your account instead of only a browser device id.
          </p>

          <div className="auth-highlights">
            <div className="auth-highlight">
              <strong>Isolated personas</strong>
              <span>Girlfriend, Best Friend, and Motivator keep separate history.</span>
            </div>
            <div className="auth-highlight">
              <strong>Persistent memory</strong>
              <span>Guest memory is merged into your account the moment you sign in.</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={view === "login" ? "active" : ""}
              onClick={() => switchView("login")}
            >
              Log In
            </button>
            <button
              type="button"
              className={view === "signup" ? "active" : ""}
              onClick={() => switchView("signup")}
            >
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {view === "signup" && (
              <label className="auth-field">
                <span>Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  onBlur={handleBlur("name")}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
                {showError("name") && <small className="auth-inline-error">{errors.name}</small>}
              </label>
            )}

            {["login", "signup", "forgot"].includes(view) && (
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  onBlur={handleBlur("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                {showError("email") && <small className="auth-inline-error">{errors.email}</small>}
              </label>
            )}

            {view === "reset" && !form.resetToken && (
              <label className="auth-field">
                <span>Reset Token</span>
                <input
                  type="text"
                  value={form.resetToken}
                  onChange={handleChange("resetToken")}
                  onBlur={handleBlur("resetToken")}
                  placeholder="Paste your reset token"
                  autoComplete="one-time-code"
                  required
                />
                {showError("resetToken") && (
                  <small className="auth-inline-error">{errors.resetToken}</small>
                )}
              </label>
            )}

            {view === "reset" && !form.resetToken && (
              <div className="auth-info">
                Open the password reset link from your email to continue. The reset form only works from that secure link.
              </div>
            )}

            {["login", "signup", "reset"].includes(view) && (
              <label className="auth-field">
                <span>{view === "reset" ? "New Password" : "Password"}</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  placeholder="At least 8 characters"
                  autoComplete={view === "signup" ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
                {showError("password") && (
                  <small className="auth-inline-error">{errors.password}</small>
                )}
              </label>
            )}

            {["signup", "reset"].includes(view) && (
              <label className="auth-field">
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  onBlur={handleBlur("confirmPassword")}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                />
                {showError("confirmPassword") && (
                  <small className="auth-inline-error">{errors.confirmPassword}</small>
                )}
              </label>
            )}

            {notice && (
              <div className={notice.type === "error" ? "auth-error auth-notice" : "auth-info auth-notice"}>
                <span>{notice.message}</span>
                <button type="button" className="auth-notice-dismiss" onClick={dismissNotice}>
                  ×
                </button>
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={submitting || (view === "reset" && !form.resetToken)}
            >
              {submitting && <span className="auth-submit-spinner" aria-hidden="true" />}
              <span>{submitLabel}</span>
            </button>
          </form>

          <div className="auth-actions">
            {view === "login" && (
              <button type="button" className="auth-link-btn" onClick={() => switchView("forgot")}>
                Forgot password?
              </button>
            )}

            {["forgot", "reset"].includes(view) && (
              <button type="button" className="auth-link-btn" onClick={() => switchView("login")}>
                Back to login
              </button>
            )}
          </div>
        </div>
      </section>

      <style>{`
        .auth-shell {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 32px;
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(124,106,247,.22), transparent 32%),
            radial-gradient(circle at bottom right, rgba(56,232,198,.16), transparent 28%),
            linear-gradient(135deg, #09090f 0%, #12121b 45%, #0b0b12 100%);
          position: relative;
          overflow-y: auto;
        }

        .auth-ambient {
          position: absolute;
          border-radius: 999px;
          filter: blur(50px);
          opacity: .55;
          pointer-events: none;
          animation: authFloat 8s ease-in-out infinite;
        }
        .auth-ambient-a {
          width: 320px;
          height: 320px;
          background: rgba(124,106,247,.22);
          top: -80px;
          right: -60px;
        }
        .auth-ambient-b {
          width: 280px;
          height: 280px;
          background: rgba(56,232,198,.16);
          bottom: -60px;
          left: -40px;
          animation-delay: -3s;
        }
        @keyframes authFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }

        .auth-panel {
          width: min(1080px, 100%);
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 24px;
          position: relative;
          z-index: 1;
        }

        .auth-copy,
        .auth-card {
          border: 1px solid rgba(63,63,70,.95);
          background: rgba(18,18,27,.78);
          backdrop-filter: blur(16px);
          box-shadow: 0 28px 80px rgba(0,0,0,.35);
        }

        .auth-copy {
          border-radius: 28px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 560px;
        }

        .auth-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(124,106,247,.12);
          border: 1px solid rgba(124,106,247,.24);
          color: #cfc9ff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .auth-copy h1 {
          max-width: 45ch;
          margin-top: 22px;
          font-size: clamp(2.4rem, 4vw, 3.8rem);
          line-height: 1.15;
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #ffffff;
          text-transform: none;
          margin-bottom: 16px;
        }

        .auth-copy p {
          max-width: 42rem;
          margin-top: 8px;
          font-size: 1rem;
          color: #d7d7e8;
          line-height: 1.6;
        }

        .auth-highlights {
          display: grid;
          gap: 14px;
          margin-top: 34px;
        }

        .auth-highlight {
          padding: 18px 20px;
          border-radius: 18px;
          background: rgba(9,9,15,.44);
          border: 1px solid rgba(63,63,70,.75);
        }

        .auth-highlight strong {
          display: block;
          color: #f4f4f5;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .auth-highlight span {
          color: #a1a1aa;
          font-size: 14px;
          line-height: 1.5;
        }

        .auth-card {
          border-radius: 24px;
          padding: 24px;
          align-self: center;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 6px;
          border-radius: 16px;
          background: #0f0f18;
          border: 1px solid #1f1f2a;
        }

        .auth-tabs button {
          border: none;
          border-radius: 12px;
          padding: 12px 14px;
          background: transparent;
          color: #87879b;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          transition: all .18s ease;
        }

        .auth-tabs button.active {
          background: linear-gradient(135deg, rgba(124,106,247,.95), rgba(93,81,201,.95));
          color: #fff;
          box-shadow: 0 10px 24px rgba(124,106,247,.25);
        }

        .auth-form {
          display: grid;
          gap: 16px;
          margin-top: 22px;
        }

        .auth-notice {
          animation: authNoticeIn .22s ease;
        }
        @keyframes authNoticeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }

        .auth-field {
          display: grid;
          gap: 8px;
        }

        .auth-field span {
          color: #c9c9d8;
          font-size: 13px;
          font-weight: 700;
        }

        .auth-field input {
          width: 100%;
          border: 1px solid #30303c;
          border-radius: 16px;
          background: #13131c;
          color: #f4f4f5;
          padding: 14px 16px;
          font: inherit;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        .auth-field input:focus {
          outline: none;
          border-color: #7c6af7;
          box-shadow: 0 0 0 4px rgba(124,106,247,.12);
        }

        .auth-inline-error {
          color: #fda4af;
          font-size: 12px;
          margin-top: -2px;
        }

        .auth-error,
        .auth-info {
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 13px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .auth-error {
          border: 1px solid rgba(239,68,68,.24);
          background: rgba(239,68,68,.08);
          color: #fda4af;
        }

        .auth-info {
          border: 1px solid rgba(56,232,198,.2);
          background: rgba(56,232,198,.08);
          color: #9df2e3;
        }

        .auth-submit {
          margin-top: 6px;
          border: none;
          border-radius: 16px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #38e8c6, #21bfa2);
          color: #071312;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
          box-shadow: 0 14px 34px rgba(56,232,198,.2);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .auth-submit:disabled {
          opacity: .7;
          cursor: progress;
        }

        .auth-submit-spinner {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid rgba(7,19,18,.18);
          border-top-color: #071312;
          animation: authSpin .7s linear infinite;
        }
        @keyframes authSpin {
          to { transform: rotate(360deg); }
        }

        .auth-notice-dismiss {
          border: none;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          opacity: .72;
        }
        .auth-notice-dismiss:hover {
          opacity: 1;
        }

        .auth-actions {
          display: flex;
          justify-content: flex-start;
          margin-top: 14px;
        }

        .auth-link-btn {
          border: none;
          background: none;
          color: #b9b2ff;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          padding: 0;
        }

        .auth-link-btn:hover {
          color: #e5e2ff;
        }

        @media (max-width: 900px) {
          .auth-panel {
            grid-template-columns: 1fr;
          }

          .auth-copy {
            min-height: auto;
          }

          .auth-copy h1 {
            max-width: none;
            font-size: clamp(2.2rem, 10vw, 3.3rem);
          }
        }

        @media (max-width: 640px) {
          .auth-shell {
            padding: 18px;
          }

          .auth-copy,
          .auth-card {
            padding: 22px;
            border-radius: 22px;
          }

          .auth-field input {
            padding: 16px;
            font-size: 16px;
          }

          .auth-submit {
            padding: 16px;
            font-size: 16px;
          }

          .auth-tabs button {
            padding: 14px 16px;
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .auth-shell {
            padding: 12px;
          }

          .auth-panel {
            gap: 16px;
          }

          .auth-copy,
          .auth-card {
            padding: 18px;
            border-radius: 18px;
          }

          .auth-copy h1 {
            font-size: clamp(1.8rem, 12vw, 2.5rem);
          }

          .auth-copy p {
            font-size: 0.9rem;
          }

          .auth-highlights {
            gap: 10px;
          }

          .auth-highlight {
            padding: 14px 16px;
          }

          .auth-form {
            gap: 14px;
            margin-top: 18px;
          }

          .auth-field input {
            padding: 14px 16px;
          }

          .auth-submit {
            padding: 14px 16px;
          }

          .auth-tabs button {
            padding: 12px 14px;
          }

          .auth-ambient-a {
            width: 200px;
            height: 200px;
            top: -40px;
            right: -30px;
          }

          .auth-ambient-b {
            width: 180px;
            height: 180px;
            bottom: -30px;
            left: -20px;
          }
        }

        @media (max-width: 360px) {
          .auth-shell {
            padding: 8px;
          }

          .auth-copy,
          .auth-card {
            padding: 14px;
            border-radius: 14px;
          }

          .auth-copy h1 {
            font-size: clamp(1.5rem, 14vw, 2rem);
          }

          .auth-copy p {
            font-size: 0.85rem;
          }

          .auth-highlight {
            padding: 12px 14px;
          }

          .auth-field input {
            padding: 12px 14px;
          }

          .auth-submit {
            padding: 12px 14px;
          }

          .auth-tabs button {
            padding: 10px 12px;
            font-size: 14px;
          }

          .auth-ambient-a,
          .auth-ambient-b {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
