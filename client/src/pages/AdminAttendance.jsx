import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate }                              from "react-router-dom";
import Navbar                                       from "../components/Navbar";
import api                                          from "../api/axios";
import { useAuthStore }                             from "../store/authStore";
import { BRANCHES }                                 from "../utils/constants";

// ─── Design tokens — identical to other admin pages ──────────────────────────
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

// ─── Type badge styles — mirrors AdminTechnicianList ─────────────────────────
const TYPE_STYLE = {
  "MECHANIC":           { color: "#1E3A8A", bg: "#EEF2F7", border: "#BFDBFE" },
  "MECHANIC HELPER":    { color: "#0369A1", bg: "#E0F2FE", border: "#BAE6FD" },
  "ELECTRICIAN":        { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  "ELECTRICIAN HELPER": { color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in local time — used for the date input and ?date= param */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Friendly display label for the date picker value */
function fmtDisplayDate(dateStr) {
  // Parse as local midnight so the displayed date matches what the user picked
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).toUpperCase();
}

/** HH:MM AM/PM from ISO string */
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/** Compact money formatter */
function fmtMoney(n) {
  if (!n || n === 0) return "₹0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

// ─── Injected styles ──────────────────────────────────────────────────────────
const INJECTED = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes aaFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes aaPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

  .aa-a1 { animation: aaFadeUp 0.28s ease both 0.00s; }
  .aa-a2 { animation: aaFadeUp 0.28s ease both 0.06s; }
  .aa-a3 { animation: aaFadeUp 0.28s ease both 0.10s; }

  /* ── Live indicator ── */
  .aa-live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #16A34A; flex-shrink: 0;
    animation: aaPulse 1.6s ease-in-out infinite;
  }
  .aa-spin {
    width: 8px; height: 8px; border-radius: 50%;
    border: 1.5px solid #DDE3EE; border-top-color: #1E3A8A;
    animation: spin 0.8s linear infinite; flex-shrink: 0;
  }

  /* ── KPI strip ── */
  .aa-kpi-strip {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 1px; background: #DDE3EE;
    border: 1px solid #DDE3EE; margin-bottom: 20px;
  }
  .aa-kpi-cell {
    background: #FFFFFF; padding: 14px 8px; text-align: center;
  }
  .aa-kpi-label {
    font-size: 8px; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #94A3B8; margin-bottom: 6px;
  }
  .aa-kpi-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 28px; font-weight: 700; color: #0A1628; line-height: 1;
  }

  /* ── Filter pills ── */
  .aa-filter-strip {
    display: flex; gap: 6px; overflow-x: auto;
    padding-bottom: 4px; margin-bottom: 16px;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .aa-filter-strip::-webkit-scrollbar { display: none; }

  .aa-filter-pill {
    flex-shrink: 0; padding: 5px 12px;
    border: 1.5px solid #DDE3EE; background: #F8FAFC;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #6B7A99; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent; white-space: nowrap;
  }
  .aa-filter-pill:hover                    { border-color: #1E3A8A; color: #1E3A8A; }
  .aa-filter-pill.active                   { background: #1E3A8A; border-color: #1E3A8A; color: #FFFFFF; }
  .aa-filter-pill.present-pill             { border-color: #BBF7D0; color: #16A34A; background: #F0FDF4; }
  .aa-filter-pill.present-pill:hover       { border-color: #16A34A; }
  .aa-filter-pill.present-pill.active      { background: #16A34A; border-color: #16A34A; color: #FFFFFF; }
  .aa-filter-pill.absent-pill              { border-color: #FECACA; color: #DC2626; background: #FEF2F2; }
  .aa-filter-pill.absent-pill:hover        { border-color: #DC2626; }
  .aa-filter-pill.absent-pill.active       { background: #DC2626; border-color: #DC2626; color: #FFFFFF; }

  /* ── Branch pills (superadmin) ── */
  .aa-branch-strip {
    display: flex; gap: 6px; overflow-x: auto;
    padding-bottom: 4px; margin-bottom: 20px;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .aa-branch-strip::-webkit-scrollbar { display: none; }
  .aa-branch-pill {
    flex-shrink: 0; padding: 5px 12px;
    border: 1.5px solid #DDE3EE; background: #F8FAFC;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #6B7A99; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent; white-space: nowrap;
  }
  .aa-branch-pill:hover        { border-color: #7C3AED; color: #7C3AED; }
  .aa-branch-pill.active       { background: #7C3AED; border-color: #7C3AED; color: #FFFFFF; }

  /* ── Search ── */
  .aa-search-wrap { position: relative; margin-bottom: 12px; }
  .aa-search-icon {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%);
    font-size: 15px; color: #94A3B8; pointer-events: none;
  }
  .aa-search-input {
    width: 100%; box-sizing: border-box;
    background: #FFFFFF; border: 1px solid #DDE3EE; border-radius: 0;
    color: #0A1628; font-size: 14px;
    padding: 12px 40px 12px 38px;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none; height: 48px;
    transition: border-color 0.15s;
  }
  .aa-search-input:focus { border-color: #1E3A8A; border-width: 1.5px; }
  .aa-search-clear {
    position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none; color: #94A3B8;
    cursor: pointer; font-size: 18px; line-height: 1; padding: 0;
    -webkit-tap-highlight-color: transparent;
  }

  /* ── Attendance cards ── */
  .aa-tech-card {
    background: #FFFFFF;
    border-left: 3px solid transparent;
    transition: border-color 0.2s;
  }
  .aa-tech-card.present { border-left-color: #16A34A; }
  .aa-tech-card.absent  { border-left-color: #DC2626; }

  /* ── Entry expand button ── */
  .aa-expand-btn {
    background: none; border: 1.5px solid #DDE3EE;
    padding: 5px 10px; cursor: pointer;
    color: #6B7A99; font-family: 'IBM Plex Sans', sans-serif;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent; white-space: nowrap;
    display: flex; align-items: center; gap: 4px;
  }
  .aa-expand-btn:hover { border-color: #1E3A8A; color: #1E3A8A; }

  /* ── Entry rows inside expanded section ── */
  .aa-entry-row {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 11px 16px;
    border-top: 1px solid #F1F5F9;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  /* ── Date input ── */
  .aa-date-input {
    background: #FFFFFF; border: 1.5px solid #DDE3EE;
    color: #0A1628; font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
    padding: 7px 12px; outline: none; border-radius: 0;
    cursor: pointer; transition: border-color 0.15s;
    -webkit-appearance: none;
  }
  .aa-date-input:focus { border-color: #1E3A8A; }

  /* ── "Today" reset button ── */
  .aa-today-btn {
    background: none; border: 1.5px solid #1E3A8A;
    color: #1E3A8A; font-family: 'IBM Plex Sans', sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; padding: 7px 12px;
    cursor: pointer; border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .aa-today-btn:hover { background: #1E3A8A; color: #FFFFFF; }

  /* ── Refresh button (past dates) ── */
  .aa-refresh-btn {
    background: none; border: 1.5px solid #DDE3EE;
    color: #6B7A99; font-family: 'IBM Plex Sans', sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; padding: 7px 12px;
    cursor: pointer; border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .aa-refresh-btn:hover { border-color: #1E3A8A; color: #1E3A8A; }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .aa-kpi-strip { grid-template-columns: repeat(2, 1fr); }
    .aa-card-main { flex-direction: column !important; gap: 12px !important; }
    .aa-card-right { flex-direction: row !important; align-items: center !important; }
  }
`;

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminAttendance() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();

  const isSuperAdmin  = user?.role === "superadmin";
  const isBranchAdmin = user?.role === "admin";

  const todayStr = toLocalDateStr(new Date());

  // ── State ──────────────────────────────────────────────────────────────────
  const [data,          setData]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [selectedDate,  setSelectedDate]  = useState(todayStr);
  const [branch,        setBranch]        = useState(null);   // superadmin filter; null = all
  const [statusFilter,  setStatusFilter]  = useState("ALL"); // ALL | PRESENT | ABSENT
  const [search,        setSearch]        = useState("");
  const [expandedIds,   setExpandedIds]   = useState(new Set());
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [isPolling,     setIsPolling]     = useState(false);

  const intervalRef = useRef(null);
  const isToday     = selectedDate === todayStr;

  // ── Inject styles ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = "aa-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = INJECTED;
      document.head.appendChild(el);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  // silent=true → background poll (no spinner, no error wipe)
  // silent=false → full load (spinner shown, error cleared)
  const fetchAttendance = useCallback(
    async (silent = false) => {
      if (!silent) { setLoading(true); setError(""); }
      else setIsPolling(true);

      try {
        const params = new URLSearchParams({ date: selectedDate });
        // Branch admin: server ignores ?branch — it's forced via branchGuard + JWT.
        // Superadmin: send if user chose a specific branch.
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
        // Silent poll failures are swallowed — stale data stays visible.
      } finally {
        if (!silent) setLoading(false);
        else setIsPolling(false);
      }
    },
    [selectedDate, branch, isSuperAdmin]
  );

  // ── Initial load + 30-second poll (today only) ────────────────────────────
  useEffect(() => {
    fetchAttendance(false);

    // Reset expanded rows when date/branch changes
    setExpandedIds(new Set());

    if (isToday) {
      intervalRef.current = setInterval(() => fetchAttendance(true), 30_000);
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

  // Filter by status pill
  const afterStatus = data.filter(d => {
    if (statusFilter === "PRESENT") return d.status === "present";
    if (statusFilter === "ABSENT")  return d.status === "absent";
    return true;
  });

  // Filter by search
  const filtered = afterStatus.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.technician?.name?.toLowerCase().includes(q) ||
      d.technician?.technicianId?.toLowerCase().includes(q) ||
      d.technician?.branch?.toLowerCase().includes(q)
    );
  });

  // Sort: present first, then alphabetical within each group
  const sorted = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === "present" ? -1 : 1;
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
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

          {/* Eyebrow */}
          <div style={{
            fontSize: "9px", fontWeight: "700", letterSpacing: "0.2em",
            textTransform: "uppercase", color: C.navy, marginBottom: "4px",
          }}>
            {isBranchAdmin ? `${user.branch} · ` : ""}Attendance
          </div>

          {/* Title — selected date */}
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "clamp(24px, 6vw, 36px)", fontWeight: "700", color: C.ink,
            letterSpacing: "0.04em", textTransform: "uppercase",
            margin: "0 0 16px", lineHeight: 1,
          }}>
            {fmtDisplayDate(selectedDate)}
          </h1>

          {/* Controls row: date picker + today button + live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="date"
              className="aa-date-input"
              value={selectedDate}
              max={todayStr}
              onChange={handleDateChange}
            />

            {/* "Today" shortcut — visible when not on today */}
            {!isToday && (
              <button
                className="aa-today-btn"
                onClick={() => { setSelectedDate(todayStr); setStatusFilter("ALL"); setSearch(""); }}
              >
                Today
              </button>
            )}

            {/* Manual refresh for past dates */}
            {!isToday && !loading && (
              <button className="aa-refresh-btn" onClick={() => fetchAttendance(false)}>
                ↺ Refresh
              </button>
            )}

            {/* Live pill — today only */}
            {isToday && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                {isPolling
                  ? <div className="aa-spin" />
                  : <div className="aa-live-dot" />
                }
                <span style={{
                  fontSize: "9px", fontWeight: "700",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: C.muted,
                }}>
                  {isPolling ? "Refreshing…" : "Live · 30s"}
                </span>
              </div>
            )}

            {/* Last updated */}
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
              { label: "Total",   value: data.length,          color: C.ink     },
              { label: "Present", value: presentList.length,   color: C.success },
              { label: "Absent",  value: absentList.length,    color: C.danger  },
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

        {/* ════════════════════════════════════════════════════════════════════
            Content states: loading · error · empty · no-match · card list
            ════════════════════════════════════════════════════════════════════ */}

        {loading ? (
          /* ── Loading spinner ── */
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
          /* ── Error / access denied ── */
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
          /* ── No technicians in branch ── */
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
          /* ── Filter produced no results ── */
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
              const typeStyle  = technician.technicianType
                ? TYPE_STYLE[technician.technicianType]
                : null;
              const hasEntries = entriesCount > 0 && entries && entries.length > 0;

              return (
                <div key={uid} className={`aa-tech-card ${isPresent ? "present" : "absent"}`}>

                  {/* ── Card main row ── */}
                  <div
                    className="aa-card-main"
                    style={{
                      padding: "18px 20px",
                      display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", gap: "12px",
                    }}
                  >
                    {/* Left — technician identity */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Name + status badge */}
                      <div style={{
                        display: "flex", alignItems: "center",
                        gap: "10px", flexWrap: "wrap", marginBottom: "5px",
                      }}>
                        <span style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: "22px", fontWeight: "700", color: C.ink,
                          letterSpacing: "0.03em", lineHeight: 1,
                        }}>
                          {technician.name}
                        </span>

                        <span style={{
                          fontSize: "8px", fontWeight: "700",
                          letterSpacing: "0.14em", textTransform: "uppercase",
                          padding: "3px 8px",
                          color:      isPresent ? "#15803D" : "#991B1B",
                          background: isPresent ? "#DCFCE7" : "#FEF2F2",
                          border:     `1px solid ${isPresent ? "#86EFAC" : "#FECACA"}`,
                        }}>
                          {isPresent ? "● Present" : "○ Absent"}
                        </span>
                      </div>

                      {/* Technician ID */}
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "11px", color: C.navy, fontWeight: "600",
                          letterSpacing: "0.08em",
                        }}>
                          {technician.technicianId || <span style={{ color: C.dim }}>No ID set</span>}
                        </span>
                      </div>

                      {/* Meta chips: branch · type · marked time */}
                      <div style={{
                        display: "flex", alignItems: "center",
                        gap: "6px", flexWrap: "wrap",
                      }}>

                        {/* Branch — only show for superadmin (branch admin always same) */}
                        {isSuperAdmin && (
                          <span style={{
                            fontSize: "9px", fontWeight: "700",
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            color: C.muted, background: C.cardAlt,
                            border: `1px solid ${C.border}`, padding: "2px 7px",
                          }}>
                            {technician.branch}
                          </span>
                        )}

                        {/* Technician type */}
                        {technician.technicianType && typeStyle ? (
                          <span style={{
                            fontSize: "8px", fontWeight: "700",
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            padding: "2px 7px",
                            color: typeStyle.color, background: typeStyle.bg,
                            border: `1px solid ${typeStyle.border}`,
                          }}>
                            {technician.technicianType}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: "8px", fontWeight: "700",
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            padding: "2px 7px",
                            color: "#D97706", background: "#FEF3C7",
                            border: "1px solid #FDE68A",
                          }}>
                            ⚠ No Type
                          </span>
                        )}

                        {/* Marked-at time for present technicians */}
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

                    {/* Right — entry count box + expand toggle */}
                    <div
                      className="aa-card-right"
                      style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "flex-end", gap: "8px",
                        flexShrink: 0,
                      }}
                    >
                      {/* Entry count tile */}
                      <div style={{
                        background: entriesCount > 0 ? "#EEF2F7" : C.cardAlt,
                        border: `1px solid ${C.border}`,
                        padding: "8px 12px", textAlign: "center",
                        minWidth: "52px",
                      }}>
                        <div style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: "22px", fontWeight: "700",
                          color: entriesCount > 0 ? C.navy : C.dim,
                          lineHeight: 1,
                        }}>
                          {entriesCount}
                        </div>
                        <div style={{
                          fontSize: "7px", fontWeight: "700",
                          letterSpacing: "0.14em", textTransform: "uppercase",
                          color: C.dim, marginTop: "2px",
                        }}>
                          {entriesCount === 1 ? "Entry" : "Entries"}
                        </div>
                      </div>

                      {/* Expand toggle — only when entries exist */}
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

                  {/* ── Expanded entries section ── */}
                  {isExpanded && hasEntries && (
                    <div style={{ borderTop: `1px solid ${C.border}` }}>

                      {/* Sub-header */}
                      <div style={{
                        padding: "8px 20px",
                        background: "#EEF2F7",
                        borderBottom: `1px solid ${C.border}`,
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <span style={{
                          fontSize: "8px", fontWeight: "700",
                          letterSpacing: "0.18em", textTransform: "uppercase",
                          color: C.muted,
                        }}>
                          Job Cards — {entries.length}
                        </span>
                        <span style={{
                          fontSize: "8px", fontWeight: "700",
                          letterSpacing: "0.16em", textTransform: "uppercase",
                          color: C.navy,
                        }}>
                          {fmtDisplayDate(selectedDate).split(",")[0]}
                        </span>
                      </div>

                      {/* Entry rows */}
                      {entries.map((entry, idx) => (
                        <div
                          key={entry._id?.toString() || idx}
                          className="aa-entry-row"
                          style={{ background: idx % 2 === 0 ? C.card : C.cardAlt }}
                        >
                          {/* Category + JC No + Vehicle */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: "11px", fontWeight: "600", color: C.navy,
                              letterSpacing: "0.06em", marginBottom: "3px",
                            }}>
                              {entry.jcNo}
                            </div>
                            <div style={{
                              fontSize: "10px", fontWeight: "700",
                              color: C.mid, letterSpacing: "0.06em",
                              textTransform: "uppercase", marginBottom: "2px",
                            }}>
                              {entry.category}
                            </div>
                            {entry.vehicleNo && (
                              <div style={{
                                fontSize: "10px", color: C.muted,
                                letterSpacing: "0.02em",
                              }}>
                                {entry.vehicleNo}
                              </div>
                            )}
                          </div>

                          {/* Numeric stats */}
                          <div style={{
                            display: "flex", gap: "14px",
                            flexShrink: 0, alignItems: "center",
                          }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: "13px", fontWeight: "700", color: C.success,
                              }}>
                                {entry.hoursWorked}h
                              </div>
                              <div style={{
                                fontSize: "7px", fontWeight: "700",
                                letterSpacing: "0.14em", textTransform: "uppercase",
                                color: C.dim,
                              }}>
                                Hours
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <div style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: "13px", fontWeight: "700", color: C.amber,
                              }}>
                                {fmtMoney(entry.labourAmount)}
                              </div>
                              <div style={{
                                fontSize: "7px", fontWeight: "700",
                                letterSpacing: "0.14em", textTransform: "uppercase",
                                color: C.dim,
                              }}>
                                Labour
                              </div>
                            </div>

                            {entry.leaveDays > 0 && (
                              <div style={{ textAlign: "right" }}>
                                <div style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: "13px", fontWeight: "700", color: C.danger,
                                }}>
                                  {entry.leaveDays}d
                                </div>
                                <div style={{
                                  fontSize: "7px", fontWeight: "700",
                                  letterSpacing: "0.14em", textTransform: "uppercase",
                                  color: C.dim,
                                }}>
                                  Leave
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Day totals footer */}
                      {entries.length > 1 && (
                        <div style={{
                          padding: "10px 20px",
                          background: "#E4EBF8",
                          borderTop: `1px solid ${C.border}`,
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center",
                        }}>
                          <span style={{
                            fontSize: "8px", fontWeight: "700",
                            letterSpacing: "0.16em", textTransform: "uppercase",
                            color: C.muted,
                          }}>
                            Day Total
                          </span>
                          <div style={{ display: "flex", gap: "20px" }}>
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: "12px", fontWeight: "700", color: C.success,
                            }}>
                              {entries.reduce((s, e) => s + (e.hoursWorked || 0), 0)}h
                            </span>
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: "12px", fontWeight: "700", color: C.amber,
                            }}>
                              {fmtMoney(entries.reduce((s, e) => s + (e.labourAmount || 0), 0))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Present + no entries logged ── */}
                  {isPresent && entriesCount === 0 && (
                    <div style={{
                      padding: "9px 20px",
                      borderTop: `1px solid ${C.border}`,
                      background: "#F0FDF4",
                    }}>
                      <span style={{
                        fontSize: "9px", fontWeight: "600",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "#15803D", opacity: 0.7,
                      }}>
                        Present — No job cards logged today
                      </span>
                    </div>
                  )}

                  {/* ── Absent footer note ── */}
                  {!isPresent && (
                    <div style={{
                      padding: "9px 20px",
                      borderTop: `1px solid #FECACA`,
                      background: "#FFF8F8",
                    }}>
                      <span style={{
                        fontSize: "9px", fontWeight: "600",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "#DC2626", opacity: 0.6,
                      }}>
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