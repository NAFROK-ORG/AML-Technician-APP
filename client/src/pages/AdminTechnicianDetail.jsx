import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";

const CATEGORY_COLORS = {
  "Engine Repair":   { bg: "rgba(30,111,217,0.15)",  color: "#3B8FFF" },
  "Electrical":      { bg: "rgba(255,193,7,0.12)",   color: "#FFC107" },
  "Body Work":       { bg: "rgba(29,184,122,0.12)",  color: "#1DB87A" },
  "Transmission":    { bg: "rgba(156,39,176,0.12)",  color: "#CE93D8" },
  "AC & Cooling":    { bg: "rgba(0,188,212,0.12)",   color: "#00BCD4" },
  "General Service": { bg: "rgba(255,87,34,0.12)",   color: "#FF7043" },
};

// ── Stepper used inside Edit Modal ──────────────────────────────────────────
function Stepper({ label, name, step = 1, required = true, register, setValue, watch }) {
  const val = watch(name) ?? 0;
  return (
    <div>
      <label className="al-label">{label}{required && " *"}</label>
      <div className="stepper">
        <button type="button" onClick={() => setValue(name, Math.max(0, Number(val) - step))}>−</button>
        <input
          type="number" min="0"
          {...register(name, { valueAsNumber: true, min: 0 })}
        />
        <button type="button" onClick={() => setValue(name, Number(val) + step)}>+</button>
      </div>
    </div>
  );
}

