import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";

/* ─── Design tokens ─────────────────────────────────────────────────── */
const C = {
  bg:      "#09090E", surface: "#111119", card: "#16161F",
  elev:    "#1E1E2C", border:  "#23232F", border2: "#1A1A25",
  text:    "#E2E2EE", muted:   "#60607A", dim:     "#30304A",
  blue:    "#4C70F5", blueL:  "#7A98F8",
  green:   "#10C090", greenL: "#4DD8B6",
  amber:   "#E8A000", amberL: "#FFC033",
  red:     "#E04848",
};

/* ─── Category config ───────────────────────────────────────────────── */
const CAT = {
  "ENGINE REPAIR": {
    bar: "#2563EB",
    label: "#60A5FA",
  },

  "GEAR BOX": {
    bar: "#DC2626",
    label: "#F87171",
  },

  "ELECTRICAL": {
    bar: "#F59E0B",
    label: "#FBBF24",
  },

  "BODY WORK": {
    bar: "#16A34A",
    label: "#4ADE80",
  },

  "DIFFERENTIAL": {
    bar: "#DB2777",
    label: "#F472B6",
  },

  "TRANSMISSION": {
    bar: "#7C3AED",
    label: "#A78BFA",
  },

  "AC & COOLING": {
    bar: "#0891B2",
    label: "#67E8F9",
  },

  "EATS FLUSHING": {
    bar: "#92400E",
    label: "#D97706",
  },

  "GENERAL SERVICE": {
    bar: "#EA580C",
    label: "#FB923C",
  },

  "SCHEDULE SERVICE": {
    bar: "#374151",
    label: "#9CA3AF",
  },
};
/* ─── KPI card ─────────────────────────────────────────────────────── */
function KpiCard({ label, value, unit, accent = C.blue }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: "4px", padding: "16px 18px",
      borderLeft: `3px solid ${accent}`,
      transition: "border-color 0.15s",
    }}>
      <p style={{
        fontSize: "9px", fontWeight: "700", letterSpacing: "0.16em",
        textTransform: "uppercase", color: C.muted, marginBottom: "10px",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>{label}</p>
      <p style={{
        fontSize: "26px", fontWeight: "800", color: C.text, lineHeight: 1,
        fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.02em",
      }}>{value}</p>
      {unit && (
        <p style={{
          fontSize: "10px", color: C.dim, marginTop: "4px",
          fontWeight: "600", letterSpacing: "0.10em", textTransform: "uppercase",
        }}>{unit}</p>
      )}
    </div>
  );
}

/* ─── Stat definitions ──────────────────────────────────────────────── */
const STATS = [
  { key: "technicianCount",       label: "Technicians",     unit: "",        accent: C.blue,  fmt: v => v },
  { key: "totalEntries",          label: "Job Cards",       unit: "total",   accent: C.blueL, fmt: v => Number(v).toLocaleString("en-IN") },
  { key: "totalHours",            label: "Hours Worked",    unit: "hrs",     accent: C.green, fmt: v => Number(v).toLocaleString("en-IN") },
  { key: "avgHoursPerTechnician", label: "Avg Hours / Tech",unit: "hrs avg", accent: C.greenL,fmt: v => v },
  { key: "totalLabour",           label: "Total Labour",    unit: "",        accent: C.amber, fmt: v => `₹${Number(v).toLocaleString("en-IN")}` },
  { key: "totalIncentives",       label: "Incentives Paid", unit: "",        accent: C.amberL,fmt: v => `₹${Number(v).toLocaleString("en-IN")}` },
  { key: "totalLeaveDays",        label: "Leave Days",      unit: "days",    accent: C.dim,   fmt: v => v },
];

