import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";

/* ─── Stepper ───────────────────────────────────────────────────────────────
   Tap the value to open a native number keyboard directly.
   Long-press the [+] button to fast-increment (repeat while held).
   Falls back gracefully to +/− for mouse users.
─────────────────────────────────────────────────────────────────────────── */
function Stepper({
  label,
  name,
  register,
  setValue,
  watch,
  required = true,
  step = 1,
  prefix = "",
}) {
  const raw = watch(name);
  const val = typeof raw === "number" && !isNaN(raw) ? raw : 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  // Long-press repeat for [+] / [−]
  const repeatRef = useRef(null);
  const startRepeat = (delta) => {
    repeatRef.current = setInterval(
      () => setValue(name, Math.max(0, (watch(name) ?? 0) + delta)),
      120
    );
  };
  const stopRepeat = () => clearInterval(repeatRef.current);

  const dec = () => setValue(name, Math.max(0, val - step));
  const inc = () => setValue(name, val + step);

  /* Open the native numeric keyboard */
  const openEdit = () => {
    setDraft(val === 0 ? "" : String(val));
    setEditing(true);
    // Focus happens after render via the ref callback
  };

  const commitEdit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= 0) {
      // Snap to nearest step multiple
      setValue(name, Math.round(parsed / step) * step);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
  };

  /* ── Shared style tokens ── */
  const BTN_SIZE = 52;
  const btnBase = {
    width: BTN_SIZE,
    height: "100%",
    flexShrink: 0,
    background: "transparent",
    border: "none",
    color: "#A1A1AA",
    fontSize: "22px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'IBM Plex Sans', sans-serif",
    lineHeight: 1,
    transition: "background 0.1s, color 0.1s",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    touchAction: "manipulation",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Label */}
      <label
        style={{
          fontSize: "9px",
          fontWeight: "700",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#71717A",
        }}
      >
        {label}
        {required && " *"}
      </label>

      {/* Control row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: `1px solid ${editing ? "#52525B" : "#27272A"}`,
          borderRadius: "4px",
          overflow: "hidden",
          height: "52px",
          background: "#111118",
          transition: "border-color 0.15s",
        }}
      >
        {/* ── Decrement ── */}
        <button
          type="button"
          onClick={dec}
          onMouseDown={() => startRepeat(-step)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          onTouchStart={(e) => {
            startRepeat(-step);
            if (val > 0) e.currentTarget.style.background = "#1C1C24";
          }}
          onTouchEnd={(e) => {
            stopRepeat();
            e.currentTarget.style.background = "transparent";
          }}
          aria-label={`Decrease ${label}`}
          style={{
            ...btnBase,
            borderRight: "1px solid #27272A",
            color: val === 0 ? "#3F3F46" : "#A1A1AA",
            cursor: val === 0 ? "not-allowed" : "pointer",
          }}
        >
          −
        </button>

        {/* ── Tappable value / inline edit ── */}
        {editing ? (
          <input
            ref={(el) => {
              inputRef.current = el;
              if (el) {
                el.focus();
                el.select();
              }
            }}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#FAFAFA",
              fontSize: "22px",
              fontWeight: "700",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.02em",
              textAlign: "center",
              width: "100%",
              padding: "0 8px",
              /* hide browser spinners */
              MozAppearance: "textfield",
            }}
          />
        ) : (
          <button
            type="button"
            onClick={openEdit}
            aria-label={`Edit ${label}`}
            title="Tap to type a value"
            style={{
              flex: 1,
              height: "100%",
              background: "transparent",
              border: "none",
              cursor: "text",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {prefix && (
              <span style={{ fontSize: "14px", color: "#71717A", fontWeight: "600" }}>
                {prefix}
              </span>
            )}
            <span
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#FAFAFA",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            >
              {val.toLocaleString("en-IN")}
            </span>
          </button>
        )}

        {/* ── Increment ── */}
        <button
          type="button"
          onClick={inc}
          onMouseDown={() => startRepeat(step)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          onTouchStart={(e) => {
            startRepeat(step);
            e.currentTarget.style.background = "#1C1C24";
          }}
          onTouchEnd={(e) => {
            stopRepeat();
            e.currentTarget.style.background = "transparent";
          }}
          aria-label={`Increase ${label}`}
          style={{
            ...btnBase,
            borderLeft: "1px solid #27272A",
          }}
        >
          +
        </button>
      </div>

      {/* Hidden RHF input */}
      <input
        type="number"
        style={{ display: "none" }}
        {...register(name, {
          required: required ? `${label} is required` : false,
          min: { value: 0, message: "Cannot be negative" },
          valueAsNumber: true,
        })}
      />
    </div>
  );
}

