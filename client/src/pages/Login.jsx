import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      const res = await api.post("/api/auth/login", data);
      setAuth(res.data.token, res.data.user);
      if (res.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setServerError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--navy)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
    }}>
      {/* Logo area */}
      <div className="fade-up" style={{ textAlign: "center", marginBottom: "36px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
        }}>
       
          <span style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.01em" }}>
            AML
          </span>
        </div>
        <p style={{ color: "var(--steel)", fontSize: "13px", letterSpacing: "0.06em" }}>
          TECHNICIAN PERFORMANCE PORTAL
        </p>
      </div>

      {/* Form card */}
      <div className="al-card fade-up" style={{
        width: "100%",
        maxWidth: "420px",
        animationDelay: "0.08s",
      }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Sign In</h1>
        <p style={{ color: "var(--steel)", fontSize: "14px", marginBottom: "28px" }}>
          Enter your credentials to continue
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label className="al-label">Email Address</label>
            <input
              className="al-input"
              type="email"
              placeholder="you@ashokleyland.com"
              inputMode="email"
              autoComplete="email"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className="al-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="al-label">Password</label>
            <input
              className="al-input"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && <p className="al-error">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div style={{
              background: "rgba(224,59,59,0.12)",
              border: "1px solid rgba(224,59,59,0.3)",
              borderRadius: "8px",
              padding: "12px 14px",
              color: "var(--danger)",
              fontSize: "14px",
            }}>
              {serverError}
            </div>
          )}

          <button className="al-btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", color: "var(--steel)", fontSize: "14px" }}>
          New technician?{" "}
          <Link to="/signup" style={{ color: "var(--blue-light)", fontWeight: "600", textDecoration: "none" }}>
            Create account
          </Link>
        </p>
      </div>

      <p style={{ marginTop: "32px", color: "var(--steel)", fontSize: "12px", opacity: 0.5 }}>
        Powerderd By NAFROK. All rights reserved.
      </p>
    </div>
  );
}
