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

// [FIX-HEATMAP] Red threshold moved from 70% → 60%.
// Updated in backend heatBand() too — both sides must stay in sync.
// Legend labels updated below to match.
const heatColor = (rate) => {
  if (rate >= 90) return "#16A34A"; // green   — excellent
  if (rate >= 75) return "#1E3A8A"; // navy    — good
  if (rate >= 60) return "#D97706"; // amber   — at risk
  return "#DC2626";                 // red     — below 60%
};

const monthLabel = () =>
  new Date()
    .toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    .toUpperCase();

const fmtDate = (iso) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
};

// ─── CSV helpers ───────────────────────────────────────────────────────────────
// Mirrors the escapeCsvField / buildCsv pattern from VehicleAnalytics —
// one convention for CSV output across the whole app.
const escapeCsv = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Columns exported:
//   Name | ID | Type | Days Present | Working Days (MTD) | Attendance Rate %
//   Ghost Days | Before 8AM | 8–9 AM | 9–10 AM | After 10AM
//   Avg Mark Time | Sunday Shifts | Consistency % | Status
//
// markBuckets come from the backend (added in this version of the controller).
// If a row lacks markBuckets (e.g. old cached response), each bucket falls back
// to 0 safely via the ?? operator — no crash, just empty columns.
const buildAttendanceCsv = (rows) => {
  const headers = [
    "Name", "Technician ID", "Type",
    "Days Present", "Working Days (MTD)", "Attendance Rate %",
    "Ghost Days",
    "Before 8AM", "8–9 AM", "9–10 AM", "After 10AM",
    "Avg Mark Time", "Sunday Shifts", "Consistency %", "Status",
  ];
  const lines = [headers.join(",")];
  for (const t of rows) {
    lines.push([
      escapeCsv(t.name),
      escapeCsv(t.technicianId   || ""),
      escapeCsv(t.technicianType || ""),
      escapeCsv(t.daysPresent),
      escapeCsv(t.workingDays),
      escapeCsv(t.rate),
      escapeCsv(t.ghostDays),
      escapeCsv(t.markBuckets?.before8 ?? 0),
      escapeCsv(t.markBuckets?.am8to9  ?? 0),
      escapeCsv(t.markBuckets?.am9to10 ?? 0),
      escapeCsv(t.markBuckets?.after10 ?? 0),
      escapeCsv(t.avgMarkTime          || ""),
      escapeCsv(t.sundayShifts?.count  ?? 0),
      escapeCsv(t.consistencyScore),
      escapeCsv(t.status),
    ].join(","));
  }
  return lines.join("\r\n");
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
// [FIX-HEATMAP] Danger threshold updated from 70 → 60 to match heatColor.
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
          const fill = d.rate < 60 ? C.danger : C.navy; // [FIX-HEATMAP] was < 70
          return (
            <g key={d.date}>
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={fill} rx="1" opacity={d.rate < 60 ? 1 : 0.85}
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
        <span><i style={{ background: C.danger }} /> below 60%</span>{/* [FIX-HEATMAP] was 70% */}
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
// [FIX-MARKTIME] Complete redesign.
//
// Before: lateFlags was rendered as a single .join(" · ") string — dumped
//         into a <div> as a paragraph. With 20+ names it became unreadable.
//
// After:  Distribution bars are color-coded per bucket severity.
//         Percentage labels added alongside counts.
//         Late flags rendered as a proper striped row list — one row per
//         technician, name left-aligned, badge right-aligned. Scannable
//         at a glance even with 30+ entries.
//
// LATE_FLAG_THRESHOLD = 3 (matches backend constant — must stay in sync
// if the backend constant ever changes).
const LATE_FLAG_THRESHOLD_DISPLAY = 3;

const BUCKET_META = {
  "Before 8AM": { color: "#16A34A", label: "Early"     },
  "8–9 AM":     { color: "#1E3A8A", label: "On time"   },
  "9–10 AM":    { color: "#D97706", label: "Late"       },
  "After 10AM": { color: "#DC2626", label: "Very late"  },
};

function MarkTimeChart({ markTimeDistribution }) {
  const { distribution, lateFlags } = markTimeDistribution;
  const max   = Math.max(...distribution.map((d) => d.count), 1);
  const total = distribution.reduce((s, d) => s + d.count, 0);

  return (
    <div className="ata-card">
      <div className="ata-card-title">Mark time distribution (IST)</div>

      {/* ── Distribution bars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: lateFlags.length ? "16px" : 0 }}>
        {distribution.map((d) => {
          const meta = BUCKET_META[d.bucket] || { color: C.navy, label: "" };
          const pct  = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={d.bucket} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Bucket label — fixed width so bars all start at the same X */}
              <span style={{
                fontSize: "11px", fontWeight: 600, color: C.mid,
                fontFamily: "'IBM Plex Sans', sans-serif",
                width: "78px", flexShrink: 0, textAlign: "right",
                letterSpacing: "0.01em",
              }}>
                {d.bucket}
              </span>

              {/* Bar track */}
              <div style={{
                flex: 1, height: "16px", background: C.borderL, position: "relative",
                border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${(d.count / max) * 100}%`,
                  background: meta.color,
                  opacity: 0.85,
                  transition: "width 0.4s ease",
                }} />
              </div>

              {/* Count */}
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px", fontWeight: 700,
                color: meta.color, width: "28px", textAlign: "right",
                flexShrink: 0,
              }}>
                {d.count}
              </span>

              {/* Percentage */}
              <span style={{
                fontSize: "10px", color: C.dim,
                width: "34px", flexShrink: 0,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Late flags table ── */}
      {lateFlags.length > 0 && (
        <>
          {/* Divider */}
          <div style={{ height: "1px", background: C.border, margin: "4px 0 12px" }} />

          <div style={{
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", color: C.amber, marginBottom: "8px",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            ⚠ After-10AM flags — marked late on ≥{LATE_FLAG_THRESHOLD_DISPLAY} days
          </div>

          {/* Striped rows — name | late-days badge */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {lateFlags.map((f, i) => (
              <div
                key={f.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  background: i % 2 === 0 ? C.cardAlt : C.card,
                  border: `1px solid ${C.borderL}`,
                }}
              >
                <span style={{
                  fontSize: "12px", color: C.mid,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 500,
                }}>
                  {f.name}
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px", fontWeight: 700,
                  color: "#92400E",
                  background: "#FEF3C7",
                  border: "1px solid #FCD34D",
                  padding: "2px 8px",
                  whiteSpace: "nowrap",
                }}>
                  {f.lateDays}d
                </span>
              </div>
            ))}
          </div>
        </>
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
// [FIX-SORT] Title updated to "sorted by consistency" — matches backend sort.
// [FIX-DAYS] Days column shows fraction + mini colour bar so rate is
//            visible without reading the Rate % column separately.
function TechnicianTable({ technicians }) {
  return (
    <div className="ata-card" style={{ padding: 0 }}>
      <div className="ata-card-title" style={{ padding: "16px 16px 0" }}>
        Technician breakdown · sorted by consistency
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
            {technicians.map((t) => {
              // Mini bar colour mirrors the heatColor thresholds
              const barColor = t.rate >= 75 ? C.success : t.rate >= 60 ? C.amber : C.danger;
              const barPct   = t.workingDays > 0
                ? Math.round((t.daysPresent / t.workingDays) * 100)
                : 0;

              return (
                <tr key={t.id}>
                  <td>
                    <div className="ata-tech-name">{t.name}</div>
                    <div className="ata-tech-id">{t.technicianId || "—"}</div>
                  </td>
                  <td className="ata-dim">{t.technicianType || "—"}</td>

                  {/* [FIX-DAYS] Fraction + mini progress bar */}
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "12px", fontWeight: 700, color: C.ink,
                        whiteSpace: "nowrap",
                      }}>
                        {t.daysPresent}
                        <span style={{ color: C.dim, fontWeight: 400 }}>/{t.workingDays}</span>
                      </span>
                      {/* Mini bar — 48 px wide, 3 px tall */}
                      <div style={{ width: "48px", height: "3px", background: C.borderL }}>
                        <div style={{
                          height: "100%", width: `${barPct}%`,
                          background: barColor,
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                    </div>
                  </td>

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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Branch-scoped view ───────────────────────────────────────────────────────
// [NEW-EXPORT] Export button added to the top-right header area.
// State is local to BranchAnalyticsView — the export is a self-contained
// action and doesn't need to bubble up to the page-level component.
//
// Export endpoint: GET /api/admin/analytics/attendance/export?branch=<BRANCH>
// Response:  { branch, month, workingDaysSoFar, technicians[], totalCount }
// CSV built client-side from response — consistent with exportTechnicianData
// and exportVehicleLogs conventions in this codebase.
//
// exportError  → hard failure (network / 500), shown in red
// exportNotice → soft info (empty branch), shown in amber
// Both clear on the next export attempt.
function BranchAnalyticsView({ data }) {
  const [exporting,     setExporting]     = useState(false);
  const [exportError,   setExportError]   = useState("");
  const [exportNotice,  setExportNotice]  = useState("");

  const handleExportCSV = async () => {
    setExporting(true);
    setExportError("");
    setExportNotice("");

    try {
      const res = await api.get("/api/admin/analytics/attendance/export", {
        params: { branch: data.branch },
      });
      const { technicians, branch, month } = res.data;

      if (!technicians.length) {
        setExportNotice("No technician data found for this month.");
        return;
      }

      const csv     = buildAttendanceCsv(technicians);
      const blobUrl = window.URL.createObjectURL(
        new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      );
      const link = document.createElement("a");
      link.href     = blobUrl;
      link.download = `attendance_${branch}_${month}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

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
          {data.kpis.sundayShiftsTotal} Optional Sunday shift
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

      {/* ── Technician table + export ── */}
      <div className="ata-card" style={{ padding: 0 }}>
        {/* Card header row — title left, export button right */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 16px 0", flexWrap: "wrap", gap: "10px",
        }}>
          <div style={{
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em",
            textTransform: "uppercase", color: C.muted,
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}>
            Technician breakdown · sorted by consistency
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {exportError  && <span style={{ fontSize: "10px", fontWeight: 600, color: C.danger }}>{exportError}</span>}
            {exportNotice && <span style={{ fontSize: "10px", fontWeight: 600, color: C.amber }}>{exportNotice}</span>}

            <button
              onClick={handleExportCSV}
              disabled={exporting}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                height: "32px", padding: "0 14px",
                background: "transparent", border: `1px solid ${C.navy}`,
                color: C.navy,
                fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "'IBM Plex Sans', sans-serif",
                cursor: exporting ? "not-allowed" : "pointer",
                opacity: exporting ? 0.55 : 1,
                transition: "background 0.15s, color 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
              onMouseEnter={(e) => {
                if (!exporting) {
                  e.currentTarget.style.background = C.navy;
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.navy;
              }}
              title={`Download ${data.branch} attendance — current month, as CSV`}
            >
              {exporting ? (
                <span style={{
                  width: "10px", height: "10px",
                  border: `1.5px solid currentColor`,
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "ata-spin 0.7s linear infinite",
                  flexShrink: 0,
                  display: "inline-block",
                }} />
              ) : (
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5v8.2M8 9.7L4.6 6.3M8 9.7l3.4-3.4M2.5 12v1.2A1.8 1.8 0 0 0 4.3 15h7.4a1.8 1.8 0 0 0 1.8-1.8V12"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {exporting ? "Preparing…" : "Export CSV · This Month"}
            </button>
          </div>
        </div>

        {/* Table — rendered directly here instead of TechnicianTable sub-component
            so the header and table share the same ata-card container without
            double-padding. TechnicianTable still used where there's no export btn. */}
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
              {data.technicians.map((t) => {
                const barColor = t.rate >= 75 ? C.success : t.rate >= 60 ? C.amber : C.danger;
                const barPct   = t.workingDays > 0
                  ? Math.round((t.daysPresent / t.workingDays) * 100)
                  : 0;

                return (
                  <tr key={t.id}>
                    <td>
                      <div className="ata-tech-name">{t.name}</div>
                      <div className="ata-tech-id">{t.technicianId || "—"}</div>
                    </td>
                    <td className="ata-dim">{t.technicianType || "—"}</td>

                    {/* [FIX-DAYS] Fraction + mini bar */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "12px", fontWeight: 700, color: C.ink,
                          whiteSpace: "nowrap",
                        }}>
                          {t.daysPresent}
                          <span style={{ color: C.dim, fontWeight: 400 }}>/{t.workingDays}</span>
                        </span>
                        <div style={{ width: "48px", height: "3px", background: C.borderL }}>
                          <div style={{
                            height: "100%", width: `${barPct}%`,
                            background: barColor,
                            transition: "width 0.4s ease",
                          }} />
                        </div>
                      </div>
                    </td>

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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Superadmin cross-branch view ─────────────────────────────────────────────
function SuperadminAnalyticsView({ data, onDrillBranch }) {
  return (
    <>
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
              <div className="ata-branch-rate" style={{ color: heatColor(b.attendanceRate) }}>
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
        {/* [FIX-HEATMAP] Legend updated to reflect new thresholds */}
        <div className="ata-legend" style={{ marginTop: "10px" }}>
          <span><i style={{ background: "#16A34A" }} /> ≥90%</span>
          <span><i style={{ background: "#1E3A8A" }} /> 75–89%</span>
          <span><i style={{ background: "#D97706" }} /> 60–74%</span>
          <span><i style={{ background: "#DC2626" }} /> &lt;60%</span>
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

  // Batch all three state updates to avoid a render window where data shape
  // mismatches the view — React 18 automatic batching collapses them to one.
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
          : "Failed to load attendance analytics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, branchFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isAllBranchesView = isSuperAdmin && !branchFilter;

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{
            width: "28px", height: "28px",
            border: `2px solid ${C.border}`,
            borderTop: `2px solid ${C.navy}`,
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "ata-spin 0.8s linear infinite",
          }} />
          <p style={{
            fontSize: "10px", letterSpacing: "0.18em",
            textTransform: "uppercase", fontWeight: 700, color: C.dim,
          }}>
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
      return <SuperadminAnalyticsView data={data} onDrillBranch={changeBranchFilter} />;
    }

    if (!isAllBranchesView && data.scope === "branch") {
      return <BranchAnalyticsView data={data} />;
    }

    // Shape mismatch — transitioning; render nothing (loading was already cleared)
    return null;
  };

  return (
    <div style={{
      minHeight: "100dvh", background: C.pageBg,
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
    }}>
      <Navbar />
      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em",
            textTransform: "uppercase", color: C.navy, marginBottom: "4px",
          }}>
            {!isSuperAdmin ? `${user?.branch} · ` : ""}Attendance Analytics
          </div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "clamp(24px,6vw,36px)", fontWeight: 700,
            color: C.ink, letterSpacing: "0.04em",
            textTransform: "uppercase", margin: 0, lineHeight: 1,
          }}>
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

        {renderContent()}
      </div>
    </div>
  );
}