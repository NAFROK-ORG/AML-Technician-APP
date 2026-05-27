import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";

/* ─── Design tokens ─────────────────────────────────────────────────── */
const C = {
  bg:     "#09090E", surface: "#111119", card: "#16161F",
  elev:   "#1E1E2C", border: "#23232F", border2: "#1A1A25",
  text:   "#E2E2EE", muted:  "#60607A", dim:    "#30304A",
  blue:   "#4C70F5", blueL: "#7A98F8",
  green:  "#10C090", greenL:"#4DD8B6",
  amber:  "#E8A000", amberL:"#FFC033",
  red:    "#E04848",
};

const CAT_STYLES = {
  "Engine Repair":   { bg: "rgba(76,112,245,0.12)",  color: "#7A98F8" },
  "Electrical":      { bg: "rgba(232,160,0,0.12)",   color: "#FFC033" },
  "Body Work":       { bg: "rgba(16,192,144,0.12)",  color: "#4DD8B6" },
  "Transmission":    { bg: "rgba(144,112,240,0.12)", color: "#B89AF8" },
  "AC & Cooling":    { bg: "rgba(24,200,223,0.12)",  color: "#6DDDE8" },
  "General Service": { bg: "rgba(232,112,24,0.12)",  color: "#FF9A50" },
};

/* ─── Shared inline style helpers ───────────────────────────────────── */
const LABEL = {
  fontSize: "9px", fontWeight: "700", letterSpacing: "0.16em",
  textTransform: "uppercase", color: C.muted, display: "block",
  marginBottom: "7px", fontFamily: "'IBM Plex Sans', sans-serif",
};
const INPUT = {
  width: "100%", boxSizing: "border-box",
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: "3px", color: C.text, fontSize: "13px",
  padding: "11px 12px", fontFamily: "'IBM Plex Sans', sans-serif",
  outline: "none", height: "42px",
};
const ERR = { fontSize: "10px", color: C.red, marginTop: "5px", letterSpacing: "0.04em" };

/* ─── Compact Stepper for admin modal ───────────────────────────────── */
function Stepper({ label, name, step = 1, required = true, register, setValue, watch, prefix = "" }) {
  const val = typeof watch(name) === "number" ? watch(name) : 0;
  const adj = (delta) => setValue(name, Math.max(0, val + delta));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <label style={LABEL}>{label}{required && " *"}</label>
      <div style={{
        display: "flex", alignItems: "center",
        border: `1px solid ${C.border}`, borderRadius: "3px",
        overflow: "hidden", height: "42px", background: C.surface,
      }}>
        <button type="button" onClick={() => adj(-step)} style={{
          width: "42px", height: "100%", flexShrink: 0,
          background: "transparent", border: "none",
          borderRight: `1px solid ${C.border}`,
          color: val === 0 ? C.border : C.muted,
          fontSize: "18px", cursor: val === 0 ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, transition: "color 0.1s",
          WebkitTapHighlightColor: "transparent",
        }}>−</button>

        <div style={{
          flex: 1, display: "flex", alignItems: "center",
          justifyContent: "center", gap: "3px", pointerEvents: "none",
        }}>
          {prefix && <span style={{ fontSize: "13px", color: C.dim, fontWeight: "600" }}>{prefix}</span>}
          <span style={{
            fontSize: "18px", fontWeight: "700", color: C.text,
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.02em",
          }}>{val.toLocaleString("en-IN")}</span>
        </div>

        <input type="number" style={{ display: "none" }}
          {...register(name, { valueAsNumber: true, min: 0,
            required: required ? `${label} is required` : false })} />

        <button type="button" onClick={() => adj(step)} style={{
          width: "42px", height: "100%", flexShrink: 0,
          background: "transparent", border: "none",
          borderLeft: `1px solid ${C.border}`,
          color: C.muted, fontSize: "18px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, transition: "background 0.1s",
          WebkitTapHighlightColor: "transparent",
        }}>+</button>
      </div>
    </div>
  );
}

