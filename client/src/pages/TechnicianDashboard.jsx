import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import ProfileSetupModal from "../components/ProfileSetupModal";
import EntryForm from "../components/EntryForm";
import EntryTable from "../components/EntryTable";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({ label, value, unit, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {unit && <div className="stat-sub">{unit}</div>}
    </div>
  );
}

function ThresholdBar({ label, current, target, met, formatValue }) {
  const pct = Math.min((current / (target + 1)) * 100, 100);
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "6px",
      }}>
        <span style={{ fontSize: "10px", fontWeight: "600", color: "#71717A", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#FAFAFA" }}>
            {formatValue(current)}
          </span>
          <span style={{ fontSize: "10px", color: "#3F3F46" }}>/</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: "#52525B" }}>
            {formatValue(target)}
          </span>
          <span style={{
            fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em",
            color: met ? "#22C55E" : "#EF4444",
            padding: "2px 6px",
            background: met ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            borderRadius: "3px",
          }}>
            {met ? "✓" : "✗"}
          </span>
        </div>
      </div>
      <div style={{ height: "3px", background: "#1E1E27", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: met ? "#22C55E" : "#3B82F6",
          borderRadius: "2px",
          transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
        }} />
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, highlight, dimmed }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0",
    }}>
      <span style={{ fontSize: "11px", color: dimmed ? "#3F3F46" : "#71717A", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: highlight ? "13px" : "12px",
        fontWeight: highlight ? "700" : "500",
        color: highlight ? "#FAFAFA" : dimmed ? "#3F3F46" : "#A1A1AA",
      }}>{value}</span>
    </div>
  );
}

// ─── Incentive Dropdown ────────────────────────────────────────────────────

