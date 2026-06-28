import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";
import {
  normalizeVehicleNo,
  parsePlate,
  getPlateStatus,
  VALID_STATE_CODES,
} from "../utils/vehicleUtils";
import "./SecurityDashboard.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const TODAY_LABEL = new Date().toLocaleDateString("en-IN", {
  weekday: "short", day: "numeric", month: "short", year: "numeric",
}).toUpperCase();

// ─── Plate segment display ────────────────────────────────────────────────────
// Colours match the dashboard's existing token system.
const SEG_STYLES = {
  idle:    { background: "#F8FAFC", border: "1.5px solid #E2E8F0", color: "#CBD5E1" },
  partial: { background: "#FFF7ED", border: "1.5px solid #FDBA74", color: "#C2410C" },
  done:    { background: "#F0FDF4", border: "1.5px solid #86EFAC", color: "#15803D" },
  warn:    { background: "#FFFBEB", border: "1.5px solid #FCD34D", color: "#B45309" },
};

function SegBox({ label, value, placeholder, segState, flex = 1 }) {
  const s = SEG_STYLES[segState] || SEG_STYLES.idle;
  return (
    <div style={{ textAlign: "center", flex, minWidth: 0 }}>
      <div style={{
        ...s,
        padding: "7px 4px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.04em",
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.12s ease, border-color 0.12s ease, color 0.12s ease",
      }}>
        {value || <span style={{ opacity: 0.3, fontSize: 11 }}>{placeholder}</span>}
      </div>
      <div style={{
        fontSize: 7.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "#94A3B8",
        marginTop: 4,
        textTransform: "uppercase",
      }}>
        {label}
      </div>
    </div>
  );
}

const DOT = (
  <span style={{
    color: "#DDE3EE",
    fontWeight: 700,
    paddingBottom: 18,
    fontSize: 12,
    flexShrink: 0,
    userSelect: "none",
  }}>
    ·
  </span>
);

function PlateSegments({ parts }) {
  if (!parts) return null;

  // ── BH series ──
  if (parts.isBH) {
    const { year, num, cat } = parts;
    if (!year) return null;

    return (
      <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 10 }}>
        <SegBox
          label="YEAR" value={year} placeholder="21"
          segState={year.length === 0 ? "idle" : year.length < 2 ? "partial" : "done"}
        />
        {DOT}
        <SegBox
          label="BH" value={year.length === 2 ? "BH" : ""} placeholder="BH"
          segState={year.length === 2 ? "done" : "idle"}
        />
        {DOT}
        <SegBox
          label="NUMBER" value={num} placeholder="0001" flex={2}
          segState={num.length === 0 ? "idle" : num.length < 4 ? "partial" : "done"}
        />
        {DOT}
        <SegBox
          label="CAT" value={cat} placeholder="AA"
          segState={cat.length === 0 ? "idle" : cat.length < 2 ? "partial" : "done"}
        />
      </div>
    );
  }

  // ── Standard plate ──
  const { state, dist, series, num } = parts;
  if (!state) return null;

  const stateIsWarn = state.length === 2 && !VALID_STATE_CODES.has(state);

  const segs = {
    state:  state.length === 0  ? "idle" : state.length < 2  ? "partial" : stateIsWarn ? "warn" : "done",
    dist:   dist.length === 0   ? "idle" : dist.length < 2   ? "partial" : "done",
    series: series.length === 0 ? "idle" : num.length > 0    ? "done"    : "partial",
    num:    num.length === 0    ? "idle" : num.length < 4     ? "partial" : "done",
  };

  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 10 }}>
      <SegBox label="STATE"  value={state}  placeholder="KA"   segState={segs.state} />
      {DOT}
      <SegBox label="DIST"   value={dist}   placeholder="01"   segState={segs.dist} />
      {DOT}
      <SegBox label="SERIES" value={series} placeholder="AB"   segState={segs.series} />
      {DOT}
      <SegBox label="NUMBER" value={num}    placeholder="1234" segState={segs.num} flex={2} />
    </div>
  );
}

// ─── Plate status message ─────────────────────────────────────────────────────
function PlateStatusMsg({ status }) {
  if (!status || !status.msg) return null;

  const isValid = status.valid;
  const isWarn  = status.warn;

  return (
    <div style={{
      marginTop: 10,
      padding: "8px 12px",
      background: isValid ? (isWarn ? "#FFFBEB" : "#F0FDF4") : "#FFF7ED",
      border: `1px solid ${isValid ? (isWarn ? "#FCD34D" : "#86EFAC") : "#FDBA74"}`,
      display: "flex",
      alignItems: "center",
      gap: 8,
      transition: "all 0.12s ease",
    }}>
      <span style={{ fontSize: 12, flexShrink: 0 }}>
        {isValid ? (isWarn ? "⚠️" : "✅") : "↩"}
      </span>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.03em",
        color: isValid ? (isWarn ? "#B45309" : "#15803D") : "#C2410C",
      }}>
        {status.msg}
      </span>
    </div>
  );
}

