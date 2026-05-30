import { useForm } from "react-hook-form";
import { useState } from "react";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";

/* ─── Global keyframes ──────────────────────────────────────────── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

  @keyframes slideUpSheet {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes spinnerRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes progressFill {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }

  /* Kill number spinners everywhere */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }

  /* ── Sheet scrollbar ── */
  .ef-sheet::-webkit-scrollbar { width: 4px; }
  .ef-sheet::-webkit-scrollbar-track { background: #F8FAFC; }
  .ef-sheet::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }

  /* ── Input focus ring ── */
  .ef-input:focus {
    border-color: #1E3A8A !important;
    background: #FFFFFF !important;
    outline: none;
  }

  /* ── Input error state ── */
  .ef-input.ef-err {
    border-color: #DC2626 !important;
    background: #FEF2F2 !important;
  }

  /* ── Select arrow ── */
  .ef-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%231E3A8A' d='M7 9.5L2 4.5h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 40px !important;
    cursor: pointer;
  }

  /* ── Close button hover ── */
  .ef-close-btn:hover {
    background: #F1F5F9 !important;
    border-color: #94A3B8 !important;
  }

  /* ── Submit button hover / active ── */
  .ef-submit:hover:not(:disabled) {
    background: #1E40AF !important;
  }
  .ef-submit:active:not(:disabled) {
    background: #1E3A8A !important;
    transform: scale(0.99);
  }
  .ef-submit:disabled {
    background: #93C5FD !important;
    cursor: not-allowed;
  }

  /* ── Date input: ensure dark text on light background ── */
  input[type="date"] {
    color-scheme: light;
  }