function IncentiveDropdown() {
  const now = new Date();

  const [open,  setOpen]  = useState(false);
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState(null);
  const [loading, setLoading]     = useState(false);
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
    } catch {
      setFetchError("Failed to load incentive data");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // Only fetch when opened
  useEffect(() => {
    if (open) fetchIncentive();
  }, [open, fetchIncentive]);

  const goBack = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const goForward = () => {
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };
  const resetToCurrent = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const hoursMet        = data ? data.totalHours  > 100   : false;
  const labourMet       = data ? data.totalLabour > 47500  : false;
  const bothMet         = hoursMet && labourMet;
  const currentSlabNum  = data?.slabNumber ?? 0;
  const progressTarget  = SLABS.find(s => s.slab > currentSlabNum) ?? SLABS[SLABS.length - 1];
  const leaveLabel      = data?.leaveTier ?? "—";
  const leaveMultiplierPct = data ? `${Math.round(data.leaveMultiplier * 100)}%` : "—";

  const navBtn = (disabled) => ({
    background: "none", border: "1px solid #27272A", borderRadius: "4px",
    width: "28px", height: "28px", cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? "#27272A" : "#71717A",
    fontSize: "16px", lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "color 0.15s, border-color 0.15s",
  });

  return (
    <div style={{
      background: "#111118",
      border: "1px solid #27272A",
      borderRadius: "8px",
      overflow: "hidden",
      marginBottom: "24px",
    }}>

      {/* ── Header / toggle row ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          padding: "16px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{
            fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#3B82F6", marginBottom: "3px",
          }}>
            Monthly Incentive
          </div>
          <div style={{ fontSize: "10px", color: "#3F3F46", letterSpacing: "0.06em" }}>
            Payout on the 2nd of every month
          </div>
        </div>

        {/* Chevron */}
        <div style={{
          width: "28px", height: "28px",
          border: "1px solid #27272A", borderRadius: "4px",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#52525B", fontSize: "14px", flexShrink: 0,
          transition: "transform 0.2s ease",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ›
        </div>
      </button>

      {/* ── Expandable body ── */}
      {open && (
        <div style={{ borderTop: "1px solid #1E1E27" }}>

          {/* Month picker row */}
          <div style={{
            padding: "12px 20px",
            borderBottom: "1px solid #1E1E27",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "6px",
          }}>
            {!isCurrentMonth && (
              <button
                onClick={resetToCurrent}
                style={{
                  background: "none", border: "1px solid #3B82F6", borderRadius: "4px",
                  padding: "3px 8px", cursor: "pointer", color: "#3B82F6",
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginRight: "2px",
                }}
              >
                Now
              </button>
            )}
            <button onClick={goBack} style={navBtn(false)} aria-label="Previous month">‹</button>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px", color: "#FAFAFA",
              minWidth: "80px", textAlign: "center",
            }}>
              {MONTH_NAMES[month - 1].slice(0, 3)} {year}
            </span>
            <button
              onClick={goForward}
              disabled={isCurrentMonth}
              style={navBtn(isCurrentMonth)}
              aria-label="Next month"
            >›</button>
          </div>

          {/* Body content */}
          {loading ? (
            <div style={{
              padding: "40px 20px", textAlign: "center",
              color: "#3F3F46", fontSize: "12px", letterSpacing: "0.06em",
            }}>
              Loading…
            </div>
          ) : fetchError ? (
            <div style={{
              padding: "40px 20px", textAlign: "center",
              color: "#EF4444", fontSize: "12px",
            }}>
              {fetchError}
            </div>
          ) : data?.entryCount === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>—</div>
              <div style={{ fontSize: "12px", color: "#3F3F46", letterSpacing: "0.06em" }}>
                No entries for {MONTH_NAMES[month - 1]} {year}
              </div>
            </div>
          ) : data && (
            <div style={{ padding: "20px" }}>

              {/* Monthly totals strip */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: "1px", background: "#1E1E27",
                borderRadius: "6px", overflow: "hidden",
                marginBottom: "20px",
              }}>
                {[
                  { label: "Hours",  value: `${data.totalHours} hrs`,   met: hoursMet  },
                  { label: "Labour", value: fmtMoney(data.totalLabour),  met: labourMet },
                  { label: "Leave",  value: `${data.totalLeave} day${data.totalLeave !== 1 ? "s" : ""}`, met: null },
                ].map(({ label, value, met }) => (
                  <div key={label} style={{ background: "#111118", padding: "12px 14px", textAlign: "center" }}>
                    <div style={{
                      fontSize: "8px", fontWeight: "700", letterSpacing: "0.14em",
                      textTransform: "uppercase", color: "#52525B", marginBottom: "5px",
                    }}>{label}</div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "14px", fontWeight: "600",
                      color: met === true ? "#22C55E" : met === false ? "#EF4444" : "#A1A1AA",
                    }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Threshold progress */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "#3F3F46", marginBottom: "12px",
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
                  formatValue={v => `${v} hrs`}
                />
                <ThresholdBar
                  label="Labour"
                  current={data.totalLabour}
                  target={progressTarget.minLabour}
                  met={data.totalLabour > progressTarget.minLabour}
                  formatValue={v => fmtMoney(v)}
                />
                {(hoursMet !== labourMet) && (
                  <div style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    borderRadius: "4px", padding: "8px 12px",
                    fontSize: "10px", color: "#EF4444",
                    letterSpacing: "0.04em", marginTop: "4px",
                  }}>
                    Both hours and labour must exceed their threshold for a slab to apply.
                  </div>
                )}
              </div>

              {/* Slab badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{
                  padding: "6px 14px",
                  background: bothMet && currentSlabNum > 0 ? "rgba(34,197,94,0.1)" : "#18181B",
                  border: `1px solid ${bothMet && currentSlabNum > 0 ? "rgba(34,197,94,0.3)" : "#27272A"}`,
                  borderRadius: "4px",
                  fontSize: "11px", fontWeight: "700", letterSpacing: "0.1em",
                  color: bothMet && currentSlabNum > 0 ? "#22C55E" : "#52525B",
                  textTransform: "uppercase",
                }}>
                  {currentSlabNum > 0 ? `Slab ${currentSlabNum}` : "No Slab"}
                </div>
                <div style={{ fontSize: "11px", color: "#52525B" }}>
                  {currentSlabNum > 0
                    ? `₹${data.baseIncentive.toLocaleString()} base`
                    : "Thresholds not met"}
                </div>
              </div>

              {/* Breakdown table */}
              <div style={{
                background: "#0D0D14", border: "1px solid #1E1E27",
                borderRadius: "6px", padding: "4px 14px",
              }}>
                <BreakdownRow
                  label="Base Incentive"
                  value={data.baseIncentive > 0 ? `₹${data.baseIncentive.toLocaleString()}` : "₹0"}
                  dimmed={data.baseIncentive === 0}
                />
                <div style={{ height: "1px", background: "#1E1E27" }} />
                <BreakdownRow
                  label={`Leave Multiplier (${leaveLabel})`}
                  value={leaveMultiplierPct}
                  dimmed={data.leaveMultiplier === 0}
                />
                <div style={{ height: "1px", background: "#1E1E27" }} />
                <BreakdownRow
                  label="No-Leave Bonus"
                  value={data.noLeaveBonus > 0 ? `+₹${data.noLeaveBonus.toLocaleString()}` : "—"}
                  dimmed={data.noLeaveBonus === 0}
                />
                {data.isCapped && (
                  <>
                    <div style={{ height: "1px", background: "#1E1E27" }} />
                    <BreakdownRow label="Cap Applied" value="₹10,000 max" />
                  </>
                )}
                <div style={{ height: "1px", background: "#27272A", margin: "4px 0" }} />
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 0 8px",
                }}>
                  <span style={{
                    fontSize: "10px", fontWeight: "700", letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: data.finalIncentive > 0 ? "#22C55E" : "#3F3F46",
                  }}>
                    {isCurrentMonth ? "Projected Incentive" : "Final Incentive"}
                  </span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "28px", fontWeight: "700", letterSpacing: "0.02em",
                    color: data.finalIncentive > 0 ? "#FAFAFA" : "#3F3F46",
                  }}>
                    {data.finalIncentive > 0
                      ? `₹${data.finalIncentive.toLocaleString()}`
                      : "₹0"}
                  </span>
                </div>
              </div>

              {isCurrentMonth && data.entryCount > 0 && (
                <div style={{
                  marginTop: "10px",
                  fontSize: "10px", color: "#3F3F46",
                  textAlign: "right", letterSpacing: "0.04em",
                }}>
                  Based on {data.entryCount} {data.entryCount === 1 ? "entry" : "entries"} this month · updates as you log
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────

export default function TechnicianDashboard() {
  const { user } = useAuthStore();
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Current month incentive for stat card
  const now = new Date();
  const [currentIncentive, setCurrentIncentive] = useState(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await api.get("/api/entries/my");
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCurrentIncentive = useCallback(async () => {
    try {
      const res = await api.get(
        `/api/entries/my/incentive?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
      );
      setCurrentIncentive(res.data?.finalIncentive ?? 0);
    } catch {
      // silently fail — stat card shows "—"
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchCurrentIncentive(); }, [fetchCurrentIncentive]);

  // Refetch incentive stat after a new entry is saved
  const handleSaved = useCallback(() => {
    fetchEntries();
    fetchCurrentIncentive();
  }, [fetchEntries, fetchCurrentIncentive]);

  const totalHours    = entries.reduce((s, e) => s + (e.hoursWorked  || 0), 0);
  const totalLabour   = entries.reduce((s, e) => s + (e.labourAmount || 0), 0);
  const totalLeave    = entries.reduce((s, e) => s + (e.leaveDays    || 0), 0);
  const totalVehicles = new Set(entries.map(e => e.vehicleNo).filter(Boolean)).size;

  const needsProfile = user?.role === "technician" && !user?.profileComplete;

  const incentiveDisplay =
    currentIncentive === null ? "—" :
    currentIncentive === 0    ? "₹0" :
    fmtMoney(currentIncentive);

  return (
    <div style={{ minHeight: "100dvh", background: "#09090B" }}>
      {needsProfile && <ProfileSetupModal />}
      <Navbar />

      <div style={{ padding: "32px 20px 100px", maxWidth: "600px", margin: "0 auto" }}>

        {/* ── Page header ── */}
        <div className="fade-up" style={{ marginBottom: "28px" }}>
          <div style={{
            fontSize: "10px", letterSpacing: "0.18em", color: "#3B82F6",
            fontWeight: "600", textTransform: "uppercase", marginBottom: "6px",
          }}>
            Technician Dashboard
          </div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "38px", fontWeight: "700", color: "#FAFAFA",
            letterSpacing: "0.02em", textTransform: "uppercase",
            lineHeight: 1, marginBottom: "10px",
          }}>
            {user?.name?.split(" ")[0]}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {user?.technicianId && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px", color: "#3B82F6", letterSpacing: "0.06em",
              }}>
                {user.technicianId}
              </span>
            )}
            {user?.branch && (
              <>
                <span style={{ color: "#3F3F46" }}>·</span>
                <span style={{
                  fontSize: "10px", color: "#71717A",
                  fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  {user.branch}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Stats grid — 6 cards, incentive fills the empty slot ── */}
        <div className="stat-grid fade-up" style={{ marginBottom: "20px", animationDelay: "0.05s" }}>
          <StatCard label="Total Entries"    value={entries.length}               />
          <StatCard label="Hours Worked"     value={totalHours}  unit="hrs total" />
          <StatCard label="Labour Earned"    value={fmtMoney(totalLabour)}        />
          <StatCard label="Leave Days"       value={totalLeave}  unit="days taken"/>
          <StatCard label="Vehicles Served"  value={totalVehicles} unit="unique"  />
          <StatCard
            label="This Month"
            value={incentiveDisplay}
            unit="projected"
            accent={currentIncentive > 0 ? "#22C55E" : undefined}
          />
        </div>

        {/* ── Monthly Incentive dropdown ── */}
        <div className="fade-up" style={{ animationDelay: "0.08s" }}>
          <IncentiveDropdown />
        </div>

        {/* ── Entries section ── */}
        <div className="fade-up" style={{ animationDelay: "0.1s" }}>

          {/* Header row with "+ New Entry" inline */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingBottom: "14px",
            borderBottom: "1px solid #27272A", marginBottom: "12px",
          }}>
            <div style={{
              fontSize: "9px", fontWeight: "600", letterSpacing: "0.16em",
              textTransform: "uppercase", color: "#71717A",
            }}>
              Work Entries
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px", color: "#71717A",
              }}>
                {entries.length} total
              </div>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  padding: "7px 14px",
                  background: "#FAFAFA", color: "#09090B",
                  border: "none", cursor: "pointer",
                  fontSize: "10px", fontWeight: "700",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  borderRadius: "3px",
                  transition: "background 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseOver={e => e.currentTarget.style.background = "#E4E4E7"}
                onMouseOut={e  => e.currentTarget.style.background = "#FAFAFA"}
              >
                + New Entry
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{
              textAlign: "center", padding: "48px 0",
              color: "#71717A", fontSize: "13px",
              fontWeight: "300", letterSpacing: "0.04em",
            }}>
              Loading…
            </div>
          ) : (
            <EntryTable entries={entries} onDeleted={fetchEntries} />
          )}
        </div>
      </div>

      {/* ── Floating action button ── */}
      <button
        onClick={() => setShowForm(true)}
        style={{
          position: "fixed",
          bottom: "28px",
          right: "20px",
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: "#3B82F6",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: "24px",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(59,130,246,0.45)",
          transition: "background 0.15s, transform 0.15s",
          zIndex: 100,
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = "#2563EB";
          e.currentTarget.style.transform  = "scale(1.08)";
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = "#3B82F6";
          e.currentTarget.style.transform  = "scale(1)";
        }}
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