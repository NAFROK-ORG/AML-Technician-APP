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
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
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

  .corp-field {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 28px;
  }

  .corp-field:last-of-type {
    margin-bottom: 0;
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

  .corp-password-wrapper {
    position: relative;
  }

  .corp-password-wrapper .corp-input {
    padding-right: 48px;
  }

  .corp-toggle-password {
    position: absolute;
    right: 0;
    bottom: 9px;
    background: none;
    border: none;
    padding: 4px 0;
    margin: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    color: #6B7A99;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: 'IBM Plex Sans', sans-serif;
    -webkit-appearance: none;
    appearance: none;
  }

  .corp-toggle-password:hover {
    color: #1E3A8A;
  }

  .corp-field-error {
    margin: 6px 0 0;
    font-size: 12px;
    color: #DC2626;
    font-weight: 400;
    letter-spacing: 0.01em;
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

  .corp-divider {
    height: 1px;
    background: #EEF2F7;
    margin: 24px 0 0;
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

  /* Divider line in card */
  .corp-fields-divider {
    height: 1px;
    background: #F1F5F9;
    margin: 4px 0 28px;
  }

  @media (max-width: 440px) {
    .corp-card {
      padding: 28px 20px 24px;
    }
    .corp-main {
      padding: 28px 16px;
    }
    .corp-heading {
      font-size: 30px;
    }
    .corp-secure-badge {
      display: none;
    }
  }
`;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = CORP_STYLES;
    styleEl.id = "corp-login-styles";
    document.head.appendChild(styleEl);
    return () => {
      const el = document.getElementById("corp-login-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      const res = await api.post("/api/auth/login", data);
      setAuth(res.data.token, res.data.user);
      navigate(res.data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setServerError(
        err.response && err.response.data ? err.response.data.message : "Login failed. Please try again."
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
          <div className="corp-secure-badge">Secure</div>
        </div>
      </header>

      <main className="corp-main">
        <div className="corp-wrapper">

          <div style={{ marginBottom: "24px" }}>
            <div className="corp-eyebrow">Employee Access</div>
            <h1 className="corp-heading">Sign In</h1>
            <p className="corp-subheading">Enter your registered credentials to continue</p>
          </div>

          <div className="corp-card">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              <div className="corp-field">
                <label className="corp-label" htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  className={`corp-input${errors.email ? " field-error" : ""}`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@ashokleyland.com"
                  {...register("email", { required: "Email is required" })}
                />
                {errors.email && <p className="corp-field-error">{errors.email.message}</p>}
              </div>

              <div className="corp-field">
                <label className="corp-label" htmlFor="login-password">Password</label>
                <div className="corp-password-wrapper">
                  <input
                    id="login-password"
                    className={`corp-input${errors.password ? " field-error" : ""}`}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register("password", { required: "Password is required" })}
                  />
                  <button
                    type="button"
                    className="corp-toggle-password"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && <p className="corp-field-error">{errors.password.message}</p>}
              </div>

              {serverError && (
                <div className="corp-server-error" style={{ marginTop: "24px" }}>
                  <p>{serverError}</p>
                </div>
              )}

              <button className="corp-btn" type="submit" disabled={loading}>
                {loading ? "Authenticating…" : "Sign In"}
              </button>
            </form>
          </div>

          <p className="corp-footer-link">
            New technician?{" "}
            <Link to="/signup">Create account</Link>
          </p>

        </div>
      </main>

      <footer className="corp-page-footer">
        <p>Powered by NAFROK · All rights reserved</p>
      </footer>
    </div>
  );
}