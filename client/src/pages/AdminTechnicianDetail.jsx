import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";
import "./AdminTechnicianDetail.css";
/* ─── Design tokens ──────────────────────────────────────────────── */
const C = {
  pageBg:  "#EEF2F7",
  card:    "#FFFFFF",
  cardAlt: "#F8FAFC",
  border:  "#DDE3EE",
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

const CAT_COLORS = {
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

const TYPE_STYLE = {
  "MECHANIC":           { color: "#1E3A8A", bg: "#EEF2F7", border: "#BFDBFE" },
  "MECHANIC HELPER":    { color: "#0369A1", bg: "#E0F2FE", border: "#BAE6FD" },
  "ELECTRICIAN":        { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  "ELECTRICIAN HELPER": { color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE" },
};

const toDateInputValue = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 10); }
  catch { return ""; }
};

/* ─── Edit Entry Modal ─────────────────────────────────────────────
   Unchanged — identical to original.
─────────────────────────────────────────────────────────────────── */
function EditEntryModal({ entry, onClose, onSaved }) {
  const [loading,     setLoading]     = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      date:         toDateInputValue(entry.date),
      category:     entry.category     || "",
      vehicleNo:    entry.vehicleNo    || "",
      jcNo:         entry.jcNo         || "",
      labourAmount: entry.labourAmount ?? 0,
      hoursWorked:  entry.hoursWorked  ?? 0,
      leaveDays:    entry.leaveDays    ?? 0,
      incentive:    entry.incentive    ?? 0,
    },
  });

  const onSubmit = async (data) => {
    setLoading(true); setServerError("");
    try {
      await api.put(`/api/admin/entry/${entry._id}`, {
        ...data,
        labourAmount: Number(data.labourAmount),
        hoursWorked:  Number(data.hoursWorked),
        leaveDays:    Number(data.leaveDays),
        incentive:    Number(data.incentive),
      });
      onSaved(); onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="em-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="em-sheet" onClick={(e) => e.stopPropagation()}>

        {loading && (
          <div className="em-progress">
            <div className="em-progress-fill" />
          </div>
        )}

        <div className="em-header">
          <div className="em-drag-handle" />
          <div className="em-header-row">
            <div>
              <h2 className="em-title">Edit Entry</h2>
              <p className="em-subtitle" style={{ color: loading ? "#93C5FD" : undefined }}>
                {loading
                  ? "Saving…"
                  : <>JC: <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#1E3A8A" }}>{entry.jcNo}</span></>
                }
              </p>
            </div>
            <button className="em-close" type="button" onClick={onClose} disabled={loading} aria-label="Close">×</button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="em-body">

          {serverError && (
            <div className="em-error-banner">
              <p className="em-error-text">{serverError}</p>
            </div>
          )}

          <div className="em-row">
            <div>
              <label className="em-label">Date <span className="em-required">*</span></label>
              <input
                type="date"
                className={`em-input${errors.date ? " em-input--err" : ""}`}
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && <p className="em-field-err">{errors.date.message}</p>}
            </div>
            <div>
              <label className="em-label">Category <span className="em-required">*</span></label>
              <select
                className={`em-input em-select${errors.category ? " em-input--err" : ""}`}
                {...register("category", { required: "Category is required" })}
              >
                <option value="">Select…</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="em-field-err">{errors.category.message}</p>}
            </div>
          </div>

          <div className="em-divider">
            <div className="em-divider-line" />
            <span className="em-divider-label">Job Details</span>
            <div className="em-divider-line" />
          </div>

          <div className="em-row">
            <div>
              <label className="em-label">JC No <span className="em-required">*</span></label>
              <input
                type="text"
                className={`em-input${errors.jcNo ? " em-input--err" : ""}`}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "14px", letterSpacing: "0.04em" }}
                {...register("jcNo", { required: "JC No is required" })}
              />
              {errors.jcNo && <p className="em-field-err">{errors.jcNo.message}</p>}
            </div>
            <div>
              <label className="em-label">Vehicle No <span style={{ color: "#E53E3E" }}>*</span></label>
              <input
                type="text"
                placeholder="KA-01-AB-1234"
                className={`em-input${errors.vehicleNo ? " em-input--err" : ""}`}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "14px", letterSpacing: "0.04em" }}
                {...register("vehicleNo", {
                  required: "Vehicle number is required",
                  validate: (v) => v.trim().length >= 2 || "Vehicle number is too short",
                })}
              />
              {errors.vehicleNo && <p className="em-field-err">{errors.vehicleNo.message}</p>}
            </div>
          </div>

          <div className="em-divider">
            <div className="em-divider-line" />
            <span className="em-divider-label">Financials &amp; Hours</span>
            <div className="em-divider-line" />
          </div>

          <div>
            <label className="em-label">Labour Amount <span className="em-required">*</span></label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--primary">₹</div>
              <input
                type="number" inputMode="numeric" placeholder="0"
                className={`em-input${errors.labourAmount ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("labourAmount", {
                  required: "Required",
                  min: { value: 0, message: "Min ₹0" },
                  max: { value: 100000, message: "Max ₹1,00,000" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.labourAmount && <p className="em-field-err">{errors.labourAmount.message}</p>}
          </div>

          <div>
            <label className="em-label">Hours Worked <span className="em-required">*</span></label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--hrs">HRS</div>
              <input
                type="number" inputMode="numeric" placeholder="0"
                className={`em-input${errors.hoursWorked ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("hoursWorked", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                  max: { value: 24, message: "Max 24 hrs" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.hoursWorked && <p className="em-field-err">{errors.hoursWorked.message}</p>}
          </div>

          <div>
            <label className="em-label">Leave Days</label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--lve">LVE</div>
              <input
                type="number" inputMode="numeric" placeholder="0"
                className={`em-input${errors.leaveDays ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("leaveDays", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                  max: { value: 31, message: "Max 31 days" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.leaveDays && <p className="em-field-err">{errors.leaveDays.message}</p>}
          </div>

          <div>
            <label className="em-label">Incentive</label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--inc">₹</div>
              <input
                type="number" inputMode="numeric" placeholder="0"
                className={`em-input${errors.incentive ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("incentive", {
                  min: { value: 0, message: "Min ₹0" },
                  max: { value: 100000, message: "Max ₹1,00,000" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.incentive && <p className="em-field-err">{errors.incentive.message}</p>}
          </div>

          <button type="submit" className="em-submit" disabled={loading}>
            {loading ? <><span className="em-spinner" />Saving…</> : "Save Changes"}
          </button>

          <button type="button" className="em-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>

        </form>
      </div>
    </div>
  );
}

/* ─── Entry Card ─────────────────────────────────────────────────── */
function EntryCard({ entry, onEdit, onDelete }) {
  const color = CAT_COLORS[entry.category] || C.muted;
  const date  = new Date(entry.date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="ad-entry-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="ad-entry-top" style={{
        padding: "14px 18px 12px",
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "12px",
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: "inline-block", padding: "3px 8px",
            background: `${color}18`, color,
            fontSize: "9px", fontWeight: "700", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "7px",
          }}>{entry.category}</div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "12px", color: C.mid, letterSpacing: "0.05em",
          }}>
            {entry.jcNo}
            {entry.vehicleNo && (
              <span style={{ marginLeft: "10px", color: C.dim }}>· {entry.vehicleNo}</span>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px", color: C.dim, letterSpacing: "0.04em", marginBottom: "10px",
          }}>{date}</div>
          <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
            <button className="ad-edit-btn" onClick={() => onEdit(entry)}>Edit</button>
            <button className="ad-delete-btn" onClick={() => onDelete(entry._id)}>Delete</button>
          </div>
        </div>
      </div>

      <div className="ad-stats-4" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1px", background: C.border, borderTop: `1px solid ${C.border}`,
      }}>
        {[
          { label: "Labour",    value: `₹${Number(entry.labourAmount || 0).toLocaleString("en-IN")}`, color: C.amber   },
          { label: "Hours",     value: `${entry.hoursWorked || 0}h`,                                  color: C.success },
          { label: "Leave",     value: `${entry.leaveDays || 0}d`,                                    color: C.muted   },
          { label: "Incentive", value: `₹${Number(entry.incentive   || 0).toLocaleString("en-IN")}`, color: C.navy    },
        ].map(({ label, value, color: c }) => (
          <div key={label} style={{ background: C.cardAlt, padding: "10px 8px", textAlign: "center" }}>
            <div style={{
              fontSize: "8px", fontWeight: "700", letterSpacing: "0.14em",
              textTransform: "uppercase", color: C.dim, marginBottom: "4px",
            }}>{label}</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "16px", fontWeight: "700", color: c, letterSpacing: "0.02em",
            }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function AdminTechnicianDetail() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [data,          setData]         = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [accessDenied,  setAccessDenied] = useState(false);
  const [page,          setPage]         = useState(1);
  const [editingEntry,  setEditing]      = useState(null);
  const [exporting,     setExporting]    = useState(false);

  // ── Vehicle search state ──────────────────────────────────────────
  // vehicleSearch  — live controlled input value
  // debouncedVehicle — what actually fires the API call (350ms delayed)
  const [vehicleSearch,     setVehicleSearch]     = useState("");
  const [debouncedVehicle,  setDebouncedVehicle]  = useState("");
  // ── Debounce: 350ms after user stops typing, update debouncedVehicle
  //    and reset to page 1. React 18 batches these two setState calls
  //    inside setTimeout, so fetchData only fires once per search change.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVehicle(vehicleSearch.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [vehicleSearch]);

  // ── Instant clear: bypasses debounce delay ──────────────────────
  const clearSearch = () => {
    setVehicleSearch("");
    setDebouncedVehicle("");
    setPage(1);
  };

  // ── Derived search state ─────────────────────────────────────────
  const isSearchMode = debouncedVehicle.length >= 2;

  const fetchData = useCallback(async () => {
    try {
      // Build query string — only add vehicleNo when search is active
      const params = new URLSearchParams({ page, limit: 20 });
      if (isSearchMode) params.set("vehicleNo", debouncedVehicle);

      const r = await api.get(`/api/admin/technician/${userId}?${params.toString()}`);
      setData(r.data);
      setAccessDenied(false);
    } catch (e) {
      if (e.response?.status === 403) setAccessDenied(true);
      else console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, page, debouncedVehicle, isSearchMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/entry/${id}`);
      fetchData();
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed");
    }
  };

  // Export always fetches ALL entries — unaffected by search mode
  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await api.get(`/api/admin/technician/${userId}/export`);
      const { user, entries } = r.data;
      const headers = ["Date","Category","Vehicle No","JC No","Labour (₹)","Hours Worked","Leave Days","Incentive (₹)"];
      const rows    = entries.map(e => [
        new Date(e.date).toLocaleDateString("en-IN"),
        e.category, e.vehicleNo || "", e.jcNo,
        e.labourAmount, e.hoursWorked, e.leaveDays, e.incentive,
      ]);
      const csv  = [headers, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), {
        href: url, download: `${user?.name || "technician"}_entries.csv`,
      });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: "100dvh", background: C.pageBg }}>
      <Navbar />
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
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
    </div>
  );

  /* ── Access denied ── */
  if (accessDenied) return (
    <div style={{ minHeight: "100dvh", background: C.pageBg }}>
      <Navbar />
      <div style={{ padding: "28px 16px", maxWidth: "680px", margin: "0 auto" }}>
        <button className="ad-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div style={{
          background: "#FEF2F2", border: "1px solid #FECACA",
          borderLeft: "3px solid #DC2626", padding: "40px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔒</div>
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "22px", fontWeight: "700", color: C.danger,
            letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "8px",
          }}>Access Denied</p>
          <p style={{ fontSize: "13px", color: "#991B1B", lineHeight: 1.6 }}>
            This technician is not assigned to your branch.<br />
            Contact your developer if you believe this is an error.
          </p>
          <button
            onClick={() => navigate("/admin")}
            style={{
              marginTop: "20px", padding: "10px 24px",
              background: "transparent", border: `1px solid ${C.border}`,
              borderRadius: "0", color: C.muted,
              fontSize: "10px", fontWeight: "700", letterSpacing: "0.14em",
              textTransform: "uppercase", cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >← Back to Dashboard</button>
        </div>
      </div>
    </div>
  );

  // ── Destructure response ─────────────────────────────────────────
  const {
    user,
    entries = [],
    total = 0,
    pages = 1,
    allTimeStats,
    filteredStats,         // null when not searching; populated when vehicleNo search active
  } = data || {};

  // ── Which stats to show in the totals strip ──────────────────────
  // Search mode  → filteredStats (totals for entries matching vehicle query)
  // Normal mode  → allTimeStats  (always the full technician picture)
  const displayStats = isSearchMode && filteredStats ? filteredStats : allTimeStats;

  const displayTotals = displayStats
    ? {
        labour:    displayStats.totalLabour,
        hours:     displayStats.totalHours,
        incentive: displayStats.totalIncentive,
        leave:     displayStats.totalLeave,
      }
    : entries.reduce(
        (acc, e) => ({
          labour:    acc.labour    + (e.labourAmount || 0),
          hours:     acc.hours     + (e.hoursWorked  || 0),
          incentive: acc.incentive + (e.incentive    || 0),
          leave:     acc.leave     + (e.leaveDays    || 0),
        }),
        { labour: 0, hours: 0, incentive: 0, leave: 0 }
      );

  // Show totals strip when there's data to show
  const showTotals = isSearchMode ? total > 0 : entries.length > 0;

  const typeStyle = user?.technicianType ? TYPE_STYLE[user.technicianType] : null;

  return (
    <div style={{
      minHeight: "100dvh", background: C.pageBg,
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <Navbar />

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditing(null)}
          onSaved={fetchData}
        />
      )}

      <div style={{ padding: "24px 16px 60px", maxWidth: "900px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div className="ad-a1">
          <button className="ad-back-btn" onClick={() => navigate(-1)}>← Back</button>

          <div className="ad-header-row" style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", gap: "16px", flexWrap: "wrap",
            marginBottom: "28px", paddingBottom: "20px",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div>
              <div style={{
                fontSize: "9px", fontWeight: "700", letterSpacing: "0.2em",
                textTransform: "uppercase", color: C.navy, marginBottom: "5px",
              }}>Technician Detail</div>
              <h1 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "34px", fontWeight: "700", color: C.ink,
                letterSpacing: "0.04em", textTransform: "uppercase",
                margin: "0 0 8px", lineHeight: 1,
              }}>{user?.name}</h1>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {user?.technicianId && (
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "12px", color: C.navy, letterSpacing: "0.08em",
                    fontWeight: "600", background: "#EEF2F7",
                    border: `1px solid ${C.border}`, padding: "2px 8px",
                  }}>{user.technicianId}</span>
                )}
                <span style={{ fontSize: "10px", color: C.dim }}>·</span>
                <span style={{ fontSize: "12px", color: C.muted }}>{user?.branch} Branch</span>

                {typeStyle ? (
                  <>
                    <span style={{ fontSize: "10px", color: C.dim }}>·</span>
                    <span style={{
                      fontSize: "8px", fontWeight: "700", letterSpacing: "0.12em",
                      textTransform: "uppercase", padding: "2px 7px",
                      color: typeStyle.color, background: typeStyle.bg,
                      border: `1px solid ${typeStyle.border}`,
                    }}>{user.technicianType}</span>
                  </>
                ) : user?.profileComplete ? (
                  <>
                    <span style={{ fontSize: "10px", color: C.dim }}>·</span>
                    <span style={{
                      fontSize: "8px", fontWeight: "700", letterSpacing: "0.12em",
                      textTransform: "uppercase", padding: "2px 7px",
                      color: "#D97706", background: "#FEF3C7", border: "1px solid #FDE68A",
                    }}>⚠ Pending Type</span>
                  </>
                ) : null}

                <span style={{ fontSize: "10px", color: C.dim }}>·</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px", color: C.dim,
                }}>
                  {/* Total count always reflects full history, not filtered count */}
                  {allTimeStats
                    ? `${data?.total ?? 0}${isSearchMode ? ` of ${data?.total ?? 0}` : ""} entr${(data?.total ?? 0) === 1 ? "y" : "ies"}`
                    : `${total} entr${total === 1 ? "y" : "ies"}`
                  }
                </span>
              </div>
            </div>

            <button className="ad-export-btn" onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting…" : "↓ Export CSV"}
            </button>
          </div>
        </div>

        {/* ── Totals strip ──────────────────────────────────────────────
            Labels switch between "Total X" and "Vehicle X" depending on
            search mode. Strip header appears only when search is active
            to show which vehicle is being summarised.
        ─────────────────────────────────────────────────────────────── */}
        {showTotals && (
          <div className="ad-a2" style={{
            border: `1px solid ${C.border}`,
            marginBottom: "20px",
            background: C.border, // gap colour between cells
          }}>
            {/* Context header — only in search mode */}
            {isSearchMode && (
              <div style={{
                background: "#EFF6FF",
                borderBottom: "1px solid #BFDBFE",
                padding: "7px 14px",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "#1E3A8A",
                }}>Vehicle Totals</span>
                <span style={{ fontSize: "9px", color: "#93C5FD" }}>·</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px", fontWeight: "700",
                  color: "#1E3A8A", letterSpacing: "0.06em",
                }}>{debouncedVehicle}</span>
              </div>
            )}

            <div className="ad-totals-grid" style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px",
            }}>
              {[
                { label: isSearchMode ? "Vehicle Labour"    : "Total Labour",    value: `₹${displayTotals.labour.toLocaleString("en-IN")}`,    accent: C.amber   },
                { label: isSearchMode ? "Vehicle Hours"     : "Total Hours",     value: `${displayTotals.hours} hrs`,                           accent: C.success },
                { label: isSearchMode ? "Vehicle Incentive" : "Total Incentive", value: `₹${displayTotals.incentive.toLocaleString("en-IN")}`, accent: C.navy    },
                { label: isSearchMode ? "Vehicle Leave"     : "Total Leave",     value: `${displayTotals.leave} days`,                          accent: C.muted   },
              ].map(({ label, value, accent }) => (
                <div key={label} style={{
                  background: C.card, padding: "16px 14px",
                  borderTop: `3px solid ${accent}`,
                }}>
                  <div style={{
                    fontSize: "8px", fontWeight: "700", letterSpacing: "0.16em",
                    textTransform: "uppercase", color: C.dim, marginBottom: "8px",
                  }}>{label}</div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "22px", fontWeight: "700", color: C.ink, letterSpacing: "0.02em",
                  }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Vehicle search bar ────────────────────────────────────────
            Always visible. Searches all entries for this technician
            server-side — pagination runs on top of the filtered set.
        ─────────────────────────────────────────────────────────────── */}
        <div className="ad-a3" style={{ marginBottom: "16px" }}>
          <div style={{
            fontSize: "10px", fontWeight: "700", letterSpacing: "0.16em",
            textTransform: "uppercase", color: C.mid, marginBottom: "8px",
          }}>Search by Vehicle No</div>

          <div className="ad-vs-wrap">
            {/* Search icon */}
            <div className="ad-vs-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </div>

            <input
              type="text"
              className="ad-vs-input"
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value.toUpperCase())}
              placeholder="e.g. KA01AB1234 or last 4 digits…"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-label="Search entries by vehicle number"
            />

            {vehicleSearch && (
              <button
                type="button"
                className="ad-vs-clear"
                onClick={clearSearch}
                aria-label="Clear vehicle search"
              >×</button>
            )}
          </div>
        </div>

        {/* ── Search result banner — shown only when search is active ── */}
        {isSearchMode && (
          <div className="ad-vs-banner">
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              minWidth: 0, overflow: "hidden",
            }}>
              <span style={{
                fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                textTransform: "uppercase", color: "#1E3A8A", flexShrink: 0,
              }}>Results</span>

              <span style={{ fontSize: "9px", color: "#93C5FD" }}>·</span>

              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px", fontWeight: "700", color: "#1E3A8A",
                letterSpacing: "0.06em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{debouncedVehicle}</span>

              <span style={{ fontSize: "9px", color: "#93C5FD", flexShrink: 0 }}>·</span>

              <span style={{
                fontSize: "12px", color: C.mid,
                fontFamily: "'IBM Plex Sans', sans-serif", flexShrink: 0,
              }}>
                {total} {total === 1 ? "entry" : "entries"} found
              </span>
            </div>

            <button className="ad-vs-banner-clear" onClick={clearSearch}>
              Clear ×
            </button>
          </div>
        )}

        {/* ── Entries ── */}
        {entries.length === 0 ? (
          <div className="ad-a4" style={{
            background: C.card, border: `1px solid ${C.border}`,
            padding: "60px 20px", textAlign: "center",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "20px", fontWeight: "700",
              color: C.dim, letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: "6px",
            }}>
              {isSearchMode ? "No Entries Found" : "No Entries Yet"}
            </div>
            <p style={{ fontSize: "13px", color: C.dim, margin: 0 }}>
              {isSearchMode
                ? `No job cards logged for "${debouncedVehicle}". Try a different query.`
                : "This technician hasn't logged any work entries."
              }
            </p>
            {isSearchMode && (
              <button
                onClick={clearSearch}
                style={{
                  marginTop: "16px", padding: "9px 22px",
                  background: "transparent", border: `1px solid ${C.border}`,
                  color: C.muted, fontSize: "10px", fontWeight: "700",
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >Clear Search</button>
            )}
          </div>
        ) : (
          <div className="ad-a4">
            <div style={{
              display: "flex", flexDirection: "column", gap: "1px",
              background: C.border, border: `1px solid ${C.border}`,
              marginBottom: "24px",
            }}>
              {entries.map(e => (
                <EntryCard
                  key={e._id}
                  entry={e}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination — works identically in both normal and search mode */}
            {pages > 1 && (
              <div style={{
                display: "flex", justifyContent: "center",
                alignItems: "center", gap: "16px",
              }}>
                <button
                  className="ad-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >← Prev</button>

                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px", color: C.dim, letterSpacing: "0.08em",
                }}>
                  {page} / {pages}
                </span>

                <button
                  className="ad-page-btn"
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                >Next →</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}