import { useMemo, useState } from "react";

const CHARACTER_ORDER = ["girlfriend", "bestfriend", "motivator"];

function getEmptyCatalog() {
  return {
    presetOptions: [],
    temperamentOptions: [],
    interactionModes: [],
    traitOptions: [],
    ageRange: { min: 18, max: 60 },
    defaultAgentName: "Companion",
    label: "Companion",
  };
}

export default function PersonaSettingsModal({
  open,
  initialCharacter = "girlfriend",
  profiles = {},
  catalog = {},
  saving = false,
  onClose,
  onSave,
}) {
  const [activeCharacter, setActiveCharacter] = useState(initialCharacter);
  const [drafts, setDrafts] = useState(profiles);

  const activeCatalog = catalog[activeCharacter] || getEmptyCatalog();
  const activeDraft = useMemo(() => ({
    ...(profiles[activeCharacter] || {}),
    ...(drafts[activeCharacter] || {}),
  }), [activeCharacter, drafts, profiles]);

  if (!open) return null;

  const setField = (field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [activeCharacter]: {
        ...(profiles[activeCharacter] || {}),
        ...(prev[activeCharacter] || {}),
        [field]: value,
      },
    }));
  };

  const toggleTrait = (trait) => {
    const current = activeDraft.selectedTraits || [];
    const next = current.includes(trait)
      ? current.filter((item) => item !== trait)
      : [...current, trait].slice(0, 6);
    setField("selectedTraits", next);
  };

  const handleSave = () => {
    onSave(activeCharacter, activeDraft);
  };

  return (
    <div className="persona-modal-backdrop" onClick={onClose}>
      <div className="persona-modal" onClick={(event) => event.stopPropagation()}>
        <div className="persona-header">
          <div>
            <span className="persona-badge">Persona Settings</span>
            <h2>Shape each role the way you want it to feel</h2>
            <p>Name the role, choose the vibe, tune temperament, and save a distinct identity for each companion.</p>
          </div>
          <button type="button" className="persona-close" onClick={onClose}>×</button>
        </div>

        <div className="persona-tabs">
          {CHARACTER_ORDER.map((character) => {
            const item = catalog[character] || getEmptyCatalog();
            const name = drafts[character]?.agentName || profiles[character]?.agentName || item.defaultAgentName;
            return (
              <button
                key={character}
                type="button"
                className={`persona-tab ${activeCharacter === character ? "active" : ""}`}
                onClick={() => setActiveCharacter(character)}
              >
                <span>{item.label}</span>
                <small>{name}</small>
              </button>
            );
          })}
        </div>

        <div className="persona-grid">
          <label className="persona-field">
            <span>Agent name</span>
            <input
              type="text"
              value={activeDraft.agentName || ""}
              onChange={(event) => setField("agentName", event.target.value)}
              placeholder={activeCatalog.defaultAgentName}
              maxLength={40}
            />
          </label>

          <label className="persona-field">
            <span>Adult age</span>
            <input
              type="number"
              min={Math.max(18, activeCatalog.ageRange?.min || 18)}
              max={activeCatalog.ageRange?.max || 60}
              value={activeDraft.age || 22}
              onChange={(event) => setField("age", Number(event.target.value))}
            />
          </label>

          <label className="persona-field">
            <span>Base preset</span>
            <select
              value={activeDraft.presetKey || ""}
              onChange={(event) => setField("presetKey", event.target.value)}
            >
              {activeCatalog.presetOptions.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="persona-field">
            <span>Temperament</span>
            <select
              value={activeDraft.temperament || ""}
              onChange={(event) => setField("temperament", event.target.value)}
            >
              {activeCatalog.temperamentOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="persona-field">
            <span>Interaction mode</span>
            <select
              value={activeDraft.interactionMode || ""}
              onChange={(event) => setField("interactionMode", event.target.value)}
            >
              {activeCatalog.interactionModes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="persona-field">
            <span>Response style</span>
            <select
              value={activeDraft.responseStyle || "balanced"}
              onChange={(event) => setField("responseStyle", event.target.value)}
            >
              <option value="minimal">minimal</option>
              <option value="balanced">balanced</option>
              <option value="expressive">expressive</option>
            </select>
          </label>
        </div>

        <div className="persona-slider-block">
          <div className="persona-slider-copy">
            <strong>Emotional intensity</strong>
            <span>How strongly this persona reacts and expresses emotion.</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={activeDraft.emotionalIntensity || 3}
            onChange={(event) => setField("emotionalIntensity", Number(event.target.value))}
          />
          <span className="persona-slider-value">{activeDraft.emotionalIntensity || 3}/5</span>
        </div>

        <div className="persona-section">
          <strong>Core traits</strong>
          <p>Pick up to 6 traits that should consistently color this role’s personality.</p>
          <div className="trait-grid">
            {activeCatalog.traitOptions.map((trait) => {
              const active = (activeDraft.selectedTraits || []).includes(trait);
              return (
                <button
                  key={trait}
                  type="button"
                  className={`trait-chip ${active ? "active" : ""}`}
                  onClick={() => toggleTrait(trait)}
                >
                  {trait}
                </button>
              );
            })}
          </div>
        </div>

        <div className="persona-grid persona-text-grid">
          <label className="persona-field persona-wide">
            <span>Backstory / vibe note</span>
            <textarea
              value={activeDraft.customBackstory || ""}
              onChange={(event) => setField("customBackstory", event.target.value)}
              placeholder="Example: speaks like a polished, emotionally mature Delhi girl with elegant humor."
              maxLength={280}
              rows={3}
            />
          </label>

          <label className="persona-field persona-wide">
            <span>Extra hidden instructions</span>
            <textarea
              value={activeDraft.customInstructions || ""}
              onChange={(event) => setField("customInstructions", event.target.value)}
              placeholder="Example: use my nickname naturally, be patient when I overthink, avoid sounding robotic."
              maxLength={500}
              rows={4}
            />
          </label>
        </div>

        <div className="persona-actions">
          <button type="button" className="persona-secondary" onClick={onClose}>Close</button>
          <button type="button" className="persona-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving personality…" : `Save ${activeCatalog.label} settings`}
          </button>
        </div>
      </div>

      <style>{`
        .persona-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.68);
          backdrop-filter: blur(6px);
          display: grid;
          place-items: center;
          z-index: 120;
          padding: 20px;
        }
        .persona-modal {
          width: min(960px, 100%);
          max-height: 92dvh;
          overflow: auto;
          border-radius: 28px;
          border: 1px solid #2a2a38;
          background: linear-gradient(180deg, rgba(15,15,23,.98), rgba(10,10,18,.98));
          box-shadow: 0 32px 100px rgba(0,0,0,.45);
          padding: 24px;
          color: #ececf8;
        }
        .persona-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }
        .persona-header h2 {
          margin: 12px 0 8px;
          font-size: clamp(1.8rem, 3vw, 2.4rem);
        }
        .persona-header p {
          color: #9fa0b8;
          max-width: 46rem;
          line-height: 1.6;
        }
        .persona-badge {
          display: inline-flex;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #d6d1ff;
          background: rgba(124,106,247,.14);
          border: 1px solid rgba(124,106,247,.26);
        }
        .persona-close {
          border: none;
          background: transparent;
          color: #c6c7da;
          font-size: 28px;
          cursor: pointer;
        }
        .persona-tabs {
          display: flex;
          gap: 10px;
          margin-top: 22px;
          flex-wrap: wrap;
        }
        .persona-tab {
          border: 1px solid #313245;
          background: #141420;
          color: #b7b9d5;
          border-radius: 16px;
          padding: 12px 16px;
          min-width: 160px;
          text-align: left;
          cursor: pointer;
          display: grid;
          gap: 4px;
        }
        .persona-tab.active {
          border-color: rgba(56,232,198,.34);
          background: rgba(56,232,198,.08);
          color: #f6fffd;
        }
        .persona-tab small {
          color: #8c8fab;
        }
        .persona-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 22px;
        }
        .persona-text-grid {
          grid-template-columns: 1fr;
        }
        .persona-field {
          display: grid;
          gap: 8px;
        }
        .persona-field span, .persona-section strong, .persona-slider-copy strong {
          font-size: 13px;
          font-weight: 700;
          color: #f2f2fa;
        }
        .persona-field input,
        .persona-field select,
        .persona-field textarea {
          width: 100%;
          background: #12121b;
          color: #f3f3f9;
          border: 1px solid #303144;
          border-radius: 16px;
          padding: 14px 16px;
          font: inherit;
        }
        .persona-field textarea {
          resize: vertical;
          min-height: 92px;
        }
        .persona-field input:focus,
        .persona-field select:focus,
        .persona-field textarea:focus {
          outline: none;
          border-color: #7c6af7;
          box-shadow: 0 0 0 4px rgba(124,106,247,.12);
        }
        .persona-slider-block {
          display: grid;
          grid-template-columns: 1fr minmax(140px, 280px) auto;
          gap: 16px;
          align-items: center;
          margin-top: 22px;
          padding: 16px 18px;
          border: 1px solid #2b2c3d;
          border-radius: 20px;
          background: rgba(15,15,23,.7);
        }
        .persona-slider-copy span, .persona-section p {
          color: #8e90aa;
          font-size: 13px;
          line-height: 1.6;
        }
        .persona-slider-value {
          font-size: 12px;
          color: #d4d5e8;
          font-weight: 700;
        }
        .persona-section {
          margin-top: 22px;
        }
        .trait-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
        }
        .trait-chip {
          border: 1px solid #34354b;
          background: #13131d;
          color: #adb0cb;
          border-radius: 999px;
          padding: 9px 14px;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
        }
        .trait-chip.active {
          border-color: rgba(124,106,247,.36);
          background: rgba(124,106,247,.14);
          color: #f2f1ff;
        }
        .persona-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 26px;
        }
        .persona-primary,
        .persona-secondary {
          border-radius: 16px;
          padding: 12px 18px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }
        .persona-primary {
          border: none;
          background: linear-gradient(135deg, #7c6af7, #38e8c6);
          color: #071112;
        }
        .persona-secondary {
          border: 1px solid #2f3042;
          background: #12121b;
          color: #d8daef;
        }
        @media (max-width: 720px) {
          .persona-grid {
            grid-template-columns: 1fr;
          }
          .persona-slider-block {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
