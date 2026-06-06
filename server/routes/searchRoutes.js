const express            = require("express");
const router             = express.Router();
const { vehicleSearch }  = require("../controllers/searchController");
const { protect }        = require("../middleware/authMiddleware");
const { superAdminOnly } = require("../middleware/adminMiddleware");

/**
 * GET /api/search/vehicle?q=<query>&page=<n>
 *
 * Chain: protect → superAdminOnly
 * No branchGuard — superadmin is not branch-scoped by design.
 * branchGuard would actually block superadmins (they have branch: "all").
 */
router.get("/vehicle", protect, superAdminOnly, vehicleSearch);

module.exports = router;