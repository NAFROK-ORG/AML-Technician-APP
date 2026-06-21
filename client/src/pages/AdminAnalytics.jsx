import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";
import { BRANCHES } from "../utils/constants";

/* ─── Corporate light tokens ─────────────────────────────────────── */
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
  
};

/* ─── Month presets — computed once at module load ───────────────── */
// Generates: "This Month" + 6 previous months
const MONTH_PRESETS = (() => {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y   = d.getFullYear();
    const m   = d.getMonth(); // 0-indexed
    const mm  = String(m + 1).padStart(2, "0");
    const from = `${y}-${mm}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = i === 0
      ? `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      : `${y}-${mm}-${String(lastDay).padStart(2, "0")}`;
    return {
      label: i === 0
        ? "This Month"
        : d.toLocaleString("en-IN", { month: "long", year: "numeric" }),
      key: `${y}-${mm}`,
      from,
      to,
    };
  });
})();

/* ─── Constants ──────────────────────────────────────────────────── */
const CATEGORY_COLORS = {
  "ENGINE REPAIR":    "#2563EB",
  "GEAR BOX":         "#DC2626",
  "ELECTRICAL":       "#D97706",
  "BODY WORK":        "#16A34A",
  "DIFFERENTIAL":     "#DB2777",
  "TRANSMISSION":     "#7C3AED",
  "AC & COOLING":     "#0891B2",
  "EATS FLUSHING":    "#92400E",
  "GENERAL SERVICE":  "#EA580C",
  "SCHEDULE SERVICE": "#374151",
};

const BRANCH_COLORS = [
  "#2563EB","#16A34A","#D97706","#7C3AED",
  "#0891B2","#EA580C","#DB2777","#15803D","#DC2626","#0E7490",
];

const RANK_COLORS = ["#D97706", "#6B7A99", "#92400E"];

