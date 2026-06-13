const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createEntry,
  getMyEntries,
  getMonthlyIncentive,
  editMyEntry,
} = require("../controllers/entryController");

// IMPORTANT: Specific literal paths (/my, /my/incentive) must be registered
// BEFORE wildcard param routes (/:id) so Express matches them first.

router.get("/my/incentive", protect, getMonthlyIncentive); // GET    /api/entries/my/incentive
router.get("/my",           protect, getMyEntries);         // GET    /api/entries/my
router.post("/",            protect, createEntry);          // POST   /api/entries
router.put("/:id",          protect, editMyEntry);          // PUT    /api/entries/:id

// REMOVED (Audit System Phase 2): DELETE /:id (deleteEntry)
// Technicians can no longer delete their own entries via any path.
// Entry history is read-only on the technician side. Admin deletes only,
// via DELETE /api/admin/entry/:id, which is now audit-logged.

module.exports = router;