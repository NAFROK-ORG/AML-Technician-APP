import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

export default function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      const res = await api.post("/api/auth/signup", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setAuth(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Signup failed");
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
      <div className="fade-up" style={{ textAlign: "center", marginBottom: "36px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        
          <span style={{ fontSize: "20px", fontWeight: "700" }}>AML</span>
        </div>
        <p style={{ color: "var(--steel)", fontSize: "13px", letterSpacing: "0.06em" }}>
          TECHNICIAN PERFORMANCE PORTAL
        </p>
      </div>

      <div className="al-card fade-up" style={{ width: "100%", maxWidth: "420px", animationDelay: "0.08s" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Create Account</h1>
        <p style={{ color: "var(--steel)", fontSize: "14px", marginBottom: "28px" }}>
          Register as a new technician
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label className="al-label">Full Name</label>
            <input
              className="al-input"
              type="text"
              placeholder="Ravi Kumar"
              autoComplete="name"
              {...register("name", { required: "Name is required", minLength: { value: 2, message: "Name too short" } })}
            />
            {errors.name && <p className="al-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="al-label">Email Address</label>
            <input
              className="al-input"
              type="email"
              placeholder="you@ashokleyland.com"
              inputMode="email"
              autoComplete="email"
              {...register("email", {
                required: "Email is required",
                pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" },
              })}
            />
            {errors.email && <p className="al-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="al-label">Password</label>
            <input
              className="al-input"
              type="password"
              placeholder="Min. 6 characters"
              autoComplete="new-password"
              {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })}
            />
            {errors.password && <p className="al-error">{errors.password.message}</p>}
          </div>

          <div>
            <label className="al-label">Confirm Password</label>
            <input
              className="al-input"
              type="password"
              placeholder="Re-enter password"
              autoComplete="new-password"
              {...register("confirm", {
                required: "Please confirm password",
                validate: (v) => v === watch("password") || "Passwords do not match",
              })}
            />
            {errors.confirm && <p className="al-error">{errors.confirm.message}</p>}
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
  <p style={{ marginTop: "32px", color: "var(--steel)", fontSize: "12px", opacity: 0.5 }}>
        Powerderd By NAFROK. All rights reserved.
      </p>
          <button className="al-btn" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
 
        <p style={{ textAlign: "center", marginTop: "24px", color: "var(--steel)", fontSize: "14px" }}>
          Already registered?{" "}
          <Link to="/login" style={{ color: "var(--blue-light)", fontWeight: "600", textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
        
      </div>
      
   
    </div>
    
  );
}