/* ─── Divider ─────────────────────────────────────────────────────────────── */
const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
    <div style={{ flex: 1, height: "1px", background: "#1E1E27" }} />
    {label && (
      <span
        style={{
          fontSize: "8px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#3F3F46",
          fontWeight: "700",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    )}
    <div style={{ flex: 1, height: "1px", background: "#1E1E27" }} />
  </div>
);

/* ─── Main Form ──────────────────────────────────────────────────────────── */
export default function EntryForm({ onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      labourAmount: 0,
      leaveDays: 0,
      hoursWorked: 0,
      incentive: 0,
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      await api.post("/api/entries", data);
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: "#111118",
    border: "1px solid #27272A",
    borderRadius: "4px",
    color: "#FAFAFA",
    fontSize: "14px",
    padding: "14px 14px",
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    height: "52px",
  };

  const labelStyle = {
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#71717A",
    display: "block",
    marginBottom: "8px",
  };

  const errorStyle = {
    fontSize: "10px",
    color: "#EF4444",
    marginTop: "5px",
    letterSpacing: "0.06em",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(5, 5, 10, 0.88)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="fade-up"
        style={{
          background: "#0D0D14",
          border: "1px solid #1E1E27",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "94dvh",
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 0 env(safe-area-inset-bottom, 24px)",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#0D0D14",
            padding: "16px 20px 14px",
            borderBottom: "1px solid #1E1E27",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              background: "#27272A",
              borderRadius: 2,
              margin: "0 auto 16px",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#FAFAFA",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                New Entry
              </h2>
              <p
                style={{
                  color: "#52525B",
                  fontSize: "11px",
                  marginTop: "4px",
                  letterSpacing: "0.06em",
                  fontWeight: "600",
                }}
              >
                Daily job card
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#18181B",
                border: "1px solid #27272A",
                borderRadius: "4px",
                width: "36px",
                height: "36px",
                color: "#71717A",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: "sans-serif",
                lineHeight: 1,
                WebkitTapHighlightColor: "transparent",
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.borderColor = "#3F3F46";
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.borderColor = "#27272A";
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Form body ── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            padding: "20px 20px 32px",
          }}
        >
          {/* Date */}
          <div>
            <label style={labelStyle}>Date *</label>
            <input
              type="date"
              style={{ ...inputStyle, colorScheme: "dark" }}
              {...register("date", { required: "Date is required" })}
            />
            {errors.date && <p style={errorStyle}>{errors.date.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category *</label>
            <select
              style={{
                ...inputStyle,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717A' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                paddingRight: "36px",
                cursor: "pointer",
              }}
              {...register("category", { required: "Category is required" })}
            >
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && <p style={errorStyle}>{errors.category.message}</p>}
          </div>

          <Divider label="Job Details" />

          {/* JC No + Vehicle No */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>JC No *</label>
              <input
                type="text"
                placeholder="JC-0001"
                style={{
                  ...inputStyle,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "13px",
                }}
                {...register("jcNo", { required: "JC No is required" })}
              />
              {errors.jcNo && <p style={errorStyle}>{errors.jcNo.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Vehicle No</label>
              <input
                type="text"
                placeholder="KA-01 AB 1234"
                style={{
                  ...inputStyle,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "12px",
                }}
                {...register("vehicleNo")}
              />
            </div>
          </div>

          <Divider label="Financials & Time" />

          <Stepper
            label="Labour Amount"
            name="labourAmount"
            register={register}
            setValue={setValue}
            watch={watch}
            step={100}
            prefix="₹"
          />
          <Stepper
            label="Leave Days"
            name="leaveDays"
            register={register}
            setValue={setValue}
            watch={watch}
            step={1}
          />
          <Stepper
            label="Hours Worked"
            name="hoursWorked"
            register={register}
            setValue={setValue}
            watch={watch}
            step={1}
          />
          <Stepper
            label="Incentive"
            name="incentive"
            register={register}
            setValue={setValue}
            watch={watch}
            step={100}
            required={false}
            prefix="₹"
          />

          {serverError && (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "4px",
                padding: "12px 14px",
                color: "#EF4444",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "52px",
              background: loading ? "#18181B" : "#FAFAFA",
              border: "none",
              borderRadius: "4px",
              color: loading ? "#52525B" : "#09090B",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              marginTop: "4px",
              transition: "background 0.15s, color 0.15s",
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