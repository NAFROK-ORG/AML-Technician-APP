import { useForm } from "react-hook-form";
import { useState } from "react";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";

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
      incentive:    "",
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
        incentive:    Number(data.incentive)    || 0,
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
  const label = (text, required) => (
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
    /* hide spinners everywhere */
    MozAppearance: "textfield",
  };

  const errStyle = { fontSize: "10px", color: "#EF4444", marginTop: "5px", letterSpacing: "0.06em" };

  /* focus highlight */
  const onFocus = e => e.target.style.borderColor = "#52525B";
  const onBlur  = e => e.target.style.borderColor = "#27272A";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(5,5,10,0.88)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* hide number spinners globally for this sheet */}
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div
        className="fade-up"
        style={{
          background: "#0D0D14", border: "1px solid #1E1E27",
          borderRadius: "16px 16px 0 0", width: "100%", maxWidth: "520px",
          maxHeight: "94dvh", overflowY: "auto", overflowX: "hidden",
          padding: "0 0 env(safe-area-inset-bottom, 24px)",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "#0D0D14", padding: "16px 20px 14px",
          borderBottom: "1px solid #1E1E27",
        }}>
          <div style={{ width: 36, height: 4, background: "#27272A", borderRadius: 2, margin: "0 auto 16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{
                fontSize: "18px", fontWeight: "700", color: "#FAFAFA",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.04em", textTransform: "uppercase", margin: 0, lineHeight: 1,
              }}>New Entry</h2>
              <p style={{ color: "#52525B", fontSize: "11px", marginTop: "4px", letterSpacing: "0.06em", fontWeight: "600" }}>
                Daily job card
              </p>
            </div>
            <button
              type="button" onClick={onClose}
              style={{
                background: "#18181B", border: "1px solid #27272A", borderRadius: "4px",
                width: "36px", height: "36px", color: "#71717A", fontSize: "18px",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, lineHeight: 1, WebkitTapHighlightColor: "transparent",
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
            {label("Date", true)}
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
            {label("Category", true)}
            <select
              style={{
                ...inputStyle, fontSize: "14px",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717A' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
                paddingRight: "36px", cursor: "pointer",
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
              {label("JC No", true)}
              <input
                type="text" placeholder="JC-0001"
                style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px" }}
                onFocus={onFocus} onBlur={onBlur}
                {...register("jcNo", { required: "JC No is required" })}
              />
              {errors.jcNo && <p style={errStyle}>{errors.jcNo.message}</p>}
            </div>
            <div>
              {label("Vehicle No", false)}
              <input
                type="text" placeholder="KA-01 AB 1234"
                style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px" }}
                onFocus={onFocus} onBlur={onBlur}
                {...register("vehicleNo")}
              />
            </div>
          </div>

          <Divider label="Financials & Time" />

          {/* Labour Amount */}
          <div>
            {label("Labour Amount", true)}
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
                {...register("labourAmount", { required: "Labour amount is required", min: { value: 0, message: "Cannot be negative" } })}
              />
            </div>
            {errors.labourAmount && <p style={errStyle}>{errors.labourAmount.message}</p>}
          </div>

          {/* Leave Days */}
          <div>
            {label("Leave Days", true)}
            <input
              type="number" inputMode="numeric" pattern="[0-9]*"
              placeholder="0"
              style={inputStyle}
              onFocus={onFocus} onBlur={onBlur}
              {...register("leaveDays", { required: "Leave days is required", min: { value: 0, message: "Cannot be negative" } })}
            />
            {errors.leaveDays && <p style={errStyle}>{errors.leaveDays.message}</p>}
          </div>

          {/* Hours Worked */}
          <div>
            {label("Hours Worked", true)}
            <input
              type="number" inputMode="numeric" pattern="[0-9]*"
              placeholder="0"
              style={inputStyle}
              onFocus={onFocus} onBlur={onBlur}
              {...register("hoursWorked", { required: "Hours worked is required", min: { value: 0, message: "Cannot be negative" } })}
            />
            {errors.hoursWorked && <p style={errStyle}>{errors.hoursWorked.message}</p>}
          </div>

          {/* Incentive */}
          <div>
            {label("Incentive", false)}
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
                {...register("incentive", { min: { value: 0, message: "Cannot be negative" } })}
              />
            </div>
            {errors.incentive && <p style={errStyle}>{errors.incentive.message}</p>}
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
            type="submit" disabled={loading}
            style={{
              width: "100%", height: "52px",
              background: loading ? "#18181B" : "#FAFAFA",
              border: "none", borderRadius: "4px",
              color: loading ? "#52525B" : "#09090B",
              fontSize: "11px", fontWeight: "700",
              letterSpacing: "0.14em", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              marginTop: "4px", transition: "background 0.15s, color 0.15s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {loading ? "Saving…" : "Save Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}