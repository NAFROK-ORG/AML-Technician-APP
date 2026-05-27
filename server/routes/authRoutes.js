const express = require("express");
const router = express.Router();
const { signup, login, profileSetup, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.put("/profile-setup", protect, profileSetup);
router.get("/me", protect, getMe);

module.exports = router;
