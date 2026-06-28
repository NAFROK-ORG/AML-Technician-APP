const express = require("express");
const router  = express.Router();
const {
  getBranches,
  getBranchDashboard,
  getBranchTechnicians,
  getTechnicianEntries,
  editEntry,
  deleteEntry,
  exportTechnicianData,
  getAnalytics,
  getVehicleAnalytics,
  exportVehicleLogs,
  editUser,
  deleteUser,
  adminResetPassword,   // ← ADD
} = require("../controllers/adminController");

const {
  getAttendanceAnalytics,
  getAttendanceExport,          // [NEW-EXPORT]
} = require("../controllers/attendanceAnalyticsController");

const { protect }                                    = require("../middleware/authMiddleware");
const { adminOrAbove, superAdminOnly, branchGuard } = require("../middleware/adminMiddleware");

/**
 * Global middleware chain for ALL admin routes:
 *
 *   protect       → valid JWT required
 *   adminOrAbove  → role must be "admin" or "superadmin" (blocks technicians)
 *   branchGuard   → branch admin must have a real branch set (not empty / not "all")
 *                   superadmin passes through unconditionally
 */
router.use(protect, adminOrAbove, branchGuard);

// ── Superadmin only ──────────────────────────────────────────────────────────
router.get   ("/branches",     superAdminOnly, getBranches);
router.put   ("/user/:userId", superAdminOnly, editUser);
router.delete("/user/:userId", superAdminOnly, deleteUser);
// ── Both admin + superadmin ──────────────────────────────────────────────────
router.get("/analytics",                          getAnalytics);
router.get("/analytics/vehicle",                  getVehicleAnalytics);
router.get("/analytics/vehicle/export",           exportVehicleLogs);
router.post("/technicians/:userId/reset-password", adminResetPassword);
// NOTE: /export route MUST appear before the base /analytics/attendance route.
// Express matches paths in registration order — without this ordering, a request
// to /analytics/attendance/export would never reach this handler.
router.get("/analytics/attendance/export",        getAttendanceExport);  // [NEW-EXPORT]
router.get("/analytics/attendance",               getAttendanceAnalytics);
router.get("/branch/:branch",                     getBranchDashboard);
router.get("/branch/:branch/technicians",         getBranchTechnicians);
router.get("/technician/:userId",                 getTechnicianEntries);
router.put("/entry/:id",                          editEntry);
router.delete("/entry/:id",                       deleteEntry);
router.get("/technician/:userId/export",          exportTechnicianData);

module.exports = router;