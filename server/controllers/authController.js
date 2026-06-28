const Entry  = require("../models/Entry");
const User   = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const crypto            = require("crypto");                         // built-in, no install
const { sendOtpEmail }  = require("../utils/emailService");
const VALID_TYPES = [
  "MECHANIC",
  "MECHANIC HELPER",
  "ELECTRICIAN",
  "ELECTRICIAN HELPER",
];

// ─── Internal error helper ────────────────────────────────────────────────────
// HARDENING: never send raw err.message to the client in production.
// Raw errors expose DB internals, model structure, and stack hints.
// Log the real error server-side; send a generic message to the client.
const serverError = (res, err, context = "Operation") => {
  console.error(`[authController] ${context}:`, err);
  return res.status(500).json({ message: "Something went wrong. Please try again." });
};

// ─── Token ────────────────────────────────────────────────────────────────────
// technicianType is baked into the JWT alongside branch.
// Consequence: if type changes (it shouldn't after being set once), user must re-login.
// NOTE: with the updated authMiddleware, the server now fetches a live DB snapshot
// on every request — the JWT payload is used client-side only (role gates, UI state).
const generateToken = (user) =>
  jwt.sign(
    {
      userId:              user._id,
      role:                user.role,
      profileComplete:     user.profileComplete,
      branch:              user.branch,
      technicianType:      user.technicianType ?? null,
      forcePasswordChange: user.forcePasswordChange || false,  // ← ADD
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// ─── Shared response shape ────────────────────────────────────────────────────
// Single source of truth — every auth endpoint returns this exact shape.
const userPayload = (user) => ({
  id:                  user._id,
  name:                user.name,
  email:               user.email,
  role:                user.role,
  profileComplete:     user.profileComplete,
  branch:              user.branch,
  technicianId:        user.technicianId,
  technicianType:      user.technicianType ?? null,
  forcePasswordChange: user.forcePasswordChange || false,  // ← ADD
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    // HARDENING: trim inputs at the controller level before any DB operation.
    // Mongoose schema has trim:true as a fallback, but doing it here means
    // the duplicate-email check and the created document are both consistent.
    const name     = (req.body.name     || "").trim();
    const email    = (req.body.email    || "").trim().toLowerCase();
    const password = req.body.password  || "";   // intentionally NOT trimmed — passwords may contain spaces

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ name, email, password: hashed });
    const token  = generateToken(user);

    res.status(201).json({ token, user: userPayload(user) });
  } catch (err) {
    // Mongoose validation errors (maxlength, email regex) have a clean message
    // we can expose safely. For everything else, use the generic fallback.
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors).map(e => e.message).join(". ");
      return res.status(400).json({ message });
    }
    serverError(res, err, "signup");
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const email    = (req.body.email    || "").trim().toLowerCase();
    const password = req.body.password  || "";

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    // CRITICAL FIX: .select('+password') is required because User.password has
    // select: false in the schema. Without this, user.password is undefined and
    // bcrypt.compare() always returns false — no one can log in.
    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    // Branch admin safety check — block misconfigured accounts at login
    if (user.role === "admin") {
      const b = user.branch;
      if (!b || b.trim() === "" || b.toLowerCase() === "all") {
        return res.status(403).json({
          message:
            "Your admin account is not fully configured. Please contact your developer to set your branch.",
        });
      }
    }

    const token = generateToken(user);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    serverError(res, err, "login");
  }
};

// ─── PUT /api/auth/profile-setup  (protect required) ─────────────────────────
// New technicians only — first login, profileComplete: false.
// Collects technicianId, name, branch, and technicianType in one submission.
const profileSetup = async (req, res) => {
  try {
    if (["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Admin accounts are configured by the developer directly.",
      });
    }

    // HARDENING: trim controller-side before validation.
    const technicianId   = (req.body.technicianId   || "").trim();
    const name           = (req.body.name           || "").trim();
    const branch         = (req.body.branch         || "").trim();
    const technicianType = (req.body.technicianType || "").trim();

    if (!technicianId || !name || !branch || !technicianType)
      return res.status(400).json({ message: "All 4 fields are required" });

    if (!VALID_TYPES.includes(technicianType))
      return res.status(400).json({ message: "Invalid technician type selected" });

    // HARDENING: runValidators: true ensures Mongoose schema validators
    // (maxlength, enum, match) fire on updates, not just on create.
    // Without this, a PATCH can bypass the schema guards added to the model.
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { technicianId, name, branch, profileComplete: true, technicianType },
      { new: true, runValidators: true }
    );

    const token = generateToken(user);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors).map(e => e.message).join(". ");
      return res.status(400).json({ message });
    }
    serverError(res, err, "profileSetup");
  }
};

// ─── PUT /api/auth/type-setup  (protect required) ────────────────────────────
// Existing technicians only — profileComplete: true, but technicianType: null.
// One-time migration path. Also backfills all historical entries for this user.
const typeSetup = async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({ message: "Only technicians can use this route." });
    }

    const technicianType = (req.body.technicianType || "").trim();

    if (!technicianType || !VALID_TYPES.includes(technicianType)) {
      return res.status(400).json({ message: "Please select a valid technician type." });
    }

    // HARDENING: runValidators: true — same reason as profileSetup above.
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { technicianType },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Backfill all existing entries for this user with their chosen type.
    await Entry.updateMany(
      { userId: req.user.userId },
      { $set: { technicianType } }
    );

    const token = generateToken(user);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors).map(e => e.message).join(". ");
      return res.status(400).json({ message });
    }
    serverError(res, err, "typeSetup");
  }
};