/* ─── Edit Entry Modal ───────────────────────────────────────────────── */
function EditEntryModal({ entry, onClose, onSaved }) {
  const [loading, setLoading]       = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      date:         entry.date ? new Date(entry.date).toISOString().split("T")[0] : "",
      category:     entry.category    || "",
      vehicleNo:    entry.vehicleNo   || "",
      jcNo:         entry.jcNo        || "",
      labourAmount: entry.labourAmount || 0,
      hoursWorked:  entry.hoursWorked  || 0,
      leaveDays:    entry.leaveDays    || 0,
      incentive:    entry.incentive    || 0,
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

  const sp = { register, setValue, watch };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(5,5,10,0.88)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-up"
        style={{
          background: C.elev, border: `1px solid ${C.border}`,
          borderRadius: "8px 8px 0 0", width: "100%", maxWidth: "540px",
          maxHeight: "94dvh", overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: C.elev, padding: "16px 20px 14px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ width: 32, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{
                fontSize: "18px", fontWeight: "800", color: C.text, margin: 0,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>Edit Entry</h2>
              <p style={{ fontSize: "11px", color: C.muted, marginTop: "3px", letterSpacing: "0.06em" }}>
                JC: <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: C.blueL }}>{entry.jcNo}</span>
              </p>
            </div>
            <button onClick={onClose} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: "3px", width: 34, height: 34,
              color: C.muted, fontSize: "16px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}>×</button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{
          display: "flex", flexDirection: "column", gap: "18px",
          padding: "20px 20px 32px",
        }}>
          {/* Date + Category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={LABEL}>Date *</label>
              <input type="date" style={{ ...INPUT, colorScheme: "dark" }}
                {...register("date", { required: "Date is required" })} />
              {errors.date && <p style={ERR}>{errors.date.message}</p>}
            </div>
            <div>
              <label style={LABEL}>Category *</label>
              <select
                style={{
                  ...INPUT, cursor: "pointer", appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2360607A' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                  paddingRight: "32px",
                }}
                {...register("category", { required: "Category is required" })}
              >
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p style={ERR}>{errors.category.message}</p>}
            </div>
          </div>

          {/* JC No + Vehicle No */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={LABEL}>JC No *</label>
              <input style={{ ...INPUT, fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px" }}
                type="text" {...register("jcNo", { required: "JC No is required" })} />
              {errors.jcNo && <p style={ERR}>{errors.jcNo.message}</p>}
            </div>
            <div>
              <label style={LABEL}>Vehicle No</label>
              <input style={{ ...INPUT, fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px" }}
                type="text" {...register("vehicleNo")} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "1px", background: C.border2 }} />
            <span style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.dim, fontWeight: "700" }}>
              Financials & Time
            </span>
            <div style={{ flex: 1, height: "1px", background: C.border2 }} />
          </div>

          {/* Steppers — full width, order: Labour → Leave → Hours → Incentive */}
          <Stepper label="Labour Amount" name="labourAmount" step={100} prefix="₹" {...sp} />
          <Stepper label="Leave Days"    name="leaveDays"    step={1}   {...sp} />
          <Stepper label="Hours Worked"  name="hoursWorked"  step={1}   {...sp} />
          <Stepper label="Incentive"     name="incentive"    step={100} prefix="₹" required={false} {...sp} />

          {serverError && (
            <div style={{
              background: "rgba(224,72,72,0.08)", border: `1px solid rgba(224,72,72,0.25)`,
              borderRadius: "3px", padding: "12px 14px",
              color: C.red, fontSize: "13px",
            }}>{serverError}</div>
          )}

          <button type="submit" disabled={loading} style={{
            height: "44px", background: loading ? C.card : C.blue,
            border: "none", borderRadius: "3px",
            color: loading ? C.dim : "#FFFFFF",
            fontSize: "11px", fontWeight: "700", letterSpacing: "0.12em",
            textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.15s",
          }}>
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Entry Card ─────────────────────────────────────────────────────── */
function EntryCard({ entry, onEdit, onDelete }) {
  const cs = CAT_STYLES[entry.category] || { bg: `rgba(96,96,122,0.12)`, color: C.muted };
  const date = new Date(entry.date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: "4px", overflow: "hidden",
    }}>
      {/* Top row */}
      <div style={{ padding: "14px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <span style={{
            display: "inline-block", padding: "3px 10px",
            background: cs.bg, color: cs.color,
            fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em",
            textTransform: "uppercase", borderRadius: "2px", marginBottom: "6px",
          }}>{entry.category}</span>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px",
            color: C.muted, letterSpacing: "0.06em",
          }}>
            {entry.jcNo}
            {entry.vehicleNo && <span style={{ marginLeft: "12px", color: C.dim }}>· {entry.vehicleNo}</span>}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "12px", color: C.dim, letterSpacing: "0.04em", marginBottom: "8px" }}>
            {date}
          </div>
          <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
            <button onClick={() => onEdit(entry)} style={{
              background: "transparent", border: "none",
              color: C.blueL, fontSize: "11px", fontWeight: "600",
              cursor: "pointer", letterSpacing: "0.08em",
              fontFamily: "'IBM Plex Sans', sans-serif",
              padding: "0", textTransform: "uppercase",
            }}>Edit</button>
            <button
              onClick={() => onDelete(entry._id)}
              style={{
                background: "transparent", border: "none",
                color: C.dim, fontSize: "11px", fontWeight: "600",
                cursor: "pointer", letterSpacing: "0.08em",
                fontFamily: "'IBM Plex Sans', sans-serif",
                padding: "0", textTransform: "uppercase",
                transition: "color 0.15s",
              }}
              onMouseOver={e => e.currentTarget.style.color = C.red}
              onMouseOut={e => e.currentTarget.style.color = C.dim}
            >Delete</button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: `1px solid ${C.border2}`,
      }}>
        {[
          { label: "Labour",   value: `₹${Number(entry.labourAmount || 0).toLocaleString("en-IN")}`, color: C.amber },
          { label: "Hours",    value: entry.hoursWorked,  color: C.greenL },
          { label: "Leave",    value: `${entry.leaveDays}d`, color: C.muted },
          { label: "Incentive",value: `₹${Number(entry.incentive || 0).toLocaleString("en-IN")}`, color: C.blueL },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: "10px 8px", textAlign: "center",
            borderRight: `1px solid ${C.border2}`,
          }}>
            <div style={{
              fontSize: "8px", fontWeight: "700", letterSpacing: "0.14em",
              textTransform: "uppercase", color: C.dim, marginBottom: "4px",
            }}>{label}</div>
            <div style={{
              fontSize: "14px", fontWeight: "700", color,
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.02em",
            }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function AdminTechnicianDetail() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [editingEntry, setEditing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const r = await api.get(`/api/admin/technician/${userId}?page=${page}&limit=20`);
      setData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    try { await api.delete(`/api/admin/entry/${id}`); fetchData(); }
    catch (e) { alert(e.response?.data?.message || "Delete failed"); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await api.get(`/api/admin/technician/${userId}/export`);
      const { user, entries } = r.data;
      const headers = ["Date","Category","Vehicle No","JC No","Labour (₹)","Hours Worked","Leave Days","Incentive (₹)"];
      const rows = entries.map(e => [
        new Date(e.date).toLocaleDateString("en-IN"),
        e.category, e.vehicleNo || "", e.jcNo,
        e.labourAmount, e.hoursWorked, e.leaveDays, e.incentive,
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), { href: url, download: `${user?.name || "technician"}_entries.csv` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert("Export failed. Please try again."); }
    finally { setExporting(false); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg }}>
        <Navbar />
        <div style={{ textAlign: "center", padding: "100px 20px", color: C.dim }}>
          <div style={{ width: "1px", height: "32px", background: C.blue, margin: "0 auto 16px", opacity: 0.6 }} />
          <p style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase" }}>Loading…</p>
        </div>
      </div>
    );
  }

  const { user, entries = [], total = 0, pages = 1 } = data || {};

  /* summary totals */
  const totals = entries.reduce((acc, e) => ({
    labour:    acc.labour    + (e.labourAmount || 0),
    hours:     acc.hours     + (e.hoursWorked  || 0),
    incentive: acc.incentive + (e.incentive     || 0),
    leave:     acc.leave     + (e.leaveDays     || 0),
  }), { labour: 0, hours: 0, incentive: 0, leave: 0 });

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: C.text }}>
      <Navbar />

      {editingEntry && (
        <EditEntryModal entry={editingEntry} onClose={() => setEditing(null)} onSaved={fetchData} />
      )}

      <div style={{ padding: "28px 16px 48px", maxWidth: "960px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "28px", borderBottom: `1px solid ${C.border2}`, paddingBottom: "24px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "transparent", border: "none", color: C.dim,
              fontSize: "11px", cursor: "pointer", padding: "0",
              fontFamily: "'IBM Plex Sans', sans-serif",
              letterSpacing: "0.10em", textTransform: "uppercase",
              marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px",
              transition: "color 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.color = C.muted}
            onMouseOut={e => e.currentTarget.style.color = C.dim}
          >← Back</button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <h1 style={{
                fontSize: "28px", fontWeight: "800", margin: 0,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>{user?.name}</h1>
              <div style={{ display: "flex", gap: "10px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", color: C.blueL, letterSpacing: "0.08em" }}>
                  {user?.technicianId}
                </span>
                <span style={{ fontSize: "10px", color: C.dim }}>·</span>
                <span style={{ fontSize: "12px", color: C.muted, letterSpacing: "0.06em" }}>
                  {user?.branch} Branch
                </span>
                <span style={{ fontSize: "10px", color: C.dim }}>·</span>
                <span style={{ fontSize: "12px", color: C.dim }}>
                  {total} entr{total === 1 ? "y" : "ies"}
                </span>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                padding: "9px 18px",
                background: "transparent",
                border: `1px solid ${exporting ? C.border : C.border}`,
                borderRadius: "3px", color: exporting ? C.dim : C.muted,
                fontSize: "10px", fontWeight: "700", letterSpacing: "0.12em",
                textTransform: "uppercase", cursor: exporting ? "not-allowed" : "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.15s",
                flexShrink: 0,
              }}
              onMouseOver={e => { if (!exporting) { e.currentTarget.style.borderColor = C.blueL; e.currentTarget.style.color = C.blueL; }}}
              onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
            >
              {exporting ? "Exporting…" : "↓ Export CSV"}
            </button>
          </div>
        </div>

        {/* ── Totals strip ── */}
        {entries.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px", marginBottom: "24px",
          }}>
            {[
              { label: "Total Labour",   value: `₹${totals.labour.toLocaleString("en-IN")}`,    accent: C.amber },
              { label: "Total Hours",    value: `${totals.hours} hrs`,                           accent: C.greenL },
              { label: "Total Incentive",value: `₹${totals.incentive.toLocaleString("en-IN")}`, accent: C.blueL },
              { label: "Total Leave",    value: `${totals.leave} days`,                          accent: C.dim },
            ].map(({ label, value, accent }) => (
              <div key={label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: "4px", padding: "12px 14px",
                borderTop: `2px solid ${accent}`,
              }}>
                <p style={{ fontSize: "8px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: "6px" }}>
                  {label}
                </p>
                <p style={{ fontSize: "18px", fontWeight: "800", color: C.text, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.02em" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Entries ── */}
        {entries.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px",
            padding: "64px 20px", textAlign: "center",
          }}>
            <p style={{ fontSize: "14px", color: C.muted, fontWeight: "600" }}>No entries yet</p>
            <p style={{ fontSize: "12px", color: C.dim, marginTop: "6px" }}>
              This technician hasn't logged any work entries.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {entries.map(e => (
                <EntryCard key={e._id} entry={e} onEdit={setEditing} onDelete={handleDelete} />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{
                display: "flex", justifyContent: "center",
                alignItems: "center", gap: "16px", marginTop: "28px",
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "8px 18px", background: "transparent",
                    border: `1px solid ${page === 1 ? C.border2 : C.border}`,
                    borderRadius: "3px",
                    color: page === 1 ? C.dim : C.muted,
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    fontSize: "11px", fontWeight: "600", letterSpacing: "0.10em",
                    textTransform: "uppercase", fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >← Prev</button>

                <span style={{ fontSize: "11px", color: C.dim, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em" }}>
                  {page} / {pages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  style={{
                    padding: "8px 18px", background: "transparent",
                    border: `1px solid ${page === pages ? C.border2 : C.border}`,
                    borderRadius: "3px",
                    color: page === pages ? C.dim : C.muted,
                    cursor: page === pages ? "not-allowed" : "pointer",
                    fontSize: "11px", fontWeight: "600", letterSpacing: "0.10em",
                    textTransform: "uppercase", fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}