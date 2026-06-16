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

   if (req.query.action && ["DELETE_ENTRY", "EDIT_ENTRY", "EDIT_ENTRY_SELF"].includes(req.query.action)) {
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

// ── DELETE /api/audit/flush — add confirmPhrase gate ─────────────────────────
// REPLACE the entire flushAuditLogs function with:

const flushAuditLogs = async (req, res) => {
  try {
    // Defense-in-depth: even if someone hits this endpoint directly via curl/postman,
    // they still need to know the phrase. The UI enforces it visually; this enforces it
    // at the API level — both layers must agree.
    const { confirmPhrase } = req.body;
    if (confirmPhrase !== "FLUSH ALL LOGS") {
      return res.status(400).json({
        message: 'Confirmation phrase incorrect. Type "FLUSH ALL LOGS" exactly.',
      });
    }

    const result = await AuditLog.deleteMany({});

    console.log(
      `[AuditLog] FLUSH triggered by ${req.user.userId} (role: ${req.user.role}) ` +
      `at ${new Date().toISOString()} — ${result.deletedCount} records deleted.`
    );

    res.json({
      message:      "Audit logs flushed.",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAuditLogs, flushAuditLogs };