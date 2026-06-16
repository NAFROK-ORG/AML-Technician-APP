const express = require("express");
const router  = express.Router();

const { protect }                                   = require("../middleware/authMiddleware");
const { adminOrAbove, branchGuard, technicianOnly } = require("../middleware/adminMiddleware"); // ← add technicianOnly

const {
  getTodayStatus,
  markAttendance,
  getAdminAttendance,
} = require("../controllers/attendanceController");

// ── Technician-only routes ───────────────────────────────────────────────────
// technicianOnly blocks admins and security users from creating ghost attendance records
// via direct API calls — UI never shows these routes to non-technicians anyway.
router.get("/today", protect, technicianOnly, getTodayStatus);  // ← add technicianOnly
router.post("/mark",  protect, technicianOnly, markAttendance); // ← add technicianOnly

// ── Admin / Superadmin route ─────────────────────────────────────────────────
router.get("/admin", protect, adminOrAbove, branchGuard, getAdminAttendance);

module.exports = router;