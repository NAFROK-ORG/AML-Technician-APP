import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { CATEGORIES } from "../utils/constants";

// FIX: step prop so money fields jump by 100, time/day fields by 1
function Stepper({ label, name, register, setValue, watch, required = true, step = 1 }) {
  const val = watch(name) ?? 0;
  return (
    <div>
      <label className="al-label">{label}{required && " *"}</label>
      <div className="stepper">
        <button type="button" onClick={() => setValue(name, Math.max(0, val - step))}>−</button>
        <input
          type="number"
          min="0"
          {...register(name, {
            required: required ? `${label} is required` : false,
            min: { value: 0, message: "Cannot be negative" },
            valueAsNumber: true,
          })}
        />
        <button type="button" onClick={() => setValue(name, val + step)}>+</button>
      </div>
    </div>
  );
}

export default function EntryForm({ onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      labourAmount: 0,
      hoursWorked: 0,
      leaveDays: 0,
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

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(10,22,40,0.93)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fade-up" style={{
        background: "var(--navy-mid)",
        border: "1px solid var(--border)",
        borderRadius: "20px 20px 0 0",
        width: "100%",
        maxWidth: "520px",
        maxHeight: "92dvh",
        overflowY: "auto",
        padding: "24px 20px 40px",
      }}>
        {/* Handle bar */}
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
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>New Entry</h2>
            <p style={{ color: "var(--steel)", fontSize: "13px", marginTop: "2px" }}>Daily job card entry</p>
          </div>
          <button onClick={onClose} style={{
            background: "var(--navy-light)", border: "none", borderRadius: "8px",
            width: 36, height: 36, color: "var(--steel)", fontSize: "18px",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
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
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="al-error">{errors.category.message}</p>}
          </div>

          {/* JC No + Vehicle No */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="al-label">JC No *</label>
              <input className="al-input" type="text" placeholder="JC-0001"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                {...register("jcNo", { required: "JC No is required" })}
              />
              {errors.jcNo && <p className="al-error">{errors.jcNo.message}</p>}
            </div>
            <div>
              <label className="al-label">Vehicle No</label>
              <input className="al-input" type="text" placeholder="TN-01 AB 1234"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px" }}
                {...register("vehicleNo")}
              />
            </div>
          </div>

          {/* Steppers — money fields step by 100, time/day by 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Stepper label="Labour (₹)" name="labourAmount" register={register} setValue={setValue} watch={watch} step={100} />
            <Stepper label="Hours Worked" name="hoursWorked" register={register} setValue={setValue} watch={watch} step={1} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Stepper label="Leave Days" name="leaveDays" register={register} setValue={setValue} watch={watch} step={1} />
            <Stepper label="Incentive (₹)" name="incentive" register={register} setValue={setValue} watch={watch} step={100} required={false} />
          </div>

          {serverError && (
            <div style={{
              background: "rgba(224,59,59,0.12)", border: "1px solid rgba(224,59,59,0.3)",
              borderRadius: "8px", padding: "12px 14px",
              color: "var(--danger)", fontSize: "14px",
            }}>{serverError}</div>
          )}

          <button className="al-btn" type="submit" disabled={loading} style={{ marginTop: "4px" }}>
            {loading ? "Saving…" : "Save Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}
