import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { BRANCHES, TECHNICIAN_TYPES } from "../utils/constants";
import "./AdminTechnicianList.css";
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
// ── Derived list ──
const sorted = useMemo(() =>
  [...technicians].sort((a, b) => {
    if (sortBy === "hours")   return (b.totalHours   ?? 0) - (a.totalHours   ?? 0);
    if (sortBy === "entries") return (b.totalEntries ?? 0) - (a.totalEntries ?? 0);
    return (b.totalLabour ?? 0) - (a.totalLabour ?? 0);
  }),
  [technicians, sortBy]
);

// O(n) lookup map — replaces O(n²) rankOf(t) called inside .map()
const rankMap = useMemo(
  () => Object.fromEntries(sorted.map((t, i) => [String(t.id), i])),
  [sorted]
);

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
               const ri = rankMap[String(tech.id)] ?? -1;
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
  This will permanently delete this account and{" "}
  <strong style={{ color: C.ink }}>
    all their job card entries and attendance records
  </strong>{" "}across all months. This cannot be undone.
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