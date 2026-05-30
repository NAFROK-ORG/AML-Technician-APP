import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import ProfileSetupModal from "../components/ProfileSetupModal";
import EntryForm from "../components/EntryForm";
import EntryTable from "../components/EntryTable";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtMoney = (n) => {
  if (n === 0) return "₹0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const SLABS = [
  { slab: 1, minHours: 100, minLabour: 47500,  incentive: 2000 },
  { slab: 2, minHours: 120, minLabour: 57500,  incentive: 3000 },
  { slab: 3, minHours: 150, minLabour: 72500,  incentive: 5000 },
];

// ─── Injected styles ─────────────────────────────────────────────────────────

const DASHBOARD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes tdFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .td-page {
    min-height: 100dvh;
    background: #EEF2F7;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Staggered fade-up children */
  .td-a1 { animation: tdFadeUp 0.32s ease both 0.00s; }
  .td-a2 { animation: tdFadeUp 0.32s ease both 0.06s; }
  .td-a3 { animation: tdFadeUp 0.32s ease both 0.10s; }
  .td-a4 { animation: tdFadeUp 0.32s ease both 0.14s; }
  .td-a5 { animation: tdFadeUp 0.32s ease both 0.18s; }

  /* ── Page header ── */
  .td-page-header {
    padding: 24px 20px 20px;
    background: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
  }
  .td-eyebrow {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #1E3A8A;
    margin-bottom: 6px;
  }
  .td-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 36px;
    font-weight: 700;
    color: #0A1628;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 8px;
  }
  .td-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .td-tech-id {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #1E3A8A;
    font-weight: 600;
    letter-spacing: 0.06em;
    background: #EEF2F7;
    padding: 3px 8px;
    border: 1px solid #DDE3EE;
  }
  .td-branch-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6B7A99;
    background: #F8FAFC;
    padding: 3px 8px;
    border: 1px solid #DDE3EE;
  }

  /* ── Stat grid ── */
  .td-stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: #DDE3EE;
    border-left: 1px solid #DDE3EE;
    border-right: 1px solid #DDE3EE;
  }
  .td-stat-card {
    background: #FFFFFF;
    padding: 18px 16px 16px;
    display: flex;
    flex-direction: column;
  }
  .td-stat-card-accent {
    background: #FFFFFF;
    border-left: 3px solid #1E3A8A;
  }
  .td-stat-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #6B7A99;
    margin-bottom: 10px;
  }
  .td-stat-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 36px;
    font-weight: 700;
    color: #0A1628;
    line-height: 1;
    letter-spacing: 0.01em;
    margin-bottom: 4px;
  }
  .td-stat-unit {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #94A3B8;
  }

  /* ── New Entry button (full-width, between stats and incentive) ── */
  .td-new-entry-btn {
    width: 100%;
    height: 60px;
    background: #1E3A8A;
    border: none;
    border-top: 1px solid #DDE3EE;
    color: #FFFFFF;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: background 0.15s ease;
    border-radius: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .td-new-entry-btn:hover  { background: #1E40AF; }
  .td-new-entry-btn:active { background: #1E3A8A; }

  /* ── Section wrapper ── */
  .td-section {
    margin: 16px 0 0;
    border: 1px solid #DDE3EE;
    background: #FFFFFF;
    overflow: hidden;
  }
  .td-section-header {
    padding: 14px 20px;
    border-bottom: 1px solid #EEF2F7;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .td-section-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #6B7A99;
  }
  .td-section-count {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #94A3B8;
  }

  /* ── Incentive card ── */
  .td-incentive-toggle {
    width: 100%;
    padding: 18px 20px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    -webkit-tap-highlight-color: transparent;
  }
  .td-incentive-eyebrow {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #1E3A8A;
    margin-bottom: 3px;
    text-align: left;
  }
  .td-incentive-sub {
    font-size: 11px;
    color: #6B7A99;
    font-weight: 400;
    text-align: left;
  }
  .td-chevron {
    width: 32px;
    height: 32px;
    border: 1.5px solid #DDE3EE;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #374151;
    font-size: 20px;
    flex-shrink: 0;
    transition: transform 0.22s ease, border-color 0.15s;
    line-height: 1;
  }
  .td-chevron.open {
    transform: rotate(180deg);
    border-color: #1E3A8A;
    color: #1E3A8A;
  }

  /* ── Month nav ── */
  .td-month-strip {
    padding: 10px 20px;
    border-top: 1px solid #EEF2F7;
    border-bottom: 1px solid #EEF2F7;
    background: #F8FAFC;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
  }
  .td-month-nav {
    background: none;
    border: 1.5px solid #DDE3EE;
    width: 32px;
    height: 32px;
    cursor: pointer;
    color: #374151;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 0;
    transition: border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .td-month-nav:hover:not(:disabled) { border-color: #1E3A8A; color: #1E3A8A; }
  .td-month-nav:disabled { color: #CBD5E1; cursor: not-allowed; border-color: #EEF2F7; }
  .td-month-now-pill {
    background: none;
    border: 1.5px solid #1E3A8A;
    padding: 4px 10px;
    cursor: pointer;
    color: #1E3A8A;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0;
    transition: background 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .td-month-now-pill:hover { background: #1E3A8A; color: #FFFFFF; }
  .td-month-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    color: #0A1628;
    min-width: 72px;
    text-align: center;
  }

  /* ── Incentive body ── */
  .td-incentive-body { padding: 20px; }

  /* Totals strip */
  .td-totals-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1px;
    background: #DDE3EE;
    border: 1px solid #DDE3EE;
    margin-bottom: 20px;
  }
  .td-total-cell {
    background: #F8FAFC;
    padding: 12px 8px;
    text-align: center;
  }
  .td-total-cell-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #94A3B8;
    margin-bottom: 5px;
  }
  .td-total-cell-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 15px;
    font-weight: 700;
  }

  /* Progress bars */
  .td-threshold-block { margin-bottom: 16px; }
  .td-threshold-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 7px;
  }
  .td-threshold-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6B7A99;
  }
  .td-threshold-vals {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .td-threshold-current {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    color: #0A1628;
  }
  .td-threshold-sep { font-size: 10px; color: #CBD5E1; }
  .td-threshold-target {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #94A3B8;
  }
  .td-threshold-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 7px;
    letter-spacing: 0.04em;
  }
  .td-threshold-badge.met {
    color: #16A34A;
    background: #DCFCE7;
    border: 1px solid #BBF7D0;
  }
  .td-threshold-badge.unmet {
    color: #DC2626;
    background: #FEF2F2;
    border: 1px solid #FECACA;
  }
  .td-progress-track {
    height: 5px;
    background: #E2E8F0;
    overflow: hidden;
  }
  .td-progress-fill {
    height: 100%;
    transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .td-both-warning {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-left: 3px solid #DC2626;
    padding: 10px 12px;
    margin-top: 4px;
    font-size: 11px;
    font-weight: 500;
    color: #991B1B;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  /* Slab badge */
  .td-slab-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .td-slab-badge {
    padding: 6px 16px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'IBM Plex Sans', sans-serif;
    border: 1.5px solid;
  }
  .td-slab-badge.achieved {
    color: #16A34A;
    border-color: #86EFAC;
    background: #F0FDF4;
  }
  .td-slab-badge.none {
    color: #94A3B8;
    border-color: #E2E8F0;
    background: #F8FAFC;
  }
  .td-slab-desc {
    font-size: 11px;
    color: #6B7A99;
    font-weight: 400;
  }

  /* Breakdown */
  .td-breakdown {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-left: 3px solid #1E3A8A;
  }
  .td-breakdown-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 11px 14px;
    border-bottom: 1px solid #EEF2F7;
  }
  .td-breakdown-row:last-child { border-bottom: none; }
  .td-breakdown-label {
    font-size: 11px;
    color: #6B7A99;
    font-weight: 500;
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .td-breakdown-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }
  .td-breakdown-row.dimmed .td-breakdown-label,
  .td-breakdown-row.dimmed .td-breakdown-value {
    color: #CBD5E1;
  }

  /* Final incentive */
  .td-final-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 14px 12px;
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    border-top: none;
    margin-top: 0;
  }
  .td-final-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .td-final-amount {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .td-entry-note {
    font-size: 10px;
    color: #94A3B8;
    text-align: right;
    padding: 8px 20px 16px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  /* ── FAB ── */
  .td-fab {
    position: fixed;
    bottom: 24px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #1E3A8A;
    color: #FFFFFF;
    border: none;
    cursor: pointer;
    font-size: 26px;
    font-weight: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(30,58,138,0.35);
    transition: background 0.15s, transform 0.15s;
    z-index: 100;
    -webkit-tap-highlight-color: transparent;
  }
  .td-fab:hover  { background: #1E40AF; transform: scale(1.06); }
  .td-fab:active { background: #1E3A8A; transform: scale(0.97); }

  /* Empty state */
  .td-empty {
    padding: 40px 20px;
    text-align: center;
  }
  .td-empty-icon { font-size: 28px; margin-bottom: 10px; }
  .td-empty-text {
    font-size: 12px;
    color: #94A3B8;
    font-weight: 500;
    letter-spacing: 0.06em;
  }

  /* Loading */
  .td-loading {
    padding: 40px 20px;
    text-align: center;
    font-size: 12px;
    color: #94A3B8;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  /* Incentive empty/error */
  .td-incent-placeholder {
    padding: 32px 20px;
    text-align: center;
  }
  .td-incent-placeholder-text {
    font-size: 12px;
    color: #94A3B8;
    font-weight: 500;
    letter-spacing: 0.06em;
  }
`;

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, unit, accent, accentCard }) {
  return (
    <div className={`td-stat-card${accentCard ? " td-stat-card-accent" : ""}`}>
      <div className="td-stat-label">{label}</div>
      <div
        className="td-stat-value"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {unit && <div className="td-stat-unit">{unit}</div>}
    </div>
  );
}

function ThresholdBar({ label, current, target, met, formatValue }) {
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
          style={{
            width: `${pct}%`,
            background: met ? "#16A34A" : "#1E3A8A",
          }}
        />
      </div>
    </div>
  );
}

// ─── Incentive Dropdown ───────────────────────────────────────────────────────

function IncentiveDropdown() {
  const now = new Date();

  const [open,       setOpen]       = useState(false);
  const [year,       setYear]       = useState(now.getFullYear());
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState("");

  const isCurrentMonth =
    year  === now.getFullYear() &&
    month === now.getMonth() + 1;

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

  const goBack = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };

  const goForward = () => {
    if (isCurrentMonth) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const resetToCurrent = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const hoursMet       = data ? data.totalHours  > 100   : false;
  const labourMet      = data ? data.totalLabour > 47500  : false;
  const bothMet        = hoursMet && labourMet;
  const currentSlabNum = data?.slabNumber ?? 0;
  const progressTarget = SLABS.find((s) => s.slab > currentSlabNum) ?? SLABS[SLABS.length - 1];

  return (
    <div className="td-section" style={{ marginTop: 16 }}>

      {/* Toggle header */}
      <button
        className="td-incentive-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <div className="td-incentive-eyebrow">Monthly Incentive</div>
          <div className="td-incentive-sub">Payout on the 2nd of every month</div>
        </div>
        <div className={`td-chevron${open ? " open" : ""}`}>›</div>
      </button>

      {/* Expandable body */}
      {open && (
        <>
          {/* Month picker */}
          <div className="td-month-strip">
            {!isCurrentMonth && (
              <button className="td-month-now-pill" onClick={resetToCurrent}>
                Now
              </button>
            )}
            <button
              className="td-month-nav"
              onClick={goBack}
              aria-label="Previous month"
            >‹</button>
            <span className="td-month-label">
              {MONTH_NAMES[month - 1].slice(0, 3)} {year}
            </span>
            <button
              className="td-month-nav"
              onClick={goForward}
              disabled={isCurrentMonth}
              aria-label="Next month"
            >›</button>
          </div>

          {/* Body states */}
          {loading ? (
            <div className="td-incent-placeholder">
              <p className="td-incent-placeholder-text">Loading…</p>
            </div>
          ) : fetchError ? (
            <div className="td-incent-placeholder">
              <p style={{ color: "#DC2626", fontSize: "12px", fontWeight: "600" }}>
                {fetchError}
              </p>
            </div>
          ) : data?.entryCount === 0 ? (
            <div className="td-incent-placeholder">
              <p className="td-incent-placeholder-text">
                No entries for {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
          ) : data && (
            <div className="td-incentive-body">

              {/* Totals strip */}
              <div className="td-totals-grid">
                {[
                  { label: "Hours",  value: `${data.totalHours}h`,            color: hoursMet  ? "#16A34A" : "#0A1628" },
                  { label: "Labour", value: fmtMoney(data.totalLabour),        color: labourMet ? "#16A34A" : "#0A1628" },
                  { label: "Leave",  value: `${data.totalLeave}d`,             color: "#0A1628" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="td-total-cell">
                    <div className="td-total-cell-label">{label}</div>
                    <div className="td-total-cell-value" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Progress toward next slab */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "#94A3B8", marginBottom: "14px",
                }}>
                  {currentSlabNum === 3
                    ? "Max slab achieved"
                    : `Progress toward Slab ${progressTarget.slab}`}
                </div>
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
                {(hoursMet !== labourMet) && (
                  <div className="td-both-warning">
                    Both hours and labour must exceed their threshold for a slab to apply.
                  </div>
                )}
              </div>

              {/* Slab badge */}
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

              {/* Breakdown table */}
              <div className="td-breakdown">
                {[
                  {
                    label: "Base Incentive",
                    value: data.baseIncentive > 0 ? `₹${data.baseIncentive.toLocaleString()}` : "₹0",
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
                  ...(data.isCapped ? [{
                    label: "Cap Applied",
                    value: "₹10,000 max",
                    dimmed: false,
                  }] : []),
                ].map(({ label, value, dimmed }) => (
                  <div key={label} className={`td-breakdown-row${dimmed ? " dimmed" : ""}`}>
                    <span className="td-breakdown-label">{label}</span>
                    <span className="td-breakdown-value">{value}</span>
                  </div>
                ))}
              </div>

              {/* Final amount */}
              <div className="td-final-row">
                <span
                  className="td-final-label"
                  style={{ color: data.finalIncentive > 0 ? "#1E3A8A" : "#94A3B8" }}
                >
                  {isCurrentMonth ? "Projected Incentive" : "Final Incentive"}
                </span>
                <span
                  className="td-final-amount"
                  style={{ color: data.finalIncentive > 0 ? "#0A1628" : "#CBD5E1" }}
                >
                  {data.finalIncentive > 0
                    ? `₹${data.finalIncentive.toLocaleString()}`
                    : "₹0"}
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
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function TechnicianDashboard() {
  const { user } = useAuthStore();
  const [entries,          setEntries]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showForm,         setShowForm]         = useState(false);
  const [currentIncentive, setCurrentIncentive] = useState(null);

  /* inject styles */
  useEffect(() => {
    const id = "td-dashboard-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = DASHBOARD_STYLES;
      document.head.appendChild(el);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await api.get("/api/entries/my");
      setEntries(res.data);
    } catch (err) {
      console.error("Entries fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCurrentIncentive = useCallback(async () => {
    try {
      const d = new Date();
      const res = await api.get(
        `/api/entries/my/incentive?year=${d.getFullYear()}&month=${d.getMonth() + 1}`
      );
      setCurrentIncentive(res.data?.finalIncentive ?? 0);
    } catch (err) {
      console.error("Incentive stat fetch error:", err);
    }
  }, []);

  useEffect(() => { fetchEntries(); },         [fetchEntries]);
  useEffect(() => { fetchCurrentIncentive(); }, [fetchCurrentIncentive]);

  const handleSaved = useCallback(() => {
    fetchEntries();
    fetchCurrentIncentive();
  }, [fetchEntries, fetchCurrentIncentive]);

  const totalHours    = entries.reduce((s, e) => s + (e.hoursWorked  || 0), 0);
  const totalLabour   = entries.reduce((s, e) => s + (e.labourAmount || 0), 0);
  const totalLeave    = entries.reduce((s, e) => s + (e.leaveDays    || 0), 0);
  const totalVehicles = new Set(entries.map((e) => e.vehicleNo).filter(Boolean)).size;
  const needsProfile  = user?.role === "technician" && !user?.profileComplete;

  const incentiveDisplay =
    currentIncentive === null ? "—"  :
    currentIncentive === 0    ? "₹0" :
    fmtMoney(currentIncentive);

  return (
    <div className="td-page">
      {needsProfile && <ProfileSetupModal />}
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
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "0 0 100px", maxWidth: "600px", margin: "0 auto" }}>

        {/* ── Stats grid (2 × 3) ── */}
        <div className="td-stat-grid td-a2">
          <StatCard label="Total Entries"   value={entries.length} />
          <StatCard label="Hours Worked"    value={totalHours}     unit="hrs total" />
          <StatCard label="Labour Earned"   value={fmtMoney(totalLabour)} />
          <StatCard label="Leave Days"      value={totalLeave}     unit="days taken" />
          <StatCard label="Vehicles Served" value={totalVehicles}  unit="unique" />
          <StatCard
            label="This Month"
            value={incentiveDisplay}
            unit="projected"
            accent={currentIncentive > 0 ? "#16A34A" : undefined}
            accentCard={currentIncentive > 0}
          />
        </div>

        {/* ── NEW ENTRY — full width, between stats and incentive ── */}
        <button
          className="td-new-entry-btn td-a3"
          onClick={() => setShowForm(true)}
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
            <span className="td-section-label">Work Entries</span>
            <span className="td-section-count">{entries.length} total</span>
          </div>

          {loading ? (
            <div className="td-loading">Loading…</div>
          ) : (
            <EntryTable entries={entries} onDeleted={fetchEntries} />
          )}
        </div>
      </div>

      {/* ── FAB (secondary / scroll shortcut) ── */}
      <button
        className="td-fab"
        onClick={() => setShowForm(true)}
        aria-label="New Entry"
      >
        +
      </button>

      {showForm && (
        <EntryForm onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}