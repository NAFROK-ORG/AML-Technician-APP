import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

const CORP_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

  .corp-page {
    min-height: 100dvh;
    background-color: #EEF2F7;
    display: flex;
    flex-direction: column;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .corp-topbar {
    height: 3px;
    background-color: #1E3A8A;
    width: 100%;
    flex-shrink: 0;
  }

  .corp-header {
    background-color: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
    padding: 16px 24px;
  }

  .corp-header-inner {
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .corp-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #0A1628;
    line-height: 1;
    margin-bottom: 2px;
  }

  .corp-logo-tag {
    font-size: 9px;
    letter-spacing: 0.16em;
    color: #6B7A99;
    font-weight: 500;
    text-transform: uppercase;
  }

  .corp-secure-badge {
    font-size: 9px;
    letter-spacing: 0.14em;
    color: #6B7A99;
    font-weight: 600;
    border: 1px solid #DDE3EE;
    padding: 4px 10px;
    text-transform: uppercase;
    background: #F8FAFC;
  }

  .corp-main {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 20px 48px;
  }

  .corp-wrapper {
    width: 100%;
    max-width: 420px;
  }

  .corp-eyebrow {
    font-size: 10px;
    letter-spacing: 0.18em;
    color: #1E3A8A;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .corp-heading {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 36px;
    font-weight: 700;
    color: #0A1628;
    margin: 0 0 8px;
    letter-spacing: 0.02em;
    line-height: 1;
    text-transform: uppercase;
  }

  .corp-subheading {
    font-size: 14px;
    color: #6B7A99;
    margin: 0 0 28px;
    font-weight: 300;
    font-style: italic;
  }

  .corp-card {
    background-color: #FFFFFF;
    border: 1px solid #DDE3EE;
    padding: 32px 28px 28px;
  }

  /* Step indicator */
  .corp-step-row {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 28px;
  }

  .corp-step {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .corp-step-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #1E3A8A;
    flex-shrink: 0;
  }

  .corp-step-dot.inactive {
    background-color: #DDE3EE;
  }

  .corp-step-label {
    font-size: 10px;
    letter-spacing: 0.1em;
    color: #6B7A99;
    font-weight: 500;
    text-transform: uppercase;
  }

  .corp-step-line {
    flex: 1;
    height: 1px;
    background-color: #DDE3EE;
    margin: 0 12px;
  }

  .corp-section-label {
    font-size: 10px;
    letter-spacing: 0.14em;
    color: #A0AABB;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #F1F5F9;
  }

  .corp-field {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 26px;
  }

  .corp-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: #374151;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .corp-input {
    width: 100%;
    padding: 11px 0;
    font-size: 16px;
    color: #0A1628;
    background: transparent;
    border: none;
    border-bottom: 1.5px solid #CBD5E1;
    outline: none;
    font-family: 'IBM Plex Sans', sans-serif;
    font-weight: 400;
    transition: border-color 0.15s ease, border-width 0.1s ease;
    box-sizing: border-box;
    -webkit-appearance: none;
    border-radius: 0;
  }

  .corp-input::placeholder {
    color: #B0BAD0;
    font-weight: 300;
  }

  .corp-input:focus {
    border-bottom: 2px solid #1E3A8A;
  }

  .corp-input.field-error {
    border-bottom: 2px solid #DC2626;
  }

  .corp-field-error {
    margin: 6px 0 0;
    font-size: 12px;
    color: #DC2626;
    font-weight: 400;
    letter-spacing: 0.01em;
  }

  .corp-password-section {
    margin-top: 8px;
    padding-top: 24px;
    border-top: 1px solid #F1F5F9;
  }

  .corp-password-section .corp-section-label {
    margin-bottom: 20px;
  }

  .corp-server-error {
    padding: 13px 16px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-left: 3px solid #DC2626;
    margin-bottom: 20px;
  }

  .corp-server-error p {
    margin: 0;
    font-size: 13px;
    color: #991B1B;
    font-weight: 500;
  }

  .corp-btn {
    width: 100%;
    padding: 16px;
    background-color: #1E3A8A;
    color: #FFFFFF;
    border: none;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    transition: background-color 0.15s ease;
    margin-top: 28px;
    display: block;
    -webkit-appearance: none;
    border-radius: 0;
  }

  .corp-btn:hover:not(:disabled) {
    background-color: #1E40AF;
  }

  .corp-btn:active:not(:disabled) {
    background-color: #1E3A8A;
  }

  .corp-btn:disabled {
    background-color: #93C5FD;
    cursor: not-allowed;
  }

  .corp-notice {
    margin-top: 20px;
    padding: 12px 14px;
    background: #F8FAFC;
    border: 1px solid #DDE3EE;
    border-left: 3px solid #CBD5E1;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .corp-notice p {
    margin: 0;
    font-size: 12px;
    color: #6B7A99;
    line-height: 1.6;
    font-weight: 300;
  }

  .corp-notice strong {
    font-weight: 600;
    color: #374151;
  }

  .corp-footer-link {
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
    color: #6B7A99;
  }

  .corp-footer-link a {
    color: #1E3A8A;
    font-weight: 600;
    text-decoration: none;
  }

  .corp-footer-link a:hover {
    text-decoration: underline;
  }

  .corp-page-footer {
    padding: 16px 24px;
    border-top: 1px solid #DDE3EE;
    background-color: #FFFFFF;
  }

  .corp-page-footer p {
    text-align: center;
    margin: 0;
    font-size: 10px;
    color: #A0AABB;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  @media (max-width: 440px) {
    .corp-card {
      padding: 24px 18px 20px;
    }
    .corp-main {
      padding: 24px 16px 40px;
      align-items: flex-start;
    }
    .corp-heading {
      font-size: 30px;
    }
    .corp-secure-badge {
      display: none;
    }
    .corp-step-label {
      display: none;
    }
  }
