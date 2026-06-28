import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import "./ChangePassword.css";

export default function ChangePassword() {
  const navigate       = useNavigate();
  const { setAuth }    = useAuthStore();
  const [newPassword,  setNewPassword]  = useState("");
  const [confirmPass,  setConfirmPass]  = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.put("/api/auth/change-password", { newPassword });

      // Update store with new JWT — forcePasswordChange is now false.
      // ProtectedRoute will stop intercepting immediately after this.
      setAuth(res.data.token, res.data.user);

      const role = res.data.user.role;
      if (role === "security") navigate("/security",   { replace: true });
      else                     navigate("/dashboard",  { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-page">
      <div className="cp-topbar" />

      <header className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-logo-wrapper">
            <img
              src="/aml-motors-pvt.png"
              alt="AML Motors"
              className="cp-logo-img"
              draggable={false}
            />
            <div>
              <div className="cp-logo">AML MOTORS</div>
              <div className="cp-logo-tag">Technician Performance Portal</div>
            </div>
          </div>
        </div>
      </header>

      <main className="cp-main">
        <div className="cp-wrapper">

          <div className="cp-intro">
            <div className="cp-eyebrow">Security Required</div>
            <h1 className="cp-heading">Set New Password</h1>
            <p className="cp-subheading">
              Your account requires a password change before you can continue
            </p>
          </div>

          <div className="cp-notice">
            <p>
              Your password was reset by your branch admin. Please set a new private
              password that only you know.
            </p>
          </div>

          <div className="cp-card">
            <form onSubmit={handleSubmit} noValidate>

              <div className="cp-field">
                <label className="cp-label" htmlFor="cp-new">New Password</label>
                <div className="cp-pass-wrapper">
                  <input
                    id="cp-new"
                    className="cp-input"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  />
                  <button
                    type="button"
                    className="cp-toggle-pass"
                    onClick={() => setShowPass((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="cp-field" style={{ marginBottom: 0 }}>
                <label className="cp-label" htmlFor="cp-confirm">Confirm Password</label>
                <input
                  id="cp-confirm"
                  className="cp-input"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  value={confirmPass}
                  onChange={(e) => { setConfirmPass(e.target.value); setError(""); }}
                />
              </div>

              {error && (
                <div className="cp-error-banner">
                  <p>{error}</p>
                </div>
              )}

              <button className="cp-btn" type="submit" disabled={loading}>
                {loading ? "Saving…" : "Set New Password"}
              </button>

            </form>
          </div>
        </div>
      </main>

      <footer className="cp-page-footer">
        <p>Powered by NAFROK · All rights reserved</p>
      </footer>
    </div>
  );
}