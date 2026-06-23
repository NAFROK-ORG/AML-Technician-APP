import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { BRANCHES } from "../utils/constants";
import "./AttendanceAnalytics.css";

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

const STATUS_COLOR = {
  Excellent: C.success,
  Good:      C.navy,
  "At Risk": C.amber,
  Critical:  C.danger,
};

const heatColor = (rate) => {
  if (rate >= 90) return "#16A34A";
  if (rate >= 80) return "#1E3A8A";
  if (rate >= 70) return "#D97706";
  return "#DC2626";
};

const monthLabel = () =>
  new Date()
    .toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    .toUpperCase();

const fmtDate = (iso) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
};

// ─── KPI strip ────────────────────────────────────────────────────────────────
function KpiStrip({ kpis }) {
  const presentPct =
    kpis.presentToday.total > 0
      ? Math.round((kpis.presentToday.present / kpis.presentToday.total) * 100)
      : 0;

  const cells = [
    {
      label: "Present Today",
      value: `${kpis.presentToday.present}/${kpis.presentToday.total}`,
      sub:   `${presentPct}%`,
      color: C.ink,
    },
    {
      label: "Month Rate",
      value: `${kpis.monthRate}%`,
      sub:   "this month",
      color: kpis.monthRate >= 80 ? C.success : kpis.monthRate >= 60 ? C.amber : C.danger,
    },
    {
      label: "Consistent",
      value: kpis.consistentCount,
      sub:   "≥90% rate",
      color: C.success,
    },
    {
      label: "Ghost Attendance",
      value: kpis.ghostAttendanceCount,
      sub:   "present, no entries",
      color: kpis.ghostAttendanceCount > 0 ? C.amber : C.success,
    },
  ];

  return (
    <div className="ata-kpi-strip">
      {cells.map((c) => (
        <div key={c.label} className="ata-kpi-cell">
          <div className="ata-kpi-label">{c.label}</div>
          <div className="ata-kpi-value" style={{ color: c.color }}>{c.value}</div>
          <div className="ata-kpi-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Daily trend — inline SVG bar chart ──────────────────────────────────────
function DailyTrendChart({ dailyTrend }) {
  if (!dailyTrend.length) return null;
  const W = 700, H = 140, padBottom = 18, barGap = 3;
  const barW = (W / dailyTrend.length) - barGap;

  return (
    <div className="ata-card">
      <div className="ata-card-title">Daily attendance trend — {monthLabel()}</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "130px", display: "block" }}
      >
        {dailyTrend.map((d, i) => {
          const barH = Math.max(2, ((H - padBottom) * d.rate) / 100);
          const x    = i * (barW + barGap);
          const y    = H - padBottom - barH;
          const fill = d.rate < 70 ? C.danger : C.navy;
          return (
            <g key={d.date}>
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={fill} rx="1" opacity={d.rate < 70 ? 1 : 0.85}
              >
                <title>{`${fmtDate(d.date)} · ${d.present}/${d.total} present · ${d.rate}%`}</title>
              </rect>
            </g>
          );
        })}
        <line
          x1="0" y1={H - padBottom} x2={W} y2={H - padBottom}
          stroke={C.border} strokeWidth="1"
        />
      </svg>
      <div className="ata-legend">
        <span><i style={{ background: C.navy }} /> normal</span>
        <span><i style={{ background: C.danger }} /> below 70%</span>
      </div>
    </div>
  );
}

// ─── Day-of-week pattern ──────────────────────────────────────────────────────
function DayOfWeekChart({ dayOfWeekPattern }) {
  const { pattern, flag } = dayOfWeekPattern;
  const max = Math.max(...pattern.map((p) => p.avgRate), 1);

  return (
    <div className="ata-card">
      <div className="ata-card-title">Day-of-week pattern</div>
      <div className="ata-dow-row">
        {pattern.map((p) => (
          <div key={p.day} className="ata-dow-bar-wrap">
            <div
              className="ata-dow-bar"
              style={{
                height:     `${Math.max(6, (p.avgRate / max) * 70)}px`,
                background: flag && flag.startsWith(p.day) ? C.danger : C.navy,
              }}
            />
            <div className="ata-dow-label">{p.day}</div>
            <div className="ata-dow-pct">{p.avgRate}%</div>
          </div>
        ))}
      </div>
      {flag && <div className="ata-flag-text">⚠ {flag}</div>}
    </div>
  );
}

// ─── Mark-time distribution ───────────────────────────────────────────────────
function MarkTimeChart({ markTimeDistribution }) {
  const { distribution, lateFlags } = markTimeDistribution;
  const max = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="ata-card">
      <div className="ata-card-title">Mark time distribution (IST)</div>
      {distribution.map((d) => (
        <div key={d.bucket} className="ata-hist-row">
          <span className="ata-hist-label">{d.bucket}</span>
          <div className="ata-hist-track">
            <div className="ata-hist-fill" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="ata-hist-count">{d.count}</span>
        </div>
      ))}
      {lateFlags.length > 0 && (
        <div className="ata-flag-text" style={{ marginTop: "10px" }}>
          ⚠ {lateFlags.map((f) => `${f.name} (${f.lateDays}d after 10AM)`).join(" · ")}
        </div>
      )}
    </div>
  );
}

// ─── Ghost attendance panel ───────────────────────────────────────────────────
function GhostPanel({ ghostAttendance }) {
  if (!ghostAttendance.length) {
    return (
      <div className="ata-card">
        <div className="ata-card-title">Ghost attendance</div>
        <p className="ata-empty-text">No present-but-no-entries days this month.</p>
      </div>
    );
  }
  return (
    <div className="ata-card">
      <div className="ata-card-title">Ghost attendance — marked present, zero job cards</div>
      {ghostAttendance.map((g) => (
        <div key={g.technicianId || g.name} className="ata-ghost-row">
          <span className="ata-ghost-name">{g.name}</span>
          <span className="ata-ghost-dates">
            {g.dates.map(fmtDate).join(", ")} — {g.ghostDays}{" "}
            {g.ghostDays === 1 ? "day" : "days"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Technician table ─────────────────────────────────────────────────────────
function TechnicianTable({ technicians }) {
  return (
    <div className="ata-card" style={{ padding: 0 }}>
      <div className="ata-card-title" style={{ padding: "16px 16px 0" }}>
        Technician breakdown · sorted by rate
      </div>
      <div className="ata-table-scroll">
        <table className="ata-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Days</th>
              <th>Rate</th>
              <th>Avg Mark</th>
              <th>Ghost</th>
              <th>Sun</th>
              <th>Consistency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {technicians.map((t) => (
              <tr key={t.id}>
                <td>
                  <div className="ata-tech-name">{t.name}</div>
                  <div className="ata-tech-id">{t.technicianId || "—"}</div>
                </td>
                <td className="ata-dim">{t.technicianType || "—"}</td>
                <td>{t.daysPresent}/{t.workingDays}</td>
                <td style={{ fontWeight: 700 }}>{t.rate}%</td>
                <td className="ata-dim">{t.avgMarkTime || "—"}</td>
                <td>
                  {t.ghostDays > 0
                    ? <span className="ata-badge ata-badge-warn">{t.ghostDays}</span>
                    : <span className="ata-dim">0</span>}
                </td>
                <td className="ata-dim">
                  {t.sundayShifts?.count > 0
                    ? <span className="ata-badge ata-badge-sun">{t.sundayShifts.count}</span>
                    : "—"}
                </td>
                <td className="ata-dim">{t.consistencyScore}%</td>
                <td>
                  <span
                    className="ata-badge"
                    style={{
                      color:      STATUS_COLOR[t.status],
                      background: `${STATUS_COLOR[t.status]}1A`,
                      border:     `1px solid ${STATUS_COLOR[t.status]}55`,
                    }}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Branch-scoped view ────────────────────────────────────────────────────────
function BranchAnalyticsView({ data }) {
  if (data.totalTechnicians === 0) {
    return (
      <div className="ata-card">
        <p className="ata-empty-text">{data.message}</p>
      </div>
    );
  }

  return (
    <>
      <KpiStrip kpis={data.kpis} />

      {data.kpis.sundayShiftsTotal > 0 && (
        <p className="ata-sunday-note">
          {data.kpis.sundayShiftsTotal} optional Sunday shift
          {data.kpis.sundayShiftsTotal !== 1 ? "s" : ""} logged this month
          — not counted in attendance rate
        </p>
      )}

      <div className="ata-grid-2">
        <DailyTrendChart dailyTrend={data.dailyTrend} />
        <DayOfWeekChart dayOfWeekPattern={data.dayOfWeekPattern} />
      </div>
      <div className="ata-grid-2">
        <GhostPanel ghostAttendance={data.ghostAttendance} />
        <MarkTimeChart markTimeDistribution={data.markTimeDistribution} />
      </div>
      <TechnicianTable technicians={data.technicians} />
    </>
  );
}

// ─── Superadmin cross-branch view ─────────────────────────────────────────────
function SuperadminAnalyticsView({ data, onDrillBranch }) {
  return (
    <>
      {/* Partial-data warning — shown when one or more branches failed server-side */}
      {data.partialDataWarning && (
        <div className="ata-card" style={{ borderLeft: `3px solid ${C.amber}` }}>
          <p style={{ color: C.amber, fontWeight: 600, margin: 0, fontSize: "12px" }}>
            ⚠ {data.partialDataWarning}
          </p>
        </div>
      )}

      <div className="ata-card">
        <div className="ata-card-title">Branch overview — {monthLabel()}</div>
        <div className="ata-branch-cards">
          {data.branches.map((b) => (
            <button
              key={b.branch}
              className="ata-branch-card"
              onClick={() => onDrillBranch(b.branch)}
            >
              <div className="ata-branch-rank">Rank #{b.rank}</div>
              <div className="ata-branch-name">{b.branch}</div>
              <div
                className="ata-branch-rate"
                style={{ color: heatColor(b.attendanceRate) }}
              >
                {b.attendanceRate}%
              </div>
              <div className="ata-branch-meta">
                Prod. {b.productiveScore}% · Ghost {b.ghostRate}%
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="ata-card">
        <div className="ata-card-title">Attendance heatmap</div>
        <div className="ata-heatmap-scroll">
          <div className="ata-heatmap">
            {data.heatmap.map((row) => (
              <div key={row.branch} className="ata-heatmap-row">
                <div className="ata-heatmap-label">{row.branch}</div>
                {row.days.map((d) => (
                  <div
                    key={d.date}
                    className="ata-heatmap-cell"
                    style={{ background: heatColor(d.rate) }}
                    title={`${fmtDate(d.date)} · ${d.rate}%`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="ata-legend" style={{ marginTop: "10px" }}>
          <span><i style={{ background: "#16A34A" }} /> ≥90%</span>
          <span><i style={{ background: "#1E3A8A" }} /> 80–89%</span>
          <span><i style={{ background: "#D97706" }} /> 70–79%</span>
          <span><i style={{ background: "#DC2626" }} /> &lt;70%</span>
        </div>
      </div>

      <div className="ata-card">
        <div className="ata-card-title">Synchronous dip detection</div>
        {data.synchronousDips.length === 0 ? (
          <p className="ata-empty-text">
            No simultaneous multi-branch dips detected this month.
          </p>
        ) : (
          data.synchronousDips.map((dip) => (
            <div key={dip.date} className="ata-dip-row">
              <div className="ata-dip-date">{fmtDate(dip.date)}</div>
              <div>
                <div className="ata-dip-branches">{dip.branches.join(" · ")}</div>
                <div className="ata-dip-class">{dip.classification}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AttendanceAnalytics() {
  const { user }     = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";

  const [branchFilter, setBranchFilter] = useState(null);
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  // ── CRASH FIX ────────────────────────────────────────────────────────────────
  // Problem: when branchFilter changes, React re-renders *before* the useEffect
  // re-runs fetchData. In that window, isAllBranchesView flips but `data` still
  // holds the old shape — BranchAnalyticsView receives superadmin-shaped data
  // (no kpis) and crashes, or vice versa.
  //
  // Fix: batch setData(null) + setLoading(true) with the filter change in a
  // single synchronous call. React 18 automatic batching collapses all three
  // setState calls into one re-render where data=null and loading=true, so the
  // component renders the loading spinner instead of trying to render stale data.
  const changeBranchFilter = useCallback((branch) => {
    setData(null);
    setLoading(true);
    setBranchFilter(branch);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(null);
    setError("");
    try {
      const params = new URLSearchParams();
      if (isSuperAdmin && branchFilter) params.set("branch", branchFilter);
      const res = await api.get(`/api/admin/analytics/attendance?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "Access denied: you do not have permission to view this data."
          : "Failed to load attendance Analytics. Please try Again."
      );
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, branchFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Superadmin with no filter = all-branches view; everyone else = branch view
  const isAllBranchesView = isSuperAdmin && !branchFilter;

  // Shape guard: only render a view when data matches the expected shape.
  // This is a defense-in-depth layer; changeBranchFilter prevents the race
  // condition, but this ensures a stale-shape data object is never passed
  // to a component that would crash on it.
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div
            style={{
              width:        "28px",
              height:       "28px",
              border:       `2px solid ${C.border}`,
              borderTop:    `2px solid ${C.navy}`,
              borderRadius: "50%",
              margin:       "0 auto 16px",
              animation:    "ata-spin 0.8s linear infinite",
            }}
          />
          <p
            style={{
              fontSize:      "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight:    700,
              color:         C.dim,
            }}
          >
            Loading analytics…
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="ata-card" style={{ borderLeft: `3px solid ${C.danger}` }}>
          <p style={{ color: C.danger, fontWeight: 600, margin: 0 }}>{error}</p>
        </div>
      );
    }

    if (!data) return null;

    if (isAllBranchesView && data.scope === "all") {
      return (
        <SuperadminAnalyticsView
          data={data}
          onDrillBranch={changeBranchFilter}
        />
      );
    }

    if (!isAllBranchesView && data.scope === "branch") {
      return <BranchAnalyticsView data={data} />;
    }

    // Shape mismatch — data is loading/transitioning; render nothing
    return null;
  };

  return (
    <div
      style={{
        minHeight:  "100dvh",
        background: C.pageBg,
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      }}
    >
      <Navbar />
      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* ── Page header ── */}
        <div
          style={{
            marginBottom:  "20px",
            paddingBottom: "16px",
            borderBottom:  `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize:      "9px",
              fontWeight:    700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         C.navy,
              marginBottom:  "4px",
            }}
          >
            {!isSuperAdmin ? `${user?.branch} · ` : ""}Attendance Analytics
          </div>
          <h1
            style={{
              fontFamily:    "'Barlow Condensed', sans-serif",
              fontSize:      "clamp(24px,6vw,36px)",
              fontWeight:    700,
              color:         C.ink,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              margin:        0,
              lineHeight:    1,
            }}
          >
            {monthLabel()}
          </h1>
          <p style={{ fontSize: "11px", color: C.dim, margin: "8px 0 0" }}>
            Current month only · data resets when monthly cleanup runs
          </p>
        </div>

        {/* ── Branch pill strip (superadmin only) ── */}
        {isSuperAdmin && (
          <div className="ata-branch-strip">
            <button
              className={`ata-branch-pill${!branchFilter ? " active" : ""}`}
              onClick={() => changeBranchFilter(null)}
            >
              All Branches
            </button>
            {BRANCHES.map((b) => (
              <button
                key={b}
                className={`ata-branch-pill${branchFilter === b ? " active" : ""}`}
                onClick={() => changeBranchFilter(b)}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {renderContent()}
      </div>
    </div>
  );
}
