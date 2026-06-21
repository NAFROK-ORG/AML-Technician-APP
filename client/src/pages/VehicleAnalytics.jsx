import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";
import { BRANCHES } from "../utils/constants";

/* ─── Design tokens — same palette as AdminAnalytics ─────────────── */
const C = {
  pageBg: "#EEF2F7", card: "#FFFFFF", cardAlt: "#F8FAFC",
  border: "#DDE3EE", navy: "#1E3A8A", ink: "#0A1628", mid: "#374151",
  muted: "#6B7A99", dim: "#94A3B8", success: "#16A34A",
  danger: "#DC2626", amber: "#D97706", ibmBlue: "#0f62fe",
};

const rateColor = (rate) => (rate >= 80 ? "#3B6D11" : rate >= 60 ? "#BA7517" : "#A32D2D");
const responseColor = (mins) => {
  if (mins == null) return C.muted;
  if (mins < 30) return "#3B6D11";
  if (mins <= 60) return "#BA7517";
  return "#A32D2D";
};
const fmtMin = (mins) => (mins == null ? "—" : `${mins}m`);
const fmtTrendDate = (dateStr, range) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00Z");
  if (range === "week") return d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
  return String(d.getUTCDate());
};

/* ─── Injected styles ──────────────────────────────────────────────
   KPI grid uses a real `gap` + per-card border instead of the
   background-through-gap trick — that trick is what produced the
   stray colored cells in AdminAnalytics when card count didn't divide
   evenly into the column count. Real borders mean an incomplete last
   row just looks like a shorter row, at any card count, any breakpoint.
─────────────────────────────────────────────────────────────────── */
const VA_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes vaFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }

  .va-a1 { animation: vaFadeUp 0.3s ease both 0.00s; }
  .va-a2 { animation: vaFadeUp 0.3s ease both 0.06s; }
  .va-a3 { animation: vaFadeUp 0.3s ease both 0.12s; }
  .va-a4 { animation: vaFadeUp 0.3s ease both 0.18s; }
  .va-a5 { animation: vaFadeUp 0.3s ease both 0.24s; }

  .va-kpi-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .va-range-tabs { display: flex; border: 1px solid #DDE3EE; overflow: hidden; }
  .va-range-tab {
    flex: 1;
    padding: 9px 16px;
    background: #F8FAFC;
    border: none;
    border-right: 1px solid #DDE3EE;
    color: #6B7A99;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .va-range-tab:last-child { border-right: none; }
  .va-range-tab:hover:not(.active) { background: #EEF2F7; color: #1E3A8A; }
  .va-range-tab.active { background: #1E3A8A; color: #FFFFFF; }

  .va-filter-select {
    height: 36px;
    padding: 0 32px 0 10px;
    background: #F8FAFC;
    border: 1px solid #DDE3EE;
    color: #0A1628;
    font-size: 12px;
    font-weight: 500;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231E3A8A' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-color: #F8FAFC;
    transition: border-color 0.15s;
    border-radius: 0;
  }
  .va-filter-select:focus { border-color: #1E3A8A; }
  .va-filter-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #6B7A99;
    font-family: 'IBM Plex Sans', sans-serif;
    margin-right: 4px;
    flex-shrink: 0;
  }

  .va-chart-h260 { height: 260px; }
  .va-chart-h220 { height: 220px; }
  .va-chart-h160 { height: 160px; }

  .va-row-equal { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

  .va-table { width: 100%; border-collapse: collapse; }
  .va-table th {
    padding: 8px 12px;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #94A3B8;
    border-bottom: 1px solid #DDE3EE;
    font-family: 'IBM Plex Sans', sans-serif;
    background: #F8FAFC;
    white-space: nowrap;
  }
  .va-table td {
    padding: 11px 12px;
    border-bottom: 1px solid #F1F5F9;
    font-size: 12px;
    color: #374151;
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .va-table tbody tr:last-child td { border-bottom: none; }
  .va-table tbody tr:hover td { background: #F8FAFC; }

  .va-insight-strip {
    background: #F8FAFC;
    border: 1px solid #DDE3EE;
    border-left: 3px solid #1E3A8A;
    padding: 10px 16px;
    margin-bottom: 24px;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12px;
    color: #374151;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .va-insight-pill {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    padding: 3px 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    color: #0A1628;
    letter-spacing: 0.03em;
  }
  .va-insight-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #94A3B8;
    margin-right: 2px;
  }

  .va-footer-note {
    margin-top: 28px;
    padding: 14px 18px;
    border: 1px solid #DDE3EE;
    border-left: 3px solid #94A3B8;
    background: #F8FAFC;
    font-size: 11px;
    color: #6B7A99;
    font-family: 'IBM Plex Sans', sans-serif;
    font-style: italic;
    line-height: 1.5;
  }

  .va-empty {
    text-align: center;
    padding: 40px 0;
    color: #94A3B8;
    font-size: 13px;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  @media (max-width: 960px) {
    .va-row-equal { grid-template-columns: 1fr; }
    .va-kpi-grid { grid-template-columns: repeat(3, 1fr); }
  }

  @media (max-width: 640px) {
    .va-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .va-chart-h260 { height: 200px; }
    .va-chart-h220 { height: 170px; }
    .va-chart-h160 { height: 130px; }
    .va-range-tab { padding: 8px 10px; font-size: 9px; }
    .va-insight-strip { flex-direction: column; align-items: flex-start; }
  }

  @media (max-width: 420px) {
    .va-chart-h260 { height: 175px; }
    .va-chart-h220 { height: 150px; }
    .va-chart-h160 { height: 115px; }
  }
`;

const VaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.navy}`,
      padding: "10px 14px", fontFamily: "'IBM Plex Sans', sans-serif",
      boxShadow: "0 4px 16px rgba(10,22,40,0.08)",
    }}>
      <p style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, margin: "0 0 6px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: "12px", color: C.mid, margin: "3px 0", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", background: p.color, flexShrink: 0 }} />
          {p.name}:{" "}
          <strong style={{ color: C.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px" }}>
            {p.value?.toLocaleString("en-IN")}
          </strong>
        </p>
      ))}
    </div>
  );
};

