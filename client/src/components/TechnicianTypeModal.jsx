import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

// Icon and description for each type card
const TYPE_META = {
  "MECHANIC":           { icon: "🔧", desc: "Engine, gear box & mechanical repairs" },
  "MECHANIC HELPER":    { icon: "🪛", desc: "Assists mechanic on job cards" },
  "ELECTRICIAN":        { icon: "⚡", desc: "Electrical systems & wiring" },
  "ELECTRICIAN HELPER": { icon: "🔌", desc: "Assists electrician on job cards" },
};

const TYPES = Object.keys(TYPE_META);

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes ttmFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .ttm-overlay {
    position: fixed; inset: 0; z-index: 201;
    background: rgba(10, 22, 40, 0.80);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }

  .ttm-card {
    width: 100%; max-width: 440px;
    background: #FFFFFF; border: 1px solid #DDE3EE;
    padding: 28px 24px;
    font-family: 'IBM Plex Sans', -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    animation: ttmFadeUp 0.28s ease both;
  }

  .ttm-header {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 8px;
  }
  .ttm-icon-wrap {
    width: 44px; height: 44px; background: #FEF3C7;
    border: 1.5px solid #FDE68A;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .ttm-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.02em; text-transform: uppercase;
    line-height: 1.1; margin-bottom: 2px;
  }
  .ttm-subtitle { font-size: 11px; color: #6B7A99; font-weight: 400; }

  .ttm-notice {
    background: #FEF3C7; border: 1px solid #FDE68A;
    border-left: 3px solid #D97706;
    padding: 10px 12px; margin: 16px 0 24px;
    font-size: 11px; color: #92400E;
    font-weight: 500; line-height: 1.5;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  .ttm-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px; margin-bottom: 20px;
  }

  .ttm-type-card {
    border: 1.5px solid #DDE3EE;
    background: #F8FAFC;
    padding: 16px 12px;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    border-radius: 0;
  }
  .ttm-type-card:hover {
    border-color: #93C5FD;
    background: #EFF6FF;
  }
  .ttm-type-card.selected {
    border-color: #1E3A8A;
    background: #EEF2F7;
  }
  .ttm-type-icon {
    font-size: 26px; display: block; margin-bottom: 8px; line-height: 1;
  }
  .ttm-type-name {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #0A1628; margin-bottom: 4px;
    font-family: 'IBM Plex Sans', sans-serif;
    line-height: 1.3;
  }
  .ttm-type-card.selected .ttm-type-name { color: #1E3A8A; }
  .ttm-type-desc {
    font-size: 10px; color: #94A3B8; font-weight: 400; line-height: 1.4;
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .ttm-type-card.selected .ttm-type-desc { color: #6B7A99; }

  .ttm-error {
    font-size: 11px; color: #DC2626;
    font-weight: 600; margin-bottom: 14px;
    letter-spacing: 0.04em;
  }
  .ttm-server-error {
    background: #FEF2F2; border: 1px solid #FECACA;
    border-left: 3px solid #DC2626;
    padding: 10px 12px; font-size: 12px;
    font-weight: 500; color: #991B1B;
    margin-bottom: 14px;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  .ttm-btn {
    width: 100%; height: 52px;
    background: #1E3A8A; color: #FFFFFF; border: none;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.2em; text-transform: uppercase;
    cursor: pointer; transition: background 0.15s;
    border-radius: 0; -webkit-tap-highlight-color: transparent;
  }
  .ttm-btn:hover:not(:disabled) { background: #1E40AF; }
  .ttm-btn:disabled { background: #94A3B8; cursor: not-allowed; }
`;

export default function TechnicianTypeModal() {
  const { setAuth }                     = useAuthStore();
  const [selected,    setSelected]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [fieldError,  setFieldError]  = useState("");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const id = "ttm-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = STYLES;
      document.head.appendChild(el);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, []);

  const handleSubmit = async () => {
    if (!selected) {
      setFieldError("Please select your role to continue");
      return;
    }
    setLoading(true);
    setFieldError("");
    setServerError("");
    try {
      const res = await api.put("/api/auth/type-setup", { technicianType: selected });
      // Fresh token + updated user → modal disappears, entries unlocked
      setAuth(res.data.token, res.data.user);
    } catch (err) {
      setServerError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ttm-overlay">
      <div className="ttm-card">

        {/* Header */}
        <div className="ttm-header">
          <div className="ttm-icon-wrap">👷</div>
          <div>
            <div className="ttm-title">One More Step</div>
            <div className="ttm-subtitle">Select your role to unlock entry logging</div>
          </div>
        </div>

        {/* Notice */}
        <div className="ttm-notice">
          We've added technician roles to the system. Select yours below — your existing
          entries will be updated automatically. This is a one-time step.
        </div>

        {/* Type cards — 2×2 grid */}
        <div className="ttm-grid">
          {TYPES.map((type) => {
            const { icon, desc } = TYPE_META[type];
            return (
              <button
                key={type}
                type="button"
                className={`ttm-type-card${selected === type ? " selected" : ""}`}
                onClick={() => { setSelected(type); setFieldError(""); }}
                disabled={loading}
              >
                <span className="ttm-type-icon">{icon}</span>
                <div className="ttm-type-name">{type}</div>
                <div className="ttm-type-desc">{desc}</div>
              </button>
            );
          })}
        </div>

        {fieldError  && <div className="ttm-error">{fieldError}</div>}
        {serverError && <div className="ttm-server-error">{serverError}</div>}

        <button className="ttm-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving & Updating Entries…" : "Confirm Role →"}
        </button>

      </div>
    </div>
  );
}