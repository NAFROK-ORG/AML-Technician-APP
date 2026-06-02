import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { TECHNICIAN_TYPES } from "../utils/constants";

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

const RANK_COLORS = ["#B45309", "#6B7A99", "#92400E"];

// Badge color per type — consistent across admin UI
const TYPE_STYLE = {
  "MECHANIC":           { color: "#1E3A8A", bg: "#EEF2F7", border: "#BFDBFE" },
  "MECHANIC HELPER":    { color: "#0369A1", bg: "#E0F2FE", border: "#BAE6FD" },
  "ELECTRICIAN":        { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  "ELECTRICIAN HELPER": { color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE" },
};

const FILTER_OPTIONS = ["ALL", ...TECHNICIAN_TYPES, "PENDING"];

const INJECTED = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes alFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .al-a1 { animation: alFadeUp 0.28s ease both 0.00s; }
  .al-a2 { animation: alFadeUp 0.28s ease both 0.06s; }
  .al-a3 { animation: alFadeUp 0.28s ease both 0.10s; }

  @keyframes spin { to { transform: rotate(360deg); } }

  .al-tech-card {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    border-left: 3px solid transparent;
    padding: 18px 20px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .al-tech-card:hover {
    border-left-color: #1E3A8A;
    box-shadow: 0 2px 8px rgba(30,58,138,0.08);
  }

  .al-search-wrap { position: relative; margin-bottom: 12px; }
  .al-search-icon {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%);
    font-size: 15px; color: #94A3B8; pointer-events: none;
  }
  .al-search-input {
    width: 100%; box-sizing: border-box;
    background: #FFFFFF; border: 1px solid #DDE3EE; border-radius: 0;
    color: #0A1628; font-size: 14px;
    padding: 12px 40px 12px 38px;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none; height: 48px;
    transition: border-color 0.15s;
  }
  .al-search-input:focus { border-color: #1E3A8A; border-width: 1.5px; }
  .al-search-clear {
    position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none; color: #94A3B8;
    cursor: pointer; font-size: 18px; line-height: 1; padding: 0;
    -webkit-tap-highlight-color: transparent;
  }

  /* Type filter pills */
  .al-filter-strip {
    display: flex; gap: 6px; overflow-x: auto;
    padding-bottom: 4px; margin-bottom: 20px;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .al-filter-strip::-webkit-scrollbar { display: none; }
  .al-filter-pill {
    flex-shrink: 0;
    padding: 5px 10px;
    border: 1.5px solid #DDE3EE;
    background: #F8FAFC;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #6B7A99; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }
  .al-filter-pill:hover { border-color: #1E3A8A; color: #1E3A8A; }
  .al-filter-pill.active {
    background: #1E3A8A; border-color: #1E3A8A;
    color: #FFFFFF;
  }
  .al-filter-pill.pending-pill { border-color: #FDE68A; color: #D97706; background: #FEF3C7; }
  .al-filter-pill.pending-pill.active { background: #D97706; border-color: #D97706; color: #FFFFFF; }

  .al-back-btn {
    background: transparent; border: none; color: #94A3B8;
    font-size: 10px; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    letter-spacing: 0.14em; text-transform: uppercase;
    padding: 0; margin-bottom: 18px;
    display: flex; align-items: center; gap: 6px;
    transition: color 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .al-back-btn:hover { color: #1E3A8A; }

  @media (max-width: 480px) {
    .al-tech-stats { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;

export default function AdminTechnicianList() {
  const { branch } = useParams();
  const navigate   = useNavigate();

  const [technicians, setTechnicians] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("ALL"); // ← NEW

  useEffect(() => {
    const id = "al-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = INJECTED;
      document.head.appendChild(el);
    }
    return () => { const el = document.getElementById(id); if (el) document.head.removeChild(el); };
  }, []);

  useEffect(() => {
    setLoading(true); setError("");
    api.get(`/api/admin/branch/${encodeURIComponent(branch)}/technicians`)
      .then(r => setTechnicians(r.data))
      .catch(err => {
        if (err.response?.status === 403) {
          setError("Access denied: This branch is not assigned to your account.");
        } else {
          setError("Failed to load technicians. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [branch]);

  const sorted = [...technicians].sort((a, b) => b.totalLabour - a.totalLabour);
  const rankOf = (t) => sorted.findIndex(x => x.id === t.id);

  // Apply search then type filter
  const afterSearch = technicians.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.technicianId?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = afterSearch.filter(t => {
    if (typeFilter === "ALL")     return true;
    if (typeFilter === "PENDING") return !t.technicianType;
    return t.technicianType === typeFilter;
  });

  // Count per type for pill badges
  const countFor = (f) => {
    if (f === "ALL")     return technicians.length;
    if (f === "PENDING") return technicians.filter(t => !t.technicianType).length;
    return technicians.filter(t => t.technicianType === f).length;
  };

  return (
    <div style={{
      minHeight: "100dvh", background: C.pageBg,
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <Navbar />

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 16px 64px" }}>

        {/* Header */}
        <div className="al-a1">
          <button className="al-back-btn" onClick={() => navigate("/admin")}>
            ← Branches
          </button>
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            flexWrap: "wrap", marginBottom: "24px",
            paddingBottom: "20px", borderBottom: `1px solid ${C.border}`,
          }}>
            <div>
              <div style={{
                fontSize: "9px", fontWeight: "700", letterSpacing: "0.2em",
                textTransform: "uppercase", color: C.navy, marginBottom: "4px",
              }}>Branch</div>
              <h1 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "36px", fontWeight: "700", color: C.ink,
                letterSpacing: "0.04em", textTransform: "uppercase",
                margin: 0, lineHeight: 1,
              }}>{branch}</h1>
            </div>
            {!loading && !error && (
              <div style={{
                marginLeft: "auto",
                background: C.cardAlt, border: `1px solid ${C.border}`,
                padding: "8px 14px",
                display: "flex", flexDirection: "column", alignItems: "flex-end",
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "22px", fontWeight: "700", color: C.ink, lineHeight: 1,
                }}>{technicians.length}</div>
                <div style={{
                  fontSize: "8px", fontWeight: "700", letterSpacing: "0.16em",
                  textTransform: "uppercase", color: C.dim, marginTop: "2px",
                }}>Technicians</div>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        {!loading && !error && technicians.length > 2 && (
          <div className="al-a2 al-search-wrap">
            <span className="al-search-icon">⌕</span>
            <input
              type="text"
              className="al-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, or email…"
            />
            {search && (
              <button className="al-search-clear" onClick={() => setSearch("")}>×</button>
            )}
          </div>
        )}

        {/* Type filter pills — NEW */}
        {!loading && !error && technicians.length > 0 && (
          <div className="al-filter-strip al-a2">
            {FILTER_OPTIONS.map((f) => {
              const count = countFor(f);
              if (count === 0 && f !== "ALL") return null; // hide empty filters
              return (
                <button
                  key={f}
                  className={`al-filter-pill${f === "PENDING" ? " pending-pill" : ""}${typeFilter === f ? " active" : ""}`}
                  onClick={() => setTypeFilter(f)}
                >
                  {f} <span style={{ opacity: 0.7, marginLeft: "3px" }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* States */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: "24px", height: "24px",
              border: `2px solid ${C.border}`, borderTop: `2px solid ${C.navy}`,
              borderRadius: "50%", margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{
              fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
              fontWeight: "700", color: C.dim,
            }}>Loading…</p>
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
            <p style={{ fontSize: "13px", color: "#991B1B", lineHeight: 1.6, fontWeight: "400" }}>
              {error}
            </p>
            <button
              onClick={() => navigate("/admin")}
              style={{
                marginTop: "16px", padding: "10px 20px",
                background: "transparent", border: `1px solid ${C.border}`,
                borderRadius: "0", color: C.muted,
                fontSize: "10px", fontWeight: "700", letterSpacing: "0.14em",
                textTransform: "uppercase", cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >← Back to Dashboard</button>
          </div>

        ) : technicians.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            padding: "56px 20px", textAlign: "center",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "20px", fontWeight: "700", letterSpacing: "0.08em",
              textTransform: "uppercase", color: C.dim, marginBottom: "6px",
            }}>No Technicians Yet</div>
            <p style={{ color: C.dim, fontSize: "13px", fontWeight: "400", margin: 0 }}>
              Technicians must complete profile setup to appear here.
            </p>
          </div>

        ) : filtered.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            padding: "40px 20px", textAlign: "center",
          }}>
            <p style={{ fontSize: "13px", color: C.muted }}>
              {search ? `No match for "${search}"` : `No technicians in this filter`}
            </p>
          </div>

        ) : (
          <div className="al-a3" style={{
            display: "flex", flexDirection: "column", gap: "1px",
            background: C.border, border: `1px solid ${C.border}`,
          }}>
            {filtered.map(tech => {
              const ri        = rankOf(tech);
              const rankColor = ri <= 2 ? RANK_COLORS[ri] : null;
              const typeStyle = tech.technicianType ? TYPE_STYLE[tech.technicianType] : null;

              return (
                <div
                  key={tech.id}
                  className="al-tech-card"
                  onClick={() => navigate(`/admin/technician/${tech.id}`)}
                >
                  {/* Top row */}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: "12px",
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Name + rank */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                        {rankColor && (
                          <span style={{
                            fontSize: "9px", fontWeight: "700", letterSpacing: "0.12em",
                            color: rankColor, background: `${rankColor}18`,
                            border: `1px solid ${rankColor}50`, padding: "2px 6px",
                          }}>#{ri + 1}</span>
                        )}
                        <span style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: "22px", fontWeight: "700", color: C.ink,
                          letterSpacing: "0.03em", lineHeight: 1,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{tech.name}</span>
                      </div>

                      {/* Technician ID */}
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "11px", color: C.navy, fontWeight: "600",
                        letterSpacing: "0.08em", display: "block", marginBottom: "5px",
                      }}>{tech.technicianId}</span>

                      {/* Email + type badge on same row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", color: C.dim }}>{tech.email}</span>

                        {/* Type badge — NEW */}
                        {tech.technicianType ? (
                          <span style={{
                            fontSize: "8px", fontWeight: "700", letterSpacing: "0.12em",
                            textTransform: "uppercase", padding: "2px 7px",
                            color:       typeStyle.color,
                            background:  typeStyle.bg,
                            border:      `1px solid ${typeStyle.border}`,
                          }}>
                            {tech.technicianType}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: "8px", fontWeight: "700", letterSpacing: "0.12em",
                            textTransform: "uppercase", padding: "2px 7px",
                            color: "#D97706", background: "#FEF3C7",
                            border: "1px solid #FDE68A",
                          }}>
                            ⚠ PENDING TYPE
                          </span>
                        )}
                      </div>
                    </div>

                    <span style={{
                      color: C.dim, fontSize: "20px", marginLeft: "12px",
                      flexShrink: 0, lineHeight: 1, marginTop: "4px",
                    }}>›</span>
                  </div>

                  {/* Stats row */}
                  <div className="al-tech-stats" style={{
                    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "1px", background: C.border, border: `1px solid ${C.border}`,
                  }}>
                    {[
                      { label: "Entries", value: tech.totalEntries?.toLocaleString("en-IN") ?? "0",           color: C.ink    },
                      { label: "Hours",   value: (tech.totalHours?.toLocaleString("en-IN") ?? "0") + " hrs",  color: C.success },
                      { label: "Labour",  value: `₹${Number(tech.totalLabour || 0).toLocaleString("en-IN")}`, color: C.amber   },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{
                        background: C.cardAlt, padding: "10px 8px", textAlign: "center",
                      }}>
                        <div style={{
                          fontSize: "8px", fontWeight: "700", letterSpacing: "0.14em",
                          textTransform: "uppercase", color: C.dim, marginBottom: "5px",
                        }}>{label}</div>
                        <div style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: "18px", fontWeight: "700", color, letterSpacing: "0.02em",
                        }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {!loading && !error && filtered.length > 0 && (search || typeFilter !== "ALL") && (
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px", color: C.dim, marginTop: "12px",
            letterSpacing: "0.06em", textAlign: "right",
          }}>
            {filtered.length} / {technicians.length} technicians
          </p>
        )}
      </div>
    </div>
  );
}