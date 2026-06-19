import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate }                              from "react-router-dom";
import Navbar                                       from "../components/Navbar";
import api                                          from "../api/axios";
import { useAuthStore }                             from "../store/authStore";
import { BRANCHES }                                 from "../utils/constants";
import "./AdminAttendance.css";
// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  pageBg:  "#EEF2F7",
  card:    "#FFFFFF",
  cardAlt: "#F8FAFC",
  border:  "#DDE3EE",
  borderL: "#F1F5F9",
  navy:    "#1E3A8A",
  navyHov: "#1E40AF",
  ink:     "#0A1628",
  mid:     "#374151",
  muted:   "#6B7A99",
  dim:     "#94A3B8",
  success: "#16A34A",
  danger:  "#DC2626",
  amber:   "#D97706",
  purple:  "#7C3AED",
};

const TYPE_STYLE = {
  "MECHANIC":           { color: "#1E3A8A", bg: "#EEF2F7", border: "#BFDBFE" },
  "MECHANIC HELPER":    { color: "#0369A1", bg: "#E0F2FE", border: "#BAE6FD" },
  "ELECTRICIAN":        { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  "ELECTRICIAN HELPER": { color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function fmtDisplayDate(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).toUpperCase();
}
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fmtMoney(n) {
  if (!n || n === 0) return "₹0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}


// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminAttendance() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();

  const isSuperAdmin  = user?.role === "superadmin";
  const isBranchAdmin = user?.role === "admin";

  const todayStr = toLocalDateStr(new Date());

  // ── State ──────────────────────────────────────────────────────────────────
  const [data,         setData]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [branch,       setBranch]       = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy,       setSortBy]       = useState("alpha");   // "alpha" | "first-in"
  const [search,       setSearch]       = useState("");
  const [expandedIds,  setExpandedIds]  = useState(new Set());
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [isPolling,    setIsPolling]    = useState(false);

  const intervalRef = useRef(null);
  const isToday     = selectedDate === todayStr;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAttendance = useCallback(
    async (silent = false) => {
      if (!silent) { setLoading(true); setError(""); }
      else setIsPolling(true);

      try {
        const params = new URLSearchParams({ date: selectedDate });
        if (isSuperAdmin && branch) params.set("branch", branch);

        const res = await api.get(`/api/attendance/admin?${params.toString()}`);
        setData(res.data);
        setLastUpdated(new Date());
      } catch (err) {
        if (!silent) {
          if (err.response?.status === 403) {
            setError("Access denied: You do not have permission to view this data.");
          } else {
            setError("Failed to load attendance data. Please try again.");
          }
        }
      } finally {
        if (!silent) setLoading(false);
        else setIsPolling(false);
      }
    },
    [selectedDate, branch, isSuperAdmin]
  );

  // ── Initial load + 30-second poll (today only) ────────────────────────────
  // FIX: visibility guard — skip silent polls when the tab is backgrounded.
  // Without this, the interval fires every 30s regardless of whether anyone
  // is actually looking at the page. With multiple admins leaving the tab
  // open, this multiplies unnecessary DB load throughout the workday.
  // The guard is purely additive — no change to poll frequency, no change
  // to the non-silent (initial/manual) fetch path.
  useEffect(() => {
    fetchAttendance(false);
    setExpandedIds(new Set());

    if (isToday) {
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === "visible") fetchAttendance(true);
      }, 30_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAttendance, isToday]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const presentList = data.filter(d => d.status === "present");
  const absentList  = data.filter(d => d.status === "absent");
  const rate        = data.length > 0
    ? Math.round((presentList.length / data.length) * 100)
    : 0;

  const afterStatus = data.filter(d => {
    if (statusFilter === "PRESENT") return d.status === "present";
    if (statusFilter === "ABSENT")  return d.status === "absent";
    return true;
  });

  const filtered = afterStatus.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.technician?.name?.toLowerCase().includes(q) ||
      d.technician?.technicianId?.toLowerCase().includes(q) ||
      d.technician?.branch?.toLowerCase().includes(q)
    );
  });

  // ── Sort: alpha (present first → A-Z) or first-in (present → by markedAt asc) ──
  const sorted = [...filtered].sort((a, b) => {
    // Always present before absent
    if (a.status !== b.status) return a.status === "present" ? -1 : 1;

    if (sortBy === "first-in") {
      // Among present: earliest markedAt first
      if (a.status === "present" && b.status === "present") {
        const ta = a.markedAt ? new Date(a.markedAt).getTime() : Infinity;
        const tb = b.markedAt ? new Date(b.markedAt).getTime() : Infinity;
        return ta - tb;
      }
    }

    // Default / absent: alphabetical by name
    return (a.technician?.name || "").localeCompare(b.technician?.name || "");
  });

  // ── Expand toggle ──────────────────────────────────────────────────────────
  const toggleExpand = (uid) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setStatusFilter("ALL");
    setSearch("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh",
      background: C.pageBg,
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <Navbar />

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* ── Page header ── */}
        <div className="aa-a1" style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            fontSize: "9px", fontWeight: "700", letterSpacing: "0.2em",
            textTransform: "uppercase", color: C.navy, marginBottom: "4px",
          }}>
            {isBranchAdmin ? `${user.branch} · ` : ""}Attendance
          </div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "clamp(24px, 6vw, 36px)", fontWeight: "700", color: C.ink,
            letterSpacing: "0.04em", textTransform: "uppercase",
            margin: "0 0 16px", lineHeight: 1,
          }}>
            {fmtDisplayDate(selectedDate)}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="date"
              className="aa-date-input"
              value={selectedDate}
              max={todayStr}
              onChange={handleDateChange}
            />
            {!isToday && (
              <button
                className="aa-today-btn"
                onClick={() => { setSelectedDate(todayStr); setStatusFilter("ALL"); setSearch(""); }}
              >
                Today
              </button>
            )}
            {!isToday && !loading && (
              <button className="aa-refresh-btn" onClick={() => fetchAttendance(false)}>
                ↺ Refresh
              </button>
            )}
            {isToday && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                {isPolling ? <div className="aa-spin" /> : <div className="aa-live-dot" />}
                <span style={{
                  fontSize: "9px", fontWeight: "700",
                  letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted,
                }}>
                  {isPolling ? "Refreshing…" : "Live · 30s"}
                </span>
              </div>
            )}
            {lastUpdated && !isPolling && (
              <span style={{
                fontSize: "9px", color: C.dim, fontWeight: "500",
                letterSpacing: "0.04em",
                marginLeft: isToday ? "0" : "auto",
              }}>
                Updated {fmtTime(lastUpdated.toISOString())}
              </span>
            )}
          </div>
        </div>

        {/* ── Superadmin: Branch filter ── */}
        {isSuperAdmin && !loading && !error && (
          <div className="aa-a2">
            <div style={{
              fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
              textTransform: "uppercase", color: C.dim, marginBottom: "8px",
            }}>
              Filter by Branch
            </div>
            <div className="aa-branch-strip">
              <button
                className={`aa-branch-pill${branch === null ? " active" : ""}`}
                onClick={() => setBranch(null)}
              >
                All Branches
              </button>
              {BRANCHES.map(b => (
                <button
                  key={b}
                  className={`aa-branch-pill${branch === b ? " active" : ""}`}
                  onClick={() => setBranch(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Branch admin: locked branch badge ── */}
        {isBranchAdmin && !loading && !error && (
          <div className="aa-a2" style={{
            display: "flex", alignItems: "center", gap: "8px",
            marginBottom: "20px",
            background: C.card, border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.navy}`,
            padding: "10px 14px",
          }}>
            <span style={{
              fontSize: "9px", fontWeight: "700", letterSpacing: "0.16em",
              textTransform: "uppercase", color: C.muted,
            }}>Viewing branch</span>
            <span style={{
              fontSize: "9px", fontWeight: "700", letterSpacing: "0.14em",
              textTransform: "uppercase", color: C.navy,
              background: "#EEF2F7", border: `1px solid ${C.border}`,
              padding: "3px 9px",
            }}>{user.branch}</span>
          </div>
        )}

        {/* ── KPI strip ── */}
        {!loading && !error && data.length > 0 && (
          <div className="aa-kpi-strip aa-a2">
            {[
              { label: "Total",   value: data.length,        color: C.ink     },
              { label: "Present", value: presentList.length, color: C.success },
              { label: "Absent",  value: absentList.length,  color: C.danger  },
              {
                label: "Rate",
                value: `${rate}%`,
                color: rate >= 80 ? C.success : rate >= 60 ? C.amber : C.danger,
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="aa-kpi-cell">
                <div className="aa-kpi-label">{label}</div>
                <div className="aa-kpi-value" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Search ── */}
        {!loading && !error && data.length > 2 && (
          <div className="aa-search-wrap aa-a2">
            <span className="aa-search-icon">⌕</span>
            <input
              type="text"
              className="aa-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or technician ID…"
            />
            {search && (
              <button className="aa-search-clear" onClick={() => setSearch("")}>×</button>
            )}
          </div>
        )}

        {/* ── Status filter pills ── */}
        {!loading && !error && data.length > 0 && (
          <div className="aa-filter-strip aa-a2">
            {[
              { key: "ALL",     label: "All",     count: data.length,        cls: ""             },
              { key: "PRESENT", label: "Present", count: presentList.length, cls: "present-pill" },
              { key: "ABSENT",  label: "Absent",  count: absentList.length,  cls: "absent-pill"  },
            ].map(({ key, label, count, cls }) => (
              <button
                key={key}
                className={`aa-filter-pill${cls ? ` ${cls}` : ""}${statusFilter === key ? " active" : ""}`}
                onClick={() => setStatusFilter(key)}
              >
                {label} <span style={{ opacity: 0.65, marginLeft: "3px" }}>({count})</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Sort controls ── */}
        {!loading && !error && data.length > 0 && (
          <div className="aa-sort-row aa-a2">
            <span className="aa-sort-label">Sort</span>
            <button
              className={`aa-sort-btn${sortBy === "alpha" ? " active" : ""}`}
              onClick={() => setSortBy("alpha")}
            >
              A – Z
            </button>
            <button
              className={`aa-sort-btn${sortBy === "first-in" ? " active" : ""}`}
              onClick={() => setSortBy("first-in")}
            >
              ↑ First In
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            Content states
            ════════════════════════════════════════════════════════════════════ */}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: "28px", height: "28px",
              border: `2px solid ${C.border}`, borderTop: `2px solid ${C.navy}`,
              borderRadius: "50%", margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{
              fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
              fontWeight: "700", color: C.dim, margin: 0,
            }}>Loading attendance…</p>
          </div>

        ) : error ? (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA",
            borderLeft: "3px solid #DC2626", padding: "24px",
          }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>🔒</div>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "18px", fontWeight: "700", color: C.danger,
              letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "8px",
            }}>Access Denied</p>
            <p style={{ fontSize: "13px", color: "#991B1B", lineHeight: 1.6, margin: 0 }}>
              {error}
            </p>
            <button
              onClick={() => navigate("/admin")}
              style={{
                marginTop: "16px", padding: "10px 20px",
                background: "transparent", border: `1px solid ${C.border}`,
                color: C.muted, fontSize: "10px", fontWeight: "700",
                letterSpacing: "0.14em", textTransform: "uppercase",
                cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
                borderRadius: "0",
              }}
            >
              ← Back to Dashboard
            </button>
          </div>

        ) : data.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            padding: "56px 20px", textAlign: "center",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "20px", fontWeight: "700", letterSpacing: "0.08em",
              textTransform: "uppercase", color: C.dim, marginBottom: "6px",
            }}>No Technicians Found</div>
            <p style={{ color: C.dim, fontSize: "13px", margin: 0, fontWeight: "400" }}>
              No profile-complete technicians exist
              {isSuperAdmin && branch ? ` in ${branch}` : ""}.
            </p>
          </div>

        ) : sorted.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            padding: "40px 20px", textAlign: "center",
          }}>
            <p style={{ fontSize: "13px", color: C.muted, margin: 0 }}>
              {search
                ? `No match for "${search}" in the ${statusFilter.toLowerCase()} list.`
                : `No ${statusFilter.toLowerCase()} technicians for this date.`}
            </p>
          </div>

        ) : (
          /* ── Card list ── */
          <div
            className="aa-a3"
            style={{
              display: "flex", flexDirection: "column", gap: "1px",
              background: C.border, border: `1px solid ${C.border}`,
            }}
          >
            {sorted.map(({ technician, status, markedAt, entriesCount, entries }) => {
              const uid        = technician._id?.toString();
              const isPresent  = status === "present";
              const isExpanded = expandedIds.has(uid);
              const typeStyle  = technician.technicianType ? TYPE_STYLE[technician.technicianType] : null;
              const hasEntries = entriesCount > 0 && entries && entries.length > 0;

              return (
                <div key={uid} className={`aa-tech-card ${isPresent ? "present" : "absent"}`}>

                  {/* ── Card main row ── */}
                  <div className="aa-card-inner">

                    {/* Left — technician identity */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Name + status badge */}
                      <div style={{
                        display: "flex", alignItems: "center",
                        gap: "8px", flexWrap: "wrap", marginBottom: "4px",
                      }}>
                        <span className="aa-tech-name">{technician.name}</span>
                        <span style={{
                          fontSize: "8px", fontWeight: "700",
                          letterSpacing: "0.14em", textTransform: "uppercase",
                          padding: "2px 7px", flexShrink: 0,
                          color:      isPresent ? "#15803D" : "#991B1B",
                          background: isPresent ? "#DCFCE7" : "#FEF2F2",
                          border:     `1px solid ${isPresent ? "#86EFAC" : "#FECACA"}`,
                        }}>
                          {isPresent ? "● Present" : "○ Absent"}
                        </span>
                      </div>

                      {/* Technician ID */}
                      <div style={{ marginBottom: "6px" }}>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "11px", color: C.navy,
                          fontWeight: "600", letterSpacing: "0.08em",
                        }}>
                          {technician.technicianId || <span style={{ color: C.dim }}>No ID set</span>}
                        </span>
                      </div>

                      {/* Meta chips */}
                      <div className="aa-chips-row">
                        {isSuperAdmin && (
                          <span style={{
                            fontSize: "8px", fontWeight: "700",
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            color: C.muted, background: C.cardAlt,
                            border: `1px solid ${C.border}`, padding: "2px 6px",
                          }}>
                            {technician.branch}
                          </span>
                        )}

                        {technician.technicianType && typeStyle ? (
                          <span style={{
                            fontSize: "8px", fontWeight: "700",
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            padding: "2px 6px",
                            color: typeStyle.color, background: typeStyle.bg,
                            border: `1px solid ${typeStyle.border}`,
                          }}>
                            {technician.technicianType}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: "8px", fontWeight: "700",
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            padding: "2px 6px",
                            color: "#D97706", background: "#FEF3C7",
                            border: "1px solid #FDE68A",
                          }}>
                            ⚠ No Type
                          </span>
                        )}

                        {/* Marked-at time */}
                        {isPresent && markedAt && (
                          <span style={{
                            fontSize: "10px", color: C.success,
                            fontWeight: "600", letterSpacing: "0.02em",
                          }}>
                            ✓ {fmtTime(markedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right — entry count + expand */}
                    <div style={{
                      display: "flex", flexDirection: "column",
                      alignItems: "flex-end", gap: "7px", flexShrink: 0,
                    }}>
                      <div className={`aa-entry-tile${entriesCount === 0 ? " empty" : ""}`}>
                        <div className="aa-entry-count" style={{ color: entriesCount > 0 ? C.navy : C.dim }}>
                          {entriesCount}
                        </div>
                        <div className="aa-entry-unit">
                          {entriesCount === 1 ? "Entry" : "Entries"}
                        </div>
                      </div>

                      {hasEntries && (
                        <button
                          className="aa-expand-btn"
                          onClick={() => toggleExpand(uid)}
                        >
                          {isExpanded ? "▲ Hide" : "▼ View"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Expanded entries ── */}
                  {isExpanded && hasEntries && (
                    <div style={{ borderTop: `1px solid ${C.border}` }}>
                      <div style={{
                        padding: "8px 16px",
                        background: "#EEF2F7",
                        borderBottom: `1px solid ${C.border}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span style={{
                          fontSize: "8px", fontWeight: "700",
                          letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted,
                        }}>
                          Job Cards — {entries.length}
                        </span>
                        <span style={{
                          fontSize: "8px", fontWeight: "700",
                          letterSpacing: "0.16em", textTransform: "uppercase", color: C.navy,
                        }}>
                          {fmtDisplayDate(selectedDate).split(",")[0]}
                        </span>
                      </div>

                      {entries.map((entry, idx) => (
                        <div
                          key={entry._id?.toString() || idx}
                          className="aa-entry-row"
                         style={{ background: idx % 2 === 0 ? "#E8EEF6" : "#DDE5F0" }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: "11px", fontWeight: "600", color: C.navy,
                              letterSpacing: "0.06em", marginBottom: "3px",
                            }}>
                              {entry.jcNo}
                            </div>
                            <div style={{
                              fontSize: "10px", fontWeight: "700", color: C.mid,
                              letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px",
                            }}>
                              {entry.category}
                            </div>
                          {entry.vehicleNo && (
  <div style={{ fontSize: "10px", color: C.muted, letterSpacing: "0.02em" }}>
    {entry.vehicleNo}
  </div>
)}
{entry.createdAt && (
  <div style={{
    fontSize: "9px", fontWeight: "600",
    letterSpacing: "0.08em", textTransform: "uppercase",
    color: C.purple, marginTop: "3px",
    display: "flex", alignItems: "center", gap: "3px",
  }}>
    <span style={{ opacity: 0.6 }}>⏱</span>
    Logged {fmtTime(entry.createdAt)}
  </div>
)}
                          </div>

                          <div style={{ display: "flex", gap: "14px", flexShrink: 0, alignItems: "center" }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", fontWeight: "700", color: C.success }}>
                                {entry.hoursWorked}h
                              </div>
                              <div style={{ fontSize: "7px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: C.dim }}>
                                Hours
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", fontWeight: "700", color: C.amber }}>
                                {fmtMoney(entry.labourAmount)}
                              </div>
                              <div style={{ fontSize: "7px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: C.dim }}>
                                Labour
                              </div>
                            </div>
                            {entry.leaveDays > 0 && (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", fontWeight: "700", color: C.danger }}>
                                  {entry.leaveDays}d
                                </div>
                                <div style={{ fontSize: "7px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: C.dim }}>
                                  Leave
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {entries.length > 1 && (
                        <div style={{
                          padding: "10px 16px", background: "#E4EBF8",
                          borderTop: `1px solid ${C.border}`,
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span style={{ fontSize: "8px", fontWeight: "700", letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted }}>
                            Day Total
                          </span>
                          <div style={{ display: "flex", gap: "20px" }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", fontWeight: "700", color: C.success }}>
                              {entries.reduce((s, e) => s + (e.hoursWorked || 0), 0)}h
                            </span>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", fontWeight: "700", color: C.amber }}>
                              {fmtMoney(entries.reduce((s, e) => s + (e.labourAmount || 0), 0))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Present + no entries */}
                  {isPresent && entriesCount === 0 && (
                    <div style={{ padding: "8px 16px", borderTop: `1px solid ${C.border}`, background: "#F0FDF4" }}>
                      <span style={{ fontSize: "9px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "#15803D", opacity: 0.7 }}>
                        Present — No job cards logged today
                      </span>
                    </div>
                  )}

                  {/* Absent footer */}
                  {!isPresent && (
                    <div style={{ padding: "8px 16px", borderTop: `1px solid #FECACA`, background: "#FFF8F8" }}>
                      <span style={{ fontSize: "9px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "#DC2626", opacity: 0.6 }}>
                        Did not mark attendance · No job cards
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer result count ── */}
        {!loading && !error && sorted.length > 0 && (search || statusFilter !== "ALL") && (
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px", color: C.dim, marginTop: "12px",
            letterSpacing: "0.06em", textAlign: "right",
          }}>
            {sorted.length} / {data.length} technicians
          </p>
        )}
      </div>
    </div>
  );
}