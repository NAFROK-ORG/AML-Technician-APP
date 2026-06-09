const express        = require("express");
const router         = express.Router();
const {
  createLog,
  getTodayLogs,
  editLog,
  getBoardLogs,
} = require("../controllers/securityController");
const { protect }                          = require("../middleware/authMiddleware");
const { securityOnly, adminOrAbove, branchGuard } = require("../middleware/adminMiddleware");

/**
 * Security user routes — protect + securityOnly only.
 * Do NOT add branchGuard here — it is designed for admin roles only.
 * securityOnly already enforces the correct role; adding branchGuard would
 * add unintended semantics and could break if branchGuard is ever updated.
 */
router.post("/log",    protect, securityOnly, createLog);
router.get("/today",   protect, securityOnly, getTodayLogs);
router.put("/log/:id", protect, securityOnly, editLog);

/**
 * Admin board route — protect + adminOrAbove + branchGuard.
 * Follows the same middleware chain as GET /api/attendance/admin.
 * Branch scoping is handled inside the controller (not in middleware),
 * using the same pattern: branch admin = forced branch, superadmin = optional.
 */
router.get("/board", protect, adminOrAbove, branchGuard, getBoardLogs);

module.exports = router;