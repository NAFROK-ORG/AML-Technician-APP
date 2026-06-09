import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";
import { normalizeVehicleNo } from "../utils/vehicleUtils";

// ─── Injected styles ──────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes secFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes secSpinner {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes secPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }

  /* Kill number spinners */
  .sec-input[type=number]::-webkit-inner-spin-button,
  .sec-input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .sec-input[type=number] { -moz-appearance: textfield; }

  .sec-page {
    min-height: 100dvh;
    background: #EEF2F7;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Page header ── */
  .sec-page-header {
    padding: 24px 20px 20px;
    background: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
  }
  .sec-eyebrow {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #B45309; margin-bottom: 6px;
  }
  .sec-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 36px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.02em; text-transform: uppercase;
    line-height: 1; margin-bottom: 8px;
  }
  .sec-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sec-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: #6B7A99; background: #F8FAFC;
    padding: 3px 8px; border: 1px solid #DDE3EE;
  }
  .sec-badge--amber {
    color: #B45309; border-color: #FCD34D; background: #FFFBEB;
  }

  /* ── Content area ── */
  .sec-content {
    padding: 0 0 80px;
    max-width: 600px;
    margin: 0 auto;
  }

  /* ── Card ── */
  .sec-card {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    border-left: 4px solid #B45309;
    margin-bottom: 0;
  }
  .sec-card-header {
    padding: 16px 20px 14px;
    border-bottom: 1px solid #EEF2F7;
  }
  .sec-card-eyebrow {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #6B7A99;
  }
  .sec-card-body { padding: 20px; }

  /* ── Vehicle input ── */
  .sec-vehicle-input {
    width: 100%;
    box-sizing: border-box;
    height: 64px;
    padding: 0 16px;
    background: #F8FAFC;
    border: 2px solid #CBD5E1;
    border-radius: 0;
    color: #0A1628;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .sec-vehicle-input:focus {
    border-color: #B45309;
    background: #FFFFFF;
    outline: none;
  }
  .sec-vehicle-input::placeholder {
    color: #CBD5E1;
    font-weight: 400;
    letter-spacing: 0.04em;
  }
  .sec-vehicle-input.err { border-color: #DC2626 !important; background: #FEF2F2 !important; }

  .sec-norm-preview {
    margin-top: 6px;
    font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
    font-family: 'IBM Plex Mono', monospace;
    color: #B45309;
    min-height: 16px;
  }

  .sec-error-text {
    margin-top: 8px;
    font-size: 12px; font-weight: 600; color: #DC2626;
    font-family: 'IBM Plex Sans', sans-serif;
    letter-spacing: 0.02em;
  }

  /* ── Log button ── */
  .sec-log-btn {
    width: 100%; height: 60px;
    background: #B45309; border: none; border-radius: 0;
    color: #FFFFFF;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: background 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    margin-top: 16px;
  }
  .sec-log-btn:hover:not(:disabled)  { background: #92400E; }
  .sec-log-btn:active:not(:disabled) { background: #B45309; transform: scale(0.99); }
  .sec-log-btn:disabled { background: #D97706; cursor: not-allowed; opacity: 0.7; }

  .sec-spinner {
    display: inline-block; width: 17px; height: 17px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: #FFFFFF; border-radius: 50%;
    animation: secSpinner 0.65s linear infinite;
    flex-shrink: 0;
  }

  /* ── Today strip ── */
  .sec-today-strip {
    background: #F8FAFC;
    border: 1px solid #DDE3EE;
    border-top: none;
    padding: 8px 20px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .sec-today-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #6B7A99;
  }
  .sec-today-count {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px; font-weight: 700; color: #B45309;
  }

  /* ── Logs section ── */
  .sec-logs-section {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    border-top: none;
  }
  .sec-logs-header {
    padding: 14px 20px;
    border-bottom: 1px solid #EEF2F7;
    display: flex; align-items: center; justify-content: space-between;
  }
  .sec-logs-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #6B7A99;
  }

  /* ── Log row ── */
  .sec-log-row {
    padding: 16px 20px;
    border-bottom: 1px solid #F1F5F9;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    animation: secFadeUp 0.2s ease both;
  }
  .sec-log-row:last-child { border-bottom: none; }
  .sec-log-left { flex: 1; min-width: 0; }
  .sec-log-vehicle {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 16px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.06em; line-height: 1; margin-bottom: 4px;
  }
  .sec-log-norm {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; font-weight: 600; color: #B45309;
    letter-spacing: 0.06em;
  }
  .sec-log-time {
    font-size: 10px; font-weight: 600; color: #94A3B8;
    letter-spacing: 0.06em; margin-top: 4px;
  }
  .sec-log-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .sec-edit-btn {
    background: transparent; border: 1px solid #DDE3EE; border-radius: 0;
    padding: 6px 12px; cursor: pointer; color: #6B7A99;
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; font-family: 'IBM Plex Sans', sans-serif;
    transition: border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .sec-edit-btn:hover { border-color: #B45309; color: #B45309; }
  .sec-edit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Inline edit row ── */
  .sec-edit-row {
    padding: 14px 20px;
    border-bottom: 1px solid #F1F5F9;
    background: #FFFBEB;
    border-left: 3px solid #B45309;
  }
  .sec-edit-input {
    width: 100%; box-sizing: border-box;
    height: 52px; padding: 0 14px;
    background: #FFFFFF; border: 2px solid #B45309; border-radius: 0;
    color: #0A1628;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase;
    outline: none; appearance: none; -webkit-appearance: none;
  }
  .sec-edit-input::placeholder { color: #CBD5E1; font-weight: 400; }
  .sec-edit-actions {
    display: flex; gap: 8px; margin-top: 10px;
  }
  .sec-save-btn {
    flex: 1; height: 44px;
    background: #B45309; border: none; border-radius: 0;
    color: #FFFFFF; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .sec-save-btn:hover:not(:disabled) { background: #92400E; }
  .sec-save-btn:disabled { background: #D97706; cursor: not-allowed; opacity: 0.7; }
  .sec-cancel-btn {
    flex: 1; height: 44px;
    background: transparent; border: 1px solid #DDE3EE; border-radius: 0;
    color: #6B7A99; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase;
    transition: border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .sec-cancel-btn:hover:not(:disabled) { border-color: #94A3B8; color: #374151; }
  .sec-cancel-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sec-edit-error {
    margin-top: 6px; font-size: 11px; font-weight: 600;
    color: #DC2626; font-family: 'IBM Plex Sans', sans-serif;
  }
  .sec-edit-norm {
    margin-top: 5px;
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    font-family: 'IBM Plex Mono', monospace; color: #B45309;
    min-height: 14px;
  }

  /* ── Empty + loading states ── */
  .sec-empty {
    padding: 48px 20px; text-align: center;
  }
  .sec-empty-icon { font-size: 28px; margin-bottom: 10px; }
  .sec-empty-text {
    font-size: 12px; font-weight: 600; color: #94A3B8;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .sec-loading-text {
    padding: 32px 20px; text-align: center;
    font-size: 11px; font-weight: 600; color: #94A3B8;
    letter-spacing: 0.12em; text-transform: uppercase;
  }

  /* ── Animations ── */
  .sec-a1 { animation: secFadeUp 0.28s ease both 0.00s; }
  .sec-a2 { animation: secFadeUp 0.28s ease both 0.06s; }
  .sec-a3 { animation: secFadeUp 0.28s ease both 0.10s; }
`;

// ─── Style injection ──────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const ID = "sec-dashboard-styles";
  if (!document.getElementById(ID)) {
    const el = document.createElement("style");
    el.id = ID;
    el.textContent = STYLES;
    document.head.appendChild(el);
  } else {
    document.getElementById(ID).textContent = STYLES;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const TODAY_LABEL = new Date().toLocaleDateString("en-IN", {
  weekday: "short", day: "numeric", month: "short", year: "numeric",
}).toUpperCase();

// ─── Inline edit component ────────────────────────────────────────────────────
function EditRow({ log, onSave, onCancel, saving, error }) {
  const [val, setVal] = useState(log.vehicleNo || "");
  const inputRef      = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleChange = (e) => {
    setVal(e.target.value.toUpperCase());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") onSave(val);
    if (e.key === "Escape") onCancel();
  };

  const norm = normalizeVehicleNo(val);

  return (
    <div className="sec-edit-row">
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="KA01AB1234"
        maxLength={20}
        autoComplete="off"
        spellCheck={false}
        disabled={saving}
        className="sec-edit-input"
      />
      {val && norm && (
        <p className="sec-edit-norm">Stored as: {norm}</p>
      )}
      {error && <p className="sec-edit-error">{error}</p>}
      <div className="sec-edit-actions">
        <button
          className="sec-save-btn"
          onClick={() => onSave(val)}
          disabled={saving || val.trim().length < 2}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          className="sec-cancel-btn"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Log row component ────────────────────────────────────────────────────────
function LogRow({ log, editingId, editSaving, editError, onEditStart, onEditSave, onEditCancel }) {
  if (editingId === log._id) {
    return (
      <EditRow
        log={log}
        onSave={onEditSave}
        onCancel={onEditCancel}
        saving={editSaving}
        error={editError}
      />
    );
  }

  return (
    <div className="sec-log-row">
      <div className="sec-log-left">
        <div className="sec-log-vehicle">{log.vehicleNo}</div>
        <div className="sec-log-norm">{log.vehicleNoNorm}</div>
        <div className="sec-log-time">{fmtTime(log.loggedAt)}</div>
      </div>
      <div className="sec-log-actions">
        <button
          className="sec-edit-btn"
          onClick={() => onEditStart(log)}
          disabled={!!editingId}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SecurityDashboard() {
  const { user } = useAuthStore();

  // ── Log vehicle state ──────────────────────────────────────────────────────
  const [vehicleNo,    setVehicleNo]    = useState("");
  const [submitError,  setSubmitError]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);

  // ── Logs state ─────────────────────────────────────────────────────────────
  const [logs,         setLogs]         = useState([]);
  const [logsLoading,  setLogsLoading]  = useState(true);

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editingId,    setEditingId]    = useState(null);
  const [editSaving,   setEditSaving]   = useState(false);
  const [editError,    setEditError]    = useState("");

  const inputRef = useRef(null);

  // ── Fetch today's logs ─────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get("/api/security/today");
      setLogs(res.data);
    } catch (err) {
      console.error("[SecurityDashboard] fetch error:", err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Log vehicle ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const trimmed = vehicleNo.trim();
    if (trimmed.length < 2) {
      setSubmitError("Enter at least 2 characters");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await api.post("/api/security/log", { vehicleNo: trimmed });
      // Optimistic prepend: new log appears at top instantly.
      setLogs((prev) => [res.data, ...prev]);
      setVehicleNo("");
      // Refocus input so the security user can immediately log the next vehicle.
      inputRef.current?.focus();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to log vehicle. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleInputChange = (e) => {
    setVehicleNo(e.target.value.toUpperCase());
    if (submitError) setSubmitError("");
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEditStart = useCallback((log) => {
    setEditingId(log._id);
    setEditError("");
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditError("");
  }, []);

  const handleEditSave = useCallback(async (newVehicleNo) => {
    const trimmed = newVehicleNo.trim();
    if (trimmed.length < 2) {
      setEditError("Enter at least 2 characters");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await api.put(`/api/security/log/${editingId}`, {
        vehicleNo: trimmed,
      });
      // Update the log in-place — no refetch needed.
      setLogs((prev) => prev.map((l) => (l._id === editingId ? res.data : l)));
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update. Try again.");
    } finally {
      setEditSaving(false);
    }
  }, [editingId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const norm = normalizeVehicleNo(vehicleNo);

  return (
    <div className="sec-page">
      <Navbar />

      {/* ── Page header ── */}
      <div className="sec-page-header sec-a1">
        <div className="sec-eyebrow">Security Dashboard</div>
        <h1 className="sec-name">{user?.name?.split(" ")[0]}</h1>
        <div className="sec-meta">
          {user?.branch && (
            <span className="sec-badge">{user.branch}</span>
          )}
          <span className="sec-badge sec-badge--amber">Gate Security</span>
          <span className="sec-badge">{TODAY_LABEL}</span>
        </div>
      </div>

      <div className="sec-content">

        {/* ── Log vehicle card ── */}
        <div className="sec-card sec-a2">
          <div className="sec-card-header">
            <div className="sec-card-eyebrow">Log Incoming Vehicle</div>
          </div>
          <div className="sec-card-body">
            <input
              ref={inputRef}
              type="text"
              value={vehicleNo}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="KA01AB1234"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={submitting}
              className={`sec-vehicle-input${submitError ? " err" : ""}`}
              aria-label="Vehicle number"
            />
            {/* Normalization preview */}
            <p className="sec-norm-preview">
              {vehicleNo && norm ? `Stored as: ${norm}` : ""}
            </p>
            {/* Submit error */}
            {submitError && (
              <p className="sec-error-text">{submitError}</p>
            )}
            <button
              className="sec-log-btn"
              onClick={handleSubmit}
              disabled={submitting || vehicleNo.trim().length < 2}
            >
              {submitting
                ? <><span className="sec-spinner" />Logging…</>
                : "Log Vehicle"}
            </button>
          </div>
        </div>

        {/* ── Today strip ── */}
        <div className="sec-today-strip sec-a2">
          <span className="sec-today-label">Vehicles logged today</span>
          <span className="sec-today-count">{logs.length}</span>
        </div>

        {/* ── Logs list ── */}
        <div className="sec-logs-section sec-a3">
          <div className="sec-logs-header">
            <span className="sec-logs-label">Today's Log</span>
          </div>

          {logsLoading ? (
            <p className="sec-loading-text">Loading…</p>
          ) : logs.length === 0 ? (
            <div className="sec-empty">
              <div className="sec-empty-icon">🚗</div>
              <p className="sec-empty-text">No vehicles logged yet today</p>
            </div>
          ) : (
            logs.map((log) => (
              <LogRow
                key={log._id}
                log={log}
                editingId={editingId}
                editSaving={editSaving}
                editError={editError}
                onEditStart={handleEditStart}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}