const fmt     = (n) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K`
  : `₹${n}`;
const fmtFull = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

/* ─── Injected styles ────────────────────────────────────────────── */
const INJECTED = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes aaFadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .aa-a1 { animation: aaFadeUp 0.3s ease both 0.00s; }
  .aa-a2 { animation: aaFadeUp 0.3s ease both 0.06s; }
  .aa-a3 { animation: aaFadeUp 0.3s ease both 0.12s; }
  .aa-a4 { animation: aaFadeUp 0.3s ease both 0.18s; }
  .aa-a5 { animation: aaFadeUp 0.3s ease both 0.24s; }

  /* ── Filter inputs ── */
  .aa-filter-input {
    height: 40px;
    padding: 0 12px;
    background: #F8FAFC;
    border: 1px solid #DDE3EE;
    border-radius: 0;
    color: #0A1628;
    font-size: 13px;
    font-weight: 500;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    transition: border-color 0.15s, background 0.15s;
    box-sizing: border-box;
    width: 100%;
  }
  .aa-filter-input:focus { border-color: #1E3A8A; background: #FFFFFF; }

  .aa-filter-select {
    height: 40px;
    padding: 0 36px 0 12px;
    background: #F8FAFC;
    border: 1px solid #DDE3EE;
    border-radius: 0;
    color: #0A1628;
    font-size: 13px;
    font-weight: 500;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231E3A8A' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-color: #F8FAFC;
    transition: border-color 0.15s;
    box-sizing: border-box;
    width: 100%;
  }
  .aa-filter-select:focus { border-color: #1E3A8A; background-color: #FFFFFF; }

  /* ── Buttons ── */
  .aa-export-btn {
    padding: 11px 24px;
    background: #1E3A8A;
    border: none;
    border-radius: 0;
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    transition: background 0.15s;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
  }
  .aa-export-btn:hover:not(:disabled) { background: #1E40AF; }
  .aa-export-btn:disabled { background: #93C5FD; cursor: not-allowed; }

  .aa-clear-btn {
    padding: 0 16px;
    height: 40px;
    background: transparent;
    border: 1px solid #FECACA;
    border-radius: 0;
    color: #DC2626;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
  }
  .aa-clear-btn:hover { background: #FEF2F2; border-color: #DC2626; }

  .aa-retry-btn {
    padding: 10px 24px;
    background: transparent;
    border: 1px solid #FECACA;
    border-radius: 0;
    color: #DC2626;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    margin-top: 12px;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .aa-retry-btn:hover { background: #FEF2F2; }

  /* ── Metric toggle pills ── */
  .aa-metric-pill {
    padding: 5px 11px;
    border: 1px solid #DDE3EE;
    background: #FFFFFF;
    color: #6B7A99;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0;
    white-space: nowrap;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .aa-metric-pill:hover { border-color: #1E3A8A; color: #1E3A8A; }
  .aa-metric-pill.active { background: #1E3A8A; border-color: #1E3A8A; color: #FFFFFF; }

  /* ── Grid layouts ── */
  .aa-kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: #DDE3EE;
    border: 1px solid #DDE3EE;
  }
  .aa-row-2col {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 20px;
  }
  .aa-row-equal {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .aa-metric-pills {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  /* ── Filter bar layout ── */
  .aa-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-end;
  }
  .aa-filter-field {
    display: flex;
    flex-direction: column;
    min-width: 140px;
  }
  .aa-filter-dates {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .aa-filter-date-field {
    display: flex;
    flex-direction: column;
    min-width: 140px;
  }
  .aa-filter-status {
    margin-left: auto;
    align-self: flex-end;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #94A3B8;
    letter-spacing: 0.04em;
    padding-bottom: 2px;
    white-space: nowrap;
  }

  /* ── Chart height wrappers ── */
  .aa-chart-h260 { height: 260px; }
  .aa-chart-h240 { height: 240px; }
.aa-chart-h170 { height: 170px; }
  .aa-chart-h120 { height: 120px; }

  /* ── Table ── */
  .aa-table { width: 100%; border-collapse: collapse; }
  .aa-table th {
    padding: 8px 10px;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #94A3B8;
    border-bottom: 1px solid #DDE3EE;
    white-space: nowrap;
    font-family: 'IBM Plex Sans', sans-serif;
    background: #F8FAFC;
  }
  .aa-table td {
    padding: 10px 10px;
    border-bottom: 1px solid #F1F5F9;
    font-size: 12px;
    color: #374151;
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .aa-table tbody tr:last-child td { border-bottom: none; }
  .aa-table tfoot td {
    padding: 11px 10px;
    border-top: 1px solid #DDE3EE;
    border-bottom: none;
    font-weight: 700;
    color: #0A1628;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    background: #F8FAFC;
  }

  /* ── Responsive — tablet ── */
  @media (max-width: 960px) {
    .aa-row-2col  { grid-template-columns: 1fr !important; }
    .aa-row-equal { grid-template-columns: 1fr !important; }
  }

  /* ── Responsive — mobile ── */
  @media (max-width: 640px) {
    .aa-kpi-grid { grid-template-columns: 1fr 1fr !important; }

    /* Charts shorter on mobile */
  .aa-chart-h260 { height: 200px; }
    .aa-chart-h240 { height: 185px; }
    .aa-chart-h170 { height: 145px; }
    .aa-chart-h120 { height: 100px; }

    /* Filter bar: stack fully */
    .aa-filter-bar { flex-direction: column; gap: 12px; }
    .aa-filter-field { width: 100%; min-width: unset; }
    .aa-filter-dates { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .aa-filter-date-field { min-width: unset; }
    .aa-filter-status { margin-left: 0; width: 100%; text-align: left; padding-bottom: 0; }

    /* Page header */
    .aa-page-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
    .aa-export-btn { width: 100%; text-align: center; }
    .aa-page-title { font-size: 26px !important; }

    /* Metric pills */
    .aa-metric-pill { font-size: 8px; padding: 4px 8px; }
  }

@media (max-width: 420px) {
    .aa-kpi-grid { grid-template-columns: 1fr 1fr !important; }
    .aa-filter-dates { grid-template-columns: 1fr; }
  .aa-chart-h260 { height: 175px; }
    .aa-chart-h240 { height: 165px; }
    .aa-chart-h170 { height: 130px; }
    .aa-chart-h120 { height: 85px; }
  }
`;

