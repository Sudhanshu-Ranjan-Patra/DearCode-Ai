import { useEffect, useMemo, useState } from "react";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const OTHER_OPTION = "__other__";
const MOOD_OPTIONS = [
  "Focused",
  "Calm",
  "Motivated",
  "Tired but trying",
  "Stressed",
  "Confused",
  "Excited",
  OTHER_OPTION,
];
const LEARNING_FOCUS_OPTIONS = [
  "Web Development",
  "MERN Stack",
  "DSA",
  "AI / ML",
  "Placements",
  "Freelancing",
  "UI / UX Design",
  OTHER_OPTION,
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read the selected image"));
    reader.readAsDataURL(file);
  });
}

function getSelectValue(value, options) {
  if (!value) return "";
  return options.includes(value) ? value : OTHER_OPTION;
}

export default function ProfileSettingsModal({
  open,
  user,
  saving = false,
  passwordSaving = false,
  onClose,
  onSaveProfile,
  onChangePassword,
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    email: "",
    mood: "",
    bio: "",
    learningFocus: "",
    avatarDataUrl: "",
  });
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [moodChoice, setMoodChoice] = useState("");
  const [learningFocusChoice, setLearningFocusChoice] = useState("");

  useEffect(() => {
    if (!open) return;
    setProfileDraft({
      name: user?.name || "",
      email: user?.email || "",
      mood: user?.mood || "",
      bio: user?.bio || "",
      learningFocus: user?.learningFocus || "",
      avatarDataUrl: user?.avatarDataUrl || "",
    });
    setPasswordDraft({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setMoodChoice(getSelectValue(user?.mood || "", MOOD_OPTIONS));
    setLearningFocusChoice(getSelectValue(user?.learningFocus || "", LEARNING_FOCUS_OPTIONS));
    setPreviewUrl("");
    setProfileError("");
    setPasswordError("");
  }, [open, user]);

  const previewName = useMemo(() => {
    return (profileDraft.name || user?.name || "U").slice(0, 1).toUpperCase();
  }, [profileDraft.name, user?.name]);

  if (!open) return null;

  const setField = (field, value) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }));
  };

  const setPasswordField = (field, value) => {
    setPasswordDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Please choose an image file for the profile photo.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setProfileError("Profile photo should be under 2 MB.");
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      const dataUrl = await readFileAsDataUrl(file);
      setField("avatarDataUrl", `${dataUrl}`);
      setProfileError("");
    } catch (err) {
      setProfileError(err.message || "Failed to load the image");
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveProfile = () => {
    setProfileError("");
    onSaveProfile?.(profileDraft);
  };

  const handleChangePassword = () => {
    setPasswordError("");
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setPasswordError("New password and confirm password must match.");
      return;
    }
    onChangePassword?.({
      currentPassword: passwordDraft.currentPassword,
      newPassword: passwordDraft.newPassword,
    });
    setPasswordDraft({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return (
    <div className="profile-modal-backdrop" onClick={onClose}>
      <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
        <div className="profile-header">
          <div>
            <span className="profile-badge">Profile</span>
            <h2>Your account, identity, and current vibe</h2>
            <p>Update your personal details, auth info, profile photo, and current mood from one clean place.</p>
          </div>
          <button type="button" className="profile-close" onClick={onClose}>×</button>
        </div>

        <div className="profile-layout">
          <section className="profile-card profile-card-accent">
            <div className="profile-photo-wrap">
              {profileDraft.avatarDataUrl ? (
                <img className="profile-photo" src={previewUrl || profileDraft.avatarDataUrl} alt="Profile preview" />
              ) : (
                <div className="profile-photo profile-photo-fallback">{previewName}</div>
              )}
              <div className="profile-photo-copy">
                <strong>{profileDraft.name || "Your profile"}</strong>
                <span>{profileDraft.mood || "Set your mood so the app feels more personal."}</span>
              </div>
            </div>

            <div className="profile-photo-actions">
              <label className="profile-upload-btn">
                Upload photo
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" onChange={handlePhotoChange} hidden />
              </label>
              {profileDraft.avatarDataUrl && (
                <button
                  type="button"
                  className="profile-link-btn"
                  onClick={() => {
                    setPreviewUrl("");
                    setField("avatarDataUrl", "");
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>

            {profileError && <div className="profile-local-error profile-section-error">{profileError}</div>}

            <label className="profile-field">
              <span>Current mood</span>
              <select
                value={moodChoice}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setMoodChoice(nextValue);
                  if (nextValue !== OTHER_OPTION) {
                    setField("mood", nextValue);
                  } else if (MOOD_OPTIONS.includes(profileDraft.mood)) {
                    setField("mood", "");
                  }
                }}
              >
                <option value="">Choose your current mood</option>
                {MOOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === OTHER_OPTION ? "Other" : option}
                  </option>
                ))}
              </select>
              {moodChoice === OTHER_OPTION && (
                <input
                  type="text"
                  value={profileDraft.mood}
                  onChange={(event) => setField("mood", event.target.value)}
                  placeholder="Write your mood in your own words"
                  maxLength={60}
                />
              )}
            </label>

            <label className="profile-field">
              <span>Learning focus</span>
              <select
                value={learningFocusChoice}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setLearningFocusChoice(nextValue);
                  if (nextValue !== OTHER_OPTION) {
                    setField("learningFocus", nextValue);
                  } else if (LEARNING_FOCUS_OPTIONS.includes(profileDraft.learningFocus)) {
                    setField("learningFocus", "");
                  }
                }}
              >
                <option value="">Choose your learning focus</option>
                {LEARNING_FOCUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === OTHER_OPTION ? "Other" : option}
                  </option>
                ))}
              </select>
              {learningFocusChoice === OTHER_OPTION && (
                <input
                  type="text"
                  value={profileDraft.learningFocus}
                  onChange={(event) => setField("learningFocus", event.target.value)}
                  placeholder="Write your learning focus in your own words"
                  maxLength={120}
                />
              )}
            </label>
          </section>

          <section className="profile-card">
            <div className="profile-section-head">
              <strong>Personal details</strong>
              <span>These shape how your account looks around the workspace.</span>
            </div>

            <div className="profile-grid">
              <label className="profile-field">
                <span>Full name</span>
                <input
                  type="text"
                  value={profileDraft.name}
                  onChange={(event) => setField("name", event.target.value)}
                  maxLength={80}
                />
              </label>

              <label className="profile-field">
                <span>Email address</span>
                <input
                  type="email"
                  value={profileDraft.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </label>
            </div>

            <label className="profile-field">
              <span>About you</span>
              <textarea
                value={profileDraft.bio}
                onChange={(event) => setField("bio", event.target.value)}
                rows={4}
                maxLength={280}
                placeholder="Write a short intro about what you're building, learning, or aiming for."
              />
            </label>

            <div className="profile-actions">
              <button type="button" className="profile-secondary" onClick={onClose}>Close</button>
              <button type="button" className="profile-primary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving profile…" : "Save profile"}
              </button>
            </div>
          </section>
        </div>

        <section className="profile-card profile-security">
          <div className="profile-section-head">
            <strong>Auth details</strong>
            <span>Change your password without leaving the workspace.</span>
          </div>

          <div className="profile-grid">
            <label className="profile-field">
              <span>Current password</span>
              <input
                type="password"
                value={passwordDraft.currentPassword}
                onChange={(event) => setPasswordField("currentPassword", event.target.value)}
                autoComplete="current-password"
              />
            </label>

            <label className="profile-field">
              <span>New password</span>
              <input
                type="password"
                value={passwordDraft.newPassword}
                onChange={(event) => setPasswordField("newPassword", event.target.value)}
                autoComplete="new-password"
              />
            </label>
          </div>

          <label className="profile-field">
            <span>Confirm new password</span>
            <input
              type="password"
              value={passwordDraft.confirmPassword}
              onChange={(event) => setPasswordField("confirmPassword", event.target.value)}
              autoComplete="new-password"
            />
          </label>

          {passwordError && <div className="profile-local-error">{passwordError}</div>}

          <div className="profile-actions">
            <button
              type="button"
              className="profile-primary"
              onClick={handleChangePassword}
              disabled={passwordSaving}
            >
              {passwordSaving ? "Updating password…" : "Update password"}
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .profile-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(4, 5, 10, .72);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          z-index: 130;
          padding: 20px;
        }
        .profile-modal {
          width: min(980px, 100%);
          max-height: 92dvh;
          overflow: auto;
          border-radius: 30px;
          border: 1px solid #2b2b38;
          background:
            radial-gradient(circle at top right, rgba(56,232,198,.10), transparent 28%),
            linear-gradient(180deg, rgba(15,15,23,.99), rgba(10,10,18,.99));
          box-shadow: 0 36px 110px rgba(0,0,0,.48);
          padding: 24px;
          color: #ececf8;
        }
        .profile-header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
        }
        .profile-badge {
          display: inline-flex;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #d2fff7;
          background: rgba(56,232,198,.10);
          border: 1px solid rgba(56,232,198,.22);
        }
        .profile-header h2 {
          margin: 12px 0 8px;
          font-size: clamp(1.7rem, 3vw, 2.4rem);
        }
        .profile-header p {
          color: #9fa0b8;
          max-width: 46rem;
          line-height: 1.6;
        }
        .profile-close {
          border: none;
          background: transparent;
          color: #c6c7da;
          font-size: 28px;
          cursor: pointer;
        }
        .profile-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 18px;
          margin-top: 24px;
        }
        .profile-card {
          border: 1px solid #2a2a38;
          background: rgba(17,17,26,.75);
          border-radius: 22px;
          padding: 18px;
        }
        .profile-card-accent {
          background:
            linear-gradient(180deg, rgba(17,17,26,.86), rgba(13,13,20,.96)),
            radial-gradient(circle at top left, rgba(124,106,247,.16), transparent 36%);
        }
        .profile-photo-wrap {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .profile-photo {
          width: 82px;
          height: 82px;
          border-radius: 22px;
          object-fit: cover;
          border: 1px solid rgba(255,255,255,.08);
          background: linear-gradient(135deg, #7c6af7, #38e8c6);
          color: white;
          display: grid;
          place-items: center;
          font-size: 30px;
          font-weight: 800;
        }
        .profile-photo-copy strong {
          display: block;
          font-size: 1rem;
        }
        .profile-photo-copy span {
          display: block;
          margin-top: 6px;
          color: #9ea5bf;
          line-height: 1.5;
        }
        .profile-photo-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .profile-upload-btn,
        .profile-link-btn,
        .profile-primary,
        .profile-secondary {
          border-radius: 14px;
          padding: 11px 15px;
          font: inherit;
          cursor: pointer;
          transition: all .18s ease;
        }
        .profile-upload-btn,
        .profile-link-btn,
        .profile-secondary {
          background: #13131e;
          border: 1px solid #2a2a3e;
          color: #d8dbf0;
        }
        .profile-primary {
          border: 1px solid rgba(56,232,198,.24);
          background: rgba(56,232,198,.12);
          color: #eafffb;
        }
        .profile-primary:hover:not(:disabled) {
          background: rgba(56,232,198,.18);
          border-color: rgba(56,232,198,.34);
        }
        .profile-secondary:hover,
        .profile-upload-btn:hover,
        .profile-link-btn:hover {
          border-color: #7c6af7;
          color: #f2efff;
        }
        .profile-primary:disabled,
        .profile-secondary:disabled {
          opacity: .65;
          cursor: not-allowed;
        }
        .profile-section-head {
          display: grid;
          gap: 5px;
          margin-bottom: 16px;
        }
        .profile-section-head strong {
          font-size: 1rem;
        }
        .profile-section-head span {
          color: #99a0ba;
          line-height: 1.5;
        }
        .profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .profile-field {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }
        .profile-field span {
          color: #bdc0d9;
          font-size: .95rem;
        }
        .profile-field input,
        .profile-field select,
        .profile-field textarea {
          width: 100%;
          border-radius: 14px;
          border: 1px solid #2f3042;
          background: #0f1018;
          color: #f4f5ff;
          padding: 12px 14px;
          font: inherit;
          resize: vertical;
        }
        .profile-field input:focus,
        .profile-field select:focus,
        .profile-field textarea:focus {
          outline: none;
          border-color: rgba(56,232,198,.4);
          box-shadow: 0 0 0 3px rgba(56,232,198,.10);
        }
        .profile-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 18px;
          flex-wrap: wrap;
        }
        .profile-security {
          margin-top: 18px;
        }
        .profile-local-error {
          margin-top: 14px;
          border-radius: 14px;
          border: 1px solid rgba(248,113,113,.22);
          background: rgba(127,29,29,.22);
          color: #fecaca;
          padding: 12px 14px;
        }
        .profile-section-error {
          margin-top: 12px;
        }
        @media (max-width: 860px) {
          .profile-layout {
            grid-template-columns: 1fr;
          }
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
