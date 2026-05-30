import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import api from "../api/axios";
import Navbar from "../components/Navbar";

// ─── constants ───────────────────────────────────────────────────────────────
const BRANCHES = [
  "BALLARI",
  "CHITRADURGA",
  "HOSPET",
];

const CATEGORY_COLORS = {
 "ENGINE REPAIR":   "#2563EB", // Blue
  "GEAR BOX":        "#DC2626", // Red
  "ELECTRICAL":      "#F59E0B", // Amber
  "BODY WORK":       "#16A34A", // Green
  "DIFFERENTIATE":   "#DB2777", // Magenta
  "TRANSMISSION":    "#7C3AED", // Purple
  "AC & COOLING":    "#0891B2", // Cyan
  "EATS FLUSING":    "#92400E", // Brown
  "GENERAL SERVICE": "#EA580C", // Orange
  "SCHEDULE SERVICE":"#374151", // Gray
};

const BRANCH_COLORS = [
  "#3B8FFF","#10B981","#F59E0B","#8B5CF6",
  "#06B6D4","#F97316","#EC4899","#84CC16","#EF4444","#14B8A6",
];

const fmt = (n) =>
  n >= 1_00_000
    ? `₹${(n / 1_00_000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${n}`;

const fmtFull = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// ─── custom tooltip ───────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0F2044", border: "1px solid rgba(30,111,217,0.35)",
      borderRadius: 10, padding: "12px 16px", fontSize: 13,
    }}>
      <p style={{ color: "#8BA3C7", marginBottom: 8, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "3px 0" }}>
          {p.name}: <strong style={{ color: "#F0F4FF" }}>
            {p.name?.toLowerCase().includes("labour") || p.name?.toLowerCase().includes("incentive")
              ? fmtFull(p.value)
              : p.value?.toLocaleString("en-IN")}
          </strong>
        </p>
      ))}
    </div>
  );
};

// ─── stat card ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, accent = "#3B8FFF", icon }) => (
  <div style={{
    background: "#0F2044",
    border: `1px solid rgba(30,111,217,0.25)`,
    borderRadius: 14,
    padding: "22px 24px",
    display: "flex", flexDirection: "column", gap: 8,
    position: "relative", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", top: 0, right: 0,
      width: 80, height: 80,
      background: `radial-gradient(circle at top right, ${accent}22, transparent 70%)`,
    }} />
    <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
    <p style={{ color: "#8BA3C7", fontSize: 12, letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>
      {label}
    </p>
    <p style={{ fontSize: 26, fontWeight: 700, color: "#F0F4FF", lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontSize: 12, color: "#8BA3C7" }}>{sub}</p>}
  </div>
);

