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
// Branch admins hitting this route will be blocked by superAdminOnly (403).
router.get("/branches", superAdminOnly, getBranches);

// ── Both admin + superadmin ──────────────────────────────────────────────────
// Branch scoping is enforced INSIDE each controller function, not here.
// The controller reads req.user.role and req.user.branch to decide what to query.
router.get("/analytics",                        getAnalytics);
router.get("/branch/:branch",                   getBranchDashboard);
router.get("/branch/:branch/technicians",       getBranchTechnicians);
router.get("/technician/:userId",               getTechnicianEntries);
router.put("/entry/:id",                        editEntry);
router.delete("/entry/:id",                     deleteEntry);
router.get("/technician/:userId/export",        exportTechnicianData);

module.exports = router;