// ── Edit Entry Modal ─────────────────────────────────────────────────────────
function EditEntryModal({ entry, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setServerError("");
    try {
      await api.put(`/api/admin/entry/${entry._id}`, {
        ...data,
        labourAmount: Number(data.labourAmount),
        hoursWorked:  Number(data.hoursWorked),
        leaveDays:    Number(data.leaveDays),
        incentive:    Number(data.incentive),
      });
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const stepperProps = { register, setValue, watch };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(10,22,40,0.93)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="fade-up" style={{
        background: "var(--navy-mid)", border: "1px solid var(--border)",
        borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: "520px",
        maxHeight: "92dvh", overflowY: "auto",
        padding: "24px 20px 40px",
      }}>
        {/* Handle */}
        <div style={{
          width: 40, height: 4, background: "var(--steel)",
          borderRadius: 2, margin: "0 auto 20px", opacity: 0.4,
        }} />

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: "24px",
        }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Edit Entry</h2>
            <p style={{ color: "var(--steel)", fontSize: "13px", marginTop: "2px" }}>
              JC:{" "}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{entry.jcNo}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--navy-light)", border: "none", borderRadius: "8px",
              width: 36, height: 36, color: "var(--steel)", fontSize: "18px",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Date */}
          <div>
            <label className="al-label">Date *</label>
            <input className="al-input" type="date"
              {...register("date", { required: "Date is required" })}
            />
            {errors.date && <p className="al-error">{errors.date.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="al-label">Category *</label>
            <select className="al-input"
              {...register("category", { required: "Category is required" })}
            >
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="al-error">{errors.category.message}</p>}
          </div>

          {/* JC No + Vehicle No */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="al-label">JC No *</label>
              <input className="al-input" type="text"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                {...register("jcNo", { required: "JC No is required" })}
              />
              {errors.jcNo && <p className="al-error">{errors.jcNo.message}</p>}
            </div>
            <div>
              <label className="al-label">Vehicle No</label>
              <input className="al-input" type="text"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px" }}
                {...register("vehicleNo")}
              />
            </div>
          </div>

          {/* Numeric steppers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Stepper label="Labour (₹)"  name="labourAmount" step={100} {...stepperProps} />
            <Stepper label="Hours Worked" name="hoursWorked"  step={1}   {...stepperProps} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Stepper label="Leave Days"   name="leaveDays"   step={1}   {...stepperProps} />
            <Stepper label="Incentive (₹)" name="incentive"  step={100} required={false} {...stepperProps} />
          </div>

          {serverError && (
            <div style={{
              background: "rgba(224,59,59,0.12)", border: "1px solid rgba(224,59,59,0.3)",
              borderRadius: "8px", padding: "12px 14px",
              color: "var(--danger)", fontSize: "14px",
            }}>{serverError}</div>
          )}

          <button className="al-btn" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit, onDelete }) {
  const catStyle = CATEGORY_COLORS[entry.category] || { bg: "rgba(139,163,199,0.12)", color: "var(--steel)" };
  const date = new Date(entry.date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div style={{
      background: "var(--navy-mid)", border: "1px solid var(--border)",
      borderRadius: "12px", padding: "16px",
    }}>
      {/* Top row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: "12px",
      }}>
        <div>
          <span style={{
            display: "inline-block",
            background: catStyle.bg, color: catStyle.color,
            fontSize: "11px", fontWeight: "600",
            letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "3px 10px", borderRadius: "20px", marginBottom: "6px",
          }}>{entry.category}</span>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", color: "var(--steel)" }}>
            JC: {entry.jcNo}
            {entry.vehicleNo && (
              <span style={{ marginLeft: "10px" }}>· {entry.vehicleNo}</span>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "13px", color: "var(--steel)" }}>{date}</div>
          <div style={{ display: "flex", gap: "10px", marginTop: "6px", justifyContent: "flex-end" }}>
            <button
              onClick={() => onEdit(entry)}
              style={{
                background: "transparent", border: "none",
                color: "var(--blue-light)", fontSize: "12px",
                cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
                padding: "2px 0",
              }}
            >Edit</button>
            <button
              onClick={() => onDelete(entry._id)}
              style={{
                background: "transparent", border: "none",
                color: "rgba(224,59,59,0.5)", fontSize: "12px",
                cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
                padding: "2px 0", transition: "color 0.15s",
              }}
              onMouseOver={e => { e.target.style.color = "var(--danger)"; }}
              onMouseOut={e => { e.target.style.color = "rgba(224,59,59,0.5)"; }}
            >Delete</button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border)",
      }}>
        {[
          { label: "Labour",   value: `₹${entry.labourAmount}` },
          { label: "Hours",    value: entry.hoursWorked },
          { label: "Leave",    value: `${entry.leaveDays}d` },
          { label: "Incentive",value: `₹${entry.incentive}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--steel)", marginBottom: "2px", letterSpacing: "0.05em" }}>
              {label}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "600", fontFamily: "'IBM Plex Mono', monospace" }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminTechnicianDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editingEntry, setEditingEntry] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin/technician/${userId}?page=${page}&limit=20`);
      setData(res.data);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/api/admin/technician/${userId}/export`);
      const { user, entries } = res.data;

      const headers = [
        "Date", "Category", "Vehicle No", "JC No",
        "Labour (₹)", "Hours Worked", "Leave Days", "Incentive (₹)",
      ];

      const rows = entries.map(e => [
        new Date(e.date).toLocaleDateString("en-IN"),
        e.category,
        e.vehicleNo || "",
        e.jcNo,
        e.labourAmount,
        e.hoursWorked,
        e.leaveDays,
        e.incentive,
      ]);

      const csv = [headers, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${user?.name || "technician"}_entries.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--navy)" }}>
        <Navbar />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--steel)" }}>
          Loading…
        </div>
      </div>
    );
  }

  const { user, entries = [], total = 0, pages = 1 } = data || {};

  return (
    <div style={{ minHeight: "100dvh", background: "var(--navy)" }}>
      <Navbar />

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={fetchData}
        />
      )}

      <div style={{ padding: "20px 16px", maxWidth: "700px", margin: "0 auto" }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: "20px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "transparent", border: "none",
              color: "var(--steel)", fontSize: "13px", cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              marginBottom: "8px", padding: "0",
              display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            ← Back
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "700" }}>{user?.name}</h1>
              <p style={{
                color: "var(--blue-light)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px", marginTop: "2px",
              }}>
                {user?.technicianId} · {user?.branch} Branch
              </p>
              <p style={{ color: "var(--steel)", fontSize: "13px", marginTop: "6px" }}>
                {total} entr{total === 1 ? "y" : "ies"} total
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                background: "var(--navy-mid)",
                border: "1px solid var(--border)",
                borderRadius: "8px", padding: "8px 14px",
                color: "var(--steel)", fontSize: "13px",
                cursor: exporting ? "not-allowed" : "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
                transition: "all 0.2s",
                opacity: exporting ? 0.5 : 1,
                flexShrink: 0,
              }}
              onMouseOver={e => {
                if (!exporting) {
                  e.currentTarget.style.borderColor = "var(--blue)";
                  e.currentTarget.style.color = "var(--white)";
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--steel)";
              }}
            >
              {exporting ? "Exporting…" : "⬇ Export CSV"}
            </button>
          </div>
        </div>

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="al-card" style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
            <p style={{ fontWeight: "600" }}>No entries yet</p>
            <p style={{ color: "var(--steel)", fontSize: "14px", marginTop: "4px" }}>
              This technician hasn't logged any work entries.
            </p>
          </div>
        ) : (
          <>
            <div
              className="fade-up"
              style={{ display: "flex", flexDirection: "column", gap: "10px", animationDelay: "0.05s" }}
            >
              {entries.map(entry => (
                <EntryCard
                  key={entry._id}
                  entry={entry}
                  onEdit={setEditingEntry}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{
                display: "flex", justifyContent: "center",
                alignItems: "center", gap: "12px", marginTop: "24px",
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    background: "var(--navy-mid)", border: "1px solid var(--border)",
                    borderRadius: "8px", padding: "8px 16px",
                    color: page === 1 ? "var(--steel)" : "var(--white)",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    fontSize: "14px", fontFamily: "'IBM Plex Sans', sans-serif",
                    opacity: page === 1 ? 0.4 : 1, transition: "opacity 0.2s",
                  }}
                >
                  ← Prev
                </button>

                <span style={{
                  color: "var(--steel)", fontSize: "13px",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {page} / {pages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  style={{
                    background: "var(--navy-mid)", border: "1px solid var(--border)",
                    borderRadius: "8px", padding: "8px 16px",
                    color: page === pages ? "var(--steel)" : "var(--white)",
                    cursor: page === pages ? "not-allowed" : "pointer",
                    fontSize: "14px", fontFamily: "'IBM Plex Sans', sans-serif",
                    opacity: page === pages ? 0.4 : 1, transition: "opacity 0.2s",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ height: "32px" }} />
      </div>
    </div>
  );
}