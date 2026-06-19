import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useForm } from "react-hook-form";
import Navbar from "../components/Navbar";
import ProfileSetupModal from "../components/ProfileSetupModal";
import EntryForm from "../components/EntryForm";
import EntryTable from "../components/EntryTable";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";
import TechnicianTypeModal from "../components/TechnicianTypeModal";
import { CATEGORIES } from "../utils/constants";
import { normalizeVehicleNo } from "../utils/vehicleUtils"; // ← NEW
import "./TechnicianDashboard.css"; // ← styles moved out of this file

// ─── Stable month reference (page-load time) ─────────────────────────────────
const NOW = new Date();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtMoney = (n) => {
  if (n === 0) return "₹0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const toDateInputValue = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 10); }
  catch { return ""; }
};

const TODAY_LABEL = NOW.toLocaleDateString("en-IN", {
  weekday: "short", day: "numeric", month: "short", year: "numeric",
}).toUpperCase();

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── FIX Bug 4: SLABS constant removed — now uses data.nextSlab from API ──────
// The backend returns nextSlab (the next slab object to reach, or null if at max).
// Using data.nextSlab is always correct for any tier (mechanic or helper).

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = memo(function StatCard({ label, value, unit, accent, accentCard }) {
  return (
    <div className={`td-stat-card${accentCard ? " td-stat-card-accent" : ""}`}>
      <div className="td-stat-label">{label}</div>
      <div className="td-stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {unit && <div className="td-stat-unit">{unit}</div>}
    </div>
  );
});

const ThresholdBar = memo(function ThresholdBar({ label, current, target, met, formatValue }) {
  const pct = Math.min((current / (target + 1)) * 100, 100);
  return (
    <div className="td-threshold-block">
      <div className="td-threshold-meta">
        <span className="td-threshold-label">{label}</span>
        <div className="td-threshold-vals">
          <span className="td-threshold-current">{formatValue(current)}</span>
          <span className="td-threshold-sep">/</span>
          <span className="td-threshold-target">{formatValue(target)}</span>
          <span className={`td-threshold-badge ${met ? "met" : "unmet"}`}>
            {met ? "✓" : "✗"}
          </span>
        </div>
      </div>
      <div className="td-progress-track">
        <div
          className="td-progress-fill"
          style={{ width: `${pct}%`, background: met ? "#16A34A" : "#1E3A8A" }}
        />
      </div>
    </div>
  );
});

// ─── Attendance Card ──────────────────────────────────────────────────────────
const AttendanceCard = memo(function AttendanceCard({ attStatus, attMarking, onMark }) {
  const isMarked  = attStatus?.marked === true;
  const isLoading = attStatus === null;

  return (
    <div className="td-att-wrap td-a1">
      <div className={`td-att-card${isMarked ? " att-present" : isLoading ? " att-loading" : ""}`}>
        <div className="td-att-left">
          <div className="td-att-eyebrow">Today's Attendance</div>
          <div className="td-att-today">{TODAY_LABEL}</div>
          <div className={`td-att-status-text${isMarked ? " present" : ""}`}>
            {attStatus === null
              ? "Checking status…"
              : isMarked
              ? `✓ Present · Marked at ${fmtTime(attStatus.markedAt)}`
              : "Toggle to mark yourself present"}
          </div>
        </div>

        <button
          className="td-toggle-btn"
          onClick={onMark}
          disabled={isMarked || isLoading}
          aria-label={isMarked ? "Attendance marked" : "Mark attendance"}
        >
          <div className={[
            "td-toggle-track",
            isMarked   ? "on"      : "",
            attMarking ? "loading" : "",
          ].filter(Boolean).join(" ")}>
            <div className="td-toggle-knob" />
          </div>
          <span className={`td-toggle-label${isMarked ? " on" : ""}`}>
            {isMarked ? "Present" : isLoading ? "…" : "Off"}
          </span>
        </button>
      </div>

      {!isMarked && attStatus !== null && (
        <div className="td-att-prompt">
          <div className="td-att-prompt-dot" />
          <span className="td-att-prompt-text">
            Mark attendance to unlock dashboard &amp; job card entry
          </span>
        </div>
      )}
    </div>
  );
});

