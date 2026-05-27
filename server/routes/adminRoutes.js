const express = require("express");
const router = express.Router();
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
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get("/analytics",                        getAnalytics);
router.get("/branches",                         getBranches);
router.get("/branch/:branch",                   getBranchDashboard);
router.get("/branch/:branch/technicians",       getBranchTechnicians);
router.get("/technician/:userId",               getTechnicianEntries);
router.put("/entry/:id",                        editEntry);
router.delete("/entry/:id",                     deleteEntry);
router.get("/technician/:userId/export",        exportTechnicianData);

module.exports = router;