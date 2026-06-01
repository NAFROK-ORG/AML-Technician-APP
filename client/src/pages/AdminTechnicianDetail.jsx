import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";

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

const INJECTED = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes adFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUpSheet { from { transform:translateY(100%); } to { transform:translateY(0); } }
  @keyframes spin { to { transform:rotate(360deg); } }

  .ad-a1 { animation: adFadeUp 0.3s ease both 0.00s; }
  .ad-a2 { animation: adFadeUp 0.3s ease both 0.06s; }
  .ad-a3 { animation: adFadeUp 0.3s ease both 0.12s; }
  .ad-a4 { animation: adFadeUp 0.3s ease both 0.18s; }

  .ad-back-btn {
    background: transparent; border: none; color: #94A3B8;
    font-size: 10px; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    letter-spacing: 0.14em; text-transform: uppercase;
    padding: 0; margin-bottom: 18px;
    display: flex; align-items: center; gap: 6px;
    transition: color 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .ad-back-btn:hover { color: #1E3A8A; }

  .ad-export-btn {
    padding: 10px 20px;
    background: transparent;
    border: 1px solid #DDE3EE;
    border-radius: 0;
    color: #6B7A99;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    transition: all 0.15s; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .ad-export-btn:hover:not(:disabled) { border-color: #1E3A8A; color: #1E3A8A; }
  .ad-export-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .ad-entry-card {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    transition: border-left-color 0.15s;
  }

  .ad-edit-btn {
    background: transparent; border: none;
    color: #1E3A8A; font-size: 10px; font-weight: 700;
    cursor: pointer; letter-spacing: 0.12em;
    font-family: 'IBM Plex Sans', sans-serif;
    padding: 4px 0; text-transform: uppercase;
    transition: color 0.15s;
  }
  .ad-edit-btn:hover { color: #1E40AF; }

  .ad-delete-btn {
    background: transparent; border: none;
    color: #CBD5E1; font-size: 10px; font-weight: 700;
    cursor: pointer; letter-spacing: 0.12em;
    font-family: 'IBM Plex Sans', sans-serif;
    padding: 4px 0; text-transform: uppercase;
    transition: color 0.15s;
  }
  .ad-delete-btn:hover { color: #DC2626; }

  .ad-page-btn {
    padding: 9px 20px;
    background: #FFFFFF; border: 1px solid #DDE3EE; border-radius: 0;
    color: #374151; font-size: 10px; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    transition: all 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .ad-page-btn:hover:not(:disabled) { border-color: #1E3A8A; color: #1E3A8A; }
  .ad-page-btn:disabled { color: #CBD5E1; cursor: not-allowed; border-color: #EEF2F7; background: #F8FAFC; }

  /* Edit modal sheet */
  .ad-sheet { background: #FFFFFF; }
  .ad-sheet::-webkit-scrollbar { width: 4px; }
  .ad-sheet::-webkit-scrollbar-track { background: #F8FAFC; }
  .ad-sheet::-webkit-scrollbar-thumb { background: #CBD5E1; }

  .ad-modal-input {
    width: 100%; box-sizing: border-box;
    height: 48px; padding: 0 12px;
    background: #F8FAFC; border: 1px solid #DDE3EE; border-radius: 0;
    color: #0A1628; font-size: 15px; font-weight: 600;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none; appearance: none; -webkit-appearance: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .ad-modal-input:focus { border-color: #1E3A8A; background: #FFFFFF; }
  .ad-modal-input.err { border-color: #DC2626; background: #FEF2F2; }

  .ad-stepper-wrap {
    display: flex; align-items: center;
    border: 1px solid #DDE3EE; height: 48px; overflow: hidden;
    background: #F8FAFC;
  }
  .ad-stepper-btn {
    width: 48px; height: 100%; flex-shrink: 0;
    background: transparent; border: none;
    color: #6B7A99; font-size: 20px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    line-height: 1; transition: color 0.1s, background 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .ad-stepper-btn:hover { background: #EEF2F7; color: #1E3A8A; }
  .ad-stepper-btn:disabled { color: #DDE3EE; cursor: not-allowed; }

  .ad-submit-btn {
    width: 100%; height: 56px;
    background: #1E3A8A; border: none; border-radius: 0;
    color: #FFFFFF; font-size: 11px; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
    cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    transition: background 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .ad-submit-btn:hover:not(:disabled) { background: #1E40AF; }
  .ad-submit-btn:disabled { background: #93C5FD; cursor: not-allowed; }

  .ad-close-btn {
    background: #F8FAFC; border: 1px solid #DDE3EE; border-radius: 0;
    width: 40px; height: 40px;
    color: #374151; font-size: 20px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .ad-close-btn:hover { background: #EEF2F7; border-color: #94A3B8; }

  @media (max-width: 540px) {
    .ad-totals-grid { grid-template-columns: 1fr 1fr !important; }
    .ad-header-row { flex-direction: column !important; align-items: flex-start !important; }
    .ad-entry-top { flex-direction: column !important; gap: 8px !important; }
    .ad-stats-4 { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;

/* ─── Field label ────────────────────────────────────────────────── */
const FLabel = ({ text, required }) => (
  <div style={{
    fontSize: "9px", fontWeight: "700", letterSpacing: "0.16em",
    textTransform: "uppercase", color: C.mid, marginBottom: "8px",
    fontFamily: "'IBM Plex Sans', sans-serif",
  }}>
    {text}{required && <span style={{ color: C.navy, marginLeft: "3px" }}>*</span>}
  </div>
);

/* ─── Field error ────────────────────────────────────────────────── */
const FErr = ({ msg }) => (
  <p style={{
    margin: "5px 0 0", fontSize: "11px", fontWeight: "600",
    color: C.danger, letterSpacing: "0.02em",
  }}>{msg}</p>
);

/* ─── Section divider ────────────────────────────────────────────── */
const SDivider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
    <div style={{ flex: 1, height: "1px", background: C.border }} />
    <span style={{
      fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
      textTransform: "uppercase", color: C.dim, whiteSpace: "nowrap",
    }}>{label}</span>
    <div style={{ flex: 1, height: "1px", background: C.border }} />
  </div>
);

/* ─── Stepper ────────────────────────────────────────────────────── */
function Stepper({ label, name, step = 1, required = true, register, setValue, watch, prefix = "" }) {
  const val = typeof watch(name) === "number" ? watch(name) : 0;
  const adj = (delta) => setValue(name, Math.max(0, val + delta));

  return (
    <div>
      <FLabel text={label} required={required} />
      <div className="ad-stepper-wrap">
        <button
          type="button" className="ad-stepper-btn"
          onClick={() => adj(-step)} disabled={val === 0}
          style={{ borderRight: `1px solid ${C.border}` }}
        >−</button>

        <div style={{
          flex: 1, display: "flex", alignItems: "center",
          justifyContent: "center", gap: "4px", pointerEvents: "none",
        }}>
          {prefix && (
            <span style={{ fontSize: "14px", color: C.muted, fontWeight: "600" }}>{prefix}</span>
          )}
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "22px", fontWeight: "700", color: C.ink, letterSpacing: "0.02em",
          }}>{val.toLocaleString("en-IN")}</span>
        </div>

        <input type="number" style={{ display: "none" }}
          {...register(name, {
            valueAsNumber: true, min: 0,
            required: required ? `${label} is required` : false,
          })} />

        <button
          type="button" className="ad-stepper-btn"
          onClick={() => adj(step)}
          style={{ borderLeft: `1px solid ${C.border}` }}
        >+</button>
      </div>
    </div>
  );
}

/* ─── Edit Entry Modal ───────────────────────────────────────────── */
function EditEntryModal({ entry, onClose, onSaved }) {
  const [loading,     setLoading]     = useState(false);
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
        background: "rgba(10,22,40,0.72)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
      onClick={e => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        className="ad-sheet"
        style={{
          borderRadius: "16px 16px 0 0",
          width: "100%", maxWidth: "520px",
          maxHeight: "94dvh", overflowY: "auto", overflowX: "hidden",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
          WebkitOverflowScrolling: "touch",
          animation: "slideUpSheet 0.3s cubic-bezier(0.22,1,0.36,1) both",
          position: "relative",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: C.card, borderBottom: `1.5px solid ${C.border}`,
          padding: "14px 20px 14px",
        }}>
          <div style={{
            width: 40, height: 4, background: C.border,
            borderRadius: 2, margin: "0 auto 14px",
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "22px", fontWeight: "700", color: C.ink,
                letterSpacing: "0.04em", textTransform: "uppercase",
                margin: 0, lineHeight: 1,
              }}>Edit Entry</h2>
              <p style={{
                fontSize: "11px", color: C.muted,
                marginTop: "4px", letterSpacing: "0.08em",
                textTransform: "uppercase", fontWeight: "600",
              }}>
                JC: <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", color: C.navy,
                }}>{entry.jcNo}</span>
              </p>
            </div>
            <button className="ad-close-btn" type="button" onClick={onClose} disabled={loading}>×</button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px 20px 32px" }}
        >
          {/* Date + Category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <FLabel text="Date" required />
              <input
                type="date"
                className={`ad-modal-input${errors.date ? " err" : ""}`}
                style={{ colorScheme: "light" }}
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && <FErr msg={errors.date.message} />}
            </div>
            <div>
              <FLabel text="Category" required />
              <select
                className={`ad-modal-input${errors.category ? " err" : ""}`}
                style={{
                  cursor: "pointer",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231E3A8A' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                  paddingRight: "36px",
                }}
                {...register("category", { required: "Category is required" })}
              >
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <FErr msg={errors.category.message} />}
            </div>
          </div>

          {/* JC + Vehicle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <FLabel text="JC No" required />
              <input
                type="text"
                className={`ad-modal-input${errors.jcNo ? " err" : ""}`}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
                {...register("jcNo", { required: "JC No is required" })}
              />
              {errors.jcNo && <FErr msg={errors.jcNo.message} />}
            </div>
            <div>
              <FLabel text="Vehicle No" />
              <input
                type="text"
                className="ad-modal-input"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
                {...register("vehicleNo")}
              />
            </div>
          </div>

          <SDivider label="Financials & Hours" />

          <Stepper label="Labour Amount" name="labourAmount" step={100} prefix="₹" {...sp} />
          <Stepper label="Hours Worked"  name="hoursWorked"  step={1}            {...sp} />
          <Stepper label="Leave Days"    name="leaveDays"    step={1}            {...sp} />
          <Stepper label="Incentive"     name="incentive"    step={100} prefix="₹" required={false} {...sp} />

          {serverError && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderLeft: "3px solid #DC2626", padding: "12px 14px",
            }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#991B1B" }}>
                {serverError}
              </p>
            </div>
          )}

          <button type="submit" className="ad-submit-btn" disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
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
      {/* Top */}
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

      {/* Stats row */}
      <div className="ad-stats-4" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1px", background: C.border,
        borderTop: `1px solid ${C.border}`,
      }}>
        {[
          { label: "Labour",    value: `₹${Number(entry.labourAmount || 0).toLocaleString("en-IN")}`, color: C.amber  },
          { label: "Hours",     value: `${entry.hoursWorked || 0}h`,                                  color: C.success },
          { label: "Leave",     value: `${entry.leaveDays || 0}d`,                                    color: C.muted  },
          { label: "Incentive", value: `₹${Number(entry.incentive || 0).toLocaleString("en-IN")}`,   color: C.navy   },
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

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [page,         setPage]         = useState(1);
  const [editingEntry, setEditing]      = useState(null);
  const [exporting,    setExporting]    = useState(false);

  /* inject styles */
  useEffect(() => {
    const id = "ad-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = INJECTED;
      document.head.appendChild(el);
    }
    return () => { const el = document.getElementById(id); if (el) document.head.removeChild(el); };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const r = await api.get(`/api/admin/technician/${userId}?page=${page}&limit=20`);
      setData(r.data);
      setAccessDenied(false);
    } catch (e) {
      if (e.response?.status === 403) setAccessDenied(true);
      else console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

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
        .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
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

  const { user, entries = [], total = 0, pages = 1 } = data || {};

  const totals = entries.reduce((acc, e) => ({
    labour:    acc.labour    + (e.labourAmount || 0),
    hours:     acc.hours     + (e.hoursWorked  || 0),
    incentive: acc.incentive + (e.incentive    || 0),
    leave:     acc.leave     + (e.leaveDays    || 0),
  }), { labour: 0, hours: 0, incentive: 0, leave: 0 });

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
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "12px", color: C.navy, letterSpacing: "0.08em",
                  fontWeight: "600", background: "#EEF2F7",
                  border: `1px solid ${C.border}`, padding: "2px 8px",
                }}>{user?.technicianId}</span>
                <span style={{ fontSize: "10px", color: C.dim }}>·</span>
                <span style={{ fontSize: "12px", color: C.muted }}>{user?.branch} Branch</span>
                <span style={{ fontSize: "10px", color: C.dim }}>·</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px", color: C.dim,
                }}>{total} entr{total === 1 ? "y" : "ies"}</span>
              </div>
            </div>
            <button className="ad-export-btn" onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting…" : "↓ Export CSV"}
            </button>
          </div>
        </div>

        {/* ── Totals strip ── */}
        {entries.length > 0 && (
          <div className="ad-a2 ad-totals-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1px", background: C.border,
            border: `1px solid ${C.border}`,
            marginBottom: "20px",
          }}>
            {[
              { label: "Total Labour",    value: `₹${totals.labour.toLocaleString("en-IN")}`,    accent: C.amber  },
              { label: "Total Hours",     value: `${totals.hours} hrs`,                           accent: C.success },
              { label: "Total Incentive", value: `₹${totals.incentive.toLocaleString("en-IN")}`, accent: C.navy   },
              { label: "Total Leave",     value: `${totals.leave} days`,                          accent: C.muted  },
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
                  fontSize: "22px", fontWeight: "700", color: C.ink,
                  letterSpacing: "0.02em",
                }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Entries ── */}
        {entries.length === 0 ? (
          <div className="ad-a3" style={{
            background: C.card, border: `1px solid ${C.border}`,
            padding: "60px 20px", textAlign: "center",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "20px", fontWeight: "700",
              color: C.dim, letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: "6px",
            }}>No Entries Yet</div>
            <p style={{ fontSize: "13px", color: C.dim, margin: 0 }}>
              This technician hasn't logged any work entries.
            </p>
          </div>
        ) : (
          <div className="ad-a3">
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

            {/* Pagination */}
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