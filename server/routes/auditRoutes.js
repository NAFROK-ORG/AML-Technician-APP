const express = require("express");
const router  = express.Router();

const { getAuditLogs, flushAuditLogs } = require("../controllers/auditController");
const { protect }       = require("../middleware/authMiddleware");
const { superAdminOnly } = require("../middleware/adminMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
// ALL audit routes are SUPERADMIN ONLY.
// Branch admins and technicians get 403 — no read access, by design
// (per project decision: audit log visibility restricted to superadmin only).
// ─────────────────────────────────────────────────────────────────────────────
router.use(protect, superAdminOnly);

router.get("/",      getAuditLogs);    // GET    /api/audit         — paginated logs
router.delete("/flush", flushAuditLogs); // DELETE /api/audit/flush — wipe all logs

module.exports = router;