/* ─── Main ──────────────────────────────────────────────────────────── */
export default function AdminBranchDashboard() {
  const navigate = useNavigate();
  const [branches, setBranches]   = useState([]);
  const [selected, setSelected]   = useState("");
  const [stats, setStats]         = useState(null);
  const [loadingB, setLoadingB]   = useState(true);
  const [loadingS, setLoadingS]   = useState(false);

  useEffect(() => {
    api.get("/api/admin/branches")
      .then(r => { setBranches(r.data); if (r.data.length) setSelected(r.data[0]); })
      .catch(console.error)
      .finally(() => setLoadingB(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingS(true); setStats(null);
    api.get(`/api/admin/branch/${encodeURIComponent(selected)}`)
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoadingS(false));
  }, [selected]);

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: C.text }}>
      <Navbar />

      <div style={{ padding: "28px 16px 48px", maxWidth: "960px", margin: "0 auto" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: "32px", borderBottom: `1px solid ${C.border2}`, paddingBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: "28px", fontWeight: "800", margin: 0,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>Branch Dashboard</h1>
            {selected && !loadingS && stats && (
              <span style={{
                fontSize: "11px", color: C.muted, fontWeight: "600",
                letterSpacing: "0.10em", textTransform: "uppercase",
              }}>
                {selected} · {stats.technicianCount} Technician{stats.technicianCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p style={{ color: C.muted, fontSize: "13px", marginTop: "6px" }}>
            Performance overview by branch
          </p>
        </div>

        {/* ── Branch selector ── */}
        {loadingB ? (
          <p style={{ color: C.dim, fontSize: "12px", letterSpacing: "0.12em" }}>LOADING BRANCHES…</p>
        ) : branches.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px",
            padding: "48px", textAlign: "center", color: C.muted, fontSize: "14px",
          }}>
            No branches found. Technicians need to complete profile setup first.
          </div>
        ) : (
          <div style={{
            display: "flex", gap: "6px", overflowX: "auto",
            paddingBottom: "4px", marginBottom: "32px",
            WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
          }}>
            {branches.map(b => {
              const active = selected === b;
              return (
                <button key={b} onClick={() => setSelected(b)} style={{
                  padding: "7px 18px",
                  border: `1px solid ${active ? C.blue : C.border}`,
                  background: active ? "rgba(76,112,245,0.10)" : "transparent",
                  color: active ? C.blueL : C.muted,
                  fontWeight: active ? "700" : "500",
                  fontSize: "11px", letterSpacing: "0.12em",
                  textTransform: "uppercase", cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  borderRadius: "3px", whiteSpace: "nowrap",
                  flexShrink: 0, transition: "all 0.15s",
                }}>
                  {b}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Stats section ── */}
        {selected && (
          loadingS ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: C.dim }}>
              <div style={{
                width: "1px", height: "32px", background: C.blue,
                margin: "0 auto 16px", opacity: 0.6,
              }} />
              <p style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Loading {selected}…
              </p>
            </div>
          ) : stats ? (
            <>
              {/* ── Branch action row ── */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: "20px", gap: "12px",
                flexWrap: "wrap",
              }}>
                <div style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: C.muted,
                  display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <div style={{ width: "3px", height: "14px", background: C.blue, borderRadius: "1px" }} />
                  Performance Metrics
                </div>
                <button
                  onClick={() => navigate(`/admin/branch/${encodeURIComponent(selected)}`)}
                  style={{
                    padding: "8px 20px",
                    background: C.blue, border: "none", borderRadius: "3px",
                    color: "#FFFFFF", fontSize: "10px", fontWeight: "700",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
                    transition: "opacity 0.15s",
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseOut={e => e.currentTarget.style.opacity = "1"}
                >
                  View Technicians →
                </button>
              </div>

              {/* ── KPI Grid ── */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "8px", marginBottom: "28px",
              }}>
                {STATS.map(({ key, label, unit, accent, fmt }) =>
                  stats[key] !== undefined ? (
                    <KpiCard key={key} label={label} value={fmt(stats[key])} unit={unit} accent={accent} />
                  ) : null
                )}
              </div>

              {/* ── Category breakdown ── */}
              {stats.categoryBreakdown?.length > 0 && (
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: "4px", padding: "24px",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: "24px",
                  }}>
                    <p style={{
                      fontSize: "10px", fontWeight: "700",
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: C.muted, margin: 0,
                    }}>Category Breakdown</p>
                    <p style={{
                      fontSize: "10px", color: C.dim,
                      letterSpacing: "0.08em",
                    }}>
                      {stats.categoryBreakdown.reduce((a, c) => a + c.count, 0)} entries
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {stats.categoryBreakdown.map(({ _id, count }) => {
                      const max = stats.categoryBreakdown[0].count;
                      const pct = Math.round((count / max) * 100);
                      const totalCount = stats.categoryBreakdown.reduce((a, c) => a + c.count, 0);
                      const sharePct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
                      const c = CAT[_id] || { bar: C.blue, label: C.blueL };
                      return (
                        <div key={_id}>
                          <div style={{
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: "8px",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "8px", height: "8px", borderRadius: "2px",
                                background: c.bar, flexShrink: 0,
                              }} />
                              <span style={{ fontSize: "13px", color: "#B0B0CC", fontWeight: "500" }}>
                                {_id}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                              <span style={{ fontSize: "11px", color: C.muted }}>{sharePct}%</span>
                              <span style={{
                                fontSize: "14px", fontWeight: "700",
                                color: c.label,
                                fontFamily: "'IBM Plex Mono', monospace",
                                minWidth: "28px", textAlign: "right",
                              }}>{count}</span>
                            </div>
                          </div>
                          <div style={{
                            height: "3px", background: C.border2,
                            borderRadius: "2px", overflow: "hidden",
                          }}>
                            <div style={{
                              width: `${pct}%`, height: "100%",
                              background: c.bar, borderRadius: "2px",
                              transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null
        )}
      </div>
    </div>
  );
}