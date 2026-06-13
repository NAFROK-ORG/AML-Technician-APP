const AuditLog = require("../models/AuditLog");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audit
// SUPERADMIN ONLY (enforced in routes via superAdminOnly middleware).
// Paginated, newest-first. Optional filters: ?action=DELETE_ENTRY|EDIT_ENTRY
//                                             &branch=BALLARI
// ─────────────────────────────────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page,  10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const filter = {};

    if (req.query.action && ["DELETE_ENTRY", "EDIT_ENTRY"].includes(req.query.action)) {
      filter.action = req.query.action;
    }

    if (req.query.branch) {
      filter.targetBranch = req.query.branch;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/audit/flush
// SUPERADMIN ONLY. Permanently deletes ALL audit log records.
// Not reversible. Logged to console with who/when for forensics.
// ─────────────────────────────────────────────────────────────────────────────
const flushAuditLogs = async (req, res) => {
  try {
    const result = await AuditLog.deleteMany({});

    console.log(
      `[AuditLog] FLUSH triggered by ${req.user.userId} (role: ${req.user.role}) ` +
      `at ${new Date().toISOString()} — ${result.deletedCount} records deleted.`
    );

    res.json({
      message: "Audit logs flushed.",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAuditLogs, flushAuditLogs };