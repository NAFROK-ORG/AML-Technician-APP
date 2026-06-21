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
  getVehicleAnalytics, // ← NEW (Task 2)
  editUser,
  deleteUser,
} = require("../controllers/adminController");


const { protect }                          = require("../middleware/authMiddleware");
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
router.get   ("/branches",                       superAdminOnly, getBranches);
router.put   ("/user/:userId",                   superAdminOnly, editUser);    // ← NEW
router.delete("/user/:userId",                   superAdminOnly, deleteUser);  // ← NEW

// ── Both admin + superadmin ──────────────────────────────────────────────────
router.get("/analytics",                        getAnalytics);
router.get("/analytics/vehicle",                getVehicleAnalytics); // ← NEW (Task 2)
router.get("/branch/:branch",                   getBranchDashboard);
router.get("/branch/:branch/technicians",       getBranchTechnicians);
router.get("/technician/:userId",               getTechnicianEntries);
router.put("/entry/:id",                        editEntry);
router.delete("/entry/:id",                     deleteEntry);
router.get("/technician/:userId/export",        exportTechnicianData);

module.exports = router;