`;

/* ─── Progress bar (top of sheet while saving) ─────────────────── */
const ProgressBar = ({ visible }) => (
  <div style={{
    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
    background: "#DDE3EE", zIndex: 20, borderRadius: "16px 16px 0 0",
    overflow: "hidden",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.2s ease",
  }}>
    {visible && (
      <div style={{
        position: "absolute", inset: 0,
        background: "#1E3A8A",
        animation: "progressFill 1.8s ease-in-out infinite alternate",
      }} />
    )}
  </div>
);

/* ─── Spinner ───────────────────────────────────────────────────── */
const Spinner = () => (
  <span style={{
    display: "inline-block", width: "18px", height: "18px",
    border: "2.5px solid #BFDBFE",
    borderTopColor: "#FFFFFF",
    borderRadius: "50%",
    animation: "spinnerRotate 0.65s linear infinite",
    verticalAlign: "middle", marginRight: "10px", flexShrink: 0,
  }} />
);

/* ─── Section divider ───────────────────────────────────────────── */
const SectionDivider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0 0" }}>
    <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
    <span style={{
      fontSize: "9px", fontWeight: "700", letterSpacing: "0.2em",
      textTransform: "uppercase", color: "#94A3B8", whiteSpace: "nowrap",
    }}>{label}</span>
    <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
  </div>
);

/* ─── Field label ───────────────────────────────────────────────── */
const FieldLabel = ({ text, required }) => (
  <label style={{
    display: "block",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#374151",
    marginBottom: "8px",
    fontFamily: "'IBM Plex Sans', sans-serif",
  }}>
    {text}{required && <span style={{ color: "#1E3A8A", marginLeft: "3px" }}>*</span>}
  </label>
);

/* ─── Field error ───────────────────────────────────────────────── */
const FieldError = ({ msg }) => (
  <p style={{
    margin: "6px 0 0", fontSize: "11px", fontWeight: "600",
    color: "#DC2626", letterSpacing: "0.02em",
    fontFamily: "'IBM Plex Sans', sans-serif",
  }}>{msg}</p>
);

export default function EntryForm({ onClose, onSaved }) {
  const [loading, setLoading]         = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register, handleSubmit, formState: { errors },
  } = useForm({
    defaultValues: {
      date:         new Date().toISOString().split("T")[0],
      labourAmount: "",
      leaveDays:    "",
      hoursWorked:  "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      await api.post("/api/entries", {
        ...data,
        labourAmount: Number(data.labourAmount) || 0,
        leaveDays:    Number(data.leaveDays)    || 0,
        hoursWorked:  Number(data.hoursWorked)  || 0,
      });
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared input style ─────────────────────────────────────── */
  const inputBase = {
    width: "100%",
    boxSizing: "border-box",
    height: "56px",                   /* fat touch target */
    padding: "0 14px",
    background: "#F8FAFC",
    border: "1.5px solid #CBD5E1",
    borderRadius: "0",                /* sharp — corporate */
    color: "#0A1628",
    fontSize: "18px",
    fontWeight: "700",                /* extra bold for sun */
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    transition: "border-color 0.15s ease, background 0.15s ease",
    opacity: loading ? 0.6 : 1,
    pointerEvents: loading ? "none" : "auto",
  };

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* ── Backdrop ── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(10, 22, 40, 0.72)",
          /* no blur — performance + sunlight readability */
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}
        onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
      >
        {/* ── Bottom sheet ── */}
        <div
          className="ef-sheet"
          style={{
            background: "#FFFFFF",
            borderRadius: "16px 16px 0 0",
            width: "100%",
            maxWidth: "520px",
            maxHeight: "94dvh",
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: "env(safe-area-inset-bottom, 24px)",
            WebkitOverflowScrolling: "touch",
            animation: "slideUpSheet 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Saving progress bar */}
          <ProgressBar visible={loading} />

          {/* ── Sticky header ── */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: "#FFFFFF",
            borderBottom: "1.5px solid #E2E8F0",
            padding: "14px 20px 14px",
          }}>
            {/* Drag handle */}
            <div style={{
              width: 40, height: 4, background: "#CBD5E1",
              borderRadius: 2, margin: "0 auto 14px",
            }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "22px", fontWeight: "700",
                  color: "#0A1628",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  margin: 0, lineHeight: 1,
                }}>
                  New Entry
                </h2>
                <p style={{
                  fontSize: "11px", fontWeight: "600",
                  color: loading ? "#93C5FD" : "#6B7A99",
                  marginTop: "4px", letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  transition: "color 0.2s",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  {loading ? "Saving…" : "Daily job card"}
                </p>
              </div>

              <button
                type="button"
                className="ef-close-btn"
                onClick={onClose}
                disabled={loading}
                style={{
                  background: "#F8FAFC",
                  border: "1.5px solid #DDE3EE",
                  borderRadius: "0",
                  width: "44px", height: "44px",   /* WCAG touch target */
                  color: "#374151",
                  fontSize: "22px",
                  fontWeight: "400",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, lineHeight: 1,
                  WebkitTapHighlightColor: "transparent",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >×</button>
            </div>
          </div>

          {/* ── Form body ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              display: "flex", flexDirection: "column",
              gap: "22px",
              padding: "24px 20px 36px",
            }}
          >

            {/* ── Date ── */}
            <div>
              <FieldLabel text="Date" required />
              <input
                type="date"
                className={`ef-input${errors.date ? " ef-err" : ""}`}
                style={{ ...inputBase, fontSize: "16px" }}
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && <FieldError msg={errors.date.message} />}
            </div>

            {/* ── Category ── */}
            <div>
              <FieldLabel text="Category" required />
              <select
                className={`ef-input ef-select${errors.category ? " ef-err" : ""}`}
                style={{ ...inputBase, fontSize: "16px" }}
                {...register("category", { required: "Category is required" })}
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <FieldError msg={errors.category.message} />}
            </div>

            <SectionDivider label="Job Details" />

            {/* ── JC No + Vehicle No ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <FieldLabel text="JC No" required />
                <input
                  type="text"
                  placeholder="JC-0001"
                  className={`ef-input${errors.jcNo ? " ef-err" : ""}`}
                  style={{
                    ...inputBase,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: "15px",
                    letterSpacing: "0.04em",
                  }}
                  {...register("jcNo", { required: "JC No is required" })}
                />
                {errors.jcNo && <FieldError msg={errors.jcNo.message} />}
              </div>

              <div>
                <FieldLabel text="Vehicle No" />
                <input
                  type="text"
                  placeholder="KA-01 AB 1234"
                  className="ef-input"
                  style={{
                    ...inputBase,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: "13px",
                    letterSpacing: "0.04em",
                  }}
                  {...register("vehicleNo")}
                />
              </div>
            </div>

            <SectionDivider label="Financials & Hours" />

            {/* ── Labour Amount ── */}
            <div>
              <FieldLabel text="Labour Amount" required />
              <div style={{ position: "relative" }}>
                {/* Rupee prefix — solid, high contrast */}
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: "48px",
                  background: "#1E3A8A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFFFFF",
                  fontSize: "18px", fontWeight: "700",
                  pointerEvents: "none",
                  userSelect: "none",
                  zIndex: 1,
                }}>₹</div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className={`ef-input${errors.labourAmount ? " ef-err" : ""}`}
                  style={{ ...inputBase, paddingLeft: "62px" }}
                  {...register("labourAmount", {
                    required: "Labour amount is required",
                    min: { value: 0, message: "Cannot be negative" },
                  })}
                />
              </div>
              {errors.labourAmount && <FieldError msg={errors.labourAmount.message} />}
            </div>

            {/* ── Hours Worked ── */}
            <div>
              <FieldLabel text="Hours Worked" required />
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: "48px",
                  background: "#1E3A8A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFFFFF",
                  fontSize: "13px", fontWeight: "700", letterSpacing: "0.04em",
                  pointerEvents: "none",
                  userSelect: "none",
                  zIndex: 1,
                }}>HRS</div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className={`ef-input${errors.hoursWorked ? " ef-err" : ""}`}
                  style={{ ...inputBase, paddingLeft: "62px" }}
                  {...register("hoursWorked", {
                    required: "Hours worked is required",
                    min: { value: 0, message: "Cannot be negative" },
                  })}
                />
              </div>
              {errors.hoursWorked && <FieldError msg={errors.hoursWorked.message} />}
            </div>

            {/* ── Leave Days ── */}
            <div>
              <FieldLabel text="Leave Days" />
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: "48px",
                  background: "#64748B",    /* muted — optional field */
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFFFFF",
                  fontSize: "11px", fontWeight: "700", letterSpacing: "0.04em",
                  pointerEvents: "none",
                  userSelect: "none",
                  zIndex: 1,
                }}>LVE</div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className={`ef-input${errors.leaveDays ? " ef-err" : ""}`}
                  style={{ ...inputBase, paddingLeft: "62px" }}
                  {...register("leaveDays", {
                    min: { value: 0, message: "Cannot be negative" },
                  })}
                />
              </div>
              {errors.leaveDays && <FieldError msg={errors.leaveDays.message} />}
              {/* Helper text — subtle but readable */}
              <p style={{
                margin: "6px 0 0", fontSize: "11px", color: "#94A3B8",
                fontWeight: "500", fontFamily: "'IBM Plex Sans', sans-serif",
              }}>Leave blank if no leave this day</p>
            </div>

            {/* ── Server error ── */}
            {serverError && (
              <div style={{
                background: "#FEF2F2",
                border: "1.5px solid #FCA5A5",
                borderLeft: "4px solid #DC2626",
                padding: "14px 16px",
              }}>
                <p style={{
                  margin: 0, fontSize: "13px", fontWeight: "600",
                  color: "#991B1B",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>{serverError}</p>
              </div>
            )}

            {/* ── Submit button ── */}
            <button
              type="submit"
              className="ef-submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "60px",               /* large, easy to tap */
                background: "#1E3A8A",
                border: "none",
                borderRadius: "0",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
                marginTop: "6px",
                transition: "background 0.15s ease, transform 0.1s ease",
                WebkitTapHighlightColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading
                ? <><Spinner />Saving Entry…</>
                : "Save Entry"
              }
            </button>

          </form>
        </div>
      </div>
    </>
  );
}