const KpiCard = ({ label, value, sub, accent = C.navy, subColor }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${accent}`,
    padding: "18px 16px 14px", display: "flex", flexDirection: "column",
  }}>
    <div style={{ fontSize: "8px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: "10px", fontFamily: "'IBM Plex Sans', sans-serif" }}>{label}</div>
    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "30px", fontWeight: "700", color: C.ink, lineHeight: 1, marginBottom: "4px" }}>{value}</div>
    {sub && <div style={{ fontSize: "9px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: subColor || C.dim }}>{sub}</div>}
  </div>
);

const ChartCard = ({ title, children, style = {}, action, className = "" }) => (
  <div className={className} style={{ background: C.card, border: `1px solid ${C.border}`, padding: "20px 20px 16px", ...style }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "3px", height: "14px", background: C.navy, flexShrink: 0 }} />
        <span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>{title}</span>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const SplitBar = ({ assigned, total }) => {
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "140px" }}>
      <div style={{ flex: 1, height: "5px", background: C.border, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: C.ibmBlue, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: C.ibmBlue, fontWeight: "600", minWidth: "16px" }}>{assigned}</span>
      <span style={{ fontSize: "10px", color: C.dim }}>/ {total - assigned}</span>
    </div>
  );
};

const AXIS_TICK = { fill: C.muted, fontSize: 10, fontFamily: "'IBM Plex Sans', sans-serif" };
const CHART_GRID = { strokeDasharray: "3 3", stroke: C.border };

export default function VehicleAnalytics() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const isBranchAdmin = user?.role === "admin";

  const [range, setRange] = useState("today");
  const [branch, setBranch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const abortRef = useRef(null);

  useEffect(() => {
    const id = "va-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = VA_STYLES;
      document.head.appendChild(el);
    }
    return () => { const el = document.getElementById(id); if (el) document.head.removeChild(el); };
  }, []);

  const fetchAnalytics = useCallback(async (r, b, silent = false) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    if (!silent) { setLoading(true); setError(""); }
    try {
      const params = { range: r };
      if (isSuperAdmin && b) params.branch = b;
      const res = await api.get("/api/admin/analytics/vehicle", { params, signal: abortRef.current.signal });
      setData(res.data);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      if (!silent) setError("Failed to load analytics. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => { fetchAnalytics(range, branch); }, [range, branch, fetchAnalytics]);

  // Live polling — "today" only, paused when the tab is hidden.
  // Mirrors VehicleLogBoard's exact pattern; week/month are report-style
  // views where re-fetching without user action isn't worth the request.
  useEffect(() => {
    if (range !== "today") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchAnalytics(range, branch, true);
    }, 30000);
    return () => clearInterval(id);
  }, [range, branch, fetchAnalytics]);

  const s = data?.summary;
  const opHours = data?.peakHours?.filter((h) => h.hour >= 6 && h.hour <= 20) || [];
  const peakHour = opHours.length > 0
    ? opHours.reduce((max, h) => (h.count > max.count ? h : max), { count: 0, label: "—" })
    : { count: 0, label: "—" };
  const peakDay = data?.peakDays?.reduce((max, d) => (d.count > max.count ? d : max), { count: 0, dayName: "—" });
  const fastPct = s?.assigned > 0 ? Math.round((data.responseDist.fast / s.assigned) * 100) : 0;
  const bestBranch = data?.byBranch?.filter((b) => b.logged > 0).sort((a, b) => b.assignmentRate - a.assignmentRate)[0];
  const distData = data ? [
    { name: "Fast", label: "< 30 min", value: data.responseDist.fast, fill: "#3B6D11" },
    { name: "Normal", label: "30–60 min", value: data.responseDist.normal, fill: "#BA7517" },
    { name: "Slow", label: "> 60 min", value: data.responseDist.slow, fill: "#A32D2D" },
  ] : [];
  const rangeLabelMap = { today: "Today", week: "This Week", month: "This Month" };

  return (
    <div style={{ minHeight: "100dvh", background: C.pageBg, fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <Navbar />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 16px 80px" }}>

        <div className="va-a1" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px", paddingBottom: "24px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.22em", textTransform: "uppercase", color: C.navy, marginBottom: "6px" }}>
              {isSuperAdmin ? "Super Admin" : "Branch Admin"} · Vehicle Ops
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "36px", fontWeight: "700", color: C.ink, letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 6px", lineHeight: 1 }}>
              {isBranchAdmin ? `${user?.branch || ""} Vehicle Ops` : "Vehicle Operations"}
            </h1>
            <p style={{ fontSize: "13px", color: C.muted, margin: 0, fontWeight: "300", fontStyle: "italic" }}>
              Gate intake · assignment rate · response time · AML Motors
            </p>
          </div>
          <div className="va-range-tabs">
            {["today", "week", "month"].map((r) => (
              <button key={r} className={`va-range-tab${range === r ? " active" : ""}`} onClick={() => setRange(r)}>
                {rangeLabelMap[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="va-a2" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.navy}`, padding: "12px 18px" }}>
          {isSuperAdmin && (
            <>
              <span className="va-filter-label">Branch</span>
              <select className="va-filter-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="">All Branches</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </>
          )}
          {isBranchAdmin && (
            <>
              <span className="va-filter-label">Branch</span>
              <div style={{ height: "36px", display: "inline-flex", alignItems: "center", gap: "8px", background: C.cardAlt, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.navy}`, padding: "0 14px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.navy }} />
                <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", color: C.navy, fontFamily: "'IBM Plex Sans', sans-serif" }}>{user?.branch || "—"}</span>
              </div>
            </>
          )}
          {!loading && data && (
            <span style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: C.dim, letterSpacing: "0.04em" }}>
              {rangeLabelMap[range]}{isBranchAdmin ? ` · ${user?.branch}` : branch ? ` · ${branch}` : " · All Branches"}
            </span>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: "24px", height: "24px", border: `2px solid ${C.border}`, borderTop: `2px solid ${C.navy}`, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
            <p style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: "700", color: C.dim, margin: 0 }}>Loading analytics…</p>
          </div>
        )}

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderLeft: "3px solid #DC2626", padding: "24px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "20px", fontWeight: "700", color: C.danger, letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 6px" }}>Failed to Load</p>
            <p style={{ fontSize: "13px", color: "#991B1B", margin: 0 }}>{error}</p>
            <button onClick={() => fetchAnalytics(range, branch)} style={{ marginTop: "12px", padding: "10px 24px", background: "transparent", border: "1px solid #FECACA", color: C.danger, fontSize: "10px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>Retry</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="va-a3 va-kpi-grid">
              <KpiCard label="Total Logged" value={s.totalLogged.toLocaleString("en-IN")} sub="gate entries" accent={C.navy} />
              <KpiCard label="Assigned" value={s.assigned.toLocaleString("en-IN")} sub="with job card" accent={C.success} />
              <KpiCard label="Unassigned" value={s.unassigned.toLocaleString("en-IN")} sub="no job card" accent={s.unassigned > 0 ? C.amber : C.dim} />
              <KpiCard label="Assignment Rate" value={`${s.assignmentRate}%`} sub={s.assignmentRate >= 80 ? "on target" : s.assignmentRate >= 60 ? "needs attention" : "below target"} accent={rateColor(s.assignmentRate)} subColor={rateColor(s.assignmentRate)} />
              <KpiCard label="Avg Response *" value={fmtMin(s.avgResponseMin)} sub={s.avgResponseMin != null ? `${fmtMin(s.minResponseMin)} – ${fmtMin(s.maxResponseMin)} range` : "no assigned vehicles"} accent={responseColor(s.avgResponseMin)} />
            </div>

            {s.totalLogged > 0 && (
              <div className="va-a3 va-insight-strip">
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: C.navy, fontWeight: 700 }}>
                  {s.assigned} of {s.totalLogged} vehicles assigned
                </span>
                {s.avgResponseMin != null && (
                  <>
                    <span style={{ color: C.dim }}>·</span>
                    <span><span className="va-insight-label">Avg response</span><span className="va-insight-pill" style={{ color: responseColor(s.avgResponseMin) }}>{s.avgResponseMin}m</span></span>
                  </>
                )}
                {fastPct > 0 && (
                  <>
                    <span style={{ color: C.dim }}>·</span>
                    <span><span className="va-insight-label">Fast</span><span className="va-insight-pill" style={{ color: "#3B6D11" }}>{fastPct}%</span></span>
                  </>
                )}
                {bestBranch && isSuperAdmin && (
                  <>
                    <span style={{ color: C.dim }}>·</span>
                    <span><span className="va-insight-label">Best branch</span><span className="va-insight-pill" style={{ color: "#3B6D11" }}>{bestBranch.branch} {bestBranch.assignmentRate}%</span></span>
                  </>
                )}
                {peakHour.count > 0 && (
                  <>
                    <span style={{ color: C.dim }}>·</span>
                    <span><span className="va-insight-label">Peak hour</span><span className="va-insight-pill">{peakHour.label}</span></span>
                  </>
                )}
                {peakDay?.count > 0 && (
                  <>
                    <span style={{ color: C.dim }}>·</span>
                    <span><span className="va-insight-label">Busiest day</span><span className="va-insight-pill">{peakDay.dayName}</span></span>
                  </>
                )}
              </div>
            )}

            <div className="va-a4 va-row-equal" style={{ marginBottom: "20px" }}>
              <ChartCard title="Response Time Distribution">
                {data.responseDist.fast + data.responseDist.normal + data.responseDist.slow === 0 ? (
                  <div className="va-empty">No assigned vehicles in this period</div>
                ) : (
                  <>
                    <div className="va-chart-h160">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid {...CHART_GRID} vertical={false} />
                          <XAxis dataKey="name" tick={AXIS_TICK} />
                          <YAxis tick={AXIS_TICK} allowDecimals={false} width={35} />
                          <Tooltip content={<VaTooltip />} />
                          <Bar dataKey="value" name="Vehicles" radius={[0, 0, 0, 0]}>
                            {distData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "14px", flexWrap: "wrap" }}>
                      {distData.map((d) => (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "8px", height: "8px", background: d.fill, flexShrink: 0 }} />
                          <span style={{ fontSize: "11px", color: C.mid }}>{d.label}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", fontWeight: "600", color: d.fill }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </ChartCard>

              <ChartCard title={range === "today" ? "Today's Snapshot" : "Daily Trend — Logged vs Assigned"}>
                {range === "today" ? (
                  <div style={{ padding: "30px 10px", textAlign: "center" }}>
                    <p style={{ fontSize: "13px", color: C.muted, margin: "0 0 4px" }}>
                      Single-day view — see <strong>Peak Intake by Hour</strong> below for today's timeline.
                    </p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: C.dim, margin: 0 }}>
                      {s.assigned} assigned · {s.unassigned} unassigned · {s.totalLogged} total
                    </p>
                  </div>
                ) : data.trend.every((t) => t.logged === 0) ? (
                  <div className="va-empty">No logs in this period</div>
                ) : (
                  <div className="va-chart-h220">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="loggedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.dim} stopOpacity={0.5} />
                            <stop offset="95%" stopColor={C.dim} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="assignedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.ibmBlue} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={C.ibmBlue} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...CHART_GRID} />
                        <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={(d) => fmtTrendDate(d, range)} interval={range === "month" ? 4 : 0} />
                        <YAxis tick={AXIS_TICK} allowDecimals={false} width={35} />
                        <Tooltip content={<VaTooltip />} labelFormatter={(d) => fmtTrendDate(d, range)} />
                        <Area type="monotone" dataKey="logged" name="Total Logged" stroke={C.dim} strokeWidth={1.5} strokeDasharray="4 3" fill="url(#loggedGrad)" />
                        <Area type="monotone" dataKey="assigned" name="Assigned" stroke={C.ibmBlue} strokeWidth={2.5} fill="url(#assignedGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            <ChartCard className="va-a4" title="Branch Performance" style={{ marginBottom: "20px" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="va-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Branch</th>
                      <th style={{ textAlign: "right" }}>Logged</th>
                      <th style={{ textAlign: "left", minWidth: "160px" }}>Assigned / Unassigned</th>
                      <th style={{ textAlign: "right" }}>Rate %</th>
                      <th style={{ textAlign: "right" }}>Avg Response *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.byBranch].sort((a, b) => b.assignmentRate - a.assignmentRate).map((row) => (
                      <tr key={row.branch}>
                        <td><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", fontWeight: "600", color: row.logged === 0 ? C.dim : C.ink, letterSpacing: "0.04em" }}>{row.branch}</span></td>
                        <td style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", fontWeight: "600", color: row.logged === 0 ? C.dim : C.ink }}>{row.logged}</td>
                        <td>{row.logged > 0 ? <SplitBar assigned={row.assigned} total={row.logged} /> : <span style={{ fontSize: "11px", color: C.dim }}>—</span>}</td>
                        <td style={{ textAlign: "right" }}>{row.logged > 0 ? <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", fontWeight: "700", color: rateColor(row.assignmentRate) }}>{row.assignmentRate}%</span> : <span style={{ color: C.dim }}>—</span>}</td>
                        <td style={{ textAlign: "right" }}><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", fontWeight: "600", color: responseColor(row.avgResponseMin) }}>{fmtMin(row.avgResponseMin)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <div className="va-a5 va-row-equal" style={{ marginBottom: "20px" }}>
              <ChartCard title="Peak Intake — By Hour (6am–8pm)" action={peakHour.count > 0 ? <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: C.dim }}>Peak: {peakHour.label}</span> : null}>
                {opHours.every((h) => h.count === 0) ? (
                  <div className="va-empty">No data</div>
                ) : (
                  <div className="va-chart-h160">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={opHours} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...CHART_GRID} vertical={false} />
                        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fontSize: 9 }} interval={1} />
                        <YAxis tick={AXIS_TICK} allowDecimals={false} width={28} />
                        <Tooltip content={<VaTooltip />} />
                        <Bar dataKey="count" name="Vehicles" radius={[0, 0, 0, 0]}>
                          {opHours.map((h, i) => (
                            <Cell key={i} fill={h.count === peakHour.count && h.count > 0 ? C.navy : C.ibmBlue} fillOpacity={h.count === 0 ? 0.15 : 0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Peak Intake — By Day of Week" action={peakDay?.count > 0 ? <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: C.dim }}>Busiest: {peakDay.dayName}</span> : null}>
                {data.peakDays.every((d) => d.count === 0) ? (
                  <div className="va-empty">No data</div>
                ) : (
                  <div className="va-chart-h160">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.peakDays} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...CHART_GRID} vertical={false} />
                        <XAxis dataKey="dayName" tick={AXIS_TICK} />
                        <YAxis tick={AXIS_TICK} allowDecimals={false} width={28} />
                        <Tooltip content={<VaTooltip />} />
                        <Bar dataKey="count" name="Vehicles" radius={[0, 0, 0, 0]}>
                          {data.peakDays.map((d, i) => (
                            <Cell key={i} fill={d.count === peakDay?.count && d.count > 0 ? C.navy : C.ibmBlue} fillOpacity={d.count === 0 ? 0.15 : 0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="va-a5 va-footer-note">
              * Response time is measured from gate log to first job card entry, for assigned vehicles only.
              Vehicles still awaiting assessment or parts are not counted in this metric.
            </div>
          </>
        )}
      </div>
    </div>
  );
}