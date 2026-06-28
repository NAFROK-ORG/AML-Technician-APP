const express    = require("express");
const router     = express.Router();
const rateLimit  = require("express-rate-limit"); // already installed — used on /api/search
const {
  signup, login, profileSetup, typeSetup, getMe,
  forgotPassword, verifyOtp, resetPassword, changePassword,  // ← ADD
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// ── Login rate limiter ────────────────────────────────────────────────────────
// 10 attempts per IP per 15 minutes.
// After trust proxy is set in index.js, req.ip = real client IP — not Render's proxy.
// standardHeaders: true  → sends RateLimit-* headers (RFC 6585 compliant)
// legacyHeaders:   false → suppresses old X-RateLimit-* headers
const loginLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            10,
  message:        { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders:   false,
});

router.post("/signup",       signup);
router.post("/login",        loginLimiter, login); // ← rate limiter added here only
router.put("/profile-setup", protect, profileSetup);
router.put("/type-setup",    protect, typeSetup);
router.get("/me",            protect, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp",      verifyOtp);
router.post("/reset-password",  resetPassword);
router.put("/change-password",  protect, changePassword);
module.exports = router;