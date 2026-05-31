import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";

const C = {
  bg:     "#09090E", surface: "#111119", card: "#16161F",
  border: "#23232F", border2: "#1A1A25",
  text:   "#E2E2EE", muted:   "#60607A", dim:  "#30304A",
  blue:   "#4C70F5", blueL:  "#7A98F8",
  green:  "#10C090", greenL: "#4DD8B6",
  amber:  "#E8A000",
  red:    "#E04848",
};

const RANK = [
  { label: "#1", color: "#E8A000" },
  { label: "#2", color: "#888898" },
  { label: "#3", color: "#C07040" },
];

export default function AdminTechnicianList() {
  const { branch } = useParams();
  const navigate   = useNavigate();

  const [technicians, setTechnicians] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");   // ← handles 403 + other errors
  const [search,      setSearch]      = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get(`/api/admin/branch/${encodeURIComponent(branch)}/technicians`)
      .then(r => setTechnicians(r.data))
      .catch(err => {
        /**
         * 403 means a branch admin tried to access a branch that is not theirs.
         * This can happen if they manually edit the URL. Show a clear message
         * instead of a silent empty list.
         */
        if (err.response?.status === 403) {
          setError("Access denied: This branch is not assigned to your account. Please contact your developer.");
        } else {
          setError("Failed to load technicians. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [branch]);

  const sorted   = [...technicians].sort((a, b) => b.totalLabour - a.totalLabour);
  const rankOf   = (t) => sorted.findIndex(x => x.id === t.id);

  const filtered = technicians.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.technicianId?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      minHeight: "100dvh", background: C.bg,
      fontFamily: "'IBM Plex Sans', sans-serif", color: C.text,
    }}>
      <Navbar />

      <div style={{ padding: "20px 16px 64px", maxWidth: "600px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={() => navigate("/admin")}
            style={{
              background: "transparent", border: "none",
              color: C.dim, fontSize: "11px", cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              letterSpacing: "0.10em", textTransform: "uppercase",
              padding: "0", marginBottom: "16px",
              display: "flex", alignItems: "center", gap: "6px",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ← Branches
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: "30px", fontWeight: "800", margin: 0,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.05em", textTransform: "uppercase", color: "#FFFFFF",
            }}>{branch}</h1>
            {!loading && !error && (
              <span style={{
                fontSize: "10px", fontWeight: "700", color: C.muted,
                letterSpacing: "0.14em", textTransform: "uppercase",
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: "4px", padding: "3px 8px",
              }}>
                {technicians.length} Technician{technicians.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── Search ── */}
        {!loading && !error && technicians.length > 2 && (
          <div style={{ marginBottom: "20px", position: "relative" }}>
            <span style={{
              position: "absolute", left: "13px", top: "50%",
              transform: "translateY(-50%)",
              fontSize: "14px", color: C.dim, pointerEvents: "none",
            }}>⌕</span>
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: "8px", color: C.text, fontSize: "14px",
                padding: "12px 40px 12px 36px",
                fontFamily: "'IBM Plex Sans', sans-serif", outline: "none", height: "46px",
              }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute", right: "12px", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none",
                  color: C.muted, cursor: "pointer", fontSize: "18px",
                  lineHeight: 1, padding: "0", WebkitTapHighlightColor: "transparent",
                }}
              >×</button>
            )}
          </div>
        )}

        {/* ── States ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: C.dim }}>
            <div style={{
              width: "24px", height: "24px",
              border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`,
              borderRadius: "50%", margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Loading…
            </p>
          </div>

        ) : error ? (
          /**
           * Error state — shown for 403 (branch mismatch) and other failures.
           * The message is already specific from the catch block above.
           */
          <div style={{
            background: "rgba(224,72,72,0.06)", border: `1px solid rgba(224,72,72,0.25)`,
            borderRadius: "4px", padding: "32px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🔒</div>
            <p style={{ fontSize: "14px", color: C.red, fontWeight: "600", marginBottom: "8px" }}>
              Access Denied
            </p>
            <p style={{ fontSize: "12px", color: C.muted, lineHeight: 1.6 }}>
              {error}
            </p>
            <button
              onClick={() => navigate("/admin")}
              style={{
                marginTop: "20px", padding: "8px 20px",
                background: "transparent", border: `1px solid ${C.border}`,
                borderRadius: "3px", color: C.muted,
                fontSize: "11px", fontWeight: "600", letterSpacing: "0.10em",
                textTransform: "uppercase", cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              ← Back to Dashboard
            </button>
          </div>

        ) : technicians.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: "12px", padding: "48px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>👷</div>
            <p style={{ fontSize: "14px", color: C.muted, fontWeight: "600" }}>
              No technicians yet
            </p>
            <p style={{ fontSize: "12px", color: C.dim, marginTop: "6px" }}>
              Technicians must complete profile setup to appear here.
            </p>
          </div>

        ) : filtered.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: "12px", padding: "40px 20px", textAlign: "center",
          }}>
            <p style={{ fontSize: "13px", color: C.muted }}>No match for "{search}"</p>
          </div>

        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map(tech => {
              const ri = rankOf(tech);
              const r  = ri <= 2 ? RANK[ri] : null;

              return (
                <div
                  key={tech.id}
                  onClick={() => navigate(`/admin/technician/${tech.id}`)}
                  style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: "12px", padding: "16px",
                    cursor: "pointer", WebkitTapHighlightColor: "transparent",
                    transition: "border-color 0.15s, background 0.15s",
                    touchAction: "manipulation",
                  }}
                  onTouchStart={e => {
                    e.currentTarget.style.background    = "rgba(76,112,245,0.06)";
                    e.currentTarget.style.borderColor   = C.blue;
                  }}
                  onTouchEnd={e => {
                    e.currentTarget.style.background    = C.card;
                    e.currentTarget.style.borderColor   = C.border;
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor   = C.blue;
                    e.currentTarget.style.background    = "rgba(76,112,245,0.04)";
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor   = C.border;
                    e.currentTarget.style.background    = C.card;
                  }}
                >
                  {/* Top row */}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: "14px",
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{
                          fontSize: "18px", fontWeight: "700", color: "#FFFFFF",
                          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{tech.name}</span>
                        {r && (
                          <span style={{
                            fontSize: "9px", fontWeight: "800", letterSpacing: "0.12em",
                            color: r.color, background: `${r.color}18`,
                            border: `1px solid ${r.color}40`, borderRadius: "3px",
                            padding: "2px 5px", flexShrink: 0,
                          }}>{r.label}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: "11px", color: C.blue,
                        fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
                      }}>{tech.technicianId}</span>
                    </div>
                    <span style={{
                      color: C.dim, fontSize: "18px",
                      marginLeft: "12px", flexShrink: 0, lineHeight: 1, marginTop: "2px",
                    }}>›</span>
                  </div>

                  {/* Stats row */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px", paddingTop: "12px", borderTop: `1px solid ${C.border2}`,
                  }}>
                    {[
                      { label: "Entries", value: tech.totalEntries?.toLocaleString("en-IN") ?? "0",             color: C.text   },
                      { label: "Hours",   value: tech.totalHours?.toLocaleString("en-IN")   ?? "0",             color: C.greenL },
                      { label: "Labour",  value: `₹${Number(tech.totalLabour || 0).toLocaleString("en-IN")}`,   color: C.amber  },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div style={{
                          fontSize: "9px", fontWeight: "700", letterSpacing: "0.12em",
                          textTransform: "uppercase", color: C.dim, marginBottom: "4px",
                        }}>{label}</div>
                        <div style={{
                          fontSize: "15px", fontWeight: "700", color,
                          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.02em",
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
        {!loading && !error && filtered.length > 0 && search && (
          <p style={{
            fontSize: "11px", color: C.dim, marginTop: "14px",
            letterSpacing: "0.08em", textAlign: "right",
          }}>
            {filtered.length} of {technicians.length} technicians
          </p>
        )}
      </div>
    </div>
  );
}