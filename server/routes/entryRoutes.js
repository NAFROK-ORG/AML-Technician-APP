const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createEntry,
  getMyEntries,
  deleteEntry,
  getMonthlyIncentive,
} = require("../controllers/entryController");

// IMPORTANT: Specific literal paths (/my, /my/incentive) must be registered
// BEFORE wildcard param routes (/:id) so Express matches them first.

router.get("/my/incentive", protect, getMonthlyIncentive); // GET /api/entries/my/incentive
router.get("/my",           protect, getMyEntries);         // GET /api/entries/my
router.post("/",            protect, createEntry);          // POST /api/entries
router.delete("/:id",       protect, deleteEntry);          // DELETE /api/entries/:id

module.exports = router;