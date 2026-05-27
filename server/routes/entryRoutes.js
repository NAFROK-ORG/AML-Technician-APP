const express = require("express");
const router = express.Router();
const { createEntry, getMyEntries, deleteEntry } = require("../controllers/entryController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createEntry);
router.get("/my", protect, getMyEntries);
router.delete("/:id", protect, deleteEntry);

module.exports = router;