`;

export default function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = CORP_STYLES;
    styleEl.id = "corp-signup-styles";
    document.head.appendChild(styleEl);
    return () => {
      const el = document.getElementById("corp-signup-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);

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
      setServerError(
        err.response && err.response.data ? err.response.data.message : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="corp-page">
      <div className="corp-topbar" />

      <header className="corp-header">
        <div className="corp-header-inner">
          <div>
            <div className="corp-logo">AML MOTORS</div>
            <div className="corp-logo-tag">Technician Performance Portal</div>
          </div>
          <div className="corp-secure-badge">New Account</div>
        </div>
      </header>

      <main className="corp-main">
        <div className="corp-wrapper">

          <div style={{ marginBottom: "24px" }}>
            <div className="corp-eyebrow">Technician Registration</div>
            <h1 className="corp-heading">Create Account</h1>
            <p className="corp-subheading">Register to access the performance portal</p>
          </div>

          <div className="corp-card">

            {/* Step indicator */}
            <div className="corp-step-row">
              <div className="corp-step">
                <div className="corp-step-dot" />
                <span className="corp-step-label">Account</span>
              </div>
              <div className="corp-step-line" />
              <div className="corp-step">
                <div className="corp-step-dot inactive" />
                <span className="corp-step-label" style={{ color: "#B0BAD0" }}>Profile Setup</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              <div className="corp-section-label">Personal Details</div>

              <div className="corp-field">
                <label className="corp-label" htmlFor="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  className={`corp-input${errors.name ? " field-error" : ""}`}
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Ravi Kumar"
                  {...register("name", {
                    required: "Full name is required",
                    minLength: { value: 2, message: "Name must be at least 2 characters" },
                  })}
                />
                {errors.name && <p className="corp-field-error">{errors.name.message}</p>}
              </div>

              <div className="corp-field">
                <label className="corp-label" htmlFor="signup-email">Work Email</label>
                <input
                  id="signup-email"
                  className={`corp-input${errors.email ? " field-error" : ""}`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@ashokleyland.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email address" },
                  })}
                />
                {errors.email && <p className="corp-field-error">{errors.email.message}</p>}
              </div>

              <div className="corp-password-section">
                <div className="corp-section-label">Set Password</div>

                <div className="corp-field">
                  <label className="corp-label" htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    className={`corp-input${errors.password ? " field-error" : ""}`}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimum 6 characters"
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 6, message: "Password must be at least 6 characters" },
                    })}
                  />
                  {errors.password && <p className="corp-field-error">{errors.password.message}</p>}
                </div>

                <div className="corp-field" style={{ marginBottom: 0 }}>
                  <label className="corp-label" htmlFor="signup-confirm">Confirm Password</label>
                  <input
                    id="signup-confirm"
                    className={`corp-input${errors.confirm ? " field-error" : ""}`}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    {...register("confirm", {
                      required: "Please confirm your password",
                      validate: (v) => v === watch("password") || "Passwords do not match",
                    })}
                  />
                  {errors.confirm && <p className="corp-field-error">{errors.confirm.message}</p>}
                </div>
              </div>

              {serverError && (
                <div className="corp-server-error" style={{ marginTop: "24px" }}>
                  <p>{serverError}</p>
                </div>
              )}

              <button className="corp-btn" type="submit" disabled={loading}>
                {loading ? "Creating Account…" : "Create Account"}
              </button>
            </form>

            <div className="corp-notice" style={{ marginTop: "20px" }}>
              <p>
                <strong>Next step:</strong> After registration, you will be prompted to complete your technician profile with your branch and ID.
              </p>
            </div>

          </div>

          <p className="corp-footer-link">
            Already registered?{" "}
            <Link to="/login">Sign in</Link>
          </p>

        </div>
      </main>

      <footer className="corp-page-footer">
        <p>Powered by NAFROK · All rights reserved</p>
      </footer>
    </div>
  );
}