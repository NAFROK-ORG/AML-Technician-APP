import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { BRANCHES, TECHNICIAN_TYPES } from "../utils/constants";

const MODAL_STYLES = `
  @keyframes psmFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .psm-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(10, 22, 40, 0.72);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .psm-card {
    width: 100%; max-width: 420px;
    background: #FFFFFF; border: 1px solid #DDE3EE;
    padding: 28px 24px;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    animation: psmFadeUp 0.28s ease both;
    max-height: 92dvh; overflow-y: auto;
  }
  .psm-header {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 24px; padding-bottom: 20px;
    border-bottom: 1px solid #EEF2F7;
  }
  .psm-icon {
    width: 44px; height: 44px;
    background: #EEF2F7; border: 1.5px solid #DDE3EE;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .psm-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.02em; text-transform: uppercase;
    line-height: 1.1; margin-bottom: 3px;
  }
  .psm-subtitle { font-size: 11px; color: #6B7A99; font-weight: 400; letter-spacing: 0.04em; }
  .psm-form { display: flex; flex-direction: column; gap: 18px; }
  .psm-field-group { display: flex; flex-direction: column; gap: 6px; }
  .psm-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #6B7A99;
  }
  .psm-input {
    width: 100%; height: 48px; padding: 0 14px;
    background: #F8FAFC; border: 1.5px solid #DDE3EE;
    color: #0A1628; font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px; font-weight: 500; outline: none;
    transition: border-color 0.15s, background 0.15s;
    border-radius: 0; box-sizing: border-box; -webkit-appearance: none;
  }
  .psm-input:focus { border-color: #1E3A8A; background: #FFFFFF; }
  .psm-input::placeholder { color: #94A3B8; font-weight: 400; }
  .psm-input-mono { font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em; }
  .psm-error { font-size: 10px; color: #DC2626; font-weight: 600; letter-spacing: 0.04em; }
  .psm-server-error {
    background: #FEF2F2; border: 1px solid #FECACA;
    border-left: 3px solid #DC2626;
    padding: 10px 12px; font-size: 12px; font-weight: 500;
    color: #991B1B; font-family: 'IBM Plex Sans', sans-serif;
  }
  .psm-submit-btn {
    width: 100%; height: 52px; background: #1E3A8A; color: #FFFFFF;
    border: none; font-family: 'IBM Plex Sans', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; cursor: pointer; transition: background 0.15s;
    border-radius: 0; -webkit-tap-highlight-color: transparent;
  }
  .psm-submit-btn:hover:not(:disabled) { background: #1E40AF; }
  .psm-submit-btn:disabled { background: #94A3B8; cursor: not-allowed; }
  .psm-divider { margin-top: 20px; padding-top: 16px; border-top: 1px solid #EEF2F7; }
  .psm-admin-link {
    display: block; width: 100%; background: none; border: none;
    color: #94A3B8; font-size: 11px; font-weight: 500; cursor: pointer;
    text-decoration: underline; text-decoration-style: dotted;
    text-underline-offset: 3px; padding: 0;
    font-family: 'IBM Plex Sans', sans-serif; text-align: center;
    letter-spacing: 0.04em; transition: color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .psm-admin-link:hover { color: #6B7A99; }
  .psm-approval-box {
    display: flex; align-items: flex-start; gap: 10px;
    background: #EEF2F7; border: 1px solid #DDE3EE;
    border-left: 3px solid #1E3A8A; padding: 12px 14px;
  }
  .psm-approval-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .psm-approval-title {
    font-size: 12px; font-weight: 700; color: #0A1628;
    margin-bottom: 4px; letter-spacing: 0.04em;
  }
  .psm-approval-text { font-size: 11px; color: #6B7A99; line-height: 1.5; margin: 0; }
  .psm-approval-name {
    color: #1E3A8A; font-weight: 700;
    font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em;
  }
`;

export default function ProfileSetupModal() {
  const { setAuth, user }                   = useAuthStore();
  const [loading,         setLoading]         = useState(false);
  const [serverError,     setServerError]     = useState("");
  const [showApprovalMsg, setShowApprovalMsg] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: user?.name || "" },
  });

  useEffect(() => {
    const id = "psm-modal-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = MODAL_STYLES;
      document.head.appendChild(el);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      // data now includes technicianType — backend profile-setup accepts it
      const res = await api.put("/api/auth/profile-setup", data);
      setAuth(res.data.token, res.data.user);
    } catch (err) {
      setServerError(err.response?.data?.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="psm-overlay">
      <div className="psm-card">

        <div className="psm-header">
          <div className="psm-icon">👷</div>
          <div>
            <div className="psm-title">Complete Profile</div>
            <div className="psm-subtitle">One-time setup · takes 30 seconds</div>
          </div>
        </div>

        <form className="psm-form" onSubmit={handleSubmit(onSubmit)}>

          {/* Technician ID */}
          <div className="psm-field-group">
            <label className="psm-label">Technician ID</label>
            <input
              className="psm-input psm-input-mono"
              type="text"
              placeholder="e.g. TEC-2045"
              {...register("technicianId", { required: "Technician ID is required" })}
            />
            {errors.technicianId && (
              <span className="psm-error">{errors.technicianId.message}</span>
            )}
          </div>

          {/* Display Name */}
          <div className="psm-field-group">
            <label className="psm-label">Display Name</label>
            <input
              className="psm-input"
              type="text"
              placeholder="Your full name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <span className="psm-error">{errors.name.message}</span>
            )}
          </div>

          {/* Branch */}
          <div className="psm-field-group">
            <label className="psm-label">Branch</label>
            <select
              className="psm-input"
              {...register("branch", { required: "Branch is required" })}
            >
              <option value="">Select your branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {errors.branch && (
              <span className="psm-error">{errors.branch.message}</span>
            )}
          </div>

          {/* Technician Type — NEW */}
          <div className="psm-field-group">
            <label className="psm-label">Your Role</label>
            <select
              className="psm-input"
              {...register("technicianType", { required: "Please select your role" })}
            >
              <option value="">Select your role</option>
              {TECHNICIAN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.technicianType && (
              <span className="psm-error">{errors.technicianType.message}</span>
            )}
          </div>

          {serverError && (
            <div className="psm-server-error">{serverError}</div>
          )}

          <button className="psm-submit-btn" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save & Continue →"}
          </button>

        </form>

        <div className="psm-divider">
          {!showApprovalMsg ? (
            <button
              type="button"
              className="psm-admin-link"
              onClick={() => setShowApprovalMsg(true)}
            >
              Are you an admin?
            </button>
          ) : (
            <div className="psm-approval-box">
              <span className="psm-approval-icon">🔒</span>
              <div>
                <p className="psm-approval-title">Waiting for approval</p>
                <p className="psm-approval-text">
                  Admin access is managed directly. Please contact{" "}
                  <span className="psm-approval-name">NAFROK</span>{" "}
                  to get your account elevated.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}