import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import "./AdminBranchDashboard.css";
/* ─── Corporate light tokens ──────────────────────────────────────── */
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

/* ─── Category accent colors ─────────────────────────────────────── */
const CAT = {
  "ENGINE REPAIR":    { bar: "#2563EB", text: "#1E40AF" },
  "GEAR BOX":         { bar: "#DC2626", text: "#B91C1C" },
  "ELECTRICAL":       { bar: "#D97706", text: "#B45309" },
  "BODY WORK":        { bar: "#16A34A", text: "#15803D" },
  "DIFFERENTIAL":     { bar: "#DB2777", text: "#BE185D" },
  "TRANSMISSION":     { bar: "#7C3AED", text: "#6D28D9" },
  "AC & COOLING":     { bar: "#0891B2", text: "#0E7490" },
  "EATS FLUSHING":    { bar: "#92400E", text: "#78350F" },
  "GENERAL SERVICE":  { bar: "#EA580C", text: "#C2410C" },
  "SCHEDULE SERVICE": { bar: "#374151", text: "#1F2937" },
};

/* ─── Stat definitions ───────────────────────────────────────────── */
const STATS = [
  { key: "technicianCount",       label: "Technicians",      unit: "",        accent: C.navy    },
  { key: "totalEntries",          label: "Job Cards",         unit: "total",   accent: "#1E40AF" },
  { key: "totalHours",            label: "Hours Worked",      unit: "hrs",     accent: C.success },
  { key: "avgHoursPerTechnician", label: "Avg Hours / Tech",  unit: "hrs avg", accent: "#15803D" },
  { key: "totalLabour",           label: "Total Labour",      unit: "",        accent: C.amber   },
  { key: "totalIncentives",       label: "Incentives Paid",   unit: "",        accent: "#B45309" },
  { key: "totalLeaveDays",        label: "Leave Days",        unit: "days",    accent: C.muted   },
];

/* ─── Month helpers ──────────────────────────────────────────────── */
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/**
 * currentMonthParam()
 * Returns current month as "YYYY-MM" string using local time.
 * Sent to the backend as ?month=YYYY-MM — backend builds the UTC
 * date range for the full calendar month from this.
 */
const currentMonthParam = () => {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

/**
 * monthLabel("2025-06") → "June 2025"
 */
const monthLabel = (param) => {
  const [y, m] = param.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

/* ─── Stat card ──────────────────────────────────────────────────── */
function StatCard({ label, value, unit, accent }) {
  return (
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
      {unit && (
        <div style={{
          fontSize: "9px", fontWeight: "600", letterSpacing: "0.12em",
          textTransform: "uppercase", color: C.dim,
        }}>{unit}</div>
      )}
    </div>
  );
}

/* ─── NAFROK loader ──────────────────────────────────────────────── */
function NafrokLoader({ label }) {
  return (
    <div className="ab-nafrok-loader">
      <div className="ab-nafrok-wordmark">
        <div className="ab-nafrok-dot" />
        <span className="ab-nafrok-text">Powered by NAFROK</span>
        <div className="ab-nafrok-dot" />
      </div>
      <div className="ab-nafrok-track">
        <div className="ab-nafrok-bar" />
      </div>
      {label && (
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: "9px", fontWeight: "600", letterSpacing: "0.18em",
          textTransform: "uppercase", color: C.dim,
        }}>{label}</div>
      )}
    </div>
  );
}

/* ─── Format helpers ─────────────────────────────────────────────── */
const fmtStat = (key, v) => {
  if (key === "totalLabour" || key === "totalIncentives")
    return `₹${Number(v).toLocaleString("en-IN")}`;
  return Number(v).toLocaleString("en-IN");
};

/* ─── Session key for persisting selected branch ─────────────────── */
const BRANCH_KEY = "aml_selected_branch";

