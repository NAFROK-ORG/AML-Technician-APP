import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";
import { normalizeVehicleNo } from "../utils/vehicleUtils";
import "./SecurityDashboard.css";

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