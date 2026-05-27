import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { BRANCHES } from "../utils/constants";

export default function ProfileSetupModal() {
  const { setAuth, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showApprovalMsg, setShowApprovalMsg] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: user?.name || "" },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      const res = await api.put("/api/auth/profile-setup", data);
      setAuth(res.data.token, res.data.user);
    } catch (err) {
      setServerError(err.response?.data?.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(10,22,40,0.92)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div className="al-card fade-up" style={{ width: "100%", maxWidth: "420px" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px",
          paddingBottom: "20px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            width: 44, height: 44,
            background: "var(--blue)", borderRadius: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px",
          }}>👷</div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Complete Your Profile</h2>
            <p style={{ color: "var(--steel)", fontSize: "13px" }}>One-time setup — takes 30 seconds</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label className="al-label">Technician ID</label>
            <input
              className="al-input"
              type="text"
              placeholder="e.g. TEC-2045"
              style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em" }}
              {...register("technicianId", { required: "Technician ID is required" })}
            />
            {errors.technicianId && <p className="al-error">{errors.technicianId.message}</p>}
          </div>

          <div>
            <label className="al-label">Display Name</label>
            <input
              className="al-input"
              type="text"
              placeholder="Your full name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && <p className="al-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="al-label">Branch</label>
            <select
              className="al-input"
              {...register("branch", { required: "Branch is required" })}
            >
              <option value="">Select your branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {errors.branch && <p className="al-error">{errors.branch.message}</p>}
          </div>

          {serverError && (
            <div style={{
              background: "rgba(224,59,59,0.12)",
              border: "1px solid rgba(224,59,59,0.3)",
              borderRadius: "8px", padding: "12px 14px",
              color: "var(--danger)", fontSize: "14px",
            }}>
              {serverError}
            </div>
          )}

          <button className="al-btn" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save & Continue →"}
          </button>
        </form>

        {/* Admin approval CTA */}
        <div style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border)",
        }}>
          {!showApprovalMsg ? (
            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setShowApprovalMsg(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--steel)",
                  fontSize: "12px",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                  textUnderlineOffset: "3px",
                  padding: 0,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                Are you an admin?
              </button>
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              background: "rgba(30,111,217,0.08)",
              border: "1px solid rgba(30,111,217,0.25)",
              borderRadius: "10px",
              padding: "12px 14px",
            }}>
              <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>🔒</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--white)", marginBottom: "4px" }}>
                  Waiting for approval
                </p>
                <p style={{ fontSize: "12px", color: "var(--steel)", lineHeight: "1.5" }}>
                  Admin access is managed directly. Please contact{" "}
                  <span style={{
                    color: "var(--blue-light)", fontWeight: "600",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    NAFROK
                  </span>{" "}
                  to get your account elevated.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}