// ─── section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <h2 style={{ fontSize: 15, fontWeight: 700, color: "#F0F4FF", letterSpacing: "0.02em" }}>{title}</h2>
    {action}
  </div>
);

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // filters
  const [branch, setBranch] = useState("");
  const [from,   setFrom]   = useState("");
  const [to,     setTo]     = useState("");

  // active metric for branch chart
  const [branchMetric, setBranchMetric] = useState("totalLabour");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (branch) params.branch = branch;
      if (from)   params.from   = from;
      if (to)     params.to     = to;
      const res = await api.get("/api/admin/analytics", { params });
      setData(res.data);
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [branch, from, to]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── CSV export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!data) return;

    const rows = [
      ["Section", "Dimension", "Labour (₹)", "Hours", "Entries", "Incentives (₹)", "Leave Days"],
    ];

    data.byBranch.forEach(b => rows.push([
      "Branch", b._id, b.totalLabour, b.totalHours, b.totalEntries, b.totalIncentives, b.totalLeaveDays
    ]));

    data.byCategory.forEach(c => rows.push([
      "Category", c._id, c.totalLabour, c.totalHours, c.count, "", ""
    ]));

    data.byMonth.forEach(m => rows.push([
      "Monthly Trend", m.label, m.totalLabour, m.totalHours, m.totalEntries, m.totalIncentives, ""
    ]));

    data.topTechs.forEach(t => rows.push([
      "Top Technicians", `${t.name} (${t.technicianId})`, t.totalLabour, t.totalHours, t.totalEntries, "", ""
    ]));

    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const suffix = branch ? `_${branch}` : "_all_branches";
    const date = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `AL_Analytics${suffix}_${date}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── derived ─────────────────────────────────────────────────────────────────
  const o = data?.overview;

  const branchMetricLabel = {
    totalLabour:     "Labour (₹)",
    totalHours:      "Hours Worked",
    totalEntries:    "Total Entries",
    totalIncentives: "Incentives (₹)",
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: "#0A1628", color: "#F0F4FF" }}>
      <Navbar />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* ── page header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>
              Analytics
            </h1>
            <p style={{ color: "#8BA3C7", fontSize: 14 }}>
              Cross-branch performance intelligence · Ashok Leyland
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={!data}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: data ? "rgba(30,111,217,0.15)" : "rgba(30,111,217,0.05)",
              border: "1px solid rgba(30,111,217,0.4)",
              borderRadius: 10, padding: "10px 18px",
              color: data ? "#3B8FFF" : "#8BA3C7",
              fontSize: 13, fontWeight: 600, cursor: data ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            ⬇ Export CSV
          </button>
        </div>

        {/* ── filters ── */}
        <div style={{
          background: "#0F2044", border: "1px solid rgba(30,111,217,0.25)",
          borderRadius: 14, padding: "16px 20px",
          display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end",
          marginBottom: 28,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#8BA3C7", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Branch
            </label>
            <select
              value={branch}
              onChange={e => setBranch(e.target.value)}
              style={{
                background: "#162d5a", border: "1px solid rgba(30,111,217,0.3)",
                borderRadius: 8, color: "#F0F4FF", padding: "8px 12px", fontSize: 13,
              }}
            >
              <option value="">All Branches</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#8BA3C7", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              From
            </label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{
                background: "#162d5a", border: "1px solid rgba(30,111,217,0.3)",
                borderRadius: 8, color: "#F0F4FF", padding: "8px 12px", fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#8BA3C7", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              To
            </label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{
                background: "#162d5a", border: "1px solid rgba(30,111,217,0.3)",
                borderRadius: 8, color: "#F0F4FF", padding: "8px 12px", fontSize: 13,
              }}
            />
          </div>

          {(branch || from || to) && (
            <button
              onClick={() => { setBranch(""); setFrom(""); setTo(""); }}
              style={{
                background: "rgba(224,59,59,0.1)", border: "1px solid rgba(224,59,59,0.3)",
                borderRadius: 8, color: "#E03B3B", padding: "8px 14px", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}

          <p style={{ marginLeft: "auto", fontSize: 12, color: "#8BA3C7", alignSelf: "center" }}>
            {branch ? `Filtered: ${branch}` : "Showing all branches"}
            {(from || to) && ` · ${from || "start"} → ${to || "now"}`}
          </p>
        </div>

        {/* ── loading / error ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8BA3C7" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p>Loading analytics…</p>
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(224,59,59,0.1)", border: "1px solid rgba(224,59,59,0.3)",
            borderRadius: 12, padding: "20px 24px", color: "#E03B3B", textAlign: "center",
          }}>
            {error}
            <button onClick={fetchAnalytics} style={{
              marginLeft: 16, background: "none", border: "1px solid #E03B3B",
              borderRadius: 6, color: "#E03B3B", padding: "4px 12px", cursor: "pointer", fontSize: 13,
            }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── KPI row ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16, marginBottom: 32,
            }}>
              <KpiCard icon="💰" label="Total Labour" value={fmt(o.totalLabour)}
                sub={fmtFull(o.totalLabour)} accent="#3B8FFF" />
              <KpiCard icon="⏱" label="Total Hours" value={o.totalHours.toLocaleString("en-IN")}
                sub="hours worked" accent="#10B981" />
              <KpiCard icon="🎯" label="Incentives Paid" value={fmt(o.totalIncentives)}
                sub={fmtFull(o.totalIncentives)} accent="#F59E0B" />
              <KpiCard icon="📋" label="Total Entries" value={o.totalEntries.toLocaleString("en-IN")}
                sub="job cards logged" accent="#8B5CF6" />
              <KpiCard icon="🏖" label="Leave Days" value={o.totalLeaveDays.toLocaleString("en-IN")}
                sub="across all technicians" accent="#F97316" />
              {o.totalEntries > 0 && (
                <KpiCard icon="📊" label="Avg Labour / Entry"
                  value={fmt(Math.round(o.totalLabour / o.totalEntries))}
                  sub="per job card" accent="#06B6D4" />
              )}
            </div>

            {/* ── row 1: branch bar + category pie ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 20 }}>

              {/* branch comparison bar */}
              <div style={{
                background: "#0F2044", border: "1px solid rgba(30,111,217,0.25)",
                borderRadius: 14, padding: "24px",
              }}>
                <SectionHeader
                  title="Branch Comparison"
                  action={
                    <div style={{ display: "flex", gap: 6 }}>
                      {Object.entries(branchMetricLabel).map(([k, v]) => (
                        <button key={k} onClick={() => setBranchMetric(k)} style={{
                          background: branchMetric === k ? "rgba(30,111,217,0.3)" : "transparent",
                          border: `1px solid ${branchMetric === k ? "#3B8FFF" : "rgba(30,111,217,0.2)"}`,
                          borderRadius: 6, color: branchMetric === k ? "#3B8FFF" : "#8BA3C7",
                          padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                          letterSpacing: "0.03em",
                        }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  }
                />
                {data.byBranch.length === 0 ? (
                  <p style={{ color: "#8BA3C7", textAlign: "center", padding: "40px 0" }}>No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.byBranch} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,111,217,0.1)" />
                      <XAxis dataKey="_id" tick={{ fill: "#8BA3C7", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#8BA3C7", fontSize: 11 }}
                        tickFormatter={v => branchMetric.includes("Labour") || branchMetric.includes("Incentive") ? fmt(v) : v} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey={branchMetric} name={branchMetricLabel[branchMetric]} radius={[6,6,0,0]}>
                        {data.byBranch.map((_, i) => (
                          <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* category donut */}
              <div style={{
                background: "#0F2044", border: "1px solid rgba(30,111,217,0.25)",
                borderRadius: 14, padding: "24px",
              }}>
                <SectionHeader title="Labour by Category" />
                {data.byCategory.length === 0 ? (
                  <p style={{ color: "#8BA3C7", textAlign: "center", padding: "40px 0" }}>No data</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data.byCategory} dataKey="totalLabour" nameKey="_id"
                          cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                          paddingAngle={3} stroke="none">
                          {data.byCategory.map((c, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[c._id] || BRANCH_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip content={<DarkTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* legend */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                      {data.byCategory.map((c, i) => {
                        const pct = o.totalLabour > 0
                          ? ((c.totalLabour / o.totalLabour) * 100).toFixed(1)
                          : 0;
                        const color = CATEGORY_COLORS[c._id] || BRANCH_COLORS[i];
                        return (
                          <div key={c._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#8BA3C7", flex: 1 }}>{c._id}</span>
                            <span style={{ fontSize: 12, color: "#F0F4FF", fontWeight: 600 }}>{pct}%</span>
                            <span style={{ fontSize: 11, color: "#8BA3C7", minWidth: 50, textAlign: "right" }}>
                              {fmt(c.totalLabour)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── row 2: monthly trend ── */}
            <div style={{
              background: "#0F2044", border: "1px solid rgba(30,111,217,0.25)",
              borderRadius: 14, padding: "24px", marginBottom: 20,
            }}>
              <SectionHeader title="Monthly Trend — Labour & Hours" />
              {data.byMonth.length === 0 ? (
                <p style={{ color: "#8BA3C7", textAlign: "center", padding: "40px 0" }}>No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.byMonth} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,111,217,0.1)" />
                    <XAxis dataKey="label" tick={{ fill: "#8BA3C7", fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: "#8BA3C7", fontSize: 11 }}
                      tickFormatter={v => fmt(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#8BA3C7", fontSize: 11 }} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#8BA3C7" }} />
                    <Line yAxisId="left" type="monotone" dataKey="totalLabour" name="Labour (₹)"
                      stroke="#3B8FFF" strokeWidth={2.5} dot={{ r: 4, fill: "#3B8FFF" }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="totalHours" name="Hours Worked"
                      stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: "#10B981" }} activeDot={{ r: 6 }} />
                    <Line yAxisId="left" type="monotone" dataKey="totalIncentives" name="Incentives (₹)"
                      stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 4"
                      dot={{ r: 3, fill: "#F59E0B" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── row 3: top technicians + category table ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

              {/* top technicians */}
              <div style={{
                background: "#0F2044", border: "1px solid rgba(30,111,217,0.25)",
                borderRadius: 14, padding: "24px",
              }}>
                <SectionHeader
                  title="Top Technicians by Labour"
                  action={
                    <span style={{ fontSize: 11, color: "#8BA3C7" }}>Top 10</span>
                  }
                />
                {data.topTechs.length === 0 ? (
                  <p style={{ color: "#8BA3C7", textAlign: "center", padding: "40px 0" }}>No data</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {data.topTechs.map((t, i) => {
                      const maxLabour = data.topTechs[0]?.totalLabour || 1;
                      const pct = (t.totalLabour / maxLabour) * 100;
                      return (
                        <div key={String(t._id)} style={{ padding: "10px 0",
                          borderBottom: i < data.topTechs.length - 1 ? "1px solid rgba(30,111,217,0.1)" : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <span style={{
                              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                              background: i < 3 ? ["#F59E0B","#8BA3C7","#CD7F32"][i] : "#162d5a",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 700, color: i < 3 ? "#0A1628" : "#8BA3C7",
                            }}>
                              {i + 1}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {t.name}
                              </p>
                              <p style={{ fontSize: 11, color: "#8BA3C7" }}>
                                {t.technicianId} · {t.branch}
                              </p>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: "#3B8FFF" }}>
                                {fmt(t.totalLabour)}
                              </p>
                              <p style={{ fontSize: 11, color: "#8BA3C7" }}>
                                {t.totalHours}h · {t.totalEntries} entries
                              </p>
                            </div>
                          </div>
                          <div style={{ height: 4, background: "rgba(30,111,217,0.15)", borderRadius: 4 }}>
                            <div style={{
                              height: "100%", borderRadius: 4,
                              width: `${pct}%`,
                              background: i < 3
                                ? ["#F59E0B","#8BA3C7","#CD7F32"][i]
                                : "#3B8FFF",
                              transition: "width 0.6s ease",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* category detail table */}
              <div style={{
                background: "#0F2044", border: "1px solid rgba(30,111,217,0.25)",
                borderRadius: 14, padding: "24px",
              }}>
                <SectionHeader title="Category Breakdown" />
                {data.byCategory.length === 0 ? (
                  <p style={{ color: "#8BA3C7", textAlign: "center", padding: "40px 0" }}>No data</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(30,111,217,0.2)" }}>
                        {["Category","Entries","Hours","Labour","Avg/Entry"].map(h => (
                          <th key={h} style={{ padding: "8px 6px", color: "#8BA3C7",
                            fontWeight: 600, fontSize: 11, letterSpacing: "0.05em",
                            textTransform: "uppercase", textAlign: h === "Category" ? "left" : "right" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCategory.map((c, i) => {
                        const color = CATEGORY_COLORS[c._id] || BRANCH_COLORS[i];
                        const avg = c.count > 0 ? Math.round(c.totalLabour / c.count) : 0;
                        return (
                          <tr key={c._id} style={{
                            borderBottom: "1px solid rgba(30,111,217,0.08)",
                          }}>
                            <td style={{ padding: "10px 6px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                                <span style={{ color: "#F0F4FF", fontWeight: 500 }}>{c._id}</span>
                              </div>
                            </td>
                            <td style={{ padding: "10px 6px", textAlign: "right", color: "#8BA3C7" }}>
                              {c.count.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "10px 6px", textAlign: "right", color: "#8BA3C7" }}>
                              {c.totalHours.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "10px 6px", textAlign: "right", color: "#3B8FFF", fontWeight: 600 }}>
                              {fmt(c.totalLabour)}
                            </td>
                            <td style={{ padding: "10px 6px", textAlign: "right", color: "#10B981", fontWeight: 600 }}>
                              {fmt(avg)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "1px solid rgba(30,111,217,0.2)" }}>
                        <td style={{ padding: "10px 6px", color: "#F0F4FF", fontWeight: 700 }}>Total</td>
                        <td style={{ padding: "10px 6px", textAlign: "right", color: "#F0F4FF", fontWeight: 700 }}>
                          {o.totalEntries.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "10px 6px", textAlign: "right", color: "#F0F4FF", fontWeight: 700 }}>
                          {o.totalHours.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "10px 6px", textAlign: "right", color: "#3B8FFF", fontWeight: 700 }}>
                          {fmt(o.totalLabour)}
                        </td>
                        <td style={{ padding: "10px 6px", textAlign: "right", color: "#10B981", fontWeight: 700 }}>
                          {fmt(o.totalEntries > 0 ? Math.round(o.totalLabour / o.totalEntries) : 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>

            {/* ── row 4: branch entries bar ── */}
            <div style={{
              background: "#0F2044", border: "1px solid rgba(30,111,217,0.25)",
              borderRadius: 14, padding: "24px",
            }}>
              <SectionHeader title="Incentives vs Labour by Branch" />
              {data.byBranch.length === 0 ? (
                <p style={{ color: "#8BA3C7", textAlign: "center", padding: "40px 0" }}>No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.byBranch} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,111,217,0.1)" />
                    <XAxis dataKey="_id" tick={{ fill: "#8BA3C7", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#8BA3C7", fontSize: 11 }} tickFormatter={v => fmt(v)} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#8BA3C7" }} />
                    <Bar dataKey="totalLabour" name="Labour (₹)" fill="#3B8FFF" radius={[4,4,0,0]} />
                    <Bar dataKey="totalIncentives" name="Incentives (₹)" fill="#F59E0B" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}