// ─── GET /api/auth/me  (protect required) ────────────────────────────────────
// NOTE: authMiddleware already fetched this user from DB — this is a second
// fetch. Functionally correct. Could be replaced with res.json(req.user)
// as an optimisation, but left as-is to avoid any divergence in response shape.
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    serverError(res, err, "getMe");
  }
};
// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// T-01 mitigation: always HTTP 200, always identical message, DB lookup always
// performed — attacker cannot determine whether an email is registered.
const forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });

    // Only generate OTP for technician/security — admin/superadmin reset via
    // MongoDB Atlas directly (by design, not a footgun to leave exposed).
    if (user && !["admin", "superadmin"].includes(user.role)) {
      const otp  = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
      const hash = crypto.createHash("sha256").update(otp).digest("hex"); // never stored raw

      user.passwordResetToken    = hash;
      user.passwordResetExpires  = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      user.passwordResetAttempts = 0;
      await user.save();

      // Fire-and-forget — failure intentionally non-disclosed (L-04 known limitation).
      // We do NOT return an error if Resend fails — that would reveal the email exists.
      try {
        await sendOtpEmail(user.email, otp);
      } catch (emailErr) {
        console.error("[forgotPassword] Resend failed:", emailErr.message);
      }
    }

    // Always same response — T-01 mitigation.
    return res.status(200).json({
      message: "If that email is registered, an OTP has been sent.",
    });
  } catch (err) {
    serverError(res, err, "forgotPassword");
  }
};

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
// T-02: 3 wrong attempts invalidates OTP immediately.
// T-03: SHA-256 hash compared — raw OTP never on disk.
// T-04: Issues a short-lived resetToken (15 min) signed with a different secret.
const verifyOtp = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const otp   = (req.body.otp   || "").trim();

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required." });

    // passwordResetToken has select:false — must explicitly request it.
    // passwordResetExpires and passwordResetAttempts are not select:false,
    // they come through with the default selection.
    const user = await User.findOne({ email }).select("+passwordResetToken");

    const invalidMsg = "Invalid or expired OTP.";

    if (!user || !user.passwordResetToken || !user.passwordResetExpires)
      return res.status(400).json({ message: invalidMsg });

    if (new Date() > user.passwordResetExpires) {
      user.passwordResetToken    = null;
      user.passwordResetExpires  = null;
      user.passwordResetAttempts = 0;
      await user.save();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (inputHash !== user.passwordResetToken) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;

      if (user.passwordResetAttempts >= 3) {
        user.passwordResetToken    = null;
        user.passwordResetExpires  = null;
        user.passwordResetAttempts = 0;
        await user.save();
        return res.status(400).json({
          message: "Too many incorrect attempts. Please request a new OTP.",
          locked:  true,
        });
      }

      await user.save();
      const remaining = 3 - user.passwordResetAttempts;
      return res.status(400).json({
        message:      `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        attemptsLeft: remaining,
      });
    }

    // OTP correct — atomically clear all OTP fields before issuing reset token.
    user.passwordResetToken    = null;
    user.passwordResetExpires  = null;
    user.passwordResetAttempts = 0;
    await user.save();

    // Reset token uses JWT_SECRET + "_reset" — a stolen auth token cannot be
    // used as a reset token and vice versa (T-04 mitigation).
    const resetToken = jwt.sign(
      { userId: user._id, purpose: "password_reset" },
      process.env.JWT_SECRET + "_reset",
      { expiresIn: "15m" }
    );

    return res.status(200).json({ resetToken });
  } catch (err) {
    serverError(res, err, "verifyOtp");
  }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// T-05: resetToken accepted in request body only — never in a URL param.
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword)
      return res.status(400).json({ message: "Reset token and new password are required." });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET + "_reset");
    } catch {
      return res.status(400).json({ message: "Reset session expired. Please start over." });
    }

    if (decoded.purpose !== "password_reset")
      return res.status(400).json({ message: "Invalid reset token." });

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password updated. Please sign in." });
  } catch (err) {
    serverError(res, err, "resetPassword");
  }
};

// ─── PUT /api/auth/change-password  (protect required) ───────────────────────
// Flow B — forced change after admin reset.
// Issues a fresh JWT with forcePasswordChange: false so the client store
// updates in one step and ProtectedRoute stops intercepting immediately.
const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    // select("+password") needed because password has select:false in schema.
    const user = await User.findById(req.user.userId).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    user.password            = await bcrypt.hash(newPassword, 10);
    user.forcePasswordChange = false;
    await user.save();

    const token = generateToken(user);
    return res.status(200).json({ token, user: userPayload(user) });
  } catch (err) {
    serverError(res, err, "changePassword");
  }
};
module.exports = { signup, login, profileSetup, typeSetup, getMe, forgotPassword, verifyOtp, resetPassword, changePassword };