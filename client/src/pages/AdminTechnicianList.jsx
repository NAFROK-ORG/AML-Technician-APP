import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { BRANCHES, TECHNICIAN_TYPES } from "../utils/constants";

/* ─── Design tokens ──────────────────────────────────────────────── */
const C = {
  pageBg:  "#EEF2F7",
  card:    "#FFFFFF",
  cardAlt: "#F8FAFC",
  border:  "#DDE3EE",
  navy:    "#1E3A8A",
  ink:     "#0A1628",
  mid:     "#374151",
  muted:   "#6B7A99",
  dim:     "#94A3B8",
  success: "#16A34A",
  danger:  "#DC2626",
  amber:   "#D97706",
};

const RANK_COLORS = ["#B45309", "#6B7A99", "#92400E"];

const TYPE_STYLE = {
  "MECHANIC":           { color: "#1E3A8A", bg: "#EEF2F7", border: "#BFDBFE" },
  "MECHANIC HELPER":    { color: "#0369A1", bg: "#E0F2FE", border: "#BAE6FD" },
  "ELECTRICIAN":        { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  "ELECTRICIAN HELPER": { color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE" },
};

const FILTER_OPTIONS = ["ALL", ...TECHNICIAN_TYPES, "PENDING"];

const SORT_OPTIONS = [
  { key: "labour",  label: "Labour",  symbol: "₹", color: "#D97706" },
  { key: "hours",   label: "Hours",   symbol: "⏱", color: "#16A34A" },
  { key: "entries", label: "Entries", symbol: "#", color: "#1E3A8A" },
];

/* ─── Month helpers ──────────────────────────────────────────────── */
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentMonthParam = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (param) => {
  const [y, m] = param.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

/* ─── Injected styles ────────────────────────────────────────────── */
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

  .al-filter-strip {
    display: flex; gap: 6px; overflow-x: auto;
    padding-bottom: 4px; margin-bottom: 20px;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .al-filter-strip::-webkit-scrollbar { display: none; }

  .al-filter-pill {
    flex-shrink: 0; padding: 5px 10px;
    border: 1.5px solid #DDE3EE; background: #F8FAFC;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #6B7A99; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent; white-space: nowrap;
  }
  .al-filter-pill:hover { border-color: #1E3A8A; color: #1E3A8A; }
  .al-filter-pill.active { background: #1E3A8A; border-color: #1E3A8A; color: #FFFFFF; }
  .al-filter-pill.pending-pill { border-color: #FDE68A; color: #D97706; background: #FEF3C7; }
  .al-filter-pill.pending-pill.active { background: #D97706; border-color: #D97706; color: #FFFFFF; }

  /* ── Sort pills ── */
  .al-sort-strip {
    display: flex; gap: 6px; align-items: center;
    flex-wrap: nowrap; overflow-x: auto;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .al-sort-strip::-webkit-scrollbar { display: none; }

  .al-sort-pill {
    flex-shrink: 0;
    display: flex; align-items: center; gap: 5px;
    padding: 6px 11px;
    border: 1.5px solid #DDE3EE; background: #F8FAFC;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #6B7A99; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent; white-space: nowrap;
  }
  .al-sort-pill:hover { border-color: #1E3A8A; color: #1E3A8A; background: #EEF2F7; }
  .al-sort-pill.active-labour  { background: #FFFBEB; border-color: #D97706; color: #D97706; }
  .al-sort-pill.active-hours   { background: #F0FDF4; border-color: #16A34A; color: #16A34A; }
  .al-sort-pill.active-entries { background: #EEF2F7; border-color: #1E3A8A; color: #1E3A8A; }

  .al-sort-arrow {
    font-size: 10px; line-height: 1;
    display: inline-block; transform: scaleY(0.9);
  }

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

  .al-action-btn {
    padding: 5px 9px;
    border: 1px solid #DDE3EE; background: #F8FAFC;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    cursor: pointer; color: #6B7A99;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent; white-space: nowrap;
  }
  .al-action-btn.edit:hover  { border-color: #1E3A8A; color: #1E3A8A; background: #EEF2F7; }
  .al-action-btn.del:hover   { border-color: #DC2626; color: #DC2626; background: #FEF2F2; }

  .al-modal-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(10, 22, 40, 0.82);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .al-modal-card {
    width: 100%; max-width: 420px;
    background: #FFFFFF; border: 1px solid #DDE3EE;
    padding: 28px 24px;
    font-family: 'IBM Plex Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    animation: alFadeUp 0.25s ease both;
    max-height: 92dvh; overflow-y: auto;
  }
  .al-modal-header {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 24px; padding-bottom: 20px;
    border-bottom: 1px solid #EEF2F7;
  }
  .al-modal-icon {
    width: 42px; height: 42px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .al-modal-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 21px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.02em; text-transform: uppercase;
    line-height: 1.1; margin-bottom: 3px;
  }
  .al-modal-subtitle { font-size: 11px; color: #6B7A99; font-weight: 400; }
  .al-modal-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .al-modal-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #6B7A99;
  }
  .al-modal-input {
    width: 100%; height: 46px; padding: 0 14px;
    background: #F8FAFC; border: 1.5px solid #DDE3EE;
    color: #0A1628; font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px; font-weight: 500; outline: none;
    transition: border-color 0.15s, background 0.15s;
    border-radius: 0; box-sizing: border-box; -webkit-appearance: none;
  }
  .al-modal-input:focus { border-color: #1E3A8A; background: #FFFFFF; }
  .al-modal-error {
    background: #FEF2F2; border: 1px solid #FECACA;
    border-left: 3px solid #DC2626;
    padding: 10px 12px; font-size: 12px; font-weight: 500;
    color: #991B1B; margin-bottom: 14px;
    font-family: 'IBM Plex Sans', sans-serif; line-height: 1.5;
  }
  .al-modal-btn-row { display: flex; gap: 8px; margin-top: 4px; }
  .al-modal-btn {
    flex: 1; height: 48px; border: none;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; cursor: pointer;
    border-radius: 0; transition: background 0.15s, opacity 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .al-modal-btn.primary { background: #1E3A8A; color: #FFFFFF; }
  .al-modal-btn.primary:hover:not(:disabled) { background: #1E40AF; }
  .al-modal-btn.cancel  { background: #F8FAFC; color: #6B7A99; border: 1px solid #DDE3EE; }
  .al-modal-btn.cancel:hover { background: #EEF2F7; }
  .al-modal-btn.danger  { background: #DC2626; color: #FFFFFF; }
  .al-modal-btn.danger:hover:not(:disabled) { background: #B91C1C; }
  .al-modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 480px) {
    .al-tech-stats { grid-template-columns: repeat(2, 1fr) !important; }
    .al-sort-strip { gap: 5px; }
    .al-sort-pill  { padding: 5px 9px; font-size: 8.5px; }
  }
`;

/* ─── Component ──────────────────────────────────────────────────── */
export default function AdminTechnicianList() {
  const { branch } = useParams();
  const navigate   = useNavigate();
  const { user: authUser } = useAuthStore();
  const isSuperAdmin = authUser?.role === "superadmin";

  const [monthParam] = useState(currentMonthParam);

  // ── List state ──
  const [technicians, setTechnicians] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("ALL");
  const [sortBy,      setSortBy]      = useState("labour");

  // ── Edit modal state ──
  const [editTarget,   setEditTarget]   = useState(null);
  const [editForm,     setEditForm]     = useState({ name: "", technicianId: "", branch: "", technicianType: "" });
  const [editLoading,  setEditLoading]  = useState(false);
  const [editError,    setEditError]    = useState("");

  // ── Delete modal state ──
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError,   setDeleteError]   = useState("");

  // ── Style injection ──
  useEffect(() => {
    const id = "al-styles-technician-list";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = INJECTED;
      document.head.appendChild(el);
    }
    return () => { const el = document.getElementById(id); if (el) document.head.removeChild(el); };
  }, []);

  // ── Fetch technicians scoped to current month ──
  useEffect(() => {
    setLoading(true); setError("");
    api.get(`/api/admin/branch/${encodeURIComponent(branch)}/technicians`, {
      params: { month: monthParam },
    })
      .then(r => setTechnicians(r.data))
      .catch(err => {
        if (err.response?.status === 403) {
          setError("Access denied: This branch is not assigned to your account.");
        } else {
          setError("Failed to load technicians. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [branch, monthParam]);

  // ── Edit handlers ──
  const openEdit = (e, tech) => {
    e.stopPropagation();
    setEditTarget(tech);
    setEditForm({
      name:           tech.name          || "",
      technicianId:   tech.technicianId  || "",
      branch,
      technicianType: tech.technicianType || "",
    });
    setEditError("");
  };

  const handleEditSubmit = async () => {
    if (!editForm.name.trim()) { setEditError("Name is required."); return; }
    if (!editForm.branch)      { setEditError("Branch is required."); return; }

    setEditLoading(true); setEditError("");
    try {
      const payload = {
        name:           editForm.name.trim(),
        technicianId:   editForm.technicianId.trim(),
        branch:         editForm.branch,
        technicianType: editForm.technicianType || null,
      };
      await api.put(`/api/admin/user/${editTarget.id}`, payload);

      if (payload.branch !== branch) {
        setTechnicians(prev => prev.filter(t => t.id !== editTarget.id));
      } else {
        setTechnicians(prev => prev.map(t =>
          t.id === editTarget.id
            ? { ...t, name: payload.name, technicianId: payload.technicianId, technicianType: payload.technicianType }
            : t
        ));
      }
      setEditTarget(null);
    } catch (err) {
      setEditError(err.response?.data?.message || "Update failed. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete handlers ──
  const openDelete = (e, tech) => {
    e.stopPropagation();
    setDeleteTarget(tech);
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true); setDeleteError("");
    try {
      await api.delete(`/api/admin/user/${deleteTarget.id}`);
      setTechnicians(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Delete failed. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Derived list ──
  // Sort is month-scoped — all stats come from the month-scoped API call
  const sorted = [...technicians].sort((a, b) => {
    if (sortBy === "hours")   return (b.totalHours   ?? 0) - (a.totalHours   ?? 0);
    if (sortBy === "entries") return (b.totalEntries ?? 0) - (a.totalEntries ?? 0);
    return (b.totalLabour ?? 0) - (a.totalLabour ?? 0);
  });

  // rankOf reflects the active sort — so #1 always means top in the chosen metric
  const rankOf = (t) => sorted.findIndex(x => x.id === t.id);

  // Search from sorted so display order matches rank order
  const afterSearch = sorted.filter(t =>
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

  // countFor always uses raw technicians — not affected by sort or search
  const countFor = (f) => {
    if (f === "ALL")     return technicians.length;
    if (f === "PENDING") return technicians.filter(t => !t.technicianType).length;
    return technicians.filter(t => t.technicianType === f).length;
  };

  // Active sort label for the "sorted by" hint
  const activeSortOption = SORT_OPTIONS.find(o => o.key === sortBy);

  return (
    <div style={{
      minHeight: "100dvh", background: C.pageBg,
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <Navbar />

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 16px 64px" }}>

        {/* ── Header ── */}
        <div className="al-a1">
          <button className="al-back-btn" onClick={() => navigate("/admin")}>
            ← Branches
          </button>
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            flexWrap: "wrap", marginBottom: "8px",
            paddingBottom: "16px", borderBottom: `1px solid ${C.border}`,
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

          {/* ── Month scope + Sort controls ── */}
          {!loading && !error && (
            <div style={{ marginBottom: "20px" }}>

              {/* Month label */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ width: "3px", height: "12px", background: C.navy, flexShrink: 0 }} />
                <span style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: C.muted,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  Stats for {monthLabel(monthParam)}
                </span>
              </div>

              {/* Sort controls — only when there's more than 1 technician to sort */}
              {technicians.length > 1 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: C.card, border: `1px solid ${C.border}`,
                  padding: "10px 14px",
                }}>
                  <span style={{
                    fontSize: "8px", fontWeight: "700", letterSpacing: "0.18em",
                    textTransform: "uppercase", color: C.dim,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    flexShrink: 0,
                  }}>Sort</span>

                  <div style={{ width: "1px", height: "14px", background: C.border, flexShrink: 0 }} />

                  <div className="al-sort-strip" style={{ flex: 1 }}>
                    {SORT_OPTIONS.map(opt => {
                      const isActive = sortBy === opt.key;
                      return (
                        <button
                          key={opt.key}
                          className={`al-sort-pill${isActive ? ` active-${opt.key}` : ""}`}
                          onClick={() => setSortBy(opt.key)}
                        >
                          <span style={{
                            fontSize: "10px", lineHeight: 1, flexShrink: 0,
                            opacity: isActive ? 1 : 0.6,
                          }}>{opt.symbol}</span>
                          {opt.label}
                          {isActive && (
                            <span className="al-sort-arrow">↓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Search ── */}
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

        {/* ── Type filter pills ── */}
        {!loading && !error && technicians.length > 0 && (
          <div className="al-filter-strip al-a2">
            {FILTER_OPTIONS.map((f) => {
              const count = countFor(f);
              if (count === 0 && f !== "ALL") return null;
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

        {/* ── States ── */}
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
                color: C.muted, fontSize: "10px", fontWeight: "700",
                letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif", borderRadius: "0",
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
              {search ? `No match for "${search}"` : "No technicians in this filter"}
            </p>
          </div>

        ) : (
          <>
            {/* ── Sorted-by hint ── */}
            {technicians.length > 1 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                marginBottom: "8px",
              }}>
                <span style={{
                  fontSize: "9px", fontWeight: "600", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: C.dim,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  Ranked by
                </span>
                <span style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: activeSortOption?.color,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  {activeSortOption?.label} ↓
                </span>
                <span style={{
                  fontSize: "9px", color: C.dim,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  · {monthLabel(monthParam)}
                </span>
              </div>
            )}

            <div className="al-a3" style={{
              display: "flex", flexDirection: "column", gap: "1px",
              background: C.border, border: `1px solid ${C.border}`,
            }}>
              {filtered.map(tech => {
                const ri        = rankOf(tech);
                const rankColor = ri <= 2 ? RANK_COLORS[ri] : null;
                const typeStyle = tech.technicianType ? TYPE_STYLE[tech.technicianType] : null;

                // Which stat cell to highlight based on active sort
                const highlightStat = sortBy;

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
                      {/* Left — name, id, email, badge */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                          {rankColor && (
                            <span style={{
                              fontSize: "9px", fontWeight: "700", letterSpacing: "0.12em",
                              color: rankColor, background: `${rankColor}18`,
                              border: `1px solid ${rankColor}50`, padding: "2px 6px",
                              flexShrink: 0,
                            }}>#{ri + 1}</span>
                          )}
                          <span style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: "22px", fontWeight: "700", color: C.ink,
                            letterSpacing: "0.03em", lineHeight: 1,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{tech.name}</span>
                        </div>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "11px", color: C.navy, fontWeight: "600",
                          letterSpacing: "0.08em", display: "block", marginBottom: "5px",
                        }}>{tech.technicianId}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", color: C.dim }}>{tech.email}</span>
                          {tech.technicianType ? (
                            <span style={{
                              fontSize: "8px", fontWeight: "700", letterSpacing: "0.12em",
                              textTransform: "uppercase", padding: "2px 7px",
                              color: typeStyle.color, background: typeStyle.bg,
                              border: `1px solid ${typeStyle.border}`,
                            }}>{tech.technicianType}</span>
                          ) : (
                            <span style={{
                              fontSize: "8px", fontWeight: "700", letterSpacing: "0.12em",
                              textTransform: "uppercase", padding: "2px 7px",
                              color: "#D97706", background: "#FEF3C7", border: "1px solid #FDE68A",
                            }}>⚠ PENDING TYPE</span>
                          )}
                        </div>
                      </div>

                      {/* Right — action buttons (superadmin) or arrow */}
                      {isSuperAdmin ? (
                        <div
                          style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "12px", flexShrink: 0 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button className="al-action-btn edit" onClick={e => openEdit(e, tech)}>Edit</button>
                          <button className="al-action-btn del"  onClick={e => openDelete(e, tech)}>Delete</button>
                          <span style={{ color: C.dim, fontSize: "20px", lineHeight: 1, marginLeft: "2px" }}>›</span>
                        </div>
                      ) : (
                        <span style={{
                          color: C.dim, fontSize: "20px", marginLeft: "12px",
                          flexShrink: 0, lineHeight: 1, marginTop: "4px",
                        }}>›</span>
                      )}
                    </div>

                    {/* Stats row — month-scoped, active sort cell highlighted */}
                    <div className="al-tech-stats" style={{
                      display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1px", background: C.border, border: `1px solid ${C.border}`,
                    }}>
                      {[
                        {
                          key:   "entries",
                          label: "Entries",
                          value: tech.totalEntries?.toLocaleString("en-IN") ?? "0",
                          color: C.ink,
                        },
                        {
                          key:   "hours",
                          label: "Hours",
                          value: (tech.totalHours?.toLocaleString("en-IN") ?? "0") + " hrs",
                          color: C.success,
                        },
                        {
                          key:   "labour",
                          label: "Labour",
                          value: `₹${Number(tech.totalLabour || 0).toLocaleString("en-IN")}`,
                          color: C.amber,
                        },
                      ].map(({ key, label, value, color }) => {
                        const isHighlighted = key === highlightStat;
                        return (
                          <div
                            key={label}
                            style={{
                              background: isHighlighted ? `${color}0D` : C.cardAlt,
                              padding: "10px 8px", textAlign: "center",
                              borderTop: isHighlighted ? `2px solid ${color}` : "2px solid transparent",
                              transition: "background 0.15s",
                            }}
                          >
                            <div style={{
                              fontSize: "8px", fontWeight: "700", letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: isHighlighted ? color : C.dim,
                              marginBottom: "5px",
                            }}>{label}</div>
                            <div style={{
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontSize: "18px", fontWeight: "700", color, letterSpacing: "0.02em",
                            }}>{value}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div className="al-modal-overlay" onClick={() => !editLoading && setEditTarget(null)}>
          <div className="al-modal-card" onClick={e => e.stopPropagation()}>
            <div className="al-modal-header">
              <div className="al-modal-icon" style={{ background: "#EEF2F7", border: "1.5px solid #DDE3EE" }}>✏️</div>
              <div>
                <div className="al-modal-title">Edit Technician</div>
                <div className="al-modal-subtitle" style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em" }}>
                  {editTarget.technicianId || editTarget.name}
                </div>
              </div>
            </div>

            <div className="al-modal-field">
              <label className="al-modal-label">Display Name</label>
              <input className="al-modal-input" type="text" value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                disabled={editLoading} placeholder="Full name" />
            </div>

            <div className="al-modal-field">
              <label className="al-modal-label">Technician ID</label>
              <input className="al-modal-input" type="text" value={editForm.technicianId}
                onChange={e => setEditForm(f => ({ ...f, technicianId: e.target.value }))}
                disabled={editLoading} placeholder="e.g. TEC-2045"
                style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em" }} />
            </div>

            <div className="al-modal-field">
              <label className="al-modal-label">Branch</label>
              <select className="al-modal-input" value={editForm.branch}
                onChange={e => setEditForm(f => ({ ...f, branch: e.target.value }))}
                disabled={editLoading}>
                <option value="">Select branch</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="al-modal-field" style={{ marginBottom: "20px" }}>
              <label className="al-modal-label">Technician Role</label>
              <select className="al-modal-input" value={editForm.technicianType}
                onChange={e => setEditForm(f => ({ ...f, technicianType: e.target.value }))}
                disabled={editLoading}>
                <option value="">Not set</option>
                {TECHNICIAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {editError && <div className="al-modal-error">{editError}</div>}

            <div className="al-modal-btn-row">
              <button className="al-modal-btn cancel" onClick={() => setEditTarget(null)} disabled={editLoading}>Cancel</button>
              <button className="al-modal-btn primary" onClick={handleEditSubmit} disabled={editLoading}>
                {editLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="al-modal-overlay" onClick={() => !deleteLoading && setDeleteTarget(null)}>
          <div className="al-modal-card" onClick={e => e.stopPropagation()}>
            <div className="al-modal-header">
              <div className="al-modal-icon" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}>🗑️</div>
              <div>
                <div className="al-modal-title" style={{ color: C.danger }}>Delete Account</div>
                <div className="al-modal-subtitle">This action cannot be undone</div>
              </div>
            </div>

            <div style={{
              background: C.cardAlt, border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.danger}`,
              padding: "14px 16px", marginBottom: "20px",
            }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "20px", fontWeight: "700", color: C.ink,
                letterSpacing: "0.02em", marginBottom: "4px",
              }}>{deleteTarget.name}</div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px", color: C.navy, fontWeight: "600",
                letterSpacing: "0.06em", marginBottom: "6px",
              }}>{deleteTarget.technicianId}</div>
              <div style={{ fontSize: "12px", color: C.muted, lineHeight: 1.5 }}>
                This will permanently delete this account and all{" "}
                <strong style={{ color: C.ink }}>
                  {deleteTarget.totalEntries?.toLocaleString("en-IN") || 0} job card{" "}
                  {deleteTarget.totalEntries === 1 ? "entry" : "entries"}
                </strong>.
              </div>
            </div>

            {deleteError && <div className="al-modal-error">{deleteError}</div>}

            <div className="al-modal-btn-row">
              <button className="al-modal-btn cancel" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>Cancel</button>
              <button className="al-modal-btn danger" onClick={handleDeleteConfirm} disabled={deleteLoading}>
                {deleteLoading ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}