/* ─── Light chart tooltip ─────────────────────────────────────────── */
const LightTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${C.navy}`,
      padding: "10px 14px",
      fontFamily: "'IBM Plex Sans', sans-serif",
      boxShadow: "0 4px 16px rgba(10,22,40,0.08)",
    }}>
      <p style={{
        fontSize: "9px", fontWeight: "700", letterSpacing: "0.16em",
        textTransform: "uppercase", color: C.muted, marginBottom: "6px", margin: "0 0 6px",
      }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{
          fontSize: "12px", color: C.mid, margin: "3px 0",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <span style={{
            display: "inline-block", width: "8px", height: "8px",
            background: p.color, flexShrink: 0,
          }} />
          {p.name}:{" "}
          <strong style={{
            color: C.ink,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "12px",
          }}>
            {(p.name?.toLowerCase().includes("labour") || p.name?.toLowerCase().includes("incentive"))
              ? fmtFull(p.value)
              : p.value?.toLocaleString("en-IN")}
          </strong>
        </p>
      ))}
    </div>
  );
};

/* ─── KPI Card ───────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, accent = C.navy }) => (
  <div style={{
    background: C.card,
    padding: "20px 18px 16px",
    display: "flex",
    flexDirection: "column",
    borderLeft: `3px solid ${accent}`,
  }}>
    <div style={{
      fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
      textTransform: "uppercase", color: C.muted, marginBottom: "12px",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>{label}</div>
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: "32px", fontWeight: "700", color: C.ink,
      lineHeight: 1, letterSpacing: "0.01em", marginBottom: "5px",
    }}>{value}</div>
    {sub && (
      <div style={{
        fontSize: "9px", fontWeight: "600", letterSpacing: "0.1em",
        textTransform: "uppercase", color: C.dim,
      }}>{sub}</div>
    )}
  </div>
);

/* ─── Chart Card ─────────────────────────────────────────────────── */
const ChartCard = ({ title, children, action, className = "", style = {} }) => (
  <div className={className} style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    padding: "24px",
    ...style,
  }}>
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "20px", gap: "12px", flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "3px", height: "14px", background: C.navy, flexShrink: 0 }} />
        <span style={{
          fontSize: "9px", fontWeight: "700", letterSpacing: "0.2em",
          textTransform: "uppercase", color: C.muted,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>{title}</span>
      </div>
      {action}
    </div>
    {children}
  </div>
);

/* ─── Filter field label ─────────────────────────────────────────── */
const FLabel = ({ text, secondary }) => (
  <div style={{
    fontSize: "9px", fontWeight: "700", letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: secondary ? C.dim : C.mid,
    marginBottom: "6px",
    fontFamily: "'IBM Plex Sans', sans-serif",
    display: "flex", alignItems: "center", gap: "6px",
  }}>
    {text}
    {secondary && (
      <span style={{
        fontSize: "8px", letterSpacing: "0.1em",
        color: C.dim, fontWeight: "600",
        background: C.cardAlt, border: `1px solid ${C.border}`,
        padding: "1px 5px", lineHeight: 1.4,
      }}>OVERRIDE</span>
    )}
  </div>
);

/* ─── Empty state ────────────────────────────────────────────────── */
const NoData = () => (
  <div style={{ textAlign: "center", padding: "40px 0", color: C.dim, fontSize: "13px", fontWeight: "500" }}>
    No data available
  </div>
);

/* ─── Shared chart props ─────────────────────────────────────────── */
const AXIS_TICK  = { fill: C.muted, fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif" };
const CHART_GRID = { strokeDasharray: "3 3", stroke: C.border };

/* ─── Main component ─────────────────────────────────────────────── */
export default function AdminAnalytics() {
  const { user } = useAuthStore();

  const isSuperAdmin  = user?.role === "superadmin";
  const isBranchAdmin = user?.role === "admin";

  // ── Default to current month ──
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [branch,       setBranch]       = useState("");
  const [monthPreset,  setMonthPreset]  = useState(MONTH_PRESETS[0].key);
  const [from,         setFrom]         = useState(MONTH_PRESETS[0].from);
  const [to,           setTo]           = useState(MONTH_PRESETS[0].to);
  const [branchMetric, setBranchMetric] = useState("totalLabour");

  /* inject styles */
  useEffect(() => {
    const id = "aa-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = INJECTED;
      document.head.appendChild(el);
    }
    return () => { const el = document.getElementById(id); if (el) document.head.removeChild(el); };
  }, []);

  /* ── Month preset handler: updates from/to automatically ── */
  const handleMonthPreset = useCallback((key) => {
    const preset = MONTH_PRESETS.find(p => p.key === key);
    if (!preset) return;
    setMonthPreset(key);
    setFrom(preset.from);
    setTo(preset.to);
  }, []);

  /* ── Manual date change: overrides preset → "custom" ── */
  const handleFromChange = useCallback((val) => {
    setFrom(val);
    setMonthPreset("custom");
  }, []);

  const handleToChange = useCallback((val) => {
    setTo(val);
    setMonthPreset("custom");
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = {};
      if (isSuperAdmin && branch) params.branch = branch;
      if (from) params.from = from;
      if (to)   params.to   = to;
      const res = await api.get("/api/admin/analytics", { params });
      setData(res.data);
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [branch, from, to, isSuperAdmin]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  /* ── CSV export — improved with metadata + sections ── */
  const exportCSV = () => {
    if (!data) return;
    const o = data.overview;
    const branchLabel = data.scopedBranch || (isSuperAdmin && branch ? branch : "All Branches");
    const periodPreset = MONTH_PRESETS.find(p => p.key === monthPreset);
    const periodLabel = periodPreset ? periodPreset.label : "Custom Range";
    const dateRange   = `${from || "—"} to ${to || "—"}`;
    const generated   = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

    const rows = [
      // ── Metadata header
      ["AML Motors — Performance Analytics Export"],
      ["Branch", branchLabel, "Period", periodLabel, "Date Range", dateRange],
      ["Generated", generated],
      [""],
      // ── Overview
      ["OVERVIEW TOTALS"],
      ["Metric", "Value"],
      ["Total Labour (₹)",    o.totalLabour],
      ["Total Hours",         o.totalHours],
      ["Total Incentives (₹)",o.totalIncentives],
      ["Total Entries",       o.totalEntries],
      ["Total Leave Days",    o.totalLeaveDays],
      ["Avg Labour / Entry (₹)", o.totalEntries > 0 ? Math.round(o.totalLabour / o.totalEntries) : 0],
      [""],
      // ── Branch
      ["BRANCH PERFORMANCE"],
      ["Branch", "Labour (₹)", "Hours", "Entries", "Incentives (₹)", "Leave Days"],
      ...data.byBranch.map(b => [
        b._id, b.totalLabour, b.totalHours, b.totalEntries, b.totalIncentives, b.totalLeaveDays,
      ]),
      [""],
      // ── Category
      ["CATEGORY BREAKDOWN"],
      ["Category", "Entries", "Hours", "Labour (₹)", "Avg Labour / Entry (₹)"],
      ...data.byCategory.map(c => [
        c._id, c.count, c.totalHours, c.totalLabour,
        c.count > 0 ? Math.round(c.totalLabour / c.count) : 0,
      ]),
      [""],
      // ── Monthly trend
      ["MONTHLY TREND"],
      ["Month", "Labour (₹)", "Hours", "Entries", "Incentives (₹)"],
      ...data.byMonth.map(m => [
        m.label, m.totalLabour, m.totalHours, m.totalEntries, m.totalIncentives,
      ]),
      [""],
      // ── Top technicians
      ["TOP TECHNICIANS — LABOUR"],
      ["Rank", "Name", "Technician ID", "Branch", "Labour (₹)", "Hours", "Entries"],
      ...data.topTechs.map((t, i) => [
        i + 1, t.name, t.technicianId, t.branch, t.totalLabour, t.totalHours, t.totalEntries,
      ]),
    ];

    const csv  = rows.map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const safePeriod  = periodLabel.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
    const safeBranch  = branchLabel.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
    const dateStamp   = new Date().toISOString().slice(0, 10);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `AML_Analytics_${safeBranch}_${safePeriod}_${dateStamp}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filter helpers ──
  const isCurrentMonth  = monthPreset === MONTH_PRESETS[0].key;
  const hasActiveFilter = (isSuperAdmin && !!branch) || !isCurrentMonth;

  const clearFilters = () => {
    if (isSuperAdmin) setBranch("");
    setMonthPreset(MONTH_PRESETS[0].key);
    setFrom(MONTH_PRESETS[0].from);
    setTo(MONTH_PRESETS[0].to);
  };

  const filterStatusText = () => {
    const periodPreset = MONTH_PRESETS.find(p => p.key === monthPreset);
    const periodLabel  = periodPreset ? periodPreset.label : `${from} → ${to}`;
    if (isBranchAdmin) {
      const b = data?.scopedBranch || user?.branch || "";
      return `${b} · ${periodLabel}`;
    }
    return `${branch ? branch : "All branches"} · ${periodLabel}`;
  };

  const branchMetricLabel = {
    totalLabour:         "Labour",
    totalHours:          "Hours",
    totalEntries:        "Entries",
    totalIncentives:     "Incentives",
    totalVehiclesLogged: "Vehicles",
  };

  const o = data?.overview;

  /* ── Render ── */
  return (
    <div style={{
      minHeight: "100dvh",
      background: C.pageBg,
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <Navbar />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 16px 80px" }}>

        {/* ── Page header ── */}
        <div
          className="aa-a1 aa-page-header"
          style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", flexWrap: "wrap",
            gap: "16px", marginBottom: "28px",
            paddingBottom: "24px", borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "9px", fontWeight: "700", letterSpacing: "0.22em",
              textTransform: "uppercase", color: C.navy, marginBottom: "6px",
            }}>
              {isSuperAdmin ? "Super Admin" : "Branch Admin"} · Analytics
            </div>
            <h1
              className="aa-page-title"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "36px", fontWeight: "700", color: C.ink,
                letterSpacing: "0.04em", textTransform: "uppercase",
                margin: "0 0 6px", lineHeight: 1,
              }}
            >
              {isBranchAdmin ? `${user?.branch || ""} Analytics` : "Performance Analytics"}
            </h1>
            <p style={{
              fontSize: "13px", color: C.muted,
              margin: 0, fontWeight: "300", fontStyle: "italic",
            }}>
              {isBranchAdmin
                ? `${user?.branch || ""} branch performance · AML Motors`
                : "Cross-branch performance intelligence · AML Motors"}
            </p>
          </div>
          <button className="aa-export-btn" onClick={exportCSV} disabled={!data}>
            ↓ Export CSV
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div
          className="aa-a2"
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.navy}`,
            padding: "20px 24px",
            marginBottom: "28px",
          }}
        >
          <div className="aa-filter-bar">

            {/* Branch selector — superadmin only */}
            {isSuperAdmin && (
              <div className="aa-filter-field">
                <FLabel text="Branch" />
                <select
                  className="aa-filter-select"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}

            {/* Locked branch badge — branch admin */}
            {isBranchAdmin && (
              <div className="aa-filter-field" style={{ minWidth: "unset" }}>
                <FLabel text="Branch" />
                <div style={{
                  height: "40px",
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  background: C.cardAlt, border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${C.navy}`,
                  padding: "0 16px",
                }}>
                  <div style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: C.navy, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: "11px", fontWeight: "700", letterSpacing: "0.12em",
                    textTransform: "uppercase", color: C.navy,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>{user?.branch || "—"}</span>
                </div>
              </div>
            )}

            {/* ── Month preset selector (primary time control) ── */}
            <div className="aa-filter-field" style={{ minWidth: "160px" }}>
              <FLabel text="Period" />
              <select
                className="aa-filter-select"
                value={monthPreset}
                onChange={e => handleMonthPreset(e.target.value)}
              >
                {MONTH_PRESETS.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
                {monthPreset === "custom" && (
                  <option value="custom">Custom Range</option>
                )}
              </select>
            </div>

            {/* ── From / To date overrides (secondary) ── */}
            <div className="aa-filter-dates">
              <div className="aa-filter-date-field">
                <FLabel text="From" secondary />
                <input
                  type="date"
                  className="aa-filter-input"
                  value={from}
                  onChange={e => handleFromChange(e.target.value)}
                  style={{ colorScheme: "light" }}
                />
              </div>
              <div className="aa-filter-date-field">
                <FLabel text="To" secondary />
                <input
                  type="date"
                  className="aa-filter-input"
                  value={to}
                  onChange={e => handleToChange(e.target.value)}
                  style={{ colorScheme: "light" }}
                />
              </div>
            </div>

            {/* Clear — only when non-default filter active */}
            {hasActiveFilter && (
              <button className="aa-clear-btn" onClick={clearFilters}
                style={{ alignSelf: "flex-end" }}>
                Clear
              </button>
            )}

            {/* Filter status — right-aligned */}
            {!loading && (
              <div className="aa-filter-status">{filterStatusText()}</div>
            )}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: "24px", height: "24px",
              border: `2px solid ${C.border}`, borderTop: `2px solid ${C.navy}`,
              borderRadius: "50%", margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{
              fontSize: "10px", letterSpacing: "0.18em",
              textTransform: "uppercase", fontWeight: "700", color: C.dim, margin: 0,
            }}>Loading analytics…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA",
            borderLeft: "3px solid #DC2626",
            padding: "24px", textAlign: "center",
          }}>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "20px", fontWeight: "700", color: C.danger,
              letterSpacing: "0.04em", textTransform: "uppercase",
              margin: "0 0 6px",
            }}>Failed to Load</p>
            <p style={{ fontSize: "13px", color: "#991B1B", margin: "0" }}>{error}</p>
            <button className="aa-retry-btn" onClick={fetchAnalytics}>Retry</button>
          </div>
        )}

        {/* ── Main content ── */}
        {!loading && !error && data && (
          <>
            {/* KPI grid */}
            <div className="aa-a3 aa-kpi-grid" style={{ marginBottom: "24px" }}>
              <KpiCard
                label="Total Labour"
                value={fmt(o.totalLabour)}
                sub={fmtFull(o.totalLabour)}
                accent={C.amber}
              />
              <KpiCard
                label="Total Hours"
                value={o.totalHours.toLocaleString("en-IN")}
                sub="hrs worked"
                accent={C.success}
              />
              <KpiCard
                label="Incentives Paid"
                value={fmt(o.totalIncentives)}
                sub={fmtFull(o.totalIncentives)}
                accent={C.navy}
              />
              <KpiCard
                label="Total Entries"
                value={o.totalEntries.toLocaleString("en-IN")}
                sub="job cards logged"
                accent="#7C3AED"
              />
              <KpiCard
                label="Leave Days"
                value={o.totalLeaveDays.toLocaleString("en-IN")}
                sub="across technicians"
                accent={C.muted}
              />
          <KpiCard
                label="Vehicles Logged"
                value={(o.totalVehiclesLogged || 0).toLocaleString("en-IN")}
                sub="gate entries"
                accent="#0E7490"
              />
              {o.totalEntries > 0 && (
                <KpiCard
                  label="Avg Labour / Entry"
                  value={fmt(Math.round(o.totalLabour / o.totalEntries))}
                  sub="per job card"
                  accent="#0891B2"
                />
              )}
            </div>

            {/* ── Row 1: Branch bar + Category donut ── */}
            <div className="aa-a4 aa-row-2col" style={{ marginBottom: "20px" }}>

              {/* Branch bar chart */}
              <ChartCard
                title={isBranchAdmin ? "Branch Performance" : "Branch Comparison"}
                action={
                  <div className="aa-metric-pills">
                    {Object.entries(branchMetricLabel).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => setBranchMetric(k)}
                        className={`aa-metric-pill${branchMetric === k ? " active" : ""}`}
                      >{v}</button>
                    ))}
                  </div>
                }
              >
                {data.byBranch.length === 0 ? <NoData /> : (
                  <div className="aa-chart-h260">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byBranch} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...CHART_GRID} />
                        <XAxis dataKey="_id" tick={AXIS_TICK} />
                        <YAxis
                          tick={AXIS_TICK}
                          tickFormatter={v =>
                            branchMetric.includes("Labour") || branchMetric.includes("Incentive")
                              ? fmt(v) : v.toLocaleString("en-IN")}
                          width={55}
                        />
                        <Tooltip content={<LightTooltip />} />
                        <Bar dataKey={branchMetric} name={branchMetricLabel[branchMetric]} radius={[0,0,0,0]}>
                          {data.byBranch.map((_, i) => (
                            <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              {/* Category donut */}
              <ChartCard title="Labour by Category">
                {data.byCategory.length === 0 ? <NoData /> : (
                  <>
                    <div className="aa-chart-h170">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.byCategory}
                            dataKey="totalLabour"
                            nameKey="_id"
                            cx="50%" cy="50%"
                            innerRadius={48} outerRadius={78}
                            paddingAngle={2} stroke="none"
                          >
                            {data.byCategory.map((c, i) => (
                              <Cell key={i} fill={CATEGORY_COLORS[c._id] || BRANCH_COLORS[i]} />
                            ))}
                          </Pie>
                          <Tooltip content={<LightTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend with progress bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                      {data.byCategory.map((c, i) => {
                        const pct   = o.totalLabour > 0 ? ((c.totalLabour / o.totalLabour) * 100).toFixed(1) : 0;
                        const color = CATEGORY_COLORS[c._id] || BRANCH_COLORS[i];
                        return (
                          <div key={c._id}>
                            <div style={{
                              display: "flex", alignItems: "center",
                              gap: "8px", marginBottom: "5px",
                            }}>
                              <div style={{ width: "8px", height: "8px", flexShrink: 0, background: color }} />
                              <span style={{ fontSize: "11px", color: C.mid, flex: 1, fontWeight: "500" }}>{c._id}</span>
                              <span style={{ fontSize: "10px", color: C.muted }}>{pct}%</span>
                              <span style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: "11px", color: C.ink, fontWeight: "600",
                                minWidth: "44px", textAlign: "right",
                              }}>{fmt(c.totalLabour)}</span>
                            </div>
                            <div style={{ height: "3px", background: C.border, overflow: "hidden" }}>
                              <div style={{
                                width: `${pct}%`, height: "100%", background: color,
                                transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </ChartCard>
            </div>

            {/* ── Monthly trend ── */}
            <ChartCard
              className="aa-a4"
              title="Monthly Trend — Labour & Hours"
              style={{ marginBottom: "20px" }}
            >
              {data.byMonth.length === 0 ? <NoData /> : (
                <div className="aa-chart-h240">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.byMonth} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="label" tick={AXIS_TICK} />
                      <YAxis yAxisId="left"  tick={AXIS_TICK} tickFormatter={v => fmt(v)} width={55} />
                      <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} />
                      <Tooltip content={<LightTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }} />
                      <Line
                        yAxisId="left" type="monotone" dataKey="totalLabour" name="Labour (₹)"
                        stroke={C.navy} strokeWidth={2.5}
                        dot={{ r: 4, fill: C.navy, strokeWidth: 0 }} activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right" type="monotone" dataKey="totalHours" name="Hours Worked"
                        stroke={C.success} strokeWidth={2.5}
                        dot={{ r: 4, fill: C.success, strokeWidth: 0 }} activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="left" type="monotone" dataKey="totalIncentives" name="Incentives (₹)"
                        stroke={C.amber} strokeWidth={2} strokeDasharray="5 4"
                        dot={{ r: 3, fill: C.amber, strokeWidth: 0 }} activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

        {/* ── Vehicle Gate Activity — mini monthly bar (Option B) ── */}
            <ChartCard
              className="aa-a4"
              title="Vehicle Gate Activity — Monthly Logged"
              style={{ marginBottom: "20px" }}
            >
              {data.byMonth.length === 0 ||
               data.byMonth.every(m => (m.totalVehiclesLogged || 0) === 0) ? (
                <NoData />
              ) : (
                <div className="aa-chart-h120">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.byMonth}
                      margin={{ top: 2, right: 24, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="label" tick={AXIS_TICK} />
                      <YAxis tick={AXIS_TICK} allowDecimals={false} width={35} />
                      <Tooltip content={<LightTooltip />} />
                      <Bar
                        dataKey="totalVehiclesLogged"
                        name="Vehicles Logged"
                        fill="#0E7490"
                        radius={[0, 0, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* ── Row 3: Top technicians + Category table ── */}
            <div className="aa-a5 aa-row-equal" style={{ marginBottom: "20px" }}>

              {/* Top technicians */}
              <ChartCard
                title="Top Technicians — Labour"
                action={
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px", color: C.dim, letterSpacing: "0.04em",
                  }}>Top 10</span>
                }
              >
                {data.topTechs.length === 0 ? <NoData /> : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {data.topTechs.map((t, i) => {
                      const maxLabour = data.topTechs[0]?.totalLabour || 1;
                      const pct       = (t.totalLabour / maxLabour) * 100;
                      const rankColor = i < 3 ? RANK_COLORS[i] : null;
                      return (
                        <div key={String(t._id)} style={{
                          padding: "10px 0",
                          borderBottom: i < data.topTechs.length - 1
                            ? `1px solid ${C.borderL}` : "none",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                            <div style={{
                              width: "22px", height: "22px", flexShrink: 0,
                              background: rankColor ? `${rankColor}18` : C.cardAlt,
                              border: `1px solid ${rankColor || C.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "9px", fontWeight: "700",
                              color: rankColor || C.dim,
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}>{i + 1}</div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontSize: "13px", fontWeight: "600", color: C.ink,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                margin: 0, lineHeight: 1.3,
                              }}>{t.name}</p>
                              <p style={{
                                fontSize: "10px", color: C.dim, margin: 0,
                                fontFamily: "'IBM Plex Mono', monospace",
                                letterSpacing: "0.04em",
                              }}>
                                {t.technicianId} · {t.branch}
                              </p>
                            </div>

                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <p style={{
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontSize: "20px", fontWeight: "700",
                                color: rankColor || C.navy,
                                margin: 0, lineHeight: 1,
                              }}>{fmt(t.totalLabour)}</p>
                              <p style={{ fontSize: "10px", color: C.dim, margin: 0 }}>
                                {t.totalHours}h · {t.totalEntries} entries
                              </p>
                            </div>
                          </div>

                          <div style={{ height: "3px", background: C.border, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: rankColor || C.navy,
                              transition: "width 0.6s ease",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>

              {/* Category breakdown table */}
              <ChartCard title="Category Breakdown">
                {data.byCategory.length === 0 ? <NoData /> : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="aa-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Category</th>
                          <th style={{ textAlign: "right" }}>Entries</th>
                          <th style={{ textAlign: "right" }}>Hours</th>
                          <th style={{ textAlign: "right" }}>Labour</th>
                          <th style={{ textAlign: "right" }}>Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byCategory.map((c, i) => {
                          const color = CATEGORY_COLORS[c._id] || BRANCH_COLORS[i];
                          const avg   = c.count > 0 ? Math.round(c.totalLabour / c.count) : 0;
                          return (
                            <tr key={c._id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{ width: "8px", height: "8px", flexShrink: 0, background: color }} />
                                  <span style={{ color: C.ink, fontWeight: "500" }}>{c._id}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: "right", color: C.muted }}>{c.count.toLocaleString("en-IN")}</td>
                              <td style={{ textAlign: "right", color: C.muted }}>{c.totalHours.toLocaleString("en-IN")}</td>
                              <td style={{
                                textAlign: "right", color: C.navy, fontWeight: "700",
                                fontFamily: "'IBM Plex Mono', monospace",
                              }}>{fmt(c.totalLabour)}</td>
                              <td style={{
                                textAlign: "right", color: C.success, fontWeight: "700",
                                fontFamily: "'IBM Plex Mono', monospace",
                              }}>{fmt(avg)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: "700", color: C.ink }}>Total</td>
                          <td style={{ textAlign: "right" }}>{o.totalEntries.toLocaleString("en-IN")}</td>
                          <td style={{ textAlign: "right" }}>{o.totalHours.toLocaleString("en-IN")}</td>
                          <td style={{ textAlign: "right", color: C.navy }}>{fmt(o.totalLabour)}</td>
                          <td style={{ textAlign: "right", color: C.success }}>
                            {fmt(o.totalEntries > 0 ? Math.round(o.totalLabour / o.totalEntries) : 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* ── Incentives vs Labour by branch ── */}
            <ChartCard
              className="aa-a5"
              title={isBranchAdmin ? "Incentives vs Labour" : "Incentives vs Labour by Branch"}
            >
              {data.byBranch.length === 0 ? <NoData /> : (
                <div className="aa-chart-h240">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byBranch} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="_id" tick={AXIS_TICK} />
                      <YAxis tick={AXIS_TICK} tickFormatter={v => fmt(v)} width={55} />
                      <Tooltip content={<LightTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }} />
                      <Bar dataKey="totalLabour"     name="Labour (₹)"     fill={C.navy}  radius={[0,0,0,0]} />
                      <Bar dataKey="totalIncentives" name="Incentives (₹)" fill={C.amber} radius={[0,0,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </>
        )}
      </div>
    </div>
  );
}