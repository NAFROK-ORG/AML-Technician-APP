import { useForm } from "react-hook-form";
import { useState } from "react";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";

/* ── Skeleton pulse animation injected once ── */
const GLOBAL_STYLES = `
  @keyframes skeletonPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes fadeUpIn {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spinnerRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes progressSlide {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

/* ── Divider ── */
const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
    <div style={{ flex: 1, height: "1px", background: "#1E1E27" }} />
    {label && (
      <span style={{
        fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase",
        color: "#3F3F46", fontWeight: "700", whiteSpace: "nowrap",
      }}>{label}</span>
    )}
    <div style={{ flex: 1, height: "1px", background: "#1E1E27" }} />
  </div>
);

/* ── Inline spinner ── */
const Spinner = () => (
  <span style={{
    display: "inline-block", width: "16px", height: "16px",
    border: "2px solid #3F3F46", borderTopColor: "#71717A",
    borderRadius: "50%",
    animation: "spinnerRotate 0.7s linear infinite",
    verticalAlign: "middle", marginRight: "8px",
  }} />
);

/* ── Progress bar shown at top while saving ── */
const ProgressBar = ({ visible }) => (
  <div style={{
    position: "absolute", top: 0, left: 0, right: 0, height: "2px",
    background: "#1E1E27", overflow: "hidden",
    opacity: visible ? 1 : 0, transition: "opacity 0.2s",
    borderRadius: "16px 16px 0 0",
    zIndex: 20,
  }}>
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(90deg, transparent, #71717A, transparent)",
      animation: visible ? "progressSlide 1.1s ease-in-out infinite" : "none",
    }} />
  </div>
);

export default function EntryForm({ onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date:         new Date().toISOString().split("T")[0],
      labourAmount: "",
      leaveDays:    "",
      hoursWorked:  "",
      // incentive removed — calculated server-side from monthly aggregates
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

  /* ── Shared styles ── */
  const labelEl = (text, required) => (
    <label style={{
      fontSize: "9px", fontWeight: "700", letterSpacing: "0.14em",
      textTransform: "uppercase", color: "#71717A",
      display: "block", marginBottom: "8px",
    }}>
      {text}{required && " *"}
    </label>
  );

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "#111118", border: "1px solid #27272A",
    borderRadius: "4px", color: "#FAFAFA",
    fontSize: "18px", fontWeight: "600",
    padding: "0 14px", height: "52px",
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: "none", appearance: "none", WebkitAppearance: "none",
    MozAppearance: "textfield",
    opacity: loading ? 0.5 : 1,
    pointerEvents: loading ? "none" : "auto",
    transition: "opacity 0.2s, border-color 0.15s",
  };

  const errStyle = {
    fontSize: "10px", color: "#EF4444", marginTop: "5px", letterSpacing: "0.06em",
  };

  const onFocus = e => { if (!loading) e.target.style.borderColor = "#52525B"; };
  const onBlur  = e => { e.target.style.borderColor = "#27272A"; };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(5,5,10,0.88)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={e => e.target === e.currentTarget && !loading && onClose()}
    >
      <style>{GLOBAL_STYLES}</style>

      <div
        style={{
          background: "#0D0D14", border: "1px solid #1E1E27",
          borderRadius: "16px 16px 0 0", width: "100%", maxWidth: "520px",
          maxHeight: "94dvh", overflowY: "auto", overflowX: "hidden",
          padding: "0 0 env(safe-area-inset-bottom, 24px)",
          WebkitOverflowScrolling: "touch",
          animation: "fadeUpIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
          position: "relative",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Progress bar (top edge) ── */}
        <ProgressBar visible={loading} />

        {/* ── Sticky header ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "#0D0D14", padding: "16px 20px 14px",
          borderBottom: "1px solid #1E1E27",
        }}>
          <div style={{
            width: 36, height: 4, background: "#27272A",
            borderRadius: 2, margin: "0 auto 16px",
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{
                fontSize: "18px", fontWeight: "700", color: "#FAFAFA",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.04em", textTransform: "uppercase",
                margin: 0, lineHeight: 1,
              }}>New Entry</h2>
              <p style={{
                color: loading ? "#3F3F46" : "#52525B",
                fontSize: "11px", marginTop: "4px",
                letterSpacing: "0.06em", fontWeight: "600",
                transition: "color 0.2s",
              }}>
                {loading ? "Saving…" : "Daily job card"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: "#18181B", border: "1px solid #27272A", borderRadius: "4px",
                width: "36px", height: "36px",
                color: loading ? "#3F3F46" : "#71717A",
                fontSize: "18px", cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, lineHeight: 1, WebkitTapHighlightColor: "transparent",
                transition: "color 0.2s",
              }}
            >×</button>
          </div>
        </div>

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px 20px 32px" }}
        >
          {/* Date */}
          <div>
            {labelEl("Date", true)}
            <input
              type="date"
              style={{ ...inputStyle, fontSize: "14px", colorScheme: "dark" }}
              onFocus={onFocus} onBlur={onBlur}
              {...register("date", { required: "Date is required" })}
            />
            {errors.date && <p style={errStyle}>{errors.date.message}</p>}
          </div>

          {/* Category */}
          <div>
            {labelEl("Category", true)}
            <select
              style={{
                ...inputStyle, fontSize: "14px",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717A' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
                paddingRight: "36px", cursor: loading ? "not-allowed" : "pointer",
              }}
              onFocus={onFocus} onBlur={onBlur}
              {...register("category", { required: "Category is required" })}
            >
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p style={errStyle}>{errors.category.message}</p>}
          </div>

          <Divider label="Job Details" />

          {/* JC No + Vehicle No */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              {labelEl("JC No", true)}
              <input
                type="text" placeholder="JC-0001"
                style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px" }}
                onFocus={onFocus} onBlur={onBlur}
                {...register("jcNo", { required: "JC No is required" })}
              />
              {errors.jcNo && <p style={errStyle}>{errors.jcNo.message}</p>}
            </div>
            <div>
              {labelEl("Vehicle No", false)}
              <input
                type="text" placeholder="KA-01 AB 1234"
                style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px" }}
                onFocus={onFocus} onBlur={onBlur}
                {...register("vehicleNo")}
              />
            </div>
          </div>

          <Divider label="Financials & Time" />

          {/* Labour Amount — REQUIRED */}
          <div>
            {labelEl("Labour Amount", true)}
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                fontSize: "16px", color: "#71717A", fontWeight: "600", pointerEvents: "none",
              }}>₹</span>
              <input
                type="number" inputMode="numeric" pattern="[0-9]*"
                placeholder="0"
                style={{ ...inputStyle, paddingLeft: "28px" }}
                onFocus={onFocus} onBlur={onBlur}
                {...register("labourAmount", {
                  required: "Labour amount is required",
                  min: { value: 0, message: "Cannot be negative" },
                })}
              />
            </div>
            {errors.labourAmount && <p style={errStyle}>{errors.labourAmount.message}</p>}
          </div>

          {/* Hours Worked — REQUIRED */}
          <div>
            {labelEl("Hours Worked", true)}
            <input
              type="number" inputMode="numeric" pattern="[0-9]*"
              placeholder="0"
              style={inputStyle}
              onFocus={onFocus} onBlur={onBlur}
              {...register("hoursWorked", {
                required: "Hours worked is required",
                min: { value: 0, message: "Cannot be negative" },
              })}
            />
            {errors.hoursWorked && <p style={errStyle}>{errors.hoursWorked.message}</p>}
          </div>

          {/* Leave Days — OPTIONAL, defaults to 0 */}
          <div>
            {labelEl("Leave Days", false)}
            <input
              type="number" inputMode="numeric" pattern="[0-9]*"
              placeholder="0 — leave blank if none"
              style={inputStyle}
              onFocus={onFocus} onBlur={onBlur}
              {...register("leaveDays", {
                min: { value: 0, message: "Cannot be negative" },
              })}
            />
            {errors.leaveDays && <p style={errStyle}>{errors.leaveDays.message}</p>}
          </div>

          {/* Server error */}
          {serverError && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "4px", padding: "12px 14px",
              color: "#EF4444", fontSize: "13px", fontWeight: "500",
            }}>{serverError}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", height: "52px",
              background: loading ? "#18181B" : "#FAFAFA",
              border: loading ? "1px solid #27272A" : "none",
              borderRadius: "4px",
              color: loading ? "#52525B" : "#09090B",
              fontSize: "11px", fontWeight: "700",
              letterSpacing: "0.14em", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              marginTop: "4px",
              transition: "background 0.2s, color 0.2s, border-color 0.2s",
              WebkitTapHighlightColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {loading ? <><Spinner />Saving…</> : "Save Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}