// ─── Incentive Dropdown ───────────────────────────────────────────────────────
const IncentiveDropdown = memo(function IncentiveDropdown() {
  const [open,       setOpen]       = useState(false);
  const [year,       setYear]       = useState(NOW.getFullYear());
  const [month,      setMonth]      = useState(NOW.getMonth() + 1);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState("");

  const isCurrentMonth =
    year  === NOW.getFullYear() &&
    month === NOW.getMonth() + 1;

  const fetchIncentive = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await api.get(`/api/entries/my/incentive?year=${year}&month=${month}`);
      setData(res.data);
    } catch (err) {
      console.error("Incentive fetch error:", err);
      setFetchError("Failed to load incentive data");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (open) fetchIncentive();
  }, [open, fetchIncentive]);

  const goBack = useCallback(() => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }, [month]);

  const goForward = useCallback(() => {
    if (isCurrentMonth) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }, [isCurrentMonth, month]);

  const resetToCurrent = useCallback(() => {
    setYear(NOW.getFullYear());
    setMonth(NOW.getMonth() + 1);
  }, []);

  const toggleOpen = useCallback(() => setOpen((o) => !o), []);

  // ── FIX Bug 4: use data.nextSlab from API instead of local SLABS constant ──
  // progressTarget is null when at max slab — drives conditional rendering below.
  const currentSlabNum = data?.slabNumber ?? 0;
  const progressTarget = data?.nextSlab ?? null;  // null = at max slab

  // ── FIX Bug 4: hoursMet/labourMet for totals cell coloring ───────────────
  // Green when in any slab (slabNumber > 0 means both thresholds were met).
  // Old code hardcoded Mechanic Slab 1 thresholds (100h / ₹47500) — wrong for helpers.
  const hoursMet  = data ? data.slabNumber > 0 : false;
  const labourMet = data ? data.slabNumber > 0 : false;
  const bothMet   = data ? data.slabNumber > 0 : false;

  // ── FIX Bug 4: separate "next threshold" vars for the progress warning ────
  // The warning shows when ONE next-threshold is met but not the other.
  const nextHoursMet  = progressTarget ? data.totalHours  > progressTarget.minHours  : false;
  const nextLabourMet = progressTarget ? data.totalLabour > progressTarget.minLabour : false;

  return (
    <div className="td-section" style={{ marginTop: 16 }}>
      <button className="td-incentive-toggle" onClick={toggleOpen}>
        <div>
          <div className="td-incentive-eyebrow">Monthly Incentive</div>
          <div className="td-incentive-sub">Payout on every month</div>
        </div>
        <div className={`td-chevron${open ? " open" : ""}`}>›</div>
      </button>

      {open && (
        <>
          <div className="td-month-strip">
            {!isCurrentMonth && (
              <button className="td-month-now-pill" onClick={resetToCurrent}>Now</button>
            )}
            <button className="td-month-nav" onClick={goBack} aria-label="Previous month">‹</button>
            <span className="td-month-label">{MONTH_NAMES[month - 1].slice(0, 3)} {year}</span>
            <button className="td-month-nav" onClick={goForward} disabled={isCurrentMonth} aria-label="Next month">›</button>
          </div>

          {loading ? (
            <div className="td-incent-placeholder">
              <p className="td-incent-placeholder-text">Loading…</p>
            </div>
          ) : fetchError ? (
            <div className="td-incent-placeholder">
              <p style={{ color: "#DC2626", fontSize: "12px", fontWeight: "600" }}>{fetchError}</p>
            </div>
          ) : data?.entryCount === 0 ? (
            <div className="td-incent-placeholder">
              <p className="td-incent-placeholder-text">
                No entries for {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
          ) : data && (
            <div className="td-incentive-body">
              <div className="td-totals-grid">
                {[
                  { label: "Hours",  value: `${data.totalHours}h`,     color: hoursMet  ? "#16A34A" : "#0A1628" },
                  { label: "Labour", value: fmtMoney(data.totalLabour), color: labourMet ? "#16A34A" : "#0A1628" },
                  { label: "Leave",  value: `${data.totalLeave}d`,      color: "#0A1628" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="td-total-cell">
                    <div className="td-total-cell-label">{label}</div>
                    <div className="td-total-cell-value" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* ── FIX Bug 4: progress section — uses progressTarget (null = max slab) ── */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "#94A3B8", marginBottom: "14px",
                }}>
                  {/* FIX: was `currentSlabNum === 3` — broke at Slab 4 */}
                  {progressTarget === null
                    ? "Max slab achieved"
                    : `Progress toward Slab ${progressTarget.slab}`}
                </div>

                {/* FIX Bug 4: ThresholdBars only render when there IS a next target */}
                {progressTarget !== null && (
                  <>
                    <ThresholdBar
                      label="Hours"
                      current={data.totalHours}
                      target={progressTarget.minHours}
                      met={data.totalHours > progressTarget.minHours}
                      formatValue={(v) => `${v} hrs`}
                    />
                    <ThresholdBar
                      label="Labour"
                      current={data.totalLabour}
                      target={progressTarget.minLabour}
                      met={data.totalLabour > progressTarget.minLabour}
                      formatValue={(v) => fmtMoney(v)}
                    />
                    {/* FIX Bug 4: warning uses nextHoursMet/nextLabourMet, not the slab-coloring booleans */}
                    {(nextHoursMet !== nextLabourMet) && (
                      <div className="td-both-warning">
                        Both hours and labour must exceed their threshold for a slab to apply.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="td-slab-row">
                <div className={`td-slab-badge ${bothMet && currentSlabNum > 0 ? "achieved" : "none"}`}>
                  {currentSlabNum > 0 ? `Slab ${currentSlabNum}` : "No Slab"}
                </div>
                <div className="td-slab-desc">
                  {currentSlabNum > 0
                    ? `₹${data.baseIncentive.toLocaleString()} base incentive`
                    : "Thresholds not yet met"}
                </div>
              </div>

              <div className="td-breakdown">
                {[
                  {
                    // FIX Bug 4: show slab4Bonus inline when present
                    label: `Base Incentive${data.slab4Bonus > 0
                      ? ` (incl. ₹${data.slab4Bonus.toLocaleString()} variable)`
                      : ""}`,
                    value: data.baseIncentive > 0
                      ? `₹${data.baseIncentive.toLocaleString()}`
                      : "₹0",
                    dimmed: data.baseIncentive === 0,
                  },
                  {
                    label: `Leave Multiplier (${data.leaveTier ?? "—"})`,
                    value: `${Math.round(data.leaveMultiplier * 100)}%`,
                    dimmed: data.leaveMultiplier === 0,
                  },
                  {
                    label: "No-Leave Bonus",
                    value: data.noLeaveBonus > 0 ? `+₹${data.noLeaveBonus.toLocaleString()}` : "—",
                    dimmed: data.noLeaveBonus === 0,
                  },
                  // FIX Bug 5: was hardcoded "₹10,000 max" — wrong for helper tier (cap = ₹7,000)
                  ...(data.isCapped ? [{
                    label: "Cap Applied",
                    value: `₹${(data.maxIncentive ?? 10000).toLocaleString()} max`,
                    dimmed: false,
                  }] : []),
                ].map(({ label, value, dimmed }) => (
                  <div key={label} className={`td-breakdown-row${dimmed ? " dimmed" : ""}`}>
                    <span className="td-breakdown-label">{label}</span>
                    <span className="td-breakdown-value">{value}</span>
                  </div>
                ))}
              </div>

              <div className="td-final-row">
                <span className="td-final-label" style={{ color: data.finalIncentive > 0 ? "#1E3A8A" : "#94A3B8" }}>
                  {isCurrentMonth ? "Projected Incentive" : "Final Incentive"}
                </span>
                <span className="td-final-amount" style={{ color: data.finalIncentive > 0 ? "#0A1628" : "#CBD5E1" }}>
                  {data.finalIncentive > 0 ? `₹${data.finalIncentive.toLocaleString()}` : "₹0"}
                </span>
              </div>

              {isCurrentMonth && data.entryCount > 0 && (
                <p className="td-entry-note">
                  Based on {data.entryCount} {data.entryCount === 1 ? "entry" : "entries"} this month · updates as you log
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

// ─── Edit Entry Modal ─────────────────────────────────────────────────────────
function EditEntryModal({ entry, onSave, onClose, saving, error }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  // Live vehicle number value — drives the normalization preview
  const vehicleNoValue = watch("vehicleNo", "");

  useEffect(() => {
    if (entry) {
      reset({
        date:         toDateInputValue(entry.date),
        category:     entry.category     || "",
        vehicleNo:    entry.vehicleNo    || "",
        jcNo:         entry.jcNo         || "",
        hoursWorked:  entry.hoursWorked  ?? "",
        labourAmount: entry.labourAmount ?? "",
        leaveDays:    entry.leaveDays    ?? 0,
      });
    }
  }, [entry, reset]);

  if (!entry) return null;

  return (
    <div
      className="em-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="em-sheet" onClick={(e) => e.stopPropagation()}>

        {saving && (
          <div className="em-progress">
            <div className="em-progress-fill" />
          </div>
        )}

        {/* ── Sticky header ── */}
        <div className="em-header">
          <div className="em-drag-handle" />
          <div className="em-header-row">
            <div>
              <h2 className="em-title">Edit Entry</h2>
              <p className="em-subtitle" style={{ color: saving ? "#93C5FD" : "#6B7A99" }}>
                {saving ? "Saving…" : "Update job card"}
              </p>
            </div>
            <button
              type="button"
              className="em-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Form body ── */}
        <form onSubmit={handleSubmit(onSave)} noValidate className="em-body">

          {error && (
            <div className="em-error-banner">
              <p className="em-error-text">{error}</p>
            </div>
          )}

          {/* ── Date + Category ── */}
          <div className="em-row">
            <div>
              <label className="em-label">
                Date <span className="em-required">*</span>
              </label>
              <input
                type="date"
                className={`em-input${errors.date ? " em-input--err" : ""}`}
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && <p className="em-field-err">{errors.date.message}</p>}
            </div>
            <div>
              <label className="em-label">
                Category <span className="em-required">*</span>
              </label>
              <select
                className={`em-input em-select${errors.category ? " em-input--err" : ""}`}
                {...register("category", { required: "Category is required" })}
              >
                <option value="">Select…</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="em-field-err">{errors.category.message}</p>}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="em-divider">
            <div className="em-divider-line" />
            <span className="em-divider-label">Job Details</span>
            <div className="em-divider-line" />
          </div>

          {/* ── Vehicle No + JC No ── */}
          <div className="em-row">

            {/* ── Vehicle No — REQUIRED ── */}
            <div>
              <label className="em-label">
                Vehicle No <span className="em-required">*</span>
              </label>
              <input
                type="text"
                placeholder="KA01AB1234"
                className={`em-input${errors.vehicleNo ? " em-input--err" : ""}`}
                style={{ letterSpacing: "0.06em", fontSize: "14px" }}
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
                {...register("vehicleNo", {
                  required: "Vehicle number is required",
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
              {errors.vehicleNo && <p className="em-field-err">{errors.vehicleNo.message}</p>}
              {vehicleNoValue && !errors.vehicleNo && (
                <p className="em-norm-preview">
                  Stored as: {normalizeVehicleNo(vehicleNoValue)}
                </p>
              )}
            </div>

            <div>
              <label className="em-label">
                JC No <span className="em-required">*</span>
              </label>
              <input
                type="text"
                className={`em-input${errors.jcNo ? " em-input--err" : ""}`}
                {...register("jcNo", { required: "JC No cannot be empty" })}
              />
              {errors.jcNo && <p className="em-field-err">{errors.jcNo.message}</p>}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="em-divider">
            <div className="em-divider-line" />
            <span className="em-divider-label">Financials &amp; Hours</span>
            <div className="em-divider-line" />
          </div>

          {/* ── Labour Amount ── */}
          <div>
            <label className="em-label">
              Labour Amount <span className="em-required">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--primary">₹</div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className={`em-input${errors.labourAmount ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("labourAmount", {
                  required: "Required",
                  min:      { value: 0,      message: "Min ₹0" },
                  max:      { value: 100000, message: "Max ₹1,00,000" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.labourAmount && <p className="em-field-err">{errors.labourAmount.message}</p>}
          </div>

          {/* ── Hours Worked ── */}
          <div>
            <label className="em-label">
              Hours Worked <span className="em-required">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--hrs">HRS</div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className={`em-input${errors.hoursWorked ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("hoursWorked", {
                  required: "Required",
                  min:      { value: 0,  message: "Min 0" },
                  max:      { value: 24, message: "Max 24 hrs" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.hoursWorked && <p className="em-field-err">{errors.hoursWorked.message}</p>}
          </div>

          {/* ── Leave Days ── */}
          <div>
            <label className="em-label">Leave Days</label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--lve">LVE</div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className={`em-input${errors.leaveDays ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("leaveDays", {
                  required: "Required",
                  min:      { value: 0,  message: "Min 0" },
                  max:      { value: 31, message: "Max 31 days" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.leaveDays && <p className="em-field-err">{errors.leaveDays.message}</p>}
          </div>

          {/* ── Save ── */}
          <button type="submit" className="em-submit" disabled={saving}>
            {saving
              ? <><span className="em-spinner" />Saving…</>
              : "Save Changes"}
          </button>

          <button
            type="button"
            className="em-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function TechnicianDashboard() {
  const { user } = useAuthStore();

  const [entries,          setEntries]          = useState([]);
  // FIX Bug 1+2: track real server total separately from loaded entries array
  const [entriesTotal,     setEntriesTotal]     = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [showForm,         setShowForm]         = useState(false);
  const [currentIncentive, setCurrentIncentive] = useState(null);

  const [attStatus,  setAttStatus]  = useState(null);
  const [attMarking, setAttMarking] = useState(false);

  const [editingEntry, setEditingEntry] = useState(null);
  const [editSaving,   setEditSaving]   = useState(false);
  const [editError,    setEditError]    = useState("");

  // FIX Bug 1: was `setEntries(res.data)` — backend returns { entries, total, page, pages }
  // not a plain array. That caused entries.filter() to throw TypeError immediately.
  // FIX Bug 2: was no pagination params — backend defaulted to page=1, limit=20.
  // Now requests limit=100 (max the backend allows) so all entries are loaded.
const fetchEntries = useCallback(async () => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  try {
   const res = await api.get(`/api/entries/my?year=${year}&month=${month}&limit=100`);
    setEntries(res.data.entries || []);
    setEntriesTotal(res.data.total || 0);
  } catch (err) {
    console.error("Entries fetch error:", err);
  } finally {
    setLoading(false);
  }
}, []);

  const fetchCurrentIncentive = useCallback(async () => {
    try {
      const res = await api.get(
        `/api/entries/my/incentive?year=${NOW.getFullYear()}&month=${NOW.getMonth() + 1}`
      );
      setCurrentIncentive(res.data?.finalIncentive ?? 0);
    } catch (err) {
      console.error("Incentive stat fetch error:", err);
    }
  }, []);

  const fetchAttStatus = useCallback(async () => {
    try {
      const res = await api.get("/api/attendance/today");
      setAttStatus(res.data);
    } catch (err) {
      console.error("Attendance status fetch error:", err);
      setAttStatus({ marked: false, markedAt: null });
    }
  }, []);

  const handleMarkAttendance = useCallback(async () => {
    if (attMarking || attStatus?.marked) return;
    setAttMarking(true);
    setAttStatus({ marked: true, markedAt: new Date().toISOString() });
    try {
      const res = await api.post("/api/attendance/mark");
      const att = res.data.attendance;
      setAttStatus({ marked: true, markedAt: att.markedAt });
    } catch (err) {
      console.error("Mark attendance error:", err);
      setAttStatus({ marked: false, markedAt: null });
    } finally {
      setAttMarking(false);
    }
  }, [attMarking, attStatus?.marked]);

  useEffect(() => {
    fetchEntries();
    fetchCurrentIncentive();
  }, [fetchEntries, fetchCurrentIncentive]);

  useEffect(() => {
    if (user?.profileComplete) fetchAttStatus();
  }, [user?.profileComplete, fetchAttStatus]);

  const handleSaved = useCallback(() => {
    fetchEntries();
    fetchCurrentIncentive();
  }, [fetchEntries, fetchCurrentIncentive]);

  const handleOpenForm  = useCallback(() => setShowForm(true),  []);
  const handleCloseForm = useCallback(() => setShowForm(false), []);

  const handleOpenEdit = useCallback((entry) => {
    setEditError("");
    setEditingEntry(entry);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingEntry(null);
    setEditError("");
  }, []);

  const handleSaveEdit = useCallback(async (formData) => {
    if (editSaving || !editingEntry) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await api.put(`/api/entries/${editingEntry._id}`, {
        date:         formData.date,
        category:     formData.category,
        vehicleNo:    formData.vehicleNo,
        jcNo:         formData.jcNo,
        hoursWorked:  Number(formData.hoursWorked),
        labourAmount: Number(formData.labourAmount),
        leaveDays:    Number(formData.leaveDays),
      });
      setEntries((prev) =>
        prev.map((e) => (e._id === editingEntry._id ? res.data.entry : e))
      );
      fetchCurrentIncentive();
      setEditingEntry(null);
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }, [editSaving, editingEntry, fetchCurrentIncentive]);


 const totalHours    = useMemo(() => entries.reduce((s, e) => s + (e.hoursWorked  || 0), 0), [entries]);
const totalLabour   = useMemo(() => entries.reduce((s, e) => s + (e.labourAmount || 0), 0), [entries]);
const totalLeave    = useMemo(() => entries.reduce((s, e) => s + (e.leaveDays    || 0), 0), [entries]);
const totalVehicles = useMemo(() => new Set(entries.map((e) => e.vehicleNo).filter(Boolean)).size, [entries]);
  const incentiveDisplay = useMemo(() => {
    if (currentIncentive === null) return "—";
    if (currentIncentive === 0)    return "₹0";
    return fmtMoney(currentIncentive);
  }, [currentIncentive]);

  const needsProfile = user?.role === "technician" && !user?.profileComplete;
  const needsType    = user?.role === "technician" && user?.profileComplete && !user?.technicianType;
  const entryAllowed = attStatus?.marked === true && !needsType;
  const isGated      = user?.profileComplete && attStatus?.marked !== true;

  const currentMonthLabel = `${MONTH_NAMES[NOW.getMonth()]} ${NOW.getFullYear()}`;

  return (
    <div className="td-page">
      {needsProfile && <ProfileSetupModal />}
      {needsType    && <TechnicianTypeModal />}
      <Navbar />

      {/* ── Page header ── */}
      <div className="td-page-header td-a1">
        <div className="td-eyebrow">Technician Dashboard</div>
        <h1 className="td-name">{user?.name?.split(" ")[0]}</h1>
        <div className="td-meta">
          {user?.technicianId && (
            <span className="td-tech-id">{user.technicianId}</span>
          )}
          {user?.branch && (
            <span className="td-branch-badge">{user.branch}</span>
          )}
          {user?.technicianType && (
            <span className="td-branch-badge" style={{ color: "#1E3A8A", borderColor: "#1E3A8A" }}>
              {user.technicianType}
            </span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "0 0 100px", maxWidth: "600px", margin: "0 auto" }}>

        {!needsProfile && (
          <AttendanceCard
            attStatus={attStatus}
            attMarking={attMarking}
            onMark={handleMarkAttendance}
          />
        )}

        <div className="td-gate-wrap">
          {isGated && <div className="td-gate-overlay" />}

          {/* ── Stats grid ── */}
        <div className="td-stat-grid td-a2">
  <StatCard label="Entries"         value={loading ? "—" : entries.length} />
  <StatCard label="Hours Worked"    value={loading ? "—" : totalHours}     unit={loading ? "" : "hrs"} />
  <StatCard label="Labour Earned"   value={loading ? "—" : fmtMoney(totalLabour)} />
  <StatCard label="Leave Days"      value={loading ? "—" : totalLeave}     unit={loading ? "" : "days"} />
  <StatCard label="Vehicles Served" value={loading ? "—" : totalVehicles}  unit={loading ? "" : "unique"} />
  <StatCard
    label="Projected Incentive"
    value={incentiveDisplay}
    unit="this month"
    accent={currentIncentive > 0 ? "#16A34A" : undefined}
    accentCard={currentIncentive > 0}
  />
</div>

          {/* ── Month context banner ── */}
          <div className="td-month-banner td-a2">
            <div className="td-month-banner-dot" />
            <span className="td-month-banner-text">Showing stats for</span>
            <span className="td-month-banner-value">{currentMonthLabel}</span>
          </div>

          {/* ── New Entry button ── */}
          <button
            className="td-new-entry-btn td-a3"
            onClick={() => entryAllowed && handleOpenForm()}
            disabled={!entryAllowed}
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
            New Entry
          </button>

          {/* ── Monthly Incentive dropdown ── */}
          <div className="td-a4">
            <IncentiveDropdown />
          </div>

          {/* ── Work entries section ── */}
          <div className="td-section td-a5">
            <div className="td-section-header">
              <span className="td-section-label">All Work Entries</span>
              {/* FIX Bug 2: was entries.length — only showed loaded count (≤20/100).
                  entriesTotal comes from res.data.total — real DB count. */}
              <span className="td-section-count">{entriesTotal} total</span>
            </div>
            {loading ? (
              <div className="td-loading">Loading…</div>
            ) : (
              <EntryTable
                entries={entries}
              
                onEdit={handleOpenEdit}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        className="td-fab"
        onClick={() => entryAllowed && handleOpenForm()}
        disabled={!entryAllowed}
        aria-label="New Entry"
      >
        +
      </button>

      {/* ── New entry form modal ── */}
      {showForm && (
        <EntryForm onClose={handleCloseForm} onSaved={handleSaved} />
      )}

      {/* ── Edit entry modal ── */}
      <EditEntryModal
        entry={editingEntry}
        onSave={handleSaveEdit}
        onClose={handleCloseEdit}
        saving={editSaving}
        error={editError}
      />
    </div>
  );
}