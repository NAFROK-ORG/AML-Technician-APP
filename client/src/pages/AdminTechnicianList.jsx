import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";

/* ─── Design tokens ─────────────────────────────────────────────────── */
const C = {
  bg:     "#09090E", surface: "#111119", card: "#16161F",
  border: "#23232F", border2: "#1A1A25",
  text:   "#E2E2EE", muted:   "#60607A", dim:  "#30304A",
  blue:   "#4C70F5", blueL:  "#7A98F8",
  green:  "#10C090", greenL: "#4DD8B6",
  amber:  "#E8A000",
};

/* ─── Main ──────────────────────────────────────────────────────────── */
export default function AdminTechnicianList() {
  const { branch } = useParams();
  const navigate    = useNavigate();

  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");

  useEffect(() => {
    api.get(`/api/admin/branch/${encodeURIComponent(branch)}/technicians`)
      .then(r => setTechnicians(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [branch]);

  const filtered = technicians.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.technicianId?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* rank label helper */
  const rank = (t) => {
    const i = [...technicians]
      .sort((a, b) => b.totalLabour - a.totalLabour)
      .findIndex(x => x.id === t.id);
    if (i === 0) return { label: "#1", color: "#E8A000" };
    if (i === 1) return { label: "#2", color: "#888898" };
    if (i === 2) return { label: "#3", color: "#C07040" };
    return null;
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: C.text }}>
      <Navbar />

      <div style={{ padding: "28px 16px 48px", maxWidth: "960px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "28px", borderBottom: `1px solid ${C.border2}`, paddingBottom: "24px" }}>
          <button
            onClick={() => navigate("/admin")}
            style={{
              background: "transparent", border: "none",
              color: C.dim, fontSize: "11px", cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              letterSpacing: "0.10em", textTransform: "uppercase",
              padding: "0", marginBottom: "14px",
              display: "flex", alignItems: "center", gap: "6px",
              transition: "color 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.color = C.muted}
            onMouseOut={e => e.currentTarget.style.color = C.dim}
          >
            ← Branches
          </button>

          <div style={{ display: "flex", alignItems: "baseline", gap: "14px", flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: "28px", fontWeight: "800", margin: 0,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>{branch}</h1>
            <span style={{
              fontSize: "11px", fontWeight: "700", color: C.muted,
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              {loading ? "…" : `${technicians.length} Technician${technicians.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* ── Search ── */}
        {!loading && technicians.length > 2 && (
          <div style={{ marginBottom: "20px", position: "relative" }}>
            <div style={{
              position: "absolute", left: "14px", top: "50%",
              transform: "translateY(-50%)",
              fontSize: "12px", color: C.dim, pointerEvents: "none",
            }}>⌕</div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, or email…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: "4px", color: C.text, fontSize: "13px",
                padding: "11px 14px 11px 34px",
                fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
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
                  color: C.muted, cursor: "pointer", fontSize: "16px",
                  lineHeight: 1, padding: "0",
                }}
              >×</button>
            )}
          </div>
        )}

        {/* ── Table header (desktop hint) ── */}
        {!loading && filtered.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr repeat(3, 80px) 24px",
            gap: "8px",
            padding: "0 18px 8px",
            borderBottom: `1px solid ${C.border2}`,
            marginBottom: "6px",
          }}>
            <span style={{
              fontSize: "9px", fontWeight: "700", letterSpacing: "0.14em",
              textTransform: "uppercase", color: C.dim,
            }}>Technician</span>
            {["Entries","Hours","Labour"].map(h => (
              <span key={h} style={{
                fontSize: "9px", fontWeight: "700", letterSpacing: "0.14em",
                textTransform: "uppercase", color: C.dim, textAlign: "center",
              }}>{h}</span>
            ))}
            <span />
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: C.dim }}>
            <div style={{ width: "1px", height: "32px", background: C.blue, margin: "0 auto 16px", opacity: 0.6 }} />
            <p style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Loading technicians…
            </p>
          </div>
        ) : technicians.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px",
            padding: "64px 20px", textAlign: "center",
          }}>
            <p style={{ fontSize: "14px", color: C.muted }}>No technicians in this branch yet.</p>
            <p style={{ fontSize: "12px", color: C.dim, marginTop: "6px" }}>
              Technicians must complete their profile setup to appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px",
            padding: "40px 20px", textAlign: "center",
          }}>
            <p style={{ fontSize: "13px", color: C.muted }}>No match for "{search}"</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {filtered.map(tech => {
              const r = rank(tech);
              return (
                <div
                  key={tech.id}
                  onClick={() => navigate(`/admin/technician/${tech.id}`)}
                  style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: "4px", padding: "14px 18px",
                    cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                    display: "grid",
                    gridTemplateColumns: "1fr repeat(3, 80px) 24px",
                    alignItems: "center", gap: "8px",
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = C.blue;
                    e.currentTarget.style.background = "rgba(76,112,245,0.04)";
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.background = C.card;
                  }}
                >
                  {/* Identity */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        fontSize: "15px", fontWeight: "700", color: C.text,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        letterSpacing: "0.04em",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{tech.name}</span>
                      {r && (
                        <span style={{
                          fontSize: "9px", fontWeight: "800",
                          letterSpacing: "0.10em", color: r.color,
                          flexShrink: 0,
                        }}>{r.label}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "2px", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "11px", color: C.blue,
                        fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em",
                      }}>{tech.technicianId}</span>
                      <span style={{ fontSize: "11px", color: C.dim }}>
                        {tech.email}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  {[
                    { value: tech.totalEntries?.toLocaleString("en-IN"), color: C.text },
                    { value: tech.totalHours?.toLocaleString("en-IN"),   color: C.greenL },
                    { value: `₹${Number(tech.totalLabour || 0).toLocaleString("en-IN")}`, color: C.amber },
                  ].map(({ value, color }, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <span style={{
                        fontSize: "14px", fontWeight: "700",
                        color, fontFamily: "'Barlow Condensed', sans-serif",
                        letterSpacing: "0.02em",
                      }}>{value}</span>
                    </div>
                  ))}

                  {/* Arrow */}
                  <span style={{ color: C.dim, fontSize: "14px", textAlign: "right" }}>›</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer count ── */}
        {!loading && filtered.length > 0 && search && (
          <p style={{
            fontSize: "11px", color: C.dim, marginTop: "12px",
            letterSpacing: "0.08em", textAlign: "right",
          }}>
            {filtered.length} of {technicians.length} technicians
          </p>
        )}
      </div>
    </div>
  );
}