import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [step,         setStep]         = useState("email"); // "email" | "otp" | "success"
  const [email,        setEmail]        = useState("");
  const [otp,          setOtp]          = useState("");
  const [newPassword,  setNewPassword]  = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [showContact,  setShowContact]  = useState(false);

  // ── Step 1: Request OTP ────────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    setLoading(true); setError("");
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim().toLowerCase() });
      setStep("otp");
    } catch (err) {
      // This only fires on network errors or 429 (rate limit).
      // The server always returns 200 for valid requests.
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP + reset password (chained) ─────────────────────────
  // Client-side validation runs BEFORE the API call so a weak password
  // doesn't consume an OTP attempt.
  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim())                  { setError("OTP is required."); return; }
    if (newPassword.length < 6)       { setError("Password must be at least 6 characters."); return; }

    setLoading(true); setError(""); setAttemptsLeft(null);
    try {
      // verify-otp → returns short-lived resetToken (15 min, in-memory only — T-05)
      const verifyRes = await api.post("/api/auth/verify-otp", {
        email, otp: otp.trim(),
      });

      // reset-password → uses resetToken immediately, never stored anywhere
      await api.post("/api/auth/reset-password", {
        resetToken:  verifyRes.data.resetToken,
        newPassword,
      });

      setStep("success");
    } catch (err) {
      const data = err.response?.data;
      if (data?.locked) {
        // 3 wrong attempts — OTP is now dead, go back to email step
        setStep("email"); setOtp(""); setNewPassword("");
        setError("Too many incorrect attempts. Please request a new OTP.");
      } else {
        setError(data?.message || "Something went wrong. Please try again.");
        if (data?.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
      }
    } finally {
      setLoading(false);
    }
  };

  const ContactBlock = () => (
    <div className="fp-contact-block">
      <button
        type="button"
        className="fp-contact-toggle"
        onClick={() => setShowContact((v) => !v)}
      >
        {showContact ? "▲" : "▼"}&nbsp; Can't access your email?
      </button>
      {showContact && (
        <div className="fp-contact-content">
          <p>
            Contact your branch admin in person. They can reset your account
            from the admin portal and give you a temporary password to log in with.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fp-page">
      <div className="fp-topbar" />

      <header className="fp-header">
        <div className="fp-header-inner">
          <div className="fp-logo-wrapper">
            <img
              src="/aml-motors-pvt.png"
              alt="AML Motors"
              className="fp-logo-img"
              draggable={false}
            />
            <div>
              <div className="fp-logo">AML MOTORS</div>
              <div className="fp-logo-tag">Technician Performance Portal</div>
            </div>
          </div>
        </div>
      </header>

      <main className="fp-main">
        <div className="fp-wrapper">

          {/* ── Email Step ────────────────────────────────────────────── */}
          {step === "email" && (
            <>
              <div className="fp-intro">
                <div className="fp-eyebrow">Password Recovery</div>
                <h1 className="fp-heading">Reset Password</h1>
                <p className="fp-subheading">Enter your registered email to receive an OTP</p>
              </div>

              <div className="fp-card">
                <form onSubmit={handleRequestOtp} noValidate>
                  <div className="fp-field">
                    <label className="fp-label" htmlFor="fp-email">Email Address</label>
                    <input
                      id="fp-email"
                      className={`fp-input${error ? " fp-input--err" : ""}`}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@ashokleyland.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    />
                    {error && <p className="fp-field-error">{error}</p>}
                  </div>
                  <button className="fp-btn" type="submit" disabled={loading}>
                    {loading ? "Sending OTP…" : "Send OTP"}
                  </button>
                </form>
              </div>

              <ContactBlock />

              <p className="fp-footer-link">
                Remembered it? <Link to="/login">Sign in</Link>
              </p>
            </>
          )}

          {/* ── OTP + New Password Step ───────────────────────────────── */}
          {step === "otp" && (
            <>
              <div className="fp-intro">
                <div className="fp-eyebrow">Verification</div>
                <h1 className="fp-heading">Enter OTP</h1>
                <p className="fp-subheading">
                  Check <strong>{email}</strong> for your 6-digit code
                </p>
              </div>

              <div className="fp-card">
                <form onSubmit={handleSubmitOtp} noValidate>

                  <div className="fp-field">
                    <label className="fp-label" htmlFor="fp-otp">One-Time Password</label>
                    <input
                      id="fp-otp"
                      className="fp-input fp-otp-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                    />
                  </div>

                  <div className="fp-field" style={{ marginBottom: 0 }}>
                    <label className="fp-label" htmlFor="fp-newpass">New Password</label>
                    <div className="fp-password-wrapper">
                      <input
                        id="fp-newpass"
                        className="fp-input"
                        type={showPass ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      />
                      <button
                        type="button"
                        className="fp-toggle-pass"
                        onClick={() => setShowPass((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPass ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="fp-error-banner">
                      <p>{error}</p>
                      {attemptsLeft !== null && (
                        <p className="fp-attempts-left">
                          {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining
                        </p>
                      )}
                    </div>
                  )}

                  <button className="fp-btn" type="submit" disabled={loading}>
                    {loading ? "Verifying…" : "Set New Password"}
                  </button>

                  <button
                    type="button"
                    className="fp-back-link"
                    onClick={() => { setStep("email"); setError(""); setOtp(""); setNewPassword(""); }}
                  >
                    ← Request a new OTP
                  </button>

                </form>
              </div>

              <ContactBlock />
            </>
          )}

          {/* ── Success Step ──────────────────────────────────────────── */}
          {step === "success" && (
            <div className="fp-card fp-success-card">
              <div className="fp-success-icon">✓</div>
              <h2 className="fp-success-title">Password Updated</h2>
              <p className="fp-success-msg">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <Link to="/login" className="fp-btn fp-success-btn">
                Back to Sign In
              </Link>
            </div>
          )}

        </div>
      </main>

      <footer className="fp-page-footer">
        <p>Powered by NAFROK · All rights reserved</p>
      </footer>
    </div>
  );
}