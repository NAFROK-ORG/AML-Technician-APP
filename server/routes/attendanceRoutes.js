const express = require("express");
const router  = express.Router();

const { protect }                   = require("../middleware/authMiddleware");
const { adminOrAbove, branchGuard } = require("../middleware/adminMiddleware");

const {
  getTodayStatus,
  markAttendance,
  getAdminAttendance,
} = require("../controllers/attendanceController");

// ── Technician routes ────────────────────────────────────────────────────────
// Any authenticated user can hit these (profile gate is in the controller).

router.get("/today", protect, getTodayStatus);   // check if already marked
router.post("/mark",  protect, markAttendance);  // one-time mark present

// ── Admin / Superadmin route ─────────────────────────────────────────────────
// Same middleware chain used in adminRoutes.js:
//   protect         → JWT verify
//   adminOrAbove    → role must be admin or superadmin
//   branchGuard     → admin must have a valid non-"all" branch configured
//
// Branch admin: branch forced server-side (req.user.branch), ?branch param ignored.
// Superadmin:   optional ?branch=NAME filter, null = all branches.
router.get("/admin", protect, adminOrAbove, branchGuard, getAdminAttendance);

module.exports = router;