// ─── Inline edit component ────────────────────────────────────────────────────
function EditRow({ log, onSave, onCancel, saving, error }) {
  const [val, setVal]   = useState(log.vehicleNo || "");
  const inputRef        = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleChange  = (e) => setVal(e.target.value.toUpperCase());
  const handleKeyDown = (e) => {
    if (e.key === "Enter")  onSave(val);
    if (e.key === "Escape") onCancel();
  };

  const parts  = parsePlate(val);
  const status = getPlateStatus(parts);
  const norm   = normalizeVehicleNo(val);

  // API error takes priority; otherwise show live format error.
  const displayError = error || (!status.valid && status.msg ? status.msg : null);

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

      {val && <PlateSegments parts={parts} />}

      {val && norm && (
        <p className="sec-edit-norm">Stored as: {norm}</p>
      )}

      {displayError && (
        <p className="sec-edit-error">{displayError}</p>
      )}

      <div className="sec-edit-actions">
        <button
          className="sec-save-btn"
          onClick={() => onSave(val)}
          disabled={saving || val.trim().length < 2 || !status.valid}
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
  const [vehicleNo,   setVehicleNo]   = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // ── Logs state ─────────────────────────────────────────────────────────────
  const [logs,        setLogs]        = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editingId,   setEditingId]   = useState(null);
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState("");

  const inputRef = useRef(null);

  // ── Derived: live plate parsing and validation ─────────────────────────────
  const parts       = parsePlate(vehicleNo);
  const plateStatus = getPlateStatus(parts);

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

    // Hard block on incomplete plates. PlateStatusMsg already shows the reason
    // live, so submitError is only set here for Enter-key feedback when the
    // button is disabled (can't be clicked but Enter still fires).
    if (!plateStatus.valid) {
      setSubmitError(plateStatus.msg || "Complete the plate number before logging");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await api.post("/api/security/log", { vehicleNo: trimmed });
      // Optimistic prepend — new log appears at top instantly.
      setLogs((prev) => [res.data, ...prev]);
      setVehicleNo("");
      // Refocus so the guard can immediately log the next vehicle.
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

    // Validate the edited value independently — do NOT reference the outer
    // plateStatus (that belongs to the main input, not the edit row).
    const editParts  = parsePlate(trimmed);
    const editStatus = getPlateStatus(editParts);
    if (!editStatus.valid) {
      // EditRow shows format errors live via its own local status derivation.
      // Only set editError here as fallback for Enter-key path.
      setEditError(editStatus.msg || "Invalid plate format");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      const res = await api.put(`/api/security/log/${editingId}`, { vehicleNo: trimmed });
      // Update in-place — no refetch needed.
      setLogs((prev) => prev.map((l) => (l._id === editingId ? res.data : l)));
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update. Try again.");
    } finally {
      setEditSaving(false);
    }
  }, [editingId]);

  // ── Input border colour: green when valid, amber when number is incomplete ──
  const inputBorderOverride =
    plateStatus.valid           ? "#86EFAC" :
    plateStatus.field === "num" ? "#FDBA74" :
    undefined;

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
              style={inputBorderOverride ? { borderColor: inputBorderOverride } : undefined}
              aria-label="Vehicle number"
            />

            {/* Live segment anatomy — only shown when input has content */}
            {vehicleNo && <PlateSegments parts={parts} />}

            {/* Live format status — replaces norm preview while typing */}
            {vehicleNo
              ? <PlateStatusMsg status={plateStatus.msg ? plateStatus : null} />
              : <p className="sec-norm-preview" />
            }

            {/* Submit error — API failures or Enter-key bypass feedback */}
            {submitError && (
              <p className="sec-error-text">{submitError}</p>
            )}

            {/*
              CSS note: add this to SecurityDashboard.css to get the green button:

              .sec-log-btn--valid {
                background: #16A34A;
              }
              .sec-log-btn--valid:hover:not(:disabled) {
                background: #15803D;
              }
            */}
            <button
              className={`sec-log-btn${plateStatus.valid ? " sec-log-btn--valid" : ""}`}
              onClick={handleSubmit}
              disabled={submitting || vehicleNo.trim().length < 2 || !plateStatus.valid}
            >
              {submitting
                ? <><span className="sec-spinner" />Logging…</>
                : plateStatus.valid ? "✓ Log Vehicle" : "Log Vehicle"
              }
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