/* ─── Main ───────────────────────────────────────────────────────── */
export default function AdminBranchDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isSuperAdmin  = user?.role === "superadmin";
  const isBranchAdmin = user?.role === "admin";

  /* Current month param — computed once on mount, stable for the session.
     A new calendar month always means a fresh page load anyway. */
  const [monthParam] = useState(currentMonthParam);

  const [branches, setBranches] = useState([]);

  /* Restore last selected branch from sessionStorage on mount */
  const [selected, setSelected] = useState(() => {
    if (isBranchAdmin) return user?.branch || "";
    return sessionStorage.getItem(BRANCH_KEY) || "";
  });

  const [stats,    setStats]    = useState(null);
  const [loadingB, setLoadingB] = useState(isSuperAdmin);
  const [loadingS, setLoadingS] = useState(false);

  /* Persist branch selection so navigating back restores it */
  const handleSelectBranch = (b) => {
    sessionStorage.setItem(BRANCH_KEY, b);
    setSelected(b);
  };

  /* fetch branch list — superadmin only */
  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/api/admin/branches")
      .then(r => {
        setBranches(r.data);
        const stored = sessionStorage.getItem(BRANCH_KEY);
        if (stored && r.data.includes(stored)) {
          /* restore previously selected branch */
          setSelected(stored);
        } else if (r.data.length) {
          /* fallback to first branch and persist it */
          sessionStorage.setItem(BRANCH_KEY, r.data[0]);
          setSelected(r.data[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingB(false));
  }, [isSuperAdmin]);

  /* fetch stats — scoped to current calendar month via ?month=YYYY-MM */
  useEffect(() => {
    if (!selected) return;
    setLoadingS(true); setStats(null);
    api.get(`/api/admin/branch/${encodeURIComponent(selected)}`, {
      params: { month: monthParam },
    })
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoadingS(false));
  }, [selected, monthParam]);

  return (
    <div style={{
      minHeight: "100dvh",
      background: C.pageBg,
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <Navbar />

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 64px" }}>

        {/* ── Page header ── */}
        <div className="ab-a1" style={{
          marginBottom: "28px",
          paddingBottom: "24px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: "9px", fontWeight: "700", letterSpacing: "0.22em",
            textTransform: "uppercase", color: C.navy, marginBottom: "6px",
          }}>
            {isSuperAdmin ? "Super Admin" : "Branch Admin"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "36px", fontWeight: "700", color: C.ink,
              letterSpacing: "0.04em", textTransform: "uppercase",
              margin: 0, lineHeight: 1,
            }}>Branch Dashboard</h1>
            {selected && !loadingS && stats && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px", color: C.navy, fontWeight: "600",
                letterSpacing: "0.06em", background: "#EEF2F7",
                border: `1px solid ${C.border}`, padding: "2px 8px",
              }}>
                {stats.technicianCount} tech{stats.technicianCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p style={{
            fontSize: "13px", color: C.muted,
            marginTop: "6px", fontWeight: "300", fontStyle: "italic",
          }}>
            {isSuperAdmin
              ? "Performance overview · All branches"
              : `Performance overview · ${user?.branch || ""} branch`}
          </p>
        </div>

        {/* ── Branch selector — SUPERADMIN ONLY ── */}
        {isSuperAdmin && (
          <div className="ab-a2">
            {loadingB ? (
              <NafrokLoader label="Fetching branches…" />
            ) : branches.length === 0 ? (
              <div style={{
                background: C.card, border: `1px solid ${C.border}`,
                padding: "48px", textAlign: "center", color: C.muted, fontSize: "13px",
              }}>
                No branches found. Technicians need to complete profile setup first.
              </div>
            ) : (
              <div style={{ marginBottom: "28px" }}>
                <div style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                  color: C.dim, textTransform: "uppercase", marginBottom: "10px",
                }}>Select Branch</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {branches.map(b => (
                    <button
                      key={b}
                      onClick={() => handleSelectBranch(b)}
                      className={`ab-branch-pill${selected === b ? " active" : ""}`}
                    >{b}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Branch badge — BRANCH ADMIN ONLY ── */}
        {isBranchAdmin && selected && (
          <div className="ab-a2" style={{ marginBottom: "28px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "12px",
              background: C.card, border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.navy}`, padding: "12px 18px",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: C.navy, flexShrink: 0,
              }} />
              <span style={{
                fontSize: "10px", fontWeight: "700", letterSpacing: "0.16em",
                textTransform: "uppercase", color: C.navy,
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}>
                {selected} Branch
              </span>
            </div>
          </div>
        )}

        {/* ── Stats section ── */}
        {selected && (
          loadingS ? (
            <NafrokLoader label={`Loading ${selected}…`} />
          ) : stats ? (
            <>
              {/* Action row */}
              <div className="ab-a3 ab-action-row" style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: C.dim,
                }}>
                  <div style={{ width: "3px", height: "14px", background: C.navy, flexShrink: 0 }} />
                  {/* Month clearly labelled so admins always know the scope */}
                  Performance Metrics · {selected} · {monthLabel(monthParam)}
                </div>
                <button
                  className="ab-view-btn"
                  onClick={() => navigate(`/admin/branch/${encodeURIComponent(selected)}`)}
                >
                  View Technicians →
                </button>
              </div>

              {/* Stat grid */}
              <div className="ab-a3 ab-stat-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "1px", background: C.border,
                border: `1px solid ${C.border}`,
                marginBottom: "24px",
              }}>
                {STATS.map(({ key, label, unit, accent }) =>
                  stats[key] !== undefined ? (
                    <StatCard key={key} label={label} value={fmtStat(key, stats[key])} unit={unit} accent={accent} />
                  ) : null
                )}
              </div>

              {/* Category breakdown */}
              {stats.categoryBreakdown?.length > 0 && (
                <div className="ab-a4" style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  padding: "24px",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: "24px",
                  }}>
                    <div style={{
                      fontSize: "9px", fontWeight: "700", letterSpacing: "0.2em",
                      textTransform: "uppercase", color: C.muted,
                    }}>Category Breakdown</div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px", color: C.dim, fontWeight: "600",
                    }}>
                      {stats.categoryBreakdown.reduce((a, c) => a + c.count, 0)} entries
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {stats.categoryBreakdown.map(({ _id, count }) => {
                      const max      = stats.categoryBreakdown[0].count;
                      const pct      = Math.round((count / max) * 100);
                      const total    = stats.categoryBreakdown.reduce((a, c) => a + c.count, 0);
                      const sharePct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                      const cat      = CAT[_id] || { bar: C.navy, text: C.navy };

                      return (
                        <div key={_id}>
                          <div style={{
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: "9px",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "8px", height: "8px", flexShrink: 0,
                                background: cat.bar,
                              }} />
                              <span style={{
                                fontSize: "13px", color: C.mid, fontWeight: "500",
                                fontFamily: "'IBM Plex Sans', sans-serif",
                              }}>{_id}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                              <span style={{ fontSize: "11px", color: C.muted }}>{sharePct}%</span>
                              <span style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: "14px", fontWeight: "700", color: cat.text,
                                minWidth: "28px", textAlign: "right",
                              }}>{count}</span>
                            </div>
                          </div>
                          <div style={{ height: "4px", background: "#EEF2F7", overflow: "hidden" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%",
                              background: cat.bar,
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